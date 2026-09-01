/**
 * Standalone TypeScript/F#/Rust cross-verification dispatcher for the finite intertwiner
 * decomposition and selector census. Both external oracles rebuild the actions independently.
 */

import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { measureFiniteIntertwinerDecomposition } from "../../../src/Core.TypeScript/research/adinkra-ecc/nonquotient-adinkra-halfspin-decomposition";
import { measureFiniteIntertwinerSelectors } from "../../../src/Core.TypeScript/research/adinkra-ecc/nonquotient-adinkra-halfspin-selector";
import { measureFiniteAdinkraHalfSpinIntertwiner } from "../../../src/Core.TypeScript/research/adinkra-ecc/nonquotient-adinkra-halfspin-intertwiner";
import { measureFiniteHalfSpinCommutantGroup } from "../../../src/Core.TypeScript/research/adinkra-ecc/nonquotient-adinkra-halfspin-commutant-group";
import { measureFiniteIntertwinerIntegralLattice } from "../../../src/Core.TypeScript/research/adinkra-ecc/nonquotient-adinkra-halfspin-integral-lattice";

const REPOSITORY_ROOT = resolve(import.meta.dir, "../../..");
const RUST_ORACLE = join(import.meta.dir, "adinkra-halfspin-decomposition-oracle.rs");
const F_SHARP_ORACLE = join(import.meta.dir, "adinkra-halfspin-decomposition-oracle.fsx");

interface OracleReport {
  readonly field: number;
  readonly repSeed: number;
  readonly sourceSectorRanks: readonly [number, number];
  readonly targetSectorRanks: readonly [number, number];
  readonly homBlocks: readonly [number, number, number, number];
  readonly sourceCommutantBlocks: readonly [number, number, number, number];
  readonly targetCommutantBlocks: readonly [number, number, number, number];
  readonly sourceGeneratedAlgebraRanks: readonly [number, number];
  readonly targetGeneratedAlgebraRanks: readonly [number, number];
  readonly fullHomRankSpectrum: readonly (readonly [number, number])[];
  readonly projectiveEmbeddingClassCount: string;
  readonly coefficientBoundaryRanks: readonly [number, number, number, number];
  readonly minimumSupportCandidateCount: number;
  readonly allMinimumSupportRanks: readonly number[];
  readonly balancedMinimizerCount: number;
  readonly balancedScore: readonly [number, number];
  readonly basisOrientationInvariantImage: boolean;
  readonly unitMovedByAutomorphism: boolean;
  readonly minimumSupportMovedByAutomorphism: boolean;
}

interface RustExtensionReport {
  readonly commutantPerSectorOrder: string;
  readonly commutantTotalOrder: string;
  readonly commutantNonzeroOrbitSize: string;
  readonly commutantNonzeroStabilizerOrder: string;
  readonly commutantFullEmbeddingOrbitCount: number;
  readonly latticeSupports: readonly number[];
  readonly latticeNorms: readonly number[];
  readonly latticeDeterminants: readonly number[];
  readonly latticeModTwoRanks: readonly number[];
  readonly latticePrimitiveCount: number;
  readonly latticeIntegralAutomorphismCount: number;
  readonly latticeReferenceOrbitSize: number;
  readonly latticeOrbitCount: number;
}

interface OracleCase {
  readonly field: 1_000_003 | 999_983;
  readonly repSeed: number;
}

interface FaultReport {
  readonly field: number;
  readonly fault: "coordinate" | "duplicate" | "parity";
  readonly targetCliffordViolations: number;
  readonly quarantinedBeforeDecomposition: boolean;
}

interface FaultCase {
  readonly fault: FaultReport["fault"];
  readonly typescriptOptions:
    | { readonly flipTargetCoordinate: readonly [number, number] }
    | { readonly duplicateTargetGenerator: readonly [number, number] }
    | { readonly omitTargetJordanWignerParity: true };
}

const CASES: readonly OracleCase[] = [
  { field: 1_000_003, repSeed: 0 },
  { field: 999_983, repSeed: 0 },
  { field: 1_000_003, repSeed: 1 },
  { field: 1_000_003, repSeed: 255 },
];

const FAULT_CASES: readonly FaultCase[] = [
  { fault: "coordinate", typescriptOptions: { flipTargetCoordinate: [0, 0] } },
  { fault: "duplicate", typescriptOptions: { duplicateTargetGenerator: [6, 5] } },
  { fault: "parity", typescriptOptions: { omitTargetJordanWignerParity: true } },
];

