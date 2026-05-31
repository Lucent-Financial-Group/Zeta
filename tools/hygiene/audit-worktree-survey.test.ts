// audit-worktree-survey.test.ts -- focused coverage for the B-0090.5
// worktree recovery survey classifier.

import { describe, expect, test } from "bun:test";
import {
  classifyWorktrees,
  formatSurveyOutput,
  makeSurvey,
  parseArgs,
  parseWorktreePorcelain,
  renderMarkdown,
  type WorktreeEntry,
  type WorktreeInspection,
} from "./audit-worktree-survey.ts";

function entry(overrides: Partial<WorktreeEntry> = {}): WorktreeEntry {
  return {
    path: "/repo/worktree",
    head: "abc123",
    branch: "refs/heads/feature",
    locked: true,
    lockReason: "agent parked for recovery",
    prunable: false,
    ...overrides,
  };
}

function inspection(overrides: Partial<WorktreeInspection> = {}): WorktreeInspection {
  return {
    pathExists: true,
    dirty: false,
    headReachableFromMain: true,
    patchEquivalentToMain: null,
    statusError: null,
    ...overrides,
  };
}

describe("parseArgs", () => {
  test("parses root, report, and json flags", () => {
    expect(parseArgs(["--root", "/repo", "--report", "survey.md", "--json", "--dry"])).toEqual({
      kind: "args",
      args: {
        root: "/repo",
        report: "survey.md",
        json: true,
        dry: true,
      },
    });
  });

  test("rejects missing root path", () => {
    expect(parseArgs(["--root"])).toEqual({
      kind: "error",
      message: "--root requires a path",
    });
  });

  test("rejects another flag where report expects a path", () => {
    expect(parseArgs(["--report", "--json"])).toEqual({
      kind: "error",
      message: "--report requires a path",
    });
  });

  test("rejects unknown arguments", () => {
    expect(parseArgs(["--dry-run"])).toEqual({
      kind: "error",
      message: "Unknown argument: --dry-run",
    });
  });
});

describe("parseWorktreePorcelain", () => {
  test("parses live, prunable, and detached worktrees", () => {
    const stdout = [
      "worktree /repo/main",
      "HEAD aaa",
      "branch refs/heads/main",
      "locked active recovery lane",
      "",
      "worktree /repo/stale",
      "HEAD bbb",
      "branch refs/heads/old",
      "prunable gitdir file points to non-existent location",
      "",
      "worktree /repo/detached",
      "HEAD ccc",
      "detached",
      "locked",
      "",
    ].join("\n");

    expect(parseWorktreePorcelain(stdout)).toEqual([
      {
        path: "/repo/main",
        head: "aaa",
        branch: "refs/heads/main",
        locked: true,
        lockReason: "active recovery lane",
        prunable: false,
      },
      {
        path: "/repo/stale",
        head: "bbb",
        branch: "refs/heads/old",
        locked: false,
        lockReason: null,
        prunable: true,
      },
      {
        path: "/repo/detached",
        head: "ccc",
        branch: null,
        locked: true,
        lockReason: null,
        prunable: false,
      },
    ]);
  });

  test("returns no entries for empty porcelain output", () => {
    expect(parseWorktreePorcelain("")).toEqual([]);
  });
});

