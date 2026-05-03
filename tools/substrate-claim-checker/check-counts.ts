#!/usr/bin/env bun
/**
 * substrate-claim-checker / check-counts.ts
 *
 * V0 of the substrate-claim-checker per
 * `memory/feedback_verify_then_claim_discipline_dominant_failure_mode_substrate_authoring_otto_2026_05_03.md`.
 *
 * Checks ONE class of drift: count drift between narrative claims
 * (e.g. "18+ drift instances", "13-row surface→specialist table",
 * "5 procedure skills + 5 tools") and the actual count of
 * structured rows / list items those claims reference.
 *
 * v0 scope:
 *   - Detect "N drift instances" / "N rows" / "N items" patterns in narrative
 *   - Count `^| ... |$` data rows (excluding header + separator)
 *   - Report drift if claimed N differs from actual
 *
 * v0 NOT in scope (deferred to v1):
 *   - Existence drift (file/dir/tool claimed to exist; doesn't)
 *   - Semantic-equivalence drift (command substitution claims)
 *   - Empirical-output drift (run-the-command-and-compare)
 *   - Convention drift / path-form drift
 *
 * Usage:
 *   bun tools/substrate-claim-checker/check-counts.ts <file>
 *   bun tools/substrate-claim-checker/check-counts.ts <file1> <file2> ...
 *
 * Exit code:
 *   0  no drift detected
 *   1  drift detected (or input error)
 */

import { readFileSync, existsSync } from "node:fs";

interface Finding {
  file: string;
  line: number;
  claim: string;
  claimedCount: number;
  actualCount: number;
  context: string;
}

interface Table {
  startLine: number;
  endLine: number;
  rowCount: number;
}

/** Find all markdown tables in the file and count data rows in each. */
function findTables(lines: string[]): Table[] {
  const tables: Table[] = [];
  let i = 0;
  while (i < lines.length) {
    // A table starts with a row matching | ... | and is followed by a separator |---|---|.
    if (
      /^\|.*\|\s*$/.test(lines[i]) &&
      i + 1 < lines.length &&
      /^\|[\s\-:|]+\|\s*$/.test(lines[i + 1])
    ) {
      const startLine = i + 1; // 1-indexed; header row is at i (0-indexed)
      let rowCount = 0;
      let j = i + 2; // skip header + separator
      while (j < lines.length && /^\|.*\|\s*$/.test(lines[j])) {
        rowCount++;
        j++;
      }
      tables.push({ startLine, endLine: j, rowCount });
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

/** Find narrative claims like "N drift instances", "N rows", "N items". */
function findClaims(lines: string[]): { line: number; raw: string; n: number; noun: string }[] {
  const claims: { line: number; raw: string; n: number; noun: string }[] = [];
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
  const pattern = new RegExp(
    `\\b(\\d+)\\+?\\s+(${nounsToCheck.map(escapeRegex).join("|")})\\b`,
    "gi",
  );
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    for (const m of line.matchAll(pattern)) {
      claims.push({
        line: i + 1,
        raw: m[0],
        n: parseInt(m[1]!, 10),
        noun: m[2]!.toLowerCase(),
      });
    }
  }
  return claims;
}

/**
 * For each claim, find the nearest table BELOW it within 50 lines and
 * check whether the claim's N matches the table's row count.
 */
function checkFile(filePath: string): Finding[] {
  if (!existsSync(filePath)) {
    console.error(`error: file not found: ${filePath}`);
    return [];
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
    if (nearestTable.rowCount !== claim.n) {
      findings.push({
        file: filePath,
        line: claim.line,
        claim: claim.raw,
        claimedCount: claim.n,
        actualCount: nearestTable.rowCount,
        context: `nearest table starts at line ${nearestTable.startLine} with ${nearestTable.rowCount} data rows`,
      });
    }
  }
  return findings;
}

function main(): number {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.error("usage: bun tools/substrate-claim-checker/check-counts.ts <file> [<file> ...]");
    return 1;
  }
  let totalFindings = 0;
  for (const arg of args) {
    const findings = checkFile(arg);
    for (const f of findings) {
      console.log(
        `${f.file}:${f.line}: count drift — claim "${f.claim}" (${f.claimedCount}) vs actual ${f.actualCount} (${f.context})`,
      );
      totalFindings++;
    }
  }
  if (totalFindings > 0) {
    console.log(`\n${totalFindings} count-drift finding(s).`);
    return 1;
  }
  console.log("no count drift detected.");
  return 0;
}

process.exit(main());
