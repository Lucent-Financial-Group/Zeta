import type { AuditEvent, IdempotencyRecord, OutboxEvent, SupervisorSignal } from "../../domain/src/index.ts";

export type Clock = {
  now: () => string;
};

export type IdGenerator = {
  createId: (prefix: string) => string;
};

export type CommandEffects = {
  supervisorSignals: readonly SupervisorSignal[];
  auditEvents: readonly AuditEvent[];
  outboxEvents: readonly OutboxEvent[];
};

export type RecordCommandOutcomeInput<Result = unknown> = {
  idempotencyRecord: IdempotencyRecord<Result>;
  effects: CommandEffects;
};

export type CommandStateStore<Result = unknown> = {
  findIdempotencyRecord: (idempotencyKey: string) => Promise<IdempotencyRecord<Result> | undefined>;
  recordCommandOutcome: (input: RecordCommandOutcomeInput<Result>) => Promise<void>;
};

export type CommandStateStoreFactory<Result = unknown> = {
  createCommandStateStore: () => CommandStateStore<Result>;
};
