import { describe, expect, test } from "bun:test";
import {
  assignHat,
  DEFAULT_MAX_ACTIVE_HATS,
  eligibleFor,
  rankCandidates,
  type Candidate,
} from "./assignment-engine";
import {
  DEFAULT_DECAY,
  DEFAULT_PRIOR,
  decayedWeight,
  explorationBonus,
  OutcomeClass,
  rankingScore,
  summarize,
  UNIFORM_PRIOR,
  whitewashingPays,
  whitewashThreshold,
  type ReputationObservation,
} from "./reputation";
import { firstLegalChooser, preferWhere } from "./org-decision";
import { advanceBinding, beginBinding, DEFAULT_WARMUP_MS, releaseBinding, type HatBinding } from "./hat-binding";
import { buildOrgChart } from "./org-chart";
import { SEED_HATS } from "./org-seed";

const chart = (() => {
  const r = buildOrgChart(SEED_HATS);
  if (!r.ok) throw new Error(r.reason);
  return r.chart;
})();

const DEV = chart.byId.get("backend_implementer")!;
const DAY = 24 * 3_600_000;

const obs = (
  agentId: string,
  success: boolean,
  atMs = 0,
  extra: Partial<ReputationObservation> = {},
): ReputationObservation => ({
  agentId,
  hatId: DEV.id,
  outcomeClass: OutcomeClass.Quality,
  success,
  atMs,
  ...extra,
});

const key = (agentId: string) => ({ agentId, hatId: DEV.id, outcomeClass: OutcomeClass.Quality });

// ─── Reputation ─────────────────────────────────────────────────────────────

describe("the posterior is a fold over observations", () => {
  test("no evidence gives the prior mean", () => {
    const s = summarize([], key("a"), 0);
    expect(s.mean).toBeCloseTo(DEFAULT_PRIOR.alpha / (DEFAULT_PRIOR.alpha + DEFAULT_PRIOR.beta), 10);
    expect(s.sampleCount).toBe(0);
    expect(s.evidenceWeight).toBe(0);
  });

  test("successes raise it and failures lower it", () => {
    const good = summarize([obs("a", true), obs("a", true), obs("a", true)], key("a"), 0);
    const bad = summarize([obs("a", false), obs("a", false), obs("a", false)], key("a"), 0);
    expect(good.mean).toBeGreaterThan(0.5);
    expect(bad.mean).toBeLessThan(0.2);
  });

  test("Beta(1+s, 3+f) exactly — the closed form, not an approximation", () => {
    const s = summarize([obs("a", true), obs("a", true), obs("a", false)], key("a"), 0);
    expect(s.alpha).toBeCloseTo(3, 10);
    expect(s.beta).toBeCloseTo(4, 10);
    expect(s.mean).toBeCloseTo(3 / 7, 10);
    expect(s.variance).toBeCloseTo((3 * 4) / (7 * 7 * 8), 10);
  });

  test("ratings are keyed on the PAIRING — another hat's record does not count", () => {
    // Standing earned reviewing must not buy standing implementing.
    const elsewhere = [{ ...obs("a", true), hatId: "qa_engineer" }];
    expect(summarize(elsewhere, key("a"), 0).sampleCount).toBe(0);
  });

  test("another agent's record does not count either", () => {
    expect(summarize([obs("b", true)], key("a"), 0).sampleCount).toBe(0);
  });

  test("variance answers a different question from the mean", () => {
    // Two agents can share a mean while resting on very different amounts of evidence.
    const thin = summarize([obs("a", true)], key("a"), 0);
    const thick = summarize(Array.from({ length: 40 }, () => obs("a", true)), key("a"), 0);
    expect(thick.mean).toBeGreaterThan(thin.mean);
    expect(thick.variance).toBeLessThan(thin.variance);
  });
});

