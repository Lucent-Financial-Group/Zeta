import { describe, expect, test } from "bun:test";
import {
  chooseWithinLegal,
  firstLegalChooser,
  preferChooser,
  type OrgChooser,
} from "./org-decision";
import {
  allGatesPassed,
  evaluateGate,
  GateKind,
  GateOutcome,
  gateOwners,
  gateProgress,
  isPassing,
  legalGateOutcomes,
  legalGateOutcomesFor,
  mayEvaluate,
  nextLegalGate,
  ORDERED_GATES,
  recoveryPathFor,
  RecoveryPath,
  runGateChain,
  NO_PROPOSER,
} from "./quality-gate";
import { buildOrgChart } from "./org-chart";
import { SEED_HATS } from "./org-seed";

const chart = (() => {
  const r = buildOrgChart(SEED_HATS);
  if (!r.ok) throw new Error(r.reason);
  return r.chart;
})();

const approve: OrgChooser<GateOutcome> = preferChooser<GateOutcome>(GateOutcome.Approved, "approve");
const reject: OrgChooser<GateOutcome> = preferChooser<GateOutcome>(GateOutcome.Rejected, "reject");

// ─── The decision kernel ────────────────────────────────────────────────────

describe("determinism sets the legal options; the agent picks inside them", () => {
  test("an in-range pick is taken as given", () => {
    const c = chooseWithinLegal(["a", "b", "c"], "ctx", () => ({ index: 1, reason: "b" }));
    expect(c.outcome).toBe("chosen");
    if (c.outcome !== "chosen") return;
    expect(c.option).toBe("b");
    expect(c.clamped).toBe(false);
  });

  test("AN OUT-OF-RANGE INDEX IS CLAMPED, never followed", () => {
    // The load-bearing line: a chooser returning 999 must not read past the legal set. Reading the
    // option out by an unclamped index is how a model's arithmetic slip becomes an authorization
    // bypass.
    const high = chooseWithinLegal(["a", "b"], "ctx", () => ({ index: 999, reason: "?" }));
    expect(high.outcome === "chosen" && high.option).toBe("b");
    const low = chooseWithinLegal(["a", "b"], "ctx", () => ({ index: -5, reason: "?" }));
    expect(low.outcome === "chosen" && low.option).toBe("a");
  });

  test("clamping is REPORTED, not swallowed", () => {
    // A chooser that keeps asking out of range is malfunctioning, and the pick is still legal —
    // which is exactly what makes the failure quiet unless it is surfaced.
    const c = chooseWithinLegal(["a", "b"], "ctx", () => ({ index: 99, reason: "?" }));
    expect(c.outcome === "chosen" && c.clamped).toBe(true);
  });

  test("NaN and fractional indices do not escape the clamp", () => {
    // NaN survives both Math.max and Math.min untouched — the one input that defeats a naive clamp,
    // and it would index to `undefined`.
    const nan = chooseWithinLegal(["a", "b"], "ctx", () => ({ index: Number.NaN, reason: "?" }));
    expect(nan.outcome).toBe("chosen");
    expect(nan.outcome === "chosen" && nan.option).toBe("a");

    const frac = chooseWithinLegal(["a", "b", "c"], "ctx", () => ({ index: 1.9, reason: "?" }));
    expect(frac.outcome === "chosen" && frac.option).toBe("b");
  });

  test("a chooser that THROWS does not take the organization down", () => {
    const c = chooseWithinLegal(["a", "b"], "ctx", () => {
      throw new Error("model died");
    });
    expect(c.outcome).toBe("chosen");
    if (c.outcome !== "chosen") return;
    expect(c.option).toBe("a");
    // …and the record says nobody actually chose.
    expect(c.reason).toContain("threw");
  });

  test("an EMPTY legal set is a result with the RIGHT reason, not a default", () => {
    const c = chooseWithinLegal([], "gate x", firstLegalChooser());
    expect(c.outcome).toBe("no_legal_option");
    if (c.outcome !== "no_legal_option") return;
    expect(c.reason).toContain("gate x");
    // Asserting only the outcome passed for the wrong reason: without the empty-set guard the
    // clamp-failure branch catches it too, and reports "clamp failed". Those are different
    // diagnoses — "the rules permit nothing here" versus "the clamp logic broke" — and conflating
    // them sends someone debugging the wrong half.
    expect(c.reason).toContain("no legal option");
    expect(c.reason).not.toContain("clamp failed");
  });

  test("preferChooser falls back when its preference is not legal", () => {
    expect(chooseWithinLegal(["a", "b"], "c", preferChooser("z"))).toMatchObject({ option: "a" });
  });
});

