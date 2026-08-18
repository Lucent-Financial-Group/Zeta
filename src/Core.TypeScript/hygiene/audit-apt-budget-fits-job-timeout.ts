#!/usr/bin/env bun
// audit-apt-budget-fits-job-timeout.ts — the apt wall budget must FIT inside the
// tightest CI job that runs the installer.
//
// THE DEFECT THIS CLOSES (measured 2026-08-18)
// --------------------------------------------
// `tools/setup/linux.sh` bounded each `apt-get install` at 600s and retried it
// three times, with 45s of backoff: a worst case of 1845s = 30.75 minutes. Every
// job that runs `tools/setup/install.sh` carries a `timeout-minutes` between 5
// and 45, and the tightest are 5-12 minutes. So on a stalling archive mirror the
// JOB was killed part-way through attempt 2 and reported `cancelled` — the guard
// made `apt-get` return, but the retry loop it returned into could not finish.
//
// That is the vacuity class in its CI form: a check that cannot run to completion
// looks exactly like one that ran and passed. Fixing the arithmetic once does not
// keep it fixed, because the two numbers live in two files that nobody diffs
// together — `timeout-minutes` is edited in workflow YAML by whoever is tuning a
// job, and the budget is edited in a shell script by whoever is tuning the
// installer. This audit is the edge between them.
//
// THE INVARIANT
// -------------
//     ci_budget + kill_after + PRE_APT_RESERVE_SECONDS  <=  tightest_job_seconds
//
// Read it as: when the shared deadline expires, linux.sh exits IMMEDIATELY with a
// readable cause. For that exit to be observable the whole apt phase plus the
// work that precedes it (checkout, cache restore) must fit inside the job. The
// reserve is that preceding work — MEASURED at 12.9s on run 32151321559 (a
// no-cache 5-minute job) and under ~90s on the big-cache gate jobs; 120s rounds
// up. `kill_after` is the SIGKILL grace `timeout` adds when SIGTERM is ignored.
//
// WHY THE BUDGET IS PARSED FROM linux.sh AND NOT RESTATED HERE. A constant copied
// into the checker is a second source of truth, and a checker that agrees with
// its own copy proves nothing. The shell assignment IS the value the runner uses.
//
// Rule 0: TypeScript, no new .sh files (`.claude/rules/rule-0-no-sh-files.md`).
//
// Usage:
//   bun src/Core.TypeScript/hygiene/audit-apt-budget-fits-job-timeout.ts
//   bun src/Core.TypeScript/hygiene/audit-apt-budget-fits-job-timeout.ts --human
//
// Exit codes: 0 = the budget fits; 1 = it does not (or a value could not be read).

import { readFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { parse as parseYaml } from "yaml";

/** Work that runs BEFORE the apt phase inside the same job: checkout + cache restore. */
export const PRE_APT_RESERVE_SECONDS = 120;

/** GitHub's own default when a job declares no `timeout-minutes` (6 hours). */
export const GITHUB_DEFAULT_TIMEOUT_MINUTES = 360;

/** Paths whose presence in a `run:` block means "this job runs the apt phase". */
const INSTALLER_PATHS = ["tools/setup/install.sh", "tools/setup/linux.sh"];

export interface AptBudget {
  /** Default wall budget for the whole apt phase under GITHUB_ACTIONS=true. */
  readonly ciDefaultSeconds: number;
  /** Default wall budget everywhere else (laptop, devcontainer). */
  readonly localDefaultSeconds: number;
  /** `timeout --kill-after` grace, in seconds. */
  readonly killAfterSeconds: number;
}

export interface InstallerJob {
  readonly workflow: string;
  readonly job: string;
  /** null when the job declares none — GitHub's 360-minute default then applies. */
  readonly timeoutMinutes: number | null;
  readonly effectiveSeconds: number;
}

export interface Reconciliation {
  readonly ok: boolean;
  readonly budget: AptBudget;
  readonly required: number;
  readonly tightest: InstallerJob | null;
  readonly jobs: readonly InstallerJob[];
  readonly detail: string;
}

function requireInt(source: string, name: string): number {
  // Anchored to a bare-integer assignment on its own line, so a computed or
  // quoted value fails loudly rather than being silently mis-read.
  const m = new RegExp(String.raw`^\s*${name}=(\d+)\s*$`, "m").exec(source);
  if (!m?.[1]) {
    throw new Error(
      `could not read ${name} from tools/setup/linux.sh — the audit reads the shell ` +
        `assignment directly so there is no second copy to drift; keep it a bare integer ` +
        `on its own line`,
    );
  }
  return Number.parseInt(m[1], 10);
}

/** Read the budget constants out of the shell source that actually uses them. */
export function parseAptBudget(shellSource: string): AptBudget {
  return {
    ciDefaultSeconds: requireInt(shellSource, "ZETA_APT_CI_BUDGET_DEFAULT_SECONDS"),
    localDefaultSeconds: requireInt(shellSource, "ZETA_APT_LOCAL_BUDGET_DEFAULT_SECONDS"),
    killAfterSeconds: requireInt(shellSource, "apt_kill_after"),
  };
}

function runsOnlyOnNonLinux(runsOn: unknown): boolean {
  const text = JSON.stringify(runsOn ?? "").toLowerCase();
  if (text.includes("${{")) return false; // matrix expression — assume it can be Linux
  const namesLinux = text.includes("ubuntu") || text.includes("linux") || text.includes("self-hosted");
  const namesOther = text.includes("windows") || text.includes("macos");
  return namesOther && !namesLinux;
}

/** Every job in one workflow whose steps invoke the installer on a Linux runner. */
export function installerJobs(workflowYaml: string, workflowName: string): InstallerJob[] {
  const doc = parseYaml(workflowYaml) as { jobs?: Record<string, unknown> } | null;
  const jobs = doc?.jobs;
  if (!jobs || typeof jobs !== "object") return [];
  const out: InstallerJob[] = [];
  for (const [name, raw] of Object.entries(jobs)) {
    if (!raw || typeof raw !== "object") continue;
    const job = raw as Record<string, unknown>;
    const steps = JSON.stringify(job["steps"] ?? "");
    if (!INSTALLER_PATHS.some((p) => steps.includes(p))) continue;
    if (runsOnlyOnNonLinux(job["runs-on"])) continue;
    const declared = job["timeout-minutes"];
    const timeoutMinutes = typeof declared === "number" ? declared : null;
    out.push({
      workflow: workflowName,
      job: name,
      timeoutMinutes,
      effectiveSeconds: (timeoutMinutes ?? GITHUB_DEFAULT_TIMEOUT_MINUTES) * 60,
    });
  }
  return out;
}

export function reconcile(budget: AptBudget, jobs: readonly InstallerJob[]): Reconciliation {
  const required = budget.ciDefaultSeconds + budget.killAfterSeconds + PRE_APT_RESERVE_SECONDS;
  if (jobs.length === 0) {
    return {
      ok: false,
      budget,
      required,
      tightest: null,
      jobs,
      detail:
        "no workflow job invokes tools/setup/install.sh — either the installer moved or " +
        "this audit stopped seeing it; an audit with nothing to check is not a passing audit",
    };
  }
  const tightest = jobs.reduce((a, b) => (b.effectiveSeconds < a.effectiveSeconds ? b : a));
  const ok = required <= tightest.effectiveSeconds;
  return {
    ok,
    budget,
    required,
    tightest,
    jobs,
    detail: ok
      ? `${required}s needed <= ${tightest.effectiveSeconds}s available in ` +
        `${tightest.workflow}:${tightest.job} (margin ${tightest.effectiveSeconds - required}s)`
      : `${required}s needed (${budget.ciDefaultSeconds}s budget + ` +
        `${budget.killAfterSeconds}s kill grace + ${PRE_APT_RESERVE_SECONDS}s pre-apt reserve) ` +
        `EXCEEDS the ${tightest.effectiveSeconds}s of ${tightest.workflow}:${tightest.job}. ` +
        `On a stalled mirror that job is killed mid-apt and reports \`cancelled\` instead of ` +
        `the installer's own error. Lower ZETA_APT_CI_BUDGET_DEFAULT_SECONDS in ` +
        `tools/setup/linux.sh, or raise that job's timeout-minutes.`,
  };
}

export function auditRepo(root: string): Reconciliation {
  const budget = parseAptBudget(readFileSync(join(root, "tools/setup/linux.sh"), "utf8"));
  const dir = join(root, ".github/workflows");
  const jobs: InstallerJob[] = [];
  for (const file of readdirSync(dir).sort()) {
    if (!file.endsWith(".yml") && !file.endsWith(".yaml")) continue;
    jobs.push(...installerJobs(readFileSync(join(dir, file), "utf8"), file));
  }
  return reconcile(budget, jobs);
}

export function main(argv: string[]): number {
  const root = resolve(process.env["REPO_ROOT"] ?? process.cwd());
  const r = auditRepo(root);
  if (argv.includes("--human")) {
    const sorted = [...r.jobs].sort((a, b) => a.effectiveSeconds - b.effectiveSeconds).slice(0, 10);
    process.stdout.write(
      `apt budget: ${r.budget.ciDefaultSeconds}s CI / ${r.budget.localDefaultSeconds}s local, ` +
        `${r.budget.killAfterSeconds}s kill grace\n` +
        `installer jobs: ${r.jobs.length}\n` +
        sorted
          .map(
            (j) =>
              `  ${String(j.effectiveSeconds).padStart(6)}s  ${j.workflow}:${j.job}` +
              (j.timeoutMinutes === null ? "  (no timeout-minutes — GitHub default)" : ""),
          )
          .join("\n") +
        `\n${r.ok ? "OK" : "FAIL"} — ${r.detail}\n`,
    );
  } else if (!r.ok) {
    process.stderr.write(`apt-budget-fits-job-timeout: FAIL — ${r.detail}\n`);
  }
  return r.ok ? 0 : 1;
}

if (import.meta.main) {
  process.exit(main(process.argv.slice(2)));
}
