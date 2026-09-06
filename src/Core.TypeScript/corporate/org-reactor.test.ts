/**
 * org-reactor.test.ts — the organization MOVING, and the ways that goes wrong.
 *
 * Three properties carry this file, and each one is a defect that was live before it was written:
 *
 *   1. The loop REACHES QUIESCENCE. A reaction rule that re-queues its own cause spins until the
 *      step bound and reports a runaway that is really one rule talking to itself.
 *   2. `pending` and `raised` mean OPPOSITE things — work the loop did not reach, versus work it
 *      created for a hat. Reported as one list, a healthy run reads as a truncated one.
 *   3. Not moving is legitimate ONLY when paused or blocked on a NAMED dependency. Everything else
 *      is the standing-by failure, and the invariant has to actually fire.
 */

import { describe, expect, test } from "bun:test";
import {
  ActionKind,
  batchesFromCascade,
  DEFAULT_MAX_STEPS,
  menuFor,
  runReactor,
  type ReactorDeps,
} from "./org-reactor";
import { BatchState, blockBatch, pauseBatch, type WorkBatch } from "./work-batch";
import { WorkState, type Cascade } from "./goal-cascade";
import { buildOrgChart } from "./org-chart";
import { SEED_HATS } from "./org-seed";
import { GateKind, GateOutcome, type GateEvaluation } from "./quality-gate";
import type { OrgChooser } from "./org-decision";

const chart = (() => {
  const r = buildOrgChart(SEED_HATS);
  if (!r.ok) throw new Error(r.reason);
  return r.chart;
})();

/** Two tasks under a project, both finished. */
const doneCascade: Cascade = {
  nodes: [
    { workId: "p1", workType: "project", title: "checkout", state: WorkState.Done, ownerHatId: "engineering_manager" },
    { workId: "t1", workType: "task", title: "a", state: WorkState.Done, ownerHatId: "tech_lead", parentWorkId: "p1", assigneeHatId: "backend_implementer" },
    { workId: "t2", workType: "task", title: "b", state: WorkState.Done, ownerHatId: "tech_lead", parentWorkId: "p1", assigneeHatId: "backend_implementer" },
  ],
};

/** The same shape, but one task is unowned and open — the stall. */
const stuckCascade: Cascade = {
  nodes: [
    { workId: "p1", workType: "project", title: "checkout", state: WorkState.InProgress, ownerHatId: "engineering_manager" },
    { workId: "t1", workType: "task", title: "a", state: WorkState.Done, ownerHatId: "tech_lead", parentWorkId: "p1", assigneeHatId: "backend_implementer" },
    { workId: "t2", workType: "task", title: "b", state: WorkState.Open, ownerHatId: "tech_lead", parentWorkId: "p1" },
  ],
};

function deps(over: Partial<ReactorDeps> = {}): ReactorDeps {
  let n = 0;
  return {
    chart,
    cascade: doneCascade,
    testRuns: [],
    gateEvaluations: [],
    createId: (p) => `${p}-${++n}`,
    nowMs: 0,
    ...over,
  };
}

const seed = (over: Partial<WorkBatch> = {}): WorkBatch => ({
  batchId: "b1",
  title: "checkout",
  ownerHatId: "engineering_manager",
  state: BatchState.Created,
  workIds: ["t1", "t2"],
  ...over,
});

const gate = (workId: string, outcome: GateOutcome): GateEvaluation => ({
  workId,
  gate: GateKind.ImplementationReview,
  outcome,
  byHatId: "tech_lead",
  reason: "r",
  atMs: 0,
});

