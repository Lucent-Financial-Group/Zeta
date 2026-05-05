#!/usr/bin/env bun
// verify-branch-pretooluse.ts -- Claude Code PreToolUse hook wrapper
// for tools/orchestrator-checks/verify-branch.ts.
//
// Per Claude Code hooks reference (https://code.claude.com/docs/en/hooks):
// the hook script reads JSON from stdin (containing tool_input + session
// metadata) and either exits 0 (allow), exits 2 (block with stderr as
// reason), or writes a hookSpecificOutput JSON to stdout with explicit
// permissionDecision.
//
// This wrapper invokes verify-branch.ts, captures its exit code + stderr,
// and translates to the PreToolUse JSON contract.
//
// Wired via .claude/settings.json -- see .claude/hooks/README.md for the
// opt-in configuration. The wrapper exists on disk regardless; opt-in is
// via settings.json edit, not via existence of this file.
//
// Per B-0191 (PR #1571 design + PR #1585 implementation). Composes with
// memory/feedback_dst_justifies_ts_quality_over_bash_and_harness_hooks_suffice_no_git_hooks_aaron_2026_05_03.md
// (TS-over-bash harness-hooks-suffice).

import { spawnSync } from "node:child_process";

interface HookOutput {
  readonly hookSpecificOutput: {
    readonly hookEventName: "PreToolUse";
    readonly permissionDecision: "allow" | "deny";
    readonly permissionDecisionReason?: string;
  };
}

function emitDeny(reason: string): never {
  const output: HookOutput = {
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      permissionDecision: "deny",
      permissionDecisionReason: reason,
    },
  };
  console.log(JSON.stringify(output));
  process.exit(0);
}

function main(): number {
  // Run verify-branch.ts. We don't need to parse the stdin JSON because
  // verify-branch.ts reads ZETA_EXPECTED_BRANCH from env + queries git
  // directly -- the tool_input.command isn't needed for the check.
  const projectDir = process.env.CLAUDE_PROJECT_DIR ?? process.cwd();
  const result = spawnSync(
    "bun",
    [`${projectDir}/tools/orchestrator-checks/verify-branch.ts`],
    {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    },
  );

  if (result.status === 0) {
    // Allowed -- forward any stderr (worktree-warning) and exit 0.
    if (result.stderr) {
      process.stderr.write(result.stderr);
    }
    return 0;
  }

  // Blocked -- translate to deny JSON with the script's stderr as reason.
  const reason = (result.stderr || "verify-branch check failed").trim();
  emitDeny(reason);
  // unreachable
  return 0;
}

if (import.meta.main) {
  process.exit(main());
}
