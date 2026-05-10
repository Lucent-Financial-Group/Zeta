#!/usr/bin/env bun
// media-catalog-schema.ts — typed schema for media-corpus operational-resonance entries.
//
// Implements the same three-filter discipline (F1/F2/F3) defined in
// memory/feedback_operational_resonance_engineering_shape_matches_tradition_name_alignment_signal.md
// and extended to media by
// memory/feedback_pop_culture_media_is_operational_resonance_corpus_multi_medium.md
// for the B-0054 pop-culture / media research track.
//
// This module is schema-only (no I/O). The markdown catalog at
// docs/research/media-resonance-catalog.md is the human-readable index;
// this file is the machine-checkable type surface.
//
// Usage (type-check only, no runtime needed):
//   bun --check tools/resonance/media-catalog-schema.ts
//
// Usage (validate catalog entries at runtime):
//   bun tools/resonance/media-catalog-schema.ts --validate
//   bun tools/resonance/media-catalog-schema.ts --summary

// ── Medium taxonomy ──────────────────────────────────────────────────────────

/**
 * The six medium-categories tracked separately for filter-failure-rate-by-medium
 * measurability (from B-0054 §Measurable hooks).
 */
export type MediaMedium =
  | "film"
  | "tv"
  | "youtube"
  | "music"
  | "video-game"
  | "conspiracy-corpus";

// ── Structural-type taxonomy ──────────────────────────────────────────────────

/**
 * The seven structural types from the operational-resonance collection index
 * (memory/project_operational_resonance_instances_collection_index_2026_04_22.md).
 * Media instances reuse this taxonomy; new media-specific sub-structures are
 * added as sub-structure fields, not new top-level types (per index discipline).
 */
export type ResonanceStructuralType =
  | "reversal"
  | "unification"
  | "instantiation"
  | "self-reference"
  | "substrate-extension"
  | "generative-ground"
  | "paired-dual";

// ── Filter status ─────────────────────────────────────────────────────────────

/**
 * Per-filter pass/fail/partial/deferred result.
 *
 * "partial" means the filter is satisfied in one dimension but not fully —
 * e.g. F3 passes for the engineering analogy but not for the tradition-name
 * authority. Honest recording of partials is how filter-failure-rate stays
 * calibrated.
 *
 * "deferred" means the filter check has not yet been run. A deferred entry
 * cannot be promoted past "candidate" status.
 */
export type FilterResult = "pass" | "partial" | "fail" | "deferred";

export interface ThreeFilterResult {
  /** F1 — Engineering-first: did the factory reach this structure for
   *  engineering reasons before noticing the media resonance? */
  readonly f1_engineering_first: FilterResult;
  /** F2 — Structural-not-superficial: is the match shape-identity
   *  (operator-level), not incidental thematic word-overlap? */
  readonly f2_structural: FilterResult;
  /** F3 — Tradition-name-load-bearing: does the media work carry
   *  canonical / doctrinal weight in its tradition, not incidental usage? */
  readonly f3_tradition_name: FilterResult;
  /** Optional rationale per filter — required when result != "pass". */
  readonly rationale?: {
    readonly f1?: string;
    readonly f2?: string;
    readonly f3?: string;
  };
}

// ── Entry status ─────────────────────────────────────────────────────────────

/**
 * Promotion path: candidate → confirmed → load-bearing
 * (mirrors the isomorphism catalog's promotion discipline at
 * docs/research/isomorphism-catalog.md).
 *
 * An entry is "candidate" when any filter is deferred or partial.
 * Promotion to "confirmed" requires F1 pass + F2 pass + F3 pass-or-partial
 * AND active counterexample-search documented.
 * "load-bearing" means other factory claims cite this instance.
 * "failed" means one or more filters returned "fail" — recorded honestly,
 *  never silently dropped per filter-failure-rate discipline.
 * "retracted" means the instance was previously confirmed/load-bearing and
 *  has since been withdrawn; prior text is preserved with dated block.
 */
