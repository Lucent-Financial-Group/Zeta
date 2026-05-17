import { describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  auditSurface,
  findEdgesInFile,
  isDangling,
  runAudit,
} from "./audit-dangling-memory-refs";

function setupFixtureRepo(): { root: string; cleanup: () => void } {
  const root = mkdtempSync(join(tmpdir(), "audit-dangling-memory-refs-test-"));
  return {
    root,
    cleanup: () => rmSync(root, { recursive: true, force: true }),
  };
}

describe("findEdgesInFile", () => {
  test("extracts memory/feedback_*.md references from markdown", () => {
    const { root, cleanup } = setupFixtureRepo();
    try {
      const file = join(root, "test.md");
      writeFileSync(
        file,
        "header\n" +
          "see `memory/feedback_one.md` for details\n" +
          "also `memory/feedback_two.md` and `memory/feedback_three.md`\n" +
          "no ref here\n",
        "utf8",
      );
      process.env["REPO_ROOT"] = root;
      const edges = findEdgesInFile(file);
      expect(edges).toHaveLength(3);
      expect(edges[0]?.line).toBe(2);
      expect(edges[0]?.ref).toBe("memory/feedback_one.md");
      expect(edges[1]?.line).toBe(3);
      expect(edges[1]?.ref).toBe("memory/feedback_two.md");
      expect(edges[2]?.line).toBe(3);
      expect(edges[2]?.ref).toBe("memory/feedback_three.md");
    } finally {
      delete process.env["REPO_ROOT"];
      cleanup();
    }
  });

  test("returns empty for file with no memory/feedback_ refs", () => {
    const { root, cleanup } = setupFixtureRepo();
    try {
      const file = join(root, "test.md");
      writeFileSync(file, "# Header\n\nNo refs here.\n", "utf8");
      process.env["REPO_ROOT"] = root;
      expect(findEdgesInFile(file)).toEqual([]);
    } finally {
      delete process.env["REPO_ROOT"];
      cleanup();
    }
  });

  test("ignores memory/feedback_ in non-path contexts (still matches if path-shaped)", () => {
    // The regex matches any `memory/feedback_*.md` shape; this is intentional
    // since substrate sometimes references files in prose. The dangling check
    // is the safety net.
    const { root, cleanup } = setupFixtureRepo();
    try {
      const file = join(root, "test.md");
      writeFileSync(file, "see memory/feedback_x.md for context\n", "utf8");
      process.env["REPO_ROOT"] = root;
      const edges = findEdgesInFile(file);
      expect(edges).toHaveLength(1);
      expect(edges[0]?.ref).toBe("memory/feedback_x.md");
    } finally {
      delete process.env["REPO_ROOT"];
      cleanup();
    }
  });
});

describe("isDangling", () => {
  test("returns true when the file does not exist under ROOT", () => {
    const { root, cleanup } = setupFixtureRepo();
    try {
      process.env["REPO_ROOT"] = root;
      // Note: import statics capture ROOT at import time, so this test
      // proves the function's logical contract even if the in-process ROOT
      // is fixed to the repo root. Use a path that definitely doesn't exist
      // at the actual ROOT.
      expect(isDangling("memory/feedback_definitely-does-not-exist-xyz123.md")).toBe(true);
    } finally {
      delete process.env["REPO_ROOT"];
      cleanup();
    }
  });

  test("returns false when the file exists at the actual ROOT", () => {
    // The real repo root has an existing audit memo we can use as the
    // existence proof (the audit memo itself, which DOES exist).
    expect(
      isDangling(
        "memory/feedback_otto_cli_audit_in_repo_rules_cite_user_scope_only_memory_files_5_dangling_refs_cold_boot_invisible_2026_05_17.md",
      ),
    ).toBe(false);
  });
});

describe("auditSurface", () => {
  test("returns empty report for nonexistent surface", () => {
    const r = auditSurface(".claude/nonexistent-surface-for-test");
    expect(r.scanned).toBe(0);
    expect(r.edges).toEqual([]);
    expect(r.uniqueRefs).toBe(0);
    expect(r.uniqueDanglingRefs).toBe(0);
  });

  test(".claude/agents has known clean state per audit memo", () => {
    // Per the #4041 audit memo: .claude/agents has 0 dangling / 0 unique refs.
    // This test ratchets that empirical state.
    const r = auditSurface(".claude/agents");
    expect(r.edges).toEqual([]);
    expect(r.uniqueDanglingRefs).toBe(0);
  });
});

describe("runAudit", () => {
  // Real-tree scans can exceed bun:test's default 5s timeout when crossing
  // multiple substrate surfaces (1000+ files). 30s gives comfortable
  // headroom for CI runners.
  test(
    "aggregates across multiple surfaces",
    () => {
      const out = runAudit([".claude/agents", ".claude/skills"]);
      expect(out.surfaces).toHaveLength(2);
      expect(out.totals.surfacesScanned).toBe(2);
    },
    30000,
  );

  test(
    "produces a totals.danglingEdges field that matches summed surfaces",
    () => {
      const out = runAudit([".claude/agents", ".claude/skills"]);
      const summed = out.surfaces.reduce((acc, s) => acc + s.edges.length, 0);
      expect(out.totals.danglingEdges).toBe(summed);
    },
    30000,
  );
});
