/**
 * Finite lexical correction receipts.
 *
 * This module stores declared lexical corrections and explicit unknowns. It is
 * not a semantic parser, word-sense model, language generator, or posterior
 * merge. Its state is a canonical content-addressed receipt set; the exported
 * query only reports the set or visible same-surface conflicts.
 */

import { tokenizeEnglishSeedText } from "./english-seed-coverage";

export const LEXICAL_CORRECTION_ALGORITHM = "declared-lexical-correction-receipts/v1";

export type LexicalCorrectionStatus = "accepted" | "replaced" | "unknown";

export interface LexicalCorrectionInput {
  readonly surface: string;
  readonly status: LexicalCorrectionStatus;
  readonly replacement: string | undefined;
  readonly source: string;
  readonly version: string;
  readonly reason: string;
}

export interface LexicalCorrectionReceipt {
  readonly surface: string;
  readonly status: LexicalCorrectionStatus;
  readonly replacement: string | undefined;
  readonly source: string;
  readonly version: string;
  readonly reason: string;
  /** Length-prefixed canonical fingerprint, not a semantic interpretation. */
  readonly contentId: string;
}

export interface LexicalCorrectionState {
  readonly receipts: readonly LexicalCorrectionReceipt[];
}

export interface ReadyLexicalCorrectionQuery {
  readonly status: "Ready";
  readonly algorithm: typeof LEXICAL_CORRECTION_ALGORITHM;
  readonly orderedContentIds: readonly string[];
  readonly receipts: readonly LexicalCorrectionReceipt[];
  readonly receiptCount: number;
}

export interface ConflictLexicalCorrectionQuery {
  readonly status: "Conflict";
  readonly algorithm: typeof LEXICAL_CORRECTION_ALGORITHM;
  readonly orderedContentIds: readonly string[];
  readonly receipts: readonly LexicalCorrectionReceipt[];
  readonly receiptCount: number;
  readonly conflictSurfaces: readonly string[];
}

export type LexicalCorrectionQuery = ReadyLexicalCorrectionQuery | ConflictLexicalCorrectionQuery;

function ordinalCompare(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function normalizeForm(value: string, code: string): string {
  const normalized = tokenizeEnglishSeedText(value).join(" ");
  if (normalized.length === 0) throw new Error(code);
  return normalized;
}

function requiredText(value: string, code: string): string {
  const normalized = value.normalize("NFKC").trim();
  if (normalized.length === 0) throw new Error(code);
  return normalized;
}

function field(value: string): string {
  return `${new TextEncoder().encode(value).byteLength}:${value}`;
}

function fingerprint(
  surface: string,
  status: LexicalCorrectionStatus,
  replacement: string | undefined,
  source: string,
  version: string,
  reason: string,
): string {
  return [
    LEXICAL_CORRECTION_ALGORITHM,
    field(surface),
    field(status),
    field(replacement ?? ""),
    field(source),
    field(version),
    field(reason),
  ].join("|");
}

/** Test-only identity mutation: version omission must collapse versioned receipts. */
export function lexicalContentIdIgnoringVersionForControl(receipt: LexicalCorrectionReceipt): string {
  return fingerprint(receipt.surface, receipt.status, receipt.replacement, receipt.source, "", receipt.reason);
}

function validateReceipt(receipt: LexicalCorrectionReceipt): void {
  const rebuilt = createLexicalCorrectionReceipt(receipt);
  if (rebuilt.contentId !== receipt.contentId) throw new Error("LEXICAL-CORRECTION-CONTENT-ID");
}

/** Create one declared lexical record; this performs no semantic inference. */
export function createLexicalCorrectionReceipt(input: LexicalCorrectionInput): LexicalCorrectionReceipt {
  const surface = normalizeForm(input.surface, "LEXICAL-CORRECTION-SURFACE");
  const source = requiredText(input.source, "LEXICAL-CORRECTION-SOURCE");
  const version = requiredText(input.version, "LEXICAL-CORRECTION-VERSION");
  const reason = requiredText(input.reason, "LEXICAL-CORRECTION-REASON");
  const replacement = input.replacement === undefined
    ? undefined
    : normalizeForm(input.replacement, "LEXICAL-CORRECTION-REPLACEMENT");

  if (input.status === "replaced") {
    if (replacement === undefined || replacement === surface) throw new Error("LEXICAL-CORRECTION-REPLACEMENT");
  } else if (replacement !== undefined) {
    throw new Error("LEXICAL-CORRECTION-UNEXPECTED-REPLACEMENT");
  }

  return {
    surface,
    status: input.status,
    replacement,
    source,
    version,
    reason,
    contentId: fingerprint(surface, input.status, replacement, source, version, reason),
  };
}

/** Canonical content-addressed union; duplicate delivery is idempotent. */
export function mergeLexicalCorrectionStates(...states: readonly LexicalCorrectionState[]): LexicalCorrectionState {
  const byContentId = new Map<string, LexicalCorrectionReceipt>();
  for (const state of states) {
    for (const receipt of state.receipts) {
      validateReceipt(receipt);
      const existing = byContentId.get(receipt.contentId);
      if (existing !== undefined && JSON.stringify(existing) !== JSON.stringify(receipt)) {
        throw new Error("LEXICAL-CORRECTION-CONTENT-ID-COLLISION");
      }
      byContentId.set(receipt.contentId, receipt);
    }
  }
  return { receipts: [...byContentId.values()].sort((left, right) => ordinalCompare(left.contentId, right.contentId)) };
}

export function lexicalCorrectionConflictSurfaces(state: LexicalCorrectionState): readonly string[] {
  const contentIdsBySurface = new Map<string, Set<string>>();
  for (const receipt of state.receipts) {
    const ids = contentIdsBySurface.get(receipt.surface) ?? new Set<string>();
    ids.add(receipt.contentId);
    contentIdsBySurface.set(receipt.surface, ids);
  }
  return [...contentIdsBySurface.entries()]
    .filter(([, ids]) => ids.size > 1)
    .map(([surface]) => surface)
    .sort(ordinalCompare);
}

/** Deterministic materialized view; a conflict is explicit and has no chosen winner. */
export function queryLexicalCorrectionState(state: LexicalCorrectionState): LexicalCorrectionQuery {
  const canonical = mergeLexicalCorrectionStates(state);
  const orderedContentIds = canonical.receipts.map((receipt) => receipt.contentId);
  const conflictSurfaces = lexicalCorrectionConflictSurfaces(canonical);
  const shared = {
    algorithm: LEXICAL_CORRECTION_ALGORITHM,
    orderedContentIds,
    receipts: canonical.receipts,
    receiptCount: canonical.receipts.length,
  } as const;
  if (conflictSurfaces.length > 0) return { status: "Conflict", ...shared, conflictSurfaces };
  return { status: "Ready", ...shared };
}

/**
 * Test-only canonical-order mutation. It retains the supplied sequence instead
 * of content-ID sorting; callers must never use it as state or a query input.
 */
export function queryLexicalCorrectionStateUnsortedForControl(state: LexicalCorrectionState): LexicalCorrectionQuery {
  for (const receipt of state.receipts) validateReceipt(receipt);
  const orderedContentIds = state.receipts.map((receipt) => receipt.contentId);
  const conflictSurfaces = lexicalCorrectionConflictSurfaces(state);
  const shared = {
    algorithm: LEXICAL_CORRECTION_ALGORITHM,
    orderedContentIds,
    receipts: state.receipts,
    receiptCount: state.receipts.length,
  } as const;
  if (conflictSurfaces.length > 0) return { status: "Conflict", ...shared, conflictSurfaces };
  return { status: "Ready", ...shared };
}
