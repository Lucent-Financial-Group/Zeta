#!/usr/bin/env bun
// audit-backlog-status-drift.ts — detect `status: open` backlog rows whose
// primary artifacts have all shipped, indicating substrate drift.
//
// Per docs/backlog/P3/B-0553-audit-backlog-status-drift-detection-2026-05-16.md
// and memory/feedback_substrate_drift_catch_pattern_claim_acquire_plus_existence_check_otto_cli_2026_05_16.md.
//
// What this does:
//
//   - Enumerate docs/backlog/P*/B-*.md rows
//   - For each `status: open` row, parse the body to extract primary-artifact
//     paths from the **Acceptance / Proposed mechanization / Scope** sections
//     ONLY (NOT composes_with: frontmatter, NOT `## Composes with` body section,
//     NOT Origin / Source / Why P? / Non-goals / Resolution)
//   - Existence-check every primary-artifact path on disk
//   - Report rows where ALL primary-artifact paths exist (drift candidates)
//
// Section-aware parsing is the load-bearing detail per B-0553's empirical
// false-positive catalog: a naive `grep -oE 'tools/[a-z0-9_/-]+\.ts'` over the
// whole body had a 4-of-4 false-positive rate because it matched composes_with
// cross-refs as primary artifacts.
//
// Out of scope (next slice):
//
//   - `--prune-claims`: release any matching bus claim entries
//   - `--open-close-pr`: auto-open close-row PRs
//   - Partial-vs-drift verification (the tool flags candidates; human/agent
//     verifies each acceptance bullet shipped before close-row PR)
//
// Usage:
//
//   bun tools/hygiene/audit-backlog-status-drift.ts            # markdown report
//   bun tools/hygiene/audit-backlog-status-drift.ts --json     # JSON output
//
// Exit codes:
//
//   0   no candidates found (or candidates reported in detect-only mode)
//   64  argument error

import { readdirSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

type PrimarySectionMatcher = RegExp;

// Sections where path mentions count as primary-artifact references.
const PRIMARY_SECTIONS: readonly PrimarySectionMatcher[] = [
    /^##\s+Acceptance(\s|$)/i,
    /^##\s+Acceptance criteria/i,
    /^##\s+Proposed mechanization/i,
    /^##\s+Scope(\s|$)/i,
] as const;

// Sections that mention paths as cross-references, NOT primary artifacts.
const SKIP_SECTIONS: readonly RegExp[] = [
    /^##\s+Composes with/i,
    /^##\s+Origin/i,
    /^##\s+Source/i,
    /^##\s+Why P[0-9]/i,
    /^##\s+Non-goals/i,
    /^##\s+Substrate-honest framing/i,
    /^##\s+Resolution/i,
    /^##\s+Background/i,
    /^##\s+Problem/i,
    /^##\s+Problem statement/i,
    /^##\s+Problem class/i,
    /^##\s+Empirical anchor/i,
    /^##\s+Alternative mitigations/i,
    /^##\s+Wire-up/i,
] as const;

// Path classes we treat as primary artifacts when mentioned in primary sections.
const PATH_REGEX =
    /(?<![A-Za-z0-9])(?:tools|\.claude|docs)\/[A-Za-z0-9_.-]+(?:\/[A-Za-z0-9_.-]+)*\.(?:ts|tsx|md|fs|fsi|cs|sh|yml|yaml|json)/g;

// Inline cross-reference patterns. Even inside an Acceptance / Proposed
// mechanization / Scope section, a line matching these patterns is a
// cross-reference, not a deliverable. Discovered empirically in B-0518
// (Sharpening 4's "Composes with `.claude/rules/encoding-rules-without-
// mechanizing.md`" bullet — a sibling reference inside a primary
// sub-section, not a deliverable).
//
// See `memory/feedback_audit_backlog_status_drift_second_false_positive_class_inline_composes_with_otto_cli_2026_05_16.md`
// for full reasoning + regression-test spec.
const INLINE_CROSSREF_PATTERNS: readonly RegExp[] = [
    /\bcomposes[\s-]?with\b/i,
    /\bsister\s+(?:mechanism|rule|tool|module|process)/i,
    /\bcross[\s-]?reference/i,
    /\bsee\s+(?:also\s+)?[`\[]/i,
    /\bper\s+[`\[]/i,
    /\b(?:references?|cites?)\s+[`\[]/i,
] as const;

export interface BacklogRow {
    readonly id: string;
    readonly path: string;
    readonly status: string;
    readonly primaryArtifacts: readonly string[];
}

export function parseFrontmatter(body: string): Record<string, string> {
    const match = body.match(/^---\n([\s\S]*?)\n---/);
    if (!match) return {};
    const fm: Record<string, string> = {};
    for (const line of match[1].split("\n")) {
        const colonIdx = line.indexOf(":");
        if (colonIdx === -1) continue;
        const key = line.slice(0, colonIdx).trim();
        const value = line.slice(colonIdx + 1).trim();
        fm[key] = value;
    }
    return fm;
}

/**
 * Extract primary-artifact paths from the row body.
 *
 * A primary-artifact path is a tools/ / .claude/ / docs/ path mentioned in
 * an Acceptance / Proposed mechanization / Scope section. Path mentions in
 * `Composes with` / Origin / Source / Why P? / Non-goals are treated as
 * cross-references and skipped.
 *
 * Paths under docs/backlog/ are always skipped (they're row cross-refs, not
 * deliverables).
 */
export function extractPrimaryArtifacts(body: string): string[] {
    const lines = body.split("\n");
    const artifacts = new Set<string>();
    type SectionMode = "primary" | "skip" | "other";
    let sectionMode: SectionMode = "other";

    for (const line of lines) {
        if (line.startsWith("## ")) {
            // Tri-state classification — PRIMARY_SECTIONS gate extraction,
            // SKIP_SECTIONS are explicitly recognised cross-reference sections
            // (Composes with / Origin / Resolution / etc.), and everything
            // else is "other" (no extraction, no skip-list match needed).
            // Making SKIP_SECTIONS load-bearing per the github-code-quality
            // finding on PR #3758: an unused constant is dead code; the
            // policy data should drive behaviour.
            if (PRIMARY_SECTIONS.some((re) => re.test(line))) {
                sectionMode = "primary";
            } else if (SKIP_SECTIONS.some((re) => re.test(line))) {
                sectionMode = "skip";
            } else {
                sectionMode = "other";
            }
            continue;
        }
        const inPrimarySection = sectionMode === "primary";
        if (!inPrimarySection) continue;

        // Skip inline cross-reference lines (e.g. "Composes with `tools/x.ts`"
        // bullets inside an Acceptance sub-section — these are siblings, not
        // deliverables).
        if (INLINE_CROSSREF_PATTERNS.some((re) => re.test(line))) continue;

        for (const match of line.matchAll(PATH_REGEX)) {
            const candidate = match[0];
            // Skip backlog-row cross-references (these are siblings, not deliverables).
            if (candidate.startsWith("docs/backlog/")) continue;
            artifacts.add(candidate);
        }
    }

    return [...artifacts];
}

export function enumerateOpenRows(backlogDir: string = "docs/backlog"): BacklogRow[] {
    const rows: BacklogRow[] = [];
    for (const priority of ["P0", "P1", "P2", "P3", "P4"]) {
        const dir = join(backlogDir, priority);
        if (!existsSync(dir)) continue;
        for (const file of readdirSync(dir)) {
            if (!file.startsWith("B-") || !file.endsWith(".md")) continue;
            const path = join(dir, file);
            const body = readFileSync(path, "utf-8");
            const fm = parseFrontmatter(body);
            if (fm.status !== "open") continue;
            const id = fm.id || file.replace(/^(B-\d+(?:\.\d+)?).*/, "$1");
            rows.push({
                id,
                path,
                status: fm.status,
                primaryArtifacts: extractPrimaryArtifacts(body),
            });
        }
    }
    return rows;
}

export function findDriftCandidates(rows: readonly BacklogRow[]): BacklogRow[] {
    return rows.filter((row) => {
        if (row.primaryArtifacts.length === 0) return false;
        return row.primaryArtifacts.every((p) => existsSync(p));
    });
}

function reportMarkdown(candidates: readonly BacklogRow[]): void {
    if (candidates.length === 0) {
        console.log("No substrate-drift candidates found.");
        return;
    }

    console.log("# Backlog status-drift candidates\n");
    console.log(
        "Rows with `status: open` where ALL primary-artifact paths exist on disk.\n",
    );
    console.log("| Row | Path | Primary artifacts |");
    console.log("|---|---|---|");
    for (const row of candidates) {
        const artifacts = row.primaryArtifacts.map((a) => `\`${a}\``).join(", ");
        console.log(`| ${row.id} | \`${row.path}\` | ${artifacts} |`);
    }
    console.log();
    console.log(
        "**Reminder**: Each candidate requires manual verification before close-row — every Acceptance bullet must have a corresponding merged PR, not just the file present. See `.claude/rules/backlog-item-start-gate.md` step 0 for the partial-vs-drift discriminator.",
    );
}

function reportJson(candidates: readonly BacklogRow[]): void {
    const payload = candidates.map((r) => ({
        id: r.id,
        path: r.path,
        primaryArtifacts: r.primaryArtifacts,
    }));
    console.log(JSON.stringify(payload, null, 2));
}

function main(): number {
    const args = process.argv.slice(2);

    for (const arg of args) {
        if (arg !== "--json" && arg !== "--help" && arg !== "-h") {
            console.error(`Unknown argument: ${arg}`);
            console.error("Usage: bun tools/hygiene/audit-backlog-status-drift.ts [--json]");
            return 64;
        }
    }

    if (args.includes("--help") || args.includes("-h")) {
        console.log(
            "Usage: bun tools/hygiene/audit-backlog-status-drift.ts [--json]\n\n" +
                "Detects `status: open` backlog rows whose primary-artifact paths all\n" +
                "exist on disk (substrate drift candidates).\n\n" +
                "Options:\n" +
                "  --json    Emit JSON instead of markdown table\n" +
                "  --help    Show this help",
        );
        return 0;
    }

    const candidates = findDriftCandidates(enumerateOpenRows());

    if (args.includes("--json")) {
        reportJson(candidates);
    } else {
        reportMarkdown(candidates);
    }

    return 0;
}

if (import.meta.main) {
    process.exit(main());
}
