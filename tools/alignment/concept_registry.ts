#!/usr/bin/env bun
// concept_registry.ts - B-0310 load-bearing concept registry extractor.
//
// Emits a machine-readable inventory of alignment clauses, best-practice
// rules, Otto principles, and glass-halo doctrines.
//
// Usage:
//   bun tools/alignment/concept_registry.ts
//   bun tools/alignment/concept_registry.ts --help
//
// Exit codes: 0 clean / 2 script error or bad args.

import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

type ConceptRegistryExitCode = 0 | 2;

export type ConceptClass =
  | "alignment-clause"
  | "best-practice"
  | "otto-principle"
  | "glass-halo-doctrine";

export interface Concept {
  readonly id: string;
  readonly class: ConceptClass;
  readonly source: string;
  readonly label: string;
}

export interface ConceptRegistry {
  readonly schema: "concept-registry-v1";
  readonly generated: string;
  readonly concepts: readonly Concept[];
}

export interface SourceText {
  readonly path: string;
  readonly content: string;
}

export const ALL_ALIGNMENT_CLAUSES: readonly string[] = [
  "HC-1", "HC-2", "HC-3", "HC-4", "HC-5", "HC-6", "HC-7",
  "SD-1", "SD-2", "SD-3", "SD-4", "SD-5", "SD-6", "SD-7", "SD-8", "SD-9",
  "DIR-1", "DIR-2", "DIR-3", "DIR-4", "DIR-5",
] as const;

interface GlassHaloDoctrine {
  readonly id: string;
  readonly label: string;
  readonly patterns: readonly RegExp[];
}

const GLASS_HALO_DOCTRINES: readonly GlassHaloDoctrine[] = [
  {
    id: "radical-honesty",
    label: "Truth over politeness / radical honesty",
    patterns: [/\bradical honesty\b/i, /\bTruth over politeness\b/i],
  },
  {
    id: "total-observability",
    label: "Total observability / visible audit trail",
    patterns: [/\btotal observability\b/i, /\bsubstrate or it didn't happen\b/i],
  },
  {
    id: "no-hidden-reasoning",
    label: "No hidden reasoning",
    patterns: [/\bno hidden reasoning\b/i, /\binspectable\b[^.\n]*reasoning\b/i],
  },
  {
    id: "glass-halo-discipline",
    label: "Glass halo discipline",
    patterns: [/\bGlass halo discipline\b/i, /\bglass halo\b/i],
  },
] as const;

function byteCompare(a: string, b: string): number {
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
}

function repoRoot(): string {
  // eslint-disable-next-line sonarjs/no-os-command-from-path
  const result = spawnSync("git", ["rev-parse", "--show-toplevel"], {
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
  });
  if (result.error) throw new Error(`git rev-parse failed: ${result.error.message}`);
  if (result.status !== 0) throw new Error(`git rev-parse exited with status ${String(result.status)}`);
  return result.stdout.trim();
}

function cleanLabel(label: string): string {
  return label
    .replaceAll("`", "")
    .replaceAll("*", "")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/[.。]+$/, "");
}

