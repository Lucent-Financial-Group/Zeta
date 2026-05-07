#!/usr/bin/env bun
// factory-health-monitor.ts -- Standing query for factory health signals.
//
// Detects conditions that need action across multiple surfaces:
// PR queue, backlog state, CI status, claim freshness, trajectory
// progress. Produces a structured JSON report suitable for the
// autonomous loop's tick-decision.
//
// This is the "detect" half of detect-trigger-repair (B-0250).

import { spawnSync } from "node:child_process";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, resolve } from "node:path";

interface HealthSignal {
  surface: string;
  level: "ok" | "warning" | "critical";
  message: string;
  action?: string;
}

interface HealthReport {
  timestamp: string;
  signals: HealthSignal[];
  summary: {
    ok: number;
    warning: number;
    critical: number;
  };
  recommendedAction: string | null;
}

const ROOT = resolve(import.meta.dir, "../..");

function run(cmd: string, args: string[]): { ok: boolean; stdout: string } {
  const r = spawnSync(cmd, args, {
    cwd: ROOT,
    encoding: "utf-8",
    timeout: 30_000,
  });
  return { ok: r.status === 0, stdout: (r.stdout ?? "").trim() };
}

function checkPRQueue(): HealthSignal[] {
  const signals: HealthSignal[] = [];
  const r = run("gh", [
    "pr",
    "list",
    "--repo",
    "Lucent-Financial-Group/Zeta",
    "--state",
    "open",
    "--json",
    "number,title,createdAt,autoMergeRequest",
    "--limit",
    "50",
  ]);

  if (!r.ok) {
    signals.push({
      surface: "pr-queue",
      level: "warning",
      message: "Could not query PR queue (gh CLI issue)",
    });
    return signals;
  }

  try {
    const prs = JSON.parse(r.stdout) as Array<{
      number: number;
      title: string;
      createdAt: string;
      autoMergeRequest: { enabledAt: string } | null;
    }>;

    if (prs.length === 0) {
      signals.push({
        surface: "pr-queue",
        level: "ok",
        message: "PR queue empty — runway available for new work",
        action: "run autonomous-pickup to select next backlog item",
      });
    } else {
      const stale = prs.filter((pr) => {
        const age =
          Date.now() - new Date(pr.createdAt).getTime();
        return age > 24 * 60 * 60 * 1000;
      });

      if (stale.length > 0) {
        signals.push({
          surface: "pr-queue",
          level: "warning",
          message: `${stale.length} PR(s) older than 24h: ${stale.map((p) => `#${p.number}`).join(", ")}`,
          action: "investigate stale PRs — check CI status and unresolved threads",
        });
      }

      const noAutoMerge = prs.filter((pr) => !pr.autoMergeRequest);
      if (noAutoMerge.length > 0) {
        signals.push({
          surface: "pr-queue",
          level: "warning",
          message: `${noAutoMerge.length} PR(s) without auto-merge: ${noAutoMerge.map((p) => `#${p.number}`).join(", ")}`,
          action: "arm auto-merge on qualifying PRs",
        });
      }

      if (stale.length === 0 && noAutoMerge.length === 0) {
        signals.push({
          surface: "pr-queue",
          level: "ok",
          message: `${prs.length} PR(s) open, all auto-merge armed and fresh`,
        });
      }
    }
  } catch {
    signals.push({
      surface: "pr-queue",
      level: "warning",
      message: "Could not parse PR queue response",
    });
  }

  return signals;
}

function checkBacklogHealth(): HealthSignal[] {
  const signals: HealthSignal[] = [];
  const backlogDir = join(ROOT, "docs/backlog");

  let p0Count = 0;
  let p1Count = 0;
  let totalOpen = 0;

  for (const priority of ["P0", "P1", "P2", "P3"]) {
    const dir = join(backlogDir, priority);
    try {
      const files = readdirSync(dir).filter((f) => f.endsWith(".md"));
      for (const file of files) {
        const content = readFileSync(join(dir, file), "utf-8");
        const statusMatch = content.match(/^status:\s*(\S+)/m);
        if (statusMatch && statusMatch[1] === "open") {
          totalOpen++;
          if (priority === "P0") p0Count++;
          if (priority === "P1") p1Count++;
        }
      }
    } catch {
      // directory may not exist
    }
  }

  if (p0Count > 5) {
    signals.push({
      surface: "backlog",
      level: "critical",
      message: `${p0Count} open P0 items — too many critical items`,
      action: "triage P0 items: close resolved, decompose blobs, deprioritize if not truly P0",
    });
  } else if (p0Count > 0) {
    signals.push({
      surface: "backlog",
      level: "ok",
      message: `${p0Count} open P0, ${p1Count} open P1, ${totalOpen} total open`,
    });
  } else if (totalOpen > 0) {
    signals.push({
      surface: "backlog",
      level: "ok",
      message: `0 open P0, ${p1Count} open P1, ${totalOpen} total open`,
    });
  }

  if (totalOpen === 0) {
    signals.push({
      surface: "backlog",
      level: "critical",
      message: "No open backlog items — factory has no work queue",
      action: "file new backlog items from trajectories or gap analysis",
    });
  }

  return signals;
}

function checkClaimFreshness(): HealthSignal[] {
  const signals: HealthSignal[] = [];
  const r = run("git", [
    "branch",
    "-r",
    "--list",
    "origin/claim/*",
  ]);

  if (!r.ok) {
    signals.push({
      surface: "claims",
      level: "warning",
      message: "Could not query claim branches",
      action: "inspect local git remote state and credentials before trusting claim freshness",
    });
    return signals;
  }

  if (!r.stdout) {
    signals.push({
      surface: "claims",
      level: "ok",
      message: "No active claim branches",
    });
    return signals;
  }

  const branches = r.stdout
    .split("\n")
    .map((b) => b.trim())
    .filter(Boolean);

  if (branches.length > 5) {
    signals.push({
      surface: "claims",
      level: "warning",
      message: `${branches.length} claim branches — possible stale claims`,
      action: "audit claim branches for completed or abandoned work",
    });
  } else {
    signals.push({
      surface: "claims",
      level: "ok",
      message: `${branches.length} active claim branch(es)`,
    });
  }

  return signals;
}

