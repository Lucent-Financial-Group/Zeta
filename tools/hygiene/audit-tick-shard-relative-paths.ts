#!/usr/bin/env bun
// audit-tick-shard-relative-paths.ts — detect broken relative-path
// links in `docs/hygiene-history/ticks/**/HHMMZ.md` tick shards.
//
// Tick shards live at docs/hygiene-history/ticks/YYYY/MM/DD/HHMMZ.md
// (5 directories below `docs/`). Common relative-link bug class —
// the agent counts directory levels wrong:
//
//   ../../../../.claude/rules/X.md   (4 levels)  → lands at docs/hygiene-history/ticks/2026/  — WRONG
//   ../../../../../.claude/rules/X.md  (5 levels)  → lands at docs/                              — WRONG
//   ../../../../../../.claude/rules/X.md (6 levels) → lands at repo root                          — CORRECT
//
// The bug class shipped twice in the same session (PR #3676 / PR #3679,
// both with 5-level paths that didn't reach .claude/rules/ at repo root).
// Copilot caught both via review threads. This audit mechanizes the catch
// so future shards fail CI before merge, not after.
//
// Scope:
//
//   - Walk docs/hygiene-history/ticks/**/*.md
//   - For each markdown link `[text](path)`, if path is relative (./...
//     or ../...) and not a URL/anchor/code-block, resolve from the shard's
//     directory and check the result is an existing file or directory
//     under the repo root.
//
// Out of scope:
//
//   - Absolute URLs (http://, https://, mailto:, etc.)
//   - In-page anchors (#section)
//   - Bare paths without parens (markdown text mentions, not links)
//   - Image embeds (![alt](path)) — same resolution rules apply, but
//     skipping for MVP; can extend later
//
// Usage:
//
//   bun tools/hygiene/audit-tick-shard-relative-paths.ts                # detect-only
//   bun tools/hygiene/audit-tick-shard-relative-paths.ts --enforce      # exit 1 on findings (CI gate)
//   bun tools/hygiene/audit-tick-shard-relative-paths.ts --files <p...> # scan specific files
//   bun tools/hygiene/audit-tick-shard-relative-paths.ts --json         # JSON output
//
// Exit codes:
//
//   0   no findings, OR detect-only mode (default)
//   1   findings present AND --enforce flag set
//   64  argument error
//
// Composes with: audit-section-33-migration-xrefs.ts (sibling template),
// audit-memory-references.ts (relative-link resolution pattern), the
// blocked-green-ci-investigate-threads.md rule (why this lint exists).

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, relative, resolve, dirname } from "node:path";
import { spawnSync } from "node:child_process";

// repo root via git rev-parse — same safe pattern as check-tick-history-shard-schema.ts

function repoRoot(): string {
  if (process.env["REPO_ROOT"]) return process.env["REPO_ROOT"]!;
  const r = spawnSync("git", ["rev-parse", "--show-toplevel"], { encoding: "utf8" });
  return r.status === 0 ? r.stdout.trim() : process.cwd();
}

const ROOT = resolve(repoRoot());
const SHARD_DIR = join(ROOT, "docs/hygiene-history/ticks");

// arg parsing

interface Args {
  enforce: boolean;
  json: boolean;
  files: readonly string[] | null;
}

function parseArgs(argv: readonly string[]): Args {
  let enforce = false;
  let json = false;
  let files: string[] | null = null;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]!;
    if (a === "--enforce") enforce = true;
    else if (a === "--json") json = true;
    else if (a === "--files") {
      files = [];
      while (i + 1 < argv.length && !argv[i + 1]!.startsWith("--")) {
        files.push(argv[++i]!);
      }
    } else {
      process.stderr.write(`unknown argument: ${a}\n`);
      process.exit(64);
    }
  }
  return { enforce, json, files };
}

// shard discovery

function walkShards(dir: string): string[] {
  const out: string[] = [];
  if (!existsSync(dir)) return out;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walkShards(p));
    else if (entry.isFile() && entry.name.endsWith(".md")) out.push(p);
  }
  return out;
}

// link extraction

