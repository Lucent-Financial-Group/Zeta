/**
 * Dark Matter Observatory algebra lane: integer-lattice tests for the 64 minimum-support
 * intertwiners. Equal lattice invariants are an obstruction to the tested selectors, not a
 * universal canonicity theorem.
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
} from "./nonquotient-adinkra-halfspin-decomposition";
import { PRIMES } from "./regular-representation-defect";

export interface FiniteIntegralLatticeCensus {
  readonly field: number;
  readonly repSeed: number;
  readonly candidateCount: number;
  readonly fullRankCandidateCount: number;
  readonly primitiveCandidateCount: number;
  readonly modTwoRankSpectrum: Readonly<Record<string, number>>;
  readonly supportSpectrum: Readonly<Record<string, number>>;
  readonly frobeniusNormSquaredSpectrum: Readonly<Record<string, number>>;
  readonly selectedMinorDeterminantSpectrum: Readonly<Record<string, number>>;
  readonly signedPermutationCommutantOrbit: {
    readonly availableIntegralAutomorphisms: number;
    readonly referenceOrbitSize: number;
    readonly orbitCount: number;
    readonly expectedCandidatePairs: 64;
    readonly transitive: boolean;
  };
  readonly orientationReversal: {
    readonly swapsSectorLabels: boolean;
    readonly preservesUnorderedCandidateSet: boolean;
  };
  readonly selectorVerdict: {
    readonly primitiveIntegerConstraint: "64-way primitive tie" | "all nonprimitive; 64-way tie" | "distinguishes candidates";
    readonly minimumSupportConstraint: "64-way tie";
    readonly minimumNormConstraint: "64-way tie" | "distinguishes candidates";
    readonly signedPermutationEquivalence: "single measured orbit" | "multiple measured orbits";
    readonly testedIntegralSelectorCanonical: false;
    readonly universalCanonicalSelectorClaim: "not established";
  };
  readonly regularity: { readonly status: "unmeasured" };
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
  targetDimension: number,
  field: number,
): CentralSign {
  const plus = verifySparseIntertwiner(
    [sourceCentralWord],
    [scalarIdentity(targetDimension, 1)],
    basis.entries,
    field,
  );
  const minus = verifySparseIntertwiner(
    [sourceCentralWord],
    [scalarIdentity(targetDimension, -1)],
    basis.entries,
    field,
  );
  if (plus === minus) throw new Error("lattice basis map does not occupy exactly one source sector");
  return plus ? "+" : "-";
}

function combine(left: IntertwinerBasisMap, right: IntertwinerBasisMap): readonly SparseMatrixEntry[] {
  return [...left.entries, ...right.entries];
}

function countSpectrum(values: readonly (number | bigint)[]): Readonly<Record<string, number>> {
  const counts: Record<string, number> = {};
  for (const value of values) {
    const key = value.toString();
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return Object.freeze(counts);
}

function denseIntegerRows(entries: readonly SparseMatrixEntry[]): readonly BigInt64Array[] {
  const rows = Array.from({ length: 128 }, () => new BigInt64Array(16));
  for (const entry of entries) {
    const row = rows[entry.row];
    if (row === undefined) throw new Error("lattice entry row is absent");
    row[entry.column] = BigInt(entry.value);
  }
  return rows;
}

function selectedIndependentRows(
  entries: readonly SparseMatrixEntry[],
  field: number,
): readonly number[] {
  const dense = Array.from({ length: 128 }, () => new Float64Array(16));
  for (const entry of entries) {
    const row = dense[entry.row];
    if (row === undefined) throw new Error("rank-selection row is absent");
    row[entry.column] = entry.value === -1 ? field - 1 : 1;
  }
  const basis: { readonly pivot: number; readonly values: Float64Array; readonly originalRow: number }[] = [];
  for (let rowIndex = 0; rowIndex < dense.length; rowIndex += 1) {
    const values = Float64Array.from(dense[rowIndex] ?? new Float64Array(16));
    for (const item of basis) {
      const factor = values[item.pivot] ?? 0;
      if (factor === 0) continue;
      for (let column = item.pivot; column < 16; column += 1) {
        const reduced = ((values[column] ?? 0) - factor * (item.values[column] ?? 0)) % field;
        values[column] = reduced < 0 ? reduced + field : reduced;
      }
    }
    const pivot = values.findIndex((value) => value !== 0);
    if (pivot < 0) continue;
    let oldR = values[pivot] ?? 0;
    let r = field;
    let oldS = 1;
    let s = 0;
    while (r !== 0) {
      const quotient = Math.floor(oldR / r);
      [oldR, r] = [r, oldR - quotient * r];
      [oldS, s] = [s, oldS - quotient * s];
    }
    const inverse = ((oldS % field) + field) % field;
    for (let column = pivot; column < 16; column += 1) {
      values[column] = ((values[column] ?? 0) * inverse) % field;
    }
    basis.push({ pivot, values, originalRow: rowIndex });
    basis.sort((left, right) => left.pivot - right.pivot);
    if (basis.length === 16) break;
  }
  if (basis.length !== 16) throw new Error("candidate does not have sixteen independent rows");
  return basis.map((item) => item.originalRow);
}

function bareissDeterminant(matrix: readonly BigInt64Array[]): bigint {
  const dimension = matrix.length;
  const values = matrix.map((row) => Array.from(row, BigInt));
  let sign = 1n;
  let previousPivot = 1n;
  for (let pivotIndex = 0; pivotIndex < dimension - 1; pivotIndex += 1) {
    let pivotRow = pivotIndex;
    while (pivotRow < dimension && (values[pivotRow]?.[pivotIndex] ?? 0n) === 0n) pivotRow += 1;
    if (pivotRow === dimension) return 0n;
    if (pivotRow !== pivotIndex) {
      [values[pivotIndex], values[pivotRow]] = [values[pivotRow] ?? [], values[pivotIndex] ?? []];
      sign = -sign;
    }
    const pivot = values[pivotIndex]?.[pivotIndex] ?? 0n;
    for (let row = pivotIndex + 1; row < dimension; row += 1) {
      for (let column = pivotIndex + 1; column < dimension; column += 1) {
        const numerator =
          (values[row]?.[column] ?? 0n) * pivot -
          (values[row]?.[pivotIndex] ?? 0n) * (values[pivotIndex]?.[column] ?? 0n);
        if (numerator % previousPivot !== 0n) throw new Error("Bareiss division was not exact");
        const targetRow = values[row];
        if (targetRow === undefined) throw new Error("Bareiss target row is absent");
        targetRow[column] = numerator / previousPivot;
      }
    }
    previousPivot = pivot;
  }
  return sign * (values[dimension - 1]?.[dimension - 1] ?? 0n);
}

function selectedMinorDeterminant(entries: readonly SparseMatrixEntry[], field: number): bigint {
  const rows = denseIntegerRows(entries);
  const selected = selectedIndependentRows(entries, field);
  const minor = selected.map((row) => rows[row] ?? new BigInt64Array(16));
  const determinant = bareissDeterminant(minor);
  return determinant < 0n ? -determinant : determinant;
}

function composeTarget(
  targetMap: IntertwinerBasisMap,
  sourceMap: IntertwinerBasisMap,
): readonly SparseMatrixEntry[] {
  const byColumn = new Map<number, SparseMatrixEntry>();
  for (const entry of targetMap.entries) byColumn.set(entry.column, entry);
  return sourceMap.entries.map((entry) => {
    const target = byColumn.get(entry.row);
    if (target === undefined) throw new Error("commutant signed permutation omitted a target row");
    return { row: target.row, column: entry.column, value: (target.value * entry.value) as 1 | -1 };
  });
}

function locateSignedBasis(
  entries: readonly SparseMatrixEntry[],
  basisMaps: readonly IntertwinerBasisMap[],
): number {
  const first = entries[0];
  if (first === undefined) throw new Error("signed basis image is empty");
  for (let index = 0; index < basisMaps.length; index += 1) {
    const basis = basisMaps[index];
    if (basis === undefined || basis.entries.length !== entries.length) continue;
    const matching = basis.entries.find((entry) => entry.row === first.row && entry.column === first.column);
    if (matching === undefined) continue;
    const scalar = first.value * matching.value;
    const expected = new Set(basis.entries.map((entry) => `${String(entry.row)},${String(entry.column)},${String(entry.value * scalar)}`));
    if (entries.every((entry) => expected.has(`${String(entry.row)},${String(entry.column)},${String(entry.value)}`))) return index;
  }
  throw new Error("signed commutant action left the Hom graph basis");
}

export function measureFiniteIntertwinerIntegralLattice(
  field: (typeof PRIMES)[number] = PRIMES[0],
  repSeed = 0,
): FiniteIntegralLatticeCensus {
  const source = buildDeclaredAdinkraEvenAction(repSeed).generators;
  const target = buildDeclaredHalfSpinEvenAction();
  const decomposition = measureFiniteIntertwinerDecomposition(field, repSeed);
  const hom = solveSignedPermutationIntertwiners(source, target, field);
  const commutant = solveSignedPermutationIntertwiners(target, target, field);
  const signs = hom.basisMaps.map((basis) => basisCentralSign(basis, decomposition.source.word, 128, field));
  const plusIndices = signs.flatMap((sign, index) => sign === "+" ? [index] : []);
  const minusIndices = signs.flatMap((sign, index) => sign === "-" ? [index] : []);
  const candidates = plusIndices.flatMap((plusIndex) => minusIndices.map((minusIndex) => {
    const plus = hom.basisMaps[plusIndex];
    const minus = hom.basisMaps[minusIndex];
    if (plus === undefined || minus === undefined) throw new Error("minimum-support basis map is absent");
    return { plusIndex, minusIndex, entries: combine(plus, minus) };
  }));
  const ranks = candidates.map((candidate) => modularMatrixRank(128, 16, candidate.entries, field));
  const supports = candidates.map((candidate) => candidate.entries.length);
  const norms = candidates.map((candidate) => candidate.entries.reduce((sum, entry) => sum + entry.value * entry.value, 0));
  const determinants = candidates.map((candidate) => selectedMinorDeterminant(candidate.entries, field));
  const modTwoRanks = candidates.map((candidate) => modularMatrixRank(128, 16, candidate.entries, 2));
  const referencePlus = plusIndices[0];
  const referenceMinus = minusIndices[0];
  if (referencePlus === undefined || referenceMinus === undefined) throw new Error("reference sector components are absent");
  const actions: readonly number[][] = commutant.basisMaps.map((automorphism) =>
    hom.basisMaps.map((basis) => locateSignedBasis(composeTarget(automorphism, basis), hom.basisMaps))
  );
  const candidateKeys = new Set(candidates.map((candidate) => `${String(candidate.plusIndex)},${String(candidate.minusIndex)}`));
  const orbitFrom = (root: string): ReadonlySet<string> => {
    const reached = new Set([root]);
    const pending = [root];
    while (pending.length > 0) {
      const key = pending.pop();
      if (key === undefined) break;
      const [plusText, minusText] = key.split(",");
      const plusIndex = Number(plusText);
      const minusIndex = Number(minusText);
      for (const action of actions) {
        const nextPlus = action[plusIndex];
        const nextMinus = action[minusIndex];
        if (nextPlus === undefined || nextMinus === undefined) throw new Error("signed automorphism action is incomplete");
        const next = `${String(nextPlus)},${String(nextMinus)}`;
        if (!candidateKeys.has(next)) throw new Error("signed automorphism mixed the declared central sectors");
        if (!reached.has(next)) {
          reached.add(next);
          pending.push(next);
        }
      }
    }
    return reached;
  };
  const referenceOrbit = orbitFrom(`${String(referencePlus)},${String(referenceMinus)}`);
  const unclassified = new Set(candidateKeys);
  let orbitCount = 0;
  while (unclassified.size > 0) {
    const root = unclassified.values().next().value as string | undefined;
    if (root === undefined) break;
    orbitCount += 1;
    for (const key of orbitFrom(root)) unclassified.delete(key);
  }
  const supportSpectrum = countSpectrum(supports);
  const normSpectrum = countSpectrum(norms);
  const determinantSpectrum = countSpectrum(determinants);
  const primitiveCount = determinants.filter((determinant, index) =>
    determinant > 0n && (determinant & (determinant - 1n)) === 0n && modTwoRanks[index] === 16
  ).length;
  const transitive = referenceOrbit.size === candidates.length && orbitCount === 1;

  return {
    field,
    repSeed,
    candidateCount: candidates.length,
    fullRankCandidateCount: ranks.filter((rank) => rank === 16).length,
    primitiveCandidateCount: primitiveCount,
    modTwoRankSpectrum: countSpectrum(modTwoRanks),
    supportSpectrum,
    frobeniusNormSquaredSpectrum: normSpectrum,
    selectedMinorDeterminantSpectrum: determinantSpectrum,
    signedPermutationCommutantOrbit: {
      availableIntegralAutomorphisms: commutant.basisMaps.length,
      referenceOrbitSize: referenceOrbit.size,
      orbitCount,
      expectedCandidatePairs: 64,
      transitive,
    },
    orientationReversal: {
      swapsSectorLabels: true,
      preservesUnorderedCandidateSet: plusIndices.length === minusIndices.length && candidates.length === 64,
    },
    selectorVerdict: {
      primitiveIntegerConstraint:
        primitiveCount === candidates.length
          ? "64-way primitive tie"
          : primitiveCount === 0 && Object.keys(countSpectrum(modTwoRanks)).length === 1
          ? "all nonprimitive; 64-way tie"
          : "distinguishes candidates",
      minimumSupportConstraint: "64-way tie",
      minimumNormConstraint: Object.keys(normSpectrum).length === 1 ? "64-way tie" : "distinguishes candidates",
      signedPermutationEquivalence: transitive ? "single measured orbit" : "multiple measured orbits",
      testedIntegralSelectorCanonical: false,
      universalCanonicalSelectorClaim: "not established",
    },
    regularity: { status: "unmeasured" },
  };
}
