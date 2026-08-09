import { describe, expect, test } from "bun:test";

import { allCodewords, e8Roots, gp, measure, reverse } from "./e8-blade-mask-sandwich";

// FROZEN-CORE §B measurement — golden numbers. These constants ARE the banked
// result (2026-08-09): re-running the measurement must reproduce them bit-for-
// bit (integer arithmetic throughout; DST-trivially deterministic).

describe("construction fidelity (against the F# oracles' definitions)", () => {
  test("Construction A over the [8,4] code yields the 240 roots, all norm² = 4", () => {
    const roots = e8Roots();
    expect(roots).toHaveLength(240);
    expect(roots.every((r) => r.reduce((a, c) => a + c * c, 0) === 4)).toBe(true);
    // 16 even + 14·16 odd, and no duplicates.
    expect(new Set(roots.map((r) => r.join(","))).size).toBe(240);
  });

  test("Cl(3,0) product sanity: e1·e1 = 1, e1·e2 = e12 = −e2·e1", () => {
    const e1 = [0, 1, 0, 0, 0, 0, 0, 0];
    const e2 = [0, 0, 1, 0, 0, 0, 0, 0];
    expect(gp(e1, e1)).toEqual([1, 0, 0, 0, 0, 0, 0, 0]);
    expect(gp(e1, e2)).toEqual([0, 0, 0, 1, 0, 0, 0, 0]);
    expect(gp(e2, e1)).toEqual([0, 0, 0, -1, 0, 0, 0, 0]);
    // reverse flips grade-2/3 blades only
    expect(reverse([1, 2, 3, 4, 5, 6, 7, 8])).toEqual([1, 2, 3, -4, 5, -6, -7, -8]);
  });
});

describe("the measurement — golden numbers, banked 2026-08-09", () => {
  const m = measure();

  test("baseline: classical R⁸ reflection preserves ALL 57,600 pairs (theorem check)", () => {
    expect(m.classicalPreserved).toBe(57600);
  });

  test("exactly 32 bridged roots are versor-normed, on exactly 10 supports", () => {
    expect(m.versorNormedCount).toBe(32);
    // The 8 single blades + the two Clifford-aligned weight-4 codewords:
    // {1,2,5,6} = {e1,e2,e13,e23} and {0,3,4,7} = {S,e12,e3,e123} — the
    // XOR-closed subgroup {0,3,4,7} (subalgebra of e12,e3) and its coset.
    expect(m.versorNormedSupports).toEqual([
      "0",
      "0+3+4+7",
      "1",
      "1+2+5+6",
      "2",
      "3",
      "4",
      "5",
      "6",
      "7",
    ]);
  });

  test("the versor-normed 32 preserve ALL roots — a perfect symmetry fragment", () => {
    expect(m.versorPreserved).toBe(32 * 240);
  });

  test("the sandwich is NOT a reflection action: 11,776 of 57,600 pairs preserved", () => {
    expect(m.integerImages).toBe(33024);
    expect(m.rootImages).toBe(11776);
    expect(m.identityFixedPairs).toBe(352);
  });

  test("quantized per-A preservation: {0:160, 64:32, 128:16, 240:32}", () => {
    expect(m.perAHistogram).toEqual([
      [0, 160],
      [64, 32],
      [128, 16],
      [240, 32],
    ]);
  });

  // ── Otto + Lumen review 2026-08-09: pin the CORRECT characterization ────────
  // Two earlier explanations of "why these two supports" were wrong. These tests
  // discriminate all three criteria head-to-head so neither can come back.
  const weight4Supports = () =>
    allCodewords()
      .filter((c) => c.reduce((a: number, b: number) => a + b, 0) === 4)
      .map((c) => c.map((b: number, i: number) => (b ? i : -1)).filter((i: number) => i >= 0));

  const SURVIVING = ["0,3,4,7", "1,2,5,6"];

  test("pseudoscalar CLOSURE (i -> i^7) selects EXACTLY the two surviving supports", () => {
    const iClosed = weight4Supports().filter((s) => {
      const S = new Set(s);
      return s.every((v) => S.has(v ^ 7));
    });
    expect(iClosed.map((s) => s.join(",")).sort()).toEqual([...SURVIVING].sort());
  });

  test("XOR-closed subgroup is UNDER-determined — 3 matches, not 2", () => {
    // The first stated explanation. Necessary, not sufficient.
    const subs = weight4Supports().filter((s) => {
      const S = new Set(s);
      if (!S.has(0)) return false;
      return s.every((a) => s.every((b) => S.has(a ^ b)));
    });
    expect(subs.length).toBe(3);
  });

  test("grade-completeness explains only HALF — {1,2,5,6} is not grade-complete", () => {
    // The second stated explanation ("unique grade-complete subalgebra").
    // It cannot be the criterion: the OTHER survivor has grades {1,1,2,2} and
    // contains neither the scalar (0) nor the pseudoscalar (7).
    const grade = (i: number) => ((i >> 0) & 1) + ((i >> 1) & 1) + ((i >> 2) & 1);
    const profile = (s: number[]) => s.map(grade).sort().join(",");
    expect(profile([0, 3, 4, 7])).toBe("0,1,2,3");
    expect(profile([1, 2, 5, 6])).toBe("1,1,2,2");
    expect([1, 2, 5, 6].includes(0)).toBe(false);
    expect([1, 2, 5, 6].includes(7)).toBe(false);
    // And "contains the pseudoscalar" alone is far too weak.
    expect(weight4Supports().filter((s) => s.includes(7)).length).toBe(7);
  });

  test("closure is coset-invariant — which is WHY it explains both survivors", () => {
    // {1,2,5,6} = 1 XOR {0,3,4,7}. Closure under i -> i^7 survives coset
    // translation; "contains 7" does not. One criterion, both survivors.
    const coset = [0, 3, 4, 7].map((v) => v ^ 1).sort((a, b) => a - b);
    expect(coset).toEqual([1, 2, 5, 6]);
    const S = new Set(coset);
    expect(coset.every((v) => S.has(v ^ 7))).toBe(true);
    expect(coset.includes(7)).toBe(false);
  });

});
