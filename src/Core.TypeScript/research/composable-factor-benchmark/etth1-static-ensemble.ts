/**
 * CFB-B: public ETTh1 Static ensemble benchmark.
 * This is not a reproduction of the learned Dynamic/Noisy precision-gated models.
 */

import { balancedDagReduction, chainReduction, type GaussianEvidence } from "./gaussian-topology";
import type { Etth1Example } from "./etth1-dataset";

export const EXPERT_NAMES = ["last", "window-start", "train-mean", "ridge-window"] as const;
export type ExpertName = (typeof EXPERT_NAMES)[number];
export type DeployableLane = "equal" | "best-validation" | "zeta-static-chain" | "zeta-static-dag";

export interface ExpertForecasts {
  readonly last: number;
  readonly "window-start": number;
  readonly "train-mean": number;
  readonly "ridge-window": number;
}

export interface ForecastRow {
  readonly exampleIndex: number;
  readonly target: number;
  readonly experts: ExpertForecasts;
}

export interface GaussianPrediction {
  readonly mean: number;
  readonly variance: number;
}

export interface PredictionMetrics {
  readonly mse: number;
  readonly mae: number;
  readonly gaussianNll: number;
  readonly coverage95: number;
  readonly meanIntervalWidth95: number;
}

export interface BootstrapInterval {
  readonly pointEstimate: number;
  readonly lower95: number;
  readonly upper95: number;
}

export interface RidgeModel {
  readonly lambda: number;
  readonly featureMeans: readonly [number, number, number];
  readonly featureScales: readonly [number, number, number];
  readonly coefficients: readonly [number, number, number, number];
  readonly validationMse: number;
}

export interface StaticExpertModel {
  readonly trainMean: number;
  readonly ridge: RidgeModel;
  readonly validationVariances: Readonly<Record<ExpertName, number>>;
  readonly maximumAbsoluteValidationResidualCorrelation: number;
  readonly fittedScalarCount: number;
}

export interface StaticEnsembleResult {
  readonly model: StaticExpertModel;
  readonly selectedBestValidationExpert: ExpertName;
  readonly laneMetrics: Readonly<Record<DeployableLane, PredictionMetrics>>;
  readonly oracleBestTestExpert: ExpertName;
  readonly oracleBestTestMetrics: PredictionMetrics;
  readonly chainDagMaximumDifference: number;
  readonly dropExpertMaximumDifference: number;
  readonly duplicateExpert: {
    readonly duplicated: ExpertName;
    readonly metrics: PredictionMetrics;
    readonly coverageChangeFromStaticDag: number;
    readonly nllChangeFromStaticDag: number;
    readonly status: "invalid-dependent-evidence";
  };
  readonly permutedTargets: {
    readonly seed: number;
    readonly metrics: PredictionMetrics;
    readonly mseChangeFromStaticDag: number;
    readonly nllChangeFromStaticDag: number;
  };
  readonly bootstrapVersusEqual: {
    readonly mse: BootstrapInterval;
    readonly gaussianNll: BootstrapInterval;
  };
  readonly usefulness: {
    readonly status: "supported" | "not-supported";
    readonly coverageDegradation: number;
    readonly reason: string;
  };
}

export interface StaticBenchmarkOptions {
  readonly bootstrapSeed: number;
  readonly bootstrapReplicates: number;
  readonly bootstrapBlockLength: number;
}

const LAMBDAS = [0, 1e-6, 1e-4, 1e-2, 1] as const;
const MIN_VARIANCE = 1e-9;
const Z95 = 1.959963984540054;

function requireWindow(example: Etth1Example): readonly number[] {
  if (example.inputTargetValues.length < 96) {
    throw new Error(`CFB-B-WINDOW-LENGTH:${String(example.exampleIndex)}:${String(example.inputTargetValues.length)}`);
  }
  return example.inputTargetValues;
}

function rawFeatures(example: Etth1Example): readonly [number, number, number] {
  const window = requireWindow(example);
  const start = window[0];
  const offset72 = window[72];
  const last = window[95];
  if (start === undefined || offset72 === undefined || last === undefined) {
    throw new Error(`CFB-B-FEATURE-MISSING:${String(example.exampleIndex)}`);
  }
  return [start, offset72, last];
}

