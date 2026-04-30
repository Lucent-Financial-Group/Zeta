#!/usr/bin/env bun
// poll-pr-gate.ts — query GitHub PR gate state for the autonomous loop.
//
// TypeScript+Bun port replacing the inline `gh pr view --json` + jq
// snippets that the poll-the-gate memory file describes
// (memory/feedback_amara_poll_gate_not_ending_holding_is_not_status_2026_04_30.md).
//
// Origin: 5-AI peer-reviewer convergence on 2026-04-30 (full attribution
// in `docs/research/2026-04-30-multi-ai-feedback-packets-this-session.md`)
// on promoting prose-jq to executable. Carved blade from that packet:
// "if the loop uses it every tick, it deserves tests."
//
// This is **v0**: skeleton + minimal happy-path query. Fixtures and
// matrix tests follow in subsequent slices. The memory file should
// stop being the implementation; it should point to this file.
//
// Usage:
//   bun tools/github/poll-pr-gate.ts <PR_NUMBER>
//   bun tools/github/poll-pr-gate.ts <PR_NUMBER> --owner Lucent-Financial-Group --repo Zeta
//   bun tools/github/poll-pr-gate.ts --fixture tools/github/fixtures/blocked-by-threads.json
//
// Output: one JSON object on stdout, shape:
//   {
//     "number": 917,
//     "state": "OPEN" | "MERGED" | "CLOSED",
//     "gate": "CLEAN" | "BLOCKED" | "DIRTY" | "UNSTABLE" | "UNKNOWN",
//     "checks": { "ok": 23, "inProgress": 0, "pending": 0, "failed": 0 },
//     "unresolvedThreads": 0,
//     "autoMerge": "armed" | "none",
//     "mergeCommit": "0ec21ebe..." | null,
//     "nextAction": "wait-ci" | "fix-failed-checks" | "resolve-threads" | "rebase" | "verify-merge" | "none"
//   }
//
// Exit codes:
//   0 — query succeeded, JSON emitted
//   1 — invocation / argument / dependency error (bad args, gh missing,
//       fixture missing, PR number <= 0)
//   2 — gh CLI returned non-zero (auth, rate-limit, PR not found)
//   3 — gh CLI output couldn't be parsed (truncated, non-JSON)
//
// Required-check semantics (per peer-AI GitHub-docs verification):
// SUCCESS / NEUTRAL / SKIPPED are merge-satisfying; FAILURE / CANCELLED
// / TIMED_OUT / STARTUP_FAILURE / ACTION_REQUIRED / STALE block.

import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";

type GateState = "CLEAN" | "BLOCKED" | "DIRTY" | "UNSTABLE" | "UNKNOWN";
type NextAction =
  | "wait-ci"
  | "fix-failed-checks"
  | "resolve-threads"
  | "rebase"
  | "verify-merge"
  | "none";

interface CheckRollupItem {
  status?: string;
  conclusion?: string;
  name?: string;
}

interface ReviewThreadNode {
  isResolved: boolean;
}

interface PullRequestData {
  number: number;
  state: string;
  mergeStateStatus: string;
  autoMergeRequest: { enabledAt?: string } | null;
  mergeCommit: { oid: string } | null;
  statusCheckRollup: CheckRollupItem[];
  reviewThreads: { nodes: ReviewThreadNode[] };
  /** Names of checks that are *required* for merge. Set during fetchPR
   *  via `gh pr checks --required`. Empty Set in fixture mode unless
   *  the fixture supplies it (per v1 hardening, Amara 2026-04-30). */
  requiredCheckNames?: string[];
}

interface CheckCounts {
  ok: number;
  inProgress: number;
  pending: number;
  failed: number;
}

