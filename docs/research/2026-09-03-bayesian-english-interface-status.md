# Bayesian English Interface: Current Status and v0 Seed-Coverage Baseline

> **Recommendation:** Treat the current interface as a **syntax-and-uncertainty substrate plus a deterministic lexical audit**, not as an English-speaking or semantically grounded system. The next useful step is a small declared grammar and independently labeled production-weight dataset—not a larger hand-authored vocabulary.

## Executive status

The repository retains the user’s language-interface writeups and has working components for ambiguity-preserving grammar representation, packed parse forests, inside/outside statistics, declared Gaussian factor-graph queries, and a finite candidate English seed. It does **not** yet have a grounded English lexicon, a trained or calibrated Bayesian production model for English, semantic parsing, dialogue generation, cross-lingual validation, or a verified connection between language and geometry.

| Layer | Current status | Evidence | Boundary |
|---|---|---|---|
| Ambiguous syntax | Implemented | `GrammarIr`, `Slr`, and `Sppf` retain alternatives and calculate declared parse weights | Syntactic ambiguity is not word meaning |
| Bayesian substrate | Implemented, bounded | Multilayer Gaussian and factor-graph paths preserve declared uncertainty within their model contracts | It is not a non-Gaussian language learner |
| Candidate English seed | Implemented as versioned data | `docs/linguistic-seed/english/seed.json` has 65 declared candidate entries | The list is an input hypothesis, not a universal semantic proof |
| Lexical audit | Implemented and measured | `english-seed-coverage.ts` produces deterministic unknown-token receipts | Coverage is not definability, adequacy, or comprehension |
| Contextual production prior | Unimplemented | Existing parser seam is identifiable | Requires declared features, data provenance, calibration, and held-out tests |
| Grounded or conversational English | Unimplemented | No execution path establishes it | No claim is made |

## v0 coverage measurement

The v0 report ran `declared-english-seed-coverage/v1` over the first sentence of every heading in `docs/GLOSSARY.md` and `docs/SEED-VOCABULARY.md`, with a versioned candidate list of 65 NSM-inspired English exponents and an explicit structural allowance list. The resulting report has **122 entries**, **2,137 considered tokens**, and **670 known tokens**, for a lexical match fraction of **0.31352363125877397**. It reports **0 fully covered entries** and **122 uncovered entries**.

> This low coverage is the expected finite baseline. The target documents define Zeta-specific technical terms, while the v0 candidate list contains only a small general-language hypothesis. The result falsifies any claim that the existing candidate seed already reconstructs or covers the project glossary.

The report retains unknown tokens per heading. It does not silently discard function words, infer synonyms, call a language model, or treat unmatched tokens as errors in the underlying documents. It is an input-audit receipt.

| Measured property | Result | Interpretation |
|---|---:|---|
| Candidate entries | 65 | Declared finite seed input |
| Documentation headings measured | 122 | Fixed current corpus boundary |
| Known / considered tokens | 670 / 2,137 | Exact matcher result under v0 tokenizer and allowances |
| Lexical match fraction | 0.31352363125877397 | Audit metric only; not semantic coverage |
| Fully covered headings | 0 | No supported claim of glossary reconstruction |
| Uncovered headings | 122 | Explicit missingness list is preserved for later packs |

## Why the seed is not a universal-language claim

Natural Semantic Metalanguage (NSM) is relevant as a source of a **proposed** finite cross-linguistic lexical-conceptual core and associated grammar. Its researchers describe semantic primes, molecules, and templates as an empirical program and advance their own universality claims.[1] [2] Zeta treats the 65-entry list only as a versioned candidate input. The coverage engine neither validates nor relies on the claim that those entries are irreducible, universal, cognitively primary, or sufficient for English.

The implementation also records the numerical distinction highlighted by the CRDT query work: a deterministic report uses ordinal IDs and sorted input. Determinism does not make a lexical feature semantically correct, and a stable floating-point fold does not make a posterior a replicated state merge.[3]

## Concrete next experiments

The following sequence keeps the language program falsifiable.

| Increment | Minimum evidence before claim | Falsifier |
|---|---|---|
| Seed-pack v1 | Explicit pack data, acyclic dependencies, allolex mapping, and changed-receipt mutation | A removed declaration leaves coverage unchanged, or a pack cycle is accepted |
| Minimal grammar slice | A finite grammar, parse corpus, and fixed accepted/rejected strings | Parser accepts the paired negative or fails the declared positive |
| Bayesian production prior | Labeled scale data, train/validation/test split, calibration and log-score report | Prior improves training fit only, loses held-out calibration, or lacks a declared conditioning feature |
| Non-Gaussian factor family | Frozen likelihood, posterior approximation, independent oracle, and calibration benchmark | Approximation cannot beat or match declared baseline under its own preregistered rule |

Until these steps run, terms such as “Bayesian English interface,” “meaning vector,” “geospatial language,” or “English-factor-graph equivalence” should be read as **research direction**, not implemented capability.

## Reproduction

```text
bun src/Core.TypeScript/research/english-seed-coverage-report.ts \
  docs/linguistic-seed/english/seed.json \
  docs/GLOSSARY.md docs/SEED-VOCABULARY.md
```

## References

[1] [Goddard, “Semantic primes, semantic molecules, semantic templates: Key concepts in the NSM approach to lexical typology” (2012)](http://hdl.handle.net/10072/46996)

[2] [Wierzbicka, “Semantic Primitives”, fifty years later (2021)](http://hdl.handle.net/1885/294560)

[3] [Ahrens, Demmel, and Nguyen, “Algorithms for Efficient Reproducible Floating Point Summation” (2020)](https://doi.org/10.1145/3389360)
