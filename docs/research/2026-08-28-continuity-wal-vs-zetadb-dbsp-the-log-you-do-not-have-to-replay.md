# Continuity's WAL vs ZetaDB/DBSP: the log you do not have to replay

**Date:** 2026-08-28 · **Source that prompted it:** Cursor's *Git at Any Scale* (Vicent
Martí), forwarded by Aaron. Verbatim excerpts are quarantined in
[`ip-questionable/2026-08-28-cursor-continuity-…-verbatim-aaron-forwarded.md`](ip-questionable/2026-08-28-cursor-continuity-git-at-any-scale-wal-on-s3-and-primeagen-reaction-verbatim-aaron-forwarded.md).
Nothing below depends on that file surviving.

Aaron's framing, which is the thesis of this note:

> *"this is very similar to zetadb/fs replacement of git — instead of a WAL, or kind of like
> a more advanced WAL, we have Z-sets and DBSP and materialized views. We also use CRDT
> where possible, we are trying to avoid consensus everywhere like this."*

## 1. The problem, stated so both systems are answering the same question

Git is a content-addressed DAG. Serving it at scale forces three things:

1. **Pointer chasing.** You cannot answer "what is file F at commit C" without walking
   commit → tree → subtree → blob, and each hop's address is only known after the previous
   fetch resolves. Latency multiplies along the walk, it does not amortise.
2. **A durable, agreed-upon tip.** Refs must advance atomically, and a client that pushes
   then immediately fetches must see its own write.
3. **Bounded restore cost.** However you store history, reconstructing current state must
   not be proportional to all of history.

Cursor's answer: a write-ahead log in S3 is the source of truth; local Git repos on NVMe
are a warm cache; ordering comes from an atomic compare-and-swap on the WAL index;
placement comes from rendezvous hashing; restore cost is bounded by periodic compaction.

That is a genuinely good design, and two of its choices are ones we should simply adopt.
The third — the WAL itself — is where we differ, and the difference is not cosmetic.

## 2. What we should take, unchanged

**(a) The DAG must not live behind a network hop.** Their strongest empirical claim is
negative: storing Git objects in a distributed KV store *has been tried repeatedly and
fails*, most seriously by Shawn Pearce at Google on JGit, and it failed on clone latency
specifically. The mechanism is §1.1 — a per-object round trip turns a graph walk into a
latency chain.

This is a direct warning for **ZetaFS**. A content-addressed Merkle DAG makes
"put every node in the object store, address it by hash" look obviously right. It is
obviously right for *durability* and obviously wrong for *traversal*. Whatever ZetaFS
does, resolving a path must not be N sequential remote gets. Options that keep the
property: locality-preserving batching (their packfile equivalent), a local materialised
index, or — see §3 — never traversing at read time at all.

**(b) Source of truth in object storage; nodes are cache.** This is the move that
collapses their operational burden, and it is orthogonal to how the log is encoded. The
observation worth stealing verbatim: once the durable truth is external, *routing stops
being state*. No repository→node table, no repair jobs, no "pets not cattle". A node that
lacks a repository just materialises it. We should hold ZetaFS to the same standard: if
losing every local disk is a rebuild rather than an incident, the design is right.

## 3. Where Z-sets + DBSP is a different answer, not a variation

A write-ahead log has a property its users rarely name: **entries are not commutative.**
That is the whole reason Continuity needs a linearization point (the S3 CAS) and the
reason its correctness argument is "all pushes are linearizable". The log is an *ordered*
structure because replaying it out of order yields a different state.

Z-sets are the opposite by construction. A Z-set is a multiset with signed weights;
addition is commutative, associative, and has an inverse (retraction is `-1`, not a
tombstone). DBSP is incremental view maintenance over exactly that algebra. Two
consequences follow, and they map onto the two hard parts above:

**(a) Compaction versus incremental maintenance.** Continuity must compact *because* a
full restore replays every entry, so replay cost grows with history — they say so
explicitly. Compaction is the mitigation, and it costs CPU on a primary plus bandwidth on
every replica.

