import { spawnSync as nodeSpawnSync } from "node:child_process";
import { readFileSync } from "node:fs";

/**
 * B-0891 scenario 3 QEMU state-preservation primitives.
 *
 * This file is deliberately a command planner, not a green runtime path:
 * it defines the qemu-img snapshot/restart sequence that scenario 3 emits
 * from run.ts, while the dispatcher keeps reformat-with-retention failing
 * closed until command execution and full serial-marker assertions are wired.
 */

export interface QemuCommand {
  readonly bin: "qemu-img" | "qemu-system-x86_64";
  readonly args: readonly string[];
}

export interface Qcow2SnapshotRetentionInput {
  readonly isoPath: string;
  readonly diskPath: string;
  readonly serialLogPath: string;
  readonly snapshotName: string;
  readonly memoryMB?: number;
  readonly cpuCount?: number;
  readonly kvmAvailable?: boolean;
}

export interface Qcow2SnapshotRetentionPlan {
  readonly isoPath: string;
  readonly diskPath: string;
  readonly serialLogPath: string;
  readonly snapshotName: string;
  readonly createBaselineSnapshot: QemuCommand;
  readonly restoreBaselineSnapshot: QemuCommand;
  readonly listSnapshots: QemuCommand;
  readonly restartFromIsoWithDisk: QemuCommand;
  readonly requiredSerialMarkers: readonly string[];
}

export type Qcow2SnapshotRetentionFeedback =
  | { readonly kind: "invalid-input"; readonly field: keyof Qcow2SnapshotRetentionInput; readonly reason: string };

export type Qcow2SnapshotRetentionResult =
  | { readonly ok: Qcow2SnapshotRetentionPlan }
  | { readonly error: Qcow2SnapshotRetentionFeedback };

export interface RetentionSerialMarkerAssertion {
  readonly matchedMarkers: readonly string[];
}

export type RetentionSerialMarkerFeedback =
  | {
      readonly kind: "missing-serial-markers";
      readonly missingMarkers: readonly string[];
      readonly requiredMarkers: readonly string[];
    };

export type RetentionSerialMarkerResult =
  | { readonly ok: RetentionSerialMarkerAssertion }
  | { readonly error: RetentionSerialMarkerFeedback };

export type Qcow2RetentionExecutionStep =
  | "create-baseline-snapshot"
  | "list-baseline-snapshots"
  | "restore-baseline-snapshot"
  | "restart-from-iso-with-disk";

export interface QemuCommandExecution {
  readonly step: Qcow2RetentionExecutionStep;
  readonly command: QemuCommand;
  readonly exitCode: number | null;
  readonly stdout: string;
  readonly stderr: string;
}

export interface Qcow2RetentionExecutor {
  readonly runCommand: (
    step: Qcow2RetentionExecutionStep,
    command: QemuCommand,
  ) => QemuCommandExecution;
  readonly readSerialOutput: (serialLogPath: string) => string;
}

export interface SpawnSyncQemuCommandOptions {
  readonly cwd?: string;
  readonly timeoutMs: number;
}

export interface SpawnSyncQemuCommandResult {
  readonly exitCode: number | null;
  readonly stdout: string;
  readonly stderr: string;
}

export type SpawnSyncQemuCommand = (
  command: QemuCommand,
  options: SpawnSyncQemuCommandOptions,
) => SpawnSyncQemuCommandResult;

export interface SpawnSyncQcow2RetentionExecutorOptions {
  readonly cwd?: string;
  readonly timeoutMs?: number;
  readonly spawnCommand?: SpawnSyncQemuCommand;
  readonly readSerialOutput?: (serialLogPath: string) => string;
}

export type Qcow2RetentionExecutionFeedback =
  | {
      readonly kind: "command-failed";
      readonly step: Qcow2RetentionExecutionStep;
      readonly command: QemuCommand;
      readonly exitCode: number | null;
      readonly stderr: string;
      readonly commandExecutions: readonly QemuCommandExecution[];
    }
  | {
      readonly kind: "executor-threw";
      readonly step: Qcow2RetentionExecutionStep | "read-serial-output";
      readonly reason: string;
      readonly commandExecutions: readonly QemuCommandExecution[];
    }
  | {
      readonly kind: "serial-marker-failed";
      readonly assertion: RetentionSerialMarkerFeedback;
      readonly commandExecutions: readonly QemuCommandExecution[];
    };

export interface Qcow2RetentionExecutionAssertion {
  readonly commandExecutions: readonly QemuCommandExecution[];
  readonly serialAssertion: RetentionSerialMarkerAssertion;
}

