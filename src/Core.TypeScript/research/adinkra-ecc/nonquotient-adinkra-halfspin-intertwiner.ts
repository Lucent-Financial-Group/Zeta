/**
 * Exact finite intertwiner census between one declared coded-Adinkra even action and one declared
 * non-quotient half-spin restriction. This file reports finite witnesses or obstructions only;
 * regularity and homoiconicity remain explicitly unmeasured.
 */

import { buildCodedAdinkra, cliffordRelationsHold, type CodedAdinkra, PRIMES } from "./regular-representation-defect";
import { bivectorAction } from "./nonquotient-half-spin-action";

export const EXT_HAMMING_8_4_4_MASKS = [0b11100001, 0b11010010, 0b10110100, 0b01111000] as const;

export interface SignedPermutation {
  readonly to: Int32Array;
  readonly sign: Int8Array;
}

export interface SparseMatrixEntry {
  readonly row: number;
  readonly column: number;
  readonly value: 1 | -1;
}

export interface IntertwinerBasisMap {
  readonly componentIndex: number;
  readonly componentSize: number;
  readonly rank: number;
  readonly entries: readonly SparseMatrixEntry[];
}

export interface SignedIntertwinerSolution {
  readonly field: number;
  readonly sourceDimension: number;
  readonly targetDimension: number;
  readonly generatorCount: number;
  readonly variableCount: number;
  readonly consistentComponentCount: number;
  readonly inconsistentComponentCount: number;
  readonly nullity: number;
  readonly componentSizeSpectrum: Readonly<Record<string, number>>;
  readonly basisRankSpectrum: Readonly<Record<string, number>>;
  readonly maximalBasisRank: number;
  /** Rank of the concrete map obtained by assigning coefficient +1 to every nullspace component. */
  readonly unitCombinationRank: number;
  readonly allBasisMapsIntertwine: boolean;
  readonly unitCombinationIntertwines: boolean;
  readonly basisMaps: readonly IntertwinerBasisMap[];
}

export interface IntertwinerCensusOptions {
  readonly field?: number;
  readonly repSeed?: number;
  /** Fault injection: remove the target Jordan-Wigner parity string. */
  readonly omitTargetJordanWignerParity?: boolean;
  /** Fault injection: flip one target signed-permutation coordinate [generatorIndex, basisIndex]. */
  readonly flipTargetCoordinate?: readonly [number, number];
  /** Fault injection: replace target generator at first index with the generator at second index. */
  readonly duplicateTargetGenerator?: readonly [number, number];
}

export interface FiniteAdinkraHalfSpinIntertwinerCensus {
  readonly sourceDimension: 16;
  readonly targetDimension: 128;
  readonly generatorCount: 7;
  readonly field: number;
  readonly repSeed: number;
  readonly sourceCliffordViolations: number;
  readonly targetCliffordViolations: number;
  readonly solution: SignedIntertwinerSolution;
  readonly regularity: {
    readonly status: "unmeasured";
    readonly missingWitnesses: readonly string[];
  };
}

export interface IntertwinerCalibrationCensus {
  readonly field: number;
  readonly sourceIdentityIntertwines: boolean;
  readonly sourceIdentityRank: number;
  readonly targetIdentityIntertwines: boolean;
  readonly targetIdentityRank: number;
  readonly sourceConjugacyIntertwines: boolean;
  readonly sourceConjugacyRank: number;
  readonly sourceConjugacySolution: SignedIntertwinerSolution;
}

interface ConstraintEdge {
  readonly neighbour: number;
  readonly factor: 1 | -1;
}

function assertSignedPermutation(permutation: SignedPermutation, name: string): void {
  if (permutation.to.length !== permutation.sign.length) {
    throw new Error(`${name} target and sign arrays have different lengths`);
  }
  const seen = new Uint8Array(permutation.to.length);
  for (let source = 0; source < permutation.to.length; source += 1) {
    const target = permutation.to[source];
    const sign = permutation.sign[source];
    if (target === undefined || target < 0 || target >= permutation.to.length) {
      throw new Error(`${name} has an out-of-range target at source ${source}`);
    }
    if (sign !== 1 && sign !== -1) {
      throw new Error(`${name} has a non-sign coefficient at source ${source}`);
    }
    if (seen[target] !== 0) {
      throw new Error(`${name} is not a permutation: target ${target} is repeated`);
    }
    seen[target] = 1;
  }
}

