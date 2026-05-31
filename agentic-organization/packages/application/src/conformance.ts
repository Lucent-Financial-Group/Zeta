import {
  ChangeSetPhase,
  DocLifecycleState,
  GraphConfidence,
  MemoryPhase,
  OrgEventKind,
  WorkItemState,
  baseLegalNextStates,
  legalChangeSetTransitions,
  legalConfidencePromotions,
  legalDocTransitions,
  legalMemoryTransitions,
  type ChangeSet,
  type OrgEvent,
  type OrgEventTransitionContext,
  type ReviewPipeline,
} from "../../domain/src/index.ts";

export type ConformanceViolation = {
  eventId: string;
  kind: OrgEventKind;
  subjectId: string;
  fromState: string;
  toState: string;
  legalToStates: readonly string[];
  reason: string;
};

export type ConformanceSkip = {
  eventId: string;
  kind: OrgEventKind;
  subjectId: string;
  reason: string;
  ambiguous: boolean;
};

export type ConformanceReport = {
  checked: number;
  conformant: number;
  nonconformant: number;
  skipped: number;
  skippedAmbiguous: number;
  coverageRatio: number;
  ratchetViolated: boolean;
  ratchetViolation?: {
    maxSkippedAmbiguous: number;
    skippedAmbiguous: number;
  };
  skipReasonCounts: Readonly<Record<string, number>>;
  violations: readonly ConformanceViolation[];
  skips: readonly ConformanceSkip[];
};

type TransitionCheck =
  | { kind: "checked"; legalToStates: readonly string[]; reason: string }
  | { kind: "skipped"; reason: string; ambiguous: boolean };

export type ReplayLedgerOptions = {
  maxSkippedAmbiguous?: number;
};

const ChangeTransitionKinds = new Set<OrgEventKind>([
  OrgEventKind.ChangeSetOpened,
  OrgEventKind.ChangesRequested,
  OrgEventKind.ChangeSetApproved,
  OrgEventKind.ChangeSetApplied,
  OrgEventKind.ChangeSetRejected,
]);

const MemoryTransitionKinds = new Set<OrgEventKind>([
  OrgEventKind.MemoryPhaseTransition,
  OrgEventKind.MemoryArchived,
  OrgEventKind.MemoryPromoted,
  OrgEventKind.MemoryDemoted,
  OrgEventKind.MemoryConflictFlagged,
]);

const DocTransitionKinds = new Set<OrgEventKind>([
  OrgEventKind.DocLifecycleTransition,
  OrgEventKind.DocCanonicalized,
  OrgEventKind.DocSuperseded,
  OrgEventKind.DocStaleFlagged,
  OrgEventKind.DocArchived,
]);

const GraphTransitionKinds = new Set<OrgEventKind>([
  OrgEventKind.GraphConfidencePromoted,
  OrgEventKind.GraphEdgeRetracted,
]);

const PendingReplayKernelTransitionKinds = new Set<OrgEventKind>([
  OrgEventKind.HatBindingTransition,
  OrgEventKind.PipelineStageTransition,
  OrgEventKind.WorkBatchTransition,
]);

const ExplicitNonTransitionKinds = new Set<OrgEventKind>([
  OrgEventKind.HatSupplyDecision,
  OrgEventKind.PriorityDecision,
  OrgEventKind.HatAssignment,
  OrgEventKind.QualityGateEvaluation,
  OrgEventKind.SuccessionPlanned,
  OrgEventKind.TestCaseAuthored,
  OrgEventKind.TestRunRecorded,
  OrgEventKind.RegressionDetected,
  OrgEventKind.DefectOpened,
  OrgEventKind.ChurnDetected,
  OrgEventKind.EscalationDecision,
  OrgEventKind.IntakeReceived,
  OrgEventKind.MemoryRetained,
  OrgEventKind.MemoryInjected,
  OrgEventKind.MemoryCited,
  OrgEventKind.MemoryOutcomeObserved,
  OrgEventKind.MemoryReinforced,
  OrgEventKind.MemoryMaintenanceCycle,
  OrgEventKind.ReviewStageAdvanced,
  OrgEventKind.ReviewFindingRaised,
  OrgEventKind.StageApproved,
  OrgEventKind.ProjectionCreated,
  OrgEventKind.ProjectionSynced,
  OrgEventKind.HumanSignoffRequested,
  OrgEventKind.DocIngested,
  OrgEventKind.DocClassified,
  OrgEventKind.DocConsulted,
  OrgEventKind.DocMaintenanceCycle,
  OrgEventKind.GraphNodeExtracted,
  OrgEventKind.GraphEdgeInferred,
  OrgEventKind.GraphDerivedIntelligence,
  OrgEventKind.ModelEvalCompleted,
  OrgEventKind.DecisionOptimizationProposed,
  OrgEventKind.RecoveryIncidentDetected,
  OrgEventKind.RecoveryScanCompleted,
  OrgEventKind.ObserveActTick,
]);

