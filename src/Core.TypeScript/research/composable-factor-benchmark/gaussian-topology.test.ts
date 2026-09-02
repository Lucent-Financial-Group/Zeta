import { describe, expect, test } from "bun:test";
import {
  balancedDagReduction,
  chainReduction,
  deterministicEvidence,
  measureGaussianTopology,
} from "./gaussian-topology";

describe("CFB-A Gaussian topology utility", () => {
  for (const count of [2, 4, 8, 16, 32, 64]) {
    test(`chain and balanced DAG preserve the dense posterior for ${String(count)} evidence leaves`, () => {
      const census = measureGaussianTopology(count);
      expect(census.maxMomentDifference).toBeLessThanOrEqual(1e-12);
      expect(census.chain.productCount).toBe(count - 1);
      expect(census.balancedDag.productCount).toBe(count - 1);
      expect(census.chain.criticalPathDepth).toBe(count - 1);
      expect(census.balancedDag.criticalPathDepth).toBe(Math.ceil(Math.log2(count)));
      expect(census.branchDropMomentDifference).toBeGreaterThan(0);
      expect(census.branchDrop.evidenceIds).not.toContain(census.droppedEvidenceId);
    });
  }

  test("arrival order and balanced grouping do not change the commutative Gaussian product", () => {
    const evidence = deterministicEvidence(7);
    const chain = chainReduction(evidence);
    const permuted = chainReduction([evidence[4]!, evidence[1]!, evidence[6]!, evidence[0]!, evidence[3]!, evidence[2]!, evidence[5]!]);
    const balanced = balancedDagReduction(evidence);
    expect(permuted.posterior.mean).toBeCloseTo(chain.posterior.mean, 14);
    expect(permuted.posterior.variance).toBeCloseTo(chain.posterior.variance, 14);
    expect(balanced.posterior.mean).toBeCloseTo(chain.posterior.mean, 14);
    expect(balanced.posterior.variance).toBeCloseTo(chain.posterior.variance, 14);
  });

  test("invalid variances and empty evidence are teaching errors", () => {
    expect(() => chainReduction([])).toThrow("CFB-A-EMPTY-EVIDENCE");
    expect(() => balancedDagReduction([{ id: "bad", mean: 0, variance: 0 }])).toThrow("CFB-A-INVALID-VARIANCE");
  });
});
