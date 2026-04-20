## Purpose

The operator-algebra capability defines the core data-model and stream operators
that every other capability in the library builds on: the Z-set abelian group,
its signed-weight retraction semantics, and the four stream operators — delay
(`z^-1`), integration (`I`), differentiation (`D`), and incremental-distinct
(`H`) — together with the algebraic laws that make incremental view maintenance
compositional. It also specifies the bilinearity of join and the chain-rule
identity `Q^Δ = D ∘ Q ∘ I` from the DBSP paper. This spec is language-agnostic:
it pins the observable behaviour of the algebra, not any particular runtime or
host-language surface.

## Requirements

### Requirement: Z-set as a finitely-supported signed multiset

A Z-set over a key type MUST behave as a finitely-supported map from keys to
signed 64-bit integer weights, with the invariant that a key is never present
with a zero weight in any exposed representation.

#### Scenario: adding a key and its negation yields empty

- **WHEN** a Z-set containing `(k, +1)` is added to a Z-set containing `(k, -1)`
- **THEN** the resulting Z-set MUST be the empty Z-set
- **AND** iterating its entries MUST produce zero entries

#### Scenario: look-up of an absent key

- **WHEN** the weight of a key not present in a Z-set is requested
- **THEN** the result MUST be `0`
- **AND** the look-up MUST NOT raise an exception

#### Scenario: equality ignores insertion order

- **WHEN** two Z-sets are constructed from the same `(key, weight)` pairs in
  different orders
- **THEN** they MUST compare equal
- **AND** their entry sequences MUST be identical after normalisation

### Requirement: Z-set operations form an abelian group under addition

Addition, negation, and subtraction on Z-sets MUST satisfy the abelian-group
laws (associativity, commutativity, identity, inverse) pointwise over keys, and
the group operations MUST preserve the "no zero-weight entries" invariant.

#### Scenario: group identity is the empty Z-set

- **WHEN** the empty Z-set is added to any Z-set `a`
- **THEN** the result MUST equal `a`

#### Scenario: subtraction is addition of negation

- **WHEN** Z-sets `a` and `b` are given
- **THEN** `a - b` MUST equal `a + (-b)` for every key's weight

### Requirement: `z^-1` is a strict one-tick delay

The delay operator MUST emit on every tick the value its input carried on the
previous tick, and MUST emit a declared initial value on the very first tick.
The delay operator MUST be strict — i.e., it MUST break feedback cycles for the
topological schedule so that the circuit builder can accept DAGs that would
otherwise contain a cycle.

#### Scenario: first tick emits the initial value

- **WHEN** a circuit with a delay is stepped for the first time with input `x0`
- **THEN** the delay's output at tick 0 MUST equal the declared initial value
- **AND** the input `x0` MUST be captured as the state for tick 1

#### Scenario: subsequent ticks emit the previous input

- **WHEN** the circuit is stepped again with input `x1`
- **THEN** the delay's output MUST equal `x0`
- **AND** stepping again with `x2` MUST emit `x1`

### Requirement: integration accumulates by the group operation

The integration operator on a stream carrying values from an abelian group MUST
publish, at tick `t`, the running sum over the group of every input value
observed at ticks `0..t` inclusive, using the declared zero as the starting
accumulator.

#### Scenario: integration of a Z-set delta stream

- **WHEN** an integration operator receives, in order, the delta Z-sets
  `{(k,+1)}`, `{(k,+1)}`, and `{(k,-1)}`
- **THEN** its outputs at ticks 0, 1, 2 MUST be the Z-sets
  `{(k,+1)}`, `{(k,+2)}`, and `{(k,+1)}` respectively
- **AND** feeding an additional `{(k,-1)}` at tick 3 MUST produce the empty Z-set

### Requirement: differentiation is the inverse of integration on causal streams

The differentiation operator MUST publish, at tick `t`, the group difference
between the current input value and the input value at tick `t-1`, using the
declared zero for `t=0`. The identities `D ∘ I = id` and `I ∘ D = id` MUST hold
for any causal input stream.

#### Scenario: D composed with I is the identity

- **WHEN** any Z-set delta stream is fed through integration and then
  differentiation in the same circuit
- **THEN** each tick's output MUST equal the corresponding tick's input
- **AND** this MUST hold for retraction-bearing streams (inputs with negative
  weights) as well as monotone streams

### Requirement: chain rule for incrementalization

For any operator `Q` on a group-valued stream, the incrementalized form `D ∘ Q
∘ I` MUST be observably equivalent to applying `Q` to the integrated stream and
then differentiating. When `Q` is linear (i.e., `Q(a + b) = Q(a) + Q(b)` and
`Q(-a) = -Q(a)`), the incrementalized form MUST simplify to `Q` itself on the
delta stream.

