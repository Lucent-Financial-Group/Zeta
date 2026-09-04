/**
 * corporate/org-reactor.ts — the organization MOVING, instead of running once top to bottom.
 *
 * ── THE GAP THIS CLOSES (G15) ────────────────────────────────────────────────
 * `runOrgRuntime` is a straight line: intake, then priority, then cascade, then staffing, in that
 * order, once. That is the reference's own criticism of its starting state —
 *
 *   > the cycle runs once, top-to-bottom
 *
 * and the invariant it asks for instead is *"Every stale state should emit a signal and create a
 * management action."* A pipeline cannot do that. A pipeline's next step is whatever comes next in
 * the source, so a stall in step four produces nothing at all — the code simply moves to step five.
 *
 * ── EVENT-DRIVEN WITHOUT A BROKER ────────────────────────────────────────────
 * The reference reaches for NATS. A transport is not what makes this event-driven; **deriving the
 * next action from what just happened** is. So this is a work queue:
 *
 *     while (pending and steps remain)
 *       action = take the next
 *       events = perform it
 *       pending += reactionsTo(events)      ← the signals create the next action
 *
 * Nothing polls, nothing sleeps, and it is a pure function of its inputs — so the loop can be
 * replayed, and a broker becomes an adapter that fills `pending` rather than a thing the logic
 * depends on. `.claude/rules/local-time-never-enters-the-shared-fold.md` applies for the same
 * reason it applies everywhere else here: two hats must agree about what happened.
 *
 * ── QUIESCENCE IS A RESULT, AND SO IS THE BOUND ──────────────────────────────
 * The loop ends when nothing is pending — the organization has nothing to do — or when it hits a
 * step bound. Those are DIFFERENT outcomes and the report says which: quiescence means finished,
 * the bound means a reaction rule is producing work faster than the loop consumes it, and reporting
 * both the same way would hide a runaway behind a full-looking run.
 *
 * ── THE ANTI-STALL INVARIANT IS THE POINT ────────────────────────────────────
 * At quiescence the reactor CHECKS the movement invariant: every active batch has a next action or
 * an explicit pause. A batch failing it emits a stall signal, and the stall signal enqueues a
 * management action — so the organization noticing it is stuck is itself a move, which is the whole
 * difference between a living loop and a pipeline that finished.
 */

import { decideEscalation, escalationDeciderFor, EscalationTrigger, type EscalationAction } from "./escalation";
import { chooseWithinLegal, firstLegalChooser, type OrgChooser } from "./org-decision";
import { emit, OrgEventKind, type OrgEvent } from "./org-event";
import type { OrgChart } from "./org-chart";
import type { Cascade } from "./goal-cascade";
import type { GateEvaluation } from "./quality-gate";
import type { TestRun } from "./qa";
import {
  advanceBatch,
  BatchState,
  blockBatch,
  pauseBatch,
  resumeBatch,
  isTerminalBatch,
  movement,
  MovementAction,
  planCapacity,
  rollUp,
  stalledItems,
  type BatchMetrics,
  type NamedDependency,
  type WorkBatch,
} from "./work-batch";

/** What the organization can be asked to do next. */
export const ActionKind = {
  ScopeBatch: "scope_batch",
  PlanCapacity: "plan_capacity",
  ScheduleBatch: "schedule_batch",
  ActivateBatch: "activate_batch",
  CheckCompletion: "check_completion",
  CloseBatch: "close_batch",
  MarkBlocked: "mark_blocked",
  Unblock: "unblock",
  /**
   * Stop deliberately. Offered on EVERY live menu, and taken only by a chooser that asks for it.
   *
   * The canonical engine carries `PressPause` as a first-class menu option for the same reason:
   * *"A menu omitting valid options is COERCIVE."* Stopping has to be reachable from wherever the
   * work is, or the only way out of a batch is through it.
   */
  PauseBatch: "pause_batch",
  /** The unpause contract. Offered on the menu of a paused batch; never taken by the loop itself. */
  ResumeBatch: "resume_batch",
  /** Raised BY a stall, never scheduled in advance. */
  TriageStall: "triage_stall",
  Reprioritize: "reprioritize",
  ChangeStaffing: "change_staffing",
  DirectorReview: "director_review",
} as const;

