/**
 * Frozen design: deterministic validation-only covariance query over canonical
 * evidence identities. Replicated state remains the content-addressed evidence union.
 */

import type { Etth1Example } from "./etth1-dataset";
import {
  EXPERT_NAMES,
  evaluatePredictions,
  fitStaticExpertModel,
  forecastRows,
  movingBlockDifference,
  perRowLoss,
  permutedTargets,
  runStaticEnsembleBenchmark,
  type BootstrapInterval,
  type ExpertForecasts,
  type ExpertName,
  type ForecastRow,
  type GaussianPrediction,
  type PredictionMetrics,
  type StaticBenchmarkOptions,
} from "./etth1-static-ensemble";

export const CORRELATION_SHRINKAGES = [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1] as const;

type Weight4 = readonly [number, number, number, number];
type Matrix4 = readonly [
  readonly [number, number, number, number],
  readonly [number, number, number, number],
  readonly [number, number, number, number],
  readonly [number, number, number, number],
];

export interface CorrelatedErrorArtifact {
  readonly expertOrder: typeof EXPERT_NAMES;
  readonly shrinkage: number;
  readonly activeMask: number;
  readonly weights: Weight4;
  readonly residualCovariance: Matrix4;
  readonly shrunkCovariance: Matrix4;
  readonly predictedVariance: number;
  readonly intervalVariance: number;
  readonly validationMse: number;
  readonly diagonalVarianceRatio: number;
  readonly fittedScalarCount: 27;
}

export interface CorrelatedErrorQueryResult {
  readonly artifact: CorrelatedErrorArtifact;
  readonly metrics: PredictionMetrics;
  readonly bootstrapVersusBestValidation: {
    readonly mse: BootstrapInterval;
    readonly gaussianNll: BootstrapInterval;
  };
  readonly bootstrapVersusStaticDag: {
    readonly mse: BootstrapInterval;
    readonly gaussianNll: BootstrapInterval;
  };
  readonly zeroOffDiagonalControl: {
    readonly artifact: CorrelatedErrorArtifact;
    readonly maximumPredictionDifference: number;
    readonly metricDifference: number;
  };
  readonly permutedTargets: {
    readonly seed: number;
    readonly metrics: PredictionMetrics;
    readonly mseChange: number;
    readonly nllChange: number;
  };
  readonly verdict: {
    readonly status: "useful" | "calibration-repair-only" | "not-supported";
    readonly reason: string;
  };
}

