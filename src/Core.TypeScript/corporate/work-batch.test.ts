/**
 * work-batch.test.ts — batches, and the two legitimate ways to not be moving.
 *
 * The load-bearing assertions here are the REFUSALS. A batch type that accepts every transition is
 * a record with a string field on it; what makes this a state machine is what it will not do —
 * schedule without capacity, block without naming the blocker, or move while paused.
 */

import { describe, expect, test } from "bun:test";
import {
  advanceBatch,
  batchesInScope,
  AuthorityScope,
  BatchState,
  blockBatch,
  isTerminalBatch,
  LEGAL_NEXT,
  membersOf,
  movement,
  MovementAction,
  observeForHat,
  pauseBatch,
  planCapacity,
  resumeBatch,
  rollUp,
  rollUpAll,
  stalledItems,
  type WorkBatch,
} from "./work-batch";
import { WorkState, type Cascade } from "./goal-cascade";
import { buildOrgChart } from "./org-chart";
import { SEED_HATS } from "./org-seed";
import { GateKind, GateOutcome, type GateEvaluation } from "./quality-gate";
import { type TestRun } from "./qa";

const chart = (() => {
  const r = buildOrgChart(SEED_HATS);
  if (!r.ok) throw new Error(r.reason);
  return r.chart;
})();

const cascade: Cascade = {
  nodes: [
    { workId: "p1", workType: "project", title: "checkout", state: WorkState.InProgress, ownerHatId: "engineering_manager" },
    { workId: "t1", workType: "task", title: "a", state: WorkState.Done, ownerHatId: "tech_lead", parentWorkId: "p1", assigneeHatId: "backend_implementer" },
    { workId: "t2", workType: "task", title: "b", state: WorkState.Open, ownerHatId: "tech_lead", parentWorkId: "p1", assigneeHatId: "backend_implementer" },
    { workId: "t3", workType: "task", title: "c", state: WorkState.Open, ownerHatId: "tech_lead", parentWorkId: "p1" },
  ],
};

const batch = (over: Partial<WorkBatch> = {}): WorkBatch => ({
  batchId: "b1",
  title: "checkout",
  ownerHatId: "engineering_manager",
  state: BatchState.Active,
  workIds: ["t1", "t2", "t3"],
  capacity: 2,
  ...over,
});

const deps = (over: { testRuns?: readonly TestRun[]; gateEvaluations?: readonly GateEvaluation[] } = {}) => ({
  cascade,
  testRuns: over.testRuns ?? [],
  gateEvaluations: over.gateEvaluations ?? [],
  nowMs: 0,
});

const gate = (workId: string, outcome: GateOutcome): GateEvaluation => ({
  workId,
  gate: GateKind.ImplementationReview,
  outcome,
  byHatId: "tech_lead",
  reason: "r",
  atMs: 0,
});

describe("the transition table", () => {
  test("only Done is terminal, and it is terminal because it has nowhere to go", () => {
    expect(isTerminalBatch(BatchState.Done)).toBe(true);
    expect(LEGAL_NEXT[BatchState.Done]).toEqual([]);
    for (const s of Object.values(BatchState)) {
      if (s !== BatchState.Done) expect(isTerminalBatch(s)).toBe(false);
    }
  });

  test("a batch cannot skip a rung, and the refusal names both states", () => {
    const r = advanceBatch(batch({ state: BatchState.Created }), BatchState.Active);
    expect(r.ok).toBe(false);
    if (r.ok) return;
    // Naming both ends is what makes the message actionable — "illegal transition" sends a reader
    // to the table instead of to the problem.
    expect(r.reason).toContain("created");
    expect(r.reason).toContain("active");
  });

  test("SCHEDULED WITHOUT CAPACITY IS REFUSED — the plan must be a plan", () => {
    const noCapacity: WorkBatch = { batchId: "b", title: "t", ownerHatId: "engineering_manager", state: BatchState.CapacityPlanned, workIds: [] };
    const r = advanceBatch(noCapacity, BatchState.Scheduled);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toContain("no planned capacity");
    // With capacity it goes through, so the refusal is about the capacity and not about the rung.
    expect(advanceBatch({ ...noCapacity, capacity: 3 }, BatchState.Scheduled).ok).toBe(true);
  });

  test("capacity must be at least one contributor", () => {
    for (const n of [0, -1, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(planCapacity(batch(), n).ok).toBe(false);
    }
    const r = planCapacity(batch(), 4);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.batch.capacity).toBe(4);
  });
});