#### Scenario: linear operator incrementalizes to itself

- **WHEN** a linear operator (e.g., map, filter, plus, minus, cartesian,
  indexed-join when one side is held fixed) is wrapped in `D ∘ Q ∘ I`
- **THEN** the resulting circuit MUST produce the same delta stream as feeding
  the deltas directly through `Q`
- **AND** this equivalence MUST hold under retractions

### Requirement: bilinearity of join yields the three-term incremental formula

Join on Z-sets MUST be bilinear over the Z-set group: for all Z-sets
`a1, a2, b1, b2`, `(a1 + a2) ⋈ b = a1 ⋈ b + a2 ⋈ b` and
`a ⋈ (b1 + b2) = a ⋈ b1 + a ⋈ b2`. As a consequence, the incremental form of
join MUST be computable as the three-term sum
`Δa ⋈ Δb + z^-1(I(a)) ⋈ Δb + Δa ⋈ z^-1(I(b))` without materialising the full
relations.

#### Scenario: incremental join reproduces batch join

- **WHEN** two delta streams are fed through the three-term incremental join,
  and the same delta streams are also integrated and joined with a batch
  operator
- **THEN** differentiating the batch-joined stream MUST equal the output of the
  incremental form at every tick
- **AND** this MUST hold under interleaved inserts and retractions on either side

#### Scenario: join against an empty side is empty

- **WHEN** either side of an incremental join carries the empty Z-set at tick `t`
  with no prior non-empty history
- **THEN** the incremental-join output at tick `t` MUST be empty

### Requirement: `H` is the boundary-crossing increment of distinct

The incremental-distinct operator `H` MUST, given the integrated history before
the current delta and the current delta, emit only the keys whose integrated
weight crosses the positivity boundary (strictly positive to non-positive, or
non-positive to strictly positive). Its work MUST be bounded by the size of the
delta, independent of the size of the integrated history.

#### Scenario: boundary crossing upward

- **WHEN** a key's prior integrated weight is `0` and the delta carries `(k,+1)`
- **THEN** `H` MUST emit `(k,+1)`

#### Scenario: boundary crossing downward

- **WHEN** a key's prior integrated weight is `+1` and the delta carries `(k,-1)`
- **THEN** `H` MUST emit `(k,-1)`

#### Scenario: no boundary crossing

- **WHEN** a key's prior integrated weight is `+2` and the delta carries `(k,+1)`
- **THEN** `H` MUST NOT emit that key in its output Z-set

### Requirement: retraction-native invariants

Every operator defined by this capability MUST accept streams carrying negative
Z-weights (retractions) and MUST produce the same observable result as
reconstructing the integrated relation from scratch after the retraction. No
operator defined here requires a separate "tombstone" or "delete pass" to honor
a retraction.

#### Scenario: retraction of an inserted fact

- **WHEN** a fact is inserted at tick `t1` and retracted at tick `t2 > t1`
  through any linear operator chain defined by this capability
- **THEN** the integrated output at tick `t2` MUST NOT contain the retracted
  fact
- **AND** no subsequent tick MUST re-surface the retracted fact unless a new
  positive delta for that fact arrives

### Requirement: operator lifecycle

Every operator participating in the algebra MUST present a lifecycle of four
observable phases: *construction*, *step*, *after-step*, and *reset*. The
construction phase MUST be observable-side-effect-free (no emission, no
clock-advance). Every step phase MUST correspond to exactly one tick of the
enclosing clock scope and MUST make its output observable before the step
returns. The after-step phase MUST run after every operator in the scope has
completed its step, and MUST NOT write to any operator's output. A reset MUST
return every operator to the observable state it had at tick 0, including
delays re-emitting their declared initial values.

#### Scenario: construction is side-effect-free

- **WHEN** an operator is constructed but the enclosing circuit is never
  stepped
- **THEN** no value MUST be emitted to any downstream operator
- **AND** reading the operator's output MUST yield the declared zero-value of
  the output type

#### Scenario: output is observable after step returns

- **WHEN** a step phase for operator `O` completes at tick `t`
- **THEN** any consumer reading `O`'s output after the step returns MUST see
  the value computed for tick `t`
- **AND** this visibility MUST hold across threads when the consumer respects
  the documented memory-ordering fence

#### Scenario: reset replays the epoch

- **WHEN** a circuit is stepped for `n` ticks, then reset, then stepped again
  with the same input sequence
- **THEN** every operator's output at tick `t` in the second pass MUST equal
  its output at tick `t` in the first pass
- **AND** delay operators MUST re-emit their declared initial values at tick 0

### Requirement: strict operators break feedback cycles for scheduling

