#!/usr/bin/env bun
// build-index.ts — generate the named index: person -> every place they appear.
//
// WHY A FOOTPRINT AND NOT A PASSAGE DIFF
// --------------------------------------
// Binding consent to a per-passage content hash is correct and does not survive contact with
// reality: Aaron revises many times AFTER talking to the people involved, so twenty subjects
// times five revisions is a hundred approval requests and everyone stops answering. Changing
// the unit fixes it, and it is better rather than merely cheaper:
//
//   1. It answers the question a subject actually has — "what does this book say about me?"
//      No passage-level diff answers that.
//   2. Consent becomes about PORTRAYAL. Someone can be comfortable with every individual line
//      and not with the aggregate picture, and only the whole footprint surfaces that.
//   3. Revision churn gets scoped: revise one section and only the people indexed there need
//      to look, at a delta (`delta.ts`), not at the whole thing again.
//
// WHAT THE COMMITTED ARTIFACTS DELIBERATELY DO NOT CONTAIN
// --------------------------------------------------------
// Neither `SUBJECT-INDEX.md` nor `SUBJECT-INDEX.json` carries the prose. They carry LOCATIONS
// and HASHES. Copying third-party material into a second committed file would double its
// exposure for no gain — the text is already in the chapters, one hop away. The full-text
// footprint is what you SEND to a person, and it is produced on demand by `--footprint <id>`
// and written wherever the human chooses, never committed by this tool.

import { join } from "node:path";
import {
  DEFAULT_REGISTRY_PATH,
  loadRegistry,
  STATE_RULES,
  type Registry,
  type Subject,
} from "./registry.ts";
import {
  findOccurrences,
  hashEntry,
  listProseFiles,
  ordinalCompare,
  parseFiles,
  type Block,
  type Occurrence,
} from "./scan.ts";
import { detectorSetsFor } from "./audit-coverage.ts";

export interface IndexedAppearance {
  readonly file: string;
  readonly blockIndex: number;
  readonly lineStart: number;
  readonly lineEnd: number;
  readonly section: string;
  readonly detectorKind: string;
  readonly hash: string;
}

export interface SubjectEntry {
  readonly subjectId: string;
  readonly role: string;
  readonly state: string;
  readonly ledgerAnchor: string;
  /** The whole-footprint fingerprint. Consent binds HERE, not to a sentence. */
  readonly entryHash: string;
  readonly appearanceCount: number;
  readonly fileCount: number;
  readonly appearances: readonly IndexedAppearance[];
  readonly publishGate?: string;
  readonly scopeNote?: string;
}

export interface SubjectIndex {
  readonly book: string;
  readonly generator: string;
  readonly proseFiles: number;
  readonly entries: readonly SubjectEntry[];
}

export function buildIndex(
  registry: Registry,
  blocks: readonly Block[],
  proseFileCount: number,
): SubjectIndex {
  const occurrences = findOccurrences(blocks, detectorSetsFor(registry));
  const bySubject = new Map<string, Occurrence[]>();
  for (const occ of occurrences) {
    const list = bySubject.get(occ.subjectId) ?? [];
    list.push(occ);
    bySubject.set(occ.subjectId, list);
  }

  const entries: SubjectEntry[] = registry.subjects.map((subject: Subject) => {
    const occs = (bySubject.get(subject.id) ?? []).slice().sort(
      (a, b) => ordinalCompare(a.block.file, b.block.file) || a.block.index - b.block.index,
    );
    const appearances: IndexedAppearance[] = occs.map((o) => ({
      file: o.block.file,
      blockIndex: o.block.index,
      lineStart: o.block.lineStart,
      lineEnd: o.block.lineEnd,
      section: o.block.sectionPath.filter((s) => s.length > 0).join(" > "),
      detectorKind: o.detectorKind,
      hash: o.block.hash,
    }));
    return {
      subjectId: subject.id,
      role: subject.role,
      state: subject.state,
      ledgerAnchor: subject.ledgerAnchor,
      entryHash: hashEntry(appearances.map((a) => a.hash)),
      appearanceCount: appearances.length,
      fileCount: new Set(appearances.map((a) => a.file)).size,
      appearances,
      ...(subject.publishGate === undefined ? {} : { publishGate: subject.publishGate }),
      ...(subject.scopeNote === undefined ? {} : { scopeNote: subject.scopeNote }),
    };
  });

  return {
    book: registry.book,
    generator: "src/Core.TypeScript/book-index/build-index.ts",
    proseFiles: proseFileCount,
    entries,
  };
}

