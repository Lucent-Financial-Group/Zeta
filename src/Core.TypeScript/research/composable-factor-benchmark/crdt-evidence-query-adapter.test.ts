import { describe, expect, test } from "bun:test";
import {
  queryCanonicalGaussianEvidence,
  queryCanonicalGaussianEvidenceNaiveForControl,
} from "./crdt-evidence-query-adapter";
import type { EvidenceState } from "./crdt-belief-fusion";

const first = {
  key: "a",
  estimate: {
    mean: [0, 0] as const,
    covariance: [
      [1, 0],
      [0, 4],
    ] as const,
  },
};
const second = {
  key: "b",
  estimate: {
    mean: [1, 0] as const,
    covariance: [
      [4, 0],
      [0, 1],
    ] as const,
  },
};
const third = {
  key: "c",
  estimate: {
    mean: [0, 1] as const,
    covariance: [
      [2, 1],
      [1, 2],
    ] as const,
  },
};

describe("canonical CRDT evidence Gaussian query", () => {
  test("all six arrival permutations and redelivery produce one canonical exact-once receipt", () => {
    const orders = [
      [first, second, third],
      [first, third, second],
      [second, first, third],
      [second, third, first],
      [third, first, second],
      [third, second, first],
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

  test("PERMUTATION INVARIANCE OF THE POSTERIOR, on a catalogue where the fold is order-sensitive", () => {
    // WHY THIS EXISTS SEPARATELY FROM THE TEST ABOVE, measured 2026-09-03.
    //
    // The six-permutation test above is not vacuous — removing `canonicalState` turns its six
    // receipts into six distinct receipts and it goes red. But ALL of that discriminating power
    // comes from `orderedFingerprints`, which is metadata about the arrival list. Measured with
    // canonicalisation removed on that test's own catalogue:
    //
    //     distinct receipts across 6 permutations:   6   <- the test fails, correctly
    //     distinct POSTERIORS across 6 permutations: 1   <- byte-identical
    //
    // So it pins canonical REPORTING and says nothing about canonical NUMERICS, because the
    // declared catalogue's precisions (1, 0.25, 2/3) sum to the same float64 in every order. The
    // property this system actually needs is the second one: two agents that saw the same
    // evidence in different orders must reach the same CONCLUSION, not merely print the same
    // provenance list.
    //
    // This catalogue makes the fold genuinely order-sensitive — precisions 1e16, 1, 1, where the
    // tiny terms vanish into the huge one unless they are added to each other first. Measured:
    //
    //     canonicalisation removed:  2 distinct posteriors  (9.999999999999997e-17 and 1e-16)
    //     canonicalisation present:  1
    //
    // Two nodes, one evidence set, different conclusions. That is the failure this asserts against.
    //
    // AND NOTE WHAT IS *NOT* DOING THE WORK. Kahan compensation was ON in the divergent run; it
    // buys accuracy and it does not buy associativity, because compensated summation is still a
    // left fold. The load-bearing mechanism is the CANONICAL ORDER — the same content-addressed
    // union that serves as the state merge — and this test is what says so.
    const huge = {
      key: "huge",
      estimate: {
        mean: [0, 0],
        covariance: [
          [1e-16, 0],
          [0, 1],
        ],
      },
    } as const;
    const unitA = {
      key: "unit-a",
      estimate: {
        mean: [0, 0],
        covariance: [
          [1, 0],
          [0, 1],
        ],
      },
    } as const;
    const unitB = {
      key: "unit-b",
      estimate: {
        mean: [0, 0],
        covariance: [
          [1, 0],
          [0, 1],
        ],
      },
    } as const;

    const catalogue = [huge, unitA, unitB];
    const permutations = [
      [0, 1, 2],
      [0, 2, 1],
      [1, 0, 2],
      [1, 2, 0],
      [2, 0, 1],
      [2, 1, 0],
    ].map((indices) => indices.map((i) => catalogue[i]!));

    const posteriors = permutations.map((versions) => {
      const receipt = queryCanonicalGaussianEvidence({ versions } as EvidenceState);
      expect(receipt.status).toBe("Ready");
      if (receipt.status !== "Ready") throw new Error("unreachable ready receipt");
      return receipt.posterior;
    });

    // Compared as bit patterns rather than with a tolerance. A tolerance would accept exactly the
    // divergence being tested — the two values above differ in the last three bits — and an
    // approximate agreement between replicas is not agreement, it is a disagreement nobody has
    // measured yet.
    const baseline = posteriors[0];
    if (baseline === undefined) throw new Error("declared permutation catalogue is empty");
    for (const posterior of posteriors) {
      expect(JSON.stringify(posterior)).toBe(JSON.stringify(baseline));
    }
  });

  test("same-key changed content and changed uncertainty remain visible conflicts without a posterior", () => {
    const changedMean: EvidenceState = {
      versions: [
        first,
        {
          key: "a",
          estimate: {
            mean: [1, 0],
            covariance: [
              [1, 0],
              [0, 4],
            ],
          },
        },
      ],
    };
    const changedUncertainty: EvidenceState = {
      versions: [
        first,
        {
          key: "a",
          estimate: {
            mean: [0, 0],
            covariance: [
              [2, 0],
              [0, 4],
            ],
          },
        },
      ],
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
        {
          key: "a",
          estimate: {
            mean: [0, 0],
            covariance: [
              [1e-16, 0],
              [0, 1],
            ],
          },
        },
        {
          key: "b",
          estimate: {
            mean: [0, 0],
            covariance: [
              [1, 0],
              [0, 1],
            ],
          },
        },
        {
          key: "c",
          estimate: {
            mean: [0, 0],
            covariance: [
              [1, 0],
              [0, 1],
            ],
          },
        },
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
