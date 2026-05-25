import type { AgenticEventEnvelope } from "../../domain/src/index.ts";
import type { OutboxEventSource } from "../../messaging/src/index.ts";
import { CockroachTableName } from "./cockroach-schema.ts";

export const CockroachOutboxEventSourceStatement = {
  ClaimUnpublishedOutboxEvents: "claim_unpublished_outbox_events",
  MarkOutboxEventPublished: "mark_outbox_event_published",
} as const;

export type CockroachOutboxEventSourceStatement =
  (typeof CockroachOutboxEventSourceStatement)[keyof typeof CockroachOutboxEventSourceStatement];

export type CockroachOutboxSqlStatement = {
  name: CockroachOutboxEventSourceStatement;
  sql: string;
  parameters: readonly unknown[];
};

export type CockroachOutboxSqlResult<Row = Record<string, unknown>> = {
  rows: readonly Row[];
};

export type CockroachOutboxSqlExecutor = {
  execute: <Row = Record<string, unknown>>(
    statement: CockroachOutboxSqlStatement,
  ) => Promise<CockroachOutboxSqlResult<Row>>;
};

export type CreateCockroachOutboxEventSourceInput = {
  executor: CockroachOutboxSqlExecutor;
};

export function createCockroachOutboxEventSource(input: CreateCockroachOutboxEventSourceInput): OutboxEventSource {
  return {
    claimUnpublishedOutboxEvents: async (claimInput) => {
      const result = await input.executor.execute<OutboxEventRow>({
        name: CockroachOutboxEventSourceStatement.ClaimUnpublishedOutboxEvents,
        sql: CockroachOutboxEventSourceSql.ClaimUnpublishedOutboxEvents,
        parameters: [claimInput.batchSize],
      });

      return result.rows.map((row) => ({
        outboxEventId: row.outbox_event_id,
        envelope: row.envelope_json,
      }));
    },
    markOutboxEventPublished: async (markInput) => {
      await input.executor.execute({
        name: CockroachOutboxEventSourceStatement.MarkOutboxEventPublished,
        sql: CockroachOutboxEventSourceSql.MarkOutboxEventPublished,
        parameters: [markInput.outboxEventId, markInput.publishedAt],
      });
    },
  };
}

type OutboxEventRow = {
  outbox_event_id: string;
  envelope_json: AgenticEventEnvelope;
};

const CockroachOutboxEventSourceSql = {
  ClaimUnpublishedOutboxEvents: `
    SELECT outbox_event_id, envelope_json
    FROM ${CockroachTableName.OutboxEvents}
    WHERE published_at IS NULL
    ORDER BY outbox_event_id
    LIMIT $1
  `,
  MarkOutboxEventPublished: `
    UPDATE ${CockroachTableName.OutboxEvents}
    SET published_at = $2
    WHERE outbox_event_id = $1
  `,
} as const;
