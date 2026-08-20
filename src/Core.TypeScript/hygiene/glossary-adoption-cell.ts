/**
 * The glossary/corpus cell — vocabulary drift as a number instead of a feeling.
 *
 * Aaron 2026-08-20: "i track goossary toucing too this is the implict control
 * structure" and "these glossary vs stop works expansion is our yinyang cell in
 * human language rather than computer langugage".
 *
 * TWO HALVES, and neither is the good direction -- health is the TENSION:
 *
 *   COINED-NOT-ADOPTED  a glossary entry the corpus barely uses. The coinage did
 *                       not take. Left alone it is private vocabulary, which is
 *                       the rho -> 0 / Babel edge.
 *   USED-NOT-DEFINED    a term the corpus leans on with no glossary entry. This
 *                       is the "stop words contain the culture" half: the words
 *                       carrying the most shared meaning are exactly the ones
 *                       nobody stopped to define.
 *
 * WHY NO STOP-WORD LIST. Classical IR would tokenize and discard high-frequency
 * words, which here would discard the culture itself. Instead the candidate set is
 * restricted to HYPHENATED LOWERCASE COMPOUNDS (weight-free, byte-lock,
 * glass-halo, scale-free). Repo jargon is overwhelmingly of that shape and
 * ordinary English is not, so the filter is structural rather than a judgement
 * about which words matter -- the same move as using a trigram index to avoid
 * tokenizing at all.
 *
 * Register: UNMETERED. The counts are exact. That they measure "vocabulary
 * health" is a proxy and unvalidated. There is deliberately NO threshold and NO
 * gate: a ratchet on either half is trivially gamed (define junk terms to raise
 * one, delete entries to raise the other).
 */

/** A term is a hyphenated lowercase compound: two or more segments. */
export const TERM_RE = /\b[a-z][a-z0-9]*(?:-[a-z][a-z0-9]*)+\b/g;

/** Glossary headings, e.g. "### Weight-free" or "## Byte-lock". */
export function glossaryTerms(glossaryMd: string): Set<string> {
  const out = new Set<string>();
  for (const line of glossaryMd.split(/\r?\n/)) {
    const m = /^#{2,4}\s+(.+?)\s*$/.exec(line);
    if (!m?.[1]) continue;
    const heading = m[1].toLowerCase();
    for (const t of heading.match(TERM_RE) ?? []) out.add(t);
    // also accept a two-word heading joined by a space as its hyphenated form
    const spaced = heading
      .replace(/[^a-z0-9 ]/g, "")
      .trim()
      .split(/\s+/);
    if (spaced.length === 2 && spaced[0] && spaced[1]) out.add(`${spaced[0]}-${spaced[1]}`);
  }
  return out;
}

export function countTerms(sources: readonly string[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const src of sources) {
    for (const t of src.toLowerCase().match(TERM_RE) ?? []) {
      counts.set(t, (counts.get(t) ?? 0) + 1);
    }
  }
  return counts;
}

/**
 * Repo PLUMBING, not vocabulary: AgencySignature trailer keys and CI/forge nouns.
 * These dominate the frequency head for a boring reason -- every commit repeats
 * them -- and counting them as "culture nobody defined" would be a false positive.
 * Excluded EXPLICITLY and reported separately rather than silently dropped, so the
 * filter is auditable instead of being a thumb on the scale.
 */
export const PLUMBING = new Set([
  "agency-signature-version",
  "agent-runtime",
  "action-mode",
  "human-review",
  "human-review-evidence",
  "credential-identity",
  "credential-mode",
  "co-authored-by",
  "pr-review",
  "pr-reviews",
  "archive-pr-reviews",
  "github-actions",
  "lucent-financial-group",
  "re-runs",
  "re-reviewed",
  "post-fix",
]);

export interface Cell {
  /** glossary terms the corpus uses at most `quietBelow` times */
  readonly coinedNotAdopted: ReadonlyArray<readonly [string, number]>;
  /** corpus terms used at least `loudAbove` times with no glossary entry */
  readonly usedNotDefined: ReadonlyArray<readonly [string, number]>;
  readonly glossarySize: number;
  readonly corpusTerms: number;
  /** loud terms excluded as plumbing — reported, never silently dropped */
  readonly plumbingExcluded: ReadonlyArray<readonly [string, number]>;
}

export function cell(
  glossary: Set<string>,
  counts: Map<string, number>,
  opts: { quietBelow: number; loudAbove: number },
): Cell {
  const coined: Array<readonly [string, number]> = [];
  for (const t of glossary) {
    const n = counts.get(t) ?? 0;
    if (n <= opts.quietBelow) coined.push([t, n]);
  }
  const used: Array<readonly [string, number]> = [];
  const plumbing: Array<readonly [string, number]> = [];
  for (const [t, n] of counts) {
    if (n < opts.loudAbove || glossary.has(t)) continue;
    (PLUMBING.has(t) ? plumbing : used).push([t, n]);
  }
  plumbing.sort((a, b) => b[1] - a[1]);
  coined.sort((a, b) => a[1] - b[1] || a[0].localeCompare(b[0]));
  used.sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  return {
    coinedNotAdopted: coined,
    usedNotDefined: used,
    glossarySize: glossary.size,
    corpusTerms: counts.size,
    plumbingExcluded: plumbing,
  };
}

if (import.meta.main) {
  const { readFileSync } = await import("node:fs");
  const [glossaryPath, ...corpus] = process.argv.slice(2);
  if (!glossaryPath || corpus.length === 0) {
    console.error("usage: bun glossary-adoption-cell.ts <GLOSSARY.md> <corpus-file>...");
    process.exit(2);
  }
  const g = glossaryTerms(readFileSync(glossaryPath, "utf8"));
  const sources: string[] = [];
  for (const p of corpus) {
    if (p === glossaryPath) continue; // never count the glossary as its own adoption
    try {
      sources.push(readFileSync(p, "utf8"));
    } catch {
      /* unreadable file contributes nothing; it must not read as adoption */
    }
  }
  const c = cell(g, countTerms(sources), { quietBelow: 1, loudAbove: 60 });
  console.log(
    JSON.stringify(
      {
        glossarySize: c.glossarySize,
        corpusTerms: c.corpusTerms,
        coinedNotAdoptedCount: c.coinedNotAdopted.length,
        usedNotDefinedCount: c.usedNotDefined.length,
        plumbingExcludedCount: c.plumbingExcluded.length,
        coinedNotAdopted: c.coinedNotAdopted.slice(0, 15),
        usedNotDefined: c.usedNotDefined.slice(0, 20),
        plumbingExcluded: c.plumbingExcluded.slice(0, 10),
      },
      null,
      2,
    ),
  );
}
