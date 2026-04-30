#!/usr/bin/env bun
// audit-md032-plus-linestart.ts — detect MD032 false-trigger pattern.
//
// TypeScript+Bun port of audit-md032-plus-linestart.sh, per the
// 2026-04-29 directive to canonicalize on TS+Bun for tooling.
// See docs/trajectories/typescript-bun-migration/RESUME.md for the
// trajectory; see B-0086 for the migration discipline.
//
// What this does:
//   Detects markdown files where a line starts with `+ ` inside
//   a paragraph (no blank line above, previous line is not itself
//   a `+ `-list continuation) — the pattern that markdownlint
//   MD032 treats as "list item missing blank line."
//
// Detection shape (CommonMark-aware):
//   * Scans each line matching `^ {0,3}\+ ` (CommonMark allows
//     up to 3 leading spaces on list-marker lines).
//   * Flags a gap only when the previous line is **not blank**
//     (after stripping all whitespace: spaces, tabs, CR) **and**
//     the previous line is itself **not** a `^ {0,3}\+ ` line.
//   * No file-level skip heuristic — every candidate line is
//     judged on its own per-line context.
//
// Usage:
//   bun tools/hygiene/audit-md032-plus-linestart.ts              # summary
//   bun tools/hygiene/audit-md032-plus-linestart.ts --list       # list offending lines
//   bun tools/hygiene/audit-md032-plus-linestart.ts --enforce    # exit 2 on any gap
//
// Exit codes:
//   0 — no offending `+ `-at-line-start patterns (or --enforce
//       not set and gaps found)
//   2 — gaps found and --enforce was set

import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";

type Mode = "summary" | "list" | "enforce";

function parseMode(argv: readonly string[]): Mode {
  const arg = argv[0];
  if (arg === "--list") return "list";
  if (arg === "--enforce") return "enforce";
  return "summary";
}

function runGit(args: readonly string[]): string {
  // eslint-disable-next-line sonarjs/no-os-command-from-path -- git is required tooling per the factory bootstrap (mise pin); shell-injection-resistant via explicit args array.
  const result = spawnSync("git", args, { encoding: "utf8" });
  if (result.status !== 0) {
    throw new Error(`git ${args.join(" ")} failed`);
  }
  return result.stdout;
}

function repoRoot(): string {
  return runGit(["rev-parse", "--show-toplevel"]).trim();
}

function listMarkdownFiles(): string[] {
  return runGit(["ls-files", "-z", "*.md"])
    .split("\0")
    .filter((s) => s.length > 0);
}

const EXCLUDE_RE =
  /^(docs\/ROUND-HISTORY\.md|docs\/hygiene-history\/|docs\/DECISIONS\/|tools\/hygiene\/audit-md032-plus-linestart\.(sh|ts))/;

const PLUS_MARKER_RE = /^ {0,3}\+ /;

function isBlankAfterStrip(line: string): boolean {
  return line.replace(/\s/g, "").length === 0;
}

function auditFile(file: string): string[] {
  const content = readFileSync(file, "utf8");
  const lines = content.split("\n");
  // Match the bash behavior: a trailing newline produces an empty
  // last element which we drop, but a file without trailing newline
  // keeps its final partial line.
  if (lines.length > 0 && lines[lines.length - 1] === "") {
    lines.pop();
  }

  const gaps: string[] = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? "";
    if (!PLUS_MARKER_RE.test(line)) continue;
    if (i === 0) continue;
    const prev = lines[i - 1] ?? "";
    if (isBlankAfterStrip(prev)) continue;
    if (PLUS_MARKER_RE.test(prev)) continue;
    gaps.push(`${file}:${String(i + 1)}`);
  }
  return gaps;
}

function main(argv: readonly string[]): number {
  const mode = parseMode(argv);
  process.chdir(repoRoot());

  const files = listMarkdownFiles().filter((f) => !EXCLUDE_RE.test(f));
  const gapLines: string[] = [];
  for (const file of files) {
    gapLines.push(...auditFile(file));
  }
  const gapCount = gapLines.length;

  if (mode === "list") {
    if (gapCount > 0) {
      console.log(gapLines.join("\n"));
    }
    return 0;
  }

  if (mode === "enforce") {
    if (gapCount > 0) {
      console.log(`MD032 '+'-at-line-start gaps: ${String(gapCount)}`);
      for (const line of gapLines) console.log(`  ${line}`);
      console.log("");
      console.log(
        "Fix: replace '+' at line start with 'and' or similar prose",
      );
      console.log(
        "continuation, OR add a blank line before the '+' to make it",
      );
      console.log("an intentional list (which markdownlint accepts).");
      return 2;
    }
    console.log("MD032 '+'-at-line-start gaps: 0 (clean)");
    return 0;
  }

  if (gapCount > 0) {
    console.log(`MD032 '+'-at-line-start gaps: ${String(gapCount)}`);
    console.log("run with --list to see offending file:line locations");
  } else {
    console.log("MD032 '+'-at-line-start gaps: 0 (clean)");
  }
  return 0;
}

const code = main(process.argv.slice(2));
process.exit(code);
