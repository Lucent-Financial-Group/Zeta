## Purpose

The circuit-recursion capability pins the observable semantics of the
circuit-substrate machinery that the DBSP Section 5-6 recursive-query pattern
is built on: *nested circuits* with a private inner clock, the scope-boundary
lifecycle that brackets each inner run, the iteration cap that bounds a
non-converging inner scope, and the output-extraction contract that publishes
the inner scope's fixpoint value to the enclosing parent circuit. Semantic
combinators that sit on top of this substrate — `Recursive`,
`RecursiveCounting`, `RecursiveSemiNaive`, feedback cells, the
iteration-to-fixedpoint driver — are specified by the sibling
`retraction-safe-recursion` capability; this capability covers the substrate
those combinators run on. The `operator-algebra` capability's "clock scopes
and tick monotonicity" requirement is the authority for the observable
behaviour of *any* clock scope; this capability refines that contract for the
parent-child nested-circuit shape.

## Requirements

### Requirement: nested circuits expose a parent-owned driver operator

A nested-circuit construction MUST produce an operator registered in the
parent circuit whose output stream is a parent-tick `Stream<'T>` and whose
per-outer-tick step drives a private inner circuit to fixpoint (or the
iteration cap) and then publishes a caller-chosen inner stream's current
value as its own output. The construction MUST be expressible in a single
build pass — the caller provides a build callback that receives the
nested-circuit context and returns the inner stream to expose upstream.

#### Scenario: nested-circuit output tracks inner scope's fixpoint value

- **WHEN** a parent circuit contains a nested-circuit driver operator that
  exposes an inner stream `s_inner` as its output
- **THEN** at every parent tick `t`, the driver operator's published value
  MUST equal the value `s_inner` carried at the inner scope's *final* inner
  tick for parent tick `t` — i.e., the inner tick at which fixpoint was
  reached, or the cap-th inner tick if the cap was hit (see
  "iteration-cap-hit preserves fixpoint-failure observability")
- **AND** the parent circuit's downstream operators MUST observe that value
  under the release / acquire publication contract specified by the
  operator-algebra capability

#### Scenario: construction is parent-owned and single-pass

- **WHEN** a caller invokes the nested-circuit build primitive with a build
  callback
- **THEN** the callback MUST receive a nested-circuit context sufficient to
  register inner operators and compose inner streams
- **AND** the callback MUST return exactly one inner stream to expose
  upstream
- **AND** the primitive MUST register its driver operator in the parent
  circuit and return a `Stream<'T>` rooted in the parent — subsequent
  composition against the returned stream MUST behave identically to any
  other parent-tick stream, without the caller having to reach into the
  nested circuit

### Requirement: inner-clock resets at the start of every outer tick

Every parent tick MUST present the nested circuit with a *freshly-zeroed
inner clock* — i.e., strict operators inside the nested scope MUST observe
the same tick-0 semantics they would observe on first construction, for every
outer tick. This is the core of the DBSP paper's nested-stream semantics:
recursion treats each outer tick as a clean LFP computation, not a
continuation of the previous outer tick's inner iteration.

#### Scenario: delay operators inside a nested scope re-emit their initial value each outer tick

- **WHEN** a nested scope contains a `z^-1` (or any other strict operator)
  and the parent circuit is stepped repeatedly
- **THEN** on every outer tick, the strict operator's first inner-tick
  output MUST equal its declared initial value — regardless of how many
  inner ticks the previous outer tick consumed or what state the strict
  operator latched in that previous run
- **AND** this clean-slate observable MUST hold without the caller having to
  tear down and reconstruct the nested circuit between outer ticks

#### Scenario: scope-boundary phases bracket every outer tick

- **WHEN** a nested-circuit driver operator runs for parent tick `t`
- **THEN** every operator in the inner scope MUST observe exactly one
  *clock-start* invocation before the inner scope's first inner tick of
  outer tick `t`
- **AND** every operator MUST observe exactly one *clock-end* invocation
  after the inner scope's final inner tick of outer tick `t` and before
  the driver operator publishes its output
