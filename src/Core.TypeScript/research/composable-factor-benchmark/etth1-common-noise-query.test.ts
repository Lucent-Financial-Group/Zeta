import { describe, expect, test } from "bun:test";
import type { ForecastRow } from "./etth1-static-ensemble";
import {
  assertCommonNoiseCalibrationSource,
  COMMON_NOISE_UNIQUENESS_FLOOR,
  fitCommonNoiseArtifact,
} from "./etth1-common-noise-query";

const trainingRows: readonly ForecastRow[] = [
  { exampleIndex: 0, target: 1, experts: { last: 0.7, "window-start": 0.4, "train-mean": 0.9, "ridge-window": 1.2 } },
  { exampleIndex: 1, target: 2, experts: { last: 1.5, "window-start": 1.1, "train-mean": 1.7, "ridge-window": 2.1 } },
  { exampleIndex: 2, target: 3, experts: { last: 2.4, "window-start": 1.9, "train-mean": 2.6, "ridge-window": 3.2 } },
  { exampleIndex: 3, target: 4, experts: { last: 3.5, "window-start": 3.0, "train-mean": 3.8, "ridge-window": 4.0 } },
  { exampleIndex: 4, target: 5, experts: { last: 4.3, "window-start": 3.8, "train-mean": 4.6, "ridge-window": 5.3 } },
  { exampleIndex: 5, target: 6, experts: { last: 5.2, "window-start": 4.7, "train-mean": 5.5, "ridge-window": 6.1 } },
  { exampleIndex: 6, target: 7, experts: { last: 6.4, "window-start": 5.9, "train-mean": 6.8, "ridge-window": 7.4 } },
  { exampleIndex: 7, target: 8, experts: { last: 7.1, "window-start": 6.5, "train-mean": 7.4, "ridge-window": 8.2 } },
];

const validationRows: readonly ForecastRow[] = trainingRows.map((row) => ({
  ...row,
  exampleIndex: row.exampleIndex + 100,
  target: row.target + 0.25,
}));

describe("CFB-D one-common-noise query", () => {
  test("rank-one plus diagonal covariance preserves variance and uniqueness floor", () => {
    const artifact = fitCommonNoiseArtifact(trainingRows, validationRows);
    expect(artifact.factorCovariance.map((row, index) => row[index])).toEqual(
      artifact.residualCovariance.map((row, index) => row[index]),
    );
    expect(artifact.uniquenessRatios.every((ratio) => ratio >= COMMON_NOISE_UNIQUENESS_FLOOR - 1e-12)).toBe(true);
    expect(artifact.weights.every((weight) => Number.isFinite(weight) && weight >= 0)).toBe(true);
    expect(artifact.weights.reduce((sum, weight) => sum + weight, 0)).toBeCloseTo(1, 12);
  });

  test("canonical training order and expert order make the artifact deterministic", () => {
    const forward = fitCommonNoiseArtifact(trainingRows, validationRows);
    const reversed = fitCommonNoiseArtifact(
      [...trainingRows].reverse(),
      validationRows,
      ["ridge-window", "train-mean", "window-start", "last"],
    );
    expect(reversed).toEqual(forward);
  });

  test("factor sign cannot change covariance or weights", () => {
    const forward = fitCommonNoiseArtifact(trainingRows, validationRows);
    const flipped = fitCommonNoiseArtifact(trainingRows, validationRows, undefined, "flip-loading-sign");
    expect(flipped.factorCovariance).toEqual(forward.factorCovariance);
    expect(flipped.regularizedCovariance).toEqual(forward.regularizedCovariance);
    expect(flipped.weights).toEqual(forward.weights);
  });

  test("dropping the common factor changes the fitted weight artifact", () => {
    const common = fitCommonNoiseArtifact(trainingRows, validationRows);
    const diagonal = fitCommonNoiseArtifact(trainingRows, validationRows, undefined, "drop-common-factor");
    const difference = common.weights.reduce(
      (maximum, weight, index) => Math.max(maximum, Math.abs(weight - diagonal.weights[index]!)),
      0,
    );
    expect(difference).toBeGreaterThan(1e-6);
  });

  test("test-label calibration and malformed rows fail closed", () => {
    expect(() => assertCommonNoiseCalibrationSource("test")).toThrow("CFB-COMMON-NOISE-CALIBRATION-LEAKAGE");
    const malformed: readonly ForecastRow[] = [
      ...trainingRows.slice(0, -1),
      { ...trainingRows.at(-1)!, target: Number.NaN },
    ];
    expect(() => fitCommonNoiseArtifact(malformed, validationRows)).toThrow("CFB-COMMON-NOISE-NONFINITE-ROW");
  });
});
