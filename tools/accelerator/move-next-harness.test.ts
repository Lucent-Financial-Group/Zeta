// tools/accelerator/move-next-harness.test.ts
//
// Tests for the move-next harness (Action Item 3): replay, one cycle, the
// bounded loop (hard cap), the kill-switch, and dry-run.

import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync, mkdirSync, writeFileSync, readdirSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { AgentContext } from "../agent-loop/state-machine.ts";
import type { BuildDeps, Ulid } from "./event-store-schema.ts";
import { isUlid } from "./event-store-schema.ts";
import {
  HALT_SENTINEL,
  MAX_ITERATIONS,
  generateMenu,
  isHalted,
  loadStream,
  newUlid,
  replayState,
  runCycle,
  runLoop,
} from "./move-next-harness.ts";

let root: string;
beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), "accel-store-"));
});
afterEach(() => {
  rmSync(root, { recursive: true, force: true });
});

// Deterministic deps: monotonic ULIDs (still valid Crockford) + fixed clock.
function makeDeps(): BuildDeps {
  let n = 0;
  return {
    newUlid: () => `01J8XQ7M0Z000000000000${String(n++).padStart(4, "0")}` as Ulid,
    nowIso: () => "2026-05-30T00:00:00.000Z",
  };
}

const ctx: AgentContext = { agent: "otto", cycle: 0, sessionStartIso: "2026-05-30T00:00:00.000Z" };

describe("newUlid", () => {
  test("produces valid 26-char Crockford ULIDs that sort chronologically", () => {
    const a = newUlid(1000);
    const b = newUlid(2000);
    expect(isUlid(a)).toBe(true);
    expect(isUlid(b)).toBe(true);
    expect(a < b).toBe(true); // later timestamp sorts after
  });
});

describe("loadStream + replayState", () => {
  test("empty stream replays to Idle", () => {
    expect(loadStream(root, "otto")).toEqual([]);
    expect(replayState([], ctx).tag).toBe("Idle");
  });

  test("a written transition event is loaded + replayed", () => {
    const r = runCycle({ root, ctx, deps: makeDeps() });
    expect(r.wrotePath).toBe(`events/otto/${r.event.id}.json`);
    const stream = loadStream(root, "otto");
    expect(stream).toHaveLength(1);
    // From Idle the first menu option is EmitHeartbeat → RecordingHeartbeat.
    expect(r.to.tag).toBe("RecordingHeartbeat");
    expect(replayState(stream, ctx).tag).toBe("RecordingHeartbeat");
  });
});

describe("runLoop — hard cap (be-good-to-our-host)", () => {
  test("clamps maxIterations to MAX_ITERATIONS", () => {
    const result = runLoop({
      root,
      agent: "otto",
      maxIterations: MAX_ITERATIONS + 100, // ask for way over the cap
      deps: makeDeps(),
    });
    expect(result.cycles.length).toBe(MAX_ITERATIONS);
    expect(result.stopped).toBe("max-iterations");
    // every cycle wrote exactly one event file
    expect(readdirSync(join(root, "events", "otto")).length).toBe(MAX_ITERATIONS);
  });

  test("runs exactly N cycles when N <= cap", () => {
    const result = runLoop({ root, agent: "otto", maxIterations: 3, deps: makeDeps() });
    expect(result.cycles.length).toBe(3);
  });
});

describe("runLoop — kill-switch", () => {
  test("an events/_HALT sentinel stops the loop before any cycle", () => {
    mkdirSync(join(root, "events"), { recursive: true });
    writeFileSync(join(root, "events", HALT_SENTINEL), "stop", "utf8");
    expect(isHalted(root)).toBe(true);
    const result = runLoop({ root, agent: "otto", maxIterations: 5, deps: makeDeps() });
    expect(result.cycles.length).toBe(0);
    expect(result.stopped).toBe("halted");
  });
});

describe("runLoop — dry-run", () => {
  test("writes nothing on dry-run", () => {
    const result = runLoop({ root, agent: "otto", maxIterations: 3, deps: makeDeps(), dryRun: true });
    expect(result.cycles.length).toBe(3);
    expect(result.cycles.every((c) => c.wrotePath === null)).toBe(true);
    expect(existsSync(join(root, "events", "otto"))).toBe(false);
  });
});

describe("generateMenu always offers a valid non-empty menu", () => {
  test("Idle + Paused + other states each yield ≥1 option", () => {
    expect(generateMenu({ tag: "Idle", context: ctx }).length).toBeGreaterThan(0);
    expect(generateMenu({ tag: "Paused", context: ctx, reason: "rest" }).length).toBeGreaterThan(0);
    expect(
      generateMenu({ tag: "ExecutingWork", context: ctx, work: {
        id: "x", lane: "tooling-or-ci", estimatedDoraContribution: 0, uncertainty: 0,
        trajectoryPhase: "execution", agentInterest: 0,
      } }).length,
    ).toBeGreaterThan(0);
  });
});
