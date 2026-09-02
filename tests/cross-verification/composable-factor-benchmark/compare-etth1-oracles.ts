import { resolve } from "node:path";

type UnknownRecord = Readonly<Record<string, unknown>>;

function object(value: unknown, label: string): UnknownRecord {
  if (typeof value !== "object" || value === null || Array.isArray(value)) throw new Error(`CFB-B-SCHEMA:${label}`);
  return value as UnknownRecord;
}

function number(record: UnknownRecord, key: string, label: string): number {
  const value = record[key];
  if (typeof value !== "number" || !Number.isFinite(value)) throw new Error(`CFB-B-SCHEMA:${label}.${key}`);
  return value;
}

function string(record: UnknownRecord, key: string, label: string): string {
  const value = record[key];
  if (typeof value !== "string") throw new Error(`CFB-B-SCHEMA:${label}.${key}`);
  return value;
}

function boolean(record: UnknownRecord, key: string, label: string): boolean {
  const value = record[key];
  if (typeof value !== "boolean") throw new Error(`CFB-B-SCHEMA:${label}.${key}`);
  return value;
}

function close(left: number, right: number, tolerance = 1e-9): boolean {
  return Math.abs(left - right) <= tolerance;
}

function compareMetricGroup(failures: string[], label: string, leftValue: unknown, rightValue: unknown): void {
  const left = object(leftValue, `${label}:typescript`);
  const right = object(rightValue, `${label}:python`);
  for (const key of ["mse", "mae", "gaussianNll", "coverage95", "meanIntervalWidth95"]) {
    const leftNumber = number(left, key, `${label}:typescript`);
    const rightNumber = number(right, key, `${label}:python`);
    if (!close(leftNumber, rightNumber)) failures.push(`${label}.${key}:${String(leftNumber)}:${String(rightNumber)}`);
  }
}

function compareNumberArrays(failures: string[], label: string, leftValue: unknown, rightValue: unknown): void {
  if (!Array.isArray(leftValue) || !Array.isArray(rightValue) || leftValue.length !== rightValue.length) {
    failures.push(`${label}:shape`);
    return;
  }
  for (let index = 0; index < leftValue.length; index += 1) {
    const left = leftValue[index];
    const right = rightValue[index];
    if (typeof left !== "number" || typeof right !== "number" || !close(left, right)) failures.push(`${label}.${String(index)}`);
  }
}

function compareNumberMatrices(failures: string[], label: string, leftValue: unknown, rightValue: unknown): void {
  if (!Array.isArray(leftValue) || !Array.isArray(rightValue) || leftValue.length !== rightValue.length) {
    failures.push(`${label}:shape`);
    return;
  }
  for (let row = 0; row < leftValue.length; row += 1) {
    compareNumberArrays(failures, `${label}.${String(row)}`, leftValue[row], rightValue[row]);
  }
}

function compareIntervals(failures: string[], label: string, leftValue: unknown, rightValue: unknown): void {
  const left = object(leftValue, `${label}:typescript`);
  const right = object(rightValue, `${label}:python`);
  for (const key of ["pointEstimate", "lower95", "upper95"]) {
    const leftNumber = number(left, key, `${label}:typescript`);
    const rightNumber = number(right, key, `${label}:python`);
    if (!close(leftNumber, rightNumber)) failures.push(`${label}.${key}:${String(leftNumber)}:${String(rightNumber)}`);
  }
}

