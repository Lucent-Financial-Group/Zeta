/**
 * promotion-gate.test.ts — falsifiers for "a lane earns dispatch; it does not assert it".
 *
 * The tests that matter are the ones where a plausible implementation says PRIMARY and the correct
 * one says SHADOW: a window that trips a demotion while satisfying every promotion threshold, and a
 * window whose counters are `NaN`. Both look clean to code that checks thresholds in the obvious
 * order with the obvious comparisons.
 */

import { describe, expect, test } from "bun:test";
import {
  DEMOTION_THRESHOLDS,
  PROMOTION_THRESHOLDS,
  decisionFromSource,
  evaluatePromotion,
  parseWindow,
  windowIsValid,
  type PromotionWindow,
} from "./promotion-gate";

/** A window that promotes. Every test below is this, minus one property. */
const CLEAN: PromotionWindow = {
  shadowTicks: 100,
  shadowSoakHours: 24,
  illegalSelections: 0,
  divergenceRate: 0,
  primarySelectorRejections30m: 0,
  primaryControlBypassRejections30m: 0,
};

const withW = (patch: Partial<PromotionWindow>): PromotionWindow => ({ ...CLEAN, ...patch });

describe("promotion", () => {
  test("a clean, soaked window promotes", () => {
    const d = evaluatePromotion(CLEAN);
    expect(d.mode).toBe("primary");
    expect(d.reason).toBe("promoted");
  });

  test("soak is an OR — either bound satisfies it", () => {
    expect(evaluatePromotion(withW({ shadowTicks: 100, shadowSoakHours: 0 })).mode).toBe("primary");
    expect(evaluatePromotion(withW({ shadowTicks: 0, shadowSoakHours: 24 })).mode).toBe("primary");
    const short = evaluatePromotion(withW({ shadowTicks: 99, shadowSoakHours: 23.9 }));
    expect(short.mode).toBe("shadow");
    expect(short.reason).toBe("insufficient_soak");
  });

  test("the soak boundary is inclusive at exactly the threshold", () => {
    expect(
      evaluatePromotion(withW({ shadowTicks: PROMOTION_THRESHOLDS.minShadowTicks, shadowSoakHours: 0 })).mode,
    ).toBe("primary");
    expect(
      evaluatePromotion(withW({ shadowTicks: PROMOTION_THRESHOLDS.minShadowTicks - 1, shadowSoakHours: 0 })).mode,
    ).toBe("shadow");
  });

  test("the illegal-selection bar is exactly zero", () => {
    const d = evaluatePromotion(withW({ illegalSelections: 1 }));
    expect(d.mode).toBe("shadow");
    expect(d.reason).toBe("illegal_selections");
  });

  test("divergence at exactly the threshold promotes; a hair over does not", () => {
    expect(evaluatePromotion(withW({ divergenceRate: PROMOTION_THRESHOLDS.maxDivergenceRate })).mode).toBe("primary");
    const over = evaluatePromotion(withW({ divergenceRate: PROMOTION_THRESHOLDS.maxDivergenceRate + 1e-9 }));
    expect(over.mode).toBe("shadow");
    expect(over.reason).toBe("divergence_too_high");
  });
});

describe("demotion outranks promotion", () => {
  test("one control-bypass rejection demotes a window that is otherwise perfect", () => {
    // THE ordering falsifier. Every promotion threshold is satisfied here.
    const d = evaluatePromotion(withW({ primaryControlBypassRejections30m: 1 }));
    expect(d.mode).toBe("shadow");
    expect(d.reason).toBe("demoted_control_bypass");
  });

  test("selector rejections demote at the threshold, not below it", () => {
    expect(evaluatePromotion(withW({ primarySelectorRejections30m: 1 })).mode).toBe("primary");
    const d = evaluatePromotion(withW({ primarySelectorRejections30m: DEMOTION_THRESHOLDS.selectorRejections30m }));
    expect(d.mode).toBe("shadow");
    expect(d.reason).toBe("demoted_selector_rejections");
  });

  test("a control bypass is reported over a selector rejection when both trip", () => {
    // Not cosmetic: the reason is what an operator reads first, and going around a control is the
    // more serious of the two.
    const d = evaluatePromotion(withW({ primarySelectorRejections30m: 9, primaryControlBypassRejections30m: 1 }));
    expect(d.reason).toBe("demoted_control_bypass");
  });

  test("demotion also outranks an insufficient soak — the reason names the worse fact", () => {
    const d = evaluatePromotion(withW({ shadowTicks: 0, shadowSoakHours: 0, primaryControlBypassRejections30m: 3 }));
    expect(d.reason).toBe("demoted_control_bypass");
  });
});

