/**
 * room-bounded.dst.test.ts — a room cannot run forever, in either seam mode.
 *
 * THE CLAIM BEING MADE EXECUTABLE. Rooms "can run in test mode with injected test deps or in prod
 * mode with real deps but in either case they are bounded time — they can't run forever."
 * Before this, nothing enforced it anywhere: the org-side `RoomBudget.maxSteps` was declared and
 * read by nothing (the identifier appeared only in its own file, and the room factory was called
 * only by its own test), and this runner awaited `room.tick(...)` with no deadline at all.
 *
 * Two bounds, because either alone leaves the door open:
 *   maxSteps   — the room is REFUSED once its steps are spent (not throttled: not run).
 *   maxTickMs  — the runner stops waiting for a single overrunning tick.
 *
 * The invariant that ties them together is invariant 3: a timed-out tick still COSTS a step. A
 * free timeout means a hanging room is retried forever — bounded per tick, unbounded in aggregate.
 *
 * Seeded by `splitmix64.mix`. The one thing here that is genuinely time-dependent is the deadline
 * itself, so hanging rooms use a small `maxTickMs` and the assertions are about counts and flags,
 * never about elapsed milliseconds.
 */

import { describe, expect, test } from "bun:test";
import { mix } from "../../splitmix64/splitmix64";
import type { ChooserResult } from "../chooser";
import type { World } from "../observe";
import { DEFAULT_ROOM_BUDGET, STEPS_USED_KEY, tickRooms, type Room, type RoomBudget, type ScopePredicate, type SeamMode } from "./room";

function stream(seed: bigint) {
  let state = seed;
  const next = (): bigint => {
    state = mix(state);
    return state;
  };
  return { below: (n: number): number => Number(next() % BigInt(n)) };
}

const WORLD: World = { backlog: [] };

const OPEN_SCOPE: ScopePredicate = {
  backlogIds: new Set<string>(),
  prNumbers: new Set<number>(),
  operatorAccess: false,
  writeAccess: false,
};

// A real `ChooserResult` — no cast. The first draft asserted `as ChooserResult` over a `source`
// field that does not exist on the type; it ran fine (bun strips types) and only tsc objected.
const freeAction: ChooserResult = {
  action: { kind: "free_time", reason: "bounded-test" },
  tier: "oracle",
  confidence: 1,
};

type Behaviour = "prompt" | "hangs" | "throws";

/** A room whose tick behaviour is fixed, and which counts how many times it was actually invoked. */
function makeRoom(id: string, behaviour: Behaviour, budget: RoomBudget, seamMode: SeamMode) {
  const calls = { count: 0 };
  const room: Room = {
    id,
    scope: OPEN_SCOPE,
    state: {},
    seamMode,
    budget,
    tick: async (): Promise<ChooserResult> => {
      calls.count += 1;
      if (behaviour === "throws") throw new Error("room exploded");
      if (behaviour === "hangs") await new Promise(() => {}); // never resolves
      return freeAction;
    },
  };
  return { room, calls };
}

/** Run `rounds` sequential tick rounds, tolerating a throwing room. */
async function runRounds(room: Room, rounds: number) {
  const trace: string[] = [];
  for (let i = 0; i < rounds; i += 1) {
    try {
      const [r] = await tickRooms([room], WORLD);
      trace.push(`${r!.stepsUsed}:${r!.budgetExhausted ? "X" : "-"}${r!.timedOut ? "T" : "-"}`);
    } catch {
      trace.push("throw");
    }
  }
  return trace;
}

const SEEDS = [1n, 7n, 23n, 99n];

