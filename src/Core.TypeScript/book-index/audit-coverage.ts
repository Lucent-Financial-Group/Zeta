#!/usr/bin/env bun
// audit-coverage.ts — the falsifier for the named index.
//
// The index (`build-index.ts`) answers a subject's real question: "what does this book say
// about me?" This file answers the question that decides whether the index is worth anything:
// "is there anything about me the index MISSED, or anything in the book that my consent state
// forbids?" An index that silently under-reports means someone approved a portrayal they were
// never shown — complete-looking coverage that is not complete, landing on a named third party
// rather than on CI. That is the failure class this file exists to make loud.
//
// FIVE CHECKS, and their dispositions differ on purpose:
//
//   REGISTRY   registry parses; markers name real subjects.                       -> fail
//   STATE      no subject appears in a way their consent state forbids.           -> fail/review
//   LEAK       no WITHHELD name appears anywhere in the repository.               -> fail/UNCHECKED
//   SWEEP      no NEW capitalised person-name candidate outside the baseline.     -> fail
//   LIVENESS   the audit refuses to pass while inspecting nothing.                -> unchecked
//
// EXIT CODES — the distinction is the whole point:
//   0  every check RAN and passed.
//   1  a check ran and FAILED.
//   2  a check COULD NOT RUN. Not a pass. `.claude` memory:
//      `exit-code-2-is-a-check-that-never-ran-not-one-that-failed`.
//
// The default is fail-closed: a missing overlay makes the leak check UNCHECKED and the run
// exits 2. `--allow-unchecked` downgrades that to a loud banner for callers that want the
// other four checks to be blocking, and the unchecked count still appears in the summary line
// so "0 failures" can never read as green.
//
// NOT WIRED INTO CI, deliberately. The leak check needs a local overlay of names that are not
// in the repository and must never be, so a CI runner cannot perform it. A human runs this.

