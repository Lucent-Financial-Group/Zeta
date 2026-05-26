import { deepEqual, equal } from "node:assert/strict";
import { describe, test } from "node:test";

import { CommandResultStatus, type CommandResult } from "../../application/src/index.ts";
import {
  AgenticAggregateType,
  AgenticEventType,
  SupervisorChainLevel,
  SupervisorSignalStatus,
  SupervisorSignalToolType,
} from "../../domain/src/index.ts";
import {
  CockroachCommandStateStoreStatement,
  createCockroachCommandStateStoreFactory,
  type CockroachSqlExecutor,
} from "../src/cockroach-command-state-store.ts";

describe("cockroach command state store", () => {
  test("records command outcome in one transaction batch", async () => {
    const executor = createRecordingExecutor();
    const factory = createCockroachCommandStateStoreFactory<CommandResult>({
      executor,
    });
    const store = factory.createCommandStateStore();

    equal(await store.findIdempotencyRecord("idem-001"), undefined);

    await store.recordCommandOutcome({
      idempotencyRecord: {
        idempotencyKey: "idem-001",
        requestHash: "hash-001",
        result: {
          status: CommandResultStatus.Accepted,
          idempotency: {
            replayed: false,
          },
        },
      },
      effects: {
        supervisorSignals: [
          {
            supervisorSignalId: "supervisor-signal-001",
            organizationId: "org-lfg",
            projectId: "project-agentic-org",
            teamId: "team-runtime",
            sourceLevel: SupervisorChainLevel.TeamMember,
            targetLevel: SupervisorChainLevel.Manager,
            targetHatAssignmentId: "hat-assignment-em-001",
            sender: {
              agentId: "agent-developer-001",
              hatAssignmentId: "hat-assignment-dev-001",
            },
            toolType: SupervisorSignalToolType.ReportBlocker,
            status: SupervisorSignalStatus.Sent,
            title: "Blocked on scoped NATS publisher",
            message: "Need a scoped publisher decision.",
            relatedWorkItemId: "work-outbox-001",
            createdAt: "2026-05-25T20:00:00.000Z",
          },
        ],
        auditEvents: [
          {
            auditEventId: "audit-001",
            eventName: AgenticEventType.SupervisorSignalSent,
            aggregateId: "supervisor-signal-001",
            actor: {
              agentId: "agent-developer-001",
              hatAssignmentId: "hat-assignment-dev-001",
            },
            occurredAt: "2026-05-25T20:00:00.000Z",
          },
        ],
        outboxEvents: [
          {
            outboxEventId: "outbox-001",
            envelope: {
              eventId: "evt-001",
              eventType: AgenticEventType.SupervisorSignalSent,
              schemaVersion: "agentic.org.event.v1",
              occurredAt: "2026-05-25T20:00:00.000Z",
              actor: {
                agentId: "agent-developer-001",
                hatAssignmentId: "hat-assignment-dev-001",
              },
              scope: {
                organizationId: "org-lfg",
                projectId: "project-agentic-org",
                teamId: "team-runtime",
                workItemId: "work-outbox-001",
              },
              aggregate: {
                aggregateId: "supervisor-signal-001",
                aggregateType: AgenticAggregateType.SupervisorSignal,
                aggregateVersion: 1,
              },
              trace: {
                commandId: "cmd-001",
                correlationId: "corr-001",
                causationId: "cause-001",
                traceId: "trace-001",
                idempotencyKey: "idem-001",
              },
              replay: {
                isReplay: false,
              },
              payload: {
                title: "Blocked on scoped NATS publisher",
              },
            },
          },
        ],
      },
    });

    deepEqual(
      executor.statements.map((statement) => statement.name),
      [
        CockroachCommandStateStoreStatement.FindIdempotencyRecord,
        CockroachCommandStateStoreStatement.InsertIdempotencyRecord,
        CockroachCommandStateStoreStatement.InsertSupervisorSignal,
        CockroachCommandStateStoreStatement.InsertAuditEvent,
        CockroachCommandStateStoreStatement.InsertOutboxEvent,
      ],
    );
    deepEqual(
      executor.transactionStatements.map((statement) => statement.name),
      [
        CockroachCommandStateStoreStatement.InsertIdempotencyRecord,
        CockroachCommandStateStoreStatement.InsertSupervisorSignal,
        CockroachCommandStateStoreStatement.InsertAuditEvent,
        CockroachCommandStateStoreStatement.InsertOutboxEvent,
      ],
    );
    equal(executor.transactionStatements[0]?.sql.includes("INSERT INTO"), true);
    equal(executor.transactionStatements[0]?.sql.includes("UPSERT"), false);
  });
});

type RecordingCockroachSqlExecutor = CockroachSqlExecutor & {
  statements: { name: CockroachCommandStateStoreStatement; sql: string; parameters: readonly unknown[] }[];
  transactionStatements: { name: CockroachCommandStateStoreStatement; sql: string; parameters: readonly unknown[] }[];
};

function createRecordingExecutor(): RecordingCockroachSqlExecutor {
  const statements: { name: CockroachCommandStateStoreStatement; sql: string; parameters: readonly unknown[] }[] = [];
  const transactionStatements: {
    name: CockroachCommandStateStoreStatement;
    sql: string;
    parameters: readonly unknown[];
  }[] = [];

  return {
    statements,
    transactionStatements,
    execute: async (statement) => {
      statements.push(statement);
      return {
        rows: [],
      };
    },
    executeTransaction: async (transaction) => {
      transactionStatements.push(...transaction.statements);
      statements.push(...transaction.statements);
    },
  };
}
