/**
 * Dark Matter Observatory algebra lane: exact central-sector and Hom-space decomposition of the
 * already measured coded-Adinkra / half-spin intertwiner. Finite witnesses only; no preferred
 * physical basis, regularity scalar, or identity interpretation is introduced here.
 */

import {
  buildDeclaredAdinkraEvenAction,
  buildDeclaredHalfSpinEvenAction,
  composeSignedPermutation,
  solveSignedPermutationIntertwiners,
  type SignedIntertwinerSolution,
  type SignedPermutation,
  type SparseMatrixEntry,
} from "./nonquotient-adinkra-halfspin-intertwiner";
import { PRIMES } from "./regular-representation-defect";

export type CentralSign = "+" | "-";
export type HomBlockKey = "+→+" | "+→-" | "-→+" | "-→-";

export interface CentralWordCensus {
  readonly dimension: number;
  readonly centralityViolations: number;
  readonly involutionViolations: number;
  readonly projectorLawViolations: number;
  readonly sectorPreservationViolations: number;
  readonly plusRank: number;
  readonly minusRank: number;
  readonly word: SignedPermutation;
}

export interface HomBlockCensus {
  readonly dimensions: Readonly<Record<HomBlockKey, number>>;
  readonly basisRankSpectra: Readonly<Record<HomBlockKey, Readonly<Record<string, number>>>>;
}

export interface FiniteIntertwinerDecompositionCensus {
  readonly field: number;
  readonly repSeed: number;
  readonly source: CentralWordCensus;
  readonly target: CentralWordCensus;
  readonly hom: SignedIntertwinerSolution;
  readonly homBlocks: HomBlockCensus;
  readonly sourceCommutant: SignedIntertwinerSolution;
  readonly sourceCommutantBlocks: HomBlockCensus;
  readonly targetCommutant: SignedIntertwinerSolution;
  readonly targetCommutantBlocks: HomBlockCensus;
  readonly sourceGeneratedAlgebraRanks: Readonly<Record<CentralSign, number>>;
  readonly targetGeneratedAlgebraRanks: Readonly<Record<CentralSign, number>>;
  readonly finiteConclusion: {
    readonly sourceSectorSimplicityWitness: boolean;
    readonly sourceSectorsInequivalent: boolean;
    readonly targetMultiplicityDimensions: Readonly<Record<CentralSign, number>>;
    readonly targetCommutantDimensionMatchesMultiplicityPattern: boolean;
  };
  readonly regularity: {
    readonly status: "unmeasured";
  };
}

export interface ModularEntry {
  readonly row: number;
  readonly column: number;
  readonly value: number;
}

export interface CentralSectorActions {
  readonly census: CentralWordCensus;
  readonly plus: readonly SignedPermutation[];
  readonly minus: readonly SignedPermutation[];
}

export interface DeclaredIntertwinerCentralSectorActions {
  readonly source: CentralSectorActions;
  readonly target: CentralSectorActions;
}

function identitySignedPermutation(dimension: number): SignedPermutation {
  const to = new Int32Array(dimension);
  const sign = new Int8Array(dimension).fill(1);
  for (let index = 0; index < dimension; index += 1) to[index] = index;
  return { to, sign };
}

function orderedWord(generators: readonly SignedPermutation[]): SignedPermutation {
  const first = generators[0];
  if (first === undefined) throw new Error("central word needs at least one generator");
  let product = identitySignedPermutation(first.to.length);
  for (const generator of generators) product = composeSignedPermutation(product, generator);
  return product;
}

function permutationDifferenceCount(left: SignedPermutation, right: SignedPermutation): number {
  if (left.to.length !== right.to.length) throw new Error("cannot compare different signed-permutation dimensions");
  let violations = 0;
  for (let index = 0; index < left.to.length; index += 1) {
    if (left.to[index] !== right.to[index] || left.sign[index] !== right.sign[index]) violations += 1;
  }
  return violations;
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
  if (oldR !== 1) throw new Error(`${String(value)} is not invertible modulo ${String(prime)}`);
  return ((oldS % prime) + prime) % prime;
}

