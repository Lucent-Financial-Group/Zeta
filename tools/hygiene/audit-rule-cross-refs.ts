#!/usr/bin/env bun
// audit-rule-cross-refs.ts — detect stale-pointer candidates in `.claude/rules/*.md`
//
// Mechanizes the razor-cadence item 4 (composes-with audit) work that landed
// manually across 12 ticks on 2026-05-14 (50/50 rules, 217/218 LIVE, 1 finding
// captured by B-0514). See the cumulative final shard at
// `docs/hygiene-history/ticks/2026/05/14/1920Z.md` for context.
//
// Scope (first slice — mechanical Layer A only):
//
//   - Scan all `.claude/rules/*.md` files
//   - Pull backtick'd path references (`<path>.md`, `<path>.ts`, etc.)
//   - Pull backlog ID references (B-NNNN)
//   - Test existence via direct path + glob + per-row backlog file lookup
//   - Report stale-pointer CANDIDATES (failed existence)
//
// Out of scope (Layer B — semantic classification):
//
//   The 9-variant reference-classification taxonomy from the 12-batch manual
//   audit (concrete | glob | template-path | backlog-ID | legacy-noted |
//   transient | anti-pattern | conditional | alternative-location) requires
//   reading the rule's prose context around each reference. ~5% of MISSes are
//   rule-acknowledged-not-exists (healthy). This tool produces the *candidate
//   list* — human / Otto judgment classifies each candidate's variant.
//
//   See `docs/hygiene-history/ticks/2026/05/14/1920Z.md` for the full taxonomy.
//
// Usage:
//
//   bun tools/hygiene/audit-rule-cross-refs.ts                # detect-only, exit 0 always
//   bun tools/hygiene/audit-rule-cross-refs.ts --report PATH  # write markdown report
//
// Exit codes:
//
//   0   always (detect-only; no enforcement; humans triage stale-pointer candidates)
//   64  argument error
//
// DST-friendliness:
//
//   Read-only audit. The "Generated" timestamp in markdown reports is the only
//   non-deterministic surface. Per `typescript.md` universal-DST gate.

import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const RULES_DIR = ".claude/rules";
const BACKLOG_DIR = "docs/backlog";

type AuditExitCode = 0 | 64;

interface Args {
    readonly report: string | null;
}

interface Ref {
    readonly fromRule: string;
    readonly raw: string;
    readonly kind: "path" | "backlog-id";
}

interface AuditResult {
    readonly rulesScanned: number;
    readonly refsFound: number;
    readonly candidatesStale: Ref[];
    readonly resolvedCount: number;
}

function parseArgs(argv: string[]): { kind: "args"; args: Args } | { kind: "error"; message: string } {
    let report: string | null = null;
    let i = 0;
    while (i < argv.length) {
        const a = argv[i]!;
        if (a === "--report") {
            const next = argv[i + 1];
            if (!next) return { kind: "error", message: "--report requires a path" };
            report = next;
            i += 2;
        } else {
            return { kind: "error", message: `Unknown argument: ${a}` };
        }
    }
    return { kind: "args", args: { report } };
}

function pullRefs(content: string, ruleFile: string): Ref[] {
    const refs: Ref[] = [];

    // Backtick'd path references
    const pathPattern = /`([^`]+\.(md|ts|sh|fs|fsi|cs|yml|json))`/g;
    let m: RegExpExecArray | null;
    while ((m = pathPattern.exec(content)) !== null) {
        const raw = m[1]!;
        if (raw.includes("<") || raw.includes("$")) continue;
        refs.push({ fromRule: ruleFile, raw, kind: "path" });
    }

    // Backlog ID references (B-NNNN)
    const idPattern = /\bB-([0-9]{4})\b/g;
    while ((m = idPattern.exec(content)) !== null) {
        refs.push({ fromRule: ruleFile, raw: `B-${m[1]!}`, kind: "backlog-id" });
    }

    // Dedup
    const seen = new Set<string>();
    return refs.filter((r) => {
        const key = `${r.kind}:${r.raw}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });
}

