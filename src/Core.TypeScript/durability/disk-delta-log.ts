/**
 * durability/disk-delta-log.ts — the delta log that actually survives a restart.
 *
 * ── THE DEFECT THIS CLOSES, WHICH IS WORSE THAN A MISSING FEATURE ────────────
 * `disk-snapshot-store.ts` gave TypeScript a durable snapshot store, and `RecoverableSpine.recover`
 * will happily use it. But F# ships FOUR durable log backends — `DiskDeltaLog`,
 * `GroupCommitDiskDeltaLog`, `ZetaFsDeltaLog`, `GitDeltaLog` — and TypeScript shipped **only**
 * `InMemoryDeltaLog`. So recovery in TypeScript restored the snapshot and then replayed a tail that
 * died with the process.
 *
 * That is not "durability is missing". It is worse: recovery **succeeds**, returns a spine, and
 * silently drops every commit made after the last snapshot. A missing feature announces itself; a
 * recovery path that comes back short does not. With a cadence of 64, a crash costs up to 63
 * committed deltas and reports nothing.
 *
 * ── THE FORMAT IS F#'s, DELIBERATELY ─────────────────────────────────────────
 * One file per entry, named `%020d.delta`, holding the WHOLE entry as canonical CBOR through the
 * four-language-locked `DeltaLogEntry` codec. Matching `src/Core/DiskDeltaLog.fs` byte for byte is
 * the point: a log written here is replayable by the F# store and vice versa, which is the property
 * an interop treaty can actually check. Inventing a TypeScript-shaped format would have been easier
 * and would have made the two runtimes unable to read each other.
 *
 *   filename   `%020d.delta` — twenty digits, zero-padded, so a lexical listing is sequence order.
 *   frame      the entry via `encodeEntry` — `{captured, delta, seq}` as canonical CBOR. The seq
 *              rides INSIDE the bytes as well as in the name; `replay` reads the framed one, so a
 *              renamed file cannot silently change an entry's sequence.
 *   atomicity  write `<name>.tmp`, then rename. A crash mid-write leaves an orphan `.tmp`, which
 *              the `.delta` filter ignores — never a torn entry. Crash-consistency by construction.
 *   truncate   delete the files at or below the sequence. GC is an unlink, not a rewrite.
 *
 * ── WHAT THIS DOES NOT CLAIM ─────────────────────────────────────────────────
 * F# takes an optional `fsyncPerAppend` and, when set, flushes the file and fsyncs the containing
 * directory. Node has no portable directory fsync and `fsyncSync` on a directory handle fails on
 * Windows. So the rename here is atomic **with respect to readers**, which is what replay needs,
 * and the durability of that rename against power loss is the platform's to give. Same honest
 * ceiling as `disk-snapshot-store.ts`, stated rather than implied.
 *
 * ── SINGLE WRITER ────────────────────────────────────────────────────────────
 * F# takes a lock around the sequence counter; this relies on the writer-actor model (one writer
 * per shard) and JavaScript's single-threaded execution instead. Two PROCESSES over one directory
 * would both compute the same next sequence and one would clobber the other's file. That is out of
 * scope for both implementations, and it is named here rather than left to be discovered.
 */

import { mkdirSync, readdirSync, renameSync, writeFileSync } from "node:fs";
import { readFile, unlink } from "node:fs/promises";
import { join, resolve } from "node:path";
import { type CanonicalEntry, decodeEntry, encodeEntry } from "../delta-log-entry/entry-codec";
import { ofEntries, toEntries, type Compare, type ZSet } from "../z-set/z-set";
import type { DeltaLogEntry, IDeltaLog } from "./delta-log";

/** The entry filename for a sequence. Must match `sprintf "%020d.delta"` in `src/Core/DiskDeltaLog.fs`. */
export function deltaFileName(seq: number): string {
  return `${String(seq).padStart(20, "0")}.delta`;
}

/** The sequence a filename encodes, or null if the name is not one of ours. */
export function seqOfDeltaFile(name: string): number | null {
  if (!name.endsWith(".delta")) return null;
  const stem = name.slice(0, -".delta".length);
  if (stem.length === 0 || !/^[0-9]+$/.test(stem)) return null;
  const seq = Number(stem);
  return Number.isSafeInteger(seq) ? seq : null;
}

