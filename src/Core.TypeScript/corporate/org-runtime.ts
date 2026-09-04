/**
 * corporate/org-runtime.ts — the composition root. Every module in this register, in one pipeline.
 *
 * ── WHY THIS EXISTS ──────────────────────────────────────────────────────────
 * An import audit of `corporate/` found **62 of 189 exported values reached by any non-test
 * module**, and seven modules — `work-market`, `prioritization`, `assignment-engine`, `loop-policy`,
 * `work-projection`, `org-seed`, `org-cycle` — reached by NONE. Tested, correct, and consumed by
 * nothing: exactly the defect this package was started to fix, reproduced at scale by the fixing.
 *
 * `org-cycle.ts` runs the delivery loop and deliberately stays that. This runs the WHOLE
 * organization, and its job is to be the caller that makes the rest load-bearing:
 *
 *    1. INTAKE       external events arrive, are de-duplicated and triaged      (intake)
 *    2. PRIORITIZE   an authority orders what survived                          (prioritization)
 *    3. CASCADE      the top goal decomposes to owned tasks                     (goal-cascade)
 *    4. STAFF        ranked assignment issues real, expiring bindings           (assignment-engine,
 *                                                                               reputation, hat-binding)
 *    5. SCHEDULE     assignees get work blocks; the chain meets                 (work-schedule)
 *    6. MARKET       tasks become shards; agents claim, complete, review        (work-market)
 *    7. QA           cases derived from criteria run for real                   (qa)
 *    8. GATES        seven gates, with runtime-validation reading QA's verdict  (quality-gate)
 *    9. ESCALATE     repeated rejection is churn, broken structurally           (escalation)
 *   10. LOOP         the dev's OWN observe tick picks the work and reports back (loop-policy,
 *                                                                               work-projection)
 *
 * ── IT IS A FUNCTION OF ITS INPUTS ───────────────────────────────────────────
 * No clock, no randomness, no I/O. Same inputs, same report — which is what lets the end-to-end
 * claim be a test rather than a demonstration.
 *
 * ── REFUSALS ARE RESULTS ─────────────────────────────────────────────────────
 * Every step that can be refused records the refusal and the pipeline continues where continuing is
 * meaningful. A runtime that stopped at the first refusal could only ever report the happy path.
 */

import {
  assignHat,
  eligibleFor,
  type Candidate,
} from "./assignment-engine";
import {
  EMPTY_BOARD,
  recordDecision,
  resolveAnchor,
  type AnchorBoard,
  type EvidenceRef,
} from "./discussion-anchor";
import {
  DEFAULT_CHURN_THRESHOLD,
  decideEscalation,
  detectChurn,
  escalationDeciderFor,
  EscalationTrigger,
  type EscalationAction,
  type EscalationEffect,
} from "./escalation";
import {
  accountableHatsFor,
  acceptGoal,
  assign,
  decompose,
  EMPTY_CASCADE,
  isDelivered,
  isLeafType,
  nodeById,
  setState,
  unstaffedTasks,
  WorkState,
  WorkType,
  type Cascade,
} from "./goal-cascade";
import {
  advanceAll,
  beginBinding,
  bindingForHat,
  isAuthorizing,
  mayTakeHat,
  planSuccession,
  releaseBinding,
  timingFor,
  type HatBinding,
  type SuccessionPlan,
} from "./hat-binding";
import {
  receive,
  type ExternalEvent,
  type IntakeItem,
  type IntakeRefusal,
} from "./intake";
import { bindWearerToLoop } from "./loop-policy";
import { firstLegalChooser, preferChooser, type OrgChooser } from "./org-decision";
import { reportsUpTo, type HatLevel, type OrgChart } from "./org-chart";
import { fidelityOf, type ChangeHandle, type FidelityReport, type ProviderSet } from "./providers";
import { simulatedChangeControl, simulatedIntake, simulatedTestRunner, simulatedWorkExecutor } from "./adapters";
import { associateGoal, EMPTY_BOOK, openPortfolio, type PortfolioKind } from "./portfolio";
import {
  batchesFromCascade,
  runReactor,
  type ActionKind,
  type ReactorReport,
} from "./org-reactor";
import type { NamedDependency, WorkBatch } from "./work-batch";
import {
  computeRecommendation,
  decidePriority,
  orderByPriority,
  PriorityClass,
  workable,
  type PriorityDecision,
  type PriorityInputs,
} from "./prioritization";
import {
  deriveTestCases,
  gateOutcomeFor,
  runQaCycle,
  RunOutcome,
  type QaCycleReport,
  type TestCase,
} from "./qa";
import {
  GateKind,
  GateOutcome,
  gateOwners,
  runGateChain,
  type GateEvaluation,
  type GateRunResult,
  type RecoveryPath,
  NO_PROPOSER,
} from "./quality-gate";
import type { ReputationObservation } from "./reputation";
import { sendSupervisorSignal, SignalTool, type SupervisorSignal } from "./supervisor-signal";
import {
  EMPTY_CALENDAR,
  firstCommonFreeSlot,
  scheduleBlock,
  scheduleMeeting,
  ScheduleBlockState,
  ScheduleBlockType,
  type Calendar,
} from "./work-schedule";
import {
  addShard,
  approveShard,
  claimShard,
  completeClaim,
  emptyQueue,
  mergeShard,
  reapStaleClaims,
  readout,
  type QueueReadout,
  type WorkQueue,
} from "./work-market";
import { completionsFrom, projectFor } from "./work-projection";
import { projectAll, type Projection } from "./change-control";
import { emit, OrgEventKind, render, type OrgEvent } from "./org-event";

const ORDERED_GATES_COUNT = 7;

/** An agent that exists and the hat it occupies in the chart. */
export interface OrgAgent {
  readonly agentId: string;
  readonly hatId: string;
}

