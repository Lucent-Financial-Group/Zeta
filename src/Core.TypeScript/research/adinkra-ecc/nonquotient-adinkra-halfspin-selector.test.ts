/**
 * Dark Matter Observatory algebra lane: selector fault controls. A deterministic presentation
 * choice is not called canonical when basis orientation or a target-module automorphism moves it.
 */

import { describe, expect, test } from "bun:test";
import { measureFiniteIntertwinerSelectors } from "./nonquotient-adinkra-halfspin-selector";
import { PRIMES } from "./regular-representation-defect";

const EXPECTED_PROJECTIVE_COUNTS: Readonly<Record<(typeof PRIMES)[number], string>> = {
  1_000_003: "1000044000900011344098444622274954978710349778979216628882229380606160830628490758400",
  999_983: "999764025858256224848037770421929319196307604158950106653043409522135837291290726400",
};

describe("finite coded-Adinkra / half-spin selector census", () => {
  for (const field of PRIMES) {
    test(`full-rank embedding classes form the declared projective product over F_${String(field)}`, () => {
      const census = measureFiniteIntertwinerSelectors(field);

      expect(census.multiplicities).toEqual({ "+": 8, "-": 8 });
      expect(census.projectiveEmbeddingClassCount).toBe(EXPECTED_PROJECTIVE_COUNTS[field]);
      expect(census.fullRankCriterion).toEqual({
        sourceSectorsSimple: true,
        crossHomBlocksVanish: true,
        statement: "rank 16 iff both central coefficient vectors are nonzero",
      });
      expect(census.coefficientBoundaryControls).toEqual({
        zeroRank: 0,
        plusOnlyRank: 8,
        minusOnlyRank: 8,
        bothSectorsRank: 16,
      });
    });

    test(`every tested selector is an intertwiner but none survives the canonicity controls over F_${String(field)}`, () => {
      const census = measureFiniteIntertwinerSelectors(field);

      expect(census.unitComponentSelector.rank).toBe(16);
      expect(census.unitComponentSelector.intertwines).toBe(true);
      expect(census.unitComponentSelector.negatedBasisComponentRank).toBe(16);
      expect(census.unitComponentSelector.basisOrientationInvariantImage).toBe(false);
      expect(census.unitComponentSelector.targetAutomorphism).toMatchObject({
        found: true,
        rank: 128,
        movedImage: true,
      });

      expect(census.minimumSupportSelector).toMatchObject({
        rank: 16,
        intertwines: true,
        supportComponentCount: 2,
        minimalComponentCount: 2,
        candidatePairCount: 64,
        allCandidatePairsHaveRank16: true,
      });
      expect(census.minimumSupportSelector.targetAutomorphism).toMatchObject({
        found: true,
        rank: 128,
        movedImage: true,
      });

      expect(census.balancedGramSelector).toMatchObject({
        rank: 16,
        intertwines: true,
        supportComponentCount: 2,
        minimizerCountBeforeLexicographicTieBreak: 64,
        minimumOffDiagonalEnergy: 0,
        minimumDiagonalSpread: 0,
      });
      expect(census.balancedGramSelector.targetAutomorphism).toMatchObject({
        found: true,
        rank: 128,
        movedImage: true,
      });

      expect(census.canonicality).toEqual({
        presentationDeterministic: true,
        testedSelectorsNaturalUnderBasisOrientation: false,
        testedSelectorsModuleCanonical: false,
        universalCanonicalSelectorClaim: "not established",
      });
      expect(census.regularity.status).toBe("unmeasured");
    });
  }

  test("selector verdicts are stable across representative choices without equating the selected matrices", () => {
    for (const repSeed of [0, 1, 3, 5, 17, 85, 255]) {
      const census = measureFiniteIntertwinerSelectors(PRIMES[0], repSeed);
      expect(census.coefficientBoundaryControls).toEqual({
        zeroRank: 0,
        plusOnlyRank: 8,
        minusOnlyRank: 8,
        bothSectorsRank: 16,
      });
      expect(census.minimumSupportSelector.candidatePairCount).toBe(64);
      expect(census.balancedGramSelector.minimizerCountBeforeLexicographicTieBreak).toBe(64);
      expect(census.unitComponentSelector.basisOrientationInvariantImage).toBe(false);
      expect(census.canonicality.testedSelectorsModuleCanonical).toBe(false);
    }
  }, 20_000);
});
