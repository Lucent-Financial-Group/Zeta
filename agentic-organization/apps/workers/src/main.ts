import { createHash, randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";

import type { AgenticEventEnvelope } from "../../../packages/domain/src/index.ts";
import type { EventPublisher } from "../../../packages/messaging/src/index.ts";
import type {
  NatsDeadLetterPublisher,
  NatsJetStreamPullConsumer,
} from "../../../packages/messaging-nats/src/index.ts";
import {
  ReactionPlanExecutionStatus,
  type EventPayloadHashCalculator,
  type ReactionPlanActionExecutorPort,
} from "../../../packages/runtime/src/index.ts";
import { createCockroachSqlExecutor } from "../../../packages/state-cockroach/src/index.ts";
import type { InboundEventSource } from "../../../packages/workers/src/index.ts";
import {
  createCockroachMigrationBootstrapper,
  type CreateCockroachMigrationBootstrapperInput,
} from "./adapters/cockroach-migration-bootstrapper.ts";
import {
  createCockroachReadinessProbe,
  type CreateCockroachReadinessProbeInput,
} from "./adapters/cockroach-readiness.ts";
import {
  createCockroachWorkerShutdownPort,
  createCockroachWorkerSqlClient,
  type CockroachWorkerShutdownPool,
  type CreateCockroachWorkerSqlClientInput,
} from "./adapters/cockroach-worker-client.ts";
import {
  createJsonWorkerTelemetrySink,
  type CreateJsonWorkerTelemetrySinkInput,
  type JsonWorkerTelemetryRecord,
} from "./adapters/json-worker-telemetry-sink.ts";
import {
  connectNatsWorkerAdapters,
  type ConnectNatsWorkerAdaptersInput,
  type NatsWorkerAdapters,
} from "./adapters/nats-worker-connection.ts";
import {
  createNatsJsTransportConnectionFactory,
  type CreateNatsJsTransportConnectionFactoryInput,
} from "./adapters/nats-js-transport-connection.ts";
import {
  createPgCockroachWorkerPool,
  type CreatePgCockroachWorkerPoolInput,
  type PgCockroachWorkerPool,
} from "./adapters/pg-cockroach-worker-pool.ts";
import { parseWorkerRuntimeConfigFromEnv, type WorkerProcessConfig, type WorkerProcessEnvironment } from "./config.ts";
import { composeDurableWorkerRuntimePorts } from "./durable-composition.ts";
import { composeWorkerRuntime } from "./composition.ts";
import {
  WorkerEntrypointExitCode,
  WorkerEntrypointSignalName,
  createWorkerProcessEntrypoint,
  type WorkerEntrypointSignalListener,
  type WorkerEntrypointSignalSource,
  type WorkerEntrypointSignalSubscription,
  type WorkerEntrypointSleeper,
} from "./worker-process-entrypoint.ts";
import {
  WorkerProcessLoopEventName,
  type WorkerProcessLoopObserver,
} from "./worker-process-loop.ts";
import { createWorkerProcess, type WorkerProcessShutdownPort } from "./worker-process.ts";

export const WorkerMainDefault = {
  IterationDelayMs: 1000,
  Sha256: "sha256",
} as const;

export const WorkerMainLogStream = {
  Stderr: "stderr",
  Stdout: "stdout",
} as const;

export type WorkerMainLogStream = (typeof WorkerMainLogStream)[keyof typeof WorkerMainLogStream];

export type WorkerMainLogRecord = {
  stream: WorkerMainLogStream;
  message: string;
};

export type WorkerMainLogger = {
  log: (record: WorkerMainLogRecord) => void;
};

export type WorkerMainSignalRegistrar = {
  on: (signal: WorkerEntrypointSignalName, listener: () => void) => void;
  off: (signal: WorkerEntrypointSignalName, listener: () => void) => void;
};

export type WorkerMainClock = {
  now: () => string;
  setTimeout: (callback: () => void, durationMs: number) => unknown;
  clearTimeout: (handle: unknown) => void;
};

export type WorkerMainConstructors = {
  createPgPool: (input: CreatePgCockroachWorkerPoolInput) => Promise<PgCockroachWorkerPool>;
  createSqlClient: (input: CreateCockroachWorkerSqlClientInput) => ReturnType<typeof createCockroachWorkerSqlClient>;
  connectNatsAdapters: (input: ConnectNatsWorkerAdaptersInput) => Promise<NatsWorkerAdapters>;
  createNatsTransportFactory: (
    input?: CreateNatsJsTransportConnectionFactoryInput,
  ) => ReturnType<typeof createNatsJsTransportConnectionFactory>;
  createTelemetrySink: (input: CreateJsonWorkerTelemetrySinkInput) => ReturnType<typeof createJsonWorkerTelemetrySink>;
  createMigrationBootstrapper: (
    input: CreateCockroachMigrationBootstrapperInput,
  ) => ReturnType<typeof createCockroachMigrationBootstrapper>;
  createReadinessProbe: (input: CreateCockroachReadinessProbeInput) => ReturnType<typeof createCockroachReadinessProbe>;
  createCockroachShutdownPort: (input: {
    pool: CockroachWorkerShutdownPool;
  }) => ReturnType<typeof createCockroachWorkerShutdownPort>;
};

export type WorkerMainDurablePorts = {
  inboundEventSource: InboundEventSource;
  reactionPlanActionExecutor: ReactionPlanActionExecutorPort;
  calculatePayloadHash: EventPayloadHashCalculator;
  createId: (prefix: string) => string;
};

export type RunMainDependencies = {
  env: WorkerProcessEnvironment;
  logger: WorkerMainLogger;
  signalRegistrar: WorkerMainSignalRegistrar;
  clock: WorkerMainClock;
  constructors: WorkerMainConstructors;
  durablePorts: WorkerMainDurablePorts;
  iterationDelayMs: number;
  maxCycles?: number | undefined;
};

export async function runMain(overrides?: Partial<RunMainDependencies>): Promise<number> {
  const deps = resolveRunMainDependencies(overrides);

  let config: WorkerProcessConfig;

  try {
    config = parseWorkerRuntimeConfigFromEnv(deps.env);
  } catch (error) {
    deps.logger.log({
      stream: WorkerMainLogStream.Stderr,
      message: `worker startup aborted: ${extractMainErrorMessage(error)}`,
    });

    return WorkerEntrypointExitCode.Degraded;
  }

  return await runWorkerWithResolvedConfig({
    config,
    deps,
  });
}

type RunWorkerWithResolvedConfigInput = {
  config: WorkerProcessConfig;
  deps: RunMainDependencies;
};

async function runWorkerWithResolvedConfig(input: RunWorkerWithResolvedConfigInput): Promise<number> {
  const { config, deps } = input;
  const telemetrySink = deps.constructors.createTelemetrySink({
    writer: createLoggerJsonLineWriter(deps.logger),
    now: deps.clock.now,
  });

  const pool = await deps.constructors.createPgPool({
    databaseUrl: config.cockroachDatabaseUrl,
  });
  const sqlClient = deps.constructors.createSqlClient({
    pool,
  });
  const cockroachExecutor = createCockroachSqlExecutor({
    client: sqlClient,
  });
  const natsAdapters = await deps.constructors.connectNatsAdapters({
    config: {
      durableName: config.natsDurableName,
      environment: config.environment,
      organizationId: config.organizationId,
      servers: config.natsServers,
      streamName: config.natsStreamName,
    },
    deadLetterMessageIdFactory: {
      createId: (message) => createSha256Digest(message.payload),
    },
    transportFactory: deps.constructors.createNatsTransportFactory(),
  });

  try {
    const runtimePorts = composeDurableWorkerRuntimePorts({
      config,
      durableAdapters: {
        cockroachExecutor,
        eventPublisher: natsAdapters.eventPublisher satisfies EventPublisher,
        inboundEventSource: deps.durablePorts.inboundEventSource,
        natsDeadLetterPublisher: natsAdapters.deadLetterPublisher satisfies NatsDeadLetterPublisher,
        natsPullConsumer: natsAdapters.pullConsumer satisfies NatsJetStreamPullConsumer,
        reactionPlanActionExecutor: deps.durablePorts.reactionPlanActionExecutor,
        telemetrySink,
      },
      runtimeUtilities: {
        calculatePayloadHash: deps.durablePorts.calculatePayloadHash,
        createId: deps.durablePorts.createId,
        now: deps.clock.now,
      },
    });
    const runtime = composeWorkerRuntime({
      config: {
        environment: config.environment,
        organizationId: config.organizationId,
        natsStreamName: config.natsStreamName,
        natsDurableName: config.natsDurableName,
        natsInboundBatchSize: config.natsInboundBatchSize,
      },
      ports: runtimePorts,
    });
    const process = createWorkerProcess({
      bootstrappers: [
        deps.constructors.createMigrationBootstrapper({
          executor: cockroachExecutor,
        }),
      ],
      readinessProbes: [
        deps.constructors.createReadinessProbe({
          client: sqlClient,
        }),
        natsAdapters.readinessProbe,
      ],
      runtime,
      shutdownPorts: collectShutdownPorts({
        deps,
        pool,
        natsAdapters,
      }),
    });

    const entrypoint = createWorkerProcessEntrypoint({
      process,
      observer: createMainLoopObserver(deps.logger),
      signalSource: createProcessSignalSource(deps.signalRegistrar),
      sleeper: createMainSleeper(deps.clock),
      iterationDelayMs: deps.iterationDelayMs,
      maxCycles: deps.maxCycles,
    });

    const result = await entrypoint.run();

    return result.exitCode;
  } catch (error) {
    deps.logger.log({
      stream: WorkerMainLogStream.Stderr,
      message: `worker run failed: ${extractMainErrorMessage(error)}`,
    });

    await disposeAfterFailureBestEffort({
      deps,
      pool,
      natsAdapters,
    });

    return WorkerEntrypointExitCode.Degraded;
  }
}

type CollectShutdownPortsInput = {
  deps: RunMainDependencies;
  pool: PgCockroachWorkerPool;
  natsAdapters: NatsWorkerAdapters;
};

function collectShutdownPorts(input: CollectShutdownPortsInput): readonly WorkerProcessShutdownPort[] {
  return [
    input.natsAdapters.shutdown,
    input.deps.constructors.createCockroachShutdownPort({
      pool: input.pool,
    }),
  ];
}

type DisposeAfterFailureBestEffortInput = {
  deps: RunMainDependencies;
  pool: PgCockroachWorkerPool;
  natsAdapters: NatsWorkerAdapters;
};

async function disposeAfterFailureBestEffort(input: DisposeAfterFailureBestEffortInput): Promise<void> {
  try {
    await input.natsAdapters.shutdown.shutdown();
  } catch (error) {
    input.deps.logger.log({
      stream: WorkerMainLogStream.Stderr,
      message: `nats shutdown after failure failed: ${extractMainErrorMessage(error)}`,
    });
  }

  try {
    await input.deps.constructors
      .createCockroachShutdownPort({
        pool: input.pool,
      })
      .shutdown();
  } catch (error) {
    input.deps.logger.log({
      stream: WorkerMainLogStream.Stderr,
      message: `cockroach shutdown after failure failed: ${extractMainErrorMessage(error)}`,
    });
  }
}

function createProcessSignalSource(registrar: WorkerMainSignalRegistrar): WorkerEntrypointSignalSource {
  return {
    subscribe: (signal, listener): WorkerEntrypointSignalSubscription => {
      const handler = () => {
        (listener satisfies WorkerEntrypointSignalListener)(signal);
      };
      registrar.on(signal, handler);

      return {
        dispose: () => {
          registrar.off(signal, handler);
        },
      };
    },
  };
}

function createMainSleeper(clock: WorkerMainClock): WorkerEntrypointSleeper {
  return {
    sleep: async (sleepInput) =>
      await new Promise<void>((resolve) => {
        if (sleepInput.stopSignal.isStopRequested()) {
          resolve();
          return;
        }

        const handle = clock.setTimeout(() => {
          resolve();
        }, sleepInput.durationMs);

        if (sleepInput.stopSignal.isStopRequested()) {
          clock.clearTimeout(handle);
          resolve();
        }
      }),
  };
}

function createMainLoopObserver(logger: WorkerMainLogger): WorkerProcessLoopObserver {
  return {
    record: async (record) => {
      logger.log({
        stream:
          record.eventName === WorkerProcessLoopEventName.IterationFailed
            ? WorkerMainLogStream.Stderr
            : WorkerMainLogStream.Stdout,
        message: `worker loop ${JSON.stringify(record)}`,
      });
    },
  };
}

function createLoggerJsonLineWriter(logger: WorkerMainLogger): CreateJsonWorkerTelemetrySinkInput["writer"] {
  return {
    write: async (record: JsonWorkerTelemetryRecord) => {
      logger.log({
        stream: WorkerMainLogStream.Stdout,
        message: JSON.stringify(record),
      });
    },
  };
}

function resolveRunMainDependencies(overrides: Partial<RunMainDependencies> | undefined): RunMainDependencies {
  return {
    env: overrides?.env ?? (process.env satisfies WorkerProcessEnvironment),
    logger: overrides?.logger ?? createDefaultWorkerMainLogger(),
    signalRegistrar: overrides?.signalRegistrar ?? createDefaultSignalRegistrar(),
    clock: overrides?.clock ?? createDefaultWorkerMainClock(),
    constructors: overrides?.constructors ?? createDefaultWorkerMainConstructors(),
    durablePorts: overrides?.durablePorts ?? createDefaultWorkerMainDurablePorts(),
    iterationDelayMs: overrides?.iterationDelayMs ?? WorkerMainDefault.IterationDelayMs,
    maxCycles: overrides?.maxCycles,
  };
}

function createDefaultWorkerMainLogger(): WorkerMainLogger {
  return {
    log: (record) => {
      if (record.stream === WorkerMainLogStream.Stderr) {
        process.stderr.write(`${record.message}\n`);
        return;
      }

      process.stdout.write(`${record.message}\n`);
    },
  };
}

function createDefaultSignalRegistrar(): WorkerMainSignalRegistrar {
  return {
    on: (signal, listener) => {
      process.on(signal, listener);
    },
    off: (signal, listener) => {
      process.off(signal, listener);
    },
  };
}

function createDefaultWorkerMainClock(): WorkerMainClock {
  return {
    now: () => new Date().toISOString(),
    setTimeout: (callback, durationMs) => setTimeout(callback, durationMs),
    clearTimeout: (handle) => {
      clearTimeout(handle as ReturnType<typeof setTimeout>);
    },
  };
}

function createDefaultWorkerMainConstructors(): WorkerMainConstructors {
  return {
    createPgPool: (input) => createPgCockroachWorkerPool(input),
    createSqlClient: (input) => createCockroachWorkerSqlClient(input),
    connectNatsAdapters: (input) => connectNatsWorkerAdapters(input),
    createNatsTransportFactory: (input) => createNatsJsTransportConnectionFactory(input),
    createTelemetrySink: (input) => createJsonWorkerTelemetrySink(input),
    createMigrationBootstrapper: (input) => createCockroachMigrationBootstrapper(input),
    createReadinessProbe: (input) => createCockroachReadinessProbe(input),
    createCockroachShutdownPort: (input) => createCockroachWorkerShutdownPort(input),
  };
}

function createDefaultWorkerMainDurablePorts(): WorkerMainDurablePorts {
  return {
    inboundEventSource: {
      pullNextBatch: async () => [],
    },
    reactionPlanActionExecutor: {
      executeReactionPlanAction: async () => ({
        status: ReactionPlanExecutionStatus.Succeeded,
        result: {
          message: "worker host accepted reaction plan action",
          createdWorkItemIds: [],
          createdDiscussionAnchorIds: [],
        },
      }),
    },
    calculatePayloadHash: (envelope: AgenticEventEnvelope) =>
      `${WorkerMainDefault.Sha256}:${createSha256Digest(JSON.stringify(envelope))}`,
    createId: (prefix) => `${prefix}-${randomUUID()}`,
  };
}

function createSha256Digest(value: string): string {
  return createHash(WorkerMainDefault.Sha256).update(value).digest("hex");
}

function extractMainErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}

function isMainModule(): boolean {
  const entryPoint = process.argv[1];

  if (entryPoint === undefined) {
    return false;
  }

  try {
    return fileURLToPath(new URL(import.meta.url)) === entryPoint;
  } catch {
    return false;
  }
}

if (isMainModule()) {
  void runMain().then((code) => {
    process.exit(code);
  });
}
