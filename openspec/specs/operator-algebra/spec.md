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

#### Scenario: weight arithmetic overflow is observable

- **WHEN** a sequence of group operations on a Z-set would drive any single
  key's accumulated weight outside the signed 64-bit range
- **THEN** the operation producing the overflow MUST surface a checked-
  arithmetic failure to its caller rather than silently wrapping around
  modulo 2^64
- **AND** the failure MUST NOT corrupt unrelated keys' weights in the same
  operation — the Z-set observable after the failure MUST be either
  (a) unchanged from before the failing operation or (b) reflect every
  non-overflowing update with the overflowing key's weight left at its
  pre-operation value; implementations MUST pick one of these two
  behaviours and document it at the profile layer

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

#### Scenario: reconstruction re-emits the declared initial value

- **WHEN** a circuit containing a delay is torn down at tick `N ≥ 1` and a
  fresh circuit of the same topology is constructed
- **THEN** the fresh delay's output at its own first tick MUST equal the
  *declared* initial value, NOT the value the prior-lifetime delay would
  have emitted at tick `N+1`
- **AND** this MUST hold regardless of how many ticks the prior circuit
  ran — reconstruction is a clean-state observable, not a warm-restart,
  and any warm-restart semantics MUST be implemented at a higher
  capability (e.g., the durability capability) that re-feeds the prior
  tick's input before the first post-reconstruction step

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

#### Scenario: intermediate term size may exceed final-delta size

- **WHEN** a three-term incremental join is computed on deltas that trigger
  cancellation between the three terms (e.g., `Δa ⋈ Δb` produces
  `(k, +w)` and `Δa ⋈ z^-1(I(b))` produces `(k, -w)` for the same `k`)
- **THEN** the implementation MUST budget working memory for the sum of the
  three *pre-cancellation* term sizes rather than the size of the final
  output delta
- **AND** the final observable output delta MUST equal the algebraic sum
  of the three terms (per "incremental join reproduces batch join" above),
  regardless of the intermediate materialisation strategy
- **AND** implementations MAY stream or fuse the three terms so long as the
  final observable output is preserved, but MUST NOT silently truncate
  intermediate entries based on the final-delta size

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

Every operator participating in the algebra MUST present a lifecycle of three
per-tick observable phases — *construction*, *step*, *after-step* — plus the
two *scope-boundary* phases *clock-start* and *clock-end* that run when the
enclosing clock scope opens and closes (see "clock scopes and tick
monotonicity" below). The construction phase MUST be observable-side-effect-
free (no emission, no clock-advance). Every step phase MUST correspond to
exactly one tick of the enclosing clock scope and MUST make its output
observable before the step returns. The after-step phase MUST run, for every
*strict* operator in the scope (and only for strict operators), after every
operator's step for the current tick has completed. The after-step phase
MUST NOT make new output observable — it is the latch-capture phase used by
strict operators (e.g., the delay operator) to record their current input as
the state they will emit on the next tick. There is no operator-level
"reset" phase; determinism across reconstructions is the equivalent guarantee
(see scenario below).

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

#### Scenario: after-step is selective to strict operators

- **WHEN** a tick completes in a scope containing both strict and non-strict
  operators
- **THEN** the after-step phase MUST be invoked exactly once on every strict
  operator in the scope
- **AND** non-strict operators MUST NOT observe an after-step phase
  (their step phase alone is responsible for publishing their current-tick
  output)

#### Scenario: determinism under structural equivalence

- **WHEN** two freshly-constructed circuits of the same topological structure
  are each stepped with the same input sequence from tick 0
- **THEN** every pair of corresponding operators MUST produce the same output
  at every tick
- **AND** delay operators in both circuits MUST emit their declared initial
  values at tick 0
- **AND** this equivalence MUST hold without any operator-level "reset"
  mechanism — reconstruction is the supported route to a replayed epoch

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

A clock scope MUST also expose two *scope-boundary* lifecycle phases —
*clock-start* at scope entry and *clock-end* at scope exit — that every
operator in the scope participates in. On clock-start, each operator MAY
initialise per-scope state (e.g., the per-outer-tick accumulators of a
nested-scope integrator). On clock-end, each operator MAY release or commit
per-scope state. For a nested inner scope, clock-start MUST run before the
scope's tick 0, and clock-end MUST run after the scope reaches fixpoint (or
the iteration cap) and before the outer tick is observed as complete.

