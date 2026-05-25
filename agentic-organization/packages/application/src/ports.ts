import type { AuditEvent, IdempotencyRecord, OutboxEvent, SupervisorSignal } from "../../domain/src/index.ts";

export type Clock = {
  now: () => string;
};

export type IdGenerator = {
  createId: (prefix: string) => string;
};

export type IdempotencyRecordStore<Result = unknown> = {
  findIdempotencyRecord: (idempotencyKey: string) => IdempotencyRecord<Result> | undefined;
  saveIdempotencyRecord: (record: IdempotencyRecord<Result>) => void;
};

export type SupervisorSignalStore = {
  appendSupervisorSignal: (supervisorSignal: SupervisorSignal) => void;
};

export type AuditEventStore = {
  appendAuditEvent: (auditEvent: AuditEvent) => void;
};

export type OutboxEventStore = {
  appendOutboxEvent: (outboxEvent: OutboxEvent) => void;
};

export type CommandStateStore<Result = unknown> = IdempotencyRecordStore<Result> &
  SupervisorSignalStore &
  AuditEventStore &
  OutboxEventStore;

export type CommandStateStoreFactory<Result = unknown> = {
  createCommandStateStore: () => CommandStateStore<Result>;
};