function escapeCell(text: string): string {
  return text.replace(/\|/g, "\\|");
}

export function renderIndexMarkdown(index: SubjectIndex): string {
  const lines: string[] = [];
  lines.push("# Named index — *You, Born at the Hinge*");
  lines.push("");
  lines.push(
    "> **Generated. Do not edit by hand.** Produced by `bun src/Core.TypeScript/book-index/build-index.ts`",
  );
  lines.push(
    "> from `SUBJECTS.json` plus the prose itself. A hand-kept index drifts, and a drifted index means",
  );
  lines.push(
    "> someone approved coverage that no longer reflects the text — so this one is derived on every run.",
  );
  lines.push("");
  lines.push(
    "This is **person → every place they appear**, so a subject can be shown their whole footprint rather",
  );
  lines.push(
    "than isolated passages. `CONSENT-LEDGER.md` remains the source of truth for what anyone agreed to;",
  );
  lines.push("this file only makes the coverage checkable.");
  lines.push("");
  lines.push(
    "**It carries locations, never prose.** The full-text footprint you would actually send someone is",
  );
  lines.push(
    "produced on demand (`build-index.ts --footprint <id>`) and is deliberately not committed — copying",
  );
  lines.push("third-party material into a second file would double its exposure for nothing.");
  lines.push("");
  lines.push(
    "**What it cannot see:** a person described identifiably but never named, and never marked. That gap",
  );
  lines.push(
    "is real and unmeasured — see `src/Core.TypeScript/book-index/README.md` §Honest limits.",
  );
  lines.push("");
  lines.push(`Prose files scanned: **${String(index.proseFiles)}**.`);
  lines.push("");
  lines.push("| Subject | Relation | State | Appearances | Files | Entry hash |");
  lines.push("|---|---|---|---:|---:|---|");
  for (const e of index.entries) {
    lines.push(
      `| \`${e.subjectId}\` | ${escapeCell(e.role)} | ${e.state} | ${String(e.appearanceCount)} | ${String(e.fileCount)} | \`${e.entryHash.slice(0, 19)}…\` |`,
    );
  }
  lines.push("");
  lines.push("## States");
  lines.push("");
  lines.push("| State | Name may appear | May appear at all |");
  lines.push("|---|---|---|");
  for (const [state, rule] of Object.entries(STATE_RULES)) {
    lines.push(`| \`${state}\` | ${rule.nameMayAppear ? "yes" : "**no**"} | ${rule.roleMayAppear ? "yes" : "**no**"} |`);
  }
  lines.push("");
  lines.push(
    "`pending` and `role-only` enforce identically, and so do `revoked` and `omitted`. They are kept apart",
  );
  lines.push(
    "because the disposition differs — `pending` generates a follow-up, `role-only` is settled; `revoked` is",
  );
  lines.push(
    "a withdrawal, `omitted` is a protection that was never in question. The identity of the enforcement",
  );
  lines.push("halves is pinned by a test, not asserted here.");
  lines.push("");

  for (const e of index.entries) {
    lines.push(`## \`${e.subjectId}\` — ${e.role}`);
    lines.push("");
    lines.push(`- **State:** \`${e.state}\` · **Ledger row:** ${e.ledgerAnchor}`);
    lines.push(`- **Entry hash:** \`${e.entryHash}\``);
    if (e.publishGate !== undefined) lines.push(`- **Publish gate:** ${e.publishGate}`);
    if (e.scopeNote !== undefined) lines.push(`- **Scope note (not enforced):** ${e.scopeNote}`);
    lines.push("");
    if (e.appearances.length === 0) {
      lines.push("No appearances found in the prose corpus.");
      lines.push("");
      continue;
    }
    const byFile = new Map<string, IndexedAppearance[]>();
    for (const a of e.appearances) {
      const list = byFile.get(a.file) ?? [];
      list.push(a);
      byFile.set(a.file, list);
    }
    lines.push("| File | Appearances | First at line |");
    lines.push("|---|---:|---:|");
    for (const [file, list] of [...byFile.entries()].sort((a, b) => ordinalCompare(a[0], b[0]))) {
      const first = list[0];
      const name = file.split("/").pop() ?? file;
      lines.push(`| \`${name}\` | ${String(list.length)} | ${String(first?.lineStart ?? 0)} |`);
    }
    lines.push("");
  }
  return `${lines.join("\n")}\n`;
}

