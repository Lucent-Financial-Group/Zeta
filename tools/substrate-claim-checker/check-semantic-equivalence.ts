#!/usr/bin/env bun
/**
 * substrate-claim-checker / check-semantic-equivalence.ts (v0)
 *
 * B-0170.1 — smallest safe slice of the semantic-equivalence-drift
 * sub-class per the verify-then-claim discipline memo:
 *   `memory/feedback_verify_then_claim_discipline_dominant_failure_mode_substrate_authoring_otto_2026_05_03.md`
 *
 * Eval-set instances catalogued in that memo:
 *   #12 — "replaced `ls|grep` with `find -iname` — claimed equivalent"
 *         (`find -iname` only does shell glob, not regex alternation)
 *   #13 — "replaced earlier with `grep -ilrE PATTERN docs/DECISIONS/` —
 *          claimed equivalent" (`grep -r` searches CONTENTS, not filenames)
 *
 * The drift pattern: prose asserts two shell command forms are
 * equivalent, but they actually have different semantics. Auto-
 * verifying command equivalence is out of scope for v0 (would
 * require execution and would still miss semantic differences in
 * edge cases). Instead, v0 surfaces *candidate* equivalence claims
 * for human review as `warning`-severity findings.
 *
 * What v0 catches (lexical patterns near backticked commands):
 *   - "`X` is equivalent to `Y`"
 *   - "`X` does the same as `Y`"
 *   - "`X` (same as `Y`)" / "`X` (equivalent to `Y`)"
 *   - "replaced `X` with `Y` — equivalent" / "claimed equivalent"
 *
 * Severity model (matches check-existence.ts v0.6):
 *   - "warning"  — candidate claim flagged for human review; exit 0
 *   - "drift"    — (reserved for future versions that can falsify
 *                  equivalence empirically); exit 1 if any present
 *
 * Usage:
 *   bun tools/substrate-claim-checker/check-semantic-equivalence.ts <file>
 *   bun tools/substrate-claim-checker/check-semantic-equivalence.ts <file1> <file2> ...
 *
 * Exit code:
 *   0  no drift detected (warnings alone are non-blocking)
 *   1  drift detected, input error, or no inputs given
 */

import { readFileSync } from "node:fs";

export type Severity = "warning" | "drift";

export interface Finding {
  file: string;
  line: number;
  severity: Severity;
  claim: string;
  left: string;
  right: string;
  hint: string;
}

interface FenceState {
  char: "`" | "~" | null;
  len: number;
}

function fenceTransition(line: string, state: FenceState): FenceState {
  // CommonMark fence rules — opener may have info-string, closer must
  // be whitespace-only after the delimiter. Same discipline as
  // check-counts.ts / check-cross-surface.ts.
  const open = line.match(/^\s*(`{3,}|~{3,})/);
  const close = line.match(/^\s*(`{3,}|~{3,})\s*$/);
  if (open) {
    const delim = open[1] ?? "";
    const ch = delim[0] === "`" ? "`" : "~";
    const len = delim.length;
    if (state.char === null) return { char: ch, len };
    if (close && state.char === ch && delim.length >= state.len) {
      return { char: null, len: 0 };
    }
  }
  return state;
}

/**
 * Equivalence-phrase patterns. Each pattern looks for two
 * backticked tokens linked by an equivalence assertion. Capture
 * groups: 1 = left command, 2 = right command (order is informational
 * only — the finding hint preserves both for human review).
 *
 * Patterns kept narrow and lexical on purpose: v0 catches *candidate*
 * claims (warning severity) without trying to falsify them.
 */