function mean(values: readonly number[]): number {
  if (values.length === 0) throw new Error("CFB-B-EMPTY-MEAN");
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function populationVariance(values: readonly number[]): number {
  if (values.length === 0) throw new Error("CFB-B-EMPTY-VARIANCE");
  return Math.max(mean(values.map((value) => value * value)), MIN_VARIANCE);
}

function solveLinear4(matrix: readonly (readonly number[])[], vector: readonly number[]): readonly [number, number, number, number] {
  if (matrix.length !== 4 || vector.length !== 4 || matrix.some((row) => row.length !== 4)) {
    throw new Error("CFB-B-LINEAR-SHAPE");
  }
  const augmented = matrix.map((row, rowIndex) => [...row, vector[rowIndex] ?? 0]);
  for (let column = 0; column < 4; column += 1) {
    let pivotRow = column;
    let pivotAbs = Math.abs(augmented[column]?.[column] ?? 0);
    for (let row = column + 1; row < 4; row += 1) {
      const candidate = Math.abs(augmented[row]?.[column] ?? 0);
      if (candidate > pivotAbs) {
        pivotAbs = candidate;
        pivotRow = row;
      }
    }
    if (pivotAbs <= 1e-15) throw new Error("CFB-B-SINGULAR-RIDGE");
    if (pivotRow !== column) {
      const temporary = augmented[column];
      const replacement = augmented[pivotRow];
      if (temporary === undefined || replacement === undefined) throw new Error("CFB-B-PIVOT-MISSING");
      augmented[column] = replacement;
      augmented[pivotRow] = temporary;
    }
    const pivot = augmented[column]?.[column];
    if (pivot === undefined) throw new Error("CFB-B-PIVOT-UNDEFINED");
    for (let entry = column; entry <= 4; entry += 1) {
      const value = augmented[column]?.[entry];
      if (value === undefined) throw new Error("CFB-B-NORMALIZE-MISSING");
      augmented[column]![entry] = value / pivot;
    }
    for (let row = 0; row < 4; row += 1) {
      if (row === column) continue;
      const factor = augmented[row]?.[column];
      if (factor === undefined) throw new Error("CFB-B-ELIMINATION-MISSING");
      for (let entry = column; entry <= 4; entry += 1) {
        const rowValue = augmented[row]?.[entry];
        const pivotValue = augmented[column]?.[entry];
        if (rowValue === undefined || pivotValue === undefined) throw new Error("CFB-B-ELIMINATION-ENTRY");
        augmented[row]![entry] = rowValue - factor * pivotValue;
      }
    }
  }
  const result = augmented.map((row) => row[4]);
  if (result.some((value) => value === undefined || !Number.isFinite(value))) throw new Error("CFB-B-LINEAR-NON-FINITE");
  return [result[0]!, result[1]!, result[2]!, result[3]!];
}

function featureMoments(examples: readonly Etth1Example[]): {
  readonly means: readonly [number, number, number];
  readonly scales: readonly [number, number, number];
} {
  if (examples.length < 2) throw new Error("CFB-B-TRAIN-TOO-SMALL");
  const rows = examples.map(rawFeatures);
  const means = [0, 1, 2].map((column) => mean(rows.map((row) => row[column]!))) as [number, number, number];
  const scales = [0, 1, 2].map((column) => {
    const centeredSquares = rows.map((row) => (row[column]! - means[column]!) ** 2);
    return Math.max(Math.sqrt(centeredSquares.reduce((sum, value) => sum + value, 0) / (rows.length - 1)), 1e-9);
  }) as [number, number, number];
  return { means, scales };
}

function designRow(example: Etth1Example, means: readonly number[], scales: readonly number[]): readonly [number, number, number, number] {
  const features = rawFeatures(example);
  return [
    1,
    (features[0] - means[0]!) / scales[0]!,
    (features[1] - means[1]!) / scales[1]!,
    (features[2] - means[2]!) / scales[2]!,
  ];
}

function fitRidgeForLambda(
  train: readonly Etth1Example[],
  means: readonly number[],
  scales: readonly number[],
  lambda: number,
): readonly [number, number, number, number] {
  const xtx = Array.from({ length: 4 }, () => Array.from({ length: 4 }, () => 0));
  const xty = Array.from({ length: 4 }, () => 0);
  for (const example of train) {
    const row = designRow(example, means, scales);
    for (let left = 0; left < 4; left += 1) {
      xty[left]! += row[left]! * example.target;
      for (let right = 0; right < 4; right += 1) xtx[left]![right]! += row[left]! * row[right]!;
    }
  }
  for (let diagonal = 1; diagonal < 4; diagonal += 1) xtx[diagonal]![diagonal]! += lambda;
  return solveLinear4(xtx, xty);
}

function ridgePrediction(
  example: Etth1Example,
  means: readonly number[],
  scales: readonly number[],
  coefficients: readonly number[],
): number {
  const row = designRow(example, means, scales);
  return row.reduce((sum, value, index) => sum + value * coefficients[index]!, 0);
}

export function fitRidge(train: readonly Etth1Example[], validation: readonly Etth1Example[]): RidgeModel {
  if (validation.length === 0) throw new Error("CFB-B-VALIDATION-EMPTY");
  const moments = featureMoments(train);
  let best: RidgeModel | undefined;
  for (const lambda of LAMBDAS) {
    let coefficients: readonly [number, number, number, number];
    try {
      coefficients = fitRidgeForLambda(train, moments.means, moments.scales, lambda);
    } catch (error) {
      if (error instanceof Error && error.message === "CFB-B-SINGULAR-RIDGE") continue;
      throw error;
    }
    const validationMse = mean(validation.map((example) => {
      const error = ridgePrediction(example, moments.means, moments.scales, coefficients) - example.target;
      return error * error;
    }));
    const candidate: RidgeModel = {
      lambda,
      featureMeans: moments.means,
      featureScales: moments.scales,
      coefficients,
      validationMse,
    };
    if (best === undefined || candidate.validationMse < best.validationMse - 1e-15) best = candidate;
  }
  if (best === undefined) throw new Error("CFB-B-RIDGE-NOT-FIT");
  return best;
}

function forecast(example: Etth1Example, trainMean: number, ridge: RidgeModel): ExpertForecasts {
  const window = requireWindow(example);
  return {
    last: window[95]!,
    "window-start": window[0]!,
    "train-mean": trainMean,
    "ridge-window": ridgePrediction(example, ridge.featureMeans, ridge.featureScales, ridge.coefficients),
  };
}

export function forecastRows(examples: readonly Etth1Example[], trainMean: number, ridge: RidgeModel): readonly ForecastRow[] {
  return examples.map((example) => ({ exampleIndex: example.exampleIndex, target: example.target, experts: forecast(example, trainMean, ridge) }));
}

function residuals(rows: readonly ForecastRow[], expert: ExpertName): readonly number[] {
  return rows.map((row) => row.target - row.experts[expert]);
}

function residualCorrelation(left: readonly number[], right: readonly number[]): number {
  if (left.length !== right.length || left.length < 2) throw new Error("CFB-B-CORRELATION-SHAPE");
  const leftMean = mean(left);
  const rightMean = mean(right);
  let covariance = 0;
  let leftSum = 0;
  let rightSum = 0;
  for (let index = 0; index < left.length; index += 1) {
    const a = left[index]! - leftMean;
    const b = right[index]! - rightMean;
    covariance += a * b;
    leftSum += a * a;
    rightSum += b * b;
  }
  if (leftSum === 0 || rightSum === 0) return 0;
  return covariance / Math.sqrt(leftSum * rightSum);
}

export function fitStaticExpertModel(train: readonly Etth1Example[], validation: readonly Etth1Example[]): StaticExpertModel {
  if (train.some((example) => example.split !== "train")) throw new Error("CFB-B-TRAIN-PROVENANCE");
  if (validation.some((example) => example.split !== "validation")) throw new Error("CFB-B-VALIDATION-PROVENANCE");
  const trainMean = mean(train.map((example) => example.target));
  const ridge = fitRidge(train, validation);
  const validationRows = forecastRows(validation, trainMean, ridge);
  const validationVariances = Object.fromEntries(EXPERT_NAMES.map((expert) => [expert, populationVariance(residuals(validationRows, expert))])) as Record<ExpertName, number>;
  let maximumAbsoluteValidationResidualCorrelation = 0;
  for (let left = 0; left < EXPERT_NAMES.length; left += 1) {
    for (let right = left + 1; right < EXPERT_NAMES.length; right += 1) {
      maximumAbsoluteValidationResidualCorrelation = Math.max(
        maximumAbsoluteValidationResidualCorrelation,
        Math.abs(residualCorrelation(residuals(validationRows, EXPERT_NAMES[left]!), residuals(validationRows, EXPERT_NAMES[right]!))),
      );
    }
  }
  return {
    trainMean,
    ridge,
    validationVariances,
    maximumAbsoluteValidationResidualCorrelation,
    fittedScalarCount: 15,
  };
}

function expertEvidence(row: ForecastRow, model: StaticExpertModel, names: readonly ExpertName[] = EXPERT_NAMES): readonly GaussianEvidence[] {
  return names.map((name, index) => ({
    id: `${name}:${String(index)}`,
    mean: row.experts[name],
    variance: model.validationVariances[name],
  }));
}

function equalPredictions(rows: readonly ForecastRow[], variance: number): readonly GaussianPrediction[] {
  return rows.map((row) => ({ mean: mean(EXPERT_NAMES.map((expert) => row.experts[expert])), variance }));
}

function staticPredictions(rows: readonly ForecastRow[], model: StaticExpertModel, topology: "chain" | "dag", names: readonly ExpertName[] = EXPERT_NAMES): readonly GaussianPrediction[] {
  return rows.map((row) => {
    const evidence = expertEvidence(row, model, names);
    const reduction = topology === "chain" ? chainReduction(evidence) : balancedDagReduction(evidence);
    return reduction.posterior;
  });
}

function selectedPredictions(rows: readonly ForecastRow[], expert: ExpertName, variance: number): readonly GaussianPrediction[] {
  return rows.map((row) => ({ mean: row.experts[expert], variance }));
}

function fitEqualVariance(rows: readonly ForecastRow[]): number {
  return populationVariance(rows.map((row) => row.target - mean(EXPERT_NAMES.map((expert) => row.experts[expert]))));
}

export function evaluatePredictions(targets: readonly number[], predictions: readonly GaussianPrediction[]): PredictionMetrics {
  if (targets.length !== predictions.length || targets.length === 0) throw new Error("CFB-B-METRIC-SHAPE");
  let squared = 0;
  let absolute = 0;
  let nll = 0;
  let covered = 0;
  let width = 0;
  for (let index = 0; index < targets.length; index += 1) {
    const target = targets[index]!;
    const prediction = predictions[index]!;
    if (!Number.isFinite(prediction.mean) || !Number.isFinite(prediction.variance) || prediction.variance <= 0) {
      throw new Error(`CFB-B-PREDICTION-INVALID:${String(index)}`);
    }
    const error = prediction.mean - target;
    const radius = Z95 * Math.sqrt(prediction.variance);
    squared += error * error;
    absolute += Math.abs(error);
    nll += 0.5 * (Math.log(2 * Math.PI * prediction.variance) + (error * error) / prediction.variance);
    covered += Math.abs(error) <= radius ? 1 : 0;
    width += 2 * radius;
  }
  return {
    mse: squared / targets.length,
    mae: absolute / targets.length,
    gaussianNll: nll / targets.length,
    coverage95: covered / targets.length,
    meanIntervalWidth95: width / targets.length,
  };
}

export function perRowLoss(targets: readonly number[], predictions: readonly GaussianPrediction[], kind: "mse" | "nll"): readonly number[] {
  return targets.map((target, index) => {
    const prediction = predictions[index];
    if (prediction === undefined) throw new Error(`CFB-B-LOSS-MISSING:${String(index)}`);
    const error = prediction.mean - target;
    return kind === "mse" ? error * error : 0.5 * (Math.log(2 * Math.PI * prediction.variance) + (error * error) / prediction.variance);
  });
}

function xorshift32(state: number): number {
  let value = state >>> 0;
  value ^= value << 13;
  value ^= value >>> 17;
  value ^= value << 5;
  return value >>> 0;
}

export function movingBlockDifference(
  leftLoss: readonly number[],
  rightLoss: readonly number[],
  options: StaticBenchmarkOptions,
): BootstrapInterval {
  if (leftLoss.length !== rightLoss.length || leftLoss.length === 0) throw new Error("CFB-B-BOOTSTRAP-SHAPE");
  if (!Number.isInteger(options.bootstrapReplicates) || options.bootstrapReplicates < 20) throw new Error("CFB-B-BOOTSTRAP-REPLICATES");
  if (!Number.isInteger(options.bootstrapBlockLength) || options.bootstrapBlockLength < 1 || options.bootstrapBlockLength > leftLoss.length) {
    throw new Error("CFB-B-BOOTSTRAP-BLOCK");
  }
  const differences = leftLoss.map((value, index) => value - rightLoss[index]!);
  const pointEstimate = mean(differences);
  const samples: number[] = [];
  let state = options.bootstrapSeed >>> 0;
  const maximumStart = differences.length - options.bootstrapBlockLength;
  for (let replicate = 0; replicate < options.bootstrapReplicates; replicate += 1) {
    let sum = 0;
    let count = 0;
    while (count < differences.length) {
      state = xorshift32(state);
      const start = maximumStart === 0 ? 0 : state % (maximumStart + 1);
      const take = Math.min(options.bootstrapBlockLength, differences.length - count);
      for (let offset = 0; offset < take; offset += 1) sum += differences[start + offset]!;
      count += take;
    }
    samples.push(sum / differences.length);
  }
  samples.sort((left, right) => left - right);
  const lower = samples[Math.floor(0.025 * (samples.length - 1))];
  const upper = samples[Math.ceil(0.975 * (samples.length - 1))];
  if (lower === undefined || upper === undefined) throw new Error("CFB-B-BOOTSTRAP-QUANTILE");
  return { pointEstimate, lower95: lower, upper95: upper };
}

export function permutedTargets(targets: readonly number[], seed: number): readonly number[] {
  const result = [...targets];
  let state = seed >>> 0;
  for (let index = result.length - 1; index > 0; index -= 1) {
    state = xorshift32(state);
    const swapIndex = state % (index + 1);
    [result[index], result[swapIndex]] = [result[swapIndex]!, result[index]!];
  }
  return result;
}

function maxPredictionDifference(left: readonly GaussianPrediction[], right: readonly GaussianPrediction[]): number {
  return left.reduce((maximum, prediction, index) => {
    const other = right[index];
    if (other === undefined) throw new Error(`CFB-B-COMPARISON-MISSING:${String(index)}`);
    return Math.max(maximum, Math.abs(prediction.mean - other.mean), Math.abs(prediction.variance - other.variance));
  }, 0);
}

export function runStaticEnsembleBenchmark(
  train: readonly Etth1Example[],
  validation: readonly Etth1Example[],
  test: readonly Etth1Example[],
  options: StaticBenchmarkOptions,
): StaticEnsembleResult {
  if (test.some((example) => example.split !== "test")) throw new Error("CFB-B-TEST-PROVENANCE");
  const model = fitStaticExpertModel(train, validation);
  const validationRows = forecastRows(validation, model.trainMean, model.ridge);
  const testRows = forecastRows(test, model.trainMean, model.ridge);
  const targets = testRows.map((row) => row.target);

  const equalVariance = fitEqualVariance(validationRows);
  const validationExpertMse = Object.fromEntries(EXPERT_NAMES.map((expert) => [expert, mean(residuals(validationRows, expert).map((value) => value * value))])) as Record<ExpertName, number>;
  const selectedBestValidationExpert = [...EXPERT_NAMES].sort((left, right) => validationExpertMse[left] - validationExpertMse[right])[0];
  if (selectedBestValidationExpert === undefined) throw new Error("CFB-B-BEST-VALIDATION-MISSING");

  const equal = equalPredictions(testRows, equalVariance);
  const bestValidation = selectedPredictions(testRows, selectedBestValidationExpert, model.validationVariances[selectedBestValidationExpert]);
  const staticChain = staticPredictions(testRows, model, "chain");
  const staticDag = staticPredictions(testRows, model, "dag");
  const laneMetrics: Record<DeployableLane, PredictionMetrics> = {
    equal: evaluatePredictions(targets, equal),
    "best-validation": evaluatePredictions(targets, bestValidation),
    "zeta-static-chain": evaluatePredictions(targets, staticChain),
    "zeta-static-dag": evaluatePredictions(targets, staticDag),
  };

  const testExpertMetrics = Object.fromEntries(EXPERT_NAMES.map((expert) => [
    expert,
    evaluatePredictions(targets, selectedPredictions(testRows, expert, model.validationVariances[expert])),
  ])) as Record<ExpertName, PredictionMetrics>;
  const oracleBestTestExpert = [...EXPERT_NAMES].sort((left, right) => testExpertMetrics[left].mse - testExpertMetrics[right].mse)[0];
  if (oracleBestTestExpert === undefined) throw new Error("CFB-B-ORACLE-MISSING");

  const duplicatePredictions = staticPredictions(testRows, model, "dag", [...EXPERT_NAMES, "last"]);
  const duplicateMetrics = evaluatePredictions(targets, duplicatePredictions);
  const dropPredictions = staticPredictions(testRows, model, "dag", EXPERT_NAMES.filter((name) => name !== "ridge-window"));
  const permutationSeed = options.bootstrapSeed ^ 0xa5a5a5a5;
  const shuffledTargets = permutedTargets(targets, permutationSeed);
  const permutedMetrics = evaluatePredictions(shuffledTargets, staticDag);

  const mseInterval = movingBlockDifference(
    perRowLoss(targets, staticDag, "mse"),
    perRowLoss(targets, equal, "mse"),
    options,
  );
  const nllInterval = movingBlockDifference(
    perRowLoss(targets, staticDag, "nll"),
    perRowLoss(targets, equal, "nll"),
    { ...options, bootstrapSeed: options.bootstrapSeed ^ 0x9e3779b9 },
  );
  const coverageDegradation = laneMetrics.equal.coverage95 - laneMetrics["zeta-static-dag"].coverage95;
  const supported = (mseInterval.upper95 < 0 || nllInterval.upper95 < 0) && coverageDegradation <= 0.05;

  return {
    model,
    selectedBestValidationExpert,
    laneMetrics,
    oracleBestTestExpert,
    oracleBestTestMetrics: testExpertMetrics[oracleBestTestExpert],
    chainDagMaximumDifference: maxPredictionDifference(staticChain, staticDag),
    dropExpertMaximumDifference: maxPredictionDifference(staticDag, dropPredictions),
    duplicateExpert: {
      duplicated: "last",
      metrics: duplicateMetrics,
      coverageChangeFromStaticDag: duplicateMetrics.coverage95 - laneMetrics["zeta-static-dag"].coverage95,
      nllChangeFromStaticDag: duplicateMetrics.gaussianNll - laneMetrics["zeta-static-dag"].gaussianNll,
      status: "invalid-dependent-evidence",
    },
    permutedTargets: {
      seed: permutationSeed >>> 0,
      metrics: permutedMetrics,
      mseChangeFromStaticDag: permutedMetrics.mse - laneMetrics["zeta-static-dag"].mse,
      nllChangeFromStaticDag: permutedMetrics.gaussianNll - laneMetrics["zeta-static-dag"].gaussianNll,
    },
    bootstrapVersusEqual: { mse: mseInterval, gaussianNll: nllInterval },
    usefulness: {
      status: supported ? "supported" : "not-supported",
      coverageDegradation,
      reason: supported
        ? "static precision fusion improves a predeclared metric against equal weighting with a block-bootstrap interval below zero and bounded coverage degradation"
        : "the predeclared improvement-and-coverage rule is not satisfied",
    },
  };
}

export function assertValidationOnlyVarianceSource(source: "validation" | "test"): void {
  if (source !== "validation") throw new Error("CFB-B-VARIANCE-LEAKAGE");
}
