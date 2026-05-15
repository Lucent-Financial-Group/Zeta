#!/usr/bin/env bun
import { describe, it, expect } from "bun:test";
import type { CascadeFinding } from "./missed-substrate-detector";
import {
  buildRecoveryBranchName,
  buildRecoveryPRBody,
  openRecoveryPR,
  type RecoveryAdapters,
  type RecoveryResult,
} from "./missed-substrate-recovery";

// ─────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────

function makeFinding(overrides: Partial<CascadeFinding> = {}): CascadeFinding {
  return {
    prNumber: 1234,
    branchName: "feat/some-feature",
    missingCommits: ["aaaa111", "bbbb222"],
    urgency: "medium",
    ...overrides,
  };
}

type AdapterCallLog = {
  checkRecoveryPRExists: string[];
  gitCreateBranch: Array<{ branch: string; base: string }>;
  gitCherryPick: string[];
  gitPush: string[];
  ghPrCreate: Array<{ title: string; body: string; head: string }>;
};

function newCallLog(): AdapterCallLog {
  return {
    checkRecoveryPRExists: [],
    gitCreateBranch: [],
    gitCherryPick: [],
    gitPush: [],
    ghPrCreate: [],
  };
}

type AdapterStubOverrides = Partial<{
  checkRecoveryPRExists: (branchName: string) => boolean;
  gitCreateBranch: (branch: string, base: string) => boolean;
  gitCherryPick: (sha: string) => "ok" | "conflict" | "error";
  gitPush: (branch: string) => boolean;
  ghPrCreate: (title: string, body: string, head: string) => string | null;
}>;

function stubAdapters(
  log: AdapterCallLog,
  overrides: AdapterStubOverrides = {},
): RecoveryAdapters {
  return {
    checkRecoveryPRExists: (branchName) => {
      log.checkRecoveryPRExists.push(branchName);
      return overrides.checkRecoveryPRExists?.(branchName) ?? false;
    },
    gitCreateBranch: (branch, base) => {
      log.gitCreateBranch.push({ branch, base });
      return overrides.gitCreateBranch?.(branch, base) ?? true;
    },
    gitCherryPick: (sha) => {
      log.gitCherryPick.push(sha);
      return overrides.gitCherryPick?.(sha) ?? "ok";
    },
    gitPush: (branch) => {
      log.gitPush.push(branch);
      return overrides.gitPush?.(branch) ?? true;
    },
    ghPrCreate: (title, body, head) => {
      log.ghPrCreate.push({ title, body, head });
      // NOTE: don't use `??` here — when an override returns `null` (the
      // legitimate "PR-create failed" signal), `??` would collapse to the
      // default URL and the error-branch test would never trigger.
      if (overrides.ghPrCreate) return overrides.ghPrCreate(title, body, head);
      return "https://github.com/example/test/pull/9999";
    },
  };
}

// ─────────────────────────────────────────────────────────────────────
// buildRecoveryBranchName
// ─────────────────────────────────────────────────────────────────────

describe("buildRecoveryBranchName", () => {
  it("produces deterministic output for a fixed Date", () => {
    const ts = new Date(Date.UTC(2026, 4, 15, 12, 34, 56));
    expect(buildRecoveryBranchName(3500, ts)).toBe("recovery/3500-20260515123456");
  });

  it("emits 14 digit timestamp segment", () => {
    const ts = new Date(Date.UTC(2026, 0, 1, 0, 0, 0));
    const name = buildRecoveryBranchName(1, ts);
    expect(name).toMatch(/^recovery\/1-\d{14}$/);
  });

  it("encodes only safe characters (digits, /, -)", () => {
    const ts = new Date(Date.UTC(2026, 11, 31, 23, 59, 59));
    const name = buildRecoveryBranchName(42, ts);
    expect(name).toMatch(/^[0-9/\-a-z]+$/);
  });
});

// ─────────────────────────────────────────────────────────────────────
// buildRecoveryPRBody
// ─────────────────────────────────────────────────────────────────────

describe("buildRecoveryPRBody", () => {
  it("contains the original PR number, branch name, and all commit SHAs", () => {
    const body = buildRecoveryPRBody(makeFinding({
      prNumber: 9876,
      branchName: "feat/x",
      missingCommits: ["sha1", "sha2", "sha3"],
      urgency: "high",
    }));
    expect(body).toContain("**#9876**");
    expect(body).toContain("feat/x");
    expect(body).toContain("- sha1");
    expect(body).toContain("- sha2");
    expect(body).toContain("- sha3");
    expect(body).toContain("**high**");
    expect(body).toContain("Auto-generated");
  });

  it("handles single-commit findings", () => {
    const body = buildRecoveryPRBody(makeFinding({ missingCommits: ["just-one"] }));
    expect(body).toContain("- just-one");
  });
});

// ─────────────────────────────────────────────────────────────────────
// openRecoveryPR
// ─────────────────────────────────────────────────────────────────────

