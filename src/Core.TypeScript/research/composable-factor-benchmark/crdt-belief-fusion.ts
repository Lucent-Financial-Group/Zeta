/**
 * Finite CRDT/belief-fusion census.
 *
 * The replicated payload is an immutable multi-value evidence set. Gaussian and covariance-
 * intersection results are deterministic queries, never silently promoted to state-merge laws.
 */

export type Vector2 = readonly [number, number];
export type Matrix2 = readonly [readonly [number, number], readonly [number, number]];

export interface Gaussian2 {
  readonly mean: Vector2;
  readonly covariance: Matrix2;
}

export interface EvidenceVersion {
  readonly key: string;
  readonly estimate: Gaussian2;
}

export interface EvidenceState {
  readonly versions: readonly EvidenceVersion[];
}

export interface CiResult extends Gaussian2 {
  readonly weight: number;
}

const EPSILON = 1e-12;

function compareText(left: string, right: string): number {
  const leftPoints = Array.from(left, (value) => value.codePointAt(0) ?? 0);
  const rightPoints = Array.from(right, (value) => value.codePointAt(0) ?? 0);
  const length = Math.min(leftPoints.length, rightPoints.length);
  for (let index = 0; index < length; index += 1) {
    const leftPoint = leftPoints[index];
    const rightPoint = rightPoints[index];
    if (leftPoint === undefined || rightPoint === undefined) throw new Error("unreachable code-point index");
    if (leftPoint !== rightPoint) return leftPoint < rightPoint ? -1 : 1;
  }
  return leftPoints.length - rightPoints.length;
}

function canonicalNumber(value: number): string {
  if (!Number.isFinite(value)) throw new Error("belief values must be finite");
  return Object.is(value, -0) ? "0" : value.toString();
}

export function gaussianFingerprint(estimate: Gaussian2): string {
  return [
    ...estimate.mean,
    estimate.covariance[0][0],
    estimate.covariance[0][1],
    estimate.covariance[1][0],
    estimate.covariance[1][1],
  ].map(canonicalNumber).join("|");
}

function evidenceFingerprint(version: EvidenceVersion): string {
  return `${version.key}\u0000${gaussianFingerprint(version.estimate)}`;
}

function assertPositiveDefinite(matrix: Matrix2): void {
  if (Math.abs(matrix[0][1] - matrix[1][0]) > EPSILON) throw new Error("covariance must be symmetric");
  const determinant = matrix[0][0] * matrix[1][1] - matrix[0][1] * matrix[1][0];
  if (!(matrix[0][0] > 0 && determinant > 0)) throw new Error("covariance must be positive definite");
}

function invert(matrix: Matrix2): Matrix2 {
  assertPositiveDefinite(matrix);
  const determinant = matrix[0][0] * matrix[1][1] - matrix[0][1] * matrix[1][0];
  return [
    [matrix[1][1] / determinant, -matrix[0][1] / determinant],
    [-matrix[1][0] / determinant, matrix[0][0] / determinant],
  ];
}

function addMatrix(left: Matrix2, right: Matrix2): Matrix2 {
  return [
    [left[0][0] + right[0][0], left[0][1] + right[0][1]],
    [left[1][0] + right[1][0], left[1][1] + right[1][1]],
  ];
}

function scaleMatrix(scale: number, matrix: Matrix2): Matrix2 {
  return [
    [scale * matrix[0][0], scale * matrix[0][1]],
    [scale * matrix[1][0], scale * matrix[1][1]],
  ];
}

function matrixVector(matrix: Matrix2, vector: Vector2): Vector2 {
  return [
    matrix[0][0] * vector[0] + matrix[0][1] * vector[1],
    matrix[1][0] * vector[0] + matrix[1][1] * vector[1],
  ];
}

function addVector(left: Vector2, right: Vector2): Vector2 {
  return [left[0] + right[0], left[1] + right[1]];
}

function scaleVector(scale: number, vector: Vector2): Vector2 {
  return [scale * vector[0], scale * vector[1]];
}

function maxDifference(left: Gaussian2, right: Gaussian2): number {
  return Math.max(
    Math.abs(left.mean[0] - right.mean[0]),
    Math.abs(left.mean[1] - right.mean[1]),
    Math.abs(left.covariance[0][0] - right.covariance[0][0]),
    Math.abs(left.covariance[0][1] - right.covariance[0][1]),
    Math.abs(left.covariance[1][0] - right.covariance[1][0]),
    Math.abs(left.covariance[1][1] - right.covariance[1][1]),
  );
}

