import { describe, expect, test } from "bun:test";
import type { Etth1Example, Etth1Split } from "./etth1-dataset";
import {
  assertValidationOnlyVarianceSource,
  evaluatePredictions,
  movingBlockDifference,
  runStaticEnsembleBenchmark,
} from "./etth1-static-ensemble";

function example(index: number, split: Etth1Split, base: number): Etth1Example {
  const inputTargetValues = Array.from({ length: 96 }, (_, offset) => base + offset * 0.1);
  return {
    exampleIndex: index,
    split,
    inputStartRow: index,
    inputEndRow: index + 95,
    targetRow: index + 191,
    inputTargetValues,
    target: base + 10 + (index % 3) * 0.2,
  };
}

describe("CFB-B static ETTh1 ensemble", () => {
  test("fits only declared train/validation rows and produces identical chain/DAG posteriors", () => {
    const train = Array.from({ length: 40 }, (_, index) => example(index, "train", index * 0.5));
    const validation = Array.from({ length: 24 }, (_, index) => example(100 + index, "validation", 20 + index * 0.4));
    const heldOut = Array.from({ length: 32 }, (_, index) => example(200 + index, "test", 30 + index * 0.3));
    const result = runStaticEnsembleBenchmark(train, validation, heldOut, {
      bootstrapSeed: 123456789,
      bootstrapReplicates: 100,
      bootstrapBlockLength: 8,
    });

    expect(result.chainDagMaximumDifference).toBeLessThanOrEqual(1e-12);
    expect(result.dropExpertMaximumDifference).toBeGreaterThan(0);
    expect(result.model.validationVariances.last).toBeGreaterThan(0);
    expect(result.model.maximumAbsoluteValidationResidualCorrelation).toBeGreaterThanOrEqual(0);
    expect(result.duplicateExpert.status).toBe("invalid-dependent-evidence");
    expect(result.permutedTargets.mseChangeFromStaticDag).toBeGreaterThan(0);
  });

  test("metric and moving-block bootstrap calculations are deterministic", () => {
    const targets = [0, 1, 2, 3];
    const predictions = targets.map((target) => ({ mean: target + 1, variance: 4 }));
    expect(evaluatePredictions(targets, predictions)).toMatchObject({ mse: 1, mae: 1, coverage95: 1 });
    const first = movingBlockDifference([1, 2, 3, 4], [2, 2, 2, 2], {
      bootstrapSeed: 42,
      bootstrapReplicates: 100,
      bootstrapBlockLength: 2,
    });
    const second = movingBlockDifference([1, 2, 3, 4], [2, 2, 2, 2], {
      bootstrapSeed: 42,
      bootstrapReplicates: 100,
      bootstrapBlockLength: 2,
    });
    expect(first).toEqual(second);
    expect(first.pointEstimate).toBe(0.5);
  });

  test("test-set variance fitting and split substitutions are rejected", () => {
    expect(() => assertValidationOnlyVarianceSource("test")).toThrow("CFB-B-VARIANCE-LEAKAGE");
    const train = Array.from({ length: 10 }, (_, index) => example(index, "train", index));
    const validation = Array.from({ length: 10 }, (_, index) => example(100 + index, "test", index));
    expect(() => runStaticEnsembleBenchmark(train, validation, validation, {
      bootstrapSeed: 1,
      bootstrapReplicates: 20,
      bootstrapBlockLength: 2,
    })).toThrow("CFB-B-VALIDATION-PROVENANCE");
  });
});
