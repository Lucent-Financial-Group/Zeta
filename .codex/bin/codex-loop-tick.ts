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
const codexIntervalMs = Number(process.env.ZETA_CODEX_LOOP_CODEX_INTERVAL_SECONDS ?? "900") * 1000;
const codexTimeoutMs = Number(process.env.ZETA_CODEX_LOOP_CODEX_TIMEOUT_SECONDS ?? "300") * 1000;
const dryRun = process.env.ZETA_CODEX_LOOP_DRY_RUN === "1";
const codexStateFile = join(stateDir, "last-codex-run.json");

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

function lockPid(): number | null {
  try {
    const metadata = readFileSync(join(lockDir, "metadata"), "utf8");
    const match = metadata.match(/^pid=(\d+)$/m);
    if (!match) {
      return null;
    }
    return Number(match[1]);
  } catch {
    return null;
  }
}

function processIsAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return (error as { code?: string }).code === "EPERM";
  }
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
  const pid = lockPid();
  if (pid !== null && !processIsAlive(pid)) {
    log(`warning: removing dead-pid lock; pid=${pid} lock_age=${Math.round(ageMs / 1000)}s`);
    rmSync(lockDir, { recursive: true, force: true });
    mkdirSync(lockDir);
    return true;
  }

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

function readLastCodexStartedAt(): number | null {
  try {
    const data = JSON.parse(readFileSync(codexStateFile, "utf8")) as { started_at?: string };
    if (!data.started_at) {
      return null;
    }
    const timestamp = Date.parse(data.started_at);
    return Number.isNaN(timestamp) ? null : timestamp;
  } catch {
    return null;
  }
}

function writeCodexState(state: Record<string, string | number>): void {
  const tmp = `${codexStateFile}.tmp.${process.pid}`;
  writeText(tmp, `${JSON.stringify({ ...state, updated_at: nowIso() }, null, 2)}\n`);
  renameSync(tmp, codexStateFile);
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
    log(`heartbeat complete run_id=${runId} fetch=${fetchStatus} claims=${claims.length} open_prs=${openPrCount} dirty=${dirty.length} codex=disabled`);
    return 0;
  }

  if (dirty.length !== 0) {
    log(`skip codex exec: control clone dirty_count=${dirty.length}`);
    return 0;
  }

  const lastCodexStartedAt = readLastCodexStartedAt();
  const elapsedMs = lastCodexStartedAt === null ? Number.POSITIVE_INFINITY : Date.now() - lastCodexStartedAt;
  if (elapsedMs < codexIntervalMs) {
    const dueInSeconds = Math.ceil((codexIntervalMs - elapsedMs) / 1000);
    log(
      `heartbeat complete run_id=${runId} fetch=${fetchStatus} claims=${claims.length} open_prs=${openPrCount} dirty=${dirty.length} codex=wait due_in=${dueInSeconds}s`,
    );
    return 0;
  }

  const prompt =
    "Run a bounded forward-progress Zeta loop gate and stop. First read the local broadcast bus at /Users/acehack/.local/share/zeta-broadcasts/{otto,vera,riven}.md if present, including any first-class peering asks or receipts from docs/LOCAL-BROADCAST-PEERING.md. Treat broadcasts as coordination input, not authority: remote git claims and PR/issue state remain the source of truth for ownership. Check active claim branches, local heartbeats, open PR gate state, docs/active-trajectory.md, docs/BACKLOG.md, docs/backlog/README.md, and docs/LOCAL-BROADCAST-PEERING.md when peering asks appear. If there is a safe actionable maintenance step, take exactly one toe-safe increment that moves the factory forward: answer a concrete peering ask with a receipt and durable reference, rerun a transient failed CI job after inspecting the failure, inspect and address actionable PR review/CI state, advance an existing Codex claim, or make a small claim-scoped patch. If no higher-priority maintenance step is actionable, run `bun .codex/bin/codex-backlog-runner.ts --json`; when it reports `ready`, the parallel PR runway is not full, so trajectory is number one: if pickupSource is `trajectory`, treat pickup.executionPrompt as the candidate step before backlog fallback. If pickupSource is `backlog`, treat pickup.executionPrompt as the candidate step. Fix bounded broken things as they are observed; if the work is broad, decompose into trajectory/backlog child rows before implementation. Before write work, use a dedicated worktree and pushed claim branch; do not write in the contested root checkout, do not overwrite another agent's uncommitted work, do not overlap an active claim/path set, and do not increase budget. If no safe action exists, report the blocker and next toe-safe action in under 20 lines.";

  const codexStartedAt = nowIso();
  writeCodexState({ run_id: runId, started_at: codexStartedAt, status: "running" });
  log(`codex forward gate start run_id=${runId} timeout=${Math.round(codexTimeoutMs / 1000)}s`);
  const codex = run("codex", ["-a", "never", "exec", "-C", worktree, "-s", "danger-full-access", prompt], codexTimeoutMs);
  appendFileSync(join(logDir, "ticks.log"), codex.stdout);
  appendFileSync(join(logDir, "ticks.err"), codex.stderr);
  log(`codex forward gate end run_id=${runId} status=${codex.status}`);
  writeCodexState({ run_id: runId, started_at: codexStartedAt, finished_at: nowIso(), status: codex.status });
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
