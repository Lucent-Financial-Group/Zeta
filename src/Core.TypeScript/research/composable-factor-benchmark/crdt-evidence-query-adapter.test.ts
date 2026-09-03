import { describe, expect, test } from "bun:test";
import {
  queryCanonicalGaussianEvidence,
  queryCanonicalGaussianEvidenceNaiveForControl,
} from "./crdt-evidence-query-adapter";
import type { EvidenceState } from "./crdt-belief-fusion";

const first = { key: "a", estimate: { mean: [0, 0] as const, covariance: [[1, 0], [0, 4]] as const } };
const second = { key: "b", estimate: { mean: [1, 0] as const, covariance: [[4, 0], [0, 1]] as const } };
const third = { key: "c", estimate: { mean: [0, 1] as const, covariance: [[2, 1], [1, 2]] as const } };

describe("canonical CRDT evidence Gaussian query", () => {
  test("all six arrival permutations and redelivery produce one canonical exact-once receipt", () => {
    const orders = [
      [first, second, third], [first, third, second], [second, first, third],
      [second, third, first], [third, first, second], [third, second, first],
    ];
    const receipts = orders.map((versions) => queryCanonicalGaussianEvidence({ versions }));
    for (const receipt of receipts) {
      expect(receipt.status).toBe("Ready");
      if (receipt.status !== "Ready") throw new Error("unreachable ready receipt");
      expect(receipt.absorption).toBe("ExactOnceByFingerprint");
      expect(receipt.evidenceCount).toBe(3);
    }
    const baseline = receipts[0];
    if (baseline === undefined) throw new Error("declared permutation catalogue is empty");
    expect(receipts.every((receipt) => JSON.stringify(receipt) === JSON.stringify(baseline))).toBe(true);
    expect(queryCanonicalGaussianEvidence({ versions: [first, second, third, first] })).toEqual(baseline);
  });

  test("same-key changed content and changed uncertainty remain visible conflicts without a posterior", () => {
    const changedMean: EvidenceState = {
      versions: [first, { key: "a", estimate: { mean: [1, 0], covariance: [[1, 0], [0, 4]] } }],
    };
    const changedUncertainty: EvidenceState = {
      versions: [first, { key: "a", estimate: { mean: [0, 0], covariance: [[2, 0], [0, 4]] } }],
    };
    for (const state of [changedMean, changedUncertainty]) {
      const receipt = queryCanonicalGaussianEvidence(state);
      expect(receipt.status).toBe("Conflict");
      if (receipt.status !== "Conflict") throw new Error("unreachable conflict receipt");
      expect(receipt.conflictKeys).toEqual(["a"]);
      expect("posterior" in receipt).toBe(false);
    }
  });

  test("an empty state reports no invented posterior", () => {
    expect(queryCanonicalGaussianEvidence({ versions: [] })).toEqual({
      status: "Empty",
      algorithm: "canonical-kahan-gaussian-product/v1",
      orderedFingerprints: [],
      evidenceCount: 0,
    });
  });

  test("the Kahan numerical-control path differs from naive summation on a declared cancellation-sensitive catalogue", () => {
    const cancellationSensitive: EvidenceState = {
      versions: [
        { key: "a", estimate: { mean: [0, 0], covariance: [[1e-16, 0], [0, 1]] } },
        { key: "b", estimate: { mean: [0, 0], covariance: [[1, 0], [0, 1]] } },
        { key: "c", estimate: { mean: [0, 0], covariance: [[1, 0], [0, 1]] } },
      ],
    };
    const compensated = queryCanonicalGaussianEvidence(cancellationSensitive);
    const naive = queryCanonicalGaussianEvidenceNaiveForControl(cancellationSensitive);
    expect(compensated.status).toBe("Ready");
    expect(naive.status).toBe("Ready");
    if (compensated.status !== "Ready" || naive.status !== "Ready") throw new Error("unreachable ready receipt");
    expect(compensated.posterior.covariance[0][0]).not.toBe(naive.posterior.covariance[0][0]);
  });
});