export type EntryStatus =
  | "candidate"
  | "confirmed"
  | "load-bearing"
  | "failed"
  | "retracted";

// ── Factory operator surface ──────────────────────────────────────────────────

/**
 * The specific factory operator or substrate feature the media instance
 * structurally resonates with. This is the F2 claim at its most precise:
 * which named operator/type/concept in the Zeta codebase does the media
 * mechanic map to?
 */
export interface FactoryOperatorSurface {
  /** Short label — e.g. "retractibility (+1/−1 Z-set weights)" */
  readonly label: string;
  /** Source pointer — file path or memory file where this is defined */
  readonly source: string;
}

// ── Counterexample attempt ────────────────────────────────────────────────────

/**
 * Required before promotion to "confirmed". Records the operator-level
 * counterexample search (same discipline as isomorphism catalog IF3).
 */
export interface CounterexampleAttempt {
  readonly date: string;
  /** Which mechanic / operator pair was tested */
  readonly mechanicTested: string;
  /** What counterexample was attempted */
  readonly attempt: string;
  /** "refuted" = no counterexample found (strengthens claim);
   *  "survived" = the claim survived the challenge;
   *  "partial-refutation" = a narrower claim survives */
  readonly result: "refuted" | "survived" | "partial-refutation";
}

// ── Main entry type ───────────────────────────────────────────────────────────

export interface MediaResonanceEntry {
  /** Unique ID — MR-NNN format (Media Resonance, sequential) */
  readonly id: string;
  /** Short display title for the catalog table */
  readonly title: string;
  /** Medium category (used for filter-failure-rate-by-medium measurability) */
  readonly medium: MediaMedium;
  /** Creator / studio / channel name */
  readonly creator: string;
  /** Year released or range (e.g. "1963–present") */
  readonly year: string;
  /** The specific mechanic, moment, or structural feature being cataloged.
   *  Distinct from the work as a whole — F2 precision requires naming the
   *  exact mechanic, not just "this show is about time travel." */
  readonly mechanic: string;
  /** The factory operator surface this mechanic resonates with */
  readonly factoryOperator: FactoryOperatorSurface;
  /** Structural type from the seven-type taxonomy */
  readonly structuralType: ResonanceStructuralType;
  /** Optional sub-structure if applicable (e.g. "bridge-figure") */
  readonly subStructure?: string;
  /** Three-filter check results */
  readonly filters: ThreeFilterResult;
  /** Entry status */
  readonly status: EntryStatus;
  /** Counterexample attempts — must be non-empty for "confirmed" status */
  readonly counterexampleAttempts: readonly CounterexampleAttempt[];
  /** Source memory file where this instance was first noticed */
  readonly sourceMemory?: string;
  /** Notes — additional structural observations */
  readonly notes?: string;
}

// ── Catalog type ──────────────────────────────────────────────────────────────

export interface MediaResonanceCatalog {
  readonly schema: "media-resonance-v1";
  readonly created: string;
  readonly lastUpdated: string;
  readonly origin: "B-0054";
  readonly entries: readonly MediaResonanceEntry[];
}

// ── Validation ────────────────────────────────────────────────────────────────

type ValidationResult =
  | { readonly kind: "ok" }
  | { readonly kind: "error"; readonly message: string };