export type ActionKind = (typeof ActionKind)[keyof typeof ActionKind];

export interface PendingAction {
  readonly kind: ActionKind;
  readonly batchId: string;
  /** The hat expected to do it. */
  readonly byHatId: string;
  /** What caused this action to exist — empty only for the ones a caller seeded. */
  readonly causedBy?: string;
}

export interface ReactorDeps {
  readonly chart: OrgChart;
  readonly cascade: Cascade;
  readonly testRuns: readonly TestRun[];
  readonly gateEvaluations: readonly GateEvaluation[];
  readonly createId: (prefix: string) => string;
  readonly nowMs: number;
  /** How many actions the loop may perform before it stops and says so. */
  readonly maxSteps?: number;
  /** Contributors a batch is planned for when capacity is planned. */
  readonly capacityFor?: (batch: WorkBatch) => number;
  readonly escalationChooser?: OrgChooser<EscalationAction>;
  /**
   * Picks WITHIN the menu each state makes legal. Defaults to the first legal option.
   *
   * This is the determinism⇄autonomy kernel the rest of this register uses (`org-decision.ts`):
   * code computes the legal set, something else picks inside it, and the index is clamped. The
   * loop is therefore not a script — a chooser can take `MarkBlocked` over `CheckCompletion` — and
   * it still cannot leave the state machine, however badly the chooser behaves.
   */
  readonly actionChooser?: OrgChooser<ActionKind>;
  /**
   * What a batch is waiting on, when it is waiting.
   *
   * Returning `undefined` means "nothing nameable", and the reactor then REFUSES to block —
   * because a batch blocked on nothing is the standing-by failure, not a wait.
   */
  readonly blockerFor?: (batch: WorkBatch) => NamedDependency | undefined;
  /**
   * Has the named dependency resolved? Defaults to NO.
   *
   * Unblocking used to be unconditional, which made the wait decorative: the loop marked a batch
   * blocked and lifted the block on the very next step, oscillating `Active ⇄ PartiallyBlocked`
   * with the blocker still outstanding. A wait you may leave whenever you like is not a wait, and
   * "unblocked" then said nothing about the world.
   *
   * NO is the honest default. A named bounded wait ends when the thing it names resolves, and
   * nothing here can know that — so absent an answer the batch keeps waiting and stays visible as
   * waiting, rather than being quietly declared free.
   */
  readonly depResolved?: (dep: NamedDependency, batch: WorkBatch) => boolean;
  /** Why a batch would be paused, if a chooser asks to pause it. No reason means no pause. */
  readonly pauseReasonFor?: (batch: WorkBatch) => { reason: string; expectedResumeMs?: number } | undefined;
}

export interface ReactorReport {
  readonly batches: readonly WorkBatch[];
  readonly trace: readonly OrgEvent[];
  readonly performed: readonly PendingAction[];
  /** Left undone when the bound stopped the loop. Empty at quiescence, by construction. */
  readonly pending: readonly PendingAction[];
  /**
   * Management actions the run CREATED and deliberately did not perform.
   *
   * Kept separate from `pending` because they mean opposite things: `pending` is work the loop
   * did not get to, and a non-empty one means the run was cut short. `raised` is work the loop
   * produced FOR A HAT — the organization noticing it is stuck — and a non-empty one is the
   * invariant doing its job. Reporting both in one list made a healthy run look truncated.
   */
  readonly raised: readonly PendingAction[];
  readonly steps: number;
  /** True when the loop ran out of work; false when it ran out of steps. */
  readonly quiesced: boolean;
  readonly metrics: readonly BatchMetrics[];
  /** Batches that failed the movement invariant at quiescence. */
  readonly stalledBatchIds: readonly string[];
  readonly refusals: readonly string[];
}