function refExists(ref: Ref): boolean {
    if (ref.kind === "path") {
        if (existsSync(ref.raw)) return true;
        if (ref.raw.includes("*")) {
            const lastSlash = ref.raw.lastIndexOf("/");
            const dir = lastSlash >= 0 ? ref.raw.slice(0, lastSlash) : ".";
            const filePart = lastSlash >= 0 ? ref.raw.slice(lastSlash + 1) : ref.raw;
            if (!existsSync(dir) || !statSync(dir).isDirectory()) return false;
            const regex = new RegExp("^" + filePart.replace(/\./g, "\\.").replace(/\*/g, ".*") + "$");
            try {
                return readdirSync(dir).some((f) => regex.test(f));
            } catch {
                return false;
            }
        }
        return false;
    }
    if (ref.kind === "backlog-id") {
        const match = ref.raw.match(/B-(\d{4})/);
        if (!match) return false;
        const id = match[1]!;
        if (!existsSync(BACKLOG_DIR)) return false;
        for (const p of ["P0", "P1", "P2", "P3"]) {
            const dir = join(BACKLOG_DIR, p);
            if (!existsSync(dir)) continue;
            const files = readdirSync(dir);
            if (files.some((f) => f.startsWith(`B-${id}-`))) return true;
        }
        return false;
    }
    return false;
}

function audit(rulesDir: string): AuditResult {
    if (!existsSync(rulesDir)) {
        return { rulesScanned: 0, refsFound: 0, candidatesStale: [], resolvedCount: 0 };
    }

    const ruleFiles = readdirSync(rulesDir)
        .filter((f) => f.endsWith(".md"))
        .sort();

    let refsFound = 0;
    let resolvedCount = 0;
    const candidatesStale: Ref[] = [];

    for (const ruleFile of ruleFiles) {
        const content = readFileSync(join(rulesDir, ruleFile), "utf8");
        const refs = pullRefs(content, ruleFile);
        refsFound += refs.length;
        for (const ref of refs) {
            if (refExists(ref)) {
                resolvedCount++;
            } else {
                candidatesStale.push(ref);
            }
        }
    }

    return {
        rulesScanned: ruleFiles.length,
        refsFound,
        candidatesStale,
        resolvedCount,
    };
}

function renderReport(result: AuditResult, now: Date): string {
    const lines: string[] = [];
    lines.push("# `.claude/rules/` cross-reference audit");
    lines.push("");
    lines.push(`Generated: ${now.toISOString()}`);
    lines.push("");
    lines.push("## Summary");
    lines.push("");
    lines.push(`- Rules scanned: ${result.rulesScanned}`);
    lines.push(`- References pulled: ${result.refsFound}`);
    lines.push(`- Resolved: ${result.resolvedCount}`);
    lines.push(`- Stale-pointer candidates: ${result.candidatesStale.length}`);
    lines.push("");
    lines.push("## 9-variant taxonomy reminder");
    lines.push("");
    lines.push("Candidates listed below failed direct path / glob / backlog-row lookup. Apply the");
    lines.push("9-variant taxonomy from `docs/hygiene-history/ticks/2026/05/14/1920Z.md` to classify");
    lines.push("each candidate before fixing — ~5% are healthy MISSes (rule-acknowledged-transient,");
    lines.push("conditional, alternative-location, legacy-noted, anti-pattern).");
    lines.push("");
    lines.push("## Candidates");
    lines.push("");
    if (result.candidatesStale.length === 0) {
        lines.push("_None — all references resolve._");
    } else {
        lines.push("| Rule | Kind | Reference |");
        lines.push("|------|------|-----------|");
        for (const c of result.candidatesStale) {
            lines.push(`| \`${c.fromRule}\` | ${c.kind} | \`${c.raw}\` |`);
        }
    }
    lines.push("");
    return lines.join("\n");
}

function main(argv: string[]): AuditExitCode {
    const parsed = parseArgs(argv);
    if (parsed.kind === "error") {
        console.error(`error: ${parsed.message}`);
        return 64;
    }

    const result = audit(RULES_DIR);
    const report = renderReport(result, new Date());

    if (parsed.args.report) {
        writeFileSync(parsed.args.report, report);
        console.log(`wrote ${parsed.args.report}`);
    } else {
        console.log(report);
    }

    return 0;
}

if (import.meta.main) {
    process.exit(main(process.argv.slice(2)));
}

export { audit, pullRefs, refExists, renderReport };
