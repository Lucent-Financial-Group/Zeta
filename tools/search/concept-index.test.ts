import { describe, test, expect, beforeAll } from "bun:test";
import { buildIndex, lookup, type ConceptIndex } from "./concept-index.js";

// Build once at file scope — shared across all describe blocks.
let index: ConceptIndex;
let buildElapsedMs: number;

beforeAll(async () => {
    const start = performance.now();
    index = await buildIndex();
    buildElapsedMs = performance.now() - start;
});

describe("buildIndex — structure", () => {
    test("returns schema v1", () => {
        expect(index.schema).toBe("concept-index-v1");
    });

    test("entryCount matches entries array length", () => {
        expect(index.entries.length).toBe(index.entryCount);
    });

    test("populates at least one entry", () => {
        expect(index.entryCount).toBeGreaterThan(0);
    });

    test("covers required scan dirs", () => {
        expect(index.scanDirs).toContain("memory");
        expect(index.scanDirs).toContain("docs");
        expect(index.scanDirs).toContain(".claude/skills");
        expect(index.scanDirs).toContain(".claude/rules");
    });

    test("generated field is a valid ISO timestamp", () => {
        expect(() => new Date(index.generated)).not.toThrow();
        expect(new Date(index.generated).getFullYear()).toBeGreaterThanOrEqual(2026);
    });

    test("each entry has conceptClass, term, and non-empty hits", () => {
        for (const e of index.entries.slice(0, 50)) {
            expect(typeof e.conceptClass).toBe("string");
            expect(typeof e.term).toBe("string");
            expect(e.hits.length).toBeGreaterThan(0);
        }
    });
});

describe("buildIndex — timing", () => {
    test("builds in under 5 seconds", () => {
        expect(buildElapsedMs).toBeLessThan(5000);
    });
});

describe("lookup — single-word", () => {
    test("empty query returns empty array", () => {
        expect(lookup(index, "")).toEqual([]);
    });

    test("whitespace-only query returns empty array", () => {
        expect(lookup(index, "   ")).toEqual([]);
    });

    test("known concept class 'alignment' returns matches", () => {
        const results = lookup(index, "alignment");
        expect(results.length).toBeGreaterThan(0);
    });

    test("nonsense term returns empty array", () => {
        expect(lookup(index, "xyzzy-no-match-zz99q")).toEqual([]);
    });
});

describe("lookup — multi-word AND semantics", () => {
    test("AND result is a subset of each single-word result", () => {
        const rA = lookup(index, "alignment");
        const rB = lookup(index, "clause");
        const rAnd = lookup(index, "alignment clause");
        const inA = (e: { term: string; conceptClass: string }) =>
            rA.some((x) => x.term === e.term && x.conceptClass === e.conceptClass);
        const inB = (e: { term: string; conceptClass: string }) =>
            rB.some((x) => x.term === e.term && x.conceptClass === e.conceptClass);
        for (const r of rAnd) {
            expect(inA(r)).toBe(true);
            expect(inB(r)).toBe(true);
        }
    });

    test("two-word query returns fewer-or-equal results than each word alone", () => {
        const rA = lookup(index, "alignment");
        const rAnd = lookup(index, "alignment clause");
        expect(rAnd.length).toBeLessThanOrEqual(rA.length);
    });

    test("impossible AND returns empty array", () => {
        const results = lookup(index, "alignment xyzzy-no-match-zz99q");
        expect(results).toEqual([]);
    });
});
