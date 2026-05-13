import { describe, expect, test } from "bun:test";
import {
  DEFAULT_CONFIG,
  parseArgs,
  parsePositiveMinutes,
  pollOnce,
  type Adapters,
  type MergedPR,
} from "./missed-substrate-detector";

function fakeAdapters(nowIso: string, merged: MergedPR[]): Adapters {
  return {
    now: () => new Date(nowIso),
    fetchRecentMergedPRs: () => merged,
  };
}

describe("missed-substrate-detector slice 2", () => {
  test("default config has sensible thresholds", () => {
    expect(DEFAULT_CONFIG.pollIntervalMin).toBe(5);
    expect(DEFAULT_CONFIG.lookbackMin).toBe(30);
    expect(DEFAULT_CONFIG.once).toBe(false);
  });

  describe("pollOnce with injected adapters", () => {
    test("reports 0 candidates when no merged PRs", () => {
      const result = pollOnce(
        DEFAULT_CONFIG,
        fakeAdapters("2026-05-13T18:00:00Z", []),
      );
      expect(result.candidatesScanned).toBe(0);
      expect(result.cascadesDetected).toBe(0);
      expect(result.note).toContain("no merged PRs");
    });

    test("reports candidate count when merged PRs found", () => {
      const merged: MergedPR[] = [
        { number: 2997, headRefName: "feat/x", mergedAt: "2026-05-13T17:50:00Z" },
        { number: 2998, headRefName: "feat/y", mergedAt: "2026-05-13T17:55:00Z" },
      ];
      const result = pollOnce(
        DEFAULT_CONFIG,
        fakeAdapters("2026-05-13T18:00:00Z", merged),
      );
      expect(result.candidatesScanned).toBe(2);
      expect(result.cascadesDetected).toBe(0);
      expect(result.note).toContain("2 merged PR(s)");
      expect(result.note).toContain("slice 3 will compare");
    });

    test("emits valid ISO timestamp", () => {
      const result = pollOnce(
        DEFAULT_CONFIG,
        fakeAdapters("2026-05-13T18:00:00Z", []),
      );
      expect(result.pollAt).toBe("2026-05-13T18:00:00.000Z");
    });
  });

  describe("parsePositiveMinutes", () => {
    test("accepts positive finite numbers", () => {
      expect(parsePositiveMinutes("30", "--lookback-min")).toBe(30);
    });

    test("rejects invalid inputs", () => {
      expect(() => parsePositiveMinutes(undefined, "--lookback-min")).toThrow(/requires/);
      expect(() => parsePositiveMinutes("0", "--lookback-min")).toThrow(/positive finite/);
      expect(() => parsePositiveMinutes("Infinity", "--lookback-min")).toThrow(/positive finite/);
    });
  });

  describe("parseArgs", () => {
    test("default config when no args", () => {
      expect(parseArgs([])).toEqual(DEFAULT_CONFIG);
    });

    test("--once flag", () => {
      expect(parseArgs(["--once"]).once).toBe(true);
    });

    test("--poll-min + --lookback-min set values", () => {
      const config = parseArgs(["--poll-min", "10", "--lookback-min", "60"]);
      expect(config.pollIntervalMin).toBe(10);
      expect(config.lookbackMin).toBe(60);
    });

    test("rejects unknown flags", () => {
      expect(() => parseArgs(["--unknown"])).toThrow(/unknown flag/);
    });
  });
});
