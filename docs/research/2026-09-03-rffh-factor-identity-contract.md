# RFFH Factor Identity: Namespace Widening and Collision Refusal Contract

**Status:** Frozen before implementation; implemented and independently cross-verified.

## 1. Problem

`ReferenceFrameFactorHeterarchy` currently derives one SHA-256 digest, retains 30 content bits, and reserves its final bit to distinguish object and position factors. The state fails closed if a different evidence ID claims an occupied retained ID, but the retained identifier domain is unnecessarily small for a content-addressed factor ledger. This contract repairs that finite implementation boundary. It makes no cryptographic collision-resistance claim about SHA-256 and does not turn RFFH into a multi-variable heterarchical inference engine.

## 2. Declared identifier model

For an accepted message with immutable `(EvidenceId, ContentFingerprint)`, derive separate SHA-256 inputs:

```text
RFFH/object-factor/v1 | EvidenceId | ContentFingerprint
RFFH/position-factor/v1 | EvidenceId | ContentFingerprint
```

For a declared retained width `b ∈ [1,31]`, retain the low `b` unsigned digest bits. Map object-factor values to the nonnegative `int32` namespace and position-factor values to the negative `int32` namespace. The two namespaces are disjoint, so object/position distinction consumes no retained content bit. Production `tryCreate` uses `b=31`; an explicitly named test constructor may use smaller widths only to construct collisions reproducibly.

| Property | Required result |
|---|---|
| Same immutable content | Same object and position IDs across runs and arrival orders. |
| Same evidence ID, changed content | Existing visible evidence conflict; no new factor. |
| Different evidence IDs, same retained object or position ID | `RFFH-FACTOR-ID-COLLISION`; neither graph nor posterior changes. |
| Object versus position ID | Object ID is nonnegative; position ID is negative; equality is impossible. |
| Retained width outside `[1,31]` | Teaching error, no state. |
| Collision search | Finite sequential candidate enumeration only in the test harness; production allocation never probes or picks an order-dependent alternative. |

## 3. Scope and limitation

The underlying generic `FactorGraph` currently keys factors by signed 32-bit `int`, so this repair can retain at most **31 digest bits per disjoint namespace** without a repository-wide key-type generalization. It is a twofold per-namespace widening over the current 30-bit payload, not a false claim of 64-bit factor IDs. A future `uint64` or content-key graph refactor must be separately contracted, migration-tested, and deployed with explicit compatibility handling.

Collision refusal intentionally preserves uncertainty: the incoming fact is not converted into a posterior contribution, and its caller receives a bounded teaching error directing retention outside the fold. It does not establish system-wide commutative convergence; RFFH's Bayesian fold remains separate from the content-addressed multi-value evidence-set CRDT.

## 4. Finite controls and decision rule

Use an eight-bit test-only retained domain to enumerate candidate message identities until a real distinct-content collision is found. Verify the collision's retained ID equality, named refusal, unchanged accepted count, unchanged object posterior, unchanged position posterior, and preservation of the original factor-owner state. Kill a mutant that reuses one digest for both namespaces or allows the conflicting factor to overwrite the first.

Implementation may proceed only with the test seam, exact refusal controls, arrival-order/replay controls, strict F# compilation, the full Bayesian suite, and an independently authored reporter. It passes only if valid production behavior remains unchanged except for deterministic new IDs, and every constructed collision is refused without state mutation.

## 5. Measured finite result

The production default now uses a 31-bit retained SHA-256 projection in each domain-separated signed namespace. The test-only eight-bit constructor finds a genuine distinct-message collision within the declared finite candidate enumeration. The collision returns `RFFH-FACTOR-ID-COLLISION`, leaves the accepted count at one, leaves the original object and position posterior unchanged, and does not allocate an alternative factor ID.

The focused F# suite passes **26 RFFH scenarios**, including the three new namespace, collision, and invalid-width controls. The self-contained F# reporter and strict TypeScript comparator pass **20 finite witness groups**, adding public confirmation that object IDs are nonnegative, position IDs negative, the namespaces are disjoint, and the retained-domain collision refuses without changing accepted evidence.

This outcome does not establish collision impossibility, 64-bit factor IDs, a system-wide order-independent Bayesian update, or a multi-variable RFFH topology. It is a bounded safer identifier projection and refusal discipline under the current 32-bit generic graph API.
