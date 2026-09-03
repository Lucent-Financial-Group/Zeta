/** Production-F#/independent-Python verification for multilayer online factor-graph updates. */

import { spawnSync } from "node:child_process";
import { join, resolve } from "node:path";

const ROOT = resolve(import.meta.dir, "../../..");
const FSHARP_ORACLE = join(import.meta.dir, "multilayer-online-report.fsx");
const PYTHON_ORACLE = join(import.meta.dir, "multilayer_online_oracle.py");
const DOTNET = process.env.DOTNET_HOST_PATH ?? "dotnet";

interface FSharpReport {
  readonly sequentialMeans: readonly number[];
  readonly sequentialVariances: readonly number[];
  readonly exactDenseSequentialMeans: readonly number[];
  readonly exactDenseSequentialVariances: readonly number[];
  readonly exactDenseLoopyMeans: readonly number[];
  readonly exactDenseLoopyVariances: readonly number[];
  readonly loopyOnDenseEvidenceMeans: readonly number[];
  readonly loopyOnDenseEvidenceVariances: readonly number[];
  readonly exactDenseLayerCount: number;
  readonly exactDenseAbsorbedObservationCount: number;
  readonly exactDenseReplayBitInvariant: boolean;
  readonly layerZeroPrecision: number;
  readonly layerZeroObservationCount: number;
  readonly deeperObservationCounts: readonly number[];
  readonly exactness: string;
  readonly converged: boolean;
  readonly rounds: number;
  readonly replayBitInvariant: boolean;
  readonly backwardDelta: number;
  readonly strictError: string;
  readonly permissiveConverged: boolean;
  readonly permissiveExactness: string;
  readonly convergedLoopyExactness: string;
  readonly malformedError: string;
}

interface PythonReport {
  readonly sequentialMeans: readonly number[];
  readonly sequentialVariances: readonly number[];
  readonly exactDenseSequentialMeans: readonly number[];
  readonly exactDenseSequentialVariances: readonly number[];
  readonly exactDenseLoopyMeans: readonly number[];
  readonly exactDenseLoopyVariances: readonly number[];
  readonly layerZeroPrecision: number;
  readonly layerZeroObservationCount: number;
  readonly deeperObservationCounts: readonly number[];
  readonly mutation: string;
}

function finiteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function finiteArray(value: unknown, length: number): value is readonly number[] {
  return Array.isArray(value) && value.length === length && value.every(finiteNumber);
}

function integerArray(value: unknown, length: number): value is readonly number[] {
  return finiteArray(value, length) && value.every(Number.isInteger);
}