- **AND** these invocations MUST hold even when the inner scope hits the
  iteration cap without converging (see "iteration-cap-hit preserves
  fixpoint-failure observability" below)

### Requirement: fixpoint detection aggregates over every operator in the scope

The inner scope MUST continue iterating until every operator in the scope
reports fixpoint for the current scope-level — i.e., the scope's decision to
terminate is the logical conjunction of every operator's per-operator
fixpoint hint *combined with* the operator-algebra scope-level detector
contract. No individual operator's "I've converged" hint alone MAY terminate
the scope (per the operator-algebra capability's "per-operator fixpoint
hints are advisory only" scenario). The nested-circuit driver realises that
aggregation for the specific case of a single-level inner scope.

#### Scenario: one-operator non-convergence blocks scope termination

- **WHEN** a nested scope contains operators `O_1, ..., O_n` and every
  operator except `O_k` reports fixpoint at inner tick `i`, while `O_k`
  continues to report non-fixpoint
- **THEN** the scope MUST NOT terminate at inner tick `i`
- **AND** the scope MUST step to inner tick `i+1` (bounded by the
  iteration cap)

#### Scenario: all-operators fixpoint terminates the scope

- **WHEN** every operator in the nested scope reports fixpoint at inner
  tick `i ≤ cap`
- **THEN** the scope MUST terminate at inner tick `i`
- **AND** the driver operator's output MUST be published from the inner
  stream's value at inner tick `i`, not from any later iteration

### Requirement: per-outer-tick iteration is bounded by a configurable cap

Every nested circuit MUST expose a configurable *iteration cap* that bounds
how many inner ticks a single outer tick MAY drive, to guarantee that a
non-converging inner scope does not block the parent circuit indefinitely.
The cap MUST default to a documented value sufficient for common
recursive-query depths, and MUST be adjustable by the caller without
reconstruction.

#### Scenario: cap is configurable without scope teardown

- **WHEN** a caller adjusts the iteration cap on a live nested circuit
  between outer ticks `t` and `t+1`
- **THEN** outer tick `t+1` MUST honour the new cap
- **AND** the adjustment MUST NOT require tearing down and reconstructing
  the nested circuit

#### Scenario: cap default is sufficient for shallow recursion

- **WHEN** a caller constructs a nested circuit without adjusting the cap
- **THEN** the default cap MUST be at least `64` inner iterations — a
  value that accommodates common transitive-closure depths on typical
  graph inputs without requiring caller configuration
- **AND** the default MUST be documented at the capability's public surface

### Requirement: iteration-cap-hit preserves fixpoint-failure observability

A nested-circuit driver MUST surface cap-exceeded non-convergence as an observable failure when the inner scope reaches its iteration cap without every operator reporting fixpoint — consistent with the `operator-algebra` capability's "iteration cap without fixpoint is an observable failure" requirement. The observable signal MUST distinguish "the inner scope converged in `k < cap` iterations" from "the inner scope hit the cap at `cap` iterations without converging", and consumers that treat non-convergence as silently-produced state MUST be able to detect the distinction *before* downstream observation.

#### Scenario: converged and cap-hit runs are distinguishable

- **WHEN** two successive outer ticks produce (a) a converged inner run of
  `k_1 < cap` iterations and (b) a cap-hit inner run of `cap` iterations
- **THEN** the nested-circuit handle MUST expose a *converged* observable
  that reads `true` for outer tick (a) and `false` for outer tick (b)
- **AND** the iteration count MUST be exposed — `k_1` for outer tick (a)
  and `cap` for outer tick (b) — so callers can distinguish a cap set too
  low from a genuinely non-convergent body
- **AND** the (converged, iteration-count) pair MUST be observable before
  any downstream operator consumes the driver's output for the same tick,
  so the consumer has the opportunity to surface or short-circuit on
  cap-hit

#### Scenario: scope-boundary phases still run on cap-hit

- **WHEN** an inner scope hits the iteration cap without converging
- **THEN** every operator in the scope MUST still observe exactly one
  *clock-end* invocation for that outer tick
- **AND** per-scope state established in *clock-start* MUST be released or
  committed under the operator-algebra capability's partial-completion
  contract — no per-scope state is leaked just because the scope failed
  to converge

### Requirement: nested-circuit handle MAY be exposed alongside the output stream

The capability MUST expose a variant of nested-circuit construction that
returns, alongside the parent-tick output stream, a handle on the nested
circuit itself — so callers can observe per-outer-tick convergence state,
the iteration count last executed, and the configured cap without reaching
through the parent-tick stream. The handle MUST NOT alter the observable
behaviour of the output stream: a nested circuit built with the handle-
returning variant MUST produce bitwise-identical outputs to one built
without.

#### Scenario: handle exposes convergence and iteration count

- **WHEN** a nested circuit is constructed via the handle-returning variant
  and the parent circuit is stepped
- **THEN** after each outer tick, the handle MUST expose the last run's
  converged flag and iteration count as read-only observables
- **AND** reading the handle's observables MUST NOT advance the inner or
  outer tick, mutate any operator state, or otherwise change observable
  behaviour

#### Scenario: handle variant is observationally equivalent to plain variant

- **WHEN** two identical recursion topologies are constructed, one via the
  plain variant and one via the handle-returning variant
- **THEN** at every parent tick, the driver operator's published value
  MUST be identical between the two topologies
- **AND** the presence of the handle MUST NOT introduce observable
  overhead that a caller not reading the handle would be charged for

### Requirement: nested-circuit state is private to its own driver

Every nested-circuit driver MUST own its own inner-circuit state —
operators registered inside one nested circuit MUST NOT be reachable or
modifiable from any other nested circuit or from the parent's top-level
operator set, except via the documented driver-operator's input/output
stream. This is the encapsulation that lets recursion compose: sibling
nested circuits and parent-level operators each see only their own clock
scope's state evolve.

#### Scenario: sibling nested circuits evolve independently

- **WHEN** a parent circuit contains two nested-circuit driver operators
  `D_1` and `D_2` and the parent is stepped for outer tick `t`
- **THEN** the inner tick count and fixpoint state of `D_1`'s inner scope
  MUST NOT be visible to operators inside `D_2`'s inner scope, and vice
  versa
- **AND** the inner-clock reset for one nested circuit MUST NOT trigger or
  suppress the inner-clock reset for the other — each nested circuit
  runs an independent inner scope per outer tick

#### Scenario: inner operator set is not enumerable from the parent

- **WHEN** a parent circuit is queried for its registered operators
- **THEN** operators registered inside any nested circuit's inner scope
  MUST NOT appear in the parent's registered operator set — the parent
  sees exactly the driver operator, not the inner scope's contents
- **AND** scheduling, fixpoint aggregation, and lifecycle dispatch for
  the inner operators MUST be the sole responsibility of the driver
  operator's implementation

### Requirement: nested-circuit driver is a linear operator for chain-rule purposes

A nested-circuit driver operator MUST be classifiable against one of the four chain-rule helper categories from the `operator-algebra` capability — specifically, a driver that exposes a linear function of its inner scope's accumulated output MUST itself be treated as linear by the
`operator-algebra` capability's chain-rule wrapper — i.e.,
`Incrementalize(D)` specialises to `D` on the delta stream when the driver
wraps a linear recursive body. A driver wrapping a non-linear inner body
(e.g., `RecursiveCounting`'s inner non-distinct composition, which is
Z-linear but whose *interpretation* is multiplicity rather than
set-membership) MUST be classifiable against one of the four chain-rule
helper categories (generic / linear / bilinear-join / distinct) from the
`operator-algebra` capability's "exposed wrapper set covers the four
chain-rule helpers" scenario.

#### Scenario: linear inner body produces a linear driver

- **WHEN** a nested circuit's inner body is Z-linear — i.e.,
  `body(a + b) = body(a) + body(b)` and `body(-a) = -body(a)` — and the
  driver exposes the integrated inner output
- **THEN** the driver operator MUST satisfy the linearity contract the
  `operator-algebra` capability attaches to linear operators, and MUST
  compose correctly under the chain-rule wrapper's linear specialisation
- **AND** incremental evaluation of the driver on a delta stream MUST
  equal feeding the deltas through the driver directly

#### Scenario: non-linear inner body falls through to the generic chain-rule wrapper

- **WHEN** a nested circuit's inner body is not recognisably linear,
  bilinear-join, or distinct (per the `operator-algebra` capability's
  four-helper classification)
- **THEN** the chain-rule wrapper MUST apply the generic
  `D ∘ Q ∘ I` form to the driver operator
- **AND** the driver MUST remain observationally equivalent to feeding
  the integrated input through the driver and differentiating the output
