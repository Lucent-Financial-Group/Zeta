/**
 * promotion-soak.test.ts — falsifiers for "the illegal-selection counter is real".
 *
 * The counter the promotion gate demotes on was structurally always zero: `observeWithParticipant`
 * discarded the `ChooseResult`, and two participants CLAMPED an out-of-range index while reporting
 * `fallback: false`. A lane naming slot 999 of 15 on every tick would have soaked its way to primary
 * with a spotless record. Every test below fails on the code that allowed that.
 */

import { describe, expect, test } from "bun:test";
import {
  humanParticipant,
  oracleParticipant,
  participantTick,
  testPersonaParticipant,
  type HumanNotifier,
  type Participant,
} from "./participant";
import { buildMenu, type World } from "./observe";
import { runSoak, windowFromTally, type SoakTally } from "./promotion-soak";
import { evaluatePromotion } from "../enforcement/promotion-gate";

const WORK_WORLD: World = {
  backlog: [{ id: "081KSIM000000001", title: "test-item", ready: true, ambiguous: false }],
};

describe("participantTick — the illegal selection is finally visible", () => {
  test("a clamping participant that reached past the menu is REPORTED, not hidden", async () => {
    // THE regression. `testPersonaParticipant` clamps 999 -> menu.length-1 and used to return
    // `fallback: false` with no other signal, so the fault vanished entirely.
    const tick = await participantTick(
      WORK_WORLD,
      testPersonaParticipant("oob", () => 999),
    );
    expect(tick.illegalSelection).toBe(true);
    expect(tick.cause).toBe("out-of-range");
  });

  test("the clamp itself is unchanged — the recovery still lands in range", async () => {
    const menu = buildMenu(WORK_WORLD);
    const tick = await participantTick(
      WORK_WORLD,
      testPersonaParticipant("oob", () => 999),
    );
    expect(tick.chosenIndex).toBe(menu.length - 1);
    expect(tick.action).toEqual(menu[menu.length - 1]!);
  });

  test("a legal pick reports no illegal selection", async () => {
    const tick = await participantTick(
      WORK_WORLD,
      testPersonaParticipant("legal", () => 1),
    );
    expect(tick.illegalSelection).toBe(false);
    expect(tick.cause).toBe("none");
    expect(tick.chosenIndex).toBe(1);
  });

  test("a human naming a slot that does not exist is counted too", async () => {
    const notifier: HumanNotifier = {
      notify: async () => {},
      waitForResponse: async () => ({ choice: 400 }),
    };
    const tick = await participantTick(WORK_WORLD, humanParticipant("max", notifier));
    expect(tick.illegalSelection).toBe(true);
  });

  test("a THROWING chooser is NOT an illegal selection — nothing was selected", async () => {
    // The distinction that keeps the counter meaningful: a broken runtime must not be scored as the
    // lane misbehaving, or a flaky daemon would demote a well-behaved lane.
    const throwing: Participant = {
      kind: "test-persona",
      name: "test:throws",
      choose: async () => {
        throw new Error("chooser exploded");
      },
    };
    const tick = await participantTick(WORK_WORLD, throwing);
    expect(tick.illegalSelection).toBe(false);
    expect(tick.cause).toBe("backend-error");
    expect(tick.fellBackToOracle).toBe(true);
    expect(tick.chosenIndex).toBeNull();
  });

  test("a throwing chooser still yields the oracle's action — the loop does not abort", async () => {
    const throwing: Participant = {
      kind: "test-persona",
      name: "test:throws",
      choose: async () => {
        throw new Error("boom");
      },
    };
    const tick = await participantTick(WORK_WORLD, throwing);
    expect(tick.action.kind).toBe("do_item");
    expect(tick.divergedFromOracle).toBe(false);
  });

  test("divergence is measured against the oracle's KIND", async () => {
    const menu = buildMenu(WORK_WORLD);
    const freeIdx = menu.findIndex((a) => a.kind === "free_time");
    expect(freeIdx).toBeGreaterThanOrEqual(0);
    const tick = await participantTick(
      WORK_WORLD,
      testPersonaParticipant("free", () => freeIdx),
    );
    expect(tick.action.kind).toBe("free_time");
    expect(tick.divergedFromOracle).toBe(true);
  });

  test("the oracle participant never diverges from itself", async () => {
    const tick = await participantTick(WORK_WORLD, oracleParticipant());
    expect(tick.divergedFromOracle).toBe(false);
    expect(tick.illegalSelection).toBe(false);
  });
});

