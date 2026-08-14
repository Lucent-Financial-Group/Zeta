// tools/agent-heartbeats/merge-heartbeats-to-main.test.ts — 081KSKBP80008QG0R001KK9WV6.4 merge-tool tests.

import { describe, expect, it, test } from "bun:test";
import { armOutcome, parseArgs } from "./merge-heartbeats-to-main";

const TEST_ENV = {} as NodeJS.ProcessEnv;

describe("parseArgs", () => {
  it("zero args returns built-in defaults", () => {
    const r = parseArgs([], TEST_ENV);
    if ("error" in r) throw new Error(r.error);
    expect(r.repo).toBe("Lucent-Financial-Group/Zeta");
    expect(r.head).toBe("agent-heartbeats");
    expect(r.base).toBe("main");
    expect(r.dryRun).toBe(false);
  });

  it("env vars override repo/head", () => {
    const r = parseArgs([], { ZETA_AGENT_REPO: "fork/Zeta", ZETA_AGENT_BRANCH: "heartbeats-v2" });
    if ("error" in r) throw new Error(r.error);
    expect(r.repo).toBe("fork/Zeta");
    expect(r.head).toBe("heartbeats-v2");
  });

  it("CLI flags override env + defaults", () => {
    const r = parseArgs(["--repo", "x/y", "--head", "h", "--base", "b", "--dry-run"], TEST_ENV);
    if ("error" in r) throw new Error(r.error);
    expect(r.repo).toBe("x/y");
    expect(r.head).toBe("h");
    expect(r.base).toBe("b");
    expect(r.dryRun).toBe(true);
  });

  it("rejects malformed --repo", () => {
    expect("error" in parseArgs(["--repo", "no-slash"], TEST_ENV)).toBe(true);
  });

  it("rejects unknown flag", () => {
    expect("error" in parseArgs(["--bogus"], TEST_ENV)).toBe(true);
  });
});

// ── arm-auto-merge must not fail a successful flush (2026-08-13) ────────────────────────────
//
// Both heartbeat workflows failed on EVERY run for hours because `openMergePR` returned an
// error when arming auto-merge failed — discarding the fact that the branch was pushed and the
// PR was open. The telemetry was landing correctly the whole time. These pin the contract so a
// future change cannot quietly restore a failing exit code on successful work.
describe("armOutcome — a failed arm is still a success", () => {
  const pr = { number: 10397, url: "https://example.invalid/pr/10397", reused: true } as const;

  test("AO-1: arming succeeded → armed, no error recorded", () => {
    const r = armOutcome({ status: 0, stdout: "", stderr: "" }, pr);
    expect(r.armed).toBe(true);
    expect(r.armError).toBeUndefined();
    expect(r.number).toBe(10397);
  });

  test("AO-2: the real PAT failure is NOT an error — it is ok with armed=false", () => {
    const r = armOutcome(
      { status: 1, stdout: "", stderr: "GraphQL: Resource not accessible by personal access token (enablePullRequestAutoMerge)\n" },
      pr,
    );
    expect(r.armed).toBe(false);
    expect(r.armError).toContain("enablePullRequestAutoMerge");
    // the PR facts survive — this is the whole point
    expect(r.number).toBe(10397);
    expect(r.url).toBe(pr.url);
    expect(r.reused).toBe(true);
  });

  test("AO-3: falls back to stdout when stderr is empty, and trims", () => {
    const r = armOutcome({ status: 1, stdout: "  some failure  \n", stderr: "" }, pr);
    expect(r.armError).toBe("some failure");
  });
});
