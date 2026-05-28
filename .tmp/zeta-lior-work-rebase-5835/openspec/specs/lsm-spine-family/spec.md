## Purpose

The `lsm-spine-family` capability specifies the log-structured merge (LSM) spine
used to integrate a Z-set delta stream into a queryable trace while preserving
the retraction-native discipline of `operator-algebra`. It defines the
observable contract of four spine variants — a baseline synchronous cascade
spine, a bounded-latency variant, a backing-store variant, and an async-
producer variant — plus the dispatcher that selects among them. This spec is
language-agnostic: it pins *what* the spine promises to any caller, not the F#
or C# surface through which the promise is delivered.

The spine is the engine behind `IntegrateOp` over Z-sets: it is the concrete
realisation of `I` when the element type is `ZSet<K>` and the element volume
exceeds what a naive running-sum can hold. Every requirement in this capability
composes with the retraction-native invariants declared in
`operator-algebra` — no operator on a spine tier may strip retractions, convert
negative weights to tombstones, or require a separate delete pass.

## Requirements

### Requirement: spine integrates a Z-set delta stream

A spine MUST accept a sequence of Z-set batches (signed-weight, finitely-
supported, possibly negative-weight entries per `operator-algebra`) and MUST
expose a `Consolidate` operation whose output is the group sum of every batch
inserted since the spine was constructed or cleared. The consolidated output
MUST be equal, under `ZSet` equality, to the result of folding the inserted
batches through the Z-set group operation in any order.

#### Scenario: consolidated output equals group sum

- **WHEN** batches `b0`, `b1`, …, `bN-1` are inserted in order
- **THEN** `Consolidate` MUST return a Z-set equal to `b0 + b1 + … + bN-1`
  under the Z-set abelian group
- **AND** the result MUST equal the fold taken in any other order, since
  Z-set addition is commutative and associative

#### Scenario: empty batch inserts are no-ops

- **WHEN** an empty Z-set (`ZSet.Empty`) is inserted
- **THEN** the spine's consolidated output MUST be unchanged
- **AND** the spine MUST NOT retain an empty batch in any observable tier,
  level, or state summary

### Requirement: cascade merge bounded-depth invariant

A spine MUST maintain the invariant that no two live batches occupy the same
size class *at the end of a completed settle-point* (`Consolidate` return,
an eager variant's post-insert state, or a bounded-latency variant's
post-`Tick` state once the pending queue has drained). Bounded-latency
variants MAY carry multiple live batches at a given size class *between*
ticks — that is the core mechanic of bounded-latency scheduling — provided
they drain to the single-batch-per-size-class invariant before
`Consolidate` returns. On insert, a collision at a size class MUST be
resolved by merging the colliding batches into the next size class,
cascading as needed (eagerly in the baseline variant; deferred to pending
work in the bounded-latency variant).

The maximum observable depth of the tier representation MUST be bounded by
a spec-declared constant (≤ 32 levels for the `Spine<'K>` and
`BalancedSpine<'K>` reference variants, equivalent to ~4 × 10⁹ entries).
The backing-store variant is not required to enforce this cap; its depth is
bounded only by available storage, and callers that want a hard cap MUST
wrap the backing-store variant in their own depth check.

#### Scenario: two equal-size batches cascade on the eager variant

- **WHEN** two batches of the same size class are inserted in succession into
  an otherwise-empty eager-cascade spine
- **THEN** after the second insert, no batch MUST remain at the original size
  class
- **AND** exactly one batch of the next size class MUST be present
- **AND** that batch MUST equal the Z-set group sum of the two inputs

#### Scenario: depth is bounded on reference in-memory variants

- **WHEN** an arbitrary sequence of non-empty batches is inserted into
  `Spine<'K>` or `BalancedSpine<'K>`
- **THEN** the observable tier depth MUST NOT exceed the spec-declared cap
- **AND** any insert that would exceed the cap MUST either (a) trigger a
  consolidation to reduce depth below the cap, or (b) be rejected with an
  error that identifies the cap

#### Scenario: bounded-latency variant is allowed multiple batches per size class between ticks

- **WHEN** a bounded-latency spine's pending-merge queue is non-empty
- **THEN** multiple live batches MAY be present at the same size class
- **AND** a subsequent `Consolidate` MUST drain the queue so that the
  post-`Consolidate` output satisfies the spine-equivalence requirement
  against an eager variant fed the same insert sequence

### Requirement: spine-equivalence is observable only through `Consolidate`

