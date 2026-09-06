/**
 * observe-act-window.test.ts — a gate that cannot open measures nothing.
 *
 * `slot-dispatch.test.ts` pins that the gate REFUSES correctly. That is half a property. A gate
 * wired to a window that is always empty refuses every time, passes every one of those tests, and
 * is unfalsifiable — the vacuity class with the sign flipped. So the load-bearing test in this file
 * is the one where a real soaked window with a real comparison actually PROMOTES.
 */

import { describe, expect, test } from "bun:test";
import {
  compareToLegacy,
  DEMOTION_WINDOW_MS,
  foldObserveActWindow,
  legacySelection,
  TickComparison,
  type ObserveActTick,
} from "./observe-act-window";
import { AgentLoopMode, evaluatePromotionGate } from "./slot-dispatch";

const HOUR = 60 * 60 * 1000;
const NOW = 1_800_000_000_000;

function tick(over: Partial<ObserveActTick> = {}): ObserveActTick {
  return {
    tickId: "t",
    atMs: NOW,
    mode: AgentLoopMode.ObserveActShadow,
    slot: "PickWork",
    performed: false,
    illegalSelection: false,
    controlBypassRejected: false,
    comparison: TickComparison.Agreed,
    ...over,
  };
}

/**
 * A clean, fully-compared shadow window — the one a lane has to earn.
 *
 * Ticks are spaced by the MINUTE and anchored 30h back, so any count up to a few hundred stays
 * strictly inside the window and strictly in the past. The first draft spaced them by the hour and
 * anchored the same way, which pushed everything past tick ~30 into the future; the fold correctly
 * excluded them and the arithmetic error read as a code defect.
 */
function soaked(count: number, over: Partial<ObserveActTick> = {}): ObserveActTick[] {
  return Array.from({ length: count }, (_, i) =>
    tick({ tickId: `t${String(i)}`, atMs: NOW - 30 * HOUR + i * 60_000, ...over }),
  );
}

describe("A REAL WINDOW CAN PROMOTE — otherwise the gate is unfalsifiable", () => {
  test("100 compared, clean, soaked ticks earn PRIMARY", () => {
    // The whole point of this module. Before it existed the window was hardcoded to zeros and this
    // outcome was unreachable, so every refusal test passed for a reason unrelated to the gate.
    const readout = foldObserveActWindow(soaked(100), NOW);
    expect(readout.window.shadowTicks).toBe(100);
    expect(readout.window.divergenceMeasured).toBe(true);
    expect(evaluatePromotionGate(readout.window).mode).toBe(AgentLoopMode.ObserveActPrimary);
  });

  test("...and an empty window does NOT, for the true reason", () => {
    const readout = foldObserveActWindow([], NOW);
    const v = evaluatePromotionGate(readout.window);
    expect(v.mode).toBe(AgentLoopMode.ObserveActShadow);
    expect(readout.window.divergenceMeasured).toBe(false);
    expect(readout.summary).toContain("UNMEASURED");
  });
});

describe("A PARTIAL COMPARISON IS UNMEASURED, not a good rate", () => {
  test("497 uncompared ticks out of 500 do not become agreement", () => {
    const ticks = [...soaked(497, { comparison: TickComparison.NotCompared }), ...soaked(3)];
    const readout = foldObserveActWindow(ticks, NOW);
    expect(readout.comparedTicks).toBe(3);
    expect(readout.totalTicks).toBe(500);
    expect(readout.window.divergenceMeasured).toBe(false);
    expect(evaluatePromotionGate(readout.window).mode).toBe(AgentLoopMode.ObserveActShadow);
  });

  test("the reported rate is ZERO when unmeasured, and the FLAG is what blocks", () => {
    // Belt and braces on purpose: the number is not trusted to carry the "unknown", the boolean is.
    const readout = foldObserveActWindow(soaked(200, { comparison: TickComparison.NotCompared }), NOW);
    expect(readout.window.shadowDivergenceRate).toBe(0);
    expect(readout.window.divergenceMeasured).toBe(false);
    expect(evaluatePromotionGate(readout.window).blockedBy.some((b) => b.includes("never measured"))).toBe(true);
  });

  test("an EMPTY window is unmeasured too — `every` over nothing is vacuously true", () => {
    // The bug this pins: `compared.length === shadow.length` is 0 === 0 for an empty window, so
    // without the length guard a lane with no ticks at all would report divergence as MEASURED.
    expect(foldObserveActWindow([], NOW).window.divergenceMeasured).toBe(false);
  });
});

