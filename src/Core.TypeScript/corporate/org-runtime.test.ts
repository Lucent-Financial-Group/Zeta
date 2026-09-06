/**
 * org-runtime.test.ts — the end-to-end proof for the WHOLE register.
 *
 * `org-cycle.test.ts` proves the delivery loop. This proves the pipeline that surrounds it: a
 * customer report arrives, is de-duplicated and triaged, is prioritized by an authority, becomes a
 * goal, cascades to owned tasks, is staffed by ranked assignment into real expiring bindings, is
 * scheduled, is picked up by the dev's OWN observe tick, is claimed and reviewed through the work
 * market, is verified by QA, crosses seven gates, and comes back delivered.
 *
 * Assertions are on organizational STATE — the cascade, the bindings, the queue, the board — not on
 * the event log. The log is the runtime's account of itself, and an account is the easiest thing to
 * make look right.
 */

import { describe, expect, test } from "bun:test";
import { agentsFromChart, gateStaffing, runOrgRuntime, staffingReadout, type OrgRuntimeDeps } from "./org-runtime";
import { buildOrgChart, reportsUpTo } from "./org-chart";
import { SEED_HATS } from "./org-seed";
import { IntakeKind, Severity, externalRefOf, type ExternalEvent } from "./intake";
import { childrenOf, isDelivered, nodeById, WorkState, WorkType } from "./goal-cascade";
import { isAuthorizing, BindingPhase } from "./hat-binding";
import { GateKind, GateOutcome, ORDERED_GATES, mayEvaluate } from "./quality-gate";
import { RunOutcome } from "./qa";
import { ShardState } from "./work-market";
import { PriorityClass } from "./prioritization";
import { AnchorState } from "./discussion-anchor";
import { SignalTool } from "./supervisor-signal";

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
  reproduction: "add the coupon twice",
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
      executivePriority: 0.5,
      customerImpact: 1,
      severity: 1,
      releaseRisk: 0.2,
      blockedDownstreamCount: 2,
      dependencyFanOut: 1,
      queueAgeMs: 0,
      hatScarcity: 0,
      budgetBurn: 0,
      estimatedEffort: 0.2,
    }),
    ...over,
  };
}

