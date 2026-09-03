# Bayesian English Interface: Inventory and English-Seed Coverage Contract

> **Status:** Implemented and measured on the declared v0 corpus. The coverage meter is a finite, versioned lexical audit, not an English-speaking agent, a semantic understanding system, a universal lexicon, or a language-geometry result. The measured baseline and explicit next experiments are recorded in [`2026-09-03-bayesian-english-interface-status.md`](2026-09-03-bayesian-english-interface-status.md).

## Recommendation

**Implement the seed as data and a failing-list coverage meter before training or wiring any Bayesian lexical model.** This establishes a reproducible input boundary for later uncertainty-bearing language queries. It can report insufficiency; it cannot certify semantic adequacy.

## 1. Current executable surface

Zeta already has real syntactic and uncertainty substrates, but they do not amount to a Bayesian English-speaking interface. The distinction below is load-bearing.

| Surface | Existing artifact | Measured or implemented capability | Not established |
|---|---|---|---|
| Grammar representation | `src/Core/GrammarIr.fs`, `src/Core/MetaGrammar.fs` | Grammar/data round-trip and dictionary-membership classification | English lexical meaning or grounded reference |
| Ambiguous syntax | `src/Core/Slr.fs`, `src/Core/Sppf.fs` | GLR packed forest; inside/outside, parse marginals, expected counts, and weighted trees over an acyclic forest | Contextual production model or semantic interpretation |
| Uncertainty carrier | `src/Bayesian/Message.fs`, `MultilayerBnn.fs`, factor-graph queries | Declared Gaussian inference and bounded exact covariance paths | Non-Gaussian language learning or calibrated word meaning |
| Kernel composition | `src/Core/LinguisticSeed.fs` | PSD-by-construction kernel packs | An English seed, a lexicon, or a Bayesian language model |
| Formal seed | `docs/linguistic-seed/` | Nine-term mathematical dependency DAG | An English semantic vocabulary |
| Vocabulary drift audit | `src/Core.TypeScript/hygiene/glossary-adoption-cell.ts` | Deterministic coined/adopted and used/undefined report | Definability, reconstructibility, or semantic drift measurement |

The exact integration seam already visible in the parser is a declared production-weight function. Context-free weights can be estimated with inside–outside EM; a Bayesian component is justified only when a feature map supplies a declared contextual conditioning variable. The interface must not let parser code infer feature semantics or let a Bayesian component infer grammar-production identity.

## 2. Proposed finite English-seed input

The initial candidate source is the **65 semantic-prime inventory proposed by Natural Semantic Metalanguage (NSM)**, plus separately versioned semantic-molecule packs and declared valency metadata. NSM researchers describe their approach as a proposed cross-linguistic lexical-conceptual core paired with grammar and reductive paraphrase; they do not supply a proof that it is a universally correct semantic interface.[1] [2]

The following claims are therefore deliberately distinct.

| Claim | Status in this contract |
|---|---|
| A finite JSON file can faithfully encode a declared list of English exponents, categories, allolexes, and valency frames | Buildable and testable |
| A pack can declare dependencies only on the seed or lower packs | Buildable and testable |
| A deterministic report can detect undefined names, dependency cycles, and vocabulary outside the loaded seed/pack closure | Buildable and testable |
| The declared inventory is semantically irreducible, universal, child-acquired, or adequate for English | **Not established**; these are research hypotheses with separate external-data tests |
| The list provides grounded meaning, natural-language understanding, language consciousness, English/geospatial identity, or Clifford geometry | **Out of scope** |

## 3. Frozen v0 data and report boundary

### 3.1 Inputs

The implementation shall accept only explicit, repository-tracked inputs:

1. `docs/linguistic-seed/english/seed.json`, containing a schema version and finite entries with a stable identifier, English exponent, category, declared allolexes, and finite valency-frame strings;
2. zero or more `pack-*.json` files with stable IDs, declared dependencies, and a reductive-paraphrase token list;
3. the first sentence of each declared `docs/GLOSSARY.md` entry and `docs/SEED-VOCABULARY.md` entry, using a documented deterministic tokenizer; and
4. no network model, embedding, language model, web request, or inferred synonym table.

### 3.2 Deterministic report

The report will emit, in ordinal ID order:

| Field | Meaning |
|---|---|
| `entryId` | Declared source entry identity, never a guessed meaning |
| `tokens` | Deterministically tokenized lower-case ASCII/Unicode-token sequence, including an explicit tokenization-version ID |
| `unknownTokens` | Tokens not present in the loaded seed, packs, or declared structural allowance list |
| `dependencyCycle` | Present only when a pack dependency graph is cyclic |
| `coverage` | `knownTokenCount / consideredTokenCount`, where both counts and exclusions are reported |
| `status` | `Covered`, `Uncovered`, `InvalidSeed`, or `InvalidPack` |

The report is an audit artifact. It does not paraphrase a word, infer a definition, rank terms, assess truth, or prove reconstructibility. Stop-word handling must be an explicit partition if added later; it must not silently discard one channel.

### 3.3 Finite controls and refusal behavior

| Control | Required behavior |
|---|---|
| Seed entries shuffled in input JSON | Same canonical report after stable-ID ordering |
| Duplicate seed ID or exponent | Refuse with a teaching error; do not choose one |
| Pack depends on unknown ID or has a cycle | `InvalidPack`; no coverage score invented |
| Exact token appears through an allolex | Counted as known with its declared prime ID recorded |
| Unknown glossary token | Listed in `unknownTokens`; coverage remains a report, not a gate |
| Same documentation inputs rerun | Byte-identical JSON report under the declared tokenizer |
| Mutation removing a declared seed/allolex entry | The relevant coverage receipt must change |

## 4. Bayesian and CRDT boundaries

This v0 report emits **features and explicit missingness**, not a posterior. A later Bayesian escalation model may consume only an explicitly versioned scale dataset and must keep its evidence provenance in the canonical CRDT evidence state. Its state merge will remain content-addressed union; any posterior, ordered-probit update, EP/VMP approximation, or factor-graph message pass is a deterministic query over the canonical state, never a state merge.

Likewise, canonical sorting is part of numerical determinism when a floating-point query folds evidence. Compensated summation reduces error but does not independently make arbitrary fold orders equal. A fully order-independent reproducible accumulator is a separate algorithmic choice with its own cost and cross-runtime contract; it is not silently substituted here.[3]

## 5. Explicit non-claims

This contract does not claim that English meaning is a factor graph, that NSM primes are universally valid, that a token coverage fraction measures human comprehensibility, that grammar marginalization yields semantic understanding, or that any language object has a Clifford-geometric realization. The existing language-geometry proposal remains `toy` until its separately declared data, negative controls, and falsifiers run.

## References

[1] [Goddard, “Semantic primes, semantic molecules, semantic templates: Key concepts in the NSM approach to lexical typology” (2012)](http://hdl.handle.net/10072/46996)

[2] [Wierzbicka, “Semantic Primitives”, fifty years later (2021)](http://hdl.handle.net/1885/294560)

[3] [Ahrens, Demmel, and Nguyen, “Algorithms for Efficient Reproducible Floating Point Summation” (2020)](https://doi.org/10.1145/3389360)
