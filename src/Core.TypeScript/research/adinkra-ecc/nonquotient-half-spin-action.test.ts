import { describe, expect, test } from "bun:test";
import { gammaAction, measureNonQuotientHalfSpinAction } from "./nonquotient-half-spin-action";

describe("finite non-quotient half-spin action census", () => {
  test("measures the complexified so(16) action on the 128-state positive-chirality carrier", () => {
    const census = measureNonQuotientHalfSpinAction();

    expect(census.cliffordGeneratorCount).toBe(16);
    expect(census.fullCarrierDimension).toBe(256);
    expect(census.positiveChiralityDimension).toBe(128);
    expect(census.negativeChiralityDimension).toBe(128);
    expect(census.bivectorGeneratorCount).toBe(120);
    expect(census.gammaAnticommutatorViolations).toBe(0);
    expect(census.chiralityViolations).toBe(0);
    expect(census.gramDiagonalViolations).toBe(0);
    expect(census.gramOffDiagonalViolations).toBe(0);
    expect(census.bivectorCommutatorViolations).toBe(0);
  }, 30_000);

  test("the Y-like gamma generator has the declared complex phase on empty and occupied modes", () => {
    expect(gammaAction(1, 0)).toEqual({ target: 1, coefficient: { re: 0, im: 1 } });
    expect(gammaAction(1, 1)).toEqual({ target: 0, coefficient: { re: 0, im: -1 } });
  });

  test("fault control: removing the Jordan-Wigner parity string breaks the Clifford and Lie controls", () => {
    const mutant = measureNonQuotientHalfSpinAction({ omitJordanWignerParity: true });

    expect(mutant.gammaAnticommutatorViolations).toBeGreaterThan(0);
    expect(mutant.bivectorCommutatorViolations).toBeGreaterThan(0);
  }, 30_000);

  test("the carrier action still refuses a regularity score without the spinor bracket and mixed Jacobi witnesses", () => {
    const census = measureNonQuotientHalfSpinAction();

    expect(census.regularity.status).toBe("unmeasured");
    expect(census.regularity.missingWitnesses).toContain("spinor-spinor bracket Lambda^2(S+) -> so(16)");
  }, 30_000);
});

describe("chirality counter non-vacuity (2026-09-05 math review)", () => {
  // `chiralityViolations` returned 0 for every input and every option, including the
  // omitJordanWignerParity mutant - which touches only coefficients, never targets. It was a
  // check that could not fail. These two tests are the pair that makes it a check.
  test("fault control: freezing generator 0 alone DOES move the chirality counter", () => {
    const mutant = measureNonQuotientHalfSpinAction({ freezeFirstGeneratorToggle: true });

    expect(mutant.chiralityViolations).toBeGreaterThan(0);
  }, 30_000);

  test("the pre-existing parity-string mutant does NOT move it - which is why one was missing", () => {
    // Pins the diagnosis itself: the census's only fault injection could never have caught a
    // chirality break, so `chiralityViolations).toBe(0)` above was passing vacuously. If this
    // ever starts failing, the two mutants have stopped being independent and the claim in
    // countChiralityViolations' docstring needs re-deriving.
    const mutant = measureNonQuotientHalfSpinAction({ omitJordanWignerParity: true });

    expect(mutant.chiralityViolations).toBe(0);
  }, 30_000);
});