describe("THE WHOLE PIPELINE, end to end", () => {
  let report: Awaited<ReturnType<typeof runOrgRuntime>>;

  test("it runs, and the only refusals are the ones the inputs asked for", async () => {
    report = await runOrgRuntime(deps());
    expect(report.refusals).toEqual([]);
    expect(report.delivered).toBe(true);
  });

  test("EVERY level from the C-suite to the contributor took part", async () => {
    report = await runOrgRuntime(deps());
    expect(report.levelsEngaged).toEqual([
      "c_suite",
      "director",
      "manager",
      "lead",
      "individual_contributor",
    ]);
  });

  test("1. INTAKE — the report was accepted, normalized and keyed", async () => {
    report = await runOrgRuntime(deps());
    expect(report.intakeAccepted).toHaveLength(1);
    expect(report.intakeAccepted[0]?.externalRef).toBe(externalRefOf("portal", "T-1"));
    expect(report.intakeAccepted[0]?.severity).toBe(Severity.High);
  });

  test("2. PRIORITIZE — an authority set the class, and the recommendation is kept", async () => {
    report = await runOrgRuntime(deps());
    expect(report.priorities).toHaveLength(1);
    const p = report.priorities[0]!;
    expect(p.decidedByHatId).toBe("cto");
    expect(p.priorityClass).not.toBe(PriorityClass.Paused);
    expect(p.reasonCodes).toContain("severity");
    expect(p.recommended).toBeDefined();
  });

  test("3. CASCADE — goal → initiative → project → task, each rung owned in one line", async () => {
    report = await runOrgRuntime(deps());
    const c = report.cascade;
    const goal = nodeById(c, report.goalWorkId!);
    expect(goal?.workType).toBe(WorkType.Goal);
    const initiative = childrenOf(c, goal!.workId)[0]!;
    const project = childrenOf(c, initiative.workId)[0]!;
    const tasks = childrenOf(c, project.workId);
    expect(tasks).toHaveLength(2);
    expect(chart.byId.get(goal!.ownerHatId)?.level).toBe("c_suite");
    expect(chart.byId.get(initiative.ownerHatId)?.level).toBe("director");
    expect(chart.byId.get(project.ownerHatId)?.level).toBe("manager");
    expect(chart.byId.get(tasks[0]!.ownerHatId)?.level).toBe("lead");
    for (const n of c.nodes) {
      if (n.parentWorkId === undefined) continue;
      expect(reportsUpTo(chart, n.ownerHatId, nodeById(c, n.parentWorkId)!.ownerHatId)).toBe(true);
    }
  });

  test("4. STAFF — the RMO was asked, and real bindings were issued", async () => {
    report = await runOrgRuntime(deps());
    const staffing = report.signals.filter((s) => s.tool === SignalTool.RequestResource);
    expect(staffing).toHaveLength(2);
    for (const s of staffing) {
      expect(s.toHatId).toBe("rmo_office");
      expect(report.board.anchors.find((a) => a.anchorId === s.anchorId)?.state).toBe(AnchorState.Resolved);
    }
    expect(report.bindings).toHaveLength(2);
  });

  test("EACH TASK LANDS ON A DIFFERENT HAT, both inside the owning line", async () => {
    // The first run of this pipeline put both tasks on one hat and the second was refused at the
    // supply cap — a selection bug that read as a capacity problem.
    report = await runOrgRuntime(deps());
    const assignees = report.cascade.nodes
      .map((n) => n.assigneeHatId)
      .filter((h): h is string => h !== undefined);
    expect(assignees).toHaveLength(2);
    expect(new Set(assignees).size).toBe(2);
    for (const hatId of assignees) {
      expect(chart.byId.get(hatId)?.level).toBe("individual_contributor");
      expect(reportsUpTo(chart, hatId, "tech_lead")).toBe(true);
    }
  });

  test("the bindings are ACTIVE and authorizing — a hat is worn, not owned", async () => {
    report = await runOrgRuntime(deps());
    const warmed = Math.max(...report.bindings.map((b) => b.warmupEndsMs));
    for (const b of report.bindings) {
      expect(b.phase).toBe(BindingPhase.Active);
      expect(isAuthorizing(b, warmed)).toBe(true);
      // …and they will expire. A binding with no end is ownership.
      expect(isAuthorizing(b, b.expiresMs)).toBe(false);
    }
  });

  test("5. SCHEDULE — assignees are booked and the accountable chain met", async () => {
    report = await runOrgRuntime(deps());
    const work = report.calendar.blocks.filter((b) => b.blockType === "prioritized_work");
    const meeting = report.calendar.blocks.filter((b) => b.blockType === "meeting");
    expect(work).toHaveLength(2);
    expect(meeting).toHaveLength(4); // lead, manager, director, C-suite
    expect(new Set(meeting.map((m) => `${m.startMs}..${m.endMs}`)).size).toBe(1);
  });

  test("6. THE DEV'S OWN LOOP was offered its work and picked it", async () => {
    report = await runOrgRuntime(deps());
    expect(report.loopTicks).toHaveLength(2);
    for (const t of report.loopTicks) {
      expect(t.offered).toBeGreaterThan(0);
      expect(t.pickedWorkId).toBeDefined();
    }
    // ONE TICK PER HAT, not per agent: this agent wears two, and each tick names which.
    expect(new Set(report.loopTicks.map((t) => t.hatId)).size).toBe(2);
    // …and each picked its OWN task, not the same one twice.
    expect(new Set(report.loopTicks.map((t) => t.pickedWorkId)).size).toBe(2);
  });

  test("7. MARKET — every shard was claimed, completed, approved by someone else, and merged", async () => {
    report = await runOrgRuntime(deps());
    expect(report.queue.shards).toHaveLength(2);
    for (const s of report.queue.shards) expect(s.state).toBe(ShardState.Merged);
    expect(report.queueReadout.merged).toBe(2);
    // The approver is never the claimant — the quorum rule.
    for (const a of report.queue.approvals) {
      const claimant = report.queue.claims.find((c) => c.shardId === a.shardId);
      expect(a.byAgentId).not.toBe(claimant?.ownerAgentId);
    }
  });

  test("8. QA — real cases derived from the criteria, and they ran", async () => {
    report = await runOrgRuntime(deps());
    expect(report.qa).toHaveLength(2);
    expect(report.testCases.length).toBeGreaterThan(0);
    for (const q of report.qa) {
      expect(q.runs.length).toBeGreaterThan(0);
      expect(q.failed).toBe(0);
    }
  });

  test("9. GATES — all seven, each by an authorized hat outside the delivery line", async () => {
    report = await runOrgRuntime(deps());
    expect(report.gateRuns).toHaveLength(2);
    for (const { run } of report.gateRuns) {
      expect(run.merged).toBe(true);
      expect(run.evaluations).toHaveLength(ORDERED_GATES.length);
      for (const e of run.evaluations) expect(mayEvaluate(chart, e.byHatId, e.gate)).toBe(true);
    }
    const departments = new Set(
      report.gateEvaluations.map((e) => chart.byId.get(e.byHatId)?.departmentId),
    );
    expect(departments.size).toBeGreaterThan(1);
  });

  test("DELIVERY ROLLED UP — nobody marked the goal done", async () => {
    report = await runOrgRuntime(deps());
    expect(nodeById(report.cascade, report.goalWorkId!)?.state).toBe(WorkState.Open);
    expect(isDelivered(report.cascade, report.goalWorkId!)).toBe(true);
  });

  test("succession is planned for every hat that was worn", async () => {
    report = await runOrgRuntime(deps());
    expect(report.succession).toHaveLength(2);
    // The seed's policy is `appoint`, so no successor is invented — an authority decides.
    for (const p of report.succession) expect(p.nextWearerAgentId).toBeUndefined();
  });

  test("the runtime is a FUNCTION OF ITS INPUTS", async () => {
    const a = await runOrgRuntime(deps());
    const b = await runOrgRuntime(deps());
    expect(a.events).toEqual(b.events);
    expect(a.cascade).toEqual(b.cascade);
    expect(a.queue).toEqual(b.queue);
    expect(a.bindings).toEqual(b.bindings);
    expect(a.delivered).toBe(b.delivered);
  });
});

