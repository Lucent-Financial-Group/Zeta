/**
 * org-event.test.ts — the trace, driven from a real run.
 *
 * A typed trace is only worth the cost if it can be QUERIED, so most of this asks the questions a
 * string log cannot answer: what happened to this work, what did this hat decide, and what did this
 * whole line of authority decide.
 */

import { describe, expect, test } from "bun:test";
import {
  actorsIn,
  countByKind,
  decidedBy,
  decidedUnder,
  emit,
  eventsFor,
  ofKind,
  OrgEventKind,
  render,
  unattributed,
} from "./org-event";
import { agentsFromChart, runOrgRuntime, type OrgRuntimeDeps } from "./org-runtime";
import { buildOrgChart, supervisorChainOf } from "./org-chart";
import { SEED_HATS } from "./org-seed";
import { IntakeKind, Severity, type ExternalEvent } from "./intake";
import { RunOutcome } from "./qa";

const chart = (() => {
  const r = buildOrgChart(SEED_HATS);
  if (!r.ok) throw new Error(r.reason);
  return r.chart;
})();

const GOOD: ExternalEvent = {
  source: "portal",
  externalId: "T-1",
  kind: IntakeKind.Defect,
  severity: Severity.High,
  title: "checkout double-charges",
  reproduction: "twice",
  evidenceRefs: ["log/1"],
};

function deps(over: Partial<OrgRuntimeDeps> = {}): OrgRuntimeDeps {
  let n = 0;
  return {
    chart,
    externalEvents: [GOOD],
    agents: agentsFromChart(chart),
    observations: [],
    acceptingHatId: "cto",
    resourceAuthorityHatId: "rmo_office",
    priorityDeciderHatId: "cto",
    createId: (p) => `${p}-${String(++n).padStart(3, "0")}`,
    nowMs: 0,
    workBlockMs: 3_600_000,
    leaseMs: 300_000,
    priorityInputsFor: () => ({
      executivePriority: 0.5, customerImpact: 1, severity: 1, releaseRisk: 0.2,
      blockedDownstreamCount: 2, dependencyFanOut: 1, queueAgeMs: 0, hatScarcity: 0,
      budgetBurn: 0, estimatedEffort: 0.2,
    }),
    ...over,
  };
}

describe("the supervisor chain is DERIVED, never supplied", () => {
  test("emit computes it from the chart, root first", () => {
    const e = emit(chart, "e1", {
      kind: OrgEventKind.WorkItemTransition,
      subjectId: "w1",
      actorHatId: "backend_implementer",
      decision: "did a thing",
      atMs: 0,
    });
    expect(e.supervisorChain[0]).toBe("executive_board_member");
    expect(e.supervisorChain[e.supervisorChain.length - 1]).toBe("backend_implementer");
    // It is exactly the chart's own chain, reversed — one definition, not two.
    expect([...e.supervisorChain].reverse()).toEqual([...supervisorChainOf(chart, "backend_implementer")]);
  });

  test("an actor the chart does not know gets an EMPTY chain, not a fabricated one", () => {
    // A fabricated chain would attribute the act to a line it never belonged to, and hide that
    // forever. Empty makes it findable.
    const e = emit(chart, "e1", {
      kind: OrgEventKind.WorkItemTransition,
      subjectId: "w1",
      actorHatId: "ghost",
      decision: "x",
      atMs: 0,
    });
    expect(e.supervisorChain).toEqual([]);
    expect(unattributed([e])).toHaveLength(1);
  });

  test("an event with no actor is not 'unattributed' — nobody decided it", () => {
    const e = emit(chart, "e1", { kind: OrgEventKind.Refusal, subjectId: "w1", decision: "x", atMs: 0 });
    expect(e.supervisorChain).toEqual([]);
    expect(unattributed([e])).toEqual([]);
  });
});