export function composeSignedPermutation(
  outer: SignedPermutation,
  inner: SignedPermutation,
): SignedPermutation {
  if (outer.to.length !== inner.to.length) {
    throw new Error("cannot compose signed permutations of different dimensions");
  }
  assertSignedPermutation(outer, "outer permutation");
  assertSignedPermutation(inner, "inner permutation");
  const dimension = outer.to.length;
  const to = new Int32Array(dimension);
  const sign = new Int8Array(dimension);
  for (let source = 0; source < dimension; source += 1) {
    const middle = inner.to[source];
    if (middle === undefined) throw new Error("inner target is unexpectedly absent");
    const target = outer.to[middle];
    const innerSign = inner.sign[source];
    const outerSign = outer.sign[middle];
    if (target === undefined || innerSign === undefined || outerSign === undefined) {
      throw new Error("signed-permutation coordinate is unexpectedly absent");
    }
    to[source] = target;
    sign[source] = innerSign * outerSign;
  }
  return { to, sign };
}

function invertSignedPermutation(permutation: SignedPermutation): SignedPermutation {
  assertSignedPermutation(permutation, "permutation to invert");
  const to = new Int32Array(permutation.to.length);
  const sign = new Int8Array(permutation.to.length);
  for (let source = 0; source < permutation.to.length; source += 1) {
    const target = permutation.to[source];
    const coefficient = permutation.sign[source];
    if (target === undefined || coefficient === undefined) {
      throw new Error("signed-permutation coordinate is unexpectedly absent");
    }
    to[target] = source;
    sign[target] = coefficient;
  }
  return { to, sign };
}

function modularInverse(value: number, prime: number): number {
  let oldR = ((value % prime) + prime) % prime;
  let r = prime;
  let oldS = 1;
  let s = 0;
  while (r !== 0) {
    const quotient = Math.floor(oldR / r);
    [oldR, r] = [r, oldR - quotient * r];
    [oldS, s] = [s, oldS - quotient * s];
  }
  if (oldR !== 1) throw new Error(`${value} is not invertible modulo ${prime}`);
  return ((oldS % prime) + prime) % prime;
}

export function sparseMatrixRank(
  targetDimension: number,
  sourceDimension: number,
  entries: readonly SparseMatrixEntry[],
  field: number,
): number {
  const rows = Array.from({ length: targetDimension }, () => new Int32Array(sourceDimension));
  for (const entry of entries) {
    if (entry.row < 0 || entry.row >= targetDimension || entry.column < 0 || entry.column >= sourceDimension) {
      throw new Error(`sparse matrix entry (${entry.row},${entry.column}) is outside the declared dimensions`);
    }
    const row = rows[entry.row];
    if (row === undefined) throw new Error("matrix row is unexpectedly absent");
    const encoded = entry.value === 1 ? 1 : field - 1;
    row[entry.column] = ((row[entry.column] ?? 0) + encoded) % field;
  }

  let rank = 0;
  for (let column = 0; column < sourceDimension && rank < targetDimension; column += 1) {
    let pivot = rank;
    while (pivot < targetDimension && (rows[pivot]?.[column] ?? 0) === 0) pivot += 1;
    if (pivot === targetDimension) continue;
    [rows[rank], rows[pivot]] = [rows[pivot] ?? new Int32Array(sourceDimension), rows[rank] ?? new Int32Array(sourceDimension)];
    const pivotRow = rows[rank];
    if (pivotRow === undefined) throw new Error("pivot row is unexpectedly absent");
    const inverse = modularInverse(pivotRow[column] ?? 0, field);
    for (let cursor = column; cursor < sourceDimension; cursor += 1) {
      pivotRow[cursor] = ((pivotRow[cursor] ?? 0) * inverse) % field;
    }
    for (let rowIndex = 0; rowIndex < targetDimension; rowIndex += 1) {
      if (rowIndex === rank) continue;
      const row = rows[rowIndex];
      if (row === undefined) throw new Error("elimination row is unexpectedly absent");
      const factor = row[column] ?? 0;
      if (factor === 0) continue;
      for (let cursor = column; cursor < sourceDimension; cursor += 1) {
        const reduced = ((row[cursor] ?? 0) - factor * (pivotRow[cursor] ?? 0)) % field;
        row[cursor] = reduced < 0 ? reduced + field : reduced;
      }
    }
    rank += 1;
  }
  return rank;
}

