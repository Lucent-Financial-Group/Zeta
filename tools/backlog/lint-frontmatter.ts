#!/usr/bin/env bun
// lint-frontmatter.ts - pre-push frontmatter discipline lint for docs/backlog rows.
//
// Catches 4 classes of recurring reviewer findings BEFORE PR opens:
//
//   1. Wrong relative-path prefix (same-dir vs cross-dir confusion)
//   2. composes_with completeness (body cites B-XXXX not in frontmatter)
//   3. Non-schema frontmatter keys (typos / unknown)
//   4. Redundant depends_on/composes_with edges
//
// Usage:
//   bun tools/backlog/lint-frontmatter.ts                # lint all backlog rows
//   bun tools/backlog/lint-frontmatter.ts --file <path>  # lint specific file
//   bun tools/backlog/lint-frontmatter.ts --strict       # exit 1 on findings
//   bun tools/backlog/lint-frontmatter.ts --check 1,3    # only run checks 1 and 3
//
// Closes B-0663 (mechanizes batch-7 recurring reviewer findings).

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

interface Args {
    files: string[];
    strict: boolean;
    checks: Set<number>;
    baseDir: string;
}

interface Finding {
    file: string;
    line: number;
    col: number;
    priority: "P0" | "P1" | "P2";
    check: number;
    message: string;
}

interface Frontmatter {
    id?: string;
    priority?: string;
    status?: string;
    title?: string;
    depends_on: string[];
    composes_with: string[];
    rawLines: string[];
    headerEnd: number;
    keys: Set<string>;
}

const SCHEMA_KEYS = new Set([
    "id", "priority", "status", "title",
    "tier", "effort", "ask", "type",
    "created", "last_updated",
    "depends_on", "decomposition", "composes_with", "tags",
    "renumbered_from", "closed_by", "superseded_by",
    "record_source", "load_datetime", "bp_rules_cited",
]);

function parseArgs(argv: string[]): Args {
    const args: Args = {
        files: [],
        strict: false,
        checks: new Set([1, 2, 3, 4]),
        baseDir: "docs/backlog",
    };
    for (let i = 0; i < argv.length; i++) {
        const a = argv[i];
        const next = argv[i + 1];
        if (a === "--file" && next) { args.files.push(next); i++; }
        else if (a === "--strict") { args.strict = true; }
        else if (a === "--check" && next) {
            args.checks = new Set(next.split(",").map(Number).filter(n => n >= 1 && n <= 4));
            i++;
        }
        else if (a === "--base-dir" && next) { args.baseDir = next; i++; }
        else if (a === "--help" || a === "-h") {
            process.stdout.write("Usage: bun tools/backlog/lint-frontmatter.ts [--file PATH] [--strict] [--check 1,2,3,4]\n");
            process.exit(0);
        }
        else { process.stderr.write("unknown arg: " + a + "\n"); process.exit(2); }
    }
    return args;
}

