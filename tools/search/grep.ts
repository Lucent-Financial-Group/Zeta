#!/usr/bin/env bun
// tools/search/grep.ts — safe content-search wrapper with noise-dir excludes
// baked in. Distinct from concept-index.ts (a curated semantic index); this is
// the raw ad-hoc content grep an agent reaches for, made correct-by-construction.
//
// WHY (operator 2026-05-31): agents doing ad-hoc content search via raw
// recursive file-walks — PowerShell `Get-ChildItem -Recurse | Select-String`,
// bash `find | xargs grep` — do NOT honor .gitignore, so they walk into
// `references/upstreams/` (gigabytes of mirrored OTHER-repo code) + node_modules
// + build outputs: slow + noisy. Per
// `.claude/rules/references-upstreams-not-our-code-search-excludes.md` +
// `.claude/rules/architecture-is-safety-mechanism-not-discipline-...` the fix is
// STRUCTURAL not behavioral — bake the excludes into a `.ts` so "call the tool"
// can't hit the noise even with a sloppy invocation. Operator's framing: "the
// .ts files have the excludes built in or they should at least."
//
// Cross-repo aware: `--repo ../SQLSharp` searches a sibling repo, still skipping
// THAT repo's references/upstreams (every repo mirrors the same convention).
//
//   bun tools/search/grep.ts <pattern> [--repo <dir>] [--ext ts,md] [-i] [--files]
//
// Options:
//   --repo <dir>   root to search (default: cwd)
//   --ext a,b      only files with these extensions (no dot); default: all text
//   -i             case-insensitive
//   --files        print matching file paths only (not lines)
//
// v1 is a zero-dep Bun-native walk so the excludes hold EVERYWHERE — including
// this Windows laptop, which has no `rg` on PATH (verified 2026-05-31). A
// ripgrep fast-path (rg already honors .gitignore) is a future optimization;
// correctness + zero-dep beats speed for v1.

import { resolve, relative, join, sep } from "node:path";
import { readdirSync, statSync, readFileSync, type Dirent } from "node:fs";

/** Directory basenames never worth searching (build outputs / vendored deps). */
export const EXCLUDE_BASENAMES = new Set([
  ".git",
  "node_modules",
  "bin",
  "obj",
  "target",
  ".playwright-mcp",
  "drop",
]);

/** Repo-relative POSIX paths to skip wholesale. references/upstreams is the
 *  load-bearing one — gigabytes of mirrored upstream repos (NOT our code). */
export const EXCLUDE_RELPATHS = ["references/upstreams"];

/** Files larger than this are skipped (likely data/binary, not source). */
const MAX_FILE_BYTES = 2 * 1024 * 1024;

export interface GrepMatch {
  file: string; // repo-relative POSIX path
  line: number; // 1-based
  text: string;
}

export interface GrepOptions {
  root: string;
  pattern: RegExp;
  exts?: Set<string>; // extensions without the dot; undefined = all text files
}

function relPosix(root: string, abs: string): string {
  return relative(root, abs).split(sep).join("/");
}

/** True if this directory should be pruned from the walk. */
export function isExcludedDir(root: string, absDir: string): boolean {
  const base = absDir.split(sep).pop() ?? "";
  if (EXCLUDE_BASENAMES.has(base)) return true;
  const rp = relPosix(root, absDir);
  return EXCLUDE_RELPATHS.some((e) => rp === e || rp.startsWith(e + "/"));
}

/** A NUL byte in the first 1KB → treat as binary, skip. (Char-code check so
 *  there's no NUL literal in this source file.) */
function looksBinary(buf: string): boolean {
  const n = Math.min(buf.length, 1024);
  for (let i = 0; i < n; i++) {
    if (buf.charCodeAt(i) === 0) return true;
  }
  return false;
}

/** Pure, testable core: walk `root`, skipping excluded dirs, return matches. */
export function grepTree(opts: GrepOptions): GrepMatch[] {
  const { root, pattern, exts } = opts;
  const out: GrepMatch[] = [];

  const walk = (absDir: string): void => {
    let entries: Dirent[];
    try {
      entries = readdirSync(absDir, { withFileTypes: true });
    } catch {
      return; // unreadable dir — skip rather than throw
    }
    for (const ent of entries) {
      const abs = join(absDir, ent.name);
      if (ent.isDirectory()) {
        if (!isExcludedDir(root, abs)) walk(abs);
        continue;
      }
      if (!ent.isFile()) continue;
      if (exts) {
        const dot = ent.name.lastIndexOf(".");
        const ext = dot >= 0 ? ent.name.slice(dot + 1) : "";
        if (!exts.has(ext)) continue;
      }
      let size: number;
      try {
        size = statSync(abs).size;
      } catch {
        continue;
      }
      if (size > MAX_FILE_BYTES) continue;
      let content: string;
      try {
        content = readFileSync(abs, "utf8");
      } catch {
        continue;
      }
      if (looksBinary(content)) continue;
      const lines = content.split(/\r?\n/);
      for (let i = 0; i < lines.length; i++) {
        // Reset lastIndex defensively in case a global flag was passed.
        pattern.lastIndex = 0;
        if (pattern.test(lines[i]!)) {
          out.push({ file: relPosix(root, abs), line: i + 1, text: lines[i]! });
        }
      }
    }
  };

  walk(root);
  return out;
}

interface ParsedArgs {
  pattern: string;
  repo: string;
  exts?: Set<string>;
  ignoreCase: boolean;
  filesOnly: boolean;
}

export function parseArgs(argv: string[]): ParsedArgs | { error: string } {
  let repo = process.cwd();
  let exts: Set<string> | undefined;
  let ignoreCase = false;
  let filesOnly = false;
  const positionals: string[] = [];

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]!;
    if (a === "--repo") {
      const v = argv[++i];
      if (!v) return { error: "--repo requires a directory" };
      repo = resolve(v);
    } else if (a === "--ext") {
      const v = argv[++i];
      if (!v) return { error: "--ext requires a comma-separated list" };
      exts = new Set(v.split(",").map((s) => s.trim().replace(/^\./, "")).filter(Boolean));
    } else if (a === "-i") {
      ignoreCase = true;
    } else if (a === "--files") {
      filesOnly = true;
    } else if (a.startsWith("--")) {
      return { error: `unknown flag: ${a}` };
    } else {
      positionals.push(a);
    }
  }

  const pattern = positionals.join(" ").trim();
  if (!pattern) {
    return { error: "usage: bun tools/search/grep.ts <pattern> [--repo <dir>] [--ext ts,md] [-i] [--files]" };
  }
  return { pattern, repo, exts, ignoreCase, filesOnly };
}

export function main(argv: string[]): number {
  const parsed = parseArgs(argv);
  if ("error" in parsed) {
    console.error(parsed.error);
    return 1;
  }
  let pattern: RegExp;
  try {
    pattern = new RegExp(parsed.pattern, parsed.ignoreCase ? "i" : "");
  } catch (e) {
    console.error(`invalid regex: ${(e as Error).message}`);
    return 1;
  }
  const matches = grepTree({ root: parsed.repo, pattern, exts: parsed.exts });
  if (parsed.filesOnly) {
    const seen = new Set<string>();
    for (const m of matches) {
      if (!seen.has(m.file)) {
        seen.add(m.file);
        console.log(m.file);
      }
    }
  } else {
    for (const m of matches) console.log(`${m.file}:${m.line}:${m.text}`);
  }
  return 0;
}

if (import.meta.main) {
  process.exit(main(process.argv.slice(2)));
}