import { existsSync, readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { join } from "node:path";
import {
  DEFAULT_REGISTRY_PATH,
  loadOverlay,
  loadRegistry,
  overlayPath,
  STATE_RULES,
  withheldNamesFor,
  type Registry,
  type Subject,
} from "./registry.ts";
import {
  findOccurrences,
  listProseFiles,
  ordinalCompare,
  parseFiles,
  type Block,
  type DetectorSet,
  type Occurrence,
} from "./scan.ts";
import { applyRatchet, findCandidates, parseBaseline, type Baseline } from "./sweep.ts";

export type Severity = "fail" | "review" | "unchecked";

export interface Finding {
  readonly severity: Severity;
  readonly check: "REGISTRY" | "STATE" | "LEAK" | "SWEEP" | "LIVENESS";
  readonly subjectId?: string;
  readonly message: string;
  readonly evidence?: string;
}

export interface AuditResult {
  readonly findings: readonly Finding[];
  readonly filesScanned: number;
  readonly blocksScanned: number;
  readonly subjectsChecked: number;
  readonly leakScope: string;
  readonly untriagedCandidates: number;
}

/**
 * Adjudications for STATE findings, keyed by BLOCK HASH.
 *
 * Some appearances of a forbidden subject are not appearances at all. Five blocks in this book
 * say "his son is omitted entirely" — editorial notes ABOUT the omission, which a string match
 * cannot distinguish from a mention of him. Those need a human's one-line call.
 *
 * Keying on the block hash rather than on a file/line is what stops this becoming a permanent
 * exemption: EDIT THE TEXT AND THE ADJUDICATION EXPIRES, because the hash it was granted
 * against no longer exists. The same shape as the repo's `b-ref-adjudicated` annotations —
 * checked, not trusted.
 */
export interface Adjudication {
  readonly blockHash: string;
  readonly subjectId: string;
  readonly reason: string;
  readonly by: string;
  readonly at: string;
  /** The line as it stood when adjudicated, so a reviewer can check without opening the file. */
  readonly evidence: string;
}

export function parseAdjudications(json: string, sourceLabel: string): Adjudication[] {
  const raw: unknown = JSON.parse(json);
  if (typeof raw !== "object" || raw === null) throw new Error(`${sourceLabel}: not an object`);
  const list = (raw as Record<string, unknown>)["adjudications"];
  if (!Array.isArray(list)) throw new Error(`${sourceLabel}: needs an array "adjudications"`);
  return list.map((entry, i) => {
    if (typeof entry !== "object" || entry === null) {
      throw new Error(`${sourceLabel}: adjudication ${String(i)} must be an object`);
    }
    const r = entry as Record<string, unknown>;
    for (const key of ["blockHash", "subjectId", "reason", "by", "at", "evidence"]) {
      if (typeof r[key] !== "string" || (r[key] as string).length === 0) {
        throw new Error(`${sourceLabel}: adjudication ${String(i)} needs a non-empty string "${key}"`);
      }
    }
    return {
      blockHash: r["blockHash"] as string,
      subjectId: r["subjectId"] as string,
      reason: r["reason"] as string,
      by: r["by"] as string,
      at: r["at"] as string,
      evidence: r["evidence"] as string,
    };
  });
}

export interface AuditInputs {
  readonly registry: Registry;
  readonly blocks: readonly Block[];
  readonly filesScanned: number;
  readonly occurrences: readonly Occurrence[];
  readonly adjudications: readonly Adjudication[];
  readonly baseline: Baseline | null;
  /**
   * Withheld-name lookup. `null` for a subject means "the names could not be supplied" —
   * distinct from `[]`, which would silently pass. The caller supplies the resolver so the
   * leak scan can be swapped for a fixture in tests.
   */
  readonly withheldNames: (subject: Subject) => readonly string[] | null;
  /** Returns the repo paths containing `literal`, case-insensitively. */
  readonly leakScan: (literals: readonly string[]) => Map<string, readonly string[]>;
  readonly leakScope: string;
}

export function detectorSetsFor(registry: Registry): DetectorSet[] {
  return registry.subjects.map((s) => ({
    subjectId: s.id,
    names: s.detectors.names,
    rolePhrases: s.detectors.rolePhrases,
  }));
}

export function registeredTokens(registry: Registry): Set<string> {
  const out = new Set<string>();
  for (const s of registry.subjects) {
    for (const literal of [...s.detectors.names, ...s.detectors.rolePhrases]) {
      for (const word of literal.split(/[\s-]+/)) {
        if (word.length > 0) out.add(word);
      }
    }
  }
  return out;
}

export function runAudit(inputs: AuditInputs): AuditResult {
  const findings: Finding[] = [];
  const { registry, blocks, occurrences } = inputs;
  const subjectById = new Map(registry.subjects.map((s) => [s.id, s] as const));

  // --- LIVENESS ------------------------------------------------------------------------
  // "Checked 0 files" must never read as success.
  if (inputs.filesScanned === 0 || blocks.length === 0) {
    findings.push({
      severity: "unchecked",
      check: "LIVENESS",
      message: `inspected ${String(inputs.filesScanned)} file(s) and ${String(blocks.length)} block(s) — an empty corpus makes every check below vacuous`,
    });
  }

  // --- REGISTRY: markers must name real subjects ----------------------------------------
  for (const block of blocks) {
    for (const id of block.markedSubjects) {
      if (!subjectById.has(id)) {
        findings.push({
          severity: "fail",
          check: "REGISTRY",
          message: `in-text marker names unknown subject id "${id}"`,
          evidence: `${block.file}:${String(block.lineStart)}`,
        });
      }
    }
  }

  // --- STATE: nobody may appear in a way their consent state forbids ---------------------
  const adjudicated = new Set(inputs.adjudications.map((a) => `${a.subjectId} ${a.blockHash}`));
  const adjudicationUsed = new Set<string>();

  for (const occ of occurrences) {
    const subject = subjectById.get(occ.subjectId);
    if (subject === undefined) continue; // already reported as an unknown marker id
    const rule = STATE_RULES[subject.state];

    const forbidden =
      (occ.detectorKind === "name" && !rule.nameMayAppear) || !rule.roleMayAppear;
    if (!forbidden) continue;

    const key = `${subject.id} ${occ.block.hash}`;
    if (adjudicated.has(key)) {
      adjudicationUsed.add(key);
      continue;
    }
    findings.push({
      severity: occ.detectorKind === "name" && !rule.nameMayAppear ? "fail" : "review",
      check: "STATE",
      subjectId: subject.id,
      message: `subject is "${subject.state}" (${rule.nameMayAppear ? "" : "name may not appear"}${rule.roleMayAppear ? "" : "; may not appear at all"}) but matched "${occ.detector}"`,
      evidence: `${occ.block.file}:${String(occ.block.lineStart)} — ${occ.block.canonical.slice(0, 140)}`,
    });
  }

  for (const a of inputs.adjudications) {
    const key = `${a.subjectId} ${a.blockHash}`;
    if (!adjudicationUsed.has(key)) {
      findings.push({
        severity: "fail",
        check: "STATE",
        subjectId: a.subjectId,
        message: `adjudication is STALE — no block with hash ${a.blockHash} matches subject "${a.subjectId}" any more. The text it excused has changed; re-decide rather than re-key.`,
        evidence: a.evidence,
      });
    }
  }

  // --- LEAK: no withheld name anywhere in the repository ---------------------------------
  const literalOwner = new Map<string, string>();
  const literals: string[] = [];
  for (const subject of registry.subjects) {
    const names = inputs.withheldNames(subject);
    if (names === null) {
      findings.push({
        severity: "unchecked",
        check: "LEAK",
        subjectId: subject.id,
        message: `withheld names for "${subject.id}" (${subject.state}) are not available — the leak check DID NOT RUN for this subject. Supply the local overlay; a missing overlay is not a pass.`,
      });
      continue;
    }
    for (const name of names) {
      literals.push(name);
      literalOwner.set(name, subject.id);
    }
  }
  if (literals.length > 0) {
    const hits = inputs.leakScan(literals);
    for (const [literal, paths] of hits) {
      if (paths.length === 0) continue;
      const owner = literalOwner.get(literal) ?? "?";
      findings.push({
        severity: "fail",
        check: "LEAK",
        subjectId: owner,
        // The literal itself is NOT printed: this report can be pasted anywhere, and echoing
        // the withheld name would republish exactly what the check protects.
        message: `a withheld name for "${owner}" appears in ${String(paths.length)} tracked path(s)`,
        evidence: paths.slice(0, 8).join(", "),
      });
    }
  }

  // --- SWEEP: no NEW unregistered person-name candidate ----------------------------------
  let untriaged = 0;
  if (inputs.baseline === null) {
    findings.push({
      severity: "unchecked",
      check: "SWEEP",
      message:
        "no sweep baseline — the unregistered-person check DID NOT RUN. Generate one with `--write-baseline`; without it the index can under-report a whole person with no signal.",
    });
  } else {
    const candidates = findCandidates({ blocks, registeredTokens: registeredTokens(registry) });
    const ratchet = applyRatchet(candidates, inputs.baseline);
    untriaged = ratchet.untriaged;
    for (const novel of ratchet.novel) {
      findings.push({
        severity: "fail",
        check: "SWEEP",
        message: `"${novel.token}" appears ${String(novel.count)}x in prose, is in no subject's detectors, and is not in the baseline — if this is a person, they need a registry row and a consent state before the index can claim to be complete`,
        evidence: novel.locations.join(", "),
      });
    }
    for (const stale of ratchet.stale) {
      findings.push({
        severity: "fail",
        check: "SWEEP",
        message: `baseline entry "${stale}" no longer appears in the prose — prune it. A baseline that keeps dead entries is cover, not a ratchet.`,
      });
    }
  }

  return {
    findings,
    filesScanned: inputs.filesScanned,
    blocksScanned: blocks.length,
    subjectsChecked: registry.subjects.length,
    leakScope: inputs.leakScope,
    untriagedCandidates: untriaged,
  };
}

export function exitCodeFor(result: AuditResult, allowUnchecked: boolean): number {
  const unchecked = result.findings.some((f) => f.severity === "unchecked");
  const failed = result.findings.some((f) => f.severity === "fail" || f.severity === "review");
  if (unchecked && !allowUnchecked) return 2;
  if (failed) return 1;
  if (unchecked) return 1; // --allow-unchecked still refuses to print a clean 0
  return 0;
}

// ---------------------------------------------------------------------------------------
// Leak scanning against the real repository
// ---------------------------------------------------------------------------------------

/**
 * `git grep -F -i -l` over tracked files.
 *
 * One invocation carries every literal (`-e` repeated), so the whole leak check is a single
 * pass. Literals travel in argv rather than through a file: argv is transient, whereas writing
 * withheld names to a scratch file would persist them somewhere new — which is the harm.
 * `spawnSync` with an argument array means no shell, so nothing is interpolated and nothing
 * reaches shell history.
 *
 * Exit status is read DIRECTLY from `.status`, never inferred from output: git grep returns 1
 * for "no matches" and >1 for a real error, and treating those alike would turn a broken check
 * into a passing one.
 */
export function gitGrepLeakScan(
  repoRoot: string,
  scope: readonly string[],
): (literals: readonly string[]) => Map<string, readonly string[]> {
  return (literals) => {
    const out = new Map<string, readonly string[]>();
    for (const literal of literals) {
      const args = ["grep", "-F", "-i", "-l", "-e", literal, "--", ...scope];
      const proc = spawnSync("git", args, { cwd: repoRoot, encoding: "utf8" });
      if (proc.error !== undefined) {
        throw new Error(`git grep failed to start: ${String(proc.error)}`);
      }
      if (proc.status === null || proc.status > 1) {
        throw new Error(
          `git grep exited ${String(proc.status)} — the leak check did not run: ${proc.stderr}`,
        );
      }
      const paths =
        proc.status === 0
          ? proc.stdout.split("\n").map((s) => s.trim()).filter((s) => s.length > 0).sort(ordinalCompare)
          : [];
      out.set(literal, paths);
    }
    return out;
  };
}

// ---------------------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------------------

function formatReport(result: AuditResult, overlayNote: string): string {
  const lines: string[] = [];
  lines.push("book-index coverage audit — You, Born at the Hinge");
  lines.push(
    `  scanned ${String(result.filesScanned)} prose file(s), ${String(result.blocksScanned)} block(s), ${String(result.subjectsChecked)} subject(s)`,
  );
  lines.push(`  leak scope: ${result.leakScope}`);
  lines.push(`  overlay: ${overlayNote}`);
  lines.push("");

  const order: Severity[] = ["unchecked", "fail", "review"];
  for (const severity of order) {
    const group = result.findings.filter((f) => f.severity === severity);
    if (group.length === 0) continue;
    lines.push(`${severity.toUpperCase()} (${String(group.length)}):`);
    for (const f of group) {
      lines.push(`  [${f.check}]${f.subjectId === undefined ? "" : ` ${f.subjectId}:`} ${f.message}`);
      if (f.evidence !== undefined) lines.push(`      ${f.evidence}`);
    }
    lines.push("");
  }

  const counts = {
    unchecked: result.findings.filter((f) => f.severity === "unchecked").length,
    fail: result.findings.filter((f) => f.severity === "fail").length,
    review: result.findings.filter((f) => f.severity === "review").length,
  };
  // The unchecked count sits in the summary line beside the failure count on purpose. A run
  // reporting "0 failures" while three checks never ran is the exact shape of a green board
  // that means nothing.
  lines.push(
    `SUMMARY: ${String(counts.fail)} fail · ${String(counts.review)} review · ${String(counts.unchecked)} UNCHECKED · ${String(result.untriagedCandidates)} untriaged sweep candidates`,
  );
  return lines.join("\n");
}

function main(argv: readonly string[]): number {
  const repoRoot = process.cwd();
  const allowUnchecked = argv.includes("--allow-unchecked");
  const scopeArgIndex = argv.indexOf("--leak-scope");
  const leakScopeArg = scopeArgIndex >= 0 ? (argv[scopeArgIndex + 1] ?? "repo") : "repo";

  const registry = loadRegistry(join(repoRoot, DEFAULT_REGISTRY_PATH));
  const files = listProseFiles(repoRoot, registry.root, registry.notProse);
  const parsed = parseFiles(repoRoot, files);
  const blocks = parsed.flatMap((p) => p.blocks);

  const occurrences = findOccurrences(blocks, detectorSetsFor(registry));

  const adjPath = join(repoRoot, registry.root, "SUBJECT-INDEX-ADJUDICATIONS.json");
  const adjudications = existsSync(adjPath)
    ? parseAdjudications(readFileSync(adjPath, "utf8"), adjPath)
    : [];

  const baselinePath = join(repoRoot, registry.root, "SUBJECT-SWEEP-BASELINE.json");
  let baseline: Baseline | null = null;
  if (argv.includes("--write-baseline")) {
    const candidates = findCandidates({ blocks, registeredTokens: registeredTokens(registry) });
    const payload = {
      generatedFrom: `${String(files.length)} prose files under ${registry.root}`,
      _readme:
        "Ratchet baseline for the unregistered-person sweep. NOT an allowlist of approved names: it is a snapshot of capitalised tokens present when the sweep was introduced. A candidate not listed here FAILS the audit — that is how a new person entering the prose without a registry row is caught. An entry no longer present in the prose is STALE and must be pruned. `triaged: false` is DEBT and can only go down.",
      entries: candidates.map((c) => ({ token: c.token, triaged: false })),
    };
    Bun.write(baselinePath, `${JSON.stringify(payload, null, 2)}\n`);
    process.stdout.write(
      `wrote ${baselinePath} with ${String(candidates.length)} untriaged entries\n`,
    );
    return 0;
  }
  if (existsSync(baselinePath)) {
    baseline = parseBaseline(readFileSync(baselinePath, "utf8"), baselinePath);
  }

  const overlayFile = overlayPath();
  const loaded = loadOverlay(overlayFile);

  const scope =
    leakScopeArg === "book" ? [registry.root] : leakScopeArg === "repo" ? ["."] : [leakScopeArg];

  const result = runAudit({
    registry,
    blocks,
    filesScanned: files.length,
    occurrences,
    adjudications,
    baseline,
    withheldNames: (s) => withheldNamesFor(s, loaded.overlay),
    leakScan: gitGrepLeakScan(repoRoot, scope),
    leakScope: scope.join(" "),
  });

  process.stdout.write(`${formatReport(result, loaded.reason)}\n`);
  const code = exitCodeFor(result, allowUnchecked);
  if (code === 2) {
    process.stdout.write(
      "\nEXIT 2 — a check could not run. This is NOT a pass. Supply the overlay (or pass --allow-unchecked to block on the checks that CAN run).\n",
    );
  }
  return code;
}

if (import.meta.main) {
  process.exitCode = main(process.argv.slice(2));
}