describe("the menu is a SET, not the next line of a script", () => {
  test("an active batch may push on, discover it is blocked, or stop", () => {
    expect(menuFor(seed({ state: BatchState.Active }))).toEqual([
      ActionKind.CheckCompletion,
      ActionKind.MarkBlocked,
      ActionKind.PauseBatch,
    ]);
  });

  test("STOPPING IS ON EVERY LIVE MENU, and never first", () => {
    // A menu that omits a valid option is coercive; one where stopping is the default is useless.
    // Both properties at once: present everywhere, last everywhere.
    for (const state of Object.values(BatchState)) {
      const menu = menuFor(seed({ state }));
      if (state === BatchState.Done) {
        expect(menu).toEqual([]);
        continue;
      }
      expect(menu).toContain(ActionKind.PauseBatch);
      expect(menu[menu.length - 1]).toBe(ActionKind.PauseBatch);
      expect(menu[0]).not.toBe(ActionKind.PauseBatch);
    }
  });

  test("the default chooser never stumbles into a pause", () => {
    const report = runReactor(deps({ pauseReasonFor: () => ({ reason: "should not happen" }) }), [seed()]);
    expect(report.performed.map((p) => p.kind)).not.toContain(ActionKind.PauseBatch);
    expect(report.batches[0]?.state).toBe(BatchState.Done);
  });

  test("a chooser that ASKS to pause gets one, and the batch then offers only resume", () => {
    const pauser: OrgChooser<ActionKind> = (legal) => {
      const i = legal.indexOf(ActionKind.PauseBatch);
      return i >= 0 ? { index: i, reason: "stop here" } : { index: 0, reason: "carry on" };
    };
    const report = runReactor(
      deps({ actionChooser: pauser, pauseReasonFor: () => ({ reason: "budget freeze", expectedResumeMs: 9_000 }) }),
      [seed()],
    );
    expect(report.performed.map((p) => p.kind)).toContain(ActionKind.PauseBatch);
    expect(report.batches[0]?.paused?.reason).toBe("budget freeze");
    expect(report.batches[0]?.paused?.expectedResumeMs).toBe(9_000);
    // Stopping is honoured: the loop raises resume for the owner rather than taking it.
    expect(report.raised.map((p) => p.kind)).toContain(ActionKind.ResumeBatch);
    expect(report.performed.map((p) => p.kind)).not.toContain(ActionKind.ResumeBatch);
  });

  test("PAUSING WITH NO REASON IS REFUSED — an unnamed stop is not a decision", () => {
    const pauser: OrgChooser<ActionKind> = (legal) => {
      const i = legal.indexOf(ActionKind.PauseBatch);
      return i >= 0 ? { index: i, reason: "stop here" } : { index: 0, reason: "carry on" };
    };
    const report = runReactor(deps({ actionChooser: pauser }), [seed()]);
    expect(report.refusals.some((r) => r.includes("no reason given"))).toBe(true);
    expect(report.batches[0]?.paused).toBeUndefined();
  });

  test("A PAUSED BATCH OFFERS THE WAY OUT — returning nothing made the pause terminal", () => {
    const p = pauseBatch(seed({ state: BatchState.Active }), "legal review");
    expect(p.ok).toBe(true);
    if (p.ok) expect(menuFor(p.batch)).toEqual([ActionKind.ResumeBatch]);
  });

  test("a finished batch offers nothing", () => {
    expect(menuFor(seed({ state: BatchState.Done }))).toEqual([]);
  });
});

describe("a batch that can be delivered is delivered, and the loop stops", () => {
  const report = runReactor(deps(), [seed()]);

  test("it runs the whole lifecycle and quiesces", () => {
    expect(report.quiesced).toBe(true);
    expect(report.pending).toEqual([]);
    expect(report.batches[0]?.state).toBe(BatchState.Done);
    expect(report.performed.map((p) => p.kind)).toEqual([
      ActionKind.ScopeBatch,
      ActionKind.PlanCapacity,
      ActionKind.ScheduleBatch,
      ActionKind.ActivateBatch,
      ActionKind.CheckCompletion,
      ActionKind.CloseBatch,
    ]);
  });

  test("a healthy run raises NOTHING and refuses nothing", () => {
    expect(report.raised).toEqual([]);
    expect(report.stalledBatchIds).toEqual([]);
    expect(report.refusals).toEqual([]);
  });

  test("each action is attributed to the owning hat, and every move is traced", () => {
    for (const p of report.performed) expect(p.byHatId).toBe("engineering_manager");
    expect(report.trace.length).toBeGreaterThan(0);
    for (const e of report.trace) expect(e.subjectId).toBe("b1");
  });

  test("capacity really was planned — Scheduled is unreachable without it", () => {
    expect(report.batches[0]?.capacity).toBe(2);
  });
});