export function modularMatrixRank(rowCount: number, columnCount: number, entries: readonly ModularEntry[], field: number): number {
  const rows = Array.from({ length: rowCount }, () => new Float64Array(columnCount));
  for (const entry of entries) {
    const row = rows[entry.row];
    if (row === undefined || entry.column < 0 || entry.column >= columnCount) {
      throw new Error("modular-rank entry is outside its declared matrix");
    }
    const value = ((entry.value % field) + field) % field;
    row[entry.column] = ((row[entry.column] ?? 0) + value) % field;
  }

  let rank = 0;
  for (let column = 0; column < columnCount && rank < rowCount; column += 1) {
    let pivot = rank;
    while (pivot < rowCount && (rows[pivot]?.[column] ?? 0) === 0) pivot += 1;
    if (pivot === rowCount) continue;
    [rows[rank], rows[pivot]] = [rows[pivot] ?? new Float64Array(columnCount), rows[rank] ?? new Float64Array(columnCount)];
    const pivotRow = rows[rank];
    if (pivotRow === undefined) throw new Error("modular-rank pivot row is absent");
    const inverse = modularInverse(pivotRow[column] ?? 0, field);
    for (let cursor = column; cursor < columnCount; cursor += 1) {
      pivotRow[cursor] = ((pivotRow[cursor] ?? 0) * inverse) % field;
    }
    for (let rowIndex = 0; rowIndex < rowCount; rowIndex += 1) {
      if (rowIndex === rank) continue;
      const row = rows[rowIndex];
      if (row === undefined) throw new Error("modular-rank reduction row is absent");
      const factor = row[column] ?? 0;
      if (factor === 0) continue;
      for (let cursor = column; cursor < columnCount; cursor += 1) {
        const reduced = ((row[cursor] ?? 0) - factor * (pivotRow[cursor] ?? 0)) % field;
        row[cursor] = reduced < 0 ? reduced + field : reduced;
      }
    }
    rank += 1;
  }
  return rank;
}

function signedPermutationMatrix(permutation: SignedPermutation, field: number): Float64Array {
  const dimension = permutation.to.length;
  const matrix = new Float64Array(dimension * dimension);
  for (let column = 0; column < dimension; column += 1) {
    const row = permutation.to[column];
    const sign = permutation.sign[column];
    if (row === undefined || (sign !== 1 && sign !== -1)) throw new Error("signed-permutation entry is absent");
    matrix[row * dimension + column] = sign === 1 ? 1 : field - 1;
  }
  return matrix;
}

function projectorMatrix(word: SignedPermutation, sector: CentralSign, field: number): Float64Array {
  const dimension = word.to.length;
  const omega = signedPermutationMatrix(word, field);
  const inverseTwo = modularInverse(2, field);
  const matrix = new Float64Array(dimension * dimension);
  const omegaFactor = sector === "+" ? 1 : field - 1;
  for (let row = 0; row < dimension; row += 1) {
    for (let column = 0; column < dimension; column += 1) {
      const identity = row === column ? 1 : 0;
      const numerator = (identity + omegaFactor * (omega[row * dimension + column] ?? 0)) % field;
      matrix[row * dimension + column] = (numerator * inverseTwo) % field;
    }
  }
  return matrix;
}

function multiplyMatrices(left: Float64Array, right: Float64Array, dimension: number, field: number): Float64Array {
  const product = new Float64Array(dimension * dimension);
  for (let row = 0; row < dimension; row += 1) {
    for (let middle = 0; middle < dimension; middle += 1) {
      const leftValue = left[row * dimension + middle] ?? 0;
      if (leftValue === 0) continue;
      for (let column = 0; column < dimension; column += 1) {
        const index = row * dimension + column;
        product[index] = ((product[index] ?? 0) + leftValue * (right[middle * dimension + column] ?? 0)) % field;
      }
    }
  }
  return product;
}

