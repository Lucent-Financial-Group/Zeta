/**
 * Dark Matter Observatory algebra lane: exact units of the finite half-spin target commutant.
 * This is a finite module-automorphism census, not a physical gauge-group claim.
 */

import {
  solveSignedPermutationIntertwiners,
  type IntertwinerBasisMap,
  type SignedPermutation,
} from "./nonquotient-adinkra-halfspin-intertwiner";
import {
  buildDeclaredIntertwinerCentralSectorActions,
  modularMatrixRank,
  type CentralSign,
  type ModularEntry,
} from "./nonquotient-adinkra-halfspin-decomposition";
import { PRIMES } from "./regular-representation-defect";

interface MatrixCoordinate {
  readonly row: number;
  readonly column: number;
}

interface MatrixUnitLift extends MatrixCoordinate {
  readonly entries: readonly ModularEntry[];
}

export interface FiniteCommutantGroupCensus {
  readonly field: number;
  readonly repSeed: number;
  readonly sectorAlgebra: Readonly<Record<CentralSign, {
    readonly homDimension: number;
    readonly commutantDimension: number;
    readonly inducedMatrixUnitCount: number;
    readonly distinctMatrixUnitCount: number;
    readonly matrixUnitActionViolations: number;
    readonly identityLiftRank: number;
  }>>;
  readonly unitGroup: {
    readonly structure: "GL(8,F_p) × GL(8,F_p)";
    readonly perSectorOrder: string;
    readonly totalOrder: string;
    readonly nonzeroCoefficientOrbitSize: string;
    readonly perSectorNonzeroVectorStabilizerOrder: string;
    readonly fullEmbeddingPairOrbitCount: 1;
    readonly actionStatement: "transitive on pairs of nonzero sector coefficient vectors";
  };
  readonly controls: {
    readonly identity: { readonly rank: number; readonly commutatorViolations: number };
    readonly transvection: { readonly rank: number; readonly commutatorViolations: number; readonly changesCoefficient: boolean };
    readonly swap: { readonly rank: number; readonly commutatorViolations: number; readonly changesCoefficient: boolean };
    readonly singular: { readonly rank: number; readonly commutatorViolations: number; readonly acceptedAsGroupElement: false };
    readonly noncommuting: { readonly rank: number; readonly commutatorViolations: number; readonly acceptedAsCommutantElement: false };
  };
  readonly finiteConclusion: {
    readonly commutantAlgebra: "Mat(8,F_p) ⊕ Mat(8,F_p)" | "unresolved";
    readonly automorphismGroup: "GL(8,F_p) × GL(8,F_p)" | "unresolved";
    readonly canonicalEmbeddingOrbit: "single orbit under target-module automorphisms" | "unresolved";
    readonly physicalGaugeGroupClaim: "not made";
  };
  readonly regularity: { readonly status: "unmeasured" };
}

function normalize(value: number, field: number): number {
  const reduced = value % field;
  return reduced < 0 ? reduced + field : reduced;
}

function modularInverse(value: number, field: number): number {
  let oldR = normalize(value, field);
  let r = field;
  let oldS = 1;
  let s = 0;
  while (r !== 0) {
    const quotient = Math.floor(oldR / r);
    [oldR, r] = [r, oldR - quotient * r];
    [oldS, s] = [s, oldS - quotient * s];
  }
  if (oldR !== 1) throw new Error("matrix-unit coefficient is not invertible");
  return normalize(oldS, field);
}

function normalizeEntries(entries: readonly ModularEntry[], field: number): readonly ModularEntry[] {
  const values = new Map<string, number>();
  for (const entry of entries) {
    const key = `${String(entry.row)},${String(entry.column)}`;
    values.set(key, normalize((values.get(key) ?? 0) + entry.value, field));
  }
  return [...values.entries()]
    .filter(([, value]) => value !== 0)
    .map(([key, value]) => {
      const [rowText, columnText] = key.split(",");
      const row = Number(rowText);
      const column = Number(columnText);
      if (!Number.isInteger(row) || !Number.isInteger(column)) throw new Error("invalid modular matrix coordinate");
      return { row, column, value };
    })
    .sort((left, right) => left.row - right.row || left.column - right.column);
}

function addEntries(field: number, ...matrices: readonly (readonly ModularEntry[])[]): readonly ModularEntry[] {
  return normalizeEntries(matrices.flat(), field);
}

function scaleEntries(entries: readonly ModularEntry[], scalar: number, field: number): readonly ModularEntry[] {
  return normalizeEntries(entries.map((entry) => ({ ...entry, value: entry.value * scalar })), field);
}

