// scan.ts — derive the named index by READING THE PROSE. Nothing here is hand-maintained.
//
// THE THING THAT DECIDES WHETHER THIS WORKS
// -----------------------------------------
// A hand-kept index drifts, and a drifted index means a subject approved coverage that no
// longer reflects the text — complete-looking coverage that is not complete, landing on a
// named third party. So the index is DERIVED: every appearance is found by scanning, and the
// only hand-kept artifact is the registry of who the people are.
//
// WHERE THE FAILURE MODE ACTUALLY MOVES TO — and this must be said plainly, because the
// obvious design hides it. The task this was built from assumed IN-TEXT MARKERS with an audit
// catching "a person appears in prose with no marker". Deriving by scan is strictly more
// derived than that — there is no marker to forget. But the under-report class does not
// vanish; it RELOCATES: the index can now only under-report by a subject never being
// REGISTERED, or by a real appearance using a string the registry does not list. That is what
// `audit-coverage.ts` sweeps for, and it is why the sweep — not the index — is the
// load-bearing artifact.
//
// WHAT THE SCAN CANNOT DO, stated rather than implied. A person described identifiably
// WITHOUT any registered string ("my old boss at the meter company, the one who ran the
// simulator") is INVISIBLE to it. That is a recall problem no string scan solves. Two partial
// answers ship here and neither is a fix: registered ROLE PHRASES widen recall beyond names,
// and an optional in-text marker lets a human declare an unnamed appearance the scan cannot
// see. The residual gap is real, unmeasured, and a human's job.
//
// MARKERS (optional, additive — the scan never depends on them)
//   <!-- subject: max, lillian -->   covers from this line to the end of the enclosing
//                                    section (the next heading at any level), or until
//   <!-- /subject -->                closes it earlier.
// A marker adds an appearance the scan could not have found. It can never REMOVE one.

import { createHash } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";

export type BlockKind = "heading" | "prose" | "table" | "code" | "frontmatter";

export interface Block {
  /** Repo-relative path. */
  readonly file: string;
  /** Enclosing heading trail, outermost first. */
  readonly sectionPath: readonly string[];
  /** Ordinal within the file, stable for a given file content. */
  readonly index: number;
  /** 1-based inclusive line range. */
  readonly lineStart: number;
  readonly lineEnd: number;
  readonly kind: BlockKind;
  readonly raw: string;
  /** Canonical form — what the hash is taken over. See `canonicalize`. */
  readonly canonical: string;
  readonly hash: string;
  /** Subject ids declared by an enclosing in-text marker. */
  readonly markedSubjects: readonly string[];
}

/**
 * Canonical form for hashing.
 *
 * DELIBERATE CHOICE, and it is the one that makes many revisions survivable: whitespace runs
 * collapse and marker comments are stripped, so a REFLOW does not invalidate a subject's
 * approval. Consent here is about PORTRAYAL, and rewrapping a paragraph does not change how
 * someone is portrayed. Everything else — wording, emphasis, punctuation — is inside the hash,
 * because all of it can change a portrayal.
 *
 * Unicode NFC and ordinal (byte) comparison throughout: no culture-sensitive casing or
 * collation enters the hash, so the same text hashes identically on every machine.
 */
export function canonicalize(raw: string): string {
  return raw
    .replace(/<!--\s*\/?\s*subject\b[^>]*-->/g, " ")
    .normalize("NFC")
    .replace(/\s+/g, " ")
    .trim();
}

export function hashCanonical(canonical: string): string {
  return `sha256:${createHash("sha256").update(canonical, "utf8").digest("hex")}`;
}

/** Combined hash over an ordered list of block hashes — a subject's whole-entry fingerprint. */
export function hashEntry(blockHashes: readonly string[]): string {
  const joined = [...blockHashes].sort().join("\n");
  return `sha256:${createHash("sha256").update(joined, "utf8").digest("hex")}`;
}

