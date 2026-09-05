import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  measureEnglishSeedCoverage,
  parseEnglishSeed,
  extractHeadingFirstSentences,
} from "../../../src/Core.TypeScript/research/english-seed-coverage";

interface CoverageSummary {
  readonly seedVersion: string;
  readonly entryCount: number;
  readonly totalConsideredTokenCount: number;
  readonly totalKnownTokenCount: number;
  readonly coverage: number;
}

interface OracleReport {
  readonly coverage: CoverageSummary;
  readonly fixture: CoverageSummary;
  readonly removedGoodMutation: CoverageSummary;
}

function parseSummary(value: unknown, code: string): CoverageSummary {
  if (typeof value !== "object" || value === null) throw new Error(code);
  const record = value as Record<string, unknown>;
  if (typeof record.seedVersion !== "string" || typeof record.entryCount !== "number" || typeof record.totalConsideredTokenCount !== "number" || typeof record.totalKnownTokenCount !== "number" || typeof record.coverage !== "number") {
    throw new Error(code);
  }
  if (![record.entryCount, record.totalConsideredTokenCount, record.totalKnownTokenCount, record.coverage].every(Number.isFinite)) throw new Error(code);
  return {
    seedVersion: record.seedVersion,
    entryCount: record.entryCount,
    totalConsideredTokenCount: record.totalConsideredTokenCount,
    totalKnownTokenCount: record.totalKnownTokenCount,
    coverage: record.coverage,
  };
}

function parseOracle(value: unknown): OracleReport {
  if (typeof value !== "object" || value === null) throw new Error("ENGLISH-SEED-PYTHON-SCHEMA");
  const record = value as Record<string, unknown>;
  return {
    coverage: parseSummary(record.coverage, "ENGLISH-SEED-PYTHON-COVERAGE-SCHEMA"),
    fixture: parseSummary(record.fixture, "ENGLISH-SEED-PYTHON-FIXTURE-SCHEMA"),
    removedGoodMutation: parseSummary(record.removedGoodMutation, "ENGLISH-SEED-PYTHON-MUTATION-SCHEMA"),
  };
}

function close(left: number, right: number): boolean {
  return Number.isFinite(left) && Number.isFinite(right) && Math.abs(left - right) <= 1e-15;
}

function compare(name: string, expected: CoverageSummary, actual: CoverageSummary, failures: string[]): void {
  if (expected.seedVersion !== actual.seedVersion) failures.push(`${name}:seed-version`);
  for (const field of ["entryCount", "totalConsideredTokenCount", "totalKnownTokenCount"] as const) {
    if (expected[field] !== actual[field]) failures.push(`${name}:${field}`);
  }
  if (!close(expected.coverage, actual.coverage)) failures.push(`${name}:coverage`);
}

function summarize(report: ReturnType<typeof measureEnglishSeedCoverage>): CoverageSummary {
  return {
    seedVersion: report.seedVersion,
    entryCount: report.entries.length,
    totalConsideredTokenCount: report.totalConsideredTokenCount,
    totalKnownTokenCount: report.totalKnownTokenCount,
    coverage: report.coverage,
  };
}

const root = resolve(import.meta.dir, "../../..");
const seed = parseEnglishSeed(JSON.parse(readFileSync(resolve(root, "docs/linguistic-seed/english/seed.json"), "utf8")) as unknown);
const sources = [
  ...extractHeadingFirstSentences(readFileSync(resolve(root, "docs/GLOSSARY.md"), "utf8")),
  ...extractHeadingFirstSentences(readFileSync(resolve(root, "docs/SEED-VOCABULARY.md"), "utf8")),
];
const allowances = ["a", "an", "the", "of", "to", "in", "on", "at", "with", "from", "for", "and", "or"];
const measured = measureEnglishSeedCoverage(seed, sources, [], allowances);
const fixture = measureEnglishSeedCoverage(seed, [{ entryId: "fixture", text: "something is good" }], [], allowances);
const processResult = Bun.spawnSync(["python3", resolve(import.meta.dir, "english_seed_coverage_oracle.py")], { cwd: root, stdout: "pipe", stderr: "pipe" });
if (processResult.exitCode !== 0) throw new Error(`ENGLISH-SEED-PYTHON-FAILED:${processResult.stderr.toString().trim()}`);
const oracle = parseOracle(JSON.parse(processResult.stdout.toString()) as unknown);
const failures: string[] = [];
compare("coverage", oracle.coverage, summarize(measured), failures);
compare("fixture", oracle.fixture, summarize(fixture), failures);
if (oracle.removedGoodMutation.totalKnownTokenCount >= oracle.fixture.totalKnownTokenCount || oracle.removedGoodMutation.coverage >= oracle.fixture.coverage) {
  failures.push("removed-good-mutation-not-detected");
}
console.log(`English-seed coverage cross-verification: 2 receipts; removed-good mutation ${failures.includes("removed-good-mutation-not-detected") ? "not-detected" : "detected"}; failures ${String(failures.length)}`);
if (failures.length > 0) {
  for (const failure of failures) console.error(failure);
  process.exit(1);
}