function checkWorkingTreeCleanliness(): HealthSignal[] {
  const signals: HealthSignal[] = [];
  const r = run("git", ["status", "--porcelain"]);

  if (!r.ok) {
    signals.push({
      surface: "working-tree",
      level: "warning",
      message: "Could not check working tree status",
    });
    return signals;
  }

  const lines = r.stdout.split("\n").filter(Boolean);
  const untracked = lines.filter((l) => l.startsWith("??"));
  const modified = lines.filter((l) => !l.startsWith("??"));

  if (modified.length > 0) {
    signals.push({
      surface: "working-tree",
      level: "warning",
      message: `${modified.length} modified file(s) not committed`,
      action: "review uncommitted changes — commit or stash",
    });
  }

  if (untracked.length > 5) {
    signals.push({
      surface: "working-tree",
      level: "warning",
      message: `${untracked.length} untracked file(s) — possible artifacts`,
      action: "clean up or .gitignore untracked files",
    });
  }

  if (modified.length === 0 && untracked.length <= 5) {
    signals.push({
      surface: "working-tree",
      level: "ok",
      message: "Working tree clean",
    });
  }

  return signals;
}

function checkTrajectoryProgress(): HealthSignal[] {
  const signals: HealthSignal[] = [];
  const trajDir = join(ROOT, "docs/trajectories");

  try {
    const entries = readdirSync(trajDir, { withFileTypes: true });
    const trajectories = entries.filter((e) => e.isDirectory());

    let activeCount = 0;
    let stalledCount = 0;

    for (const traj of trajectories) {
      const resumePath = join(trajDir, traj.name, "RESUME.md");
      try {
        const stat = statSync(resumePath);
        const age = Date.now() - stat.mtimeMs;
        const daysSinceUpdate = age / (24 * 60 * 60 * 1000);

        if (daysSinceUpdate > 7) {
          stalledCount++;
        } else {
          activeCount++;
        }
      } catch {
        // no RESUME.md
      }
    }

    if (stalledCount > 0) {
      signals.push({
        surface: "trajectories",
        level: "warning",
        message: `${stalledCount} trajectory(ies) not updated in 7+ days`,
        action: "refresh stalled trajectories or mark as paused",
      });
    }

    signals.push({
      surface: "trajectories",
      level: "ok",
      message: `${activeCount} active, ${stalledCount} stalled trajectory(ies)`,
    });
  } catch {
    signals.push({
      surface: "trajectories",
      level: "ok",
      message: "No trajectory directory found",
    });
  }

  return signals;
}

function checkRecentCommitCadence(): HealthSignal[] {
  const signals: HealthSignal[] = [];
  const r = run("git", [
    "log",
    "--oneline",
    "--since=24 hours ago",
    "--format=%H",
  ]);

  if (!r.ok) return signals;

  const commits = r.stdout.split("\n").filter(Boolean);
  if (commits.length === 0) {
    signals.push({
      surface: "cadence",
      level: "critical",
      message: "No commits in the last 24 hours — factory may be idle",
      action: "check autonomous loop status and backlog runner",
    });
  } else {
    signals.push({
      surface: "cadence",
      level: "ok",
      message: `${commits.length} commit(s) in last 24h`,
    });
  }

  return signals;
}

export function runHealthCheck(): HealthReport {
  const allSignals: HealthSignal[] = [
    ...checkPRQueue(),
    ...checkBacklogHealth(),
    ...checkClaimFreshness(),
    ...checkWorkingTreeCleanliness(),
    ...checkTrajectoryProgress(),
    ...checkRecentCommitCadence(),
  ];

  const summary = {
    ok: allSignals.filter((s) => s.level === "ok").length,
    warning: allSignals.filter((s) => s.level === "warning").length,
    critical: allSignals.filter((s) => s.level === "critical").length,
  };

  const critical = allSignals.filter((s) => s.level === "critical");
  const warnings = allSignals.filter((s) => s.level === "warning");

  let recommendedAction: string | null = null;
  const firstCritical = critical[0];
  const firstWarning = warnings[0];
  if (firstCritical) {
    recommendedAction = firstCritical.action ?? firstCritical.message;
  } else if (firstWarning) {
    recommendedAction = firstWarning.action ?? firstWarning.message;
  }

  return {
    timestamp: new Date().toISOString(),
    signals: allSignals,
    summary,
    recommendedAction,
  };
}

if (import.meta.main) {
  const report = runHealthCheck();
  const json = process.argv.includes("--json");

  if (json) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    console.log(`Factory Health Report — ${report.timestamp}`);
    console.log("=".repeat(50));

    for (const signal of report.signals) {
      const icon =
        signal.level === "ok"
          ? "[OK]"
          : signal.level === "warning"
            ? "[!!]"
            : "[XX]";
      console.log(`${icon} ${signal.surface}: ${signal.message}`);
      if (signal.action) {
        console.log(`     -> ${signal.action}`);
      }
    }

    console.log("=".repeat(50));
    console.log(
      `Summary: ${report.summary.ok} ok, ${report.summary.warning} warning, ${report.summary.critical} critical`,
    );
    if (report.recommendedAction) {
      console.log(`Recommended: ${report.recommendedAction}`);
    }
  }
}
