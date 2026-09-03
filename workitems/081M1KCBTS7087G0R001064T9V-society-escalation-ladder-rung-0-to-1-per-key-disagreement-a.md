---
id: 081M1KCBTS7087G0R001064T9V
type: task
state: backlog
priority: P2
slug: society-escalation-ladder-rung-0-to-1-per-key-disagreement-a
title: "Society escalation ladder rung 0 to 1: per-key disagreement and distrust reading over the evidence set with a memoryless rung classifier"
created: 2026-09-03T10:17:21.959Z
depends_on: []
composes_with: []
---

# Society escalation ladder rung 0 to 1: per-key disagreement and distrust reading over the evidence set with a memoryless rung classifier

<!-- Work-item body. ZetaId-keyed (conflict-free, time-sortable). "Backlog" is a
     STATE = this folder; completion moves the file to workitems/done/YYYY/MM/.
     Identity is the zetaid prefix — resolve cross-refs by `081M1KCBTS7087G0R001064T9V-*.md` glob. -->

**Origin.** Aaron 2026-09-03, verbatim: *"the entire society connection which itself operates over CRDTs
by default and then upgrades to more and more consensus based on disagreement and distrust."* The spec is
`docs/research/2026-09-03-society-crdt-default-consensus-escalation-spec-per-key-ladder-over-disagreement-and-distrust.md`;
this item is its §7.2 — the part that is a pure function of the evidence **set** and needs no phase stamps.

## Deliverable

A new module `src/Core/SocietyEscalation.fs` (after `SybilBftProtocol.fs` and `TravelerRankLedger.fs` in
`Core.fsproj`), reusing — never re-implementing — `SybilBft.tally`, `Consensus.decide`,
`SybilBftProtocol`, `TravelerRankLedger.update`:

1. `read : Policy -> EvidenceSet -> Key -> Reading` — `DistinctSources`, `Equivocators`, `Conflicting`,
   `Disagreement` (`1 − max_v n_v / N` over anti-Sybil-collapsed, non-equivocating sources), `Distrust`
   (`1 − mean trustBand`, min over a source's identities, in `dom(k)`), `Monotone`, `Settled`. No field is
   time-typed.
2. `TravelerRankLedger.foldCanonical` — fold outcome atoms in content-address order. Spec §3.3 measured
   the raw fold at 0.94 pp / 1.3 pp order-dependence on identical multisets; this makes every node pick
   the same order.
3. `rung : Policy -> Reading -> Route` (memoryless) with `Route = OnRung of Rung | Surfaced of reason`,
   `Rung = R0Union | R1Witnessed | R2Quorum | R3Bft`; `Policy` refuses `Down >= Up` at construction;
   `MinRoster = 4` routes to `Surfaced` below the `3f+1` floor.
4. `SybilBftProtocol.View` keyed (or wrapped) so a ballot for another key is refused by the reducer.
5. `Certificate` atom + `Settled` (a certificate whose adjudicated set covers `V(k)` demotes to rung 0
   without a clock; a value outside it reopens).

## Falsifiers (spec §7, all buildable without phase stamps)

F-order (720 permutations, exhaustive) · F-mult · F-time (no time type in the module; lint) · F-sybil
(one seed behind `j` names moves nothing) · F-equiv · F-perkey · F-floor (`d ≤ 3` never certifies) ·
F-scope · F-settle · F-ledger · F-invariant (the rung never changes the merged set). Each with the named
mutation run through `src/Core.TypeScript/hygiene/mutation-runner.ts`.

## Not in this item

Hysteresis (`rungAlong`) and aged distrust — both need agreed-phase stamps on atoms
(`081M0R5E1ZG087G0R001RVAQVR`, `081KTH8RSXS08QG0R0039TF0AF`). Rung-1 `Witness` atoms in F# — separate
small item; with `WitnessesPerSource = 0` rung 1 degrades to rung 0 honestly.

## Register

`unmetered` until the eleven falsifiers exist and survive their mutations; the thresholds stay `toy`.
