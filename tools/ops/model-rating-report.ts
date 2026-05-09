#!/usr/bin/env bun
// model-rating-report.ts — analyze background loop model A/B ratings
//
// Reads the JSONL ratings file written by claude-loop-tick.ts and
// produces a comparison table: Opus vs Sonnet on success rate,
// PR production rate, build errors, test failures, and duration.
//
// Usage: bun tools/ops/model-rating-report.ts

import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const home = process.env.HOME ?? "/Users/acehack";
const stateDir = process.env.ZETA_CLAUDE_LOOP_STATE_DIR
    ?? join(home, "Library/Application Support/ZetaClaudeLoop");
const ratingsFile = join(stateDir, "model-ratings.jsonl");

if (!existsSync(ratingsFile)) {
    console.log("No ratings file yet. Run some background loop ticks first.");
    console.log(`Expected at: ${ratingsFile}`);
    process.exit(0);
}

interface Rating {
    run_id: string;
    model: string;
    mode: string;
    status: number;
    started_at: string;
    ended_at: string;
    stdout_lines: number;
    stderr_lines: number;
    produced_pr: boolean;
    had_build_error: boolean;
    had_test_failure: boolean;
}

const raw = readFileSync(ratingsFile, "utf8");
const ratings: Rating[] = raw
    .split("\n")
    .filter(l => l.trim().length > 0)
    .map(l => JSON.parse(l));

const byModel = new Map<string, Rating[]>();
for (const r of ratings) {
    const key = r.model ?? "unknown";
    if (!byModel.has(key)) byModel.set(key, []);
    byModel.get(key)!.push(r);
}

function durationSec(r: Rating): number {
    return (new Date(r.ended_at).getTime() - new Date(r.started_at).getTime()) / 1000;
}

function pct(n: number, total: number): string {
    if (total === 0) return "N/A";
    return `${((n / total) * 100).toFixed(1)}%`;
}

console.log("\n=== Model A/B Rating Report ===\n");
console.log(`Total ratings: ${ratings.length}`);
console.log(`Date range: ${ratings[0]?.started_at ?? "?"} → ${ratings[ratings.length - 1]?.ended_at ?? "?"}\n`);

const header = ["Metric", ...Array.from(byModel.keys())];
const rows: string[][] = [];

for (const [model, data] of byModel) {
    const total = data.length;
    const successes = data.filter(r => r.status === 0).length;
    const prs = data.filter(r => r.produced_pr).length;
    const buildErrors = data.filter(r => r.had_build_error).length;
    const testFailures = data.filter(r => r.had_test_failure).length;
    const pickups = data.filter(r => r.mode === "pickup");
    const drains = data.filter(r => r.mode === "drain");
    const durations = data.map(durationSec);
    const avgDuration = durations.length > 0
        ? (durations.reduce((a, b) => a + b, 0) / durations.length).toFixed(0)
        : "?";
    const medianDuration = durations.length > 0
        ? durations.sort((a, b) => a - b)[Math.floor(durations.length / 2)].toFixed(0)
        : "?";

    if (rows.length === 0) {
        rows.push(["Ticks"]);
        rows.push(["Success rate"]);
        rows.push(["PRs produced"]);
        rows.push(["PR rate"]);
        rows.push(["Build errors"]);
        rows.push(["Test failures"]);
        rows.push(["Pickup ticks"]);
        rows.push(["Drain ticks"]);
        rows.push(["Avg duration (s)"]);
        rows.push(["Median duration (s)"]);
    }

    rows[0].push(String(total));
    rows[1].push(pct(successes, total));
    rows[2].push(String(prs));
    rows[3].push(pct(prs, total));
    rows[4].push(`${buildErrors} (${pct(buildErrors, total)})`);
    rows[5].push(`${testFailures} (${pct(testFailures, total)})`);
    rows[6].push(String(pickups.length));
    rows[7].push(String(drains.length));
    rows[8].push(avgDuration);
    rows[9].push(medianDuration);
}

// Print table
const colWidths = header.map((h, i) =>
    Math.max(h.length, ...rows.map(r => (r[i] ?? "").length)));

function padRow(cells: string[]): string {
    return "| " + cells.map((c, i) => c.padEnd(colWidths[i])).join(" | ") + " |";
}

console.log(padRow(header));
console.log("| " + colWidths.map(w => "-".repeat(w)).join(" | ") + " |");
for (const row of rows) {
    console.log(padRow(row));
}

console.log("\n--- Raw entries (last 10) ---\n");
for (const r of ratings.slice(-10)) {
    const dur = durationSec(r).toFixed(0);
    const pr = r.produced_pr ? "PR" : "--";
    const err = r.had_build_error ? "BUILD-ERR" : r.had_test_failure ? "TEST-FAIL" : "clean";
    console.log(`  ${r.started_at} ${r.model.padEnd(8)} ${r.mode.padEnd(7)} ${dur}s ${pr} ${err}`);
}
