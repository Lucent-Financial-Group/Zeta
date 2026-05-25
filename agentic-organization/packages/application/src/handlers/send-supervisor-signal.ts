import {
  AgenticAggregateType,
  AgenticEventType,
  CommandType,
  SupervisorSignalStatus,
  type AgenticActor,
  type AuditEvent,
  type OutboxEvent,
  type SupervisorChainLevel,
  type SupervisorSignal,
  type SupervisorSignalToolType,
} from "../../../domain/src/index.ts";
import { createAgenticEventEnvelope } from "../../../domain/src/index.ts";
import type { InMemoryOrganizationStore } from "../../../state/src/index.ts";
import { CommandResultStatus, type CommandResult } from "../command-result.ts";
import type { Clock, IdGenerator } from "../ports.ts";

export const IdPrefix = {
  SupervisorSignal: "supervisor-signal",
  AuditEvent: "audit",
  OutboxEvent: "outbox",
  Event: "evt",
} as const;

export type IdPrefix = (typeof IdPrefix)[keyof typeof IdPrefix];

export type SendSupervisorSignalCommand = {
  commandId: string;
  type: typeof CommandType.SendSupervisorSignal;
  idempotencyKey: string;
  requestHash: string;
  correlationId: string;
  causationId: string;
  traceId: string;
  organizationId: string;
  projectId: string;
  teamId: string;
  sourceLevel: SupervisorChainLevel;
  targetLevel: SupervisorChainLevel;
  targetHatAssignmentId: string;
  actor: AgenticActor;
  toolType: SupervisorSignalToolType;
  title: string;
  message: string;
  relatedWorkItemId: string;
};

export type SendSupervisorSignalDependencies = Clock &
  IdGenerator & {
    store: InMemoryOrganizationStore<CommandResult>;
  };

export function sendSupervisorSignal(
  command: SendSupervisorSignalCommand,
  dependencies: SendSupervisorSignalDependencies,
): CommandResult {
  const occurredAt = dependencies.now();
  const supervisorSignal: SupervisorSignal = {
    supervisorSignalId: dependencies.createId(IdPrefix.SupervisorSignal),
    organizationId: command.organizationId,
    projectId: command.projectId,
    teamId: command.teamId,
    sourceLevel: command.sourceLevel,
    targetLevel: command.targetLevel,
    targetHatAssignmentId: command.targetHatAssignmentId,
    sender: command.actor,
    toolType: command.toolType,
    status: SupervisorSignalStatus.Sent,
    title: command.title,
    message: command.message,
    relatedWorkItemId: command.relatedWorkItemId,
    createdAt: occurredAt,
  };

  const auditEvent: AuditEvent = {
    auditEventId: dependencies.createId(IdPrefix.AuditEvent),
    eventName: AgenticEventType.SupervisorSignalSent,
    aggregateId: supervisorSignal.supervisorSignalId,
    actor: command.actor,
    occurredAt,
  };

  const outboxEvent: OutboxEvent = {
    outboxEventId: dependencies.createId(IdPrefix.OutboxEvent),
    envelope: createAgenticEventEnvelope({
      eventId: dependencies.createId(IdPrefix.Event),
      eventType: AgenticEventType.SupervisorSignalSent,
      occurredAt,
      actor: command.actor,
      scope: {
        organizationId: command.organizationId,
        projectId: command.projectId,
        teamId: command.teamId,
        workItemId: command.relatedWorkItemId,
      },
      aggregate: {
        aggregateId: supervisorSignal.supervisorSignalId,
        aggregateType: AgenticAggregateType.SupervisorSignal,
        aggregateVersion: 1,
      },
      trace: {
        commandId: command.commandId,
        correlationId: command.correlationId,
        causationId: command.causationId,
        traceId: command.traceId,
        idempotencyKey: command.idempotencyKey,
      },
      payload: {
        sourceLevel: command.sourceLevel,
        targetLevel: command.targetLevel,
        targetHatAssignmentId: command.targetHatAssignmentId,
        toolType: command.toolType,
        status: SupervisorSignalStatus.Sent,
        title: command.title,
      },
    }),
  };

  dependencies.store.supervisorSignals.push(supervisorSignal);
  dependencies.store.auditEvents.push(auditEvent);
  dependencies.store.outboxEvents.push(outboxEvent);

  return {
    status: CommandResultStatus.Accepted,
    supervisorSignal,
    idempotency: {
      replayed: false,
    },
  };
}
