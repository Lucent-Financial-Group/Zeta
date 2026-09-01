/**
 * Dark Matter Observatory algebra lane: exact regression witnesses for the central-sector and
 * multiplicity decomposition. These tests preserve finite algebra only; regularity remains unmeasured.
 */

import { describe, expect, test } from "bun:test";
import { measureFiniteIntertwinerDecomposition } from "./nonquotient-adinkra-halfspin-decomposition";
import { PRIMES } from "./regular-representation-defect";

describe("finite coded-Adinkra / half-spin intertwiner decomposition", () => {
  for (const field of PRIMES) {
    test(`the central involution splits the source 8+8 and target 64+64 over F_${String(field)}`, () => {
      const census = measureFiniteIntertwinerDecomposition(field);

      for (const central of [census.source, census.target]) {
        expect(central.centralityViolations).toBe(0);
        expect(central.involutionViolations).toBe(0);
        expect(central.projectorLawViolations).toBe(0);
        expect(central.sectorPreservationViolations).toBe(0);
        expect(central.plusRank + central.minusRank).toBe(central.dimension);
      }
      expect([census.source.plusRank, census.source.minusRank].sort((a, b) => a - b)).toEqual([8, 8]);
      expect([census.target.plusRank, census.target.minusRank].sort((a, b) => a - b)).toEqual([64, 64]);
    });

    test(`the Hom-space separates into two eight-dimensional same-sign blocks over F_${String(field)}`, () => {
      const census = measureFiniteIntertwinerDecomposition(field);

      expect(census.hom.nullity).toBe(16);
      expect(census.homBlocks.dimensions).toEqual({
        "+→+": 8,
        "+→-": 0,
        "-→+": 0,
        "-→-": 8,
      });
      expect(census.homBlocks.basisRankSpectra).toEqual({
        "+→+": { "8": 8 },
        "+→-": {},
        "-→+": {},
        "-→-": { "8": 8 },
      });
    });

    test(`the source sectors are simple and inequivalent while the target multiplicities are 8+8 over F_${String(field)}`, () => {
      const census = measureFiniteIntertwinerDecomposition(field);

      expect(census.sourceCommutant.nullity).toBe(2);
      expect(census.sourceCommutantBlocks.dimensions).toEqual({
        "+→+": 1,
        "+→-": 0,
        "-→+": 0,
        "-→-": 1,
      });
      expect(census.targetCommutant.nullity).toBe(128);
      expect(census.targetCommutantBlocks.dimensions).toEqual({
        "+→+": 64,
        "+→-": 0,
        "-→+": 0,
        "-→-": 64,
      });
      expect(census.sourceGeneratedAlgebraRanks).toEqual({ "+": 64, "-": 64 });
      expect(census.targetGeneratedAlgebraRanks).toEqual({ "+": 64, "-": 64 });
      expect(census.finiteConclusion).toEqual({
        sourceSectorSimplicityWitness: true,
        sourceSectorsInequivalent: true,
        targetMultiplicityDimensions: { "+": 8, "-": 8 },
        targetCommutantDimensionMatchesMultiplicityPattern: true,
      });
      expect(census.regularity.status).toBe("unmeasured");
    });
  }

  test("the unordered decomposition is invariant across declared source representative choices", () => {
    for (const repSeed of [0, 1, 3, 5, 17, 85, 255]) {
      const census = measureFiniteIntertwinerDecomposition(PRIMES[0], repSeed);
      expect([census.source.plusRank, census.source.minusRank].sort((a, b) => a - b)).toEqual([8, 8]);
      expect(Object.values(census.homBlocks.dimensions).sort((a, b) => a - b)).toEqual([0, 0, 8, 8]);
      expect(census.sourceCommutant.nullity).toBe(2);
      expect(census.targetCommutant.nullity).toBe(128);
      expect(census.finiteConclusion.sourceSectorSimplicityWitness).toBe(true);
      expect(census.finiteConclusion.sourceSectorsInequivalent).toBe(true);
    }
  });

  test("characteristic two is rejected rather than silently pretending the projectors exist", () => {
    expect(() => measureFiniteIntertwinerDecomposition(2 as (typeof PRIMES)[number])).toThrow(
      "central projectors require odd characteristic",
    );
  });
});
