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

const source = object(typescript["source"], "typescript.source");
if (string(source, "sha256", "typescript.source") !== string(pythonDataset, "sha256", "python.dataset")) failures.push("sha256");
console.log(`CFB-B/C cross-verification: 7 metric lanes + 6 intervals; failures ${String(failures.length)}`);
if (failures.length > 0) {
  for (const failure of failures) console.error(failure);
  process.exit(1);
}