Under DBSP the question is differently shaped: a materialised view is maintained by
applying deltas, so the current state is never reconstructed by replay. The materialised
view *is* the compacted state, continuously. Compaction does not disappear as a concern —
the delta history still accumulates and still needs a retention policy — but it stops
being on the *restore* path. What Continuity buys with a periodic expensive job, we get as
the ordinary steady-state behaviour of the operator.

Honest limit: this claim is about asymptotics and shape, not measured throughput. We have
no number to put beside their 120 pushes/s on S3 Standard or 300+ on S3 Express One Zone.
Until we do, this is a design argument, not a benchmark result.

**(b) Commutativity dissolves the linearization point — but only where it applies.** Their
CAS exists to totally order pushes. For any part of the state expressible as a CRDT or a
Z-set fold, that ordering requirement does not exist: concurrent updates merge, and merge
is idempotent, so redelivery and reordering are both safe. This is precisely Aaron's
*"avoid consensus everywhere"*, and it is why we can be more aggressive than Continuity
rather than merely cheaper.

**The part that must not be overstated.** Not everything is commutative, and the paper's
own example is the sharp one: a Git *ref update* is a compare-and-swap by nature — "move
`main` from A to B, and fail if it is not at A" is a conditional write, and no amount of
CRDT machinery makes it associative. Where Zeta needs that semantics, it needs a
linearization point too, and we should expect to arrive at something CAS-shaped. The win
is not "no consensus anywhere"; it is **shrinking the set of operations that require it**
to the genuinely order-dependent ones, and letting the large commutative remainder run
without coordination. Claiming more than that would be exactly the failure mode this
repository is built against.

## 4. The tail-at-scale argument generalises, and it is the reason to care

Their case against 3PC is not "consensus is slow" but something sharper: with `r` replicas
and `k` round trips per commit, you take `r·k` chances at the latency tail, so P(slow)
approaches 1 as replicas grow. Adding replicas to serve reads *degrades writes*. That is
the structural reason Spokes has both a floor (three replicas even for a throwaway repo)
and a ceiling (writes rot as read capacity grows).

For us the same arithmetic is the argument for commutative merge over quorum: an operation
that needs no agreement takes no chances at the tail, so read replicas become free to add.
It is also a warning to check our own designs for hidden `r·k` factors — anywhere a Zeta
operation fans out and waits for a majority, the same curve applies to us.

## 5. What this note does not claim

- Not that ZetaDB/ZetaFS is built or benchmarked against this. It is not.
- Not that DBSP removes the need for durable external storage — §2(b) is adopted, not replaced.
- Not that Continuity is wrong. On its constraint (serve the *real* Git wire protocol to
  unmodified clients) a WAL is a strong answer, and their choice to keep ordinary Git
  repositories on NVMe rather than fork Git is the same instinct we apply elsewhere.

The difference is the constraint, not the competence: they must satisfy a client they do
not control. A substrate that owns both ends can choose an algebra where the ordering
problem is smaller.

## Anchors

- **Z-sets / DBSP** — Budiu, McSherry, Ryzhyk, Tannen, *DBSP: Automatic Incremental View
  Maintenance for Rich Query Languages* (VLDB 2023). The incremental-maintenance claim in
  §3(a) is theirs; the application to a Git-shaped store is ours.
- **CRDTs** — Shapiro, Preguiça, Baquero, Zawirski (2011): commutative, associative,
  idempotent merge; the formal basis for §3(b).
- **Tail at scale** — Dean & Barroso, *The Tail at Scale* (CACM 2013), the source of the
  `r·k` argument used in §4.
- **Content-addressed storage** — Merkle (CRYPTO '87).
- **The negative result in §2(a)** — Shawn Pearce's JGit/DHT work at Google, as reported by
  Martí. Worth treating as the strongest evidence in the whole post, because a documented
  failure by a competent team is rarer and more informative than a success story.
