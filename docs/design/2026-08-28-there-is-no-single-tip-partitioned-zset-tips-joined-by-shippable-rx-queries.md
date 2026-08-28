# There is no single tip: partitioned Z-set tips joined by shippable Rx queries

**Aaron, 2026-08-28.** Recorded because it was not written down anywhere, and it is the
largest single divergence between ZetaDB/ZetaFS and Git-shaped storage.

> *"our 'tip' need not be one tip, we can have multiple zset tips that join using rx queries
> that can ship and run to reconstruct the tip via several zsets, so there need not be one
> tip … this removes one of our most contention points that need coordinate, by splitting a
> single global tip lock into smaller partitioned/sharded ones that join via rx queries
> persisted with bonsai tree serialization and dynamic values."*

## 1. The assumption being dropped

Every Git-hosting design — Spokes, Continuity, Azure DevOps — inherits one requirement
from Git itself: **a single ref must advance atomically, and a client that pushes then
fetches must observe its own write.** That requirement is why Spokes runs three-phase
commit and why Continuity needs a compare-and-swap on the WAL index. It is the contention
point. Everything expensive in those systems is downstream of it.

I previously wrote that requirement down as if it were intrinsic to the problem
([the Continuity analysis](../research/2026-08-28-continuity-wal-vs-zetadb-dbsp-the-log-you-do-not-have-to-replay.md), §1.2).
It is not. **It is intrinsic to Git having one ref.** A system that does not is not obliged
to pay for one.

## 2. The tip is a query result, not a stored pointer

Instead of one advancing pointer, ZetaDB holds **many partitioned Z-set tips**. The logical
tip is not stored anywhere; it is **reconstructed by joining them** with an Rx query.

Three properties make that viable, and each is doing real work:

1. **The join is over Z-sets, so it is commutative and associative.** Partitions can be
   folded in any order and arrive in any order; the result is the same. There is no
   ordering to agree on, so there is nothing to coordinate about.
2. **Retraction is `-1`, not a tombstone.** A partition can withdraw a fact without needing
   a globally-agreed delete, because the inverse element exists in the algebra.
3. **The query itself is data.** Persisted via Bonsai-tree serialization with dynamic
   values, an Rx query **ships and runs elsewhere** — reconstruction is a capability any
   holder of the partitions can exercise, not a service some node performs.

The consequence is the point: **a single global tip lock becomes N partition-level
operations**, most of which need no lock at all because merge is commutative. Contention
does not get faster; it stops existing for the commutative majority.

## 2a. Why order stops mattering: uncertainty is stored, not resolved by arrival

Aaron, same day:

> *"we also don't have to care about order — we have ECC and store Bayesian uncertainty, so
> all our events over the Z-set are commutative."*

This is the justification underneath §2, and it is worth separating into its two halves
because they defend against different failures.

**Uncertainty is a stored value, not an arrival-order artifact.** Most systems resolve
conflicting evidence by deciding which observation came last — which makes order
load-bearing and therefore makes agreement on order necessary. Storing a Bayesian belief
instead means conflicting evidence is *combined* rather than adjudicated. `observe` is
pointwise multiplication of likelihoods into a belief, and pointwise multiplication is
commutative and associative, so a fold over any permutation of the evidence yields the same
belief (`src/Core/BeliefConvergence.fs`). Nothing needs to be last.

**ECC makes divergence repairable rather than fatal.** The generator that produces the
structure also corrects its drift — regenerating from the irreducible *is* the correction
(`.claude/rules/only-the-irreducible-is-primitive-generate-the-rest.md`;
`src/Core/AdinkraCode.fs`). A partition that drifts does not require an ordered replay to be
brought back; it is re-derived.

### The precision our own code insists on

"All events are commutative" is true of the class the design relies on, and our source is
explicit about the boundary — worth quoting exactly, because overstating it here would
weaken every claim above:

- **Commutes:** `observe` with *fixed* (state-independent) likelihoods. `BeliefConvergence.fs`
  makes the sharper claim than the usual one — independence was merely *sufficient*; the
  real condition is fixed likelihoods.
- **Does NOT commute:** a state-dependent or nonlinear revision that reads the belief it is
  updating — `sharpen` (squaring the weights) is the in-tree counterexample. "Order matters
  exactly when the update operator reads the belief it is updating."
