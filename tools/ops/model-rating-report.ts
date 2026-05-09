#!/usr/bin/env bun
// model-rating-report.ts — analyze background loop model A/B ratings
//
// Reads the JSONL ratings file written by claude-loop-tick.ts,
// pulls PR review thread data from GitHub for produced PRs,
// categorizes review findings, and compares models side-by-side.
//
// Usage:
//   bun tools/ops/model-rating-report.ts           # summary
//   bun tools/ops/model-rating-report.ts --reviews  # include PR review breakdown

import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

const home = process.env.HOME ?? "/Users/acehack";
const stateDir = process.env.ZETA_CLAUDE_LOOP_STATE_DIR
    ?? join(home, "Library/Application Support/ZetaClaudeLoop");
const ratingsFile = join(stateDir, "model-ratings.jsonl");
const includeReviews = process.argv.includes("--reviews");

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
    pr_number: number | null;
    had_build_error: boolean;
    had_test_failure: boolean;
}

interface ReviewFinding {
    pr: number;
    model: string;
    category: string;
    severity: string;
    author: string;
    snippet: string;
}

const CATEGORY_PATTERNS: [RegExp, string][] = [
    [/security|injection|xss|csrf|auth|secret|credential|token/i, "security"],
    [/build|compile|error FS|error CS|syntax/i, "build-error"],
    [/test|assert|expect|should|fail/i, "test-gap"],
    [/perf|alloc|gc|cache|hot.?path|O\(n/i, "performance"],
    [/race|concurrent|thread|lock|atomic|interlocked/i, "concurrency"],
    [/null|undefined|option|none|empty|missing/i, "null-safety"],
    [/name|naming|typo|spell|convention/i, "naming"],
    [/style|format|indent|whitespace|lint/i, "style"],
    [/doc|comment|summary|readme|description/i, "documentation"],
    [/hardcod|magic.?number|constant/i, "hardcoded-values"],
    [/error.?handl|exception|catch|throw|result/i, "error-handling"],
    [/type|cast|generic|constraint|interface/i, "type-design"],
    [/duplic|redundant|dead.?code|unused/i, "dead-code"],
    [/complex|refactor|simplif|readab/i, "complexity"],
    [/scope|boundary|api|public|internal|surface/i, "api-surface"],
];

function categorize(text: string): { category: string; severity: string } {
    const severityMatch = text.match(/\bP([0-3])\b/i);
    const severity = severityMatch ? `P${severityMatch[1]}` : "unrated";

    for (const [pattern, category] of CATEGORY_PATTERNS) {
        if (pattern.test(text)) return { category, severity };
    }
    return { category: "other", severity };
}

function fetchPrReviews(prNumber: number): ReviewFinding[] {
    const result = spawnSync("gh", [
        "api", "graphql", "-f", `query={
            repository(owner: "Lucent-Financial-Group", name: "Zeta") {
                pullRequest(number: ${prNumber}) {
                    reviewThreads(first: 50) {
                        nodes {
                            isResolved
                            comments(first: 1) {
                                nodes { body author { login } }
                            }
                        }
                    }
                    state
                    mergedAt
                }
            }
        }`
    ], { encoding: "utf8", timeout: 30_000 });

    if (result.status !== 0) return [];

    try {
        const data = JSON.parse(result.stdout);
        const pr = data.data.repository.pullRequest;
        const findings: ReviewFinding[] = [];

        for (const thread of pr.reviewThreads.nodes) {
            const comment = thread.comments.nodes[0];
            if (!comment) continue;
            const { category, severity } = categorize(comment.body);
            findings.push({
                pr: prNumber,
                model: "", // filled by caller
                category,
                severity,
                author: comment.author?.login ?? "unknown",
                snippet: comment.body.slice(0, 120).replace(/\n/g, " "),
            });
        }
        return findings;
    } catch {
        return [];
    }
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

function padRow(cells: string[], widths: number[]): string {
    return "| " + cells.map((c, i) => c.padEnd(widths[i])).join(" | ") + " |";
}

// === Basic metrics table ===

console.log("\n=== Model A/B Rating Report ===\n");
console.log(`Total ratings: ${ratings.length}`);
console.log(`Date range: ${ratings[0]?.started_at ?? "?"} → ${ratings[ratings.length - 1]?.ended_at ?? "?"}\n`);

const models = Array.from(byModel.keys());
const header = ["Metric", ...models];
const rows: string[][] = [];

const metricNames = [
    "Ticks", "Success rate", "PRs produced", "PR rate",
    "Build errors", "Test failures", "Pickup ticks", "Drain ticks",
    "Avg duration (s)", "Median duration (s)",
];

for (let i = 0; i < metricNames.length; i++) rows.push([metricNames[i]]);

for (const model of models) {
    const data = byModel.get(model)!;
    const total = data.length;
    const successes = data.filter(r => r.status === 0).length;
    const prs = data.filter(r => r.produced_pr).length;
    const buildErrors = data.filter(r => r.had_build_error).length;
    const testFailures = data.filter(r => r.had_test_failure).length;
    const pickups = data.filter(r => r.mode === "pickup").length;
    const drains = data.filter(r => r.mode === "drain").length;
    const durations = data.map(durationSec).sort((a, b) => a - b);
    const avg = durations.length > 0
        ? (durations.reduce((a, b) => a + b, 0) / durations.length).toFixed(0) : "?";
    const median = durations.length > 0
        ? durations[Math.floor(durations.length / 2)].toFixed(0) : "?";

    rows[0].push(String(total));
    rows[1].push(pct(successes, total));
    rows[2].push(String(prs));
    rows[3].push(pct(prs, total));
    rows[4].push(`${buildErrors} (${pct(buildErrors, total)})`);
    rows[5].push(`${testFailures} (${pct(testFailures, total)})`);
    rows[6].push(String(pickups));
    rows[7].push(String(drains));
    rows[8].push(avg);
    rows[9].push(median);
}

const colWidths = header.map((h, i) =>
    Math.max(h.length, ...rows.map(r => (r[i] ?? "").length)));

console.log(padRow(header, colWidths));
console.log("| " + colWidths.map(w => "-".repeat(w)).join(" | ") + " |");
for (const row of rows) console.log(padRow(row, colWidths));

// === PR review failure categories ===

if (includeReviews) {
    console.log("\n=== PR Review Failure Categories ===\n");

    const allFindings: ReviewFinding[] = [];
    const prsSeen = new Set<number>();

    for (const r of ratings) {
        if (!r.pr_number || prsSeen.has(r.pr_number)) continue;
        prsSeen.add(r.pr_number);
        process.stdout.write(`  fetching PR #${r.pr_number}...`);
        const findings = fetchPrReviews(r.pr_number);
        for (const f of findings) f.model = r.model;
        allFindings.push(...findings);
        console.log(` ${findings.length} findings`);
    }

    if (allFindings.length === 0) {
        console.log("No review findings found on produced PRs.");
    } else {
        // Category breakdown by model
        const catByModel = new Map<string, Map<string, number>>();
        for (const model of models) catByModel.set(model, new Map());

        for (const f of allFindings) {
            const cats = catByModel.get(f.model);
            if (cats) cats.set(f.category, (cats.get(f.category) ?? 0) + 1);
        }

        const allCats = [...new Set(allFindings.map(f => f.category))].sort();
        const catHeader = ["Category", ...models];
        const catRows: string[][] = allCats.map(cat => {
            const row = [cat];
            for (const model of models) {
                const count = catByModel.get(model)?.get(cat) ?? 0;
                const total = allFindings.filter(f => f.model === model).length;
                row.push(`${count} (${pct(count, total)})`);
            }
            return row;
        });

        // Totals row
        const totalRow = ["TOTAL"];
        for (const model of models) {
            totalRow.push(String(allFindings.filter(f => f.model === model).length));
        }
        catRows.push(totalRow);

        // Findings per PR
        const fppRow = ["Findings/PR"];
        for (const model of models) {
            const modelFindings = allFindings.filter(f => f.model === model).length;
            const modelPrs = new Set(allFindings.filter(f => f.model === model).map(f => f.pr)).size;
            fppRow.push(modelPrs > 0 ? (modelFindings / modelPrs).toFixed(1) : "N/A");
        }
        catRows.push(fppRow);

        const catWidths = catHeader.map((h, i) =>
            Math.max(h.length, ...catRows.map(r => (r[i] ?? "").length)));

        console.log(padRow(catHeader, catWidths));
        console.log("| " + catWidths.map(w => "-".repeat(w)).join(" | ") + " |");
        for (const row of catRows) console.log(padRow(row, catWidths));

        // Severity breakdown
        console.log("\n--- Severity breakdown ---\n");
        const sevByModel = new Map<string, Map<string, number>>();
        for (const model of models) sevByModel.set(model, new Map());
        for (const f of allFindings) {
            const sevs = sevByModel.get(f.model);
            if (sevs) sevs.set(f.severity, (sevs.get(f.severity) ?? 0) + 1);
        }

        const allSevs = ["P0", "P1", "P2", "P3", "unrated"];
        const sevHeader = ["Severity", ...models];
        const sevRows = allSevs.map(sev => {
            const row = [sev];
            for (const model of models) {
                row.push(String(sevByModel.get(model)?.get(sev) ?? 0));
            }
            return row;
        });

        const sevWidths = sevHeader.map((h, i) =>
            Math.max(h.length, ...sevRows.map(r => (r[i] ?? "").length)));

        console.log(padRow(sevHeader, sevWidths));
        console.log("| " + sevWidths.map(w => "-".repeat(w)).join(" | ") + " |");
        for (const row of sevRows) console.log(padRow(row, sevWidths));
    }
}

// === Recent entries ===

console.log("\n--- Recent entries (last 10) ---\n");
for (const r of ratings.slice(-10)) {
    const dur = durationSec(r).toFixed(0);
    const pr = r.pr_number ? `PR#${r.pr_number}` : "--";
    const err = r.had_build_error ? "BUILD-ERR" : r.had_test_failure ? "TEST-FAIL" : "clean";
    console.log(`  ${r.started_at} ${r.model.padEnd(8)} ${r.mode.padEnd(7)} ${dur}s ${pr.padEnd(8)} ${err}`);
}

if (!includeReviews) {
    console.log("\nRun with --reviews to pull PR review failure categories from GitHub.");
}
