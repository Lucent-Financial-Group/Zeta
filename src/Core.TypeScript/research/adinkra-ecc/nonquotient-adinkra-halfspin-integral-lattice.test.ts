/** Exact integer-lattice selector controls; regularity and universal canonicity remain unmeasured. */

import { describe, expect, test } from "bun:test";
import { measureFiniteIntertwinerIntegralLattice } from "./nonquotient-adinkra-halfspin-integral-lattice";
import { PRIMES } from "./regular-representation-defect";

describe("finite intertwiner integral lattice", () => {
  for (const field of PRIMES) {
    test(`all 64 minimum-support maps have the same measured integer invariants over F_${String(field)}`, () => {
      const census = measureFiniteIntertwinerIntegralLattice(field);

      expect(census.candidateCount).toBe(64);
      expect(census.fullRankCandidateCount).toBe(64);
      expect(census.supportSpectrum).toEqual({ "256": 64 });
      expect(census.frobeniusNormSquaredSpectrum).toEqual({ "256": 64 });
      expect(census.selectedMinorDeterminantSpectrum).toEqual({ "256": 64 });
      expect(census.modTwoRankSpectrum).toEqual({ "8": 64 });
      expect(census.primitiveCandidateCount).toBe(0);
      expect(census.selectorVerdict.primitiveIntegerConstraint).toBe("all nonprimitive; 64-way tie");
      expect(census.selectorVerdict.minimumSupportConstraint).toBe("64-way tie");
      expect(census.selectorVerdict.minimumNormConstraint).toBe("64-way tie");
    });

    test(`the integral signed-permutation subgroup has eight measured orbits over F_${String(field)}`, () => {
      const census = measureFiniteIntertwinerIntegralLattice(field);

      expect(census.signedPermutationCommutantOrbit).toEqual({
        availableIntegralAutomorphisms: 128,
        referenceOrbitSize: 8,
        orbitCount: 8,
        expectedCandidatePairs: 64,
        transitive: false,
      });
      expect(census.orientationReversal).toEqual({
        swapsSectorLabels: true,
        preservesUnorderedCandidateSet: true,
      });
      expect(census.selectorVerdict.signedPermutationEquivalence).toBe("multiple measured orbits");
      expect(census.selectorVerdict.testedIntegralSelectorCanonical).toBe(false);
      expect(census.selectorVerdict.universalCanonicalSelectorClaim).toBe("not established");
      expect(census.regularity.status).toBe("unmeasured");
    });
  }

  test("the lattice census is invariant across declared representative choices", () => {
    for (const repSeed of [0, 1, 255]) {
      const census = measureFiniteIntertwinerIntegralLattice(PRIMES[0], repSeed);
      expect(census.supportSpectrum).toEqual({ "256": 64 });
      expect(census.frobeniusNormSquaredSpectrum).toEqual({ "256": 64 });
      expect(census.selectedMinorDeterminantSpectrum).toEqual({ "256": 64 });
      expect(census.modTwoRankSpectrum).toEqual({ "8": 64 });
      expect(census.signedPermutationCommutantOrbit.orbitCount).toBe(8);
    }
  }, 30_000);
});
