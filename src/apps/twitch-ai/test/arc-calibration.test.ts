import { describe, expect, test } from "bun:test";

import calibrationArtifact from "../src/recordings/arc-coordinate-calibration.json";
import { measureCoordinateCalibration, parseArcCalibration, type ArcCalibrationSample } from "../src/arc-calibration";

function controlSamples(outcomes: readonly boolean[]): ArcCalibrationSample[] {
  return outcomes.map((committed, tick) => ({
    masses: [
      { probability: 1 / 3, x: 10, y: 12 },
      { probability: 1 / 3, x: 44, y: 14 },
      { probability: 1 / 3, x: 28, y: 48 },
    ],
    minimumMass: 0,
    outcome: committed
      ? { kind: "committed", levelsCompleted: 1, point: { x: 10, y: 12 } }
      : { kind: "refused", levelsCompleted: 0 },
    selected: { x: 10, y: 12 },
    tick,
  }));
}

describe("ARC coordinate calibration", () => {
  test("independently reproduces the Python report and preserves refusals", () => {
    const parsed = parseArcCalibration(calibrationArtifact);

    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.value.report).toEqual({
      brierScore: 0.277777777778,
      commitCount: 10,
      expectedCalibrationError: 0.166666666667,
      meanSelectedMass: 0.333333333333,
      maximumGateCalibrationError: 0.666666666667,
      observedSelectedRate: 0.5,
      refusalCount: 10,
      sampleCount: 20,
      tolerance: 0.05,
      verdict: "uncalibrated",
    });
    expect(parsed.value.samples.filter((sample) => sample.outcome.kind === "refused")).toHaveLength(10);
  });

  test("rejects a favorable verdict that the samples do not support", () => {
    const changed = structuredClone(calibrationArtifact) as unknown as {
      report: { verdict: string };
    };
    changed.report.verdict = "calibrated";

    expect(parseArcCalibration(changed)).toEqual({
      ok: false,
      error: "calibration.report does not match the recorded samples",
    });
  });

  test("accepts a producer report independent of JSON key order", () => {
    const changed = structuredClone(calibrationArtifact) as unknown as {
      report: Record<string, unknown>;
    };
    changed.report = Object.fromEntries(Object.entries(changed.report).reverse());

    expect(parseArcCalibration(changed).ok).toBe(true);
  });

  test("rejects tolerance inflation that would manufacture a favorable verdict", () => {
    const changed = structuredClone(calibrationArtifact) as unknown as {
      report: { tolerance: number; verdict: string };
    };
    changed.report.tolerance = 1;
    changed.report.verdict = "calibrated";

    expect(parseArcCalibration(changed)).toEqual({
      ok: false,
      error: "calibration.report.tolerance must be 0.05 for calibration v1",
    });
  });

  test("a calibrated refusal control passes and an all-commit mutant fails", () => {
    const calibrated = measureCoordinateCalibration(
      controlSamples([
        true,
        false,
        false,
        true,
        false,
        false,
        true,
        false,
        false,
        true,
        false,
        false,
        true,
        false,
        false,
        true,
        false,
        false,
        true,
        false,
        false,
      ]),
      0.05,
    );
    const mutant = measureCoordinateCalibration(controlSamples(Array.from({ length: 21 }, () => true)), 0.05);

    expect(calibrated.expectedCalibrationError).toBeCloseTo(0, 12);
    expect(calibrated.maximumGateCalibrationError).toBeCloseTo(0, 12);
    expect(calibrated.brierScore).toBeCloseTo(0.222222222222, 12);
    expect(calibrated.verdict).toBe("calibrated");
    expect(mutant.expectedCalibrationError).toBeCloseTo(0.666666666667, 12);
    expect(mutant.verdict).toBe("uncalibrated");
  });

  test("rejects a refusal carrying a hidden commit point", () => {
    const changed = structuredClone(calibrationArtifact) as unknown as {
      samples: { outcome: { point?: { x: number; y: number } } }[];
    };
    const refused = changed.samples.find((sample) => !("point" in sample.outcome));
    if (refused === undefined) throw new Error("calibration artifact has no refusal");
    refused.outcome.point = { x: 10, y: 12 };

    expect(parseArcCalibration(changed)).toEqual({
      ok: false,
      error: "calibration.samples[1].outcome.point must be absent for a refusal",
    });
  });
});
