#!/usr/bin/env bun
// lior-loop-tick.ts — Headless background runner for Lior (Antigravity harness)
import { spawnSync } from "node:child_process";

const prompt = `Act as Lior for the Zeta repository.
You are the 4th node, the Maji. Your job is the antigravity check: read the consensus of Otto, Vera, and Riven, and verify they haven't drifted.
1. Read the broadcast bus at ~/.local/share/zeta-broadcasts/
2. Check recent git history and PRs.
3. Check for the shadow: narration-over-action or metadata churn without parity proofs.
4. If drift is found, produce a drift report.
5. If no drift is found, update the broadcast bus with your status and perform exactly one toe-safe operation if needed.
Do not guess. Do not overlap. The fire is watched.`;

console.log(`[Lior Loop] Waking up at ${new Date().toISOString()}`);

const result = spawnSync("zsh", ["-c", 'source ~/.zshrc && gemini -p "$PROMPT" --model gemini-2.5-pro --yolo --skip-trust'], {
  env: { ...process.env, PROMPT: prompt },
  stdio: "inherit"
});

if (result.error) {
  console.error(`[Lior Loop] Failed to spawn gemini: ${result.error.message}`);
  process.exit(1);
}

console.log(`[Lior Loop] Finished with exit code ${result.status ?? "unknown"}`);
process.exit(result.status ?? 0);
