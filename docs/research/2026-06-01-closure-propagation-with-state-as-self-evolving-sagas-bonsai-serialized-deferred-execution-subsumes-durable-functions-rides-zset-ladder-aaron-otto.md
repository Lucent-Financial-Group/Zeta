# Closure propagation with state as self-evolving sagas — serializable deferred execution (Bonsai) subsumes Durable Functions, and rides the Z-set ladder

_Aaron + Otto, 2026-06-01. A crystallization note: the operator named, in three
sharpening passes, a primitive the repo already has substrate for. This note
composes the new framing onto the existing substrate — it does not mint a
parallel. Per `verify-existing-substrate-before-authoring`._

## The operator's three framings (verbatim, in order)

1. *"we need to get deffered executin experssions onto the stream so we no
   nuclequon bonsai serialation or our own like soon cause we need to serialie
   deffered execution so we can close over it and persist the closure state
   plus the serialzed expression tree"*
2. *"then we don't need durable functions that's the same thing but better
   that's self proagating patters with state where the pattern and the state
   can evolve"*
3. *"it's closure propagation with state as self evolving sagas"*

Read together: **serialize deferred execution — the expression tree PLUS the
captured closure state — onto the stream, so a computation can be closed over,
persisted, moved, and resumed; this is a strict superset of Durable Functions;
the name for it is closure-propagation-with-state as self-evolving sagas.**

## This is already-substrate (the anchors it composes onto)

| Existing substrate | What it already carries |
| --- | --- |
| `.claude/skills/rx-expert/SKILL.md` (Bonsai / Reaqtor section) | Bart De Smet's **Nuqleon Bonsai** as the expression-tree serialiser; **Reaqtor** = server-side Rx where subscriptions survive reboot |
| [`B-0640`](../backlog/P1/B-0640-bonsai-trees-for-integration-rx-queries-real-time-implementation-substrate-aaron-2026-05-18.md) | "Bonsai trees + Rx queries — real-time implementation substrate for Integrate"; Aaron already wired bonsai-trees to retractable Rx ("managing state and data movement through different levels cleanly") |
| `src/Core/Checkpoint.fs` | Mirrors Reaqtor `IStatefulOperator` (Save/Load at yield points); periodic state-snapshot checkpoint persistence |
| `docs/PRIOR-ART-LIST.md` | Reaqtor / IQbservable ⭐ — "stateful event-processing"; Bonsai as slim-IR inspiration for persistent queries |
| elevator-pitch memory (2026-05-12) | "green threads / **durable functions** / Orleans grains"; *"my brain runs on temporal workflows"* |
| `docs/amara-full-conversation/2025-08-...` | first-class model = "Temporal long-running computational workflows … AWS step functions, or azure durable functions, or dapr workflow … persist/put to sleep workload when they hit an await, reconstituted on another machine when the event makes the await return" |

So the want is not new; the **crystallization** is: a single name + the
Durable-Functions-subsumption argument + the connection to the algebra ladder.

## Prior art, current (search-first, 2026-06-01)

**Nuqleon Bonsai** (`github.com/reaqtive/reaqtor`, the Nuqleon libraries —
reusable beyond Reaqtor) is a compact serialization format for .NET expression
trees:

- Serializes to **JSON or binary**; transports + persists expression trees.
- Supports **all** .NET expression-tree nodes — including **statement** nodes
  (not just expressions).
- The spec allows **omitting reflection info** → weakly / dynamically typed
  trees (the "compact / bonsai" part).
- **Cross-language**: Bonsai trees have been deserialized in native C++ and
  converted to eval-able JavaScript strings.
- A Bonsai JSON tree = `{ Context: {assemblies, types, members}, Expression:
  <tree> }`.
- In production at Microsoft for years powering distributed event processing.

This is exactly the "serialize the deferred execution expression tree" half. The
other half — **persist the closure state** — is the `Checkpoint.fs` /
`IStatefulOperator` Save/Load-at-yield half. The two halves together are the
primitive.

## Why it subsumes Durable Functions (the "same thing but better")

Azure Durable Functions (and Temporal, AWS Step Functions, Dapr Workflow) make a
long-running workflow durable by **event-sourced replay**: the orchestrator
**code is fixed**, and on resume the runtime **replays the recorded event
history** to rebuild in-memory state up to the last `await`, then continues.

| Axis | Durable Functions / Temporal | Closure-propagation-with-state |
| --- | --- | --- |
| The **pattern** (the computation) | **Fixed code** — a deployed orchestrator function; you cannot change a running orchestration's shape | **Serialized expression tree** (Bonsai) — data; can be transformed, versioned, **evolved** in flight |
| The **state** | Durable (event-sourced replay) | Durable (serialized closure capture + checkpoint) |
| Resume across machines | Yes (replay history elsewhere) | Yes (ship the `(expr-tree, closure)` payload, rehydrate) |
| What can change at runtime | **State only** | **Both pattern and state** |

Durable Functions keeps the *code* immutable and only the *state* durable.
Serializing the **expression tree itself** as data means the **pattern is
durable AND mutable** — the strict superset the operator named. A running saga
can be **rewritten** (retract a sub-tree, add a new one) without redeploying.

