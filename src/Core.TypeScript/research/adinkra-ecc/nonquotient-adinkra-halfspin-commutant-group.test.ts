/** Exact finite target-commutant group witnesses; no physical symmetry claim. */

import { describe, expect, test } from "bun:test";
import { measureFiniteHalfSpinCommutantGroup } from "./nonquotient-adinkra-halfspin-commutant-group";
import { PRIMES } from "./regular-representation-defect";

describe("finite half-spin target commutant group", () => {
  for (const field of PRIMES) {
    test(`the two target sectors expose complete Mat(8,F_p) commutant actions over F_${String(field)}`, () => {
      const census = measureFiniteHalfSpinCommutantGroup(field);

      for (const sign of ["+", "-"] as const) {
        expect(census.sectorAlgebra[sign]).toEqual({
          homDimension: 8,
          commutantDimension: 64,
          inducedMatrixUnitCount: 64,
          distinctMatrixUnitCount: 64,
          matrixUnitActionViolations: 0,
          identityLiftRank: 64,
        });
      }
      expect(census.finiteConclusion.commutantAlgebra).toBe("Mat(8,F_p) ⊕ Mat(8,F_p)");
      expect(census.finiteConclusion.automorphismGroup).toBe("GL(8,F_p) × GL(8,F_p)");
    });

    test(`the group order, orbit, and stabilizer arithmetic close exactly over F_${String(field)}`, () => {
      const census = measureFiniteHalfSpinCommutantGroup(field);
      const perSector = BigInt(census.unitGroup.perSectorOrder);
      const total = BigInt(census.unitGroup.totalOrder);
      const orbit = BigInt(census.unitGroup.nonzeroCoefficientOrbitSize);
      const stabilizer = BigInt(census.unitGroup.perSectorNonzeroVectorStabilizerOrder);

      expect(total).toBe(perSector * perSector);
      expect(orbit).toBe(BigInt(field) ** 8n - 1n);
      expect(stabilizer * orbit).toBe(perSector);
      expect(census.unitGroup.fullEmbeddingPairOrbitCount).toBe(1);
      expect(census.finiteConclusion.canonicalEmbeddingOrbit).toBe("single orbit under target-module automorphisms");
    });

    test(`invertible matrix units act while singular and non-commuting faults are rejected over F_${String(field)}`, () => {
      const census = measureFiniteHalfSpinCommutantGroup(field);

      expect(census.controls.identity).toEqual({ rank: 64, commutatorViolations: 0 });
      expect(census.controls.transvection).toEqual({
        rank: 64,
        commutatorViolations: 0,
        changesCoefficient: true,
      });
      expect(census.controls.swap).toEqual({
        rank: 64,
        commutatorViolations: 0,
        changesCoefficient: true,
      });
      expect(census.controls.singular).toEqual({
        rank: 56,
        commutatorViolations: 0,
        acceptedAsGroupElement: false,
      });
      expect(census.controls.noncommuting).toEqual({
        rank: 64,
        commutatorViolations: 384,
        acceptedAsCommutantElement: false,
      });
      expect(census.finiteConclusion.physicalGaugeGroupClaim).toBe("not made");
      expect(census.regularity.status).toBe("unmeasured");
    });
  }

  test("the structural group census is invariant across source representative choices", () => {
    for (const repSeed of [0, 1, 255]) {
      const census = measureFiniteHalfSpinCommutantGroup(PRIMES[0], repSeed);
      expect(census.sectorAlgebra["+"].matrixUnitActionViolations).toBe(0);
      expect(census.sectorAlgebra["-"].matrixUnitActionViolations).toBe(0);
      expect(census.finiteConclusion.automorphismGroup).toBe("GL(8,F_p) × GL(8,F_p)");
      expect(census.unitGroup.fullEmbeddingPairOrbitCount).toBe(1);
    }
  }, 30_000);
});
