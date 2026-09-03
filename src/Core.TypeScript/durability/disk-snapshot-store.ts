/**
 * durability/disk-snapshot-store.ts — the snapshot store that actually survives a restart.
 *
 * ── THE GAP THIS CLOSES, AND HOW IT WAS FOUND ────────────────────────────────
 * A systematic F#↔TypeScript sweep found six concepts implemented in both languages with no treaty
 * pinning them. Reading two of them — `SnapshotStore` and `RecoverableSpine` — turned up something
 * sharper than a missing treaty:
 *
 * `src/Core/SnapshotStore.fs` ships TWO stores, `InMemorySnapshotStore` and `DiskSnapshotStore`.
 * The TypeScript side shipped **only the in-memory one**, whose "manifest" is a private field that
 * dies with the process. And `recoverable-spine.ts` describes itself — copying the F# wording — as
 * tying the log to *"cadenced snapshots (via a manifest-tracked ISnapshotStore) and a
 * restore → replay recovery path"*, while the F# is explicit about what that manifest buys:
 *
 *   *"Because the snapshot store records the latest pointer in a durable manifest, recovery survives
 *    a process restart with NO externally-held pointer."*
 *
 * The TypeScript could not survive a restart and said "manifest-tracked" anyway — a claim stronger
 * than the mechanism. This is the mechanism.
 *
 * ── THE INTEROP PROPERTY THAT MATTERS ────────────────────────────────────────
 * A snapshot is only useful across languages if either side can READ what the other wrote. That
 * needs three things to agree exactly, and each is pinned by a treaty vector rather than by careful
 * reading:
 *
 *   the filename    `snapshot-%020d.snap` — twenty digits, zero-padded, so lexical order IS
 *                   sequence order. Nineteen digits or a missing pad and a directory listing sorts
 *                   snapshot-10 before snapshot-9.
 *   the manifest    `LATEST.json`, a flat string→string map `{"seq": "...", "file": "..."}`. F#
 *                   serialises a `Dictionary<string,string>`, so the seq is a STRING, not a number.
 *                   Writing `{"seq": 7}` produces a manifest F# cannot deserialise.
 *   atomicity       write to `<path>.tmp`, then rename. A reader must never observe a half-written
 *                   snapshot or manifest, and rename is the only primitive that gives that.
 *
 * ── WHAT THIS DOES NOT CLAIM ─────────────────────────────────────────────────
 * The F# takes an optional `fsyncOnWrite` and, when set, flushes the file AND fsyncs the containing
 * directory so the rename itself is durable. Node has no portable directory fsync, and
 * `fs.fsyncSync` on a directory handle fails on Windows. So this store does the rename and says
 * plainly that **the rename's durability against power loss is the platform's to give** — it is
 * atomic with respect to readers, which is what the manifest needs, and it is not a claim about
 * surviving a crash between the rename and the OS flushing its metadata. Overstating that would be
 * worse than not having the option.
 */

import { mkdirSync, renameSync, writeFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import type { ZSet } from "../z-set/z-set";
import type { IDeltaCodec } from "./delta-codec";
import type { ISnapshotStore, SnapshotPointer } from "./snapshot-store";

/** The manifest filename. Must match `src/Core/SnapshotStore.fs`. */
export const MANIFEST_FILE = "LATEST.json";

/**
 * The snapshot filename for a sequence.
 *
 * Twenty digits, zero-padded — so a lexical directory listing is already in sequence order. This is
 * `sprintf "snapshot-%020d.snap"` on the F# side and the two must not drift: a file written by one
 * runtime is looked up by name by the other.
 */
export function snapshotFileName(seq: number): string {
  return `snapshot-${String(seq).padStart(20, "0")}.snap`;
}

/** The manifest body for a pointer. A flat string→string map, matching F#'s `Dictionary<string,string>`. */
export function manifestBody(seq: number, file: string): string {
  // `seq` is a STRING. F# serialises a Dictionary<string,string>, so a numeric `seq` here produces a
  // manifest the F# side cannot deserialise — the interop breaks on a JSON type, silently, at read.
  return JSON.stringify({ seq: String(seq), file });
}

export type ManifestParse =
  { readonly ok: true; readonly pointer: SnapshotPointer } | { readonly ok: false; readonly why: string };

/**
 * Parse a manifest. STRICT: a missing or wrongly-typed field is unreadable, never defaulted.
 *
 * A defaulted `seq` would silently recover from the wrong point in the log — replaying a tail that
 * starts too late, which loses committed deltas without ever reporting an error.
 */
export function parseManifest(raw: string): ManifestParse {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (e) {
    return { ok: false, why: `manifest is not valid JSON: ${e instanceof Error ? e.message : String(e)}` };
  }
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    return { ok: false, why: "manifest is not a JSON object" };
  }
  const m = parsed as Record<string, unknown>;
  const seqRaw = m["seq"];
  const file = m["file"];
  if (typeof seqRaw !== "string") return { ok: false, why: 'manifest "seq" is missing or not a string' };
  if (typeof file !== "string" || file.length === 0) {
    return { ok: false, why: 'manifest "file" is missing or not a string' };
  }
  const seq = Number(seqRaw);
  if (!Number.isSafeInteger(seq) || seq < 0) return { ok: false, why: `manifest "seq" is not a sequence: ${seqRaw}` };
  return { ok: true, pointer: { handle: file, seq } };
}