export const DEFAULT_MAX_STEPS = 200;

/**
 * The actions a batch's current state calls for.
 *
 * This is the reaction rule for ordinary progress: a batch in `Created` needs scoping, a `Scoped`
 * one needs capacity, and so on. Derived from the state rather than from a script, so a batch that
 * arrives mid-lifecycle is picked up where it actually is.
 *
 * A PAUSED batch produces nothing. The pause is the explicit decision the movement invariant asks
 * for, and generating work for it would make "we stopped this deliberately" indistinguishable from
 * "this is stuck".
 */
export function menuFor(batch: WorkBatch): readonly ActionKind[] {
  // A PAUSED batch offers exactly one thing: the way out. Returning nothing here was a defect —
  // it made the pause terminal, since the movement invariant also skips paused batches, so a
  // paused batch was unreachable by every path at once. The canonical engine surfaces
  // `ResumeFromPause` precisely when the state is `Paused`, and so does this.
  if (batch.paused !== undefined) return [ActionKind.ResumeBatch];
  // Pause is offered LAST on every live menu: always reachable, never the default. A chooser that
  // wants it asks for it; the deterministic first-legal chooser never stumbles into it.
  const withPause = (...kinds: ActionKind[]): readonly ActionKind[] => [...kinds, ActionKind.PauseBatch];
  switch (batch.state) {
    case BatchState.Created:
      return withPause(ActionKind.ScopeBatch);
    case BatchState.Scoped:
      return withPause(ActionKind.PlanCapacity);
    case BatchState.CapacityPlanned:
      return withPause(ActionKind.ScheduleBatch);
    case BatchState.Scheduled:
      return withPause(ActionKind.ActivateBatch);
    // Progress first, then the wait. Order is the default priority, and the chooser may take the
    // second — an active batch really can either push on or discover it is blocked.
    case BatchState.Active:
      return withPause(ActionKind.CheckCompletion, ActionKind.MarkBlocked);
    case BatchState.PartiallyBlocked:
      return withPause(ActionKind.Unblock, ActionKind.CheckCompletion);
    case BatchState.CompletionCheck:
      return withPause(ActionKind.CloseBatch);
    case BatchState.Done:
      return [];
  }
  return assertNeverState(batch.state);
}

function assertNeverState(x: never): never {
  throw new Error(`unhandled batch state: ${String(x)}`);
}

/** The management action a movement trigger becomes. */
function actionForTrigger(trigger: MovementAction): ActionKind | undefined {
  switch (trigger) {
    case MovementAction.StaffingChange:
      return ActionKind.ChangeStaffing;
    case MovementAction.TpmReprioritization:
      return ActionKind.Reprioritize;
    case MovementAction.DirectorReview:
      return ActionKind.DirectorReview;
  }
  return undefined;
}

/**
 * Run the organization until it has nothing left to do.
 *
 * Deliberately NOT a sequence of phases. Each step asks what the state calls for, performs one
 * action, and lets what happened enqueue the next — which is what makes a stall able to create work
 * rather than being skipped over.
 */