// ─── The chain ──────────────────────────────────────────────────────────────

describe("the gate chain", () => {
  test("seven gates, in the reference order", () => {
    expect(ORDERED_GATES).toEqual([
      GateKind.CustomerRfpReview,
      GateKind.BrdApproval,
      GateKind.ArchitectureApproval,
      GateKind.ImplementationReview,
      GateKind.RuntimeValidation,
      GateKind.FinalBusinessValidation,
      GateKind.ReleaseReadiness,
    ]);
  });

  test("the next gate is the first unpassed one", () => {
    expect(nextLegalGate(new Set())).toBe(GateKind.CustomerRfpReview);
    expect(nextLegalGate(new Set([GateKind.CustomerRfpReview]))).toBe(GateKind.BrdApproval);
  });

  test("passing a LATER gate does not skip an earlier one", () => {
    // The whole point of ordering: an item cannot reach release readiness without an architecture
    // review by having the gates evaluated in a convenient order.
    expect(nextLegalGate(new Set([GateKind.ReleaseReadiness]))).toBe(GateKind.CustomerRfpReview);
  });

  test("all seven passed means merged", () => {
    expect(allGatesPassed(new Set(ORDERED_GATES))).toBe(true);
    expect(nextLegalGate(new Set(ORDERED_GATES))).toBeUndefined();
    expect(gateProgress(new Set(ORDERED_GATES))).toBe(1);
    expect(gateProgress(new Set())).toBe(0);
  });

  test("every gate has a recovery path", () => {
    for (const g of ORDERED_GATES) expect(recoveryPathFor(g)).toBeDefined();
    expect(recoveryPathFor(GateKind.ImplementationReview)).toBe(RecoveryPath.BackToEngineering);
    expect(recoveryPathFor(GateKind.ArchitectureApproval)).toBe(RecoveryPath.ReopenArchitecture);
  });
});

describe("who owns a gate is DERIVED from the hats' approval scopes", () => {
  test("every gate has at least one owner in this seed", () => {
    // A gate nobody owns blocks the chain — that is a staffing fact, and it must not read as a pass.
    for (const g of ORDERED_GATES) expect(gateOwners(chart, g).length).toBeGreaterThan(0);
  });

  test("owners are the hats that hold the scope, and nobody else", () => {
    const owners = gateOwners(chart, GateKind.RuntimeValidation).map((h) => h.id);
    expect(owners.sort()).toEqual(["qa_director", "qa_engineer", "qa_manager"]);
    expect(mayEvaluate(chart, "qa_engineer", GateKind.RuntimeValidation)).toBe(true);
    // A dev is not a QA reviewer, however senior its own line.
    expect(mayEvaluate(chart, "backend_implementer", GateKind.RuntimeValidation)).toBe(false);
    expect(mayEvaluate(chart, "cto", GateKind.RuntimeValidation)).toBe(false);
  });

  test("a hat holding one scope does not thereby hold another", () => {
    expect(mayEvaluate(chart, "tech_lead", GateKind.ImplementationReview)).toBe(true);
    expect(mayEvaluate(chart, "tech_lead", GateKind.ReleaseReadiness)).toBe(false);
  });
});