function isFSharpReport(value: unknown): value is FSharpReport {
  if (value === null || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  return finiteArray(record.sequentialMeans, 4)
    && finiteArray(record.sequentialVariances, 4)
    && finiteArray(record.exactDenseSequentialMeans, 4)
    && finiteArray(record.exactDenseSequentialVariances, 4)
    && finiteArray(record.exactDenseLoopyMeans, 4)
    && finiteArray(record.exactDenseLoopyVariances, 4)
    && finiteArray(record.loopyOnDenseEvidenceMeans, 4)
    && finiteArray(record.loopyOnDenseEvidenceVariances, 4)
    && Number.isInteger(record.exactDenseLayerCount)
    && Number.isInteger(record.exactDenseAbsorbedObservationCount)
    && typeof record.exactDenseReplayBitInvariant === "boolean"
    && finiteNumber(record.layerZeroPrecision)
    && Number.isInteger(record.layerZeroObservationCount)
    && integerArray(record.deeperObservationCounts, 3)
    && typeof record.exactness === "string"
    && typeof record.converged === "boolean"
    && Number.isInteger(record.rounds)
    && typeof record.replayBitInvariant === "boolean"
    && finiteNumber(record.backwardDelta)
    && typeof record.strictError === "string"
    && typeof record.permissiveConverged === "boolean"
    && typeof record.permissiveExactness === "string"
    && typeof record.convergedLoopyExactness === "string"
    && typeof record.malformedError === "string";
}

function isPythonReport(value: unknown): value is PythonReport {
  if (value === null || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  return finiteArray(record.sequentialMeans, 4)
    && finiteArray(record.sequentialVariances, 4)
    && finiteArray(record.exactDenseSequentialMeans, 4)
    && finiteArray(record.exactDenseSequentialVariances, 4)
    && finiteArray(record.exactDenseLoopyMeans, 4)
    && finiteArray(record.exactDenseLoopyVariances, 4)
    && finiteNumber(record.layerZeroPrecision)
    && Number.isInteger(record.layerZeroObservationCount)
    && integerArray(record.deeperObservationCounts, 3)
    && typeof record.mutation === "string";
}

function runJson(command: string, args: readonly string[], environment: NodeJS.ProcessEnv): unknown {
  const child = spawnSync(command, [...args], {
    cwd: ROOT,
    encoding: "utf8",
    timeout: 120_000,
    env: environment,
  });
  if (child.error !== undefined || child.status !== 0) {
    throw new Error(`oracle failed: ${command} ${args.join(" ")}\n${child.error?.message ?? child.stderr ?? child.stdout}`);
  }
  const line = child.stdout.trim().split(/\r?\n/).at(-1);
  if (line === undefined) throw new Error(`oracle emitted no report: ${command}`);
  return JSON.parse(line) as unknown;
}

const build = spawnSync(DOTNET, ["build", "src/Bayesian/Bayesian.fsproj", "--nologo", "-v:quiet"], {
  cwd: ROOT,
  encoding: "utf8",
  timeout: 180_000,
  env: { ...process.env, DOTNET_CLI_TELEMETRY_OPTOUT: "1" },
});
if (build.error !== undefined || build.status !== 0) {
  throw new Error(`Bayesian build failed before multilayer oracle:\n${build.error?.message ?? build.stderr ?? build.stdout}`);
}

const fsharpUnknown = runJson(
  DOTNET,
  ["fsi", "--exec", FSHARP_ORACLE],
  { ...process.env, DOTNET_CLI_TELEMETRY_OPTOUT: "1" },
);
if (!isFSharpReport(fsharpUnknown)) throw new Error("F# multilayer oracle emitted an invalid schema");
const fsharp: FSharpReport = fsharpUnknown;

const pythonUnknown = runJson("python3", [PYTHON_ORACLE], { ...process.env });
if (!isPythonReport(pythonUnknown)) throw new Error("Python multilayer oracle emitted an invalid schema");
const mutantUnknown = runJson(
  "python3",
  [PYTHON_ORACLE],
  { ...process.env, MLBNN_ORACLE_MUTATION: "flip-coupling-sign" },
);
if (!isPythonReport(mutantUnknown)) throw new Error("Python multilayer mutant emitted an invalid schema");
const varianceMutantUnknown = runJson(
  "python3",
  [PYTHON_ORACLE],
  { ...process.env, MLBNN_ORACLE_MUTATION: "inflate-middle-channel-variance" },
);
if (!isPythonReport(varianceMutantUnknown)) throw new Error("Python covariance mutant emitted an invalid schema");
const doubleCountMutantUnknown = runJson(
  "python3",
  [PYTHON_ORACLE],
  { ...process.env, MLBNN_ORACLE_MUTATION: "double-count-observation" },
);
if (!isPythonReport(doubleCountMutantUnknown)) throw new Error("Python double-count mutant emitted an invalid schema");

const failures: string[] = [];
function check(condition: boolean, label: string): void {
  if (!condition) failures.push(label);
}
function close(left: number, right: number, tolerance = 1e-10): boolean {
  return Math.abs(left - right) <= tolerance;
}
function arraysClose(left: readonly number[], right: readonly number[], tolerance = 1e-10): boolean {
  return left.length === right.length && left.every((value, index) => {
    const other = right[index];
    return other !== undefined && close(value, other, tolerance);
  });
}

check(arraysClose(fsharp.sequentialMeans, pythonUnknown.sequentialMeans), "independent sequential means");
check(arraysClose(fsharp.sequentialVariances, pythonUnknown.sequentialVariances), "independent sequential variances");
check(arraysClose(fsharp.exactDenseSequentialMeans, pythonUnknown.exactDenseSequentialMeans), "independent exact-dense sequential means");
check(arraysClose(fsharp.exactDenseSequentialVariances, pythonUnknown.exactDenseSequentialVariances), "independent exact-dense sequential variances");
check(arraysClose(fsharp.exactDenseLoopyMeans, pythonUnknown.exactDenseLoopyMeans), "independent exact-dense loopy means");
check(arraysClose(fsharp.exactDenseLoopyVariances, pythonUnknown.exactDenseLoopyVariances), "independent exact-dense loopy variances");
check(close(fsharp.layerZeroPrecision, pythonUnknown.layerZeroPrecision, 1e-12), "exact-once layer-zero precision");
check(fsharp.layerZeroObservationCount === pythonUnknown.layerZeroObservationCount, "layer-zero observation count");
check(
  fsharp.deeperObservationCounts.every((count, index) => count === pythonUnknown.deeperObservationCounts[index]),
  "deeper layers remain evidence-free",
);
check(fsharp.exactness === "ExactAcyclic" && fsharp.converged, "acyclic exactness receipt");
check(fsharp.rounds > 0 && fsharp.rounds <= 500, "bounded convergence rounds");
check(fsharp.replayBitInvariant, "bit-stable query replay");
check(fsharp.backwardDelta > 1e-3, "non-vacuous top-down evidence");
check(fsharp.strictError.includes("did not converge in 1/1 rounds"), "strict non-convergence refusal");
check(!fsharp.permissiveConverged && fsharp.permissiveExactness === "UnsettledLoopy", "permissive unsettled label");
check(fsharp.convergedLoopyExactness === "ConvergedLoopyMeansOnly", "loopy mean-only boundary");
check(fsharp.malformedError.includes("layer 1 parent -1"), "malformed-parent teaching error");
check(fsharp.exactDenseLayerCount === 4 && fsharp.exactDenseAbsorbedObservationCount === 3, "exact-dense receipt boundary");
check(fsharp.exactDenseReplayBitInvariant, "exact-dense query replay is bit-stable");
check(arraysClose(fsharp.loopyOnDenseEvidenceMeans, fsharp.exactDenseLoopyMeans), "loopy means agree with exact-dense query");
check(!arraysClose(fsharp.loopyOnDenseEvidenceVariances, fsharp.exactDenseLoopyVariances, 1e-6), "loopy covariance remains non-exact");

function disagreementCounts(report: PythonReport): { readonly means: number; readonly variances: number } {
  const means = report.sequentialMeans.filter((value, index) => {
    const production = fsharp.sequentialMeans[index];
    return production === undefined || !close(value, production, 1e-10);
  }).length;
  const variances = report.sequentialVariances.filter((value, index) => {
    const production = fsharp.sequentialVariances[index];
    return production === undefined || !close(value, production, 1e-10);
  }).length;
  return { means, variances };
}

function exactDenseDisagreementCounts(report: PythonReport): { readonly means: number; readonly variances: number } {
  const means = report.exactDenseSequentialMeans.filter((value, index) => {
    const production = fsharp.exactDenseSequentialMeans[index];
    return production === undefined || !close(value, production, 1e-10);
  }).length;
  const variances = report.exactDenseSequentialVariances.filter((value, index) => {
    const production = fsharp.exactDenseSequentialVariances[index];
    return production === undefined || !close(value, production, 1e-10);
  }).length;
  return { means, variances };
}

const couplingSignDisagreements = disagreementCounts(mutantUnknown);
const varianceDisagreements = disagreementCounts(varianceMutantUnknown);
const doubleCountDisagreements = exactDenseDisagreementCounts(doubleCountMutantUnknown);
check(
  mutantUnknown.mutation === "flip-coupling-sign"
    && couplingSignDisagreements.means === 4
    && couplingSignDisagreements.variances === 0,
  "coupling-sign mutation changes four means but cannot test diagonal variances",
);
check(
  varianceMutantUnknown.mutation === "inflate-middle-channel-variance"
    && varianceDisagreements.means > 0
    && varianceDisagreements.variances > 0,
  "channel-variance mutation is caught by both means and variances",
);
check(
  doubleCountMutantUnknown.mutation === "double-count-observation"
    && doubleCountDisagreements.means === 4
    && doubleCountDisagreements.variances === 4,
  "observation-double-count mutation is caught by exact-dense means and variances",
);

if (failures.length > 0) {
  console.error(`multilayer-bnn-online-update cross-verify failures: ${failures.join(", ")}`);
  process.exit(1);
}

console.log(
  "multilayer-bnn-online-update cross-verify: 9 cross-oracle comparisons, 12 production-only receipt controls, 3 mutation controls; "
    + `coupling-sign disagreements=means:${couplingSignDisagreements.means},variances:${couplingSignDisagreements.variances}; `
    + `channel-variance disagreements=means:${varianceDisagreements.means},variances:${varianceDisagreements.variances}; `
    + `double-count disagreements=means:${doubleCountDisagreements.means},variances:${doubleCountDisagreements.variances}; 0 failure(s).`,
);
