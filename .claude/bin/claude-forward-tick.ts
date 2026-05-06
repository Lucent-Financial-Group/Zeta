#!/usr/bin/env bun
// claude-forward-tick.ts — bounded forward-progress worker for Otto.
// Companion to claude-loop-tick.ts (heartbeat monitor).
// Runs every 30min via a separate launchd plist.
// Takes at most ONE safe action per invocation, then exits.
//
// Parity with .codex/bin/codex-loop-tick.ts (Vera's forward worker).

import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { execFileSync, spawnSync } from "node:child_process";

const home = process.env.HOME ?? "/Users/acehack";
const worktree = process.env.ZETA_CLAUDE_FORWARD_WORKTREE ?? join(home, ".local/share/zeta-claude-loop/Zeta");
const logDir = process.env.ZETA_CLAUDE_FORWARD_LOG_DIR ?? join(home, "Library/Logs/zeta-claude-loop");
const stateDir = process.env.ZETA_CLAUDE_FORWARD_STATE_DIR ?? join(home, "Library/Application Support/ZetaClaudeLoop");
const lockDir = join(stateDir, "forward-lock");
const timeoutMs = Number(process.env.ZETA_CLAUDE_FORWARD_TIMEOUT_SECONDS ?? "300") * 1000;
const dryRun = process.env.ZETA_CLAUDE_FORWARD_DRY_RUN === "1";

const runId = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");

mkdirSync(stateDir, { recursive: true });
mkdirSync(logDir, { recursive: true });

function nowIso(): string {
  return new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
}

function log(msg: string): void {
  appendFileSync(join(logDir, "forward.log"), `${nowIso()} ${msg}\n`);
}

function git(...args: string[]): { status: number; stdout: string } {
  const r = spawnSync("git", args, {
    cwd: worktree,
    encoding: "utf8",
    timeout: 30_000,
    env: { ...process.env, PATH: `/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:${join(home, ".local/bin")}` },
  });
  return { status: r.status ?? 1, stdout: r.stdout ?? "" };
}

function gh(...args: string[]): { status: number; stdout: string } {
  const r = spawnSync("gh", args, {
    cwd: worktree,
    encoding: "utf8",
    timeout: 60_000,
    env: { ...process.env, PATH: `/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:${join(home, ".local/bin")}` },
  });
  return { status: r.status ?? 1, stdout: r.stdout ?? "" };
}

function acquireLock(): boolean {
  try {
    mkdirSync(lockDir, { recursive: false });
    writeFileSync(join(lockDir, "meta"), `pid=${process.pid}\nrun=${runId}\nat=${nowIso()}\n`);
    return true;
  } catch {
    try {
      const meta = readFileSync(join(lockDir, "meta"), "utf8");
      const pidMatch = meta.match(/^pid=(\d+)$/m);
      if (pidMatch) {
        try { process.kill(Number(pidMatch[1]), 0); return false; } catch { /* stale */ }
      }
      rmSync(lockDir, { recursive: true, force: true });
      mkdirSync(lockDir, { recursive: false });
      writeFileSync(join(lockDir, "meta"), `pid=${process.pid}\nrun=${runId}\nat=${nowIso()}\n`);
      return true;
    } catch { return false; }
  }
}

function releaseLock(): void {
  try { rmSync(lockDir, { recursive: true, force: true }); } catch { /* best effort */ }
}

function readBroadcasts(): void {
  const broadcastDir = join(home, ".local/share/zeta-broadcasts");
  const peers = ["vera.md", "riven.md"];
  for (const peer of peers) {
    const path = join(broadcastDir, peer);
    if (existsSync(path)) {
      const content = readFileSync(path, "utf8").trim();
      if (content) log(`broadcast from ${peer.replace(".md", "")}: ${content.split("\n")[0] ?? "(empty)"}`);
    }
  }
}

function writeBroadcast(summary: string): void {
  const broadcastDir = join(home, ".local/share/zeta-broadcasts");
  mkdirSync(broadcastDir, { recursive: true });
  writeFileSync(join(broadcastDir, "otto.md"), [
    `# Otto broadcast — ${nowIso()}`,
    "",
    "## Background tick status",
    summary,
  ].join("\n"));
}

function forward(): void {
  readBroadcasts();

  // Fetch
  const fetch = git("fetch", "--quiet", "origin");
  if (fetch.status !== 0) {
    log(`fetch failed status=${fetch.status}`);
    return;
  }

  // Check dirty
  const dirty = git("status", "--porcelain");
  const dirtyCount = dirty.stdout.split("\n").filter(l => l.trim()).length;
  if (dirtyCount > 0) {
    log(`skip: control clone dirty count=${dirtyCount}`);
    return;
  }

  // Action 1: find open PRs where all required checks pass, 0 unresolved threads,
  // and auto-merge is NOT armed. Arm auto-merge on the first one found.
  const prsResult = gh(
    "pr", "list", "--repo", "Lucent-Financial-Group/Zeta",
    "--state", "open", "--json", "number", "--jq", ".[].number"
  );
  if (prsResult.status !== 0) {
    log(`gh pr list failed status=${prsResult.status}`);
    return;
  }

  const prNumbers = prsResult.stdout.trim().split("\n").filter(n => n.trim()).map(Number);
  if (prNumbers.length === 0) {
    log(`no open PRs, nothing to do`);
    return;
  }

  // Check each PR for merge-readiness
  for (const pr of prNumbers) {
    if (dryRun) {
      log(`dry-run: would check PR #${pr}`);
      continue;
    }

    const gateResult = gh(
      "pr", "view", String(pr), "--repo", "Lucent-Financial-Group/Zeta",
      "--json", "reviewDecision,mergeStateStatus,autoMergeRequest,reviewThreads",
      "--jq", '{mergeState: .mergeStateStatus, autoMerge: (.autoMergeRequest != null), unresolvedThreads: ([.reviewThreads[]? | select(.isResolved == false)] | length)}'
    );
    if (gateResult.status !== 0) continue;

    try {
      const gate = JSON.parse(gateResult.stdout);
      if (gate.mergeState === "CLEAN" && !gate.autoMerge && gate.unresolvedThreads === 0) {
        log(`arming auto-merge on PR #${pr} (CLEAN, 0 threads, not yet armed)`);
        const merge = gh(
          "pr", "merge", String(pr), "--repo", "Lucent-Financial-Group/Zeta",
          "--squash", "--auto"
        );
        log(`auto-merge result PR #${pr} status=${merge.status}`);
        writeBroadcast(`Forward tick ${runId}: armed auto-merge on PR #${pr}.`);
        return; // one action per tick
      }
    } catch { continue; }
  }

  log(`no actionable PR found, idle tick`);
  writeBroadcast(`Forward tick ${runId}: idle — no actionable PR. ${prNumbers.length} open.`);
}

// Main
if (!acquireLock()) {
  log(`skip: lock held run=${runId}`);
  process.exit(0);
}

try {
  log(`forward-tick start run=${runId}`);
  forward();
  log(`forward-tick end run=${runId}`);
} catch (err) {
  log(`error: ${err instanceof Error ? err.message : String(err)}`);
} finally {
  releaseLock();
}
