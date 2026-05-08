/**
 * Mechanical authorization check — source-filter + recency resolver (B-0307).
 *
 * Pure function: given PaceInstruction[] from B-0306's extractor,
 * applies source-filter → recency-filter → returns the single
 * operative authorization. No file I/O.
 */

import type { PaceInstruction } from "./pace-extractor.ts";

export interface AuthorizationResult {
  operative: PaceInstruction | null;
  reason: string;
  allCandidates: PaceInstruction[];
  filteredOut: PaceInstruction[];
}

const AUTHORIZED_SOURCES: ReadonlySet<string> = new Set(["aaron"]);

export function resolveAuthorization(
  instructions: PaceInstruction[],
): AuthorizationResult {
  const allCandidates = [...instructions];

  const authorized: PaceInstruction[] = [];
  const filteredOut: PaceInstruction[] = [];

  for (const inst of instructions) {
    if (AUTHORIZED_SOURCES.has(inst.source)) {
      authorized.push(inst);
    } else {
      filteredOut.push(inst);
    }
  }

  if (authorized.length === 0) {
    return {
      operative: null,
      reason:
        "no operative pace authorization found; default to never-idle floor per CLAUDE.md",
      allCandidates,
      filteredOut,
    };
  }

  const sorted = [...authorized].sort((a, b) => {
    if (a.timestamp === b.timestamp) return 0;
    if (a.timestamp === null) return -1;
    if (b.timestamp === null) return 1;
    return a.timestamp.localeCompare(b.timestamp);
  });

  const mostRecent = sorted[sorted.length - 1]!;

  return {
    operative: mostRecent,
    reason: `most recent authorized pace instruction from ${mostRecent.source} (${mostRecent.timestamp ?? "undated"})`,
    allCandidates,
    filteredOut,
  };
}
