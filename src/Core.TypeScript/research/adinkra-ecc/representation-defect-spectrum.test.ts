import { describe, expect, test } from "bun:test";
import { PRIMES } from "./regular-representation-defect";
import {
  codewordSupportMasks,
  measureRepresentationDefectSpectrum,
  requireMeasuredRegularity,
} from "./representation-defect-spectrum";

describe("finite Adinkra representation-defect spectrum", () => {
  test("the uncoded and coded full-colour lanes expose defects 1 and 16 by matrix/coset comparison", () => {
    const spectrum = measureRepresentationDefectSpectrum();

    expect(spectrum.uncoded.regularity).toEqual({
      status: "measured",
      carrierDimension: 256,
      operatorDimension: 256,
      defect: 1,
      freeRankOne: true,
    });
    expect(spectrum.coded.codeDimension).toBe(4);
    expect(spectrum.coded.codewordCount).toBe(16);
    expect(spectrum.coded.regularity).toEqual({
      status: "measured",
      carrierDimension: 16,
      operatorDimension: 256,
      defect: 16,
      freeRankOne: false,
    });
  }, 60_000);

  test("the measured full-lane defects are stable across both finite-field rank primes", () => {
    const [first, second] = PRIMES.map((prime) => measureRepresentationDefectSpectrum(-1, prime));
    expect(first?.uncoded.regularity).toEqual(second?.uncoded.regularity);
    expect(first?.coded.regularity).toEqual(second?.coded.regularity);
    expect(first?.colouredResidue.regularity).toEqual(second?.colouredResidue.regularity);
  }, 30_000);

  test("the coloured residue is a non-canonical family: 56 working subsets and balanced colours", () => {
    const residue = measureRepresentationDefectSpectrum().colouredResidue;

    expect(residue.selectedColourCount).toBe(4);
    expect(residue.candidateSubsetCount).toBe(70);
    expect(residue.workingSubsetCount).toBe(56);
    expect(residue.failingSubsetCount).toBe(14);
    expect(residue.perColourWorkingInclusions).toEqual([28, 28, 28, 28, 28, 28, 28, 28]);
    expect(residue.canonicalSelection).toBe(false);
    expect(residue.regularity).toEqual({
      status: "measured",
      carrierDimension: 16,
      operatorDimension: 16,
      defect: 1,
      freeRankOne: true,
    });
  });

  test("fault control: every weight-four codeword support is a failing colour subset", () => {
    const residue = measureRepresentationDefectSpectrum().colouredResidue;
    const byMask = new Map(residue.witnesses.map((witness) => [witness.colourMask, witness]));

    const supports = codewordSupportMasks();
    expect(supports).toHaveLength(14);
    for (const support of supports) {
      const witness = byMask.get(support);
      expect(witness).toBeDefined();
      expect(witness?.freeRankOne).toBe(false);
      expect(witness?.orbitRank).toBeLessThan(16);
    }
  });

  test("fault control: a working subset becomes non-free when replaced by a codeword support", () => {
    const residue = measureRepresentationDefectSpectrum().colouredResidue;
    const working = residue.witnesses.find((witness) => witness.freeRankOne);
    const failing = residue.witnesses.find((witness) => !witness.freeRankOne);

    expect(working).toBeDefined();
    expect(working?.orbitRank).toBe(16);
    expect(failing).toBeDefined();
    expect(failing?.orbitRank).toBeLessThan(16);
  });

  test("the non-quotient bivector/spinor lane refuses a fabricated regularity score", () => {
    const lane = measureRepresentationDefectSpectrum().bivectorSpinor;

    expect(lane.quotientApplied).toBe(false);
    expect(lane.bivectorDimension).toBe(120);
    expect(lane.halfSpinorDimension).toBe(128);
    expect(lane.totalDimension).toBe(248);
    expect(lane.actionCensus.gammaAnticommutatorViolations).toBe(0);
    expect(lane.actionCensus.chiralityViolations).toBe(0);
    expect(lane.actionCensus.bivectorCommutatorViolations).toBe(0);
    expect(lane.bracketCensus).toMatchObject({
      carrierDimension: 128,
      bivectorGeneratorCount: 120,
      bracketAntisymmetryViolations: 0,
      actionNormalizationViolations: 0,
      bracketEquivarianceViolations: 0,
      mixedJacobiViolations: 0,
    });
    expect(lane.regularity.status).toBe("unmeasured");
    if (lane.regularity.status === "unmeasured") {
      expect(lane.regularity.missingWitnesses).toEqual([
        "an injectivity test for the declared spinor bracket",
        "a separately declared regular-module carrier",
        "a rank-one-freeness test",
      ]);
    }
    expect(() => requireMeasuredRegularity(lane.regularity)).toThrow("regularity is unmeasured");
  });

  test("the coded-to-half-spin lane exposes the rank-16 finite witness without promoting it to regularity", () => {
    const lane = measureRepresentationDefectSpectrum().codedHalfSpinIntertwiner;

    expect(lane.sourceDimension).toBe(16);
    expect(lane.targetDimension).toBe(128);
    expect(lane.evenGeneratorCount).toBe(7);
    expect(lane.census.sourceCliffordViolations).toBe(0);
    expect(lane.census.targetCliffordViolations).toBe(0);
    expect(lane.census.solution.nullity).toBe(16);
    expect(lane.census.solution.basisRankSpectrum).toEqual({ "8": 16 });
    expect(lane.census.solution.unitCombinationRank).toBe(16);
    expect(lane.census.solution.unitCombinationIntertwines).toBe(true);
    expect(lane.decompositionCensus.homBlocks.dimensions).toEqual({
      "+→+": 8,
      "+→-": 0,
      "-→+": 0,
      "-→-": 8,
    });
    expect(lane.decompositionCensus.sourceCommutant.nullity).toBe(2);
    expect(lane.decompositionCensus.targetCommutant.nullity).toBe(128);
    expect(lane.decompositionCensus.finiteConclusion).toEqual({
      sourceSectorSimplicityWitness: true,
      sourceSectorsInequivalent: true,
      targetMultiplicityDimensions: { "+": 8, "-": 8 },
      targetCommutantDimensionMatchesMultiplicityPattern: true,
    });
    expect(lane.selectorCensus.coefficientBoundaryControls).toEqual({
      zeroRank: 0,
      plusOnlyRank: 8,
      minusOnlyRank: 8,
      bothSectorsRank: 16,
    });
    expect(lane.selectorCensus.minimumSupportSelector.candidatePairCount).toBe(64);
    expect(lane.selectorCensus.balancedGramSelector.minimizerCountBeforeLexicographicTieBreak).toBe(64);
    expect(lane.selectorCensus.canonicality).toEqual({
      presentationDeterministic: true,
      testedSelectorsNaturalUnderBasisOrientation: false,
      testedSelectorsModuleCanonical: false,
      universalCanonicalSelectorClaim: "not established",
    });
    expect(lane.commutantGroupCensus.finiteConclusion).toEqual({
      commutantAlgebra: "Mat(8,F_p) ⊕ Mat(8,F_p)",
      automorphismGroup: "GL(8,F_p) × GL(8,F_p)",
      canonicalEmbeddingOrbit: "single orbit under target-module automorphisms",
      physicalGaugeGroupClaim: "not made",
    });
    expect(lane.commutantGroupCensus.controls.singular.acceptedAsGroupElement).toBe(false);
    expect(lane.commutantGroupCensus.controls.noncommuting.acceptedAsCommutantElement).toBe(false);
    expect(lane.integralLatticeCensus.candidateCount).toBe(64);
    expect(lane.integralLatticeCensus.primitiveCandidateCount).toBe(0);
    expect(lane.integralLatticeCensus.selectedMinorDeterminantSpectrum).toEqual({ "256": 64 });
    expect(lane.integralLatticeCensus.modTwoRankSpectrum).toEqual({ "8": 64 });
    expect(lane.integralLatticeCensus.signedPermutationCommutantOrbit).toMatchObject({
      referenceOrbitSize: 8,
      orbitCount: 8,
      transitive: false,
    });
    expect(lane.regularity.status).toBe("unmeasured");
    expect(() => requireMeasuredRegularity(lane.regularity)).toThrow("regularity is unmeasured");
  });
});
