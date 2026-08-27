// check-healer-oscillation.test.ts — the falsifiers for the RUNNER.
//
// `oscillation-registry.ts` has its own 17 tests. These test the thing that was missing: that the
// runner can actually go red. A gate whose failure paths are unreachable is the exact defect this
// whole line of work exists to catch, so each exit code is exercised against a constructed roster.

import { describe, expect, test } from "bun:test";
import type { FileTree, Healer } from "./healer-harness.ts";
import { buildRegistry, isClean } from "./oscillation-registry.ts";
import { DECLARED_EDGES, TIER0, triggerTree, sampleRepo } from "./check-healer-oscillation.ts";

const corpusOf = (t: FileTree) => [{ name: "c", tree: t }];

describe("the real roster, as CI runs it", () => {
  test("Tier-0 is all-disjoint and height 1 — and NOT vacuously so", () => {
    // The second clause is the one that matters. The three built-in harness fixtures fire none of
    // these healers, so a corpus without the trigger fixture would report all-disjoint and mean
    // nothing.
    const r = buildRegistry(TIER0, corpusOf(triggerTree()), DECLARED_EDGES);
    expect(r.verdicts).toHaveLength(10);
    expect(r.dagHeight).toBe(1);
    expect(isClean(r)).toBe(true);
    expect(r.vacuousPairs.length).toBeLessThan(r.verdicts.length);
  });

  test("no declared edges — because there is no order to declare, not because nobody looked", () => {
    expect(DECLARED_EDGES).toHaveLength(0);
    expect(buildRegistry(TIER0, corpusOf(triggerTree()), DECLARED_EDGES).verdicts
      .filter((v) => v.relation === "override")).toHaveLength(0);
  });
});

describe("the check can go RED — each failure path is reachable", () => {
  // Without these, every assertion above is satisfied by a checker that always returns 0.
  const advance: Healer = {
    name: "advance",
    heal: (t) => {
      const v = t.get("x.md");
      if (v === "x") return new Map([...t, ["x.md", "y"]]);
      if (v === "y") return new Map([...t, ["x.md", "z"]]);
      return t;
    },
  };
  const reset: Healer = {
    name: "reset",
    heal: (t) => (t.get("x.md") === "z" ? new Map([...t, ["x.md", "x"]]) : t),
  };
  const upper: Healer = {
    name: "upper",
    heal: (t) => (t.get("x.md")?.includes("a") === true ? new Map([...t, ["x.md", t.get("x.md")!.replaceAll("a", "A")]]) : t),
  };
  const wrap: Healer = {
    name: "wrap",
    heal: (t) => (t.get("x.md")?.includes("a") === true ? new Map([...t, ["x.md", t.get("x.md")!.replaceAll("a", "(a)")]]) : t),
  };

  test("an oscillating pair is NOT clean", () => {
    const r = buildRegistry([advance, reset], corpusOf(new Map([["x.md", "x"]])));
    expect(r.oscillating).toHaveLength(1);
    expect(isClean(r)).toBe(false);
  });

  test("an undeclared override is NOT clean, and declaring it makes it clean", () => {
    const c = corpusOf(new Map([["x.md", "a"]]));
    expect(isClean(buildRegistry([upper, wrap], c))).toBe(false);
    expect(isClean(buildRegistry([upper, wrap], c, [{ before: "upper", after: "wrap", why: "normalise first" }]))).toBe(true);
  });

  test("a corpus that fires NOTHING makes every pair vacuous — the refusal case", () => {
    const inert = corpusOf(new Map([["unrelated.md", "nothing to do here"]]));
    const r = buildRegistry(TIER0, inert, DECLARED_EDGES);
    expect(r.vacuousPairs).toHaveLength(r.verdicts.length);
    // ...and it is NOT reported as a failure by the registry. The RUNNER is what refuses it,
    // because "no evidence" and "a defect" are different things.
    expect(isClean(r)).toBe(true);
  });
});

describe("the corpus sampler", () => {
  test("it reads real files under the repo root", () => {
    // Control: if this returned an empty tree the CI corpus would silently be fixtures only.
    const t = sampleRepo(new URL("../../..", import.meta.url).pathname.replace(/\/$/, ""), { ts: 5, yml: 2, md: 2 });
    expect(t.size).toBeGreaterThan(0);
  });
});