describe("evidence decays, except where it must not", () => {
  test("weight halves each half-life", () => {
    const o = obs("a", true, 0);
    expect(decayedWeight(o, 0)).toBeCloseTo(1, 10);
    expect(decayedWeight(o, DEFAULT_DECAY.halfLifeMs)).toBeCloseTo(0.5, 10);
    expect(decayedWeight(o, 2 * DEFAULT_DECAY.halfLifeMs)).toBeCloseTo(0.25, 10);
  });

  test("an old failure fades — the rating tracks what an agent is like NOW", () => {
    const stale = summarize([obs("a", false, 0)], key("a"), 20 * DEFAULT_DECAY.halfLifeMs);
    const fresh = summarize([obs("a", false, 0)], key("a"), 0);
    expect(stale.mean).toBeGreaterThan(fresh.mean);
  });

  test("A SEVERE INCIDENT KEEPS A FLOOR", () => {
    // An outage does not stop having happened because ninety days passed, and decaying it to
    // nothing would make the rating forget the one class of event it most needs to carry.
    const severe = obs("a", false, 0, { severe: true });
    expect(decayedWeight(severe, 100 * DEFAULT_DECAY.halfLifeMs)).toBe(DEFAULT_DECAY.severeFloor);
    // …whereas an ordinary one is essentially gone.
    expect(decayedWeight(obs("a", false, 0), 100 * DEFAULT_DECAY.halfLifeMs)).toBeLessThan(1e-9);
  });

  test("an observation from the FUTURE is not amplified", () => {
    // 0.5^negative is greater than one; a clock skew must not make one report count for several.
    expect(decayedWeight(obs("a", true, 10 * DAY), 0)).toBe(1);
  });

  test("a zero or negative base weight contributes nothing", () => {
    expect(decayedWeight(obs("a", true, 0, { weight: 0 }), 0)).toBe(0);
    expect(summarize([obs("a", true, 0, { weight: 0 })], key("a"), 0).sampleCount).toBe(0);
  });

  test("a non-positive half-life disables decay rather than dividing by zero", () => {
    expect(decayedWeight(obs("a", true, 0), DAY, { halfLifeMs: 0, severeFloor: 0 })).toBe(1);
  });
});

describe("THE WHITEWASHING RESULT — stated, not claimed away", () => {
  test("the threshold is beta0/alpha0, and the uniform prior's is 1.0", () => {
    expect(whitewashThreshold(UNIFORM_PRIOR)).toBe(1);
    expect(whitewashThreshold(DEFAULT_PRIOR)).toBe(3);
  });

  test("under the reference's uniform prior, failing over half the time makes re-minting pay", () => {
    expect(whitewashingPays(1, 2, UNIFORM_PRIOR)).toBe(true);
    expect(whitewashingPays(1, 1, UNIFORM_PRIOR)).toBe(false);
  });

  test("the default prior pushes the threshold out but does NOT remove it", () => {
    // No finite prior does. Believing otherwise is worse than knowing the number.
    expect(whitewashingPays(1, 3, DEFAULT_PRIOR)).toBe(false);
    expect(whitewashingPays(1, 4, DEFAULT_PRIOR)).toBe(true);
  });

  test("the predicate agrees with the actual posteriors it predicts", () => {
    // The closed form must match what `summarize` really produces, or it is arithmetic about
    // nothing.
    for (const [s, f] of [[1, 2], [1, 4], [3, 1], [2, 9]] as const) {
      for (const prior of [UNIFORM_PRIOR, DEFAULT_PRIOR]) {
        const record = [
          ...Array.from({ length: s }, () => obs("a", true)),
          ...Array.from({ length: f }, () => obs("a", false)),
        ];
        const damaged = summarize(record, key("a"), 0, prior).mean;
        const fresh = summarize([], key("fresh"), 0, prior).mean;
        expect(whitewashingPays(s, f, prior)).toBe(fresh > damaged);
      }
    }
  });
});

describe("the exploration bonus buys a trial, not a handicap", () => {
  test("it is largest with no evidence and shrinks as evidence accumulates", () => {
    const none = summarize([], key("a"), 0);
    const some = summarize(Array.from({ length: 20 }, () => obs("a", true)), key("a"), 0);
    expect(explorationBonus(none)).toBeGreaterThan(explorationBonus(some));
    expect(explorationBonus(none)).toBeCloseTo(0.15, 10);
  });

  test("it is bounded, so an unproven agent cannot outrank a proven one by more than max", () => {
    const none = summarize([], key("a"), 0);
    expect(explorationBonus(none, 0.15)).toBeLessThanOrEqual(0.15);
    expect(explorationBonus(none, 0)).toBe(0);
  });

  test("a cold start is not permanent — an unproven agent can be picked over a mediocre one", () => {
    // Without the bonus an agent nobody picks never earns a record, so it ranks low forever.
    const mediocre = summarize([obs("a", true), obs("a", false), obs("a", false)], key("a"), 0);
    const unproven = summarize([], key("b"), 0);
    expect(rankingScore(unproven)).toBeGreaterThan(rankingScore(mediocre));
  });

  test("…but it does not beat a genuinely good record", () => {
    const good = summarize(Array.from({ length: 10 }, () => obs("a", true)), key("a"), 0);
    expect(rankingScore(good)).toBeGreaterThan(rankingScore(summarize([], key("b"), 0)));
  });
});

