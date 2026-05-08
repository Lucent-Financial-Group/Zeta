#!/usr/bin/env bun
/**
 * openspec/inventory.ts (v0.1.0)
 *
 * Phase 1 mechanization for B-0171: scans openspec/specs/ and src/Core/
 * to produce a structured gap report — which code modules have specs,
 * which don't, and which specs have no matching code module.
 *
 * Output: JSON to stdout. Human-readable summary to stderr.
 */

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, resolve } from "node:path";

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
  let cur = resolve(__dirname);
  while (cur !== "/" && cur !== "") {
    try {
      statSync(join(cur, ".git"));
      return cur;
    } catch {
      const parent = join(cur, "..");
      if (resolve(parent) === cur) break;
      cur = resolve(parent);
    }
  }
  return process.cwd();
}

function scanSpecs(specsDir: string): SpecEntry[] {
  const entries: SpecEntry[] = [];
  let dirs: string[];
  try {
    dirs = readdirSync(specsDir);
  } catch {
    return entries;
  }

  for (const name of dirs) {
    const specPath = join(specsDir, name, "spec.md");
    try {
      statSync(specPath);
    } catch {
      continue;
    }

    const content = readFileSync(specPath, "utf8");
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
        .map((f) => f.replace(/\.md$/, ""));
    } catch {
      // no profiles dir
    }

    entries.push({
      capability: name,
      specPath: `openspec/specs/${name}/spec.md`,
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
    files = readdirSync(coreDir).filter((f) => f.endsWith(".fs"));
  } catch {
    return entries;
  }

  for (const file of files) {
    const filePath = join(coreDir, file);
    const content = readFileSync(filePath, "utf8");
    const nsMatch = content.match(/^namespace\s+(\S+)/m);
    entries.push({
      name: file,
      path: `src/Core/${file}`,
      namespace: nsMatch ? nsMatch[1]! : "unknown",
    });
  }

  return entries;
}

// ── Gap analysis ─────────────────────────────────────────────────────

function buildGapReport(specs: SpecEntry[], modules: ModuleEntry[]): GapReport {
  const allModuleNames = new Set(modules.map((m) => m.name));
  const coveredSet = new Set<string>();
  const mappings: Mapping[] = [];

  for (const [capability, moduleNames] of Object.entries(CAPABILITY_MODULE_MAP)) {
    const actualModules = moduleNames.filter((m) => allModuleNames.has(m));
    mappings.push({ capability, modules: actualModules });
    for (const m of actualModules) {
      coveredSet.add(m);
    }
  }

  const coveredModules = [...coveredSet].sort();
  const uncoveredModules = modules
    .map((m) => m.name)
    .filter((m) => !coveredSet.has(m) && !EXCLUDED_MODULES.has(m))
    .sort();

  const specCapabilities = new Set(specs.map((s) => s.capability));
  const mappedCapabilities = new Set(Object.keys(CAPABILITY_MODULE_MAP));
  const unmappedSpecs = [...specCapabilities]
    .filter((c) => !mappedCapabilities.has(c))
    .sort();

  const totalAnalyzable = modules.length - EXCLUDED_MODULES.size;
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
