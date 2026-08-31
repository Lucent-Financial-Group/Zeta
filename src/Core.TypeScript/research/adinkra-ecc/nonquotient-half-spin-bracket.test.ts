import { describe, expect, test } from "bun:test";
import { measureFiniteHalfSpinBracket } from "./nonquotient-half-spin-bracket";

describe("finite non-quotient half-spin bracket census", () => {
  test("the separately declared reversion pairing satisfies the finite basis checks while the naive pairing is falsified", () => {
    const naive = measureFiniteHalfSpinBracket();
    const census = measureFiniteHalfSpinBracket({ applyTopWedgeReversion: true });

    expect(census.carrierDimension).toBe(128);
    expect(census.bivectorGeneratorCount).toBe(120);
    expect(census.bracketAntisymmetryViolations).toBe(0);
    expect(census.actionNormalizationViolations).toBe(0);
    expect(census.bracketEquivarianceViolations).toBe(0);
    expect(census.mixedJacobiViolations).toBe(0);
    expect(census.firstMixedJacobiWitness).toBeNull();

    expect(naive.bracketAntisymmetryViolations).toBeGreaterThan(0);
    expect(naive.bracketEquivarianceViolations).toBeGreaterThan(0);
    expect(naive.mixedJacobiViolations).toBeGreaterThan(0);
  }, 180_000);

  test("every targeted mutant is killed against the reversion-signed candidate", () => {
    const parityMutant = measureFiniteHalfSpinBracket({ applyTopWedgeReversion: true, omitJordanWignerParity: true });
    const pairingMutant = measureFiniteHalfSpinBracket({ applyTopWedgeReversion: true, omitTopWedgeOrderSign: true });
    const normalizationMutant = measureFiniteHalfSpinBracket({ applyTopWedgeReversion: true, omitBivectorHalf: true });
    const componentMutant = measureFiniteHalfSpinBracket({ applyTopWedgeReversion: true, flipBracketCoordinate: [0, 1] });
    const conjugationMutant = measureFiniteHalfSpinBracket({ applyTopWedgeReversion: true, conjugatePairingRight: true });

    expect(parityMutant.actionNormalizationViolations).toBeGreaterThan(0);
    expect(pairingMutant.bracketAntisymmetryViolations).toBeGreaterThan(0);
    expect(normalizationMutant.actionNormalizationViolations).toBeGreaterThan(0);
    expect(componentMutant.bracketEquivarianceViolations).toBeGreaterThan(0);
    expect(componentMutant.mixedJacobiViolations).toBeGreaterThan(0);
    expect(conjugationMutant.bracketEquivarianceViolations).toBeGreaterThan(0);
    expect(conjugationMutant.mixedJacobiViolations).toBeGreaterThan(0);
  }, 360_000);
});
