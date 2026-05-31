import { describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { join } from "node:path";

const SCRIPT = join(import.meta.dir, "run.ts");

function run(...args: string[]): { readonly stdout: string; readonly stderr: string; readonly exitCode: number } {
  const result = spawnSync("bun", [SCRIPT, ...args], {
    encoding: "utf-8",
  });
  return {
    stdout: (result.stdout ?? "").trim(),
    stderr: (result.stderr ?? "").trim(),
    exitCode: result.status ?? 1,
  };
}

describe("B-0891 test-harness dispatcher", () => {
  test("dry-run can inspect scaffolded retention without claiming runtime success", () => {
    const result = run("--dry-run", "--scenario", "reformat-with-retention");
    expect(result.exitCode).toBe(0);
    expect(result.stderr).toBe("");
    const parsed = JSON.parse(result.stdout);
    expect(parsed.mode).toBe("dry-run");
    expect(parsed.targets[0].id).toBe("reformat-with-retention");
    expect(parsed.targets[0].plan).toContain("implementation pending");
  });

  test("runtime attempt for retention emits QEMU plan but fails closed", () => {
    const result = run("--scenario", "reformat-with-retention", "/tmp/nonexistent.iso");
    expect(result.exitCode).toBe(1);
    const parsed = JSON.parse(result.stdout);
    expect(parsed.summary.failed).toBe(1);
    expect(parsed.summary.scaffolded).toBe(0);
    expect(parsed.results[0].status).toBe("failed");
    expect(parsed.results[0].message).toContain("fails closed");
    expect(parsed.results[0].message).toContain("process runner");
    expect(parsed.results[0].qemuRetentionPlan.createBaselineSnapshot.args).toEqual([
      "snapshot",
      "-c",
      "post-initial-format",
      "/tmp/nonexistent.iso.scenario3.qcow2",
    ]);
    expect(parsed.results[0].qemuRetentionPlan.restoreBaselineSnapshot.args).toContain(
      "/tmp/nonexistent.iso.scenario3.qcow2",
    );
    expect(parsed.results[0].qemuRetentionPlan.restartFromIsoWithDisk.args).toContain(
      "file=/tmp/nonexistent.iso.scenario3.qcow2,if=virtio,format=qcow2",
    );
    expect(parsed.results[0].qemuRetentionPlan.requiredSerialMarkers).toContain("already-present");
  });
});
