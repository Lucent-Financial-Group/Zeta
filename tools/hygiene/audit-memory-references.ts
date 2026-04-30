#!/usr/bin/env bun
// audit-memory-references.ts — detect broken memory-file references
// in `memory/MEMORY.md`.
//
// TypeScript+Bun port of audit-memory-references.sh, per the
// 2026-04-29 directive to canonicalize on TS+Bun for tooling.
// See docs/trajectories/typescript-bun-migration/RESUME.md for the
// trajectory; see B-0086 for the migration discipline.
//
// Every `](foo.md)` link target in MEMORY.md MUST resolve to an
// actual file under `memory/`. Together with the duplicate-detector
// and the memory-index-integrity workflow, this forms three-part
// memory-index hygiene:
//   1. Every memory file change updates MEMORY.md (workflow).
//   2. MEMORY.md has no duplicate link targets (sibling lint).
//   3. Every MEMORY.md link target resolves to an actual file
//      (this tool).
//
// Usage:
//   bun tools/hygiene/audit-memory-references.ts                  # default: memory/MEMORY.md
//   bun tools/hygiene/audit-memory-references.ts --file PATH      # custom file
//   bun tools/hygiene/audit-memory-references.ts --base DIR       # default: memory
//   bun tools/hygiene/audit-memory-references.ts --enforce        # exit 2 on any broken ref
//
// Exit codes:
//   0 — all references resolve (or --enforce not set)
//   2 — broken references found and --enforce set
//   64 — argument error

import { statSync, readFileSync } from "node:fs";

interface Args {
  target: string;
  baseDir: string;
  enforce: boolean;
}

function parseArgs(argv: readonly string[]): Args {
  let target = "memory/MEMORY.md";
  let baseDir = "memory";
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
    } else if (arg === "--base") {
      const value = argv[i + 1];
      if (value === undefined) {
        process.stderr.write("error: --base requires a directory\n");
        process.exit(64);
      }
      baseDir = value;
      i += 2;
    } else if (arg === "--enforce") {
      enforce = true;
      i += 1;
    } else if (arg === "-h" || arg === "--help") {
      process.stdout.write(
        "Usage: audit-memory-references.ts [--file PATH] [--base DIR] [--enforce]\n",
      );
      process.exit(0);
    } else {
      process.stderr.write(`unknown arg: ${String(arg)}\n`);
      process.exit(64);
    }
  }
  return { target, baseDir, enforce };
}

const LINK_RE = /\]\(([a-zA-Z_0-9./-]+\.md)\)/g;

function isFile(p: string): boolean {
  try {
    return statSync(p).isFile();
  } catch {
    return false;
  }
}

interface AuditResult {
  total: number;
  okCount: number;
  broken: { ref: string; tried: string }[];
}

function audit(content: string, baseDir: string): AuditResult {
  const refs = new Set<string>();
  for (const match of content.matchAll(LINK_RE)) {
    const captured = match[1];
    if (captured !== undefined) refs.add(captured);
  }

  const sortedRefs = [...refs].sort((a, b) => a.localeCompare(b));
  const broken: { ref: string; tried: string }[] = [];
  let okCount = 0;
  for (const ref of sortedRefs) {
    const fileRel = `${baseDir}/${ref}`;
    if (isFile(fileRel)) {
      okCount += 1;
      continue;
    }
    if (ref.includes("/") && isFile(ref)) {
      okCount += 1;
      continue;
    }
    broken.push({ ref, tried: fileRel });
  }
  return { total: sortedRefs.length, okCount, broken };
}

function main(argv: readonly string[]): number {
  const { target, baseDir, enforce } = parseArgs(argv);

  // Read target atomically — readFileSync throws ENOENT/EISDIR if missing
  // or not a regular file, which is the same failure case the prior
  // existsSync+statSync check produced. Avoids the TOCTOU race between
  // the check and the read (CodeQL js/file-system-race).
  let content: string;
  try {
    content = readFileSync(target, "utf8");
  } catch {
    process.stderr.write(`error: target file not found: ${target}\n`);
    return 64;
  }

  // Same atomic pattern for base directory.
  try {
    if (!statSync(baseDir).isDirectory()) {
      process.stderr.write(`error: base directory not found: ${baseDir}\n`);
      return 64;
    }
  } catch {
    process.stderr.write(`error: base directory not found: ${baseDir}\n`);
    return 64;
  }

  const { total, okCount, broken } = audit(content, baseDir);

  if (total === 0) {
    process.stderr.write(
      `no memory-index link targets in ${target}; nothing to check\n`,
    );
    return 0;
  }

  process.stderr.write(`memory-reference audit on ${target}\n`);
  process.stderr.write(`  base dir: ${baseDir}\n`);
  process.stderr.write(`  refs checked: ${String(total)}\n`);
  process.stderr.write(`  resolved:     ${String(okCount)}\n`);

  if (broken.length === 0) {
    process.stderr.write(`  broken:       0\n`);
    process.stderr.write("\n");
    process.stderr.write(
      "all memory-index link targets resolve to existing files\n",
    );
    return 0;
  }

  process.stderr.write(`  broken:       ${String(broken.length)}\n`);
  process.stderr.write("\n");
  process.stderr.write("broken references:\n");
  process.stderr.write("\n");
  for (const { ref, tried } of broken) {
    process.stderr.write(`  ${ref} -> ${tried} (not found)\n`);
  }
  process.stderr.write("\n");
  process.stderr.write(
    `These link targets in ${target} do not resolve to files\n`,
  );
  process.stderr.write(
    `under ${baseDir}/. Either the file was renamed / moved /\n`,
  );
  process.stderr.write(
    "deleted, or the path was typed incorrectly at index-add time.\n",
  );
  process.stderr.write("\n");
  process.stderr.write(
    "To fix: either restore the file, correct the path, or\n",
  );
  process.stderr.write("remove the broken row from the index.\n");

  if (enforce) return 2;
  return 0;
}

const code = main(process.argv.slice(2));
process.exit(code);