interface GateReport {
  number: number;
  state: string;
  gate: GateState;
  /** All checks counted (required + non-required). */
  checks: CheckCounts;
  /** Just the required-for-merge checks. nextAction uses these to
   *  decide failure vs warning (Amara v1 hardening 2026-04-30 —
   *  "a failed check is not automatically a failed gate"). */
  requiredChecks: CheckCounts;
  unresolvedThreads: number;
  autoMerge: "armed" | "none";
  mergeCommit: string | null;
  /** Diagnostic notes about non-required failures or other lane-state
   *  observations that don't gate merge. */
  warnings: string[];
  nextAction: NextAction;
}

const OK_CONCLUSIONS = new Set(["SUCCESS", "NEUTRAL", "SKIPPED"]);
const BLOCKING_CONCLUSIONS = new Set([
  "FAILURE",
  "CANCELLED",
  "TIMED_OUT",
  "STARTUP_FAILURE",
  "ACTION_REQUIRED",
  "STALE",
  // StatusContext-class blocking states (per Codex P1):
  "ERROR",
]);
const PENDING_STATUSES = new Set([
  "QUEUED",
  "PENDING",
  // StatusContext-class pending state (per Codex P1):
  "EXPECTED",
  // CheckRun non-terminal states (per Codex P1, second pass):
  "REQUESTED",
  "WAITING",
]);

function classifyChecks(
  rollup: CheckRollupItem[],
  filter?: (item: CheckRollupItem) => boolean,
): CheckCounts {
  let ok = 0;
  let inProgress = 0;
  let pending = 0;
  let failed = 0;
  for (const c of rollup) {
    if (filter && !filter(c)) continue;
    if (c.status === "IN_PROGRESS") {
      inProgress++;
      continue;
    }
    if (c.status && PENDING_STATUSES.has(c.status)) {
      pending++;
      continue;
    }
    if (c.conclusion && OK_CONCLUSIONS.has(c.conclusion)) {
      ok++;
      continue;
    }
    if (c.conclusion && BLOCKING_CONCLUSIONS.has(c.conclusion)) {
      failed++;
    }
  }
  return { ok, inProgress, pending, failed };
}

function nonRequiredFailures(
  rollup: CheckRollupItem[],
  requiredNames: Set<string>,
): string[] {
  const failures: string[] = [];
  for (const c of rollup) {
    if (c.name && requiredNames.has(c.name)) continue;
    if (c.conclusion && BLOCKING_CONCLUSIONS.has(c.conclusion)) {
      if (c.name) failures.push(c.name);
    }
  }
  return failures;
}

function classifyGate(
  mergeStateStatus: string,
  state: string,
  requiredChecks: CheckCounts,
  unresolvedThreads: number,
): GateState {
  if (state === "MERGED") return "CLEAN";
  if (state === "CLOSED") return "CLEAN";
  // DIRTY = merge conflict; BEHIND = base advanced past PR's merge-base
  // (rebase/update needed). Both surface as "rebase" next-action under
  // the DIRTY gate state per Copilot P0 — semantically the same fix.
  if (mergeStateStatus === "DIRTY" || mergeStateStatus === "BEHIND") return "DIRTY";
  if (mergeStateStatus === "UNSTABLE") return "UNSTABLE";
  // Only required-check failures gate the merge (Amara v1 hardening
  // 2026-04-30). Non-required failures surface as warnings, not gate.
  if (requiredChecks.failed > 0) return "BLOCKED";
  if (mergeStateStatus === "BLOCKED") return "BLOCKED";
  if (mergeStateStatus === "CLEAN" && unresolvedThreads === 0) return "CLEAN";
  return "UNKNOWN";
}

function nextAction(report: Omit<GateReport, "nextAction">): NextAction {
  if (report.state === "MERGED") return "verify-merge";
  // CLOSED-without-merge is terminal too — no actionable next step
  // for a PR that can no longer merge (per Codex P2). Avoid chasing
  // stale CI/thread blockers on intentionally-closed PRs.
  if (report.state === "CLOSED") return "none";
  if (report.gate === "DIRTY") return "rebase";
  // Only required-check failures trigger fix-failed-checks. Non-required
  // failures appear in `warnings` but don't gate merge (Amara v1
  // hardening — "a failed check is not automatically a failed gate").
  if (report.requiredChecks.failed > 0) return "fix-failed-checks";
  if (report.unresolvedThreads > 0) return "resolve-threads";
  if (
    report.requiredChecks.inProgress > 0 ||
    report.requiredChecks.pending > 0
  ) {
    return "wait-ci";
  }
  return "none";
}