function incrementSpectrum(spectrum: Map<number, number>, value: number): void {
  spectrum.set(value, (spectrum.get(value) ?? 0) + 1);
}

function freezeSpectrum(spectrum: ReadonlyMap<number, number>): Readonly<Record<string, number>> {
  return Object.freeze(
    Object.fromEntries([...spectrum.entries()].sort(([left], [right]) => left - right).map(([key, count]) => [String(key), count])),
  );
}

/** Solve `T A_i = B_i T` exactly for signed-permutation actions. */
export function solveSignedPermutationIntertwiners(
  sourceGenerators: readonly SignedPermutation[],
  targetGenerators: readonly SignedPermutation[],
  field: number,
): SignedIntertwinerSolution {
  if (sourceGenerators.length === 0 || sourceGenerators.length !== targetGenerators.length) {
    throw new Error("source and target must have the same non-zero generator count");
  }
  const firstSource = sourceGenerators[0];
  const firstTarget = targetGenerators[0];
  if (firstSource === undefined || firstTarget === undefined) throw new Error("first generator is unexpectedly absent");
  const sourceDimension = firstSource.to.length;
  const targetDimension = firstTarget.to.length;
  for (let index = 0; index < sourceGenerators.length; index += 1) {
    const source = sourceGenerators[index];
    const target = targetGenerators[index];
    if (source === undefined || target === undefined) throw new Error(`generator ${index} is unexpectedly absent`);
    if (source.to.length !== sourceDimension || target.to.length !== targetDimension) {
      throw new Error("generator dimensions are not constant");
    }
    assertSignedPermutation(source, `source generator ${index}`);
    assertSignedPermutation(target, `target generator ${index}`);
  }

  const variableCount = sourceDimension * targetDimension;
  const adjacency: ConstraintEdge[][] = Array.from({ length: variableCount }, () => []);
  for (let generatorIndex = 0; generatorIndex < sourceGenerators.length; generatorIndex += 1) {
    const source = sourceGenerators[generatorIndex];
    const target = targetGenerators[generatorIndex];
    if (source === undefined || target === undefined) throw new Error(`generator ${generatorIndex} is unexpectedly absent`);
    for (let row = 0; row < targetDimension; row += 1) {
      const mappedRow = target.to[row];
      const targetSign = target.sign[row];
      if (mappedRow === undefined || targetSign === undefined) throw new Error("target coordinate is unexpectedly absent");
      for (let column = 0; column < sourceDimension; column += 1) {
        const mappedColumn = source.to[column];
        const sourceSign = source.sign[column];
        if (mappedColumn === undefined || sourceSign === undefined) throw new Error("source coordinate is unexpectedly absent");
        const from = row * sourceDimension + column;
        const to = mappedRow * sourceDimension + mappedColumn;
        const factor = (sourceSign * targetSign) as 1 | -1;
        adjacency[from]?.push({ neighbour: to, factor });
        adjacency[to]?.push({ neighbour: from, factor });
      }
    }
  }

  const assignments = new Int8Array(variableCount);
  const componentSizeSpectrum = new Map<number, number>();
  const basisRankSpectrum = new Map<number, number>();
  const basisMaps: IntertwinerBasisMap[] = [];
  let inconsistentComponentCount = 0;
  let componentIndex = 0;

  for (let root = 0; root < variableCount; root += 1) {
    if (assignments[root] !== 0) continue;
    assignments[root] = 1;
    const queue = [root];
    const variables: number[] = [];
    let consistent = true;
    for (let cursor = 0; cursor < queue.length; cursor += 1) {
      const current = queue[cursor];
      if (current === undefined) throw new Error("constraint queue entry is unexpectedly absent");
      variables.push(current);
      const currentValue = assignments[current];
      if (currentValue !== 1 && currentValue !== -1) throw new Error("constraint assignment is not a sign");
      for (const edge of adjacency[current] ?? []) {
        const expected = currentValue * edge.factor;
        const prior = assignments[edge.neighbour];
        if (prior === 0) {
          assignments[edge.neighbour] = expected;
          queue.push(edge.neighbour);
        } else if (prior !== expected) {
          consistent = false;
        }
      }
    }
    incrementSpectrum(componentSizeSpectrum, variables.length);
    if (!consistent) {
      inconsistentComponentCount += 1;
      componentIndex += 1;
      continue;
    }

    const entries: SparseMatrixEntry[] = variables.map((variable) => {
      const value = assignments[variable];
      if (value !== 1 && value !== -1) throw new Error("component assignment is not a sign");
      return {
        row: Math.floor(variable / sourceDimension),
        column: variable % sourceDimension,
        value,
      };
    });
    const rank = sparseMatrixRank(targetDimension, sourceDimension, entries, field);
    incrementSpectrum(basisRankSpectrum, rank);
    basisMaps.push({ componentIndex, componentSize: variables.length, rank, entries });
    componentIndex += 1;
  }

  const unitCombination = basisMaps.flatMap((basis) => basis.entries);

  return {
    field,
    sourceDimension,
    targetDimension,
    generatorCount: sourceGenerators.length,
    variableCount,
    consistentComponentCount: basisMaps.length,
    inconsistentComponentCount,
    nullity: basisMaps.length,
    componentSizeSpectrum: freezeSpectrum(componentSizeSpectrum),
    basisRankSpectrum: freezeSpectrum(basisRankSpectrum),
    maximalBasisRank: basisMaps.reduce((maximum, basis) => Math.max(maximum, basis.rank), 0),
    unitCombinationRank: sparseMatrixRank(
      targetDimension,
      sourceDimension,
      unitCombination,
      field,
    ),
    allBasisMapsIntertwine: basisMaps.every((basis) =>
      verifySparseIntertwiner(sourceGenerators, targetGenerators, basis.entries, field),
    ),
    unitCombinationIntertwines: verifySparseIntertwiner(sourceGenerators, targetGenerators, unitCombination, field),
    basisMaps,
  };
}

