/**
 * corporate/work-batch.ts — work as GROUPS, with metrics that roll up the reporting line.
 *
 * ── THE GAP THIS CLOSES (G2, G6, G7) ─────────────────────────────────────────
 * Everything in this register so far treats work one item at a time. `prioritization` orders
 * individual items; `org-status` reports per task. So an organization could say how one task was
 * doing and could not say how a TEAM was doing — and the reference's own scoping rule,
 *
 *   > an IC sees its assigned items; a Lead sees its team's batch; a Director sees its department's
 *   > batches; the C-suite see org-wide rollups
 *
 * had nothing to scope. "The observe is different for each hat" needs an object whose grain differs
 * per hat, and a work item is the same grain for everyone.
 *
 * ── THE BATCH IS A STATE MACHINE, NOT A TAG ──────────────────────────────────
 * `Created → Scoped → CapacityPlanned → Scheduled → Active ⇄ PartiallyBlocked → CompletionCheck →
 * Done`, with a legal-next table. A batch you can set to any state is a label on a list; the states
 * are what make "capacity was planned before it was scheduled" a checkable fact rather than a
 * convention.
 *
 * `CompletionCheck` is the one that earns its place: a batch does not go from `Active` to `Done`.
 * Something has to look at whether the members are actually finished, and a transition that skips
 * that step is an organization marking its own homework.
 *
 * ── THE MOVEMENT SCORE IS NOT A NUMBER TO ADMIRE ─────────────────────────────
 * `ANTI_STALL_PRIORITY_RUNTIME.md` warns about exactly this: *"The movement score should not become
 * a vanity metric. It should trigger concrete actions."* So `movement()` returns the components AND
 * the actions the score triggers, and a caller that wants the bare number has to walk past them.
 */

import { childrenOf, WorkState, type Cascade, type CascadeNode } from "./goal-cascade";
import { LEVEL_RANK, reportsUpTo, type OrgChart } from "./org-chart";
import { isFailing, type TestRun } from "./qa";
import { isPassing, type GateEvaluation } from "./quality-gate";

export const BatchState = {
  Created: "created",
  Scoped: "scoped",
  CapacityPlanned: "capacity_planned",
  Scheduled: "scheduled",
  Active: "active",
  PartiallyBlocked: "partially_blocked",
  CompletionCheck: "completion_check",
  Done: "done",
} as const;

export type BatchState = (typeof BatchState)[keyof typeof BatchState];

/**
 * Where a batch may go next.
 *
 * `Active ⇄ PartiallyBlocked` is the only cycle: work gets stuck and unsticks, repeatedly, and that
 * is normal. Everything else moves forward, so a batch cannot quietly return to `Scoped` and lose
 * the capacity decision that was made after it.
 */
export const LEGAL_NEXT: Readonly<Record<BatchState, readonly BatchState[]>> = {
  [BatchState.Created]: [BatchState.Scoped],
  [BatchState.Scoped]: [BatchState.CapacityPlanned],
  [BatchState.CapacityPlanned]: [BatchState.Scheduled],
  [BatchState.Scheduled]: [BatchState.Active],
  [BatchState.Active]: [BatchState.PartiallyBlocked, BatchState.CompletionCheck],
  [BatchState.PartiallyBlocked]: [BatchState.Active, BatchState.CompletionCheck],
  // A completion check can send it back to work. That is the point of checking.
  [BatchState.CompletionCheck]: [BatchState.Done, BatchState.Active],
  [BatchState.Done]: [],
};

export function isTerminalBatch(state: BatchState): boolean {
  return LEGAL_NEXT[state].length === 0;
}

export interface WorkBatch {
  readonly batchId: string;
  readonly title: string;
  /** The hat accountable for the batch — a Lead or Manager owns a team's; a Director a department's. */
  readonly ownerHatId: string;
  readonly state: BatchState;
  /** The work items in it. */
  readonly workIds: readonly string[];
  /** Contributors the batch was planned for. Set at `CapacityPlanned`. */
  readonly capacity?: number;
  /**
   * What this batch is WAITING ON, named. Required to enter `PartiallyBlocked`.
   *
   * This is the canonical `NamedBoundedWait of context * dep * eta`
   * (`workflow-engine/agent-loop/state-machine.ts`) at batch scope, and it exists because of
   * `.claude/rules/local-time-never-enters-the-shared-fold.md`'s sibling rule: **holding without a
   * named dependency IS the standing-by failure**. A batch that is "blocked" on nothing nameable is
   * not blocked, it is stalled — and the two must not look alike, because one is legitimate and the
   * other is the thing the movement invariant exists to catch.
   */
  readonly blockedOn?: NamedDependency;
  /** An explicit decision to stop, which is the alternative to having a next action. */
  readonly paused?: BatchPause;
}

