import { describe, expect, test } from "bun:test";
import {
  computeRecommendation,
  decidePriority,
  legalPriorityClassesFor,
  orderByPriority,
  outranksPriority,
  PRIORITY_ORDER,
  PriorityClass,
  priorityRank,
  normalizeInput,
  wasOverridden,
  workable,
  type PriorityDecision,
  type PriorityInputs,
} from "./prioritization";
import { firstLegalChooser, preferChooser } from "./org-decision";
import { buildOrgChart } from "./org-chart";
import { SEED_HATS } from "./org-seed";

const chart = (() => {
  const r = buildOrgChart(SEED_HATS);
  if (!r.ok) throw new Error(r.reason);
  return r.chart;
})();

const ZERO: PriorityInputs = {
  executivePriority: 0,
  customerImpact: 0,
  severity: 0,
  releaseRisk: 0,
  blockedDownstreamCount: 0,
  dependencyFanOut: 0,
  queueAgeMs: 0,
  hatScarcity: 0,
  budgetBurn: 0,
  estimatedEffort: 0,
};

const inputs = (over: Partial<PriorityInputs> = {}): PriorityInputs => ({ ...ZERO, ...over });

describe("the ordering is one source of truth", () => {
  test("most urgent first", () => {
    expect(PRIORITY_ORDER).toEqual(["expedite", "high", "normal", "defer", "paused"]);
    expect(priorityRank(PriorityClass.Expedite)).toBeLessThan(priorityRank(PriorityClass.Paused));
    expect(outranksPriority(PriorityClass.High, PriorityClass.Normal)).toBe(true);
    expect(outranksPriority(PriorityClass.Normal, PriorityClass.High)).toBe(false);
  });
});

