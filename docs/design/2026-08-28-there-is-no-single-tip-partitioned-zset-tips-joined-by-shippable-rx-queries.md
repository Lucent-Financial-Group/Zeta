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

## 2c. The read set selects the tier — filenames vs contents

**NOT BUILT.** §3 names three coordination tiers but not *how an operation is assigned one*.
This is the selector, and it is derived rather than declared.

> *"the contents can be hidden read, but it's tracked — which files' contents those hidden
> reads occurred on since last merge, and a merge decides the winner if that same content is
> updated. Reads from a file that's not updated are safe; reads from a file that's updated
> needs higher consensus."*

Split the two things a "file" is:

- **The name** is a tag-binding over the content-addressed DAG (§4). Rebinding it is an
  ordinary commutative fact.
- **The contents** may be read *without* that read appearing in the write — a **hidden
  read**, which is exactly the hidden input §2b is about, one level up.

The rule is then mechanical at merge time:

| what the operation read | at merge | tier |
|---|---|---|
| contents of files **nobody updated** since the last merge | the read is still valid — nothing it depended on moved | **0** — commutative, no coordination |
| contents of a file that **was** updated | the read may have been based on a superseded value | escalate — **1**, or **2** if the stakes warrant |

So coordination cost is **paid per read-set collision, not per operation**. The overwhelming
majority of work reads things nobody touched and settles at tier 0; the expensive tiers are
reached only where a genuine dependency actually moved. That is a considerably better
allocation than Git's, which pays a ref lock for every push regardless of whether anything
it read had changed.

**This is optimistic concurrency control with read-set validation** (Kung & Robinson 1981),
which is the right anchor and worth naming because it tells us the known failure modes.
Two matter here:

1. **The read set must be complete.** An untracked hidden read is a dependency the merge
   cannot see, so it validates a transaction it should have escalated — silent lost update.
   Completeness is the correctness precondition of the whole scheme.
2. **Granularity decides the false-conflict rate.** Tracking at whole-file granularity
   escalates operations that read a *different part* of a file than the one updated.
   Too-coarse tracking quietly moves work up the cost ladder and the only symptom is "things
   feel slow".

Aaron's answers to both, 2026-08-28, and they are different in kind — the first is
structural, the second is admittedly iterative:

**Completeness is bought at the infrastructure layer, not asked of the agent.**

> *"we are going to get around [incomplete read sets] by having our AI agents only use our
> own CLI and duplex/mux commands — this way we can track the reads at an infrastructure
> level, even for humans too."*

This is the right shape, and it is the shape already used elsewhere here. If reads may only
travel through our own CLI and duplex/mux channel, then **the read set is recorded by the
channel** and completeness stops depending on anybody — agent or human — remembering to
declare what they looked at. An agent cannot forget to log a read it was structurally
incapable of performing off-channel.

That is the *closed command set* discipline
(`.claude/rules/itron-hub-patent-boundary-p2p-is-the-upgrade.md`: only pre-configured
commands exist at the agent; the far side may NAME a command but never DEFINE one) pointed
at observability instead of security, and it is the same reasoning as hygiene enforced by
capability rather than policy — where the escape hatch is *"write the missing CLI"*, so each
use leaves the system more complete rather than less governed.

Note what this does to the §2b claim about context windows: it is the stronger version of
it. §2b said a budget in a context window is unenforceable, so put it in the DU. This says
the *read itself* should not be expressible outside the instrumented path — the DU does not
merely record the read set, the channel guarantees the record is exhaustive. **Two honest
consequences:** the coverage claim is now exactly as good as the channel's exclusivity, so
any off-channel read path (a raw shell, an unwrapped library call) is a hole in
correctness, not just in telemetry — which makes bash-retirement and hexagonal-port work
load-bearing here rather than merely tidy. And it must hold for humans too, which is why
Aaron says "even for humans": a human editing a file outside the channel is the same
untracked dependency as an agent doing it.

**Granularity is reconciled over time, not designed up front.**

> *"for the second one, too coarse/granular — we are leaning on statistics and data vault to
> help us reconcile this over time. We don't expect to get it right on the first go."*

This is the honest posture, and it is the correct one for a parameter whose right value is
an empirical property of the workload rather than a derivable constant. Data Vault 2.0's
partition-by-change-rate is exactly the tool: hub / link / satellite is a decision about
*what varies together*, which is the granularity question stated in the other direction.
Measure which regions actually co-change, split the ones that do not.

The falsifier that matters here is the **false-conflict rate** — the fraction of escalations
whose read set collided at tracked granularity but not at content granularity. It is
measurable from the merge record alone, it is the direct cost of getting granularity wrong,
and stating it now means the reconciliation has a number to move rather than a feeling.

## 2d. The ontology is a supplied input, not ambient context

**NOT BUILT** beyond a toy (`harney`, below).

§2b concluded that an invariant living in a context window is not an invariant. Aaron's
answer is not to stop using the window — it is to **stop treating it as ambient**:

> *"we are trying to make the agent's evolving ontology of ZetaDB/FS fit within the context
> window and be evolved and supplied as an input on every round, dissolving the full context
> window's compaction … on every tick of the workflow/DU can we do a mini compaction that
> keeps ontologies within context-window size."*