// ─── Eligibility ────────────────────────────────────────────────────────────

const cand = (agentId: string, hatId = DEV.id): Candidate => ({ agentId, hatId });

const bind = (agentId: string, hatId: string, id: string): HatBinding => {
  const hat = chart.byId.get(hatId)!;
  const r = beginBinding(hat, { bindingId: id, wearerAgentId: agentId, nowMs: 0 });
  if (!r.ok) throw new Error(r.reason);
  return advanceBinding(r.binding, hat, DEFAULT_WARMUP_MS);
};

describe("eligibility reports WHY, never just filters", () => {
  const base = { chart, hat: DEV, nowMs: DEFAULT_WARMUP_MS };

  test("a clean pool is entirely eligible", () => {
    const r = eligibleFor({ ...base, candidates: [cand("a"), cand("b")], bindings: [] });
    expect(r.eligible.map((c) => c.agentId)).toEqual(["a", "b"]);
    expect(r.excluded).toEqual([]);
  });

  test("an agent already wearing the hat is excluded, with the reason", () => {
    const r = eligibleFor({ ...base, candidates: [cand("a")], bindings: [bind("a", DEV.id, "b1")] });
    expect(r.eligible).toEqual([]);
    expect(r.excluded[0]?.reason).toContain("already wears");
  });

  test("a cooling-down agent is excluded", () => {
    const ended = releaseBinding(bind("a", DEV.id, "b1"), DEV, DEFAULT_WARMUP_MS, "done");
    expect(ended.ok).toBe(true);
    if (!ended.ok) return;
    const r = eligibleFor({ ...base, candidates: [cand("a")], bindings: [ended.binding] });
    expect(r.excluded[0]?.reason).toContain("cooling down");
  });

  test("an agent at the hat cap is excluded", () => {
    const many = ["tech_lead", "qa_engineer", "sre"].map((h, i) => bind("a", h, `b${i}`));
    const r = eligibleFor({ ...base, candidates: [cand("a")], bindings: many });
    expect(r.excluded[0]?.reason).toContain(`cap ${DEFAULT_MAX_ACTIVE_HATS}`);
  });

  test("an agent OUTSIDE the owning line is excluded when a line is required", () => {
    const r = eligibleFor({
      ...base,
      candidates: [cand("a", "qa_engineer"), cand("b", "backend_implementer")],
      bindings: [],
      mustReportTo: "tech_lead",
    });
    expect(r.eligible.map((c) => c.agentId)).toEqual(["b"]);
    expect(r.excluded[0]?.reason).toContain("does not report up to");
  });

  test("'nobody eligible' and 'everybody capped' are DISTINGUISHABLE", () => {
    // They call for completely different responses from the RMO, and a bare empty list cannot
    // tell them apart.
    const empty = eligibleFor({ ...base, candidates: [], bindings: [] });
    const capped = eligibleFor({
      ...base,
      candidates: [cand("a")],
      bindings: ["tech_lead", "qa_engineer", "sre"].map((h, i) => bind("a", h, `b${i}`)),
    });
    expect(empty.eligible).toEqual([]);
    expect(empty.excluded).toEqual([]);
    expect(capped.eligible).toEqual([]);
    expect(capped.excluded).toHaveLength(1);
  });
});

// ─── Ranking and assignment ─────────────────────────────────────────────────

describe("ranking", () => {
  test("the better record ranks first", () => {
    const observations = [
      ...Array.from({ length: 10 }, () => obs("good", true)),
      ...Array.from({ length: 10 }, () => obs("bad", false)),
    ];
    const ranked = rankCandidates({
      candidates: [cand("bad"), cand("good")],
      hatId: DEV.id,
      observations,
      nowMs: 0,
    });
    expect(ranked[0]?.agentId).toBe("good");
  });

  test("ties break on agentId — the order is TOTAL and replayable", () => {
    // Without it the same organization in the same state would staff differently on different runs,
    // taking determinism from every test and replay that depends on this.
    const a = rankCandidates({ candidates: [cand("z"), cand("a")], hatId: DEV.id, observations: [], nowMs: 0 });
    const b = rankCandidates({ candidates: [cand("a"), cand("z")], hatId: DEV.id, observations: [], nowMs: 0 });
    expect(a.map((r) => r.agentId)).toEqual(["a", "z"]);
    expect(b.map((r) => r.agentId)).toEqual(["a", "z"]);
  });

  test("the ranking carries the summary it was computed from", () => {
    const ranked = rankCandidates({
      candidates: [cand("a")],
      hatId: DEV.id,
      observations: [obs("a", true)],
      nowMs: 0,
    });
    expect(ranked[0]?.summary.sampleCount).toBe(1);
  });
});

