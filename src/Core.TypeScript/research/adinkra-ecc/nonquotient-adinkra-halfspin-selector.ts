/**
 * Dark Matter Observatory algebra lane: exact canonical-selector falsifiers for the finite
 * coded-Adinkra / half-spin Hom-space. Deterministic presentation choices are not promoted to
 * module-canonical maps, and regularity remains explicitly unmeasured.
 */

import {
  buildDeclaredAdinkraEvenAction,
  buildDeclaredHalfSpinEvenAction,
  solveSignedPermutationIntertwiners,
  verifySparseIntertwiner,
  type IntertwinerBasisMap,
  type SignedPermutation,
  type SparseMatrixEntry,
} from "./nonquotient-adinkra-halfspin-intertwiner";
import {
  measureFiniteIntertwinerDecomposition,
  modularMatrixRank,
  type CentralSign,
  type ModularEntry,
} from "./nonquotient-adinkra-halfspin-decomposition";
import { PRIMES } from "./regular-representation-defect";

export interface SelectorWitness {
  readonly rank: number;
  readonly intertwines: boolean;
  readonly supportComponentCount: number;
}

export interface TargetAutomorphismWitness {
  readonly found: boolean;
  readonly basisIndex: number | null;
  readonly coefficient: number | null;
  readonly rank: number;
  readonly movedImage: boolean;
}

export interface FiniteIntertwinerSelectorCensus {
  readonly field: number;
  readonly repSeed: number;
  readonly multiplicities: Readonly<Record<CentralSign, number>>;
  readonly projectiveEmbeddingClassCount: string;
  readonly fullRankCriterion: {
    readonly sourceSectorsSimple: boolean;
    readonly crossHomBlocksVanish: boolean;
    readonly statement: "rank 16 iff both central coefficient vectors are nonzero" | "unproved";
  };
  readonly coefficientBoundaryControls: {
    readonly zeroRank: number;
    readonly plusOnlyRank: number;
    readonly minusOnlyRank: number;
    readonly bothSectorsRank: number;
  };
  readonly unitComponentSelector: SelectorWitness & {
    readonly negatedBasisComponentRank: number;
    readonly basisOrientationInvariantImage: boolean;
    readonly targetAutomorphism: TargetAutomorphismWitness;
  };
  readonly minimumSupportSelector: SelectorWitness & {
    readonly minimalComponentCount: number;
    readonly candidatePairCount: number;
    readonly allCandidatePairsHaveRank16: boolean;
    readonly targetAutomorphism: TargetAutomorphismWitness;
  };
  readonly balancedGramSelector: SelectorWitness & {
    readonly minimizerCountBeforeLexicographicTieBreak: number;
    readonly minimumOffDiagonalEnergy: number;
    readonly minimumDiagonalSpread: number;
    readonly targetAutomorphism: TargetAutomorphismWitness;
  };
  readonly canonicality: {
    readonly presentationDeterministic: true;
    readonly testedSelectorsNaturalUnderBasisOrientation: false;
    readonly testedSelectorsModuleCanonical: false;
    readonly universalCanonicalSelectorClaim: "not established";
  };
  readonly regularity: {
    readonly status: "unmeasured";
  };
}

interface DenseMatrix {
  readonly rows: number;
  readonly columns: number;
  readonly values: Float64Array;
}

interface GramScore {
  readonly offDiagonalEnergy: number;
  readonly diagonalSpread: number;
}

function scalarIdentity(dimension: number, sign: 1 | -1): SignedPermutation {
  const to = new Int32Array(dimension);
  const signs = new Int8Array(dimension).fill(sign);
  for (let index = 0; index < dimension; index += 1) to[index] = index;
  return { to, sign: signs };
}

function basisCentralSign(
  basis: IntertwinerBasisMap,
  sourceCentralWord: SignedPermutation,
  field: number,
): CentralSign {
  const plus = verifySparseIntertwiner(
    [sourceCentralWord],
    [scalarIdentity(basis.entries.reduce((maximum, entry) => Math.max(maximum, entry.row + 1), 0), 1)],
    basis.entries,
    field,
  );
  const minus = verifySparseIntertwiner(
    [sourceCentralWord],
    [scalarIdentity(basis.entries.reduce((maximum, entry) => Math.max(maximum, entry.row + 1), 0), -1)],
    basis.entries,
    field,
  );
  if (plus === minus) throw new Error("basis map does not occupy exactly one central source sector");
  return plus ? "+" : "-";
}