export type Qcow2RetentionExecutionResult =
  | { readonly ok: Qcow2RetentionExecutionAssertion }
  | { readonly error: Qcow2RetentionExecutionFeedback };

const DEFAULT_MEMORY_MB = 4096;
const DEFAULT_CPU_COUNT = 2;
const DEFAULT_RETENTION_COMMAND_TIMEOUT_MS = 30 * 60 * 1000;

export const RETENTION_SERIAL_MARKERS: readonly string[] = [
  "zeta-creds-restore:",
  "already-present",
];

function nonEmpty(value: string): boolean {
  return value.trim().length > 0;
}

function positiveInteger(value: number): boolean {
  return Number.isInteger(value) && value > 0;
}

function validateInput(input: Qcow2SnapshotRetentionInput): Qcow2SnapshotRetentionFeedback | null {
  if (!nonEmpty(input.isoPath)) {
    return { kind: "invalid-input", field: "isoPath", reason: "ISO path is required" };
  }
  if (!nonEmpty(input.diskPath)) {
    return { kind: "invalid-input", field: "diskPath", reason: "qcow2 disk path is required" };
  }
  if (!nonEmpty(input.serialLogPath)) {
    return { kind: "invalid-input", field: "serialLogPath", reason: "serial log path is required" };
  }
  if (!nonEmpty(input.snapshotName)) {
    return { kind: "invalid-input", field: "snapshotName", reason: "snapshot name is required" };
  }
  if (input.memoryMB !== undefined && !positiveInteger(input.memoryMB)) {
    return { kind: "invalid-input", field: "memoryMB", reason: "memoryMB must be a positive integer" };
  }
  if (input.cpuCount !== undefined && !positiveInteger(input.cpuCount)) {
    return { kind: "invalid-input", field: "cpuCount", reason: "cpuCount must be a positive integer" };
  }
  return null;
}

function buildRestartArgs(input: Required<Qcow2SnapshotRetentionInput>): readonly string[] {
  const args: string[] = [
    "-machine",
    "q35",
    "-m",
    String(input.memoryMB),
    "-smp",
    String(input.cpuCount),
    "-cdrom",
    input.isoPath,
    "-boot",
    "d",
    "-drive",
    `file=${input.diskPath},if=virtio,format=qcow2`,
    "-serial",
    `file:${input.serialLogPath}`,
    "-display",
    "none",
    "-netdev",
    "user,id=net0",
    "-device",
    "virtio-net-pci,netdev=net0",
  ];

  if (input.kvmAvailable) {
    args.push("-enable-kvm", "-cpu", "host");
  } else {
    args.push("-cpu", "qemu64");
  }

  return args;
}

export function planQcow2SnapshotRetention(
  input: Qcow2SnapshotRetentionInput,
): Qcow2SnapshotRetentionResult {
  const invalid = validateInput(input);
  if (invalid) {
    return { error: invalid };
  }

  const normalized: Required<Qcow2SnapshotRetentionInput> = {
    isoPath: input.isoPath,
    diskPath: input.diskPath,
    serialLogPath: input.serialLogPath,
    snapshotName: input.snapshotName,
    memoryMB: input.memoryMB ?? DEFAULT_MEMORY_MB,
    cpuCount: input.cpuCount ?? DEFAULT_CPU_COUNT,
    kvmAvailable: input.kvmAvailable ?? false,
  };

  return {
    ok: {
      isoPath: normalized.isoPath,
      diskPath: normalized.diskPath,
      serialLogPath: normalized.serialLogPath,
      snapshotName: normalized.snapshotName,
      createBaselineSnapshot: {
        bin: "qemu-img",
        args: ["snapshot", "-c", normalized.snapshotName, normalized.diskPath],
      },
      restoreBaselineSnapshot: {
        bin: "qemu-img",
        args: ["snapshot", "-a", normalized.snapshotName, normalized.diskPath],
      },
      listSnapshots: {
        bin: "qemu-img",
        args: ["snapshot", "-l", normalized.diskPath],
      },
      restartFromIsoWithDisk: {
        bin: "qemu-system-x86_64",
        args: buildRestartArgs(normalized),
      },
      requiredSerialMarkers: RETENTION_SERIAL_MARKERS,
    },
  };
}

function retentionExecutionSteps(
  plan: Qcow2SnapshotRetentionPlan,
): ReadonlyArray<readonly [Qcow2RetentionExecutionStep, QemuCommand]> {
  return [
    ["create-baseline-snapshot", plan.createBaselineSnapshot],
    ["list-baseline-snapshots", plan.listSnapshots],
    ["restore-baseline-snapshot", plan.restoreBaselineSnapshot],
    ["restart-from-iso-with-disk", plan.restartFromIsoWithDisk],
  ];
}