export interface DiskDeltaLogOptions {
  readonly dir: string;
}

/**
 * Disk-backed `IDeltaLog` over string keys — file-per-entry, canonical CBOR frames, atomic
 * temp+rename appends.
 *
 * `string` keys only, matching `entry-codec.ts`: that is the key type the four-language vectors
 * pin. A generic version would be claiming interop for a shape no vector covers.
 */
export class DiskDeltaLog implements IDeltaLog<string> {
  private readonly root: string;
  private readonly compare: Compare<string>;
  private nextSeq: number;

  constructor(opts: DiskDeltaLogOptions, compare: Compare<string>) {
    this.root = resolve(opts.dir);
    this.compare = compare;
    mkdirSync(this.root, { recursive: true });
    // Recover the high-water mark from the entry files already present, so a REOPENED log continues
    // its sequence instead of restarting at 0 and overwriting entry 1. This is the line that makes
    // the log survive a restart at all; without it, reopening is indistinguishable from corruption.
    this.nextSeq = this.maxSeqOnDisk();
  }

  private maxSeqOnDisk(): number {
    let max = 0;
    for (const name of readdirSync(this.root)) {
      const seq = seqOfDeltaFile(name);
      if (seq !== null && seq > max) max = seq;
    }
    return max;
  }

  /** Write to a temp path, then rename. A reader never observes a partial entry. */
  private writeAtomic(path: string, bytes: Uint8Array): void {
    const tmp = `${path}.tmp`;
    writeFileSync(tmp, bytes);
    renameSync(tmp, path);
  }

  async append(delta: ZSet<string>, captured: ReadonlyMap<string, string>): Promise<number> {
    const seq = ++this.nextSeq;
    const entry: CanonicalEntry = {
      seq,
      delta: toEntries(delta).map((e) => [e.e, e.w] as const),
      captured: Object.fromEntries(captured),
    };
    this.writeAtomic(join(this.root, deltaFileName(seq)), Uint8Array.from(encodeEntry(entry)));
    return seq;
  }

  /**
   * Entries with `seq > fromSeqExclusive`, in sequence order.
   *
   * An unreadable entry THROWS. It must not be skipped: a replay that silently omits one delta
   * produces a state that is wrong in a way nothing downstream can detect, which is precisely the
   * failure this class exists to remove.
   */
  async replay(fromSeqExclusive: number): Promise<readonly DeltaLogEntry<string>[]> {
    const wanted: { seq: number; name: string }[] = [];
    for (const name of readdirSync(this.root)) {
      const seq = seqOfDeltaFile(name);
      if (seq !== null && seq > fromSeqExclusive) wanted.push({ seq, name });
    }
    wanted.sort((a, b) => a.seq - b.seq);

    const out: DeltaLogEntry<string>[] = [];
    for (const w of wanted) {
      const bytes = await readFile(join(this.root, w.name));
      const parsed = decodeEntry([...bytes]);
      if (!parsed.ok) {
        throw new Error(
          `DiskDeltaLog.replay: ${w.name} is unreadable: ${parsed.why} — refusing to skip it, which would replay a state that is silently short one delta`,
        );
      }
      out.push({
        // The framed seq, not the filename's. They are written equal; if they ever disagree, the
        // bytes are the record and the name is a label.
        seq: parsed.entry.seq,
        delta: ofEntries(
          this.compare,
          parsed.entry.delta.map(([e, w2]) => ({ e, w: w2 })),
        ),
        captured: new Map(Object.entries(parsed.entry.captured)),
      });
    }
    return out;
  }

  highWater(): number {
    return this.nextSeq;
  }

  /** GC entries at or below `throughSeqInclusive`. Erasure through the read surface: an unlink. */
  async truncate(throughSeqInclusive: number): Promise<void> {
    for (const name of readdirSync(this.root)) {
      const seq = seqOfDeltaFile(name);
      if (seq !== null && seq <= throughSeqInclusive) {
        await unlink(join(this.root, name));
      }
    }
  }
}
