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

const DEFAULT_MEMORY_MB = 4096;
const DEFAULT_CPU_COUNT = 2;

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
