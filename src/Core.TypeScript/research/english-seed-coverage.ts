/**
 * Finite English-seed coverage audit.
 *
 * Design boundary: this is deterministic lexical matching over declared data. It
 * does not parse English meaning, provide a semantic model, or establish that the
 * candidate seed is universal, irreducible, or adequate for any natural language.
 */

export const ENGLISH_SEED_COVERAGE_ALGORITHM = "declared-english-seed-coverage/v1";

export interface SeedEntry {
  readonly id: string;
  readonly exponent: string;
  readonly category: string;
  readonly allolexes: readonly string[];
  readonly valencyFrames: readonly string[];
}

export interface EnglishSeed {
  readonly version: string;
  readonly entries: readonly SeedEntry[];
}

export interface SeedPack {
  readonly id: string;
  readonly dependsOn: readonly string[];
  readonly entries: readonly SeedEntry[];
}

export interface CoverageSource {
  readonly entryId: string;
  readonly text: string;
}

export interface CoverageEntry {
  readonly entryId: string;
  readonly tokens: readonly string[];
  readonly matchedSeedIds: readonly string[];
  readonly unknownTokens: readonly string[];
  readonly consideredTokenCount: number;
  readonly knownTokenCount: number;
  readonly coverage: number;
  readonly status: "Covered" | "Uncovered";
}

export interface CoverageReport {
  readonly algorithm: typeof ENGLISH_SEED_COVERAGE_ALGORITHM;
  readonly seedVersion: string;
  readonly packIds: readonly string[];
  readonly entries: readonly CoverageEntry[];
  readonly totalConsideredTokenCount: number;
  readonly totalKnownTokenCount: number;
  readonly coverage: number;
}

interface Lexeme {
  readonly seedId: string;
  readonly tokens: readonly string[];
}

function objectRecord(value: unknown, code: string): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) throw new Error(code);
  return value as Record<string, unknown>;
}

function strings(value: unknown, code: string): readonly string[] {
  if (!Array.isArray(value) || !value.every((item) => typeof item === "string" && item.length > 0)) throw new Error(code);
  return value;
}

function seedEntry(value: unknown, code: string): SeedEntry {
  const record = objectRecord(value, code);
  if (typeof record.id !== "string" || record.id.length === 0 || typeof record.exponent !== "string" || record.exponent.length === 0 || typeof record.category !== "string" || record.category.length === 0) {
    throw new Error(code);
  }
  return {
    id: record.id,
    exponent: record.exponent,
    category: record.category,
    allolexes: strings(record.allolexes, code),
    valencyFrames: strings(record.valencyFrames, code),
  };
}

export function parseEnglishSeed(value: unknown): EnglishSeed {
  const record = objectRecord(value, "ENGLISH-SEED-SCHEMA");
  if (typeof record.version !== "string" || record.version.length === 0 || !Array.isArray(record.entries)) throw new Error("ENGLISH-SEED-SCHEMA");
  const entries = record.entries.map((entry) => seedEntry(entry, "ENGLISH-SEED-ENTRY-SCHEMA"));
  validateEntries(entries, "ENGLISH-SEED");
  return { version: record.version, entries };
}

