// sweep.ts — the under-report catcher.
//
// WHY THIS IS THE LOAD-BEARING ARTIFACT, not the index.
//
// The index is derived by scanning (see `scan.ts`), so it cannot drift the way a hand-kept
// index does. But it can still UNDER-REPORT, and under-reporting is the failure that matters:
// a subject shown an incomplete footprint approves a portrayal they were never shown. With a
// derived index there is exactly one way for that to happen — A PERSON IS IN THE PROSE AND THE
// REGISTRY DOES NOT KNOW THEY EXIST. This file sweeps for that.
//
// HOW IT AVOIDS BEING AN UNBOUNDED ALLOWLIST. A capitalised-token sweep over 129k words of
// prose finds ~217 candidates, almost all of them cited authors, places, products and
// vocabulary. Hand-listing those as "fine" would create exactly the hand-maintained,
// drift-prone surface this whole design exists to avoid, and a future agent could turn the
// check green by appending to it.
//
// So the sweep is a RATCHET, not an allowlist:
//
//   * A candidate NOT in the committed baseline is a FAILURE. A new person entering the prose
//     without a registry row goes red on the commit that adds them — which is the case the
//     mechanism exists for, and it is caught from day one.
//   * A baseline entry that no longer appears in the prose is STALE and must be pruned, so the
//     baseline cannot quietly accumulate cover for tokens that left the book.
//   * Baseline entries default to `triaged: false`. The untriaged count is DEBT, it is printed
//     on every run and written into the generated index, and it can only go down.
//
// HONEST LIMIT, stated rather than implied: this sweep finds people who are NAMED. A person
// described identifiably but never named — "my old boss at the meter company, the one who ran
// the simulator" — produces no capitalised token and is INVISIBLE to it. No string sweep
// solves that. The partial answers are registered role phrases and the optional in-text
// marker, and neither is a fix. That residual gap is real, unmeasured, and a human's job.

import type { Block } from "./scan.ts";
import { ordinalCompare } from "./scan.ts";

/** Weekday and month names — capitalised, never lowercase, never people. A closed list. */
const CALENDAR = new Set([
  "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday",
  "January", "February", "March", "April", "May", "June", "July", "August",
  "September", "October", "November", "December",
  "Jan", "Feb", "Mar", "Apr", "Jun", "Jul", "Aug", "Sep", "Sept", "Oct", "Nov", "Dec",
]);

/**
 * Remove spans where a capitalised token is mechanically not a person: inline code, link
 * targets, URLs, and filename-shaped tokens. Every exclusion here is STRUCTURAL — derivable
 * from the markdown — never a judgement about a particular word.
 */
