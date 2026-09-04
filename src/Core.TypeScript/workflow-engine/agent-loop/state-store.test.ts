/**
 * state-store.test.ts — the loop's state, append-only, on disk.
 *
 * The properties that matter are the ones the shard shape exists to buy: the same record lands at
 * the same path (so a re-append is an upsert), different records never collide, ordering comes from
 * the record's own time rather than the filesystem's, and a merge is set union.
 */

import { afterEach, describe, expect, test } from "bun:test";
import { mkdtempSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  appendCycle,
  canonicalJson,
  coerciveCycles,
  currentState,
  cycleZetaId,
  nextCycleNumber,
  readHistory,
  type CycleRecord,
} from "./state-store";
import { SHARD_ID_RE } from "../../shard-store/shard-store";
import type { AgentState } from "./state-machine";

const roots: string[] = [];
function tempRoot(): string {
  const dir = mkdtempSync(join(tmpdir(), "agent-loop-"));
  roots.push(dir);
  return dir;
}
afterEach(() => {
  while (roots.length > 0) {
    const dir = roots.pop();
    if (dir !== undefined) rmSync(dir, { recursive: true, force: true });
  }
});

const idle = (cycle: number, at: string): AgentState => ({
  tag: "Idle",
  context: { agent: "alexa", cycle, sessionStartIso: at },
});

const rec = (over: Partial<CycleRecord> = {}): CycleRecord => {
  const at = over.at ?? "2026-09-03T10:00:00.000Z";
  const cycle = over.cycle ?? 1;
  return {
    at,
    agent: "alexa",
    cycle,
    menuSize: 7,
    nonCoercive: true,
    state: idle(cycle, at),
    ...over,
  };
};

describe("the shard shape", () => {
  test("the path is agent / date / ZetaId, and the id is canonical hex", () => {
    const root = tempRoot();
    const path = appendCycle(rec(), root);
    const parts = path.slice(root.length + 1).split(/[\\/]/);
    expect(parts.slice(0, 4)).toEqual(["alexa", "2026", "09", "03"]);
    expect(parts[4]?.replace(".json", "")).toMatch(SHARD_ID_RE);
  });

  test("THE SAME RECORD LANDS AT THE SAME PATH — a re-append is an upsert", () => {
    const root = tempRoot();
    const record = rec();
    const first = appendCycle(record, root);
    const second = appendCycle(record, root);
    expect(second).toBe(first);
    // And exactly one file exists, so a re-run does not duplicate history.
    expect(readHistory(root, "alexa")).toHaveLength(1);
  });

  test("DIFFERENT records land at DIFFERENT paths, even in the same millisecond", () => {
    const root = tempRoot();
    const a = rec({ cycle: 1 });
    const b = rec({ cycle: 2 });
    expect(a.at).toBe(b.at);
    expect(appendCycle(a, root)).not.toBe(appendCycle(b, root));
  });

  test("the id is a pure function of CONTENT — key order does not change it", () => {
    const root = tempRoot();
    const forward = rec();
    // The same fields, built in a different insertion order. A shallow or locale-dependent sort
    // would give this a different digest and therefore a different address.
    const shuffled = JSON.parse(
      JSON.stringify({
        state: forward.state,
        nonCoercive: forward.nonCoercive,
        menuSize: forward.menuSize,
        cycle: forward.cycle,
        agent: forward.agent,
        at: forward.at,
      }),
    ) as CycleRecord;
    expect(appendCycle(shuffled, root)).toBe(appendCycle(forward, root));
  });

  test("canonical JSON sorts NESTED keys too", () => {
    // Sorting only the top level would leave `state` in insertion order, so two writers building
    // the same record by different code paths would produce different bytes for the same content.
    const a = canonicalJson({ b: 1, a: { z: 1, y: 2 } });
    const b = canonicalJson({ a: { y: 2, z: 1 }, b: 1 });
    expect(a).toBe(b);
    expect(a.indexOf('"a"')).toBeLessThan(a.indexOf('"b"'));
    expect(a.indexOf('"y"')).toBeLessThan(a.indexOf('"z"'));
  });

  test("THE KEY SORT IS ORDINAL, not locale-aware", () => {
    // Locale collation orders "a" before "B"; code-unit order puts "B" (0x42) first. The digest
    // decides the filename, so a locale-aware sort makes the same record land at different
    // addresses on machines with different ICU data — a content address that is not a function of
    // the content.
    const out = canonicalJson({ a: 1, B: 2 });
    expect(out.indexOf('"B"')).toBeLessThan(out.indexOf('"a"'));
    expect("a".localeCompare("B", "en")).toBeLessThan(0); // the collation this avoids
  });

  test("the id encodes the record's OWN time — ids sort chronologically", () => {
    const root = tempRoot();
    // Same content apart from the instant. If the mint ignored `at`, the ids would carry no time
    // and hex-filename order inside a directory would stop meaning anything.
    const early = appendCycle(rec({ at: "2026-09-03T10:00:00.000Z" }), root).split(/[\/]/).pop()!;
    const late = appendCycle(rec({ at: "2026-09-03T23:00:00.000Z" }), root).split(/[\/]/).pop()!;
    expect(early < late).toBe(true);
  });

  test("cycleZetaId refuses an unparseable timestamp WITH ITS OWN MESSAGE", () => {
    // Asserted on the mint directly, and on the message. `pack` also throws when handed a NaN
    // timestamp, so a bare `toThrow()` passes whether or not this guard exists — the message is
    // what distinguishes our refusal from the library's incidental failure downstream.
    // The message must name a CYCLE record: the shard store throws its own "shard record has
    // unparseable timestamp" when handed NaN, so matching the shared phrase passes whether this
    // guard exists or not.
    expect(() => cycleZetaId(rec({ at: "not-a-date" }))).toThrow("cycle record has unparseable timestamp");
  });

  test("an unparseable timestamp is REFUSED, not silently addressed", () => {
    expect(() => appendCycle(rec({ at: "not-a-date" }), tempRoot())).toThrow(
      "cycle record has unparseable timestamp",
    );
  });
});

