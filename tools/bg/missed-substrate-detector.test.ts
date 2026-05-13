import { describe, expect, test } from "bun:test";
import {
  DEFAULT_CONFIG,
  parseArgs,
  parsePositiveMinutes,
  pollOnce,
  runOnce,
} from "./missed-substrate-detector";

describe("missed-substrate-detector slice 1", () => {
  test("default config has sensible poll interval", () => {
    expect(DEFAULT_CONFIG.pollIntervalMin).toBe(5);
    expect(DEFAULT_CONFIG.once).toBe(false);
  });

  test("pollOnce returns a result with no-op cascade scan", () => {
    const result = pollOnce(DEFAULT_CONFIG);
    expect(result.cascadesDetected).toBe(0);
    expect(result.note).toContain("slice-1 skeleton");
    expect(result.pollAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  test("runOnce returns a single result without entering daemon mode", () => {
    const result = runOnce(DEFAULT_CONFIG);
    expect(result.cascadesDetected).toBe(0);
    expect(result.pollAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  describe("parsePositiveMinutes", () => {
    test("accepts positive finite numbers", () => {
      expect(parsePositiveMinutes("5", "--poll-min")).toBe(5);
      expect(parsePositiveMinutes("0.5", "--poll-min")).toBe(0.5);
    });

    test("rejects undefined", () => {
      expect(() => parsePositiveMinutes(undefined, "--poll-min")).toThrow(/requires a value/);
    });

    test("rejects non-numeric strings", () => {
      expect(() => parsePositiveMinutes("abc", "--poll-min")).toThrow(/positive finite/);
    });

    test("rejects zero and negatives", () => {
      expect(() => parsePositiveMinutes("0", "--poll-min")).toThrow(/positive finite/);
      expect(() => parsePositiveMinutes("-3", "--poll-min")).toThrow(/positive finite/);
    });

    test("rejects Infinity / NaN", () => {
      expect(() => parsePositiveMinutes("Infinity", "--poll-min")).toThrow(/positive finite/);
      expect(() => parsePositiveMinutes("NaN", "--poll-min")).toThrow(/positive finite/);
    });
  });

  describe("parseArgs", () => {
    test("default config when no args", () => {
      expect(parseArgs([])).toEqual(DEFAULT_CONFIG);
    });

    test("--once flag sets once: true", () => {
      expect(parseArgs(["--once"]).once).toBe(true);
    });

    test("--poll-min sets the interval", () => {
      expect(parseArgs(["--poll-min", "10"]).pollIntervalMin).toBe(10);
    });

    test("rejects unknown flags fail-fast", () => {
      expect(() => parseArgs(["--unknown"])).toThrow(/unknown flag/);
      expect(() => parseArgs(["--pollmin", "5"])).toThrow(/unknown flag/);
    });

    test("rejects invalid --poll-min value", () => {
      expect(() => parseArgs(["--poll-min", "abc"])).toThrow(/positive finite/);
    });
  });
});
