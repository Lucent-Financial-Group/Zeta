import { describe, expect, test } from "bun:test";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  scanSpecs,
  scanModules,
  buildGapReport,
  CAPABILITY_MODULE_MAP,
  EXCLUDED_MODULES,
} from "./inventory.ts";
import type { SpecEntry, ModuleEntry } from "./inventory.ts";

function makeTempDir(): string {
  return mkdtempSync(join(tmpdir(), "openspec-inventory-test-"));
}

describe("scanSpecs", () => {
  test("returns empty for nonexistent dir", () => {
    expect(scanSpecs("/nonexistent/path")).toEqual([]);
  });

  test("finds specs with purpose and profiles", () => {
    const root = makeTempDir();
    const specDir = join(root, "my-cap");
    const profilesDir = join(specDir, "profiles");
    mkdirSync(profilesDir, { recursive: true });
    writeFileSync(
      join(specDir, "spec.md"),
      "## Purpose\n\nThis defines the foo capability.\n\n## Requirements\n",
    );
    writeFileSync(join(profilesDir, "fsharp.md"), "# F# overlay\n");

    const specs = scanSpecs(root);
    expect(specs).toHaveLength(1);
    expect(specs[0]!.capability).toBe("my-cap");
    expect(specs[0]!.profiles).toEqual(["fsharp"]);
    expect(specs[0]!.purposeSnippet).toContain("foo capability");

    rmSync(root, { recursive: true });
  });

  test("skips dirs without spec.md", () => {
    const root = makeTempDir();
    mkdirSync(join(root, "empty-cap"), { recursive: true });

    const specs = scanSpecs(root);
    expect(specs).toHaveLength(0);

    rmSync(root, { recursive: true });
  });
});

describe("scanModules", () => {
  test("returns empty for nonexistent dir", () => {
    expect(scanModules("/nonexistent/path")).toEqual([]);
  });

  test("finds .fs files and extracts namespace", () => {
    const root = makeTempDir();
    writeFileSync(
      join(root, "Foo.fs"),
      "namespace Zeta.Core\n\ntype Foo = { X: int }\n",
    );
    writeFileSync(join(root, "NotFs.txt"), "ignored");

    const modules = scanModules(root);
    expect(modules).toHaveLength(1);
    expect(modules[0]!.name).toBe("Foo.fs");
    expect(modules[0]!.namespace).toBe("Zeta.Core");

    rmSync(root, { recursive: true });
  });
});

describe("buildGapReport", () => {
  test("correctly classifies covered vs uncovered", () => {
    const specs: SpecEntry[] = [
      {
        capability: "operator-algebra",
        specPath: "openspec/specs/operator-algebra/spec.md",
        profiles: ["fsharp"],
        purposeSnippet: "the core algebra",
      },
    ];

    const modules: ModuleEntry[] = [
      { name: "ZSet.fs", path: "src/Core/ZSet.fs", namespace: "Zeta.Core" },
      { name: "Sketch.fs", path: "src/Core/Sketch.fs", namespace: "Zeta.Core" },
      { name: "AssemblyInfo.fs", path: "src/Core/AssemblyInfo.fs", namespace: "Zeta.Core" },
    ];

    const report = buildGapReport(specs, modules);

    expect(report.coveredModules).toContain("ZSet.fs");
    expect(report.uncoveredModules).toContain("Sketch.fs");
    expect(report.uncoveredModules).not.toContain("AssemblyInfo.fs");
    expect(report.uncoveredModules).not.toContain("ZSet.fs");
    expect(report.coveragePercent).toBeGreaterThan(0);
  });

  test("flags specs not in mapping table", () => {
    const specs: SpecEntry[] = [
      {
        capability: "brand-new-spec",
        specPath: "openspec/specs/brand-new-spec/spec.md",
        profiles: [],
        purposeSnippet: "new",
      },
    ];

    const report = buildGapReport(specs, []);
    expect(report.unmappedSpecs).toContain("brand-new-spec");
  });

  test("coverage is 0% with no modules", () => {
    const report = buildGapReport([], []);
    expect(report.coveragePercent).toBe(0);
  });
});

describe("mapping table integrity", () => {
  test("all mapped capabilities have entries in CAPABILITY_MODULE_MAP", () => {
    for (const [cap, modules] of Object.entries(CAPABILITY_MODULE_MAP)) {
      expect(typeof cap).toBe("string");
      expect(Array.isArray(modules)).toBe(true);
    }
  });

  test("EXCLUDED_MODULES is a Set of strings", () => {
    expect(EXCLUDED_MODULES).toBeInstanceOf(Set);
    for (const m of EXCLUDED_MODULES) {
      expect(typeof m).toBe("string");
      expect(m.endsWith(".fs")).toBe(true);
    }
  });
});

describe("integration: real repo scan", () => {
  test("finds at least 6 specs in the real openspec/specs/ dir", () => {
    const repoRoot = join(__dirname, "..", "..");
    const specs = scanSpecs(join(repoRoot, "openspec", "specs"));
    expect(specs.length).toBeGreaterThanOrEqual(6);

    const names = specs.map((s) => s.capability);
    expect(names).toContain("operator-algebra");
    expect(names).toContain("retraction-safe-recursion");
    expect(names).toContain("durability-modes");
    expect(names).toContain("circuit-recursion");
    expect(names).toContain("lsm-spine-family");
    expect(names).toContain("repo-automation");
  });

  test("finds at least 50 modules in the real src/Core/ dir", () => {
    const repoRoot = join(__dirname, "..", "..");
    const modules = scanModules(join(repoRoot, "src", "Core"));
    expect(modules.length).toBeGreaterThanOrEqual(50);
  });
});
