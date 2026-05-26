import {
  buildNatsConsumerBatchAttributes,
  buildWorkerCycleAttributes,
  type NatsConsumerBatchAttributes,
  type WorkerCycleAttributes,
} from "../../../packages/observability/src/index.ts";
import { OutboxPublishOutcomeStatus } from "../../../packages/messaging/src/index.ts";
import type {
  NatsJetStreamConsumeBatchResult,
  NatsJetStreamEventConsumer,
} from "../../../packages/messaging-nats/src/index.ts";
import {
  WorkerCycleStatus,
  type OrganizationWorkerHost,
  type WorkerCycleResult,
} from "../../../packages/workers/src/index.ts";

export const WorkerRuntimeStatus = {
  Degraded: "degraded",
  Healthy: "healthy",
} as const;

export type WorkerRuntimeStatus = (typeof WorkerRuntimeStatus)[keyof typeof WorkerRuntimeStatus];

export const WorkerRuntimeFailureStage = {
  NatsConsumer: "nats_consumer",
  OrganizationWorker: "organization_worker",
} as const;

export type WorkerRuntimeFailureStage = (typeof WorkerRuntimeFailureStage)[keyof typeof WorkerRuntimeFailureStage];

export const WorkerRuntimeConfigErrorCode = {
  InvalidNatsInboundBatchSize: "invalid_nats_inbound_batch_size",
  MissingEnvironment: "missing_environment",
  MissingNatsDurableName: "missing_nats_durable_name",
  MissingNatsStreamName: "missing_nats_stream_name",
  MissingOrganizationId: "missing_organization_id",
} as const;

export type WorkerRuntimeConfigErrorCode =
  (typeof WorkerRuntimeConfigErrorCode)[keyof typeof WorkerRuntimeConfigErrorCode];

export class WorkerRuntimeConfigError extends Error {
  readonly code: WorkerRuntimeConfigErrorCode;

  constructor(code: WorkerRuntimeConfigErrorCode) {
    super(`invalid worker runtime config: ${code}`);
    this.code = code;
  }
}

export const WorkerRuntimeTelemetryEventName = {
  NatsConsumerBatchProcessed: "agentic.worker.nats_consumer.batch_processed",
  WorkerCycleCompleted: "agentic.worker.cycle.completed",
} as const;

export type WorkerRuntimeTelemetryEventName =
  (typeof WorkerRuntimeTelemetryEventName)[keyof typeof WorkerRuntimeTelemetryEventName];

export type WorkerRuntimeTelemetryAttributes = WorkerCycleAttributes | NatsConsumerBatchAttributes;

export type WorkerRuntimeTelemetryRecord = {
  eventName: WorkerRuntimeTelemetryEventName;
  attributes: WorkerRuntimeTelemetryAttributes;
};

export type WorkerRuntimeTelemetrySink = {
  record: (record: WorkerRuntimeTelemetryRecord) => Promise<void>;
};

export type WorkerRuntimeConfig = {
  environment: string;
  natsInboundBatchSize: number;
  organizationId: string;
  natsStreamName: string;
  natsDurableName: string;
};

export type WorkerRuntimeFailure = {
  stage: WorkerRuntimeFailureStage;
  message: string;
};

export type WorkerRuntimeRunResult = {
  status: WorkerRuntimeStatus;
  workerCycle: WorkerCycleResult | undefined;
  natsConsumerBatch: NatsJetStreamConsumeBatchResult | undefined;
  failures: readonly WorkerRuntimeFailure[];
};

export type WorkerRuntime = {
  runOnce: () => Promise<WorkerRuntimeRunResult>;
};

export type CreateWorkerRuntimeInput = {
  config: WorkerRuntimeConfig;
  organizationWorkerHost: OrganizationWorkerHost;
  natsEventConsumer: NatsJetStreamEventConsumer;
  telemetrySink: WorkerRuntimeTelemetrySink;
};

export function createWorkerRuntime(input: CreateWorkerRuntimeInput): WorkerRuntime {
  validateWorkerRuntimeConfig(input.config);

  return {
    runOnce: async () => {
      const failures: WorkerRuntimeFailure[] = [];
      const workerCycle = await runOrganizationWorker({
        organizationWorkerHost: input.organizationWorkerHost,
        telemetrySink: input.telemetrySink,
        failures,
      });
      const natsConsumerBatch = await runNatsConsumer({
        config: input.config,
        natsEventConsumer: input.natsEventConsumer,
        telemetrySink: input.telemetrySink,
        failures,
      });

      return {
        status: resolveWorkerRuntimeStatus({
          workerCycle,
          natsConsumerBatch,
          failures,
        }),
        workerCycle,
        natsConsumerBatch,
        failures,
      };
    },
  };
}

