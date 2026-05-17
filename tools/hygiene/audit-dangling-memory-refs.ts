#!/usr/bin/env bun
// audit-dangling-memory-refs.ts — find in-repo citations to `memory/feedback_*.md`
// paths that do NOT exist in-repo (dangling).
//
// Background: the maintainer's Otto-CLI auto-loads user-scope memory at
// `~/.claude/projects/.../memory/`, so citations of the form
// `memory/feedback_<name>.md` resolve transparently. A cold-boot agent on
// a fresh checkout (different machine, new contributor, CI agent) does NOT
// have user-scope memory and follows the path to find nothing.
//
// Audit memos: PRs #4031 (5 dangling refs in .claude/rules/) + #4041
// (29 across 4 surfaces). This tool mechanizes the methodology so the
// drift can be tracked via CI rather than via periodic manual sweeps.
//
// Rule 0: TypeScript (no .sh) per `.claude/rules/rule-0-no-sh-files.md`.
//
// Usage:
//   bun tools/hygiene/audit-dangling-memory-refs.ts           # human report, default surfaces
//   bun tools/hygiene/audit-dangling-memory-refs.ts --json    # JSON output for CI
//   bun tools/hygiene/audit-dangling-memory-refs.ts --surfaces docs/research docs/backlog
//
// Run from the repo root, or set REPO_ROOT env var.
//
// Exit codes:
//   0   no dangling refs found
//   1   one or more dangling refs found
//   2   no surfaces found / configuration error

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";

// Lazy resolver so REPO_ROOT can be set per-call (e.g., by tests using
// tmpdir fixtures). A module-level `const ROOT` would capture the value
// at import time and ignore later overrides.
function repoRoot(): string {
  return resolve(process.env["REPO_ROOT"] ?? process.cwd());
}

const DEFAULT_SURFACES = [
  ".claude/agents",
  ".claude/skills",
  ".claude/rules",
  "docs/research",
  "docs/backlog",
  "memory/persona",
] as const;

// Match `memory/feedback_<name>.md` where the file is referenced as a path
// (NOT just a string in code). Captures the leading "memory/" prefix so
// the captured string can be used directly with fs operations.
const MEM_REF_RE = /memory\/feedback_[A-Za-z0-9_-]+\.md/g;

interface DanglingEdge {
  citing: string; // citing file (relative to ROOT)
  line: number;
  ref: string; // referenced path (e.g. "memory/feedback_X.md")
}

interface SurfaceReport {
  surface: string;
  scanned: number;
  edges: DanglingEdge[];
  uniqueRefs: number;
  uniqueDanglingRefs: number;
}

function normalizeToPosix(p: string): string {
  return p.replaceAll("\\", "/");
}

function repoRelative(p: string): string {
  return normalizeToPosix(relative(repoRoot(), p));
}

function isDir(p: string): boolean {
  try {
    return statSync(p).isDirectory();
  } catch {
    return false;
  }
}

function isFile(p: string): boolean {
  try {
    return statSync(p).isFile();
  } catch {
    return false;
  }
}

function findMarkdownFiles(dir: string): string[] {
  const out: string[] = [];
  function walk(d: string): void {
    let entries: string[];
    try {
      entries = readdirSync(d);
    } catch {
      return;
    }
    for (const entry of entries) {
      const full = join(d, entry);
      try {
        const st = statSync(full);
        if (st.isDirectory()) walk(full);
        else if (entry.endsWith(".md")) out.push(full);
      } catch {
        /* skip unreadable */
      }
    }
  }
  walk(dir);
  return out;
}

export function findEdgesInFile(absPath: string): DanglingEdge[] {
  let content: string;
  try {
    content = readFileSync(absPath, "utf8");
  } catch {
    return [];
  }
  const edges: DanglingEdge[] = [];
  const lines = content.split("\n");
  const rel = repoRelative(absPath);
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? "";
    const matches = line.matchAll(MEM_REF_RE);
    for (const m of matches) {
      edges.push({ citing: rel, line: i + 1, ref: m[0] });
    }
  }
  return edges;
}

export function isDangling(ref: string): boolean {
  const abs = join(repoRoot(), ref);
  return !isFile(abs);
}