const MARKER_OPEN = /^<!--\s*subject:\s*([^>]*?)\s*-->\s*$/;
const MARKER_CLOSE = /^<!--\s*\/subject\s*-->\s*$/;

export interface ParsedFile {
  readonly blocks: readonly Block[];
  /** Marker lines whose subject list was empty or unparseable. */
  readonly malformedMarkers: readonly { readonly line: number; readonly text: string }[];
}

export function parseDocument(file: string, text: string): ParsedFile {
  const lines = text.split("\n");
  const blocks: Block[] = [];
  const malformedMarkers: { line: number; text: string }[] = [];

  let sectionPath: string[] = [];
  let activeMarker: readonly string[] = [];
  let inFence = false;
  let fenceMarker = "";
  let inFrontmatter = false;
  let index = 0;

  let pending: { start: number; lines: string[]; kind: BlockKind } | null = null;

  const flush = (endLine: number): void => {
    if (pending === null) return;
    const raw = pending.lines.join("\n");
    const canonical = canonicalize(raw);
    if (canonical.length > 0) {
      blocks.push({
        file,
        sectionPath: [...sectionPath],
        index: index++,
        lineStart: pending.start,
        lineEnd: endLine,
        kind: pending.kind,
        raw,
        canonical,
        hash: hashCanonical(canonical),
        markedSubjects: [...activeMarker],
      });
    }
    pending = null;
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? "";
    const lineNo = i + 1;

    if (i === 0 && line.trim() === "---") {
      inFrontmatter = true;
      pending = { start: lineNo, lines: [line], kind: "frontmatter" };
      continue;
    }
    if (inFrontmatter) {
      pending?.lines.push(line);
      if (line.trim() === "---") {
        inFrontmatter = false;
        flush(lineNo);
      }
      continue;
    }

    const fenceOpen = /^\s*(```|~~~)/.exec(line);
    if (!inFence && fenceOpen !== null) {
      flush(lineNo - 1);
      inFence = true;
      fenceMarker = fenceOpen[1] ?? "```";
      pending = { start: lineNo, lines: [line], kind: "code" };
      continue;
    }
    if (inFence) {
      pending?.lines.push(line);
      if (line.trimStart().startsWith(fenceMarker)) {
        inFence = false;
        flush(lineNo);
      }
      continue;
    }

    const open = MARKER_OPEN.exec(line);
    if (open !== null) {
      flush(lineNo - 1);
      const ids = (open[1] ?? "")
        .split(",")
        .map((s) => s.trim())
        .filter((s) => s.length > 0);
      if (ids.length === 0) malformedMarkers.push({ line: lineNo, text: line });
      activeMarker = ids;
      continue;
    }
    if (MARKER_CLOSE.test(line)) {
      flush(lineNo - 1);
      activeMarker = [];
      continue;
    }

    const heading = /^(#{1,6})\s+(.*)$/.exec(line);
    if (heading !== null) {
      flush(lineNo - 1);
      // A heading ENDS any open marker scope: markers cover their own section, nothing more.
      activeMarker = [];
      const depth = (heading[1] ?? "#").length;
      const title = (heading[2] ?? "").trim();
      sectionPath = sectionPath.slice(0, depth - 1);
      while (sectionPath.length < depth - 1) sectionPath.push("");
      sectionPath.push(title);
      pending = { start: lineNo, lines: [line], kind: "heading" };
      flush(lineNo);
      continue;
    }

    if (line.trim().length === 0) {
      flush(lineNo - 1);
      continue;
    }

    if (pending === null) {
      pending = {
        start: lineNo,
        lines: [line],
        kind: line.trimStart().startsWith("|") ? "table" : "prose",
      };
    } else {
      pending.lines.push(line);
    }
  }
  flush(lines.length);

  return { blocks, malformedMarkers };
}

export function listProseFiles(repoRoot: string, bookRoot: string, notProse: readonly string[]): string[] {
  const dir = join(repoRoot, bookRoot);
  const excluded = new Set(notProse);
  return readdirSync(dir)
    .filter((name) => name.endsWith(".md") && !excluded.has(name))
    .sort()
    .map((name) => relative(repoRoot, join(dir, name)));
}

export function listAllBookFiles(repoRoot: string, bookRoot: string): string[] {
  const dir = join(repoRoot, bookRoot);
  return readdirSync(dir)
    .filter((name) => name.endsWith(".md"))
    .sort()
    .map((name) => relative(repoRoot, join(dir, name)));
}

export function parseFiles(repoRoot: string, files: readonly string[]): ParsedFile[] {
  return files.map((f) => parseDocument(f, readFileSync(join(repoRoot, f), "utf8")));
}

// ---------------------------------------------------------------------------------------
// Detection
// ---------------------------------------------------------------------------------------

export type DetectorKind = "name" | "rolePhrase" | "marker";

export interface Occurrence {
  readonly subjectId: string;
  readonly detectorKind: DetectorKind;
  /** The literal that matched, or the marker id for `marker` occurrences. */
  readonly detector: string;
  readonly block: Block;
}

function escapeLiteral(literal: string): string {
  return literal.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Word-boundary matcher for a literal.
 *
 * Names match CASE-SENSITIVELY: proper nouns are capitalised, and a case-insensitive "Max"
 * would fire on `MaxDegreeOfParallelism` and on every "max" in ordinary prose. Role phrases
 * match CASE-INSENSITIVELY, because "My mother" at the start of a sentence is the same phrase
 * as "my mother" mid-sentence. Boundaries are letter/number classes rather than `\b`, so a
 * possessive ("Max's") still matches and a substring ("Maxwell") does not.
 */
export function literalMatcher(literal: string, caseSensitive: boolean): RegExp {
  return new RegExp(
    `(?<![\\p{L}\\p{N}])${escapeLiteral(literal)}(?![\\p{L}\\p{N}])`,
    caseSensitive ? "gu" : "giu",
  );
}

export interface DetectorSet {
  readonly subjectId: string;
  readonly names: readonly string[];
  readonly rolePhrases: readonly string[];
}

/**
 * Find every appearance of every subject. One block matched by two detectors for the same
 * subject yields ONE occurrence (the strongest detector wins: name > rolePhrase > marker), so
 * a subject's footprint is a set of passages, not a count of string hits.
 */
export function findOccurrences(
  blocks: readonly Block[],
  detectorSets: readonly DetectorSet[],
): Occurrence[] {
  const rank: Record<DetectorKind, number> = { name: 3, rolePhrase: 2, marker: 1 };
  const best = new Map<string, Occurrence>();

  const consider = (occ: Occurrence): void => {
    const key = `${occ.subjectId} ${occ.block.file} ${String(occ.block.index)}`;
    const existing = best.get(key);
    if (existing === undefined || rank[occ.detectorKind] > rank[existing.detectorKind]) {
      best.set(key, occ);
    }
  };

  for (const block of blocks) {
    for (const set of detectorSets) {
      for (const name of set.names) {
        if (literalMatcher(name, true).test(block.canonical)) {
          consider({ subjectId: set.subjectId, detectorKind: "name", detector: name, block });
        }
      }
      for (const phrase of set.rolePhrases) {
        if (literalMatcher(phrase, false).test(block.canonical)) {
          consider({ subjectId: set.subjectId, detectorKind: "rolePhrase", detector: phrase, block });
        }
      }
    }
    for (const id of block.markedSubjects) {
      consider({ subjectId: id, detectorKind: "marker", detector: id, block });
    }
  }

  return [...best.values()].sort(
    (a, b) =>
      ordinalCompare(a.subjectId, b.subjectId) ||
      ordinalCompare(a.block.file, b.block.file) ||
      a.block.index - b.block.index,
  );
}

/**
 * Ordinal (UTF-16 code-unit) comparison. NOT `localeCompare`, which is culture-sensitive and
 * would order the index differently per machine — `.claude/rules/culture-invariant-by-default`.
 */
export function ordinalCompare(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}
