import { describe, expect, test } from "bun:test";
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, join } from "node:path";

import {
  SHARD_ID_RE,
  buildRollup,
  canonicalJson,
  loadAllShards,
  shardPathFor,
  shardZetaId,
  writeShard,
  type MetricsFrame,
} from "./tick-shards";
import { unpack } from "../zeta-id/zeta-id";
import { fromHex, toHex } from "../zeta-id/encoding";
import { Category, Chromosome, IdVersion } from "../zeta-id/types";

/** The repo root, from this test file's own location — no cwd assumption. */
const REPO_ROOT = join(import.meta.dir, "..", "..", "..");

const FRAME: MetricsFrame = {
  t: "2026-07-08T20:17:26.288Z",
  total_events: 42,
  last_action: "explore",
  last_mode: "work",
  last_agent: "otto",
  entropy_state: 3,
  entropy_heat: 9,
  ticks_24h: 12,
  agents_active: 2,
  claims_pending: 1,
};

function withTempRoot<T>(fn: (root: string) => T): T {
  const root = mkdtempSync(join(tmpdir(), "tick-shards-"));
  try {
    return fn(root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

describe("tick-shards — the shard filename is a real ZetaId", () => {
  test("filename is a canonical 32-hex ZetaId under a YYYY/MM/DD directory", () => {
    const path = shardPathFor(FRAME, "root");
    // `join`, not a POSIX literal — the code under test builds this with node's `path` module, so
    // a hardcoded "/a/b" asserts the separator of whichever platform wrote the test rather than
    // the path it is named for.
    expect(path).toBe(join("root", "2026", "07", "08", `${toHex(shardZetaId(FRAME))}.json`));
    // `basename`, not `split("/")`: the path this very test just asserted is built with node's
    // `path` module, so on Windows the separator is a backslash and the split returns the WHOLE
    // path as one element — the regex below then tested the directory prefix too and failed a
    // filename that was correct.
    const stem = basename(path, ".json");
    expect(SHARD_ID_RE.test(stem)).toBe(true);
    // The whole point of using the universal pointer system: it parses back out.
    expect(toHex(fromHex(stem))).toBe(stem);
  });

  test("the id's bit fields carry the frame's own observation time and the Observation category", () => {
    const obs = unpack(shardZetaId(FRAME));
    expect(obs.version).toBe(IdVersion.V1);
    expect(obs.category).toBe(Category.Observation);
    expect(obs.chromosome).toBe(Chromosome.MetaCoherence);
    // Not a mint clock — the frame's `t`, exactly. A backfilled historical frame therefore
    // never carries an id implying a mint time that did not happen.
    expect(new Date(obs.timestamp).toISOString()).toBe(FRAME.t);
  });

  test("the mint is deterministic — no clock, no randomness (DST §7 / §13 noninterference)", () => {
    const a = shardZetaId(FRAME);
    for (let i = 0; i < 5; i++) expect(shardZetaId({ ...FRAME })).toBe(a);
  });

  test("the id's low 32 bits are the content digest — different frame, different id", () => {
    expect(shardZetaId({ ...FRAME, total_events: 43 })).not.toBe(shardZetaId(FRAME));
    // Same content at the same instant collides deliberately (that IS the upsert key);
    // differing content at the same instant does not.
    expect(shardPathFor({ ...FRAME, claims_pending: 7 }, "r")).not.toBe(shardPathFor(FRAME, "r"));
  });

  test("rejects an unparseable timestamp rather than minting a nonsense id", () => {
    expect(() => shardZetaId({ ...FRAME, t: "not-a-date" })).toThrow(/unparseable timestamp/);
  });
});

describe("tick-shards — store behaviour", () => {
  test("writing the same frame twice is an upsert, not a duplicate (discipline #6)", () => {
    withTempRoot((root) => {
      const p1 = writeShard(FRAME, root);
      const p2 = writeShard(FRAME, root);
      expect(p2).toBe(p1);
      expect(loadAllShards(root)).toHaveLength(1);
      expect(readFileSync(p1, "utf-8")).toBe(canonicalJson(FRAME));
    });
  });

  test("frames round-trip through the store value-identically and fold in `t` order", () => {
    withTempRoot((root) => {
      const later: MetricsFrame = { ...FRAME, t: "2026-07-09T01:00:00.000Z", total_events: 43 };
      writeShard(later, root);
      writeShard(FRAME, root);
      const loaded = loadAllShards(root);
      expect(loaded.map((f) => f.t)).toEqual([FRAME.t, later.t]);
      expect(loaded.map(canonicalJson)).toEqual([FRAME, later].map(canonicalJson));
    });
  });

  test("the rollup is a pure function of the shard set — filenames never enter it", () => {
    withTempRoot((root) => {
      writeShard(FRAME, root);
      const frames = loadAllShards(root);
      const rollup = buildRollup(frames, frames.length);
      expect(rollup.frames).toEqual(frames);
      expect(rollup.provenance.shard_count).toBe(1);
      expect(rollup.provenance.derived_from).toBe("data/tick-shards/**/*.json");
    });
  });
});

describe("the key sort is ORDINAL, and the change re-keyed nothing", () => {
  // `canonicalJson` used `localeCompare(a, b, "en")` to order keys. That is culture-sensitive, and
  // it decides the digest, which decides the shard's filename — so the same frame could land at
  // different addresses on machines with different ICU data.
  //
  // Replacing it was safe only because the two orders agree on every key this frame has. That was
  // measured across all 1675 shards on disk before the change; these tests keep it measured, so a
  // new field whose name breaks the equivalence fails here instead of silently re-keying the store.

  test("ordinal and locale order agree on EVERY MetricsFrame key", () => {
    const keys = Object.keys(FRAME);
    expect(keys.length).toBeGreaterThan(5);
    const ordinal = [...keys].sort((a, b) => (a === b ? 0 : a < b ? -1 : 1));
    const locale = [...keys].sort((a, b) => a.localeCompare(b, "en"));
    expect(ordinal).toEqual(locale);
  });

  test("the sort really is ordinal — it is not just agreeing by accident", () => {
    // A key set where the two DISAGREE: ordinal puts "B" (0x42) before "a" (0x61); locale does not.
    // If `canonicalJson` were still locale-aware this would come back the other way round.
    const mixed = canonicalJson({ a: 1, B: 2 } as unknown as MetricsFrame);
    expect(mixed.indexOf('"B"')).toBeLessThan(mixed.indexOf('"a"'));
    expect("a".localeCompare("B", "en")).toBeLessThan(0);
  });

  /**
   * The budget for the whole-store re-derivation.
   *
   * NOT because the work is slow — the entire file runs in ~440ms on an idle machine. It is because
   * the work is 1675 file reads plus 1675 hashes, so its wall time is set by FILESYSTEM CONTENTION
   * rather than by its own cost, and contention is the one thing a per-test default cannot know
   * about. Measured at 23_630ms during a full-tree run with ten concurrent suites — a ~50x
   * stretch — where bun's 5000ms default turned a healthy check into a red that said nothing about
   * shards.
   *
   * This is the second test in this suite to be sized against that default and the first was a
   * different shape: `event-sink-folder.git.test.ts` sat at ~78% of budget while IDLE. Both fail the
   * same way and for the same reason — a check that goes red for reasons unrelated to what it tests
   * teaches people to discount red.
   *
   * 60s is ~2.5x the worst contention actually observed. Deliberately not "disable the timeout":
   * a walk that never returns must still be caught.
   */
  const WHOLE_STORE_BUDGET_MS = 60_000;

  test("EVERY SHARD ON DISK still resolves to its own filename", () => {
    // The migration check, kept as a check. A frame whose re-derived id no longer matches the name
    // it is stored under is a shard the store can no longer find by content.
    const root = join(REPO_ROOT, "data", "tick-shards");
    if (!existsSync(root)) return;
    const files: string[] = [];
    const walk = (d: string): void => {
      for (const e of readdirSync(d, { withFileTypes: true })) {
        const f = join(d, e.name);
        if (e.isDirectory()) walk(f);
        else if (e.name.endsWith(".json")) files.push(f);
      }
    };
    walk(root);
    expect(files.length).toBeGreaterThan(100);
    let mismatched = 0;
    for (const file of files) {
      const frame = JSON.parse(readFileSync(file, "utf-8")) as MetricsFrame;
      const expected = basename(file, ".json");
      if (toHex(shardZetaId(frame)) !== expected) mismatched += 1;
    }
    expect(mismatched).toBe(0);
  }, WHOLE_STORE_BUDGET_MS);
});