function numericTuple(value: unknown, length: number): value is readonly number[] {
  return Array.isArray(value) && value.length === length && value.every((item) => typeof item === "number");
}

function isOracleReport(value: unknown): value is OracleReport {
  if (value === null || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  return typeof record.field === "number"
    && typeof record.repSeed === "number"
    && numericTuple(record.sourceSectorRanks, 2)
    && numericTuple(record.targetSectorRanks, 2)
    && numericTuple(record.homBlocks, 4)
    && numericTuple(record.sourceCommutantBlocks, 4)
    && numericTuple(record.targetCommutantBlocks, 4)
    && numericTuple(record.sourceGeneratedAlgebraRanks, 2)
    && numericTuple(record.targetGeneratedAlgebraRanks, 2)
    && Array.isArray(record.fullHomRankSpectrum)
    && record.fullHomRankSpectrum.every((entry) => numericTuple(entry, 2))
    && typeof record.projectiveEmbeddingClassCount === "string"
    && numericTuple(record.coefficientBoundaryRanks, 4)
    && typeof record.minimumSupportCandidateCount === "number"
    && Array.isArray(record.allMinimumSupportRanks)
    && record.allMinimumSupportRanks.every((item) => typeof item === "number")
    && typeof record.balancedMinimizerCount === "number"
    && numericTuple(record.balancedScore, 2)
    && typeof record.basisOrientationInvariantImage === "boolean"
    && typeof record.unitMovedByAutomorphism === "boolean"
    && typeof record.minimumSupportMovedByAutomorphism === "boolean";
}

function isRustExtensionReport(value: unknown): value is OracleReport & RustExtensionReport {
  if (!isOracleReport(value)) return false;
  const record = value as unknown as Record<string, unknown>;
  return typeof record.commutantPerSectorOrder === "string"
    && typeof record.commutantTotalOrder === "string"
    && typeof record.commutantNonzeroOrbitSize === "string"
    && typeof record.commutantNonzeroStabilizerOrder === "string"
    && typeof record.commutantFullEmbeddingOrbitCount === "number"
    && Array.isArray(record.latticeSupports) && record.latticeSupports.every((item) => typeof item === "number")
    && Array.isArray(record.latticeNorms) && record.latticeNorms.every((item) => typeof item === "number")
    && Array.isArray(record.latticeDeterminants) && record.latticeDeterminants.every((item) => typeof item === "number")
    && Array.isArray(record.latticeModTwoRanks) && record.latticeModTwoRanks.every((item) => typeof item === "number")
    && typeof record.latticePrimitiveCount === "number"
    && typeof record.latticeIntegralAutomorphismCount === "number"
    && typeof record.latticeReferenceOrbitSize === "number"
    && typeof record.latticeOrbitCount === "number";
}

function isFaultReport(value: unknown): value is FaultReport {
  if (value === null || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  return typeof record.field === "number"
    && (record.fault === "coordinate" || record.fault === "duplicate" || record.fault === "parity")
    && typeof record.targetCliffordViolations === "number"
    && typeof record.quarantinedBeforeDecomposition === "boolean";
}

function normalizeFault(report: FaultReport): FaultReport {
  return {
    field: report.field,
    fault: report.fault,
    targetCliffordViolations: report.targetCliffordViolations,
    quarantinedBeforeDecomposition: report.quarantinedBeforeDecomposition,
  };
}

function spectrumEntries(spectrum: Readonly<Record<string, number>>): readonly (readonly [number, number])[] {
  return Object.entries(spectrum).map(([rank, count]) => [Number(rank), count] as const);
}

function summarize(oracleCase: OracleCase): OracleReport {
  const decomposition = measureFiniteIntertwinerDecomposition(oracleCase.field, oracleCase.repSeed);
  const selectors = measureFiniteIntertwinerSelectors(oracleCase.field, oracleCase.repSeed);
  return {
    field: oracleCase.field,
    repSeed: oracleCase.repSeed,
    sourceSectorRanks: [decomposition.source.plusRank, decomposition.source.minusRank],
    targetSectorRanks: [decomposition.target.plusRank, decomposition.target.minusRank],
    homBlocks: [
      decomposition.homBlocks.dimensions["+→+"],
      decomposition.homBlocks.dimensions["+→-"],
      decomposition.homBlocks.dimensions["-→+"],
      decomposition.homBlocks.dimensions["-→-"],
    ],
    sourceCommutantBlocks: [
      decomposition.sourceCommutantBlocks.dimensions["+→+"],
      decomposition.sourceCommutantBlocks.dimensions["+→-"],
      decomposition.sourceCommutantBlocks.dimensions["-→+"],
      decomposition.sourceCommutantBlocks.dimensions["-→-"],
    ],
    targetCommutantBlocks: [
      decomposition.targetCommutantBlocks.dimensions["+→+"],
      decomposition.targetCommutantBlocks.dimensions["+→-"],
      decomposition.targetCommutantBlocks.dimensions["-→+"],
      decomposition.targetCommutantBlocks.dimensions["-→-"],
    ],
    sourceGeneratedAlgebraRanks: [decomposition.sourceGeneratedAlgebraRanks["+"], decomposition.sourceGeneratedAlgebraRanks["-"]],
    targetGeneratedAlgebraRanks: [decomposition.targetGeneratedAlgebraRanks["+"], decomposition.targetGeneratedAlgebraRanks["-"]],
    fullHomRankSpectrum: spectrumEntries(decomposition.hom.basisRankSpectrum),
    projectiveEmbeddingClassCount: selectors.projectiveEmbeddingClassCount,
    coefficientBoundaryRanks: [
      selectors.coefficientBoundaryControls.zeroRank,
      selectors.coefficientBoundaryControls.plusOnlyRank,
      selectors.coefficientBoundaryControls.minusOnlyRank,
      selectors.coefficientBoundaryControls.bothSectorsRank,
    ],
    minimumSupportCandidateCount: selectors.minimumSupportSelector.candidatePairCount,
    allMinimumSupportRanks: selectors.minimumSupportSelector.allCandidatePairsHaveRank16 ? [16] : [],
    balancedMinimizerCount: selectors.balancedGramSelector.minimizerCountBeforeLexicographicTieBreak,
    balancedScore: [selectors.balancedGramSelector.minimumOffDiagonalEnergy, selectors.balancedGramSelector.minimumDiagonalSpread],
    basisOrientationInvariantImage: selectors.unitComponentSelector.basisOrientationInvariantImage,
    unitMovedByAutomorphism: selectors.unitComponentSelector.targetAutomorphism.movedImage,
    minimumSupportMovedByAutomorphism: selectors.minimumSupportSelector.targetAutomorphism.movedImage,
  };
}

function normalizeOracle(report: OracleReport): OracleReport {
  return {
    field: report.field,
    repSeed: report.repSeed,
    sourceSectorRanks: report.sourceSectorRanks,
    targetSectorRanks: report.targetSectorRanks,
    homBlocks: report.homBlocks,
    sourceCommutantBlocks: report.sourceCommutantBlocks,
    targetCommutantBlocks: report.targetCommutantBlocks,
    sourceGeneratedAlgebraRanks: report.sourceGeneratedAlgebraRanks,
    targetGeneratedAlgebraRanks: report.targetGeneratedAlgebraRanks,
    fullHomRankSpectrum: report.fullHomRankSpectrum,
    projectiveEmbeddingClassCount: report.projectiveEmbeddingClassCount,
    coefficientBoundaryRanks: report.coefficientBoundaryRanks,
    minimumSupportCandidateCount: report.minimumSupportCandidateCount,
    allMinimumSupportRanks: report.allMinimumSupportRanks,
    balancedMinimizerCount: report.balancedMinimizerCount,
    balancedScore: report.balancedScore,
    basisOrientationInvariantImage: report.basisOrientationInvariantImage,
    unitMovedByAutomorphism: report.unitMovedByAutomorphism,
    minimumSupportMovedByAutomorphism: report.minimumSupportMovedByAutomorphism,
  };
}

function spectrumKeys(spectrum: Readonly<Record<string, number>>): readonly number[] {
  return Object.keys(spectrum).map(Number).sort((left, right) => left - right);
}

function summarizeRustExtension(oracleCase: OracleCase): RustExtensionReport {
  const commutant = measureFiniteHalfSpinCommutantGroup(oracleCase.field, oracleCase.repSeed);
  const lattice = measureFiniteIntertwinerIntegralLattice(oracleCase.field, oracleCase.repSeed);
  return {
    commutantPerSectorOrder: commutant.unitGroup.perSectorOrder,
    commutantTotalOrder: commutant.unitGroup.totalOrder,
    commutantNonzeroOrbitSize: commutant.unitGroup.nonzeroCoefficientOrbitSize,
    commutantNonzeroStabilizerOrder: commutant.unitGroup.perSectorNonzeroVectorStabilizerOrder,
    commutantFullEmbeddingOrbitCount: commutant.unitGroup.fullEmbeddingPairOrbitCount,
    latticeSupports: spectrumKeys(lattice.supportSpectrum),
    latticeNorms: spectrumKeys(lattice.frobeniusNormSquaredSpectrum),
    latticeDeterminants: spectrumKeys(lattice.selectedMinorDeterminantSpectrum),
    latticeModTwoRanks: spectrumKeys(lattice.modTwoRankSpectrum),
    latticePrimitiveCount: lattice.primitiveCandidateCount,
    latticeIntegralAutomorphismCount: lattice.signedPermutationCommutantOrbit.availableIntegralAutomorphisms,
    latticeReferenceOrbitSize: lattice.signedPermutationCommutantOrbit.referenceOrbitSize,
    latticeOrbitCount: lattice.signedPermutationCommutantOrbit.orbitCount,
  };
}

function extractRustExtension(report: OracleReport & RustExtensionReport): RustExtensionReport {
  return {
    commutantPerSectorOrder: report.commutantPerSectorOrder,
    commutantTotalOrder: report.commutantTotalOrder,
    commutantNonzeroOrbitSize: report.commutantNonzeroOrbitSize,
    commutantNonzeroStabilizerOrder: report.commutantNonzeroStabilizerOrder,
    commutantFullEmbeddingOrbitCount: report.commutantFullEmbeddingOrbitCount,
    latticeSupports: [...report.latticeSupports].sort((left, right) => left - right),
    latticeNorms: [...report.latticeNorms].sort((left, right) => left - right),
    latticeDeterminants: [...report.latticeDeterminants].sort((left, right) => left - right),
    latticeModTwoRanks: [...report.latticeModTwoRanks].sort((left, right) => left - right),
    latticePrimitiveCount: report.latticePrimitiveCount,
    latticeIntegralAutomorphismCount: report.latticeIntegralAutomorphismCount,
    latticeReferenceOrbitSize: report.latticeReferenceOrbitSize,
    latticeOrbitCount: report.latticeOrbitCount,
  };
}

function resolveRustc(): string {
  const direct = spawnSync("rustc", ["--version"], { encoding: "utf8" });
  if (direct.status === 0) return "rustc";
  const declared = spawnSync("mise", ["which", "rustc"], { cwd: REPOSITORY_ROOT, encoding: "utf8" });
  if (declared.status !== 0) throw new Error("declared rustc is unavailable");
  return declared.stdout.trim();
}

function resolveDotnet(): string {
  const direct = spawnSync("dotnet", ["--version"], { encoding: "utf8" });
  if (direct.status === 0) return "dotnet";
  const declared = spawnSync("mise", ["which", "dotnet"], { cwd: REPOSITORY_ROOT, encoding: "utf8" });
  if (declared.status !== 0) throw new Error("declared dotnet is unavailable");
  return declared.stdout.trim();
}

function runFSharp(oracleCase: OracleCase): OracleReport {
  const child = spawnSync(
    resolveDotnet(),
    ["fsi", "--nologo", F_SHARP_ORACLE, "--", `--field=${String(oracleCase.field)}`, `--rep-seed=${String(oracleCase.repSeed)}`],
    {
      cwd: REPOSITORY_ROOT,
      encoding: "utf8",
      timeout: 90_000,
      env: { ...process.env, DOTNET_CLI_TELEMETRY_OPTOUT: "1" },
    },
  );
  if (child.error !== undefined || child.status !== 0) {
    throw new Error(`F# decomposition oracle failed: ${child.error?.message ?? child.stderr}`);
  }
  const line = child.stdout.trim().split(/\r?\n/).at(-1);
  if (line === undefined) throw new Error("F# decomposition oracle emitted no JSON");
  const decoded: unknown = JSON.parse(line);
  if (!isOracleReport(decoded)) throw new Error("F# decomposition oracle emitted malformed JSON");
  return decoded;
}

function runFSharpFault(fault: FaultReport["fault"]): FaultReport {
  const child = spawnSync(
    resolveDotnet(),
    ["fsi", "--nologo", F_SHARP_ORACLE, "--", "--field=1000003", `--fault=${fault}`],
    {
      cwd: REPOSITORY_ROOT,
      encoding: "utf8",
      timeout: 90_000,
      env: { ...process.env, DOTNET_CLI_TELEMETRY_OPTOUT: "1" },
    },
  );
  if (child.error !== undefined || child.status !== 0) {
    throw new Error(`F# decomposition fault oracle failed: ${child.error?.message ?? child.stderr}`);
  }
  const line = child.stdout.trim().split(/\r?\n/).at(-1);
  if (line === undefined) throw new Error("F# decomposition fault oracle emitted no JSON");
  const decoded: unknown = JSON.parse(line);
  if (!isFaultReport(decoded)) throw new Error("F# decomposition fault oracle emitted malformed JSON");
  return normalizeFault(decoded);
}

const sandbox = mkdtempSync(join(tmpdir(), "zeta-intertwiner-rust-"));
const binary = join(sandbox, "oracle");
let failures = 0;
try {
  const compilation = spawnSync(resolveRustc(), ["--edition=2021", "-D", "warnings", RUST_ORACLE, "-o", binary], {
    cwd: REPOSITORY_ROOT,
    encoding: "utf8",
    timeout: 60_000,
  });
  if (compilation.error !== undefined || compilation.status !== 0) {
    throw new Error(`Rust decomposition oracle failed to compile: ${compilation.error?.message ?? compilation.stderr}`);
  }
  for (const oracleCase of CASES) {
    const child = spawnSync(binary, [`--field=${String(oracleCase.field)}`, `--rep-seed=${String(oracleCase.repSeed)}`], {
      cwd: REPOSITORY_ROOT,
      encoding: "utf8",
      timeout: 90_000,
    });
    if (child.error !== undefined || child.status !== 0) {
      throw new Error(`Rust decomposition oracle failed: ${child.error?.message ?? child.stderr}`);
    }
    const decoded: unknown = JSON.parse(child.stdout.trim());
    if (!isRustExtensionReport(decoded)) throw new Error("Rust decomposition oracle emitted malformed or incomplete JSON");
    const fsharp = runFSharp(oracleCase);
    const typescript = summarize(oracleCase);
    if (JSON.stringify(normalizeOracle(decoded)) !== JSON.stringify(typescript)) {
      console.error(`adinkra-halfspin-decomposition Rust mismatch: F_${String(oracleCase.field)} seed ${String(oracleCase.repSeed)}`);
      failures += 1;
    }
    if (JSON.stringify(extractRustExtension(decoded)) !== JSON.stringify(summarizeRustExtension(oracleCase))) {
      console.error(`adinkra-halfspin commutant/lattice Rust mismatch: F_${String(oracleCase.field)} seed ${String(oracleCase.repSeed)}`);
      failures += 1;
    }
    if (JSON.stringify(fsharp) !== JSON.stringify(typescript)) {
      console.error(`adinkra-halfspin-decomposition F# mismatch: F_${String(oracleCase.field)} seed ${String(oracleCase.repSeed)}`);
      failures += 1;
    }
  }
  for (const faultCase of FAULT_CASES) {
    const rustChild = spawnSync(binary, ["--field=1000003", `--fault=${faultCase.fault}`], {
      cwd: REPOSITORY_ROOT,
      encoding: "utf8",
      timeout: 90_000,
    });
    if (rustChild.error !== undefined || rustChild.status !== 0) {
      throw new Error(`Rust decomposition fault oracle failed: ${rustChild.error?.message ?? rustChild.stderr}`);
    }
    const rustDecoded: unknown = JSON.parse(rustChild.stdout.trim());
    if (!isFaultReport(rustDecoded)) throw new Error("Rust decomposition fault oracle emitted malformed JSON");
    const fsharp = runFSharpFault(faultCase.fault);
    const typescriptCensus = measureFiniteAdinkraHalfSpinIntertwiner({ field: 1_000_003, ...faultCase.typescriptOptions });
    const typescript: FaultReport = {
      field: 1_000_003,
      fault: faultCase.fault,
      targetCliffordViolations: typescriptCensus.targetCliffordViolations,
      quarantinedBeforeDecomposition: typescriptCensus.targetCliffordViolations > 0,
    };
    if (JSON.stringify(normalizeFault(rustDecoded)) !== JSON.stringify(typescript)) {
      console.error(`adinkra-halfspin-decomposition Rust fault mismatch: ${faultCase.fault}`);
      failures += 1;
    }
    if (JSON.stringify(fsharp) !== JSON.stringify(typescript)) {
      console.error(`adinkra-halfspin-decomposition F# fault mismatch: ${faultCase.fault}`);
      failures += 1;
    }
  }
} finally {
  rmSync(sandbox, { recursive: true, force: true });
}

console.log(`adinkra-halfspin-decomposition cross-verify: ${String(CASES.length)} baselines + ${String(FAULT_CASES.length)} faults across TypeScript/F#/Rust, ${String(failures)} failure(s).`);
process.exit(failures === 0 ? 0 : 1);