function composeEntries(
  left: readonly ModularEntry[],
  right: readonly ModularEntry[],
  field: number,
): readonly ModularEntry[] {
  const leftByColumn = new Map<number, ModularEntry[]>();
  for (const entry of left) {
    const bucket = leftByColumn.get(entry.column) ?? [];
    bucket.push(entry);
    leftByColumn.set(entry.column, bucket);
  }
  const product: ModularEntry[] = [];
  for (const rightEntry of right) {
    for (const leftEntry of leftByColumn.get(rightEntry.row) ?? []) {
      product.push({
        row: leftEntry.row,
        column: rightEntry.column,
        value: leftEntry.value * rightEntry.value,
      });
    }
  }
  return normalizeEntries(product, field);
}

function entriesEqual(left: readonly ModularEntry[], right: readonly ModularEntry[], field: number): boolean {
  const difference = addEntries(field, left, scaleEntries(right, -1, field));
  return difference.length === 0;
}

function signedPermutationEntries(permutation: SignedPermutation): readonly ModularEntry[] {
  return Array.from({ length: permutation.to.length }, (_, column) => {
    const row = permutation.to[column];
    const value = permutation.sign[column];
    if (row === undefined || (value !== 1 && value !== -1)) throw new Error("signed-permutation coordinate is absent");
    return { row, column, value };
  });
}

function locateBasisCoordinate(
  product: readonly ModularEntry[],
  basisMaps: readonly IntertwinerBasisMap[],
  field: number,
): { readonly basisIndex: number; readonly coefficient: number } | null {
  const normalized = normalizeEntries(product, field);
  if (normalized.length === 0) return null;
  const first = normalized[0];
  if (first === undefined) return null;
  for (let basisIndex = 0; basisIndex < basisMaps.length; basisIndex += 1) {
    const basis = basisMaps[basisIndex];
    if (basis === undefined) throw new Error("Hom basis map is absent");
    const matching = basis.entries.find((entry) => entry.row === first.row && entry.column === first.column);
    if (matching === undefined) continue;
    const coefficient = normalize(first.value * modularInverse(matching.value, field), field);
    if (entriesEqual(normalized, scaleEntries(basis.entries, coefficient, field), field)) {
      return { basisIndex, coefficient };
    }
  }
  throw new Error("commutant action left the declared Hom basis span");
}

function invertSquareMatrix(matrix: readonly Float64Array[], field: number): readonly Float64Array[] {
  const dimension = matrix.length;
  if (dimension === 0 || matrix.some((row) => row.length !== dimension)) {
    throw new Error("commutant coordinate matrix must be nonempty and square");
  }
  const augmented = matrix.map((row, rowIndex) => {
    const output = new Float64Array(2 * dimension);
    output.set(row);
    output[dimension + rowIndex] = 1;
    return output;
  });
  for (let column = 0; column < dimension; column += 1) {
    let pivot = column;
    while (pivot < dimension && (augmented[pivot]?.[column] ?? 0) === 0) pivot += 1;
    if (pivot === dimension) throw new Error("induced commutant action basis is singular");
    [augmented[column], augmented[pivot]] = [
      augmented[pivot] ?? new Float64Array(2 * dimension),
      augmented[column] ?? new Float64Array(2 * dimension),
    ];
    const pivotRow = augmented[column];
    if (pivotRow === undefined) throw new Error("commutant inversion pivot row is absent");
    const inverse = modularInverse(pivotRow[column] ?? 0, field);
    for (let cursor = 0; cursor < 2 * dimension; cursor += 1) {
      pivotRow[cursor] = normalize((pivotRow[cursor] ?? 0) * inverse, field);
    }
    for (let rowIndex = 0; rowIndex < dimension; rowIndex += 1) {
      if (rowIndex === column) continue;
      const row = augmented[rowIndex];
      if (row === undefined) throw new Error("commutant inversion row is absent");
      const factor = row[column] ?? 0;
      if (factor === 0) continue;
      for (let cursor = 0; cursor < 2 * dimension; cursor += 1) {
        row[cursor] = normalize((row[cursor] ?? 0) - factor * (pivotRow[cursor] ?? 0), field);
      }
    }
  }
  return augmented.map((row) => row.slice(dimension));
}