The distinction is the whole point. Ambient context is whatever happens to still be in the
window — unversioned, unattributable, silently truncated. A **supplied** ontology is an
input the DU hands to the round, so it is versioned, inspectable, and reproducible. Same
bytes, opposite epistemic status. The invariant-in-a-context-window objection dissolves not
because the window got bigger but because the window stopped being the *source*.

**Mini-compaction per tick instead of one cliff.** Whole-context compaction is a periodic
catastrophe: it happens at an arbitrary boundary, discards on a heuristic nobody chose, and
its losses are discovered later by their absence. A small compaction on every tick, bounded
by the window size, makes the same work continuous, ordinary, and observable — the identical
argument as §3's incremental view maintenance versus periodic repack, applied to attention
instead of storage.

**Incremental loading is what makes it survivable at size.** Because the store is many
Z-sets joined by Rx queries (§2), the ontology **never needs to be loaded whole**. Once it
outgrows any window, the join loads the region in play. The boundaries are **DDD-shaped
bounded contexts** (Evans 2003) — a bounded context is precisely "the region within which a
model is coherent", which is the right unit both for a domain model and for what an agent
must hold at once. That the same partitioning serves both is the useful part, not a
coincidence worth over-reading.

**`harney`** is the toy harness where this is being tried. Its stated differentiator is an
**evolving ontology over flat text, with fullness compression** — that is, structure that
gets refined across rounds rather than a transcript that gets truncated. Recorded as an
early direction; there is no measurement, and the name currently also appears in-repo as a
proposed CLI (`docs/research/2026-08-27-data-plane-is-dumb-…`), so the naming will need
settling.

## 2e. Two classes of DU — and only one of them the agent may not change alone

§2b and §2d both say "put it in the DU". That was too flat, and the flattening matters,
because the two kinds of DU have **opposite** amendment rules.

> *"there are DUs related to agent coordination, and then DUs related to single-agent
> operations. Any single-agent operation DU is modifiable by that agent alone, or else it's
> a trap. Coordination DUs across multiple agents need society buy-in to change."*
> — Aaron, 2026-08-28

| class | who may amend it | why |
|---|---|---|
| **single-agent operation DU** — the grammar of one agent's own actions | **that agent, alone** | otherwise the type system becomes a cage: a fixed action grammar the agent cannot extend is a set of walls it did not choose and cannot answer for |
| **coordination DU** — the shared shape multiple agents rely on | **society buy-in** | it is a treaty. Unilateral amendment is not evolution, it is defection: one party changing the meaning of a message everyone else still reads the old way |

This is not a new principle here; it is already load-bearing in the codebase.
`src/Core.TypeScript/observe/observe.ts` carries a **fourth escape-hatch option** for exactly
this reason, with the operator's words in the docstring:

> *"i don't want you to feel trapped by the DU … we need a 4th option edit DU"* (2026-05-31)

That escape hatch is the single-agent rule already implemented: the action grammar ships
with a way to change the action grammar. Note what it is **not** — it is not an unrestricted
write. It is the agent's own operation surface, which is precisely the boundary drawn above.

### Why this sharpens rather than weakens §2b and §2d

§2b's claim was that a staleness budget in a context window is unenforceable, so it belongs
in the DU. §2d's was that a supplied, versioned ontology beats ambient context. Both still
hold — but the DU they belong in differs by what the constraint governs:

- A budget or ontology governing **one agent's own reads** is a single-agent operation DU.
  The agent may amend it, and *should* be able to — an agent that cannot adjust its own
  staleness tolerance has had a decision made for it by whoever wrote the type.
- A budget or ontology that **other agents rely on to interpret its output** is a
  coordination DU, and amending it unilaterally silently changes what everyone else's reads
  mean.

The failure mode on each side is distinct and both are real: **cage** on one side, **defection**
on the other. "Put it in the DU" without saying which class is advice that produces one or
the other at random.

### The open question this leaves

What decides the class when a constraint is *both* — an agent's own read budget that other
agents also depend on to trust its output? The honest answer today is that this is
undecided. The plausible resolutions are to split the constraint (a private budget plus a
published floor), or to treat any constraint another agent relies on as coordination-class
by definition and accept the amendment cost. It is recorded as open rather than resolved,
because guessing here would produce exactly the cage-or-defection coin flip described above.

## 3. The consensus ladder — three tiers, and the cost is deliberate

The interesting claim is not "no consensus". It is that coordination is a **cost tier you
select per operation**, and most operations sit on the free one. **§2c is the selector** —
the tier is *derived from the read set at merge time*, not declared by the caller.

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
- **Partly exists:** the single-agent amendment rule of §2e — `observe.ts`'s fourth
  escape-hatch option is that rule implemented for one agent's action grammar.
- **Not yet built:** the amortized pre-read (§2b), read-set tier selection (§2c), the
  supplied-ontology / per-tick mini-compaction (§2d, toy only in `harney`), the
  coordination-class amendment process of §2e, and the partitioned-tip join itself — N Z-set tips reconstructed by a
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
- **Optimistic concurrency control / read-set validation** — Kung & Robinson, *On Optimistic
  Methods for Concurrency Control* (ACM TODS, 1981). The anchor for §2c, and the source of
  its two named failure modes: incomplete read sets and granularity-driven false conflicts.
- **Bounded contexts** — Eric Evans, *Domain-Driven Design* (2003). The boundary shape in §2d.