export function tokenizeEnglishSeedText(text: string): readonly string[] {
  return text.normalize("NFKC").toLowerCase().match(/[\p{L}\p{N}]+(?:['’-][\p{L}\p{N}]+)*/gu) ?? [];
}

function validateEntries(entries: readonly SeedEntry[], prefix: string): void {
  const ids = new Set<string>();
  const forms = new Set<string>();
  for (const entry of entries) {
    if (ids.has(entry.id)) throw new Error(`${prefix}-DUPLICATE-ID:${entry.id}`);
    ids.add(entry.id);
    const entryForms = [entry.exponent, ...entry.allolexes];
    for (const form of entryForms) {
      const normalized = tokenizeEnglishSeedText(form).join(" ");
      if (normalized.length === 0) throw new Error(`${prefix}-EMPTY-FORM:${entry.id}`);
      if (forms.has(normalized)) throw new Error(`${prefix}-DUPLICATE-FORM:${normalized}`);
      forms.add(normalized);
    }
  }
}

export function validateSeedPacks(packs: readonly SeedPack[]): readonly SeedPack[] {
  const byId = new Map<string, SeedPack>();
  for (const pack of packs) {
    if (byId.has(pack.id)) throw new Error(`ENGLISH-SEED-PACK-DUPLICATE-ID:${pack.id}`);
    validateEntries(pack.entries, `ENGLISH-SEED-PACK:${pack.id}`);
    byId.set(pack.id, pack);
  }
  const visiting = new Set<string>();
  const visited = new Set<string>();
  const visit = (id: string): void => {
    const pack = byId.get(id);
    if (pack === undefined) throw new Error(`ENGLISH-SEED-PACK-UNKNOWN:${id}`);
    if (visiting.has(id)) throw new Error(`ENGLISH-SEED-PACK-CYCLE:${id}`);
    if (visited.has(id)) return;
    visiting.add(id);
    for (const dependency of pack.dependsOn) visit(dependency);
    visiting.delete(id);
    visited.add(id);
  };
  for (const id of [...byId.keys()].sort()) visit(id);
  return [...byId.values()].sort((left, right) => ordinalCompare(left.id, right.id));
}

function ordinalCompare(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function allLexemes(seed: EnglishSeed, packs: readonly SeedPack[]): readonly Lexeme[] {
  const entries = [...seed.entries, ...packs.flatMap((pack) => pack.entries)];
  validateEntries(entries, "ENGLISH-SEED-COMBINED");
  return entries
    .flatMap((entry) => [entry.exponent, ...entry.allolexes].map((form) => ({ seedId: entry.id, tokens: tokenizeEnglishSeedText(form) })))
    .sort((left, right) => right.tokens.length - left.tokens.length || ordinalCompare(left.seedId, right.seedId));
}

function startsAt(tokens: readonly string[], index: number, candidate: readonly string[]): boolean {
  return candidate.every((token, offset) => tokens[index + offset] === token);
}

function coverageEntry(source: CoverageSource, lexemes: readonly Lexeme[], allowances: ReadonlySet<string>): CoverageEntry {
  const tokens = tokenizeEnglishSeedText(source.text);
  const unknownTokens: string[] = [];
  const matchedSeedIds = new Set<string>();
  let knownTokenCount = 0;
  for (let index = 0; index < tokens.length;) {
    const match = lexemes.find((candidate) => startsAt(tokens, index, candidate.tokens));
    if (match !== undefined) {
      matchedSeedIds.add(match.seedId);
      knownTokenCount += match.tokens.length;
      index += match.tokens.length;
    } else {
      const token = tokens[index];
      if (token === undefined) throw new Error("ENGLISH-SEED-TOKEN-INDEX");
      if (allowances.has(token)) knownTokenCount += 1;
      else unknownTokens.push(token);
      index += 1;
    }
  }
  const consideredTokenCount = tokens.length;
  const coverage = consideredTokenCount === 0 ? 0 : knownTokenCount / consideredTokenCount;
  return {
    entryId: source.entryId,
    tokens,
    matchedSeedIds: [...matchedSeedIds].sort(ordinalCompare),
    unknownTokens,
    consideredTokenCount,
    knownTokenCount,
    coverage,
    status: unknownTokens.length === 0 && consideredTokenCount > 0 ? "Covered" : "Uncovered",
  };
}

export function measureEnglishSeedCoverage(
  seed: EnglishSeed,
  sources: readonly CoverageSource[],
  packs: readonly SeedPack[] = [],
  structuralAllowances: readonly string[] = [],
): CoverageReport {
  validateEntries(seed.entries, "ENGLISH-SEED");
  const validatedPacks = validateSeedPacks(packs);
  const allowances = new Set(structuralAllowances.flatMap(tokenizeEnglishSeedText));
  const entries = [...sources]
    .sort((left, right) => ordinalCompare(left.entryId, right.entryId))
    .map((source) => coverageEntry(source, allLexemes(seed, validatedPacks), allowances));
  const totalConsideredTokenCount = entries.reduce((sum, entry) => sum + entry.consideredTokenCount, 0);
  const totalKnownTokenCount = entries.reduce((sum, entry) => sum + entry.knownTokenCount, 0);
  return {
    algorithm: ENGLISH_SEED_COVERAGE_ALGORITHM,
    seedVersion: seed.version,
    packIds: validatedPacks.map((pack) => pack.id),
    entries,
    totalConsideredTokenCount,
    totalKnownTokenCount,
    coverage: totalConsideredTokenCount === 0 ? 0 : totalKnownTokenCount / totalConsideredTokenCount,
  };
}

export function extractHeadingFirstSentences(markdown: string): readonly CoverageSource[] {
  const lines = markdown.split(/\r?\n/);
  const entries: CoverageSource[] = [];
  let heading: string | undefined;
  let body: string[] = [];
  const emit = (): void => {
    if (heading === undefined) return;
    const first = body.join(" ").trim().match(/^(.+?[.!?])(?:\s|$)/)?.[1] ?? body.join(" ").trim();
    entries.push({ entryId: heading, text: first });
  };
  for (const line of lines) {
    const match = /^#{2,4}\s+(.+?)\s*$/.exec(line);
    if (match?.[1] !== undefined) {
      emit();
      heading = match[1];
      body = [];
    } else if (heading !== undefined && line.trim().length > 0 && !line.trimStart().startsWith("<!--")) {
      body.push(line.trim());
    }
  }
  emit();
  return entries;
}