describe("the score", () => {
  test("nothing urgent lands at defer, not at normal", () => {
    const r = computeRecommendation("w1", ZERO);
    expect(r.score).toBe(0);
    expect(r.priorityClass).toBe(PriorityClass.Defer);
    expect(r.reasonCodes).toEqual([]);
  });

  test("executive priority carries the most weight", () => {
    const exec = computeRecommendation("w1", inputs({ executivePriority: 1 })).score;
    const impact = computeRecommendation("w1", inputs({ customerImpact: 1 })).score;
    const risk = computeRecommendation("w1", inputs({ releaseRisk: 1 })).score;
    expect(exec).toBeGreaterThan(impact);
    expect(impact).toBeGreaterThan(risk);
  });

  test("everything at once expedites", () => {
    const r = computeRecommendation(
      "w1",
      inputs({
        executivePriority: 1,
        customerImpact: 1,
        severity: 1,
        releaseRisk: 1,
        blockedDownstreamCount: 10,
        hatScarcity: 1,
      }),
    );
    expect(r.priorityClass).toBe(PriorityClass.Expedite);
  });

  test("EVERY reason code names a term that actually contributed", () => {
    // A bare number tells nobody why. "Why is this expedited" must be answerable from the
    // recommendation rather than by re-running the arithmetic in someone's head.
    const r = computeRecommendation("w1", inputs({ severity: 1, budgetBurn: 0.6 }));
    expect(r.reasonCodes).toContain("severity");
    expect(r.reasonCodes).toContain("budget_pressure");
    expect(r.reasonCodes).not.toContain("customer_impact");
  });

  test("ESTIMATED EFFORT ACTUALLY LOWERS THE SCORE", () => {
    // In the reference this field is required, is supplied by callers, and is never read — while
    // the comment beside the scoring says it pushes down. A caller raising it to deprioritise a
    // large job would see nothing happen and have no way to find out why.
    const cheap = computeRecommendation("w1", inputs({ severity: 1, estimatedEffort: 0 }));
    const costly = computeRecommendation("w1", inputs({ severity: 1, estimatedEffort: 1 }));
    expect(costly.score).toBeLessThan(cheap.score);
    expect(costly.reasonCodes).toContain("effort_cost");
    expect(cheap.reasonCodes).not.toContain("effort_cost");
  });

  test("enough downward pressure pauses the work", () => {
    const r = computeRecommendation("w1", inputs({ budgetBurn: 1, estimatedEffort: 1 }));
    expect(r.score).toBeLessThan(0);
    expect(r.priorityClass).toBe(PriorityClass.Paused);
  });

  test("counts are SCALED before saturating — one blocker is not a crisis", () => {
    // Testing only 5-vs-200 could not see the scaling: both saturate to 1 either way. The
    // discriminating case is a SMALL count, where dividing by 5 is the whole difference between
    // "one downstream item is blocked" and "this is maximally urgent".
    const one = computeRecommendation("w1", inputs({ blockedDownstreamCount: 1 })).score;
    const five = computeRecommendation("w1", inputs({ blockedDownstreamCount: 5 })).score;
    expect(one).toBeCloseTo(2 * (1 / 5), 10);
    expect(one).toBeLessThan(five);
  });

  test("counts saturate rather than running away", () => {
    // 200 blocked downstream items should not outweigh everything else forever.
    const five = computeRecommendation("w1", inputs({ blockedDownstreamCount: 5 })).score;
    const many = computeRecommendation("w1", inputs({ blockedDownstreamCount: 200 })).score;
    expect(many).toBe(five);
  });

  test("normalizeInput clamps BOTH ends, and its callers' guards do not hide that", () => {
    // Every caller guards on `> 0`, which would mask a clamp that let negatives through. Tested
    // directly for that reason.
    expect(normalizeInput(0.5)).toBe(0.5);
    expect(normalizeInput(5)).toBe(1);
    expect(normalizeInput(-5)).toBe(0);
    expect(normalizeInput(Number.NaN)).toBe(0);
    expect(normalizeInput(Number.POSITIVE_INFINITY)).toBe(0);
    expect(normalizeInput(Number.NEGATIVE_INFINITY)).toBe(0);
  });

  test("each band is entered at its own threshold", () => {
    // Without pinning the middle bands, shifting one boundary changes nothing any test can see.
    // Scores are composed from executivePriority (weight 4), customerImpact (3) and severity (3),
    // because clamping caps any single field at its own weight.
    const at = (target: number) => {
      const e = Math.min(1, target / 4);
      const c = Math.min(1, Math.max(0, target - 4 * e) / 3);
      const sv = Math.min(1, Math.max(0, target - 4 * e - 3 * c) / 3);
      const rec = computeRecommendation("w1", inputs({ executivePriority: e, customerImpact: c, severity: sv }));
      expect(rec.score).toBeCloseTo(target, 6);
      return rec.priorityClass;
    };
    expect(at(0)).toBe(PriorityClass.Defer);
    expect(at(1.9)).toBe(PriorityClass.Defer);
    expect(at(2)).toBe(PriorityClass.Normal);
    expect(at(4.9)).toBe(PriorityClass.Normal);
    expect(at(5)).toBe(PriorityClass.High);
    expect(at(8.9)).toBe(PriorityClass.High);
    expect(at(9)).toBe(PriorityClass.Expedite);
    expect(at(10)).toBe(PriorityClass.Expedite);
  });

  test("out-of-range inputs are CLAMPED and non-finite ones are treated as ABSENT", () => {
    // Two different dispositions, and the difference matters. A value above 1 is a caller
    // over-reporting a real signal, so it clamps to the maximum. `Infinity` or `NaN` is a BUG in
    // whatever produced it, not a maximum — clamping those to 1 would let a broken upstream
    // silently pin a field at full strength forever, which is worse than ignoring it.
    const over = computeRecommendation("w1", inputs({ severity: 5, customerImpact: -5 }));
    expect(over.score).toBe(computeRecommendation("w1", inputs({ severity: 1 })).score);
    expect(over.reasonCodes).not.toContain("customer_impact");

    const broken = computeRecommendation(
      "w1",
      inputs({ severity: Number.POSITIVE_INFINITY, releaseRisk: Number.NaN }),
    );
    expect(Number.isFinite(broken.score)).toBe(true);
    expect(broken.score).toBe(0);
    expect(broken.reasonCodes).toEqual([]);
  });
});

describe("who may set what", () => {
  test("the C-suite and the board may set anything, including paused", () => {
    for (const l of ["executive_board", "c_suite"] as const) {
      expect(legalPriorityClassesFor(l)).toEqual(PRIORITY_ORDER);
    }
  });

  test("a DIRECTOR may not pause — that is an org-level decision", () => {
    // The reference gives Director and the C-suite the same five classes, making the distinction
    // between them decorative. Stopping work entirely is reserved.
    const legal = legalPriorityClassesFor("director");
    expect(legal).toContain(PriorityClass.Expedite);
    expect(legal).not.toContain(PriorityClass.Paused);
  });

  test("a MANAGER may not expedite — that is an org-wide emergency claim", () => {
    const legal = legalPriorityClassesFor("manager");
    expect(legal).toEqual([PriorityClass.High, PriorityClass.Normal, PriorityClass.Defer]);
  });

  test("a lead and an IC may not set priority at all", () => {
    expect(legalPriorityClassesFor("lead")).toEqual([]);
    expect(legalPriorityClassesFor("individual_contributor")).toEqual([]);
  });

  test("the ladder has three genuinely different rungs", () => {
    const c = legalPriorityClassesFor("c_suite").length;
    const d = legalPriorityClassesFor("director").length;
    const m = legalPriorityClassesFor("manager").length;
    expect(c).toBeGreaterThan(d);
    expect(d).toBeGreaterThan(m);
    expect(m).toBeGreaterThan(0);
  });
});