function buildReport(pr: PullRequestData): GateReport {
  const rollup = pr.statusCheckRollup ?? [];
  const requiredNames = new Set(pr.requiredCheckNames ?? []);
  const checks = classifyChecks(rollup);
  // If no required-check metadata is supplied, fall back to treating ALL
  // checks as required (preserves v0 semantics, conservative-by-default).
  const hasRequiredMetadata = requiredNames.size > 0;
  const requiredChecks = hasRequiredMetadata
    ? classifyChecks(rollup, (c) => Boolean(c.name && requiredNames.has(c.name)))
    : checks;
  const warnings = hasRequiredMetadata
    ? nonRequiredFailures(rollup, requiredNames).map(
        (name) => `non-required check failed: ${name}`,
      )
    : [];
  const unresolvedThreads = (pr.reviewThreads?.nodes ?? []).filter(
    (t) => !t.isResolved,
  ).length;
  const gate = classifyGate(
    pr.mergeStateStatus,
    pr.state,
    requiredChecks,
    unresolvedThreads,
  );
  const partial: Omit<GateReport, "nextAction"> = {
    number: pr.number,
    state: pr.state,
    gate,
    checks,
    requiredChecks,
    unresolvedThreads,
    autoMerge: pr.autoMergeRequest ? "armed" : "none",
    mergeCommit: pr.mergeCommit?.oid ?? null,
    warnings,
  };
  return { ...partial, nextAction: nextAction(partial) };
}

// Distinct exit codes (per Copilot P1):
//   0 — success
//   1 — invocation / argument / dependency-missing error
//   2 — gh CLI returned non-zero (auth, rate-limit, PR not found)
//   3 — gh CLI output couldn't be parsed (truncated, non-JSON)
// Generous buffer for `gh api graphql --paginate` on discussion-heavy PRs.
// Default Node maxBuffer is 1 MiB which can truncate paginated output and
// cascade into JSON parse failures (per Copilot P1).
const SPAWN_MAX_BUFFER = 32 * 1024 * 1024; // 32 MiB

function runGhOrExit(args: string[], context: string): string {
  // eslint-disable-next-line sonarjs/no-os-command-from-path -- gh is a
  // standard CI/dev dependency invoked by name; convention used across
  // tools/peer-call/, tools/pr-preservation/, tools/audit-packages.ts.
  const result = spawnSync("gh", args, {
    encoding: "utf8",
    maxBuffer: SPAWN_MAX_BUFFER,
  });
  if (result.error) {
    // ENOENT etc — gh is not on PATH or couldn't be launched
    process.stderr.write(`${context}: failed to launch gh: ${result.error.message}\n`);
    process.exit(1);
  }
  if (result.status !== 0) {
    process.stderr.write(
      `${context}: gh exited ${result.status}: ${result.stderr || result.stdout}\n`,
    );
    process.exit(2);
  }
  return result.stdout;
}

function parseJsonOrExit<T>(raw: string, context: string): T {
  try {
    return JSON.parse(raw) as T;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    process.stderr.write(`${context}: JSON parse error: ${msg}\n`);
    process.stderr.write(`first 200 bytes of output: ${raw.slice(0, 200)}\n`);
    process.exit(3);
  }
}