function covarianceDominates(fused: Matrix2, input: Matrix2): boolean {
  const difference: Matrix2 = [
    [input[0][0] - fused[0][0], input[0][1] - fused[0][1]],
    [input[1][0] - fused[1][0], input[1][1] - fused[1][1]],
  ];
  const determinant = difference[0][0] * difference[1][1] - difference[0][1] * difference[1][0];
  return difference[0][0] >= -EPSILON && difference[1][1] >= -EPSILON && determinant >= -EPSILON;
}

export function mergeEvidenceStates(left: EvidenceState, right: EvidenceState): EvidenceState {
  const byFingerprint = new Map<string, EvidenceVersion>();
  for (const version of [...left.versions, ...right.versions]) {
    assertPositiveDefinite(version.estimate.covariance);
    byFingerprint.set(evidenceFingerprint(version), version);
  }
  return {
    versions: [...byFingerprint.values()].sort((a, b) => compareText(evidenceFingerprint(a), evidenceFingerprint(b))),
  };
}

export function evidenceStateLessEqual(left: EvidenceState, right: EvidenceState): boolean {
  const rightFingerprints = new Set(right.versions.map(evidenceFingerprint));
  return left.versions.every((version) => rightFingerprints.has(evidenceFingerprint(version)));
}

export function conflictKeys(state: EvidenceState): readonly string[] {
  const fingerprintsByKey = new Map<string, Set<string>>();
  for (const version of state.versions) {
    const fingerprints = fingerprintsByKey.get(version.key) ?? new Set<string>();
    fingerprints.add(gaussianFingerprint(version.estimate));
    fingerprintsByKey.set(version.key, fingerprints);
  }
  return [...fingerprintsByKey.entries()]
    .filter(([, fingerprints]) => fingerprints.size > 1)
    .map(([key]) => key)
    .sort(compareText);
}

export function gaussianProduct(left: Gaussian2, right: Gaussian2): Gaussian2 {
  const leftInformation = invert(left.covariance);
  const rightInformation = invert(right.covariance);
  const information = addMatrix(leftInformation, rightInformation);
  const covariance = invert(information);
  const natural = addVector(matrixVector(leftInformation, left.mean), matrixVector(rightInformation, right.mean));
  return { mean: matrixVector(covariance, natural), covariance };
}

export function queryIndependentEvidence(state: EvidenceState): Gaussian2 | undefined {
  if (conflictKeys(state).length > 0) throw new Error("conflicting evidence must be adjudicated before fusion");
  const estimates = state.versions.map((version) => version.estimate);
  if (estimates.length === 0) return undefined;
  const first = estimates[0];
  if (first === undefined) return undefined;
  return estimates.slice(1).reduce(gaussianProduct, first);
}

function ciAtWeight(left: Gaussian2, right: Gaussian2, weight: number): CiResult {
  if (!(weight >= 0 && weight <= 1)) throw new Error("CI weight must lie in [0,1]");
  const leftInformation = invert(left.covariance);
  const rightInformation = invert(right.covariance);
  const information = addMatrix(scaleMatrix(weight, leftInformation), scaleMatrix(1 - weight, rightInformation));
  const covariance = invert(information);
  const natural = addVector(
    scaleVector(weight, matrixVector(leftInformation, left.mean)),
    scaleVector(1 - weight, matrixVector(rightInformation, right.mean)),
  );
  return { mean: matrixVector(covariance, natural), covariance, weight };
}

function canonicalPair(left: Gaussian2, right: Gaussian2): readonly [Gaussian2, Gaussian2] {
  return compareText(gaussianFingerprint(left), gaussianFingerprint(right)) <= 0 ? [left, right] : [right, left];
}

export function covarianceIntersectionFixedHalf(left: Gaussian2, right: Gaussian2): CiResult {
  const [first, second] = canonicalPair(left, right);
  return ciAtWeight(first, second, 0.5);
}

