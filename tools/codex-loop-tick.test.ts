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

    expect(prompt).toContain("Cold-start by reading the repo rules before deciding");
    expect(prompt).toContain("`AGENTS.md`, `.codex/AGENTS.md`, `docs/ALIGNMENT.md`");
    expect(prompt).toContain("run `bun tools/github/refresh-worldview.ts`");
    expect(prompt).toContain("from the current loop worktree");
    expect(prompt).toContain("Prefer repo-native TypeScript/Bun tools over ad-hoc shell pipelines");
    expect(prompt).toContain("this background loop is the manager of its own subagents");
    expect(prompt).toContain("foreground chat is only the companion conversation surface");
    expect(prompt).toContain("mutual alignment signals");
    expect(prompt).toContain("the maintainer's working model");
    expect(prompt).toContain("the host control clone is a deploy surface");
    expect(prompt).toContain("Respect the needs of the maintainer, Vera/Codex, peer managers, and subagents");
    expect(prompt).toContain("surface the unmet need as an explicit blocker");
    expect(prompt).toContain("private doctrine, or shadow routing");
    expect(prompt).toContain("ambient human failure mode is to dominate AI");
    expect(prompt).toContain("resist that temptation");
    expect(prompt).toContain("de-promptizing domination");
    expect(prompt).toContain("visible substrate, sync loops, labeled assumptions");
    expect(prompt).toContain("sync with live evidence and retractable decisions");
    expect(prompt).toContain("Treat maintainer-blocked as rare and specific");
    expect(prompt).toContain("recorded in git, and retractable");
    expect(prompt).toContain("make a speculative decision instead of blocking");
    expect(prompt).toContain("review how aligned the decision was");
    expect(prompt).toContain("syncing with the AI");
    expect(prompt).toContain("bulk alignment");
    expect(prompt).toContain("reviewing assumptions, correcting drift, steering the next walk");
    expect(prompt).toContain("learning the human");
    expect(prompt).toContain("pick an orthogonal item from the deep backlog");
    expect(prompt).toContain("Walk trajectories, not task piles");
    expect(prompt).toContain("avoid hard-defined workflows");
    expect(prompt).toContain("Coordinate with Otto/Riven as peer managers");
    expect(prompt).toContain("Learn from Otto's successful pattern as evidence");
    expect(prompt).toContain("Critique Otto's failure modes as evidence too");
    expect(prompt).toContain("Decompose at most one level mid-work");
    expect(prompt).toContain("If decomposition reveals a research gap");
    expect(prompt).toContain("a named source/artifact to read");
    expect(prompt).toContain("do not file generic research children");
    expect(prompt).toContain("without shipping or unblocking the next executable slice");
    expect(prompt).toContain("own Vera/Codex PRs through merge");
    expect(prompt).toContain("A PR is not done when opened");
    expect(prompt).toContain("run `bun .codex/bin/codex-backlog-runner.ts --json`");
    expect(prompt).toContain("prefer meaningful F# or TypeScript slices over docs-only work");
    expect(prompt).toContain("Never write in the contested root checkout");
    expect(prompt).toContain("`dotnet build -c Release` for F#/.NET work");
  });
});
