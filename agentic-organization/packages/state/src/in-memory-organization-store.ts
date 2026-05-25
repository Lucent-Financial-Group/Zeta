import type {
  AuditEvent,
  DiscussionAnchor,
  IdempotencyRecord,
  OutboxEvent,
  SupervisorSignal,
  WorkItem,
} from "../../domain/src/index.ts";

export type InMemoryOrganizationStore<Result = unknown> = {
  workItems: WorkItem[];
  supervisorSignals: SupervisorSignal[];
  discussionAnchors: DiscussionAnchor[];
  auditEvents: AuditEvent[];
  outboxEvents: OutboxEvent[];
  idempotencyRecords: Map<string, IdempotencyRecord<Result>>;
};

export function createInMemoryOrganizationStore<Result = unknown>(): InMemoryOrganizationStore<Result> {
  return {
    workItems: [],
    supervisorSignals: [],
    discussionAnchors: [],
    auditEvents: [],
    outboxEvents: [],
    idempotencyRecords: new Map<string, IdempotencyRecord<Result>>(),
  };
}
