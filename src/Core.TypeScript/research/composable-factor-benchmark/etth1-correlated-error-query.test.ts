import { describe, expect, test } from "bun:test";
import type { ForecastRow } from "./etth1-static-ensemble";
import { assertCorrelatedCalibrationSource, fitCorrelatedErrorArtifact } from "./etth1-correlated-error-query";

const rows: readonly ForecastRow[] = [
  { exampleIndex: 0, target: 1, experts: { last: 0.8, "window-start": 0.5, "train-mean": 0.9, "ridge-window": 1.1 } },
  { exampleIndex: 1, target: 2, experts: { last: 1.7, "window-start": 1.4, "train-mean": 1.2, "ridge-window": 2.1 } },
  { exampleIndex: 2, target: 3, experts: { last: 2.7, "window-start": 2.2, "train-mean": 1.5, "ridge-window": 3.2 } },
  { exampleIndex: 3, target: 4, experts: { last: 3.5, "window-start": 3.1, "train-mean": 1.8, "ridge-window": 4.2 } },
  { exampleIndex: 4, target: 5, experts: { last: 4.4, "window-start": 3.8, "train-mean": 2.1, "ridge-window": 5.1 } },
  { exampleIndex: 5, target: 6, experts: { last: 5.5, "window-start": 4.7, "train-mean": 2.4, "ridge-window": 6.3 } },
];

describe("CFB-C correlated-error query", () => {
  test("exact active-set weights are finite, nonnegative, and normalized", () => {
    const artifact = fitCorrelatedErrorArtifact(rows);
    expect(artifact.weights.every((weight) => Number.isFinite(weight) && weight >= 0)).toBe(true);
    expect(artifact.weights.reduce((sum, weight) => sum + weight, 0)).toBeCloseTo(1, 12);
    expect(artifact.activeMask).toBeGreaterThan(0);
    expect(artifact.intervalVariance).toBeGreaterThan(0);
  });

  test("expert arrival order cannot change the canonical fitted artifact", () => {
    const forward = fitCorrelatedErrorArtifact(rows);
    const reversed = fitCorrelatedErrorArtifact(rows, ["ridge-window", "train-mean", "window-start", "last"]);
    expect(reversed).toEqual(forward);
  });

  test("zeroing off-diagonal residual covariance is a non-vacuous mutation", () => {
    const correlated = fitCorrelatedErrorArtifact(rows);
    const diagonal = fitCorrelatedErrorArtifact(rows, undefined, true);
    expect(diagonal.weights).not.toEqual(correlated.weights);
  });

  test("test-label calibration is rejected", () => {
    expect(() => assertCorrelatedCalibrationSource("test")).toThrow("CFB-CORRELATED-CALIBRATION-LEAKAGE");
  });
});