const manifestArgument = process.argv[2];
const dataArgument = process.argv[3];
if (manifestArgument === undefined || dataArgument === undefined) {
  throw new Error("usage: compare-etth1-oracles.ts MANIFEST_JSON ETTH1_CSV");
}
const root = resolve(import.meta.dir, "../../..");
const runner = resolve(root, "src/Core.TypeScript/research/composable-factor-benchmark/run-composable-factor-benchmark.ts");
const pythonOracle = resolve(import.meta.dir, "etth1_static_oracle.py");
const run = Bun.spawnSync([process.execPath, runner, resolve(manifestArgument), resolve(dataArgument)], { cwd: root, stdout: "pipe", stderr: "pipe" });
if (run.exitCode !== 0) throw new Error(`CFB-B-TYPESCRIPT-FAILED:${run.stderr.toString().trim()}`);
const python = Bun.spawnSync([process.env.PYTHON_HOST_PATH ?? "python3", pythonOracle, resolve(manifestArgument), resolve(dataArgument)], {
  cwd: root,
  env: process.env,
  stdout: "pipe",
  stderr: "pipe",
});
if (python.exitCode !== 0) throw new Error(`CFB-B-PYTHON-FAILED:${python.stderr.toString().trim()}`);

const typescript = object(JSON.parse(run.stdout.toString()) as unknown, "typescript");
const pythonReport = object(JSON.parse(python.stdout.toString()) as unknown, "python");
const ensemble = object(typescript["ensemble"], "typescript.ensemble");
const model = object(ensemble["model"], "typescript.ensemble.model");
const ridge = object(model["ridge"], "typescript.ensemble.model.ridge");
const pythonDataset = object(pythonReport["dataset"], "python.dataset");
const pythonRidge = object(pythonReport["ridge"], "python.ridge");
const pythonLanes = object(pythonReport["laneMetrics"], "python.laneMetrics");
const pythonDuplicate = object(pythonReport["duplicate"], "python.duplicate");
const pythonPermuted = object(pythonReport["permuted"], "python.permuted");
const pythonBootstrap = object(pythonReport["bootstrapVersusEqual"], "python.bootstrapVersusEqual");
const failures: string[] = [];

const scalarComparisons: readonly [string, number, number][] = [
  ["rows", number(object(typescript["validation"], "typescript.validation"), "rowCount", "typescript.validation"), number(pythonDataset, "rows", "python.dataset")],
  ["examples", number(object(typescript["validation"], "typescript.validation"), "exampleCount", "typescript.validation"), number(pythonDataset, "examples", "python.dataset")],
  ["ridge.lambda", number(ridge, "lambda", "typescript.ensemble.model.ridge"), number(pythonRidge, "lambda", "python.ridge")],
  ["ridge.validationMse", number(ridge, "validationMse", "typescript.ensemble.model.ridge"), number(pythonRidge, "validationMse", "python.ridge")],
  ["residualCorrelation", number(model, "maximumAbsoluteValidationResidualCorrelation", "typescript.ensemble.model"), number(pythonReport, "maximumAbsoluteValidationResidualCorrelation", "python")],
];
for (const [label, left, right] of scalarComparisons) {
  if (!close(left, right)) failures.push(`${label}:${String(left)}:${String(right)}`);
}
if (string(ensemble, "selectedBestValidationExpert", "typescript.ensemble") !== string(pythonReport, "selectedBestValidationExpert", "python")) {
  failures.push("selectedBestValidationExpert");
}

compareNumberArrays(failures, "ridge.featureMeans", ridge["featureMeans"], pythonRidge["featureMeans"]);
compareNumberArrays(failures, "ridge.featureScales", ridge["featureScales"], pythonRidge["featureScales"]);
compareNumberArrays(failures, "ridge.coefficients", ridge["coefficients"], pythonRidge["coefficients"]);
const typescriptVariances = object(model["validationVariances"], "typescript.ensemble.model.validationVariances");
const pythonVariances = object(pythonReport["variances"], "python.variances");
for (const expert of ["last", "window-start", "train-mean", "ridge-window"]) {
  const left = number(typescriptVariances, expert, "typescript.ensemble.model.validationVariances");
  const right = number(pythonVariances, expert, "python.variances");
  if (!close(left, right)) failures.push(`variance.${expert}:${String(left)}:${String(right)}`);
}

