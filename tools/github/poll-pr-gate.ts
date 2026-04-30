#!/usr/bin/env bun
// poll-pr-gate.ts — query GitHub PR gate state for the autonomous loop.
//
// TypeScript+Bun port replacing the inline `gh pr view --json` + jq
// snippets that the poll-the-gate memory file describes
// (memory/feedback_amara_poll_gate_not_ending_holding_is_not_status_2026_04_30.md).
//
// Origin: 5-AI convergence (Amara 2nd, Deepseek 4th, Alexia 5th, Ani 3rd,
// Gemini 4th — all 2026-04-30) on promoting prose-jq to executable.
// Amara's blade: "if the loop uses it every tick, it deserves tests."
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
//   1 — invocation / dependency error
//   2 — gh CLI returned non-zero
//
// Required-check semantics (per Amara 2nd's GitHub-docs verification):
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
}

interface GateReport {
  number: number;
  state: string;
  gate: GateState;
  checks: {
    ok: number;
    inProgress: number;
    pending: number;
    failed: number;
  };
  unresolvedThreads: number;
  autoMerge: "armed" | "none";
  mergeCommit: string | null;
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
]);

function classifyChecks(rollup: CheckRollupItem[]): GateReport["checks"] {
  let ok = 0;
  let inProgress = 0;
  let pending = 0;
  let failed = 0;
  for (const c of rollup) {
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

function classifyGate(
  mergeStateStatus: string,
  state: string,
  checks: GateReport["checks"],
  unresolvedThreads: number,
): GateState {
  if (state === "MERGED") return "CLEAN";
  if (state === "CLOSED") return "CLEAN";
  // DIRTY = merge conflict; BEHIND = base advanced past PR's merge-base
  // (rebase/update needed). Both surface as "rebase" next-action under
  // the DIRTY gate state per Copilot P0 — semantically the same fix.
  if (mergeStateStatus === "DIRTY" || mergeStateStatus === "BEHIND") return "DIRTY";
  if (mergeStateStatus === "UNSTABLE") return "UNSTABLE";
  if (checks.failed > 0) return "BLOCKED";
  if (mergeStateStatus === "BLOCKED") return "BLOCKED";
  if (mergeStateStatus === "CLEAN" && unresolvedThreads === 0) return "CLEAN";
  return "UNKNOWN";
}

function nextAction(report: Omit<GateReport, "nextAction">): NextAction {
  if (report.state === "MERGED") return "verify-merge";
  if (report.gate === "DIRTY") return "rebase";
  if (report.checks.failed > 0) return "fix-failed-checks";
  if (report.unresolvedThreads > 0) return "resolve-threads";
  if (report.checks.inProgress > 0 || report.checks.pending > 0) {
    return "wait-ci";
  }
  return "none";
}

function buildReport(pr: PullRequestData): GateReport {
  const checks = classifyChecks(pr.statusCheckRollup ?? []);
  const unresolvedThreads = (pr.reviewThreads?.nodes ?? []).filter(
    (t) => !t.isResolved,
  ).length;
  const gate = classifyGate(
    pr.mergeStateStatus,
    pr.state,
    checks,
    unresolvedThreads,
  );
  const partial: Omit<GateReport, "nextAction"> = {
    number: pr.number,
    state: pr.state,
    gate,
    checks,
    unresolvedThreads,
    autoMerge: pr.autoMergeRequest ? "armed" : "none",
    mergeCommit: pr.mergeCommit?.oid ?? null,
  };
  return { ...partial, nextAction: nextAction(partial) };
}

// Distinct exit codes (per Copilot P1):
//   0 — success
//   1 — invocation / argument / dependency-missing error
//   2 — gh CLI returned non-zero (auth, rate-limit, PR not found)
//   3 — gh CLI output couldn't be parsed (truncated, non-JSON)
function runGhOrExit(args: string[], context: string): string {
  const result = spawnSync("gh", args, { encoding: "utf8" });
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
  const prNarrowed = pr as unknown as PullRequestData;
  const rollup = (prNarrowed.statusCheckRollup ?? []) as unknown[];

  return {
    ...prNarrowed,
    statusCheckRollup: normalizeRollup(rollup),
    reviewThreads,
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
  const raw = JSON.parse(readFileSync(path, "utf8")) as PullRequestData;
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
      out.number = Number.parseInt(arg, 10);
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

function main(): void {
  const argv = process.argv.slice(2);
  const args = parseArgs(argv);
  let pr: PullRequestData;
  if (args.fixture) {
    pr = loadFixture(args.fixture);
  } else if (args.number !== undefined) {
    pr = fetchPR(args.owner, args.repo, args.number);
  } else {
    process.stderr.write("must provide PR number or --fixture\n");
    process.exit(1);
  }
  const report = buildReport(pr);
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
}

main();
