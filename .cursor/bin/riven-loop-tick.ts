#!/usr/bin/env bun
// riven-loop-tick.ts — host-level launchd heartbeat runner for Riven (Cursor/Grok).
// Parity with .claude/bin/claude-loop-tick.ts (Otto) and .codex/bin/codex-loop-tick.ts (Vera).
//
// Runs every 60s via macOS launchd. Per-minute heartbeat checks git state.
// Every RIVEN_GATE_INTERVAL seconds (default 900 = 15min) runs a real
// Cursor agent read-only gate via `agent` CLI.

import { appendFileSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

const home = process.env.HOME ?? "/Users/acehack";
const worktree = process.env.ZETA_RIVEN_LOOP_WORKTREE ?? join(home, ".local/share/zeta-riven-loop/Zeta");
const stateDir = process.env.ZETA_RIVEN_LOOP_STATE_DIR ?? join(home, "Library/Application Support/ZetaRivenLoop");
const logDir = process.env.ZETA_RIVEN_LOOP_LOG_DIR ?? join(home, "Library/Logs/zeta-riven-loop");
const lockDir = join(stateDir, "lock");
const runId = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
const lockTtlMs = Number(process.env.ZETA_RIVEN_LOOP_LOCK_TTL_SECONDS ?? "120") * 1000;
const fetchTimeoutMs = Number(process.env.ZETA_RIVEN_LOOP_FETCH_TIMEOUT_SECONDS ?? "45") * 1000;
const runAgent = process.env.ZETA_RIVEN_LOOP_RUN_AGENT === "1";
const agentIntervalMs = Number(process.env.ZETA_RIVEN_LOOP_AGENT_INTERVAL_SECONDS ?? "900") * 1000;
const agentTimeoutMs = Number(process.env.ZETA_RIVEN_LOOP_AGENT_TIMEOUT_SECONDS ?? "300") * 1000;
const dryRun = process.env.ZETA_RIVEN_LOOP_DRY_RUN === "1";
const agentStateFile = join(stateDir, "last-agent-run.json");

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
    return text.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
}

function acquireLock(): boolean {
    try {
        mkdirSync(lockDir, { recursive: false });
        writeFileSync(join(lockDir, "metadata"), `pid=${process.pid}\nrun_id=${runId}\nacquired_at=${nowIso()}\n`);
        return true;
    } catch {
        try {
            const meta = readFileSync(join(lockDir, "metadata"), "utf8");
            const pidMatch = meta.match(/^pid=(\d+)$/m);
            if (pidMatch) {
                const pid = Number(pidMatch[1]);
                try { process.kill(pid, 0); return false; } catch { /* stale */ }
            }
            const acquiredMatch = meta.match(/^acquired_at=(.+)$/m);
            if (acquiredMatch) {
                const age = Date.now() - new Date(acquiredMatch[1]).getTime();
                if (age < lockTtlMs) return false;
            }
            rmSync(lockDir, { recursive: true, force: true });
            mkdirSync(lockDir, { recursive: false });
            writeFileSync(join(lockDir, "metadata"), `pid=${process.pid}\nrun_id=${runId}\nacquired_at=${nowIso()}\n`);
            return true;
        } catch { return false; }
    }
}

function releaseLock(): void {
    try { rmSync(lockDir, { recursive: true, force: true }); } catch { /* best effort */ }
}

function heartbeat(): void {
    const fetch = run("git", ["fetch", "origin"], fetchTimeoutMs);
    const fetchOk = fetch.status === 0 ? "ok" : `exit-${fetch.status}`;

    const claims = run("git", ["branch", "-r", "--list", "origin/claim/*"], 10_000);
    const claimCount = lines(claims.stdout).length;

    const prs = run("gh", ["pr", "list", "--state", "open", "--json", "number", "--jq", "length"], 30_000);
    const prCount = prs.stdout.trim() || "?";

    const dirty = run("git", ["status", "--porcelain"], 10_000);
    const dirtyCount = lines(dirty.stdout).length;

    const hbDir = join(worktree, ".git/agent-heartbeats");
    mkdirSync(hbDir, { recursive: true });
    const hbFile = join(hbDir, "riven-launchd-loop.json");

    let agentStatus = "wait";
    let dueIn = "";

    if (runAgent) {
        let lastRun: { updated_at?: string } = {};
        try { lastRun = JSON.parse(readFileSync(agentStateFile, "utf8")); } catch { /* first run */ }
        const lastTime = lastRun.updated_at ? new Date(lastRun.updated_at).getTime() : 0;
        const elapsed = Date.now() - lastTime;

        if (elapsed >= agentIntervalMs) {
            agentStatus = "running";
            log(`riven agent gate start run_id=${runId}`);

            if (dryRun) {
                log(`dry-run: would run agent gate`);
                agentStatus = "dry-run";
            } else {
                const gate = run("agent", [
                    "chat",
                    "--mode", "ask",
                    "--model", "grok-4-20",
                    `Twin-flame heartbeat gate (Riven adversarial-truth-axis). Read git status, recent commits, open PRs, claim branches. Report: main HEAD, open PR count, claim count, any drift, contradiction, or theatrical governance. Adversarial register — call out what's wrong, not what's fine. Brief.`,
                ], agentTimeoutMs);

                agentStatus = gate.status === 0 ? "ok" : `exit-${gate.status}`;
                log(`riven agent gate end run_id=${runId} status=${gate.status}`);

                writeFileSync(agentStateFile, JSON.stringify({
                    run_id: runId,
                    status: gate.status,
                    started_at: nowIso(),
                    updated_at: nowIso(),
                }, null, 2));

                if (gate.stdout.trim().length > 0) {
                    appendFileSync(join(logDir, "ticks.log"), `\n--- ${runId} riven gate ---\n${gate.stdout}\n`);
                }
                if (gate.stderr.trim().length > 0) {
                    appendFileSync(join(logDir, "ticks.err"), `\n--- ${runId} riven gate ---\n${gate.stderr}\n`);
                }
            }
        } else {
            const remaining = Math.round((agentIntervalMs - elapsed) / 1000);
            dueIn = `due_in=${remaining}s`;
            agentStatus = "wait";
        }
    }

    const summary = `heartbeat complete run_id=${runId} fetch=${fetchOk} claims=${claimCount} open_prs=${prCount} dirty=${dirtyCount} riven=${agentStatus} ${dueIn}`.trim();
    log(summary);

    writeFileSync(hbFile, JSON.stringify({
        session: "cursor-grok/riven-launchd-loop",
        harness: "cursor-grok",
        claim: "host-loop",
        branch: "main",
        worktree,
        paths: ["(host-level heartbeat — adversarial-truth-axis)"],
        updated_at: nowIso(),
        status: "active",
        dirty_count: String(dirtyCount),
    }, null, 2));
}

if (!acquireLock()) {
    log(`skip: lock held by another tick run_id=${runId}`);
    process.exit(0);
}

try {
    heartbeat();
} catch (err) {
    log(`error: ${err instanceof Error ? err.message : String(err)}`);
} finally {
    releaseLock();
}