function fetchPR(
  owner: string,
  repo: string,
  number: number,
): PullRequestData {
  // Use `gh pr view --json` which flattens StatusCheckRollup into a uniform
  // array (CheckRun + StatusContext both surfaced as items with status/
  // conclusion/name fields). Pair with a separate `gh api graphql` call for
  // reviewThreads since `gh pr view --json reviewThreads` is not supported.
  const prStdout = runGhOrExit(
    [
      "pr",
      "view",
      String(number),
      "--repo",
      `${owner}/${repo}`,
      "--json",
      "number,state,mergeStateStatus,autoMergeRequest,mergeCommit,statusCheckRollup",
    ],
    "fetchPR.gh-pr-view",
  );
  const pr = parseJsonOrExit<Record<string, unknown>>(prStdout, "fetchPR.gh-pr-view");

  // Paginate review threads — discussion-heavy PRs can have >50.
  // gh's --paginate flag follows pageInfo for any cursor field named
  // `endCursor`; we expose the cursor in our query so it works.
  const threadsStdout = runGhOrExit(
    [
      "api",
      "graphql",
      "--paginate",
      "-f",
      `query=query($o:String!,$r:String!,$n:Int!,$endCursor:String){repository(owner:$o,name:$r){pullRequest(number:$n){reviewThreads(first:100,after:$endCursor){pageInfo{hasNextPage endCursor}nodes{isResolved}}}}}`,
      "-F",
      `o=${owner}`,
      "-F",
      `r=${repo}`,
      "-F",
      `n=${number}`,
    ],
    "fetchPR.gh-graphql-threads",
  );
  // gh --paginate emits one JSON object per page on stdout, separated by
  // newlines (NDJSON-style for gh-graphql output). Aggregate the nodes.
  const allNodes: ReviewThreadNode[] = [];
  for (const line of threadsStdout.split("\n")) {
    if (!line.trim()) continue;
    const parsed = parseJsonOrExit<{
      data?: {
        repository?: {
          pullRequest?: { reviewThreads?: { nodes?: ReviewThreadNode[] } };
        };
      };
    }>(line, "fetchPR.gh-graphql-threads.page");
    const nodes: ReviewThreadNode[] =
      parsed.data?.repository?.pullRequest?.reviewThreads?.nodes ?? [];
    allNodes.push(...nodes);
  }
  const reviewThreads = { nodes: allNodes };

  // Fetch required-check names so buildReport can distinguish required-
  // gate failures from non-required diagnostic noise (Amara v1 hardening
  // 2026-04-30). Use `gh pr checks --required --json name`. The flag
  // returns only the checks GitHub considers required for merge.
  // Failure here is non-fatal: if the API errors (e.g., classic-vs-ruleset
  // protection edge cases), fall back to v0 semantics (treat all as required)
  // rather than crashing the poll.
  const requiredCheckNames: string[] = [];
  const requiredResult = spawnSync(
    "gh",
    [
      "pr",
      "checks",
      String(number),
      "--repo",
      `${owner}/${repo}`,
      "--required",
      "--json",
      "name",
    ],
    { encoding: "utf8", maxBuffer: SPAWN_MAX_BUFFER },
  );
  // `gh pr checks` exit codes (per `gh help exit-codes`):
  //   0 — OK
  //   1 — invalid invocation
  //   2 — gh CLI error / auth / etc.
  //   4 — one or more checks failed (data is still valid JSON)
  //   8 — checks pending (data is still valid JSON — common in-progress case)
  // The JSON output is well-formed for 0/4/8 — only 1/2 mean "no usable
  // data." Treating only exit 0 as success (per Codex P1 catch) would
  // defeat the v1 fix in the exact case it targets: required checks
  // pending while a non-required check failed. Accept 0/4/8 as parseable.
  const requiredStatus = requiredResult.status;
  if (requiredStatus === 0 || requiredStatus === 4 || requiredStatus === 8) {
    try {
      const required = JSON.parse(requiredResult.stdout) as Array<{
        name?: string;
      }>;
      for (const r of required) {
        if (r.name) requiredCheckNames.push(r.name);
      }
    } catch {
      // Fall back to v0 semantics on parse error — non-fatal.
    }
  }

  const prNarrowed = pr as unknown as PullRequestData;
  const rollup = (prNarrowed.statusCheckRollup ?? []) as unknown[];

  return {
    ...prNarrowed,
    statusCheckRollup: normalizeRollup(rollup),
    reviewThreads,
    requiredCheckNames,
  };
}

