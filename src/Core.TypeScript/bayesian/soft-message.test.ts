/**
 * Falsifiers for the categorical message family.
 *
 * The claim worth testing is not "the arithmetic works". It is that NO SINGLE
 * PARTICIPANT CAN SILENCE A CANDIDATE — and that claim is only meaningful if
 * the test would catch its removal. §VETO RESISTANCE builds the attack
 * explicitly and shows it succeeding against the unbounded design, so the
 * passing test measures the clamp rather than assuming it.
 */

import { describe, expect, test } from "bun:test";
import {
  argmax,
  atInfluenceFloor,
  divide,
  fromLogWeights,
  MAX_INFLUENCE,
  product,
  SCALE,
  type SoftMessage,
  toDistribution,
  uniform,
} from "./soft-message";

/** A finite stand-in for the veto a caller might try to express. */
const VERY_STRONG_DISBELIEF = 1e9;

describe("group laws — exactly, because integers", () => {
  const a = fromLogWeights({ x: 1200, y: -300, z: 50 });
  const b = fromLogWeights({ x: -400, y: 900, w: 20 });
  const c = fromLogWeights({ y: 111, z: -222, w: -333 });

  test("uniform is the identity for product", () => {
    expect(product(a, uniform)).toEqual(a);
    expect(product(uniform, a)).toEqual(a);
  });

  test("product is commutative", () => {
    expect(product(a, b)).toEqual(product(b, a));
  });

  test("product is associative — EXACTLY, so message order cannot change a decision", () => {
    // The reason for integers rather than floats. With float log-weights this
    // holds only approximately, and "approximately associative" means two
    // agents that received the same evidence in different orders can reach
    // different argmaxes. That is a divergence bug wearing a rounding error.
    expect(product(product(a, b), c)).toEqual(product(a, product(b, c)));
  });

  test("divide inverts product — the EP cavity is exact", () => {
    const joint = product(a, b);
    const cavity = divide(joint, b);
    // Every key `a` mentions comes back at its original value.
    for (const k of Object.keys(a)) expect(cavity[k]).toBe(a[k]!);
    // Keys only `b` mentioned come back to 0 — no opinion, not weight zero.
    expect(cavity["w"]).toBe(0);
  });

  test("an absent key means NO OPINION, not impossible", () => {
    // The distinction the whole design rests on. `uniform` mentions nothing
    // and must therefore change nothing.
    const m = fromLogWeights({ only: 500 });
    expect(product(m, uniform)["only"]).toBe(500);
    expect(product(m, uniform)["anything-else"]).toBeUndefined();
  });
});

describe("VETO RESISTANCE — no single participant can silence a candidate", () => {
  /** The unbounded design, for contrast. This is what we are NOT shipping. */
  const unboundedProduct = (
    a: Record<string, number>,
    b: Record<string, number>,
  ): Record<string, number> => {
    const out: Record<string, number> = {};
    for (const k of new Set([...Object.keys(a), ...Object.keys(b)]))
      out[k] = (a[k] ?? 0) + (b[k] ?? 0);
    return out;
  };

  test("THE ATTACK SUCCEEDS against unbounded log-weights", () => {
    // One participant asserts weight zero (log −∞) for `dissent`. Then a
    // hundred participants, each strongly in favour, try to revive it.
    let joint: Record<string, number> = { dissent: -Infinity, consensus: 0 };
    for (let i = 0; i < 100; i++) {
      joint = unboundedProduct(joint, { dissent: 50 * SCALE, consensus: 0 });
    }
    // It is gone. Not unlikely — GONE, and unrecoverable by any finite evidence.
    expect(joint["dissent"]).toBe(-Infinity);
    expect(joint["dissent"]! > joint["consensus"]!).toBe(false);
  });

  test("...and FAILS against bounded influence, which is the point", () => {
    const attacker = fromLogWeights({ dissent: -VERY_STRONG_DISBELIEF, consensus: 0 });
    // The attacker's opinion was clamped to the floor, not honoured as −∞.
    expect(attacker["dissent"]).toBe(-MAX_INFLUENCE);

    let joint: SoftMessage = attacker;
    // A single supporter of equal strength is enough to cancel it exactly.
    joint = product(joint, fromLogWeights({ dissent: MAX_INFLUENCE, consensus: 0 }));
    expect(joint["dissent"]).toBe(0);

    // And one more makes the suppressed candidate the society's argmax.
    joint = product(joint, fromLogWeights({ dissent: MAX_INFLUENCE, consensus: 0 }));
    expect(joint["dissent"]).toBe(MAX_INFLUENCE);
    expect(argmax(joint)).toBe("dissent");
  });

  test("the bound is exactly what one participant may assert", () => {
    // Not a soft preference — an arithmetic ceiling. Ask for a thousand times
    // the bound and you get the bound.
    const shouting = fromLogWeights({ c: 1000 * MAX_INFLUENCE });
    expect(shouting["c"]).toBe(MAX_INFLUENCE);
    const whispering = fromLogWeights({ c: -1000 * MAX_INFLUENCE });
    expect(whispering["c"]).toBe(-MAX_INFLUENCE);
  });

  test("k attackers need k defenders — influence is linear, not absolute", () => {
    // The honest limit, asserted rather than glossed: bounded influence does
    // not make a candidate unsuppressable, it makes suppression COST
    // something proportional. Five attackers are outvoted by five supporters
    // and not by four. A majority can still bury a minority — what it cannot
    // do is bury it with one voice, or bury it irreversibly.
    const attack = (n: number): SoftMessage => {
      let m: SoftMessage = uniform;
      for (let i = 0; i < n; i++) m = product(m, fromLogWeights({ c: -MAX_INFLUENCE }));
      return m;
    };
    const defend = (m: SoftMessage, n: number): SoftMessage => {
      let out = m;
      for (let i = 0; i < n; i++) out = product(out, fromLogWeights({ c: MAX_INFLUENCE }));
      return out;
    };
    expect(defend(attack(5), 4)["c"]).toBe(-MAX_INFLUENCE);
    expect(defend(attack(5), 5)["c"]).toBe(0);
    expect(defend(attack(5), 6)["c"]).toBe(MAX_INFLUENCE);
  });
});

