/**
 * disk-snapshot-store.test.ts — falsifiers for "a snapshot written by one runtime is readable by
 * the other, and survives a restart".
 *
 * The three things that must agree with `src/Core/SnapshotStore.fs` exactly — the filename, the
 * manifest shape, and the atomicity — each have a test, because each fails in a different quiet way:
 * a wrong filename is a file the other side cannot find, a numeric `seq` is a manifest F# cannot
 * deserialise, and a non-atomic write is a reader observing half a snapshot.
 */

import { describe, expect, test } from "bun:test";
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ofEntries, type ZSet } from "../z-set/z-set";
import type { IDeltaCodec } from "./delta-codec";
import { DiskSnapshotStore, MANIFEST_FILE, manifestBody, parseManifest, snapshotFileName } from "./disk-snapshot-store";

const cmp = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0);

/** A transparent codec: JSON bytes. The store's job is addressing and atomicity, not encoding. */
const jsonCodec: IDeltaCodec<string> = {
  encode: (z) => [...Buffer.from(JSON.stringify(z), "utf8")],
  decode: (bytes) => JSON.parse(Buffer.from(bytes).toString("utf8")) as ZSet<string>,
};

const sample = (): ZSet<string> =>
  ofEntries(cmp, [
    { e: "b", w: 1 },
    { e: "a", w: -2 },
  ]);

function tempDir(): string {
  return mkdtempSync(join(tmpdir(), "zeta-snap-"));
}

describe('the filename must match F# `sprintf "snapshot-%020d.snap"`', () => {
  test("twenty digits, zero-padded", () => {
    expect(snapshotFileName(0)).toBe("snapshot-00000000000000000000.snap");
    expect(snapshotFileName(7)).toBe("snapshot-00000000000000000007.snap");
    expect(snapshotFileName(1234567890)).toBe("snapshot-00000000001234567890.snap");
    // The digit count is the contract, not an implementation detail: F# pads to exactly 20.
    for (const n of [0, 1, 999, 1234567890]) {
      expect(snapshotFileName(n)).toMatch(/^snapshot-[0-9]{20}\.snap$/);
    }
  });

  test("lexical order IS sequence order — the reason for the padding", () => {
    // Unpadded, a directory listing sorts snapshot-10 before snapshot-9 and "the latest file" stops
    // being the latest snapshot.
    const names = [9, 10, 100, 2].map(snapshotFileName).sort();
    expect(names).toEqual([2, 9, 10, 100].map(snapshotFileName));
  });
});

describe("the manifest must be the shape F# can deserialise", () => {
  test("seq is a STRING, because F# serialises a Dictionary<string,string>", () => {
    const body = JSON.parse(manifestBody(7, "snapshot-x.snap")) as Record<string, unknown>;
    expect(typeof body["seq"]).toBe("string");
    expect(body["seq"]).toBe("7");
    expect(body["file"]).toBe("snapshot-x.snap");
  });

  test("it is a FLAT map — no nesting, no extra shape", () => {
    const body = JSON.parse(manifestBody(1, "f")) as Record<string, unknown>;
    expect(Object.keys(body).sort()).toEqual(["file", "seq"]);
    for (const v of Object.values(body)) expect(typeof v).toBe("string");
  });

  test("a round trip through parseManifest recovers the pointer", () => {
    const r = parseManifest(manifestBody(42, "snapshot-42.snap"));
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.pointer).toEqual({ handle: "snapshot-42.snap", seq: 42 });
  });
});

describe("parseManifest is strict — a defaulted seq recovers from the wrong point in the log", () => {
  test("a numeric seq is REFUSED, not coerced", () => {
    // This is what a naive TypeScript writer would emit, and it is the interop break: F# reading a
    // Dictionary<string,string> cannot take a number. Refusing it here keeps the two sides honest.
    const r = parseManifest(JSON.stringify({ seq: 7, file: "f" }));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.why).toContain("not a string");
  });

  test("a missing field, a bad type, an array, and malformed JSON are all unreadable", () => {
    for (const raw of ['{"file":"f"}', '{"seq":"1"}', '{"seq":"1","file":""}', "[]", "null", "{"]) {
      expect(parseManifest(raw).ok).toBe(false);
    }
  });

  test("a non-numeric or negative seq is refused", () => {
    expect(parseManifest(JSON.stringify({ seq: "abc", file: "f" })).ok).toBe(false);
    expect(parseManifest(JSON.stringify({ seq: "-1", file: "f" })).ok).toBe(false);
  });
});

