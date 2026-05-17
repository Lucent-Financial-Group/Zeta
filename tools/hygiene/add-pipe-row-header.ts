#!/usr/bin/env bun
// add-pipe-row-header.ts — backfill validator-compliant pipe-row first
// line to tick shards that currently start with H1 (or any non-pipe
// content). Implements B-0529 Option 3 ("hybrid"): pipe-row first line
// + H1-rich body below.
//
// The pipe-row schema (per `docs/hygiene-history/ticks/README.md`):
//   | <ISO 8601 UTC timestamp> | <model id> | <cron sentinel> | <body> | <PR ref> | <observation> |
//
// We retrofit with placeholders for fields we cannot reconstruct from
// the path alone (model id / cron sentinel / PR ref / observation).
// The H1 body that follows is the substantive content; placeholders in
// the pipe-row are honest about being retrofit rather than
// archaeologically reconstructing claims.
//
// Validator: `tools/hygiene/check-tick-history-shard-schema.ts`
// Backlog row: `docs/backlog/P2/B-0529-tick-shard-schema-validator-vs-practice-drift-2026-05-15.md`
// Rule 0: TypeScript (no .sh) per `.claude/rules/rule-0-no-sh-files.md`.
//
// Usage:
//   bun tools/hygiene/add-pipe-row-header.ts                       # dry-run, full scan
//   bun tools/hygiene/add-pipe-row-header.ts --write               # write, full scan
//   bun tools/hygiene/add-pipe-row-header.ts --files <paths>       # restrict to paths
//   bun tools/hygiene/add-pipe-row-header.ts --write --files <p>   # restrict + write
//
// Run from the repo root, or set REPO_ROOT env var.
//
// Exit codes:
//   0   dry-run completed OR all writes succeeded
//   1   one or more files could not be processed
//   2   tick shard directory missing

import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { basename, join, relative, resolve } from "node:path";

const ROOT = resolve(process.env["REPO_ROOT"] ?? process.cwd());
const SHARD_DIR = join(ROOT, "docs/hygiene-history/ticks");
const SHARD_PREFIX = "docs/hygiene-history/ticks/";

// Filename forms accepted by the validator:
//   HHMMZ.md          — bare
//   HHMMZ-<hex>.md    — minute-grain + hash
//   HHMMSSZ-<hex>.md  — second-grain + hash
const BARE_RE = /^(\d{4})Z$/;
const HASH_MIN_RE = /^(\d{4})Z-[0-9a-f]+$/;
const HASH_SEC_RE = /^(\d{6})Z-[0-9a-f]+$/;

// Validator's COL1_RE check (mirror of check-tick-history-shard-schema.ts).
const COL1_RE = /^\|\s(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2})?Z)\s\|\s/;

interface ShardInfo {
  abs: string;
  rel: string;
  iso: string;
}

function normalizeToPosix(p: string): string {
  return p.replaceAll("\\", "/");
}

function repoRelative(p: string): string {
  return normalizeToPosix(relative(ROOT, p));
}

function parseShardPath(absPath: string): ShardInfo | null {
  const rel = repoRelative(absPath);
  if (!rel.startsWith(SHARD_PREFIX)) return null;
  if (!rel.endsWith(".md")) return null;
  const base = basename(rel, ".md");
  if (base === "README") return null;

  const parts = rel.replace(SHARD_PREFIX, "").split("/");
  if (parts.length < 4) return null;
  const yyyy = parts[0];
  const mm = parts[1];
  const dd = parts[2];
  if (!yyyy || !mm || !dd) return null;
  if (!/^\d{4}$/.test(yyyy) || !/^\d{2}$/.test(mm) || !/^\d{2}$/.test(dd)) {
    return null;
  }

  const bare = BARE_RE.exec(base);
  const hashMin = HASH_MIN_RE.exec(base);
  const hashSec = HASH_SEC_RE.exec(base);

  let iso: string;
  if (bare) {
    const hhmm = bare[1] ?? "";
    iso = `${yyyy}-${mm}-${dd}T${hhmm.slice(0, 2)}:${hhmm.slice(2, 4)}Z`;
  } else if (hashMin) {
    const hhmm = hashMin[1] ?? "";
    iso = `${yyyy}-${mm}-${dd}T${hhmm.slice(0, 2)}:${hhmm.slice(2, 4)}Z`;
  } else if (hashSec) {
    const hhmmss = hashSec[1] ?? "";
    iso = `${yyyy}-${mm}-${dd}T${hhmmss.slice(0, 2)}:${hhmmss.slice(2, 4)}:${hhmmss.slice(4, 6)}Z`;
  } else {
    return null;
  }

  return { abs: absPath, rel, iso };
}

