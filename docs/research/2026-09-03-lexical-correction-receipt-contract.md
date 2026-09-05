# Finite Lexical Correction Receipt Contract

> **Decision:** A lexical correction is a versioned, content-addressed record
> with visible conflict and explicit unknown status. It is **not** an inferred
> word sense, semantic truth claim, posterior, or generated English response.

## 1. Scope

This contract extends the bounded English-seed audit with a small immutable
receipt state. It retains a declared surface form and a declared disposition so
agents may exchange correction data without losing an unknown, replacing an
earlier record silently, or requiring a central winner.

The state design follows the state/query separation already used in the
evidence-query work: canonical set union retains facts, while any materialized
view is a deterministic query. State-based CRDT convergence concerns delivery
and duplicate tolerance; it does not validate the linguistic content of a
receipt.[1]

## 2. Receipt Schema

| Field | Requirement |
|---|---|
| `surface` | NFKC-normalized, tokenized caller form; it is always retained |
| `status` | Exactly `accepted`, `replaced`, or `unknown` |
| `replacement` | Present only for `replaced`; never selected automatically |
| `source`, `version`, `reason` | Nonempty declared provenance fields |
| `contentId` | UTF-8-length-prefixed canonical fingerprint over every preceding field |

Canonical state is a content-ID-sorted union. A duplicate content ID is
idempotent. Multiple content IDs for one normalized surface are a conflict;
the query returns all retained receipts and names the surface rather than
choosing a winner.

## 3. Finite Controls

The declared control catalogue contains accepted `good`, replacement
`colour → color`, and unknown `zeta` records. Six delivery permutations must
produce one canonical receipt. A control that removes content-ID sorting
produces six retained display orders. Three changed records for `colour` must
remain a single visible conflict. A version-omission mutation must collapse
two otherwise distinct versioned replacement records.

The production TypeScript implementation is compared with a separately authored
Python NFKC tokenizer and UTF-8 fingerprint oracle. The oracle must agree on
the normal receipt and conflict receipt, and it must detect both the unsorted
order and omitted-version mutations.

## 4. Explicit Non-Claims

This contract does not determine whether a replacement is linguistically
correct, infer word senses or referents, perform semantic parsing, learn a
lexicon, model speaker intent, produce English dialogue, or establish a
connection between English and geometry. The candidate English seed remains a
finite audit input, not a semantic theory.

## References

[1] [Shapiro et al., “Conflict-Free Replicated Data Types” (2011)](https://inria.hal.science/inria-00555588/document)
