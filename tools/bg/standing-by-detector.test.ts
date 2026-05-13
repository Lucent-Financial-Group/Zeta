import { describe, expect, test } from "bun:test";
import {
  DEFAULT_CONFIG,
  parseArgs,
  parsePositiveMinutes,
  pollOnce,
  runOnce,
  type Adapters,
} from "./standing-by-detector";

function fakeAdapters(nowIso: string, lastCommitIso: string | null): Adapters {
  return {
    now: () => new Date(nowIso),
    lastCommitIso: () => lastCommitIso,
  };
}

describe("standing-by-detector slice 2", () => {
  test("default config has sensible thresholds", () => {
    expect(DEFAULT_CONFIG.pollIntervalMin).toBe(5);
    expect(DEFAULT_CONFIG.idleThresholdMin).toBe(15);
    expect(DEFAULT_CONFIG.once).toBe(false);
  });

  test("runOnce returns a result without entering daemon mode", () => {
    const result = runOnce(DEFAULT_CONFIG);
    expect(result.pollAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(typeof result.idleDetected).toBe("boolean");
  });

  describe("pollOnce with injected adapters", () => {
    test("flags idle when last commit is older than threshold", () => {
      const result = pollOnce(
        { ...DEFAULT_CONFIG, idleThresholdMin: 15 },
        fakeAdapters("2026-05-13T18:00:00Z", "2026-05-13T17:40:00Z"),
      );
      expect(result.idleDetected).toBe(true);
      expect(result.idleMinutes).toBe(20);
      expect(result.lastCommitAt).toBe("2026-05-13T17:40:00.000Z");
      expect(result.note).toContain("Standing-by candidate");
    });

    test("does NOT flag idle when last commit is recent", () => {
      const result = pollOnce(
        { ...DEFAULT_CONFIG, idleThresholdMin: 15 },
        fakeAdapters("2026-05-13T18:00:00Z", "2026-05-13T17:55:00Z"),
      );
      expect(result.idleDetected).toBe(false);
      expect(result.idleMinutes).toBe(5);
      expect(result.note).toContain("under threshold");
    });

    test("flags idle at exactly the threshold (inclusive)", () => {
      const result = pollOnce(
        { ...DEFAULT_CONFIG, idleThresholdMin: 15 },
        fakeAdapters("2026-05-13T18:00:00Z", "2026-05-13T17:45:00Z"),
      );
      expect(result.idleDetected).toBe(true);
      expect(result.idleMinutes).toBe(15);
    });

    test("handles null lastCommit (fresh repo / git unavailable)", () => {
      const result = pollOnce(
        DEFAULT_CONFIG,
        fakeAdapters("2026-05-13T18:00:00Z", null),
      );
      expect(result.idleDetected).toBe(false);
      expect(result.lastCommitAt).toBeNull();
      expect(result.idleMinutes).toBeNull();
      expect(result.note).toContain("no commit found");
    });

    test("clamps negative idleMinutes to zero (clock-skew safety)", () => {
      const result = pollOnce(
        DEFAULT_CONFIG,
        fakeAdapters("2026-05-13T17:00:00Z", "2026-05-13T18:00:00Z"),
      );
      expect(result.idleMinutes).toBe(0);
      expect(result.idleDetected).toBe(false);
    });
  });

  describe("parsePositiveMinutes", () => {
    test("accepts positive finite numbers", () => {
      expect(parsePositiveMinutes("5", "--poll-min")).toBe(5);
    });

    test("rejects undefined / non-numeric / zero / negative / Infinity", () => {
      expect(() => parsePositiveMinutes(undefined, "--poll-min")).toThrow(/requires a value/);
      expect(() => parsePositiveMinutes("abc", "--poll-min")).toThrow(/positive finite/);
      expect(() => parsePositiveMinutes("0", "--poll-min")).toThrow(/positive finite/);
      expect(() => parsePositiveMinutes("-3", "--poll-min")).toThrow(/positive finite/);
      expect(() => parsePositiveMinutes("Infinity", "--poll-min")).toThrow(/positive finite/);
    });
  });

  describe("parseArgs", () => {
    test("default config when no args", () => {
      expect(parseArgs([])).toEqual(DEFAULT_CONFIG);
    });

    test("--once flag", () => {
      expect(parseArgs(["--once"]).once).toBe(true);
    });

    test("--poll-min + --idle-min set values", () => {
      const config = parseArgs(["--poll-min", "10", "--idle-min", "30"]);
      expect(config.pollIntervalMin).toBe(10);
      expect(config.idleThresholdMin).toBe(30);
    });

    test("rejects unknown flags fail-fast", () => {
      expect(() => parseArgs(["--unknown"])).toThrow(/unknown flag/);
    });
  });
});