describe("blocking requires a NAMED dependency — the standing-by failure, refused", () => {
  test("advanceBatch will not enter the blocked state bare", () => {
    const r = advanceBatch(batch(), BatchState.PartiallyBlocked);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toContain("named dependency");
  });

  test("blockBatch is the way in, and it carries the name", () => {
    const r = blockBatch(batch(), { dep: "vendor SDK 4.2", etaMs: 86_400_000 });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.batch.state).toBe(BatchState.PartiallyBlocked);
    expect(r.batch.blockedOn?.dep).toBe("vendor SDK 4.2");
    expect(r.batch.blockedOn?.etaMs).toBe(86_400_000);
  });

  test("an EMPTY name is refused — it would pass a presence check and name nothing", () => {
    expect(blockBatch(batch(), { dep: "" }).ok).toBe(false);
    expect(blockBatch(batch(), { dep: "   " }).ok).toBe(false);
  });

  test("a non-finite ETA is refused rather than stored", () => {
    expect(blockBatch(batch(), { dep: "x", etaMs: Number.NaN }).ok).toBe(false);
    expect(blockBatch(batch(), { dep: "x", etaMs: Number.POSITIVE_INFINITY }).ok).toBe(false);
    // An ABSENT eta is fine: unknown stays unknown rather than being invented.
    const r = blockBatch(batch(), { dep: "x" });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.batch.blockedOn?.etaMs).toBeUndefined();
  });

  test("leaving the blocked state CLEARS the dependency", () => {
    const blocked = blockBatch(batch(), { dep: "vendor SDK" });
    expect(blocked.ok).toBe(true);
    if (!blocked.ok) return;
    const back = advanceBatch(blocked.batch, BatchState.Active);
    expect(back.ok).toBe(true);
    // Still naming a blocker while working again would report a wait that has already ended.
    if (back.ok) expect(back.batch.blockedOn).toBeUndefined();
  });
});

describe("pause is explicit, and it has a way out", () => {
  test("a paused batch refuses to move — otherwise the pause is advisory", () => {
    const p = pauseBatch(batch(), "waiting on legal review");
    expect(p.ok).toBe(true);
    if (!p.ok) return;
    const moved = advanceBatch(p.batch, BatchState.CompletionCheck);
    expect(moved.ok).toBe(false);
    if (!moved.ok) expect(moved.reason).toContain("paused");
  });

  test("THE UNPAUSE CONTRACT — resume lifts it and the batch moves again", () => {
    const p = pauseBatch(batch(), "legal");
    expect(p.ok).toBe(true);
    if (!p.ok) return;
    const r = resumeBatch(p.batch);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.batch.paused).toBeUndefined();
    // The discriminating half: the same transition that was refused while paused now succeeds.
    expect(advanceBatch(r.batch, BatchState.CompletionCheck).ok).toBe(true);
  });

  test("resuming a batch that is not paused is refused, not a silent no-op", () => {
    const r = resumeBatch(batch());
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toContain("not paused");
  });

  test("an unnamed pause reason and a terminal batch are both refused", () => {
    expect(pauseBatch(batch(), "  ").ok).toBe(false);
    expect(pauseBatch(batch({ state: BatchState.Done }), "why").ok).toBe(false);
  });

  test("the expected resume is carried when given and absent when not", () => {
    const withEta = pauseBatch(batch(), "legal", 5_000);
    const without = pauseBatch(batch(), "legal");
    expect(withEta.ok && withEta.batch.paused?.expectedResumeMs).toBe(5_000);
    expect(without.ok && without.batch.paused?.expectedResumeMs).toBeUndefined();
  });
});

describe("the roll-up is a FOLD over facts, never a stored counter", () => {
  test("it counts the members' real states", () => {
    const m = rollUp(batch(), deps());
    expect(m.total).toBe(3);
    expect(m.done).toBe(1);
    expect(m.completionPct).toBeCloseTo(1 / 3, 5);
    // t3 has no assignee.
    expect(m.unstaffed).toBe(1);
  });

  test("a CANCELED member leaves the denominator — it is not unfinished work", () => {
    const withCancel: Cascade = {
      nodes: cascade.nodes.map((n) => (n.workId === "t3" ? { ...n, state: WorkState.Canceled } : n)),
    };
    const m = rollUp(batch(), { ...deps(), cascade: withCancel });
    expect(m.total).toBe(2);
    expect(m.done).toBe(1);
  });

  test("it only counts ITS OWN members — a metric over the wrong set is worse than none", () => {
    const m = rollUp(batch({ workIds: ["t1"] }), deps());
    expect(m.total).toBe(1);
    expect(membersOf(batch({ workIds: ["t1"] }), cascade).map((n) => n.workId)).toEqual(["t1"]);
  });

  test("gate rejections are the churn signal, and passes are not counted as churn", () => {
    const m = rollUp(batch(), {
      ...deps({ gateEvaluations: [gate("t2", GateOutcome.Rejected), gate("t2", GateOutcome.Rejected), gate("t1", GateOutcome.Approved)] }),
    });
    expect(m.gateBounceBacks).toBe(2);
  });

  test("an unknown open date reports age ZERO rather than a guess", () => {
    expect(rollUp(batch(), deps()).oldestOpenAgeMs).toBe(0);
    const aged = rollUp(batch(), { ...deps(), nowMs: 10_000, openedAtMs: new Map([["t2", 1_000]]) });
    expect(aged.oldestOpenAgeMs).toBe(9_000);
  });
});

