#!/usr/bin/env bun
// concept-index.ts — B-0362 (smallest safe slice, re-decomposed)
// Materialized concept index: regex standing queries over the
// corpus produce a term->file mapping. Lookup is sub-second; rebuild ~11s.
//
// Guardrails (Vera 2026-05-09):
// 1. Curated, not corpus-wide — add query classes deliberately
// 2. Each query class needs a name and provenance (when/why added)
// 3. New connections become queries only after earning a term +
//    memory/backlog anchor
// 4. Size gate: if .concept-index.json exceeds 5MB, the queries
//    have drifted toward full-text — tighten the regexes

import { readdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { join, resolve, relative } from "node:path";

const REPO_ROOT = resolve(import.meta.dir, "../..");

const SCAN_DIRS = [
    "memory",
    "docs",
    ".claude/skills",
    ".claude/rules",
    ".claude/agents",
];

const CONCEPT_QUERIES: [string, RegExp][] = [
    ["alignment-clause", /\b(HC-[1-7]|SD-[1-9]|DIR-[1-5])\b/g],
    ["best-practice", /\b(BP-\d+)\b/g],
    ["otto-principle", /\b(Otto-\d+)\b/g],
    ["backlog-item", /\b(B-\d{4})\b/g],
    ["named-pattern", /\b(Confucius[- ]unfold|consensus[- ]smoothness|razor[- ]discipline|glass[- ]halo|retraction[- ]native|shield[- ]synthesis|superfluid|bidirectional[- ]alignment)\b/gi],
    ["lineage-anchor", /\b(Pearl|Hoare|Milner|Hejlsberg|Syme|Budiu|Lamport|Bernstein|Hadfield[- ]Menell|Honda|Yoshida|Carbone)\b/g],
    ["shadow-class", /\b(confident[- ]fabrication|narration[- ]over[- ]action|consensus[- ]smoothness|effort[- ]avoidance|narrative[- ]laundering|escalation[- ]cascade|pattern[- ]blindness|asking[- ]over[- ]checking)\b/gi],
    ["formal-tool", /\b(Z3|TLA\+|Lean\s*4|Alloy|FsCheck|Stryker|Semgrep|CodeQL)\b/g],
];

interface IndexEntry {
    conceptClass: string;
    term: string;
    hits: { file: string; line: number }[];
}

interface ConceptIndex {
    schema: string;
    generated: string;
    scanDirs: string[];
    queryCount: number;
    entryCount: number;
    entries: IndexEntry[];
}

function scanFiles(dir: string): string[] {
    const abs = join(REPO_ROOT, dir);
    if (!existsSync(abs)) return [];
    const results: string[] = [];
    function walk(d: string): void {
        for (const entry of readdirSync(d, { withFileTypes: true })) {
            const p = join(d, entry.name);
            if (entry.isDirectory()) {
                if (entry.name === "node_modules" || entry.name === "obj") continue;
                walk(p);
            } else if (entry.name.endsWith(".md")) {
                results.push(relative(REPO_ROOT, p));
            }
        }
    }
    walk(abs);
    return results;
}

function buildIndex(): ConceptIndex {
    const allFiles: string[] = [];
    for (const dir of SCAN_DIRS) {
        allFiles.push(...scanFiles(dir));
    }

    const hitMap = new Map<string, Map<string, number>>();

    for (const file of allFiles) {
        const content = readFileSync(join(REPO_ROOT, file), "utf8");
        const lines = content.split("\n");

        for (const [conceptClass, pattern] of CONCEPT_QUERIES) {
            const re = new RegExp(pattern.source, pattern.flags);
            for (let i = 0; i < lines.length; i++) {
                let match: RegExpExecArray | null;
                while ((match = re.exec(lines[i]!)) !== null) {
                    const term = match[1]?.toLowerCase() ?? match[0]!.toLowerCase();
                    const key = `${conceptClass}::${term}`;
                    if (!hitMap.has(key)) hitMap.set(key, new Map());
                    const fileMap = hitMap.get(key)!;
                    if (!fileMap.has(file)) fileMap.set(file, i + 1);
                }
            }
        }
    }

    const entries: IndexEntry[] = [];
    for (const [key, fileMap] of hitMap) {
        const [conceptClass, term] = key.split("::");
        const hits = [...fileMap.entries()].map(([file, line]) => ({ file, line }));
        entries.push({ conceptClass: conceptClass!, term: term!, hits });
    }

    entries.sort((a, b) =>
        a.conceptClass.localeCompare(b.conceptClass) || a.term.localeCompare(b.term),
    );

    return {
        schema: "concept-index-v1",
        generated: new Date().toISOString(),
        scanDirs: SCAN_DIRS,
        queryCount: CONCEPT_QUERIES.length,
        entryCount: entries.length,
        entries,
    };
}

function lookup(index: ConceptIndex, query: string): IndexEntry[] {
    const q = query.toLowerCase();
    return index.entries.filter(
        (e) => e.term.includes(q) || e.conceptClass.includes(q),
    );
}

if (import.meta.main) {
    const args = process.argv.slice(2);

    if (args[0] === "--build" || args.length === 0) {
        const index = buildIndex();
        const outPath = join(REPO_ROOT, ".concept-index.json");
        writeFileSync(outPath, JSON.stringify(index, null, 2));
        const sizeKB = (Buffer.byteLength(JSON.stringify(index)) / 1024).toFixed(0);
        const totalHits = index.entries.reduce((s, e) => s + e.hits.length, 0);
        console.log(`Built: ${index.entryCount} entries, ${sizeKB}KB, ${totalHits} total hits`);
    } else {
        const indexPath = join(REPO_ROOT, ".concept-index.json");
        if (!existsSync(indexPath)) {
            console.error("No index found. Run: bun tools/search/concept-index.ts --build");
            process.exit(1);
        }
        const index: ConceptIndex = JSON.parse(readFileSync(indexPath, "utf8"));
        const query = args.join(" ");
        const results = lookup(index, query);
        if (results.length === 0) {
            console.log(`No matches for "${query}"`);
        } else {
            for (const r of results) {
                console.log(`[${r.conceptClass}] ${r.term} (${r.hits.length} files)`);
                for (const h of r.hits.slice(0, 5)) {
                    console.log(`  ${h.file}:${h.line}`);
                }
                if (r.hits.length > 5) console.log(`  ... +${r.hits.length - 5} more`);
            }
        }
    }
}

export { buildIndex, lookup };