describe("deciding", () => {
  // severity 1 (3) + customerImpact 1 (3) = 6, which is `High` — the >= 5 band.
  const rec = computeRecommendation("w1", inputs({ severity: 1, customerImpact: 1 }));

  test("an authority decides within its legal set", () => {
    const r = decidePriority(chart, { recommendation: rec, deciderHatId: "cto", chooser: firstLegalChooser() });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.decision.priorityClass).toBe(PriorityClass.Expedite);
    expect(r.decision.decidedByHatId).toBe("cto");
  });

  test("a LEAD is refused, and told to raise a signal instead", () => {
    const r = decidePriority(chart, {
      recommendation: rec,
      deciderHatId: "tech_lead",
      chooser: firstLegalChooser(),
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toContain("raise a signal");
  });

  test("a manager asking to EXPEDITE is clamped to something it may set", () => {
    const r = decidePriority(chart, {
      recommendation: rec,
      deciderHatId: "engineering_manager",
      chooser: preferChooser<PriorityClass>(PriorityClass.Expedite, "expedite"),
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.decision.priorityClass).not.toBe(PriorityClass.Expedite);
    expect(legalPriorityClassesFor("manager")).toContain(r.decision.priorityClass);
  });

  test("THE RECOMMENDATION IS KEPT BESIDE THE DECISION, so overrides are visible", () => {
    // Recording only the outcome erases every override — the one thing about a priority decision
    // worth reviewing later.
    const r = decidePriority(chart, {
      recommendation: rec,
      deciderHatId: "cto",
      chooser: preferChooser<PriorityClass>(PriorityClass.Defer, "not now"),
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(rec.priorityClass).toBe(PriorityClass.High);
    expect(r.decision.recommended).toBe(PriorityClass.High);
    expect(r.decision.priorityClass).toBe(PriorityClass.Defer);
    expect(wasOverridden(r.decision)).toBe(true);
  });

  test("agreeing with the score is not an override", () => {
    const r = decidePriority(chart, {
      recommendation: rec,
      deciderHatId: "cto",
      chooser: preferChooser<PriorityClass>(rec.priorityClass, "as recommended"),
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.decision.priorityClass).toBe(rec.priorityClass);
    expect(wasOverridden(r.decision)).toBe(false);
  });

  test("the reason codes travel with the decision", () => {
    const r = decidePriority(chart, { recommendation: rec, deciderHatId: "cto", chooser: firstLegalChooser() });
    expect(r.ok && r.decision.reasonCodes).toContain("severity");
  });

  test("an unknown decider is refused", () => {
    expect(
      decidePriority(chart, { recommendation: rec, deciderHatId: "ghost", chooser: firstLegalChooser() }).ok,
    ).toBe(false);
  });
});

describe("ordering the queue", () => {
  const d = (workId: string, priorityClass: PriorityClass): PriorityDecision => ({
    workId,
    priorityClass,
    decidedByHatId: "cto",
    reason: "",
    recommended: priorityClass,
    reasonCodes: [],
  });

  test("most urgent first", () => {
    const ordered = orderByPriority([
      d("c", PriorityClass.Defer),
      d("a", PriorityClass.Expedite),
      d("b", PriorityClass.Normal),
    ]);
    expect(ordered.map((x) => x.workId)).toEqual(["a", "b", "c"]);
  });

  test("ties break on workId — the queue is TOTAL and replayable", () => {
    // Without it the same queue is worked in a different order on different runs.
    const one = orderByPriority([d("z", PriorityClass.High), d("a", PriorityClass.High)]);
    const two = orderByPriority([d("a", PriorityClass.High), d("z", PriorityClass.High)]);
    expect(one.map((x) => x.workId)).toEqual(["a", "z"]);
    expect(two.map((x) => x.workId)).toEqual(["a", "z"]);
  });

  test("paused work is not workable, and is not silently dropped from the order", () => {
    const all = [d("a", PriorityClass.Paused), d("b", PriorityClass.Normal)];
    expect(workable(all).map((x) => x.workId)).toEqual(["b"]);
    // …but it is still in the ordering, so a reader can see it exists and is stopped.
    expect(orderByPriority(all).map((x) => x.workId)).toEqual(["b", "a"]);
  });
});
