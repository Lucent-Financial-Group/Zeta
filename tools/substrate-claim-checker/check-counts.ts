#!/usr/bin/env bun
/**
 * substrate-claim-checker / check-counts.ts (v0.1)
 *
 * Per the verify-then-claim discipline memo
 * (`memory/feedback_verify_then_claim_discipline_dominant_failure_mode_substrate_authoring_otto_2026_05_03.md`).
 *
 * Catches count drift between narrative claims (e.g. "20 drift
 * instances", "13-row table", "5 procedure skills") and the
 * actual count of structured rows the claims reference.
 *
 * v0.1 (this file) addressed Copilot review on v0:
 *   - Fail fast on missing input files (exit 1, not silent skip)
 *   - Preserve `+` semantics: "20+" treated as a minimum-count claim
 *   - Catch hyphenated forms: "13-row" works, not just "13 row"
 *   - Skip fenced code blocks + table cells when scanning narrative
 *   - Drop unused Table.endLine field
 *
 * v0.1 NOT in scope (deferred to v1):
 *   - Existence drift (file/dir/tool claimed to exist; doesn't)
 *   - Semantic-equivalence drift (command substitution claims)
 *   - Empirical-output drift (run-the-command-and-compare)
 *   - Convention drift / path-form drift / self-recursive drift
 *
 * Usage:
 *   bun tools/substrate-claim-checker/check-counts.ts <file>
 *   bun tools/substrate-claim-checker/check-counts.ts <file1> <file2> ...
 *
 * Exit code:
 *   0  no drift detected
 *   1  drift detected, missing input file, or no inputs given
 */

import { readFileSync, existsSync, statSync } from "node:fs";

interface Finding {
  file: string;
  line: number;
  claim: string;
  claimedCount: number;
  claimIsMinimum: boolean;
  actualCount: number;
  context: string;
}

interface Table {
  startLine: number;
  rowCount: number;
}

interface Claim {
  line: number;
  raw: string;
  n: number;
  /** True if the original claim used a `+` suffix ("20+" → minimum). */
  isMinimum: boolean;
  noun: string;
}

/**
 * Find all markdown tables in the file and count data rows in each.
 * Skips fenced code blocks so example tables in code fences aren't
 * miscounted as real tables. Same fence-tracking discipline as
 * `findClaims()`.
 */