export function replayLedger(events: readonly OrgEvent[], options: ReplayLedgerOptions = {}): ConformanceReport {
  let checked = 0;
  let conformant = 0;
  const violations: ConformanceViolation[] = [];
  const skips: ConformanceSkip[] = [];

  for (const event of events) {
    const check = classifyTransition(event);
    if (check.kind === "skipped") {
      skips.push(skip(event, check.reason, check.ambiguous));
      continue;
    }

    checked += 1;
    if (check.legalToStates.includes(event.toState!)) {
      conformant += 1;
      continue;
    }

    violations.push({
      eventId: event.id,
      kind: event.kind,
      subjectId: event.subjectId,
      fromState: event.fromState!,
      toState: event.toState!,
      legalToStates: check.legalToStates,
      reason: check.reason,
    });
  }

  const skippedAmbiguous = skips.filter((entry) => entry.ambiguous).length;
  const coverageDenominator = checked + skippedAmbiguous;
  const ratchetViolated = options.maxSkippedAmbiguous !== undefined && skippedAmbiguous > options.maxSkippedAmbiguous;

  return {
    checked,
    conformant,
    nonconformant: violations.length,
    skipped: skips.length,
    skippedAmbiguous,
    coverageRatio: coverageDenominator === 0 ? 1 : checked / coverageDenominator,
    ratchetViolated,
    ...(ratchetViolated
      ? { ratchetViolation: { maxSkippedAmbiguous: options.maxSkippedAmbiguous!, skippedAmbiguous } }
      : {}),
    skipReasonCounts: countSkipReasons(skips),
    violations,
    skips,
  };
}

function classifyTransition(event: OrgEvent): TransitionCheck {
  if (!isReplayableTransitionKind(event.kind)) {
    if (PendingReplayKernelTransitionKinds.has(event.kind)) {
      return { kind: "skipped", reason: "event kind is a state-changing transition without a replay kernel", ambiguous: true };
    }
    if (ExplicitNonTransitionKinds.has(event.kind)) {
      return { kind: "skipped", reason: "event kind is explicitly classified as non-transition", ambiguous: false };
    }
    return { kind: "skipped", reason: "event kind is not classified as replayable or non-transition", ambiguous: true };
  }

  if (event.fromState === undefined || event.toState === undefined) {
    return { kind: "skipped", reason: "event does not carry from/to state", ambiguous: true };
  }

  if (event.fromState === event.toState) {
    return { kind: "skipped", reason: "event does not change state", ambiguous: false };
  }

  if (event.kind === OrgEventKind.WorkItemTransition) {
    if (!isWorkItemState(event.fromState) || !isWorkItemState(event.toState)) {
      return { kind: "skipped", reason: "event states do not name a known work-item transition", ambiguous: true };
    }
    return {
      kind: "checked",
      legalToStates: baseLegalNextStates(event.fromState),
      reason: "illegal work item transition",
    };
  }

  if (MemoryTransitionKinds.has(event.kind)) {
    if (!isMemoryPhase(event.fromState) || !isMemoryPhase(event.toState)) {
      return { kind: "skipped", reason: "event states do not name a known memory phase transition", ambiguous: true };
    }
    return {
      kind: "checked",
      legalToStates: legalMemoryTransitions(event.fromState).map((transition) => transition.to),
      reason: "illegal memory phase transition",
    };
  }

  if (ChangeTransitionKinds.has(event.kind)) {
    if (!isChangeSetPhase(event.fromState) || !isChangeSetPhase(event.toState)) {
      return { kind: "skipped", reason: "event states do not name a known change-set phase transition", ambiguous: true };
    }
    if (event.fromState === ChangeSetPhase.InReview && event.toState === ChangeSetPhase.Approved) {
      if (!isChangeSetReviewContext(event.transitionContext)) {
        return { kind: "skipped", reason: "change-set approval requires pipeline cursor replay context", ambiguous: true };
      }
      if (!isValidReviewCursor(event.transitionContext)) {
        return { kind: "skipped", reason: "change-set approval carries malformed pipeline cursor replay context", ambiguous: true };
      }
    }
    return {
      kind: "checked",
      legalToStates: legalChangeTargets(event.fromState, event.transitionContext),
      reason: "illegal change-set phase transition",
    };
  }

  if (DocTransitionKinds.has(event.kind)) {
    if (!isDocLifecycleState(event.fromState) || !isDocLifecycleState(event.toState)) {
      return { kind: "skipped", reason: "event states do not name a known document lifecycle transition", ambiguous: true };
    }
    if (event.fromState === DocLifecycleState.Draft && event.toState === DocLifecycleState.Active) {
      if (!isValidDocumentLifecycleContext(event.transitionContext)) {
        return { kind: "skipped", reason: "document draft->active requires load-bearing replay context", ambiguous: true };
      }
    }
    return {
      kind: "checked",
      legalToStates: legalDocTargets(event.fromState, event.transitionContext),
      reason: "illegal document lifecycle transition",
    };
  }

  if (GraphTransitionKinds.has(event.kind)) {
    if (!isGraphConfidence(event.fromState) || !isGraphConfidence(event.toState)) {
      return { kind: "skipped", reason: "event states do not name a known graph confidence transition", ambiguous: true };
    }
    return {
      kind: "checked",
      legalToStates: legalConfidencePromotions(event.fromState),
      reason: "illegal graph confidence transition",
    };
  }
  return { kind: "skipped", reason: "event kind is not classified as replayable or non-transition", ambiguous: true };
}