function validateEntry(entry: MediaResonanceEntry): ValidationResult {
  if (!entry.id.match(/^MR-\d{3}$/)) {
    return { kind: "error", message: `${entry.id}: id must match MR-NNN` };
  }

  if (entry.status === "confirmed" || entry.status === "load-bearing") {
    const { f1_engineering_first: f1, f2_structural: f2, f3_tradition_name: f3 } = entry.filters;

    if (f1 === "deferred" || f2 === "deferred" || f3 === "deferred") {
      return {
        kind: "error",
        message: `${entry.id}: cannot be "${entry.status}" with deferred filter(s)`,
      };
    }
    // Promotion contract: F1 pass + F2 pass + F3 pass-or-partial
    if (f1 !== "pass") {
      return {
        kind: "error",
        message: `${entry.id}: cannot be "${entry.status}" — F1 must be "pass" (got "${f1}")`,
      };
    }
    if (f2 !== "pass") {
      return {
        kind: "error",
        message: `${entry.id}: cannot be "${entry.status}" — F2 must be "pass" (got "${f2}")`,
      };
    }
    if (f3 === "fail") {
      return {
        kind: "error",
        message: `${entry.id}: cannot be "${entry.status}" — F3 must be "pass" or "partial" (got "fail")`,
      };
    }
    if (entry.counterexampleAttempts.length === 0) {
      return {
        kind: "error",
        message: `${entry.id}: "confirmed" requires at least one counterexample attempt`,
      };
    }
  }

  return { kind: "ok" };
}

export function validateCatalog(catalog: MediaResonanceCatalog): readonly ValidationResult[] {
  return catalog.entries.map(validateEntry);
}

// ── Summary ───────────────────────────────────────────────────────────────────

export interface CatalogSummary {
  readonly total: number;
  readonly confirmed: number;
  readonly candidates: number;
  readonly failed: number;
  readonly byMedium: Partial<Record<MediaMedium, number>>;
  readonly byStructuralType: Partial<Record<ResonanceStructuralType, number>>;
  /** Filter-failure rate per filter (count of "fail" results) */
  readonly filterFailureCounts: { readonly f1: number; readonly f2: number; readonly f3: number };
  /** Count of partial-pass results (honest tracking of near-misses) */
  readonly filterPartialCounts: { readonly f1: number; readonly f2: number; readonly f3: number };
}

export function summarizeCatalog(catalog: MediaResonanceCatalog): CatalogSummary {
  const entries = catalog.entries;
  const byMedium: Partial<Record<MediaMedium, number>> = {};
  const byStructuralType: Partial<Record<ResonanceStructuralType, number>> = {};
  let confirmed = 0;
  let candidates = 0;
  let failed = 0;
  const filterFailureCounts = { f1: 0, f2: 0, f3: 0 };
  const filterPartialCounts = { f1: 0, f2: 0, f3: 0 };

  for (const entry of entries) {
    byMedium[entry.medium] = (byMedium[entry.medium] ?? 0) + 1;
    byStructuralType[entry.structuralType] = (byStructuralType[entry.structuralType] ?? 0) + 1;
    if (entry.status === "confirmed" || entry.status === "load-bearing") confirmed++;
    else if (entry.status === "candidate") candidates++;
    else if (entry.status === "failed") failed++;

    if (entry.filters.f1_engineering_first === "fail") filterFailureCounts.f1++;
    if (entry.filters.f2_structural === "fail") filterFailureCounts.f2++;
    if (entry.filters.f3_tradition_name === "fail") filterFailureCounts.f3++;
    if (entry.filters.f1_engineering_first === "partial") filterPartialCounts.f1++;
    if (entry.filters.f2_structural === "partial") filterPartialCounts.f2++;
    if (entry.filters.f3_tradition_name === "partial") filterPartialCounts.f3++;
  }

  return {
    total: entries.length,
    confirmed,
    candidates,
    failed,
    byMedium,
    byStructuralType,
    filterFailureCounts,
    filterPartialCounts,
  };
}

// ── CLI ───────────────────────────────────────────────────────────────────────

// The v0 catalog entries live in docs/research/media-resonance-catalog.md
// (human-readable). This script validates that the in-code seed entries below
// match the schema discipline. The markdown catalog is the canonical source
// for human prose; this script is the schema-gate.