describe("the pipeline refuses at every door it should", () => {
  test("a DUPLICATE report is de-duplicated, not ingested twice", async () => {
    const report = await runOrgRuntime(deps({ externalEvents: [GOOD, { ...GOOD, title: "again" }] }));
    expect(report.intakeAccepted).toHaveLength(1);
    expect(report.intakeRefused.map((r) => r.reason)).toEqual(["duplicate"]);
  });

  test("a defect with NO reproduction never reaches the backlog", async () => {
    const bare: ExternalEvent = { source: "portal", externalId: "T-9", kind: IntakeKind.Defect, title: "broken" };
    const report = await runOrgRuntime(deps({ externalEvents: [bare] }));
    expect(report.intakeAccepted).toHaveLength(0);
    expect(report.intakeRefused[0]?.reason).toBe("missing_reproduction");
    // …and with nothing workable, no goal is invented.
    expect(report.goalWorkId).toBeUndefined();
    expect(report.delivered).toBe(false);
  });

  test("nothing workable means no cascade at all", async () => {
    const report = await runOrgRuntime(deps({ externalEvents: [] }));
    expect(report.cascade.nodes).toHaveLength(0);
    expect(report.refusals.some((r) => r.includes("nothing workable"))).toBe(true);
  });

  test("QA FAILING blocks the gate, and nothing is delivered", async () => {
    // The whole point of wiring QA into runtime validation: the gate reads evidence, so a failing
    // suite cannot be approved by choosing to approve it.
    const report = await runOrgRuntime(deps({ qaFallback: RunOutcome.Failed }));
    for (const q of report.qa) expect(q.failed).toBeGreaterThan(0);
    expect(report.gateBlocked.length).toBeGreaterThan(0);
    for (const b of report.gateBlocked) expect(b.gate).toBe(GateKind.RuntimeValidation);
    expect(report.delivered).toBe(false);
    // The tasks stay open — the cascade agrees with the gate.
    for (const n of report.cascade.nodes) expect(n.state).toBe(WorkState.Open);
  });

  test("repeated QA failure becomes CHURN and a manager escalates", async () => {
    const report = await runOrgRuntime(
      deps({ qaFallback: RunOutcome.Failed, churnThreshold: 2, maxGateAttempts: 5 }),
    );
    expect(report.escalations.length).toBeGreaterThan(0);
    for (const e of report.escalations) {
      expect(chart.byId.get(e.byHatId)?.level).toBe("manager");
      expect(["changes_the_input", "halts_the_loop"]).toContain(e.effect);
    }
    // The loop STOPPED rather than running to the attempt bound.
    for (const taskId of new Set(report.gateRuns.map((g) => g.taskId))) {
      expect(report.gateRuns.filter((g) => g.taskId === taskId).length).toBe(2);
    }
  });

  test("a goal accepted below the C-suite is refused, and the pipeline stops", async () => {
    const report = await runOrgRuntime(deps({ acceptingHatId: "engineering_manager" }));
    expect(report.refusals.some((r) => r.includes("accepted at the top"))).toBe(true);
    expect(report.cascade.nodes).toHaveLength(0);
    expect(report.delivered).toBe(false);
  });

  test("a LEAD cannot set priority, so nothing becomes workable", async () => {
    const report = await runOrgRuntime(deps({ priorityDeciderHatId: "tech_lead" }));
    expect(report.priorities).toHaveLength(0);
    expect(report.refusals.some((r) => r.includes("raise a signal"))).toBe(true);
    expect(report.delivered).toBe(false);
  });

  test("with NO agents nothing can be staffed, and the refusals name why", async () => {
    const report = await runOrgRuntime(deps({ agents: [] }));
    expect(report.bindings).toHaveLength(0);
    expect(report.refusals.some((r) => r.includes("no eligible candidate"))).toBe(true);
    expect(report.delivered).toBe(false);
  });

  test("a gate nobody owns blocks delivery rather than waving it through", async () => {
    const stripped = buildOrgChart(
      SEED_HATS.map((h) =>
        h.approvalScopes === undefined
          ? h
          : { ...h, approvalScopes: h.approvalScopes.filter((s) => s !== GateKind.ReleaseReadiness) },
      ),
    );
    expect(stripped.ok).toBe(true);
    if (!stripped.ok) return;
    const report = await runOrgRuntime(deps({ chart: stripped.chart }));
    expect(report.delivered).toBe(false);
    expect(report.refusals.some((r) => r.includes("no hat holds the approval scope"))).toBe(true);
  });
});

