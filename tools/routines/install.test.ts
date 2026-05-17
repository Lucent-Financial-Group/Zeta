import { expect, test, describe } from "bun:test";
import { readCloudSchedule } from "./install.ts";
import { join } from "node:path";
import { mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";

describe("readCloudSchedule", () => {
  test("happy path - api trigger", () => {
    const dir = join(tmpdir(), "cloud-schedule-test-1");
    mkdirSync(dir, { recursive: true });
    writeFileSync(
      join(dir, "cloud-schedule.json"),
      JSON.stringify({
        taskId: "test-1",
        trigger: { type: "api" }
      })
    );

    const result = readCloudSchedule(dir);
    expect(result.missing).toBe(false);
    expect(result.parseError).toBeUndefined();
    expect(result.trigger).toEqual({ type: "api" });

    rmSync(dir, { recursive: true, force: true });
  });

  test("happy path - scheduled trigger", () => {
    const dir = join(tmpdir(), "cloud-schedule-test-2");
    mkdirSync(dir, { recursive: true });
    writeFileSync(
      join(dir, "cloud-schedule.json"),
      JSON.stringify({
        taskId: "test-2",
        trigger: { type: "scheduled", cronExpression: "0 9 * * *" }
      })
    );

    const result = readCloudSchedule(dir);
    expect(result.missing).toBe(false);
    expect(result.parseError).toBeUndefined();
    expect(result.trigger).toEqual({ type: "scheduled", cronExpression: "0 9 * * *" });

    rmSync(dir, { recursive: true, force: true });
  });

  test("missing file", () => {
    const dir = join(tmpdir(), "cloud-schedule-test-3");
    mkdirSync(dir, { recursive: true });

    const result = readCloudSchedule(dir);
    expect(result.missing).toBe(true);
    expect(result.parseError).toBeUndefined();
    expect(result.trigger).toBeUndefined();

    rmSync(dir, { recursive: true, force: true });
  });

  test("parse error - invalid json", () => {
    const dir = join(tmpdir(), "cloud-schedule-test-4");
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, "cloud-schedule.json"), "{ invalid json ");

    const result = readCloudSchedule(dir);
    expect(result.missing).toBe(false);
    expect(result.parseError).toBeDefined();

    rmSync(dir, { recursive: true, force: true });
  });

  test("parse error - missing trigger field", () => {
    const dir = join(tmpdir(), "cloud-schedule-test-5");
    mkdirSync(dir, { recursive: true });
    writeFileSync(
      join(dir, "cloud-schedule.json"),
      JSON.stringify({
        taskId: "test-5"
      })
    );

    const result = readCloudSchedule(dir);
    expect(result.missing).toBe(false);
    expect(result.parseError).toBe("cloud-schedule.json is missing required field: trigger");

    rmSync(dir, { recursive: true, force: true });
  });
});
