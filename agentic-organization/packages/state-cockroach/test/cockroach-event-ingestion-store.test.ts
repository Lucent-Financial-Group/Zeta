import { deepEqual, equal } from "node:assert/strict";
import { describe, test } from "node:test";

import { ReactionPlanActionType, ReactionPlanReason, ReactionPlanStatus, RequiredHat } from "../../domain/src/index.ts";
import {
  EventIngestionOutcomeStatus,
  InboundEventConsumerName,
  type ReactionPlanRecord,
} from "../../state/src/index.ts";
import {
  CockroachEventIngestionStoreStatement,
  createCockroachEventIngestionStore,
  type CockroachEventIngestionSqlExecutor,
  type CockroachEventIngestionSqlStatement,
} from "../src/cockroach-event-ingestion-store.ts";

describe("cockroach event ingestion store", () => {
  test("implements inbox receipt and reaction plan persistence behind a SQL executor", async () => {
    const executor = createRecordingExecutor();
    const store = createCockroachEventIngestionStore({
      executor,
    });

    equal(
      await store.findInboxReceipt({
        eventId: "evt-supervisor-signal-001",
        consumerName: InboundEventConsumerName.V0AutomationPlanner,
      }),
      undefined,
    );
    await store.recordEventProcessingOutcome({
      receipt: {
        eventId: "evt-supervisor-signal-001",
        consumerName: InboundEventConsumerName.V0AutomationPlanner,
        firstSeenAt: "2026-05-25T22:00:00.000Z",
        payloadHash: "hash-evt-supervisor-signal-001",
      },
      reactionPlans: [createReactionPlanRecord()],
      processedAt: "2026-05-25T22:00:00.000Z",
      result: EventIngestionOutcomeStatus.Processed,
    });

    deepEqual(
      executor.statements.map((statement) => statement.name),
      [
        CockroachEventIngestionStoreStatement.FindInboxReceipt,
        CockroachEventIngestionStoreStatement.InsertInboxReceipt,
        CockroachEventIngestionStoreStatement.InsertReactionPlan,
        CockroachEventIngestionStoreStatement.MarkInboxReceiptProcessed,
      ],
    );
  });
});

type RecordingCockroachEventIngestionSqlExecutor = CockroachEventIngestionSqlExecutor & {
  statements: CockroachEventIngestionSqlStatement[];
};

function createRecordingExecutor(): RecordingCockroachEventIngestionSqlExecutor {
  const statements: CockroachEventIngestionSqlStatement[] = [];

  return {
    statements,
    execute: async (statement) => {
      statements.push(statement);

      return {
        rows: [],
      };
    },
  };
}

function createReactionPlanRecord(): ReactionPlanRecord {
  return {
    reactionPlanId: "reaction-plan-001",
    consumerName: InboundEventConsumerName.V0AutomationPlanner,
    createdAt: "2026-05-25T22:00:00.000Z",
    status: ReactionPlanStatus.Planned,
    action: {
      actionType: ReactionPlanActionType.CreateSupervisorTriage,
      triggerEventId: "evt-supervisor-signal-001",
      organizationId: "org-lfg",
      projectId: "project-agentic-org",
      teamId: "team-runtime",
      workItemId: "work-outbox-001",
      supervisorSignalId: "supervisor-signal-001",
      requiredHat: RequiredHat.EngineeringManager,
      reason: ReactionPlanReason.SupervisorSignalNeedsTriage,
    },
  };
}