describe("a non-finite counter cannot pass a threshold", () => {
  test("NaN divergence resolves to shadow, not to promotion", () => {
    // THE sharp one: `NaN > 0.05` is false, so an unvalidated gate reads a corrupt counter as clean.
    const d = evaluatePromotion(withW({ divergenceRate: NaN }));
    expect(d.mode).toBe("shadow");
    expect(d.reason).toBe("window_invalid");
  });

  test("NaN in a demotion counter also resolves to shadow", () => {
    // `NaN >= 1` is false too — the same hole on the demotion side, where it would be worse.
    expect(evaluatePromotion(withW({ primaryControlBypassRejections30m: NaN })).reason).toBe("window_invalid");
  });

  test("Infinity, negatives and out-of-range rates are all invalid", () => {
    expect(windowIsValid(withW({ shadowTicks: Infinity }))).toBe(false);
    expect(windowIsValid(withW({ shadowSoakHours: -1 }))).toBe(false);
    expect(windowIsValid(withW({ divergenceRate: 1.5 }))).toBe(false);
    expect(windowIsValid(CLEAN)).toBe(true);
  });
});

describe("evidence", () => {
  test("every decision emits all six refs — refusals included", () => {
    for (const w of [CLEAN, withW({ illegalSelections: 3 }), withW({ primaryControlBypassRejections30m: 1 })]) {
      const d = evaluatePromotion(w);
      expect(d.evidence).toHaveLength(6);
      expect(d.evidence.some((e) => e.startsWith("observe-act-promotion:shadow_ticks:"))).toBe(true);
      expect(d.evidence.some((e) => e.startsWith("observe-act-promotion:primary_control_bypass_rejections_30m:"))).toBe(
        true,
      );
    }
  });

  test("the evidence carries the window's real numbers", () => {
    const d = evaluatePromotion(withW({ shadowTicks: 137, illegalSelections: 2 }));
    expect(d.evidence).toContain("observe-act-promotion:shadow_ticks:137");
    expect(d.evidence).toContain("observe-act-promotion:shadow_illegal_selections:2");
  });
});

describe("sources — absent and unreadable are distinct, and both are shadow", () => {
  test("no window at all starts the lane in shadow", () => {
    const d = decisionFromSource({ absent: true });
    expect(d.mode).toBe("shadow");
    expect(d.reason).toBe("insufficient_soak");
  });

  test("an unreadable window is shadow with its own reason", () => {
    const d = decisionFromSource({ ok: false, why: "disk on fire" });
    expect(d.mode).toBe("shadow");
    expect(d.reason).toBe("window_unreadable");
    expect(d.detail).toContain("disk on fire");
  });

  test("a readable window is evaluated normally", () => {
    expect(decisionFromSource({ ok: true, window: CLEAN }).mode).toBe("primary");
  });
});

describe("parseWindow is strict — a defaulted counter is one nobody measured", () => {
  test("a complete document parses", () => {
    const r = parseWindow(JSON.stringify(CLEAN));
    expect(r).toEqual({ ok: true, window: CLEAN });
  });

  test("one missing field makes the WHOLE document unreadable", () => {
    const { divergenceRate: _omitted, ...partial } = CLEAN;
    const r = parseWindow(JSON.stringify(partial));
    expect("ok" in r && r.ok).toBe(false);
    if ("why" in r) expect(r.why).toContain("divergenceRate");
  });

  test("a wrongly-typed field is unreadable, not coerced", () => {
    const r = parseWindow(JSON.stringify({ ...CLEAN, shadowTicks: "100" }));
    expect("ok" in r && r.ok).toBe(false);
  });

  test("malformed JSON, arrays and null are all unreadable", () => {
    for (const raw of ["{", "[]", "null", '"a string"']) {
      const r = parseWindow(raw);
      expect("ok" in r && r.ok).toBe(false);
    }
  });

  test("unknown extra fields are ignored — a forward-compatible document still parses", () => {
    const r = parseWindow(JSON.stringify({ ...CLEAN, futureField: 1 }));
    expect("ok" in r && r.ok).toBe(true);
  });
});

describe("the gate is stateless and deterministic", () => {
  test("the same window always yields the same decision", () => {
    const w = withW({ shadowTicks: 512, divergenceRate: 0.04 });
    expect(evaluatePromotion(w)).toEqual(evaluatePromotion(w));
  });

  test("a lane cannot carry a promotion past the evidence for it", () => {
    // No mode is passed in and none is remembered: a window that stops qualifying stops promoting,
    // on the very next tick.
    expect(evaluatePromotion(CLEAN).mode).toBe("primary");
    expect(evaluatePromotion(withW({ illegalSelections: 1 })).mode).toBe("shadow");
  });
});