export function auditSurface(surfaceRel: string): SurfaceReport {
  const surfaceAbs = join(repoRoot(), surfaceRel);
  if (!isDir(surfaceAbs)) {
    return {
      surface: surfaceRel,
      scanned: 0,
      edges: [],
      uniqueRefs: 0,
      uniqueDanglingRefs: 0,
    };
  }
  const mdFiles = findMarkdownFiles(surfaceAbs);
  const allEdges: DanglingEdge[] = [];
  const uniqueRefsSet = new Set<string>();
  for (const f of mdFiles) {
    const edges = findEdgesInFile(f);
    for (const e of edges) {
      uniqueRefsSet.add(e.ref);
      if (isDangling(e.ref)) allEdges.push(e);
    }
  }
  const uniqueDanglingRefsSet = new Set(allEdges.map((e) => e.ref));
  return {
    surface: surfaceRel,
    scanned: mdFiles.length,
    edges: allEdges,
    uniqueRefs: uniqueRefsSet.size,
    uniqueDanglingRefs: uniqueDanglingRefsSet.size,
  };
}

interface AuditOutput {
  root: string;
  surfaces: SurfaceReport[];
  totals: {
    surfacesScanned: number;
    filesScanned: number;
    danglingEdges: number;
    uniqueDanglingRefs: number;
  };
}

export function runAudit(surfaces: readonly string[]): AuditOutput {
  const reports = surfaces.map((s) => auditSurface(s));
  const allDanglingRefs = new Set<string>();
  let danglingEdges = 0;
  let filesScanned = 0;
  for (const r of reports) {
    filesScanned += r.scanned;
    danglingEdges += r.edges.length;
    for (const e of r.edges) allDanglingRefs.add(e.ref);
  }
  return {
    root: repoRoot(),
    surfaces: reports,
    totals: {
      surfacesScanned: reports.length,
      filesScanned,
      danglingEdges,
      uniqueDanglingRefs: allDanglingRefs.size,
    },
  };
}

function renderHuman(out: AuditOutput): string {
  const lines: string[] = [];
  lines.push(`audit-dangling-memory-refs — ROOT=${out.root}`);
  lines.push("");
  for (const r of out.surfaces) {
    lines.push(
      `${r.surface}: ${r.edges.length} dangling edges / ${r.uniqueDanglingRefs} unique dangling refs (${r.scanned} files scanned, ${r.uniqueRefs} unique refs total)`,
    );
    for (const e of r.edges) {
      lines.push(`  ${e.citing}:${e.line} → ${e.ref}`);
    }
  }
  lines.push("");
  lines.push(
    `TOTAL: ${out.totals.danglingEdges} dangling edges / ${out.totals.uniqueDanglingRefs} unique dangling refs across ${out.totals.surfacesScanned} surfaces (${out.totals.filesScanned} files scanned)`,
  );
  return lines.join("\n");
}

export function main(argv: string[]): number {
  let json = false;
  let collectingSurfaces = false;
  const customSurfaces: string[] = [];

  for (const a of argv) {
    if (a === "--json") {
      json = true;
      collectingSurfaces = false;
    } else if (a === "--surfaces") {
      collectingSurfaces = true;
    } else if (collectingSurfaces) {
      customSurfaces.push(a);
    }
  }

  const surfaces =
    customSurfaces.length > 0 ? customSurfaces : [...DEFAULT_SURFACES];

  // Validate at least one surface exists; otherwise it's a configuration
  // error rather than a clean run.
  const anyDirExists = surfaces.some((s) => isDir(join(repoRoot(), s)));
  if (!anyDirExists) {
    process.stderr.write(
      `error: none of the requested surfaces exist under ROOT=${repoRoot()}\n`,
    );
    return 2;
  }

  const out = runAudit(surfaces);

  if (json) {
    process.stdout.write(JSON.stringify(out, null, 2) + "\n");
  } else {
    process.stdout.write(renderHuman(out) + "\n");
  }

  return out.totals.danglingEdges > 0 ? 1 : 0;
}

if (import.meta.main) {
  process.exit(main(process.argv.slice(2)));
}