const typescriptMetrics = object(ensemble["laneMetrics"], "typescript.ensemble.laneMetrics");
compareMetricGroup(failures, "equal", typescriptMetrics["equal"], pythonLanes["equal"]);
compareMetricGroup(failures, "best-validation", typescriptMetrics["best-validation"], pythonLanes["best-validation"]);
compareMetricGroup(failures, "zeta-static", typescriptMetrics["zeta-static-chain"], pythonLanes["zeta-static"]);
compareMetricGroup(failures, "duplicate", object(ensemble["duplicateExpert"], "typescript.ensemble.duplicateExpert")["metrics"], pythonDuplicate["metrics"]);
compareMetricGroup(failures, "permuted", object(ensemble["permutedTargets"], "typescript.ensemble.permutedTargets")["metrics"], pythonPermuted["metrics"]);
for (const metric of ["mse", "gaussianNll"]) {
  compareIntervals(
    failures,
    `bootstrap.${metric}`,
    object(ensemble["bootstrapVersusEqual"], "typescript.bootstrap")[metric],
    pythonBootstrap[metric],
  );
}

const correlated = object(typescript["correlatedError"], "typescript.correlatedError");
const pythonCorrelated = object(pythonReport["correlatedError"], "python.correlatedError");
const correlatedArtifact = object(correlated["artifact"], "typescript.correlatedError.artifact");
const pythonCorrelatedArtifact = object(pythonCorrelated["artifact"], "python.correlatedError.artifact");
for (const key of ["shrinkage", "activeMask", "predictedVariance", "intervalVariance", "validationMse", "diagonalVarianceRatio"]) {
  const left = number(correlatedArtifact, key, "typescript.correlatedError.artifact");
  const right = number(pythonCorrelatedArtifact, key, "python.correlatedError.artifact");
  if (!close(left, right)) failures.push(`correlated.artifact.${key}:${String(left)}:${String(right)}`);
}
compareNumberArrays(failures, "correlated.artifact.weights", correlatedArtifact["weights"], pythonCorrelatedArtifact["weights"]);
compareNumberMatrices(failures, "correlated.artifact.residualCovariance", correlatedArtifact["residualCovariance"], pythonCorrelatedArtifact["residualCovariance"]);
compareNumberMatrices(failures, "correlated.artifact.shrunkCovariance", correlatedArtifact["shrunkCovariance"], pythonCorrelatedArtifact["shrunkCovariance"]);
compareMetricGroup(failures, "correlated.metrics", correlated["metrics"], pythonCorrelated["metrics"]);
for (const comparison of ["bootstrapVersusBestValidation", "bootstrapVersusStaticDag"] as const) {
  const leftComparison = object(correlated[comparison], `typescript.correlatedError.${comparison}`);
  const rightComparison = object(pythonCorrelated[comparison], `python.correlatedError.${comparison}`);
  for (const metric of ["mse", "gaussianNll"]) {
    compareIntervals(failures, `correlated.${comparison}.${metric}`, leftComparison[metric], rightComparison[metric]);
  }
}
const correlatedZero = object(correlated["zeroOffDiagonalControl"], "typescript.correlatedError.zeroOffDiagonalControl");
const pythonCorrelatedZero = object(pythonCorrelated["zeroOffDiagonalControl"], "python.correlatedError.zeroOffDiagonalControl");
for (const key of ["maximumPredictionDifference", "metricDifference"]) {
  const left = number(correlatedZero, key, "typescript.correlatedError.zeroOffDiagonalControl");
  const right = number(pythonCorrelatedZero, key, "python.correlatedError.zeroOffDiagonalControl");
  if (!close(left, right)) failures.push(`correlated.zero.${key}:${String(left)}:${String(right)}`);
}
compareNumberArrays(
  failures,
  "correlated.zero.weights",
  object(correlatedZero["artifact"], "typescript.correlatedError.zeroOffDiagonalControl.artifact")["weights"],
  object(pythonCorrelatedZero["artifact"], "python.correlatedError.zeroOffDiagonalControl.artifact")["weights"],
);
compareMetricGroup(
  failures,
  "correlated.permuted",
  object(correlated["permutedTargets"], "typescript.correlatedError.permutedTargets")["metrics"],
  object(pythonCorrelated["permutedTargets"], "python.correlatedError.permutedTargets")["metrics"],
);
if (string(object(correlated["verdict"], "typescript.correlatedError.verdict"), "status", "typescript.correlatedError.verdict")
  !== string(pythonCorrelated, "verdict", "python.correlatedError")) failures.push("correlated.verdict");