#### Scenario: nested scope runs to fixpoint per outer tick

- **WHEN** an outer circuit embeds an inner scope with a declared
  fixpoint-detector
- **THEN** for each outer tick, the inner scope MUST step until the
  fixpoint-detector returns `true`
- **AND** the outer tick MUST NOT be observed as complete until the inner
  scope has reached fixpoint (or hit the iteration cap)
- **AND** the fixpoint-detector MUST be scope-level — attached to the
  clock scope itself, not to any individual operator — so that the
  detector sees the post-tick observable state of every operator in the
  scope rather than a single operator's local state
- **AND** operators within the scope MUST NOT individually short-circuit
  a scope tick based on their own "I've converged" opinion; only the
  scope-level detector MAY terminate the iteration

#### Scenario: scope-boundary phases bracket every nested run

- **WHEN** an outer circuit steps and an inner scope runs to fixpoint
- **THEN** every operator in the inner scope MUST observe exactly one
  *clock-start* invocation before the scope's first inner tick
- **AND** every operator MUST observe exactly one *clock-end* invocation
  after the scope's final inner tick and before the outer tick is observed
  as complete
- **AND** per-scope state established in clock-start MUST be visible for the
  entirety of the inner scope's ticks and MUST be released (or committed) in
  clock-end

#### Scenario: sibling scopes are independent

- **WHEN** two clock scopes are siblings in the same outer circuit
- **THEN** a tick advancement in one sibling MUST NOT advance the tick count
  in the other sibling
- **AND** their operators' observable state MUST evolve independently

#### Scenario: iteration cap without fixpoint is an observable failure

- **WHEN** a nested scope steps up to its declared iteration cap without
  the fixpoint-detector ever returning `true`
- **THEN** the outer step MUST surface an observable cap-exceeded failure
  to its caller rather than silently publishing the state at the cap-th
  inner tick as if it were the fixpoint
- **AND** the failure MUST identify (a) the scope that failed to converge
  and (b) the cap that was hit, so the caller can distinguish a
  configured-too-low cap from a genuine non-convergence
- **AND** the clock-end phase for operators in the failing scope MUST
  still run, so per-scope state is released or committed under a
  documented partial-completion contract rather than leaked

### Requirement: incremental-wrapper preserves the chain rule

The capability MUST expose a wrapper `Incrementalize(Q)` that, for any
operator `Q` over a group-valued stream, produces an operator observably
equivalent to `D ∘ Q ∘ I`. When `Q` is known to be linear or bilinear, the
wrapper MAY substitute an optimized form — `Q` directly for linear `Q`, or
the three-term formula for bilinear `Q` (see "bilinearity of join" above).
Any such substitution MUST be observationally
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

#### Scenario: wrapper is a semantic identity on distinct

- **WHEN** `IncrementalDistinct` is applied to a delta stream
- **THEN** its output at every tick MUST equal
  `D ∘ distinct ∘ I` over the delta stream, where `distinct` is the
  set-projection that clips every positive integrated weight to `+1`
  and every non-positive weight to `0`
- **AND** equivalently, its output at every tick MUST equal the
  boundary-crossing increment `H(prior integrated history, current delta)`
  as defined by the "`H` is the boundary-crossing increment of distinct"
  requirement — work bounded by the delta size, independent of the
  integrated history
- **AND** the equivalence between the `D ∘ distinct ∘ I` form and the `H`
  form MUST hold under interleaved inserts and retractions

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
- **AND** the iteration MUST yield the pairs in ascending order by the
  declared comparer of the key type — i.e., for every pair of adjacent
  yielded entries `(k_i, w_i)` and `(k_{i+1}, w_{i+1})`, the comparer
  MUST report `k_i < k_{i+1}`
- **AND** this ascending-by-key order MUST be the same order used by the
  normalisation the equality requirement in "Z-set as a finitely-
  supported signed multiset" depends on

#### Scenario: recovery implementations MAY trade performance for simplicity

- **WHEN** a recovery implementation chooses a hash-table representation
- **THEN** every correctness requirement in this capability MUST still hold
- **AND** the implementation MUST document the loss of the linear-time
  group-operation contract as a deliberate recovery trade-off
