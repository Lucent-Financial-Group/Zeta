/**
 * bonsai.test.ts — TS reference (oracle #1) for the Bonsai-subset serializer
 * (B-0976 slice 1).
 *
 * Three duties (mirroring the algebra-ladder oracles):
 *   1. **Canonical serialize is byte-exact** — `serialize(expr) === canonical`
 *      for every shared golden vector (the cross-language parity lock the
 *      F#/C#/Rust twins will also cast: same compact JSON, same fixed key order).
 *   2. **`parse` round-trips** — `equals(parse(canonical), expr)` and
 *      `serialize(parse(canonical)) === canonical` (the canonical string is the
 *      fixed point).
 *   3. **Structural laws** — `equals` is reflexive; `serialize ∘ parse ∘
 *      serialize == serialize`; unknown kinds are rejected (no silent accept).
 */

import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join as pathJoin } from "node:path";
import { equals, type Expr, parse, serialize } from "./bonsai";

interface GoldenCase {
  readonly name: string;
  readonly note: string;
  readonly expr: Expr;
  readonly canonical: string;
}
interface Golden {
  readonly description: string;
  readonly version: number;
  readonly cases: readonly GoldenCase[];
}

const golden: Golden = JSON.parse(
  readFileSync(pathJoin(import.meta.dir, "golden-vectors.json"), "utf8"),
) as Golden;

describe("Bonsai-subset — golden vectors (oracle #1 / parity lock)", () => {
  it("the fixture is non-empty and version 1", () => {
    expect(golden.version).toBe(1);
    expect(golden.cases.length).toBeGreaterThan(0);
  });

  for (const c of golden.cases) {
    it(`${c.name}: serialize(expr) is byte-exact canonical`, () => {
      expect(serialize(c.expr)).toBe(c.canonical);
    });

    it(`${c.name}: parse(canonical) structurally equals expr`, () => {
      expect(equals(parse(c.canonical), c.expr)).toBe(true);
    });

    it(`${c.name}: canonical is the serialize fixed point`, () => {
      expect(serialize(parse(c.canonical))).toBe(c.canonical);
    });
  }
});

describe("Bonsai-subset — round-trip + structural laws", () => {
  it("serialize ∘ parse ∘ serialize == serialize (every case)", () => {
    for (const c of golden.cases) {
      const once = serialize(c.expr);
      expect(serialize(parse(once))).toBe(once);
    }
  });

  it("equals is reflexive (every case)", () => {
    for (const c of golden.cases) {
      expect(equals(c.expr, c.expr)).toBe(true);
    }
  });

  it("distinct cases are not equal (no false collisions)", () => {
    const exprs = golden.cases.map((c) => c.expr);
    for (let i = 0; i < exprs.length; i++) {
      for (let j = i + 1; j < exprs.length; j++) {
        // distinct canonical strings ⇒ must not be structurally equal
        if (serialize(exprs[i]!) !== serialize(exprs[j]!)) {
          expect(equals(exprs[i]!, exprs[j]!)).toBe(false);
        }
      }
    }
  });

  it("parse rejects an unknown node kind (no silent accept)", () => {
    expect(() => parse('{"v":1,"expr":{"kind":"bogus"}}')).toThrow();
  });

  it("parse rejects an unsupported version", () => {
    expect(() => parse('{"v":2,"expr":{"kind":"param","name":"x"}}')).toThrow();
  });
});
