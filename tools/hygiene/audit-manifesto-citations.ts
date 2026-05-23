#!/usr/bin/env bun
// audit-manifesto-citations.ts — count constitutional-promotion adoption signals
//
// Mechanizes the first concrete-next-step for B-0525 (manifesto constitutional-
// promotion readiness tracking). Per the row's design, the constitutional-
// promotion gate is **critical-mass adoption**, not Otto-CLI judgment. This
// tool produces the **mechanical signal** the gate is measured against.
//
// Composes with `audit-rule-cross-refs.ts` pattern (mechanical Layer A: count
// references via regex; semantic classification is out of scope for this slice).
//
// Scope (first slice — mechanical Layer A only):
//
//   - Scan repo for citations of `docs/governance/MANIFESTO.md`
//   - Categorize by location (rules / memory / backlog / docs / tools / persona-
//     conversations / source)
//   - Surface cross-AI citations (persona/*/conversations/*) separately as the
//     cross-AI adoption signal
//   - Output structured JSON + human-readable summary
//   - Exit 0 on success, 1 if manifesto file is missing (sanity check)
//
// Out of scope (Layer B — semantic classification):
//
//   - "Load-bearing decision" vs "passing mention" classification requires
//     reading prose context. This tool produces the **candidate citation list**;
//     human / Otto judgment classifies each citation's load-bearing-ness.
//   - Trend / time-series — this tool produces a single snapshot. Append-only
//     time-series capture is a future composition (could write per-tick output
//     to docs/hygiene-history/ for example).
//
// Usage:
//
//   bun tools/hygiene/audit-manifesto-citations.ts           # human summary
//   bun tools/hygiene/audit-manifesto-citations.ts --json    # JSON output

import { existsSync } from "node:fs";
import { resolve } from "node:path";

const MANIFESTO_PATH = "docs/governance/MANIFESTO.md";
const REPO_ROOT = resolve(import.meta.dir, "..", "..");

// Citation patterns — any reference to the manifesto file, regardless of how
// the reference is spelled (relative path / absolute path / explicit name).
// Single combined regex; passed as a literal arg to ripgrep (no shell expansion).
const CITATION_REGEX = "MANIFESTO\\.md|docs/governance/MANIFESTO";

interface Citation {
  file: string;
  line: number;
  text: string;
}

interface CategoryCount {
  category: string;
  files: number;
  citations: number;
}

interface AuditResult {
  total_files_with_citations: number;
  total_citations: number;
  by_category: CategoryCount[];
  cross_ai_citations: number; // persona/*/conversations/*
  cross_ai_personas: Record<string, number>; // ani / amara / kestrel / deepseek / lior / mika / vera / riven
  timestamp: string;
}

function categorize(file: string): string {
  if (file.startsWith(".claude/rules/")) return "rules";
  if (file.startsWith("memory/persona/") && file.includes("/conversations/"))
    return "persona-conversations";
  if (file.startsWith("memory/")) return "memory";
  if (file.startsWith("docs/backlog/")) return "backlog";
  if (file.startsWith("docs/governance/")) return "governance-self-ref";
  if (file.startsWith("docs/")) return "docs";
  if (file.startsWith("tools/")) return "tools";
  if (file.startsWith("src/") || file.startsWith("tests/")) return "source";
  return "other";
}