describe("reputation actually steers the staffing", () => {
  test("an agent with a better record on the hat is chosen over one with a worse one", async () => {
    const hatId = "backend_implementer";
    const observations = [
      ...Array.from({ length: 10 }, () => ({
        agentId: "good",
        hatId,
        outcomeClass: "quality" as const,
        success: true,
        atMs: 0,
      })),
      ...Array.from({ length: 10 }, () => ({
        agentId: "bad",
        hatId,
        outcomeClass: "quality" as const,
        success: false,
        atMs: 0,
      })),
    ];
    const report = await runOrgRuntime(
      deps({
        agents: [
          { agentId: "bad", hatId: "backend_implementer" },
          { agentId: "good", hatId: "backend_implementer" },
        ],
        observations,
      }),
    );
    const wearer = report.bindings.find((b) => b.hatId === hatId)?.wearerAgentId;
    expect(wearer).toBe("good");
  });
});

describe("the readouts the RMO reads", () => {
  test("gate staffing lists a real owner for every gate", () => {
    const staffing = gateStaffing(chart);
    for (const gate of ORDERED_GATES) {
      expect(staffing[gate]?.length).toBeGreaterThan(0);
      for (const hatId of staffing[gate]!) expect(mayEvaluate(chart, hatId, gate)).toBe(true);
    }
  });

  test("staffing readout names every exclusion", () => {
    const r = staffingReadout(chart, "backend_implementer", agentsFromChart(chart), [], 0);
    expect(r).toBeDefined();
    expect(r!.eligible.length).toBeGreaterThan(0);
    expect(staffingReadout(chart, "ghost", [], [], 0)).toBeUndefined();
  });
});

describe("the gate consults QA rather than choosing", () => {
  test("FAILING TESTS CANNOT BE APPROVED — there is no caller override left to do it with", async () => {
    // This test used to assert the opposite. It was called "a caller-supplied gate chooser still
    // cannot approve a failing QA run by itself" and then asserted `delivered === true`, with the
    // consolation that the QA report still recorded the failure somewhere. That is the shape this
    // register spent three passes removing — a verdict computed rather than earned — preserved as a
    // documented feature.
    //
    // `deps.gateChooser` is gone. Runtime validation reads the evidence, the other six gates read
    // the review port, and neither answers to a caller who would rather ship.
    const report = await runOrgRuntime(deps({ qaFallback: RunOutcome.Failed }));
    expect(report.delivered).toBe(false);

    // The failure is recorded, AND it is the thing that stopped delivery — not a note beside a
    // green. Both halves matter: the old test had the first without the second.
    for (const q of report.qa) expect(q.failed).toBeGreaterThan(0);
    const runtime = report.gateEvaluations.filter((g) => g.gate === GateKind.RuntimeValidation);
    expect(runtime.length).toBeGreaterThan(0);
    for (const g of runtime) expect(g.outcome).not.toBe(GateOutcome.Approved);
  });

  test("...and a PASSING run still delivers, so the guarantee above is not just a blanket refusal", async () => {
    // Without this, the test above would pass equally well against a runtime that never delivers
    // anything — the vacuity class wearing a safety guarantee.
    const report = await runOrgRuntime(deps());
    expect(report.delivered).toBe(true);
  });
});

