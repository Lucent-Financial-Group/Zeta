import { resolve } from "node:path";
import {
  createLexicalCorrectionReceipt,
  lexicalContentIdIgnoringVersionForControl,
  mergeLexicalCorrectionStates,
  queryLexicalCorrectionState,
  queryLexicalCorrectionStateUnsortedForControl,
  type LexicalCorrectionQuery,
} from "../../../src/Core.TypeScript/research/english-lexical-correction-receipts";

interface QuerySummary {
  readonly status: "Ready" | "Conflict";
  readonly orderedContentIds: readonly string[];
  readonly receiptCount: number;
  readonly conflictSurfaces: readonly string[];
}

interface OracleReport {
  readonly canonical: QuerySummary;
  readonly canonicalPermutationCount: number;
  readonly unsortedOrderCount: number;
  readonly conflict: QuerySummary;
  readonly versionedContentIdsDistinct: boolean;
  readonly omittedVersionMutationCollapses: boolean;
}

function parseQuery(value: unknown, code: string): QuerySummary {
  if (typeof value !== "object" || value === null) throw new Error(code);
  const record = value as Record<string, unknown>;
  if ((record.status !== "Ready" && record.status !== "Conflict") || !Array.isArray(record.orderedContentIds) || !record.orderedContentIds.every((item) => typeof item === "string") || typeof record.receiptCount !== "number" || !Number.isInteger(record.receiptCount) || !Array.isArray(record.conflictSurfaces) || !record.conflictSurfaces.every((item) => typeof item === "string")) throw new Error(code);
  return {
    status: record.status,
    orderedContentIds: record.orderedContentIds,
    receiptCount: record.receiptCount,
    conflictSurfaces: record.conflictSurfaces,
  };
}

function parseOracle(value: unknown): OracleReport {
  if (typeof value !== "object" || value === null) throw new Error("LEXICAL-CORRECTION-PYTHON-SCHEMA");
  const record = value as Record<string, unknown>;
  if (typeof record.canonicalPermutationCount !== "number" || typeof record.unsortedOrderCount !== "number" || typeof record.versionedContentIdsDistinct !== "boolean" || typeof record.omittedVersionMutationCollapses !== "boolean") throw new Error("LEXICAL-CORRECTION-PYTHON-SCHEMA");
  return {
    canonical: parseQuery(record.canonical, "LEXICAL-CORRECTION-PYTHON-CANONICAL"),
    canonicalPermutationCount: record.canonicalPermutationCount,
    unsortedOrderCount: record.unsortedOrderCount,
    conflict: parseQuery(record.conflict, "LEXICAL-CORRECTION-PYTHON-CONFLICT"),
    versionedContentIdsDistinct: record.versionedContentIdsDistinct,
    omittedVersionMutationCollapses: record.omittedVersionMutationCollapses,
  };
}

function summarize(query: LexicalCorrectionQuery): QuerySummary {
  return {
    status: query.status,
    orderedContentIds: query.orderedContentIds,
    receiptCount: query.receiptCount,
    conflictSurfaces: query.status === "Conflict" ? query.conflictSurfaces : [],
  };
}

function sameQuery(left: QuerySummary, right: QuerySummary): boolean {
  return left.status === right.status && left.receiptCount === right.receiptCount && JSON.stringify(left.orderedContentIds) === JSON.stringify(right.orderedContentIds) && JSON.stringify(left.conflictSurfaces) === JSON.stringify(right.conflictSurfaces);
}

const root = resolve(import.meta.dir, "../../..");
const accepted = createLexicalCorrectionReceipt({ surface: "good", status: "accepted", replacement: undefined, source: "english-seed-v0", version: "0.1.0", reason: "declared-catalogue" });
const replaced = createLexicalCorrectionReceipt({ surface: "Colour", status: "replaced", replacement: "Color", source: "editorial-style", version: "1", reason: "spelling-variant" });
const unknown = createLexicalCorrectionReceipt({ surface: "zeta", status: "unknown", replacement: undefined, source: "manual-audit", version: "1", reason: "not-in-candidate-seed" });
const permutations = [
  [accepted, replaced, unknown], [accepted, unknown, replaced],
  [replaced, accepted, unknown], [replaced, unknown, accepted],
  [unknown, accepted, replaced], [unknown, replaced, accepted],
] as const;
const versionOne = createLexicalCorrectionReceipt({ surface: "colour", status: "replaced", replacement: "color", source: "editorial-style", version: "1", reason: "spelling-variant" });
const versionTwo = createLexicalCorrectionReceipt({ surface: "colour", status: "replaced", replacement: "color", source: "editorial-style", version: "2", reason: "spelling-variant" });
const conflictUnknown = createLexicalCorrectionReceipt({ surface: "colour", status: "unknown", replacement: undefined, source: "manual-audit", version: "2", reason: "review-pending" });
const processResult = Bun.spawnSync(["python3", resolve(import.meta.dir, "english_lexical_correction_oracle.py")], { cwd: root, stdout: "pipe", stderr: "pipe" });
if (processResult.exitCode !== 0) throw new Error(`LEXICAL-CORRECTION-PYTHON-FAILED:${processResult.stderr.toString().trim()}`);
const oracle = parseOracle(JSON.parse(processResult.stdout.toString()) as unknown);
const canonicalQueries = permutations.map((items) => summarize(queryLexicalCorrectionState(mergeLexicalCorrectionStates({ receipts: items }, { receipts: [accepted] }))));
const unsortedOrders = new Set(permutations.map((items) => JSON.stringify(queryLexicalCorrectionStateUnsortedForControl({ receipts: items }).orderedContentIds)));
const conflict = summarize(queryLexicalCorrectionState(mergeLexicalCorrectionStates({ receipts: [versionOne] }, { receipts: [versionTwo, conflictUnknown] })));
const failures: string[] = [];
if (!sameQuery(oracle.canonical, canonicalQueries[0] ?? (() => { throw new Error("LEXICAL-CORRECTION-CANONICAL-MISSING"); })())) failures.push("canonical-receipt");
if (canonicalQueries.some((query) => !sameQuery(query, canonicalQueries[0] ?? query))) failures.push("canonical-permutation");
if (oracle.canonicalPermutationCount !== 1) failures.push("python-canonical-permutation");
if (unsortedOrders.size !== oracle.unsortedOrderCount || unsortedOrders.size <= 1) failures.push("canonical-order-mutation-not-detected");
if (!sameQuery(oracle.conflict, conflict)) failures.push("conflict-receipt");
if (versionOne.contentId === versionTwo.contentId || !oracle.versionedContentIdsDistinct) failures.push("version-identity-not-distinct");
if (lexicalContentIdIgnoringVersionForControl(versionOne) !== lexicalContentIdIgnoringVersionForControl(versionTwo) || !oracle.omittedVersionMutationCollapses) failures.push("omitted-version-mutation-not-detected");
console.log(`Lexical correction cross-verification: 2 receipts; canonical order mutation ${failures.includes("canonical-order-mutation-not-detected") ? "not-detected" : "detected"}; omitted-version mutation ${failures.includes("omitted-version-mutation-not-detected") ? "not-detected" : "detected"}; failures ${String(failures.length)}`);
if (failures.length > 0) {
  for (const failure of failures) console.error(failure);
  process.exit(1);
}
