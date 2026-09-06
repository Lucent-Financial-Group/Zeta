import { describe, expect, test } from "bun:test";
import {
  bounceBackCount,
  churnGate,
  DEFAULT_CHURN_THRESHOLD,
  decideEscalation,
  detectChurn,
  EscalationAction,
  EscalationTrigger,
  escalationDeciderFor,
  escalationEffect,
  hasEscalationAuthority,
  legalEscalationActions,
} from "./escalation";
import { preferChooser, firstLegalChooser, type OrgChooser } from "./org-decision";
import { GateKind, GateOutcome, type GateEvaluation } from "./quality-gate";
import { buildOrgChart } from "./org-chart";
import { SEED_HATS } from "./org-seed";

const chart = (() => {
  const r = buildOrgChart(SEED_HATS);
  if (!r.ok) throw new Error(r.reason);
  return r.chart;
})();

const ev = (workId: string, gate: GateKind, outcome: GateOutcome): GateEvaluation => ({
  workId,
  gate,
  outcome,
  byHatId: "qa_manager",
  reason: "",
  atMs: 0,
});

const failed = (n: number, gate: GateKind = GateKind.RuntimeValidation): GateEvaluation[] =>
  Array.from({ length: n }, () => ev("t1", gate, GateOutcome.Rejected));

describe("churn is counted from the record, not from a counter", () => {
  test("only non-passing evaluations count", () => {
    const evals = [
      ev("t1", GateKind.RuntimeValidation, GateOutcome.Rejected),
      ev("t1", GateKind.RuntimeValidation, GateOutcome.Approved),
      ev("t1", GateKind.RuntimeValidation, GateOutcome.ChangesRequested),
      ev("t1", GateKind.RuntimeValidation, GateOutcome.Waived),
    ];
    // Rejected and changes_requested are bounce-backs; approved and waived are not.
    expect(bounceBackCount("t1", evals)).toBe(2);
  });

  test("another item's failures do not count toward this one", () => {
    const evals = [...failed(5).map((e) => ({ ...e, workId: "t2" })), ...failed(1)];
    expect(bounceBackCount("t1", evals)).toBe(1);
  });

  test("churn fires at the threshold, not before", () => {
    expect(detectChurn("t1", failed(DEFAULT_CHURN_THRESHOLD - 1))).toBe(false);
    expect(detectChurn("t1", failed(DEFAULT_CHURN_THRESHOLD))).toBe(true);
  });

  test("a custom threshold is honoured", () => {
    expect(detectChurn("t1", failed(2), 2)).toBe(true);
    expect(detectChurn("t1", failed(2), 5)).toBe(false);
  });

  test("a threshold of ZERO does not make churn permanent", () => {
    // Otherwise work that has never failed is in churn from the first tick, and the escalation
    // carries no information at all.
    expect(detectChurn("t1", [], 0)).toBe(false);
    expect(detectChurn("t1", [], -1)).toBe(false);
  });

  test("the gate it keeps failing is identified", () => {
    const evals = [
      ...failed(1, GateKind.ImplementationReview),
      ...failed(3, GateKind.RuntimeValidation),
    ];
    expect(churnGate("t1", evals)).toBe(GateKind.RuntimeValidation);
    expect(churnGate("t1", [])).toBeUndefined();
  });
});

describe("escalation is a management act", () => {
  test("manager and above may decide; lead and IC may not", () => {
    expect(hasEscalationAuthority("manager")).toBe(true);
    expect(hasEscalationAuthority("director")).toBe(true);
    expect(hasEscalationAuthority("executive_board")).toBe(true);
    expect(hasEscalationAuthority("lead")).toBe(false);
    expect(hasEscalationAuthority("individual_contributor")).toBe(false);
  });

  test("a hat without the authority gets an EMPTY legal set", () => {
    expect(legalEscalationActions(EscalationTrigger.RepeatedGateRejection, "lead")).toEqual([]);
    expect(legalEscalationActions(EscalationTrigger.RepeatedGateRejection, "manager").length).toBeGreaterThan(0);
  });

  test("the decider is resolved from the chart, inside the owning line", () => {
    // A lead's escalation is decided by its own manager, not by a hardcoded one.
    expect(escalationDeciderFor(chart, "tech_lead")?.id).toBe("engineering_manager");
    expect(escalationDeciderFor(chart, "backend_implementer")?.id).toBe("engineering_manager");
    // QA's escalation stays in QA.
    expect(escalationDeciderFor(chart, "qa_engineer")?.id).toBe("qa_manager");
  });

  test("a manager decides its OWN escalation — it is not sent looking for a blessing", () => {
    expect(escalationDeciderFor(chart, "engineering_manager")?.id).toBe("engineering_manager");
  });

  test("an unknown hat has no decider", () => {
    expect(escalationDeciderFor(chart, "ghost")).toBeUndefined();
  });
});