export function verifySparseIntertwiner(
  sourceGenerators: readonly SignedPermutation[],
  targetGenerators: readonly SignedPermutation[],
  entries: readonly SparseMatrixEntry[],
  field: number,
): boolean {
  if (sourceGenerators.length === 0 || sourceGenerators.length !== targetGenerators.length) return false;
  const sourceDimension = sourceGenerators[0]?.to.length ?? 0;
  const targetDimension = targetGenerators[0]?.to.length ?? 0;
  const values = new Int32Array(sourceDimension * targetDimension);
  for (const entry of entries) {
    const encoded = entry.value === 1 ? 1 : field - 1;
    const index = entry.row * sourceDimension + entry.column;
    values[index] = ((values[index] ?? 0) + encoded) % field;
  }
  for (let generatorIndex = 0; generatorIndex < sourceGenerators.length; generatorIndex += 1) {
    const source = sourceGenerators[generatorIndex];
    const target = targetGenerators[generatorIndex];
    if (source === undefined || target === undefined) return false;
    for (let row = 0; row < targetDimension; row += 1) {
      const mappedRow = target.to[row];
      const targetSign = target.sign[row];
      if (mappedRow === undefined || targetSign === undefined) return false;
      for (let column = 0; column < sourceDimension; column += 1) {
        const mappedColumn = source.to[column];
        const sourceSign = source.sign[column];
        if (mappedColumn === undefined || sourceSign === undefined) return false;
        const left = (sourceSign * (values[mappedRow * sourceDimension + mappedColumn] ?? 0)) % field;
        const right = (targetSign * (values[row * sourceDimension + column] ?? 0)) % field;
        if ((left - right + field) % field !== 0) return false;
      }
    }
  }
  return true;
}