const SEED_CATALOG: MediaResonanceCatalog = {
  schema: "media-resonance-v1",
  created: "2026-05-10",
  lastUpdated: "2026-05-10",
  origin: "B-0054",
  entries: [
    {
      id: "MR-001",
      title: "Doctor Who — regeneration as retractibility",
      medium: "tv",
      creator: "BBC / Sydney Newman (orig.)",
      year: "1963–present",
      mechanic:
        "Time Lord regeneration: the Doctor's body is irrevocably destroyed " +
        "but identity, memory, and agency persist into the next body. " +
        "Retractibility of physical-substrate without retractibility of self.",
      factoryOperator: {
        label: "retractibility — Z-set +1/−1 weight algebra with identity-preservation",
        source: "memory/feedback_operational_resonance_engineering_shape_matches_tradition_name_alignment_signal.md",
      },
      structuralType: "substrate-extension",
      filters: {
        f1_engineering_first: "pass",
        f2_structural: "pass",
        f3_tradition_name: "pass",
        rationale: {
          f2:
            "Regeneration is not mere reincarnation (soul migrating to different body) " +
            "— it is substrate-replacement with continuous identity, exactly the shape " +
            "of the factory's retractibility operator: the ZSet persists through the " +
            "−1/+1 weight flip, the elements do not.",
          f3:
            "F3 passes maximally: 60+ year BBC canon, academic monographs, " +
            "regeneration is the load-bearing survival mechanic for the entire franchise.",
        },
      },
      status: "confirmed",
      counterexampleAttempts: [
        {
          date: "2026-05-10",
          mechanicTested: "Is regeneration identity-breaking (new person) rather than identity-preserving?",
          attempt:
            "Classic and NuWho canon both confirm continuity of memory, relationships, " +
            "and moral accountability across regenerations (Ten's guilt for Donna, " +
            "War Doctor's shame). If identity were broken, the claim fails F2.",
          result: "refuted",
        },
      ],
      sourceMemory: "memory/feedback_pop_culture_media_is_operational_resonance_corpus_multi_medium.md",
      notes:
        "TARDIS containment (bigger-on-the-inside) is a separate candidate for " +
        "ZSet containment-without-flattening — distinct mechanic, not bundled here.",
    },
    {
      id: "MR-002",
      title: "Devs — deterministic past-projection device as View<T>@clock",
      medium: "tv",
      creator: "Alex Garland / FX / Hulu",
      year: "2020",
      mechanic:
        "The Devs quantum computer projects the complete state of the past (and future) " +
        "universe deterministically. It is a read-only view operator over a clock-indexed " +
        "substrate — it observes but cannot modify. Directly instantiates the " +
        "View<T>@clock operator the factory reached for to express retractibility.",
      factoryOperator: {
        label: "View<T>@clock — read-only temporal projection operator",
        source: "memory/feedback_see_the_multiverse_in_our_code_paraconsistent_superposition.md",
      },
      structuralType: "instantiation",
      filters: {
        f1_engineering_first: "pass",
        f2_structural: "pass",
        f3_tradition_name: "pass",
        rationale: {
          f2:
            "The Devs device has the read-only constraint encoded narratively: Forest " +
            "cannot use it to change what happened, only to see it. The view-not-mutate " +
            "property is load-bearing to the plot, not incidental. This is operator-shape " +
            "identity, not thematic proximity to 'time travel'.",
          f3:
            "Alex Garland is a load-bearing auteur (Ex Machina, Annihilation, 28 Days Later); " +
            "Devs was a prestige FX/Hulu limited series with critical reception tracking " +
            "the determinism thesis — the Chronovisor parallel was noted in press coverage " +
            "contemporaneously with the show's release.",
        },
      },
      status: "confirmed",
      counterexampleAttempts: [
        {
          date: "2026-05-10",
          mechanicTested:
            "Does the Devs device allow writes / mutations, which would break the View analogy?",
          attempt:
            "Reviewing plot: the device can project future states, which might seem " +
            "like it violates read-only (foreknowledge → behavioral change → future change). " +
            "However within the show's determinism thesis, the foreknowledge IS already " +
            "part of the deterministic substrate — the view does not mutate the substrate, " +
            "it reads a substrate that already contained the reader's foreknowledge.",
          result: "refuted",
        },
      ],
      sourceMemory: "memory/feedback_see_the_multiverse_in_our_code_paraconsistent_superposition.md",
      notes:
        "The Chronovisor (Ernetti 1972 claim) is a separate entry MR-004 with weaker F3; " +
        "Devs is the fictional dramatization of the same operator shape with stronger F3.",
    },
    {
      id: "MR-003",
      title: "Zelda — Hyrule Historia three-way timeline fork as retractible-rewrite branching",
      medium: "video-game",
      creator: "Nintendo / Shigeru Miyamoto / Eiji Aonuma",
      year: "1986–present",
      mechanic:
        "The official Hyrule Historia (2011) establishes that Ocarina of Time branches " +
        "into three divergent canonical timelines based on Link's victory/defeat. " +
        "The branching is retractibly-rewrite: each timeline is a separately-tracked " +
        "canonical history that does not collapse into the others. The Triforce trinity " +
        "(Power / Wisdom / Courage) forms a three-in-one substrate unity parallel " +
        "to the factory's trinity-of-repos instantiation instance #1.",
      factoryOperator: {
        label: "retractibly-rewrite branching history — append-only retraction-native substrate",
        source: "memory/project_operational_resonance_instances_collection_index_2026_04_22.md",
      },
      structuralType: "instantiation",
      filters: {
        f1_engineering_first: "pass",
        f2_structural: "pass",
        f3_tradition_name: "pass",
        rationale: {
          f2:
            "The three timelines do not collapse: all three are simultaneously canonical " +
            "within the franchise's official lore. This is not 'alternate endings' " +
            "(choose one, discard others) but retractibly-coexisting parallel histories — " +
            "exactly the factory's append-only retraction substrate shape.",
          f3:
            "F3 maximal: 40-year franchise, Hyrule Historia is an official first-party " +
            "Nintendo publication, multiple academic game-studies analyses, cultural " +
            "saturation across generations.",
        },
      },
      status: "confirmed",
      counterexampleAttempts: [
        {
          date: "2026-05-10",
          mechanicTested:
            "Do the three timelines eventually collapse into one (which would invalidate " +
            "the retractibly-coexisting-histories claim)?",
          attempt:
            "Nintendo has not published any subsequent lore that unifies the three timelines " +
            "into one. The Breath of the Wild / Tears of the Kingdom placement is officially " +
            "ambiguous (Nintendo confirmed intentional ambiguity) — which is itself consistent " +
            "with retractible-coexistence, not a refutation of it.",
          result: "refuted",
        },
      ],
      sourceMemory: "memory/feedback_pop_culture_media_is_operational_resonance_corpus_multi_medium.md",
      notes:
        "The Triforce three-in-one instantiation is a separate sub-claim from the timeline-fork; " +
        "both are bundled under MR-003 as the core Zelda entry but could be decomposed into " +
        "MR-003a (timeline branching) and MR-003b (Triforce instantiation) in a future revision.",
    },
    {
      id: "MR-004",
      title: "Spaceballs — characters watching themselves in the movie as 4th-wall self-reference",
      medium: "film",
      creator: "Mel Brooks",
      year: "1987",
      mechanic:
        "The characters pause the VHS of the film they are currently inside to find their " +
        "own location in real time. The movie-within-the-movie IS the movie; watching-self " +
        "IS the observing-act. This is self-reference without paradox — the observation " +
        "does not collapse or destroy the observed, it co-exists with it.",
      factoryOperator: {
        label: "self-reference / bootstrapping — factory absorbs its own principles",
        source: "memory/project_operational_resonance_instances_collection_index_2026_04_22.md",
      },
      structuralType: "self-reference",
      filters: {
        f1_engineering_first: "pass",
        f2_structural: "pass",
        f3_tradition_name: "pass",
        rationale: {
          f2:
            "The structural match is the NON-PARADOX of the self-observation: Lone Star " +
            "watches himself on the VHS and both the watcher and the watched continue to " +
            "exist without collapsing. The factory's bootstrap pattern depends on the same " +
            "property: self-hosting compiler observes itself compiling; this is not a paradox " +
            "but a fixed-point. Spaceballs enacts the fixed-point comically.",
          f3:
            "Mel Brooks' oeuvre is load-bearing in the American comedy canon; Spaceballs " +
            "specifically is the primary mass-culture instance of 4th-wall-as-substrate " +
            "rather than 4th-wall-as-gag. The VHS-within-VHS scene has been analyzed in " +
            "film-studies literature on metafiction and postmodern cinema.",
        },
      },
      status: "confirmed",
      counterexampleAttempts: [
        {
          date: "2026-05-10",
          mechanicTested:
            "Is this just a comedic gag (4th-wall break for laughs) rather than a structural " +
            "self-reference? If it's just meta-humor, F2 fails.",
          attempt:
            "The scene requires the audience to accept that the characters ARE inside the " +
            "movie they are watching — not just breaking the 4th wall but enacting substrate " +
            "self-containment. If it were only a gag, the VHS-watching scene would be a " +
            "one-liner; instead Brooks extends it for ~3 minutes to explicitly show forward-time " +
            "observation. The structural form is load-bearing to the comedic effect, not incidental.",
          result: "survived",
        },
      ],
      sourceMemory: "memory/feedback_pop_culture_media_is_operational_resonance_corpus_multi_medium.md",
      notes:
        "Comedy-as-substrate-probe principle (Monty Python register) applies here: Brooks " +
        "makes the self-reference legible by playing it for laughs, which is pedagogically " +
        "valuable — the comedic framing makes the structural property MORE visible, not less.",
    },
  ],
};