describe("the window is ROLLING — old ticks are dropped, not aged down", () => {
  test("a tick outside the window does not count toward soak or ticks", () => {
    const ancient = tick({ atMs: NOW - 60 * 24 * HOUR });
    const readout = foldObserveActWindow([ancient, ...soaked(3)], NOW);
    expect(readout.window.shadowTicks).toBe(3);
    expect(readout.window.shadowSoakHours).toBeLessThan(24 * 7);
  });

  test("a tick from the FUTURE is excluded rather than inflating the soak", () => {
    const readout = foldObserveActWindow([tick({ atMs: NOW + 100 * HOUR }), ...soaked(2)], NOW);
    expect(readout.window.shadowTicks).toBe(2);
  });

  test("SOAK IS THE SPAN, not the count", () => {
    // Two ticks a day apart have soaked a day. Counting ticks times an assumed interval would make
    // a quiet-but-old lane look fresh.
    const two = [tick({ atMs: NOW - 25 * HOUR }), tick({ atMs: NOW })];
    expect(foldObserveActWindow(two, NOW).window.shadowSoakHours).toBeCloseTo(25, 5);
  });
});

describe("the counters count the RIGHT ticks", () => {
  test("primary safety counters ignore SHADOW ticks INSIDE the 30-minute window", () => {
    // A shadow tick cannot be refused at act time. Counting them would let shadow noise trip the
    // demotion thresholds.
    //
    // The ticks must be RECENT for this to test anything. The first draft used 30-hour-old ticks,
    // so the time filter excluded them and the mode filter was never exercised — a test that
    // passed for the wrong reason, and a mutant deleting the mode check survived it.
    const recentShadow = Array.from({ length: 5 }, (_, i) =>
      tick({
        tickId: `s${String(i)}`,
        atMs: NOW - 60_000 * (i + 1),
        mode: AgentLoopMode.ObserveActShadow,
        illegalSelection: true,
        controlBypassRejected: true,
      }),
    );
    const readout = foldObserveActWindow(recentShadow, NOW);
    expect(readout.window.primarySelectorRejections30m).toBe(0);
    expect(readout.window.primaryControlBypassRejections30m).toBe(0);
    expect(readout.window.shadowIllegalSelections).toBe(5);
  });

  test("primary counters see only the last 30 minutes", () => {
    const recent = tick({
      atMs: NOW - DEMOTION_WINDOW_MS / 2,
      mode: AgentLoopMode.ObserveActPrimary,
      controlBypassRejected: true,
    });
    const older = tick({
      atMs: NOW - 5 * HOUR,
      mode: AgentLoopMode.ObserveActPrimary,
      controlBypassRejected: true,
    });
    expect(foldObserveActWindow([recent, older], NOW).window.primaryControlBypassRejections30m).toBe(1);
  });

  test("CONTROL BYPASS AND ILLEGAL SELECTION ARE TWO SIGNALS, not one counted twice", () => {
    // The defect this replaces: the first draft derived control-bypass from `performed && illegal`,
    // which is the selector signal wearing a conjunction. A tick that was refused at act time
    // without ever making an illegal selection must move ONLY the bypass counter.
    const t = tick({
      atMs: NOW,
      mode: AgentLoopMode.ObserveActPrimary,
      performed: false,
      illegalSelection: false,
      controlBypassRejected: true,
    });
    const w = foldObserveActWindow([t], NOW).window;
    expect(w.primaryControlBypassRejections30m).toBe(1);
    expect(w.primarySelectorRejections30m).toBe(0);
  });
});