describe("the trace of a real run", () => {
  test("every event is attributable", async () => {
    const r = await runOrgRuntime(deps());
    expect(r.trace.length).toBeGreaterThan(20);
    expect(unattributed(r.trace)).toEqual([]);
  });

  test("it is genuinely varied — not one kind wearing a type", async () => {
    // A trace that is typed in shape but uniform in content is worse than strings, because it
    // LOOKS structured.
    const counts = countByKind(r0.trace);
    expect(Object.keys(counts).length).toBeGreaterThan(6);
    for (const kind of [
      OrgEventKind.IntakeReceived,
      OrgEventKind.PriorityDecision,
      OrgEventKind.HatAssignment,
      OrgEventKind.HatBindingTransition,
      OrgEventKind.ScheduleBlockPlanned,
      OrgEventKind.MeetingScheduled,
      OrgEventKind.SupervisorSignalSent,
      OrgEventKind.TestRunRecorded,
      OrgEventKind.ChangeProjected,
    ]) {
      expect(ofKind(r0.trace, kind).length).toBeGreaterThan(0);
    }
  });

  test("WHAT HAPPENED TO THIS WORK — a question strings cannot answer", async () => {
    const taskId = r0.cascade.nodes.find((n) => n.assigneeHatId !== undefined)!.workId;
    const its = eventsFor(r0.trace, taskId);
    expect(its.length).toBeGreaterThan(3);
    const kinds = new Set(its.map((e) => e.kind));
    expect(kinds.has(OrgEventKind.WorkItemTransition)).toBe(true);
    expect(kinds.has(OrgEventKind.HatAssignment)).toBe(true);
    expect(kinds.has(OrgEventKind.TestRunRecorded)).toBe(true);

    // Asserting only what is PRESENT stays true if the filter returns everything. The
    // discriminating assertions are that nothing else came back, and that a strictly smaller set
    // came back than the whole trace.
    for (const e of its) expect(e.subjectId).toBe(taskId);
    expect(its.length).toBeLessThan(r0.trace.length);
    const otherTask = r0.cascade.nodes.find(
      (n) => n.assigneeHatId !== undefined && n.workId !== taskId,
    )!.workId;
    expect(eventsFor(r0.trace, otherTask).some((e) => e.subjectId === taskId)).toBe(false);
    expect(eventsFor(r0.trace, "nothing-with-this-id")).toEqual([]);
  });

  test("WHAT DID THIS HAT DECIDE", async () => {
    const cto = decidedBy(r0.trace, "cto");
    expect(cto.length).toBeGreaterThan(0);
    for (const e of cto) expect(e.actorHatId).toBe("cto");
    // The CTO accepted the goal and set priority; it did not run tests.
    expect(cto.some((e) => e.kind === OrgEventKind.PriorityDecision)).toBe(true);
    expect(cto.some((e) => e.kind === OrgEventKind.TestRunRecorded)).toBe(false);
  });

  test("WHAT DID THIS LINE OF AUTHORITY DECIDE — the query the chain exists for", async () => {
    // Answerable without knowing who reports to the CTO, so it stays right when the chart changes.
    const underCto = decidedUnder(r0.trace, "cto");
    const underCoo = decidedUnder(r0.trace, "coo");
    expect(underCto.length).toBeGreaterThan(0);

    // Everything under the CTO really is in the CTO's line.
    for (const e of underCto) {
      expect(supervisorChainOf(chart, e.actorHatId!)).toContain("cto");
    }
    // The engineering line reports to the CTO, not the COO — so the delivery work is under one and
    // not the other. That difference is what makes the query mean something.
    expect(underCto.some((e) => e.actorHatId === "engineering_manager")).toBe(true);
    expect(underCoo.some((e) => e.actorHatId === "engineering_manager")).toBe(false);
  });

  test("the board's line contains EVERYTHING — it is the root", async () => {
    const attributed = r0.trace.filter((e) => e.actorHatId !== undefined);
    expect(decidedUnder(r0.trace, "executive_board_member")).toHaveLength(attributed.length);
  });

  test("the actors derived FROM THE TRACE agree with the levels the run tallied", async () => {
    // Two independent derivations of the same fact. A tally kept alongside the work can drift from
    // the work, and only a second derivation notices.
    const levelsFromTrace = new Set(
      actorsIn(r0.trace).map((h) => chart.byId.get(h)?.level).filter((l) => l !== undefined),
    );
    for (const level of r0.levelsEngaged) expect(levelsFromTrace.has(level)).toBe(true);
  });

  test("the rendered log is the trace, one line each", async () => {
    expect(r0.events).toEqual(r0.trace.map(render));
  });

  test("evidence travels on the events that have it", async () => {
    const intake = ofKind(r0.trace, OrgEventKind.IntakeReceived)[0]!;
    expect(intake.evidenceRefs.length).toBeGreaterThan(0);
    const qa = ofKind(r0.trace, OrgEventKind.TestRunRecorded)[0]!;
    expect(qa.evidenceRefs.length).toBeGreaterThan(0);
  });
});

describe("a failing run traces its failures", () => {
  test("gate rejections and the escalation are both in the trace", async () => {
    const r = await runOrgRuntime(deps({ qaFallback: RunOutcome.Failed, churnThreshold: 2, maxGateAttempts: 5 }));
    expect(ofKind(r.trace, OrgEventKind.QualityGateEvaluation).length).toBeGreaterThan(0);
    const escalations = ofKind(r.trace, OrgEventKind.EscalationDecision);
    expect(escalations.length).toBeGreaterThan(0);

    // A failing run now escalates for TWO distinct causes, and the trace keeps them apart: the
    // gate churn the pipeline produced, and the stall the reactor found at rest. Asserting one
    // cause for every escalation would have made the second one a test failure rather than the
    // signal it is.
    const churn = escalations.filter((e) => e.fromState === "repeated_gate_rejection");
    expect(churn.length).toBeGreaterThan(0);
    for (const e of churn) {
      // Decided by a manager, inside the engineering line.
      expect(e.actorHatId).toBe("engineering_manager");
      expect(e.supervisorChain).toContain("cto");
    }
    for (const e of escalations) {
      expect(["repeated_gate_rejection", "stale_blocker"]).toContain(String(e.fromState));
      // Whatever the cause, the decider is inside the line that owns the work.
      expect(e.supervisorChain.length).toBeGreaterThan(0);
    }
    expect(unattributed(r.trace)).toEqual([]);
  });
});

describe("rendering", () => {
  test("an arrival shows one state, a transition shows both", () => {
    const arrival = emit(chart, "e", { kind: OrgEventKind.Refusal, subjectId: "s", decision: "d", toState: "open", atMs: 0 });
    expect(render(arrival)).toBe("d [open]");
    const move = emit(chart, "e", {
      kind: OrgEventKind.Refusal, subjectId: "s", decision: "d", fromState: "a", toState: "b", atMs: 0,
    });
    expect(render(move)).toBe("d [a → b]");
  });

  test("the agent is named over the hat when both are present", () => {
    const e = emit(chart, "e", {
      kind: OrgEventKind.HatBindingTransition, subjectId: "s", decision: "d",
      actorHatId: "backend_implementer", actorAgentId: "alexa", atMs: 0,
    });
    expect(render(e)).toBe("alexa: d");
  });
});

// One shared run, since the whole suite reads the same trace.
const r0 = await runOrgRuntime(deps());