describe("reading history", () => {
  test("a root that does not exist is an EMPTY history, not an error", () => {
    expect(readHistory(join(tempRoot(), "nothing-here"))).toEqual([]);
    expect(currentState(join(tempRoot(), "nothing-here"), "alexa")).toBeUndefined();
  });

  test("ordering comes from the record's OWN TIME — even against the cycle numbers", () => {
    const root = tempRoot();
    // The cycle numbers deliberately DISAGREE with the timestamps. Ordering by time gives 3,2,1;
    // any fallback to the cycle tie-break or to filesystem order gives something else, so this
    // distinguishes them where an agreeing fixture could not.
    appendCycle(rec({ cycle: 3, at: "2026-09-03T10:00:00.000Z" }), root);
    appendCycle(rec({ cycle: 1, at: "2026-09-03T12:00:00.000Z" }), root);
    appendCycle(rec({ cycle: 2, at: "2026-09-03T11:00:00.000Z" }), root);
    expect(readHistory(root, "alexa").map((r) => r.cycle)).toEqual([3, 2, 1]);
    expect(readHistory(root, "alexa").map((r) => r.at)).toEqual([
      "2026-09-03T10:00:00.000Z",
      "2026-09-03T11:00:00.000Z",
      "2026-09-03T12:00:00.000Z",
    ]);
  });

  test("same-instant records still get a TOTAL order, by cycle then id", () => {
    const root = tempRoot();
    appendCycle(rec({ cycle: 2 }), root);
    appendCycle(rec({ cycle: 1 }), root);
    expect(readHistory(root, "alexa").map((r) => r.cycle)).toEqual([1, 2]);
  });

  test("A MERGE IS SET UNION — the same record from two branches counts once", () => {
    const root = tempRoot();
    const record = rec();
    appendCycle(record, root);
    // Simulate the other branch's copy landing under a different date directory, as a hand-merge
    // or a mis-sharded writer might produce. Identity is the ZetaId, not the path.
    const stray = join(root, "alexa", "2026", "09", "04");
    mkdirSync(stray, { recursive: true });
    const name = readdirSync(join(root, "alexa", "2026", "09", "03"))[0];
    writeFileSync(join(stray, name!), canonicalJson(record));
    expect(readHistory(root, "alexa")).toHaveLength(1);
  });

  test("agents are separate — one agent's history is not another's", () => {
    const root = tempRoot();
    appendCycle(rec(), root);
    appendCycle(rec({ agent: "otto", state: { tag: "Idle", context: { agent: "otto", cycle: 1, sessionStartIso: "2026-09-03T10:00:00.000Z" } } }), root);
    expect(readHistory(root, "alexa")).toHaveLength(1);
    expect(readHistory(root, "otto")).toHaveLength(1);
    // And the whole store holds both.
    expect(readHistory(root)).toHaveLength(2);
  });
});

describe("resuming", () => {
  test("the current state is the LAST recorded one", () => {
    const root = tempRoot();
    appendCycle(rec({ cycle: 1, at: "2026-09-03T10:00:00.000Z" }), root);
    const paused: CycleRecord = rec({
      cycle: 2,
      at: "2026-09-03T11:00:00.000Z",
      state: { tag: "Paused", context: { agent: "alexa", cycle: 2, sessionStartIso: "2026-09-03T10:00:00.000Z" }, reason: "break" },
    });
    appendCycle(paused, root);
    expect(currentState(root, "alexa")?.tag).toBe("Paused");
  });

  test("an agent with NO history has no state — never a fabricated Idle", () => {
    // A fabricated resume would silently continue from a state nobody recorded, which is worse
    // than refusing: the caller believes it resumed.
    expect(currentState(tempRoot(), "alexa")).toBeUndefined();
  });

  test("the next cycle number is one past the highest, and 1 for a fresh agent", () => {
    const root = tempRoot();
    expect(nextCycleNumber(root, "alexa")).toBe(1);
    appendCycle(rec({ cycle: 1, at: "2026-09-03T10:00:00.000Z" }), root);
    appendCycle(rec({ cycle: 7, at: "2026-09-03T11:00:00.000Z" }), root);
    // The HIGHEST, not the count — a gap in the history must not re-issue a used number.
    expect(nextCycleNumber(root, "alexa")).toBe(8);
  });
});

describe("the non-coercion invariant is auditable AFTER the fact", () => {
  test("a coercive cycle is findable in the history", () => {
    const root = tempRoot();
    appendCycle(rec({ cycle: 1, at: "2026-09-03T10:00:00.000Z" }), root);
    appendCycle(rec({ cycle: 2, at: "2026-09-03T11:00:00.000Z", nonCoercive: false }), root);
    const history = readHistory(root, "alexa");
    expect(coerciveCycles(history).map((r) => r.cycle)).toEqual([2]);
    // The discriminating half: a clean history reports none, so this is not counting everything.
    expect(coerciveCycles(history.filter((r) => r.cycle === 1))).toEqual([]);
  });
});

describe("the bytes on disk", () => {
  test("a written record round-trips exactly", () => {
    const root = tempRoot();
    const record = rec();
    const path = appendCycle(record, root);
    expect(JSON.parse(readFileSync(path, "utf-8"))).toEqual(record);
  });
});
