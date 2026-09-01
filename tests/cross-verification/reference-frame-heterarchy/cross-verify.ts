/** Standalone production-F#/independent-TypeScript cross-verification for the bounded RFFH surface. */

import { spawnSync } from "node:child_process";
import { join, resolve } from "node:path";
import {
  findMinimumColorSchedule,
  type ConflictGraph,
} from "../../../src/Core.TypeScript/graph-coloring/four-color-schedule";

const ROOT = resolve(import.meta.dir, "../../..");
const ORACLE = join(import.meta.dir, "reference-frame-heterarchy-oracle.fsx");
const DOTNET = process.env.DOTNET_HOST_PATH ?? "dotnet";

interface OracleReport {
  readonly agreeingCupProbability: number;
  readonly agreeingPositionVarianceX: number;
  readonly contradictionCupProbability: number;
  readonly contradictionBowlProbability: number;
  readonly permutationCount: number;
  readonly permutationInvariant: boolean;
  readonly rotatedCovariance: readonly number[];
  readonly alignmentMean: readonly number[];
  readonly alignmentVarianceX: number;
  readonly originalFusionMaxError: number;
  readonly naturalityMaxError: number;
  readonly duplicateDisposition: string;
  readonly duplicateAcceptedCount: number;
  readonly conflictDisposition: string;
  readonly conflictCount: number;
  readonly lateralAccepted: boolean;
  readonly lateralMissingCode: string;
  readonly cycleCode: string;
  readonly generatorMismatchCode: string;
  readonly k4ChromaticNumber: number;
  readonly k5ChromaticNumber: number;
  readonly k33ChromaticNumber: number;
  readonly crownChromaticNumber: number;
}