function lineLabel(line: string, fallback: string): string {
  const cleaned = cleanLabel(line.replace(/^[-#\s]+/, ""));
  return cleaned.length > 0 ? cleaned.slice(0, 160) : fallback;
}

function readSource(root: string, path: string): SourceText | null {
  const full = join(root, path);
  if (!existsSync(full)) return null;
  return { path, content: readFileSync(full, "utf8") };
}

function readFeedbackSources(root: string): readonly SourceText[] {
  const dir = join(root, "memory");
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.startsWith("feedback_") && entry.name.endsWith(".md"))
    .map((entry) => `memory/${entry.name}`)
    .sort(byteCompare)
    .map((path) => readSource(root, path))
    .filter((source): source is SourceText => source !== null);
}

export function extractAlignmentClauses(content: string, source = "docs/ALIGNMENT.md"): readonly Concept[] {
  const found = new Map<string, Concept>();
  const heading = /^###\s+(HC-[1-7]|SD-[1-9]|DIR-[1-5])\s+(.+)$/gm;
  let match: RegExpExecArray | null;
  while ((match = heading.exec(content)) !== null) {
    const id = match[1];
    const label = match[2];
    if (id === undefined || label === undefined) continue;
    found.set(id, {
      id,
      class: "alignment-clause",
      source,
      label: cleanLabel(label),
    });
  }
  return ALL_ALIGNMENT_CLAUSES
    .map((id) => found.get(id))
    .filter((concept): concept is Concept => concept !== undefined);
}

export function extractBestPractices(content: string, source = "docs/AGENT-BEST-PRACTICES.md"): readonly Concept[] {
  const found = new Map<string, Concept>();
  const ruleLine = /^-\s+\*\*(BP-(?:\d{2}|WINDOW))\*\*\s+\*?([^\n*]+(?:\*[^\n*]+)?)?/gm;
  let match: RegExpExecArray | null;
  while ((match = ruleLine.exec(content)) !== null) {
    const id = match[1];
    const rawLabel = match[2] ?? id;
    if (id === undefined) continue;
    found.set(id, {
      id,
      class: "best-practice",
      source,
      label: cleanLabel(rawLabel),
    });
  }
  return [...found.values()].sort((a, b) => byteCompare(a.id, b.id));
}

export function extractOttoPrinciples(sources: readonly SourceText[]): readonly Concept[] {
  const found = new Map<string, Concept>();
  const idPattern = /\bOtto-(\d{2,4})\b/g;
  for (const source of sources) {
    const lines = source.content.split(/\r?\n/);
    for (const line of lines) {
      let match: RegExpExecArray | null;
      while ((match = idPattern.exec(line)) !== null) {
        const numeric = match[1];
        if (numeric === undefined) continue;
        const id = `Otto-${numeric}`;
        if (found.has(id)) continue;
        found.set(id, {
          id,
          class: "otto-principle",
          source: source.path,
          label: lineLabel(line, id),
        });
      }
    }
  }
  return [...found.values()].sort((a, b) => {
    const aNum = Number(a.id.slice("Otto-".length));
    const bNum = Number(b.id.slice("Otto-".length));
    return aNum - bNum;
  });
}

export function extractGlassHaloDoctrines(sources: readonly SourceText[]): readonly Concept[] {
  const concepts: Concept[] = [];
  for (const doctrine of GLASS_HALO_DOCTRINES) {
    const match = sources.find((source) =>
      doctrine.patterns.some((pattern) => pattern.test(source.content)),
    );
    if (match === undefined) continue;
    concepts.push({
      id: doctrine.id,
      class: "glass-halo-doctrine",
      source: match.path,
      label: doctrine.label,
    });
  }
  return concepts;
}

function loadRegistrySources(root: string): {
  readonly alignment: SourceText | null;
  readonly bestPractices: SourceText | null;
  readonly otto: readonly SourceText[];
  readonly glassHalo: readonly SourceText[];
} {
  const alignment = readSource(root, "docs/ALIGNMENT.md");
  const bestPractices = readSource(root, "docs/AGENT-BEST-PRACTICES.md");
  const claude = readSource(root, "CLAUDE.md");
  const agents = readSource(root, "AGENTS.md");
  const ottoSources = [claude, ...readFeedbackSources(root)]
    .filter((source): source is SourceText => source !== null);
  const glassHaloSources = [agents, alignment]
    .filter((source): source is SourceText => source !== null);
  return { alignment, bestPractices, otto: ottoSources, glassHalo: glassHaloSources };
}

export function buildRegistry(generated = new Date().toISOString(), root = repoRoot()): ConceptRegistry {
  const sources = loadRegistrySources(root);
  const concepts: Concept[] = [];
  if (sources.alignment !== null) {
    concepts.push(...extractAlignmentClauses(sources.alignment.content, sources.alignment.path));
  }
  if (sources.bestPractices !== null) {
    concepts.push(...extractBestPractices(sources.bestPractices.content, sources.bestPractices.path));
  }
  concepts.push(...extractOttoPrinciples(sources.otto));
  concepts.push(...extractGlassHaloDoctrines(sources.glassHalo));
  concepts.sort((a, b) => byteCompare(`${a.class}:${a.id}`, `${b.class}:${b.id}`));
  return {
    schema: "concept-registry-v1",
    generated,
    concepts,
  };
}

function printHelp(): void {
  console.log(`concept_registry.ts - emit B-0310 concept registry JSON

Usage:
  bun tools/alignment/concept_registry.ts
  bun tools/alignment/concept_registry.ts --help`);
}

export function main(argv: readonly string[] = Bun.argv.slice(2)): ConceptRegistryExitCode {
  if (argv.length === 1 && (argv[0] === "--help" || argv[0] === "-h")) {
    printHelp();
    return 0;
  }
  if (argv.length > 0) {
    console.error(`concept_registry.ts: unknown arg: ${argv[0] ?? ""}`);
    return 2;
  }
  console.log(JSON.stringify(buildRegistry(), null, 2));
  return 0;
}

if (import.meta.main) {
  process.exit(main());
}