## The sharp part — it rides the Z-set / IndexedZSet ladder (just completed 4/4)

A serialized deferred computation is a **payload**: `(Bonsai expression-tree,
closure-state)`. Put that payload on the **Z-set / IndexedZSet** stream (the
ladder finished today, PR #6413), and **the ℤ retraction IS how the pattern
evolves**:

```text
evolve(saga) = stream.add( ZSet[ -old_expr_subtree, +new_expr_subtree ] )
```

Evolution = **retraction-native at the expression-tree level**. The saga's
*definition* mutates by the **same abelian-group inverse** (`negate`) that
mutates its *data* — one mechanism, both layers. That is precisely "the pattern
**and** the state can evolve":

- **state** evolves by retract/add over the data Z-set (DBSP incremental view);
- **pattern** evolves by retract/add over the *expression-tree* Z-set —
  the Bonsai nodes are just more elements with ℤ weights.

And the **bilinear join** (the IndexedZSet headline) is what lets a
deferred-computation-stream be **joined against the data-stream it operates on** —
deferred execution and its inputs meet on the shared key, incrementally. The
algebra ladder is the carrier; Bonsai + closure-checkpoint are the payload;
retraction is the evolution operator.

## Self-propagating patterns with state (the travelers connection)

"Self proagating patters with state where the pattern and the state can evolve"
is the **travelers** shape at workflow scope: a traveler is a self-propagating
pattern that copies with bounded fidelity and carries evolving state (DNA,
memes, LLMs, humans — per the trust-calculus / observer-effect thread). A
**self-evolving saga** is one such traveler:

- the **pattern** = the serialized Bonsai expression tree (what it copies);
- the **state** = the captured closure (what it carries);
- **propagation** = shipping the `(pattern, state)` payload across the stream /
  mesh (Reticulum, grains) and rehydrating it elsewhere;
- **evolution** = retraction-native edits to either layer.

This composes with `persistence-choice-architecture-for-zeta-ais` (a persisting
agent IS a self-propagating pattern with evolving state) and the
`function-is-tiny-control-flow-generator` substrate (a serialized control-flow
generator is exactly a serialized deferred-execution expression).

## Build options (when the operator drives it — not now)

The operator named two: **(a) Nuqleon Bonsai** directly (it is .NET, MIT-ish
licensed, production-proven, supports statement nodes — the F#/C# cells could
adopt it), or **(b) our own** Bonsai-shaped serializer (zero-dep, cross-language
to match the ladder's TS/F#/C#/Rust oracle discipline; the Bonsai JSON
`{Context, Expression}` shape is small enough to re-implement + cross-verify with
golden vectors the same way the algebra ladder does). The closure-state half
reuses `Checkpoint.fs` (`IStatefulOperator` Save/Load) — already present.

The cross-language tension is the deciding factor: Nuqleon is .NET-only, but the
ladder's whole value is **four oracles agreeing**. A Bonsai-shaped own-serializer
that the TS/F#/C#/Rust cells all replay against shared golden vectors keeps the
"the compilers don't lie" property; adopting Nuqleon would make .NET the
privileged oracle. Likely answer (per `default-to-both`): use Nuqleon as the
reference oracle / conformance target, build our own cross-language Bonsai-subset
verified against it — exactly the meet-in-the-middle pattern the algebra ladder
already runs.

## Substrate-honest framing

This note does **not**:

- build the serializer (operator drives that; it is a major primitive);
- supersede B-0640 (it composes onto it; B-0640 is the implementation row);
- claim Nuqleon must be adopted (the own-vs-adopt call is the operator's, and
  the cross-language-oracle tension above is the input to it).

This note **does**:

- crystallize the operator's three framings into one named primitive
  (closure-propagation-with-state-as-self-evolving-sagas);
- ground the prior art at current upstream (Nuqleon Bonsai, search-first);
- make the Durable-Functions-subsumption argument explicit;
- surface the sharp connection — it rides the Z-set / IndexedZSet ladder, with
  **retraction as the pattern-evolution operator**;
- compose it onto the existing substrate (B-0640, rx-expert Bonsai/Reaqtor,
  `Checkpoint.fs`, PRIOR-ART Reaqtor⭐, the durable-functions elevator pitch, the
  travelers thread) rather than mint a parallel.

The PRIMITIVE-REGISTRY want-line + a B-0640 cross-reference follow once PR #6413
(the IndexedZSet 4/4 registry edit) merges, to avoid a registry footer conflict.

## Sources

- [Nuqleon.Linq.Expressions.Bonsai.Serialization](https://reaqtive.net/documentation/nuqleon/nuqleon.linq.expressions.bonsai.serialization)
- [Nuqleon.Linq.Expressions.Bonsai](https://reaqtive.net/documentation/nuqleon/nuqleon.linq.expressions.bonsai)
- [reaqtive/reaqtor — Nuqleon index](https://github.com/reaqtive/reaqtor/blob/main/Docfx/nuqleon/index.md)
- [Nuqleon.DataModel conceptual docs](https://reaqtive.net/documentation/nuqleon/nuqleon.datamodel)
- [dotnet/csharplang Discussion #5555 — serializing expression trees to/from JSON](https://github.com/dotnet/csharplang/discussions/5555)