function matrixDifferenceCount(left: Float64Array, right: Float64Array, field: number): number {
  if (left.length !== right.length) throw new Error("cannot compare matrix arrays of different lengths");
  let violations = 0;
  for (let index = 0; index < left.length; index += 1) {
    if (((((left[index] ?? 0) - (right[index] ?? 0)) % field) + field) % field !== 0) violations += 1;
  }
  return violations;
}

function matrixEntries(matrix: Float64Array, dimension: number): readonly ModularEntry[] {
  const entries: ModularEntry[] = [];
  for (let row = 0; row < dimension; row += 1) {
    for (let column = 0; column < dimension; column += 1) {
      const value = matrix[row * dimension + column] ?? 0;
      if (value !== 0) entries.push({ row, column, value });
    }
  }
  return entries;
}

function countProjectorLawViolations(word: SignedPermutation, field: number): { readonly violations: number; readonly plusRank: number; readonly minusRank: number } {
  const dimension = word.to.length;
  const plus = projectorMatrix(word, "+", field);
  const minus = projectorMatrix(word, "-", field);
  const plusSquare = multiplyMatrices(plus, plus, dimension, field);
  const minusSquare = multiplyMatrices(minus, minus, dimension, field);
  const cross = multiplyMatrices(plus, minus, dimension, field);
  const sum = new Float64Array(dimension * dimension);
  const identity = new Float64Array(dimension * dimension);
  for (let row = 0; row < dimension; row += 1) {
    for (let column = 0; column < dimension; column += 1) {
      const index = row * dimension + column;
      sum[index] = ((plus[index] ?? 0) + (minus[index] ?? 0)) % field;
      identity[index] = row === column ? 1 : 0;
    }
  }
  return {
    violations:
      matrixDifferenceCount(plusSquare, plus, field) +
      matrixDifferenceCount(minusSquare, minus, field) +
      matrixDifferenceCount(cross, new Float64Array(dimension * dimension), field) +
      matrixDifferenceCount(sum, identity, field),
    plusRank: modularMatrixRank(dimension, dimension, matrixEntries(plus, dimension), field),
    minusRank: modularMatrixRank(dimension, dimension, matrixEntries(minus, dimension), field),
  };
}

function buildSectorBasis(word: SignedPermutation, sector: CentralSign): readonly Int8Array[] {
  const expected = sector === "+" ? 1 : -1;
  const visited = new Uint8Array(word.to.length);
  const basis: Int8Array[] = [];
  for (let root = 0; root < word.to.length; root += 1) {
    if (visited[root] !== 0) continue;
    const target = word.to[root];
    const sign = word.sign[root];
    if (target === undefined || (sign !== 1 && sign !== -1)) throw new Error("central-word coordinate is absent");
    const vector = new Int8Array(word.to.length);
    if (target === root) {
      visited[root] = 1;
      if (sign === expected) {
        vector[root] = 1;
        basis.push(vector);
      }
      continue;
    }
    const reverseTarget = word.to[target];
    const reverseSign = word.sign[target];
    if (reverseTarget !== root || reverseSign !== sign) throw new Error("central word is not a signed involution on a two-cycle");
    visited[root] = 1;
    visited[target] = 1;
    const first = Math.min(root, target);
    const second = Math.max(root, target);
    const firstSign = word.sign[first];
    if (firstSign !== 1 && firstSign !== -1) throw new Error("central two-cycle sign is absent");
    vector[first] = 1;
    vector[second] = expected * firstSign;
    basis.push(vector);
  }
  return basis;
}

function vectorKey(vector: Int8Array): string {
  return Array.from(vector).join(",");
}

