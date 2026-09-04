/**
 * hat-guardrails.test.ts — may this hat do this, and did it do the work it is signing off?
 *
 * The separation-of-duties test at the bottom pins a hole that was LIVE: `evaluateGate` checked the
 * approval scope and never asked who did the work, so a hat holding both the implementer role and
 * the implementation-review scope approved its own change. The seeded organization never configures
 * that, which is why it went unnoticed — the defect was in the check, not the seed.
 */

import { describe, expect, test } from "bun:test";
import {
  ActionClass,
  permittedActions,
  preflightApproval,
  preflightGateEvaluation,
  preflightHatAction,
} from "./hat-guardrails";
import { buildOrgChart, type OrgHat } from "./org-chart";
import { SEED_HATS } from "./org-seed";
import { evaluateGate, GateKind, NO_PROPOSER, runGateChain } from "./quality-gate";
import { firstLegalChooser, preferChooser } from "./org-decision";
import { GateOutcome } from "./quality-gate";

const chart = (() => {
  const r = buildOrgChart(SEED_HATS);
  if (!r.ok) throw new Error(r.reason);
  return r.chart;
})();

/** A chart where the implementer ALSO holds the implementation-review scope. */
const conflicted = (() => {
  const r = buildOrgChart(
    SEED_HATS.map((h: OrgHat) =>
      h.id === "backend_implementer" ? { ...h, approvalScopes: [GateKind.ImplementationReview] } : h,
    ),
  );
  if (!r.ok) throw new Error(r.reason);
  return r.chart;
})();

describe("the preflight answers each action class from the existing authority", () => {
  test("only an IC implements", () => {
    expect(preflightHatAction(chart, { hatId: "backend_implementer", action: ActionClass.ImplementWork }).ok).toBe(true);
    const mgr = preflightHatAction(chart, { hatId: "engineering_manager", action: ActionClass.ImplementWork });
    expect(mgr.ok).toBe(false);
    if (!mgr.ok) expect(mgr.reason).toContain("individual contributor");
  });

  test("only a scope-holder approves a gate", () => {
    expect(preflightHatAction(chart, { hatId: "qa_engineer", action: ActionClass.ApproveGate, gate: GateKind.RuntimeValidation }).ok).toBe(true);
    expect(preflightHatAction(chart, { hatId: "backend_implementer", action: ActionClass.ApproveGate, gate: GateKind.RuntimeValidation }).ok).toBe(false);
  });

  test("approve_gate without a gate is refused rather than guessed", () => {
    const r = preflightHatAction(chart, { hatId: "qa_engineer", action: ActionClass.ApproveGate });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toContain("needs a gate");
  });

  test("a lead sets no priority and decides no escalation", () => {
    expect(preflightHatAction(chart, { hatId: "tech_lead", action: ActionClass.DecidePriority }).ok).toBe(false);
    expect(preflightHatAction(chart, { hatId: "tech_lead", action: ActionClass.Escalate }).ok).toBe(false);
    expect(preflightHatAction(chart, { hatId: "engineering_manager", action: ActionClass.Escalate }).ok).toBe(true);
  });

  test("a goal is accepted at the top", () => {
    expect(preflightHatAction(chart, { hatId: "cto", action: ActionClass.AcceptGoal }).ok).toBe(true);
    expect(preflightHatAction(chart, { hatId: "engineering_director", action: ActionClass.AcceptGoal }).ok).toBe(false);
  });

  test("schedules follow the reporting line, not rank", () => {
    expect(preflightHatAction(chart, { hatId: "tech_lead", action: ActionClass.SetSchedule, targetHatId: "backend_implementer" }).ok).toBe(true);
    // A director in another department outranks the QA engineer and does not supervise it.
    expect(preflightHatAction(chart, { hatId: "engineering_director", action: ActionClass.SetSchedule, targetHatId: "qa_engineer" }).ok).toBe(false);
    expect(preflightHatAction(chart, { hatId: "tech_lead", action: ActionClass.SetSchedule }).ok).toBe(false);
  });

  test("an unknown hat may do nothing", () => {
    for (const action of Object.values(ActionClass)) {
      expect(preflightHatAction(chart, { hatId: "ghost", action, gate: GateKind.RuntimeValidation, targetHatId: "x" }).ok).toBe(false);
    }
  });

  test("permittedActions summarises what a hat may do", () => {
    const dev = permittedActions(chart, "backend_implementer");
    expect(dev).toContain(ActionClass.ImplementWork);
    expect(dev).not.toContain(ActionClass.DecidePriority);
    expect(dev).not.toContain(ActionClass.ApproveGate);

    const cto = permittedActions(chart, "cto");
    expect(cto).toContain(ActionClass.AcceptGoal);
    expect(cto).toContain(ActionClass.DecidePriority);
    expect(cto).toContain(ActionClass.SetSchedule);
    expect(cto).not.toContain(ActionClass.ImplementWork);
  });
});