describe("the legal set depends on the CAUSE", () => {
  test("a saturated review queue is not fixed by re-scoping the work", () => {
    const legal = legalEscalationActions(EscalationTrigger.ReviewQueueSaturated, "manager");
    expect(legal).toContain(EscalationAction.ReassignReviewer);
    expect(legal).not.toContain(EscalationAction.ReScope);
  });

  test("a stale blocker is not fixed by adding agents to work nobody owns", () => {
    const legal = legalEscalationActions(EscalationTrigger.StaleBlocker, "manager");
    expect(legal).toContain(EscalationAction.AssignOwner);
    expect(legal).not.toContain(EscalationAction.AddAgents);
  });

  test("every trigger has a non-empty legal set for an authorized decider", () => {
    for (const t of Object.values(EscalationTrigger)) {
      expect(legalEscalationActions(t, "director").length).toBeGreaterThan(0);
    }
  });
});

describe("EVERY escalation either changes the input or halts the loop", () => {
  test("the effect is total over the action set", () => {
    // "Endure it" is deliberately not an option: an escalation whose outcome is to try the same
    // thing again is how a bounded retry becomes an unbounded one.
    for (const a of Object.values(EscalationAction)) {
      expect(["changes_the_input", "halts_the_loop"]).toContain(escalationEffect(a));
    }
  });

  test("the actions split the way the design says", () => {
    expect(escalationEffect(EscalationAction.AddAgents)).toBe("changes_the_input");
    expect(escalationEffect(EscalationAction.BringInArchitect)).toBe("changes_the_input");
    expect(escalationEffect(EscalationAction.Pause)).toBe("halts_the_loop");
    expect(escalationEffect(EscalationAction.AcceptRisk)).toBe("halts_the_loop");
  });
});

describe("deciding an escalation", () => {
  const base = {
    trigger: EscalationTrigger.RepeatedGateRejection,
    workId: "t1",
    ownerHatIds: ["tech_lead"],
    deciderHatId: "engineering_manager",
  };

  test("an authorized manager escalates, and the change is structural", () => {
    const r = decideEscalation(chart, {
      ...base,
      chooser: preferChooser<EscalationAction>(EscalationAction.AddAgents, "add agents"),
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.action).toBe(EscalationAction.AddAgents);
    expect(r.change).toEqual({ kind: "expand_supply", ownerHatIds: ["tech_lead"], addCount: 1 });
    expect(r.effect).toBe("changes_the_input");
    expect(r.byHatId).toBe("engineering_manager");
  });

  test("a LEAD cannot decide one", () => {
    const r = decideEscalation(chart, {
      ...base,
      deciderHatId: "tech_lead",
      chooser: firstLegalChooser(),
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toContain("manager and above");
  });

  test("an unknown decider is refused", () => {
    const r = decideEscalation(chart, { ...base, deciderHatId: "ghost", chooser: firstLegalChooser() });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toContain("unknown hat");
  });

  test("the architect is RESOLVED from the chart, not named", () => {
    const r = decideEscalation(chart, {
      ...base,
      chooser: preferChooser<EscalationAction>(EscalationAction.BringInArchitect, "architect"),
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.change.kind).toBe("new_approach");
    if (r.change.kind !== "new_approach") return;
    // A real hat in THIS chart, holding the architecture-approval scope.
    const hat = chart.byId.get(r.change.architectHatId);
    expect(hat).toBeDefined();
    expect(hat?.approvalScopes).toContain(GateKind.ArchitectureApproval);
    expect(r.change.reopenGate).toBe(GateKind.ArchitectureApproval);
  });

  test("an organization with NO architect is told so, not handed a dangling id", () => {
    // Recording a structural fix nobody can perform is worse than the churn it claims to break.
    const noArchitect = buildOrgChart(
      SEED_HATS.map((h) =>
        h.approvalScopes === undefined
          ? h
          : { ...h, approvalScopes: h.approvalScopes.filter((s) => s !== GateKind.ArchitectureApproval) },
      ),
    );
    expect(noArchitect.ok).toBe(true);
    if (!noArchitect.ok) return;

    const r = decideEscalation(noArchitect.chart, {
      ...base,
      chooser: preferChooser<EscalationAction>(EscalationAction.BringInArchitect, "architect"),
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toContain("architecture-approval scope");
  });

  test("a chooser asking for an ILLEGAL action is clamped into the legal set", () => {
    // `ReassignReviewer` is not legal for repeated gate rejection.
    const r = decideEscalation(chart, {
      ...base,
      chooser: preferChooser<EscalationAction>(EscalationAction.ReassignReviewer, "reassign"),
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(legalEscalationActions(base.trigger, "manager")).toContain(r.action);
    expect(r.action).not.toBe(EscalationAction.ReassignReviewer);
  });

  test("a wild chooser index cannot escape the legal set", () => {
    const wild: OrgChooser<EscalationAction> = () => ({ index: 9999, reason: "?" });
    const r = decideEscalation(chart, { ...base, chooser: wild });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(legalEscalationActions(base.trigger, "manager")).toContain(r.action);
  });
});