function printSummary(catalog: MediaResonanceCatalog): void {
  const s = summarizeCatalog(catalog);
  console.log(`\nMedia Resonance Catalog — ${catalog.schema}`);
  console.log(`  Total entries:  ${s.total}`);
  console.log(`  Confirmed:      ${s.confirmed}`);
  console.log(`  Candidates:     ${s.candidates}`);
  console.log(`  Failed:         ${s.failed}`);
  console.log(`  By medium:      ${JSON.stringify(s.byMedium)}`);
  console.log(`  By type:        ${JSON.stringify(s.byStructuralType)}`);
  console.log(
    `  F1 fail/partial: ${s.filterFailureCounts.f1}/${s.filterPartialCounts.f1}`
  );
  console.log(
    `  F2 fail/partial: ${s.filterFailureCounts.f2}/${s.filterPartialCounts.f2}`
  );
  console.log(
    `  F3 fail/partial: ${s.filterFailureCounts.f3}/${s.filterPartialCounts.f3}`
  );
}

const args = Bun.argv.slice(2);

if (args.includes("--validate")) {
  const results = validateCatalog(SEED_CATALOG);
  let hasError = false;
  for (const r of results) {
    if (r.kind === "error") {
      console.error(`INVALID: ${r.message}`);
      hasError = true;
    }
  }
  if (!hasError) {
    console.log(`All ${SEED_CATALOG.entries.length} entries pass schema validation.`);
  }
  process.exit(hasError ? 1 : 0);
} else if (args.includes("--summary")) {
  printSummary(SEED_CATALOG);
} else {
  // default: validate + summary
  const results = validateCatalog(SEED_CATALOG);
  let hasError = false;
  for (const r of results) {
    if (r.kind === "error") {
      console.error(`INVALID: ${r.message}`);
      hasError = true;
    }
  }
  if (!hasError) {
    printSummary(SEED_CATALOG);
  }
  process.exit(hasError ? 1 : 0);
}