describe("the cavity cannot blow up — same clamp, second problem", () => {
  test("dividing by a floor-clamped message stays finite", () => {
    const suppressor = fromLogWeights({ c: -VERY_STRONG_DISBELIEF });
    const joint = product(fromLogWeights({ c: 0 }), suppressor);
    const cavity = divide(joint, suppressor);
    expect(Number.isFinite(cavity["c"]!)).toBe(true);
    expect(cavity["c"]).toBe(0);
  });

  test("no operation produces NaN or Infinity, over the whole bound range", () => {
    const extremes = [-MAX_INFLUENCE, -1, 0, 1, MAX_INFLUENCE];
    for (const l of extremes) {
      for (const r of extremes) {
        const a = fromLogWeights({ c: l });
        const b = fromLogWeights({ c: r });
        for (const v of [product(a, b)["c"]!, divide(a, b)["c"]!]) {
          expect(Number.isFinite(v)).toBe(true);
          expect(Number.isNaN(v)).toBe(false);
        }
      }
    }
  });

  test("an infinite log-weight is REFUSED, not silently reinterpreted", () => {
    // Clamping −Infinity to the floor would be the friendly thing and the
    // wrong thing: it hides a caller who believes they can express certainty.
    expect(() => fromLogWeights({ c: -Infinity })).toThrow(/permanent veto/);
    expect(() => fromLogWeights({ c: Number.NaN })).toThrow();
  });
});

describe("dual-use — the module reports facts and refuses verdicts", () => {
  test("atInfluenceFloor names the clamped candidates and says nothing more", () => {
    const m = fromLogWeights({ suppressed: -VERY_STRONG_DISBELIEF, ordinary: -5, loud: 1e9 });
    expect(atInfluenceFloor(m)).toEqual(["suppressed"]);
  });

  test("the SAME fact carries opposite readings, which is why there is no verdict", () => {
    // An adversary suppressing a candidate, and an honest sensor that has
    // simply never observed it, produce byte-identical messages. No function
    // here can tell them apart, and one that claimed to would be lying.
    const adversary = fromLogWeights({ c: -VERY_STRONG_DISBELIEF });
    const honestSensorWithNoData = fromLogWeights({ c: -VERY_STRONG_DISBELIEF });
    expect(adversary).toEqual(honestSensorWithNoData);
    expect(atInfluenceFloor(adversary)).toEqual(atInfluenceFloor(honestSensorWithNoData));
    // Any `detectSuppressionAttack` would have to invent the difference.
  });
});

describe("the exit to decision space", () => {
  test("toDistribution normalizes, and floats appear only here", () => {
    const d = toDistribution(fromLogWeights({ a: 0, b: 0 }));
    expect(d["a"]).toBeCloseTo(0.5, 10);
    expect(d["b"]).toBeCloseTo(0.5, 10);
    const total = Object.values(d).reduce((s, v) => s + v, 0);
    expect(total).toBeCloseTo(1, 10);
  });

  test("a floored candidate keeps NON-ZERO probability — quiet, not deleted", () => {
    // The values claim, made arithmetic. Down-weighted, never removed: the
    // minority candidate is the one carrying information when the majority is
    // wrong, so it has to stay reachable.
    const d = toDistribution(fromLogWeights({ minority: -VERY_STRONG_DISBELIEF, majority: 0 }));
    expect(d["minority"]!).toBeGreaterThan(0);
    expect(d["minority"]!).toBeLessThan(d["majority"]!);
  });

  test("argmax ties break by ascending key, matching the SoftValue oracle", () => {
    expect(argmax(fromLogWeights({ b: 5, a: 5 }))).toBe("a");
    expect(argmax(uniform)).toBeNull();
  });
});