function parseFrontmatter(path: string): Frontmatter | null {
    const content = readFileSync(path, "utf8");
    const lines = content.split("\n");
    if (lines[0] !== "---") return null;
    let endIdx = -1;
    for (let i = 1; i < lines.length; i++) {
        if (lines[i] === "---") { endIdx = i; break; }
    }
    if (endIdx < 0) return null;

    const fm: Frontmatter = {
        depends_on: [],
        composes_with: [],
        rawLines: lines.slice(0, endIdx + 1),
        headerEnd: endIdx,
        keys: new Set(),
    };

    for (let i = 1; i < endIdx; i++) {
        const line = lines[i];
        const m = /^([a-zA-Z_][a-zA-Z0-9_]*):\s*(.*)$/.exec(line);
        if (!m) continue;
        const key = m[1];
        const value = m[2].trim();
        fm.keys.add(key);
        if (key === "id") fm.id = value.replace(/^["']|["']$/g, "");
        else if (key === "priority") fm.priority = value;
        else if (key === "status") fm.status = value;
        else if (key === "title") fm.title = value;
        else if (key === "depends_on") fm.depends_on = parseBList(value);
        else if (key === "composes_with") fm.composes_with = parseBList(value);
    }
    return fm;
}

function parseBList(value: string): string[] {
    const inline = /^\[(.*)\]$/.exec(value);
    if (!inline) return [];
    return inline[1]
        .split(",")
        .map(s => s.trim())
        .filter(s => /^B-\d{4}$/.test(s));
}

function extractBodyBLinks(path: string, headerEnd: number): Array<{ id: string; href: string; line: number; col: number }> {
    const content = readFileSync(path, "utf8");
    const lines = content.split("\n");
    const refs: Array<{ id: string; href: string; line: number; col: number }> = [];
    const re = /\[(B-\d{4})\]\(([^)]+)\)/g;
    for (let i = headerEnd + 1; i < lines.length; i++) {
        const line = lines[i];
        let m: RegExpExecArray | null;
        while ((m = re.exec(line)) !== null) {
            refs.push({ id: m[1], href: m[2], line: i + 1, col: m.index + 1 });
        }
    }
    return refs;
}

function fileDir(path: string): string | null {
    const m = /docs\/backlog\/(P[0-3])\//.exec(path);
    return m ? m[1] : null;
}

function pathDirForRef(href: string): string | null {
    if (/^\.\.\/(P[0-3])\//.test(href)) {
        const m = /^\.\.\/(P[0-3])\//.exec(href);
        return m ? m[1] : null;
    }
    if (/^B-\d{4}-[^/]+\.md$/.test(href)) return "SAME";
    return null;
}

function check1_pathPrefix(path: string, fm: Frontmatter, refs: ReturnType<typeof extractBodyBLinks>): Finding[] {
    const findings: Finding[] = [];
    const fileP = fileDir(path);
    if (!fileP) return findings;

    for (const ref of refs) {
        const refDir = pathDirForRef(ref.href);
        if (refDir === null || refDir === "SAME") continue;
        if (refDir === fileP) {
            findings.push({
                file: path,
                line: ref.line,
                col: ref.col,
                priority: "P1",
                check: 1,
                message: "[" + ref.id + "] link uses '../" + refDir + "/' prefix but target is in same directory (" + fileP + "); should be bare filename",
            });
        }
    }
    return findings;
}

function check2_composesCompleteness(path: string, fm: Frontmatter, refs: ReturnType<typeof extractBodyBLinks>): Finding[] {
    const findings: Finding[] = [];
    const composesSet = new Set(fm.composes_with);
    const dependsSet = new Set(fm.depends_on);
    const ownId = fm.id;
    const bodyIds = new Set<string>();
    for (const ref of refs) {
        if (ref.id === ownId) continue;
        if (dependsSet.has(ref.id)) continue;
        bodyIds.add(ref.id);
    }
    const missing = [...bodyIds].filter(id => !composesSet.has(id));
    if (missing.length > 0) {
        findings.push({
            file: path,
            line: fm.headerEnd + 1,
            col: 1,
            priority: "P2",
            check: 2,
            message: "composes_with omits " + missing.length + " ID(s) cited in body: " + missing.sort().join(", "),
        });
    }
    return findings;
}

function check3_nonSchemaKeys(path: string, fm: Frontmatter): Finding[] {
    const findings: Finding[] = [];
    for (const key of fm.keys) {
        if (!SCHEMA_KEYS.has(key)) {
            const lineIdx = fm.rawLines.findIndex(l => l.startsWith(key + ":"));
            findings.push({
                file: path,
                line: lineIdx >= 0 ? lineIdx + 1 : 1,
                col: 1,
                priority: "P1",
                check: 3,
                message: "Non-schema frontmatter key '" + key + "' (typo? See tools/backlog/README.md for schema)",
            });
        }
    }
    return findings;
}

function check4_redundantEdges(path: string, fm: Frontmatter): Finding[] {
    const findings: Finding[] = [];
    const dependsSet = new Set(fm.depends_on);
    const redundant = fm.composes_with.filter(id => dependsSet.has(id));
    if (redundant.length > 0) {
        const lineIdx = fm.rawLines.findIndex(l => l.startsWith("composes_with:"));
        findings.push({
            file: path,
            line: lineIdx >= 0 ? lineIdx + 1 : 1,
            col: 1,
            priority: "P2",
            check: 4,
            message: "Redundant composes_with entries (already in depends_on; depends_on is stronger): " + redundant.sort().join(", "),
        });
    }
    return findings;
}

function walkBacklog(baseDir: string): string[] {
    const out: string[] = [];
    function recurse(dir: string): void {
        for (const entry of readdirSync(dir)) {
            const p = join(dir, entry);
            const st = statSync(p);
            if (st.isDirectory()) recurse(p);
            else if (entry.endsWith(".md") && /^B-\d{4}-/.test(entry)) out.push(p);
        }
    }
    if (statSync(baseDir).isDirectory()) recurse(baseDir);
    return out;
}

function main(): void {
    const args = parseArgs(process.argv.slice(2));
    const files = args.files.length > 0 ? args.files : walkBacklog(args.baseDir);

    const allFindings: Finding[] = [];

    for (const path of files) {
        const fm = parseFrontmatter(path);
        if (!fm) {
            allFindings.push({
                file: path, line: 1, col: 1, priority: "P0", check: 0,
                message: "Failed to parse frontmatter (missing --- delimiters?)",
            });
            continue;
        }
        const refs = extractBodyBLinks(path, fm.headerEnd);
        if (args.checks.has(1)) allFindings.push(...check1_pathPrefix(path, fm, refs));
        if (args.checks.has(2)) allFindings.push(...check2_composesCompleteness(path, fm, refs));
        if (args.checks.has(3)) allFindings.push(...check3_nonSchemaKeys(path, fm));
        if (args.checks.has(4)) allFindings.push(...check4_redundantEdges(path, fm));
    }

    if (allFindings.length === 0) {
        process.stdout.write("OK: 0 findings across " + files.length + " files\n");
        process.exit(0);
    }

    const byFile = new Map<string, Finding[]>();
    for (const f of allFindings) {
        if (!byFile.has(f.file)) byFile.set(f.file, []);
        byFile.get(f.file)!.push(f);
    }

    for (const [file, findings] of byFile) {
        process.stdout.write("\n" + file + ":\n");
        for (const f of findings) {
            process.stdout.write("  " + f.line + ":" + f.col + " [" + f.priority + "] check " + f.check + ": " + f.message + "\n");
        }
    }
    process.stdout.write("\nTotal: " + allFindings.length + " finding(s) across " + byFile.size + " file(s) (of " + files.length + " scanned)\n");

    if (args.strict) process.exit(1);
    process.exit(0);
}

main();