const PATTERNS: ReadonlyArray<{ re: RegExp; hint: string }> = [
  // `X` is equivalent to `Y`
  {
    re: /`([^`\n]+?)`\s+(?:is|are|was|were)\s+equivalent\s+to\s+`([^`\n]+?)`/i,
    hint: "explicit equivalence claim",
  },
  // `X` does the same (thing) as `Y`
  {
    re: /`([^`\n]+?)`\s+(?:does|do|did)\s+the\s+same(?:\s+thing)?\s+as\s+`([^`\n]+?)`/i,
    hint: "same-as claim",
  },
  // replaced `X` with `Y` [equivalent|same]
  {
    re: /\breplac(?:ed|ing)\s+`([^`\n]+?)`\s+with\s+`([^`\n]+?)`[^.\n]*?\b(?:equivalent|same|identical)\b/i,
    hint: "replacement-claimed-equivalent (instance #12/#13 shape)",
  },
  // `X` (same as `Y`) / `X` (equivalent to `Y`)
  {
    re: /`([^`\n]+?)`\s*\(\s*(?:same\s+as|equivalent\s+to)\s+`([^`\n]+?)`\s*\)/i,
    hint: "parenthetical equivalence",
  },
  // `X` ≡ `Y` (unicode triple-bar)
  {
    re: /`([^`\n]+?)`\s*≡\s*`([^`\n]+?)`/,
    hint: "triple-bar equivalence",
  },
];

const SHELL_TOKEN = /\b(?:ls|cat|grep|rg|find|awk|sed|cut|head|tail|sort|uniq|xargs|wc|tr|jq|gh|bun|git|docker|kubectl|curl|cd|test|stat)\b|[|<>]/;

function looksLikeShell(s: string): boolean {
  return SHELL_TOKEN.test(s);
}

export function findFindings(
  filePath: string,
  content: string,
): Finding[] {
  const lines = content.split("\n");
  const findings: Finding[] = [];
  let fence: FenceState = { char: null, len: 0 };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? "";
    const before = fence;
    fence = fenceTransition(line, fence);
    if (before.char !== null) continue; // skip inside fenced code blocks

    for (const { re, hint } of PATTERNS) {
      const m = line.match(re);
      if (!m) continue;
      const left = m[1] ?? "";
      const right = m[2] ?? "";
      if (!left || !right) continue;
      // require at least one side to look shell-ish — keeps prose
      // metaphors like "`alpha` is equivalent to `beta`" from
      // generating noise. Both sides scanned because either may
      // carry shell tokens (instance #13: only the new form did).
      if (!looksLikeShell(left) && !looksLikeShell(right)) continue;

      findings.push({
        file: filePath,
        line: i + 1,
        severity: "warning",
        claim: m[0] ?? "",
        left,
        right,
        hint,
      });
    }
  }

  return findings;
}

export function checkFile(
  filePath: string,
): { findings: Finding[]; ok: boolean } {
  let content: string;
  try {
    content = readFileSync(filePath, "utf-8");
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code === "ENOENT") {
      console.error(`error: file not found: ${filePath}`);
    } else if (code === "EISDIR") {
      console.error(`error: not a regular file (directory): ${filePath}`);
    } else {
      console.error(
        `error: read failed for ${filePath}: ${(err as Error).message}`,
      );
    }
    return { findings: [], ok: false };
  }

  return { findings: findFindings(filePath, content), ok: true };
}

export function main(): number {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.error(
      "usage: bun tools/substrate-claim-checker/check-semantic-equivalence.ts <file> [<file> ...]",
    );
    return 1;
  }

  let warnings = 0;
  let drifts = 0;
  let inputErrors = 0;

  for (const arg of args) {
    const { findings, ok } = checkFile(arg);
    if (!ok) {
      inputErrors++;
      continue;
    }
    for (const f of findings) {
      console.log(
        `${f.file}:${f.line}: ${f.severity} — semantic-equivalence (${f.hint}): \`${f.left}\` ≈? \`${f.right}\``,
      );
      if (f.severity === "drift") drifts++;
      else warnings++;
    }
  }

  if (inputErrors > 0) {
    console.error(`\n${inputErrors} input error(s).`);
    return 1;
  }
  if (drifts > 0) {
    console.log(
      `\n${drifts} drift, ${warnings} warning(s) — semantic-equivalence candidates flagged.`,
    );
    return 1;
  }
  if (warnings > 0) {
    console.log(
      `\n${warnings} warning(s) — semantic-equivalence candidates flagged for human review.`,
    );
    return 0;
  }
  console.log("no semantic-equivalence claims detected.");
  return 0;
}

if (import.meta.main) {
  process.exit(main());
}