function combineBasisMaps(
  basisMaps: readonly IntertwinerBasisMap[],
  coefficients: readonly number[],
): readonly ModularEntry[] {
  if (basisMaps.length !== coefficients.length) throw new Error("basis coefficient count does not match the Hom basis");
  return basisMaps.flatMap((basis, index) => {
    const coefficient = coefficients[index] ?? 0;
    if (coefficient === 0) return [];
    return basis.entries.map((entry) => ({ row: entry.row, column: entry.column, value: coefficient * entry.value }));
  });
}

function signedEntries(entries: readonly ModularEntry[], field: number): readonly SparseMatrixEntry[] {
  return entries.map((entry) => {
    const value = ((entry.value % field) + field) % field;
    if (value === 1) return { row: entry.row, column: entry.column, value: 1 as const };
    if (value === field - 1) return { row: entry.row, column: entry.column, value: -1 as const };
    throw new Error("selector verification currently expects sign coefficients");
  });
}

function toDense(rows: number, columns: number, entries: readonly ModularEntry[], field: number): DenseMatrix {
  const values = new Float64Array(rows * columns);
  for (const entry of entries) {
    const index = entry.row * columns + entry.column;
    values[index] = ((values[index] ?? 0) + entry.value + field) % field;
  }
  return { rows, columns, values };
}

function multiply(left: DenseMatrix, right: DenseMatrix, field: number): DenseMatrix {
  if (left.columns !== right.rows) throw new Error("matrix dimensions do not compose");
  const values = new Float64Array(left.rows * right.columns);
  for (let row = 0; row < left.rows; row += 1) {
    for (let middle = 0; middle < left.columns; middle += 1) {
      const leftValue = left.values[row * left.columns + middle] ?? 0;
      if (leftValue === 0) continue;
      for (let column = 0; column < right.columns; column += 1) {
        const index = row * right.columns + column;
        values[index] = ((values[index] ?? 0) + leftValue * (right.values[middle * right.columns + column] ?? 0)) % field;
      }
    }
  }
  return { rows: left.rows, columns: right.columns, values };
}

function denseEntries(matrix: DenseMatrix): readonly ModularEntry[] {
  const entries: ModularEntry[] = [];
  for (let row = 0; row < matrix.rows; row += 1) {
    for (let column = 0; column < matrix.columns; column += 1) {
      const value = matrix.values[row * matrix.columns + column] ?? 0;
      if (value !== 0) entries.push({ row, column, value });
    }
  }
  return entries;
}

function identityEntries(dimension: number): readonly ModularEntry[] {
  return Array.from({ length: dimension }, (_, index) => ({ row: index, column: index, value: 1 }));
}

function sameColumnSpace(
  rows: number,
  columns: number,
  left: readonly ModularEntry[],
  right: readonly ModularEntry[],
  field: number,
): boolean {
  const leftRank = modularMatrixRank(rows, columns, left, field);
  const joined = [
    ...left,
    ...right.map((entry) => ({ row: entry.row, column: entry.column + columns, value: entry.value })),
  ];
  return modularMatrixRank(rows, columns * 2, joined, field) === leftRank;
}

function findMovingAutomorphism(
  selected: readonly ModularEntry[],
  commutantBasis: readonly IntertwinerBasisMap[],
  field: number,
): TargetAutomorphismWitness {
  const selectedDense = toDense(128, 16, selected, field);
  for (let basisIndex = 0; basisIndex < commutantBasis.length; basisIndex += 1) {
    const basis = commutantBasis[basisIndex];
    if (basis === undefined) throw new Error("target commutant basis is absent");
    for (let coefficient = 1; coefficient <= 17; coefficient += 1) {
      const automorphismEntries = [
        ...identityEntries(128),
        ...basis.entries.map((entry) => ({ row: entry.row, column: entry.column, value: coefficient * entry.value })),
      ];
      const rank = modularMatrixRank(128, 128, automorphismEntries, field);
      if (rank !== 128) continue;
      const moved = multiply(toDense(128, 128, automorphismEntries, field), selectedDense, field);
      const movedEntries = denseEntries(moved);
      if (!sameColumnSpace(128, 16, selected, movedEntries, field)) {
        return { found: true, basisIndex, coefficient, rank, movedImage: true };
      }
    }
  }
  return { found: false, basisIndex: null, coefficient: null, rank: 0, movedImage: false };
}