function evenOccupationMasks(): readonly number[] {
  const masks: number[] = [];
  for (let mask = 0; mask < 256; mask += 1) {
    let count = 0;
    for (let cursor = mask; cursor !== 0; cursor >>>= 1) count += cursor & 1;
    if (count % 2 === 0) masks.push(mask);
  }
  return masks;
}

function sourceEvenAction(repSeed: number): { readonly adinkra: CodedAdinkra; readonly generators: readonly SignedPermutation[] } {
  const adinkra = buildCodedAdinkra(8, [...EXT_HAMMING_8_4_4_MASKS], -1, repSeed);
  const anchor = adinkra.L[0];
  if (anchor === undefined || adinkra.reps.length !== 16) throw new Error("declared coded-Adinkra source is unavailable");
  const generators: SignedPermutation[] = [];
  for (let colour = 1; colour < 8; colour += 1) {
    const edge = adinkra.L[colour];
    if (edge === undefined) throw new Error(`source colour ${colour} is unavailable`);
    generators.push(composeSignedPermutation(edge, anchor));
  }
  return { adinkra, generators };
}

function targetEvenAction(options: IntertwinerCensusOptions): readonly SignedPermutation[] {
  const masks = evenOccupationMasks();
  if (masks.length !== 128) throw new Error("positive-chirality carrier does not have dimension 128");
  const indexByMask = new Int32Array(256).fill(-1);
  masks.forEach((mask, index) => {
    indexByMask[mask] = index;
  });
  const generators: SignedPermutation[] = [];
  for (let colour = 1; colour < 8; colour += 1) {
    const to = new Int32Array(masks.length);
    const sign = new Int8Array(masks.length);
    for (let source = 0; source < masks.length; source += 1) {
      const mask = masks[source];
      if (mask === undefined) throw new Error("target occupation mask is unexpectedly absent");
      const targetOptions = options.omitTargetJordanWignerParity === undefined
        ? {}
        : { omitJordanWignerParity: options.omitTargetJordanWignerParity };
      const term = bivectorAction(2 * colour, 0, mask, targetOptions);
      if (term.coefficient.im !== 0 || (term.coefficient.re !== 1 && term.coefficient.re !== -1)) {
        throw new Error("declared target generator is not a real signed permutation");
      }
      const target = indexByMask[term.target];
      if (target === undefined || target < 0) throw new Error("target generator left positive chirality");
      to[source] = target;
      sign[source] = term.coefficient.re;
    }
    generators.push({ to, sign });
  }

  const flip = options.flipTargetCoordinate;
  if (flip !== undefined) {
    const [generatorIndex, basisIndex] = flip;
    const generator = generators[generatorIndex];
    if (generator === undefined || basisIndex < 0 || basisIndex >= generator.sign.length) {
      throw new Error("target coordinate mutation is outside the declared action");
    }
    const sign = Int8Array.from(generator.sign);
    sign[basisIndex] = -(sign[basisIndex] ?? 0);
    generators[generatorIndex] = { to: Int32Array.from(generator.to), sign };
  }

  const duplicate = options.duplicateTargetGenerator;
  if (duplicate !== undefined) {
    const [destination, source] = duplicate;
    const replacement = generators[source];
    if (replacement === undefined || destination < 0 || destination >= generators.length) {
      throw new Error("target duplicate-generator mutation is outside the declared action");
    }
    generators[destination] = { to: Int32Array.from(replacement.to), sign: Int8Array.from(replacement.sign) };
  }
  return generators;
}

/** Frozen source action used by the measured intertwiner and its follow-on decomposition. */
export function buildDeclaredAdinkraEvenAction(
  repSeed = 0,
): { readonly adinkra: CodedAdinkra; readonly generators: readonly SignedPermutation[] } {
  return sourceEvenAction(repSeed);
}

/** Frozen target action used by the measured intertwiner and its follow-on decomposition. */
export function buildDeclaredHalfSpinEvenAction(
  options: IntertwinerCensusOptions = {},
): readonly SignedPermutation[] {
  return targetEvenAction(options);
}

