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
//   bun tools/github/poll-pr-gate.ts --fixture tools/github/fixtures/blocked-with-threads.json
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
//     "nextAction": "wait-ci" | "resolve-threads" | "rebase" | "verify-merge" | "none"
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
]);
const PENDING_STATUSES = new Set(["QUEUED", "PENDING"]);

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
  if (mergeStateStatus === "DIRTY") return "DIRTY";
  if (mergeStateStatus === "UNSTABLE") return "UNSTABLE";
  if (checks.failed > 0) return "BLOCKED";
  if (mergeStateStatus === "BLOCKED") return "BLOCKED";
  if (mergeStateStatus === "CLEAN" && unresolvedThreads === 0) return "CLEAN";
  return "UNKNOWN";
}

function nextAction(report: Omit<GateReport, "nextAction">): NextAction {
  if (report.state === "MERGED") return "verify-merge";
  if (report.gate === "DIRTY") return "rebase";
  if (report.checks.failed > 0) return "resolve-threads";
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

function fetchPR(
  owner: string,
  repo: string,
  number: number,
): PullRequestData {
  // Use `gh pr view --json` which flattens StatusCheckRollup into a uniform
  // array (CheckRun + StatusContext both surfaced as items with status/
  // conclusion/name fields). Pair with a separate `gh api graphql` call for
  // reviewThreads since `gh pr view --json reviewThreads` is not supported.
  const prResult = spawnSync(
    "gh",
    [
      "pr",
      "view",
      String(number),
      "--repo",
      `${owner}/${repo}`,
      "--json",
      "number,state,mergeStateStatus,autoMergeRequest,mergeCommit,statusCheckRollup",
    ],
    { encoding: "utf8" },
  );
  if (prResult.status !== 0) {
    process.stderr.write(`gh pr view failed: ${prResult.stderr}\n`);
    process.exit(2);
  }
  const pr = JSON.parse(prResult.stdout);

  const threadsResult = spawnSync(
    "gh",
    [
      "api",
      "graphql",
      "-f",
      `query=query($o:String!,$r:String!,$n:Int!){repository(owner:$o,name:$r){pullRequest(number:$n){reviewThreads(first:50){nodes{isResolved}}}}}`,
      "-F",
      `o=${owner}`,
      "-F",
      `r=${repo}`,
      "-F",
      `n=${number}`,
    ],
    { encoding: "utf8" },
  );
  if (threadsResult.status !== 0) {
    process.stderr.write(`gh api graphql (threads) failed: ${threadsResult.stderr}\n`);
    process.exit(2);
  }
  const parsed = JSON.parse(threadsResult.stdout);
  const reviewThreads =
    parsed.data?.repository?.pullRequest?.reviewThreads ?? { nodes: [] };

  // gh pr view returns StatusContext items with .state instead of
  // .status/.conclusion; normalise to the CheckRun shape.
  const rollup = (pr.statusCheckRollup ?? []).map(
    (c: Record<string, unknown>) => {
      if (typeof c.state === "string" && c.status === undefined) {
        const state = c.state as string;
        return {
          name: (c.context as string | undefined) ?? (c.name as string | undefined),
          status: state === "PENDING" ? "PENDING" : "COMPLETED",
          conclusion: state === "PENDING" ? undefined : state,
        };
      }
      return c;
    },
  );
  return { ...pr, statusCheckRollup: rollup, reviewThreads };
}

function loadFixture(path: string): PullRequestData {
  return JSON.parse(readFileSync(path, "utf8")) as PullRequestData;
}

function parseArgs(argv: string[]): {
  fixture?: string;
  owner: string;
  repo: string;
  number?: number;
} {
  let fixture: string | undefined;
  let owner = "Lucent-Financial-Group";
  let repo = "Zeta";
  let number: number | undefined;
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--fixture") fixture = argv[++i];
    else if (arg === "--owner") owner = argv[++i];
    else if (arg === "--repo") repo = argv[++i];
    else if (/^\d+$/.test(arg)) number = Number.parseInt(arg, 10);
    else if (arg === "--help" || arg === "-h") {
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
  return { fixture, owner, repo, number };
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
