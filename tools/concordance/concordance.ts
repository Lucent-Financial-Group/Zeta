#!/usr/bin/env bun
// concordance.ts — B-0291
// Text → tokens → concordance index. Structure recognizer
// applied to language.

import { readFileSync, existsSync } from "node:fs";

interface ConcordanceEntry {
    token: string;
    count: number;
    positions: { file: string; line: number; col: number }[];
}

interface ConcordanceIndex {
    schema: string;
    generated: string;
    tokenCount: number;
    uniqueTokens: number;
    entries: ConcordanceEntry[];
}

function tokenize(text: string): string[] {
    return text
        .toLowerCase()
        .replace(/[^a-z0-9'\-\s]/g, " ")
        .split(/\s+/)
        .filter((t) => t.length >= 2);
}

function buildConcordance(files: { path: string; content: string }[]): ConcordanceIndex {
    const index = new Map<string, ConcordanceEntry>();
    let totalTokens = 0;

    for (const { path, content } of files) {
        const lines = content.split("\n");
        for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
            const line = lines[lineIdx]!;
            const tokens = tokenize(line);
            let col = 0;
            for (const token of tokens) {
                totalTokens++;
                col = line.toLowerCase().indexOf(token, col);
                if (!index.has(token)) {
                    index.set(token, { token, count: 0, positions: [] });
                }
                const entry = index.get(token)!;
                entry.count++;
                if (entry.positions.length < 5) {
                    entry.positions.push({ file: path, line: lineIdx + 1, col });
                }
                col += token.length;
            }
        }
    }

    const entries = [...index.values()].sort((a, b) => b.count - a.count);

    return {
        schema: "concordance-v1",
        generated: new Date().toISOString(),
        tokenCount: totalTokens,
        uniqueTokens: entries.length,
        entries,
    };
}

if (import.meta.main) {
    const args = process.argv.slice(2);
    if (args.length === 0) {
        console.log("Usage: bun tools/concordance/concordance.ts <file1> [file2] ...");
        console.log("       bun tools/concordance/concordance.ts --top N <files>");
        process.exit(0);
    }

    let topN = 20;
    const files: { path: string; content: string }[] = [];

    for (let i = 0; i < args.length; i++) {
        if (args[i] === "--top" && args[i + 1]) {
            topN = Number(args[++i]);
        } else if (args[i] === "--json") {
            // handled below
        } else {
            const path = args[i]!;
            if (existsSync(path)) {
                files.push({ path, content: readFileSync(path, "utf8") });
            }
        }
    }

    const index = buildConcordance(files);

    if (args.includes("--json")) {
        console.log(JSON.stringify(index, null, 2));
    } else {
        console.log(`Tokens: ${index.tokenCount} total, ${index.uniqueTokens} unique\n`);
        console.log(`Top ${topN}:`);
        for (const e of index.entries.slice(0, topN)) {
            const locs = e.positions.slice(0, 2).map((p) => `${p.file}:${p.line}`).join(", ");
            console.log(`  ${e.count.toString().padStart(6)} ${e.token.padEnd(20)} ${locs}`);
        }
    }
}

export { buildConcordance, tokenize };

// B-0292 smallest safe slice: Structure recognition surface (stub, GPU-ready)
// Local inference entry point for concordance structure patterns.
// Future slices will wire a concrete local GPU backend (e.g. ONNX Runtime, ML.NET).
// This slice adds the typed surface + safe CPU stub so recognition is testable now.

interface StructurePattern {
    type: "repetition" | "collocation" | "burst";
    tokens: string[];
    frequency: number;
    evidence: string; // e.g. "high co-occurrence in window"
}

function recognizeStructure(index: ConcordanceIndex): StructurePattern[] {
    // Safe stub: detect simple repetition (top tokens appearing > avg)
    // No GPU, no external deps, pure TS. Later replace body with local inference call.
    const avg = index.tokenCount / Math.max(1, index.uniqueTokens);
    const patterns: StructurePattern[] = [];
    for (const e of index.entries.slice(0, 10)) {
        if (e.count > avg * 2) {
            patterns.push({
                type: "repetition",
                tokens: [e.token],
                frequency: e.count,
                evidence: `count ${e.count} > 2x avg`,
            });
        }
    }
    return patterns;
}

export { recognizeStructure, type StructurePattern };
