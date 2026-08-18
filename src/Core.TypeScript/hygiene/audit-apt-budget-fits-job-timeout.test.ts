import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  GITHUB_DEFAULT_TIMEOUT_MINUTES,
  PRE_APT_RESERVE_SECONDS,
  auditRepo,
  installerJobs,
  parseAptBudget,
  reconcile,
  type AptBudget,
} from "./audit-apt-budget-fits-job-timeout";

const ROOT = resolve(import.meta.dir, "../../..");

const BUDGET: AptBudget = {
  ciDefaultSeconds: 150,
  localDefaultSeconds: 1800,
  killAfterSeconds: 10,
};

function job(workflow: string, name: string, timeoutMinutes: number | null) {
  return {
    workflow,
    job: name,
    timeoutMinutes,
    effectiveSeconds: (timeoutMinutes ?? GITHUB_DEFAULT_TIMEOUT_MINUTES) * 60,
  };
}

describe("parseAptBudget — read the value the runner actually uses", () => {
  test("reads the three constants from linux.sh itself", () => {
    const b = parseAptBudget(readFileSync(resolve(ROOT, "tools/setup/linux.sh"), "utf8"));
    expect(b.ciDefaultSeconds).toBeGreaterThan(0);
    expect(b.localDefaultSeconds).toBeGreaterThan(b.ciDefaultSeconds);
    expect(b.killAfterSeconds).toBeGreaterThan(0);
  });

  test("a value that is no longer a bare integer FAILS rather than defaulting", () => {
    // The whole point of parsing the shell is that there is no second copy. If the
    // assignment becomes computed, silently substituting a guess would restore the
    // drift this audit exists to prevent.
    const shell = [
      "ZETA_APT_CI_BUDGET_DEFAULT_SECONDS=$((JOB_TIMEOUT / 2))",
      "ZETA_APT_LOCAL_BUDGET_DEFAULT_SECONDS=1800",
      "apt_kill_after=10",
    ].join("\n");
    expect(() => parseAptBudget(shell)).toThrow(/ZETA_APT_CI_BUDGET_DEFAULT_SECONDS/);
  });
});

describe("installerJobs — which jobs pay the apt phase", () => {
  const yaml = `
jobs:
  runs-installer:
    runs-on: ubuntu-24.04
    timeout-minutes: 12
    steps:
      - run: ./tools/setup/install.sh
  no-installer:
    runs-on: ubuntu-24.04
    timeout-minutes: 2
    steps:
      - run: bun test
  windows-only:
    runs-on: windows-2022
    timeout-minutes: 3
    steps:
      - run: ./tools/setup/install.sh
  undeclared-timeout:
    runs-on: ubuntu-24.04
    steps:
      - run: bash tools/setup/linux.sh
`;
  const found = installerJobs(yaml, "w.yml");

  test("finds jobs that invoke the installer, ignores jobs that do not", () => {
    expect(found.map((j) => j.job).sort()).toEqual(["runs-installer", "undeclared-timeout"]);
  });

  test("a Windows-only job is excluded — install.ps1 never runs the apt phase", () => {
    // Otherwise a tight Windows job would constrain a Linux-only budget.
    expect(found.some((j) => j.job === "windows-only")).toBe(false);
  });

  test("an undeclared timeout means GitHub's 360-minute default, not 'unbounded'", () => {
    const u = found.find((j) => j.job === "undeclared-timeout");
    expect(u?.timeoutMinutes).toBeNull();
    expect(u?.effectiveSeconds).toBe(GITHUB_DEFAULT_TIMEOUT_MINUTES * 60);
  });
});

describe("reconcile — the invariant", () => {
  test("fits when the tightest job leaves room for budget + grace + reserve", () => {
    const r = reconcile(BUDGET, [job("gate.yml", "lint-shell", 12), job("a.yml", "b", 5)]);
    expect(r.ok).toBe(true);
    expect(r.required).toBe(150 + 10 + PRE_APT_RESERVE_SECONDS);
    expect(r.tightest?.job).toBe("b");
  });

  test("FAILS when a job is tightened below the budget — the drift this audit is for", () => {
    const r = reconcile(BUDGET, [job("gate.yml", "lint-shell", 12), job("a.yml", "tight", 4)]);
    expect(r.ok).toBe(false);
    expect(r.detail).toContain("cancelled");
    expect(r.detail).toContain("a.yml:tight");
  });

  test("FAILS when the budget is raised past the tightest job — the same drift, other side", () => {
    const r = reconcile({ ...BUDGET, ciDefaultSeconds: 600 }, [job("a.yml", "b", 5)]);
    expect(r.ok).toBe(false);
  });

  test("the pre-2026-08-18 retry budget would NOT have fitted — the defect, priced", () => {
    // 3 x 600s per-attempt timeout + 45s backoff = 1845s against a 300s job.
    const r = reconcile({ ...BUDGET, ciDefaultSeconds: 1845 }, [job("a.yml", "b", 5)]);
    expect(r.ok).toBe(false);
    expect(r.required).toBeGreaterThan(6 * 300);
  });

  test("an empty job set FAILS — an audit with nothing to check is not a pass", () => {
    const r = reconcile(BUDGET, []);
    expect(r.ok).toBe(false);
    expect(r.detail).toContain("nothing to check");
  });
});

describe("the live repository", () => {
  test("the shipped apt budget fits inside the tightest job that runs install.sh", () => {
    const r = auditRepo(ROOT);
    expect(r.jobs.length).toBeGreaterThan(20);
    // Message carries the arithmetic so a failure needs no second command to explain it.
    expect(r.ok, r.detail).toBe(true);
  });
});