function buildSectorMatrixUnits(
  homBasis: readonly IntertwinerBasisMap[],
  commutantBasis: readonly IntertwinerBasisMap[],
  field: number,
): { readonly units: ReadonlyMap<string, MatrixUnitLift>; readonly actionViolations: number } {
  const homIndices = homBasis.map((_, index) => index);
  const commutantIndices = commutantBasis.map((_, index) => index);
  const homLocalIndex = new Map(homIndices.map((index, local) => [index, local] as const));
  const units = new Map<string, MatrixUnitLift>();
  let actionViolations = 0;
  if (homIndices.length !== 8 || commutantIndices.length !== 64) {
    return { units, actionViolations: 1 };
  }
  const coordinateColumns: Float64Array[] = [];
  for (const commutantIndex of commutantIndices) {
    const commutant = commutantBasis[commutantIndex];
    if (commutant === undefined) throw new Error("target commutant basis map is absent");
    const induced: { readonly row: number; readonly column: number; readonly coefficient: number }[] = [];
    homIndices.forEach((homIndex, column) => {
      const hom = homBasis[homIndex];
      if (hom === undefined) throw new Error("Hom basis map is absent");
      const coordinate = locateBasisCoordinate(composeEntries(commutant.entries, hom.entries, field), homBasis, field);
      if (coordinate === null) return;
      const row = homLocalIndex.get(coordinate.basisIndex);
      if (row === undefined) {
        actionViolations += 1;
        return;
      }
      induced.push({ row, column, coefficient: coordinate.coefficient });
    });
    if (induced.length !== homIndices.length) {
      actionViolations += 1;
      continue;
    }
    const column = new Float64Array(64);
    for (const coordinate of induced) {
      column[coordinate.row * 8 + coordinate.column] = coordinate.coefficient;
    }
    coordinateColumns.push(column);
  }
  if (coordinateColumns.length !== 64) return { units, actionViolations: actionViolations + 1 };
  const coordinateMatrix = Array.from({ length: 64 }, (_, row) =>
    Float64Array.from(coordinateColumns, (column) => column[row] ?? 0)
  );
  const inverse = invertSquareMatrix(coordinateMatrix, field);
  for (let coordinateIndex = 0; coordinateIndex < 64; coordinateIndex += 1) {
    const coefficients = inverse.map((row) => row[coordinateIndex] ?? 0);
    const entries = addEntries(
      field,
      ...commutantBasis.map((basis, index) => scaleEntries(basis.entries, coefficients[index] ?? 0, field)),
    );
    const row = Math.floor(coordinateIndex / 8);
    const column = coordinateIndex % 8;
    homIndices.forEach((homIndex, localColumn) => {
      const hom = homBasis[homIndex];
      if (hom === undefined) throw new Error("Hom basis map is absent");
      const image = locateBasisCoordinate(composeEntries(entries, hom.entries, field), homBasis, field);
      if (localColumn === column) {
        if (image === null || image.basisIndex !== homIndices[row] || image.coefficient !== 1) actionViolations += 1;
      } else if (image !== null) {
        actionViolations += 1;
      }
    });
    units.set(`${String(row)},${String(column)}`, { row, column, entries });
  }
  return { units, actionViolations };
}

function requireUnit(units: ReadonlyMap<string, MatrixUnitLift>, row: number, column: number): MatrixUnitLift {
  const unit = units.get(`${String(row)},${String(column)}`);
  if (unit === undefined) throw new Error(`missing induced matrix unit E_${String(row)}${String(column)}`);
  return unit;
}

function sectorIdentity(units: ReadonlyMap<string, MatrixUnitLift>, field: number): readonly ModularEntry[] {
  return addEntries(field, ...Array.from({ length: 8 }, (_, index) => requireUnit(units, index, index).entries));
}

function countCommutatorViolations(
  candidate: readonly ModularEntry[],
  generators: readonly SignedPermutation[],
  field: number,
): number {
  let violations = 0;
  for (const generator of generators) {
    const action = signedPermutationEntries(generator);
    const difference = addEntries(
      field,
      composeEntries(candidate, action, field),
      scaleEntries(composeEntries(action, candidate, field), -1, field),
    );
    violations += difference.length;
  }
  return violations;
}

function generalLinearGroupOrder(field: number, dimension: number): bigint {
  const q = BigInt(field);
  const qn = q ** BigInt(dimension);
  let order = 1n;
  for (let power = 0; power < dimension; power += 1) order *= qn - q ** BigInt(power);
  return order;
}