describe("openRecoveryPR — opened", () => {
  it("happy path: no existing PR, cherry-picks succeed, push+PR succeed", () => {
    const log = newCallLog();
    const adapters = stubAdapters(log);
    const r = openRecoveryPR(makeFinding(), false, adapters);

    expect(r.status).toBe("opened");
    if (r.status !== "opened") throw new Error("narrowing");
    expect(r.prUrl).toBe("https://github.com/example/test/pull/9999");
    expect(r.cherryPickedCount).toBe(2);

    expect(log.checkRecoveryPRExists.length).toBe(1);
    expect(log.gitCreateBranch.length).toBe(1);
    expect(log.gitCreateBranch[0]!.base).toBe("origin/main");
    expect(log.gitCherryPick).toEqual(["aaaa111", "bbbb222"]);
    expect(log.gitPush.length).toBe(1);
    expect(log.ghPrCreate.length).toBe(1);
    expect(log.ghPrCreate[0]!.head).toMatch(/^recovery\/1234-/);
  });

  it("PR title encodes prNumber + missing commits count", () => {
    const log = newCallLog();
    const r = openRecoveryPR(
      makeFinding({ prNumber: 7777, missingCommits: ["a", "b", "c"] }),
      false,
      stubAdapters(log),
    );
    expect(r.status).toBe("opened");
    expect(log.ghPrCreate[0]!.title).toContain("#7777");
    expect(log.ghPrCreate[0]!.title).toContain("3 missed commits");
  });
});

describe("openRecoveryPR — already-exists", () => {
  it("returns already-exists when checkRecoveryPRExists returns true; no mutations", () => {
    const log = newCallLog();
    const adapters = stubAdapters(log, { checkRecoveryPRExists: () => true });
    const r = openRecoveryPR(makeFinding(), false, adapters);

    expect(r.status).toBe("already-exists");
    if (r.status !== "already-exists") throw new Error("narrowing");
    expect(r.reason).toContain("already open");

    // No mutations should have happened.
    expect(log.gitCreateBranch.length).toBe(0);
    expect(log.gitCherryPick.length).toBe(0);
    expect(log.gitPush.length).toBe(0);
    expect(log.ghPrCreate.length).toBe(0);
  });
});

describe("openRecoveryPR — dry-run", () => {
  it("does not call gitCreateBranch and returns prUrl=\"dry-run\"", () => {
    const log = newCallLog();
    const r = openRecoveryPR(makeFinding(), true, stubAdapters(log));

    expect(r.status).toBe("opened");
    if (r.status !== "opened") throw new Error("narrowing");
    expect(r.prUrl).toBe("dry-run");
    expect(r.cherryPickedCount).toBe(0);

    // Dry-run still checks for existing PR (idempotency) but performs no mutations.
    expect(log.checkRecoveryPRExists.length).toBe(1);
    expect(log.gitCreateBranch.length).toBe(0);
    expect(log.gitCherryPick.length).toBe(0);
    expect(log.gitPush.length).toBe(0);
    expect(log.ghPrCreate.length).toBe(0);
  });
});

describe("openRecoveryPR — cherry-pick-conflict", () => {
  it("returns cherry-pick-conflict on the conflicting sha; push NOT called", () => {
    const log = newCallLog();
    // Conflict on the 2nd commit specifically.
    const adapters = stubAdapters(log, {
      gitCherryPick: (sha) => (sha === "bbbb222" ? "conflict" : "ok"),
    });
    const r = openRecoveryPR(makeFinding(), false, adapters);

    expect(r.status).toBe("cherry-pick-conflict");
    if (r.status !== "cherry-pick-conflict") throw new Error("narrowing");
    expect(r.sha).toBe("bbbb222");
    expect(r.attemptedCount).toBe(2);

    // Branch was created; push was NOT called because cherry-pick aborted.
    expect(log.gitCreateBranch.length).toBe(1);
    expect(log.gitCherryPick).toEqual(["aaaa111", "bbbb222"]);
    expect(log.gitPush.length).toBe(0);
    expect(log.ghPrCreate.length).toBe(0);
  });
});

describe("openRecoveryPR — error branches", () => {
  it("returns error when gitCreateBranch fails", () => {
    const log = newCallLog();
    const r = openRecoveryPR(makeFinding(), false, stubAdapters(log, { gitCreateBranch: () => false }));
    expect(r.status).toBe("error");
    if (r.status !== "error") throw new Error("narrowing");
    expect(r.reason).toContain("git checkout -b");
    expect(log.gitCherryPick.length).toBe(0);
  });

  it("returns error when gitCherryPick returns \"error\"", () => {
    const log = newCallLog();
    const r = openRecoveryPR(
      makeFinding(),
      false,
      stubAdapters(log, { gitCherryPick: () => "error" }),
    );
    expect(r.status).toBe("error");
    if (r.status !== "error") throw new Error("narrowing");
    expect(r.reason).toContain("git cherry-pick");
    expect(log.gitPush.length).toBe(0);
  });

  it("returns error when gitPush fails", () => {
    const log = newCallLog();
    const r = openRecoveryPR(makeFinding(), false, stubAdapters(log, { gitPush: () => false }));
    expect(r.status).toBe("error");
    if (r.status !== "error") throw new Error("narrowing");
    expect(r.reason).toContain("git push");
    expect(log.ghPrCreate.length).toBe(0);
  });

  it("returns error when ghPrCreate returns null", () => {
    const log = newCallLog();
    const r = openRecoveryPR(makeFinding(), false, stubAdapters(log, { ghPrCreate: () => null }));
    expect(r.status).toBe("error");
    if (r.status !== "error") throw new Error("narrowing");
    expect(r.reason).toContain("gh pr create");
  });
});
