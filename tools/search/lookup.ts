#!/usr/bin/env bun
// lookup.ts — B-0362
// Entry point: bun tools/search/lookup.ts <term...>
// Supports multi-word AND semantics: all terms must match.
// Run build-index.ts first to create .concept-index.json.

import { lookup, type ConceptIndex } from "./concept-index.js";
import { readFileSync, existsSync } from "node:fs";
import { join, resolve } from "node:path";

const REPO_ROOT = resolve(import.meta.dir, "../..");
const indexPath = join(REPO_ROOT, ".concept-index.json");

if (!existsSync(indexPath)) {
    console.error("No index found. Run: bun tools/search/build-index.ts");
    process.exit(1);
}

const query = process.argv.slice(2).join(" ").trim();
if (!query) {
    console.error("Usage: bun tools/search/lookup.ts <term...>");
    process.exit(1);
}

const index: ConceptIndex = JSON.parse(readFileSync(indexPath, "utf8"));
const start = performance.now();
const results = lookup(index, query);
const elapsed = (performance.now() - start).toFixed(1);

if (results.length === 0) {
    console.log(`No matches for "${query}" (${elapsed}ms)`);
} else {
    console.log(`${results.length} match(es) for "${query}" — ${elapsed}ms\n`);
    for (const r of results) {
        console.log(`[${r.conceptClass}] ${r.term} (${r.hits.length} files)`);
        for (const h of r.hits.slice(0, 5)) {
            console.log(`  ${h.file}:${h.line}`);
        }
        if (r.hits.length > 5) console.log(`  … +${r.hits.length - 5} more`);
    }
}
