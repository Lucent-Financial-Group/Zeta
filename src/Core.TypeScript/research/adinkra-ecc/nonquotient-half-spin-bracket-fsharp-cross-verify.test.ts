/**
 * Cross-language check for the finite half-spin bracket census.
 *
 * Design boundary: this file executes the separately authored F# exterior
 * carrier oracle and compares its measured aggregate census to TypeScript.
 * It validates neither a full E8 construction nor a physical model.
 */

import { spawnSync } from "node:child_process";
import { resolve, join } from "node:path";
import { describe, expect, test } from "bun:test";
import {
  measureFiniteHalfSpinBracket,
  type HalfSpinBracketCensus,
  type HalfSpinBracketOptions,
} from "./nonquotient-half-spin-bracket";

const REPOSITORY_ROOT = resolve(import.meta.dir, "../../../..");
const F_SHARP_ORACLE = join(
  REPOSITORY_ROOT,
  "tests/cross-verification/half-spin-bracket/half-spin-bracket-oracle.fsx",
);

interface OracleCase {
  readonly name: string;
  readonly options: HalfSpinBracketOptions;
  readonly arguments: readonly string[];
  readonly expectedQuickFailure: keyof Pick<
    HalfSpinBracketCensus,
    "bracketAntisymmetryViolations" | "actionNormalizationViolations" | "bracketEquivarianceViolations" | "mixedJacobiViolations"
  > | null;
}

const ORACLE_CASES: readonly OracleCase[] = [
  { name: "reversion baseline", options: { applyTopWedgeReversion: true }, arguments: [], expectedQuickFailure: null },
  { name: "naive pairing", options: {}, arguments: ["--naive-pairing"], expectedQuickFailure: "bracketAntisymmetryViolations" },
  { name: "Jordan-Wigner parity omission", options: { applyTopWedgeReversion: true, omitJordanWignerParity: true }, arguments: ["--omit-parity"], expectedQuickFailure: "bracketAntisymmetryViolations" },
  { name: "ordered top-wedge sign omission", options: { applyTopWedgeReversion: true, omitTopWedgeOrderSign: true }, arguments: ["--omit-order"], expectedQuickFailure: "bracketAntisymmetryViolations" },
  { name: "bivector half omission", options: { applyTopWedgeReversion: true, omitBivectorHalf: true }, arguments: ["--omit-half"], expectedQuickFailure: "actionNormalizationViolations" },
  { name: "one-coordinate flip", options: { applyTopWedgeReversion: true, flipBracketCoordinate: [0, 1] }, arguments: ["--flip-0-1"], expectedQuickFailure: "bracketEquivarianceViolations" },
  { name: "right conjugation", options: { applyTopWedgeReversion: true, conjugatePairingRight: true }, arguments: ["--conjugate-right"], expectedQuickFailure: "bracketEquivarianceViolations" },
];

function isWitness(value: unknown): value is readonly [number, number, number] {
  return Array.isArray(value) && value.length === 3 && value.every((coordinate) => typeof coordinate === "number");
}

function isCensus(value: unknown): value is HalfSpinBracketCensus {
  if (value === null || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  return [
    "carrierDimension",
    "bivectorGeneratorCount",
    "bracketAntisymmetryViolations",
    "actionNormalizationViolations",
    "bracketEquivarianceViolations",
    "mixedJacobiViolations",
  ].every((field) => typeof record[field] === "number")
    && (record.firstMixedJacobiWitness === null || isWitness(record.firstMixedJacobiWitness));
}

function runFSharpOracle(arguments_: readonly string[]): HalfSpinBracketCensus {
  // eslint-disable-next-line sonarjs/no-os-command-from-path -- dotnet is the repository-declared SDK shim; argv is fixed.
  const result = spawnSync("dotnet", ["fsi", "--nologo", F_SHARP_ORACLE, "--", ...arguments_], {
    cwd: REPOSITORY_ROOT,
    encoding: "utf8",
    timeout: 90_000,
    env: { ...process.env, DOTNET_CLI_TELEMETRY_OPTOUT: "1" },
  });
  if (result.error !== undefined || result.status !== 0) {
    throw new Error(`F# half-spin oracle failed: ${result.error?.message ?? (result.stderr || result.stdout)}`);
  }
  const line = result.stdout.trim().split(/\r?\n/).at(-1);
  if (line === undefined) throw new Error("F# half-spin oracle emitted no census JSON");
  const parsed: unknown = JSON.parse(line);
  if (!isCensus(parsed)) throw new Error("F# half-spin oracle emitted malformed census JSON");
  return parsed;
}

describe("finite half-spin bracket F# cross-verification", () => {
  test(
    "independent F# exterior-carrier oracle agrees on the exhaustive baseline and kills every declared falsifier",
    () => {
      for (const oracleCase of ORACLE_CASES) {
        if (oracleCase.expectedQuickFailure === null) {
          expect(runFSharpOracle(oracleCase.arguments)).toEqual(measureFiniteHalfSpinBracket(oracleCase.options));
          continue;
        }
        const fsharp = runFSharpOracle(["--quick", ...oracleCase.arguments]);
        expect(fsharp[oracleCase.expectedQuickFailure]).toBeGreaterThan(0);
      }
    },
    120_000,
  );
});