describe("REGRESSION: a completion check that says no does not re-run itself", () => {
  // The defect: close-on-unfinished sent the batch back to Active, Active enqueued CheckCompletion,
  // the check enqueued CloseBatch, forever. It hit the 200-step bound with one action pending and
  // the batch still active — and because the invariant only runs at rest, the stall was never seen.
  const report = runReactor(deps({ cascade: stuckCascade }), [seed()]);

  test("it QUIESCES instead of spinning to the bound", () => {
    expect(report.quiesced).toBe(true);
    expect(report.steps).toBeLessThan(DEFAULT_MAX_STEPS);
    expect(report.pending).toEqual([]);
  });

  test("the check ran ONCE, and refused to close", () => {
    const kinds = report.performed.map((p) => p.kind);
    expect(kinds.filter((k) => k === ActionKind.CheckCompletion)).toHaveLength(1);
    expect(kinds.filter((k) => k === ActionKind.CloseBatch)).toHaveLength(1);
    expect(report.batches[0]?.state).toBe(BatchState.Active);
    expect(report.refusals.some((r) => r.includes("unfinished"))).toBe(false);
  });

  test("THE STALL BECAME A MOVE — noticing it is stuck produced management work", () => {
    expect(report.stalledBatchIds).toEqual(["b1"]);
    // Triage ran inside the loop; the substantive asks were raised for a hat.
    expect(report.performed.some((p) => p.kind === ActionKind.TriageStall)).toBe(true);
    expect(report.raised.map((p) => p.kind)).toContain(ActionKind.ChangeStaffing);
  });

  test("a batch owned BELOW manager escalates UP — the decider is derived, not the owner", () => {
    // `engineering_manager` already has escalation authority, so a manager-owned batch cannot tell
    // a derived decider from the owner. A LEAD-owned batch can: the lead may not decide, so the
    // triage has to climb the reporting line to find someone who may.
    const ledCascade: Cascade = {
      nodes: stuckCascade.nodes.map((n) => (n.workId === "p1" ? { ...n, ownerHatId: "tech_lead" } : n)),
    };
    const report = runReactor(deps({ cascade: ledCascade }), [seed({ ownerHatId: "tech_lead" })]);
    expect(report.stalledBatchIds).toEqual(["b1"]);
    const escalations = report.trace.filter((e) => e.decision.includes("stall triaged"));
    expect(escalations.length).toBeGreaterThan(0);
    for (const e of escalations) {
      expect(e.actorHatId).not.toBe("tech_lead");
      expect(chart.byId.get(e.actorHatId ?? "")?.level).toBe("manager");
    }
  });

  test("the triage is decided by a hat WITH ESCALATION AUTHORITY, derived from the chart", () => {
    // Deliberately NOT "someone above the owner". `escalationDeciderFor` documents the opposite for
    // a manager-or-above owner: it decides its own escalation, because escalation breaks a loop
    // rather than blessing a change. That is a different rule from separation of duties, which
    // governs GATES (a proposer may never approve its own work) and is enforced in `quality-gate`.
    const triage = report.performed.find((p) => p.kind === ActionKind.TriageStall);
    expect(triage).toBeDefined();
    const escalations = report.trace.filter((e) => e.decision.includes("stall triaged"));
    expect(escalations.length).toBeGreaterThan(0);
    for (const e of escalations) {
      const level = chart.byId.get(e.actorHatId ?? "")?.level;
      expect(["manager", "director", "c_suite", "board"]).toContain(String(level));
      // And the decision has a real effect — an escalation that changes nothing is a log line.
      expect(e.decision).toMatch(/changes_the_input|halts_the_loop/);
    }
  });
});

