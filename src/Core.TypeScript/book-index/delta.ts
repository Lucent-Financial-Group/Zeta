#!/usr/bin/env bun
// delta.ts — "here is what changed about you since you approved."
//
// This is the piece that makes many revisions survivable. Without it, every revision re-asks
// every subject from scratch and they stop answering — at which point the consent mechanism
// has trained everyone to ignore it, which is worse than not having one.
//
// THE HANDSHAKE WITH THE CONSENT MECHANISM
// ----------------------------------------
// Consent binds to a subject's `entryHash` — the fingerprint of their WHOLE footprint — not to
// a per-passage hash. On revision:
//
//   entryHash unchanged  -> the approval still holds. Nobody is asked anything.
//   entryHash changed    -> generate a delta for THAT SUBJECT ONLY, showing added, removed and
//                           revised passages. The subject re-approves a diff, not a book.
//
// `ApprovalRecord` below is the interface between this index and the consent verifier. It is
// deliberately minimal and it is a PROPOSAL: the verifier owns how an approval is obtained and
// recorded; this file owns what an approval is bound TO. If the two disagree on the shape,
// that disagreement should be stated rather than resolved by one side inventing a second
// schema — see README.md §Coordination.
//
// `revised` pairing is a DISPLAY heuristic and never affects a verdict. Verdicts come from
// hash equality alone; the pairing only decides whether a change is shown as
// "removed + added" or as "this paragraph was rewritten", because the second is far easier to
// read. Threshold is stated, unmetered, and tunable.

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { DEFAULT_REGISTRY_PATH, loadRegistry } from "./registry.ts";
import { listProseFiles, ordinalCompare, parseFiles, type Block } from "./scan.ts";
import { buildIndex, type IndexedAppearance, type SubjectIndex } from "./build-index.ts";

/** The passage-level half of an approval: where it was, and what it said. */
export interface ApprovedPassage {
  readonly file: string;
  readonly hash: string;
}

/**
 * What a subject approved. PROPOSED SCHEMA — the coordination surface with the consent
 * verifier. `entryHash` is the binding value; `passages` exists only so a delta can say WHICH
 * parts changed rather than just THAT something did.
 */
export interface ApprovalRecord {
  readonly subjectId: string;
  readonly entryHash: string;
  readonly approvedAt: string;
  /** How the approval was obtained — the consent verifier's territory, opaque here. */
  readonly approvedVia: string;
  readonly passages: readonly ApprovedPassage[];
}

export interface ApprovalsFile {
  readonly book: string;
  readonly approvals: readonly ApprovalRecord[];
}

export type PassageChange =
  | { readonly kind: "added"; readonly now: IndexedAppearance }
  | { readonly kind: "removed"; readonly was: ApprovedPassage }
  | { readonly kind: "revised"; readonly was: ApprovedPassage; readonly now: IndexedAppearance };

export interface SubjectDelta {
  readonly subjectId: string;
  readonly approved: boolean;
  readonly entryHashWas: string | null;
  readonly entryHashNow: string;
  readonly stillValid: boolean;
  readonly unchangedCount: number;
  readonly changes: readonly PassageChange[];
}

function tokenSet(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .split(/[^\p{L}\p{N}]+/u)
      .filter((t) => t.length > 2),
  );
}

function jaccard(a: ReadonlySet<string>, b: ReadonlySet<string>): number {
  if (a.size === 0 && b.size === 0) return 1;
  let shared = 0;
  for (const t of a) if (b.has(t)) shared++;
  return shared / (a.size + b.size - shared);
}

/** Display-only pairing threshold for "this paragraph was rewritten". Unmetered, tunable. */
export const REVISION_SIMILARITY_THRESHOLD = 0.6;

export function computeDelta(
  index: SubjectIndex,
  approvals: readonly ApprovalRecord[],
  blockByHash: ReadonlyMap<string, Block>,
  approvedTextByHash: ReadonlyMap<string, string>,
): SubjectDelta[] {
  const approvalById = new Map(approvals.map((a) => [a.subjectId, a] as const));

  return index.entries.map((entry) => {
    const approval = approvalById.get(entry.subjectId);
    if (approval === undefined) {
      return {
        subjectId: entry.subjectId,
        approved: false,
        entryHashWas: null,
        entryHashNow: entry.entryHash,
        stillValid: false,
        unchangedCount: 0,
        changes: entry.appearances.map((now) => ({ kind: "added" as const, now })),
      };
    }

    const approvedHashes = new Set(approval.passages.map((p) => p.hash));
    const nowHashes = new Set(entry.appearances.map((a) => a.hash));

    const added = entry.appearances.filter((a) => !approvedHashes.has(a.hash));
    const removed = approval.passages.filter((p) => !nowHashes.has(p.hash));
    const unchangedCount = entry.appearances.length - added.length;

    // Display pairing only. A removed passage and an added one that share most of their words
    // are almost certainly one rewritten paragraph, and showing them as a rewrite is far easier
    // to read than showing two unrelated events. The VERDICT (`stillValid`) is decided purely
    // by entry-hash equality above and is untouched by this.
    const changes: PassageChange[] = [];
    const takenAdded = new Set<number>();
    for (const was of removed) {
      const wasText = approvedTextByHash.get(was.hash);
      let bestIndex = -1;
      let bestScore = REVISION_SIMILARITY_THRESHOLD;
      if (wasText !== undefined) {
        const wasTokens = tokenSet(wasText);
        for (let i = 0; i < added.length; i++) {
          if (takenAdded.has(i)) continue;
          const candidate = added[i];
          if (candidate === undefined) continue;
          const block = blockByHash.get(candidate.hash);
          if (block === undefined) continue;
          const score = jaccard(wasTokens, tokenSet(block.canonical));
          if (score > bestScore) {
            bestScore = score;
            bestIndex = i;
          }
        }
      }
      const paired = bestIndex >= 0 ? added[bestIndex] : undefined;
      if (paired !== undefined) {
        takenAdded.add(bestIndex);
        changes.push({ kind: "revised", was, now: paired });
      } else {
        changes.push({ kind: "removed", was });
      }
    }
    for (let i = 0; i < added.length; i++) {
      const item = added[i];
      if (!takenAdded.has(i) && item !== undefined) changes.push({ kind: "added", now: item });
    }

    return {
      subjectId: entry.subjectId,
      approved: true,
      entryHashWas: approval.entryHash,
      entryHashNow: entry.entryHash,
      stillValid: approval.entryHash === entry.entryHash,
      unchangedCount,
      changes,
    };
  });
}