function isReplayableTransitionKind(kind: OrgEventKind): boolean {
  return (
    kind === OrgEventKind.WorkItemTransition ||
    MemoryTransitionKinds.has(kind) ||
    ChangeTransitionKinds.has(kind) ||
    DocTransitionKinds.has(kind) ||
    GraphTransitionKinds.has(kind)
  );
}

export function unclassifiedOrgEventKinds(): readonly OrgEventKind[] {
  return Object.values(OrgEventKind).filter(
    (kind) => !isReplayableTransitionKind(kind) && !ExplicitNonTransitionKinds.has(kind) && !PendingReplayKernelTransitionKinds.has(kind),
  );
}

function legalChangeTargets(from: ChangeSetPhase, context: OrgEventTransitionContext | undefined): readonly ChangeSetPhase[] {
  const currentStageIndex = isChangeSetReviewContext(context) && isValidReviewCursor(context) ? context.currentStageIndex : 0;
  const stageCount = isChangeSetReviewContext(context) && isValidReviewCursor(context) ? context.stageCount : 2;
  return legalChangeSetTransitions(syntheticChangeSet(from, currentStageIndex), syntheticPipeline(stageCount));
}

function legalDocTargets(from: DocLifecycleState, context: OrgEventTransitionContext | undefined): readonly DocLifecycleState[] {
  if (isValidDocumentLifecycleContext(context)) {
    return legalDocTransitions(from, context.loadBearing);
  }

  return unique([...legalDocTransitions(from, true), ...legalDocTransitions(from, false)]);
}

function syntheticChangeSet(phase: ChangeSetPhase, currentStageIndex: number): ChangeSet {
  return {
    changeSetId: "synthetic",
    organizationId: "synthetic",
    workItemId: "synthetic",
    proposerHatId: "synthetic",
    title: "synthetic",
    targetRef: "synthetic",
    phase,
    pipelineId: "synthetic",
    currentStageIndex,
    artifacts: [],
    projections: [],
    revision: 1,
    openedAt: "2026-05-30T00:00:00.000Z",
    updatedAt: "2026-05-30T00:00:00.000Z",
  };
}

function syntheticPipeline(stageCount: number): ReviewPipeline {
  return {
    pipelineId: "synthetic",
    organizationId: "synthetic",
    stages: Array.from({ length: stageCount }, (_, index) => ({
      id: `stage-${index}`,
      ownerLabel: "synthetic",
      authority: { kind: "hat", hatId: "synthetic" },
      gate: "tests_green",
      blocking: true,
    })),
  };
}

function skip(event: OrgEvent, reason: string, ambiguous: boolean): ConformanceSkip {
  return {
    eventId: event.id,
    kind: event.kind,
    subjectId: event.subjectId,
    reason,
    ambiguous,
  };
}

function countSkipReasons(skips: readonly ConformanceSkip[]): Readonly<Record<string, number>> {
  const counts: Record<string, number> = {};
  for (const entry of skips) {
    counts[entry.reason] = (counts[entry.reason] ?? 0) + 1;
  }
  return counts;
}

function isChangeSetReviewContext(
  context: OrgEventTransitionContext | undefined,
): context is Extract<OrgEventTransitionContext, { kind: "change_set_review" }> {
  return context?.kind === "change_set_review";
}

function isDocumentLifecycleContext(
  context: OrgEventTransitionContext | undefined,
): context is Extract<OrgEventTransitionContext, { kind: "document_lifecycle" }> {
  return context?.kind === "document_lifecycle";
}

function isValidDocumentLifecycleContext(
  context: OrgEventTransitionContext | undefined,
): context is Extract<OrgEventTransitionContext, { kind: "document_lifecycle" }> {
  return isDocumentLifecycleContext(context) && typeof context.loadBearing === "boolean";
}

function isValidReviewCursor(context: Extract<OrgEventTransitionContext, { kind: "change_set_review" }>): boolean {
  return (
    Number.isInteger(context.currentStageIndex) &&
    Number.isInteger(context.stageCount) &&
    context.stageCount > 0 &&
    context.currentStageIndex >= 0 &&
    context.currentStageIndex < context.stageCount
  );
}

function unique<T extends string>(values: readonly T[]): readonly T[] {
  return [...new Set(values)];
}

function isWorkItemState(value: string): value is WorkItemState {
  return Object.values(WorkItemState).includes(value as WorkItemState);
}

function isMemoryPhase(value: string): value is MemoryPhase {
  return Object.values(MemoryPhase).includes(value as MemoryPhase);
}

function isChangeSetPhase(value: string): value is ChangeSetPhase {
  return Object.values(ChangeSetPhase).includes(value as ChangeSetPhase);
}

function isDocLifecycleState(value: string): value is DocLifecycleState {
  return Object.values(DocLifecycleState).includes(value as DocLifecycleState);
}

function isGraphConfidence(value: string): value is GraphConfidence {
  return Object.values(GraphConfidence).includes(value as GraphConfidence);
}