/**
 * A dependency named out loud, with an optional expected resolution.
 *
 * `etaMs` is optional and NOT defaulted: an invented ETA is worse than an absent one, because a
 * reader cannot tell a guess from a commitment. Milliseconds rather than an ISO string per
 * `.claude/rules/local-time-never-enters-the-shared-fold.md` — the shared fold never parses a local
 * clock's rendering.
 */
export interface NamedDependency {
  readonly dep: string;
  readonly etaMs?: number;
}

/**
 * An explicit cessation, which is NOT a stall.
 *
 * Carries `expectedResumeMs` for the same reason the canonical `Paused` carries `expectedResumeIso`
 * — and is paired with `resumeBatch` because, per the canonical's own recorded finding, **a pause
 * state requires a real unpause transition**. A pause with no way out is a terminal state wearing a
 * temporary name.
 */
export interface BatchPause {
  readonly reason: string;
  readonly expectedResumeMs?: number;
}

export type BatchResult =
  | { readonly ok: true; readonly batch: WorkBatch }
  | { readonly ok: false; readonly reason: string };

/**
 * Move a batch to the next state, or REFUSE.
 *
 * The refusal names both states, because "illegal transition" without them sends a reader to the
 * table rather than to the problem.
 */
export function advanceBatch(batch: WorkBatch, to: BatchState): BatchResult {
  if (!LEGAL_NEXT[batch.state].includes(to)) {
    return {
      ok: false,
      reason: `'${batch.batchId}' cannot go ${batch.state} → ${to} (legal: ${LEGAL_NEXT[batch.state].join(", ") || "nowhere"})`,
    };
  }
  if (to === BatchState.Scheduled && batch.capacity === undefined) {
    // The state before this one is called CapacityPlanned. Reaching Scheduled with no capacity
    // means the plan was a state change and not a plan.
    return { ok: false, reason: `'${batch.batchId}' has no planned capacity and cannot be scheduled` };
  }
  if (to === BatchState.PartiallyBlocked && batch.blockedOn === undefined) {
    // THE STANDING-BY FAILURE, REFUSED AT THE TRANSITION. Blocking without naming the blocker is
    // how a stall disguises itself as legitimate waiting — so the name is a precondition of the
    // state, not a field someone may forget. `blockBatch` is the way in.
    return { ok: false, reason: `'${batch.batchId}' cannot block without a named dependency` };
  }
  if (batch.paused !== undefined) {
    // A paused batch moves only by being resumed. Otherwise the pause is advisory, and an explicit
    // decision to stop that anything may step over was never a decision.
    return { ok: false, reason: `'${batch.batchId}' is paused (${batch.paused.reason}) and must be resumed first` };
  }
  // Leaving the blocked state clears what it was waiting on. A batch that is working again while
  // still naming a blocker would report a wait that has already ended.
  const cleared = to === BatchState.PartiallyBlocked ? batch.blockedOn : undefined;
  const next: WorkBatch = { ...batch, state: to };
  if (cleared === undefined) delete (next as { blockedOn?: NamedDependency }).blockedOn;
  return { ok: true, batch: next };
}

/**
 * Enter a named bounded wait — the ONLY way into `PartiallyBlocked`.
 *
 * Refuses an empty name for the same reason `advanceBatch` refuses a missing one: `blockedOn: ""`
 * would satisfy a presence check and name nothing, which is the vacuity class in one field.
 */
export function blockBatch(batch: WorkBatch, dep: NamedDependency): BatchResult {
  if (dep.dep.trim() === "") {
    return { ok: false, reason: `'${batch.batchId}' cannot block on an unnamed dependency` };
  }
  if (dep.etaMs !== undefined && !Number.isFinite(dep.etaMs)) {
    return { ok: false, reason: `'${batch.batchId}' has a non-finite ETA on '${dep.dep}'` };
  }
  return advanceBatch({ ...batch, blockedOn: dep }, BatchState.PartiallyBlocked);
}

