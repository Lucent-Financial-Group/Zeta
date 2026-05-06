#!/usr/bin/env bun
import { appendFileSync, existsSync, mkdirSync, readFileSync, renameSync, rmSync, statSync, writeFileSync } from "node:fs";
import { dirname, isAbsolute, join } from "node:path";
import { spawnSync } from "node:child_process";

const home = process.env.HOME ?? "/Users/acehack";
const worktree = process.env.ZETA_CODEX_LOOP_WORKTREE ?? join(home, ".local/share/zeta-codex-loop/Zeta");
const stateDir = process.env.ZETA_CODEX_LOOP_STATE_DIR ?? join(home, "Library/Application Support/ZetaCodexLoop");
const logDir = process.env.ZETA_CODEX_LOOP_LOG_DIR ?? join(home, "Library/Logs/zeta-codex-loop");
const lockDir = join(stateDir, "lock");
const runId = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
const lockTtlMs = Number(process.env.ZETA_CODEX_LOOP_LOCK_TTL_SECONDS ?? "120") * 1000;
const fetchTimeoutMs = Number(process.env.ZETA_CODEX_LOOP_FETCH_TIMEOUT_SECONDS ?? "45") * 1000;
const runCodex = process.env.ZETA_CODEX_LOOP_RUN_CODEX === "1";
const codexTimeoutMs = Number(process.env.ZETA_CODEX_LOOP_CODEX_TIMEOUT_SECONDS ?? "300") * 1000;
const dryRun = process.env.ZETA_CODEX_LOOP_DRY_RUN === "1";

mkdirSync(stateDir, { recursive: true });
mkdirSync(logDir, { recursive: true });

function nowIso(): string {
  return new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
}

function log(message: string): void {
  appendFileSync(join(logDir, "runner.log"), `${nowIso()} ${message}\n`);
}

function run(command: string, args: string[], timeoutMs: number): { status: number; stdout: string; stderr: string } {
  const result = spawnSync(command, args, {
    cwd: worktree,
    encoding: "utf8",
    env: {
      ...process.env,
      PATH: `/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin:${join(home, ".local/bin")}`,
    },
    timeout: timeoutMs,
    maxBuffer: 20 * 1024 * 1024,
  });

  return {
    status: result.status ?? (result.signal ? 124 : 1),
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? String(result.error ?? ""),
  };
}

function lines(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

function acquireLock(): boolean {
  try {
    mkdirSync(lockDir);
    return true;
  } catch {
    if (!existsSync(lockDir)) {
      log("skip: lock exists check raced and disappeared");
      return false;
    }
  }

  const ageMs = Date.now() - statSync(lockDir).mtimeMs;
  if (ageMs <= lockTtlMs) {
    log(`skip: previous tick active; lock_age=${Math.round(ageMs / 1000)}s`);
    return false;
  }

  log(`warning: removing stale lock; lock_age=${Math.round(ageMs / 1000)}s ttl=${Math.round(lockTtlMs / 1000)}s`);
  rmSync(lockDir, { recursive: true, force: true });
  mkdirSync(lockDir);
  return true;
}

function writeText(path: string, text: string): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, text);
}

function main(): number {
  if (!existsSync(worktree)) {
    log(`error: worktree missing: ${worktree}`);
    return 1;
  }

  const commonDirResult = run("git", ["rev-parse", "--git-common-dir"], 10_000);
  if (commonDirResult.status !== 0) {
    log(`error: failed to resolve git common dir: ${commonDirResult.stderr.trim()}`);
    return 1;
  }
  const commonDirRaw = commonDirResult.stdout.trim();
  const commonDir = isAbsolute(commonDirRaw) ? commonDirRaw : join(worktree, commonDirRaw);

  const fetch = run("git", ["fetch", "--quiet", "origin"], fetchTimeoutMs);
  const fetchStatus = fetch.status === 0 ? "ok" : "failed";
  if (fetch.stdout || fetch.stderr) {
    appendFileSync(join(logDir, "heartbeat.err"), fetch.stdout + fetch.stderr);
  }

  const branch = lines(run("git", ["branch", "--show-current"], 10_000).stdout)[0] ?? "unknown";
  const claims = lines(run("git", ["branch", "-r", "--list", "origin/claim/*"], 10_000).stdout);
  const dirty = lines(run("git", ["status", "--porcelain"], 10_000).stdout);
  const openPrs = run("gh", ["pr", "list", "--state", "open", "--limit", "200"], 20_000);
  const openPrCount = openPrs.status === 0 ? String(lines(openPrs.stdout).length) : "unknown";

  const heartbeatDir = join(commonDir, "agent-heartbeats");
  const heartbeatFile = join(heartbeatDir, "codex-launchd-loop.json");
  const heartbeatTmp = `${heartbeatFile}.tmp.${process.pid}`;
  mkdirSync(heartbeatDir, { recursive: true });
  writeFileSync(
    heartbeatTmp,
    `${JSON.stringify(
      {
        session: "codex/launchd-loop",
        harness: "codex",
        claim: "host-codex-loop",
        branch,
        worktree,
        paths: [".codex/", "docs/CODEX-HARNESS-NOTES.md", "docs/active-trajectory.md", "docs/BACKLOG.md", "docs/backlog/README.md"],
        updated_at: nowIso(),
        status: "heartbeat",
        fetch_status: fetchStatus,
        claim_count: String(claims.length),
        open_pr_count: openPrCount,
        dirty_count: String(dirty.length),
      },
      null,
      2,
    )}\n`,
  );
  renameSync(heartbeatTmp, heartbeatFile);

  appendFileSync(
    join(logDir, "heartbeat.log"),
    `${nowIso()} run_id=${runId} branch=${branch} fetch=${fetchStatus} claims=${claims.length} open_prs=${openPrCount} dirty=${dirty.length} mode=heartbeat\n`,
  );

  if (dryRun) {
    log(`dry-run: heartbeat complete run_id=${runId} fetch=${fetchStatus} claims=${claims.length} dirty=${dirty.length}`);
    return 0;
  }

  if (!runCodex) {
    log(`heartbeat complete run_id=${runId} fetch=${fetchStatus} claims=${claims.length} open_prs=${openPrCount} dirty=${dirty.length}`);
    return 0;
  }

  if (dirty.length !== 0) {
    log(`skip codex exec: control clone dirty_count=${dirty.length}`);
    return 0;
  }

  const prompt =
    "Run a read-only Zeta loop gate report and stop. Do not edit files. Check active claim branches, local heartbeats, open PR gate state, docs/active-trajectory.md, docs/BACKLOG.md, and docs/backlog/README.md. Report the next toe-safe action in under 20 lines.";

  log(`codex read-only gate start run_id=${runId} timeout=${Math.round(codexTimeoutMs / 1000)}s`);
  const codex = run("codex", ["-a", "never", "exec", "-C", worktree, "-s", "read-only", prompt], codexTimeoutMs);
  appendFileSync(join(logDir, "ticks.log"), codex.stdout);
  appendFileSync(join(logDir, "ticks.err"), codex.stderr);
  log(`codex read-only gate end run_id=${runId} status=${codex.status}`);
  return codex.status;
}

let exitCode = 0;
if (acquireLock()) {
  writeText(join(lockDir, "metadata"), `run_id=${runId}\npid=${process.pid}\nstarted_at=${nowIso()}\n`);
  try {
    exitCode = main();
  } finally {
    rmSync(lockDir, { recursive: true, force: true });
  }
}
process.exit(exitCode);
