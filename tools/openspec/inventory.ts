#!/usr/bin/env bun
/**
 * tools/openspec/inventory.ts (v0.2.0)
 *
 * Phase 1 mechanization for B-0171: scans openspec/specs/ and src/Core/
 * to produce a structured gap report — which code modules have specs,
 * which don't, and which specs have no matching code module.
 *
 * Output: JSON to stdout. Human-readable summary to stderr.
 */

import { readdirSync, readFileSync } from "node:fs";
import { join, relative, resolve } from "node:path";

// ── Types ────────────────────────────────────────────────────────────

interface SpecEntry {
  capability: string;
  specPath: string;
  profiles: string[];
  purposeSnippet: string;
}

interface ModuleEntry {
  name: string;
  path: string;
  namespace: string;
}

interface Mapping {
  capability: string;
  modules: string[];
  missingModules: string[];
}

interface GapReport {
  timestamp: string;
  specs: SpecEntry[];
  modules: ModuleEntry[];
  mappings: Mapping[];
  coveredModules: string[];
  uncoveredModules: string[];
  unmappedSpecs: string[];
  coveragePercent: number;
}

// ── Known capability → module mappings ──────────────────────────────
//
// This is the authoritative map of which specs cover which F# modules.
// Maintained manually — when a new spec or module lands, add the link.
// The inventory tool flags anything not in this map as a gap.

const CAPABILITY_MODULE_MAP: Record<string, string[]> = {
  "operator-algebra": [
    "ZSet.fs",
    "Algebra.fs",
    "Operators.fs",
    "IndexedZSet.fs",
    "Incremental.fs",
    "Units.fs",
    "Primitive.fs",
    "Handles.fs",
  ],
  "retraction-safe-recursion": [
    "Recursive.fs",
    "RecursiveSigned.fs",
  ],
  "durability-modes": [
    "Durability.fs",
  ],
  "circuit-recursion": [
    "Circuit.fs",
    "NestedCircuit.fs",
  ],
  "lsm-spine-family": [
    "Spine.fs",
    "SpineAsync.fs",
    "DiskSpine.fs",
    "BalancedSpine.fs",
    "SpineSelector.fs",
  ],
  "repo-automation": [],
};

// Modules excluded from gap analysis — infrastructure, assembly metadata,
// or modules whose spec coverage is tracked under a different capability.
const EXCLUDED_MODULES = new Set([
  "AssemblyInfo.fs",
  "FSharpApi.fs",
]);

// ── Scanning ─────────────────────────────────────────────────────────

function findRepoRoot(): string {
  let cur = resolve(import.meta.dir);
  while (cur !== "/" && cur !== "") {
    try {
      readFileSync(join(cur, ".git", "HEAD"));
      return cur;
    } catch {
      const parent = resolve(cur, "..");
      if (parent === cur) break;
      cur = parent;
    }
  }
  return process.cwd();
}

function scanSpecs(specsDir: string): SpecEntry[] {
  const entries: SpecEntry[] = [];
  let dirs: string[];
  try {
    dirs = readdirSync(specsDir).sort();
  } catch {
    return entries;
  }

  for (const name of dirs) {
    const specPath = join(specsDir, name, "spec.md");
    let content: string;
    try {
      content = readFileSync(specPath, "utf8");
    } catch {
      continue;
    }

    const purposeMatch = content.match(
      /##\s*Purpose\s*\n+([\s\S]*?)(?=\n##\s|\n$)/,
    );
    const purposeSnippet = purposeMatch
      ? purposeMatch[1]!.trim().split("\n")[0]!.slice(0, 200)
      : "(no purpose section found)";

    let profiles: string[] = [];
    const profilesDir = join(specsDir, name, "profiles");
    try {
      profiles = readdirSync(profilesDir)
        .filter((f) => f.endsWith(".md"))
        .map((f) => f.replace(/\.md$/, ""))
        .sort();
    } catch {
      // no profiles dir
    }

    entries.push({
      capability: name,
      specPath,
      profiles,
      purposeSnippet,
    });
  }

  return entries;
}