Two spines that have received the same *multiset* of insert calls MUST produce
equal `Consolidate` outputs, even when their internal tier layouts differ.
This equivalence is the spine's only guaranteed external contract: internal
tier counts, batch sizes, and merge schedules are implementation details a
caller MUST NOT rely on.

#### Scenario: identical inserts yield identical consolidation

- **WHEN** two spines (possibly of different variants) receive the same
  sequence of insert calls
- **THEN** their `Consolidate` outputs MUST compare equal under `ZSet`
  equality
- **AND** this MUST hold even if one spine has already performed compaction
  the other has not yet performed

#### Scenario: tier layout is not an observable contract

- **WHEN** a caller inspects the number of live tiers, the size of individual
  tiers, or the pending-merge queue of a spine
- **THEN** the result MUST be labelled as a diagnostic surface
- **AND** any caller that branches on these values MUST accept that their
  observed values may change across releases without spec-level breakage

### Requirement: retraction-native across all tiers

Every spine variant MUST carry retraction-bearing Z-sets (batches with
negative weights) through insert, merge, and consolidation without any
sign-stripping, tombstoning, or separate delete pass. The Z-set group
operation MUST be the only mechanism by which retractions cancel, and a
retraction MUST cancel its corresponding insertion at any tier depth.

#### Scenario: retraction cancels at any depth

- **WHEN** a fact `(k, +1)` is inserted, then many unrelated batches are
  inserted (forcing `(k, +1)` to cascade to a deeper tier), and finally
  `(k, -1)` is inserted
- **THEN** `Consolidate` MUST NOT include the key `k` in its output
- **AND** the retraction MUST cancel the prior insertion regardless of which
  tier each currently occupies

#### Scenario: no tombstone conversion

- **WHEN** a retraction batch is inserted into any variant of the spine
- **THEN** the retraction MUST be carried as a negative-weight entry in the
  Z-set representation
- **AND** no separate "tombstone marker", "deletion flag", or "delete-pass
  queue" MUST be introduced to record the retraction

### Requirement: bounded-latency variant caps per-tick merge work

A bounded-latency spine variant MUST accept a per-tick merge budget at
construction, MUST expose a caller-pumped `Tick` operation that drains up
to that budget of queued merges and returns the number drained, and MUST
NOT execute more cascade merges per `Tick` call than the budget allows.
Ticks are not self-triggered — the caller (typically a circuit scheduler
or a background driver) is responsible for calling `Tick` at a cadence
consistent with the application's latency target. Pending merges MUST be
enqueued and scheduled across subsequent ticks such that the overall
amortised cost matches the baseline variant. The scheduler MUST be within
a spec-declared constant factor of the cost-optimal schedule (the target
factor is stated in the profile).

#### Scenario: tick budget is honoured

- **WHEN** a bounded-latency spine has a per-tick budget of `B` merges and
  its pending queue contains more than `B` candidate merges
- **THEN** a single `Tick` call MUST execute at most `B` merges
- **AND** the remaining pending merges MUST persist until the next `Tick`
  or `Consolidate` call

#### Scenario: Tick reports merges drained

- **WHEN** a bounded-latency spine's `Tick` method is invoked
- **THEN** the return value MUST equal the number of merges actually
  performed during that call
- **AND** the return value MUST be `0` when the pending queue is empty at
  entry

#### Scenario: consolidate drains the pending queue

- **WHEN** `Consolidate` is invoked on a bounded-latency spine with pending
  merges
- **THEN** all pending merges MUST be run to completion before the
  consolidated Z-set is returned
- **AND** the consolidated output MUST satisfy the spine-equivalence
  requirement against a baseline variant fed the same insert sequence

### Requirement: backing-store abstraction decouples cascade from storage

A backing-store spine variant MUST delegate batch persistence to an
abstraction that supports `Save`, `Load`, and `Release` over an opaque
handle, and MUST run the identical cascade-merge algorithm regardless of
whether the store is in-memory or disk-backed. The abstraction MUST permit
any implementation whose `Save/Load/Release` triple behaves as an
**identity-keyed opaque-handle store** over Z-set batches: each `Save`
returns a fresh handle distinct from every other live handle, regardless
of whether the saved batch's *value* equals a previously-saved batch. The
abstraction is NOT content-addressable; callers that require deduplication
MUST implement it above this layer.

`Release` MUST be treated as a best-effort drop: it MUST NOT raise an
exception on failure to delete underlying storage (e.g., a disk file
already gone or un-deletable). Implementations MAY log the failure to a
diagnostic sink; callers MUST NOT branch on `Release` being observably
successful, and MUST NOT call `Release` more than once per handle.

