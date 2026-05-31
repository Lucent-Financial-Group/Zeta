import { describe, expect, test } from "bun:test";
import {
  assertRetentionSerialMarkers,
  executeQcow2SnapshotRetentionPlan,
  planQcow2SnapshotRetention,
  type Qcow2SnapshotRetentionPlan,
  type Qcow2RetentionExecutionStep,
  type QemuCommand,
  type QemuCommandExecution,
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
  test("plans qcow2 snapshot create, restore, list, and restart commands", () => {
    const result = planQcow2SnapshotRetention({
      isoPath: "/tmp/zeta.iso",
      diskPath: "/tmp/zeta.qcow2",
      serialLogPath: "/tmp/serial.log",
      snapshotName: "post-initial-format",
      kvmAvailable: true,
    });
    if ("error" in result) throw new Error(result.error.reason);

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
        "create-baseline-snapshot",
        "list-baseline-snapshots",
        "restore-baseline-snapshot",
        "restart-from-iso-with-disk",
      ]);
      expect(result.ok.commandExecutions).toHaveLength(4);
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
      expect(result.error.step).toBe("restore-baseline-snapshot");
      expect(result.error.commandExecutions).toHaveLength(3);
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
      expect(result.error.commandExecutions).toHaveLength(4);
      if (result.error.kind === "serial-marker-failed") {
        expect(result.error.assertion.missingMarkers).toEqual(["already-present"]);
      }
    }
  });
});
