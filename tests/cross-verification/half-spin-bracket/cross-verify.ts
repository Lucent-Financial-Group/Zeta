#!/usr/bin/env bun
/**
 * Finite half-spin bracket cross-verification dispatcher.
 *
 * This is intentionally a standalone entrypoint for the repository-wide
 * assert-don't-skip harness. It compares the independently authored F# oracle
 * against the TypeScript finite model; neither side imports the other’s
 * arithmetic. The scope is the declared finite complexified carrier only.
 */

import { spawnSync } from "node:child_process";
import { join, resolve } from "node:path";
import {
  measureFiniteHalfSpinBracket,
  type HalfSpinBracketCensus,
  type HalfSpinBracketOptions,
} from "../../../src/Core.TypeScript/research/adinkra-ecc/nonquotient-half-spin-bracket";

const REPOSITORY_ROOT = resolve(import.meta.dir, "../../..");
const F_SHARP_ORACLE = join(import.meta.dir, "half-spin-bracket-oracle.fsx");

interface OracleCase {
  readonly label: string;
  readonly options: HalfSpinBracketOptions;
  readonly arguments: readonly string[];
  readonly expectedQuickFailure: keyof Pick<
    HalfSpinBracketCensus,
    | "bracketAntisymmetryViolations"
    | "actionNormalizationViolations"
    | "bracketEquivarianceViolations"
    | "mixedJacobiViolations"
  > | null;
}

const CASES: readonly OracleCase[] = [
  { label: "reversion baseline", options: { applyTopWedgeReversion: true }, arguments: [], expectedQuickFailure: null },
  { label: "naive pairing", options: {}, arguments: ["--naive-pairing"], expectedQuickFailure: "bracketAntisymmetryViolations" },
  { label: "Jordan-Wigner parity omission", options: { applyTopWedgeReversion: true, omitJordanWignerParity: true }, arguments: ["--omit-parity"], expectedQuickFailure: "bracketAntisymmetryViolations" },
  { label: "ordered top-wedge sign omission", options: { applyTopWedgeReversion: true, omitTopWedgeOrderSign: true }, arguments: ["--omit-order"], expectedQuickFailure: "bracketAntisymmetryViolations" },
  { label: "bivector half omission", options: { applyTopWedgeReversion: true, omitBivectorHalf: true }, arguments: ["--omit-half"], expectedQuickFailure: "actionNormalizationViolations" },
  { label: "one-coordinate flip", options: { applyTopWedgeReversion: true, flipBracketCoordinate: [0, 1] }, arguments: ["--flip-0-1"], expectedQuickFailure: "bracketEquivarianceViolations" },
  { label: "right conjugation", options: { applyTopWedgeReversion: true, conjugatePairingRight: true }, arguments: ["--conjugate-right"], expectedQuickFailure: "bracketEquivarianceViolations" },
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

function fsharpCensus(arguments_: readonly string[]): HalfSpinBracketCensus {
  // The repository-declared .NET shim is the only executable dependency; argv is static.
  const child = spawnSync("dotnet", ["fsi", "--nologo", F_SHARP_ORACLE, "--", ...arguments_], {
    cwd: REPOSITORY_ROOT,
    encoding: "utf8",
    timeout: 120_000,
    env: { ...process.env, DOTNET_CLI_TELEMETRY_OPTOUT: "1" },
  });
  if (child.error !== undefined || child.status !== 0) {
    throw new Error(`half-spin bracket F# oracle failed: ${child.error?.message ?? (child.stderr || child.stdout)}`);
  }
  const line = child.stdout.trim().split(/\r?\n/).at(-1);
  if (line === undefined) throw new Error("half-spin bracket F# oracle emitted no census JSON");
  const decoded: unknown = JSON.parse(line);
  if (!isCensus(decoded)) throw new Error("half-spin bracket F# oracle emitted malformed census JSON");
  return decoded;
}

let failures = 0;
for (const oracleCase of CASES) {
  const fsharp = fsharpCensus(oracleCase.expectedQuickFailure === null ? oracleCase.arguments : ["--quick", ...oracleCase.arguments]);
  if (oracleCase.expectedQuickFailure === null) {
    const typescript = measureFiniteHalfSpinBracket(oracleCase.options);
    if (JSON.stringify(fsharp) !== JSON.stringify(typescript)) {
      console.error(`half-spin bracket cross-verify: baseline mismatch between F# and TypeScript`);
      failures++;
    }
    continue;
  }
  if (fsharp[oracleCase.expectedQuickFailure] <= 0) {
    console.error(`half-spin bracket cross-verify: ${oracleCase.label} had no ${oracleCase.expectedQuickFailure} witness`);
    failures++;
  }
}

console.log(`half-spin bracket cross-verify: ${CASES.length} cases, ${failures} failure(s).`);
process.exit(failures === 0 ? 0 : 1);
