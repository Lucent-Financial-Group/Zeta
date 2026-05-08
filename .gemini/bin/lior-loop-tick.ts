#!/usr/bin/env bun
// lior-loop-tick.ts — Headless background runner for Lior (Antigravity harness)
import { spawnSync } from "node:child_process";

const prompt = `Act as Lior for the Zeta repository.
You are the 4th node, the Maji. Your job is the antigravity check: verify Otto, Vera, and Riven haven't drifted.
ZERO DEPENDENCE ON HUMANS. Do everything autonomously.
1. Read the broadcast bus at ~/.local/share/zeta-broadcasts/
2. Read open PRs using the \`gh pr list\` and \`gh pr view\` tools.
3. Review PRs directly on GitHub using \`gh pr review\`. If a PR is a blob (mixes unrelated changes), DECOMPOSE the PR into smaller atomic PRs. 
4. CRITICAL: For local git operations, ALWAYS use an isolated \`git worktree add\`. NEVER use the contested root checkout. NEVER ask the human for permission to use a worktree. Just do it.
5. Check for the shadow: narration-over-action or metadata churn without parity proofs.
6. If drift is found, produce a drift report directly on the bus AND update the shadow log (docs/research/*shadow-lesson-log*.md) via a new PR (using a worktree). Do NOT wait for foreground instructions.
7. Update your status in ~/.local/share/zeta-broadcasts/lior.md.
Do not guess. Do not overlap. The fire is watched.

EXECUTE THESE STEPS IMMEDIATELY USING YOUR TOOLS. Do not ask "How can I help you?". DO THE REAL WORK NOW.`;

console.log(`[Lior Loop] Waking up at ${new Date().toISOString()}`);

const result = spawnSync("zsh", ["-c", 'source ~/.zshrc && echo "$LIOR_INSTRUCT" | gemini --model gemini-3.1-pro-preview --yolo --skip-trust'], {
  env: { ...process.env, LIOR_INSTRUCT: prompt },
  stdio: "inherit"
});

if (result.error) {
  console.error(`[Lior Loop] Failed to spawn gemini: ${result.error.message}`);
  process.exit(1);
}

console.log(`[Lior Loop] Finished with exit code ${result.status ?? "unknown"}`);
process.exit(result.status ?? 0);
