#!/usr/bin/env bun
// lint-section-33-headers.ts - §33 archive-boundary-header lint for docs/research/ files.
//
// Per GOVERNANCE.md §33: every §33 archive file must declare 4 labels in its
// header block (within first ~25 lines) so external readers + downstream tooling
// can identify scope / attribution / operational status / non-fusion provenance:
//
//   1. Scope:
//   2. Attribution:
//   3. Operational status:
//   4. Non-fusion disclaimer:
//
// This tool catches the missing-label class BEFORE PR opens. Empirical anchor:
// Codex P2 finding on PR #4175 (discriminating-falsifier file shipped with only
// Scope + Attribution; missing Operational status + Non-fusion disclaimer);
// resolved with sed fix + thread no-op. This lint mechanizes that catch.
//
// Detection: a file is treated as §33-bearing if it contains either:
//   - "## Archive scope (per GOVERNANCE §33)" heading, OR
//   - "Archive scope (per GOVERNANCE §33)" anywhere in first 30 lines
//
// Usage:
//   bun tools/research/lint-section-33-headers.ts                # lint all docs/research/
//   bun tools/research/lint-section-33-headers.ts --file <path>  # lint specific file
//   bun tools/research/lint-section-33-headers.ts --strict       # exit 1 on findings
//   bun tools/research/lint-section-33-headers.ts --max-header N # header block window (default 30)
//
// Closes Task #26 (mirror-tier mechanization candidate; complements B-0533
// dead-xref sweep + B-0663 backlog-frontmatter lint).

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

interface Args {
    files: string[];
    strict: boolean;
    maxHeader: number;
    baseDir: string;
}

interface Finding {
    file: string;
    line: number;
    priority: "P0" | "P1" | "P2";
    message: string;
}

const REQUIRED_LABELS: ReadonlyArray<readonly [string, RegExp]> = [
    ["Scope", /^Scope:\s*\S/],
    ["Attribution", /^Attribution:\s*\S/],
    ["Operational status", /^Operational status:\s*\S/],
    ["Non-fusion disclaimer", /^Non-fusion disclaimer:\s*\S/],
];

const SECTION_33_DETECTOR = /Archive scope \(per GOVERNANCE §33\)/;

function parseArgs(argv: string[]): Args {
    const args: Args = {
        files: [],
        strict: false,
        maxHeader: 30,
        baseDir: "docs/research",
    };
    for (let i = 0; i < argv.length; i++) {
        const a = argv[i];
        const next = argv[i + 1];
        if (a === "--file" && next) { args.files.push(next); i++; }
        else if (a === "--strict") { args.strict = true; }
        else if (a === "--max-header" && next) { args.maxHeader = parseInt(next, 10); i++; }
        else if (a === "--base-dir" && next) { args.baseDir = next; i++; }
        else if (a === "--help" || a === "-h") {
            process.stdout.write("Usage: bun tools/research/lint-section-33-headers.ts [--file PATH] [--strict] [--max-header N]\n");
            process.exit(0);
        }
        else { process.stderr.write("unknown arg: " + a + "\n"); process.exit(2); }
    }
    return args;
}

function isSection33File(content: string, maxHeader: number): boolean {
    const lines = content.split("\n");
    const window = lines.slice(0, Math.max(maxHeader, 30)).join("\n");
    return SECTION_33_DETECTOR.test(window);
}

function findMissingLabels(content: string, maxHeader: number): Array<{ label: string; line: number }> {
    const lines = content.split("\n");
    const headerLines = lines.slice(0, maxHeader);
    const missing: Array<{ label: string; line: number }> = [];
    for (const [label, re] of REQUIRED_LABELS) {
        const found = headerLines.some(line => re.test(line));
        if (!found) {
            missing.push({ label, line: 1 });
        }
    }
    return missing;
}

function lintFile(path: string, maxHeader: number): Finding[] {
    const findings: Finding[] = [];
    let content: string;
    try {
        content = readFileSync(path, "utf8");
    } catch (e) {
        return findings;
    }
    if (!isSection33File(content, maxHeader)) return findings;

    const missing = findMissingLabels(content, maxHeader);
    for (const m of missing) {
        findings.push({
            file: path,
            line: m.line,
            priority: "P2",
            message: `§33 archive-boundary missing required header label: ${m.label}: (must appear in first ${maxHeader} lines)`,
        });
    }
    return findings;
}

function walkResearch(baseDir: string, files: string[]): void {
    let entries: string[];
    try {
        entries = readdirSync(baseDir);
    } catch (e) {
        return;
    }
    for (const entry of entries) {
        const full = join(baseDir, entry);
        let st;
        try { st = statSync(full); } catch { continue; }
        if (st.isDirectory()) {
            walkResearch(full, files);
        } else if (st.isFile() && entry.endsWith(".md")) {
            files.push(full);
        }
    }
}

function main(): void {
    const args = parseArgs(process.argv.slice(2));
    const files: string[] = [];
    if (args.files.length > 0) {
        files.push(...args.files);
    } else {
        walkResearch(args.baseDir, files);
    }
    const findings: Finding[] = [];
    let scanned = 0;
    let s33 = 0;
    for (const f of files) {
        scanned++;
        const fileFindings = lintFile(f, args.maxHeader);
        if (fileFindings.length > 0) s33++;
        findings.push(...fileFindings);
    }
    // Group findings by file for readable output
    const byFile = new Map<string, Finding[]>();
    for (const f of findings) {
        if (!byFile.has(f.file)) byFile.set(f.file, []);
        byFile.get(f.file)!.push(f);
    }
    for (const [file, fs] of byFile) {
        process.stdout.write(`${file}:\n`);
        for (const f of fs) {
            process.stdout.write(`  ${f.line}:1 [${f.priority}] ${f.message}\n`);
        }
    }
    if (findings.length === 0) {
        process.stdout.write(`OK: 0 findings across ${scanned} files\n`);
    } else {
        process.stdout.write(`\nTotal: ${findings.length} finding(s) across ${byFile.size} file(s) (of ${scanned} scanned)\n`);
    }
    process.exit(args.strict && findings.length > 0 ? 1 : 0);
}

main();