describe("stalled items", () => {
  test("an unowned leaf with nothing in flight is stalled", () => {
    const stuck = stalledItems(batch(), cascade, []);
    expect(stuck.map((n) => n.workId)).toEqual(["t3"]);
  });

  test("a PAUSED batch has no stalled items — the pause is the decision", () => {
    const p = pauseBatch(batch(), "legal");
    expect(p.ok).toBe(true);
    if (p.ok) expect(stalledItems(p.batch, cascade, [])).toEqual([]);
  });

  test("an item with a gate verdict in flight is NOT stalled", () => {
    expect(stalledItems(batch(), cascade, [gate("t3", GateOutcome.Rejected)])).toEqual([]);
  });

  test("a PARENT is never stalled — its children carry the work", () => {
    const withParent = batch({ workIds: ["p1", "t3"] });
    expect(stalledItems(withParent, cascade, []).map((n) => n.workId)).toEqual(["t3"]);
  });
});

describe("movement is a trigger, not a vanity score", () => {
  test("a healthy batch triggers nothing", () => {
    const done: Cascade = { nodes: cascade.nodes.map((n) => (n.workType === "task" ? { ...n, state: WorkState.Done } : n)) };
    const mv = movement(rollUp(batch(), { ...deps(), cascade: done }));
    expect(mv.triggers).toEqual([]);
    // And it scores as moving. A healthy batch that triggered nothing but scored 0 would mean the
    // score and the triggers disagree, which is the only way this readout can lie.
    expect(mv.score).toBe(1);
  });

  test("unstaffed work asks for STAFFING, gate churn asks for a DIRECTOR — different causes, different asks", () => {
    const unstaffed = movement(rollUp(batch(), deps()));
    expect(unstaffed.triggers).toContain(MovementAction.StaffingChange);

    const churned = movement(
      rollUp(batch(), deps({ gateEvaluations: Array.from({ length: 6 }, () => gate("t2", GateOutcome.Rejected)) })),
    );
    expect(churned.triggers).toContain(MovementAction.DirectorReview);
    // The discriminating half: they are not the same trigger for every unhealthy batch.
    expect(churned.triggers).not.toEqual(unstaffed.triggers);
  });
});

describe("authority scope — what a hat can see is DERIVED from the chart", () => {
  const batches = [batch(), batch({ batchId: "b2", ownerHatId: "data_manager", workIds: [] })];
  const input = { batches, cascade, testRuns: [], gateEvaluations: [], nowMs: 0 };

  test("an IC sees its own items; the CTO sees the organization", () => {
    const ic = observeForHat(chart, "backend_implementer", input);
    const cto = observeForHat(chart, "cto", input);
    expect(ic?.scope).toBe(AuthorityScope.OwnItems);
    expect(cto?.scope).toBe(AuthorityScope.Organization);
    // Strictly more, not merely different — the scope has to actually widen up the line.
    expect((cto?.batches.length ?? 0)).toBeGreaterThan(ic?.batches.length ?? 0);
  });

  test("a director sees its DEPARTMENT and not another one's", () => {
    const eng = batchesInScope(chart, "engineering_director", batches, cascade).map((b) => b.batchId);
    expect(eng).toContain("b1");
    expect(eng).not.toContain("b2");
  });

  test("a hat the chart does not know observes nothing — no fabricated readout", () => {
    expect(observeForHat(chart, "ghost", input)).toBeUndefined();
  });
});

describe("rollUpAll recomputes from SUMS", () => {
  test("the aggregate completion is total-weighted, not an average of percentages", () => {
    const big = rollUp(batch(), deps());
    const small = rollUp(batch({ batchId: "b2", workIds: ["t1"] }), deps());
    const all = rollUpAll([big, small], "roll");
    expect(all.total).toBe(4);
    expect(all.done).toBe(2);
    expect(all.completionPct).toBeCloseTo(0.5, 5);
    // Averaging the two percentages would give (1/3 + 1)/2 ≈ 0.667 — a number that answers a
    // question nobody asked and that no member batch reports.
    expect(all.completionPct).not.toBeCloseTo((big.completionPct + small.completionPct) / 2, 3);
  });
});
