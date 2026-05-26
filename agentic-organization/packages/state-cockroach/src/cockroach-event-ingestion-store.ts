import type { EventIngestionStore, InboxReceiptRecord, ReactionPlanRecord } from "../../state/src/index.ts";
import { CockroachTableName } from "./cockroach-schema.ts";

export const CockroachEventIngestionStoreStatement = {
  FindInboxReceipt: "find_inbox_receipt",
  InsertInboxReceipt: "insert_inbox_receipt",
  InsertReactionPlan: "insert_reaction_plan",
  MarkInboxReceiptProcessed: "mark_inbox_receipt_processed",
} as const;

export type CockroachEventIngestionStoreStatement =
  (typeof CockroachEventIngestionStoreStatement)[keyof typeof CockroachEventIngestionStoreStatement];

export type CockroachEventIngestionSqlStatement = {
  name: CockroachEventIngestionStoreStatement;
  sql: string;
  parameters: readonly unknown[];
};

export type CockroachEventIngestionSqlResult<Row = Record<string, unknown>> = {
  rows: readonly Row[];
};

export type CockroachEventIngestionSqlExecutor = {
  execute: <Row = Record<string, unknown>>(
    statement: CockroachEventIngestionSqlStatement,
  ) => Promise<CockroachEventIngestionSqlResult<Row>>;
};

export type CreateCockroachEventIngestionStoreInput = {
  executor: CockroachEventIngestionSqlExecutor;
};

export function createCockroachEventIngestionStore(
  input: CreateCockroachEventIngestionStoreInput,
): EventIngestionStore {
  return {
    findInboxReceipt: async (lookup) => {
      const result = await input.executor.execute<InboxReceiptRow>({
        name: CockroachEventIngestionStoreStatement.FindInboxReceipt,
        sql: CockroachEventIngestionStoreSql.FindInboxReceipt,
        parameters: [lookup.eventId, lookup.consumerName],
      });
      const row = result.rows[0];

      if (row === undefined) {
        return undefined;
      }

      return {
        eventId: row.event_id,
        consumerName: row.consumer_name,
        firstSeenAt: row.first_seen_at,
        payloadHash: row.payload_hash,
        ...(row.processed_at === undefined ? {} : { processedAt: row.processed_at }),
        ...(row.result === undefined ? {} : { result: row.result }),
      };
    },
    recordEventProcessingOutcome: async (outcome) => {
      const receipt = outcome.receipt;
      await input.executor.execute({
        name: CockroachEventIngestionStoreStatement.InsertInboxReceipt,
        sql: CockroachEventIngestionStoreSql.InsertInboxReceipt,
        parameters: [receipt.eventId, receipt.consumerName, receipt.firstSeenAt, receipt.payloadHash],
      });

      for (const reactionPlan of outcome.reactionPlans) {
        await input.executor.execute({
          name: CockroachEventIngestionStoreStatement.InsertReactionPlan,
          sql: CockroachEventIngestionStoreSql.InsertReactionPlan,
          parameters: [
            reactionPlan.reactionPlanId,
            reactionPlan.consumerName,
            reactionPlan.createdAt,
            reactionPlan.status,
            reactionPlan.action.triggerEventId,
            reactionPlan.action.organizationId,
            reactionPlan.action.projectId,
            reactionPlan.action.workItemId,
            reactionPlan.action,
          ],
        });
      }

      await input.executor.execute({
        name: CockroachEventIngestionStoreStatement.MarkInboxReceiptProcessed,
        sql: CockroachEventIngestionStoreSql.MarkInboxReceiptProcessed,
        parameters: [receipt.eventId, receipt.consumerName, outcome.processedAt, outcome.result],
      });
    },
  };
}

type InboxReceiptRow = {
  event_id: string;
  consumer_name: InboxReceiptRecord["consumerName"];
  first_seen_at: string;
  processed_at?: string;
  payload_hash: string;
  result?: InboxReceiptRecord["result"];
};

const CockroachEventIngestionStoreSql = {
  FindInboxReceipt: `
    SELECT event_id, consumer_name, first_seen_at, processed_at, payload_hash, result
    FROM ${CockroachTableName.InboxReceipts}
    WHERE event_id = $1
      AND consumer_name = $2
  `,
  InsertInboxReceipt: `
    INSERT INTO ${CockroachTableName.InboxReceipts} (
      event_id,
      consumer_name,
      first_seen_at,
      payload_hash
    ) VALUES ($1, $2, $3, $4)
  `,
  InsertReactionPlan: `
    INSERT INTO ${CockroachTableName.ReactionPlans} (
      reaction_plan_id,
      consumer_name,
      created_at,
      status,
      trigger_event_id,
      organization_id,
      project_id,
      work_item_id,
      action_json
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
  `,
  MarkInboxReceiptProcessed: `
    UPDATE ${CockroachTableName.InboxReceipts}
    SET
      processed_at = $3,
      result = $4
    WHERE event_id = $1
      AND consumer_name = $2
  `,
} as const;

export type { ReactionPlanRecord };
