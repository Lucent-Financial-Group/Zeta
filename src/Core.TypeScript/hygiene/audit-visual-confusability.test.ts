// audit-visual-confusability.test.ts
//
// The point of this file is NOT to confirm the audit's current output. It is to demonstrate that
// each tier is CAPABLE OF FAILING, against controls, in both directions — because a confusability
// guard that cannot be shown to fire is exactly the vacuity class it was written to prevent.
//
// Every test below therefore comes in a pair: a control that MUST fire and a control that MUST
// NOT. The live findings are asserted separately, at the end, and only to pin the baseline.

import { describe, expect, test } from "bun:test";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { StateMember } from "../cluster/state-du.ts";
import { skeletonOf, skeletonKey, collide, contrastRatio } from "./visual-skeleton.ts";
import {
  auditCatalogIdentity,
  auditGlyphSkeletons,
  auditSingleChannelPairs,
  runAudit,
  KNOWN_OPEN,
} from "./audit-visual-confusability.ts";

function member(over: Partial<StateMember> & Pick<StateMember, "id" | "glyph">): StateMember {
  return {
    attribute: "data-state",
    claim: "observation",
    token: "--state-live",
    ascii: "( )",
    label: over.id,
    sentence: "a control",
    aria: "labelled",
    ...over,
  } as StateMember;
}

describe("the quotient separates what survives a glance and merges what does not", () => {
  test("FILL FRACTION separates — it is Bertin's ordered `value` variable", () => {
    // Full vs empty is the largest available difference in the one visual variable that is
    // ordered rather than nominal. If the model merged these it would be useless.
    expect(collide("●", "○")).toBe(false);
  });

  test("A FULL-DIAMETER STRIKE separates — it changes the silhouette, so it survives blur", () => {
    expect(collide("∅", "○")).toBe(false);
  });

  test("BASE FORM separates — a diamond is not a circle at any size", () => {
    expect(collide("◆", "●")).toBe(false);
  });

  test("OUTLINE STYLE does NOT separate — dotted and solid rings differ by under a stroke", () => {
    expect(collide("◌", "○")).toBe(true);
  });

  test("FILL TEXTURE does NOT separate — hatching and a half-fill both read as partly dark", () => {
    expect(collide("◍", "◐")).toBe(true);
  });

  test("an unaudited mark answers `undefined`, never `false`", () => {
    // The whole failure mode this guard exists for is a check that passes what it cannot see.
    // "No model for this mark" must not be spellable as "these are distinguishable".
    expect(collide("★", "●")).toBeUndefined();
    expect(skeletonOf("★")).toBeUndefined();
  });

  test("the skeleton key is a string, so collision is equality — the UTS #39 construction", () => {
    expect(skeletonKey(skeletonOf("◌")!)).toBe(skeletonKey(skeletonOf("○")!));
    expect(skeletonKey(skeletonOf("●")!)).not.toBe(skeletonKey(skeletonOf("○")!));
  });
});

