import { describe, expect, test } from "bun:test";
import { DEFAULT_CONFIG, pollOnce, runDetector, type DetectorConfig } from "./standing-by-detector";

describe("standing-by-detector slice 1", () => {
  test("default config has sensible thresholds", () => {
    expect(DEFAULT_CONFIG.pollIntervalMin).toBe(5);
    expect(DEFAULT_CONFIG.idleThresholdMin).toBe(15);
    expect(DEFAULT_CONFIG.once).toBe(false);
  });

  test("pollOnce returns a result with no-op detection", () => {
    const result = pollOnce(DEFAULT_CONFIG);
    expect(result.idleDetected).toBe(false);
    expect(result.note).toContain("slice-1 skeleton");
    expect(result.pollAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  test("runDetector with once: true exits after one iteration", async () => {
    const config: DetectorConfig = { ...DEFAULT_CONFIG, once: true };
    const results = await runDetector(config);
    expect(results).toHaveLength(1);
    expect(results[0].idleDetected).toBe(false);
  });
});
