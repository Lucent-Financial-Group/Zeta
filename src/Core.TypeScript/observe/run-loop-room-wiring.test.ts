/**
 * run-loop-room-wiring.test.ts — the loop's pick really is a bounded Room.
 *
 * WHY THIS FILE EXISTS. `tickRooms` and its budget were previously exercised only by their own
 * tests, so "a room cannot run forever" was true of a code path the loop never took. Wiring the
 * loop's pick through the runner is what makes the property matter — and this is what stops the
 * wiring silently regressing back to a bare `await participant.choose(...)`.
 *
 * The bound is not decorative here. `participant.choose` has NO timeout of its own, so a
 * `cloud:<persona>` or `local-llm` participant that never returns would hang the tick process
 * indefinitely. The deadline is the only thing between that and a wedged loop.
 *
 * These tests drive `createLoopRoom` — the loop's own factory — rather than a lookalike, so what is
 * asserted is the wiring that actually ships.
 */

import { describe, expect, test } from "bun:test";
import { createLoopRoom } from "./run-loop-real";
import { tickRooms } from "./room";
import type { Participant } from "./participant";
import type { BacklogItem, World } from "./observe";

const ITEM: BacklogItem = { id: "081KWIRING0000000000000001", title: "wired", ready: true, ambiguous: false };
const WORLD: World = { backlog: [ITEM], operator: { pendingMessage: false, pendingFerry: false } };

function participantThat(
  behaviour: "prompt" | "hangs" | "throws",
  index = 0,
): Participant {
  return {
    kind: "test-persona",
    name: `test-${behaviour}`,
    choose: async () => {
      if (behaviour === "throws") throw new Error("chooser exploded");
      if (behaviour === "hangs") await new Promise(() => {}); // never resolves
      return { index, raw: "test", fallback: false, cause: "none" as const };
    },
  };
}

const deps = (behaviour: "prompt" | "hangs" | "throws", over: Partial<Parameters<typeof createLoopRoom>[0]> = {}) => {
  const seen: { index: number; raw: string; fallback: boolean }[] = [];
  const room = createLoopRoom({
    by: "otto",
    dryRun: true,
    backlogIds: [ITEM.id],
    participant: participantThat(behaviour),
    deadlineMs: 25,
    onChoose: r => seen.push(r),
    ...over,
  });
  return { room, seen };
};

describe("run-loop-real wires its pick through the bounded room runner", () => {
  test("a hanging participant does NOT hang the tick — the deadline fires and no action comes back", async () => {
    // The whole point of the wiring. Before it, this scenario hung the process forever.
    const { room } = deps("hangs");
    const [r] = await tickRooms([room], WORLD);
    expect(r!.timedOut).toBe(true);
    expect(r!.result).toBeUndefined(); // nothing to execute — the loop must not invent an action
    expect(r!.stepsUsed).toBe(1); // and the attempt was charged, so it cannot be retried forever
  });

  test("a throwing participant degrades to a pick instead of crashing the tick", async () => {
    const { room, seen } = deps("throws");
    const [r] = await tickRooms([room], WORLD);
    expect(r!.timedOut).toBe(false);
    expect(r!.result?.action).toBeDefined();
    expect(seen[0]).toEqual({ index: 0, raw: "choose-threw", fallback: true });
    expect(r!.result?.confidence).toBe(0); // a fallback pick is reported as zero-confidence
  });

  test("the room is BEHAVIOUR-NEUTRAL: it admits the loop's backlog and keeps the operator", async () => {
    // The wiring must bound the tick without narrowing what the loop may see. If the scope dropped
    // the backlog or the operator channel, the loop would quietly start making different decisions.
    const { room } = deps("prompt");
    expect(room.scope.backlogIds.has(ITEM.id)).toBe(true);
    expect(room.scope.operatorAccess).toBe(true);
    expect(room.scope.prNumbers.size).toBe(0); // so scopeWorld leaves forgeState untouched
    const [r] = await tickRooms([room], WORLD);
    expect(r!.scopeViolation).toBe(false);
    expect(r!.result?.action).toBeDefined();
  });

  test("seams follow --dry-run, and the budget is one step", async () => {
    expect(deps("prompt", { dryRun: true }).room.seamMode).toBe("mock");
    expect(deps("prompt", { dryRun: false }).room.seamMode).toBe("real");
    // A dry run must not claim write access either.
    expect(deps("prompt", { dryRun: true }).room.scope.writeAccess).toBe(false);
    expect(deps("prompt", { dryRun: false }).room.scope.writeAccess).toBe(true);
    // ONE tick per process — the honest budget for this entrypoint.
    expect(deps("prompt").room.budget?.maxSteps).toBe(1);
  });

  test("the second tick in one process is refused — maxSteps is 1, not a suggestion", async () => {
    const { room } = deps("prompt");
    const [first] = await tickRooms([room], WORLD);
    expect(first!.budgetExhausted).toBe(false);
    const [second] = await tickRooms([room], WORLD);
    expect(second!.budgetExhausted).toBe(true);
    expect(second!.result).toBeUndefined();
  });
});