describe("waiving is not one of three normal verdicts", () => {
  test("the ordinary legal set excludes it", () => {
    // Offering `waived` beside `approved` in every evaluation makes the cheapest way past a hard
    // gate a single index.
    expect(legalGateOutcomes()).not.toContain(GateOutcome.Waived);
  });

  test("a director and above may waive; a manager and below may not", () => {
    const dir = chart.byId.get("qa_director")!;
    const mgr = chart.byId.get("qa_manager")!;
    const ic = chart.byId.get("qa_engineer")!;
    expect(legalGateOutcomesFor(dir)).toContain(GateOutcome.Waived);
    expect(legalGateOutcomesFor(mgr)).not.toContain(GateOutcome.Waived);
    expect(legalGateOutcomesFor(ic)).not.toContain(GateOutcome.Waived);
  });

  test("a waiver PASSES the gate but is a different fact from approval", () => {
    expect(isPassing(GateOutcome.Waived)).toBe(true);
    expect(isPassing(GateOutcome.Approved)).toBe(true);
    expect(isPassing(GateOutcome.ChangesRequested)).toBe(false);
    expect(isPassing(GateOutcome.Rejected)).toBe(false);

    const r = evaluateGate(chart, {
      workId: "w1",
      gate: GateKind.CustomerRfpReview,
      evaluatorHatId: "product_director",
      passed: new Set(),
      chooser: preferChooser<GateOutcome>(GateOutcome.Waived, "waive"),
      atMs: 0,
      proposerHatId: NO_PROPOSER,
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    // The record keeps `waived`, so an audit can tell a satisfied control from a skipped one.
    expect(r.evaluation.outcome).toBe(GateOutcome.Waived);
    expect(r.passed.has(GateKind.CustomerRfpReview)).toBe(true);
  });

  test("a MANAGER asking to waive gets clamped to a legal verdict instead", () => {
    const r = evaluateGate(chart, {
      workId: "w1",
      gate: GateKind.ImplementationReview,
      evaluatorHatId: "engineering_manager",
      passed: new Set(ORDERED_GATES.slice(0, 3)),
      chooser: preferChooser<GateOutcome>(GateOutcome.Waived, "waive"),
      atMs: 0,
      proposerHatId: NO_PROPOSER,
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.evaluation.outcome).not.toBe(GateOutcome.Waived);
  });
});

describe("evaluating one gate", () => {
  test("an approval advances the passed set", () => {
    const r = evaluateGate(chart, {
      workId: "w1",
      gate: GateKind.CustomerRfpReview,
      evaluatorHatId: "product_manager",
      passed: new Set(),
      chooser: approve,
      atMs: 7,
      proposerHatId: NO_PROPOSER,
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.evaluation.outcome).toBe(GateOutcome.Approved);
    expect(r.evaluation.byHatId).toBe("product_manager");
    expect(r.evaluation.atMs).toBe(7);
    expect([...r.passed]).toEqual([GateKind.CustomerRfpReview]);
    expect(r.recovery).toBeUndefined();
  });

  test("a rejection does NOT advance, and names the recovery path", () => {
    const r = evaluateGate(chart, {
      workId: "w1",
      gate: GateKind.CustomerRfpReview,
      evaluatorHatId: "product_manager",
      passed: new Set(),
      chooser: reject,
      atMs: 0,
      proposerHatId: NO_PROPOSER,
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.passed.size).toBe(0);
    expect(r.recovery).toBe(RecoveryPath.ReopenDiscoveryOrBrd);
  });

  test("OUT OF ORDER is refused", () => {
    // Evaluating a gate whose priors have not passed is how an item reaches release readiness with
    // no architecture review.
    const r = evaluateGate(chart, {
      workId: "w1",
      gate: GateKind.ReleaseReadiness,
      evaluatorHatId: "tpm",
      passed: new Set(),
      chooser: approve,
      atMs: 0,
      proposerHatId: NO_PROPOSER,
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toContain("crossed in order");
  });

  test("a NON-OWNER is refused", () => {
    const r = evaluateGate(chart, {
      workId: "w1",
      gate: GateKind.CustomerRfpReview,
      evaluatorHatId: "backend_implementer",
      passed: new Set(),
      chooser: approve,
      atMs: 0,
      proposerHatId: NO_PROPOSER,
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toContain("approval scope");
  });

  test("RE-EVALUATING a passed gate is refused", () => {
    // Otherwise a rejection gets overwritten by a second opinion nobody asked for.
    const r = evaluateGate(chart, {
      workId: "w1",
      gate: GateKind.CustomerRfpReview,
      evaluatorHatId: "product_manager",
      passed: new Set([GateKind.CustomerRfpReview]),
      chooser: approve,
      atMs: 0,
      proposerHatId: NO_PROPOSER,
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toContain("already passed");
  });

  test("an unknown evaluator is refused", () => {
    const r = evaluateGate(chart, {
      workId: "w1",
      gate: GateKind.CustomerRfpReview,
      evaluatorHatId: "ghost",
      passed: new Set(),
      chooser: approve,
      atMs: 0,
      proposerHatId: NO_PROPOSER,
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toContain("unknown hat");
  });
});

describe("the whole chain", () => {
  test("approving everything merges, with seven evaluations by seven authorized hats", () => {
    const run = runGateChain(chart, { workId: "w1", chooser: approve, atMs: 0, proposerHatId: NO_PROPOSER });
    expect(run.merged).toBe(true);
    expect(run.evaluations).toHaveLength(7);
    expect(run.refusals).toEqual([]);
    expect(run.evaluations.map((e) => e.gate)).toEqual([...ORDERED_GATES]);
    for (const e of run.evaluations) {
      expect(mayEvaluate(chart, e.byHatId, e.gate)).toBe(true);
    }
  });

  test("a rejection STOPS the chain where it happened, with a recovery path", () => {
    const rejectAtImplementation: OrgChooser<GateOutcome> = (legal, ctx) =>
      ctx.includes(GateKind.ImplementationReview)
        ? { index: legal.indexOf(GateOutcome.Rejected), reason: "not ready" }
        : { index: legal.indexOf(GateOutcome.Approved), reason: "fine" };

    const run = runGateChain(chart, { workId: "w1", chooser: rejectAtImplementation, atMs: 0, proposerHatId: NO_PROPOSER });
    expect(run.merged).toBe(false);
    expect(run.blockedAt).toBe(GateKind.ImplementationReview);
    expect(run.recovery).toBe(RecoveryPath.BackToEngineering);
    // Three gates passed before it; the fourth was evaluated and failed.
    expect(run.passed.size).toBe(3);
    expect(run.evaluations).toHaveLength(4);
  });

  test("a gate nobody owns BLOCKS — it does not read as a pass", () => {
    // Strip the release-readiness scope from the whole organization.
    const stripped = buildOrgChart(
      SEED_HATS.map((h) =>
        h.approvalScopes === undefined
          ? h
          : { ...h, approvalScopes: h.approvalScopes.filter((s) => s !== GateKind.ReleaseReadiness) },
      ),
    );
    expect(stripped.ok).toBe(true);
    if (!stripped.ok) return;

    const run = runGateChain(stripped.chart, { workId: "w1", chooser: approve, atMs: 0, proposerHatId: NO_PROPOSER });
    expect(run.merged).toBe(false);
    expect(run.blockedAt).toBe(GateKind.ReleaseReadiness);
    expect(run.refusals[0]).toContain("no hat holds the approval scope");
    // The six before it did pass — the chain got as far as it legitimately could.
    expect(run.passed.size).toBe(6);
  });

  test("the evaluator can be chosen, and the choice is still authority-checked", () => {
    const run = runGateChain(chart, {
      workId: "w1",
      chooser: approve,
      atMs: 0,
      // Always take the most senior owner.
      evaluatorFor: (_gate, owners) => owners[owners.length - 1],
      proposerHatId: NO_PROPOSER,
    });
    expect(run.merged).toBe(true);
    for (const e of run.evaluations) expect(mayEvaluate(chart, e.byHatId, e.gate)).toBe(true);
  });

  test("an evaluatorFor that names an UNAUTHORIZED hat is refused, not honoured", () => {
    const run = runGateChain(chart, {
      workId: "w1",
      chooser: approve,
      atMs: 0,
      evaluatorFor: () => chart.byId.get("backend_implementer"),
      proposerHatId: NO_PROPOSER,
    });
    expect(run.merged).toBe(false);
    expect(run.refusals[0]).toContain("approval scope");
  });
});
