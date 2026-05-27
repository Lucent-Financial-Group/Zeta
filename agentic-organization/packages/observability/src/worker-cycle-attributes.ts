import { WorkerFailureEvidenceKey, type WorkerFailureEvidence } from "../../domain/src/index.ts";

export const WorkerCycleAttributeKey = {
  Status: "agentic.worker.cycle.status",
  OutboxStatus: "agentic.worker.outbox.status",
  InboundPulledCount: "agentic.worker.inbound.pulled_count",
  InboundProcessedCount: "agentic.worker.inbound.processed_count",
  InboundDuplicateCount: "agentic.worker.inbound.duplicate_count",
  InboundPayloadConflictCount: "agentic.worker.inbound.payload_conflict_count",
  InboundFailedCount: "agentic.worker.inbound.failed_count",
  InboundReactionPlanCount: "agentic.worker.inbound.reaction_plan_count",
  FailureCount: "agentic.worker.failure_count",
  FirstFailureClaimId: "agentic.worker.failure.first_claim_id",
  FirstFailureCommandId: "agentic.worker.failure.first_command_id",
  FirstFailureCurrentClaimId: "agentic.worker.failure.first_current_claim_id",
  FirstFailureEventId: "agentic.worker.failure.first_event_id",
  FirstFailureLane: "agentic.worker.failure.first_lane",
  FirstFailureMessage: "agentic.worker.failure.first_message",
  FirstFailureOutboxEventId: "agentic.worker.failure.first_outbox_event_id",
  FirstFailurePublishedAt: "agentic.worker.failure.first_published_at",
  FirstFailureStage: "agentic.worker.failure.first_stage",
  FirstFailureTraceId: "agentic.worker.failure.first_trace_id",
} as const;

export type WorkerCycleAttributeKey = (typeof WorkerCycleAttributeKey)[keyof typeof WorkerCycleAttributeKey];

export type BuildWorkerCycleAttributesInput = {
  status: string;
  outboxStatus: string;
  inboundPulledCount: number;
  inboundProcessedCount: number;
  inboundDuplicateCount: number;
  inboundPayloadConflictCount: number;
  inboundFailedCount: number;
  inboundReactionPlanCount: number;
  failureCount: number;
  firstFailure?: WorkerCycleFailureAttributeInput | undefined;
};

export type WorkerCycleFailureAttributeInput = {
  evidence?: WorkerFailureEvidence;
  lane: string;
  message: string;
  stage?: string | undefined;
};

export type WorkerCycleAttributes = Partial<Record<WorkerCycleAttributeKey, string | number>>;

export function buildWorkerCycleAttributes(input: BuildWorkerCycleAttributesInput): WorkerCycleAttributes {
  const attributes: WorkerCycleAttributes = {
    [WorkerCycleAttributeKey.Status]: input.status,
    [WorkerCycleAttributeKey.OutboxStatus]: input.outboxStatus,
    [WorkerCycleAttributeKey.InboundPulledCount]: input.inboundPulledCount,
    [WorkerCycleAttributeKey.InboundProcessedCount]: input.inboundProcessedCount,
    [WorkerCycleAttributeKey.InboundDuplicateCount]: input.inboundDuplicateCount,
    [WorkerCycleAttributeKey.InboundPayloadConflictCount]: input.inboundPayloadConflictCount,
    [WorkerCycleAttributeKey.InboundFailedCount]: input.inboundFailedCount,
    [WorkerCycleAttributeKey.InboundReactionPlanCount]: input.inboundReactionPlanCount,
    [WorkerCycleAttributeKey.FailureCount]: input.failureCount,
  };

  if (input.firstFailure !== undefined) {
    attributes[WorkerCycleAttributeKey.FirstFailureLane] = input.firstFailure.lane;
    attributes[WorkerCycleAttributeKey.FirstFailureMessage] = input.firstFailure.message;
    if (input.firstFailure.stage !== undefined) {
      attributes[WorkerCycleAttributeKey.FirstFailureStage] = input.firstFailure.stage;
    }
    copyStringEvidenceAttribute({
      attributes,
      evidence: input.firstFailure.evidence,
      evidenceKey: WorkerFailureEvidenceKey.ClaimId,
      attributeKey: WorkerCycleAttributeKey.FirstFailureClaimId,
    });
    copyStringEvidenceAttribute({
      attributes,
      evidence: input.firstFailure.evidence,
      evidenceKey: WorkerFailureEvidenceKey.CommandId,
      attributeKey: WorkerCycleAttributeKey.FirstFailureCommandId,
    });
    copyStringEvidenceAttribute({
      attributes,
      evidence: input.firstFailure.evidence,
      evidenceKey: WorkerFailureEvidenceKey.CurrentClaimId,
      attributeKey: WorkerCycleAttributeKey.FirstFailureCurrentClaimId,
    });
    copyStringEvidenceAttribute({
      attributes,
      evidence: input.firstFailure.evidence,
      evidenceKey: WorkerFailureEvidenceKey.EventId,
      attributeKey: WorkerCycleAttributeKey.FirstFailureEventId,
    });
    copyStringEvidenceAttribute({
      attributes,
      evidence: input.firstFailure.evidence,
      evidenceKey: WorkerFailureEvidenceKey.OutboxEventId,
      attributeKey: WorkerCycleAttributeKey.FirstFailureOutboxEventId,
    });
    copyStringEvidenceAttribute({
      attributes,
      evidence: input.firstFailure.evidence,
      evidenceKey: WorkerFailureEvidenceKey.PublishedAt,
      attributeKey: WorkerCycleAttributeKey.FirstFailurePublishedAt,
    });
    copyStringEvidenceAttribute({
      attributes,
      evidence: input.firstFailure.evidence,
      evidenceKey: WorkerFailureEvidenceKey.TraceId,
      attributeKey: WorkerCycleAttributeKey.FirstFailureTraceId,
    });
  }

  return attributes;
}

type CopyStringEvidenceAttributeInput = {
  attributes: WorkerCycleAttributes;
  attributeKey: WorkerCycleAttributeKey;
  evidence: WorkerFailureEvidence | undefined;
  evidenceKey: WorkerFailureEvidenceKey;
};

function copyStringEvidenceAttribute(input: CopyStringEvidenceAttributeInput): void {
  const value = input.evidence?.[input.evidenceKey];

  if (typeof value === "string") {
    input.attributes[input.attributeKey] = value;
  }
}
