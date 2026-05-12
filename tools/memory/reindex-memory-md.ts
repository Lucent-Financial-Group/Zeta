#!/usr/bin/env bun
/**
 * B-0423: Reindex memory/MEMORY.md from the memory/ heap.
 *
 * Architectural fix for the MEMORY.md serialization-point
 * anti-pattern (B-0423). Reads frontmatter from every
 * memory/*.md file, regenerates MEMORY.md as an indexed
 * stack-view of the heap.
 *
 * The autonomous-loop can call this on each (or every N)
 * tick to keep MEMORY.md current at a higher cadence than
 * Anthropic's base AutoDream allows.
 *
 * Usage:
 *   bun tools/memory/reindex-memory-md.ts            # write
 *   bun tools/memory/reindex-memory-md.ts --check    # dry-run
 *
 * Heap-state-acceptable: memory files commit with frontmatter
 * but do NOT require synchronous MEMORY.md paired-edit. This
 * reindexer catches them up to the stack on cadence.
 */

import { readdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

const MEMORY_DIR = "memory";
const INDEX_FILE = join(MEMORY_DIR, "MEMORY.md");
const PREAMBLE_MARKER = "<!-- BEGIN AUTO-INDEX (B-0423 reindex-memory-md.ts) -->";
const PREAMBLE_END = "<!-- END AUTO-INDEX -->";

type FrontMatter = {
  name?: string;
  description?: string;
  type?: "user" | "feedback" | "project" | "reference" | string;
  created?: string;
};

type MemoryEntry = {
  filename: string;
  fm: FrontMatter;
  date: string;
  mtime: number;
};

function parseFrontmatter(content: string): FrontMatter | null {
  if (!content.startsWith("---")) return null;
  const end = content.indexOf("\n---", 3);
  if (end === -1) return null;
  const body = content.slice(3, end).trim();
  const fm: FrontMatter = {};

  const lines = body.split("\n");
  let i = 0;
  while (i < lines.length) {
    const line = lines[i] ?? "";
    const match = line.match(/^([a-z_]+):\s*(.*)$/i);
    if (!match) {
      i++;
      continue;
    }
    const key = match[1]!;
    const rawVal = match[2] ?? "";
    let value = rawVal.trim();
    if (value === ">-" || value === ">" || value === "|") {
      const folded: string[] = [];
      i++;
      while (i < lines.length) {
        const foldedLine = lines[i];
        if (foldedLine === undefined || (!foldedLine.startsWith("  ") && foldedLine.trim() !== "")) {
          break;
        }
        folded.push(foldedLine.trim());
        i++;
      }
      value = folded.join(" ").trim();
      (fm as Record<string, string>)[key] = value;
      continue;
    }
    value = value.replace(/^['"]/, "").replace(/['"]$/, "");
    (fm as Record<string, string>)[key] = value;
    i++;
  }
  return fm;
}

function dateFromFilename(filename: string): string {
  const match = filename.match(/(\d{4})[_-](\d{2})[_-](\d{2})/);
  if (!match) return "0000-00-00";
  return `${match[1]}-${match[2]}-${match[3]}`;
}

async function collectEntries(): Promise<MemoryEntry[]> {
  const files = await readdir(MEMORY_DIR);
  const entries: MemoryEntry[] = [];
  for (const filename of files) {
    if (!filename.endsWith(".md")) continue;
    if (filename === "MEMORY.md" || filename === "README.md") continue;
    if (filename.startsWith("CURRENT-")) continue;
    const filePath = join(MEMORY_DIR, filename);
    const content = await readFile(filePath, "utf8");
    const fm = parseFrontmatter(content);
    if (!fm) continue;
    const date = fm.created || dateFromFilename(filename);
    entries.push({ filename, fm, date, mtime: 0 });
  }
  entries.sort((a, b) => b.date.localeCompare(a.date));
  return entries;
}

function truncateDescription(desc: string, maxLen = 240): string {
  if (desc.length <= maxLen) return desc;
  return desc.slice(0, maxLen - 1).trimEnd() + "…";
}

function formatEntry(e: MemoryEntry): string {
  const name = e.fm.name ?? e.filename.replace(/\.md$/, "");
  const desc = truncateDescription(e.fm.description ?? "(no description)");
  return `- [**${name}**](${e.filename}) — ${desc}`;
}

const MAX_STACK_ENTRIES = 100;

function renderIndex(entries: MemoryEntry[]): string {
  const now = new Date().toISOString().slice(0, 10);
  const lines: string[] = [];
  lines.push("[AutoDream last run: 2026-04-23]");
  lines.push("");
  lines.push(
    "**📌 Fast path: read `CURRENT-aaron.md`, `CURRENT-amara.md`, " +
      "`CURRENT-ani.md`, `CURRENT-vera.md`, `CURRENT-riven.md`, " +
      "and `CURRENT-otto.md` first.**",
  );
  lines.push("");
  lines.push(
    "> **Stack-vs-heap framing (Aaron 2026-05-12):** This file is the " +
      "**STACK** — indexed, ordered, traversable canonical view. Recent " +
      "memory files in `memory/` with timestamps newer than the most-" +
      "current entries here may be **HEAP** — floating cache, not yet " +
      "indexed, accessible by direct path. Both are easily accessible: " +
      "stack via traversal, heap via timestamp/filename. Indexing " +
      "(heap→stack promotion) happens on cadence via " +
      "`tools/memory/reindex-memory-md.ts` (B-0423), callable from the " +
      "autonomous-loop tick. Last reindex: " + now + ".",
  );
  lines.push("");
  lines.push(PREAMBLE_MARKER);
  const stackEntries = entries.slice(0, MAX_STACK_ENTRIES);
  for (const e of stackEntries) {
    lines.push(formatEntry(e));
  }
  if (entries.length > MAX_STACK_ENTRIES) {
    lines.push("");
    lines.push(
      `_Stack truncated at ${MAX_STACK_ENTRIES} most-recent entries. ` +
        `${entries.length - MAX_STACK_ENTRIES} additional memory files in heap — ` +
        "browse `memory/*.md` directly by filename/timestamp._",
    );
  }
  lines.push(PREAMBLE_END);
  lines.push("");
  return lines.join("\n");
}

async function main() {
  const check = process.argv.includes("--check");
  const entries = await collectEntries();
  const rendered = renderIndex(entries);

  if (check) {
    const current = await readFile(INDEX_FILE, "utf8").catch(() => "");
    const same = current.trim() === rendered.trim();
    console.log(`Entries: ${entries.length}. Index ${same ? "current" : "STALE"}.`);
    if (!same) process.exit(2);
    return;
  }

  await writeFile(INDEX_FILE, rendered);
  console.log(`Reindexed ${entries.length} memory files into ${INDEX_FILE}.`);
}

if (import.meta.main) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}

export { collectEntries, renderIndex, parseFrontmatter };
