/** Deterministic CLI for the declared English-seed lexical coverage audit. */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  extractHeadingFirstSentences,
  measureEnglishSeedCoverage,
  parseEnglishSeed,
} from "./english-seed-coverage";

function main(): void {
  const [seedPath, ...markdownPaths] = process.argv.slice(2);
  if (seedPath === undefined || markdownPaths.length === 0) {
    console.error("usage: bun english-seed-coverage-report.ts <seed.json> <markdown>...");
    process.exit(2);
  }
  const seed = parseEnglishSeed(JSON.parse(readFileSync(resolve(seedPath), "utf8")) as unknown);
  const sources = markdownPaths.flatMap((path) => extractHeadingFirstSentences(readFileSync(resolve(path), "utf8")));
  const report = measureEnglishSeedCoverage(seed, sources, [], ["a", "an", "the", "of", "to", "in", "on", "at", "with", "from", "for", "and", "or"]);
  console.log(JSON.stringify(report, null, 2));
}

if (import.meta.main) main();
