/**
 * corporate/org-event.ts — the organization's trace, as typed events rather than prose.
 *
 * ── THE GAP THIS CLOSES ──────────────────────────────────────────────────────
 * `runOrgRuntime` reported what happened as `readonly string[]`. Readable, and unqueryable: nothing
 * could ask "every gate verdict on this work", "everything this hat decided", or — the one that
 * matters — "everything decided inside the CTO's line". A log you can only read is a log you can
 * only check by reading all of it, which nobody does.
 *
 * This is the reference's `OrgEvent` ported to the corporate register's own vocabulary
 * (`agentic-organization/packages/domain/src/org-event.ts`), reduced to the kinds this register
 * actually emits. Extending the enum with kinds nothing produces would recreate, in the audit trail,
 * exactly the modelled-but-unused problem this package was written to fix.
 *
 * ── THE SUPERVISOR CHAIN IS DERIVED, NEVER SUPPLIED ──────────────────────────
 * Every event carries the hat path from the root down to the actor, and `emit` computes it from the
 * chart. A caller cannot pass a chain, so a chain cannot be wrong — which is the whole reason to
 * record it. A supplied chain is an assertion about authority made by the same code that is claiming
 * the authority.
 *
 * That one field is what makes `decidedUnder` possible: an organization can ask what a line of
 * authority did without knowing in advance which hats are in it.
 */

import { supervisorChainOf, type OrgChart } from "./org-chart";
import type { WorkState, WorkType } from "./goal-cascade";
import type { ScheduleBlockState, ScheduleBlockType } from "./work-schedule";
import type { PriorityClass } from "./prioritization";
import type { GateEvaluation } from "./quality-gate";
import type { PortfolioKind } from "./portfolio";

export const OrgEventKind = {
  IntakeReceived: "intake_received",
  PriorityDecision: "priority_decision",
  WorkItemTransition: "work_item_transition",
  HatAssignment: "hat_assignment",
  HatBindingTransition: "hat_binding_transition",
  SuccessionPlanned: "succession_planned",
  ScheduleBlockPlanned: "schedule_block_planned",
  MeetingScheduled: "meeting_scheduled",
  SupervisorSignalSent: "supervisor_signal_sent",
  DecisionRecorded: "decision_recorded",
  WorkClaimed: "work_claimed",
  WorkCompleted: "work_completed",
  ShardApproved: "shard_approved",
  ShardMerged: "shard_merged",
  TestRunRecorded: "test_run_recorded",
  QualityGateEvaluation: "quality_gate_evaluation",
  ChurnDetected: "churn_detected",
  EscalationDecision: "escalation_decision",
  ChangeProjected: "change_projected",
  Refusal: "refusal",
} as const;

export type OrgEventKind = (typeof OrgEventKind)[keyof typeof OrgEventKind];

/**
 * The STRUCTURED FACT a state-constituting event carries.
 *
 * ── WHY PROSE WAS NOT ENOUGH ─────────────────────────────────────────────────
 * `decision` is a sentence: *"owns defect 'implement the coupon fix'"*. It is the right thing for a
 * human reading a trace, and it is the wrong thing to rebuild state from — the work type is inside
 * the sentence, the parent is not in it at all, and recovering either means parsing English.
 *
 * So an event that CONSTITUTES state carries the fact as data alongside the sentence. The prose
 * stays the reading; this is the record. Without it the trace is an audit log that can say what
 * happened and cannot say what IS — which is exactly why the organization could be persisted and
 * not resumed.
 *
 * Absent on events that decide nothing about state — a refusal, a signal, a churn notice. Those are
 * real events and they change no fact, and giving them an empty payload would blur the difference.
 */
