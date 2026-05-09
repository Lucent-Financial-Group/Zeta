#!/usr/bin/env bun
// claude-loop-tick.ts — host-level launchd worker for Claude Code.
// Parity with .codex/bin/codex-loop-tick.ts (Vera's loop).
//
// Runs every 60s via macOS launchd. Per-minute heartbeat checks git state
// (fetch, claims, PRs, dirty count). Every CLAUDE_GATE_INTERVAL seconds
// (default 900 = 15min) runs a Claude Code work cycle via
// `claude -p --permission-mode auto`:
// - If open_prs == 0: pick a buildable-now backlog item and create a PR
// - If open PRs with unresolved threads: fix threads on owned PRs
// - Otherwise: status check
//
// Does NOT wake the interactive Claude Code session. Runs as a separate
// process on the host OS.

import { appendFileSync, existsSync, mkdirSync, readFileSync, renameSync, rmSync, statSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

const home = process.env.HOME ?? homedir();
const worktree = process.env.ZETA_CLAUDE_LOOP_WORKTREE ?? join(home, ".local/share/zeta-claude-loop/Zeta");
const stateDir = process.env.ZETA_CLAUDE_LOOP_STATE_DIR ?? join(home, "Library/Application Support/ZetaClaudeLoop");
const logDir = process.env.ZETA_CLAUDE_LOOP_LOG_DIR ?? join(home, "Library/Logs/zeta-claude-loop");
const lockDir = join(stateDir, "lock");
const runId = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
const lockTtlMs = Number(process.env.ZETA_CLAUDE_LOOP_LOCK_TTL_SECONDS ?? "120") * 1000;
const fetchTimeoutMs = Number(process.env.ZETA_CLAUDE_LOOP_FETCH_TIMEOUT_SECONDS ?? "45") * 1000;
const runClaude = process.env.ZETA_CLAUDE_LOOP_RUN_CLAUDE === "1";
const claudeIntervalMs = Number(process.env.ZETA_CLAUDE_LOOP_CLAUDE_INTERVAL_SECONDS ?? "60") * 1000;
const claudeTimeoutMs = Number(process.env.ZETA_CLAUDE_LOOP_CLAUDE_TIMEOUT_SECONDS ?? "600") * 1000;
const dryRun = process.env.ZETA_CLAUDE_LOOP_DRY_RUN === "1";
const claudeModel = process.env.ZETA_CLAUDE_LOOP_MODEL ?? "sonnet";
const claudeStateFile = join(stateDir, "last-claude-run.json");
const ratingsFile = join(stateDir, "model-ratings.jsonl");

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
        // Check stale lock
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

interface AuthCheckOutput {
    queriedAt: string;
    result: {
        operative: { source: string; timestamp: string; raw: string; file: string } | null;
        reason: string;
    };
}

function runAuthorizationCheck(): { json: AuthCheckOutput | null; interpretation: string; shardField: string } {
    const result = run("bun", ["tools/authorization/check-authorization.ts", worktree], 30_000);
    if (result.status !== 0) {
        const msg = `[authorization] check failed (exit ${result.status}): ${result.stderr.slice(0, 120)}`;
        log(msg);
        return { json: null, interpretation: msg, shardField: "check-failed" };
    }
    const raw = result.stdout;
    // Two-layer DX: extract JSON block between the layer markers
    const jsonMatch = raw.match(/--- Layer 1: raw structured output ---\n([\s\S]*?)\n--- Layer 2: interpretation ---/);
    const interpMatch = raw.match(/--- Layer 2: interpretation ---\n(.+)/);
    const shardMatch = raw.match(/--- Shard field value ---\n(.+)/);
    let parsed: AuthCheckOutput | null = null;
    if (jsonMatch) {
        try { parsed = JSON.parse(jsonMatch[1]); } catch { /* tolerate */ }
    }
    const interpretation = interpMatch ? interpMatch[1].trim() : "[authorization] (parse error)";
    const shardField = shardMatch ? shardMatch[1].trim() : "unknown";
    // Layer 1: log raw JSON
    log(`authorization-check Layer1: ${jsonMatch ? jsonMatch[1].replace(/\s+/g, " ").slice(0, 200) : "(no json)"}`);
    // Layer 2: log interpretation
    log(`authorization-check Layer2: ${interpretation}`);
    return { json: parsed, interpretation, shardField };
}

function heartbeat(): void {
    // Authorization check (B-0308) — runs first at every tick start
    const authCheck = runAuthorizationCheck();

    // Fetch
    const fetch = run("git", ["fetch", "origin"], fetchTimeoutMs);
    const fetchOk = fetch.status === 0 ? "ok" : `exit-${fetch.status}`;
    if (fetch.status === 0) {
        run("git", ["reset", "--hard", "origin/main"], 10_000);
    }

    // Claims
    const claims = run("git", ["branch", "-r", "--list", "origin/claim/*"], 10_000);
    const claimCount = lines(claims.stdout).length;

    // Open PRs
    const prs = run("gh", ["pr", "list", "--state", "open", "--json", "number", "--jq", "length"], 30_000);
    const prCount = prs.stdout.trim() || "?";

    // Dirty
    const dirty = run("git", ["status", "--porcelain"], 10_000);
    const dirtyCount = lines(dirty.stdout).length;

    // Heartbeat JSON
    const hbDir = join(worktree, ".git/agent-heartbeats");
    mkdirSync(hbDir, { recursive: true });
    const hbFile = join(hbDir, "claude-launchd-loop.json");

    let claudeStatus = "wait";
    let dueIn = "";

    if (runClaude) {
        let lastRun: { updated_at?: string } = {};
        try { lastRun = JSON.parse(readFileSync(claudeStateFile, "utf8")); } catch { /* first run */ }
        const lastTime = lastRun.updated_at ? new Date(lastRun.updated_at).getTime() : 0;
        const elapsed = Date.now() - lastTime;

        if (elapsed >= claudeIntervalMs) {
            const prNum = Number(prCount) || 0;
            const workMode = prNum === 0 ? "pickup" : "drain";
            claudeStatus = "running";
            log(`claude work cycle start run_id=${runId} mode=${workMode} open_prs=${prNum}`);

            if (dryRun) {
                log(`dry-run: would run claude ${workMode}`);
                claudeStatus = "dry-run";
            } else {
                let prompt: string;
                if (workMode === "pickup") {
                    const pickup = run("bun", ["tools/backlog/autonomous-pickup.ts", "--json"], 30_000);
                    let executionPrompt = "";
                    try {
                        const selection = JSON.parse(pickup.stdout);
                        executionPrompt = selection.executionPrompt ?? "";
                        log(`pickup selected: ${selection.selected?.id ?? "none"} action=${selection.action ?? "none"}`);
                    } catch { log(`pickup parse error: ${pickup.stderr.slice(0, 200)}`); }

                    const preamble = [
                        `You are Otto's background worker in Lucent-Financial-Group/Zeta.`,
                        `BEFORE ANY WORK: 1) Read CLAUDE.md and AGENTS.md for repo conventions.`,
                        `2) Run "bun tools/github/refresh-worldview.ts" to get current state.`,
                        `3) Read active trajectories at docs/trajectories/*/RESUME.md.`,
                        `4) Build gate: "dotnet build -c Release" must end with 0 warnings 0 errors.`,
                        `KEY RULES: TS over bash (Rule 0). Prefer F#/TS code over docs.`,
                        `Search internet before asserting versions (Otto-364).`,
                        `Always re-decompose items during the build — assume decomposition has mistakes.`,
                        `OPERATIVE AUTHORIZATION (B-0308, ${authCheck.json?.queriedAt ?? "unknown"}): ${authCheck.interpretation}.`,
                        `Include "operative-authorization: ${authCheck.shardField}" in your tick-history shard frontmatter.`,
                    ].join(" ");

                    prompt = executionPrompt.length > 0
                        ? `${preamble} YOUR TASK:\n${executionPrompt}`
                        : `${preamble} No backlog items available. Run refresh-worldview, check for stale classifications, fix them, open a PR.`;
                } else {
                    prompt = [
                        `You are Otto's background worker in Lucent-Financial-Group/Zeta.`,
                        `Read CLAUDE.md first. Run "bun tools/github/refresh-worldview.ts".`,
                        `Build gate: "dotnet build -c Release" (0 warnings).`,
                        `OPERATIVE AUTHORIZATION (B-0308, ${authCheck.json?.queriedAt ?? "unknown"}): ${authCheck.interpretation}.`,
                        `TASK: ${prNum} open PRs. Run "bun tools/github/poll-pr-gate-batch.ts --all-open".`,
                        `For any PR where gate=BLOCKED and nextAction=resolve-threads:`,
                        `check out branch, read review comments, fix code issues, push,`,
                        `reply to threads, resolve via GraphQL, arm auto-merge`,
                        `(gh pr merge NUMBER --auto --squash). Own your PRs through merge.`,
                    ].join(" ");
                }

                const startedAt = nowIso();
                const gate = run("claude", [
                    "-p", prompt,
                    "-w",
                    "--model", claudeModel,
                    "--permission-mode", "auto",
                    "--output-format", "json",
                ], claudeTimeoutMs);

                claudeStatus = gate.status === 0 ? "ok" : `exit-${gate.status}`;
                log(`claude work cycle end run_id=${runId} mode=${workMode} model=${claudeModel} status=${gate.status}`);

                let inputTokens = 0;
                let outputTokens = 0;
                let cacheReadTokens = 0;
                let cacheCreationTokens = 0;
                let costUsd = 0;
                let claudeResult = "";
                let prMatch: RegExpMatchArray | null = null;
                try {
                    const parsed = JSON.parse(gate.stdout);
                    inputTokens = parsed.usage?.input_tokens ?? 0;
                    outputTokens = parsed.usage?.output_tokens ?? 0;
                    cacheReadTokens = parsed.usage?.cache_read_input_tokens ?? 0;
                    cacheCreationTokens = parsed.usage?.cache_creation_input_tokens ?? 0;
                    costUsd = parsed.total_cost_usd ?? 0;
                    claudeResult = parsed.result ?? "";
                    if (workMode === "pickup") {
                        prMatch = claudeResult.match(/github\.com\/[^/]+\/[^/]+\/pull\/(\d+)/);
                    }
                } catch {
                    // Fallback on non-JSON output (crash, older CLI, partial output) so
                    // failure-detection regexes still scan the raw stdout.
                    claudeResult = gate.stdout;
                    if (workMode === "pickup") {
                        prMatch = gate.stdout.match(/github\.com\/[^/]+\/[^/]+\/pull\/(\d+)/);
                    }
                }

                const rating = {
                    run_id: runId,
                    model: claudeModel,
                    mode: workMode,
                    status: gate.status,
                    started_at: startedAt,
                    ended_at: nowIso(),
                    stdout_lines: lines(gate.stdout).length,
                    stderr_lines: lines(gate.stderr).length,
                    produced_pr: !!prMatch,
                    pr_number: prMatch ? Number(prMatch[1]) : null,
                    had_build_error: /Build FAILED/i.test(claudeResult) || /[1-9]\d*\s+Error\(s\)/.test(claudeResult) || gate.stderr.includes("error FS"),
                    had_test_failure: /Failed:\s*[1-9]/.test(claudeResult) || /Test Run Failed/.test(claudeResult),
                    input_tokens: inputTokens,
                    output_tokens: outputTokens,
                    cache_read_tokens: cacheReadTokens,
                    cache_creation_tokens: cacheCreationTokens,
                };
                appendFileSync(ratingsFile, JSON.stringify(rating) + "\n");

                writeFileSync(claudeStateFile, JSON.stringify({
                    run_id: runId,
                    mode: workMode,
                    model: claudeModel,
                    status: gate.status,
                    started_at: startedAt,
                    updated_at: nowIso(),
                }, null, 2));

                const logContent = claudeResult || gate.stdout;
                if (logContent.trim().length > 0) {
                    appendFileSync(join(logDir, "ticks.log"), `\n--- ${runId} claude ${workMode} model=${claudeModel} in=${inputTokens} out=${outputTokens} cache_read=${cacheReadTokens} cache_create=${cacheCreationTokens} cost=$${costUsd.toFixed(4)} ---\n${logContent}\n`);
                }
                if (gate.stderr.trim().length > 0) {
                    appendFileSync(join(logDir, "ticks.err"), `\n--- ${runId} claude ${workMode} ---\n${gate.stderr}\n`);
                }
            }
        } else {
            const remaining = Math.round((claudeIntervalMs - elapsed) / 1000);
            dueIn = `due_in=${remaining}s`;
            claudeStatus = "wait";
        }
    }

    const summary = `heartbeat complete run_id=${runId} fetch=${fetchOk} claims=${claimCount} open_prs=${prCount} dirty=${dirtyCount} claude=${claudeStatus} model=${claudeModel} ${dueIn}`.trim();
    log(summary);

    writeFileSync(hbFile, JSON.stringify({
        session: "claude-code/launchd-loop",
        harness: "claude-code",
        claim: "host-loop",
        branch: "main",
        worktree,
        paths: ["(host-level heartbeat)"],
        updated_at: nowIso(),
        status: "active",
        dirty_count: String(dirtyCount),
        operative_authorization: authCheck.shardField,
    }, null, 2));
}

// Main
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