function average(values: readonly number[]): number {
  if (values.length === 0) throw new Error("CFB-CORRELATED-EMPTY-MEAN");
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function expertVector(experts: ExpertForecasts): Weight4 {
  return [experts.last, experts["window-start"], experts["train-mean"], experts["ridge-window"]];
}

function canonicalOrder(order: readonly ExpertName[]): typeof EXPERT_NAMES {
  if (order.length !== EXPERT_NAMES.length || new Set(order).size !== EXPERT_NAMES.length) {
    throw new Error("CFB-CORRELATED-EXPERT-ORDER");
  }
  if (!EXPERT_NAMES.every((name) => order.includes(name))) throw new Error("CFB-CORRELATED-EXPERT-ORDER");
  return EXPERT_NAMES;
}

function residualMatrix(rows: readonly ForecastRow[]): readonly Weight4[] {
  if (rows.length < 2) throw new Error("CFB-CORRELATED-VALIDATION-SMALL");
  return rows.map((row) => {
    const forecasts = expertVector(row.experts);
    return forecasts.map((forecast) => row.target - forecast) as unknown as Weight4;
  });
}

function covarianceMatrix(residualRows: readonly Weight4[]): Matrix4 {
  const means = [0, 1, 2, 3].map((column) => average(residualRows.map((row) => row[column]!))) as [number, number, number, number];
  return [0, 1, 2, 3].map((left) => [0, 1, 2, 3].map((right) => {
    const sum = residualRows.reduce(
      (total, row) => total + (row[left]! - means[left]!) * (row[right]! - means[right]!),
      0,
    );
    return sum / (residualRows.length - 1);
  })) as unknown as Matrix4;
}

function shrinkCovariance(covariance: Matrix4, shrinkage: number, zeroOffDiagonal: boolean): Matrix4 {
  if (!(shrinkage >= 0 && shrinkage <= 1)) throw new Error("CFB-CORRELATED-SHRINKAGE");
  return [0, 1, 2, 3].map((row) => [0, 1, 2, 3].map((column) => {
    const value = covariance[row]![column]!;
    if (row === column) return value;
    return zeroOffDiagonal ? 0 : (1 - shrinkage) * value;
  })) as unknown as Matrix4;
}

function solve(matrix: readonly (readonly number[])[], vector: readonly number[]): readonly number[] | undefined {
  const size = vector.length;
  if (size === 0 || matrix.length !== size || matrix.some((row) => row.length !== size)) {
    throw new Error("CFB-CORRELATED-LINEAR-SHAPE");
  }
  const augmented = matrix.map((row, index) => [...row, vector[index]!]);
  for (let column = 0; column < size; column += 1) {
    let pivotRow = column;
    let pivotAbsolute = Math.abs(augmented[column]?.[column] ?? 0);
    for (let row = column + 1; row < size; row += 1) {
      const candidate = Math.abs(augmented[row]?.[column] ?? 0);
      if (candidate > pivotAbsolute) {
        pivotAbsolute = candidate;
        pivotRow = row;
      }
    }
    if (pivotAbsolute <= 1e-12) return undefined;
    if (pivotRow !== column) {
      const current = augmented[column];
      const replacement = augmented[pivotRow];
      if (current === undefined || replacement === undefined) throw new Error("CFB-CORRELATED-PIVOT-MISSING");
      augmented[column] = replacement;
      augmented[pivotRow] = current;
    }
    const pivot = augmented[column]?.[column];
    if (pivot === undefined || !Number.isFinite(pivot)) return undefined;
    for (let entry = column; entry <= size; entry += 1) augmented[column]![entry]! /= pivot;
    for (let row = 0; row < size; row += 1) {
      if (row === column) continue;
      const factor = augmented[row]?.[column];
      if (factor === undefined) return undefined;
      for (let entry = column; entry <= size; entry += 1) {
        augmented[row]![entry]! -= factor * augmented[column]![entry]!;
      }
    }
  }
  const result = augmented.map((row) => row[size]);
  return result.every((value) => value !== undefined && Number.isFinite(value)) ? result as number[] : undefined;
}

function quadraticForm(weights: Weight4, covariance: Matrix4): number {
  let result = 0;
  for (let row = 0; row < 4; row += 1) {
    for (let column = 0; column < 4; column += 1) result += weights[row]! * covariance[row]![column]! * weights[column]!;
  }
  return result;
}

function minimumVarianceWeights(covariance: Matrix4): { readonly activeMask: number; readonly weights: Weight4; readonly variance: number } {
  let best: { readonly activeMask: number; readonly weights: Weight4; readonly variance: number } | undefined;
  for (let mask = 1; mask < 16; mask += 1) {
    const indices = [0, 1, 2, 3].filter((index) => (mask & (1 << index)) !== 0);
    const subset = indices.map((row) => indices.map((column) => covariance[row]![column]!));
    const solved = solve(subset, indices.map(() => 1));
    if (solved === undefined) continue;
    const denominator = solved.reduce((sum, value) => sum + value, 0);
    if (!(denominator > 1e-12)) continue;
    const subsetWeights = solved.map((value) => value / denominator);
    if (subsetWeights.some((weight) => weight < -1e-12 || !Number.isFinite(weight))) continue;
    const normalized = subsetWeights.map((weight) => weight < 0 ? 0 : weight);
    const normalization = normalized.reduce((sum, value) => sum + value, 0);
    const weights = [0, 0, 0, 0] as [number, number, number, number];
    for (let index = 0; index < indices.length; index += 1) weights[indices[index]!] = normalized[index]! / normalization;
    const variance = quadraticForm(weights, covariance);
    const candidate = { activeMask: mask, weights, variance };
    if (best === undefined || variance < best.variance - 1e-12 || (Math.abs(variance - best.variance) <= 1e-12 && mask < best.activeMask)) {
      best = candidate;
    }
  }
  if (best === undefined || !(best.variance > 0) || !Number.isFinite(best.variance)) throw new Error("CFB-CORRELATED-NO-FEASIBLE-SUBSET");
  return best;
}

function predictionMean(row: ForecastRow, weights: Weight4): number {
  const forecasts = expertVector(row.experts);
  return forecasts.reduce((sum, forecast, index) => sum + forecast * weights[index]!, 0);
}

function predictions(rows: readonly ForecastRow[], artifact: CorrelatedErrorArtifact): readonly GaussianPrediction[] {
  return rows.map((row) => ({ mean: predictionMean(row, artifact.weights), variance: artifact.intervalVariance }));
}

export function fitCorrelatedErrorArtifact(
  validationRows: readonly ForecastRow[],
  order: readonly ExpertName[] = EXPERT_NAMES,
  zeroOffDiagonal = false,
): CorrelatedErrorArtifact {
  canonicalOrder(order);
  const covariance = covarianceMatrix(residualMatrix(validationRows));
  const diagonal = covariance.map((row, index) => row[index]!) as number[];
  if (diagonal.some((value) => !(value > 0) || !Number.isFinite(value))) throw new Error("CFB-CORRELATED-COVARIANCE-DIAGONAL");
  let best: CorrelatedErrorArtifact | undefined;
  for (const shrinkage of CORRELATION_SHRINKAGES) {
    const shrunk = shrinkCovariance(covariance, shrinkage, zeroOffDiagonal);
    const candidateWeights = minimumVarianceWeights(shrunk);
    const validationErrors = validationRows.map((row) => predictionMean(row, candidateWeights.weights) - row.target);
    const validationMse = average(validationErrors.map((error) => error * error));
    const candidate: CorrelatedErrorArtifact = {
      expertOrder: EXPERT_NAMES,
      shrinkage,
      activeMask: candidateWeights.activeMask,
      weights: candidateWeights.weights,
      residualCovariance: covariance,
      shrunkCovariance: shrunk,
      predictedVariance: candidateWeights.variance,
      intervalVariance: validationMse,
      validationMse,
      diagonalVarianceRatio: Math.max(...diagonal) / Math.min(...diagonal),
      fittedScalarCount: 27,
    };
    if (
      best === undefined
      || validationMse < best.validationMse - 1e-12
      || (Math.abs(validationMse - best.validationMse) <= 1e-12
        && (shrinkage > best.shrinkage || (shrinkage === best.shrinkage && candidate.activeMask < best.activeMask)))
    ) {
      best = candidate;
    }
  }
  if (best === undefined) throw new Error("CFB-CORRELATED-ARTIFACT-NOT-FIT");
  return best;
}

function maximumPredictionDifference(left: readonly GaussianPrediction[], right: readonly GaussianPrediction[]): number {
  if (left.length !== right.length) throw new Error("CFB-CORRELATED-PREDICTION-SHAPE");
  return left.reduce((maximum, prediction, index) => {
    const other = right[index];
    if (other === undefined) throw new Error("CFB-CORRELATED-PREDICTION-MISSING");
    return Math.max(maximum, Math.abs(prediction.mean - other.mean), Math.abs(prediction.variance - other.variance));
  }, 0);
}

export function runCorrelatedErrorQueryBenchmark(
  train: readonly Etth1Example[],
  validation: readonly Etth1Example[],
  test: readonly Etth1Example[],
  options: StaticBenchmarkOptions,
): CorrelatedErrorQueryResult {
  if (train.some((example) => example.split !== "train")) throw new Error("CFB-CORRELATED-TRAIN-PROVENANCE");
  if (validation.some((example) => example.split !== "validation")) throw new Error("CFB-CORRELATED-VALIDATION-PROVENANCE");
  if (test.some((example) => example.split !== "test")) throw new Error("CFB-CORRELATED-TEST-PROVENANCE");
  const staticResult = runStaticEnsembleBenchmark(train, validation, test, options);
  const model = fitStaticExpertModel(train, validation);
  const validationRows = forecastRows(validation, model.trainMean, model.ridge);
  const testRows = forecastRows(test, model.trainMean, model.ridge);
  const targets = testRows.map((row) => row.target);
  const artifact = fitCorrelatedErrorArtifact(validationRows);
  const queryPredictions = predictions(testRows, artifact);
  const metrics = evaluatePredictions(targets, queryPredictions);
  const bestName = staticResult.selectedBestValidationExpert;
  const bestPredictions = testRows.map((row) => ({ mean: row.experts[bestName], variance: model.validationVariances[bestName] }));
  const staticDagVariance = 1 / EXPERT_NAMES.reduce((precision, name) => precision + 1 / model.validationVariances[name], 0);
  const staticDagPredictions = testRows.map((row) => ({
    mean: staticDagVariance * EXPERT_NAMES.reduce((natural, name) => natural + row.experts[name] / model.validationVariances[name], 0),
    variance: staticDagVariance,
  }));
  const zeroArtifact = fitCorrelatedErrorArtifact(validationRows, [...EXPERT_NAMES].reverse(), true);
  const zeroPredictions = predictions(testRows, zeroArtifact);
  const zeroMetrics = evaluatePredictions(targets, zeroPredictions);
  const permutationSeed = (options.bootstrapSeed ^ 0x7f4a7c15) >>> 0;
  const permutedMetrics = evaluatePredictions(permutedTargets(targets, permutationSeed), queryPredictions);
  const bootstrapVersusBestValidation = {
    mse: movingBlockDifference(perRowLoss(targets, queryPredictions, "mse"), perRowLoss(targets, bestPredictions, "mse"), options),
    gaussianNll: movingBlockDifference(
      perRowLoss(targets, queryPredictions, "nll"),
      perRowLoss(targets, bestPredictions, "nll"),
      { ...options, bootstrapSeed: options.bootstrapSeed ^ 0x9e3779b9 },
    ),
  };
  const bootstrapVersusStaticDag = {
    mse: movingBlockDifference(perRowLoss(targets, queryPredictions, "mse"), perRowLoss(targets, staticDagPredictions, "mse"), options),
    gaussianNll: movingBlockDifference(
      perRowLoss(targets, queryPredictions, "nll"),
      perRowLoss(targets, staticDagPredictions, "nll"),
      { ...options, bootstrapSeed: options.bootstrapSeed ^ 0x9e3779b9 },
    ),
  };
  const coverageDegradation = staticResult.laneMetrics.equal.coverage95 - metrics.coverage95;
  const useful = bootstrapVersusBestValidation.mse.upper95 < 0
    && coverageDegradation <= 0.05
    && metrics.gaussianNll <= staticResult.laneMetrics["best-validation"].gaussianNll;
  const mseInflation = (metrics.mse - staticResult.laneMetrics["zeta-static-dag"].mse) / staticResult.laneMetrics["zeta-static-dag"].mse;
  const calibrationRepair = metrics.coverage95 - staticResult.laneMetrics["zeta-static-dag"].coverage95 >= 0.10
    && mseInflation <= 0.01
    && metrics.gaussianNll < staticResult.laneMetrics["zeta-static-dag"].gaussianNll;
  const status = useful ? "useful" : calibrationRepair ? "calibration-repair-only" : "not-supported";
  return {
    artifact,
    metrics,
    bootstrapVersusBestValidation,
    bootstrapVersusStaticDag,
    zeroOffDiagonalControl: {
      artifact: zeroArtifact,
      maximumPredictionDifference: maximumPredictionDifference(queryPredictions, zeroPredictions),
      metricDifference: Math.max(Math.abs(metrics.mse - zeroMetrics.mse), Math.abs(metrics.gaussianNll - zeroMetrics.gaussianNll)),
    },
    permutedTargets: {
      seed: permutationSeed,
      metrics: permutedMetrics,
      mseChange: permutedMetrics.mse - metrics.mse,
      nllChange: permutedMetrics.gaussianNll - metrics.gaussianNll,
    },
    verdict: {
      status,
      reason: status === "useful"
        ? "the frozen held-out usefulness rule is satisfied"
        : status === "calibration-repair-only"
          ? "the frozen calibration-repair rule is satisfied but the usefulness rule is not"
          : "neither frozen held-out rule is satisfied",
    },
  };
}

export function assertCorrelatedCalibrationSource(source: "validation" | "test"): void {
  if (source !== "validation") throw new Error("CFB-CORRELATED-CALIBRATION-LEAKAGE");
}
