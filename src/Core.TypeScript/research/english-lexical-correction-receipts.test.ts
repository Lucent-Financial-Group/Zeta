import { describe, expect, test } from "bun:test";
import {
  createLexicalCorrectionReceipt,
  mergeLexicalCorrectionStates,
  queryLexicalCorrectionState,
  type LexicalCorrectionReceipt,
} from "./english-lexical-correction-receipts";

function receipt(
  surface: string,
  status: "accepted" | "replaced" | "unknown",
  replacement: string | undefined,
  source = "english-seed-v0",
  version = "0.1.0",
  reason = "declared-catalogue",
): LexicalCorrectionReceipt {
  return createLexicalCorrectionReceipt({ surface, status, replacement, source, version, reason });
}

describe("finite lexical correction receipts", () => {
  test("normalizes declared forms and preserves the original form across a declared replacement", () => {
    const corrected = receipt("Colour", "replaced", "Color", "editorial-style", "1", "spelling-variant");
    expect(corrected.surface).toBe("colour");
    expect(corrected.replacement).toBe("color");
    expect(corrected.contentId).toContain("declared-lexical-correction-receipts/v1");

    const nonAscii = receipt("É", "unknown", undefined, "manual-audit", "1", "not-in-candidate-seed");
    expect(nonAscii.surface).toBe("é");
    expect(nonAscii.contentId).toContain("2:é");
  });

  test("retains unknown explicitly without converting it to an accepted or replaced form", () => {
    const unknown = receipt("floccinaucinihilipilification", "unknown", undefined, "manual-audit", "1", "not-in-candidate-seed");
    expect(unknown.status).toBe("unknown");
    expect(unknown.replacement).toBeUndefined();
    expect(queryLexicalCorrectionState({ receipts: [unknown] }).status).toBe("Ready");
  });

  test("rejects malformed declared correction combinations", () => {
    expect(() => receipt("color", "replaced", undefined)).toThrow("LEXICAL-CORRECTION-REPLACEMENT");
    expect(() => receipt("color", "accepted", "colour")).toThrow("LEXICAL-CORRECTION-UNEXPECTED-REPLACEMENT");
    expect(() => receipt("   ", "unknown", undefined)).toThrow("LEXICAL-CORRECTION-SURFACE");
  });

  test("canonical union is idempotent and delivery-order invariant", () => {
    const accepted = receipt("good", "accepted", undefined);
    const replaced = receipt("colour", "replaced", "color", "editorial-style", "1", "spelling-variant");
    const unknown = receipt("zeta", "unknown", undefined, "manual-audit", "1", "not-in-candidate-seed");
    const baseline = queryLexicalCorrectionState({ receipts: [accepted, replaced, unknown] });
    for (const ordering of [
      [accepted, replaced, unknown],
      [accepted, unknown, replaced],
      [replaced, accepted, unknown],
      [replaced, unknown, accepted],
      [unknown, accepted, replaced],
      [unknown, replaced, accepted],
    ]) {
      const merged = mergeLexicalCorrectionStates({ receipts: ordering }, { receipts: [accepted] });
      expect(queryLexicalCorrectionState(merged)).toEqual(baseline);
    }
  });

  test("changed content at one surface remains a visible conflict with no automatic winner", () => {
    const old = receipt("colour", "replaced", "color", "editorial-style", "1", "spelling-variant");
    const changedVersion = receipt("colour", "replaced", "color", "editorial-style", "2", "spelling-variant");
    const changedReason = receipt("colour", "unknown", undefined, "manual-audit", "2", "review-pending");
    const query = queryLexicalCorrectionState(mergeLexicalCorrectionStates({ receipts: [old] }, { receipts: [changedVersion, changedReason] }));
    expect(query.status).toBe("Conflict");
    if (query.status !== "Conflict") throw new Error("expected lexical conflict");
    expect(query.conflictSurfaces).toEqual(["colour"]);
    expect(query.receiptCount).toBe(3);
  });
});