describe("TIER 0 — identity collision fires, and does not fire spuriously", () => {
  test("two catalog files with identical bytes are reported", () => {
    const dir = mkdtempSync(join(tmpdir(), "confusable-fire-"));
    try {
      writeFileSync(join(dir, "alpha.svg"), "<svg><line/></svg>");
      writeFileSync(join(dir, "beta.svg"), "<svg><line/></svg>");
      const findings = auditCatalogIdentity(dir);
      expect(findings).toHaveLength(1);
      expect(findings[0]!.severity).toBe("error");
      expect(findings[0]!.what).toContain("alpha.svg == beta.svg");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("two catalog files that differ by one byte are NOT reported", () => {
    const dir = mkdtempSync(join(tmpdir(), "confusable-quiet-"));
    try {
      writeFileSync(join(dir, "alpha.svg"), "<svg><line/></svg>");
      writeFileSync(join(dir, "beta.svg"), "<svg><rect/></svg>");
      expect(auditCatalogIdentity(dir)).toHaveLength(0);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe("TIER 1 — the claim-class grading is the part that matters", () => {
  test("a collision ACROSS claim classes is an error", () => {
    const { findings } = auditGlyphSkeletons([
      member({ id: "watched", glyph: "○", claim: "observation" }),
      member({ id: "hidden", glyph: "◌", claim: "withheld" }),
    ]);
    expect(findings).toHaveLength(1);
    expect(findings[0]!.severity).toBe("error");
    expect(findings[0]!.why).toContain("ACROSS CLAIM CLASSES");
  });

  test("the same collision WITHIN one claim class is a warning, not an error", () => {
    // The severity is not decoration. Two observations confused costs precision; an observation
    // confused for a withholding asserts a claim nobody made. Grading that identically would
    // make the guard louder and less useful.
    const { findings } = auditGlyphSkeletons([
      member({ id: "watched", glyph: "○", claim: "observation" }),
      member({ id: "also-watched", glyph: "◌", claim: "observation" }),
    ]);
    expect(findings).toHaveLength(1);
    expect(findings[0]!.severity).toBe("warn");
  });

  test("distinguishable glyphs produce no finding at all", () => {
    const { findings } = auditGlyphSkeletons([
      member({ id: "watched", glyph: "○", claim: "observation" }),
      member({ id: "hidden", glyph: "▨", claim: "withheld" }),
    ]);
    expect(findings).toHaveLength(0);
  });

  test("a glyph with no skeleton row is reported as UNAUDITED and never as a pass", () => {
    const { findings, unaudited } = auditGlyphSkeletons([
      member({ id: "novel", glyph: "★", claim: "observation" }),
      member({ id: "hidden", glyph: "◌", claim: "withheld" }),
    ]);
    expect(unaudited).toHaveLength(1);
    expect(unaudited[0]).toContain("novel");
    expect(findings).toHaveLength(0); // silent on it — which is why coverage is printed
  });
});

describe("TIER 2 — hue-only distinctions", () => {
  const colours = new Map([
    ["live", "#E0746A"], // red
    ["withheld", "#9A8CE6"], // violet: measured 1.057 against the red above
  ]);

  test("fires when hue is the only separator", () => {
    const findings = auditSingleChannelPairs(colours, [
      member({ id: "a", glyph: "○", claim: "observation", token: "--state-live" }),
      member({ id: "b", glyph: "◌", claim: "observation", token: "--state-withheld" }),
    ]);
    expect(findings).toHaveLength(1);
    expect(findings[0]!.what).toContain("HUE ALONE");
  });

  test("does NOT fire when the glyph skeletons differ — a second channel is enough", () => {
    const findings = auditSingleChannelPairs(colours, [
      member({ id: "a", glyph: "●", claim: "observation", token: "--state-live" }),
      member({ id: "b", glyph: "○", claim: "observation", token: "--state-withheld" }),
    ]);
    expect(findings).toHaveLength(0);
  });

  test("does NOT fire when luminance separates, even with colliding glyphs", () => {
    const wide = new Map([
      ["live", "#FFFFFF"],
      ["withheld", "#101010"],
    ]);
    const findings = auditSingleChannelPairs(wide, [
      member({ id: "a", glyph: "○", claim: "observation", token: "--state-live" }),
      member({ id: "b", glyph: "◌", claim: "observation", token: "--state-withheld" }),
    ]);
    expect(findings).toHaveLength(0);
  });

  test("the luminance proxy is WCAG 2.1 and reproduces its endpoints", () => {
    expect(contrastRatio("#FFFFFF", "#000000")).toBeCloseTo(21, 5);
    expect(contrastRatio("#5EC8C2", "#5EC8C2")).toBeCloseTo(1, 10);
  });
});

describe("the live baseline", () => {
  test("every baselined key is still a live finding — a stale line is itself a defect", () => {
    const { findings } = runAudit();
    const keys = new Set(findings.map((f) => f.key));
    for (const k of KNOWN_OPEN.keys()) expect(keys).toContain(k);
  });

  test("no error is unbaselined — a NEW collision must break the build", () => {
    const { findings } = runAudit();
    const unbaselined = findings.filter((f) => f.severity === "error" && !KNOWN_OPEN.has(f.key));
    expect(unbaselined.map((f) => f.what)).toEqual([]);
  });

  test("every baseline entry names a work-item, so closing one is a visible act", () => {
    for (const [, item] of KNOWN_OPEN) expect(item).toMatch(/^[0-9A-Z]{26}$/);
  });

  test("coverage is total over the state DU — no glyph is silently unexamined", () => {
    expect(runAudit().unaudited).toEqual([]);
  });
});