/** Stop deliberately. The pause is honoured by every transition until `resumeBatch` lifts it. */
export function pauseBatch(batch: WorkBatch, reason: string, expectedResumeMs?: number): BatchResult {
  if (reason.trim() === "") {
    return { ok: false, reason: `'${batch.batchId}' cannot pause for an unnamed reason` };
  }
  if (isTerminalBatch(batch.state)) {
    return { ok: false, reason: `'${batch.batchId}' is ${batch.state} and has nothing to pause` };
  }
  const pause: BatchPause = expectedResumeMs === undefined ? { reason } : { reason, expectedResumeMs };
  return { ok: true, batch: { ...batch, paused: pause } };
}

/**
 * The unpause contract.
 *
 * Exists because a `Paused` state with no transition out of it is the defect the canonical engine
 * recorded and fixed; re-introducing it here would have made every paused batch permanently
 * invisible to the movement invariant, which skips paused batches by design.
 */
export function resumeBatch(batch: WorkBatch): BatchResult {
  if (batch.paused === undefined) {
    return { ok: false, reason: `'${batch.batchId}' is not paused` };
  }
  const next: WorkBatch = { ...batch };
  delete (next as { paused?: BatchPause }).paused;
  return { ok: true, batch: next };
}

/** Record the capacity a batch was planned for. */
export function planCapacity(batch: WorkBatch, capacity: number): BatchResult {
  if (!Number.isFinite(capacity) || capacity < 1) {
    return { ok: false, reason: `'${batch.batchId}' needs at least one contributor, not ${capacity}` };
  }
  return { ok: true, batch: { ...batch, capacity } };
}

/** The cascade nodes this batch contains. */
export function membersOf(batch: WorkBatch, cascade: Cascade): readonly CascadeNode[] {
  return cascade.nodes.filter((n) => batch.workIds.includes(n.workId));
}

// ─── Metrics ────────────────────────────────────────────────────────────────

export interface BatchMetrics {
  readonly batchId: string;
  readonly total: number;
  readonly done: number;
  readonly completionPct: number;
  /** Assigned to nobody — the RMO's queue. */
  readonly unstaffed: number;
  readonly inQa: number;
  readonly testRuns: number;
  readonly testFailures: number;
  readonly passRate: number;
  /** Gate rejections across the batch — the churn signal. */
  readonly gateBounceBacks: number;
  /** Items with no next action and no explicit pause. */
  readonly stalled: number;
  readonly oldestOpenAgeMs: number;
}

/**
 * Fold a batch's items, test runs and gate verdicts into one readout.
 *
 * A pure fold over facts already recorded — never a stored counter. A metric someone increments can
 * disagree with the thing it counts, and the disagreement is invisible because the counter is what
 * gets read.
 */
export function rollUp(
  batch: WorkBatch,
  input: {
    readonly cascade: Cascade;
    readonly testRuns: readonly TestRun[];
    readonly gateEvaluations: readonly GateEvaluation[];
    readonly nowMs: number;
    /** When each item was created. Absent = age unknown, reported as zero rather than guessed. */
    readonly openedAtMs?: ReadonlyMap<string, number>;
  },
): BatchMetrics {
  const members = membersOf(batch, input.cascade);
  const live = members.filter((n) => n.state !== WorkState.Canceled);
  const done = live.filter((n) => n.state === WorkState.Done);
  const ours = new Set(batch.workIds);

  const runs = input.testRuns.filter((r) => ours.has(r.testCaseId) || members.some((m) => r.testCaseId.includes(m.workId)));
  const failures = runs.filter((r) => isFailing(r.outcome)).length;
  const verdicts = input.gateEvaluations.filter((e) => ours.has(e.workId));

  let oldest = 0;
  for (const n of live) {
    if (n.state === WorkState.Done) continue;
    const opened = input.openedAtMs?.get(n.workId);
    if (opened === undefined) continue;
    oldest = Math.max(oldest, input.nowMs - opened);
  }

  return {
    batchId: batch.batchId,
    total: live.length,
    done: done.length,
    completionPct: live.length === 0 ? 0 : done.length / live.length,
    // DONE WORK IS NOT UNSTAFFED. Counting a finished item as needing an owner made `movement`
    // raise a staffing change for a fully-delivered batch — a trigger firing on a healthy
    // organization, which is the failure the trigger exists to avoid. `stalledItems` already
    // excluded Done; this is the same notion, so it cannot have a second rule.
    unstaffed: live.filter(
      (n) =>
        n.state !== WorkState.Done &&
        n.assigneeHatId === undefined &&
        childrenOf(input.cascade, n.workId).length === 0,
    ).length,
    inQa: live.filter((n) => verdicts.some((v) => v.workId === n.workId) && n.state !== WorkState.Done).length,
    testRuns: runs.length,
    testFailures: failures,
    passRate: runs.length === 0 ? 0 : (runs.length - failures) / runs.length,
    gateBounceBacks: verdicts.filter((v) => !isPassing(v.outcome)).length,
    stalled: stalledItems(batch, input.cascade, verdicts).length,
    oldestOpenAgeMs: oldest,
  };
}