export function measureFiniteHalfSpinCommutantGroup(
  field: (typeof PRIMES)[number] = PRIMES[0],
  repSeed = 0,
): FiniteCommutantGroupCensus {
  const sectors = buildDeclaredIntertwinerCentralSectorActions(field, repSeed);
  const plusHom = solveSignedPermutationIntertwiners(sectors.source.plus, sectors.target.plus, field);
  const minusHom = solveSignedPermutationIntertwiners(sectors.source.minus, sectors.target.minus, field);
  const plusCommutant = solveSignedPermutationIntertwiners(sectors.target.plus, sectors.target.plus, field);
  const minusCommutant = solveSignedPermutationIntertwiners(sectors.target.minus, sectors.target.minus, field);
  const plus = buildSectorMatrixUnits(plusHom.basisMaps, plusCommutant.basisMaps, field);
  const minus = buildSectorMatrixUnits(minusHom.basisMaps, minusCommutant.basisMaps, field);
  const plusIdentity = sectorIdentity(plus.units, field);
  const minusIdentity = sectorIdentity(minus.units, field);
  const identity = plusIdentity;
  const transvection = addEntries(field, plusIdentity, requireUnit(plus.units, 0, 1).entries);
  const swap = addEntries(
    field,
    plusIdentity,
    scaleEntries(requireUnit(plus.units, 0, 0).entries, -1, field),
    scaleEntries(requireUnit(plus.units, 1, 1).entries, -1, field),
    requireUnit(plus.units, 0, 1).entries,
    requireUnit(plus.units, 1, 0).entries,
  );
  const singular = addEntries(
    field,
    plusIdentity,
    scaleEntries(requireUnit(plus.units, 0, 0).entries, -1, field),
  );
  const noncommutingGenerator = sectors.target.plus[0];
  if (noncommutingGenerator === undefined) throw new Error("restricted target generator is absent");
  const noncommuting = signedPermutationEntries(noncommutingGenerator);
  const perSectorOrder = generalLinearGroupOrder(field, 8);
  const nonzeroOrbitSize = BigInt(field) ** 8n - 1n;
  const stabilizerOrder = perSectorOrder / nonzeroOrbitSize;
  const algebraResolved =
    plus.units.size === 64 && minus.units.size === 64 &&
    plus.actionViolations === 0 && minus.actionViolations === 0;

  return {
    field,
    repSeed,
    sectorAlgebra: Object.freeze({
      "+": {
        homDimension: plusHom.nullity,
        commutantDimension: plusCommutant.nullity,
        inducedMatrixUnitCount: plus.units.size,
        distinctMatrixUnitCount: new Set(plus.units.keys()).size,
        matrixUnitActionViolations: plus.actionViolations,
        identityLiftRank: modularMatrixRank(64, 64, plusIdentity, field),
      },
      "-": {
        homDimension: minusHom.nullity,
        commutantDimension: minusCommutant.nullity,
        inducedMatrixUnitCount: minus.units.size,
        distinctMatrixUnitCount: new Set(minus.units.keys()).size,
        matrixUnitActionViolations: minus.actionViolations,
        identityLiftRank: modularMatrixRank(64, 64, minusIdentity, field),
      },
    }),
    unitGroup: {
      structure: "GL(8,F_p) × GL(8,F_p)",
      perSectorOrder: perSectorOrder.toString(),
      totalOrder: (perSectorOrder * perSectorOrder).toString(),
      nonzeroCoefficientOrbitSize: nonzeroOrbitSize.toString(),
      perSectorNonzeroVectorStabilizerOrder: stabilizerOrder.toString(),
      fullEmbeddingPairOrbitCount: 1,
      actionStatement: "transitive on pairs of nonzero sector coefficient vectors",
    },
    controls: {
      identity: {
        rank: modularMatrixRank(64, 64, identity, field),
        commutatorViolations: countCommutatorViolations(identity, sectors.target.plus, field),
      },
      transvection: {
        rank: modularMatrixRank(64, 64, transvection, field),
        commutatorViolations: countCommutatorViolations(transvection, sectors.target.plus, field),
        changesCoefficient: !entriesEqual(transvection, identity, field),
      },
      swap: {
        rank: modularMatrixRank(64, 64, swap, field),
        commutatorViolations: countCommutatorViolations(swap, sectors.target.plus, field),
        changesCoefficient: !entriesEqual(swap, identity, field),
      },
      singular: {
        rank: modularMatrixRank(64, 64, singular, field),
        commutatorViolations: countCommutatorViolations(singular, sectors.target.plus, field),
        acceptedAsGroupElement: false,
      },
      noncommuting: {
        rank: modularMatrixRank(64, 64, noncommuting, field),
        commutatorViolations: countCommutatorViolations(noncommuting, sectors.target.plus, field),
        acceptedAsCommutantElement: false,
      },
    },
    finiteConclusion: {
      commutantAlgebra: algebraResolved ? "Mat(8,F_p) ⊕ Mat(8,F_p)" : "unresolved",
      automorphismGroup: algebraResolved ? "GL(8,F_p) × GL(8,F_p)" : "unresolved",
      canonicalEmbeddingOrbit: algebraResolved ? "single orbit under target-module automorphisms" : "unresolved",
      physicalGaugeGroupClaim: "not made",
    },
    regularity: { status: "unmeasured" },
  };
}