function validateWorkerRuntimeConfig(config: WorkerRuntimeConfig): void {
  assertNonEmptyConfigValue(config.environment, WorkerRuntimeConfigErrorCode.MissingEnvironment);
  assertNonEmptyConfigValue(config.organizationId, WorkerRuntimeConfigErrorCode.MissingOrganizationId);
  assertNonEmptyConfigValue(config.natsStreamName, WorkerRuntimeConfigErrorCode.MissingNatsStreamName);
  assertNonEmptyConfigValue(config.natsDurableName, WorkerRuntimeConfigErrorCode.MissingNatsDurableName);

  if (!Number.isInteger(config.natsInboundBatchSize) || config.natsInboundBatchSize < 1) {
    throw new WorkerRuntimeConfigError(WorkerRuntimeConfigErrorCode.InvalidNatsInboundBatchSize);
  }
}

function assertNonEmptyConfigValue(value: string, code: WorkerRuntimeConfigErrorCode): void {
  if (value.trim().length === 0) {
    throw new WorkerRuntimeConfigError(code);
  }
}

type RunOrganizationWorkerInput = {
  organizationWorkerHost: OrganizationWorkerHost;
  telemetrySink: WorkerRuntimeTelemetrySink;
  failures: WorkerRuntimeFailure[];
};

async function runOrganizationWorker(input: RunOrganizationWorkerInput): Promise<WorkerCycleResult | undefined> {
  try {
    const workerCycle = await input.organizationWorkerHost.runOnce();
    await input.telemetrySink.record({
      eventName: WorkerRuntimeTelemetryEventName.WorkerCycleCompleted,
      attributes: buildWorkerCycleAttributes({
        status: workerCycle.status,
        outboxStatus: workerCycle.outbox?.status ?? OutboxPublishOutcomeStatus.Empty,
        inboundPulledCount: workerCycle.inbound.pulledCount,
        inboundProcessedCount: workerCycle.inbound.processedCount,
        inboundDuplicateCount: workerCycle.inbound.duplicateCount,
        inboundPayloadConflictCount: workerCycle.inbound.payloadConflictCount,
        inboundFailedCount: workerCycle.inbound.failedCount,
        inboundReactionPlanCount: workerCycle.inbound.reactionPlanCount,
        failureCount: workerCycle.failures.length,
      }),
    });
    return workerCycle;
  } catch (error) {
    input.failures.push({
      stage: WorkerRuntimeFailureStage.OrganizationWorker,
      message: extractErrorMessage(error),
    });
    return undefined;
  }
}

type RunNatsConsumerInput = {
  config: WorkerRuntimeConfig;
  natsEventConsumer: NatsJetStreamEventConsumer;
  telemetrySink: WorkerRuntimeTelemetrySink;
  failures: WorkerRuntimeFailure[];
};

async function runNatsConsumer(input: RunNatsConsumerInput): Promise<NatsJetStreamConsumeBatchResult | undefined> {
  try {
    const natsConsumerBatch = await input.natsEventConsumer.processNextBatch({
      batchSize: input.config.natsInboundBatchSize,
    });
    await input.telemetrySink.record({
      eventName: WorkerRuntimeTelemetryEventName.NatsConsumerBatchProcessed,
      attributes: buildNatsConsumerBatchAttributes({
        streamName: input.config.natsStreamName,
        durableName: input.config.natsDurableName,
        ...natsConsumerBatch,
      }),
    });
    return natsConsumerBatch;
  } catch (error) {
    input.failures.push({
      stage: WorkerRuntimeFailureStage.NatsConsumer,
      message: extractErrorMessage(error),
    });
    return undefined;
  }
}

type ResolveWorkerRuntimeStatusInput = {
  workerCycle: WorkerCycleResult | undefined;
  natsConsumerBatch: NatsJetStreamConsumeBatchResult | undefined;
  failures: readonly WorkerRuntimeFailure[];
};

function resolveWorkerRuntimeStatus(input: ResolveWorkerRuntimeStatusInput): WorkerRuntimeStatus {
  if (
    input.failures.length > 0 ||
    input.workerCycle?.status === WorkerCycleStatus.Degraded ||
    input.natsConsumerBatch?.failedCount !== 0 ||
    input.natsConsumerBatch?.deadLetteredCount !== 0
  ) {
    return WorkerRuntimeStatus.Degraded;
  }

  return WorkerRuntimeStatus.Healthy;
}

function extractErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}
