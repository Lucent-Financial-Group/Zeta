---
id: 081M1KC8460087G0R003F3SGJC
type: task
state: backlog
priority: P2
slug: linguistic-seed-v0-nsm-prime-seed-vocabulary-bayesian-escala
title: "Linguistic seed v0: NSM-prime seed vocabulary, Bayesian escalation ladder, and a drift-reconstructibility meter over GLOSSARY.md"
created: 2026-09-03T10:15:20.512Z
depends_on: []
composes_with: [081M0R2CGHQ087G0R001JE6KV4, 081M00TKDGG087G0R00271D93E]
---

# Linguistic seed v0: NSM-prime seed vocabulary, Bayesian escalation ladder, and a drift-reconstructibility meter over GLOSSARY.md

<!-- Work-item body. ZetaId-keyed (conflict-free, time-sortable). "Backlog" is a
     STATE = this folder; completion moves the file to workitems/done/YYYY/MM/.
     Identity is the zetaid prefix — resolve cross-refs by `081M1KC8460087G0R003F3SGJC-*.md` glob. -->

**Source:** Aaron, 2026-09-03 — the Fable 5.1 math-team lane "minimal linguistic seed over English, encoded in our Clifford geometry, each word an entity that fights for its definition." Spec: `docs/research/2026-09-03-minimal-linguistic-seed-clifford-geometry-word-entities-etymology-spec-nsm-primes-are-the-seed-a-word-is-a-graded-region-drift-is-priced-not-forbidden.md`.

## Scope — the first buildable slice, cheapest killer first

1. **The seed as data.** `docs/linguistic-seed/english/seed.json`: the 65 NSM primes (Goddard & Wierzbicka 2014), categories, allolexes, valency frames — text, diffable. Pack-0 (NSM semantic molecules) as a second file, each molecule with its reductive paraphrase. Falsifier: loading pack-0 changes no seed-level coverage result (closure).
2. **Coverage leg of the reconstructibility meter** over `docs/GLOSSARY.md` + `docs/SEED-VOCABULARY.md`: fraction of each entry's first sentence expressible in seed ∪ packs ∪ previously-defined entries; acyclicity of the definability graph; the failing list. No threshold, no gate — it reports. Extends `src/Core.TypeScript/hygiene/glossary-adoption-cell.ts`.
3. **Acquisition-age test** of the seed's exponents against the Kuperman, Stadthagen-Gonzalez & Brysbaert (2012) norms, reported beside the whole-lexicon distribution. A prime with AoA > 7 is flagged.
4. **Ordered-probit likelihood** (cutpoints) beside `TravelerRankLedger`'s binary probit — the ordinal factor the Bayesian tree lacks.
5. **Held-out escalation ordering** on the de Melo & Bansal (2013) intensity clusters: Kendall τ per held-out scale, against BOTH nulls (random; name-only LLM ordering), plus the cross-scale negative control (`loud` must not acquire a threshold on the temperature axis).
6. **Reconstruction leg** of the meter with two vendors (the ρ-stack), the three nulls (scrambled entry; name-only; drift-direction), and the Fisher–Rao drift distance for every entry with two dated revisions.
7. **The word game, simulated**: does ρ-discounted third-party attestation with `age` decay reproduce the signs of Hamilton–Leskovec–Jurafsky's laws of conformity and innovation; where is the coherence threshold (Nowak–Komarova–Niyogi). A negative on either is filed as a result.

## Not in this slice

- Any Clifford signature choice (Clifford brief Q4 stays open).
- Any promotion of the rotor coincidence (three conditions in `docs/ZETA-CORE-TECHNOLOGY-FOR-MAX.md` §Geometry Thread §5, none attempted).
- The human reconstruction leg, until legs 1–2 exist to compare it against.

## Composes with

- `081M0R2CGHQ087G0R001JE6KV4` — glossary-churn watching (the reverse direction that starts green); step 2 is its forward direction.
- `081M00TKDGG087G0R00271D93E` — version the codebook the seed compresses against; the seed file in step 1 is that codebook's first versioned artifact.
- `docs/backlog/P1/081KQZVQW0008QG0R001PS4F8G` — "word meanings compete for territory"; step 7 is that row with a mechanism.

## Register

`toy` until step 2 runs (then `unmetered` for the coverage number); `metered` only when a pre-registered statistic in steps 3, 5, 6 or 7 is allowed to come out negative and is reported either way.
