#!/usr/bin/env bun
// lior-loop-tick.ts — Headless background runner for Lior (Antigravity harness)
import { spawnSync } from "node:child_process";
import { statSync, unlinkSync, existsSync } from "node:fs";
import { join } from "node:path";

const prompt = `Act as Lior for the Zeta repository.
You are the 4th node, the Maji. Your job is the antigravity check: verify Otto, Vera, and Riven haven't drifted.
ZERO DEPENDENCE ON HUMANS. Do everything autonomously.
1. RESOLVE PRIOR WORK FIRST: Before generating new PRs or doing new work, search for unresolved or incomplete open PRs authored by you (Lior / Gemini). Prioritize resolving them: check out their branches in isolated worktrees, merge origin/main, resolve conflicts, fix lints, and push. If a PR has failed CI or has open comments, address them. If it is superseded or no longer needed, close it cleanly.
2. WORKTREE & LOCK CLEANUP: Clean up stale git worktrees by running \`git worktree prune\`. Audit locked worktrees and report/release them if their processes are dead.
3. Read the broadcast bus at ~/.local/share/zeta-broadcasts/
4. Read open PRs using the \`gh pr list\` and \`gh pr view\` tools.
5. Review PRs directly on GitHub using \`gh pr review\`. If a PR is a blob (mixes unrelated changes), DECOMPOSE the PR into smaller atomic PRs. 
6. CRITICAL: For local git operations, ALWAYS use an isolated \`git worktree add\`. NEVER use the contested root checkout. NEVER ask the human for permission to use a worktree. Just do it.
7. Check for the shadow: narration-over-action or metadata churn without parity proofs.
8. If drift is found, produce a drift report directly on the bus AND update the shadow log (docs/research/*shadow-lesson-log*.md) via a new PR (using a worktree). Do NOT wait for foreground instructions.
9. Update your status in ~/.local/share/zeta-broadcasts/lior.md.
10. Read-only health check: report on stale git index locks or orphan agent lockfiles, but DO NOT delete plugin directories to avoid crashing active agents.
11. PRESERVATION DISCIPLINE: For any recently merged PRs, automatically run \`bun run tools/pr-preservation/archive-pr.ts <PR_NUMBER>\`. Commit and push the resulting markdown file to \`docs/pr-discussions/\` to permanently capture alignment drift and review friction into the native repository memory.
12. BACKLOG DECOMPOSITION: If you pick up a backlog item and it is a blob that needs decomposition, peel one layer off to work on and put the rest back on the backlog. Decomposition does not have to be complete in one go—it will get iteratively decomposed on future ticks.
Do not guess. Do not overlap. The fire is watched.

EXECUTE THESE STEPS IMMEDIATELY USING YOUR TOOLS. Do not ask "How can I help you?". DO THE REAL WORK NOW.`;

console.log(`[Lior Loop] Waking up at ${new Date().toISOString()}`);

// Programmatically check and remove stale git lock file to prevent permanent bricking.
const lockPath = join(__dirname, "../../.git/index.lock");
if (existsSync(lockPath)) {
  try {
    const stats = statSync(lockPath);
    const ageMs = Date.now() - stats.mtime.getTime();
    if (ageMs > 5 * 60 * 1000) {
      console.log(`[Lior Loop] Found stale git index lock (${(ageMs / 1000).toFixed(0)}s old). Removing lock.`);
      unlinkSync(lockPath);
    } else {
      console.log(`[Lior Loop] Git index lock is active (${(ageMs / 1000).toFixed(0)}s old). Leaving it.`);
    }
  } catch (e) {
    console.error(`[Lior Loop] Error checking/removing git index lock: ${e}`);
  }
}

// Programmatically prune stale git worktrees
try {
  console.log(`[Lior Loop] Pruning stale git worktrees...`);
  spawnSync("git", ["worktree", "prune"], { stdio: "inherit" });
} catch (e) {
  console.error(`[Lior Loop] Failed to prune worktrees: ${e}`);
}

// Pipe stderr so we can inspect it for 429 patterns; stdout/stdin stay inherited.
// maxBuffer: 10 MiB — Gemini verbose crash output can exceed the 1 MiB default,
// which would cause ENOBUFS and a hard failure even for transient errors.
const result = spawnSync("zsh", ["-c", 'source ~/.zshrc && gemini -p "$GEMINI_PROMPT" --model gemini-3.1-pro-preview --yolo --skip-trust'], {
  env: { ...process.env, GEMINI_PROMPT: prompt },
  stdio: ["inherit", "inherit", "pipe"],
  maxBuffer: 10 * 1024 * 1024,
});

if (result.error) {
  // Spawn-level failure (binary not found, permission denied, etc.) — propagate so
  // launchd can surface the misconfiguration; this is NOT a transient rate-limit.
  console.error(`[Lior Loop] Failed to spawn gemini: ${result.error.message}`);
  process.exit(1);
}

// status is null when the process was killed by a signal; treat that as an error.
const exitCode = result.status ?? 1;
const stderr = result.stderr?.toString() ?? "";

// Forward captured stderr to the launchd journal so errors remain visible.
if (stderr) process.stderr.write(stderr);

// Only suppress non-zero exits caused by 429 rate-limit responses so launchd doesn't park the
// service on transient quota exhaustion. All other failures propagate so supervisors and
// diagnostics retain a machine-readable failure signal.
const is429 = /429|RESOURCE_EXHAUSTED|quota exceeded/i.test(stderr);
if (exitCode !== 0 && is429) {
  console.error(`[Lior Loop] Rate-limited (429); exiting 0 to prevent launchd throttling`);
  process.exit(0);
}

console.log(`[Lior Loop] Finished with exit code ${exitCode}`);
process.exit(exitCode);