describe("assigning a hat", () => {
  const base = {
    chart,
    hat: DEV,
    nowMs: DEFAULT_WARMUP_MS,
    observations: [] as ReputationObservation[],
    supplyTarget: 2,
    chooser: firstLegalChooser<never>() as never,
  };

  test("it assigns the best-ranked eligible agent", () => {
    const r = assignHat({
      ...base,
      candidates: [cand("bad"), cand("good")],
      bindings: [],
      observations: [
        ...Array.from({ length: 10 }, () => obs("good", true)),
        ...Array.from({ length: 10 }, () => obs("bad", false)),
      ],
      chooser: firstLegalChooser(),
    });
    expect(r.outcome).toBe("assigned");
    if (r.outcome !== "assigned") return;
    expect(r.agentId).toBe("good");
  });

  test("SUPPLY EXHAUSTED is distinct from no candidate", () => {
    // At the cap the answer is the same whoever is available; collapsing it into "no candidate"
    // would send someone looking for people when the constraint is policy.
    const r = assignHat({
      ...base,
      supplyTarget: 1,
      candidates: [cand("b")],
      bindings: [bind("a", DEV.id, "b1")],
      chooser: firstLegalChooser(),
    });
    expect(r.outcome).toBe("supply_exhausted");
    if (r.outcome !== "supply_exhausted") return;
    expect(r.reason).toContain("1/1");
  });

  test("supply is checked BEFORE ranking a pool that cannot be drawn from", () => {
    const r = assignHat({
      ...base,
      supplyTarget: 1,
      candidates: [],
      bindings: [bind("a", DEV.id, "b1")],
      chooser: firstLegalChooser(),
    });
    // An empty pool AND a full cap: the cap is the answer, because it is the one that would still
    // hold if the pool were full.
    expect(r.outcome).toBe("supply_exhausted");
  });

  test("no eligible candidate carries every exclusion and its reason", () => {
    const r = assignHat({
      ...base,
      candidates: [cand("a")],
      bindings: [bind("a", DEV.id, "b1")],
      chooser: firstLegalChooser(),
    });
    expect(r.outcome).toBe("no_eligible_candidate");
    if (r.outcome !== "no_eligible_candidate") return;
    expect(r.excluded).toHaveLength(1);
    expect(r.excluded[0]?.reason).toContain("already wears");
  });

  test("a chooser may PREFER within the ranking, and cannot escape it", () => {
    // Matched by predicate, not identity: `assignHat` recomputes the ranking internally, so a
    // preference built from an outside `rankCandidates` call holds different objects. `indexOf`
    // would silently miss and take the first option — a preference that looks like it worked.
    const ranked = rankCandidates({ candidates: [cand("a"), cand("b")], hatId: DEV.id, observations: [], nowMs: 0 });
    const second = ranked[1]!;
    const r = assignHat({
      ...base,
      candidates: [cand("a"), cand("b")],
      bindings: [],
      chooser: preferWhere((c) => c.agentId === second.agentId, "second choice"),
    });
    expect(r.outcome).toBe("assigned");
    if (r.outcome !== "assigned") return;
    expect(r.agentId).toBe(second.agentId);
    expect(r.agentId).toBe("b");
  });

  test("a wild chooser index cannot assign someone ineligible", () => {
    const r = assignHat({
      ...base,
      candidates: [cand("a", "qa_engineer"), cand("b")],
      bindings: [],
      mustReportTo: "tech_lead",
      chooser: () => ({ index: 9999, reason: "?" }),
    });
    expect(r.outcome).toBe("assigned");
    if (r.outcome !== "assigned") return;
    // 'a' is out of the line and must not be reachable however the index is clamped.
    expect(r.agentId).toBe("b");
  });
});