/**
 * Items with no next action and no explicit pause.
 *
 * The reference's first movement invariant: *"Every active initiative must have at least one next
 * executable item or an explicit paused decision."* An item that is open, unassigned, and has no
 * gate verdict is going nowhere and nobody has said so.
 *
 * A PAUSED batch has no stalled items by definition — the pause IS the decision, and counting it as
 * a stall would produce an alert for a choice somebody already made.
 */
export function stalledItems(
  batch: WorkBatch,
  cascade: Cascade,
  verdicts: readonly GateEvaluation[],
): readonly CascadeNode[] {
  if (batch.paused !== undefined) return [];
  return membersOf(batch, cascade).filter((n) => {
    if (n.state === WorkState.Done || n.state === WorkState.Canceled) return false;
    if (childrenOf(cascade, n.workId).length > 0) return false;
    const hasOwner = n.assigneeHatId !== undefined;
    const inFlight = verdicts.some((v) => v.workId === n.workId);
    return !hasOwner && !inFlight;
  });
}

// ─── Movement ───────────────────────────────────────────────────────────────

export const MovementAction = {
  DirectorReview: "director_review",
  TpmReprioritization: "tpm_reprioritization",
  StaffingChange: "staffing_change",
} as const;

export type MovementAction = (typeof MovementAction)[keyof typeof MovementAction];

export interface Movement {
  readonly batchId: string;
  /** 0..1. Named components below, so the number is never the whole answer. */
  readonly score: number;
  readonly withNextAction: number;
  readonly stalled: number;
  readonly blockedShare: number;
  /**
   * What the score TRIGGERS.
   *
   * The doc's own warning is that a movement score becomes a vanity metric, so the actions travel
   * with it: a caller reading the score has already been handed what to do about it.
   */
  readonly triggers: readonly MovementAction[];
}

/**
 * Is this batch moving, and what should happen if not?
 *
 * A batch with no live members scores 1 and triggers nothing — there is nothing to be stuck. Scoring
 * an empty batch as stalled would make every finished batch generate management actions forever.
 */
export function movement(metrics: BatchMetrics): Movement {
  const total = metrics.total;
  if (total === 0) {
    return { batchId: metrics.batchId, score: 1, withNextAction: 0, stalled: 0, blockedShare: 0, triggers: [] };
  }
  const withNextAction = total - metrics.stalled;
  const blockedShare = metrics.gateBounceBacks === 0 ? 0 : Math.min(1, metrics.gateBounceBacks / total);
  const score = Math.max(0, Math.min(1, withNextAction / total - 0.5 * blockedShare));

  const triggers: MovementAction[] = [];
  // Unstaffed work is a staffing problem, and only a manager can fix it by adding people.
  if (metrics.unstaffed > 0) triggers.push(MovementAction.StaffingChange);
  // Items going nowhere with nobody on them need re-sequencing before more people help.
  if (metrics.stalled > 0) triggers.push(MovementAction.TpmReprioritization);
  // Sustained rejection is a direction problem, not a throughput one.
  if (blockedShare >= 0.5) triggers.push(MovementAction.DirectorReview);

  return { batchId: metrics.batchId, score, withNextAction, stalled: metrics.stalled, blockedShare, triggers };
}

// ─── Authority scope — the readout differs per hat ──────────────────────────

export const AuthorityScope = {
  OwnItems: "own_items",
  OwnBatch: "own_batch",
  Department: "department",
  Organization: "organization",
} as const;

export type AuthorityScope = (typeof AuthorityScope)[keyof typeof AuthorityScope];

/** What grain of object this hat's readout is about. */
export function scopeOf(chart: OrgChart, hatId: string): AuthorityScope | undefined {
  const hat = chart.byId.get(hatId);
  if (hat === undefined) return undefined;
  if (LEVEL_RANK[hat.level] <= LEVEL_RANK["c_suite"]) return AuthorityScope.Organization;
  if (hat.level === "director") return AuthorityScope.Department;
  if (hat.level === "manager" || hat.level === "lead") return AuthorityScope.OwnBatch;
  return AuthorityScope.OwnItems;
}