function scanModules(coreDir: string): ModuleEntry[] {
  const entries: ModuleEntry[] = [];
  let files: string[];
  try {
    files = readdirSync(coreDir).filter((f) => f.endsWith(".fs")).sort();
  } catch {
    return entries;
  }

  for (const file of files) {
    const filePath = join(coreDir, file);
    const content = readFileSync(filePath, "utf8");
    const nsMatch = content.match(/^namespace\s+(\S+)/m);
    entries.push({
      name: file,
      path: filePath,
      namespace: nsMatch ? nsMatch[1]! : "unknown",
    });
  }

  return entries;
}

// ── Gap analysis ─────────────────────────────────────────────────────

function buildGapReport(specs: SpecEntry[], modules: ModuleEntry[]): GapReport {
  const allModuleNames = new Set(modules.map((m) => m.name));
  const specCapabilities = new Set(specs.map((s) => s.capability));
  const coveredSet = new Set<string>();
  const mappings: Mapping[] = [];

  for (const [capability, moduleNames] of Object.entries(CAPABILITY_MODULE_MAP)) {
    const actualModules = moduleNames.filter((m) => allModuleNames.has(m));
    const missingModules = moduleNames.filter((m) => !allModuleNames.has(m));
    mappings.push({ capability, modules: actualModules, missingModules });
    if (specCapabilities.has(capability)) {
      for (const m of actualModules) {
        coveredSet.add(m);
      }
    }
  }

  const coveredModules = [...coveredSet].sort();
  const uncoveredModules = modules
    .map((m) => m.name)
    .filter((m) => !coveredSet.has(m) && !EXCLUDED_MODULES.has(m))
    .sort();

  const mappedCapabilities = new Set(Object.keys(CAPABILITY_MODULE_MAP));
  const unmappedSpecs = [...specCapabilities]
    .filter((c) => !mappedCapabilities.has(c))
    .sort();

  const excludedPresent = modules.filter((m) => EXCLUDED_MODULES.has(m.name)).length;
  const totalAnalyzable = modules.length - excludedPresent;
  const coveragePercent =
    totalAnalyzable > 0
      ? Math.round((coveredModules.length / totalAnalyzable) * 1000) / 10
      : 0;

  return {
    timestamp: new Date().toISOString(),
    specs,
    modules,
    mappings,
    coveredModules,
    uncoveredModules,
    unmappedSpecs,
    coveragePercent,
  };
}

// ── CLI ──────────────────────────────────────────────────────────────

export {
  scanSpecs,
  scanModules,
  buildGapReport,
  CAPABILITY_MODULE_MAP,
  EXCLUDED_MODULES,
};
export type { SpecEntry, ModuleEntry, GapReport, Mapping };

export function main(): number {
  const repoRoot = findRepoRoot();
  const specsDir = join(repoRoot, "openspec", "specs");
  const coreDir = join(repoRoot, "src", "Core");

  const specs = scanSpecs(specsDir);
  const modules = scanModules(coreDir);
  const report = buildGapReport(specs, modules);

  // Convert absolute paths to repo-relative for display
  for (const s of report.specs) {
    s.specPath = relative(repoRoot, s.specPath);
  }
  for (const m of report.modules) {
    m.path = relative(repoRoot, m.path);
  }

  // Structured JSON to stdout
  console.log(JSON.stringify(report, null, 2));

  // Human-readable summary to stderr
  const err = console.error.bind(console);
  err("");
  err(`── OpenSpec inventory ──────────────────────────`);
  err(`  Specs:             ${report.specs.length}`);
  err(`  Core modules:      ${report.modules.length}`);
  err(`  Covered modules:   ${report.coveredModules.length}`);
  err(`  Uncovered modules: ${report.uncoveredModules.length}`);
  err(`  Coverage:          ${report.coveragePercent}%`);
  err("");

  const allMissing = report.mappings.flatMap((m) => m.missingModules);
  if (allMissing.length > 0) {
    err(`  Mapped modules not found in src/Core/ (possible drift):`);
    for (const m of allMissing) {
      err(`    - ${m}`);
    }
    err("");
  }

  if (report.unmappedSpecs.length > 0) {
    err(`  Specs without module mapping:`);
    for (const s of report.unmappedSpecs) {
      err(`    - ${s}`);
    }
    err("");
  }

  if (report.uncoveredModules.length > 0) {
    err(`  Uncovered modules (candidates for new specs):`);
    for (const m of report.uncoveredModules) {
      err(`    - ${m}`);
    }
    err("");
  }

  return 0;
}

if (import.meta.main) {
  process.exit(main());
}