function gramScore(entries: readonly ModularEntry[]): GramScore {
  const matrix = new Map<string, number>();
  for (const entry of entries) matrix.set(`${String(entry.row)},${String(entry.column)}`, entry.value);
  const diagonal: number[] = [];
  let offDiagonalEnergy = 0;
  for (let left = 0; left < 16; left += 1) {
    for (let right = 0; right < 16; right += 1) {
      let inner = 0;
      for (let row = 0; row < 128; row += 1) {
        inner += (matrix.get(`${String(row)},${String(left)}`) ?? 0) * (matrix.get(`${String(row)},${String(right)}`) ?? 0);
      }
      if (left === right) diagonal.push(inner);
      else offDiagonalEnergy += inner * inner;
    }
  }
  const maximum = Math.max(...diagonal);
  const minimum = Math.min(...diagonal);
  return { offDiagonalEnergy, diagonalSpread: maximum - minimum };
}

function scoreLess(left: GramScore, right: GramScore): boolean {
  return left.offDiagonalEnergy < right.offDiagonalEnergy ||
    (left.offDiagonalEnergy === right.offDiagonalEnergy && left.diagonalSpread < right.diagonalSpread);
}

function projectivePointCount(field: number, dimension: number): bigint {
  const prime = BigInt(field);
  return (prime ** BigInt(dimension) - 1n) / (prime - 1n);
}