- **Not idempotent either.** `observe` is a commutative *monoid*, not a join-semilattice:
  folding the same evidence twice moves the belief. Commutativity buys freedom from
  ordering; it does not buy freedom from duplicate delivery, which is a separate obligation
  (`observeAll`, and discipline #6 idempotency).

So the accurate statement is: **the event classes ZetaDB relies on for tip reconstruction
are commutative by construction, and the non-commuting operators are known, named, and
excluded from that path.** That is a stronger position than a blanket claim, because it
survives contact with the one counterexample already in the codebase.

## 2b. Dissolving the non-commuting case: amortized pre-reads with an ECC-bounded staleness budget

**NOT BUILT. This is a design direction, recorded the day it was described.**

§2a ends at a real boundary: a state-dependent revision that *reads the belief it is
updating* does not commute, and `sharpen` is the in-tree counterexample. Aaron's answer is
not to make that operator commute — it cannot be — but to **remove the read from the update
path**.

> *"instead of reading the belief they are updating by some choice axiom, we have our
> reservoir computing and our `observe.ts` discriminated unions pass in an amortized answer
> compatible with ECC correction later on, so stale reads up to a certain point are
> tolerated with ECC. … if a belief is going to be read for a bounded-duration tick it could
> come in pre-read, amortized."*

### The move

A read-modify-write is non-commutative because the *read* is a hidden input taken at update
time, so two updates see different worlds depending on order. If the value is instead
**supplied as an explicit input** — pre-read, amortized over the tick, computed by the
reservoir — the update becomes a pure function of (event, supplied belief). Pure functions
of explicit inputs compose without ordering constraints; what was an ordering problem
becomes a data-dependency problem, which is a much cheaper class.

`observe.ts` is already the right seam: it is *"a pure function over a snapshot → an action
DU"*. A pre-read belief with its staleness budget is another field on that snapshot, which
means the mechanism needs no new architecture — it needs the snapshot to carry one more
typed thing.

### Staleness becomes metered rather than forbidden

The supplied belief will be stale — that is the whole point of amortizing it across a
bounded-duration tick. The claim is not that staleness is harmless; it is that **staleness
up to a bound is correctable**, because the ECC layer repairs divergence afterwards
(§2a, second half).

This is the same conversion the rest of the architecture makes: an obligation that would
otherwise require *coordination* ("you must read the latest") becomes an obligation that
requires *measurement* ("you may read up to this stale, and the repair is defined"). It is
the CAP-posture-per-row result (`docs/research/2026-06-01-cap-posture-per-row-…`) taken one
step further — not merely per-row posture, but a per-read staleness budget carried in the
type.

**The bound is not arbitrary, and this is the part to get right when it is built.** An
error-correcting code corrects up to a bounded number of errors; past its distance,
divergence is not merely uncorrected but *undetectably* wrong. So the tolerable staleness
budget is a function of the correction capacity, and the two must be derived together. A
budget chosen independently of the code — or chosen for convenience — reintroduces silent
corruption in the one place the design promises repair.

### Why it must live in the DU and not in a context window

The sharpest part of Aaron's framing, and it generalises well beyond this feature:

> *"it should be in the DU that tracks this, not agent context windows — that's unreliable."*

A staleness budget held in an agent's context window is:

- **unenforceable** — nothing checks it, so exceeding it produces no signal;
- **unobservable** — no artifact records what bound was in force for a given read;
- **silently lost** — a compaction, a handoff, or a fresh session drops it, and the next
  read proceeds as though a bound had been honoured.

That is precisely the vacuity class this repository is built against: a constraint that
looks like a guarantee and carries none. Encoded in the discriminated union, the budget is a
typed field the operation must carry, the exceeded case is a branch the caller must handle,
and the whole thing is checkable by something other than an agent remembering.

The general form is worth stating on its own: **an invariant that lives in a context window
is not an invariant.** Anything load-bearing belongs in the type, the DU, or a falsifier —
never in what an agent is expected to still be holding.

### What would make this real

- The staleness budget derived from, not merely paired with, the ECC correction capacity.
- A falsifier that exceeds the budget and shows the repair either succeeding or failing
  *loudly* — an over-budget read that silently produces a plausible answer is the failure
  mode, and a test that never exceeds the budget proves nothing.
- The amortized pre-read wired through `observe.ts`'s snapshot, so the mechanism is visible
  at the seam where actions are already chosen.

## 3. The consensus ladder — three tiers, and the cost is deliberate

The interesting claim is not "no consensus". It is that coordination is a **cost tier you
select per operation**, and most operations sit on the free one.

| tier | mechanism | cost | when |
|---|---|---|---|
| **0 · commutative merge** | Z-set / CRDT fold | none — no round trips, no agreement | the large majority: appends, observations, telemetry, anything expressible as signed weights |
| **1 · scoped CAS** | compare-and-swap at row/partition scope, **wrapped inside a decentralized discriminated union so the CAS is part of the workflow operation** | one conditional write, no quorum | genuinely order-dependent state where a partition is the unit |
| **2 · BFT** | `SybilBftProtocol` — quorum over *distinct entropy sources*, not claimed identities | **slowest — slower than 3PC, because it is adversarial** | high-stakes governance and multi-oracle decisions only |

Two things about this table are easy to misread.

**Tier 1 is not "CAS bolted on".** Wrapping the compare-and-swap in a discriminated union
makes the conditional part of the *operation's own type* — the failure branch is a case the
caller must handle, not an exception or a retry loop hidden in a client library. The
workflow carries its own contention semantics.

**Tier 2 being the slowest is a feature, and it is honest.** BFT here is deliberately more
expensive than three-phase commit, because 3PC assumes crash faults while BFT assumes
adversarial ones. Paying that only for governance is the design; paying it for a file write
would be the mistake. Where CASPaxos/CASRaft-shaped coordination would be reached for
elsewhere, the choice here is explicit: either the operation partitions (tier 1) or it is
important enough to be adversarially agreed (tier 2). There is no middle tier where we pay
consensus cost for ordinary data.

## 4. The content-addressed DAG is the irreducible; filesystems are views

The Merkle DAG is the substrate. **Names are not part of it.** A filesystem is one
*presentation* bolted on top, and there can be several over the same DAG simultaneously —
two entirely different directory layouts over identical content, because names are pointers
into a content-addressed store rather than locations in it.

Two consequences that separate ZetaFS from Git semantics:

- **No canonical folder view.** "The" tree is a choice of view, not a property of the data.
  Different consumers can hold different, equally valid namespaces over one DAG.
- **Symlink-native, multi-parented.** The same file or folder lives under many parents at
  once. That is not a special case of a tree; it is **tagging**, and a tree is the
  degenerate case where every node happens to have one tag. Detail in
  [`2026-08-27-zetafs-names-are-tags-multi-parented-files-and-symlink-native-presentation.md`](2026-08-27-zetafs-names-are-tags-multi-parented-files-and-symlink-native-presentation.md).

This is also what makes §2 coherent rather than exotic. If names were locations in one
canonical tree, a partitioned tip would be incoherent — you would need agreement on the
tree. Because names are tag-bindings over a content-addressed DAG, the partitions are
independently meaningful and the join reconstructs a view rather than resolving a conflict.

## 5. What this means about "ZetaDB/FS is Git"

It is not. It rhymes with Git at the storage layer — content-addressed, immutable,
Merkle-linked — and diverges at every layer above:

| | Git | ZetaDB/ZetaFS |
|---|---|---|
| tip | one ref, advanced atomically | N partitioned Z-set tips, joined on demand |
| ordering | total, per ref | commutative where possible; scoped CAS where not |
| delete | tombstone / rewrite | `-1` weight (inverse element) |
| names | locations in one tree | tag-bindings; many views over one DAG |
| parents | one | many (symlink-native) |
| coordination | inherent to the ref | a per-operation cost tier |

## 6. Status — designed, not built

Stated plainly because the tiers above are load-bearing and it would be easy to read this
as a description of running code:

- **Exists:** `SybilBftProtocol.fs` (tier 2, with a deterministic reducer and DST replay);
  Bonsai serialization; `DynamicValue`; `Query.fs` / `QuerySurface.fs` / `Rx.fs`; Z-set and
  DBSP primitives; the ZetaFS naming design.
- **Not yet built:** the amortized pre-read of §2b, with everything that section names;
  and the partitioned-tip join itself — N Z-set tips reconstructed by a
  shipped Rx query. No implementation, no benchmark. Nothing here reports a measured
  contention improvement over a single-tip design, and it should not be cited as though it
  does.

The claim in §2 is an architectural argument from the algebra: commutative merge needs no
agreement, therefore a tip built by commutative join needs no tip lock. That argument is
sound, and it is not evidence. The falsifier, when it exists, is a measured comparison
against a single-tip baseline under concurrent writers.

## Anchors

- **Z-sets / DBSP** — Budiu, McSherry, Ryzhyk, Tannen (VLDB 2023).
- **CRDTs** — Shapiro, Preguiça, Baquero, Zawirski (2011): commutative, associative, idempotent merge.
- **BFT** — Castro & Liskov, *Practical Byzantine Fault Tolerance* (OSDI 1999); the
  adversarial fault model that makes tier 2 legitimately more expensive than 3PC.
- **CASPaxos** — Rystsov (2018), the single-register CAS-consensus shape tier 1 deliberately
  avoids by partitioning instead.
- **Content addressing** — Merkle (CRYPTO '87).