describe("runSoak — counts what the gate reads", () => {
  const fixedClock = (msPerCall: number) => {
    let t = 0;
    return () => {
      const v = t;
      t += msPerCall;
      return v;
    };
  };

  test("a lane that reaches past its menu on every tick is counted on every tick", async () => {
    const tally = await runSoak({
      participant: testPersonaParticipant("always-oob", () => 999),
      rounds: 2,
      now: fixedClock(0),
    });
    expect(tally.ticks).toBeGreaterThan(0);
    // Before this change the answer here was 0, on identical inputs.
    expect(tally.illegalSelections).toBe(tally.ticks);
  });

  test("a lane that always takes free time diverges on EVERY tick, and the count says so", async () => {
    // The sharp version: the oracle never picks `free_time` in any of the seven scenarios, so a
    // participant that always does diverges every time. Asserting `=== ticks` (not `> 0`) is what
    // kills a mutant that stops incrementing the counter — "a clean lane records 0" alone does not,
    // because a counter that never increments satisfies it. Found by the mutation matrix.
    const tally = await runSoak({
      participant: testPersonaParticipant("free", (_w, menu) => menu.findIndex((a) => a.kind === "free_time")),
      rounds: 2,
      now: fixedClock(0),
    });
    expect(tally.ticks).toBeGreaterThan(0);
    expect(tally.divergences).toBe(tally.ticks);
    expect(windowFromTally(tally).divergenceRate).toBe(1);
  });

  test("a clean lane records zero illegal selections", async () => {
    const tally = await runSoak({ participant: oracleParticipant(), rounds: 2, now: fixedClock(0) });
    expect(tally.illegalSelections).toBe(0);
    expect(tally.divergences).toBe(0);
  });

  test("soak hours come from the clock, not from the tick count", async () => {
    // A soak measured in ticks is not a soak measured in hours; conflating them would let a
    // three-second run claim a day of exposure.
    const tally = await runSoak({ participant: oracleParticipant(), rounds: 1, now: fixedClock(1_000) });
    expect(tally.elapsedMs).toBeGreaterThan(0);
    expect(windowFromTally(tally).shadowSoakHours).toBeCloseTo(tally.elapsedMs / 3_600_000, 10);
  });
});

describe("windowFromTally — the window the gate reads", () => {
  const tally = (patch: Partial<SoakTally>): SoakTally => ({
    ticks: 100,
    illegalSelections: 0,
    divergences: 0,
    oracleFallbacks: 0,
    elapsedMs: 0,
    ...patch,
  });

  test("a clean 100-tick soak PROMOTES — the gate is satisfiable, not merely safe", () => {
    // A gate that can only ever refuse is half a control. This is the falsifier that it can pass.
    expect(evaluatePromotion(windowFromTally(tally({}))).mode).toBe("primary");
  });

  test("one illegal selection in the whole soak is enough to refuse", () => {
    const d = evaluatePromotion(windowFromTally(tally({ illegalSelections: 1 })));
    expect(d.mode).toBe("shadow");
    expect(d.reason).toBe("illegal_selections");
  });

  test("divergence above the bar refuses even with plenty of soak", () => {
    // The measured figure for qwen2.5:0.5b on these scenarios is ~24%, so this is the real case.
    const d = evaluatePromotion(windowFromTally(tally({ divergences: 24 })));
    expect(d.mode).toBe("shadow");
    expect(d.reason).toBe("divergence_too_high");
  });

  test("an empty soak reports 0 divergence, not NaN", () => {
    // 0/0 is NaN, and the gate would then report a CORRUPT window — true, but a confusing way to
    // say "you ran zero ticks". The accurate reason is insufficient soak.
    const w = windowFromTally(tally({ ticks: 0 }));
    expect(Number.isNaN(w.divergenceRate)).toBe(false);
    expect(evaluatePromotion(w).reason).toBe("insufficient_soak");
  });

  test("the primary-mode counters are reported as zero because a shadow soak dispatched nothing", () => {
    const w = windowFromTally(tally({}));
    expect(w.primarySelectorRejections30m).toBe(0);
    expect(w.primaryControlBypassRejections30m).toBe(0);
  });
});
