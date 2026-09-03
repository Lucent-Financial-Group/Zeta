import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  extractHeadingFirstSentences,
  measureEnglishSeedCoverage,
  parseEnglishSeed,
  validateSeedPacks,
} from "./english-seed-coverage";

const seed = parseEnglishSeed({
  version: "test-v1",
  entries: [
    { id: "thing", exponent: "something", category: "substantive", allolexes: ["thing"], valencyFrames: [] },
    { id: "good", exponent: "good", category: "evaluator", allolexes: [], valencyFrames: [] },
    { id: "not", exponent: "not", category: "logical", allolexes: [], valencyFrames: [] },
  ],
});

test("seed coverage is invariant to source order and retains unknown tokens", () => {
  const sources = [
    { entryId: "b", text: "something is good" },
    { entryId: "a", text: "thing is not blue" },
  ];
  const left = measureEnglishSeedCoverage(seed, sources, [], ["is"]);
  const right = measureEnglishSeedCoverage(seed, [...sources].reverse(), [], ["is"]);
  expect(left).toEqual(right);
  expect(left.entries[0]?.entryId).toBe("a");
  expect(left.entries[0]?.unknownTokens).toEqual(["blue"]);
  expect(left.entries[0]?.status).toBe("Uncovered");
});

test("allolexes match their declared seed identity", () => {
  const report = measureEnglishSeedCoverage(seed, [{ entryId: "allolex", text: "thing is good" }], [], ["is"]);
  expect(report.entries[0]?.matchedSeedIds).toEqual(["good", "thing"]);
  expect(report.entries[0]?.coverage).toBe(1);
});

test("duplicate declared forms and invalid packs fail closed", () => {
  expect(() => parseEnglishSeed({
    version: "bad",
    entries: [
      { id: "a", exponent: "same", category: "x", allolexes: [], valencyFrames: [] },
      { id: "b", exponent: "same", category: "x", allolexes: [], valencyFrames: [] },
    ],
  })).toThrow("ENGLISH-SEED-DUPLICATE-FORM:same");
  expect(() => validateSeedPacks([
    { id: "a", dependsOn: ["b"], entries: [] },
    { id: "b", dependsOn: ["a"], entries: [] },
  ])).toThrow("ENGLISH-SEED-PACK-CYCLE:a");
});

test("heading first-sentence extraction is deterministic and does not invent text", () => {
  const sources = extractHeadingFirstSentences("## First term\nA first sentence. A second sentence.\n\n## Second term\nUnfinished fragment");
  expect(sources).toEqual([
    { entryId: "First term", text: "A first sentence." },
    { entryId: "Second term", text: "Unfinished fragment" },
  ]);
});

test("the declared candidate seed is a finite 65-entry input, not an implicit semantic source", () => {
  const root = resolve(import.meta.dir, "../../..");
  const candidate = parseEnglishSeed(JSON.parse(readFileSync(resolve(root, "docs/linguistic-seed/english/seed.json"), "utf8")) as unknown);
  expect(candidate.version).toBe("nsm-english-candidate-v0");
  expect(candidate.entries).toHaveLength(65);
  expect(new Set(candidate.entries.map((entry) => entry.id)).size).toBe(65);
});

test("a removed declared candidate changes the finite fixture receipt", () => {
  const baseline = measureEnglishSeedCoverage(seed, [{ entryId: "fixture", text: "something is good" }], [], ["is"]);
  const removed = parseEnglishSeed({
    version: "test-v1",
    entries: seed.entries.filter((entry) => entry.id !== "good"),
  });
  const mutant = measureEnglishSeedCoverage(removed, [{ entryId: "fixture", text: "something is good" }], [], ["is"]);
  expect(mutant.totalKnownTokenCount).toBeLessThan(baseline.totalKnownTokenCount);
  expect(mutant.coverage).toBeLessThan(baseline.coverage);
});
