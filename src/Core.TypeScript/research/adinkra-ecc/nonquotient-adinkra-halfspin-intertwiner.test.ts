import { describe, expect, test } from "bun:test";

import {
  measureFiniteAdinkraHalfSpinIntertwiner,
  measureIntertwinerCalibrations,
  solveSignedPermutationIntertwiners,
  type SignedPermutation,
} from "./nonquotient-adinkra-halfspin-intertwiner";
import { PRIMES } from "./regular-representation-defect";

describe("finite coded-Adinkra / half-spin intertwiner census", () => {
  test("the signed constraint graph distinguishes a one-parameter identity from an inconsistent sign cycle", () => {
    const positive: SignedPermutation = { to: Int32Array.of(0), sign: Int8Array.of(1) };
    const negative: SignedPermutation = { to: Int32Array.of(0), sign: Int8Array.of(-1) };
    const identity = solveSignedPermutationIntertwiners([positive], [positive], PRIMES[0]);
    const obstruction = solveSignedPermutationIntertwiners([positive], [negative], PRIMES[0]);

    expect(identity.nullity).toBe(1);
    expect(identity.inconsistentComponentCount).toBe(0);
    expect(identity.basisRankSpectrum).toEqual({ "1": 1 });
    expect(identity.unitCombinationRank).toBe(1);
    expect(identity.allBasisMapsIntertwine).toBe(true);
    expect(identity.unitCombinationIntertwines).toBe(true);

    expect(obstruction.nullity).toBe(0);
    expect(obstruction.inconsistentComponentCount).toBe(1);
    expect(obstruction.basisRankSpectrum).toEqual({});
    expect(obstruction.unitCombinationRank).toBe(0);
    expect(obstruction.allBasisMapsIntertwine).toBe(true);
    expect(obstruction.unitCombinationIntertwines).toBe(true);
  });

  for (const field of PRIMES) {
    test(`identity and signed conjugacy calibrations have their declared full ranks over F_${field}`, () => {
      const calibration = measureIntertwinerCalibrations(field);

      expect(calibration.sourceIdentityIntertwines).toBe(true);
      expect(calibration.sourceIdentityRank).toBe(16);
      expect(calibration.targetIdentityIntertwines).toBe(true);
      expect(calibration.targetIdentityRank).toBe(128);
      expect(calibration.sourceConjugacyIntertwines).toBe(true);
      expect(calibration.sourceConjugacyRank).toBe(16);

      // The commutant has two rank-8 basis maps. Their declared all-unit combination reconstructs a
      // full-rank map, proving why largest-basis rank is not a maximum-over-the-nullspace claim.
      expect(calibration.sourceConjugacySolution.nullity).toBe(2);
      expect(calibration.sourceConjugacySolution.basisRankSpectrum).toEqual({ "8": 2 });
      expect(calibration.sourceConjugacySolution.maximalBasisRank).toBe(8);
      expect(calibration.sourceConjugacySolution.unitCombinationRank).toBe(16);
    });
  }

  test("the declared source and target satisfy Cl(0,7), while each target fault is detected before interpretation", () => {
    const baseline = measureFiniteAdinkraHalfSpinIntertwiner();
    const parityFault = measureFiniteAdinkraHalfSpinIntertwiner({ omitTargetJordanWignerParity: true });
    const coordinateFault = measureFiniteAdinkraHalfSpinIntertwiner({ flipTargetCoordinate: [0, 0] });
    const duplicateFault = measureFiniteAdinkraHalfSpinIntertwiner({ duplicateTargetGenerator: [6, 5] });

    expect(baseline.sourceCliffordViolations).toBe(0);
    expect(baseline.targetCliffordViolations).toBe(0);
    expect(parityFault.targetCliffordViolations).toBeGreaterThan(0);
    expect(coordinateFault.targetCliffordViolations).toBeGreaterThan(0);
    expect(duplicateFault.targetCliffordViolations).toBeGreaterThan(0);
    expect(baseline.regularity.status).toBe("unmeasured");
  });

  for (const field of PRIMES) {
    test(`the declared cross action has a rank-16 integer-sign intertwiner witness over F_${field}`, () => {
      const census = measureFiniteAdinkraHalfSpinIntertwiner({ field });

      expect(census.solution.nullity).toBe(16);
      expect(census.solution.consistentComponentCount).toBe(16);
      expect(census.solution.inconsistentComponentCount).toBe(0);
      expect(census.solution.componentSizeSpectrum).toEqual({ "128": 16 });
      expect(census.solution.basisRankSpectrum).toEqual({ "8": 16 });
      expect(census.solution.maximalBasisRank).toBe(8);
      expect(census.solution.unitCombinationRank).toBe(16);
      expect(census.solution.allBasisMapsIntertwine).toBe(true);
      expect(census.solution.unitCombinationIntertwines).toBe(true);
    });
  }

  test("the exact census is invariant under the declared source representative sweep", () => {
    for (const repSeed of [0, 1, 3, 5, 17, 85, 255]) {
      const census = measureFiniteAdinkraHalfSpinIntertwiner({ repSeed });
      expect(census.sourceCliffordViolations).toBe(0);
      expect(census.solution.nullity).toBe(16);
      expect(census.solution.basisRankSpectrum).toEqual({ "8": 16 });
      expect(census.solution.unitCombinationRank).toBe(16);
    }
  });

  for (const field of PRIMES) {
    test(`the altered sign, duplicated generator, and parity mutants destroy the declared witness over F_${field}`, () => {
      const coordinateFault = measureFiniteAdinkraHalfSpinIntertwiner({ field, flipTargetCoordinate: [0, 0] });
      const duplicateFault = measureFiniteAdinkraHalfSpinIntertwiner({ field, duplicateTargetGenerator: [6, 5] });
      const parityFault = measureFiniteAdinkraHalfSpinIntertwiner({ field, omitTargetJordanWignerParity: true });

      expect(coordinateFault.targetCliffordViolations).toBe(14);
      expect(coordinateFault.solution.nullity).toBe(0);
      expect(duplicateFault.targetCliffordViolations).toBe(128);
      expect(duplicateFault.solution.nullity).toBe(0);
      expect(parityFault.targetCliffordViolations).toBe(3584);
      expect(parityFault.solution.nullity).toBe(0);
    });
  }
});