/**
 * The batches this hat may see, at its own grain.
 *
 * The scoping rule, derived from the chart rather than configured:
 *
 *   - **C-suite and board** — everything. They order across the organization.
 *   - **Director** — batches owned anywhere in its line. Its department, without listing it.
 *   - **Manager and Lead** — the batches it owns.
 *   - **IC** — batches containing work assigned to it, and nothing else.
 *
 * An IC seeing every batch is not a privacy problem; it is a GRAIN problem. It would be ordering
 * objects it cannot act on, and the reference is explicit that what changes per level is the scope
 * of the objects being ordered.
 */
export function batchesInScope(
  chart: OrgChart,
  hatId: string,
  batches: readonly WorkBatch[],
  cascade: Cascade,
): readonly WorkBatch[] {
  const scope = scopeOf(chart, hatId);
  if (scope === undefined) return [];
  switch (scope) {
    case AuthorityScope.Organization:
      return batches;
    case AuthorityScope.Department:
      return batches.filter((b) => reportsUpTo(chart, b.ownerHatId, hatId));
    case AuthorityScope.OwnBatch:
      return batches.filter((b) => b.ownerHatId === hatId);
    case AuthorityScope.OwnItems:
      return batches.filter((b) =>
        membersOf(b, cascade).some((n) => n.assigneeHatId === hatId),
      );
  }
  return assertNeverScope(scope);
}

function assertNeverScope(x: never): never {
  throw new Error(`unhandled authority scope: ${String(x)}`);
}

/**
 * Roll several batches into one line.
 *
 * Used for a department's or the organization's readout, so a Director sees a department rollup and
 * an executive an org rollup — the same fold at a different scope, rather than a second metric that
 * could disagree with the first.
 *
 * `passRate` and `completionPct` are recomputed from the SUMS, never averaged. Averaging percentages
 * over batches of different sizes weights a two-item batch the same as a two-hundred-item one, which
 * is how a department with one tidy team reports itself healthy.
 */
export function rollUpAll(metrics: readonly BatchMetrics[], batchId = "rollup"): BatchMetrics {
  const sum = (f: (m: BatchMetrics) => number): number => metrics.reduce((n, m) => n + f(m), 0);
  const total = sum((m) => m.total);
  const runs = sum((m) => m.testRuns);
  const failures = sum((m) => m.testFailures);
  const done = sum((m) => m.done);
  return {
    batchId,
    total,
    done,
    completionPct: total === 0 ? 0 : done / total,
    unstaffed: sum((m) => m.unstaffed),
    inQa: sum((m) => m.inQa),
    testRuns: runs,
    testFailures: failures,
    passRate: runs === 0 ? 0 : (runs - failures) / runs,
    gateBounceBacks: sum((m) => m.gateBounceBacks),
    stalled: sum((m) => m.stalled),
    oldestOpenAgeMs: metrics.reduce((n, m) => Math.max(n, m.oldestOpenAgeMs), 0),
  };
}

/** One hat's organizational readout: its scope, its batches, and the rollup at that grain. */
export interface HatReadout {
  readonly hatId: string;
  readonly scope: AuthorityScope;
  readonly batches: readonly WorkBatch[];
  readonly metrics: readonly BatchMetrics[];
  readonly rollup: BatchMetrics;
  readonly movement: readonly Movement[];
}

export function observeForHat(
  chart: OrgChart,
  hatId: string,
  input: {
    readonly batches: readonly WorkBatch[];
    readonly cascade: Cascade;
    readonly testRuns: readonly TestRun[];
    readonly gateEvaluations: readonly GateEvaluation[];
    readonly nowMs: number;
    readonly openedAtMs?: ReadonlyMap<string, number>;
  },
): HatReadout | undefined {
  const scope = scopeOf(chart, hatId);
  if (scope === undefined) return undefined;
  const mine = batchesInScope(chart, hatId, input.batches, input.cascade);
  const metrics = mine.map((b) => rollUp(b, input));
  return {
    hatId,
    scope,
    batches: mine,
    metrics,
    rollup: rollUpAll(metrics, `${hatId}:${scope}`),
    movement: metrics.map(movement),
  };
}