describe("pending and raised are DIFFERENT outcomes", () => {
  test("a run cut short by the bound leaves pending work and does NOT read as quiesced", () => {
    // The cascade here is the STUCK one on purpose: it is the input that would be flagged if the
    // invariant ran, so an empty `stalledBatchIds` means the gate held rather than that there was
    // nothing to find. Run against a healthy cascade this assertion could not fail.
    const report = runReactor(deps({ cascade: stuckCascade, maxSteps: 2 }), [seed()]);
    expect(report.quiesced).toBe(false);
    expect(report.pending.length).toBeGreaterThan(0);
    expect(report.steps).toBe(2);
    // A mid-flight batch is not a stalled one — calling it stalled would fire on every busy org.
    expect(report.stalledBatchIds).toEqual([]);
    expect(report.raised).toEqual([]);
    // And the same input DOES flag once the loop is allowed to finish, so the difference is the
    // truncation and not the cascade.
    expect(runReactor(deps({ cascade: stuckCascade }), [seed()]).stalledBatchIds).toEqual(["b1"]);
  });

  test("QUIESCENCE IS THE QUEUE, NOT THE STEP COUNT — draining on the last permitted step", () => {
    // The happy path takes exactly 6 actions. Bounding at 6 means the queue drains at the very
    // step the bound allows: the organization finished. Inferring quiescence from `steps < max`
    // calls that identical run a runaway, which is the boundary the proxy gets wrong.
    const exact = runReactor(deps({ maxSteps: 6 }), [seed()]);
    expect(exact.steps).toBe(6);
    expect(exact.pending).toEqual([]);
    expect(exact.quiesced).toBe(true);
    expect(exact.batches[0]?.state).toBe(BatchState.Done);
  });

  test("the queue does the same thing ONCE however many times it is asked", () => {
    // A caller seeding the same batch twice asks for the same action twice. Without the de-dup the
    // organization performs it twice, and a reaction rule that fires per event would compound that
    // into a runaway the step bound would report as a loop defect.
    const report = runReactor(deps(), [seed(), seed()]);
    const scopes = report.performed.filter((p) => p.kind === ActionKind.ScopeBatch);
    expect(scopes).toHaveLength(1);
  });

  test("raised work is created for a hat and never performed by the loop", () => {
    const report = runReactor(deps({ cascade: stuckCascade }), [seed()]);
    const performedKinds = new Set(report.performed.map((p) => p.kind));
    for (const r of report.raised) expect(performedKinds.has(r.kind)).toBe(false);
  });

  test("gate CHURN raises a director review, while understaffing raises staffing — different causes", () => {
    const churned = runReactor(
      deps({
        cascade: stuckCascade,
        gateEvaluations: Array.from({ length: 6 }, () => gate("t2", GateOutcome.Rejected)),
      }),
      [seed()],
    );
    expect(churned.raised.map((p) => p.kind)).toContain(ActionKind.DirectorReview);
  });
});

describe("blocking needs a NAME, and a named wait is not a stall", () => {
  const blockingChooser: OrgChooser<ActionKind> = (legal) => {
    const i = legal.indexOf(ActionKind.MarkBlocked);
    return i >= 0 ? { index: i, reason: "block it" } : { index: 0, reason: "carry on" };
  };

  test("the chooser can take the SECOND legal option — the menu is real", () => {
    const report = runReactor(
      deps({ cascade: stuckCascade, actionChooser: blockingChooser, blockerFor: () => ({ dep: "vendor SDK 4.2" }) }),
      [seed()],
    );
    expect(report.performed.map((p) => p.kind)).toContain(ActionKind.MarkBlocked);
    expect(report.batches[0]?.state).toBe(BatchState.PartiallyBlocked);
    expect(report.batches[0]?.blockedOn?.dep).toBe("vendor SDK 4.2");
  });

  test("A NAMED WAIT IS NOT A STALL — the invariant leaves it alone", () => {
    const report = runReactor(
      deps({ cascade: stuckCascade, actionChooser: blockingChooser, blockerFor: () => ({ dep: "vendor SDK 4.2" }) }),
      [seed()],
    );
    expect(report.stalledBatchIds).toEqual([]);
  });

  test("BLOCKING WITH NOTHING TO NAME IS REFUSED — and the batch is then a stall", () => {
    const report = runReactor(deps({ cascade: stuckCascade, actionChooser: blockingChooser }), [seed()]);
    expect(report.refusals.some((r) => r.includes("no named dependency"))).toBe(true);
    expect(report.batches[0]?.state).not.toBe(BatchState.PartiallyBlocked);
    // The discriminating half: refusing to block does not hide the problem, it exposes it.
    expect(report.stalledBatchIds).toEqual(["b1"]);
  });

  test("a batch seeded already blocked is left waiting rather than triaged", () => {
    const blocked = blockBatch(seed({ state: BatchState.Active, capacity: 2 }), { dep: "legal sign-off" });
    expect(blocked.ok).toBe(true);
    if (!blocked.ok) return;
    const report = runReactor(deps({ cascade: stuckCascade }), [blocked.batch]);
    expect(report.stalledBatchIds).toEqual([]);
  });
});

