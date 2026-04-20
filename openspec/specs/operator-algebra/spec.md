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

#### Scenario: normalisation orders entries ascending by key

- **WHEN** a Z-set is normalised for equality, iteration, serialization,
  or any other exposed observable sequence
- **THEN** the normalised sequence MUST yield `(key, weight)` pairs in
  strictly ascending order under the declared key comparer — for every
  pair of adjacent yielded entries `(k_i, w_i)` and `(k_{i+1}, w_{i+1})`,
  the comparer MUST report `k_i < k_{i+1}`
- **AND** this MUST be the single canonical order used by (a) the
  order-independent equality contract, (b) the reference representation's
  zero-allocation iteration (see "representation invariants of the
  reference Z-set"), and (c) any serialization format this capability
  exposes — two Z-sets normalised on different machines MUST produce
  byte-identical serializations when the key comparer is a total order
- **AND** the ascending-by-key invariant MUST hold at every observable
  step boundary, not merely at final sink output — an implementation
  that stores entries in a non-ascending representation internally MUST
  still present an ascending sequence to every observable consumer

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

For any operator `Q` on a group-valued stream, the incrementalized form `D ∘ Q ∘ I` MUST be observably equivalent to applying `Q` to the integrated stream and
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

#### Scenario: output publication has release / acquire semantics

- **WHEN** a step phase completes at tick `t` and publishes its output slot
- **THEN** the publication MUST be a *release-semantics* write — every
  write the producing operator made to its internal state prior to the
  publication MUST be observable to any thread that subsequently performs
  an acquire-semantics read of the published slot
- **AND** a consumer reading the output MUST use an *acquire-semantics*
  read on the published slot — after the acquire-read observes the tick-`t`
  value, every subsequent read on the same thread MUST observe the
  producing operator's pre-publication writes
- **AND** the documented memory-ordering fence for cross-thread output
  observation is exactly release-on-write and acquire-on-read; weaker
  orderings (relaxed / consume / plain non-atomic) MUST NOT be used on
  the observation path, and stronger orderings (sequentially-consistent)
  MAY be used but MUST NOT be relied upon by consumers for correctness
- **AND** the release / acquire pair MUST hold whether the output slot
  is implemented as a volatile field, an atomic reference, a
  memory-barrier-guarded mutable cell, or any equivalent primitive the
  host platform provides — the contract is on the observable ordering,
  not on the specific primitive chosen

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

### Requirement: async-lifecycle declaration and fast-path step

Every operator MUST declare whether it is *async-capable* — i.e., whether its step phase MAY return before having fully computed its tick-`t` output, completing the remainder of the work on a continuation that an orchestrator MUST await
before observing the tick as complete. An operator that does not declare
itself async-capable MUST compute and publish its tick-`t` output
synchronously within its step phase. A circuit containing any async-capable
operator MUST still satisfy every observable guarantee specified by the
"operator lifecycle" requirement (publication visibility, after-step
selection, construction-is-side-effect-free, determinism under structural
equivalence); async participation is an implementation-strategy flag, not a
weakening of the observable contract.

A circuit MUST offer a *fast-path step* for the case in which no operator
in the scope is currently deferring — i.e., when the scope is stepping a
topology that contains no async-capable operator, or contains async-capable
operators that have elected not to defer for this tick, the observable
cost of the step MUST NOT include any continuation-dispatch overhead that
a purely synchronous circuit would avoid.

#### Scenario: synchronous-only circuit observes no async overhead

- **WHEN** a circuit contains only operators whose declared async-capable
  flag is false, and the circuit is stepped
- **THEN** the step MUST complete without scheduling any continuation
  infrastructure that a synchronous-only circuit would not schedule
- **AND** the observable latency of the step MUST be dominated by the
  operators' step-phase work, not by continuation dispatch

#### Scenario: async-capable operator that does not defer takes the fast path

- **WHEN** an async-capable operator is stepped at tick `t` but elects to
  complete its work synchronously within the step phase (no continuation
  scheduled)
- **THEN** the enclosing step MUST observe the tick as complete
  immediately upon the step phase returning, without awaiting any
  continuation
- **AND** downstream consumers MUST see the tick-`t` output under the
  same publication-visibility contract as a synchronous operator

#### Scenario: async operator that defers gates tick completion

- **WHEN** an async-capable operator is stepped at tick `t` and elects to
  defer (returns from the step phase with a pending continuation)
- **THEN** the enclosing step MUST NOT be observable as complete for
  tick `t` until every deferred continuation for tick `t` has completed
- **AND** after every deferred continuation has completed, the tick-`t`
  output MUST be observable under the same publication-visibility
  contract as a synchronous operator
- **AND** the orchestrator MUST NOT advance any operator in the scope
  to tick `t+1` while any tick-`t` continuation is outstanding

#### Scenario: async-capable declaration is stable within a clock scope

- **WHEN** a clock scope has entered its first tick with a given topology
- **THEN** no operator's declared async-capable flag MUST change for the
  remaining lifetime of that scope
- **AND** any change to the flag requires either (a) a topology mutation
  that replaces the operator entirely (see "topology-mutation
  serialization") or (b) a scope teardown and reconstruction

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
operator in the scope participates in. On clock-start, each operator that
carries state across scope boundaries MUST reset that state to its declared
scope-initial value (the *strict-operator reset* obligation pinned by
"strict operators reset cross-scope state on clock-start" below); operators
that hold no cross-scope state MAY omit non-trivial work in this phase. On
clock-end, each operator MAY release or commit per-scope state. For a
nested inner scope, clock-start MUST run before the scope's tick 0, and
clock-end MUST run after the scope reaches fixpoint (or the iteration cap)
and before the outer tick is observed as complete.

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

#### Scenario: per-operator fixpoint hints are advisory only

- **WHEN** an operator exposes a per-operator fixpoint predicate — e.g.,
  an `Op.Fixedpoint` hook reporting the operator's own "I've converged
  for this tick" judgement — and the enclosing clock scope observes the
  hook
- **THEN** the scope-level fixpoint-detector MAY consult such hints as
  *advisory input* to its own judgement over the scope's observable
  post-tick state
- **AND** the hints MUST NOT be sufficient on their own to terminate the
  scope iteration — termination MUST require the scope-level detector
  to return `true` over the post-tick observable state of every operator
  in the scope (per "nested scope runs to fixpoint per outer tick")
- **AND** an implementation that chooses not to expose any per-operator
  fixpoint hint MUST still satisfy every requirement in "clock scopes
  and tick monotonicity"; the hook is an optimization surface, not a
  load-bearing part of the semantics
- **AND** an operator that exposes the hook MUST NOT have its own state
  visibly altered by the scope's decision to consult or ignore the hint
  — a scope that ignores the hook MUST produce the same per-operator
  observable state as a scope that consults and corroborates it

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

#### Scenario: strict operators reset cross-scope state on clock-start

- **WHEN** a strict operator — one whose output at tick `t` is independent
  of its input at tick `t`, and which therefore latches state across
  ticks (the canonical example is `z^-1`; feedback-loop accumulators and
  per-outer-tick integrators are the other common cases) — is embedded
  in a nested inner scope that runs for more than one outer tick
- **THEN** on each outer tick the operator MUST observe a clock-start
  phase that resets any state latched during the prior outer tick to its
  declared scope-initial value: a `z^-1`-style one-tick-delay MUST
  re-emit its declared initial value on the first inner tick of each
  outer tick; a feedback-loop accumulator over the inner scope MUST
  reset its accumulator to its declared identity before the first inner
  tick; a per-outer-tick integrator MUST zero its accumulator
- **AND** the observable output on the first inner tick of outer tick
  `T+1` MUST NOT depend on any state latched during outer tick `T`'s
  inner run — this is the "clean tick-0 semantics" required by DBSP
  nested-scope semantics (Budiu et al. §5-6)
- **AND** an implementation that silently inherits prior-outer-tick
  state into the next outer tick's first inner tick MUST be rejected
  by the capability's own observable tests — the latent-until-nested
  failure mode (no test exercises the operator inside `Nest(...)`) is
  NOT an acceptable mitigation; a strict operator MUST reset on
  clock-start whether or not a current test consumer nests it
- **AND** an operator that holds no cross-scope state (its output
  depends only on the current tick's input) MAY no-op in clock-start —
  the reset obligation applies only to operators that actually latch
  state across tick boundaries

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

### Requirement: topology-mutation serialization

Any mutation to the circuit topology after a clock scope has begun stepping MUST appear atomic to every operator in the scope — including operator registration, edge insertion, operator removal, or any
equivalent structural change. Implementations MUST serialize topology mutations through a single
logical *register-lock* so that no step observes a half-installed operator
and no two concurrent mutations interleave their effects. The register-lock
is logical, not a specific lock primitive: implementations MAY realise it as
a mutex, a lock-free installation protocol (e.g., compare-and-swap of an
immutable topology snapshot), or a single-threaded topology actor, so long
as the observable atomicity and total-order guarantees below hold.

#### Scenario: topology mutation is atomic with respect to stepping

- **WHEN** a topology mutation is applied concurrently with an in-flight
  step
- **THEN** the in-flight step MUST either (a) complete entirely against
  the pre-mutation topology or (b) observe the fully-installed post-
  mutation topology from the start of its next tick
- **AND** no step MUST observe a partially-installed operator — e.g., an
  operator visible to the scheduler whose downstream edges have not yet
  been wired, or whose lifecycle-construction phase has not yet completed
- **AND** no step MUST observe a partially-removed operator — e.g., an
  operator whose upstream edges are severed while the operator itself is
  still present in the scheduler's operator set

#### Scenario: concurrent mutations are applied in a well-defined total order

- **WHEN** two or more topology mutations are issued concurrently on the
  same circuit
- **THEN** the mutations MUST be applied in a well-defined total order
  consistent with the logical register-lock's acquisition sequence
- **AND** every operator's view of the topology at every observable tick
  boundary MUST correspond to exactly one prefix of that total order
- **AND** operators MUST NOT observe interleaved partial effects of
  two-or-more concurrent mutations — each applied mutation is atomic
  with respect to every other

#### Scenario: topology mutation respects async-lifecycle declarations

- **WHEN** a topology mutation removes or replaces an async-capable
  operator that has outstanding tick-`t` continuations
- **THEN** the mutation MUST NOT be observable to downstream operators
  until every outstanding tick-`t` continuation of the removed operator
  has completed (or been deterministically cancelled under a documented
  contract)
- **AND** if the mutation replaces the operator, the replacement MUST
  not begin stepping until the predecessor's outstanding continuations
  have resolved — "operator replacement" is a sequential observable, not
  a concurrent one

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

#### Scenario: the exposed wrapper set covers the four chain-rule helpers

- **WHEN** an incremental-extensions surface is offered to consumers of
  this capability
- **THEN** the surface MUST expose at minimum four named wrappers
  corresponding to the four observable specialisations of the chain rule:
  (1) a *generic* wrapper (`Incrementalize(Q)`) that applies the
  unspecialised `D ∘ Q ∘ I` form when `Q` is neither linear nor bilinear
  nor recognised-distinct; (2) a *linear* wrapper specialising to `Q`
  directly on the delta stream when `Q` is linear; (3) a *bilinear-join*
  wrapper (`IncrementalJoin`) implementing the three-term formula; and
  (4) a *distinct* wrapper (`IncrementalDistinct`) implementing the `H`
  boundary-crossing increment
- **AND** each of the four wrappers MUST be observationally equivalent
  to the unspecialised `D ∘ Q ∘ I` form under this capability's
  algebra — consumers MUST be able to swap any specialised wrapper for
  the generic form without observable behavioural change (only cost
  change)
- **AND** the four wrappers MUST cover the full classification surface:
  every operator `Q` this capability defines MUST fall into at least one
  of {generic, linear, bilinear-join, distinct}, so consumers never have
  to construct an ad-hoc wrapper to stay within the chain rule
- **AND** implementations MAY add additional specialised wrappers
  (e.g., filter, selectMany, indexed-join when one side is held fixed)
  as further optimisations, so long as each added wrapper is
  observationally equivalent to the generic form

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