#### Scenario: swapping the backing store preserves semantics

- **WHEN** a backing-store spine is constructed with an in-memory store and
  fed a sequence of inserts, and an otherwise-identical spine is constructed
  with a disk-backed store and fed the same sequence
- **THEN** their `Consolidate` outputs MUST compare equal
- **AND** this MUST hold for both monotone and retraction-bearing input
  sequences

#### Scenario: handles are opaque and identity-keyed

- **WHEN** a caller holds a backing-store handle
- **THEN** the caller MUST NOT interpret the handle's internal structure
  (file path, in-memory id, reference count, etc.)
- **AND** the caller MUST route every read and release through the abstract
  `Load` and `Release` operations
- **AND** two `Save` calls passing equal Z-set values MAY return distinct
  handles; a caller MUST NOT assume any form of handle deduplication

#### Scenario: Release is fail-soft

- **WHEN** `Release(handle)` is invoked and the underlying storage deletion
  fails (e.g., the disk file is already absent, or permission-denied on
  cleanup)
- **THEN** `Release` MUST NOT raise an exception
- **AND** subsequent spine operations MUST NOT be affected by the release
  failure

### Requirement: disk backing-store honesty — crash-consistency boundary

A disk backing-store implementation MUST document its crash-consistency
discipline and MUST NOT claim durability guarantees it does not enforce.
Specifically: an implementation that uses `File.WriteAllBytes` without
`fsync` MUST document that a crash between spill and the next durable
checkpoint MAY lose the spilled batch, and MUST direct callers to treat the
spine tier as ephemeral for recovery purposes unless the overall circuit
has reached an independently-durable checkpoint.

#### Scenario: non-crash-consistent spill is documented

- **WHEN** a disk-backed spine uses a non-`fsync` write path
- **THEN** the implementation's surface documentation MUST state that
  spilled batches are not crash-consistent
- **AND** the capability's disaster-recovery story MUST account for the
  spilled tier as reconstructible from the upstream stream, not persistent
  state

#### Scenario: path-traversal safety on spill

- **WHEN** a disk-backed spine writes a batch to its spill directory
- **THEN** the resolved spill path MUST be a child of the canonical
  `workDir` passed at construction
- **AND** filenames containing platform-sensitive metadata markers (e.g.,
  NTFS alternate-data-stream colons) MUST be rejected at write time

### Requirement: async-producer variant preserves hot-path latency

An async-producer spine variant MUST allow producers to enqueue inserts
through a non-blocking hot path, deferring cascade-merge work to a single
background consumer. The producer hot path's latency bound MUST be
independent of the spine's current depth. The variant MUST expose a
`Flush` operation that synchronously waits for every insert accepted
before `Flush` was called to have been drained and merged by the
background consumer.

#### Scenario: producer hot-path is depth-independent

- **WHEN** a producer calls `Insert` on an async-producer spine
- **THEN** the hot-path cost MUST be bounded by a constant that does not
  depend on the current spine depth
- **AND** cascade-merge work MUST be performed by the background consumer,
  not on the producer's calling thread

#### Scenario: Flush is a linearisation point

- **WHEN** producers have issued `N` `Insert` calls by the moment `Flush`
  is entered, and `Flush` returns successfully
- **THEN** the spine's state after `Flush` returns MUST reflect all `N`
  inserts' effects
- **AND** `Consolidate` called immediately after `Flush` returns MUST
  produce the same Z-set as a baseline variant fed the same `N` batches
  in some serialisation of their producer-call order

#### Scenario: disposal drains cleanly

- **WHEN** an async-producer spine is disposed while the background
  consumer still has pending work
- **THEN** disposal MUST signal the consumer to stop, MUST wait a
  spec-or-profile-declared bounded interval for in-flight merges to
  complete, and MUST NOT leak the background thread beyond the bound
- **AND** any inserts not drained at disposal MUST NOT cause silent data
  corruption — either they are merged before the bound expires, or the
  disposal path surfaces a loss signal

#### Scenario: depth-independence is an Insert-only guarantee

- **WHEN** a caller invokes a non-`Insert` observation method
  (`Consolidate`, `Depth`, `Count`, or the tier snapshot) on an
  async-producer spine while the background consumer is performing an
  insert
