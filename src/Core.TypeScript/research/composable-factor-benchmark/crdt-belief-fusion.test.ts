import { describe, expect, test } from "bun:test";
import {
  conflictKeys,
  measureCrdtBeliefFusion,
  mergeEvidenceStates,
  queryIndependentEvidence,
  type EvidenceState,
} from "./crdt-belief-fusion";

describe("CRDT-compatible belief fusion boundary", () => {
  test("content-addressed evidence union is ACI, monotonic, redelivery-invariant, and conflict-retaining", () => {
    const census = measureCrdtBeliefFusion();
    expect(census.evidenceMerge).toEqual({
      idempotent: true,
      commutative: true,
      associative: true,
      monotonic: true,
      conflictRetained: true,
      queryRedeliveryInvariant: true,
    });
  });

  test("raw Bayesian product is commutative and associative but not an idempotent state merge", () => {
    const census = measureCrdtBeliefFusion();
    expect(census.gaussianProductLaws.commutative).toBe(true);
    expect(census.gaussianProductLaws.associativeWithinTolerance).toBe(true);
    expect(census.gaussianProductLaws.idempotent).toBe(false);
    expect(census.gaussianProductLaws.repeatedEvidenceVarianceRatio).toBe(0.5);
    expect(census.conclusion.gaussianProductAsStateMerge).toBe("rejected: non-idempotent");
  });

  test("fixed-half and trace-grid covariance intersection are idempotent and commutative but have explicit associativity counterexamples", () => {
    const census = measureCrdtBeliefFusion();
    expect(census.fixedHalfCi.idempotent).toBe(true);
    expect(census.fixedHalfCi.commutative).toBe(true);
    expect(census.fixedHalfCi.dominatesBothInputs).toBe(false);
    expect(census.fixedHalfCi.associativityWitness?.maxDifference).toBeCloseTo(0.26288972189176474, 12);
    expect(census.fixedHalfCi.associativityWitness?.left.covariance[0][0]).toBeCloseTo(1.6588628762541808, 12);
    expect(census.fixedHalfCi.associativityWitness?.right.covariance[0][0]).toBeCloseTo(1.395973154362416, 12);
    expect(census.traceGridCi.idempotent).toBe(true);
    expect(census.traceGridCi.commutative).toBe(true);
    expect(census.traceGridCi.dominatesBothInputs).toBe(false);
    expect(census.traceGridCi.associativityWitness?.left.weight).toBe(0.881);
    expect(census.traceGridCi.associativityWitness?.right.weight).toBe(0.347);
    expect(census.traceGridCi.associativityWitness?.maxDifference).toBeCloseTo(0.24355734504083776, 12);
    expect(census.conclusion.fixedHalfCiAsStateMerge).toBe("rejected: non-associative");
    expect(census.conclusion.traceGridCiAsStateMerge).toBe("rejected: non-associative");
  });

  test("one content identity with changed Gaussian content remains a visible multi-value conflict", () => {
    const first: EvidenceState = {
      versions: [{ key: "same", estimate: { mean: [0, 0], covariance: [[1, 0], [0, 1]] } }],
    };
    const changed: EvidenceState = {
      versions: [{ key: "same", estimate: { mean: [1, 0], covariance: [[1, 0], [0, 1]] } }],
    };
    const merged = mergeEvidenceStates(first, changed);
    expect(conflictKeys(merged)).toEqual(["same"]);
    expect(merged.versions).toHaveLength(2);
    expect(() => queryIndependentEvidence(merged)).toThrow("conflicting evidence must be adjudicated before fusion");
  });
});