describe("three properties the happy path cannot show", () => {
  test("PAUSED work is not cascaded — the priority decision actually gates the pipeline", async () => {
    // Nothing in the default run is ever paused, so `workable` and the raw order agree and the
    // filter is untested. Pausing the only item is what separates them.
    const report = await runOrgRuntime(
      deps({
        priorityChooser: (legal) => ({
          index: legal.indexOf(PriorityClass.Paused),
          reason: "stopped for now",
        }),
      }),
    );
    expect(report.priorities[0]?.priorityClass).toBe(PriorityClass.Paused);
    expect(report.goalWorkId).toBeUndefined();
    expect(report.cascade.nodes).toHaveLength(0);
    expect(report.refusals.some((r) => r.includes("nothing workable"))).toBe(true);
  });

  test("THE AGENT THAT PICKED THE WORK IS THE ONE THAT CLAIMS IT", async () => {
    // With one agent wearing both hats, "the agent that picked it" and "the first wearer" are the
    // same and the market/loop link is invisible. Two distinct agents make them differ.
    const report = await runOrgRuntime(
      deps({
        agents: [
          { agentId: "alice", hatId: "backend_implementer" },
          { agentId: "bob", hatId: "frontend_implementer" },
          { agentId: "carol", hatId: "qa_engineer" },
        ],
        observations: [
          // Steer each agent to its own hat, so the two hats land on two different wearers.
          ...Array.from({ length: 6 }, () => ({
            agentId: "alice", hatId: "backend_implementer", outcomeClass: "quality" as const, success: true, atMs: 0,
          })),
          ...Array.from({ length: 6 }, () => ({
            agentId: "bob", hatId: "frontend_implementer", outcomeClass: "quality" as const, success: true, atMs: 0,
          })),
        ],
      }),
    );

    const wearers = new Set(report.bindings.map((b) => b.wearerAgentId));
    expect(wearers.size).toBe(2);

    // Each loop tick picked a distinct task…
    const picks = new Map(report.loopTicks.map((t) => [t.pickedWorkId, t.agentId]));
    expect(picks.size).toBe(2);

    // …and each shard was claimed by the agent whose tick picked that work.
    for (const shard of report.queue.shards) {
      const claim = report.queue.claims.find((c) => c.shardId === shard.shardId);
      expect(claim?.ownerAgentId).toBe(picks.get(shard.workId));
    }
  });

  test("A STAFFING HOLE stops after ONE attempt and never escalates", async () => {
    // Retrying cannot fill a gate nobody owns, and escalating on it would report a broken loop
    // where the loop never ran.
    const stripped = buildOrgChart(
      SEED_HATS.map((h) =>
        h.approvalScopes === undefined
          ? h
          : { ...h, approvalScopes: h.approvalScopes.filter((s) => s !== GateKind.ReleaseReadiness) },
      ),
    );
    expect(stripped.ok).toBe(true);
    if (!stripped.ok) return;

    const report = await runOrgRuntime(
      deps({ chart: stripped.chart, churnThreshold: 1, maxGateAttempts: 5 }),
    );
    expect(report.escalations).toEqual([]);
    for (const taskId of new Set(report.gateRuns.map((g) => g.taskId))) {
      expect(report.gateRuns.filter((g) => g.taskId === taskId).length).toBe(1);
    }
    expect(report.delivered).toBe(false);
  });
});

describe("the runtime projects its work onto a real CHANGE", () => {
  test("delivered work reaches Merged, and the records do not disagree", async () => {
    const report = await runOrgRuntime(deps());
    expect(report.changes).toHaveLength(2);
    for (const c of report.changes) {
      expect(c.projection.state.tag).toBe("Merged");
      expect(c.disagreements).toEqual([]);
      expect(c.projection.refused).toEqual([]);
    }
    // A disagreement is a REFUSAL, not a log line.
    expect(report.refusals.filter((r) => r.includes("change control"))).toEqual([]);
  });

  test("rejected work does NOT reach Merged", async () => {
    const report = await runOrgRuntime(deps({ qaFallback: RunOutcome.Failed }));
    for (const c of report.changes) {
      expect(c.projection.state.tag).not.toBe("Merged");
      expect(c.projection.terminal).toBe(false);
      expect(c.disagreements).toEqual([]);
    }
  });

  test("unstaffed work never leaves Backlog", async () => {
    const report = await runOrgRuntime(deps({ agents: [] }));
    for (const c of report.changes) expect(c.projection.state.tag).toBe("Backlog");
  });
});