- **THEN** the observation call MAY block for the duration of the
  in-flight insert by the consumer (the internal lock discipline that
  keeps the consumer's merge atomic also gates observers)
- **AND** the hot-path depth-independence guarantee applies only to
  producer `Insert` calls; observation calls are not required to be
  depth-independent
- **AND** callers that need a coherent observation MUST issue `Flush`
  before the observation call rather than relying on a racing read

### Requirement: selector is a stateless dispatcher

The spine selector MUST map a (estimated-entries, entry-size-bytes,
memory-budget-bytes, working-directory) tuple to a spine-mode discriminated
output without allocating or mutating spine state. Selection MUST be a
pure function of its inputs: repeated calls with equal inputs MUST return
equal outputs. The selector MUST NOT instantiate a spine; the caller is
responsible for converting the mode to a concrete spine.

#### Scenario: selector is deterministic

- **WHEN** the selector is called twice with identical inputs
- **THEN** the two outputs MUST be equal
- **AND** no mutable state MUST be required to observe this determinism

#### Scenario: selector decision matrix

- **WHEN** the selector is given inputs where the estimated working set
  comfortably fits in the memory budget (4× headroom or more)
- **THEN** the selector MUST return the synchronous mode
- **AND** when the working set fits but has less than 4× headroom, the
  selector MUST return the async mode
- **AND** when the working set exceeds the memory budget and a
  working-directory is supplied, the selector MUST return the async-on-disk
  mode
- **AND** when the working set exceeds the memory budget and no
  working-directory is supplied, the selector MUST return the async mode
  (degraded); this degraded fallback MUST be documented at the
  spec/profile layer as an out-of-memory risk (the selector itself is
  stateless and does not emit diagnostics)

### Requirement: observable state machine

Every spine variant MUST present the same *core* observable state-machine
to its caller: *construction* (no tiers, no batches), *insert* (a batch
is accepted; zero or more cascade merges may occur), and *consolidate*
(every live batch is group-summed into one output Z-set; consolidation
MUST be idempotent in that a second `Consolidate` with no intervening
`Insert` produces the same output).

A *clear* operation that returns the spine to the construction state is
an **optional** state-machine extension: variants that expose `Clear`
MUST satisfy the clear-return-to-construction scenario below, but a
variant MAY omit `Clear` entirely (the async-producer variant omits it
because its hot-path accepts inserts through a channel that cannot be
safely truncated mid-flight). Omission MUST be documented in the
variant's profile.

Async and bounded-latency variants MAY expose additional diagnostic
states (pending-merge counts, background-worker status) but MUST NOT
require a caller to observe them.

#### Scenario: construction is empty

- **WHEN** a spine is freshly constructed
- **THEN** `Consolidate` MUST return the empty Z-set
- **AND** any observable depth, count, or pending-merge diagnostic MUST be
  zero

#### Scenario: consolidate is idempotent under no intervening inserts

- **WHEN** `Consolidate` is invoked, then invoked again with no `Insert`
  between the two calls
- **THEN** the two outputs MUST compare equal
- **AND** the intervening internal state (tier layout, pending merges)
  MAY differ but the observable consolidated Z-set MUST NOT

#### Scenario: clear returns to construction when supported

- **WHEN** `Clear` is invoked on a spine variant that exposes it
- **THEN** the subsequent `Consolidate` MUST return the empty Z-set
- **AND** any diagnostic depth, count, or pending-merge count MUST read
  zero

#### Scenario: omission of Clear is documented

- **WHEN** a variant does not expose a `Clear` operation
- **THEN** the variant's profile MUST state the omission and the reason
- **AND** callers that require a clearable spine MUST select a different
  variant rather than rely on implicit truncation

### Requirement: thread-safety contract is explicit per variant

Each spine variant MUST document its thread-safety contract. Variants
that are not safe for concurrent calls MUST declare so explicitly; a
caller issuing concurrent calls against a non-thread-safe variant MUST
NOT expect defined behaviour. Variants that are safe for concurrent
calls MUST specify which operations are safe (e.g., concurrent inserts,
concurrent insert-and-consolidate, concurrent insert-and-clear).

#### Scenario: non-thread-safe variant is declared

- **WHEN** a variant is documented as single-threaded
- **THEN** the documentation MUST name that constraint explicitly
- **AND** the capability MUST NOT implicitly promise concurrent-safe
  behaviour on that variant even if some operations happen to be
  race-free

#### Scenario: concurrent-safe variant declares the safe operation set

- **WHEN** a variant is documented as concurrent-safe
- **THEN** the documentation MUST enumerate the operation combinations
  that are safe under concurrency
- **AND** combinations outside that enumeration MUST NOT be assumed safe