describe("the divergence rate is a real fraction of the window", () => {
  test("10 diverged out of 100 reads 10%, and BLOCKS at the 5% threshold", () => {
    const ticks = [...soaked(90), ...soaked(10, { comparison: TickComparison.Diverged })];
    const readout = foldObserveActWindow(ticks, NOW);
    expect(readout.window.shadowDivergenceRate).toBeCloseTo(0.1, 5);
    expect(evaluatePromotionGate(readout.window).blockedBy.some((b) => b.includes("divergence"))).toBe(true);
  });

  test("the denominator is the WINDOW, not the compared subset", () => {
    // With 100 shadow ticks of which 4 diverged, the rate is 4/100 — never 4/4.
    const ticks = [...soaked(96), ...soaked(4, { comparison: TickComparison.Diverged })];
    expect(foldObserveActWindow(ticks, NOW).window.shadowDivergenceRate).toBeCloseTo(0.04, 5);
  });

  test("A PARTLY-COMPARED WINDOW REPORTS 0, NOT THE SUBSET'S RATE", () => {
    // The case that separates the two denominators. 10 compared ticks of which 5 diverged, plus 90
    // never compared: over the subset that is a 50% rate, over the window it is unmeasured. The
    // honest answer is 0-and-unmeasured, and the gate blocks on the flag.
    //
    // The test above cannot make this distinction — every one of its ticks is compared, so subset
    // and window are the same set and a mutant swapping the denominator survives it.
    const ticks = [
      ...soaked(90, { comparison: TickComparison.NotCompared }),
      ...soaked(5),
      ...soaked(5, { comparison: TickComparison.Diverged }),
    ];
    const readout = foldObserveActWindow(ticks, NOW);
    expect(readout.comparedTicks).toBe(10);
    expect(readout.window.divergenceMeasured).toBe(false);
    expect(readout.window.shadowDivergenceRate).toBe(0);
  });
});

describe("compareToLegacy — three states, and BOTH halves of a selection", () => {
  test("no legacy answer is NOT COMPARED, never agreement", () => {
    expect(compareToLegacy({ slot: "PickWork" }, undefined).comparison).toBe(TickComparison.NotCompared);
  });

  test("SAME SLOT, DIFFERENT ITEM IS DIVERGENCE — the coarse check would call it agreement", () => {
    // Which work gets done is the only thing that matters here. Comparing slot tags alone scores
    // this as agreement and drives the measured rate toward zero for a reason having nothing to do
    // with the lanes agreeing.
    const c = compareToLegacy({ slot: "PickWork", workId: "a" }, { slot: "PickWork", workId: "b" });
    expect(c.comparison).toBe(TickComparison.Diverged);
    expect(c.legacySlot).toBe("PickWork:b");
  });

  test("same slot and same item is agreement", () => {
    expect(
      compareToLegacy({ slot: "PickWork", workId: "a" }, { slot: "PickWork", workId: "a" }).comparison,
    ).toBe(TickComparison.Agreed);
  });

  test("a different slot is divergence", () => {
    expect(compareToLegacy({ slot: "TakeBreak" }, { slot: "EmitHeartbeat" }).comparison).toBe(
      TickComparison.Diverged,
    );
  });
});

describe("legacySelection — an independent selector, ordinal ties", () => {
  test("it picks the highest contribution, which the menu generator need not", () => {
    const s = legacySelection([
      { id: "low", estimatedDoraContribution: 0.1 },
      { id: "high", estimatedDoraContribution: 0.9 },
    ]);
    expect(s).toEqual({ slot: "PickWork", workId: "high" });
  });

  test("no candidates yields a heartbeat, not a PickWork with nothing to pick", () => {
    expect(legacySelection([])).toEqual({ slot: "EmitHeartbeat" });
  });

  test("TIES BREAK ORDINAL, not by locale", () => {
    // `localeCompare` would order these by the machine's collation, which would make the divergence
    // rate machine-dependent. Ordinal puts uppercase first — the property being pinned.
    expect("B" < "a").toBe(true);
    const s = legacySelection([
      { id: "a", estimatedDoraContribution: 0.5 },
      { id: "B", estimatedDoraContribution: 0.5 },
    ]);
    expect(s.workId).toBe("B");
  });
});
