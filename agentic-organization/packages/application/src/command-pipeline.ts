import { CommandType } from "../../domain/src/index.ts";
import { createInMemoryOrganizationStore, type InMemoryOrganizationStore } from "../../state/src/index.ts";
import { CommandErrorCode, CommandResultStatus, type CommandResult } from "./command-result.ts";
import { sendSupervisorSignal, type SendSupervisorSignalCommand } from "./handlers/send-supervisor-signal.ts";
import type { Clock, IdGenerator } from "./ports.ts";

export type PipelineCommand = SendSupervisorSignalCommand;

export type CommandPipeline = {
  store: InMemoryOrganizationStore<CommandResult>;
  execute: (command: PipelineCommand) => CommandResult;
};

export function createCommandPipeline(dependencies: Clock & IdGenerator): CommandPipeline {
  const store = createInMemoryOrganizationStore<CommandResult>();

  return {
    store,
    execute: (command) => executeCommand(command, store, dependencies),
  };
}

function executeCommand(
  command: PipelineCommand,
  store: InMemoryOrganizationStore<CommandResult>,
  dependencies: Clock & IdGenerator,
): CommandResult {
  const existingRecord = store.idempotencyRecords.get(command.idempotencyKey);

  if (existingRecord?.requestHash === command.requestHash) {
    return {
      ...existingRecord.result,
      idempotency: {
        replayed: true,
      },
    };
  }

  if (existingRecord) {
    return {
      status: CommandResultStatus.Rejected,
      idempotency: {
        replayed: false,
      },
      error: {
        code: CommandErrorCode.IdempotencyConflict,
        message: "idempotency key was reused with a different request hash",
      },
    };
  }

  const result = dispatchCommand(command, store, dependencies);
  store.idempotencyRecords.set(command.idempotencyKey, {
    idempotencyKey: command.idempotencyKey,
    requestHash: command.requestHash,
    result,
  });

  return result;
}

function dispatchCommand(
  command: PipelineCommand,
  store: InMemoryOrganizationStore<CommandResult>,
  dependencies: Clock & IdGenerator,
): CommandResult {
  if (command.type === CommandType.SendSupervisorSignal) {
    return sendSupervisorSignal(command, {
      ...dependencies,
      store,
    });
  }

  return {
    status: CommandResultStatus.Rejected,
    idempotency: {
      replayed: false,
    },
    error: {
      code: CommandErrorCode.UnsupportedCommand,
      message: "unsupported command type",
    },
  };
}