export function renderFootprint(
  index: SubjectIndex,
  subjectId: string,
  blockByKey: ReadonlyMap<string, Block>,
): string {
  const entry = index.entries.find((e) => e.subjectId === subjectId);
  if (entry === undefined) throw new Error(`no such subject: ${subjectId}`);
  const lines: string[] = [];
  lines.push(`# What this book says about you — \`${entry.subjectId}\``);
  lines.push("");
  lines.push(
    `Every passage in the draft in which you appear: ${String(entry.appearanceCount)} passage(s) across ${String(entry.fileCount)} file(s).`,
  );
  lines.push("");
  lines.push(`Footprint fingerprint: \`${entry.entryHash}\``);
  lines.push("");
  lines.push(
    "If anything here is wrong, say so and it changes. If the picture as a whole is not one you want, say",
  );
  lines.push("that too — that is a different question from whether any single line is accurate.");
  lines.push("");
  for (const a of entry.appearances) {
    const block = blockByKey.get(`${a.file} ${String(a.blockIndex)}`);
    lines.push(`## ${a.file}:${String(a.lineStart)}`);
    if (a.section.length > 0) lines.push(`*${a.section}*`);
    lines.push("");
    lines.push(block?.raw ?? "(passage text unavailable)");
    lines.push("");
  }
  return `${lines.join("\n")}\n`;
}

function main(argv: readonly string[]): number {
  const repoRoot = process.cwd();
  const registry = loadRegistry(join(repoRoot, DEFAULT_REGISTRY_PATH));
  const files = listProseFiles(repoRoot, registry.root, registry.notProse);
  const parsed = parseFiles(repoRoot, files);
  const blocks = parsed.flatMap((p) => p.blocks);

  if (files.length === 0 || blocks.length === 0) {
    process.stderr.write(
      `refusing to generate an index from ${String(files.length)} file(s) / ${String(blocks.length)} block(s) — an empty index reads as "nobody is in this book"\n`,
    );
    return 2;
  }

  const index = buildIndex(registry, blocks, files.length);

  const footprintAt = argv.indexOf("--footprint");
  if (footprintAt >= 0) {
    const subjectId = argv[footprintAt + 1];
    if (subjectId === undefined) {
      process.stderr.write("--footprint needs a subject id\n");
      return 2;
    }
    const byKey = new Map(blocks.map((b) => [`${b.file} ${String(b.index)}`, b] as const));
    process.stdout.write(renderFootprint(index, subjectId, byKey));
    return 0;
  }

  const jsonPath = join(repoRoot, registry.root, "SUBJECT-INDEX.json");
  const mdPath = join(repoRoot, registry.root, "SUBJECT-INDEX.md");
  Bun.write(jsonPath, `${JSON.stringify(index, null, 2)}\n`);
  Bun.write(mdPath, renderIndexMarkdown(index));
  process.stdout.write(
    `wrote ${mdPath} and ${jsonPath} — ${String(index.entries.length)} subject(s), ${String(files.length)} prose file(s)\n`,
  );
  return 0;
}

if (import.meta.main) {
  process.exitCode = main(process.argv.slice(2));
}
