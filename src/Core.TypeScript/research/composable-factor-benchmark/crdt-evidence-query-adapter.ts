/**
 * Canonical evidence-state query boundary.
 *
 * The evidence state is the CvRDT payload. This module is a pure, deterministic
 * Gaussian query over that payload; it is not a CRDT merge and must not be used
 * as one.
 */

import {
  conflictKeys,
  gaussianFingerprint,
  mergeEvidenceStates,
  type EvidenceState,
  type EvidenceVersion,
  type Gaussian2,
  type Matrix2,
  type Vector2,
} from "./crdt-belief-fusion";

const ALGORITHM = "canonical-kahan-gaussian-product/v1";

export interface EmptyEvidenceQueryReceipt {
  readonly status: "Empty";
  readonly algorithm: typeof ALGORITHM;
  readonly orderedFingerprints: readonly string[];
  readonly evidenceCount: 0;
}

export interface ConflictEvidenceQueryReceipt {
  readonly status: "Conflict";
  readonly algorithm: typeof ALGORITHM;
  readonly orderedFingerprints: readonly string[];
  readonly evidenceCount: number;
  readonly conflictKeys: readonly string[];
}

export interface ReadyEvidenceQueryReceipt {
  readonly status: "Ready";
  readonly algorithm: typeof ALGORITHM;
  readonly orderedFingerprints: readonly string[];
  readonly evidenceCount: number;
  readonly absorption: "ExactOnceByFingerprint";
  readonly posterior: Gaussian2;
}

export type EvidenceQueryReceipt =
  | EmptyEvidenceQueryReceipt
  | ConflictEvidenceQueryReceipt
  | ReadyEvidenceQueryReceipt;

interface InformationTotals {
  readonly information: Matrix2;
  readonly natural: Vector2;
}

class KahanSum {
  private sum = 0;
  private compensation = 0;

  public add(value: number): void {
    const adjusted = value - this.compensation;
    const next = this.sum + adjusted;
    this.compensation = (next - this.sum) - adjusted;
    this.sum = next;
  }

  public value(): number {
    return this.sum;
  }
}

function invert(matrix: Matrix2): Matrix2 {
  const determinant = matrix[0][0] * matrix[1][1] - matrix[0][1] * matrix[1][0];
  if (!(matrix[0][0] > 0) || !(determinant > 0) || !Number.isFinite(determinant)) {
    throw new Error("canonical Gaussian query requires positive-definite finite covariance");
  }
  return [
    [matrix[1][1] / determinant, -matrix[0][1] / determinant],
    [-matrix[1][0] / determinant, matrix[0][0] / determinant],
  ];
}

function multiply(matrix: Matrix2, vector: Vector2): Vector2 {
  return [
    matrix[0][0] * vector[0] + matrix[0][1] * vector[1],
    matrix[1][0] * vector[0] + matrix[1][1] * vector[1],
  ];
}

function versionFingerprint(version: EvidenceVersion): string {
  return `${version.key}\u0000${gaussianFingerprint(version.estimate)}`;
}

function canonicalState(state: EvidenceState): EvidenceState {
  return mergeEvidenceStates({ versions: [] }, state);
}

function kahanInformationTotals(versions: readonly EvidenceVersion[]): InformationTotals {
  const information00 = new KahanSum();
  const information01 = new KahanSum();
  const information11 = new KahanSum();
  const natural0 = new KahanSum();
  const natural1 = new KahanSum();

  for (const version of versions) {
    const information = invert(version.estimate.covariance);
    const natural = multiply(information, version.estimate.mean);
    information00.add(information[0][0]);
    information01.add(information[0][1]);
    information11.add(information[1][1]);
    natural0.add(natural[0]);
    natural1.add(natural[1]);
  }

  return {
    information: [
      [information00.value(), information01.value()],
      [information01.value(), information11.value()],
    ],
    natural: [natural0.value(), natural1.value()],
  };
}

function naiveInformationTotalsForControl(versions: readonly EvidenceVersion[]): InformationTotals {
  let information00 = 0;
  let information01 = 0;
  let information11 = 0;
  let natural0 = 0;
  let natural1 = 0;
  for (const version of versions) {
    const information = invert(version.estimate.covariance);
    const natural = multiply(information, version.estimate.mean);
    information00 += information[0][0];
    information01 += information[0][1];
    information11 += information[1][1];
    natural0 += natural[0];
    natural1 += natural[1];
  }
  return {
    information: [[information00, information01], [information01, information11]],
    natural: [natural0, natural1],
  };
}

function posteriorFromTotals(totals: InformationTotals): Gaussian2 {
  const covariance = invert(totals.information);
  return { covariance, mean: multiply(covariance, totals.natural) };
}

function queryCanonicalState(state: EvidenceState, totals: (versions: readonly EvidenceVersion[]) => InformationTotals): EvidenceQueryReceipt {
  const normalized = canonicalState(state);
  const orderedFingerprints = normalized.versions.map(versionFingerprint);
  const conflicts = conflictKeys(normalized);
  if (conflicts.length > 0) {
    return {
      status: "Conflict",
      algorithm: ALGORITHM,
      orderedFingerprints,
      evidenceCount: normalized.versions.length,
      conflictKeys: conflicts,
    };
  }
  if (normalized.versions.length === 0) {
    return { status: "Empty", algorithm: ALGORITHM, orderedFingerprints, evidenceCount: 0 };
  }
  return {
    status: "Ready",
    algorithm: ALGORITHM,
    orderedFingerprints,
    evidenceCount: normalized.versions.length,
    absorption: "ExactOnceByFingerprint",
    posterior: posteriorFromTotals(totals(normalized.versions)),
  };
}

/** Query a canonical evidence state without mutating it or adopting its posterior as state. */
export function queryCanonicalGaussianEvidence(state: EvidenceState): EvidenceQueryReceipt {
  return queryCanonicalState(state, kahanInformationTotals);
}

/**
 * Test-only numerical control. It differs only by omitting compensation; callers
 * must never treat either result as a replicated merge.
 */
export function queryCanonicalGaussianEvidenceNaiveForControl(state: EvidenceState): EvidenceQueryReceipt {
  return queryCanonicalState(state, naiveInformationTotalsForControl);
}