export interface OrgRuntimeDeps {
  readonly chart: OrgChart;
  /** Work arriving from outside. */
  readonly externalEvents: readonly ExternalEvent[];
  /** Everyone available to be staffed. */
  readonly agents: readonly OrgAgent[];
  /** Reputation history the ranker reads. */
  readonly observations: readonly ReputationObservation[];
  /** The C-suite hat that accepts the goal. */
  readonly acceptingHatId: string;
  readonly resourceAuthorityHatId: string;
  /** The authority that sets priority. */
  readonly priorityDeciderHatId: string;
  readonly createId: (prefix: string) => string;
  readonly nowMs: number;
  readonly workBlockMs: number;
  readonly leaseMs: number;
  /** How each accepted intake item scores. Absent = a neutral score. */
  /**
   * The long-lived thing this run's goal is ABOUT.
   *
   * Optional: a goal need not belong to a portfolio, and inventing one would assert a product
   * nobody declared. Supplied, the run emits the facts that let a portfolio accumulate goals ACROSS
   * runs when the log is stored.
   */
  readonly portfolio?: {
    readonly portfolioId: string;
    readonly title: string;
    readonly kind: PortfolioKind;
    readonly ownerHatId: string;
  };
  /** Passed through to the reactor — see `ReactorDeps`. Omitted means the deterministic default. */
  readonly actionChooser?: OrgChooser<ActionKind>;
  readonly blockerFor?: (batch: WorkBatch) => NamedDependency | undefined;
  readonly depResolved?: (dep: NamedDependency, batch: WorkBatch) => boolean;
  readonly priorityInputsFor?: (item: IntakeItem) => PriorityInputs;
  /** What QA finds. Keyed by test-case id. Absent cases take `fallback`. */
  readonly qaPlan?: ReadonlyMap<string, RunOutcome>;
  readonly qaFallback?: RunOutcome;
  /**
   * The ports where this run touches reality — see `providers.ts`.
   *
   * Absent means the SIMULATED set, built from `externalEvents`, `qaPlan` and `qaFallback`: exactly
   * what the register did before these ports existed. The default is a simulation and the report
   * now says so, which is the difference between a run that shipped something and one that decided
   * it had.
   */
  readonly providers?: ProviderSet;
  readonly gateChooser?: OrgChooser<GateOutcome>;
  readonly escalationChooser?: OrgChooser<EscalationAction>;
  readonly priorityChooser?: OrgChooser<PriorityClass>;
  readonly maxGateAttempts?: number;
  readonly churnThreshold?: number;
  /** Wearers per hat the RMO has authorized. */
  readonly supplyTarget?: number;
}

export interface OrgRuntimeReport {
  readonly intakeAccepted: readonly IntakeItem[];
  readonly intakeRefused: readonly IntakeRefusal[];
  readonly priorities: readonly PriorityDecision[];
  readonly goalWorkId?: string;
  readonly cascade: Cascade;
  readonly bindings: readonly HatBinding[];
  readonly succession: readonly SuccessionPlan[];
  readonly calendar: Calendar;
  readonly board: AnchorBoard;
  readonly queue: WorkQueue;
  readonly queueReadout: QueueReadout;
  readonly qa: readonly QaCycleReport[];
  readonly testCases: readonly TestCase[];
  readonly gateRuns: readonly { readonly taskId: string; readonly run: GateRunResult }[];
  readonly gateEvaluations: readonly GateEvaluation[];
  readonly gateBlocked: readonly { readonly taskId: string; readonly gate: GateKind; readonly recovery?: RecoveryPath }[];
  readonly escalations: readonly {
    readonly taskId: string;
    readonly action: EscalationAction;
    readonly effect: EscalationEffect;
    readonly byHatId: string;
  }[];
  readonly signals: readonly SupervisorSignal[];
  /** What the dev's own observe loop was offered and what it picked. */
  readonly loopTicks: readonly {
    readonly agentId: string;
    readonly hatId: string;
    readonly offered: number;
    readonly pickedWorkId?: string;
  }[];
  readonly levelsEngaged: readonly HatLevel[];
  /**
   * Each executable task as a CHANGE, in the canonical lifecycle's vocabulary, with any place the
   * two records disagree. Derived from what the organization did, never set.
   */
  readonly changes: readonly {
    readonly workId: string;
    readonly projection: Projection;
    readonly disagreements: readonly string[];
  }[];
  /**
   * The work ids whose change the CHANGE-CONTROL PORT opened and merged for real.
   *
   * Distinct from `changes` on purpose: that is what the organization DECIDED, this is what a
   * repository will agree to. Under the simulated adapter they coincide, and the distinction only
   * pays when they do not — which is the case worth being able to see.
   */
  readonly changesLanded: readonly string[];
  readonly delivered: boolean;
  /**
   * What happened, as TYPED events — queryable by subject, by actor, and by LINE OF AUTHORITY.
   *
   * Each carries a supervisor chain computed from the chart, so "everything the CTO's organization
   * decided" is answerable without knowing who reports to the CTO. `events` is these rendered; the
   * structure is the record and the prose is the reading.
   */
  readonly trace: readonly OrgEvent[];
  readonly events: readonly string[];
  readonly refusals: readonly string[];
  /**
   * THE CYCLE DOES NOT STOP AT THE BOTTOM OF THIS FUNCTION.
   *
   * Everything above is a pipeline: intake, then priority, then cascade, then staffing, once, in
   * source order. A pipeline cannot notice a stall, because its next step is whatever comes next in
   * the file — so a batch going nowhere in phase four produces nothing at all and phase five runs
   * regardless. The reactor takes what the pipeline produced and runs it as a WORK QUEUE until the
   * organization has nothing left to do, deriving each next action from what just happened.
   *
   * The two outcomes it distinguishes are the point: `quiesced` means finished, and the step bound
   * means a reaction rule is producing work faster than the loop consumes it. Its `raised` list is
   * management work the run created for a hat and deliberately did not perform.
   */
  readonly reactor: ReactorReport;
  /**
   * Which adapter answered each port, and whether this run is replayable.
   *
   * DERIVED from the providers rather than declared. A run that reached a shell or a network and
   * called itself deterministic is the claim `providers.ts` exists to make unsayable by accident.
   */
  readonly fidelity: FidelityReport;
}

const NEUTRAL_INPUTS: PriorityInputs = {
  executivePriority: 0,
  customerImpact: 0,
  severity: 0,
  releaseRisk: 0,
  blockedDownstreamCount: 0,
  dependencyFanOut: 0,
  queueAgeMs: 0,
  hatScarcity: 0,
  budgetBurn: 0,
  estimatedEffort: 0,
};

const STAFFING_EVIDENCE: readonly EvidenceRef[] = [{ kind: "measurement", ref: "queue/unstaffed" }];

const LEVEL_ORDER: readonly HatLevel[] = [
  "executive_board",
  "c_suite",
  "director",
  "manager",
  "lead",
  "individual_contributor",
];

/**
 * Run the whole organization once.
 *
 * Long and linear on purpose: the value of this function is that the entire pipeline is readable in
 * the order it happens. Splitting it into ten helpers would hide the one thing it exists to show —
 * that these modules compose.
 */
