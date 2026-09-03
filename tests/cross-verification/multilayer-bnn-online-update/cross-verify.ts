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

const pythonUnknown = runJson("python3", [PYTHON_ORACLE], { ...process.env });
if (!isPythonReport(pythonUnknown)) throw new Error("Python multilayer oracle emitted an invalid schema");
const mutantUnknown = runJson(
  "python3",
  [PYTHON_ORACLE],
  { ...process.env, MLBNN_ORACLE_MUTATION: "flip-coupling-sign" },
);
if (!isPythonReport(mutantUnknown)) throw new Error("Python multilayer mutant emitted an invalid schema");

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

check(arraysClose(fsharpUnknown.sequentialMeans, pythonUnknown.sequentialMeans), "independent sequential means");
check(arraysClose(fsharpUnknown.sequentialVariances, pythonUnknown.sequentialVariances), "independent sequential variances");
check(close(fsharpUnknown.layerZeroPrecision, pythonUnknown.layerZeroPrecision, 1e-12), "exact-once layer-zero precision");
check(fsharpUnknown.layerZeroObservationCount === pythonUnknown.layerZeroObservationCount, "layer-zero observation count");
check(
  fsharpUnknown.deeperObservationCounts.every((count, index) => count === pythonUnknown.deeperObservationCounts[index]),
  "deeper layers remain evidence-free",
);
check(fsharpUnknown.exactness === "ExactAcyclic" && fsharpUnknown.converged, "acyclic exactness receipt");
check(fsharpUnknown.rounds > 0 && fsharpUnknown.rounds <= 500, "bounded convergence rounds");
check(fsharpUnknown.replayBitInvariant, "bit-stable query replay");
check(fsharpUnknown.backwardDelta > 1e-3, "non-vacuous top-down evidence");
check(fsharpUnknown.strictError.includes("did not converge in 1/1 rounds"), "strict non-convergence refusal");
check(!fsharpUnknown.permissiveConverged && fsharpUnknown.permissiveExactness === "UnsettledLoopy", "permissive unsettled label");
check(fsharpUnknown.convergedLoopyExactness === "ConvergedLoopyMeansOnly", "loopy mean-only boundary");
check(fsharpUnknown.malformedError.includes("layer 1 parent -1"), "malformed-parent teaching error");

const mutantDisagreements = mutantUnknown.sequentialMeans.filter((value, index) => {
  const production = fsharpUnknown.sequentialMeans[index];
  return production === undefined || !close(value, production, 1e-10);
}).length + mutantUnknown.sequentialVariances.filter((value, index) => {
  const production = fsharpUnknown.sequentialVariances[index];
  return production === undefined || !close(value, production, 1e-10);
}).length;
check(mutantUnknown.mutation === "flip-coupling-sign" && mutantDisagreements > 0, "coupling-sign mutation is caught");

if (failures.length > 0) {
  console.error(`multilayer-bnn-online-update cross-verify failures: ${failures.join(", ")}`);
  process.exit(1);
}

console.log(
  `multilayer-bnn-online-update cross-verify: 14 finite witness groups across production F#/independent Python, coupling-sign mutant disagreements=${mutantDisagreements}, 0 failure(s).`,
);