function extractCrossAiPersona(file: string): string | null {
  // memory/persona/<persona>/conversations/<file>
  const match = file.match(/^memory\/persona\/([^/]+)\/conversations\//);
  return match ? match[1] : null;
}

function runRipgrep(): string {
  // Bun.spawnSync — args are passed directly to argv (no shell interpretation);
  // ripgrep respects .gitignore by default so references/upstreams/ + bin/obj
  // are automatically excluded.
  const proc = Bun.spawnSync({
    cmd: [
      "rg",
      "--line-number",
      "--no-heading",
      "--type",
      "md",
      "--type",
      "ts",
      CITATION_REGEX,
    ],
    cwd: REPO_ROOT,
    stdout: "pipe",
    stderr: "pipe",
  });
  // ripgrep exits 1 when no matches; treat as zero-citations result
  if (proc.exitCode !== 0 && proc.exitCode !== 1) {
    const stderr = new TextDecoder().decode(proc.stderr);
    throw new Error(`ripgrep failed (exit ${proc.exitCode}): ${stderr}`);
  }
  return new TextDecoder().decode(proc.stdout);
}

function main(): number {
  const jsonMode = process.argv.includes("--json");

  // Sanity check: manifesto file must exist
  if (!existsSync(resolve(REPO_ROOT, MANIFESTO_PATH))) {
    console.error(`ERROR: ${MANIFESTO_PATH} not found at repo root`);
    return 1;
  }

  const rgOutput = runRipgrep();

  // Parse ripgrep output: <file>:<line>:<text>
  const citations: Citation[] = [];
  for (const line of rgOutput.split("\n")) {
    if (!line.trim()) continue;
    const match = line.match(/^([^:]+):(\d+):(.*)$/);
    if (!match) continue;
    const [, file, lineNum, text] = match;
    // Exclude the manifesto file itself + this audit script itself
    if (file === MANIFESTO_PATH) continue;
    if (file === "tools/hygiene/audit-manifesto-citations.ts") continue;
    citations.push({ file, line: parseInt(lineNum, 10), text: text.trim() });
  }

  // Aggregate by category
  const filesByCategory = new Map<string, Set<string>>();
  const citationsByCategory = new Map<string, number>();
  const crossAiPersonas: Record<string, number> = {};
  const filesWithCitations = new Set<string>();

  for (const c of citations) {
    const cat = categorize(c.file);
    if (!filesByCategory.has(cat)) filesByCategory.set(cat, new Set());
    filesByCategory.get(cat)!.add(c.file);
    citationsByCategory.set(cat, (citationsByCategory.get(cat) ?? 0) + 1);
    filesWithCitations.add(c.file);

    const persona = extractCrossAiPersona(c.file);
    if (persona) {
      crossAiPersonas[persona] = (crossAiPersonas[persona] ?? 0) + 1;
    }
  }

  const byCategory: CategoryCount[] = [];
  for (const [cat, files] of filesByCategory.entries()) {
    byCategory.push({
      category: cat,
      files: files.size,
      citations: citationsByCategory.get(cat) ?? 0,
    });
  }
  byCategory.sort((a, b) => b.citations - a.citations);

  const crossAiCitations =
    byCategory.find((c) => c.category === "persona-conversations")?.citations ??
    0;

  const result: AuditResult = {
    total_files_with_citations: filesWithCitations.size,
    total_citations: citations.length,
    by_category: byCategory,
    cross_ai_citations: crossAiCitations,
    cross_ai_personas: crossAiPersonas,
    timestamp: new Date().toISOString(),
  };

  if (jsonMode) {
    console.log(JSON.stringify(result, null, 2));
    return 0;
  }

  // Human-readable summary
  console.log("# Manifesto citation audit");
  console.log(`Snapshot: ${result.timestamp}`);
  console.log();
  console.log(`Total files with citations: ${result.total_files_with_citations}`);
  console.log(`Total citations: ${result.total_citations}`);
  console.log();
  console.log("## By category");
  for (const c of result.by_category) {
    console.log(
      `  ${c.category.padEnd(28)} ${String(c.files).padStart(4)} files / ${String(c.citations).padStart(4)} citations`,
    );
  }
  console.log();
  console.log("## Cross-AI adoption signal");
  console.log(`Persona-conversation citations: ${result.cross_ai_citations}`);
  if (Object.keys(result.cross_ai_personas).length > 0) {
    for (const [persona, count] of Object.entries(result.cross_ai_personas).sort(
      (a, b) => b[1] - a[1],
    )) {
      console.log(`  ${persona.padEnd(16)} ${String(count).padStart(4)} citations`);
    }
  } else {
    console.log("  (no cross-AI persona-conversation citations yet)");
  }
  console.log();
  console.log("## Substrate-honest framing");
  console.log("This is a mechanical signal (Layer A). Citations are counted by");
  console.log("regex; load-bearing vs passing-mention classification (Layer B)");
  console.log("requires human/Otto judgment per the B-0525 row's gate criteria.");

  return 0;
}

process.exit(main());