function unknownReason(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function qemuCommandOptions(
  cwd: string | undefined,
  timeoutMs: number,
): SpawnSyncQemuCommandOptions {
  return cwd === undefined ? { timeoutMs } : { cwd, timeoutMs };
}

function stringifySpawnOutput(output: string | Buffer | null | undefined): string {
  if (typeof output === "string") {
    return output;
  }
  return output?.toString("utf8") ?? "";
}

function appendSpawnError(stderr: string, error: unknown): string {
  if (!(error instanceof Error)) {
    return stderr;
  }
  if (stderr.length === 0) {
    return error.message;
  }
  return `${stderr}\n${error.message}`;
}

function defaultSpawnSyncQemuCommand(
  command: QemuCommand,
  options: SpawnSyncQemuCommandOptions,
): SpawnSyncQemuCommandResult {
  const spawnOptions = options.cwd === undefined
    ? { encoding: "utf8" as const, timeout: options.timeoutMs }
    : { cwd: options.cwd, encoding: "utf8" as const, timeout: options.timeoutMs };
  const result = nodeSpawnSync(command.bin, [...command.args], spawnOptions);
  const stdout = stringifySpawnOutput(result.stdout);
  const stderr = appendSpawnError(stringifySpawnOutput(result.stderr), result.error);
  return {
    exitCode: result.status,
    stdout,
    stderr,
  };
}

export function createSpawnSyncQcow2RetentionExecutor(
  options: SpawnSyncQcow2RetentionExecutorOptions = {},
): Qcow2RetentionExecutor {
  const timeoutMs = options.timeoutMs ?? DEFAULT_RETENTION_COMMAND_TIMEOUT_MS;
  const spawnCommand = options.spawnCommand ?? defaultSpawnSyncQemuCommand;
  const readSerialOutput = options.readSerialOutput ?? ((serialLogPath: string) => readFileSync(serialLogPath, "utf8"));
  return {
    runCommand: (step, command) => {
      const execution = spawnCommand(command, qemuCommandOptions(options.cwd, timeoutMs));
      return {
        step,
        command,
        exitCode: execution.exitCode,
        stdout: execution.stdout,
        stderr: execution.stderr,
      };
    },
    readSerialOutput,
  };
}

export function executeQcow2SnapshotRetentionPlan(
  plan: Qcow2SnapshotRetentionPlan,
  executor: Qcow2RetentionExecutor,
): Qcow2RetentionExecutionResult {
  const commandExecutions: QemuCommandExecution[] = [];

  for (const [step, command] of retentionExecutionSteps(plan)) {
    let execution: QemuCommandExecution;
    try {
      execution = executor.runCommand(step, command);
    } catch (error) {
      return {
        error: {
          kind: "executor-threw",
          step,
          reason: unknownReason(error),
          commandExecutions,
        },
      };
    }
    commandExecutions.push(execution);

    if (execution.exitCode !== 0) {
      return {
        error: {
          kind: "command-failed",
          step,
          command,
          exitCode: execution.exitCode,
          stderr: execution.stderr,
          commandExecutions,
        },
      };
    }
  }

  let serialOutput: string;
  try {
    serialOutput = executor.readSerialOutput(plan.serialLogPath);
  } catch (error) {
    return {
      error: {
        kind: "executor-threw",
        step: "read-serial-output",
        reason: unknownReason(error),
        commandExecutions,
      },
    };
  }

  const assertion = assertRetentionSerialMarkers(serialOutput, plan.requiredSerialMarkers);
  if ("error" in assertion) {
    return {
      error: {
        kind: "serial-marker-failed",
        assertion: assertion.error,
        commandExecutions,
      },
    };
  }

  return {
    ok: {
      commandExecutions,
      serialAssertion: assertion.ok,
    },
  };
}

export function assertRetentionSerialMarkers(
  serialOutput: string,
  requiredMarkers: readonly string[] = RETENTION_SERIAL_MARKERS,
): RetentionSerialMarkerResult {
  const missingMarkers = requiredMarkers.filter((marker) => !serialOutput.includes(marker));
  if (missingMarkers.length > 0) {
    return {
      error: {
        kind: "missing-serial-markers",
        missingMarkers,
        requiredMarkers,
      },
    };
  }

  return {
    ok: {
      matchedMarkers: requiredMarkers,
    },
  };
}