const common = object(typescript["commonNoise"], "typescript.commonNoise");
const pythonCommon = object(pythonReport["commonNoise"], "python.commonNoise");
const commonArtifact = object(common["artifact"], "typescript.commonNoise.artifact");
const pythonCommonArtifact = object(pythonCommon["artifact"], "python.commonNoise.artifact");
const commonArtifactScalars = [
  "leadingEigenvalue",
  "leadingEigenvalueShare",
  "loadingScale",
  "activeMask",
  "predictedVariance",
  "intervalVariance",
  "validationMse",
  "ridge",
  "fittedScalarCount",
] as const;
for (const key of commonArtifactScalars) {
  const left = number(commonArtifact, key, "typescript.commonNoise.artifact");
  const right = number(pythonCommonArtifact, key, "python.commonNoise.artifact");
  if (!close(left, right)) failures.push(`common.artifact.${key}:${String(left)}:${String(right)}`);
}
for (const key of ["residualMeans", "factorLoading", "uniqueness", "uniquenessRatios", "weights"] as const) {
  compareNumberArrays(failures, `common.artifact.${key}`, commonArtifact[key], pythonCommonArtifact[key]);
}
for (const key of ["residualCovariance", "factorCovariance", "regularizedCovariance"] as const) {
  compareNumberMatrices(failures, `common.artifact.${key}`, commonArtifact[key], pythonCommonArtifact[key]);
}
compareMetricGroup(failures, "common.metrics", common["metrics"], pythonCommon["metrics"]);
const commonNonVacuity = object(common["nonVacuity"], "typescript.commonNoise.nonVacuity");
const pythonCommonNonVacuity = object(pythonCommon["nonVacuity"], "python.commonNoise.nonVacuity");
for (const key of ["maximumOffDiagonal", "activeWeightCount", "diagonalWeightDifference"] as const) {
  const left = number(commonNonVacuity, key, "typescript.commonNoise.nonVacuity");
  const right = number(pythonCommonNonVacuity, key, "python.commonNoise.nonVacuity");
  if (!close(left, right)) failures.push(`common.nonVacuity.${key}:${String(left)}:${String(right)}`);
}
for (const key of ["passes", "uniquenessFloorHolds"] as const) {
  if (boolean(commonNonVacuity, key, "typescript.commonNoise.nonVacuity")
    !== boolean(pythonCommonNonVacuity, key, "python.commonNoise.nonVacuity")) failures.push(`common.nonVacuity.${key}`);
}
const commonDiagonal = object(common["diagonalMutation"], "typescript.commonNoise.diagonalMutation");
const pythonCommonDiagonal = object(pythonCommon["diagonalMutation"], "python.commonNoise.diagonalMutation");
for (const key of ["maximumPredictionDifference", "metricDifference"] as const) {
  const left = number(commonDiagonal, key, "typescript.commonNoise.diagonalMutation");
  const right = number(pythonCommonDiagonal, key, "python.commonNoise.diagonalMutation");
  if (!close(left, right)) failures.push(`common.diagonal.${key}:${String(left)}:${String(right)}`);
}
const commonDiagonalArtifact = object(commonDiagonal["artifact"], "typescript.commonNoise.diagonalMutation.artifact");
const pythonCommonDiagonalArtifact = object(pythonCommonDiagonal["artifact"], "python.commonNoise.diagonalMutation.artifact");
for (const key of commonArtifactScalars) {
  const left = number(commonDiagonalArtifact, key, "typescript.commonNoise.diagonalMutation.artifact");
  const right = number(pythonCommonDiagonalArtifact, key, "python.commonNoise.diagonalMutation.artifact");
  if (!close(left, right)) failures.push(`common.diagonal.artifact.${key}:${String(left)}:${String(right)}`);
}
for (const key of ["residualMeans", "factorLoading", "uniqueness", "uniquenessRatios", "weights"] as const) {
  compareNumberArrays(failures, `common.diagonal.artifact.${key}`, commonDiagonalArtifact[key], pythonCommonDiagonalArtifact[key]);
}
for (const key of ["residualCovariance", "factorCovariance", "regularizedCovariance"] as const) {
  compareNumberMatrices(failures, `common.diagonal.artifact.${key}`, commonDiagonalArtifact[key], pythonCommonDiagonalArtifact[key]);
}
for (const comparison of ["bootstrapVersusBestValidation", "bootstrapVersusStaticDag"] as const) {
  const leftComparison = object(common[comparison], `typescript.commonNoise.${comparison}`);
  const rightComparison = object(pythonCommon[comparison], `python.commonNoise.${comparison}`);
  for (const metric of ["mse", "gaussianNll"]) {
    compareIntervals(failures, `common.${comparison}.${metric}`, leftComparison[metric], rightComparison[metric]);
  }
}
const commonSignFlip = object(common["signFlip"], "typescript.commonNoise.signFlip");
const pythonCommonSignFlip = object(pythonCommon["signFlip"], "python.commonNoise.signFlip");
for (const key of ["covarianceDifference", "weightDifference"] as const) {
  const left = number(commonSignFlip, key, "typescript.commonNoise.signFlip");
  const right = number(pythonCommonSignFlip, key, "python.commonNoise.signFlip");
  if (!close(left, right)) failures.push(`common.signFlip.${key}:${String(left)}:${String(right)}`);
}
const reversedLeft = number(common, "reversedTrainingOrderDifference", "typescript.commonNoise");
const reversedRight = number(pythonCommon, "reversedTrainingOrderDifference", "python.commonNoise");
if (!close(reversedLeft, reversedRight)) failures.push(`common.reversedTrainingOrderDifference:${String(reversedLeft)}:${String(reversedRight)}`);
const commonPermuted = object(common["permutedTargets"], "typescript.commonNoise.permutedTargets");
const pythonCommonPermuted = object(pythonCommon["permutedTargets"], "python.commonNoise.permutedTargets");
compareMetricGroup(failures, "common.permuted", commonPermuted["metrics"], pythonCommonPermuted["metrics"]);
for (const key of ["seed", "mseChange", "nllChange"] as const) {
  const left = number(commonPermuted, key, "typescript.commonNoise.permutedTargets");
  const right = number(pythonCommonPermuted, key, "python.commonNoise.permutedTargets");
  if (!close(left, right)) failures.push(`common.permuted.${key}:${String(left)}:${String(right)}`);
}
if (string(object(common["verdict"], "typescript.commonNoise.verdict"), "status", "typescript.commonNoise.verdict")
  !== string(pythonCommon, "verdict", "python.commonNoise")) failures.push("common.verdict");

const source = object(typescript["source"], "typescript.source");
if (string(source, "sha256", "typescript.source") !== string(pythonDataset, "sha256", "python.dataset")) failures.push("sha256");
console.log(`CFB-B/C/D cross-verification: 10 metric lanes + 10 intervals; failures ${String(failures.length)}`);
if (failures.length > 0) {
  for (const failure of failures) console.error(failure);
  process.exit(1);
}