function isReport(value: unknown): value is OracleReport {
  if (value === null || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  const numeric = [
    "agreeingCupProbability", "agreeingPositionVarianceX", "contradictionCupProbability",
    "contradictionBowlProbability", "permutationCount", "alignmentVarianceX", "originalFusionMaxError",
    "naturalityMaxError", "duplicateAcceptedCount", "conflictCount", "k4ChromaticNumber",
    "k5ChromaticNumber", "k33ChromaticNumber", "crownChromaticNumber",
  ];
  const textual = ["duplicateDisposition", "conflictDisposition", "lateralMissingCode", "cycleCode", "generatorMismatchCode"];
  return numeric.every((key) => typeof record[key] === "number")
    && textual.every((key) => typeof record[key] === "string")
    && typeof record.permutationInvariant === "boolean"
    && typeof record.lateralAccepted === "boolean"
    && Array.isArray(record.rotatedCovariance)
    && record.rotatedCovariance.length === 4
    && record.rotatedCovariance.every((item) => typeof item === "number")
    && Array.isArray(record.alignmentMean)
    && record.alignmentMean.length === 3
    && record.alignmentMean.every((item) => typeof item === "number");
}

function close(expected: number, actual: number, tolerance = 1e-12): boolean {
  return Math.abs(expected - actual) <= tolerance;
}

function completeGraph(size: number): ConflictGraph {
  const vertices = Array.from({ length: size }, (_, index) => String.fromCharCode(97 + index));
  const edges: (readonly [string, string])[] = [];
  for (let left = 0; left < size; left += 1) {
    for (let right = left + 1; right < size; right += 1) {
      const leftVertex = vertices[left];
      const rightVertex = vertices[right];
      if (leftVertex !== undefined && rightVertex !== undefined) edges.push([leftVertex, rightVertex]);
    }
  }
  return { vertices, edges };
}

const build = spawnSync(DOTNET, ["build", "src/Bayesian/Bayesian.fsproj", "--nologo", "-v:quiet"], {
  cwd: ROOT,
  encoding: "utf8",
  timeout: 180_000,
  env: { ...process.env, DOTNET_CLI_TELEMETRY_OPTOUT: "1" },
});
if (build.error !== undefined || build.status !== 0) {
  throw new Error(`Bayesian build failed before F# oracle:\n${build.error?.message ?? build.stderr ?? build.stdout}`);
}

const child = spawnSync(DOTNET, ["fsi", "--exec", ORACLE], {
  cwd: ROOT,
  encoding: "utf8",
  timeout: 60_000,
  env: { ...process.env, DOTNET_CLI_TELEMETRY_OPTOUT: "1" },
});
if (child.error !== undefined || child.status !== 0) {
  throw new Error(`F# oracle failed:\n${child.error?.message ?? child.stderr ?? child.stdout}`);
}
const line = child.stdout.trim().split(/\r?\n/).at(-1);
if (line === undefined) throw new Error("F# oracle emitted no report");
const parsed: unknown = JSON.parse(line);
if (!isReport(parsed)) throw new Error(`F# oracle emitted an invalid report: ${line}`);

const failures: string[] = [];
function check(condition: boolean, label: string): void {
  if (!condition) failures.push(label);
}

check(close(81 / 82, parsed.agreeingCupProbability), "agreeing Bayesian odds");
check(close(1, parsed.agreeingPositionVarianceX), "agreeing Gaussian precision");
check(close(0.5, parsed.contradictionCupProbability), "contradictory cup posterior");
check(close(0.5, parsed.contradictionBowlProbability), "contradictory bowl posterior");
check(parsed.permutationCount === 6 && parsed.permutationInvariant, "all six arrival permutations");
const expectedCovariance = [2.5, 1.5, 2.5, 9];
check(
  expectedCovariance.every((expected, index) => {
    const actual = parsed.rotatedCovariance[index];
    return actual !== undefined && close(expected, actual, 1e-10);
  }),
  "analytic 45-degree covariance transport",
);
check(
  [1, 0, 5].every((expected, index) => {
    const actual = parsed.alignmentMean[index];
    return actual !== undefined && close(expected, actual, 1e-10);
  }) && close(1, parsed.alignmentVarianceX, 1e-10),
  "independent two-frame alignment and isotropic fusion",
);
check(parsed.originalFusionMaxError <= 1e-10, "independent information-form Gaussian fusion");
check(parsed.naturalityMaxError <= 1e-10, "passive-coordinate naturality");
check(parsed.duplicateDisposition === "DuplicateIgnored" && parsed.duplicateAcceptedCount === 1, "deduplication");
check(parsed.conflictDisposition === "ConflictDetected" && parsed.conflictCount === 1, "changed-content conflict");
check(parsed.lateralAccepted && parsed.lateralMissingCode === "RFFH-NO-LATERAL-EDGE", "lateral wiring");
check(parsed.cycleCode === "RFFH-PARENT-CYCLE", "parent-cycle refusal");
check(parsed.generatorMismatchCode === "RFFH-GENERATOR-ORDER-MISMATCH", "generator-order refusal");

const k4 = findMinimumColorSchedule(completeGraph(4)).colorCount;
const k5 = findMinimumColorSchedule(completeGraph(5)).colorCount;
const k33: ConflictGraph = {
  vertices: ["a1", "a2", "a3", "b1", "b2", "b3"],
  edges: ["a1", "a2", "a3"].flatMap((left) =>
    ["b1", "b2", "b3"].map((right) => [left, right] as const),
  ),
};
const crownLeft = ["1a", "2a", "3a"];
const crownRight = ["1b", "2b", "3b"];
const crown: ConflictGraph = {
  vertices: crownLeft.flatMap((vertex, index) => [vertex, crownRight[index] as string]),
  edges: crownLeft.flatMap((left, leftIndex) =>
    crownRight.flatMap((right, rightIndex) => leftIndex === rightIndex ? [] : [[left, right] as const]),
  ),
};
const k33ColorCount = findMinimumColorSchedule(k33).colorCount;
const crownColorCount = findMinimumColorSchedule(crown).colorCount;
check(parsed.k4ChromaticNumber === k4 && k4 === 4, "independent K4 chromatic number");
check(parsed.k5ChromaticNumber === k5 && k5 === 5, "independent K5 chromatic number");
check(parsed.k33ChromaticNumber === k33ColorCount && k33ColorCount === 2, "independent K3,3 chromatic number");
check(parsed.crownChromaticNumber === crownColorCount && crownColorCount === 2, "independent crown chromatic number");

if (failures.length > 0) {
  console.error(`reference-frame-heterarchy cross-verify failures: ${failures.join(", ")}`);
  process.exit(1);
}
console.log("reference-frame-heterarchy cross-verify: 18 finite witness groups across F#/TypeScript, 0 failure(s).");