function firstNonEmptyLine(content: string): string | null {
  for (const line of content.split("\n")) {
    if (line.trim().length > 0) return line;
  }
  return null;
}

function alreadyCompliant(content: string): boolean {
  const first = firstNonEmptyLine(content);
  if (!first) return false;
  const pipeCount = (first.match(/\|/g) ?? []).length;
  if (pipeCount < 7) return false;
  return COL1_RE.test(first);
}

function buildHeader(iso: string): string {
  // Placeholders for fields we cannot reconstruct from the path alone.
  // The H1 body below carries the substantive content; the pipe-row
  // exists for validator + machine-parseability.
  return `| ${iso} | retrofit | unknown | retrofit (see body below) | none | none |\n\n`;
}

function findShards(dir: string): string[] {
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
        else if (entry.endsWith(".md") && entry !== "README.md") out.push(full);
      } catch {
        /* skip unreadable */
      }
    }
  }
  walk(dir);
  return out;
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

interface Action {
  rel: string;
  status:
    | "skip-already-compliant"
    | "skip-unparseable-name"
    | "skip-empty"
    | "would-prepend"
    | "prepended"
    | "error";
  detail?: string;
}

export function processOne(absPath: string, write: boolean): Action {
  const info = parseShardPath(absPath);
  if (!info) {
    return {
      rel: repoRelative(absPath),
      status: "skip-unparseable-name",
    };
  }

  let content: string;
  try {
    content = readFileSync(absPath, "utf8");
  } catch (e) {
    return {
      rel: info.rel,
      status: "error",
      detail: e instanceof Error ? e.message : String(e),
    };
  }

  if (content.length === 0) {
    return { rel: info.rel, status: "skip-empty" };
  }

  if (alreadyCompliant(content)) {
    return { rel: info.rel, status: "skip-already-compliant" };
  }

  const header = buildHeader(info.iso);
  const newContent = header + content;

  if (!write) {
    return { rel: info.rel, status: "would-prepend" };
  }

  try {
    writeFileSync(absPath, newContent, "utf8");
    return { rel: info.rel, status: "prepended" };
  } catch (e) {
    return {
      rel: info.rel,
      status: "error",
      detail: e instanceof Error ? e.message : String(e),
    };
  }
}

export function main(argv: string[]): number {
  let write = false;
  const files: string[] = [];
  let inFiles = false;

  for (const a of argv) {
    if (a === "--write") {
      write = true;
    } else if (a === "--files") {
      inFiles = true;
    } else if (inFiles) {
      files.push(a);
    }
  }

  let shards: string[];
  if (files.length > 0) {
    shards = files
      .map((p) => resolve(ROOT, p))
      .filter((p) => repoRelative(p).startsWith(SHARD_PREFIX))
      .filter((p) => repoRelative(p).endsWith(".md"))
      .filter((p) => basename(p) !== "README.md")
      .filter(isFile);
  } else {
    if (!isDir(SHARD_DIR)) {
      process.stderr.write(`error: ${SHARD_DIR} does not exist\n`);
      return 2;
    }
    shards = findShards(SHARD_DIR);
  }

  const counts: Record<Action["status"], number> = {
    "skip-already-compliant": 0,
    "skip-unparseable-name": 0,
    "skip-empty": 0,
    "would-prepend": 0,
    prepended: 0,
    error: 0,
  };

  for (const s of shards) {
    const action = processOne(s, write);
    counts[action.status]++;
    if (action.status === "would-prepend" || action.status === "prepended") {
      process.stdout.write(`${action.status}: ${action.rel}\n`);
    } else if (action.status === "error") {
      process.stderr.write(
        `error: ${action.rel} — ${action.detail ?? "unknown"}\n`,
      );
    }
  }

  const mode = write ? "WRITE" : "DRY-RUN";
  process.stderr.write(
    `[${mode}] scanned ${shards.length}; compliant=${counts["skip-already-compliant"]} ` +
      `would-prepend=${counts["would-prepend"]} prepended=${counts["prepended"]} ` +
      `unparseable=${counts["skip-unparseable-name"]} empty=${counts["skip-empty"]} ` +
      `errors=${counts["error"]}\n`,
  );

  return counts["error"] > 0 ? 1 : 0;
}

if (import.meta.main) {
  process.exit(main(process.argv.slice(2)));
}
