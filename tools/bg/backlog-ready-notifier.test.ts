import { describe, expect, test } from "bun:test";
import { DEFAULT_CONFIG, pollOnce, runNotifier, type NotifierConfig } from "./backlog-ready-notifier";

describe("backlog-ready-notifier slice 1", () => {
  test("default config has sensible poll interval", () => {
    expect(DEFAULT_CONFIG.pollIntervalMin).toBe(10);
    expect(DEFAULT_CONFIG.once).toBe(false);
  });

  test("pollOnce returns a result with no-op scan", () => {
    const result = pollOnce(DEFAULT_CONFIG);
    expect(result.readyRowsFound).toBe(0);
    expect(result.assignmentsPublished).toBe(0);
    expect(result.note).toContain("slice-1 skeleton");
    expect(result.pollAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  test("runNotifier with once: true exits after one iteration", async () => {
    const config: NotifierConfig = { ...DEFAULT_CONFIG, once: true };
    const results = await runNotifier(config);
    expect(results).toHaveLength(1);
    expect(results[0].readyRowsFound).toBe(0);
  });
});
