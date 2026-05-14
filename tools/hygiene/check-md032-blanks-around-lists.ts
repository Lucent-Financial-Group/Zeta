#!/usr/bin/env bun
// check-md032-blanks-around-lists.ts — pre-CI catch for MD032 violations.
//
// MD032 (markdownlint rule): "Lists should be surrounded by blank lines."
// Common failure mode in tick shards: a label sentence ending with `:`
// is immediately followed by a list item with no blank line between.
//
// Example (BAD — fires MD032):
//
//   Each row:
//   - id: updated
//   - title: updated
//
// Example (GOOD):
//
//   Each row:
//
//   - id: updated
//   - title: updated
//
// This helper catches the same pattern that markdownlint catches but
// runs locally (faster feedback) and pre-push (before the CI cycle).
//
// Scope: detects the most common pattern — a non-blank, non-list line
// immediately followed by a list item (`- `, `+ `, `* `, or `1. ` style).
// Markdownlint catches more variants; this is the minimal helper that
// catches the 5 recurring failures from the 2026-05-13/14 session.
//
// Exit codes:
//   0 — no findings (or no files processed)
//   1 — findings present; emits `file:line` for each
//
// CLI usage:
//   bun tools/hygiene/check-md032-blanks-around-lists.ts <file1> <file2> ...
//   bun tools/hygiene/check-md032-blanks-around-lists.ts --staged
//
// B-0456 — see docs/backlog/P2/B-0456-mechanize-md032-blanks-around-lists-pre-commit-2026-05-14.md

import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { resolve, relative } from "node:path";

export type Md032Finding = {
  file: string;
  line: number; // 1-indexed line where the list starts (after the bad break)
  context: string; // the first 60 chars of the offending list line
};

/**
 * Detect whether a line is a list-item start.
 *
 * Matches the three unordered-list markers (`-`, `+`, `*`) and the
 * ordered-list pattern (`1.`, `12.`, etc.), each followed by at least
 * one space. CommonMark allows list markers indented 0-3 spaces; 4+
 * spaces is treated as indented code, not a list — `[ ]{0,3}` enforces
 * that boundary so a code block line like `    - option` isn't falsely
 * flagged as a list start (Copilot P1 on PR #3075).
 */
function isListItemStart(line: string): boolean {
  return /^ {0,3}([-+*]|\d+\.)\s+/.test(line);
}

/**
 * A line is "blank" if it contains only whitespace.
 */
function isBlank(line: string): boolean {
  return /^\s*$/.test(line);
}

/**
 * A line is "list-friendly leading" if it can come right before a list
 * without an intervening blank. Three valid cases:
 *
 * 1. ATX heading directly above list (markdownlint allows by default).
 * 2. Already a list-item line (the prior bullet — sibling/nested list).
 * 3. An indented continuation of a list item (the prior bullet's body
 *    text wraps onto multiple lines — markdown treats indented lines
 *    inside a list block as part of the previous item).
 */
function isListFriendlyLeading(line: string): boolean {
  // ATX heading: # ## ### etc. (with required space after).
  if (/^#{1,6}\s+/.test(line)) return true;
  // Already a list item — nested or sibling list, both fine.
  if (isListItemStart(line)) return true;
  // Indented continuation of a list-item body (a leading space typically
  // means we're inside a list block, not a new paragraph).
  if (/^\s+\S/.test(line)) return true;
  return false;
}

/**
 * A line that opens or closes a fenced code block (`\`\`\`` or `~~~`,
 * optionally followed by an info string). The token must be on its
 * own line (possibly indented up to 3 spaces, per CommonMark).
 */
function isFenceLine(line: string): boolean {
  return /^ {0,3}(```|~~~)/.test(line);
}

export function findMd032Violations(content: string): { line: number; context: string }[] {
  const lines = content.split(/\r?\n/);
  const findings: { line: number; context: string }[] = [];
  // Track fenced-code-block state so list-like lines INSIDE code samples
  // (e.g., a documentation example showing a bad MD032 pattern) aren't
  // flagged. Codex P2 on PR #3075.
  let inFencedCode = false;
  // Walk pairwise: each list-start line is checked against the line before.
  for (let i = 1; i < lines.length; i++) {
    const cur = lines[i] ?? "";
    // Update fence state BEFORE the list-start check so a fence line
    // itself never registers as a list-start candidate.
    if (isFenceLine(cur)) {
      inFencedCode = !inFencedCode;
      continue;
    }
    if (inFencedCode) continue;
    if (!isListItemStart(cur)) continue;
    const prev = lines[i - 1] ?? "";
    if (isBlank(prev) || isListFriendlyLeading(prev)) continue;
    findings.push({
      line: i + 1, // 1-indexed
      context: cur.slice(0, 60),
    });
  }
  return findings;
}

/**
 * Walk a list of files; collect MD032 findings; return them as an
 * array. The CLI `main()` owns the output boundary (stderr emit,
 * exit code). Unreadable files are skipped silently — push or CI
 * will surface the underlying I/O error.
 */
export function checkFiles(files: string[]): Md032Finding[] {
  const all: Md032Finding[] = [];
  for (const f of files) {
    let content: string;
    try {
      content = readFileSync(f, "utf-8");
    } catch {
      // Unreadable — skip silently. The audit-duplicate-row-ids tool's
      // round-2 review pushed in the opposite direction (surface read
      // errors) but here we're a fast pre-push helper; the user will
      // see the broken file at push time or in CI anyway.
      continue;
    }
    const findings = findMd032Violations(content);
    for (const finding of findings) {
      all.push({
        file: f,
        line: finding.line,
        context: finding.context,
      });
    }
  }
  return all;
}

/**
 * Collect staged `.md` files via `git diff --name-only --cached`.
 */
function stagedMarkdownFiles(repoRoot: string): string[] {
  // eslint-disable-next-line sonarjs/no-os-command-from-path -- git invoked as explicit args array; no shell, no user input on the command line.
  const r = spawnSync(
    "git",
    ["-C", repoRoot, "diff", "--name-only", "--cached", "--diff-filter=AM"],
    { encoding: "utf-8" },
  );
  if (r.status !== 0) {
    console.error(`git diff failed: ${r.stderr ?? ""}`);
    return [];
  }
  return (r.stdout ?? "")
    .split("\n")
    .filter((line) => line.endsWith(".md"))
    .map((line) => `${repoRoot}/${line}`);
}

function main(): number {
  const repoRoot = resolve(import.meta.dir, "..", "..");
  const argv = process.argv.slice(2);

  let files: string[];
  if (argv.includes("--staged")) {
    files = stagedMarkdownFiles(repoRoot);
    if (files.length === 0) {
      console.log("check-md032: no staged .md files");
      return 0;
    }
  } else if (argv.length === 0) {
    console.error(
      "Usage: check-md032-blanks-around-lists.ts <file1> <file2> ... | --staged",
    );
    return 1;
  } else {
    files = argv.map((f) => (f.startsWith("/") ? f : resolve(f)));
  }

  const findings = checkFiles(files);

  if (findings.length === 0) {
    console.log(`check-md032: ${files.length} file(s) scanned, no MD032 findings`);
    return 0;
  }

  console.error(`check-md032: ${findings.length} MD032 finding(s):`);
  for (const f of findings) {
    const rel = f.file.startsWith(repoRoot) ? relative(repoRoot, f.file) : f.file;
    console.error(`  ${rel}:${f.line}: ${f.context}`);
  }
  return 1;
}

if (import.meta.main) {
  process.exit(main());
}
