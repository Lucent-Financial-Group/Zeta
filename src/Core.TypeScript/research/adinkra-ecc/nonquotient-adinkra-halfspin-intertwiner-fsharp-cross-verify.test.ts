/** Cross-language check for the finite coded-Adinkra / half-spin intertwiner census. */

import { spawnSync } from "node:child_process";
import { join, resolve } from "node:path";
import { describe, expect, test } from "bun:test";
import {
  measureFiniteAdinkraHalfSpinIntertwiner,
  type FiniteAdinkraHalfSpinIntertwinerCensus,
  type IntertwinerCensusOptions,
} from "./nonquotient-adinkra-halfspin-intertwiner";

const REPOSITORY_ROOT = resolve(import.meta.dir, "../../../..");
const F_SHARP_ORACLE = join(
  REPOSITORY_ROOT,
  "tests/cross-verification/adinkra-halfspin-intertwiner/adinkra-halfspin-intertwiner-oracle.fsx",
);

interface OracleReport {
  readonly field: number;
  readonly repSeed: number;
  readonly sourceDimension: number;
  readonly targetDimension: number;
  readonly generatorCount: number;
  readonly sourceCliffordViolations: number;
  readonly targetCliffordViolations: number;
  readonly nullity: number;
  readonly consistentComponentCount: number;
  readonly inconsistentComponentCount: number;
  readonly componentSizeSpectrum: readonly (readonly [number, number])[];
  readonly basisRankSpectrum: readonly (readonly [number, number])[];
  readonly maximalBasisRank: number;
  readonly unitCombinationRank: number;
}

interface OracleCase {
  readonly label: string;
  readonly options: IntertwinerCensusOptions;
  readonly arguments: readonly string[];
}

const CASES: readonly OracleCase[] = [
  { label: "baseline F_1000003", options: { field: 1000003 }, arguments: ["--field=1000003"] },
  { label: "baseline F_999983", options: { field: 999983 }, arguments: ["--field=999983"] },
  { label: "repSeed 1", options: { repSeed: 1 }, arguments: ["--rep-seed=1"] },
  { label: "repSeed 255", options: { repSeed: 255 }, arguments: ["--rep-seed=255"] },
  { label: "coordinate sign fault", options: { flipTargetCoordinate: [0, 0] }, arguments: ["--flip-target-coordinate"] },
  { label: "duplicated generator fault", options: { duplicateTargetGenerator: [6, 5] }, arguments: ["--duplicate-target-generator"] },
  { label: "parity fault", options: { omitTargetJordanWignerParity: true }, arguments: ["--omit-target-parity"] },
];

function isSpectrum(value: unknown): value is readonly (readonly [number, number])[] {
  return Array.isArray(value)
    && value.every((entry) => Array.isArray(entry) && entry.length === 2 && entry.every((item) => typeof item === "number"));
}

function isOracleReport(value: unknown): value is OracleReport {
  if (value === null || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  const numericFields = [
    "field",
    "repSeed",
    "sourceDimension",
    "targetDimension",
    "generatorCount",
    "sourceCliffordViolations",
    "targetCliffordViolations",
    "nullity",
    "consistentComponentCount",
    "inconsistentComponentCount",
    "maximalBasisRank",
    "unitCombinationRank",
  ];
  return numericFields.every((field) => typeof record[field] === "number")
    && isSpectrum(record.componentSizeSpectrum)
    && isSpectrum(record.basisRankSpectrum);
}

function spectrumEntries(spectrum: Readonly<Record<string, number>>): readonly (readonly [number, number])[] {
  return Object.entries(spectrum).map(([key, count]) => [Number(key), count] as const);
}

function summarize(census: FiniteAdinkraHalfSpinIntertwinerCensus): OracleReport {
  return {
    field: census.field,
    repSeed: census.repSeed,
    sourceDimension: census.sourceDimension,
    targetDimension: census.targetDimension,
    generatorCount: census.generatorCount,
    sourceCliffordViolations: census.sourceCliffordViolations,
    targetCliffordViolations: census.targetCliffordViolations,
    nullity: census.solution.nullity,
    consistentComponentCount: census.solution.consistentComponentCount,
    inconsistentComponentCount: census.solution.inconsistentComponentCount,
    componentSizeSpectrum: spectrumEntries(census.solution.componentSizeSpectrum),
    basisRankSpectrum: spectrumEntries(census.solution.basisRankSpectrum),
    maximalBasisRank: census.solution.maximalBasisRank,
    unitCombinationRank: census.solution.unitCombinationRank,
  };
}

function runFSharpOracle(arguments_: readonly string[]): OracleReport {
  // eslint-disable-next-line sonarjs/no-os-command-from-path -- dotnet is the repository-declared SDK shim; argv is fixed.
  const result = spawnSync("dotnet", ["fsi", "--nologo", F_SHARP_ORACLE, "--", ...arguments_], {
    cwd: REPOSITORY_ROOT,
    encoding: "utf8",
    timeout: 90_000,
    env: { ...process.env, DOTNET_CLI_TELEMETRY_OPTOUT: "1" },
  });
  if (result.error !== undefined || result.status !== 0) {
    throw new Error(`F# intertwiner oracle failed: ${result.error?.message ?? (result.stderr || result.stdout)}`);
  }
  const line = result.stdout.trim().split(/\r?\n/).at(-1);
  if (line === undefined) throw new Error("F# intertwiner oracle emitted no census JSON");
  const parsed: unknown = JSON.parse(line);
  if (!isOracleReport(parsed)) throw new Error("F# intertwiner oracle emitted malformed census JSON");
  return parsed;
}

describe("finite coded-Adinkra / half-spin F# cross-verification", () => {
  test("the independently rebuilt F# action agrees on both fields, representative choices, and every declared fault", () => {
    for (const oracleCase of CASES) {
      expect(runFSharpOracle(oracleCase.arguments), oracleCase.label).toEqual(
        summarize(measureFiniteAdinkraHalfSpinIntertwiner(oracleCase.options)),
      );
    }
  }, 120_000);
});