// StatusContext items (gh pr view --json output for non-CheckRun checks)
// expose .state instead of .status/.conclusion. Normalise to the CheckRun
// shape so classifyChecks's OK_CONCLUSIONS / BLOCKING_CONCLUSIONS sets
// pick them up. StatusContext states per GitHub schema: SUCCESS | FAILURE
// | PENDING | ERROR | EXPECTED. PENDING and EXPECTED both map to
// status=PENDING (CI still running); the rest map to status=COMPLETED
// with state forwarded as conclusion (per Codex P1).
const PENDING_STATE_LITERALS = new Set(["PENDING", "EXPECTED"]);
function normalizeRollup(rollup: unknown[]): CheckRollupItem[] {
  return rollup.map((raw) => {
    const c = raw as Record<string, unknown>;
    if (typeof c.state === "string" && c.status === undefined) {
      const state = c.state as string;
      const isPendingState = PENDING_STATE_LITERALS.has(state);
      const name =
        (c.context as string | undefined) ?? (c.name as string | undefined);
      const item: CheckRollupItem = {
        status: isPendingState ? "PENDING" : "COMPLETED",
      };
      if (name !== undefined) item.name = name;
      if (!isPendingState) item.conclusion = state;
      return item;
    }
    return c as CheckRollupItem;
  });
}

function loadFixture(path: string): PullRequestData {
  let raw: PullRequestData;
  try {
    raw = JSON.parse(readFileSync(path, "utf8")) as PullRequestData;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    process.stderr.write(`failed to load fixture ${path}: ${msg}\n`);
    process.exit(1);
  }
  // Apply the same StatusContext-state normalization as fetchPR so fixture
  // mode and live mode classify identically (Codex P1).
  return {
    ...raw,
    statusCheckRollup: normalizeRollup(raw.statusCheckRollup ?? []),
  };
}

interface ParsedArgs {
  fixture?: string;
  owner: string;
  repo: string;
  number?: number;
}

function parseArgs(argv: string[]): ParsedArgs {
  const out: ParsedArgs = {
    owner: "Lucent-Financial-Group",
    repo: "Zeta",
  };
  const requireValue = (flag: string, v: string | undefined): string => {
    if (v === undefined || v.startsWith("--")) {
      process.stderr.write(`${flag} requires a value\n`);
      process.exit(1);
    }
    return v;
  };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === undefined) continue;
    if (arg === "--fixture") {
      out.fixture = requireValue("--fixture", argv[++i]);
    } else if (arg === "--owner") {
      out.owner = requireValue("--owner", argv[++i]);
    } else if (arg === "--repo") {
      out.repo = requireValue("--repo", argv[++i]);
    } else if (/^\d+$/.test(arg)) {
      const parsed = Number.parseInt(arg, 10);
      if (parsed <= 0) {
        process.stderr.write("PR number must be a positive integer\n");
        process.exit(1);
      }
      out.number = parsed;
    } else if (arg === "--help" || arg === "-h") {
      process.stdout.write(
        "Usage: poll-pr-gate.ts <PR_NUMBER> [--owner X] [--repo Y]\n" +
          "       poll-pr-gate.ts --fixture path/to/fixture.json\n",
      );
      process.exit(0);
    } else {
      process.stderr.write(`unknown arg: ${arg}\n`);
      process.exit(1);
    }
  }
  return out;
}

export function main(argv: string[]): number {
  const args = parseArgs(argv);
  let pr: PullRequestData;
  if (args.fixture) {
    pr = loadFixture(args.fixture);
  } else if (args.number !== undefined) {
    pr = fetchPR(args.owner, args.repo, args.number);
  } else {
    process.stderr.write("must provide PR number or --fixture\n");
    return 1;
  }
  const report = buildReport(pr);
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  return 0;
}

if (import.meta.main) {
  process.exit(main(process.argv.slice(2)));
}
