# User-Declared μένω Event–State Vocabulary Contract

> **Status:** Naming and boundary contract. `μένω` is used here as Addison’s declared project label for the retained, inspectable state view. This contract does not assert an ontology, a correct translation, a language-semantic theorem, a cognitive mechanism, or a claim about any person’s identity.

## Purpose

The project needs a stable way to say that an action happened without mistaking that action for the later state obtained from all retained evidence. The label **μένο view** names the latter: a finite, content-addressed, inspectable state receipt. It is a local project convention, not a universal category.

| Layer | Project vocabulary | Required representation | Must not be conflated with |
| --- | --- | --- | --- |
| Event | **Act** | Immutable, source-identified input or correction receipt. | A final fact, causal order, or state replacement. |
| Retained state | **Meno view** | Canonical content-addressed union of admitted receipts. | A transient request, process identity, or a semantic interpretation. |
| Materialization | **Query receipt** | Deterministic read over a declared state, versions, conflict rules, and canonical order. | A CRDT merge, a new observation, or a trusted authority. |
| Correction | **Counter-act** | A new explicit correction/retraction receipt that remains visible alongside its source. | Deletion of history or a silent last-writer winner. |
| Unresolved input | **Open edge** | A named unknown, missing predecessor, conflict, or out-of-scope form. | Negative evidence, a false causal order, or an inferred intention. |

## Invariants

The vocabulary binds to existing implementation boundaries rather than creating a new data model.

1. The only replicated evidence state is canonical content-addressed union. It is the Meno view’s state operation.
2. Bayesian fusion, lexical materialization, scalar metrics, and geometric adapters are queries over declared state. They never become state merges merely because their outputs are useful.
3. Corrections add visible receipts; a later receipt may supersede a declared materialization but cannot erase the source receipt from the retained evidence set.
4. Equal canonical retained states must generate equal Meno state fingerprints. Floating-point query output requires declared canonical folding order; compensated summation does not create generic order independence.
5. A node that lacks a predecessor or a conflicting branch retains that absence or conflict explicitly. It must not invent an event order or winner.

## Finite Acceptance Evidence

The vocabulary is accepted only insofar as existing bounded controls continue to hold: canonical evidence union/replay, same-surface lexical-correction conflict retention, canonical numerical folding, and the finite lexical-geometric receipt. No user action, phrase, color, shape, or graph is assigned a hidden intent by this contract.

## Non-Claims

This label does not establish that all change, perception, language, people, software agents, or physical systems have the same event/state structure. It does not confer authority on a Meno view, resolve consent, prove persistence outside the retained store, or make a query truth-preserving beyond its declared input contract.