export function covarianceIntersectionTraceGrid(left: Gaussian2, right: Gaussian2): CiResult {
  const [first, second] = canonicalPair(left, right);
  let best = ciAtWeight(first, second, 0);
  let bestTrace = best.covariance[0][0] + best.covariance[1][1];
  for (let step = 1; step <= 1_000; step += 1) {
    const candidate = ciAtWeight(first, second, step / 1_000);
    const trace = candidate.covariance[0][0] + candidate.covariance[1][1];
    if (trace < bestTrace - EPSILON) {
      best = candidate;
      bestTrace = trace;
    }
  }
  return best;
}

const CATALOG_MEANS: readonly Vector2[] = [[0, 0], [1, 0], [0, 1], [2, -1]];
const CATALOG_COVARIANCES: readonly Matrix2[] = [
  [[1, 0], [0, 4]],
  [[4, 0], [0, 1]],
  [[2, 1], [1, 2]],
  [[5, -1], [-1, 1]],
];

function catalog(): readonly Gaussian2[] {
  return CATALOG_MEANS.flatMap((mean) => CATALOG_COVARIANCES.map((covariance) => ({ mean, covariance })));
}

export interface AssociativityWitness {
  readonly first: Gaussian2;
  readonly second: Gaussian2;
  readonly third: Gaussian2;
  readonly left: CiResult;
  readonly right: CiResult;
  readonly maxDifference: number;
}

function findAssociativityWitness(
  fuse: (left: Gaussian2, right: Gaussian2) => CiResult,
): AssociativityWitness | undefined {
  const estimates = catalog();
  for (let firstIndex = 0; firstIndex < estimates.length; firstIndex += 1) {
    for (let secondIndex = firstIndex + 1; secondIndex < estimates.length; secondIndex += 1) {
      for (let thirdIndex = secondIndex + 1; thirdIndex < estimates.length; thirdIndex += 1) {
        const first = estimates[firstIndex];
        const second = estimates[secondIndex];
        const third = estimates[thirdIndex];
        if (first === undefined || second === undefined || third === undefined) throw new Error("catalog index missing");
        const left = fuse(fuse(first, second), third);
        const right = fuse(first, fuse(second, third));
        const difference = maxDifference(left, right);
        if (difference > 1e-9) return { first, second, third, left, right, maxDifference: difference };
      }
    }
  }
  return undefined;
}

function gaussianEqual(left: Gaussian2 | undefined, right: Gaussian2 | undefined, tolerance = EPSILON): boolean {
  if (left === undefined || right === undefined) return left === right;
  return maxDifference(left, right) <= tolerance;
}

export interface CrdtBeliefFusionCensus {
  readonly evidenceMerge: {
    readonly idempotent: boolean;
    readonly commutative: boolean;
    readonly associative: boolean;
    readonly monotonic: boolean;
    readonly conflictRetained: boolean;
    readonly queryRedeliveryInvariant: boolean;
  };
  readonly gaussianProductLaws: {
    readonly idempotent: boolean;
    readonly commutative: boolean;
    readonly associativeWithinTolerance: boolean;
    readonly repeatedEvidenceVarianceRatio: number;
  };
  readonly fixedHalfCi: {
    readonly idempotent: boolean;
    readonly commutative: boolean;
    readonly dominatesBothInputs: boolean;
    readonly associativityWitness: AssociativityWitness | undefined;
  };
  readonly traceGridCi: {
    readonly idempotent: boolean;
    readonly commutative: boolean;
    readonly dominatesBothInputs: boolean;
    readonly associativityWitness: AssociativityWitness | undefined;
  };
  readonly conclusion: {
    readonly replicatedStateCandidate: "content-addressed evidence union";
    readonly gaussianProductAsStateMerge: "rejected: non-idempotent";
    readonly fixedHalfCiAsStateMerge: "rejected: non-associative" | "not falsified in finite catalog";
    readonly traceGridCiAsStateMerge: "rejected: non-associative" | "not falsified in finite catalog";
    readonly provenanceFreeFusionClaim: "not established";
  };
}

