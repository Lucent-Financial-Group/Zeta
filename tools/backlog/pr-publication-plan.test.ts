import { describe, expect, test } from "bun:test";
import {
  buildPrBody,
  buildPrTitle,
  buildPublicationPlan,
  decideAutoMerge,
  normalizeBranchRef,
  validatePublicationInput,
  type PublicationInput,
} from "./pr-publication-plan";

function input(overrides: Partial<PublicationInput> = {}): PublicationInput {
  return {
    backlogId: "B-0280",
    backlogTitle: "Autonomous backlog pickup - PR publication and auto-merge",
    backlogPath: "docs/backlog/P0/B-0280-autonomous-backlog-pr-publication-and-automerge-2026-05-08.md",
    branch: "claim/task-b0280-pr-publication-plan",
    baseBranch: "main",
    summary: [
      "adds a deterministic PR publication packet",
      "keeps auto-merge arming behind review-thread and required-check gates",
    ],
    checks: [
      { command: "bun test tools/backlog/pr-publication-plan.test.ts", status: "passed" },
      { command: "bun run typecheck", status: "running", notes: "CI may still be pending" },
    ],
    requiredChecks: { ok: 4, inProgress: 2, pending: 1, failed: 0 },
    unresolvedReviewThreads: 0,
    ...overrides,
  };
}

describe("decideAutoMerge", () => {
  test("allows clean or pending required checks when no review threads are open", () => {
    expect(decideAutoMerge(input())).toEqual({
      allowed: true,
      reason: "no unresolved review threads and no failed required checks",
    });
  });

  test("blocks unresolved review threads", () => {
    expect(decideAutoMerge(input({ unresolvedReviewThreads: 2 }))).toEqual({
      allowed: false,
      reason: "2 unresolved review thread(s)",
    });
  });

  test("blocks failed required checks", () => {
    expect(decideAutoMerge(input({ requiredChecks: { ok: 4, inProgress: 0, pending: 0, failed: 1 } }))).toEqual({
      allowed: false,
      reason: "1 required check(s) failed",
    });
  });
});

describe("buildPublicationPlan", () => {
  test("builds title, markdown body, and argv command plan", () => {
    const plan = buildPublicationPlan(input());

    expect(plan.prTitle).toBe(
      "feat(backlog): advance B-0280 Autonomous backlog pickup - PR publication and auto-merge",
    );
    expect(plan.prBody).toContain("## Backlog row");
    expect(plan.prBody).toContain("B-0280");
    expect(plan.prBody).toContain("Decision: arm auto-merge");
    expect(plan.commands.push).toEqual(["git", "push", "-u", "origin", "claim/task-b0280-pr-publication-plan"]);
    expect(plan.commands.createPr).toContain("--body-file");
    expect(plan.commands.armAutoMerge).toEqual([
      "gh",
      "pr",
      "merge",
      "<pr-url>",
      "--repo",
      "Lucent-Financial-Group/Zeta",
      "--auto",
      "--squash",
    ]);
  });

  test("omits auto-merge command when the gate is not safe", () => {
    const plan = buildPublicationPlan(input({ unresolvedReviewThreads: 1 }));
    expect(plan.autoMerge.allowed).toBe(false);
    expect(plan.commands.armAutoMerge).toBeNull();
  });
});