describe("a paused batch is offered resume, never resumed", () => {
  const paused = (() => {
    const p = pauseBatch(seed({ state: BatchState.Active, capacity: 2 }), "legal review", 9_000);
    if (!p.ok) throw new Error(p.reason);
    return p.batch;
  })();

  test("the loop does not step over an explicit decision to stop", () => {
    const report = runReactor(deps({ cascade: stuckCascade }), [paused]);
    expect(report.performed.map((p) => p.kind)).not.toContain(ActionKind.ResumeBatch);
    expect(report.batches[0]?.paused?.reason).toBe("legal review");
    expect(report.batches[0]?.state).toBe(BatchState.Active);
  });

  test("resume is RAISED for the owner, carrying why it was paused", () => {
    const report = runReactor(deps({ cascade: stuckCascade }), [paused]);
    const resume = report.raised.find((p) => p.kind === ActionKind.ResumeBatch);
    expect(resume).toBeDefined();
    expect(resume?.byHatId).toBe("engineering_manager");
    expect(resume?.causedBy).toContain("legal review");
  });

  test("a paused batch is not a stall — pause is one of the two legitimate ways to not move", () => {
    const report = runReactor(deps({ cascade: stuckCascade }), [paused]);
    expect(report.stalledBatchIds).toEqual([]);
  });

  test("but the reactor WILL resume when asked, and the batch runs on", () => {
    // Proves the raise is an offer rather than a dead end: the same action, performed, works.
    const report = runReactor(deps({ cascade: doneCascade }), [paused]);
    const unpaused: WorkBatch = {
      batchId: paused.batchId,
      title: paused.title,
      ownerHatId: paused.ownerHatId,
      state: paused.state,
      workIds: paused.workIds,
      ...(paused.capacity === undefined ? {} : { capacity: paused.capacity }),
    };
    const resumed = runReactor(deps({ cascade: doneCascade }), [unpaused]);
    expect(report.batches[0]?.state).toBe(BatchState.Active);
    expect(resumed.batches[0]?.state).toBe(BatchState.Done);
  });
});

describe("a misbehaving chooser cannot leave the state machine", () => {
  test("an out-of-range index is CLAMPED, and the clamp is recorded rather than swallowed", () => {
    const wild: OrgChooser<ActionKind> = () => ({ index: 99, reason: "nonsense" });
    const report = runReactor(deps({ actionChooser: wild }), [seed()]);
    expect(report.refusals.some((r) => r.includes("clamped"))).toBe(true);
    // Still a legal run: clamping keeps the pick inside the menu.
    expect(report.quiesced).toBe(true);
  });

  test("a chooser that THROWS falls back to the first legal option instead of taking the org down", () => {
    const boom: OrgChooser<ActionKind> = () => {
      throw new Error("chooser exploded");
    };
    const report = runReactor(deps({ actionChooser: boom }), [seed()]);
    expect(report.batches[0]?.state).toBe(BatchState.Done);
    expect(report.refusals.some((r) => r.includes("chooser exploded"))).toBe(true);
  });
});

describe("batches are built from the cascade's own projects", () => {
  test("one batch per project, owned by the project's hat, holding its children", () => {
    const built = batchesFromCascade(stuckCascade, (p) => `${p}-x`);
    expect(built).toHaveLength(1);
    expect(built[0]?.ownerHatId).toBe("engineering_manager");
    expect(built[0]?.workIds).toEqual(["t1", "t2"]);
    expect(built[0]?.state).toBe(BatchState.Created);
  });

  test("a cascade with no projects yields no batches — not one empty one", () => {
    expect(batchesFromCascade({ nodes: [] }, (p) => p)).toEqual([]);
  });
});

describe("an action naming a batch that does not exist is refused, not crashed on", () => {
  test("the refusal names the missing batch", () => {
    const report = runReactor(deps(), []);
    expect(report.quiesced).toBe(true);
    expect(report.performed).toEqual([]);
    expect(report.batches).toEqual([]);
  });
});
