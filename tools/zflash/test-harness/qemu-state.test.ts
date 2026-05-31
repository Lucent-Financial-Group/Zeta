import { describe, expect, test } from "bun:test";
import {
  assertRetentionSerialMarkers,
  createSpawnSyncQcow2RetentionExecutor,
  executeQcow2SnapshotRetentionPlan,
  planQcow2SnapshotRetention,
  type Qcow2SnapshotRetentionPlan,
  type Qcow2RetentionExecutionStep,
  type QemuCommand,
  type QemuCommandExecution,
  type SpawnSyncQemuCommandOptions,
} from "./qemu-state";

function retentionPlan(): Qcow2SnapshotRetentionPlan {
  const result = planQcow2SnapshotRetention({
    isoPath: "/tmp/zeta.iso",
    diskPath: "/tmp/zeta.qcow2",
    serialLogPath: "/tmp/serial.log",
    snapshotName: "post-initial-format",
  });
  if ("error" in result) throw new Error(result.error.reason);
  return result.ok;
}

function successfulExecution(
  step: Qcow2RetentionExecutionStep,
  command: QemuCommand,
): QemuCommandExecution {
  return { step, command, exitCode: 0, stdout: `${step} ok`, stderr: "" };
}

describe("B-0891 QEMU state-preservation planner", () => {
  test("plans qcow2 disk bootstrap, snapshot, restore, list, and restart commands", () => {
    const result = planQcow2SnapshotRetention({
      isoPath: "/tmp/zeta.iso",
      diskPath: "/tmp/zeta.qcow2",
      serialLogPath: "/tmp/serial.log",
      snapshotName: "post-initial-format",
      diskSizeGB: 32,
      kvmAvailable: true,
    });
    if ("error" in result) throw new Error(result.error.reason);

    expect(result.ok.diskSizeGB).toBe(32);
    expect(result.ok.createDiskImage).toEqual({
      bin: "qemu-img",
      args: ["create", "-f", "qcow2", "/tmp/zeta.qcow2", "32G"],
    });
    expect(result.ok.initialInstallFromIsoWithDisk.bin).toBe("qemu-system-x86_64");
    expect(result.ok.initialInstallFromIsoWithDisk.args).toContain("-enable-kvm");
    expect(result.ok.initialInstallFromIsoWithDisk.args).toContain("file=/tmp/zeta.qcow2,if=virtio,format=qcow2");
    expect(result.ok.createBaselineSnapshot).toEqual({
      bin: "qemu-img",
      args: ["snapshot", "-c", "post-initial-format", "/tmp/zeta.qcow2"],
    });
    expect(result.ok.restoreBaselineSnapshot).toEqual({
      bin: "qemu-img",
      args: ["snapshot", "-a", "post-initial-format", "/tmp/zeta.qcow2"],
    });
    expect(result.ok.listSnapshots.args).toEqual(["snapshot", "-l", "/tmp/zeta.qcow2"]);
    expect(result.ok.serialLogPath).toBe("/tmp/serial.log");
    expect(result.ok.restartFromIsoWithDisk.bin).toBe("qemu-system-x86_64");
    expect(result.ok.restartFromIsoWithDisk.args).toContain("-enable-kvm");
    expect(result.ok.restartFromIsoWithDisk.args).toContain("host");
    expect(result.ok.restartFromIsoWithDisk.args).toContain("file=/tmp/zeta.qcow2,if=virtio,format=qcow2");
    expect(result.ok.restartFromIsoWithDisk.args).toContain("file:/tmp/serial.log");
  });

  test("defaults the qcow2 bootstrap disk size", () => {
    const result = planQcow2SnapshotRetention({
      isoPath: "/tmp/zeta.iso",
      diskPath: "/tmp/zeta.qcow2",
      serialLogPath: "/tmp/serial.log",
      snapshotName: "post-initial-format",
    });
    if ("error" in result) throw new Error(result.error.reason);

    expect(result.ok.diskSizeGB).toBe(20);
    expect(result.ok.createDiskImage.args).toEqual(["create", "-f", "qcow2", "/tmp/zeta.qcow2", "20G"]);
  });

  test("falls back to qemu64 CPU when KVM is unavailable", () => {
    const result = planQcow2SnapshotRetention({
      isoPath: "/tmp/zeta.iso",
      diskPath: "/tmp/zeta.qcow2",
      serialLogPath: "/tmp/serial.log",
      snapshotName: "post-initial-format",
      kvmAvailable: false,
    });
    if ("error" in result) throw new Error(result.error.reason);

    expect(result.ok.restartFromIsoWithDisk.args).not.toContain("-enable-kvm");
    expect(result.ok.restartFromIsoWithDisk.args).toContain("qemu64");
  });

  test("carries retention serial markers for later runtime assertions", () => {
    const result = planQcow2SnapshotRetention({
      isoPath: "/tmp/zeta.iso",
      diskPath: "/tmp/zeta.qcow2",
      serialLogPath: "/tmp/serial.log",
      snapshotName: "post-initial-format",
    });
    if ("error" in result) throw new Error(result.error.reason);

    expect(result.ok.requiredSerialMarkers).toContain("zeta-creds-restore:");
    expect(result.ok.requiredSerialMarkers).toContain("already-present");
  });

  test("returns Result-shaped feedback for invalid input", () => {
    const result = planQcow2SnapshotRetention({
      isoPath: "",
      diskPath: "/tmp/zeta.qcow2",
      serialLogPath: "/tmp/serial.log",
      snapshotName: "post-initial-format",
    });

    expect("error" in result).toBe(true);
    if ("error" in result) {
      expect(result.error.kind).toBe("invalid-input");
      expect(result.error.field).toBe("isoPath");
    }
  });

  test("returns Result-shaped feedback for invalid disk size", () => {
    const result = planQcow2SnapshotRetention({
      isoPath: "/tmp/zeta.iso",
      diskPath: "/tmp/zeta.qcow2",
      serialLogPath: "/tmp/serial.log",
      snapshotName: "post-initial-format",
      diskSizeGB: 0,
    });

    expect("error" in result).toBe(true);
    if ("error" in result) {
      expect(result.error.kind).toBe("invalid-input");
      expect(result.error.field).toBe("diskSizeGB");
    }
  });

  test("asserts retention serial markers from QEMU output", () => {
    const result = assertRetentionSerialMarkers([
      "zeta-creds-restore: reading preserved ESP blob",
      "zeta-creds-restore: already-present, skipping credential rewrite",
    ].join("\n"));

    expect("ok" in result).toBe(true);
    if ("ok" in result) {
      expect(result.ok.matchedMarkers).toContain("zeta-creds-restore:");
      expect(result.ok.matchedMarkers).toContain("already-present");
    }
  });

  test("returns missing marker feedback when restore did not skip", () => {
    const result = assertRetentionSerialMarkers("zeta-creds-restore: restoring credentials");

    expect("error" in result).toBe(true);
    if ("error" in result) {
      expect(result.error.kind).toBe("missing-serial-markers");
      expect(result.error.missingMarkers).toEqual(["already-present"]);
    }
  });

  test("executes the QEMU retention command sequence and asserts serial markers", () => {
    const observedSteps: Qcow2RetentionExecutionStep[] = [];
    const result = executeQcow2SnapshotRetentionPlan(retentionPlan(), {
      runCommand: (step, command) => {
        observedSteps.push(step);
        return successfulExecution(step, command);
      },
      readSerialOutput: () => [
        "zeta-creds-restore: reading preserved ESP blob",
        "zeta-creds-restore: already-present, skipping credential rewrite",
      ].join("\n"),
    });

    expect("ok" in result).toBe(true);
    if ("ok" in result) {
      expect(observedSteps).toEqual([
        "create-disk-image",
        "initial-install-from-iso-with-disk",
        "create-baseline-snapshot",
        "list-baseline-snapshots",
        "restore-baseline-snapshot",
        "restart-from-iso-with-disk",
      ]);
      expect(result.ok.commandExecutions).toHaveLength(6);
      expect(result.ok.serialAssertion.matchedMarkers).toContain("already-present");
    }
  });

  test("adapts planned QEMU commands to a timeout-bound process executor", () => {
    const observed: Array<{
      readonly command: QemuCommand;
      readonly options: SpawnSyncQemuCommandOptions;
    }> = [];
    const serialPaths: string[] = [];
    const executor = createSpawnSyncQcow2RetentionExecutor({
      cwd: "/tmp/zeta-worktree",
      timeoutMs: 1234,
      spawnCommand: (command, options) => {
        observed.push({ command, options });
        return { exitCode: 0, stdout: `${command.bin} ok`, stderr: "" };
      },
      readSerialOutput: (serialLogPath) => {
        serialPaths.push(serialLogPath);
        return [
          "zeta-creds-restore: reading preserved ESP blob",
          "zeta-creds-restore: already-present, skipping credential rewrite",
        ].join("\n");
      },
    });

    const result = executeQcow2SnapshotRetentionPlan(retentionPlan(), executor);

    expect("ok" in result).toBe(true);
    if ("ok" in result) {
      expect(observed.map((entry) => entry.command.bin)).toEqual([
        "qemu-img",
        "qemu-system-x86_64",
        "qemu-img",
        "qemu-img",
        "qemu-img",
        "qemu-system-x86_64",
      ]);
      expect(observed.every((entry) => entry.options.cwd === "/tmp/zeta-worktree")).toBe(true);
      expect(observed.every((entry) => entry.options.timeoutMs === 1234)).toBe(true);
      expect(serialPaths).toEqual(["/tmp/serial.log"]);
      expect(result.ok.serialAssertion.matchedMarkers).toContain("already-present");
    }
  });

  test("stops before serial assertion when a QEMU command fails", () => {
    const result = executeQcow2SnapshotRetentionPlan(retentionPlan(), {
      runCommand: (step, command) => {
        if (step === "restore-baseline-snapshot") {
          return { step, command, exitCode: 1, stdout: "", stderr: "snapshot not found" };
        }
        return successfulExecution(step, command);
      },
      readSerialOutput: () => {
        throw new Error("serial should not be read after command failure");
      },
    });

    expect("error" in result).toBe(true);
    if ("error" in result) {
      expect(result.error.kind).toBe("command-failed");
      expect(result.error.commandExecutions).toHaveLength(5);
      if (result.error.kind === "command-failed") {
        expect(result.error.step).toBe("restore-baseline-snapshot");
      }
    }
  });

  test("returns marker feedback after command execution when retention was not observed", () => {
    const result = executeQcow2SnapshotRetentionPlan(retentionPlan(), {
      runCommand: successfulExecution,
      readSerialOutput: () => "zeta-creds-restore: restored credentials",
    });

    expect("error" in result).toBe(true);
    if ("error" in result) {
      expect(result.error.kind).toBe("serial-marker-failed");
      expect(result.error.commandExecutions).toHaveLength(6);
      if (result.error.kind === "serial-marker-failed") {
        expect(result.error.assertion.missingMarkers).toEqual(["already-present"]);
      }
    }
  });
});
