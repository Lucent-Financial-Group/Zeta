import { describe, expect, test } from "bun:test";

import { buildCodexPrompt, codexExecArgs } from "../.codex/bin/codex-loop-tick";

describe("codex-loop-tick service contract", () => {
  test("launches Codex with the current noninteractive bypass flag", () => {
    expect(codexExecArgs({ worktree: "/repo/Zeta", prompt: "go", bypassApprovals: true })).toEqual([
      "exec",
      "-C",
      "/repo/Zeta",
      "--dangerously-bypass-approvals-and-sandbox",
      "go",
    ]);
  });

  test("keeps an explicit fallback for local no-bypass smoke runs", () => {
    expect(codexExecArgs({ worktree: "/repo/Zeta", prompt: "go", bypassApprovals: false })).toEqual([
      "exec",
      "-C",
      "/repo/Zeta",
      "-a",
      "never",
      "-s",
      "danger-full-access",
      "go",
    ]);
  });

  test("foreground reliability prompt owns Codex PRs through merge before new work", () => {
    const prompt = buildCodexPrompt();

    expect(prompt).toContain("own Vera/Codex PRs through merge");
    expect(prompt).toContain("A PR is not done when opened");
    expect(prompt).toContain("run `bun .codex/bin/codex-backlog-runner.ts --json`");
    expect(prompt).toContain("prefer meaningful F# or TypeScript slices over docs-only work");
    expect(prompt).toContain("Never write in the contested root checkout");
  });
});