export function measureFiniteIntertwinerSelectors(
  field: (typeof PRIMES)[number] = PRIMES[0],
  repSeed = 0,
): FiniteIntertwinerSelectorCensus {
  const decomposition = measureFiniteIntertwinerDecomposition(field, repSeed);
  const source = buildDeclaredAdinkraEvenAction(repSeed).generators;
  const target = buildDeclaredHalfSpinEvenAction();
  const hom = solveSignedPermutationIntertwiners(source, target, field);
  const targetCommutant = solveSignedPermutationIntertwiners(target, target, field);
  const plusIndices: number[] = [];
  const minusIndices: number[] = [];
  hom.basisMaps.forEach((basis, index) => {
    const sign = basisCentralSign(basis, decomposition.source.word, field);
    (sign === "+" ? plusIndices : minusIndices).push(index);
  });

  const unitCoefficients = hom.basisMaps.map(() => 1);
  const unitEntries = combineBasisMaps(hom.basisMaps, unitCoefficients);
  const plusOnlyCoefficients = hom.basisMaps.map((_, index) => plusIndices.includes(index) ? 1 : 0);
  const minusOnlyCoefficients = hom.basisMaps.map((_, index) => minusIndices.includes(index) ? 1 : 0);
  const zeroEntries = combineBasisMaps(hom.basisMaps, hom.basisMaps.map(() => 0));
  const plusOnlyEntries = combineBasisMaps(hom.basisMaps, plusOnlyCoefficients);
  const minusOnlyEntries = combineBasisMaps(hom.basisMaps, minusOnlyCoefficients);
  const negatedCoefficients = [...unitCoefficients];
  negatedCoefficients[0] = -1;
  const negatedEntries = combineBasisMaps(hom.basisMaps, negatedCoefficients);

  const pairCandidates: { readonly entries: readonly ModularEntry[]; readonly score: GramScore }[] = [];
  for (const plusIndex of plusIndices) {
    for (const minusIndex of minusIndices) {
      const coefficients = hom.basisMaps.map(() => 0);
      coefficients[plusIndex] = 1;
      coefficients[minusIndex] = 1;
      const entries = combineBasisMaps(hom.basisMaps, coefficients);
      pairCandidates.push({ entries, score: gramScore(entries) });
    }
  }
  const lexEntries = pairCandidates[0]?.entries;
  if (lexEntries === undefined) throw new Error("minimum-support selector has no candidate");
  let bestScore = pairCandidates[0]?.score;
  if (bestScore === undefined) throw new Error("balanced selector has no score");
  for (const candidate of pairCandidates.slice(1)) {
    if (scoreLess(candidate.score, bestScore)) bestScore = candidate.score;
  }
  const balancedCandidates = pairCandidates.filter((candidate) =>
    candidate.score.offDiagonalEnergy === bestScore.offDiagonalEnergy &&
    candidate.score.diagonalSpread === bestScore.diagonalSpread
  );
  const balancedEntries = balancedCandidates[0]?.entries;
  if (balancedEntries === undefined) throw new Error("balanced selector has no minimizer");

  const projectivePerSector = projectivePointCount(field, 8);
  const rankCriterionProved =
    decomposition.finiteConclusion.sourceSectorSimplicityWitness &&
    decomposition.finiteConclusion.sourceSectorsInequivalent &&
    decomposition.homBlocks.dimensions["+→-"] === 0 &&
    decomposition.homBlocks.dimensions["-→+"] === 0;

  return {
    field,
    repSeed,
    multiplicities: decomposition.finiteConclusion.targetMultiplicityDimensions,
    projectiveEmbeddingClassCount: (projectivePerSector * projectivePerSector).toString(),
    fullRankCriterion: {
      sourceSectorsSimple: decomposition.finiteConclusion.sourceSectorSimplicityWitness,
      crossHomBlocksVanish:
        decomposition.homBlocks.dimensions["+→-"] === 0 && decomposition.homBlocks.dimensions["-→+"] === 0,
      statement: rankCriterionProved ? "rank 16 iff both central coefficient vectors are nonzero" : "unproved",
    },
    coefficientBoundaryControls: {
      zeroRank: modularMatrixRank(128, 16, zeroEntries, field),
      plusOnlyRank: modularMatrixRank(128, 16, plusOnlyEntries, field),
      minusOnlyRank: modularMatrixRank(128, 16, minusOnlyEntries, field),
      bothSectorsRank: modularMatrixRank(128, 16, unitEntries, field),
    },
    unitComponentSelector: {
      rank: modularMatrixRank(128, 16, unitEntries, field),
      intertwines: verifySparseIntertwiner(source, target, signedEntries(unitEntries, field), field),
      supportComponentCount: hom.basisMaps.length,
      negatedBasisComponentRank: modularMatrixRank(128, 16, negatedEntries, field),
      basisOrientationInvariantImage: sameColumnSpace(128, 16, unitEntries, negatedEntries, field),
      targetAutomorphism: findMovingAutomorphism(unitEntries, targetCommutant.basisMaps, field),
    },
    minimumSupportSelector: {
      rank: modularMatrixRank(128, 16, lexEntries, field),
      intertwines: verifySparseIntertwiner(source, target, signedEntries(lexEntries, field), field),
      supportComponentCount: 2,
      minimalComponentCount: 2,
      candidatePairCount: pairCandidates.length,
      allCandidatePairsHaveRank16: pairCandidates.every((candidate) =>
        modularMatrixRank(128, 16, candidate.entries, field) === 16
      ),
      targetAutomorphism: findMovingAutomorphism(lexEntries, targetCommutant.basisMaps, field),
    },
    balancedGramSelector: {
      rank: modularMatrixRank(128, 16, balancedEntries, field),
      intertwines: verifySparseIntertwiner(source, target, signedEntries(balancedEntries, field), field),
      supportComponentCount: 2,
      minimizerCountBeforeLexicographicTieBreak: balancedCandidates.length,
      minimumOffDiagonalEnergy: bestScore.offDiagonalEnergy,
      minimumDiagonalSpread: bestScore.diagonalSpread,
      targetAutomorphism: findMovingAutomorphism(balancedEntries, targetCommutant.basisMaps, field),
    },
    canonicality: {
      presentationDeterministic: true,
      testedSelectorsNaturalUnderBasisOrientation: false,
      testedSelectorsModuleCanonical: false,
      universalCanonicalSelectorClaim: "not established",
    },
    regularity: { status: "unmeasured" },
  };
}
