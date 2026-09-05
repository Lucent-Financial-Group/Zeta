#!/usr/bin/env bun
// lint-orphaned-doc-comments.ts — a doc comment that documents nothing.
//
// WHY THIS EXISTS, and it is not a style preference.
//
// A top-level `/** … */` immediately followed by another top-level `/** … */`, with no code
// between them, means the FIRST one has been detached from whatever it described. It now sits
// above a symbol it does not describe, and every tool that reads doc comments — editors, hovers,
// generated docs, the next person — attributes it to that symbol.
//
// Measured in `src/Core.TypeScript/corporate/run-agent.ts` before this lint existed: three doc
// comments stacked with nothing between them, so an editor showed `mergeQueues` a docstring
// reading "Run the organization and turn it into the surface the loop looks at" — a different
// function entirely. One of the three also asserted "`queue` and `qa` are EMPTY" three lines
// above code whose own comment says the opposite.
//
// THE CAUSE IS MECHANICAL, WHICH IS WHY A LINT IS THE RIGHT ANSWER. Inserting a new function by
// anchoring on `export function X(` and pasting before it lands the new code BETWEEN X's doc
// comment and X. The author sees a clean diff and a passing suite; nothing anywhere says the
// docstring above X now belongs to something else. It was done three times in two days by the
// same hand — to `requireReplayable`, `gitChangeControl` and `providersFromArgs` — and caught by
// none of tsc, eslint, the test suites or review.
//
// WHAT IS DELIBERATELY NOT FLAGGED
//
//   - The FILE HEADER. A file's opening `/** … */` followed by the first symbol's doc comment is
//     the normal shape of a well-documented module, and flagging it would make the lint noise.
//     This was the false positive the first draft produced, twice.
//   - Anything indented. A doc comment inside an interface or a union sits between members that
//     are themselves declarations; the pattern there is ordinary and correct.
//   - `//` line comments, which nothing attributes to a symbol.
//
// So the rule is narrow on purpose: TOP-LEVEL (column 0), NOT the file header, and NOTHING but
// blank lines between the two blocks. Inside that window there is no legitimate case — which is
// what makes it worth failing a build over.
//
// Usage:  bun src/Core.TypeScript/hygiene/lint-orphaned-doc-comments.ts <dir|file> [...]
// Exit:   0 clean · 1 orphan(s) found · 2 nothing was scanned (a check that checked nothing).

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

export interface OrphanedDoc {
  readonly file: string;
  /** 1-based line of the closing delimiter of the detached block. */
  readonly line: number;
  /** The detached block's first sentence, so a report says WHICH comment came loose. */
  readonly firstLine: string;
}

// A top-level doc comment opens at column 0, and its closing delimiter sits at column 0 too.
// Line comments, not doc comments, because the delimiters themselves cannot be written inside one.
const OPENS = (line: string): boolean => line.startsWith("/**");
const CLOSES = (line: string): boolean => line === " */" || line === "*/";

/**
 * Every top-level doc comment in `source`, as [openLine, closeLine] pairs, 0-based.
 *
 * Written as a line scan rather than a regex over the whole file: a regex cannot tell a closing
 * delimiter that appears inside a string literal from one that actually ends a block, and a lint
 * that mis-parses is worse than no lint — it fails on correct code and teaches people to ignore it.
 * Requiring both delimiters at column 0 is what makes the line scan sufficient.
 */
export function topLevelDocBlocks(source: string): readonly (readonly [number, number])[] {
  const lines = source.split("\n");
  const blocks: (readonly [number, number])[] = [];
  let open: number | undefined;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? "";
    if (open === undefined) {
      // A single-line `/** … */` opens and closes at once, and is a normal doc comment.
      if (OPENS(line)) {
        if (line.trimEnd().endsWith("*/") && line.trimEnd().length > 3) blocks.push([i, i] as const);
        else open = i;
      }
      continue;
    }
    if (CLOSES(line)) {
      blocks.push([open, i] as const);
      open = undefined;
    }
  }
  return blocks;
}

/**
 * Doc comments that document nothing.
 *
 * A block is orphaned when the NEXT non-blank line after it opens another top-level doc comment.
 * The file's first block is exempt: that is the module header, and the block after it belongs to
 * the first symbol.
 */
export function orphanedDocsIn(file: string, source: string): readonly OrphanedDoc[] {
  const lines = source.split("\n");
  const blocks = topLevelDocBlocks(source);
  const out: OrphanedDoc[] = [];
  for (let b = 0; b < blocks.length; b++) {
    const block = blocks[b];
    if (block === undefined) continue;
    const [start, end] = block;
    // THE FILE HEADER IS NOT AN ORPHAN. Judged by position in the file rather than by content:
    // "is this the first block?" is a fact, "does this read like a header?" is a guess.
    const isFileHeader = blocks.findIndex(([s]) => s === start) === 0 && !lines.slice(0, start).some((l) => l.trim() !== "");
    if (isFileHeader) continue;
    let j = end + 1;
    while (j < lines.length && (lines[j] ?? "").trim() === "") j += 1;
    if (j < lines.length && OPENS(lines[j] ?? "")) {
      // A one-line block carries its text on the SAME line; a multi-line one on the next. Getting
      // this wrong makes the report print the opening delimiter as the comment's content, which
      // tells the reader nothing about which comment came loose — the one thing they need.
      const raw = start === end ? (lines[start] ?? "") : (lines[start + 1] ?? "");
      const firstLine = raw
        .replace(/^\s*\/\*\*/, "")
        .replace(/\*\/\s*$/, "")
        .replace(/^\s*\*?\s*/, "")
        .trim();
      out.push({ file, line: end + 1, firstLine: firstLine === "" ? "(no text)" : firstLine });
    }
  }
  return out;
}

function tsFilesUnder(path: string): readonly string[] {
  const stat = statSync(path);
  if (!stat.isDirectory()) return path.endsWith(".ts") ? [path] : [];
  const out: string[] = [];
  for (const entry of readdirSync(path, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name.startsWith(".")) continue;
    out.push(...tsFilesUnder(join(path, entry.name)));
  }
  return out;
}

const invokedDirectly =
  typeof process.argv[1] === "string" && /lint-orphaned-doc-comments\.(?:ts|js)$/.test(process.argv[1]);
if (invokedDirectly) {
  const roots = process.argv.slice(2);
  if (roots.length === 0) {
    console.error("usage: lint-orphaned-doc-comments.ts <dir|file> [...]");
    process.exit(2);
  }
  const files = roots.flatMap(tsFilesUnder);
  if (files.length === 0) {
    // A lint that scanned nothing and printed a pass is the vacuity class wearing a green tick.
    console.error("refused: no TypeScript files were scanned — this check would have passed for free");
    process.exit(2);
  }
  const found = files.flatMap((f) => orphanedDocsIn(f, readFileSync(f, "utf8")));
  for (const o of found) {
    console.error(`${o.file}:${String(o.line)}  a doc comment is followed by another with no code between them`);
    console.error(`    the detached block begins: ${o.firstLine.slice(0, 90)}`);
  }
  if (found.length > 0) {
    console.error(
      `\n${String(found.length)} orphaned doc comment(s) in ${String(files.length)} file(s). ` +
        `Each one now documents whatever follows it, which is not what it describes.`,
    );
    process.exit(1);
  }
  console.log(`lint-orphaned-doc-comments: ${String(files.length)} file(s) clean.`);
  process.exit(0);
}
