#!/usr/bin/env bun
// concept_registry.ts — B-0310
// Extracts load-bearing concept IDs from source surfaces into
// a single JSON registry.

import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";

const REPO_ROOT = resolve(import.meta.dir, "../..");

interface Concept {
    id: string;
    conceptClass: string;
    source: string;
    label: string;
}

interface Registry {
    schema: string;
    generated: string;
    concepts: Concept[];
    summary: Record<string, number>;
}

function readFile(rel: string): string {
    const abs = join(REPO_ROOT, rel);
    return existsSync(abs) ? readFileSync(abs, "utf8") : "";
}

function lineAt(content: string, index: number): string {
    const lineIdx = content.lastIndexOf("\n", index);
    const lineEnd = content.indexOf("\n", index);
    return content.slice(lineIdx + 1, lineEnd > 0 ? lineEnd : undefined).trim();
}

function extractByRegex(
    surface: string,
    pattern: RegExp,
    conceptClass: string,
): Concept[] {
    const content = readFile(surface);
    const concepts: Concept[] = [];
    const seen = new Set<string>();
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(content)) !== null) {
        const id = match[1]!;
        if (seen.has(id)) continue;
        seen.add(id);
        concepts.push({
            id,
            conceptClass,
            source: surface,
            label: lineAt(content, match.index).slice(0, 120),
        });
    }
    return concepts;
}

function extractGlassHaloDoctrines(): Concept[] {
    const concepts: Concept[] = [];
    const doctrines = [
        { id: "radical-honesty", pattern: /radical.honesty/i },
        { id: "total-observability", pattern: /total.observability/i },
        { id: "glass-halo", pattern: /glass.halo/i },
        { id: "retraction-native", pattern: /retraction.native/i },
        { id: "substrate-or-it-didnt-happen", pattern: /substrate.or.it.didn/i },
        { id: "no-directives", pattern: /no.directives/i },
        { id: "bidirectional-alignment", pattern: /bidirectional.alignment/i },
    ];

    const surfaces = ["AGENTS.md", "docs/ALIGNMENT.md"];

    for (const { id, pattern } of doctrines) {
        for (const surface of surfaces) {
            const content = readFile(surface);
            const match = content.match(pattern);
            if (match) {
                concepts.push({
                    id,
                    conceptClass: "glass-halo-doctrine",
                    source: surface,
                    label: lineAt(content, match.index!).slice(0, 120),
                });
                break;
            }
        }
    }

    return concepts;
}

function buildRegistry(): Registry {
    const concepts = [
        ...extractByRegex("docs/ALIGNMENT.md", /\b(HC-[1-7]|SD-[1-9]|DIR-[1-5])\b/g, "alignment-clause"),
        ...extractByRegex("docs/AGENT-BEST-PRACTICES.md", /\b(BP-\d+)\b/g, "best-practice"),
        ...extractByRegex("CLAUDE.md", /\b(Otto-\d+)\b/g, "otto-principle"),
        ...extractByRegex("AGENTS.md", /\b(Otto-\d+)\b/g, "otto-principle"),
        ...extractGlassHaloDoctrines(),
    ];

    const deduped = concepts.filter(
        (c, i, arr) => arr.findIndex((x) => x.id === c.id) === i,
    );

    const summary: Record<string, number> = {};
    for (const c of deduped) {
        summary[c.conceptClass] = (summary[c.conceptClass] ?? 0) + 1;
    }

    return {
        schema: "concept-registry-v1",
        generated: new Date().toISOString(),
        concepts: deduped,
        summary,
    };
}

if (import.meta.main) {
    const registry = buildRegistry();
    console.log(JSON.stringify(registry, null, 2));
}

export { buildRegistry, extractByRegex, extractGlassHaloDoctrines };
