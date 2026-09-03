import { test, expect } from "bun:test";
import { mkdtempSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { equals, ofEntries, singleton, stringCompare, toEntries, union, type ZSet } from "../z-set/z-set";
import { InMemoryDeltaLog } from "./delta-log";
import { DiskDeltaLog, deltaFileName, seqOfDeltaFile } from "./disk-delta-log";
import { DiskSnapshotStore } from "./disk-snapshot-store";
import type { IDeltaCodec } from "./delta-codec";
import { RecoverableSpine } from "./recoverable-spine";
import { InMemorySnapshotStore } from "./snapshot-store";

// ═══════════════════════════════════════════════════════════════════════════════
// The claim under test is not "the log writes files". It is that a spine RECOVERS ITS FULL STATE
// across a restart — and, sharper, that the in-memory log silently does not, which is the defect
// this class closes.
// ═══════════════════════════════════════════════════════════════════════════════

const dir = (): string => mkdtempSync(join(tmpdir(), "zeta-delta-log-"));

const cmp = stringCompare;
const noCapture = new Map<string, string>();

/** A transparent JSON codec. The snapshot BYTES are not what these tests pin. */
const jsonCodec: IDeltaCodec<string> = {
  encode: (z) => [...Buffer.from(JSON.stringify(z), "utf8")],
  decode: (bytes) => JSON.parse(Buffer.from(bytes).toString("utf8")) as ZSet<string>,
};

test("filenames are twenty digits, so a lexical listing IS sequence order", () => {
  expect(deltaFileName(1)).toBe("00000000000000000001.delta");
  expect(deltaFileName(11)).toBe("00000000000000000011.delta");
  // The property the padding buys, and the reason nineteen digits would be a bug: sorted as TEXT,
  // 9 must come before 10.
  const names = [deltaFileName(10), deltaFileName(9)].sort();
  expect(names[0]).toBe(deltaFileName(9));
});

test("seqOfDeltaFile reads our names and refuses everything else", () => {
  expect(seqOfDeltaFile("00000000000000000007.delta")).toBe(7);
  // A partial append leaves this behind. Reading it as an entry would replay a torn frame.
  expect(seqOfDeltaFile("00000000000000000007.delta.tmp")).toBeNull();
  expect(seqOfDeltaFile("LATEST.json")).toBeNull();
  expect(seqOfDeltaFile("notanumber.delta")).toBeNull();
  expect(seqOfDeltaFile(".delta")).toBeNull();
});

test("append assigns monotonic sequences starting at 1", async () => {
  const d = dir();
  try {
    const log = new DiskDeltaLog({ dir: d }, cmp);
    expect(log.highWater()).toBe(0);
    expect(await log.append(singleton("a"), noCapture)).toBe(1);
    expect(await log.append(singleton("b"), noCapture)).toBe(2);
    expect(log.highWater()).toBe(2);
  } finally {
    rmSync(d, { recursive: true, force: true });
  }
});

test("a REOPENED log continues its sequence instead of overwriting entry 1", async () => {
  const d = dir();
  try {
    const first = new DiskDeltaLog({ dir: d }, cmp);
    await first.append(singleton("a"), noCapture);
    await first.append(singleton("b"), noCapture);

    // The restart. A fresh instance over the same directory, nothing held in memory.
    const second = new DiskDeltaLog({ dir: d }, cmp);
    expect(second.highWater()).toBe(2);
    expect(await second.append(singleton("c"), noCapture)).toBe(3);

    const all = await second.replay(0);
    expect(all.map((e) => e.seq)).toEqual([1, 2, 3]);
  } finally {
    rmSync(d, { recursive: true, force: true });
  }
});

test("replay returns entries in sequence order with their deltas and captured metadata", async () => {
  const d = dir();
  try {
    const log = new DiskDeltaLog({ dir: d }, cmp);
    await log.append(ofEntries(cmp, [{ e: "a", w: 2 }]), new Map([["clock", "17"]]));
    await log.append(ofEntries(cmp, [{ e: "b", w: -1 }]), new Map([["clock", "18"]]));

    const entries = await log.replay(0);
    expect(entries.map((e) => e.seq)).toEqual([1, 2]);
    expect(toEntries(entries[0]!.delta)).toEqual([{ e: "a", w: 2 }]);
    expect(toEntries(entries[1]!.delta)).toEqual([{ e: "b", w: -1 }]);
    expect(entries[0]!.captured.get("clock")).toBe("17");
    expect(entries[1]!.captured.get("clock")).toBe("18");

    // Exclusive, per the interface: seq 1 is NOT returned.
    expect((await log.replay(1)).map((e) => e.seq)).toEqual([2]);
    expect(await log.replay(2)).toHaveLength(0);
  } finally {
    rmSync(d, { recursive: true, force: true });
  }
});

test("an orphan .tmp from a crashed append is ignored, not replayed", async () => {
  const d = dir();
  try {
    const log = new DiskDeltaLog({ dir: d }, cmp);
    await log.append(singleton("a"), noCapture);
    // Exactly what a crash mid-write leaves: a temp file holding bytes that are not a frame.
    writeFileSync(join(d, `${deltaFileName(2)}.tmp`), "torn");

    expect(await log.replay(0)).toHaveLength(1);
    // And it does not move the high-water mark, so the next append does not skip a sequence.
    expect(new DiskDeltaLog({ dir: d }, cmp).highWater()).toBe(1);
  } finally {
    rmSync(d, { recursive: true, force: true });
  }
});

test("replay THROWS on a corrupt entry rather than skipping it", async () => {
  const d = dir();
  try {
    const log = new DiskDeltaLog({ dir: d }, cmp);
    await log.append(singleton("a"), noCapture);
    await log.append(singleton("b"), noCapture);
    // Corrupt the second entry in place — a bit-rot / partial-disk case, not a crashed append.
    writeFileSync(join(d, deltaFileName(2)), Uint8Array.from([0xff, 0xff, 0xff]));

    // Skipping it would produce a state that is silently short one delta, and nothing downstream
    // could detect that. Loud is the only correct behaviour.
    await expect(log.replay(0)).rejects.toThrow(/unreadable/);
  } finally {
    rmSync(d, { recursive: true, force: true });
  }
});

test("truncate unlinks through the sequence and leaves the rest", async () => {
  const d = dir();
  try {
    const log = new DiskDeltaLog({ dir: d }, cmp);
    for (const k of ["a", "b", "c"]) await log.append(singleton(k), noCapture);

    await log.truncate(2);
    expect(readdirSync(d).filter((n) => n.endsWith(".delta"))).toEqual([deltaFileName(3)]);
    // GC does not rewind the sequence — the next append must not reuse a number.
    expect(log.highWater()).toBe(3);
    expect(await log.append(singleton("d"), noCapture)).toBe(4);
  } finally {
    rmSync(d, { recursive: true, force: true });
  }
});

// ── THE POINT OF THE WHOLE FILE ─────────────────────────────────────────────

test("a spine recovers its FULL state across a restart — snapshot plus the tail past it", async () => {
  const logDir = dir();
  const snapDir = dir();
  try {
    const build = async (): Promise<RecoverableSpine<string>> =>
      RecoverableSpine.recover(
        cmp,
        new DiskDeltaLog({ dir: logDir }, cmp),
        new DiskSnapshotStore({ dir: snapDir, codec: jsonCodec }),
      );

    const before = await build();
    await before.commit(singleton("a"));
    await before.commit(singleton("b"));
    await before.snapshot(); // the durable manifest now points past a and b
    await before.commit(singleton("c")); // …and this one lives ONLY in the log
    const expected = before.consolidate();

    // The restart: every object above is dropped, and nothing is handed to the new spine except the
    // two directories. No externally-held pointer — the manifest supplies it.
    const after = await build();

    expect(equals(cmp, after.consolidate(), expected)).toBe(true);
    expect(after.getAppliedSeq()).toBe(3);
    // Named explicitly, because it is the delta the old code lost: the commit AFTER the snapshot.
    expect(toEntries(after.consolidate()).map((e) => e.e)).toEqual(["a", "b", "c"]);
  } finally {
    rmSync(logDir, { recursive: true, force: true });
    rmSync(snapDir, { recursive: true, force: true });
  }
});

test("THE DEFECT: with an in-memory log, recovery succeeds and comes back SHORT", async () => {
  const snapDir = dir();
  try {
    // This is what TypeScript could do before this file existed: a durable snapshot store and a log
    // that dies with the process.
    const snap = new DiskSnapshotStore({ dir: snapDir, codec: jsonCodec });

    const before = await RecoverableSpine.recover(cmp, new InMemoryDeltaLog<string>(), snap);
    await before.commit(singleton("a"));
    await before.snapshot();
    await before.commit(singleton("b"));

    // The restart. A NEW in-memory log, because the old one was memory.
    const after = await RecoverableSpine.recover(cmp, new InMemoryDeltaLog<string>(), snap);

    // It did not throw. It did not warn. It returned a spine that is missing a committed delta —
    // which is why "durability is missing" understates it: the recovery path REPORTS SUCCESS.
    expect(toEntries(after.consolidate()).map((e) => e.e)).toEqual(["a"]);
    expect(equals(cmp, after.consolidate(), before.consolidate())).toBe(false);

    // And the same sequence over the disk log does not lose it. A FRESH snapshot directory, because
    // a snapshot store and a log are a matched pair — see the next test for what happens when they
    // are not, which is how this assertion was wrong the first time I wrote it.
    const logDir = dir();
    const snapDir2 = dir();
    try {
      const snap2 = new DiskSnapshotStore({ dir: snapDir2, codec: jsonCodec });
      const d1 = await RecoverableSpine.recover(cmp, new DiskDeltaLog({ dir: logDir }, cmp), snap2);
      await d1.commit(singleton("a"));
      await d1.snapshot();
      await d1.commit(singleton("z")); // the post-snapshot commit the in-memory log lost
      const d2 = await RecoverableSpine.recover(cmp, new DiskDeltaLog({ dir: logDir }, cmp), snap2);
      expect(toEntries(d2.consolidate()).map((e) => e.e)).toEqual(["a", "z"]);
    } finally {
      rmSync(logDir, { recursive: true, force: true });
      rmSync(snapDir2, { recursive: true, force: true });
    }
  } finally {
    rmSync(snapDir, { recursive: true, force: true });
  }
});

test("the durable pair survives a restart at EVERY commit boundary, not just the one I picked", async () => {
  // One hand-chosen restart point proves one restart point. This restarts after every commit and
  // asserts the recovered state matches the state a process that never died would hold.
  for (let restartAfter = 1; restartAfter <= 5; restartAfter++) {
    const logDir = dir();
    const snapDir = dir();
    try {
      const keys = ["a", "b", "c", "d", "e"];
      const build = async (): Promise<RecoverableSpine<string>> =>
        RecoverableSpine.recover(
          cmp,
          new DiskDeltaLog({ dir: logDir }, cmp),
          new DiskSnapshotStore({ dir: snapDir, codec: jsonCodec }),
        );

      let spine = await build();
      spine.setAutoSnapshotEvery(2); // snapshots land mid-run, so the tail is sometimes non-empty
      let oracle: ZSet<string> = spine.consolidate();

      for (let i = 0; i < keys.length; i++) {
        await spine.commit(singleton(keys[i]!));
        oracle = union(cmp, oracle, singleton(keys[i]!));
        if (i + 1 === restartAfter) {
          spine = await build(); // the crash
          spine.setAutoSnapshotEvery(2);
        }
      }

      expect(equals(cmp, spine.consolidate(), oracle)).toBe(true);
    } finally {
      rmSync(logDir, { recursive: true, force: true });
      rmSync(snapDir, { recursive: true, force: true });
    }
  }
});

test("a snapshot and a log from DIFFERENT lineages recover a silently wrong state", async () => {
  // Found by writing the test above incorrectly: I paired a snapshot store whose manifest said
  // seq 1 with a brand-new log, and recovery returned a state missing the commit I had just made.
  // Not a defect in this class — `recover` resolves a base sequence from the snapshot and replays
  // the log PAST it, so a snapshot ahead of the log's history masks the whole log.
  //
  // Recorded rather than guarded: F#'s `RecoverAsync` does exactly the same, and quietly diverging
  // from it would break the parity these two implementations are supposed to hold. Pairing the two
  // stores is the caller's contract; this pins what the contract costs when it is broken, so the
  // behaviour is known rather than discovered during an incident.
  const snapDir = dir();
  const logDir = dir();
  try {
    const snap = new DiskSnapshotStore({ dir: snapDir, codec: jsonCodec });
    // A snapshot taken at seq 4 of some earlier lineage.
    await snap.write(4, ofEntries(cmp, [{ e: "old", w: 1 }]));

    const log = new DiskDeltaLog({ dir: logDir }, cmp);
    const spine = await RecoverableSpine.recover(cmp, log, snap);
    await spine.commit(singleton("new")); // lands at seq 1, which is BELOW the snapshot's 4

    const after = await RecoverableSpine.recover(cmp, new DiskDeltaLog({ dir: logDir }, cmp), snap);
    // The commit is on disk and is not in the recovered state. No error is raised by either side.
    expect(toEntries(after.consolidate()).map((e) => e.e)).toEqual(["old"]);
    expect((await new DiskDeltaLog({ dir: logDir }, cmp).replay(0)).map((e) => e.seq)).toEqual([1]);
  } finally {
    rmSync(snapDir, { recursive: true, force: true });
    rmSync(logDir, { recursive: true, force: true });
  }
});

test("in-memory stores still behave — the durable path is an addition, not a replacement", async () => {
  const log = new InMemoryDeltaLog<string>();
  const snap = new InMemorySnapshotStore<string>();
  const spine = await RecoverableSpine.recover(cmp, log, snap);
  await spine.commit(singleton("a"));
  expect(toEntries(spine.consolidate())).toEqual([{ e: "a", w: 1 }]);
});