describe("rooms are bounded — they cannot run forever", () => {
  test("1. hard ceiling: a prompt room is never invoked more than maxSteps times", async () => {
    for (const seed of SEEDS) {
      const rng = stream(seed);
      const maxSteps = 1 + rng.below(5);
      for (const seamMode of ["mock", "real"] as const) {
        const { room, calls } = makeRoom("r", "prompt", { maxSteps, maxTickMs: 1000 }, seamMode);
        await runRounds(room, maxSteps + 7); // ask for far more rounds than the budget allows
        const at = { seed: String(seed), seamMode, maxSteps };
        expect({ ...at, invocations: calls.count }).toEqual({ ...at, invocations: maxSteps });
      }
    }
  });

  test("2. refusal is total: past the ceiling the tick is not called at all", async () => {
    const { room, calls } = makeRoom("r", "prompt", { maxSteps: 2, maxTickMs: 1000 }, "mock");
    const trace = await runRounds(room, 5);
    expect(calls.count).toBe(2);
    // steps stop advancing, and every later round reports exhausted
    expect(trace).toEqual(["1:--", "2:--", "2:X-", "2:X-", "2:X-"]);
  });

  test("3. a timed-out tick STILL COSTS A STEP — a hanging room is not retried forever", async () => {
    // The load-bearing one. Free timeouts would make a hanging room unbounded in aggregate.
    const { room, calls } = makeRoom("r", "hangs", { maxSteps: 3, maxTickMs: 15 }, "mock");
    const trace = await runRounds(room, 6);
    expect(trace).toEqual(["1:-T", "2:-T", "3:-T", "3:X-", "3:X-", "3:X-"]);
    expect(calls.count).toBe(3); // invoked exactly maxSteps times, then never again
  });

  test("4. a throwing tick also costs its step — a crash-looping room is bounded too", async () => {
    const { room, calls } = makeRoom("r", "throws", { maxSteps: 2, maxTickMs: 1000 }, "real");
    const trace = await runRounds(room, 5);
    expect(trace).toEqual(["throw", "throw", "2:X-", "2:X-", "2:X-"]);
    expect(calls.count).toBe(2);
    expect(room.state[STEPS_USED_KEY]).toBe(2);
  });

  test("5. the bound is identical in both seam modes", async () => {
    for (const seed of SEEDS) {
      const rng = stream(seed);
      const maxSteps = 1 + rng.below(4);
      const behaviour: Behaviour = (["prompt", "hangs", "throws"] as const)[rng.below(3)]!;
      const mock = makeRoom("r", behaviour, { maxSteps, maxTickMs: 15 }, "mock");
      const real = makeRoom("r", behaviour, { maxSteps, maxTickMs: 15 }, "real");
      const at = { seed: String(seed), behaviour, maxSteps };
      const mockTrace = await runRounds(mock.room, maxSteps + 3);
      const realTrace = await runRounds(real.room, maxSteps + 3);
      expect({ ...at, trace: mockTrace }).toEqual({ ...at, trace: realTrace });
      expect({ ...at, calls: mock.calls.count }).toEqual({ ...at, calls: real.calls.count });
    }
  });

  test("6. a room that declares no budget is still bounded by the default", async () => {
    // "Unbounded" must not be reachable by omission — the property cannot be opt-in.
    const room: Room = {
      id: "no-budget",
      scope: OPEN_SCOPE,
      state: { [STEPS_USED_KEY]: DEFAULT_ROOM_BUDGET.maxSteps - 1 },
      tick: async () => freeAction,
    };
    const [first] = await tickRooms([room], WORLD);
    expect(first!.stepsUsed).toBe(DEFAULT_ROOM_BUDGET.maxSteps);
    expect(first!.budgetExhausted).toBe(false);
    const [second] = await tickRooms([room], WORLD);
    expect(second!.budgetExhausted).toBe(true);
    expect(second!.result).toBeUndefined();
    expect(second!.seamMode).toBe("real"); // the default binding, stated in the result
  });

  test("7. determinism: the same seed produces the same bounded trace", async () => {
    const run = async (seed: bigint) => {
      const rng = stream(seed);
      const maxSteps = 1 + rng.below(4);
      const behaviour: Behaviour = (["prompt", "hangs"] as const)[rng.below(2)]!;
      const { room } = makeRoom("r", behaviour, { maxSteps, maxTickMs: 15 }, "mock");
      return runRounds(room, maxSteps + 2);
    };
    for (const seed of SEEDS) {
      expect(await run(seed)).toEqual(await run(seed));
    }
  });
});