export function measureCrdtBeliefFusion(): CrdtBeliefFusionCensus {
  const a: EvidenceVersion = { key: "a", estimate: { mean: [0, 0], covariance: [[1, 0], [0, 4]] } };
  const b: EvidenceVersion = { key: "b", estimate: { mean: [1, 0], covariance: [[4, 0], [0, 1]] } };
  const c: EvidenceVersion = { key: "c", estimate: { mean: [0, 1], covariance: [[2, 1], [1, 2]] } };
  const changedA: EvidenceVersion = { key: "a", estimate: { mean: [2, -1], covariance: [[5, -1], [-1, 1]] } };
  const sa: EvidenceState = { versions: [a] };
  const sb: EvidenceState = { versions: [b] };
  const sc: EvidenceState = { versions: [c] };

  const abcLeft = mergeEvidenceStates(mergeEvidenceStates(sa, sb), sc);
  const abcRight = mergeEvidenceStates(sa, mergeEvidenceStates(sb, sc));
  const conflict = mergeEvidenceStates(sa, { versions: [changedA] });
  const baseQuery = queryIndependentEvidence(mergeEvidenceStates(sa, sb));
  const redeliveredQuery = queryIndependentEvidence(mergeEvidenceStates(mergeEvidenceStates(sa, sb), sa));

  const productSelf = gaussianProduct(a.estimate, a.estimate);
  const productLeft = gaussianProduct(gaussianProduct(a.estimate, b.estimate), c.estimate);
  const productRight = gaussianProduct(a.estimate, gaussianProduct(b.estimate, c.estimate));
  const fixedSelf = covarianceIntersectionFixedHalf(a.estimate, a.estimate);
  const traceSelf = covarianceIntersectionTraceGrid(a.estimate, a.estimate);
  const fixedPair = covarianceIntersectionFixedHalf(a.estimate, b.estimate);
  const tracePair = covarianceIntersectionTraceGrid(a.estimate, b.estimate);

  const fixedWitness = findAssociativityWitness(covarianceIntersectionFixedHalf);
  const traceWitness = findAssociativityWitness(covarianceIntersectionTraceGrid);

  return {
    evidenceMerge: {
      idempotent: JSON.stringify(mergeEvidenceStates(sa, sa)) === JSON.stringify(sa),
      commutative: JSON.stringify(mergeEvidenceStates(sa, sb)) === JSON.stringify(mergeEvidenceStates(sb, sa)),
      associative: JSON.stringify(abcLeft) === JSON.stringify(abcRight),
      monotonic: evidenceStateLessEqual(sa, mergeEvidenceStates(sa, sb)),
      conflictRetained: conflict.versions.length === 2 && conflictKeys(conflict).length === 1,
      queryRedeliveryInvariant: gaussianEqual(baseQuery, redeliveredQuery),
    },
    gaussianProductLaws: {
      idempotent: gaussianEqual(a.estimate, productSelf),
      commutative: gaussianEqual(gaussianProduct(a.estimate, b.estimate), gaussianProduct(b.estimate, a.estimate)),
      associativeWithinTolerance: gaussianEqual(productLeft, productRight),
      repeatedEvidenceVarianceRatio: productSelf.covariance[0][0] / a.estimate.covariance[0][0],
    },
    fixedHalfCi: {
      idempotent: gaussianEqual(a.estimate, fixedSelf),
      commutative: gaussianEqual(
        fixedPair,
        covarianceIntersectionFixedHalf(b.estimate, a.estimate),
      ),
      dominatesBothInputs:
        covarianceDominates(fixedPair.covariance, a.estimate.covariance)
        && covarianceDominates(fixedPair.covariance, b.estimate.covariance),
      associativityWitness: fixedWitness,
    },
    traceGridCi: {
      idempotent: gaussianEqual(a.estimate, traceSelf),
      commutative: gaussianEqual(
        tracePair,
        covarianceIntersectionTraceGrid(b.estimate, a.estimate),
      ),
      dominatesBothInputs:
        covarianceDominates(tracePair.covariance, a.estimate.covariance)
        && covarianceDominates(tracePair.covariance, b.estimate.covariance),
      associativityWitness: traceWitness,
    },
    conclusion: {
      replicatedStateCandidate: "content-addressed evidence union",
      gaussianProductAsStateMerge: "rejected: non-idempotent",
      fixedHalfCiAsStateMerge: fixedWitness === undefined ? "not falsified in finite catalog" : "rejected: non-associative",
      traceGridCiAsStateMerge: traceWitness === undefined ? "not falsified in finite catalog" : "rejected: non-associative",
      provenanceFreeFusionClaim: "not established",
    },
  };
}