export type OrgFact =
  | {
      readonly kind: "work_created";
      readonly workId: string;
      readonly workType: WorkType;
      readonly title: string;
      readonly ownerHatId: string;
      readonly parentWorkId?: string;
    }
  | { readonly kind: "work_assigned"; readonly workId: string; readonly assigneeHatId: string }
  | { readonly kind: "work_state"; readonly workId: string; readonly state: WorkState }
  | {
      readonly kind: "block_planned";
      readonly blockId: string;
      readonly hatId: string;
      readonly blockType: ScheduleBlockType;
      readonly startMs: number;
      readonly endMs: number;
      readonly workItemId?: string;
      readonly meetingId?: string;
    }
  | { readonly kind: "block_state"; readonly blockId: string; readonly state: ScheduleBlockState }
  /**
   * A meeting is ONE thing that happened and N blocks on N calendars.
   *
   * Carried as one fact with all its legs rather than split into N events, because splitting would
   * make a meeting look like N unrelated bookings that happen to share a time — and the meeting is
   * the thing the organization decided, not the individual legs.
   */
  /** The priority the organization DECIDED, with what the scorer had recommended. */
  | {
      readonly kind: "priority_decided";
      readonly workId: string;
      readonly priorityClass: PriorityClass;
      readonly decidedByHatId: string;
      readonly reason: string;
      readonly recommended: PriorityClass;
      readonly reasonCodes: readonly string[];
    }
  /**
   * The verdicts from ONE run of the gate chain.
   *
   * A list rather than one fact per verdict, for the same reason a meeting is one fact with N legs:
   * a chain run is the thing that happened, and splitting it would make seven related verdicts look
   * like seven unrelated decisions that share a timestamp. The churn signal and the change-failure
   * rate are both folds over these.
   */
  | { readonly kind: "gates_evaluated"; readonly evaluations: readonly GateEvaluation[] }
  /** A long-lived container was opened. It outlives every goal inside it — see `portfolio.ts`. */
  | {
      readonly kind: "portfolio_opened";
      readonly portfolioId: string;
      readonly title: string;
      readonly portfolioKind: PortfolioKind;
      readonly ownerHatId: string;
    }
  /** A goal was said to be ABOUT a portfolio. An association, never a decomposition edge. */
  | { readonly kind: "goal_associated"; readonly goalId: string; readonly portfolioId: string }
  | {
      readonly kind: "meeting_planned";
      readonly meetingId: string;
      readonly blockIds: readonly string[];
      readonly attendeeHatIds: readonly string[];
      readonly startMs: number;
      readonly endMs: number;
      readonly workItemId?: string;
    };

export interface OrgEvent {
  readonly id: string;
  readonly kind: OrgEventKind;
  readonly atMs: number;
  /** The hat that acted — the authority the transition happened under. */
  readonly actorHatId?: string;
  readonly actorAgentId?: string;
  /** What transitioned: a work id, a binding id, a shard id. */
  readonly subjectId: string;
  readonly fromState?: string;
  readonly toState?: string;
  /** What happened, in a sentence. Human-readable, alongside the structure rather than instead of it. */
  readonly decision: string;
  /** Root → actor. Derived from the chart by `emit`; never supplied. */
  readonly supervisorChain: readonly string[];
  readonly evidenceRefs: readonly string[];
  /** The fact, when this event constitutes state. See `OrgFact`. */
  readonly fact?: OrgFact;
}

export interface EmitInput {
  readonly kind: OrgEventKind;
  readonly subjectId: string;
  readonly decision: string;
  readonly atMs: number;
  // `| undefined` explicitly, not just optional: under `exactOptionalPropertyTypes` those differ,
  // and a caller whose actor is legitimately optional would otherwise have to spread it in
  // conditionally at every site — ceremony that makes the common case harder to read than the rare
  // one.
  readonly actorHatId?: string | undefined;
  readonly actorAgentId?: string | undefined;
  readonly fromState?: string | undefined;
  readonly toState?: string | undefined;
  readonly evidenceRefs?: readonly string[] | undefined;
  readonly fact?: OrgFact | undefined;
}

/**
 * Build one event, with the supervisor chain computed from the chart.
 *
 * An actor that is not in the chart gets an EMPTY chain rather than a fabricated one. That makes the
 * event visibly unattributable instead of quietly attributing it to a line it never belonged to —
 * and `unattributed` below finds them, which a fabricated chain would hide forever.
 */