An operator MUST declare whether it is *strict* — i.e., whether its output at
tick `t` is independent of its input at tick `t`. Exactly the strict operators
(of which `z^-1` is the canonical example) MUST be sufficient to topologically
schedule a circuit that would otherwise contain a cycle. Non-strict operators
in a cycle without a strict operator on the feedback path MUST produce a
circuit-construction error.

#### Scenario: delay on the feedback path makes the circuit schedulable

- **WHEN** a circuit has a feedback edge from operator `B` back to operator
  `A`, with a `z^-1` on that edge
- **THEN** the circuit MUST be accepted for scheduling
- **AND** the topological order MUST respect `A` before `B` at every tick

#### Scenario: cycle without a strict operator fails construction

- **WHEN** a circuit is constructed with a cycle containing no strict operator
- **THEN** circuit construction MUST fail with an error identifying the cycle
- **AND** the error MUST NOT be silently converted into a cycle-breaking
  heuristic

### Requirement: clock scopes and tick monotonicity

A clock scope MUST group a set of operators that step in lockstep. Every
operator in a scope MUST receive the same tick count per outer step. Tick
counts within a scope MUST be monotonically non-decreasing. Nested clock
scopes MUST run their inner ticks to a scope-declared fixpoint (or a
capability-level iteration cap) before the outer tick completes. The output
observed at an outer scope's tick `T` MUST be the inner scope's output at its
own final inner tick for that outer tick.

#### Scenario: nested scope runs to fixpoint per outer tick

- **WHEN** an outer circuit embeds an inner scope with a declared
  fixpoint-detector
- **THEN** for each outer tick, the inner scope MUST step until the
  fixpoint-detector returns `true`
- **AND** the outer tick MUST NOT be observed as complete until the inner
  scope has reached fixpoint (or hit the iteration cap)

#### Scenario: sibling scopes are independent

- **WHEN** two clock scopes are siblings in the same outer circuit
- **THEN** a tick advancement in one sibling MUST NOT advance the tick count
  in the other sibling
- **AND** their operators' observable state MUST evolve independently

### Requirement: incremental-wrapper preserves the chain rule

The capability MUST expose a wrapper `Incrementalize(Q)` that, for any
operator `Q` over a group-valued stream, produces an operator observably
equivalent to `D ∘ Q ∘ I`. When `Q` is known to be linear or bilinear, the
wrapper MUST be permitted (but not required) to substitute an optimized form:
`Q` directly for linear `Q`, or the three-term formula for bilinear `Q` (see
"bilinearity of join" above). Any such substitution MUST be observationally
equivalent to the unoptimized `D ∘ Q ∘ I` over the full stream, including
under retractions.

#### Scenario: wrapper is a semantic identity on linear operators

- **WHEN** `Incrementalize(Q)` is applied where `Q` is linear
- **THEN** its output delta stream MUST equal the delta stream produced by
  feeding the deltas directly through `Q`
- **AND** this MUST hold when the substitute-to-`Q` optimization is enabled
  and when it is disabled

#### Scenario: wrapper is a semantic identity on bilinear join

- **WHEN** `IncrementalJoin` is applied to two delta streams `Δa`, `Δb`
- **THEN** its output at every tick MUST equal
  `Δa ⋈ Δb + z^-1(I(a)) ⋈ Δb + Δa ⋈ z^-1(I(b))`
- **AND** this MUST hold under interleaved inserts and retractions on either
  side

### Requirement: representation invariants of the reference Z-set

A reference implementation of `ZSet[K]` MUST expose a representation that (a)
supports O(n + m) group operations over two Z-sets of sizes n and m, (b)
permits zero-allocation iteration over the normalised `(key, weight)` pairs,
and (c) never exposes a zero-weight entry in any public iteration. Alternate
representations MAY be chosen by the implementation so long as the observable
behaviour of every other requirement in this capability is preserved. The
representation-performance contract is a *reference* contract; a minimal
correctness-only recovery is permitted to use a hash table at the cost of
losing the linear-time group-operation guarantee.

#### Scenario: iteration is zero-allocation on the reference representation

- **WHEN** the reference representation is iterated over its `(key, weight)`
  pairs
- **THEN** no managed heap allocation MUST occur beyond what the iteration
  consumer explicitly requests
- **AND** the iteration MUST yield the pairs in a deterministic order that
  matches the normalisation order used for equality

#### Scenario: recovery implementations MAY trade performance for simplicity

- **WHEN** a recovery implementation chooses a hash-table representation
- **THEN** every correctness requirement in this capability MUST still hold
- **AND** the implementation MUST document the loss of the linear-time
  group-operation contract as a deliberate recovery trade-off