export async function runOrgRuntime(deps: OrgRuntimeDeps): Promise<OrgRuntimeReport> {
  // The ports, resolved ONCE. Defaulting here rather than at each call site means one place decides
  // what this run is touching, and one place reports it.
  const providers: ProviderSet = deps.providers ?? {
    intake: simulatedIntake(deps.externalEvents),
    work: simulatedWorkExecutor(true),
    tests: simulatedTestRunner(deps.qaPlan ?? new Map(), deps.qaFallback ?? RunOutcome.Passed),
    change: simulatedChangeControl(),
  };
  const fidelity = fidelityOf(providers);

  const trace: OrgEvent[] = [];
  const refusals: string[] = [];

  /**
   * Record one event.
   *
   * The supervisor chain is computed inside `emit` from the chart, so a caller here cannot pass a
   * wrong one — which is the only reason recording it is worth anything.
   */
  const note = (input: Parameters<typeof emit>[2]): void => {
    trace.push(emit(deps.chart, deps.createId("evt"), input));
  };
  const levels = new Set<HatLevel>();
  const engage = (hatId: string): void => {
    const l = deps.chart.byId.get(hatId)?.level;
    if (l !== undefined) levels.add(l);
  };

  // ── 1. INTAKE ─────────────────────────────────────────────────────────────
  const accepted: IntakeItem[] = [];
  const refusedIntake: IntakeRefusal[] = [];
  const seen = new Set<string>();
  // Inbound work comes through the PORT. A refusal is recorded and the run continues with nothing
  // rather than crashing: an unreachable inbox is an organization with no new work, not a broken one.
  const polled = await providers.intake.poll();
  if (!polled.ok) refusals.push(`intake source '${providers.intake.meta.name}': ${polled.reason}`);
  const inbound = polled.ok ? polled.value : [];
  for (const raw of inbound) {
    const r = receive(raw, { itemId: deps.createId("in"), nowMs: deps.nowMs, seen });
    if (!r.ok) {
      refusedIntake.push(r.refusal);
      refusals.push(`intake: ${r.refusal.reason} — ${r.refusal.message}`);
      continue;
    }
    seen.add(r.value.externalRef);
    accepted.push(r.value);
    note({
      kind: OrgEventKind.IntakeReceived,
      subjectId: r.value.itemId,
      decision: `intake accepted '${r.value.title}' (${r.value.kind}, ${r.value.severity})`,
      toState: r.value.state,
      atMs: deps.nowMs,
      evidenceRefs: [r.value.externalRef],
    });
  }

  // ── 2. PRIORITIZE ─────────────────────────────────────────────────────────
  const priorities: PriorityDecision[] = [];
  for (const item of accepted) {
    const rec = computeRecommendation(
      item.itemId,
      deps.priorityInputsFor?.(item) ?? NEUTRAL_INPUTS,
      [],
    );
    const decided = decidePriority(deps.chart, {
      recommendation: rec,
      deciderHatId: deps.priorityDeciderHatId,
      chooser: deps.priorityChooser ?? preferChooser<PriorityClass>(rec.priorityClass, "as recommended"),
    });
    if (!decided.ok) {
      refusals.push(`priority for ${item.itemId}: ${decided.reason}`);
      continue;
    }
    priorities.push(decided.decision);
    engage(decided.decision.decidedByHatId);
    note({
      kind: OrgEventKind.PriorityDecision,
      subjectId: item.itemId,
      actorHatId: decided.decision.decidedByHatId,
      decision: `priority '${decided.decision.priorityClass}' (recommended '${decided.decision.recommended}')`,
      fromState: decided.decision.recommended,
      toState: decided.decision.priorityClass,
      atMs: deps.nowMs,
      evidenceRefs: decided.decision.reasonCodes,
      fact: {
        kind: "priority_decided",
        workId: item.itemId,
        priorityClass: decided.decision.priorityClass,
        decidedByHatId: decided.decision.decidedByHatId,
        reason: decided.decision.reason,
        recommended: decided.decision.recommended,
        reasonCodes: decided.decision.reasonCodes,
      },
    });
  }
  const ordered = orderByPriority(priorities);
  const queueOfWork = workable(priorities);
  note({
    kind: OrgEventKind.PriorityDecision,
    subjectId: "portfolio",
    actorHatId: deps.priorityDeciderHatId,
    decision: `prioritized ${ordered.length} item(s); ${queueOfWork.length} workable`,
    atMs: deps.nowMs,
  });

  const empty = (): OrgRuntimeReport => ({
    fidelity,
    // An empty run still gets a REAL reactor report over an empty organization, not a hand-written
    // stub: it quiesces immediately because there is nothing to do, which is the true answer and
    // the same one the loop would give. A fabricated `quiesced: true` would be indistinguishable
    // from a run that finished, which is exactly the distinction the field exists to carry.
    reactor: runReactor(
      {
        chart: deps.chart,
        cascade: EMPTY_CASCADE,
        testRuns: [],
        gateEvaluations: [],
        createId: deps.createId,
        nowMs: deps.nowMs,
      },
      [],
    ),
    intakeAccepted: accepted,
    intakeRefused: refusedIntake,
    priorities: ordered,
    cascade: EMPTY_CASCADE,
    bindings: [],
    succession: [],
    calendar: EMPTY_CALENDAR,
    board: EMPTY_BOARD,
    queue: emptyQueue("q", "none"),
    queueReadout: readout(emptyQueue("q", "none"), deps.nowMs),
    qa: [],
    testCases: [],
    gateRuns: [],
    gateEvaluations: [],
    gateBlocked: [],
    escalations: [],
    signals: [],
    loopTicks: [],
    levelsEngaged: [...levels].sort((a, b) => LEVEL_ORDER.indexOf(a) - LEVEL_ORDER.indexOf(b)),
    changes: [],
    changesLanded: [],
    delivered: false,
    trace,
    events: trace.map(render),
    refusals,
  });

  const top = queueOfWork[0];
  if (top === undefined) {
    refusals.push("nothing workable — no goal to cascade");
    return empty();
  }
  const topItem = accepted.find((i) => i.itemId === top.workId);
  if (topItem === undefined) return empty();

  // ── 3. CASCADE ────────────────────────────────────────────────────────────
  let cascade: Cascade = EMPTY_CASCADE;
  const goalId = deps.createId("goal");
  const goal = acceptGoal(cascade, deps.chart, {
    workId: goalId,
    title: topItem.title,
    acceptingHatId: deps.acceptingHatId,
  });
  if (!goal.ok) {
    refusals.push(`accept goal: ${goal.reason}`);
    return empty();
  }
  cascade = goal.cascade;
  engage(deps.acceptingHatId);
  note({
    kind: OrgEventKind.WorkItemTransition,
    subjectId: goalId,
    actorHatId: deps.acceptingHatId,
    decision: `accepted '${topItem.title}' as a goal`,
    toState: "open",
    atMs: deps.nowMs,
      fact: {
      kind: "work_created",
      workId: goalId,
      workType: WorkType.Goal,
      title: topItem.title,
      ownerHatId: deps.acceptingHatId,
    },
  });

  // The goal is ABOUT a long-lived thing, when the caller named one. Two facts rather than one:
  // opening the container and pointing a goal at it are separate acts, and a log that conflated
  // them could not tell a new product from a new goal on an existing one.
  if (deps.portfolio !== undefined) {
    const pf = deps.portfolio;
    // VALIDATED BEFORE IT IS RECORDED. The fold replays facts and cannot re-check them, so writing
    // the fact directly would let a portfolio be opened with an owner too junior to hold it and the
    // seniority rule would never run — the rule would exist and never fire, which is the vacuity
    // class with an extra step.
    const openedBook = openPortfolio(EMPTY_BOOK, deps.chart, pf);
    if (!openedBook.ok) refusals.push(`portfolio: ${openedBook.reason}`);
    else {
      const associated = associateGoal(openedBook.book, goalId, pf.portfolioId);
      if (!associated.ok) refusals.push(`portfolio: ${associated.reason}`);
      else {
    note({
      kind: OrgEventKind.WorkItemTransition,
      subjectId: pf.portfolioId,
      actorHatId: pf.ownerHatId,
      decision: `portfolio '${pf.title}' is open`,
      atMs: deps.nowMs,
      fact: {
        kind: "portfolio_opened",
        portfolioId: pf.portfolioId,
        title: pf.title,
        portfolioKind: pf.kind,
        ownerHatId: pf.ownerHatId,
      },
    });
    note({
      kind: OrgEventKind.WorkItemTransition,
      subjectId: goalId,
      actorHatId: deps.acceptingHatId,
      decision: `this goal is about '${pf.title}'`,
      atMs: deps.nowMs,
      fact: { kind: "goal_associated", goalId, portfolioId: pf.portfolioId },
    });
      }
    }
  }

  const step = (
    parent: string,
    titles: readonly string[],
    prefix: string,
    workType?: WorkType,
  ): readonly string[] => {
    const children = titles.map((title) => ({
      workId: deps.createId(prefix),
      title,
      ...(workType === undefined ? {} : { workType }),
    }));
    const r = decompose(cascade, deps.chart, parent, children);
    if (!r.ok) {
      refusals.push(`decompose ${parent}: ${r.reason}`);
      return [];
    }
    cascade = r.cascade;
    for (const c of children) {
      const n = nodeById(cascade, c.workId);
      if (n !== undefined) {
        engage(n.ownerHatId);
        note({
          kind: OrgEventKind.WorkItemTransition,
          subjectId: n.workId,
          actorHatId: n.ownerHatId,
          decision: `owns ${n.workType} '${n.title}'`,
          toState: n.state,
          atMs: deps.nowMs,
                  fact: {
            kind: "work_created",
            workId: n.workId,
            workType: n.workType,
            title: n.title,
            ownerHatId: n.ownerHatId,
            ...(n.parentWorkId === undefined ? {} : { parentWorkId: n.parentWorkId }),
          },
        });
      }
    }
    return children.map((c) => c.workId);
  };

  const initiatives = step(goalId, [`initiative for ${topItem.title}`], "init");
  const projects = initiatives.flatMap((i) => step(i, [`project for ${topItem.title}`], "proj"));
  // THE LEAF CARRIES THE INTAKE'S OWN CLASSIFICATION. Intake decides an inbound event is a defect
  // or an incident; creating the executable work as a plain `task` regardless would discard that a
  // second time, one layer below where it was first thrown away. The VERIFY leaf stays a `review`
  // whatever the work is — checking a fix is a different kind of work from making it.
  const leafType = isLeafType(topItem.workType) ? topItem.workType : WorkType.Task;
  projects.flatMap((p) => [
    ...step(p, [`implement ${topItem.title}`], "task", leafType),
    ...step(p, [`verify ${topItem.title}`], "task", WorkType.Review),
  ]);

  // ── 4. STAFF — ranked assignment producing real, expiring bindings ────────
  let bindings: readonly HatBinding[] = [];
  const board0 = EMPTY_BOARD;
  let board: AnchorBoard = board0;
  const signals: SupervisorSignal[] = [];
  const supplyTarget = deps.supplyTarget ?? 1;

  for (const task of unstaffedTasks(cascade)) {
    // The lead asks the RMO — routed, evidenced, and anchored.
    const sent = sendSupervisorSignal(
      deps.chart,
      board,
      {
        signalId: deps.createId("sig"),
        anchorId: deps.createId("anchor"),
        fromHatId: task.ownerHatId,
        tool: SignalTool.RequestResource,
        title: `staff '${task.title}'`,
        message: `${task.workId} has no contributor`,
        evidence: STAFFING_EVIDENCE,
        atMs: deps.nowMs,
        workItemId: task.workId,
      },
      deps.resourceAuthorityHatId,
    );
    if (!sent.ok) {
      refusals.push(`staffing request for ${task.workId}: ${sent.reason}`);
      continue;
    }
    board = sent.board;
    signals.push(sent.signal);
    engage(sent.signal.fromHatId);
    engage(sent.signal.toHatId);
    note({
      kind: OrgEventKind.SupervisorSignalSent,
      subjectId: task.workId,
      actorHatId: sent.signal.fromHatId,
      decision: `${sent.signal.tool} → ${sent.signal.toHatId}`,
      toState: sent.signal.toHatId,
      atMs: deps.nowMs,
      evidenceRefs: sent.signal.evidence.map((e) => e.ref),
    });

    // TWO SEPARATE QUESTIONS, and conflating them is what made the first run of this pipeline
    // starve. `goal-cascade.assign` assigns a HAT to the task; `assignment-engine.assignHat` picks
    // an AGENT to wear a hat. So:
    //
    //   (a) which IC hat should carry this task — a chart question, answered by the reporting line;
    //   (b) which agent wears it — a ranking question, answered by reputation and availability.
    //
    // (a) An IC hat inside the task owner's line, not already carrying another task in this
    // cascade. Without the second condition both tasks land on one hat and the second is refused
    // at the supply cap, which reads as a capacity problem and is really a selection bug.
    const alreadyCarrying = new Set(
      cascade.nodes.map((n) => n.assigneeHatId).filter((h): h is string => h !== undefined),
    );
    const targetHat = deps.chart.hats.find(
      (h) =>
        h.level === "individual_contributor" &&
        !alreadyCarrying.has(h.id) &&
        reportsUpTo(deps.chart, h.id, task.ownerHatId),
    );
    if (targetHat === undefined) {
      refusals.push(
        `no free individual-contributor hat reports up to '${task.ownerHatId}' for ${task.workId}`,
      );
      continue;
    }

    // (b) The agents who could wear it. Ranked on the (agent, hat) pairing.
    const candidates: Candidate[] = deps.agents.map((a) => ({ agentId: a.agentId, hatId: a.hatId }));
    const outcome = assignHat({
      chart: deps.chart,
      hat: targetHat,
      candidates,
      bindings,
      nowMs: deps.nowMs,
      observations: deps.observations,
      chooser: firstLegalChooser(),
      supplyTarget,
    });

    if (outcome.outcome !== "assigned") {
      refusals.push(`assign ${task.workId}: ${outcome.reason}`);
      // The eligibility detail is what the RMO needs, so surface it rather than only the summary.
      if (outcome.outcome === "no_eligible_candidate") {
        for (const x of outcome.excluded) refusals.push(`  ${x.agentId}: ${x.reason}`);
      }
      continue;
    }

    // A hat is WORN, not owned: the binding warms up, activates, and will expire.
    const may = mayTakeHat(bindings, outcome.agentId, targetHat.id, deps.nowMs);
    if (!may.ok) {
      refusals.push(`bind ${outcome.agentId} to ${targetHat.id}: ${may.reason}`);
      continue;
    }
    const begun = beginBinding(targetHat, {
      bindingId: deps.createId("bind"),
      wearerAgentId: outcome.agentId,
      nowMs: deps.nowMs,
    });
    if (!begun.ok) {
      refusals.push(`bind ${outcome.agentId}: ${begun.reason}`);
      continue;
    }
    bindings = [...bindings, begun.binding];

    const decided = recordDecision(board, {
      decisionId: deps.createId("dec"),
      anchorId: sent.signal.anchorId,
      byHatId: sent.signal.toHatId,
      atMs: deps.nowMs,
      decision: `assign ${outcome.agentId} (score ${outcome.score.toFixed(3)})`,
      rationale: `ranked first among eligible candidates in the owning line`,
      evidence: STAFFING_EVIDENCE,
    });
    if (decided.ok) board = decided.board;
    else refusals.push(`RMO decision for ${task.workId}: ${decided.reason}`);

    const assigned = assign(cascade, deps.chart, task.workId, targetHat.id);
    if (!assigned.ok) {
      refusals.push(`assign ${task.workId}: ${assigned.reason}`);
      continue;
    }
    cascade = assigned.cascade;
    engage(targetHat.id);
    note({
      kind: OrgEventKind.HatAssignment,
      subjectId: task.workId,
      actorHatId: sent.signal.toHatId,
      actorAgentId: outcome.agentId,
      decision: `${outcome.agentId} bound to ${targetHat.id} and assigned ${task.workId}`,
      toState: targetHat.id,
      atMs: deps.nowMs,
          fact: { kind: "work_assigned", workId: task.workId, assigneeHatId: targetHat.id },
    });

    const resolved = resolveAnchor(board, sent.signal.anchorId);
    if (resolved.ok) board = resolved.board;
    else refusals.push(`resolve staffing anchor: ${resolved.reason}`);
  }

  // Warm the bindings up so they authorize. `advanceAll` is the runtime tick.
  const warmedAt = deps.nowMs + Math.max(...bindings.map((b) => b.warmupEndsMs - b.boundAtMs), 0);
  bindings = advanceAll(bindings, deps.chart, warmedAt);
  for (const b of bindings) {
    if (isAuthorizing(b, warmedAt)) {
      note({
        kind: OrgEventKind.HatBindingTransition,
        subjectId: b.bindingId,
        actorHatId: b.hatId,
        actorAgentId: b.wearerAgentId,
        decision: `${b.wearerAgentId} is now wearing ${b.hatId}`,
        toState: b.phase,
        atMs: warmedAt,
      });
    }
  }

  // ── 5. SCHEDULE ───────────────────────────────────────────────────────────
  let calendar: Calendar = EMPTY_CALENDAR;
  let cursor = warmedAt;
  const staffedTasks = cascade.nodes.filter((n) => n.assigneeHatId !== undefined);
  for (const task of staffedTasks) {
    // Hoisted so the event's FACT can name the block it planned. Minting it inside the call would
    // leave the log describing a block whose id it does not know.
    const blockId = deps.createId("blk");
    const r = scheduleBlock(calendar, {
      blockId,
      hatId: task.assigneeHatId!,
      blockType: ScheduleBlockType.PrioritizedWork,
      startMs: cursor,
      endMs: cursor + deps.workBlockMs,
      state: ScheduleBlockState.Scheduled,
      workItemId: task.workId,
    });
    if (!r.ok) {
      refusals.push(`schedule ${task.workId}: ${r.reason}`);
      continue;
    }
    calendar = r.calendar;
    note({
      kind: OrgEventKind.ScheduleBlockPlanned,
      subjectId: task.workId,
      actorHatId: task.assigneeHatId,
      decision: `booked ${deps.workBlockMs}ms of prioritized work`,
      toState: ScheduleBlockType.PrioritizedWork,
      atMs: cursor,
      fact: {
        kind: "block_planned",
        blockId,
        hatId: task.assigneeHatId!,
        blockType: ScheduleBlockType.PrioritizedWork,
        startMs: cursor,
        endMs: cursor + deps.workBlockMs,
        workItemId: task.workId,
      },
    });
    cursor += deps.workBlockMs;
  }

  const firstTask = staffedTasks[0];
  if (firstTask !== undefined) {
    const attendees = accountableHatsFor(cascade, firstTask.workId);
    const slot = firstCommonFreeSlot(
      calendar,
      attendees,
      warmedAt,
      warmedAt + 16 * deps.workBlockMs,
      deps.workBlockMs,
      deps.workBlockMs,
    );
    if (slot === undefined) refusals.push("no common slot for the accountable chain");
    else {
      // Hoisted so the event's fact can name the meeting and every leg it booked. Minting them
      // inside the call would leave the log describing blocks whose ids it does not know.
      const meetingId = deps.createId("mtg");
      const blockIds = attendees.map(() => deps.createId("blk"));
      const met = scheduleMeeting(calendar, {
        meetingId,
        attendeeHatIds: attendees,
        blockIds,
        startMs: slot,
        endMs: slot + deps.workBlockMs,
        workItemId: firstTask.workId,
      });
      if (!met.ok) refusals.push(`chain meeting: ${met.reason}`);
      else {
        calendar = met.calendar;
        for (const a of attendees) engage(a);
        note({
          kind: OrgEventKind.MeetingScheduled,
          subjectId: firstTask.workId,
          actorHatId: firstTask.ownerHatId,
          decision: `the accountable chain met: ${attendees.join(" → ")}`,
          atMs: slot,
          evidenceRefs: attendees,
          fact: {
            kind: "meeting_planned",
            meetingId,
            blockIds,
            attendeeHatIds: attendees,
            startMs: slot,
            endMs: slot + deps.workBlockMs,
            workItemId: firstTask.workId,
          },
        });
      }
    }
  }

  // ── 6. THE DEV'S OWN LOOP — what it is offered, and what it picks ────────
  // Placed HERE, before the work is executed, because that is what the loop is for. Running it
  // after the gates closed the tasks made it report "offered 0 items" on every tick — a postscript
  // rather than the thing that picks the work up.
  const loopTicks: OrgRuntimeReport["loopTicks"][number][] = [];
  const pickedBy = new Map<string, string>(); // workId -> agentId that picked it
  for (const b of bindings) {
    if (!isAuthorizing(b, warmedAt)) continue;
    // Per BINDING, naming the hat — an agent wearing two hats ticks once as each, not twice
    // as whichever binding came first.
    const bound = bindWearerToLoop(deps.chart, calendar, bindings, b.wearerAgentId, warmedAt, b.hatId);
    if (!bound.ok) {
      refusals.push(`loop for ${b.wearerAgentId}: ${bound.reason}`);
      continue;
    }
    // The projection is what this hat's own observe tick is offered; the binding is what it may do.
    const offered = projectFor(cascade, bound.hatId);
    const ready = offered.find((i) => i.ready);
    const closes =
      ready === undefined
        ? []
        : completionsFrom(cascade, bound.hatId, [{ kind: "do_item", item: { id: ready.id } }]);
    const picked = closes[0];
    if (picked !== undefined) pickedBy.set(picked, b.wearerAgentId);
    loopTicks.push({
      agentId: b.wearerAgentId,
      hatId: bound.hatId,
      offered: offered.length,
      ...(picked === undefined ? {} : { pickedWorkId: picked }),
    });
    note({
      kind: OrgEventKind.WorkClaimed,
      subjectId: picked ?? bound.hatId,
      actorHatId: bound.hatId,
      actorAgentId: b.wearerAgentId,
      decision: `offered ${offered.length} item(s); picked ${picked ?? "nothing"}`,
      atMs: warmedAt,
    });
  }

  // ── 7. MARKET — the work the loop picked becomes claimable shards ────────
  let queue = emptyQueue(deps.createId("q"), firstTask?.ownerHatId ?? "none", 1);
  for (const task of staffedTasks) {
    const r = addShard(queue, deps.createId("shard"), task.workId);
    if (!r.ok) refusals.push(`shard ${task.workId}: ${r.reason}`);
    else queue = r.queue;
  }

  const wearers = bindings.filter((b) => isAuthorizing(b, warmedAt)).map((b) => b.wearerAgentId);
  const reviewers = deps.agents.map((a) => a.agentId).filter((id) => !wearers.includes(id));

  for (const shard of [...queue.shards]) {
    // The agent that PICKED this work in its own loop tick is the one that claims it. Falling back
    // to "the first wearer" would let the market and the loop disagree about who is doing what.
    const wearer =
      pickedBy.get(shard.workId) ?? wearers[0];
    if (wearer === undefined) break;
    const claimed = claimShard(queue, {
      claimId: deps.createId("claim"),
      ownerAgentId: wearer,
      nowMs: warmedAt,
      leaseMs: deps.leaseMs,
      expectedRevision: queue.revision,
      shardId: shard.shardId,
    });
    if (!claimed.ok) {
      refusals.push(`claim ${shard.shardId}: ${claimed.reason}`);
      continue;
    }
    queue = claimed.queue;
    const done = completeClaim(queue, {
      claimId: claimed.claim.claimId,
      fencingToken: claimed.claim.fencingToken,
      nowMs: warmedAt + 1,
    });
    if (!done.ok) {
      refusals.push(`complete ${shard.shardId}: ${done.reason}`);
      continue;
    }
    queue = done.queue;
    // A reviewer who is not the claimant — the quorum rule refuses self-approval.
    const reviewer = reviewers[0];
    if (reviewer !== undefined) {
      const approved = approveShard(queue, { shardId: shard.shardId, byAgentId: reviewer, atMs: warmedAt + 2 });
      if (approved.ok) {
        queue = approved.queue;
        const merged = mergeShard(queue, shard.shardId);
        if (merged.ok) {
          queue = merged.queue;
          note({
            kind: OrgEventKind.ShardMerged,
            subjectId: shard.shardId,
            actorAgentId: reviewer,
            decision: `${wearer} completed it; ${reviewer} approved and it merged`,
            toState: "merged",
            atMs: warmedAt,
          });
        } else refusals.push(`merge ${shard.shardId}: ${merged.reason}`);
      } else refusals.push(`approve ${shard.shardId}: ${approved.reason}`);
    } else {
      refusals.push(`no reviewer other than the claimant for ${shard.shardId}`);
    }
  }
  // Reap anything left holding a lease, so a dead claimant's work returns to the pool.
  const reaped = reapStaleClaims(queue, warmedAt + deps.leaseMs + 1);
  queue = reaped.queue;
  if (reaped.reaped.length > 0) {
    note({
      kind: OrgEventKind.WorkCompleted,
      subjectId: queue.queueId,
      decision: `reaped ${reaped.reaped.length} stale claim(s)`,
      atMs: warmedAt,
      evidenceRefs: reaped.reaped,
    });
  }

  // ── 8 & 9. QA and the GATES ───────────────────────────────────────────────
  const qaReports: QaCycleReport[] = [];
  /**
   * The change opened for each task, kept so the same handle is the one merged later.
   *
   * Opened BEFORE the work runs, because `execute` is handed `{ branch }` and that context is a
   * promise: a branch the executor is told to work on has to exist while it works. Opening at
   * projection time instead — after the work — left every branch empty, which is a repository that
   * agrees with the record about nothing except the names.
   */
  const openedChanges = new Map<string, ChangeHandle>();
  const allCases: TestCase[] = [];
  const gateRuns: { taskId: string; run: GateRunResult }[] = [];
  const gateEvaluations: GateEvaluation[] = [];
  const gateBlocked: { taskId: string; gate: GateKind; recovery?: RecoveryPath }[] = [];
  const escalations: OrgRuntimeReport["escalations"][number][] = [];
  const maxAttempts = Math.max(1, deps.maxGateAttempts ?? 3);
  const threshold = deps.churnThreshold ?? DEFAULT_CHURN_THRESHOLD;

  for (const task of staffedTasks) {
    // QA derives its cases from the task's own criterion — the BRD stands in for the spec.
    const cases = deriveTestCases(
      {
        brdId: `brd-${task.workId}`,
        suiteId: `suite-${task.workId}`,
        authoredByHatId: "product_manager",
        acceptanceCriteria: [task.title],
      },
      deps.createId,
    );
    allCases.push(...cases);

    const qa = await runQaCycle({
      cases,
      priorRuns: [],
      // The QA cycle keeps its own `TestExecutor` shape; the PORT is what answers it. A refusal
      // from the runner is a test that could not be run, which is not the same as a failing test —
      // so it becomes `Errored` and carries the reason, rather than a quiet `Failed` that would
      // blame the code for a missing binary.
      executor: {
        execute: async (testCase, ctx) => {
          const r = await providers.tests.run(testCase, ctx);
          if (!r.ok) {
            return {
              outcome: RunOutcome.Errored,
              evidence: [{ kind: "trace" as const, ref: `runner-refused:${r.reason}` }],
            };
          }
          return { outcome: r.value.outcome, evidence: r.evidence };
        },
      },
      branch: `work/${task.workId}`,
      qaHatId: "qa_engineer",
      createId: deps.createId,
      nowMs: warmedAt,
    });
    qaReports.push(qa);
    engage("qa_engineer");
    const qaVerdict = gateOutcomeFor(qa);
    note({
      kind: OrgEventKind.TestRunRecorded,
      subjectId: task.workId,
      actorHatId: "qa_engineer",
      decision: `${qa.passed}/${qa.runs.length} passed → ${qaVerdict.outcome}`,
      toState: qaVerdict.outcome,
      atMs: warmedAt,
      evidenceRefs: qa.runs.flatMap((r) => r.evidence.map((e) => e.ref)),
      // The prose says how many passed; the FACT carries the runs. Without it a resumed run has no
      // QA history at all, and `regressions` — which is *passed before, fails now* — has no
      // "before" to compare against, so every regression would read as a feature that never worked.
      fact: { kind: "qa_cycle", report: qa },
    });

    // THE GATE READS QA. Runtime validation is not a choice when there is evidence.
    const chooser: OrgChooser<GateOutcome> =
      deps.gateChooser ??
      ((legal, ctx) => {
        if (ctx.includes(GateKind.RuntimeValidation)) {
          const i = legal.indexOf(qaVerdict.outcome);
          return i < 0
            ? { index: legal.indexOf(GateOutcome.Rejected), reason: qaVerdict.reason }
            : { index: i, reason: qaVerdict.reason };
        }
        return { index: legal.indexOf(GateOutcome.Approved), reason: "reviewed" };
      });

    let merged = false;
    for (let attempt = 1; attempt <= maxAttempts && !merged; attempt += 1) {
      const run = runGateChain(deps.chart, {
        workId: task.workId,
        chooser,
        atMs: warmedAt,
        // Separation of duties: whoever did the work does not review it.
        proposerHatId: task.assigneeHatId ?? NO_PROPOSER,
      });
      gateRuns.push({ taskId: task.workId, run });
      gateEvaluations.push(...run.evaluations);
      for (const e of run.evaluations) engage(e.byHatId);
      // The verdicts as DATA, so the log can rebuild them. The summary events below stay the human
      // reading of what the chain did.
      if (run.evaluations.length > 0) {
        note({
          kind: OrgEventKind.QualityGateEvaluation,
          subjectId: task.workId,
          actorHatId: run.evaluations[run.evaluations.length - 1]?.byHatId,
          decision: `${run.evaluations.length} gate verdict(s) recorded`,
          atMs: warmedAt,
          fact: { kind: "gates_evaluated", evaluations: run.evaluations },
        });
      }
      for (const r of run.refusals) refusals.push(`gates for ${task.workId}: ${r}`);
      if (run.merged) {
        merged = true;
        break;
      }
      if (run.blockedAt !== undefined) {
        gateBlocked.push({
          taskId: task.workId,
          gate: run.blockedAt,
          ...(run.recovery === undefined ? {} : { recovery: run.recovery }),
        });
      }
      note({
        kind: OrgEventKind.QualityGateEvaluation,
        subjectId: task.workId,
        actorHatId: run.evaluations[run.evaluations.length - 1]?.byHatId,
        decision: `turned back at ${run.blockedAt ?? "?"} (attempt ${attempt})`,
        fromState: run.blockedAt,
        toState: "rejected",
        atMs: warmedAt,
      });
      if (run.refusals.length > 0) break;
      if (!detectChurn(task.workId, gateEvaluations, threshold)) continue;

      // ── 10. ESCALATE ──────────────────────────────────────────────────────
      const decider = escalationDeciderFor(deps.chart, task.ownerHatId);
      if (decider === undefined) {
        refusals.push(`churn on ${task.workId}: nobody may decide an escalation`);
        break;
      }
      const esc = decideEscalation(deps.chart, {
        trigger: EscalationTrigger.RepeatedGateRejection,
        workId: task.workId,
        ownerHatIds: [task.ownerHatId],
        deciderHatId: decider.id,
        chooser: deps.escalationChooser ?? firstLegalChooser(),
        ...(run.blockedAt === undefined ? {} : { reopenGate: run.blockedAt }),
      });
      if (!esc.ok) {
        refusals.push(`escalating ${task.workId}: ${esc.reason}`);
        break;
      }
      escalations.push({ taskId: task.workId, action: esc.action, effect: esc.effect, byHatId: esc.byHatId });
      engage(esc.byHatId);
      note({
        kind: OrgEventKind.EscalationDecision,
        subjectId: task.workId,
        actorHatId: esc.byHatId,
        decision: `escalated → ${esc.action} (${esc.effect})`,
        fromState: EscalationTrigger.RepeatedGateRejection,
        toState: esc.action,
        atMs: warmedAt,
      });
      break;
    }

    if (!merged) continue;

    // The change is opened FIRST, so the branch the executor is about to be handed exists.
    const branch = `work/${task.workId}`;
    const opened = await providers.change.open(task, { branch });
    if (!opened.ok) {
      refusals.push(`change control '${providers.change.meta.name}' could not open ${branch}: ${opened.reason}`);
      continue;
    }
    openedChanges.set(task.workId, opened.value);

    // THE WORK IS PERFORMED HERE — or, with the simulated executor, assumed. Either way it is the
    // PORT that decides, so a task no longer completes merely by reaching this line.
    const performed = await providers.work.execute(task, { branch });
    if (!performed.ok) {
      refusals.push(`work executor '${providers.work.meta.name}' on ${task.workId}: ${performed.reason}`);
      continue;
    }
    if (!performed.value.succeeded) {
      note({
        kind: OrgEventKind.WorkItemTransition,
        subjectId: task.workId,
        actorHatId: task.assigneeHatId,
        decision: `work did not succeed: ${performed.value.summary}`,
        atMs: warmedAt,
        evidenceRefs: performed.evidence.map((e) => e.ref),
      });
      continue;
    }

    const closed = setState(cascade, task.workId, WorkState.Done);
    if (!closed.ok) refusals.push(`complete ${task.workId}: ${closed.reason}`);
    else {
      cascade = closed.cascade;
      note({
        kind: OrgEventKind.QualityGateEvaluation,
        subjectId: task.workId,
        actorHatId: task.ownerHatId,
        decision: `passed all ${ORDERED_GATES_COUNT} gates and is done`,
        toState: WorkState.Done,
        atMs: warmedAt,
        fact: { kind: "work_state", workId: task.workId, state: WorkState.Done },
      });
    }
  }

  // ── SUCCESSION — what happens to the hats when the bindings end ───────────
  const succession: SuccessionPlan[] = [];
  for (const b of bindings) {
    const hat = deps.chart.byId.get(b.hatId);
    if (hat === undefined) continue;
    const released = releaseBinding(b, hat, warmedAt + timingFor(hat).ttlMs, "cycle complete");
    if (!released.ok) continue;
    succession.push(
      planSuccession({
        hat,
        candidateAgentIds: deps.agents.map((a) => a.agentId),
        lastWearerAgentId: b.wearerAgentId,
      }),
    );
  }
  for (const plan of succession) {
    const holder = bindingForHat(bindings, plan.hatId);
    note({
      kind: OrgEventKind.SuccessionPlanned,
      subjectId: plan.hatId,
      actorHatId: plan.hatId,
      decision:
        plan.nextWearerAgentId !== undefined
          ? `succession (${plan.policy}): ${plan.nextWearerAgentId} is next`
          : `succession (${plan.policy}): awaiting an authority among ${plan.candidateAgentIds.length} candidate(s)`,
      toState: plan.nextWearerAgentId ?? "undecided",
      atMs: warmedAt,
      evidenceRefs: plan.candidateAgentIds,
    });
    if (holder !== undefined) {
      note({
        kind: OrgEventKind.HatBindingTransition,
        subjectId: holder.bindingId,
        actorHatId: plan.hatId,
        actorAgentId: holder.wearerAgentId,
        decision: `still worn until the lease ends`,
        toState: holder.phase,
        atMs: warmedAt,
      });
    }
  }

  // ── The work MARKET, recorded so a resumed run inherits it ────────────────
  // Emitted here rather than at each shard transition: `work-market.ts` owns those transitions, and
  // a fold that replayed them would be a second copy of that state machine, free to drift. One
  // snapshot, one authority, and a round trip that can be checked.
  note({
    kind: OrgEventKind.QueueSnapshot,
    subjectId: queue.queueId,
    actorHatId: queue.hatId,
    decision:
      `queue at revision ${String(queue.revision)}: ${String(queue.shards.length)} shard(s), ` +
      `${String(queue.claims.length)} claim(s), ${String(queue.approvals.length)} approval(s)`,
    atMs: warmedAt,
    fact: { kind: "queue_snapshot", queue },
  });

  // ── The work as a real CHANGE ─────────────────────────────────────────────
  /** The changes the CHANGE-CONTROL PORT actually opened and merged — not the ones projected. */
  const changesLanded: string[] = [];
  const changes = projectAll({
    cascade,
    queue,
    gateEvaluations,
    pickedBy,
    nowMs: warmedAt,
  });
  for (const c of changes) {
    note({
      kind: OrgEventKind.ChangeProjected,
      subjectId: c.workId,
      decision: `change is ${c.projection.state.tag}`,
      toState: c.projection.state.tag,
      atMs: warmedAt,
      evidenceRefs: c.projection.applied.map((a) => a.tag),
    });
    // A disagreement between the organization and its change record is the one thing change control
    // exists to catch, so it is a refusal rather than a line in the log.
    for (const d of c.disagreements) refusals.push(`change control ${c.workId}: ${d}`);

    // ...and then the CHANGE-CONTROL PORT makes the record true somewhere real.
    //
    // Without this the port would be decorative: `fidelityOf` would print `change_control … real`
    // on a run where nothing ever branched, which is the exact misreading the whole layer exists to
    // prevent — a report naming a capability that never ran. A projection that reached `Merged`
    // therefore has to be openable and mergeable, and a refusal CONTRADICTS the claim rather than
    // being logged beside it: `landed` is what the port did, never what the organization decided.
    if (c.projection.state.tag !== "Merged") continue;
    // The handle from when the work STARTED, not a fresh one. Re-opening here would branch off
    // whatever the repository looks like now and merge something that never held the work.
    const handle = openedChanges.get(c.workId);
    if (handle === undefined) {
      refusals.push(`change control ${c.workId}: projected as merged, but no change was ever opened for it`);
      continue;
    }
    const landed = await providers.change.merge(handle);
    if (!landed.ok) {
      refusals.push(`change control '${providers.change.meta.name}' could not merge ${handle.branch}: ${landed.reason}`);
      continue;
    }
    changesLanded.push(c.workId);
  }

  const delivered = isDelivered(cascade, goalId);
  note({
    kind: OrgEventKind.WorkItemTransition,
    subjectId: goalId,
    actorHatId: deps.acceptingHatId,
    decision: delivered ? "goal DELIVERED" : "goal not delivered",
    toState: delivered ? "delivered" : "open",
    atMs: warmedAt,
  });

  // ── Phase 11 — the organization MOVES ──────────────────────────────────────
  // Batches are built from the cascade's own projects rather than declared, so the reactor works
  // the same work the rest of the run produced. Its trace and refusals join this run's: a stall
  // noticed here is part of what happened, not a separate report nobody reads.
  const reactor = runReactor(
    {
      chart: deps.chart,
      cascade,
      testRuns: qaReports.flatMap((q) => q.runs),
      gateEvaluations,
      createId: deps.createId,
      nowMs: warmedAt,
      ...(deps.actionChooser === undefined ? {} : { actionChooser: deps.actionChooser }),
      ...(deps.blockerFor === undefined ? {} : { blockerFor: deps.blockerFor }),
      ...(deps.depResolved === undefined ? {} : { depResolved: deps.depResolved }),
    },
    batchesFromCascade(cascade, deps.createId),
  );
  trace.push(...reactor.trace);
  refusals.push(...reactor.refusals);

  return {
    intakeAccepted: accepted,
    intakeRefused: refusedIntake,
    priorities: ordered,
    goalWorkId: goalId,
    cascade,
    bindings,
    succession,
    calendar,
    board,
    queue,
    queueReadout: readout(queue, warmedAt + deps.leaseMs + 1),
    qa: qaReports,
    testCases: allCases,
    gateRuns,
    gateEvaluations,
    gateBlocked,
    escalations,
    signals,
    loopTicks,
    levelsEngaged: [...levels].sort((a, b) => LEVEL_ORDER.indexOf(a) - LEVEL_ORDER.indexOf(b)),
    changes,
    changesLanded,
    delivered,
    trace,
    events: trace.map(render),
    refusals,
    reactor,
    fidelity,
  };
}

/** Everyone who could be staffed, one agent per individual-contributor hat. */
export function agentsFromChart(chart: OrgChart, prefix = "agent"): readonly OrgAgent[] {
  return chart.hats
    .filter((h) => h.level === "individual_contributor")
    .map((h) => ({ agentId: `${prefix}-${h.id}`, hatId: h.id }));
}

/** Who may evaluate each gate in this chart — a staffing readout for the RMO. */
export function gateStaffing(chart: OrgChart): Readonly<Record<string, readonly string[]>> {
  const out: Record<string, readonly string[]> = {};
  for (const gate of Object.values(GateKind)) {
    out[gate] = gateOwners(chart, gate).map((h) => h.id);
  }
  return out;
}

/** Candidates eligible for a hat right now, with reasons for everyone excluded. */
export function staffingReadout(
  chart: OrgChart,
  hatId: string,
  agents: readonly OrgAgent[],
  bindings: readonly HatBinding[],
  nowMs: number,
) {
  const hat = chart.byId.get(hatId);
  if (hat === undefined) return undefined;
  return eligibleFor({
    chart,
    hat,
    candidates: agents.map((a) => ({ agentId: a.agentId, hatId: a.hatId })),
    bindings,
    nowMs,
  });
}