describe("validation", () => {
  test("refuses default branch publication", () => {
    expect(() => validatePublicationInput(input({ branch: "main" }))).toThrow(
      "refusing to publish from default branch",
    );
    expect(() => validatePublicationInput(input({ branch: "refs/heads/main" }))).toThrow(
      "refusing to publish from default branch",
    );
    expect(() => validatePublicationInput(input({ branch: "refs/remotes/origin/main" }))).toThrow(
      "refusing to publish from default branch",
    );
    expect(() => validatePublicationInput(input({ branch: "origin/main" }))).toThrow(
      "refusing to publish from default branch",
    );
    expect(() => validatePublicationInput(input({ branch: "upstream/main" }))).toThrow(
      "refusing to publish from default branch",
    );
  });

  test("requires focused checks and safe backlog path", () => {
    expect(() => validatePublicationInput(input({ checks: [] }))).toThrow("at least one focused check");
    expect(() => validatePublicationInput(input({ backlogPath: "../outside.md" }))).toThrow(
      "unsafe repo-relative path",
    );
  });

  test("formats body check notes without mutating input", () => {
    const body = buildPrBody(input());
    expect(body).toContain("- running: `bun run typecheck` — CI may still be pending");
  });

  test("rejects empty normalized refs", () => {
    expect(() => validatePublicationInput(input({ branch: "refs/heads/" }))).toThrow("invalid normalized branch ref");
    expect(() => validatePublicationInput(input({ branch: "refs/remotes/origin/" }))).toThrow(
      "invalid normalized branch ref",
    );
    expect(() => validatePublicationInput(input({ baseBranch: "refs/heads/" }))).toThrow(
      "invalid normalized baseBranch ref",
    );
  });

  test("rejects option-like and malformed normalized refs", () => {
    expect(() => validatePublicationInput(input({ branch: "refs/heads/-claim" }))).toThrow(
      "invalid normalized branch ref",
    );
    expect(() => validatePublicationInput(input({ branch: "-claim" }))).toThrow("invalid normalized branch ref");
    expect(() => validatePublicationInput(input({ baseBranch: "refs/heads/-main" }))).toThrow(
      "invalid normalized baseBranch ref",
    );
    expect(() => validatePublicationInput(input({ branch: "claim..bad" }))).toThrow("invalid normalized branch ref");
    expect(() => validatePublicationInput(input({ branch: "claim/@{bad" }))).toThrow("invalid normalized branch ref");
    expect(() => validatePublicationInput(input({ branch: "claim/bad.lock" }))).toThrow(
      "invalid normalized branch ref",
    );
    expect(() => validatePublicationInput(input({ branch: "claim bad" }))).toThrow("invalid normalized branch ref");
  });

  test("trims long PR titles", () => {
    const title = buildPrTitle(
      input({
        backlogTitle:
          "a very long publication automation title that intentionally exceeds the usual GitHub scan width and should be trimmed for readability",
      }),
    );
    expect(title.length).toBeLessThanOrEqual(120);
    expect(title.endsWith("…")).toBe(true);
  });

  test("normalizes full refs before command construction", () => {
    expect(normalizeBranchRef("refs/heads/claim/task-b0280-pr-publication-plan")).toBe(
      "claim/task-b0280-pr-publication-plan",
    );
    expect(normalizeBranchRef("refs/remotes/origin/claim/task-b0280-pr-publication-plan")).toBe(
      "claim/task-b0280-pr-publication-plan",
    );
    expect(normalizeBranchRef("origin/claim/task-b0280-pr-publication-plan")).toBe(
      "origin/claim/task-b0280-pr-publication-plan",
    );

    const plan = buildPublicationPlan(
      input({
        branch: "refs/heads/claim/task-b0280-pr-publication-plan",
        baseBranch: "refs/heads/main",
      }),
    );
    expect(plan.commands.push).toEqual(["git", "push", "-u", "origin", "claim/task-b0280-pr-publication-plan"]);
    expect(plan.commands.createPr).toContain("main");
    expect(plan.commands.createPr).toContain("claim/task-b0280-pr-publication-plan");
  });

  test("preserves literal origin-prefixed branch names", () => {
    const plan = buildPublicationPlan(
      input({
        branch: "origin/feature",
        baseBranch: "refs/heads/main",
      }),
    );

    expect(plan.commands.push).toEqual(["git", "push", "-u", "origin", "origin/feature"]);
    expect(plan.commands.createPr).toContain("origin/feature");
  });
});
