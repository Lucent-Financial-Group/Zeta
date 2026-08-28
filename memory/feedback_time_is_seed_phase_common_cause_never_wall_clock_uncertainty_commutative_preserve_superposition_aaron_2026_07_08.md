---
name: time-is-seed-phase-common-cause-never-wall-clock
description: "Substrate time must be seed-based phase-generated common-cause correlated time, NEVER wall-clock; uncertainty is commutative — preserve it, don't collapse the superposition early"
metadata: 
  node_type: memory
  type: feedback
  originSessionId: a9bca54f-fdf0-41b7-8def-cb33ee1bec26
---

Aaron 2026-07-08, correcting the trio-attestation verdict: *"make sure we don't
snake in wall clock time and reduce uncertainty. our time is our own seed-based
phase-generated common-cause correlated time, it has to work on any planet and
space and allow for time delay across planets, and uncertainty is commutative —
this is one thing we want to preserve, not collapse early or it destroys the
superposition."*

**The rule:** any "same moment / same window / simultaneity / shared clock"
semantics in the substrate must be grounded in **seed-phase** (all agents
phase-generate the same tick from the common seed S=4 → tick-N is the same
*logical* phase for everyone, a Lamport logical clock), NOT wall-clock. The
correlation between agents is **Reichenbach common cause** (the shared seed),
not clock-sync. "Everyone shares S=4" is a-priori common knowledge, so the seed
IS the common-knowledge fixed point — you get simultaneity for free without a
physical clock.

**Why (three, each load-bearing):**
1. **No absolute simultaneity** (special relativity, no preferred frame) — must
   work across planets with light-delay; "same wall-clock instant" is undefined.
2. **Wall-clock is an ambient-entropy leak** — noninterference §13 quarantines
   it, DST §7 bans it (`Date.now()`/`new Date()` are forbidden in workflow
   scripts for exactly this). Time enters through the declared seed channel only.
3. **Early collapse destroys the superposition** — pinning to a wall-clock
   instant imposes a *total order* (preferred frame) → forces a synchronization
   barrier → a premature measurement that collapses the belief superposition.
   **Uncertainty is commutative; preserving that commutativity keeps the
   superposition alive** and lets the fold tolerate any arrival order + light-
   delay (CRDT/Z-set idempotent merge, §6 — never a sync barrier).

**How to apply:** whenever a design reaches for "when did X happen / did these
coincide / whose turn is it this window," use the seed-phase index, never the
git author-date or a wall clock. Round-robin selection keys off the seed-phase
index (that's *why* it's DST-replayable). A formal spec of simultaneity must
model a shared deterministic seed-phase counter, never a `now : Real` variable —
that would re-import the leak and falsely model a frame-independent property. The
15-min GHA heartbeat is an implementation *trigger*, not the *semantics*
(migrating heartbeat windows off wall-clock is named debt).

Landed: `docs/letters/from-soraya-trio-attestation-addendum-seed-phase-not-wallclock.md`
(PR #9575). Anchors: Reichenbach 1956, Lamport 1978, Halpern–Moses 1990,
Einstein 1905, manifesto §7/§13/§6, common seed S=4. Ties to
[[every-bug-has-economic-value]] (common seed S=4) and the noninterference /
DST / idempotency disciplines.