interface LinkRef {
  readonly file: string;
  readonly line: number;
  readonly target: string;
}

// Matches markdown links `[text](target)`. Captures the target.
// Excludes images (preceded by `!`) and reference-style links.
const MD_LINK_RE = /(?<!!)\[(?:[^\]]*)\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g;

function isRelativeTarget(target: string): boolean {
  if (target.startsWith("http://") || target.startsWith("https://")) return false;
  if (target.startsWith("mailto:")) return false;
  if (target.startsWith("//")) return false;
  if (target.startsWith("#")) return false;
  if (target.startsWith("/")) return false;
  return true;
}

function stripAnchor(target: string): string {
  const hash = target.indexOf("#");
  return hash === -1 ? target : target.substring(0, hash);
}

function buildCodeFenceFlags(lines: readonly string[]): boolean[] {
  const flags = new Array<boolean>(lines.length).fill(false);
  let inFence = false;
  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i]!.trim();
    if (trimmed.startsWith("```")) {
      inFence = !inFence;
      flags[i] = inFence;
    } else {
      flags[i] = inFence;
    }
  }
  return flags;
}

function extractLinks(file: string): LinkRef[] {
  const text = readFileSync(file, "utf8");
  const lines = text.split("\n");
  const fenceFlags = buildCodeFenceFlags(lines);
  const out: LinkRef[] = [];
  for (let i = 0; i < lines.length; i++) {
    if (fenceFlags[i]) continue;
    const line = lines[i]!;
    MD_LINK_RE.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = MD_LINK_RE.exec(line)) !== null) {
      const target = m[1]!;
      if (isRelativeTarget(target)) {
        out.push({ file, line: i + 1, target });
      }
    }
  }
  return out;
}

// resolution + verdict

interface Finding {
  readonly file: string;
  readonly line: number;
  readonly target: string;
  readonly resolved: string;
  readonly reason: "missing" | "escapes-repo";
}

function repoRelative(p: string): string {
  return relative(ROOT, p).replaceAll("\\", "/");
}

function checkLink(link: LinkRef): Finding | null {
  const base = dirname(link.file);
  const stripped = stripAnchor(link.target);
  const abs = resolve(base, stripped);
  const rel = repoRelative(abs);

  if (!abs.startsWith(ROOT + "/") && abs !== ROOT) {
    return {
      file: repoRelative(link.file),
      line: link.line,
      target: link.target,
      resolved: abs,
      reason: "escapes-repo",
    };
  }

  if (!existsSync(abs)) {
    return {
      file: repoRelative(link.file),
      line: link.line,
      target: link.target,
      resolved: rel,
      reason: "missing",
    };
  }

  return null;
}

// main

function main(argv: readonly string[]): 0 | 1 | 64 {
  const args = parseArgs(argv);

  const shards = args.files
    ? args.files.map((f) => resolve(f))
    : walkShards(SHARD_DIR);

  if (shards.length === 0) {
    if (args.files) {
      process.stderr.write("no input files\n");
      return 64;
    }
    process.stderr.write(`no tick shards found under ${SHARD_DIR}\n`);
    return 0;
  }

  const findings: Finding[] = [];
  for (const shard of shards) {
    for (const link of extractLinks(shard)) {
      const f = checkLink(link);
      if (f) findings.push(f);
    }
  }

  if (args.json) {
    process.stdout.write(JSON.stringify({ shardsScanned: shards.length, findings }, null, 2) + "\n");
  } else if (findings.length === 0) {
    process.stdout.write(`ok: scanned ${shards.length} tick shards; 0 broken relative-path links\n`);
  } else {
    process.stdout.write(`scanned ${shards.length} tick shards; ${findings.length} broken relative-path links:\n\n`);
    for (const f of findings) {
      process.stdout.write(`  ${f.file}:${f.line}  ${f.reason}\n`);
      process.stdout.write(`    target:   ${f.target}\n`);
      process.stdout.write(`    resolved: ${f.resolved}\n\n`);
    }
  }

  if (args.enforce && findings.length > 0) return 1;
  return 0;
}

process.exit(main(process.argv.slice(2)));