export interface DiskSnapshotStoreOptions<K> {
  readonly dir: string;
  readonly codec: IDeltaCodec<K>;
}

/**
 * Disk snapshot store — stable filenames plus a durable `LATEST.json` manifest, both written
 * atomically. A fresh instance over the same directory reads the manifest and reloads the snapshot,
 * which is what makes cross-restart snapshot+tail recovery possible at all.
 */
export class DiskSnapshotStore<K> implements ISnapshotStore<K> {
  private readonly root: string;
  private readonly codec: IDeltaCodec<K>;

  constructor(opts: DiskSnapshotStoreOptions<K>) {
    this.root = resolve(opts.dir);
    this.codec = opts.codec;
    mkdirSync(this.root, { recursive: true });
  }

  /** Write to a temp path, then rename. A reader never observes a partial file. */
  private writeAtomic(path: string, bytes: Uint8Array | string): void {
    const tmp = `${path}.tmp`;
    writeFileSync(tmp, bytes);
    renameSync(tmp, path);
  }

  async write(seq: number, state: ZSet<K>): Promise<SnapshotPointer> {
    const file = snapshotFileName(seq);
    // The codec speaks `number[]` (a byte array), which is what rides the DynamicValue
    // serializers. `Uint8Array.from` is the crossing to what the filesystem takes — done here
    // rather than widening the codec, because the codec's shape is the one the golden vectors pin.
    this.writeAtomic(join(this.root, file), Uint8Array.from(this.codec.encode(state)));
    // The manifest goes second, always. It is the pointer that says a snapshot is usable, so
    // publishing it before the snapshot exists would advertise a file a reader could not open.
    this.writeAtomic(join(this.root, MANIFEST_FILE), manifestBody(seq, file));
    return { handle: file, seq };
  }

  async read(pointer: SnapshotPointer): Promise<ZSet<K>> {
    const file = pointer.handle;
    if (typeof file !== "string" || file.length === 0) {
      throw new Error(`DiskSnapshotStore.read: pointer handle is not a filename: ${String(file)}`);
    }
    const bytes = await readFile(join(this.root, file));
    return this.codec.decode([...bytes]);
  }

  /**
   * The latest pointer, from the manifest on disk.
   *
   * NO manifest is `null` — a store nothing has written to yet. An UNREADABLE manifest THROWS,
   * because those are different facts and collapsing them would turn a corrupt pointer into "start
   * from scratch", silently discarding every snapshot in the directory.
   */
  async latest(): Promise<SnapshotPointer | null> {
    let raw: string;
    try {
      raw = await readFile(join(this.root, MANIFEST_FILE), "utf8");
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code === "ENOENT") return null;
      throw e;
    }
    const parsed = parseManifest(raw);
    if (!parsed.ok) {
      throw new Error(
        `DiskSnapshotStore.latest: ${parsed.why} — refusing to report "no snapshot", which would discard every snapshot in ${this.root}`,
      );
    }
    return parsed.pointer;
  }
}