describe("SEPARATION OF DUTIES", () => {
  test("the proposer may not approve", () => {
    const r = preflightApproval({ approverHatId: "a", proposerHatId: "a" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toContain("did this work");
  });

  test("someone else may", () => {
    expect(preflightApproval({ approverHatId: "b", proposerHatId: "a" }).ok).toBe(true);
  });

  test("AN UNRECORDED PROPOSER IS NOT A PASS", () => {
    // Treating "we do not know who did it" as "fine" is how the guarantee is lost quietly.
    const r = preflightApproval({ approverHatId: "a" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toContain("unrecorded");
  });
});

describe("THE HOLE, closed", () => {
  test("the implementer cannot review its OWN implementation", () => {
    const passed = new Set([GateKind.CustomerRfpReview, GateKind.BrdApproval, GateKind.ArchitectureApproval]);
    const own = evaluateGate(conflicted, {
      workId: "w1",
      gate: GateKind.ImplementationReview,
      evaluatorHatId: "backend_implementer",
      passed,
      chooser: firstLegalChooser(),
      atMs: 0,
      proposerHatId: "backend_implementer",
    });
    expect(own.ok).toBe(false);
    if (!own.ok) expect(own.reason).toContain("did this work");
  });

  test("…but it may review someone ELSE's", () => {
    const passed = new Set([GateKind.CustomerRfpReview, GateKind.BrdApproval, GateKind.ArchitectureApproval]);
    const other = evaluateGate(conflicted, {
      workId: "w1",
      gate: GateKind.ImplementationReview,
      evaluatorHatId: "backend_implementer",
      passed,
      chooser: preferChooser<GateOutcome>(GateOutcome.Approved, "approve"),
      atMs: 0,
      proposerHatId: "frontend_implementer",
    });
    expect(other.ok).toBe(true);
  });

  test("the CHAIN excludes the proposer before it even picks an evaluator", () => {
    // A chart where the author is the ONLY hat holding a scope must BLOCK, not self-approve.
    const soleOwner = buildOrgChart(
      SEED_HATS.map((h: OrgHat) => {
        if (h.id === "backend_implementer") return { ...h, approvalScopes: [GateKind.ImplementationReview] };
        if (h.approvalScopes === undefined) return h;
        return { ...h, approvalScopes: h.approvalScopes.filter((s) => s !== GateKind.ImplementationReview) };
      }),
    );
    expect(soleOwner.ok).toBe(true);
    if (!soleOwner.ok) return;

    const run = runGateChain(soleOwner.chart, {
      workId: "w1",
      chooser: preferChooser<GateOutcome>(GateOutcome.Approved, "approve"),
      atMs: 0,
      proposerHatId: "backend_implementer",
    });
    expect(run.merged).toBe(false);
    expect(run.blockedAt).toBe(GateKind.ImplementationReview);
    // And the refusal says WHY — a staffing conflict, not a missing scope.
    expect(run.refusals[0]).toContain("which did the work");
  });

  test("with a proposer who owns nothing, the chain runs normally", () => {
    const run = runGateChain(chart, {
      workId: "w1",
      chooser: preferChooser<GateOutcome>(GateOutcome.Approved, "approve"),
      atMs: 0,
      proposerHatId: "backend_implementer",
    });
    expect(run.merged).toBe(true);
    for (const e of run.evaluations) expect(e.byHatId).not.toBe("backend_implementer");
  });

  test("NO_PROPOSER is an explicit choice, visible at the call site", () => {
    // The sentinel exists so "this work has no author" is something a caller says out loud rather
    // than an argument it forgot.
    const run = runGateChain(chart, {
      workId: "w1",
      chooser: preferChooser<GateOutcome>(GateOutcome.Approved, "approve"),
      atMs: 0,
      proposerHatId: NO_PROPOSER,
    });
    expect(run.merged).toBe(true);
  });
});

describe("the full gate preflight combines both checks", () => {
  test("a missing scope fails first", () => {
    const r = preflightGateEvaluation(chart, {
      evaluatorHatId: "backend_implementer",
      gate: GateKind.RuntimeValidation,
      proposerHatId: "frontend_implementer",
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toContain("approval scope");
  });

  test("a held scope with self-authorship fails on duties", () => {
    const r = preflightGateEvaluation(conflicted, {
      evaluatorHatId: "backend_implementer",
      gate: GateKind.ImplementationReview,
      proposerHatId: "backend_implementer",
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toContain("did this work");
  });

  test("both satisfied passes", () => {
    expect(
      preflightGateEvaluation(chart, {
        evaluatorHatId: "qa_engineer",
        gate: GateKind.RuntimeValidation,
        proposerHatId: "backend_implementer",
      }).ok,
    ).toBe(true);
  });
});
