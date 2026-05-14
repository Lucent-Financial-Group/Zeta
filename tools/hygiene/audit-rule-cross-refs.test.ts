// audit-rule-cross-refs.test.ts — basic correctness tests for the rule cross-ref auditor.
//
// Tests the pure pull/exists/render functions. The audit() integration
// is exercised end-to-end via CLI run in the shard PR's verify step.

import { describe, expect, test } from "bun:test";
import { pullRefs, refExists, renderReport } from "./audit-rule-cross-refs.ts";

describe("pullRefs", () => {
    test("pulls backtick'd .md path references", () => {
        const content = "See `memory/feedback_example.md` for details.";
        const refs = pullRefs(content, "test.md");
        expect(refs).toHaveLength(1);
        expect(refs[0]!.raw).toBe("memory/feedback_example.md");
        expect(refs[0]!.kind).toBe("path");
    });

    test("pulls backtick'd .ts path references", () => {
        const content = "Wire via `tools/peer-call/claude.ts`";
        const refs = pullRefs(content, "test.md");
        expect(refs).toHaveLength(1);
        expect(refs[0]!.raw).toBe("tools/peer-call/claude.ts");
    });

    test("pulls B-NNNN backlog ID references", () => {
        const content = "Composes with B-0192 and B-0506.";
        const refs = pullRefs(content, "test.md");
        expect(refs).toHaveLength(2);
        expect(refs.map((r) => r.raw).sort()).toEqual(["B-0192", "B-0506"]);
        expect(refs.every((r) => r.kind === "backlog-id")).toBe(true);
    });

    test("skips placeholders containing < or $", () => {
        const content = "Use `<name>.md` template or `$VAR.ts`";
        const refs = pullRefs(content, "test.md");
        expect(refs).toHaveLength(0);
    });

    test("dedups repeated references in same file", () => {
        const content = "See `foo.md` ... then `foo.md` again and B-0001 twice: B-0001";
        const refs = pullRefs(content, "test.md");
        expect(refs).toHaveLength(2);
        expect(refs.map((r) => r.raw).sort()).toEqual(["B-0001", "foo.md"]);
    });
});

describe("refExists", () => {
    test("returns true for an existing file", () => {
        // CLAUDE.md is at the repo root and exists in any healthy checkout.
        expect(refExists({ fromRule: "test.md", raw: "CLAUDE.md", kind: "path" })).toBe(true);
    });

    test("returns false for a missing file", () => {
        expect(refExists({ fromRule: "test.md", raw: "definitely-does-not-exist-xyz.md", kind: "path" })).toBe(false);
    });

    test("resolves a real backlog ID via dir scan", () => {
        // B-0506 was filed earlier today; should resolve.
        expect(refExists({ fromRule: "test.md", raw: "B-0506", kind: "backlog-id" })).toBe(true);
    });

    test("returns false for a non-existent backlog ID", () => {
        expect(refExists({ fromRule: "test.md", raw: "B-9999", kind: "backlog-id" })).toBe(false);
    });

    test("resolves a glob pattern when at least one match exists", () => {
        // memory/feedback_*.md will match many files.
        expect(refExists({ fromRule: "test.md", raw: "memory/feedback_*.md", kind: "path" })).toBe(true);
    });

    test("resolves a glob with wildcard in a directory segment (Codex P2 catch on PR #3202)", () => {
        // docs/backlog/P*/B-*.md is referenced from backlog-item-start-gate.md.
        // Earlier implementation treated the substring before the last "/" as a
        // literal directory; this regression test covers the directory-segment wildcard.
        expect(refExists({ fromRule: "test.md", raw: "docs/backlog/P*/B-*.md", kind: "path" })).toBe(true);
    });

    test("returns false for a glob that matches no files in any segment", () => {
        expect(refExists({ fromRule: "test.md", raw: "no-such-dir-*/nothing-*.md", kind: "path" })).toBe(false);
    });
});

describe("renderReport", () => {
    test("renders a no-candidates report", () => {
        const fixed = new Date("2026-05-14T00:00:00Z");
        const md = renderReport(
            { rulesScanned: 10, refsFound: 50, candidatesStale: [], resolvedCount: 50 },
            fixed,
        );
        expect(md).toContain("Rules scanned: 10");
        expect(md).toContain("Resolved: 50");
        expect(md).toContain("Stale-pointer candidates: 0");
        expect(md).toContain("_None — all references resolve._");
    });

    test("renders a candidates table", () => {
        const fixed = new Date("2026-05-14T00:00:00Z");
        const md = renderReport(
            {
                rulesScanned: 1,
                refsFound: 1,
                resolvedCount: 0,
                candidatesStale: [{ fromRule: "rule.md", raw: "missing.md", kind: "path" }],
            },
            fixed,
        );
        expect(md).toContain("| Rule | Kind | Reference |");
        expect(md).toContain("| `rule.md` | path | `missing.md` |");
    });
});