function restrictGenerators(
  generators: readonly SignedPermutation[],
  sectorBasis: readonly Int8Array[],
): readonly SignedPermutation[] {
  const byVector = new Map<string, number>();
  sectorBasis.forEach((vector, index) => byVector.set(vectorKey(vector), index));
  return generators.map((generator) => {
    const to = new Int32Array(sectorBasis.length);
    const sign = new Int8Array(sectorBasis.length);
    sectorBasis.forEach((vector, source) => {
      const image = new Int8Array(generator.to.length);
      for (let basis = 0; basis < vector.length; basis += 1) {
        const value = vector[basis] ?? 0;
        if (value === 0) continue;
        const target = generator.to[basis];
        const coefficient = generator.sign[basis];
        if (target === undefined || coefficient === undefined) throw new Error("generator coordinate is absent");
        image[target] = value * coefficient;
      }
      const firstNonzero = image.find((value) => value !== 0);
      if (firstNonzero !== 1 && firstNonzero !== -1) throw new Error("restricted image has no sign normalization");
      const normalized = Int8Array.from(image, (value) => value * firstNonzero);
      const targetIndex = byVector.get(vectorKey(normalized));
      if (targetIndex === undefined) throw new Error("generator does not preserve the measured central sector");
      to[source] = targetIndex;
      sign[source] = firstNonzero;
    });
    return { to, sign };
  });
}

function measureCentralAction(generators: readonly SignedPermutation[], field: number): CentralSectorActions {
  if (field === 2) throw new Error("central projectors require odd characteristic");
  const first = generators[0];
  if (first === undefined) throw new Error("central word needs at least one generator");
  const dimension = first.to.length;
  const word = orderedWord(generators);
  const square = composeSignedPermutation(word, word);
  const identity = identitySignedPermutation(dimension);
  let centralityViolations = 0;
  for (const generator of generators) {
    centralityViolations += permutationDifferenceCount(
      composeSignedPermutation(word, generator),
      composeSignedPermutation(generator, word),
    );
  }
  const projector = countProjectorLawViolations(word, field);
  const plusBasis = buildSectorBasis(word, "+");
  const minusBasis = buildSectorBasis(word, "-");
  const plus = restrictGenerators(generators, plusBasis);
  const minus = restrictGenerators(generators, minusBasis);
  let sectorPreservationViolations = 0;
  for (const generator of generators) {
    sectorPreservationViolations += permutationDifferenceCount(
      composeSignedPermutation(word, generator),
      composeSignedPermutation(generator, word),
    );
  }
  return {
    census: {
      dimension,
      centralityViolations,
      involutionViolations: permutationDifferenceCount(square, identity),
      projectorLawViolations: projector.violations,
      sectorPreservationViolations,
      plusRank: projector.plusRank,
      minusRank: projector.minusRank,
      word,
    },
    plus,
    minus,
  };
}

function blockSolution(
  source: CentralSectorActions,
  target: CentralSectorActions,
  sourceSign: CentralSign,
  targetSign: CentralSign,
  field: number,
): SignedIntertwinerSolution {
  return solveSignedPermutationIntertwiners(source[sourceSign === "+" ? "plus" : "minus"], target[targetSign === "+" ? "plus" : "minus"], field);
}

function measureHomBlocks(source: CentralSectorActions, target: CentralSectorActions, field: number): HomBlockCensus {
  const plusPlus = blockSolution(source, target, "+", "+", field);
  const plusMinus = blockSolution(source, target, "+", "-", field);
  const minusPlus = blockSolution(source, target, "-", "+", field);
  const minusMinus = blockSolution(source, target, "-", "-", field);
  return {
    dimensions: Object.freeze({
      "+→+": plusPlus.nullity,
      "+→-": plusMinus.nullity,
      "-→+": minusPlus.nullity,
      "-→-": minusMinus.nullity,
    }),
    basisRankSpectra: Object.freeze({
      "+→+": plusPlus.basisRankSpectrum,
      "+→-": plusMinus.basisRankSpectrum,
      "-→+": minusPlus.basisRankSpectrum,
      "-→-": minusMinus.basisRankSpectrum,
    }),
  };
}

function allOrderedMonomials(generators: readonly SignedPermutation[]): readonly SignedPermutation[] {
  const first = generators[0];
  if (first === undefined) throw new Error("monomial span needs at least one generator");
  let words: SignedPermutation[] = [identitySignedPermutation(first.to.length)];
  for (const generator of generators) words = [...words, ...words.map((word) => composeSignedPermutation(word, generator))];
  return words;
}