export function stripNonProseSpans(text: string): string {
  return text
    .replace(/`[^`]*`/g, " ")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, " $1 ")
    .replace(/https?:\/\/\S+/g, " ")
    .replace(/[\w.-]+\.(?:md|ts|fs|fsx|json|jsonc|yaml|yml|toml|com|org|net|io)\b/g, " ");
}

const SENTENCE_INITIAL = /(^|[.!?:;)\]}"'’”*_>|#\-—–]\s*|\s—\s)$/;

export interface Candidate {
  readonly token: string;
  readonly count: number;
  /** Up to a few `file:line` locations, so a human can look without grepping. */
  readonly locations: readonly string[];
}

export interface SweepInput {
  readonly blocks: readonly Block[];
  /** Every word of every registered detector — a registered subject is not a candidate. */
  readonly registeredTokens: ReadonlySet<string>;
}

/**
 * Person-name candidates in the prose.
 *
 * A token qualifies when ALL of these hold, and each is mechanical:
 *   1. capitalised, at least 3 letters;
 *   2. it appears at least once NOT at the start of a sentence — sentence-initial capitals are
 *      grammar, not proper nouns;
 *   3. it is NEVER seen lowercase anywhere in the corpus — "Hinge" fails this because "hinge"
 *      is everywhere, and that is what keeps ordinary vocabulary out;
 *   4. it is not ALL-CAPS (acronym) and has no internal hump (`ZSet`, `AlarmAlgebra` — code
 *      identifiers);
 *   5. it is not a calendar word and not part of a registered subject's detectors.
 */
export function findCandidates(input: SweepInput): Candidate[] {
  const lowerSeen = new Set<string>();
  const counts = new Map<string, number>();
  const locations = new Map<string, string[]>();

  for (const block of input.blocks) {
    if (block.kind === "code" || block.kind === "frontmatter") continue;
    const text = stripNonProseSpans(block.canonical);
    const re = /([A-Za-z][\p{L}]{2,})/gu;
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
      const token = m[1] ?? "";
      if (/^[a-z]/.test(token)) {
        lowerSeen.add(token.toLowerCase());
        continue;
      }
      const before = text.slice(Math.max(0, m.index - 40), m.index);
      if (before.trim().length === 0 || SENTENCE_INITIAL.test(before)) continue;
      counts.set(token, (counts.get(token) ?? 0) + 1);
      const where = locations.get(token) ?? [];
      if (where.length < 3) {
        where.push(`${block.file}:${String(block.lineStart)}`);
        locations.set(token, where);
      }
    }
  }

  const isAllCaps = (t: string): boolean => t === t.toUpperCase();
  const hasInternalHump = (t: string): boolean => /[a-z][A-Z]/.test(t);

  const out: Candidate[] = [];
  for (const [token, count] of counts) {
    if (lowerSeen.has(token.toLowerCase())) continue;
    if (isAllCaps(token) || hasInternalHump(token)) continue;
    if (CALENDAR.has(token)) continue;
    if (input.registeredTokens.has(token)) continue;
    out.push({ token, count, locations: locations.get(token) ?? [] });
  }
  return out.sort((a, b) => b.count - a.count || ordinalCompare(a.token, b.token));
}

// ---------------------------------------------------------------------------------------
// The baseline ratchet
// ---------------------------------------------------------------------------------------

export interface BaselineEntry {
  readonly token: string;
  /**
   * false until a human has looked and decided this token is not an unregistered person.
   * The untriaged count is the debt this file makes visible; it can only go down.
   */
  readonly triaged: boolean;
  /** Free text once triaged: why this token is not a person needing a registry row. */
  readonly note?: string;
}

export interface Baseline {
  readonly generatedFrom: string;
  readonly entries: readonly BaselineEntry[];
}

export interface RatchetResult {
  /** In the prose, not in the baseline. A NEW unregistered name — this is the failure. */
  readonly novel: readonly Candidate[];
  /** In the baseline, no longer in the prose. Must be pruned or the baseline is cover. */
  readonly stale: readonly string[];
  readonly untriaged: number;
  readonly baselineSize: number;
}

export function applyRatchet(candidates: readonly Candidate[], baseline: Baseline): RatchetResult {
  const known = new Map(baseline.entries.map((e) => [e.token, e] as const));
  const present = new Set(candidates.map((c) => c.token));

  const novel = candidates.filter((c) => !known.has(c.token));
  const stale = baseline.entries
    .filter((e) => !present.has(e.token))
    .map((e) => e.token)
    .sort(ordinalCompare);
  const untriaged = baseline.entries.filter((e) => !e.triaged && present.has(e.token)).length;

  return { novel, stale, untriaged, baselineSize: baseline.entries.length };
}

export function parseBaseline(json: string, sourceLabel: string): Baseline {
  const raw: unknown = JSON.parse(json);
  if (typeof raw !== "object" || raw === null) throw new Error(`${sourceLabel}: not an object`);
  const obj = raw as Record<string, unknown>;
  const entriesRaw = obj["entries"];
  if (!Array.isArray(entriesRaw)) throw new Error(`${sourceLabel}: needs an array "entries"`);
  const entries: BaselineEntry[] = [];
  const seen = new Set<string>();
  for (const e of entriesRaw) {
    if (typeof e !== "object" || e === null) throw new Error(`${sourceLabel}: entry must be an object`);
    const rec = e as Record<string, unknown>;
    const token = rec["token"];
    const triaged = rec["triaged"];
    if (typeof token !== "string" || token.length === 0) {
      throw new Error(`${sourceLabel}: entry needs a non-empty string "token"`);
    }
    if (seen.has(token)) throw new Error(`${sourceLabel}: duplicate token "${token}"`);
    seen.add(token);
    if (typeof triaged !== "boolean") {
      throw new Error(`${sourceLabel}: entry "${token}" needs boolean "triaged"`);
    }
    const note = rec["note"];
    entries.push({ token, triaged, ...(typeof note === "string" ? { note } : {}) });
  }
  const generatedFrom = obj["generatedFrom"];
  return { generatedFrom: typeof generatedFrom === "string" ? generatedFrom : "", entries };
}