describe("write / read / latest", () => {
  test("a written snapshot round-trips", async () => {
    const dir = tempDir();
    try {
      const store = new DiskSnapshotStore({ dir, codec: jsonCodec });
      const p = await store.write(3, sample());
      expect(p).toEqual({ handle: snapshotFileName(3), seq: 3 });
      expect(await store.read(p)).toEqual(sample());
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("A FRESH STORE over the same directory recovers the pointer — the whole point", async () => {
    // The in-memory store's "manifest" is a field that dies with the process. This is the property
    // that `recoverable-spine.ts` already claimed ("manifest-tracked") and could not deliver.
    const dir = tempDir();
    try {
      const first = new DiskSnapshotStore({ dir, codec: jsonCodec });
      await first.write(11, sample());

      const afterRestart = new DiskSnapshotStore({ dir, codec: jsonCodec });
      const latest = await afterRestart.latest();
      expect(latest).toEqual({ handle: snapshotFileName(11), seq: 11 });
      expect(await afterRestart.read(latest!)).toEqual(sample());
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("latest() is null on an empty directory — nothing written is not an error", async () => {
    const dir = tempDir();
    try {
      expect(await new DiskSnapshotStore({ dir, codec: jsonCodec }).latest()).toBeNull();
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("an UNREADABLE manifest THROWS — it must not read as 'no snapshot'", async () => {
    // Collapsing corrupt into absent would silently discard every snapshot in the directory and
    // restart the fold from nothing, which loses committed deltas without reporting anything.
    const dir = tempDir();
    try {
      const store = new DiskSnapshotStore({ dir, codec: jsonCodec });
      await store.write(5, sample());
      writeFileSync(join(dir, MANIFEST_FILE), "{ truncated");
      await expect(new DiskSnapshotStore({ dir, codec: jsonCodec }).latest()).rejects.toThrow(/refusing/);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("the manifest points at the LATEST write", async () => {
    const dir = tempDir();
    try {
      const store = new DiskSnapshotStore({ dir, codec: jsonCodec });
      await store.write(1, sample());
      await store.write(2, sample());
      expect((await store.latest())?.seq).toBe(2);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe("atomicity — a reader never observes a partial file", () => {
  test("no .tmp residue survives a completed write", async () => {
    const dir = tempDir();
    try {
      const store = new DiskSnapshotStore({ dir, codec: jsonCodec });
      await store.write(1, sample());
      expect(readdirSync(dir).filter((f) => f.endsWith(".tmp"))).toEqual([]);
      expect(existsSync(join(dir, MANIFEST_FILE))).toBe(true);
      expect(existsSync(join(dir, snapshotFileName(1)))).toBe(true);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("the manifest is written AFTER the snapshot it points at", async () => {
    // Publishing the pointer first would advertise a file a reader could not yet open.
    const dir = tempDir();
    try {
      const store = new DiskSnapshotStore({ dir, codec: jsonCodec });
      await store.write(4, sample());
      const manifest = parseManifest(readFileSync(join(dir, MANIFEST_FILE), "utf8"));
      expect(manifest.ok).toBe(true);
      if (manifest.ok) expect(existsSync(join(dir, manifest.pointer.handle as string))).toBe(true);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("a pointer whose handle is not a filename is refused rather than joined into a path", async () => {
    const dir = tempDir();
    try {
      const store = new DiskSnapshotStore({ dir, codec: jsonCodec });
      await expect(store.read({ handle: 7, seq: 7 })).rejects.toThrow(/not a filename/);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