describe("classifyWorktrees", () => {
  test("marks clean worktrees whose HEAD is on origin/main as already covered", () => {
    const items = classifyWorktrees([entry()], {
      inspect: () => inspection(),
    });

    expect(items[0]!.bucket).toBe("ALREADY-COVERED");
    expect(items[0]!.reason).toContain("reachable from origin/main");
  });

  test("marks dirty worktrees as needing recovery", () => {
    const items = classifyWorktrees([entry()], {
      inspect: () => inspection({ dirty: true, headReachableFromMain: false }),
    });

    expect(items[0]!.bucket).toBe("NEEDS-RECOVERY");
    expect(items[0]!.reason).toContain("uncommitted or untracked");
  });

  test("marks missing prunable entries as obsolete", () => {
    const items = classifyWorktrees([entry({ prunable: true })], {
      inspect: () => inspection({ pathExists: false, dirty: null, headReachableFromMain: null }),
    });

    expect(items[0]!.bucket).toBe("OBSOLETE");
    expect(items[0]!.reason).toContain("prunable");
  });

  test("marks missing non-prunable entries as needing recovery", () => {
    const items = classifyWorktrees([entry()], {
      inspect: () => inspection({ pathExists: false, dirty: null, headReachableFromMain: null }),
    });

    expect(items[0]!.bucket).toBe("NEEDS-RECOVERY");
    expect(items[0]!.reason).toContain("did not mark");
  });

  test("marks clean but uncovered worktrees as needing recovery", () => {
    const items = classifyWorktrees([entry()], {
      inspect: () => inspection({ headReachableFromMain: false, patchEquivalentToMain: false }),
    });

    expect(items[0]!.bucket).toBe("NEEDS-RECOVERY");
    expect(items[0]!.reason).toContain("not known reachable or patch-equivalent");
  });

  test("marks clean patch-equivalent worktrees as already covered", () => {
    const items = classifyWorktrees([entry()], {
      inspect: () => inspection({ headReachableFromMain: false, patchEquivalentToMain: true }),
    });

    expect(items[0]!.bucket).toBe("ALREADY-COVERED");
    expect(items[0]!.reason).toContain("patch-equivalent");
  });

  test("marks status read failures as needing recovery", () => {
    const items = classifyWorktrees([entry()], {
      inspect: () => inspection({ dirty: null, headReachableFromMain: null, statusError: "fatal: not a git repo" }),
    });

    expect(items[0]!.bucket).toBe("NEEDS-RECOVERY");
    expect(items[0]!.reason).toContain("status could not be read");
  });
});

describe("renderMarkdown", () => {
  test("surveys only locked or prunable worktrees", () => {
    const survey = makeSurvey(
      [
        entry({ path: "/repo/unlocked", locked: false, lockReason: null, prunable: false }),
        entry({ path: "/repo/locked", locked: true, prunable: false }),
        entry({ path: "/repo/prunable", locked: false, lockReason: null, prunable: true }),
      ],
      { inspect: () => inspection() },
      new Date("2026-05-31T14:32:00Z"),
      null,
    );

    expect(survey.items.map((item) => item.path)).toEqual(["/repo/locked", "/repo/prunable"]);
    expect(survey.totals.worktrees).toBe(2);
  });

  test("renders totals and bucket tables", () => {
    const survey = makeSurvey(
      [entry({ path: "/repo/dirty" }), entry({ path: "/repo/stale", prunable: true })],
      {
        inspect: (e) =>
          e.path.endsWith("stale")
            ? inspection({ pathExists: false, dirty: null, headReachableFromMain: null })
            : inspection({ dirty: true, headReachableFromMain: false }),
      },
      new Date("2026-05-31T14:32:00Z"),
      "/repo",
    );

    const md = renderMarkdown(survey);
    expect(md).toContain("Generated: 2026-05-31T14:32:00.000Z");
    expect(md).toContain("- NEEDS-RECOVERY: 1");
    expect(md).toContain("- OBSOLETE: 1");
    expect(md).toContain("## NEEDS-RECOVERY");
    expect(md).toContain("## OBSOLETE");
    expect(md).toContain("| `/repo/dirty` |");
    expect(md).toContain("| `/repo/stale` |");
  });

  test("escapes markdown table cells", () => {
    const survey = makeSurvey(
      [entry({ path: "/repo/has|pipe\\slash", branch: "refs/heads/has`tick" })],
      {
        inspect: () =>
          inspection({
            dirty: null,
            headReachableFromMain: null,
            statusError: "fatal: reason|with\nnewline",
          }),
      },
      new Date("2026-05-31T14:32:00Z"),
      null,
    );

    const md = renderMarkdown(survey);
    expect(md).toContain("`/repo/has\\|pipe\\\\slash`");
    expect(md).toContain("``refs/heads/has`tick``");
    expect(md).toContain("fatal: reason\\|with<br>newline");
  });

  test("uses longer code fences for values with edge backticks", () => {
    const survey = makeSurvey(
      [entry({ path: "`/repo/edge`", branch: "refs/heads/``edge" })],
      { inspect: () => inspection() },
      new Date("2026-05-31T14:32:00Z"),
      null,
    );

    const md = renderMarkdown(survey);
    expect(md).toContain("`` `/repo/edge` ``");
    expect(md).toContain("```refs/heads/``edge```");
  });

  test("formats report output with a trailing newline", () => {
    const survey = makeSurvey([entry()], { inspect: () => inspection() }, new Date("2026-05-31T14:32:00Z"), null);

    expect(formatSurveyOutput(survey, false).endsWith("\n")).toBe(true);
    expect(formatSurveyOutput(survey, true).endsWith("\n")).toBe(true);
  });
});