export function emit(chart: OrgChart, id: string, input: EmitInput): OrgEvent {
  return {
    id,
    kind: input.kind,
    atMs: input.atMs,
    ...(input.actorHatId === undefined ? {} : { actorHatId: input.actorHatId }),
    ...(input.actorAgentId === undefined ? {} : { actorAgentId: input.actorAgentId }),
    subjectId: input.subjectId,
    ...(input.fromState === undefined ? {} : { fromState: input.fromState }),
    ...(input.toState === undefined ? {} : { toState: input.toState }),
    decision: input.decision,
    supervisorChain:
      input.actorHatId === undefined ? [] : [...supervisorChainOf(chart, input.actorHatId)].reverse(),
    evidenceRefs: input.evidenceRefs ?? [],
    ...(input.fact === undefined ? {} : { fact: input.fact }),
  };
}

/** One line, for a human. The structure is the record; this is the rendering. */
export function render(event: OrgEvent): string {
  const who = event.actorAgentId ?? event.actorHatId;
  // Only render an arrow when there is a FROM to point away from. A transition with no prior state
  // is an arrival, and `[? → open]` reads like a lost value rather than a first appearance.
  const transition =
    event.fromState !== undefined && event.toState !== undefined
      ? ` [${event.fromState} → ${event.toState}]`
      : event.toState !== undefined
        ? ` [${event.toState}]`
        : "";
  return `${who === undefined ? "" : `${who}: `}${event.decision}${transition}`;
}

// ─── Queries — the reason the trace is typed ────────────────────────────────

/** Every event about one subject, in order. */
export function eventsFor(events: readonly OrgEvent[], subjectId: string): readonly OrgEvent[] {
  return events.filter((e) => e.subjectId === subjectId);
}

/** Every event a specific hat produced. */
export function decidedBy(events: readonly OrgEvent[], hatId: string): readonly OrgEvent[] {
  return events.filter((e) => e.actorHatId === hatId);
}

/**
 * Every event decided ANYWHERE INSIDE a hat's line of authority.
 *
 * The query the supervisor chain exists for. "What did the CTO's organization decide" needs no list
 * of who reports to the CTO — the chain on each event already carries it, so the answer stays right
 * when the org chart changes.
 */
export function decidedUnder(events: readonly OrgEvent[], hatId: string): readonly OrgEvent[] {
  return events.filter((e) => e.supervisorChain.includes(hatId));
}

export function ofKind(events: readonly OrgEvent[], kind: OrgEventKind): readonly OrgEvent[] {
  return events.filter((e) => e.kind === kind);
}

/**
 * Events by an actor the chart does not know, or with no actor at all.
 *
 * An organization that cannot say under whose authority something happened has a hole in its audit,
 * and this is what finds it. Refusals legitimately have no actor and are excluded — nobody decided
 * a refusal.
 */
export function unattributed(events: readonly OrgEvent[]): readonly OrgEvent[] {
  return events.filter(
    (e) => e.kind !== OrgEventKind.Refusal && e.actorHatId !== undefined && e.supervisorChain.length === 0,
  );
}

/** How many events each kind produced — the shape of a run at a glance. */
export function countByKind(events: readonly OrgEvent[]): Readonly<Record<string, number>> {
  const out: Record<string, number> = {};
  for (const e of events) out[e.kind] = (out[e.kind] ?? 0) + 1;
  return out;
}

/**
 * The levels that acted, senior first, derived from the chains rather than from a separate tally.
 *
 * `runOrgRuntime` also tracks engaged levels while it runs. Deriving them again HERE, from the
 * trace, is what makes the two checkable against each other — a tally kept alongside the work can
 * drift from the work, and only a second derivation notices.
 */
export function actorsIn(events: readonly OrgEvent[]): readonly string[] {
  return [...new Set(events.map((e) => e.actorHatId).filter((h): h is string => h !== undefined))].sort();
}
