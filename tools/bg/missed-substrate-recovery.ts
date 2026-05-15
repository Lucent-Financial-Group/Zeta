#!/usr/bin/env bun
/**
 * tools/bg/missed-substrate-recovery.ts
 *
 * Core function for opening a recovery PR when missed-substrate-detector
 * surfaces a cascade gap. Pure-function-with-adapters shape: all I/O
 * (git, gh) is injected so the function is unit-testable without touching
 * the filesystem or making real GitHub calls.
 *
 * Per B-0503 (slice 5a of B-0442); wiring into pollOnce + real adapter
 * implementations are scope for B-0504.
 */

import type { CascadeFinding } from "./missed-substrate-detector";

export type RecoveryAdapters = {
  /** Returns true if an open recovery PR already exists for this branch. */
  checkRecoveryPRExists: (branchName: string) => boolean;
  /** `git checkout -b <branch> <base>`; true on success. */
  gitCreateBranch: (branch: string, base: string) => boolean;
  /** `git cherry-pick <sha>`; distinguishes merge conflict from other errors. */
  gitCherryPick: (sha: string) => "ok" | "conflict" | "error";
  /** `git push origin <branch>`; true on success. */
  gitPush: (branch: string) => boolean;
  /** `gh pr create --title ... --body ... --head ... --base main`; PR URL or null. */
  ghPrCreate: (title: string, body: string, head: string) => string | null;
};

export type RecoveryResult =
  | { status: "opened"; prUrl: string; cherryPickedCount: number }
  | { status: "already-exists"; reason: string }
  | { status: "cherry-pick-conflict"; sha: string; attemptedCount: number }
  | { status: "error"; reason: string };

/**
 * Deterministic recovery-branch name: `recovery/<prNumber>`.
 * Pure function; no I/O. Determinism is load-bearing: the idempotency gate
 * `checkRecoveryPRExists(recoveryBranch)` only catches duplicate recovery
 * attempts if the branch name is stable across invocations for the same
 * `prNumber`. The earlier `recovery/<prNumber>-<timestamp>` form defeated
 * the gate (every invocation produced a fresh branch name; the gate never
 * fired). See PR #3433 Copilot P0 catch.
 *
 * The `ts` parameter is retained for backward compatibility with callers
 * passing a Date; it is now unused. Tests should pass any Date (even
 * `new Date(0)`); the output depends only on `prNumber`.
 */
export function buildRecoveryBranchName(prNumber: number, _ts: Date): string {
  return `recovery/${prNumber}`;
}

/**
 * Markdown body for the recovery PR. Lists `missingCommits`, references the
 * original `prNumber`, surfaces the detector's urgency, and notes that the
 * PR was auto-generated.
 */
/**
 * Escape markdown-control characters in a string that will appear inside
 * a backtick-wrapped span. Currently scrubs backticks (which would close
 * the span prematurely and leak content into prose). A branch name is
 * expected to be ASCII alphanumeric plus `/-_.`; anything else is sanitised
 * to `_` defensively.
 */
function sanitizeForInlineCode(s: string): string {
  return s.replaceAll("`", "_");
}

export function buildRecoveryPRBody(finding: CascadeFinding): string {
  const commitList = finding.missingCommits.map((s) => `- ${s}`).join("\n");
  const safeBranchName = sanitizeForInlineCode(finding.branchName);
  return [
    `## Auto-generated recovery PR`,
    ``,
    `Original merged PR: **#${finding.prNumber}** (branch \`${safeBranchName}\`)`,
    ``,
    `Missing commits detected by \`missed-substrate-detector\`:`,
    commitList,
    ``,
    `Urgency at detection time: **${finding.urgency}**`,
    ``,
    `> This PR was opened automatically. Review before merging.`,
  ].join("\n");
}

/**
 * Core recovery workflow. Composed with `adapters` so all I/O is injectable.
 * Steps:
 *   1. Check for existing open recovery PR; if yes, return `already-exists`.
 *   2. If `dryRun`, return `opened` with `prUrl="dry-run"` and no mutations.
 *   3. `git checkout -b <recoveryBranch> origin/main`.
 *   4. For each commit in `finding.missingCommits`: cherry-pick. On conflict
 *      return `cherry-pick-conflict` immediately (no push).
 *   5. `git push origin <recoveryBranch>`.
 *   6. `gh pr create --title ... --body ... --head ... --base main`.
 *
 * The branch name is deterministic from `finding.prNumber` alone
 * (`recovery/<prNumber>`); the idempotency gate (`checkRecoveryPRExists`)
 * is the load-bearing uniqueness mechanism — duplicate recovery attempts
 * for the same PR resolve to `already-exists` and perform no mutations.
 * `new Date()` is no longer needed here; the date argument to
 * `buildRecoveryBranchName` is retained for caller back-compat but unused.
 */
export function openRecoveryPR(
  finding: CascadeFinding,
  dryRun: boolean,
  adapters: RecoveryAdapters,
): RecoveryResult {
  const recoveryBranch = buildRecoveryBranchName(finding.prNumber, new Date());

  if (adapters.checkRecoveryPRExists(recoveryBranch)) {
    return { status: "already-exists", reason: `PR for ${recoveryBranch} already open` };
  }

  if (dryRun) {
    return { status: "opened", prUrl: "dry-run", cherryPickedCount: 0 };
  }

  if (!adapters.gitCreateBranch(recoveryBranch, "origin/main")) {
    return { status: "error", reason: `git checkout -b ${recoveryBranch} origin/main failed` };
  }

  let attemptedCount = 0;
  for (const sha of finding.missingCommits) {
    const cpResult = adapters.gitCherryPick(sha);
    attemptedCount++;
    if (cpResult === "conflict") {
      return { status: "cherry-pick-conflict", sha, attemptedCount };
    }
    if (cpResult === "error") {
      return { status: "error", reason: `git cherry-pick ${sha} failed` };
    }
  }

  if (!adapters.gitPush(recoveryBranch)) {
    return { status: "error", reason: `git push origin ${recoveryBranch} failed` };
  }

  const title = `recovery(#${finding.prNumber}): ${finding.missingCommits.length} missed commits`;
  const body = buildRecoveryPRBody(finding);
  const prUrl = adapters.ghPrCreate(title, body, recoveryBranch);
  if (prUrl === null) {
    return { status: "error", reason: "gh pr create failed" };
  }

  return { status: "opened", prUrl, cherryPickedCount: attemptedCount };
}
