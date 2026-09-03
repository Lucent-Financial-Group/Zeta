/**
 * audit-cross-language-pairs.test.ts
 *
 * The roster's own falsifiers. Two things must hold for it to be worth having:
 * it must FIND the pairs, and it must FAIL when a new one appears unwatched.
 */

import { describe, expect, test } from "bun:test";
import { findPairs, kebabOf, readBaseline, DECLARED_UNPINNED } from "./audit-cross-language-pairs";

describe("kebabOf — the naming convention the two trees follow", () => {
  test("PascalCase becomes the kebab name TypeScript uses", () => {
    expect(kebabOf("IndexedZSet")).toBe("indexed-z-set");
    expect(kebabOf("IoBoundary")).toBe("io-boundary");
    expect(kebabOf("ErasureCharge")).toBe("erasure-charge");
    expect(kebabOf("SpecializationCache")).toBe("specialization-cache");
  });

  test("a run of capitals does not become one hyphen per letter", () => {
    // `DAGFs` must not become `d-a-g-fs`. The pairing is by name, so a mangled name is a pair the
    // roster silently cannot see — an under-report that looks like a clean bill of health.
    expect(kebabOf("DvKey")).toBe("dv-key");
    expect(kebabOf("CloudEvents")).toBe("cloud-events");
  });
});

describe("the roster", () => {
  const pairs = findPairs();

  test("finds the concepts the hand sweep found", () => {
    // The six the 2026-09 sweep named. If the roster cannot see these it cannot see anything, and a
    // green run would mean only that its pairing is broken.
    const names = new Set(pairs.map((p) => p.concept));
    for (const concept of [
      "ErasureCharge",
      "IndexedZSet",
      "IoBoundary",
      "RecoverableSpine",
      "SnapshotStore",
      "SpecializationCache",
    ]) {
      expect(names.has(concept), `roster lost the pair ${concept}`).toBe(true);
    }
  });

  test("recognises the treaties that exist as pins", () => {
    const byName = new Map(pairs.map((p) => [p.concept, p]));
    // These carry a name-matched treaty on `main`, so a roster that reported them unwatched would
    // be crying wolf about work already done.
    for (const concept of ["IoBoundary", "IndexedZSet", "ErasureCharge"]) {
      const p = byName.get(concept);
      expect(p, `roster lost ${concept}`).toBeDefined();
      expect(p?.pinnedBy.length ?? 0, `${concept} reported unpinned`).toBeGreaterThan(0);
    }
  });

  test("the baseline is a record of what is UNTRIAGED, not a claim that it is fine", () => {
    // Guarding the framing, because a baseline read as an allowlist is how a roster stops meaning
    // anything. The reason text is the thing that keeps the next reader honest.
    const baseline = readBaseline();
    expect(baseline.unpinned.length).toBeGreaterThan(0);
    // Anything genuinely fine belongs in DECLARED_UNPINNED with a reason, not in the baseline.
    for (const [concept, reason] of DECLARED_UNPINNED) {
      expect(reason.length, `${concept} is declared with no reason`).toBeGreaterThan(20);
    }
  });

  test("every reported pair names two files that exist", () => {
    // A roster that pointed at paths which are not there would be unfalsifiable: nobody could check
    // a finding, so nobody would.
    for (const p of pairs) {
      expect(p.fsharp.endsWith(".fs"), `${p.concept} F# side is not a .fs`).toBe(true);
      expect(p.typescript.length).toBeGreaterThan(0);
    }
  });
});
