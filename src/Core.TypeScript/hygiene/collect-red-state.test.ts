// collect-red-state.test.ts — the red dashboard's own arithmetic, pinned.
//
// WHY THIS FILE EXISTS. `collect-red-state.ts` is the aggregator every red signal
// folds into, and it shipped with no test at all. Its siblings in the observability
// family are tested — `verdict-drought`, `stalled-pr-classifier`, `gate-scope-summary`
// all have suites — and this one, the thing that decides what a HUMAN SEES FIRST, did
// not. An observer with no falsifier is the same defect as a check that cannot fail,
// moved one layer out: when it is wrong it does not fail, it just reports the wrong
// thing confidently.
//
// The file's header makes a claim that is arithmetic, not prose:
//
//   "A territory with one cosmetic finding must not look like one with a false theorem."
//
// That is testable, and the tests below pin BOTH what it guarantees and what it does
// NOT — because `weightOf` is a plain sum, so the guarantee is about ONE cosmetic
// finding and dissolves under accumulation. Writing that down is the point: the
// threshold is a design decision, and an undocumented threshold is one nobody can
// review.
import { describe, expect, test } from "bun:test";
import type { Finding, Severity } from "./collect-red-state.ts";
import { SEVERITY_ORDER, severityWeight, weightOf } from "./collect-red-state.ts";

const finding = (severity: Severity, id = "x"): Finding => ({ id, title: id, severity });

describe("severity weights and the ordering the map paints by", () => {
  test("SEVERITY_ORDER is strictly descending BY WEIGHT — the map cannot paint against its own arithmetic", () => {
    // The order is documented "worst first" and the weights are separate data. If the
    // two ever disagree, the dashboard paints regions in an order that contradicts the
    // areas it draws, and nothing else in the file would notice.
    const weights = SEVERITY_ORDER.map(severityWeight);
    for (let i = 1; i < weights.length; i++) {
      expect(weights[i - 1]).toBeGreaterThan(weights[i] as number);
    }
  });

  test("every Severity in SEVERITY_ORDER has a weight, and none is zero or negative", () => {
    for (const s of SEVERITY_ORDER) {
      const w = severityWeight(s);
      expect(Number.isFinite(w)).toBe(true);
      expect(w).toBeGreaterThan(0);
    }
  });

  test("SEVERITY_ORDER covers the whole Severity union — a new severity cannot be silently unranked", () => {
    // The union is the source of truth; the array is a hand-kept list beside it. A
    // severity added to the type and forgotten here would sort last by accident and
    // paint as the mildest thing on the map.
    const all: Severity[] = ["unsound", "drift", "open", "gap", "failing"];
    expect([...SEVERITY_ORDER].sort()).toEqual([...all].sort());
  });
});

describe("weightOf — the area a boundary encloses", () => {
  test("empty is zero", () => {
    expect(weightOf([])).toBe(0);
  });

  test("it is a SUM, so it is order-independent", () => {
    const a = [finding("unsound"), finding("open"), finding("gap")];
    const b = [finding("gap"), finding("unsound"), finding("open")];
    expect(weightOf(a)).toBe(weightOf(b));
  });

  test("THE HEADER'S CLAIM: one cosmetic finding does not look like one false theorem", () => {
    expect(weightOf([finding("open")])).toBeLessThan(weightOf([finding("unsound")]));
  });

  test("AND THE LIMIT OF THAT CLAIM, pinned rather than assumed: 25 cosmetic findings equal one false theorem, 26 outweigh it", () => {
    // `weightOf` is a plain sum (open=4, unsound=100), so severity does NOT dominate
    // under accumulation. This is a real design tradeoff and may well be the intended
    // one -- a territory holding 26 open findings does contain more total red. It is
    // pinned here so that changing any weight surfaces the exchange rate instead of
    // quietly moving it.
    const opens = (n: number): Finding[] => Array.from({ length: n }, (_, i) => finding("open", `o${String(i)}`));
    expect(weightOf(opens(25))).toBe(weightOf([finding("unsound")]));
    expect(weightOf(opens(26))).toBeGreaterThan(weightOf([finding("unsound")]));
    expect(weightOf(opens(24))).toBeLessThan(weightOf([finding("unsound")]));
  });

  test("mixed severities add exactly, with no rounding or clamping", () => {
    expect(weightOf([finding("unsound"), finding("failing"), finding("drift"), finding("gap"), finding("open")])).toBe(
      100 + 40 + 20 + 10 + 4,
    );
  });
});