export function runReactor(deps: ReactorDeps, seed: readonly WorkBatch[]): ReactorReport {
  const maxSteps = Math.max(1, deps.maxSteps ?? DEFAULT_MAX_STEPS);
  const trace: OrgEvent[] = [];
  const refusals: string[] = [];
  const performed: PendingAction[] = [];
  let batches = [...seed];

  const note = (input: Parameters<typeof emit>[2]): void => {
    trace.push(emit(deps.chart, deps.createId("evt"), input));
  };

  const byId = (id: string): WorkBatch | undefined => batches.find((b) => b.batchId === id);
  const put = (next: WorkBatch): void => {
    batches = batches.map((b) => (b.batchId === next.batchId ? next : b));
  };

  /** The queue. Seeded from what each batch's state already calls for. */
  const pending: PendingAction[] = [];
  const enqueue = (action: PendingAction): void => {
    // De-duplicated on (kind, batch): an organization asked twice to do the same thing does it once.
    // Without this a reaction rule that fires on every event grows the queue without bound and the
    // step bound reports a runaway that is really a duplicate.
    if (pending.some((p) => p.kind === action.kind && p.batchId === action.batchId)) return;
    pending.push(action);
  };

  /** Management actions the loop creates FOR A HAT and deliberately does not perform. */
  const raised: PendingAction[] = [];
  const raise = (action: PendingAction): void => {
    if (raised.some((p) => p.kind === action.kind && p.batchId === action.batchId)) return;
    raised.push(action);
  };

  const chooser = deps.actionChooser ?? firstLegalChooser<ActionKind>();

  /**
   * Offer the batch its menu and enqueue what gets picked.
   *
   * The menu can hold more than one legal action, so this is a CHOICE inside the rules rather than
   * the next line of a script — and the clamp in `chooseWithinLegal` is what keeps a bad chooser
   * from leaving the state machine.
   */
  const pickNext = (batch: WorkBatch, causedBy?: string): void => {
    const menu = menuFor(batch);
    if (menu.length === 0) return;
    if (batch.paused !== undefined) {
      // A paused batch's only menu item is the way out, and taking it is the OWNER'S decision. The
      // loop resuming a batch on its own would step straight over an explicit decision to stop, so
      // resume is OFFERED and never TAKEN: the menu stays non-coercive and the pause stays real.
      raise({
        kind: ActionKind.ResumeBatch,
        batchId: batch.batchId,
        byHatId: batch.ownerHatId,
        causedBy: `paused: ${batch.paused.reason}`,
      });
      return;
    }
    const choice = chooseWithinLegal(menu, `next action for '${batch.batchId}' in ${batch.state}`, chooser);
    if (choice.outcome !== "chosen") {
      refusals.push(choice.reason);
      return;
    }
    if (choice.clamped === true) {
      // Reported, not swallowed: the pick is still legal, which is exactly what makes a
      // malfunctioning chooser invisible if nobody records the clamp.
      refusals.push(`chooser clamped on '${batch.batchId}': ${choice.reason}`);
    }
    enqueue({
      kind: choice.option,
      batchId: batch.batchId,
      byHatId: batch.ownerHatId,
      ...(causedBy === undefined ? {} : { causedBy }),
    });
  };

  for (const batch of batches) pickNext(batch);

  let steps = 0;
  while (pending.length > 0 && steps < maxSteps) {
    const action = pending.shift();
    if (action === undefined) break;
    steps += 1;
    const batch = byId(action.batchId);
    if (batch === undefined) {
      refusals.push(`no batch '${action.batchId}' for ${action.kind}`);
      continue;
    }
    performed.push(action);

    /**
     * Move the batch, and let what happened decide what is next.
     *
     * `cascade: false` moves it WITHOUT enqueueing the follow-on. Used by the one transition that
     * is a retreat rather than progress — see `CloseBatch` below.
     */
    const advance = (to: BatchState, cascadeNext = true): boolean => {
      const r = advanceBatch(batch, to);
      if (!r.ok) {
        refusals.push(r.reason);
        return false;
      }
      put(r.batch);
      note({
        kind: OrgEventKind.WorkItemTransition,
        subjectId: batch.batchId,
        actorHatId: action.byHatId,
        decision: `${action.kind}: ${batch.state} → ${to}`,
        fromState: batch.state,
        toState: to,
        atMs: deps.nowMs,
        ...(action.causedBy === undefined ? {} : { evidenceRefs: [action.causedBy] }),
      });
      // WHAT JUST HAPPENED DECIDES WHAT IS NEXT. This is the whole loop.
      const moved = byId(batch.batchId);
      if (cascadeNext && moved !== undefined) pickNext(moved, action.kind);
      return true;
    };

    switch (action.kind) {
      case ActionKind.ScopeBatch:
        advance(BatchState.Scoped);
        break;

      case ActionKind.PlanCapacity: {
        const capacity = deps.capacityFor?.(batch) ?? Math.max(1, batch.workIds.length);
        const planned = planCapacity(batch, capacity);
        if (!planned.ok) {
          refusals.push(planned.reason);
          break;
        }
        put(planned.batch);
        const advanced = advanceBatch(planned.batch, BatchState.CapacityPlanned);
        if (!advanced.ok) {
          refusals.push(advanced.reason);
          break;
        }
        put(advanced.batch);
        note({
          kind: OrgEventKind.WorkItemTransition,
          subjectId: batch.batchId,
          actorHatId: action.byHatId,
          decision: `planned capacity ${capacity}`,
          fromState: batch.state,
          toState: BatchState.CapacityPlanned,
          atMs: deps.nowMs,
        });
        pickNext(advanced.batch, action.kind);
        break;
      }

      case ActionKind.ScheduleBatch:
        advance(BatchState.Scheduled);
        break;

      case ActionKind.ActivateBatch:
        advance(BatchState.Active);
        break;

      case ActionKind.MarkBlocked: {
        const dep = deps.blockerFor?.(batch);
        if (dep === undefined) {
          // Nothing nameable to wait on. Refusing here is the rule doing its job: a batch parked
          // as "blocked" with no named dependency would look legitimate to the movement invariant
          // forever, which is the standing-by failure exactly.
          refusals.push(`'${batch.batchId}' cannot block: no named dependency`);
          break;
        }
        const blocked = blockBatch(batch, dep);
        if (!blocked.ok) {
          refusals.push(blocked.reason);
          break;
        }
        put(blocked.batch);
        note({
          kind: OrgEventKind.WorkItemTransition,
          subjectId: batch.batchId,
          actorHatId: action.byHatId,
          decision: `blocked on '${dep.dep}'${dep.etaMs === undefined ? " (no ETA)" : ""}`,
          fromState: batch.state,
          toState: BatchState.PartiallyBlocked,
          atMs: deps.nowMs,
        });
        pickNext(blocked.batch, action.kind);
        break;
      }

      case ActionKind.PauseBatch: {
        const reason = deps.pauseReasonFor?.(batch);
        if (reason === undefined) {
          // Nothing to name. `pauseBatch` refuses an unnamed reason anyway; refusing here keeps the
          // message about the missing reason rather than about an empty string.
          refusals.push(`'${batch.batchId}' cannot pause: no reason given`);
          break;
        }
        const paused = pauseBatch(batch, reason.reason, reason.expectedResumeMs);
        if (!paused.ok) {
          refusals.push(paused.reason);
          break;
        }
        put(paused.batch);
        note({
          kind: OrgEventKind.WorkItemTransition,
          subjectId: batch.batchId,
          actorHatId: action.byHatId,
          decision: `paused: ${reason.reason}`,
          toState: paused.batch.state,
          atMs: deps.nowMs,
        });
        // A paused batch's only menu item is resume, and the loop never takes it — so this raises it
        // for the owner and the loop moves on. Stopping is honoured, not stepped over.
        pickNext(paused.batch, action.kind);
        break;
      }

      case ActionKind.ResumeBatch: {
        const resumed = resumeBatch(batch);
        if (!resumed.ok) {
          refusals.push(resumed.reason);
          break;
        }
        put(resumed.batch);
        note({
          kind: OrgEventKind.WorkItemTransition,
          subjectId: batch.batchId,
          actorHatId: action.byHatId,
          decision: `resumed from pause`,
          toState: resumed.batch.state,
          atMs: deps.nowMs,
        });
        pickNext(resumed.batch, action.kind);
        break;
      }

      case ActionKind.Unblock: {
        const waitingOn = batch.blockedOn;
        if (waitingOn !== undefined && deps.depResolved?.(waitingOn, batch) !== true) {
          // Still waiting. Recorded rather than silent: a batch that stays blocked for a reason is
          // different from one nothing tried to move, and only the record tells them apart.
          refusals.push(`'${batch.batchId}' still waiting on '${waitingOn.dep}'`);
          break;
        }
        advance(BatchState.Active);
        break;
      }

      case ActionKind.CheckCompletion: {
        // The check is a REAL look at the members, not a transition. A batch with unfinished work
        // goes to the completion check and comes back out; only a finished one closes.
        const m = rollUp(batch, deps);
        if (!advance(BatchState.CompletionCheck)) break;
        note({
          kind: OrgEventKind.WorkItemTransition,
          subjectId: batch.batchId,
          actorHatId: action.byHatId,
          decision: `completion check: ${m.done}/${m.total} done, ${m.stalled} stalled`,
          atMs: deps.nowMs,
        });
        break;
      }

      case ActionKind.CloseBatch: {
        const m = rollUp(batch, deps);
        if (m.total > 0 && m.done < m.total) {
          // NOT done. Back to work rather than closed — the completion check exists to be able to
          // say no, and a check that always advances is not a check.
          //
          // AND IT DOES NOT RE-QUEUE THE CHECK. Doing so produced a livelock:
          // check → close → back to Active → check → … until the step bound stopped it. Nothing
          // about the batch changed between one check and the next, so re-checking cannot reach a
          // different answer. A state that cannot progress raises a SIGNAL instead — which is the
          // reference's own invariant, and the difference between a living loop and a spinning one.
          if (advance(BatchState.Active, false)) {
            note({
              kind: OrgEventKind.Refusal,
              subjectId: batch.batchId,
              decision: `not closed: ${m.total - m.done} of ${m.total} item(s) unfinished`,
              atMs: deps.nowMs,
            });
            enqueue({
              kind: ActionKind.TriageStall,
              batchId: batch.batchId,
              byHatId: batch.ownerHatId,
              causedBy: ActionKind.CloseBatch,
            });
          }
          break;
        }
        advance(BatchState.Done);
        break;
      }

      // ── Management actions, which only a stall creates ──────────────────
      case ActionKind.TriageStall: {
        const decider = escalationDeciderFor(deps.chart, batch.ownerHatId);
        if (decider === undefined) {
          refusals.push(`stall on '${batch.batchId}': nobody above '${batch.ownerHatId}' may decide`);
          break;
        }
        const esc = decideEscalation(deps.chart, {
          trigger: EscalationTrigger.StaleBlocker,
          workId: batch.batchId,
          ownerHatIds: [batch.ownerHatId],
          deciderHatId: decider.id,
          chooser: deps.escalationChooser ?? firstLegalChooser(),
        });
        if (!esc.ok) {
          refusals.push(`stall on '${batch.batchId}': ${esc.reason}`);
          break;
        }
        note({
          kind: OrgEventKind.EscalationDecision,
          subjectId: batch.batchId,
          actorHatId: esc.byHatId,
          decision: `stall triaged → ${esc.action} (${esc.effect})`,
          fromState: EscalationTrigger.StaleBlocker,
          toState: esc.action,
          atMs: deps.nowMs,
        });
        break;
      }

      case ActionKind.Reprioritize:
      case ActionKind.ChangeStaffing:
      case ActionKind.DirectorReview: {
        // These are RECORDED, not simulated. The reactor's job is to create the management action
        // and put it in front of the right hat; performing it is that hat's work, and pretending to
        // do it here would manufacture a decision nobody made.
        const decider = escalationDeciderFor(deps.chart, batch.ownerHatId);
        note({
          kind: OrgEventKind.EscalationDecision,
          subjectId: batch.batchId,
          actorHatId: decider?.id ?? batch.ownerHatId,
          decision: `${action.kind} required${action.causedBy === undefined ? "" : ` (caused by ${action.causedBy})`}`,
          toState: action.kind,
          atMs: deps.nowMs,
        });
        break;
      }
    }
  }

  // ── The movement invariant, checked at rest ────────────────────────────────
  // Only meaningful once the loop has run out of work: a batch mid-flight legitimately has nothing
  // queued for it at this instant, and calling that a stall would fire on every busy organization.
  //
  // QUIESCENCE IS READ FROM THE QUEUE, NOT FROM THE STEP COUNT. `steps < maxSteps` was a proxy,
  // and it is wrong at the boundary: a run whose last legal action is also its last permitted step
  // has finished, and the proxy calls it a runaway. Snapshot the queue here, before the invariant
  // can append to it, so "left undone" and "raised for a hat" never share a list.
  const unperformed = [...pending];
  const quiesced = unperformed.length === 0;
  const metrics = batches.map((b) => rollUp(b, deps));
  const stalledBatchIds: string[] = [];
  if (quiesced) {
    for (const batch of batches) {
      // THE TWO LEGITIMATE WAYS TO NOT BE MOVING, and they are the only two.
      //
      //   - PAUSED     — an explicit decision to stop, which carries its reason and its way out.
      //   - BLOCKED ON A NAMED DEPENDENCY — a bounded wait that says what it waits for.
      //
      // Anything else that is not moving is the STANDING-BY FAILURE: holding with no named
      // dependency. That is the whole invariant, and it is the reason `blockedOn` is required to
      // enter the blocked state — without it "blocked" would be an alibi any stall could claim.
      if (isTerminalBatch(batch.state) || batch.paused !== undefined) continue;
      if (batch.blockedOn !== undefined) continue;
      const stuck = stalledItems(batch, deps.cascade, deps.gateEvaluations);
      const m = metrics.find((x) => x.batchId === batch.batchId);
      const mv = m === undefined ? undefined : movement(m);
      if (stuck.length === 0 && (mv?.triggers.length ?? 0) === 0) continue;

      stalledBatchIds.push(batch.batchId);
      // THE SIGNAL CREATES THE NEXT ACTION. Noticing it is stuck is itself a move.
      note({
        kind: OrgEventKind.ChurnDetected,
        subjectId: batch.batchId,
        actorHatId: batch.ownerHatId,
        decision: `stalled: ${stuck.length} item(s) with no next action and no pause`,
        atMs: deps.nowMs,
        evidenceRefs: stuck.map((n) => n.workId),
      });
      // Triage is raised only if the loop did not already run it for this batch. When it did, the
      // hat has the signal and repeating it is the duplicate `enqueue` guards against everywhere
      // else. The movement triggers below are raised regardless — they are the substantive asks,
      // and a batch still failing the invariant AFTER triage is exactly when they matter.
      if (!performed.some((p) => p.kind === ActionKind.TriageStall && p.batchId === batch.batchId)) {
        raise({
          kind: ActionKind.TriageStall,
          batchId: batch.batchId,
          byHatId: batch.ownerHatId,
          causedBy: "stall_signal",
        });
      }
      for (const trigger of mv?.triggers ?? []) {
        const kind = actionForTrigger(trigger);
        if (kind !== undefined) {
          raise({ kind, batchId: batch.batchId, byHatId: batch.ownerHatId, causedBy: "movement_score" });
        }
      }
    }
  }

  return {
    batches,
    trace,
    performed,
    pending: unperformed,
    raised,
    steps,
    // Quiesced means the loop RAN OUT OF WORK. A run stopped by the bound is a different outcome and
    // must not read as a finished one.
    quiesced,
    metrics,
    stalledBatchIds,
    refusals,
  };
}

/** Build a batch per project in a cascade, owned by the project's own hat. */
export function batchesFromCascade(
  cascade: Cascade,
  createId: (prefix: string) => string,
): readonly WorkBatch[] {
  const projects = cascade.nodes.filter((n) => n.workType === "project");
  return projects.map((project) => ({
    batchId: createId("batch"),
    title: project.title,
    ownerHatId: project.ownerHatId,
    state: BatchState.Created,
    workIds: cascade.nodes.filter((n) => n.parentWorkId === project.workId).map((n) => n.workId),
  }));
}
