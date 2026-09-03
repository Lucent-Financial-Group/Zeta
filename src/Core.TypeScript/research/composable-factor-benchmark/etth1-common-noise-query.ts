/**
 * CFB-D frozen design: rank-one common forecast error plus positive diagonal
 * uniqueness, evaluated only as a deterministic query over canonical evidence.
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

export const COMMON_NOISE_UNIQUENESS_FLOOR = 0.05;
export const COMMON_NOISE_RIDGE = 0.25;
export const COMMON_NOISE_POWER_ITERATIONS = 256;

type Weight4 = readonly [number, number, number, number];
type Matrix4 = readonly [
  readonly [number, number, number, number],
  readonly [number, number, number, number],
  readonly [number, number, number, number],
  readonly [number, number, number, number],
];

export interface CommonNoiseArtifact {
  readonly expertOrder: typeof EXPERT_NAMES;
  readonly residualMeans: Weight4;
  readonly residualCovariance: Matrix4;
  readonly leadingEigenvalue: number;
  readonly leadingEigenvalueShare: number;
  readonly loadingScale: number;
  readonly factorLoading: Weight4;
  readonly uniqueness: Weight4;
  readonly uniquenessRatios: Weight4;
  readonly factorCovariance: Matrix4;
  readonly regularizedCovariance: Matrix4;
  readonly activeMask: number;
  readonly weights: Weight4;
  readonly predictedVariance: number;
  readonly intervalVariance: number;
  readonly validationMse: number;
  readonly ridge: typeof COMMON_NOISE_RIDGE;
  readonly fittedScalarCount: 15;
}

export interface CommonNoiseQueryResult {
  readonly artifact: CommonNoiseArtifact;
  readonly metrics: PredictionMetrics;
  readonly nonVacuity: {
    readonly passes: boolean;
    readonly maximumOffDiagonal: number;
    readonly activeWeightCount: number;
    readonly diagonalWeightDifference: number;
    readonly uniquenessFloorHolds: boolean;
  };
  readonly diagonalMutation: {
    readonly artifact: CommonNoiseArtifact;
    readonly maximumPredictionDifference: number;
    readonly metricDifference: number;
  };
  readonly reversedTrainingOrderDifference: number;
  readonly signFlip: {
    readonly covarianceDifference: number;
    readonly weightDifference: number;
  };
  readonly bootstrapVersusBestValidation: {
    readonly mse: BootstrapInterval;
    readonly gaussianNll: BootstrapInterval;
  };
  readonly bootstrapVersusStaticDag: {
    readonly mse: BootstrapInterval;
    readonly gaussianNll: BootstrapInterval;
  };
  readonly permutedTargets: {
    readonly seed: number;
    readonly metrics: PredictionMetrics;
    readonly mseChange: number;
    readonly nllChange: number;
  };
  readonly verdict: {
    readonly status: "useful" | "calibration-repair-only" | "non-vacuous-not-supported" | "invalid-vacuous";
    readonly reason: string;
  };
}

function average(values: readonly number[]): number {
  if (values.length === 0) throw new Error("CFB-COMMON-NOISE-EMPTY-MEAN");
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function expertVector(experts: ExpertForecasts): Weight4 {
  return [experts.last, experts["window-start"], experts["train-mean"], experts["ridge-window"]];
}

function validateExpertOrder(order: readonly ExpertName[]): void {
  if (order.length !== EXPERT_NAMES.length || new Set(order).size !== EXPERT_NAMES.length) {
    throw new Error("CFB-COMMON-NOISE-EXPERT-ORDER");
  }
  if (!EXPERT_NAMES.every((name) => order.includes(name))) throw new Error("CFB-COMMON-NOISE-EXPERT-ORDER");
}

function canonicalResidualRows(rows: readonly ForecastRow[], label: "training" | "validation"): readonly Weight4[] {
  if (rows.length < 2) throw new Error(`CFB-COMMON-NOISE-${label.toUpperCase()}-SMALL`);
  const ordered = [...rows].sort((left, right) => left.exampleIndex - right.exampleIndex);
  for (let index = 1; index < ordered.length; index += 1) {
    if (ordered[index - 1]?.exampleIndex === ordered[index]?.exampleIndex) {
      throw new Error("CFB-COMMON-NOISE-DUPLICATE-EXAMPLE");
    }
  }
  return ordered.map((row) => {
    if (!Number.isFinite(row.target)) throw new Error("CFB-COMMON-NOISE-NONFINITE-ROW");
    const forecasts = expertVector(row.experts);
    if (forecasts.some((forecast) => !Number.isFinite(forecast))) throw new Error("CFB-COMMON-NOISE-NONFINITE-ROW");
    return forecasts.map((forecast) => row.target - forecast) as unknown as Weight4;
  });
}

function covarianceMatrix(residualRows: readonly Weight4[]): { readonly means: Weight4; readonly covariance: Matrix4 } {
  const means = [0, 1, 2, 3].map((column) => average(residualRows.map((row) => row[column]!))) as unknown as Weight4;
  const covariance = [0, 1, 2, 3].map((left) => [0, 1, 2, 3].map((right) => {
    const sum = residualRows.reduce(
      (total, row) => total + (row[left]! - means[left]!) * (row[right]! - means[right]!),
      0,
    );
    return sum / (residualRows.length - 1);
  })) as unknown as Matrix4;
  if (covariance.some((row) => row.some((value) => !Number.isFinite(value)))) {
    throw new Error("CFB-COMMON-NOISE-NONFINITE-COVARIANCE");
  }
  if ([0, 1, 2, 3].some((index) => !(covariance[index]![index]! > 0))) {
    throw new Error("CFB-COMMON-NOISE-NONPOSITIVE-DIAGONAL");
  }
  return { means, covariance };
}

function dot(left: Weight4, right: Weight4): number {
  return left.reduce((sum, value, index) => sum + value * right[index]!, 0);
}

function matrixVector(matrix: Matrix4, vector: Weight4): Weight4 {
  return matrix.map((row) => row.reduce((sum, value, index) => sum + value * vector[index]!, 0)) as unknown as Weight4;
}

function leadingEigenpair(covariance: Matrix4): { readonly value: number; readonly vector: Weight4 } {
  let vector: Weight4 = [0.5, 0.5, 0.5, 0.5];
  for (let iteration = 0; iteration < COMMON_NOISE_POWER_ITERATIONS; iteration += 1) {
    const product = matrixVector(covariance, vector);
    const norm = Math.sqrt(dot(product, product));
    if (!(norm > 0) || !Number.isFinite(norm)) throw new Error("CFB-COMMON-NOISE-EIGENPAIR");
    let normalized = product.map((value) => value / norm) as unknown as Weight4;
    if (normalized.reduce((sum, value) => sum + value, 0) < 0) {
      normalized = normalized.map((value) => -value) as unknown as Weight4;
    }
    vector = normalized;
  }
  const value = dot(vector, matrixVector(covariance, vector));
  if (!(value >= 0) || !Number.isFinite(value)) throw new Error("CFB-COMMON-NOISE-EIGENPAIR");
  return { value, vector };
}

function factorModel(covariance: Matrix4, flipLoadingSign: boolean, dropCommonFactor: boolean): {
  readonly leadingEigenvalue: number;
  readonly leadingEigenvalueShare: number;
  readonly loadingScale: number;
  readonly factorLoading: Weight4;
  readonly uniqueness: Weight4;
  readonly uniquenessRatios: Weight4;
  readonly factorCovariance: Matrix4;
} {
  const trace = [0, 1, 2, 3].reduce((sum, index) => sum + covariance[index]![index]!, 0);
  const eigenpair = leadingEigenpair(covariance);
  const rawLoading = eigenpair.vector.map((value) => Math.sqrt(eigenpair.value) * value) as unknown as Weight4;
  let scale = 1;
  for (let index = 0; index < 4; index += 1) {
    const loading = Math.abs(rawLoading[index]!);
    if (loading > 0) {
      scale = Math.min(scale, Math.sqrt((1 - COMMON_NOISE_UNIQUENESS_FLOOR) * covariance[index]![index]!) / loading);
    }
  }
  const signed = flipLoadingSign ? -1 : 1;
  const factorLoading = dropCommonFactor
    ? [0, 0, 0, 0] as const
    : rawLoading.map((value) => signed * scale * value) as unknown as Weight4;
  const uniqueness = [0, 1, 2, 3].map((index) => covariance[index]![index]! - factorLoading[index]! * factorLoading[index]!) as unknown as Weight4;
  const uniquenessRatios = uniqueness.map((value, index) => value / covariance[index]![index]!) as unknown as Weight4;
  if (uniquenessRatios.some((ratio) => ratio < COMMON_NOISE_UNIQUENESS_FLOOR - 1e-12 || !Number.isFinite(ratio))) {
    throw new Error("CFB-COMMON-NOISE-UNIQUENESS-FLOOR");
  }
  const factorCovariance = [0, 1, 2, 3].map((row) => [0, 1, 2, 3].map((column) => (
    row === column
      ? covariance[row]![row]!
      : factorLoading[row]! * factorLoading[column]!
  ))) as unknown as Matrix4;
  return {
    leadingEigenvalue: eigenpair.value,
    leadingEigenvalueShare: eigenpair.value / trace,
    loadingScale: dropCommonFactor ? 0 : scale,
    factorLoading,
    uniqueness,
    uniquenessRatios,
    factorCovariance,
  };
}

function regularize(covariance: Matrix4): Matrix4 {
  const scale = [0, 1, 2, 3].reduce((sum, index) => sum + covariance[index]![index]!, 0) / 4;
  return covariance.map((row, rowIndex) => row.map((value, columnIndex) => (
    rowIndex === columnIndex ? value + COMMON_NOISE_RIDGE * scale : value
  ))) as unknown as Matrix4;
}

function solve(matrix: readonly (readonly number[])[], vector: readonly number[]): readonly number[] | undefined {
  const size = vector.length;
  if (size === 0 || matrix.length !== size || matrix.some((row) => row.length !== size)) {
    throw new Error("CFB-COMMON-NOISE-LINEAR-SHAPE");
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
      if (current === undefined || replacement === undefined) throw new Error("CFB-COMMON-NOISE-PIVOT-MISSING");
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
    for (let column = 0; column < 4; column += 1) {
      result += weights[row]! * covariance[row]![column]! * weights[column]!;
    }
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
    for (let index = 0; index < indices.length; index += 1) {
      weights[indices[index]!] = normalized[index]! / normalization;
    }
    const variance = quadraticForm(weights, covariance);
    const candidate = { activeMask: mask, weights, variance };
    if (best === undefined || variance < best.variance - 1e-12 || (Math.abs(variance - best.variance) <= 1e-12 && mask < best.activeMask)) {
      best = candidate;
    }
  }
  if (best === undefined || !(best.variance > 0) || !Number.isFinite(best.variance)) {
    throw new Error("CFB-COMMON-NOISE-NO-FEASIBLE-SUBSET");
  }
  return best;
}

function predictionMean(row: ForecastRow, weights: Weight4): number {
  const forecasts = expertVector(row.experts);
  return forecasts.reduce((sum, forecast, index) => sum + forecast * weights[index]!, 0);
}

function predictions(rows: readonly ForecastRow[], artifact: CommonNoiseArtifact): readonly GaussianPrediction[] {
  return rows.map((row) => ({ mean: predictionMean(row, artifact.weights), variance: artifact.intervalVariance }));
}

function maximumVectorDifference(left: Weight4, right: Weight4): number {
  return left.reduce((maximum, value, index) => Math.max(maximum, Math.abs(value - right[index]!)), 0);
}

function maximumMatrixDifference(left: Matrix4, right: Matrix4): number {
  return left.reduce((maximum, row, rowIndex) => Math.max(
    maximum,
    row.reduce((rowMaximum, value, columnIndex) => Math.max(rowMaximum, Math.abs(value - right[rowIndex]![columnIndex]!)), 0),
  ), 0);
}

function maximumPredictionDifference(left: readonly GaussianPrediction[], right: readonly GaussianPrediction[]): number {
  if (left.length !== right.length) throw new Error("CFB-COMMON-NOISE-PREDICTION-SHAPE");
  return left.reduce((maximum, prediction, index) => {
    const other = right[index];
    if (other === undefined) throw new Error("CFB-COMMON-NOISE-PREDICTION-MISSING");
    return Math.max(maximum, Math.abs(prediction.mean - other.mean), Math.abs(prediction.variance - other.variance));
  }, 0);
}

export function fitCommonNoiseArtifact(
  trainingRows: readonly ForecastRow[],
  validationRows: readonly ForecastRow[],
  order: readonly ExpertName[] = EXPERT_NAMES,
  mutation: "none" | "drop-common-factor" | "flip-loading-sign" = "none",
): CommonNoiseArtifact {
  validateExpertOrder(order);
  const trainingResiduals = canonicalResidualRows(trainingRows, "training");
  canonicalResidualRows(validationRows, "validation");
  const moments = covarianceMatrix(trainingResiduals);
  const model = factorModel(moments.covariance, mutation === "flip-loading-sign", mutation === "drop-common-factor");
  const regularizedCovariance = regularize(model.factorCovariance);
  const weights = minimumVarianceWeights(regularizedCovariance);
  const validationErrors = validationRows.map((row) => predictionMean(row, weights.weights) - row.target);
  if (validationErrors.some((error) => !Number.isFinite(error))) throw new Error("CFB-COMMON-NOISE-VALIDATION-ERROR");
  const validationMse = average(validationErrors.map((error) => error * error));
  if (!(validationMse > 0) || !Number.isFinite(validationMse)) throw new Error("CFB-COMMON-NOISE-INTERVAL-VARIANCE");
  return {
    expertOrder: EXPERT_NAMES,
    residualMeans: moments.means,
    residualCovariance: moments.covariance,
    leadingEigenvalue: model.leadingEigenvalue,
    leadingEigenvalueShare: model.leadingEigenvalueShare,
    loadingScale: model.loadingScale,
    factorLoading: model.factorLoading,
    uniqueness: model.uniqueness,
    uniquenessRatios: model.uniquenessRatios,
    factorCovariance: model.factorCovariance,
    regularizedCovariance,
    activeMask: weights.activeMask,
    weights: weights.weights,
    predictedVariance: weights.variance,
    intervalVariance: validationMse,
    validationMse,
    ridge: COMMON_NOISE_RIDGE,
    fittedScalarCount: 15,
  };
}

export function runCommonNoiseQueryBenchmark(
  train: readonly Etth1Example[],
  validation: readonly Etth1Example[],
  test: readonly Etth1Example[],
  options: StaticBenchmarkOptions,
): CommonNoiseQueryResult {
  if (train.some((example) => example.split !== "train")) throw new Error("CFB-COMMON-NOISE-TRAIN-PROVENANCE");
  if (validation.some((example) => example.split !== "validation")) throw new Error("CFB-COMMON-NOISE-VALIDATION-PROVENANCE");
  if (test.some((example) => example.split !== "test")) throw new Error("CFB-COMMON-NOISE-TEST-PROVENANCE");
  const staticResult = runStaticEnsembleBenchmark(train, validation, test, options);
  const baseModel = fitStaticExpertModel(train, validation);
  const trainingRows = forecastRows(train, baseModel.trainMean, baseModel.ridge);
  const validationRows = forecastRows(validation, baseModel.trainMean, baseModel.ridge);
  const testRows = forecastRows(test, baseModel.trainMean, baseModel.ridge);
  const targets = testRows.map((row) => row.target);
  const artifact = fitCommonNoiseArtifact(trainingRows, validationRows);
  const queryPredictions = predictions(testRows, artifact);
  const metrics = evaluatePredictions(targets, queryPredictions);
  const diagonalArtifact = fitCommonNoiseArtifact(trainingRows, validationRows, [...EXPERT_NAMES].reverse(), "drop-common-factor");
  const diagonalPredictions = predictions(testRows, diagonalArtifact);
  const diagonalMetrics = evaluatePredictions(targets, diagonalPredictions);
  const reversedArtifact = fitCommonNoiseArtifact([...trainingRows].reverse(), validationRows);
  const signFlippedArtifact = fitCommonNoiseArtifact(trainingRows, validationRows, EXPERT_NAMES, "flip-loading-sign");
  const maximumOffDiagonal = artifact.factorCovariance.reduce((maximum, row, rowIndex) => Math.max(
    maximum,
    row.reduce((rowMaximum, value, columnIndex) => rowIndex === columnIndex ? rowMaximum : Math.max(rowMaximum, Math.abs(value)), 0),
  ), 0);
  const diagonalWeightDifference = maximumVectorDifference(artifact.weights, diagonalArtifact.weights);
  const activeWeightCount = artifact.weights.filter((weight) => weight > 1e-9).length;
  const uniquenessFloorHolds = artifact.uniquenessRatios.every((ratio) => ratio >= COMMON_NOISE_UNIQUENESS_FLOOR - 1e-12);
  const nonVacuityPasses = maximumOffDiagonal > 1e-9
    && activeWeightCount >= 2
    && diagonalWeightDifference > 1e-6
    && uniquenessFloorHolds;
  const bestName = staticResult.selectedBestValidationExpert;
  const bestPredictions = testRows.map((row) => ({ mean: row.experts[bestName], variance: baseModel.validationVariances[bestName] }));
  const staticDagVariance = 1 / EXPERT_NAMES.reduce((precision, name) => precision + 1 / baseModel.validationVariances[name], 0);
  const staticDagPredictions = testRows.map((row) => ({
    mean: staticDagVariance * EXPERT_NAMES.reduce((natural, name) => natural + row.experts[name] / baseModel.validationVariances[name], 0),
    variance: staticDagVariance,
  }));
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
  const permutationSeed = (options.bootstrapSeed ^ 0x2c1b3c6d) >>> 0;
  const permutedMetrics = evaluatePredictions(permutedTargets(targets, permutationSeed), queryPredictions);
  const coverageDegradation = staticResult.laneMetrics.equal.coverage95 - metrics.coverage95;
  const useful = nonVacuityPasses
    && bootstrapVersusBestValidation.mse.upper95 < 0
    && coverageDegradation <= 0.05
    && metrics.gaussianNll <= staticResult.laneMetrics["best-validation"].gaussianNll;
  const mseInflation = (metrics.mse - staticResult.laneMetrics["zeta-static-dag"].mse) / staticResult.laneMetrics["zeta-static-dag"].mse;
  const calibrationRepair = nonVacuityPasses
    && metrics.coverage95 - staticResult.laneMetrics["zeta-static-dag"].coverage95 >= 0.10
    && mseInflation <= 0.01
    && metrics.gaussianNll < staticResult.laneMetrics["zeta-static-dag"].gaussianNll;
  const status = !nonVacuityPasses
    ? "invalid-vacuous"
    : useful
      ? "useful"
      : calibrationRepair
        ? "calibration-repair-only"
        : "non-vacuous-not-supported";
  return {
    artifact,
    metrics,
    nonVacuity: {
      passes: nonVacuityPasses,
      maximumOffDiagonal,
      activeWeightCount,
      diagonalWeightDifference,
      uniquenessFloorHolds,
    },
    diagonalMutation: {
      artifact: diagonalArtifact,
      maximumPredictionDifference: maximumPredictionDifference(queryPredictions, diagonalPredictions),
      metricDifference: Math.max(Math.abs(metrics.mse - diagonalMetrics.mse), Math.abs(metrics.gaussianNll - diagonalMetrics.gaussianNll)),
    },
    reversedTrainingOrderDifference: Math.max(
      maximumVectorDifference(artifact.factorLoading, reversedArtifact.factorLoading),
      maximumVectorDifference(artifact.weights, reversedArtifact.weights),
      maximumMatrixDifference(artifact.factorCovariance, reversedArtifact.factorCovariance),
    ),
    signFlip: {
      covarianceDifference: maximumMatrixDifference(artifact.factorCovariance, signFlippedArtifact.factorCovariance),
      weightDifference: maximumVectorDifference(artifact.weights, signFlippedArtifact.weights),
    },
    bootstrapVersusBestValidation,
    bootstrapVersusStaticDag,
    permutedTargets: {
      seed: permutationSeed,
      metrics: permutedMetrics,
      mseChange: permutedMetrics.mse - metrics.mse,
      nllChange: permutedMetrics.gaussianNll - metrics.gaussianNll,
    },
    verdict: {
      status,
      reason: status === "invalid-vacuous"
        ? "the frozen pre-test non-vacuity gate failed"
        : status === "useful"
          ? "the frozen held-out usefulness rule is satisfied"
          : status === "calibration-repair-only"
            ? "the frozen calibration-repair rule is satisfied but the usefulness rule is not"
            : "the mechanism is non-vacuous but neither frozen held-out rule is satisfied",
    },
  };
}

export function assertCommonNoiseCalibrationSource(source: "validation" | "test"): void {
  if (source !== "validation") throw new Error("CFB-COMMON-NOISE-CALIBRATION-LEAKAGE");
}