function findTables(lines: string[]): Table[] {
  const tables: Table[] = [];
  let fenceChar: "`" | "~" | null = null;
  let fenceLen = 0;
  let i = 0;
  while (i < lines.length) {
    const cur = lines[i] ?? "";
    const fenceMatch = /^\s*(`{3,}|~{3,})/.exec(cur);
    if (fenceMatch) {
      const delim = fenceMatch[1] ?? "";
      const ch = delim[0] === "`" ? "`" : "~";
      const len = delim.length;
      if (fenceChar === null) {
        // Open a fence
        fenceChar = ch;
        fenceLen = len;
        i++;
        continue;
      }
      // Close only if same char + at-least-equal length per CommonMark
      if (ch === fenceChar && len >= fenceLen) {
        fenceChar = null;
        fenceLen = 0;
        i++;
        continue;
      }
      // Otherwise it's just a line inside the fence
    }
    if (fenceChar !== null) {
      i++;
      continue;
    }
    const headerLine = cur;
    const sepLine = lines[i + 1] ?? "";
    // Separator must contain at least one `-` to be a real GFM table
    // separator; `|   |` or `||||` are not valid separators.
    if (
      /^\|.*\|\s*$/.test(headerLine) &&
      i + 1 < lines.length &&
      /^\|[\s\-:|]*-[\s\-:|]*\|\s*$/.test(sepLine)
    ) {
      const startLine = i + 1; // 1-indexed; header row is at i (0-indexed)
      let rowCount = 0;
      let j = i + 2;
      while (j < lines.length && /^\|.*\|\s*$/.test(lines[j] ?? "")) {
        rowCount++;
        j++;
      }
      tables.push({ startLine, rowCount });
      i = j;
    } else {
      i++;
    }
  }
  return tables;
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Find narrative claims like "N drift instances", "N rows", "N items",
 * "N-row table". Skips fenced code blocks and lines that are clearly
 * markdown table cells (start with `|`).
 */
function findClaims(lines: string[]): Claim[] {
  const claims: Claim[] = [];
  const nounsToCheck = [
    "drift instances",
    "drift instance",
    "rows",
    "row",
    "items",
    "item",
    "procedure skills",
    "named-persona experts",
    "tools",
    "sub-classes",
  ];
  // Match "20 rows" / "20+ rows" (whitespace-separated) or
  // "20-row" / "20+-row" (hyphenated), capturing integer + optional '+'.
  const nounAlt = nounsToCheck.map(escapeRegex).join("|");
  const pattern = new RegExp(
    `\\b(\\d+)(\\+?)[\\s-]+(${nounAlt})\\b`,
    "gi",
  );
  // CommonMark fence-tracking: a fence is closed only by a delimiter
  // of the same character and at-least-equal length.
  let fenceChar: "`" | "~" | null = null;
  let fenceLen = 0;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? "";
    const fenceMatch = /^\s*(`{3,}|~{3,})/.exec(line);
    if (fenceMatch) {
      const delim = fenceMatch[1] ?? "";
      const ch = delim[0] === "`" ? "`" : "~";
      const len = delim.length;
      if (fenceChar === null) {
        fenceChar = ch;
        fenceLen = len;
        continue;
      }
      if (ch === fenceChar && len >= fenceLen) {
        fenceChar = null;
        fenceLen = 0;
        continue;
      }
    }
    if (fenceChar !== null) continue;
    // Skip table rows (start with `|`) — they're data, not narrative.
    if (/^\s*\|/.test(line)) continue;
    for (const m of line.matchAll(pattern)) {
      const numStr = m[1];
      const plus = m[2];
      const noun = m[3];
      if (numStr === undefined || noun === undefined) continue;
      claims.push({
        line: i + 1,
        raw: m[0] ?? "",
        n: parseInt(numStr, 10),
        isMinimum: plus === "+",
        noun: noun.toLowerCase(),
      });
    }
  }
  return claims;
}

/**
 * For each claim, find the nearest table BELOW it within 50 lines and
 * check whether the claim's N matches the table's row count.
 *
 * "20+" is treated as a minimum-count claim: drift fires only when
 * actual < claimed. "20" (no plus) requires exact match.
 */
function checkFile(filePath: string): { findings: Finding[]; ok: boolean } {
  if (!existsSync(filePath)) {
    console.error(`error: file not found: ${filePath}`);
    return { findings: [], ok: false };
  }
  const stat = statSync(filePath);
  if (!stat.isFile()) {
    console.error(`error: not a regular file (directory or other): ${filePath}`);
    return { findings: [], ok: false };
  }
  const content = readFileSync(filePath, "utf-8");
  const lines = content.split("\n");
  const tables = findTables(lines);
  const claims = findClaims(lines);
  const findings: Finding[] = [];

  for (const claim of claims) {
    const nearestTable = tables.find(
      (t) => t.startLine > claim.line && t.startLine - claim.line <= 50,
    );
    if (!nearestTable) continue;
    const drift = claim.isMinimum
      ? nearestTable.rowCount < claim.n
      : nearestTable.rowCount !== claim.n;
    if (drift) {
      findings.push({
        file: filePath,
        line: claim.line,
        claim: claim.raw,
        claimedCount: claim.n,
        claimIsMinimum: claim.isMinimum,
        actualCount: nearestTable.rowCount,
        context: `nearest table at line ${nearestTable.startLine} has ${nearestTable.rowCount} data rows`,
      });
    }
  }
  return { findings, ok: true };
}

export { findTables, findClaims, checkFile };
export type { Finding, Table, Claim };

export function main(): number {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.error("usage: bun tools/substrate-claim-checker/check-counts.ts <file> [<file> ...]");
    return 1;
  }
  let totalFindings = 0;
  let inputErrors = 0;
  for (const arg of args) {
    const { findings, ok } = checkFile(arg);
    if (!ok) {
      inputErrors++;
      continue;
    }
    for (const f of findings) {
      const operator = f.claimIsMinimum ? ">=" : "==";
      console.log(
        `${f.file}:${f.line}: count drift — claim "${f.claim}" (expected ${operator} ${f.claimedCount}) vs actual ${f.actualCount} (${f.context})`,
      );
      totalFindings++;
    }
  }
  if (inputErrors > 0) {
    console.error(`\n${inputErrors} input error(s).`);
    return 1;
  }
  if (totalFindings > 0) {
    console.log(`\n${totalFindings} count-drift finding(s).`);
    return 1;
  }
  console.log("no count drift detected.");
  return 0;
}

if (import.meta.main) {
  process.exit(main());
}