function generatedAlgebraRank(generators: readonly SignedPermutation[], field: number): number {
  const first = generators[0];
  if (first === undefined) throw new Error("generated algebra needs at least one generator");
  const dimension = first.to.length;
  const entries: SparseMatrixEntry[] = [];
  allOrderedMonomials(generators).forEach((word, wordIndex) => {
    for (let column = 0; column < dimension; column += 1) {
      const row = word.to[column];
      const value = word.sign[column];
      if (row === undefined || (value !== 1 && value !== -1)) throw new Error("monomial coordinate is absent");
      entries.push({ row: wordIndex, column: row * dimension + column, value });
    }
  });
  return modularMatrixRank(2 ** generators.length, dimension * dimension, entries, field);
}

export function measureFiniteIntertwinerDecomposition(
  field: (typeof PRIMES)[number] = PRIMES[0],
  repSeed = 0,
): FiniteIntertwinerDecompositionCensus {
  const sourceGenerators = buildDeclaredAdinkraEvenAction(repSeed).generators;
  const targetGenerators = buildDeclaredHalfSpinEvenAction();
  const sourceAction = measureCentralAction(sourceGenerators, field);
  const targetAction = measureCentralAction(targetGenerators, field);
  const hom = solveSignedPermutationIntertwiners(sourceGenerators, targetGenerators, field);
  const sourceCommutant = solveSignedPermutationIntertwiners(sourceGenerators, sourceGenerators, field);
  const targetCommutant = solveSignedPermutationIntertwiners(targetGenerators, targetGenerators, field);
  const homBlocks = measureHomBlocks(sourceAction, targetAction, field);
  const sourceCommutantBlocks = measureHomBlocks(sourceAction, sourceAction, field);
  const targetCommutantBlocks = measureHomBlocks(targetAction, targetAction, field);
  const sourceGeneratedAlgebraRanks = Object.freeze({
    "+": generatedAlgebraRank(sourceAction.plus, field),
    "-": generatedAlgebraRank(sourceAction.minus, field),
  });
  const targetGeneratedAlgebraRanks = Object.freeze({
    "+": generatedAlgebraRank(targetAction.plus, field),
    "-": generatedAlgebraRank(targetAction.minus, field),
  });
  const plusMultiplicity = homBlocks.dimensions["+→+"];
  const minusMultiplicity = homBlocks.dimensions["-→-"];

  return {
    field,
    repSeed,
    source: sourceAction.census,
    target: targetAction.census,
    hom,
    homBlocks,
    sourceCommutant,
    sourceCommutantBlocks,
    targetCommutant,
    targetCommutantBlocks,
    sourceGeneratedAlgebraRanks,
    targetGeneratedAlgebraRanks,
    finiteConclusion: {
      sourceSectorSimplicityWitness:
        sourceAction.census.plusRank === 8 &&
        sourceAction.census.minusRank === 8 &&
        sourceGeneratedAlgebraRanks["+"] === 64 &&
        sourceGeneratedAlgebraRanks["-"] === 64 &&
        sourceCommutantBlocks.dimensions["+→+"] === 1 &&
        sourceCommutantBlocks.dimensions["-→-"] === 1,
      sourceSectorsInequivalent:
        sourceCommutantBlocks.dimensions["+→-"] === 0 && sourceCommutantBlocks.dimensions["-→+"] === 0,
      targetMultiplicityDimensions: Object.freeze({ "+": plusMultiplicity, "-": minusMultiplicity }),
      targetCommutantDimensionMatchesMultiplicityPattern:
        targetCommutant.nullity === plusMultiplicity * plusMultiplicity + minusMultiplicity * minusMultiplicity,
    },
    regularity: { status: "unmeasured" },
  };
}

/** Exact restricted actions used by follow-on module and lattice witnesses. */
export function buildDeclaredIntertwinerCentralSectorActions(
  field: (typeof PRIMES)[number] = PRIMES[0],
  repSeed = 0,
): DeclaredIntertwinerCentralSectorActions {
  return {
    source: measureCentralAction(buildDeclaredAdinkraEvenAction(repSeed).generators, field),
    target: measureCentralAction(buildDeclaredHalfSpinEvenAction(), field),
  };
}