export function renderDelta(deltas: readonly SubjectDelta[], blockByHash: ReadonlyMap<string, Block>): string {
  const lines: string[] = [];
  lines.push("# What changed since you approved");
  lines.push("");
  for (const d of [...deltas].sort((a, b) => ordinalCompare(a.subjectId, b.subjectId))) {
    if (d.stillValid) {
      lines.push(`## \`${d.subjectId}\` — **no change.** Nothing to re-approve.`);
      lines.push("");
      continue;
    }
    lines.push(`## \`${d.subjectId}\``);
    lines.push("");
    if (!d.approved) {
      lines.push(
        `Never approved. ${String(d.changes.length)} passage(s) — this is a first look, not a delta.`,
      );
      lines.push("");
      continue;
    }
    lines.push(
      `${String(d.unchangedCount)} passage(s) unchanged; ${String(d.changes.length)} change(s) below.`,
    );
    lines.push("");
    for (const change of d.changes) {
      if (change.kind === "added") {
        lines.push(`### ADDED — ${change.now.file}:${String(change.now.lineStart)}`);
        lines.push("");
        lines.push(blockByHash.get(change.now.hash)?.raw ?? "(text unavailable)");
      } else if (change.kind === "removed") {
        lines.push(`### REMOVED — was in ${change.was.file}`);
        lines.push("");
        lines.push("(the passage you approved is no longer in the draft)");
      } else {
        lines.push(`### REVISED — ${change.now.file}:${String(change.now.lineStart)}`);
        lines.push("");
        lines.push(blockByHash.get(change.now.hash)?.raw ?? "(text unavailable)");
      }
      lines.push("");
    }
  }
  return `${lines.join("\n")}\n`;
}

function main(argv: readonly string[]): number {
  const repoRoot = process.cwd();
  const atIndex = argv.indexOf("--approvals");
  const approvalsPath =
    atIndex >= 0 ? (argv[atIndex + 1] ?? "") : join(repoRoot, "docs/books/you-born-at-the-hinge/SUBJECT-APPROVALS.json");

  const registry = loadRegistry(join(repoRoot, DEFAULT_REGISTRY_PATH));
  const files = listProseFiles(repoRoot, registry.root, registry.notProse);
  const parsed = parseFiles(repoRoot, files);
  const blocks = parsed.flatMap((p) => p.blocks);
  if (blocks.length === 0) {
    process.stderr.write("no prose blocks — refusing to report an empty delta as 'no change'\n");
    return 2;
  }
  const index = buildIndex(registry, blocks, files.length);
  const blockByHash = new Map(blocks.map((b) => [b.hash, b] as const));

  let approvals: readonly ApprovalRecord[] = [];
  if (existsSync(approvalsPath)) {
    const raw: unknown = JSON.parse(readFileSync(approvalsPath, "utf8"));
    const list = (raw as Record<string, unknown>)["approvals"];
    if (Array.isArray(list)) approvals = list as ApprovalRecord[];
  } else {
    process.stderr.write(
      `no approvals file at ${approvalsPath} — every subject reports as never-approved, which is honest and is not the same as "no change"\n`,
    );
  }

  // Approved text is not stored anywhere (the committed artifacts carry hashes, not prose), so
  // the rewrite pairing can only use text still present in the tree. Stated rather than hidden:
  // a passage that was approved and then deleted shows as REMOVED, never as REVISED.
  const approvedTextByHash = new Map<string, string>();
  for (const b of blocks) approvedTextByHash.set(b.hash, b.canonical);

  const deltas = computeDelta(index, approvals, blockByHash, approvedTextByHash);
  process.stdout.write(renderDelta(deltas, blockByHash));
  return 0;
}

if (import.meta.main) {
  process.exitCode = main(process.argv.slice(2));
}
