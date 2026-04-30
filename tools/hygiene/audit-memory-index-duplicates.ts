#!/usr/bin/env bun
// audit-memory-index-duplicates.ts — detect duplicate link targets
// in MEMORY.md-shaped indexes.
//
// TypeScript+Bun port of audit-memory-index-duplicates.sh, per the
// 2026-04-29 directive to canonicalize on TS+Bun for tooling.
// See docs/trajectories/typescript-bun-migration/RESUME.md for the
// trajectory; see B-0086 for the migration discipline.
//
// Detection strategy:
//   Line-grep the target file for `](filename.md)` link targets,
//   normalize equivalent paths (strip leading `./`), tally by
//   normalized filename. Any count > 1 is a duplicate.
//
// What this does NOT catch:
//   - Substantially similar descriptions of different files.
//   - External http(s) URLs (the regex requires `.md` suffix).
//
// Note: `.md` link targets inside fenced code blocks ARE matched
// by the regex (the scan is not block-aware). For target files
// like memory/MEMORY.md that don't use fenced code blocks, this
// is fine; for callers passing other shapes, pre-strip fences
// before invocation.
//
// Usage:
//   bun tools/hygiene/audit-memory-index-duplicates.ts              # in-repo memory/MEMORY.md
//   bun tools/hygiene/audit-memory-index-duplicates.ts --file PATH  # custom path
//   bun tools/hygiene/audit-memory-index-duplicates.ts --enforce    # exit 2 on any dup
//
// Exit codes:
//   0 — no duplicates (or --enforce not set)
//   2 — duplicates found and --enforce set
//   64 — argument error

import { readFileSync } from "node:fs";

interface Args {
  target: string;
  enforce: boolean;
}

function parseArgs(argv: readonly string[]): Args {
  let target = "memory/MEMORY.md";
  let enforce = false;
  let i = 0;
  while (i < argv.length) {
    const arg = argv[i];
    if (arg === "--file") {
      const value = argv[i + 1];
      if (value === undefined) {
        process.stderr.write("error: --file requires a path\n");
        process.exit(64);
      }
      target = value;
      i += 2;
    } else if (arg === "--enforce") {
      enforce = true;
      i += 1;
    } else if (arg === "-h" || arg === "--help") {
      process.stdout.write(
        "Usage: audit-memory-index-duplicates.ts [--file PATH] [--enforce]\n",
      );
      process.exit(0);
    } else {
      process.stderr.write(`unknown arg: ${String(arg)}\n`);
      process.exit(64);
    }
  }
  return { target, enforce };
}

const LINK_RE = /\]\(([a-zA-Z_0-9./-]+\.md)\)/g;

interface DupRow {
  count: number;
  target: string;
}

function findDuplicates(content: string): DupRow[] {
  const counts = new Map<string, number>();
  for (const match of content.matchAll(LINK_RE)) {
    const captured = match[1] ?? "";
    const path = captured.startsWith("./") ? captured.slice(2) : captured;
    counts.set(path, (counts.get(path) ?? 0) + 1);
  }
  const dups: DupRow[] = [];
  for (const [target, count] of counts) {
    if (count > 1) dups.push({ count, target });
  }
  // Sort by count descending (matches `sort -rn` in the bash original).
  dups.sort((a, b) => b.count - a.count || a.target.localeCompare(b.target));
  return dups;
}

function main(argv: readonly string[]): number {
  const { target, enforce } = parseArgs(argv);

  // Read target atomically — readFileSync throws ENOENT/EISDIR if missing,
  // matching the prior existsSync check. Avoids the TOCTOU race between
  // the check and the read (CodeQL js/file-system-race).
  let content: string;
  try {
    content = readFileSync(target, "utf8");
  } catch {
    process.stderr.write(`error: target file not found: ${target}\n`);
    return 64;
  }
  const dups = findDuplicates(content);

  if (dups.length === 0) {
    process.stderr.write(`no duplicate memory-index links in ${target}\n`);
    return 0;
  }

  process.stderr.write(`duplicate memory-index links in ${target}:\n`);
  process.stderr.write("\n");
  process.stderr.write("  count  target\n");
  process.stderr.write("  -----  ------\n");
  for (const { count, target: t } of dups) {
    process.stderr.write(`  ${String(count).padStart(5)}  ${t}\n`);
  }
  process.stderr.write("\n");
  process.stderr.write("Each row shows how many times the target appears.\n");
  process.stderr.write(
    "Expected: every in-repo memory file listed exactly once\n",
  );
  process.stderr.write(
    "in newest-first order. Duplicates typically mean an\n",
  );
  process.stderr.write(
    "edit pass added a new pointer without removing the old.\n",
  );
  process.stderr.write("\n");
  process.stderr.write(
    `To fix: open ${target} and remove the older entry for each\n`,
  );
  process.stderr.write(
    "duplicated target, keeping the newest-first-ordered one.\n",
  );

  if (enforce) return 2;
  return 0;
}

const code = main(process.argv.slice(2));
process.exit(code);