function countCliffordSevenViolations(generators: readonly SignedPermutation[]): number {
  let violations = 0;
  for (let first = 0; first < generators.length; first += 1) {
    const left = generators[first];
    if (left === undefined) throw new Error(`generator ${first} is unexpectedly absent`);
    for (let second = first; second < generators.length; second += 1) {
      const right = generators[second];
      if (right === undefined) throw new Error(`generator ${second} is unexpectedly absent`);
      const forward = composeSignedPermutation(left, right);
      const backward = composeSignedPermutation(right, left);
      for (let basis = 0; basis < left.to.length; basis += 1) {
        if (first === second) {
          if (forward.to[basis] !== basis || forward.sign[basis] !== -1) violations += 1;
        } else if (forward.to[basis] !== backward.to[basis] || (forward.sign[basis] ?? 0) !== -(backward.sign[basis] ?? 0)) {
          violations += 1;
        }
      }
    }
  }
  return violations;
}

function identityEntries(dimension: number): readonly SparseMatrixEntry[] {
  return Array.from({ length: dimension }, (_, index) => ({ row: index, column: index, value: 1 as const }));
}

function declaredSourceConjugation(dimension: number): SignedPermutation {
  const to = new Int32Array(dimension);
  const sign = new Int8Array(dimension);
  for (let source = 0; source < dimension; source += 1) {
    to[source] = (5 * source + 3) % dimension;
    sign[source] = source % 3 === 0 ? -1 : 1;
  }
  return { to, sign };
}

function signedPermutationEntries(permutation: SignedPermutation): readonly SparseMatrixEntry[] {
  return Array.from({ length: permutation.to.length }, (_, column) => {
    const row = permutation.to[column];
    const value = permutation.sign[column];
    if (row === undefined || (value !== 1 && value !== -1)) throw new Error("signed permutation coordinate is absent");
    return { row, column, value };
  });
}

export function measureIntertwinerCalibrations(field: (typeof PRIMES)[number] = PRIMES[0]): IntertwinerCalibrationCensus {
  const source = sourceEvenAction(0).generators;
  const target = targetEvenAction({});
  const sourceIdentity = identityEntries(16);
  const targetIdentity = identityEntries(128);
  const conjugation = declaredSourceConjugation(16);
  const conjugationInverse = invertSignedPermutation(conjugation);
  const conjugated = source.map((generator) =>
    composeSignedPermutation(composeSignedPermutation(conjugation, generator), conjugationInverse),
  );
  const conjugationEntries = signedPermutationEntries(conjugation);
  return {
    field,
    sourceIdentityIntertwines: verifySparseIntertwiner(source, source, sourceIdentity, field),
    sourceIdentityRank: sparseMatrixRank(16, 16, sourceIdentity, field),
    targetIdentityIntertwines: verifySparseIntertwiner(target, target, targetIdentity, field),
    targetIdentityRank: sparseMatrixRank(128, 128, targetIdentity, field),
    sourceConjugacyIntertwines: verifySparseIntertwiner(source, conjugated, conjugationEntries, field),
    sourceConjugacyRank: sparseMatrixRank(16, 16, conjugationEntries, field),
    sourceConjugacySolution: solveSignedPermutationIntertwiners(source, conjugated, field),
  };
}

export function measureFiniteAdinkraHalfSpinIntertwiner(
  options: IntertwinerCensusOptions = {},
): FiniteAdinkraHalfSpinIntertwinerCensus {
  const field = options.field ?? PRIMES[0];
  const repSeed = options.repSeed ?? 0;
  const source = sourceEvenAction(repSeed);
  const target = targetEvenAction(options);
  return {
    sourceDimension: 16,
    targetDimension: 128,
    generatorCount: 7,
    field,
    repSeed,
    sourceCliffordViolations: cliffordRelationsHold(source.adinkra, -1) ? countCliffordSevenViolations(source.generators) : 1,
    targetCliffordViolations: countCliffordSevenViolations(target),
    solution: solveSignedPermutationIntertwiners(source.generators, target, field),
    regularity: {
      status: "unmeasured",
      missingWitnesses: [
        "regular-module carrier and rank-one action witness",
        "representation-independent source/target equivalence theorem",
        "physical interpretation outside the declared finite algebra",
      ],
    },
  };
}
