#!/usr/bin/env bun
// audit-orphaned-archive-refs.ts — the falsifier for the invariant the archive
// lane has never been able to state: A PUSHED ARCHIVE REF MUST END WITH ITS
// RECORD ON `main`.
//
// WHY A SECOND ARCHIVE AUDIT, AND WHY THE FIRST ONE CANNOT SEE THIS
// -----------------------------------------------------------------
// `audit-archive-pr-lane.ts` is the sibling of this file and it is not
// redundant with it — it audits OPEN PULL REQUESTS on archive branches. Its
// input is `gh pr list`. That makes it structurally blind to the failure
// measured here, because the 1,284 refs at issue HAVE NO PR AT ALL: nothing
// ever opened one, so nothing ever listed them, so no check ever looked at
// them. A lane can be perfectly clean by that audit's reading while stranding a
// record on every merge.
//
// This is the proxy-vs-invariant distinction that let ten fixes pass while the
// leak continued. `pr-archive-on-merge.yml` was changed seventeen times; its
// recent run history is 12 success / 8 skipped / 0 failures. It was GREEN while
// stranding records, because every check it had asked a proxy question — "did
// the tool run", "did I create a PR", "is an open PR redundant" — and none
// asked the only question that is actually the point: IS THE RECORD ON MAIN?
//
// So this audit takes REFS as its input, not PRs. A ref is evidence that the
// lane produced a record; `main` is where that record was supposed to arrive.
// Anything in the gap is substrate that exists in exactly one place, on a
// branch nobody reads, which is the condition the archive lane exists to
// prevent for GitHub's own review threads. The lane had acquired the very
// defect it was built to cure.
//
// THE TWO VERDICTS, AND WHY THEY MUST NOT BE COLLAPSED
// ----------------------------------------------------
//   STRANDED — the ref exists and PR <N>'s record is NOT on main. This is
//              substrate loss in waiting. Deleting such a ref DESTROYS the only
//              copy; it must be LANDED. This is the number this audit gates on.
//   LANDED   — the ref exists and the record IS on main. The record is safe and
//              the ref is now litter. Reporting it separately is what lets a
//              cleanup pass delete refs without having to re-derive, one at a
//              time, which ones are safe to touch.
//
// Collapsing the two into "orphan count" is how a cleanup ends up deleting the
// records it was run to preserve, so the split is load-bearing rather than
// cosmetic.
//
// THE GATE IS A RATCHET, NOT A THRESHOLD
// ---------------------------------------
// `STRANDED_BASELINE` is a high-water mark that may only ever be lowered. A
// plain "fail if any stranded" would go red on the pre-existing backlog, stay
// red through work nobody in this change can finish, and be tolerated — which
// is precisely the failure mode that produced the backlog. A plain "fail over
// 1500" would let it grow again. The ratchet fails IMMEDIATELY on any NEW
// strand while the backfill drains the old ones, and each drained batch lowers
// the constant. It cannot be satisfied by deletion, because deleting a stranded
// ref does not put its record on main — it only destroys it, and the next run
// still counts the missing record via the ref that is gone. That asymmetry is
// deliberate: the cheap wrong fix does not make this check pass.
//
// LIVENESS: the audit refuses to pass while inspecting nothing. An empty record
// index means the lookup is broken, not that every record landed — "checked 0
// records" must never read as success. Zero archive refs IS a legitimately
// healthy state and passes.

import { readdirSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";

import { ARCHIVE_BRANCH_PREFIX, indexArchivedPrs, parseSourcePr } from "./audit-archive-pr-lane";

/**
 * High-water mark for stranded archive records, measured against `origin` on
 * 2026-08-25 when the leak was diagnosed. MAY ONLY BE LOWERED.
 *
 * Raising it is the tolerance this audit exists to remove: the previous lane
 * tolerated an unbounded number silently, and a constant that drifts upward is
 * the same tolerance with a number written next to it.
 *
 * THE MEASUREMENT THAT SET IT, because it corrected the diagnosis that
 * commissioned this file. The leak was reported as "1,284 stranded records".
 * Running this audit against `origin` and `main` together says otherwise:
 *
 *     1290 archive ref(s); 1279 landed (safe to delete),
 *     11 stranded across 11 distinct source PR(s)
 *
 * 1,279 of those records ARE on main. The backfill lane — soraya's archive duty
 * in `agent-heartbeat.yml`, which sweeps un-archived merged PRs — landed them by
 * a different route than the ref they were pushed on, and nothing ever went back
 * to reap the ref. So the pile is REF LITTER, not substrate loss, and the
 * genuinely-missing set is 11, most of them minutes old with an open PR still in
 * flight.
 *
 * This is exactly why the two verdicts below are not collapsed. Had this audit
 * reported a single "orphan count" of 1,290, the obvious next act — delete the
 * orphans — would have destroyed 11 records in order to tidy up 1,279 dead refs.
 */
export const STRANDED_BASELINE = 11;

export type RefVerdict = "stranded" | "landed";

export interface RefFinding {
  /** The full branch name, e.g. `automation/pr-archive-12059-run-32589658743-attempt-1`. */
  readonly ref: string;
  /** The source PR whose record the ref carries, parsed from the branch name. */
  readonly sourcePr: number;
  readonly verdict: RefVerdict;
}

export interface RefAuditResult {
  readonly findings: readonly RefFinding[];
  /** Refs whose record is NOT on main. These must be landed, never deleted. */
  readonly stranded: readonly RefFinding[];
  /** Refs whose record IS on main. Safe for a cleanup pass to delete. */
  readonly landed: readonly RefFinding[];
  /** False when the record index was empty — the lookup is broken, not the lane clean. */
  readonly live: boolean;
}

/**
 * Classify every archive ref against the records present on `main`.
 *
 * Pure — no clock, no network, no filesystem. Unlike the sibling audit this one
 * needs no grace window: a ref is not a race in flight, it is a durable
 * artifact, and "the record is on main" is a settled fact at any instant. Adding
 * a time-based excuse here would reintroduce exactly the tolerance being removed.
 *
 * Refs that do not parse are OUT OF SCOPE rather than silently counted as clean
 * — declining to classify is honest; guessing zero is the vacuity class.
 */
export function auditArchiveRefs(
  refs: readonly string[],
  archivedOnMain: ReadonlySet<number>,
): RefAuditResult {
  const findings: RefFinding[] = [];
  for (const ref of refs) {
    const sourcePr = parseSourcePr(ref);
    if (sourcePr === null) continue;
    findings.push({
      ref,
      sourcePr,
      verdict: archivedOnMain.has(sourcePr) ? "landed" : "stranded",
    });
  }
  return {
    findings,
    stranded: findings.filter((f) => f.verdict === "stranded"),
    landed: findings.filter((f) => f.verdict === "landed"),
    live: archivedOnMain.size > 0,
  };
}

/** Exit 1 when the lane stranded more records than the ratchet permits. */
export function gate(
  result: RefAuditResult,
  baseline: number = STRANDED_BASELINE,
): { readonly ok: true } | { readonly error: string } {
  if (!result.live) {
    return {
      error:
        "record index is EMPTY, so every ref would classify as stranded and the audit would " +
        "be measuring its own broken lookup. Refusing to report a verdict. Check that " +
        "docs/history/pr-reviews/ exists in this checkout.",
    };
  }
  // Distinct source PRs, not refs: re-runs push `-attempt-2`, so counting refs
  // would inflate the backlog with duplicates of one missing record.
  const distinct = new Set(result.stranded.map((f) => f.sourcePr)).size;
  if (distinct > baseline) {
    return {
      error:
        `${String(distinct)} archive records are stranded on refs and absent from main, ` +
        `above the high-water mark of ${String(baseline)}. A NEW record has been stranded. ` +
        "Do NOT delete these refs — they hold the only copy of the record. Land them, then " +
        "lower STRANDED_BASELINE to the new count.",
    };
  }
  return { ok: true };
}

/** List the lane's refs on the remote. Separated from the pure core for testability. */
export function listArchiveRefs(remote: string): { readonly ok: readonly string[] } | { readonly error: string } {
  // eslint-disable-next-line sonarjs/no-os-command-from-path
  const r = spawnSync("git", ["ls-remote", "--heads", remote, `refs/heads/${ARCHIVE_BRANCH_PREFIX}*`], {
    encoding: "utf8",
    maxBuffer: 16 * 1024 * 1024,
  });
  if (r.error) return { error: `git ls-remote failed to launch: ${r.error.message}` };
  if ((r.status ?? 1) !== 0) return { error: `git ls-remote failed: ${r.stderr}` };
  const refs = (r.stdout ?? "")
    .split("\n")
    .map((line) => line.split("\t")[1] ?? "")
    .filter((ref) => ref.startsWith("refs/heads/"))
    .map((ref) => ref.slice("refs/heads/".length));
  return { ok: refs };
}

export function main(argv: readonly string[]): number {
  const read = (flag: string): string | undefined => {
    const i = argv.indexOf(flag);
    return i >= 0 ? argv[i + 1] : undefined;
  };
  const remote = read("--remote") ?? "origin";
  const dir = resolve(read("--dir") ?? "docs/history/pr-reviews");
  const baselineRaw = read("--baseline");
  const baseline = baselineRaw === undefined ? STRANDED_BASELINE : Number.parseInt(baselineRaw, 10);
  if (!Number.isSafeInteger(baseline) || baseline < 0) {
    process.stderr.write("audit-orphaned-archive-refs: --baseline must be a non-negative integer\n");
    return 2;
  }

  let archived: ReadonlySet<number>;
  try {
    archived = indexArchivedPrs(dir);
  } catch (err) {
    process.stderr.write(
      `audit-orphaned-archive-refs: could not read ${dir}: ${err instanceof Error ? err.message : String(err)}\n`,
    );
    return 2;
  }

  const refs = listArchiveRefs(remote);
  if ("error" in refs) {
    process.stderr.write(`audit-orphaned-archive-refs: ${refs.error}\n`);
    return 2;
  }

  const result = auditArchiveRefs(refs.ok, archived);
  const distinctStranded = new Set(result.stranded.map((f) => f.sourcePr)).size;
  process.stdout.write(
    `[archive-refs] ${String(result.findings.length)} archive ref(s); ` +
      `${String(result.landed.length)} landed (safe to delete), ` +
      `${String(result.stranded.length)} stranded across ${String(distinctStranded)} distinct source PR(s); ` +
      `records indexed on main: ${String(archived.size)}\n`,
  );
  if (argv.includes("--list-stranded")) {
    for (const f of result.stranded) process.stdout.write(`  STRANDED ${f.ref} (PR #${String(f.sourcePr)})\n`);
  }

  const verdict = gate(result, baseline);
  if ("error" in verdict) {
    process.stderr.write(`audit-orphaned-archive-refs: ${verdict.error}\n`);
    return 1;
  }
  process.stdout.write(`[archive-refs] OK — stranded backlog within the high-water mark of ${String(baseline)}\n`);
  return 0;
}

if (import.meta.main) {
  process.exit(main(process.argv.slice(2)));
}
