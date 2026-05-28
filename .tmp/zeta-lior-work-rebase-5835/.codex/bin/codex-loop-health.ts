#!/usr/bin/env bun
import { existsSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

const home = process.env.HOME ?? "/Users/acehack";
const label = process.env.ZETA_CODEX_LOOP_LABEL ?? "com.zeta.codex-loop";
const stateDir = process.env.ZETA_CODEX_LOOP_STATE_DIR ?? join(home, "Library/Application Support/ZetaCodexLoop");
const logDir = process.env.ZETA_CODEX_LOOP_LOG_DIR ?? join(home, "Library/Logs/zeta-codex-loop");
const lockDir = join(stateDir, "lock");
const runnerLog = join(logDir, "runner.log");
const lastCodexFile = join(stateDir, "last-codex-run.json");
const heartbeatStaleMs = Number(process.env.ZETA_CODEX_LOOP_HEARTBEAT_STALE_SECONDS ?? "240") * 1000;
const codexTimeoutMs = Number(process.env.ZETA_CODEX_LOOP_CODEX_TIMEOUT_SECONDS ?? "180") * 1000;
const graceMs = Number(process.env.ZETA_CODEX_LOOP_HEALTH_GRACE_SECONDS ?? "45") * 1000;

type Severity = "ok" | "attention" | "stuck";

type CodexState = {
  run_id?: string;
  started_at?: string;
  finished_at?: string;
  status?: string | number;
  updated_at?: string;
};

type LaunchdState = {
  loaded: boolean;
  state: string;
  runs: number | null;
  last_exit_code: string | null;
};

type LockState = {
  exists: boolean;
  age_seconds: number | null;
  pid: number | null;
  pid_alive: boolean | null;
};

function nowIso(): string {
  return new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
}

function parseTimestamp(value: string | undefined): number | null {
  if (!value) {
    return null;
  }
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? null : parsed;
}

function processIsAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return (error as { code?: string }).code === "EPERM";
  }
}

function readJson(path: string): CodexState | null {
  try {
    return JSON.parse(readFileSync(path, "utf8")) as CodexState;
  } catch {
    return null;
  }
}

function readRunnerLogTimestamp(): string | null {
  if (!existsSync(runnerLog)) {
    return null;
  }
  const lines = readFileSync(runnerLog, "utf8")
    .trim()
    .split(/\r?\n/)
    .filter((line) => line.length > 0);
  const last = lines.at(-1);
  return last?.split(/\s+/, 1)[0] ?? null;
}

function readLockState(): LockState {
  if (!existsSync(lockDir)) {
    return { exists: false, age_seconds: null, pid: null, pid_alive: null };
  }
  const ageSeconds = Math.round((Date.now() - statSync(lockDir).mtimeMs) / 1000);
  let pid: number | null = null;
  try {
    const metadata = readFileSync(join(lockDir, "metadata"), "utf8");
    const match = metadata.match(/^pid=(\d+)$/m);
    pid = match ? Number(match[1]) : null;
  } catch {
    pid = null;
  }
  return {
    exists: true,
    age_seconds: ageSeconds,
    pid,
    pid_alive: pid === null ? null : processIsAlive(pid),
  };
}

function readLaunchdState(): LaunchdState {
  const uid = spawnSync("id", ["-u"], { encoding: "utf8" }).stdout.trim();
  const result = spawnSync("launchctl", ["print", `gui/${uid}/${label}`], {
    encoding: "utf8",
    maxBuffer: 2 * 1024 * 1024,
  });
  if (result.status !== 0) {
    return { loaded: false, state: "missing", runs: null, last_exit_code: null };
  }

  const output = result.stdout;
  const state = output.match(/^\s*state = ([^\n]+)$/m)?.[1]?.trim() ?? "unknown";
  const runsRaw = output.match(/^\s*runs = (\d+)$/m)?.[1];
  const lastExitCode = output.match(/^\s*last exit code = ([^\n]+)$/m)?.[1]?.trim() ?? null;
  return {
    loaded: true,
    state,
    runs: runsRaw ? Number(runsRaw) : null,
    last_exit_code: lastExitCode,
  };
}

const checkedAt = nowIso();
const lastLogAt = readRunnerLogTimestamp();
const lastLogAgeSeconds = lastLogAt === null ? null : Math.round((Date.now() - (parseTimestamp(lastLogAt) ?? Date.now())) / 1000);
const codexState = readJson(lastCodexFile);
const codexStartedAtMs = parseTimestamp(codexState?.started_at);
const codexRunningAgeSeconds =
  codexState?.status === "running" && codexStartedAtMs !== null ? Math.round((Date.now() - codexStartedAtMs) / 1000) : null;
const lock = readLockState();
const launchd = readLaunchdState();
const issues: string[] = [];
const attention: string[] = [];

if (!launchd.loaded) {
  issues.push("launchd_not_loaded");
}
if (lastLogAgeSeconds === null) {
  issues.push("runner_log_missing");
} else if (lastLogAgeSeconds * 1000 > heartbeatStaleMs) {
  issues.push("runner_log_stale");
}
if (codexState?.status === "running" && codexStartedAtMs !== null && Date.now() - codexStartedAtMs > codexTimeoutMs + graceMs) {
  issues.push("codex_gate_over_timeout");
}
if (lock.exists && lock.pid_alive === false) {
  issues.push("dead_pid_lock");
}
if (lock.exists && lock.age_seconds !== null && lock.age_seconds * 1000 > codexTimeoutMs + graceMs) {
  issues.push("lock_over_timeout");
}
if (typeof codexState?.status === "number" && codexState.status !== 0) {
  attention.push("last_codex_gate_nonzero");
}
if (launchd.last_exit_code !== null && launchd.last_exit_code !== "0" && launchd.last_exit_code !== "(never exited)") {
  attention.push("last_launchd_exit_nonzero");
}

const severity: Severity = issues.length > 0 ? "stuck" : attention.length > 0 ? "attention" : "ok";
const report = {
  checked_at: checkedAt,
  severity,
  issues,
  attention,
  launchd,
  runner_log: {
    path: runnerLog,
    last_at: lastLogAt,
    age_seconds: lastLogAgeSeconds,
    stale_after_seconds: Math.round(heartbeatStaleMs / 1000),
  },
  codex_gate: {
    state_file: lastCodexFile,
    last: codexState,
    running_age_seconds: codexRunningAgeSeconds,
    timeout_seconds: Math.round(codexTimeoutMs / 1000),
    grace_seconds: Math.round(graceMs / 1000),
  },
  lock,
};

console.log(JSON.stringify(report, null, 2));
process.exit(severity === "stuck" ? 2 : severity === "attention" ? 1 : 0);
