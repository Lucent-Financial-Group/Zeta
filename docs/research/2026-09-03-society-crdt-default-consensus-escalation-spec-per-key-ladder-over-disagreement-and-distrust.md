# The society connection: CRDT by default, consensus earned per key — an escalation ladder over disagreement and distrust

**Lane:** Fable 5.1 math team, 2026-09-03 (shadow\*). **Register:** the *inventory* (§1) is a reading of
shipped code; the *ladder* (§4) is a **spec**, `unmetered` until its falsifiers (§7) exist in the tree; the
threshold *numbers* in §4.3 are **`toy`** and say so. One measurement was taken while writing (§3.3) and is
reported as a measurement. Work item for the buildable first rung: `081M1KCBTS7087G0R001064T9V`.

**Aaron, verbatim:** *"Also the entire society connection which itself operates over CRDTs by default and
then upgrades to more and more consensus based on disagreement and distrust."*

## 0. The sentence

> Replicated state is a content-addressed evidence-set union — a CRDT — and stays one. Consensus is
> never applied to the state; it is applied to **a key**, and only when two measurements taken **from the
> evidence set itself** say the key has earned it: **disagreement** (how split the distinct sources are on
> that key) and **distrust** (what the rank ledger says about those sources). A key climbs a four-rung
> ladder — union → witnessed union → distinct-source quorum → BFT on the contested values — and climbs
> back down on evidence, never on a clock. The rung is a *reading* each node takes with its own policy;
> the evidence set it reads is shared. Both branches of every disagreement stay in the set forever; a
> consensus certificate is one more atom, not a deletion.

Everything below is either (a) already in the tree, cited by file and line, or (b) the smallest addition
that turns the sentence into a pure function `rung : Policy -> EvidenceSet -> Key -> Route`.

## 1. Inventory — what already exists, and what is missing

Read before writing, per the standing design ("build on, not around"). Line numbers are against `main`
at `4a6dbe54b2`.

| Concern | Shipped | Where |
|---|---|---|
| CRDT state over Z-sets (G/PN-counter, OR-set, LWW register/map, RGA) | yes | `src/Core/Crdt.fs:37-266` |
| Delta-state CRDTs / dotted version vectors | yes | `src/Core/DeltaCrdt.fs:7-17` |
| Evidence **set** as replicated state, belief as a *function of the set*, idempotent join (`apply`, `merge`) | yes | `src/Core/TwoTimescaleFold.fs:74-111` |
| Commutative belief fold (monoid, **not** idempotent — dedup is a caller obligation) | yes | `src/Core/BeliefConvergence.fs:33-72` |
| Content-addressed evidence ledger = state; fusion = query; changed-content ⇒ visible **conflict atom** | yes (contract + TS/Python census) | `docs/research/2026-09-02-crdt-belief-fusion-contract.md` §1, §5, §7 |
| Source-keyed **join** with an absorbing `Conflicted` set (one source, two values ⇒ named and excluded) | yes | `src/Core/QuorumAlgebra.fs:99-135` (`Quorum`, `join`) |
| Interference excess as a neutral disagreement measurement | yes | `src/Core/QuorumAlgebra.fs:151-184` (`interfereQuorum`, `interferenceExcess`) |
| Per-row compare-and-swap; multi-row "escalates to the serialized bus / saga" | yes | `src/Core/CasStore.fs:3-40` |
| **Structural** escalation: Lane 1 (commutative, merge now) vs Lane 2 (multi-observer consensus, dilated in *rounds*, no timestamp) | yes | `src/Core/ClaimLane.fs:336-464` (`Reason`, `Verdict`) |
| CALM boundary stated: non-monotone ops need consensus up front; zero-sum conflicts are surfaced, never laundered through a merge | yes (doc) | `docs/research/2026-06-08-the-reorder-loophole-is-bounded-by-commutativity-non-reversible-claims-need-consensus.md` |
| Decorrelation meters (ρ): permutation-null excess correlation (`ExcessCorrelation` / `WithinNull`, one-way); pairwise agreement coefficient ∈ [0,1]; CHSH on spacelike pairs only; Kish `N_eff` | yes | `src/Core/DecorrelationExcess.fs:60-120`, `src/Core.TypeScript/observe/decorrelation-meter.ts:1-60`, `src/Core/DecorrelationMeter.fs`, `src/Core/SocietyUsefulWork.fs:100-115` |
| Rank / trust: TrueSkill-ADF `trustBand` (fresh = 0.5), `age` (σ² inflation, explicit τ), `ticksUntilUninformative`, `isPositiveSkill`, domain isolation | yes | `src/Core/TravelerRankLedger.fs:85, 105, 162, 181, 216-252` |
| A trust-band **gate** precedent (threshold 0.3, below the fresh prior on purpose) | yes | `src/Core/DurableDiplomacyRankGate.fs:34-70` |
| Anti-Sybil: distinct sources by drift correlation (union-find), `forgeryCostFloor`, CHSH `chshS` / `chshSybil`, `ChshBand` with strict-exceedance escalation | yes | `src/Core/AntiSybil.fs:78, 109, 134, 179, 470-500` |
| BFT quorum over **distinct sources** (`2f+1`, `f = ⌊(d−1)/3⌋`), equivocators excluded | yes | `src/Core/SybilBft.fs:50-99` |
| Single-shot BFT reducer, order-independent, **fixed** membership (`Members`) so an early sub-population cannot commit | yes | `src/Core/SybilBftProtocol.fs:60-145` |
| Liveness on **logical ticks**: heartbeats, suspicion, view-change installed only by a distinct-source quorum | yes | `src/Core/SybilBftLiveness.fs:31-192` |
| Per-tick progress / stall detector | yes | `src/Core/SybilBftProgress.fs:19-107` |
| Simple quorum consensus with an **order-independent ordinal tie-break** (four-oracle seed) | yes | `src/Core/Consensus.fs:17-60` |
| TLC-checked model: Sybil raw-majority refused; equivocation exclusion | yes | `src/Core.TLA/specs/BftSybilConsensus.tla` |
| Trust dynamics as a finite chain with a Kleene fixed point (`T0..T3`, `evidenceUp`, `evidenceUpDecay`) | yes | `src/Core/TrustCalculus.fs` `Dynamics` |
| Witness attestation record, pure, key-bound | yes (TS) | `src/Core.TypeScript/observe/attestation-record.ts:1-30` |
| **A rung that moves on a measured quantity** (disagreement or distrust) | **no** | — |
| **Per-key** scoping of consensus (BFT instance bound to a key) | **no** — `SybilBftProtocol.View` has no key | — |
| **Hysteresis** on any escalation | **no** — `ChshBand` is memoryless; `ClaimLane` is memoryless | — |
| A rank-ledger reading that is a function of the evidence **set** | **no** — see §3.3, measured | — |
| Refusal of BFT below the `3f+1` floor | **partial** — `SybilBft.decide` with `d = 1` yields `q = 1` and commits a lone vote; only `SybilBftProtocol.Members` guards it | `src/Core/SybilBft.fs:88-99` |

The four "no" rows are the spec. Everything else is reused by name.

## 2. The objects

- **Evidence set `E`.** A set of content-addressed atoms. The union of two replicas' sets is the merge
  (associative, commutative, idempotent, monotone by key inclusion — the 2026-09-02 contract's row 1, which
  *measured* those laws rather than assumed them). Nothing in this spec reads anything but `E` plus local
  policy.
- **Atom kinds on a key `k`** (all are atoms in `E`; the ladder introduces the last two):
  - `Assert (k, v, s)` — claimed identity `s` asserts value `v` for `k` (Z-set weight `+1`).
  - `Retract (k, v, s)` — weight `−1`; the interference half (`ClaimLane.fs:35-45` on why retraction and
    redelivery-safety cannot share one operator).
  - `Outcome (s, dom, hit)` — a calibration outcome for identity `s` in hat-domain `dom`; the rank ledger's
    input (`TravelerRankLedger.record`).
  - `Witness (k, v, s, w)` — identity `w` attests it observed `s` assert `v` for `k` (the F# shape of
    `attestation-record.ts`, which is already pure and key-bound).
  - `Certificate (k, V, v*, Q, view)` — the output of a rung-3 instance: on value set `V` it committed `v*`
    with distinct-source quorum `Q` in `view`. **Appended, never substituted.** The losing values stay in
    `E` with their paths (anti-Babel: reintegration is not reconvergence).
- **Source `σ`.** Claimed identities collapse to sources by the anti-Sybil oracle: `σ(s)` is the
  union-find component of `s`'s drift stream (`AntiSybil.antiSybil`), or, where drift is not on the wire,
  the identity plane's distinctness readout. A source, not an identity, is what gets counted.
- **Key `k`.** The subject of an assertion — a `CasStore` row key, a `ClaimLane` claim id, a
  `SharedEvidence.Id` family. Every key carries a **hat-domain** `dom(k)` (so distrust reads the right slice
  of the ledger) and an **op class** `mono(k) ∈ {monotone, non-monotone}` declared by the op, exactly the
  "every op declares monotone vs non-monotone" discipline the reorder-loophole doc asked for.
- **Policy `π`.** Local. Thresholds, a trust floor, the roster minimum, the settle count. Two nodes may hold
  different `π` and therefore read different rungs from the same `E`. That is not a bug; it is the
  Multi-Oracle Principle applied to coordination. What they may **not** do is fold different `E`.

## 3. The two metrics — computable from `E`, blind to order, multiplicity and time

Fix a key `k`. Let `A(k) = { (σ(s), v) : Assert (k, v, s) ∈ E, net weight of (k, v, s) > 0 }` after
retractions are netted (the Z-set convention: zero-weight atoms are absent).

- **Equivocators** `Q(k) = { σ : |{ v : (σ, v) ∈ A(k) }| ≥ 2 }` — one source, two live values. This is
  `QuorumAlgebra.join`'s `Conflicted` set and `SybilBft.tally`'s `Equivocated`, already named in both.
- **Counted sources** `S(k) = { σ : (σ, ·) ∈ A(k) } \ Q(k)`, `N = |S(k)|`.
- **Support** `n_v = |{ σ ∈ S(k) : (σ, v) ∈ A(k) }|`; the live value set `V(k) = { v : n_v > 0 }`,
  `m(k) = |V(k)|`.

### 3.1 Disagreement `D(k)`

```text
D(k) = 0                         if N = 0
     = 1 − max_v n_v / N         otherwise
```

`D = 0` when unanimous; `D = 1 − 1/m` when `m` values split evenly; `D ≥ 1/2` is impossible with a strict
plurality of two values, so `D → 1/2` from below is the "even split" signal. It is a function of the
**set** `A(k)`: permuting `E` cannot change it (no order is read), duplicating an atom cannot change it
(sets), and a single source voting `j` times contributes **one** `(σ, v)` (anti-Sybil collapse runs *before*
counting, which is the whole point of `SybilBft`). `m(k)` and `|Q(k)|` are reported alongside — `D` alone
cannot distinguish "one dissenter among fifty" from "one dissenter among two" from "one source contradicting
itself", and each of those moves a different rung.

`D` is the *multiplicity-of-conflicting-values* form the lane brief named. The other form — divergence
between two peers' *query results* — is deliberately not used: two peers with the same `E` compute the same
query (the 2026-09-02 contract's "multiway query is permutation invariant" row), so any query divergence is
divergence of `E`, and that is an anti-entropy problem, not a disagreement one.

### 3.2 Distrust `U(k)`

For a source `σ` with claimed identities `ids(σ)`, and the key's domain `dom(k)`:

```text
tb(σ)  = min_{s ∈ ids(σ)} trustBand( fold_canonical (Outcome atoms for (s, dom(k)) in E) )
U(k)   = 0                                   if N = 0
       = 1 − (1/N) · Σ_{σ ∈ S(k)} tb(σ)      otherwise
```

- `trustBand` is `TravelerRankLedger.trustBand` (Φ(μ/√(σ²+β²)); fresh identity = 0.5), so a key asserted
  only by fresh identities reads `U = 0.5` — "no evidence either way", which is *exactly* the condition that
  should demand witnesses (rung 1) and nothing stronger.
- The **min over a source's identities** is soundness-biased: a source that has minted several names cannot
  launder its standing by asserting under its best-ranked one. This composes with `AntiSybil`'s guarantee
  (`DistinctCount ≤ s`) rather than duplicating it.
- Domain isolation is inherited: `dom(k)` selects the ledger slice, so standing earned as a verifier buys
  nothing on a signing key (`TravelerRankLedger.fs:15`).
- **Aging must not enter here from a wall clock.** `TravelerRankLedger.age τ elapsed` is correct and
  available, but `elapsed` in this fold may only be an agreed logical quantity (phase distance between the
  outcome atom and the assertion atom), never local elapsed time — `local-time-never-enters-the-shared-fold`.
  Until phase stamps ride on atoms (§7.3), `U` is read **unaged**.

### 3.3 A measurement taken while writing: the ledger fold is order-dependent

`U` is only a function of `E` if `fold_canonical` is. `TravelerRankLedger.update` is an ADF probit step
(Herbrich–Minka–Graepel 2006 eq. 4–5, single-pass), and ADF is known to depend on the order of
assimilation — EP exists to remove that dependence by iteration (Minka 2001). Re-implementing the update
line-for-line in TypeScript and folding the **same multiset** of outcomes in different orders:

| outcomes (same multiset) | order | `trustBand` |
|---|---|---|
| {hit, hit, miss} | hit, miss, hit | 0.603198 |
| {hit, hit, miss} | miss, hit, hit | 0.608806 |
| {hit, hit, miss} | hit, hit, miss | 0.599387 |
| 5 hits, 3 misses | permutation A | 0.598636 |
| 5 hits, 3 misses | permutation B | 0.611884 |

Spread: **0.94 percentage points** at three observations, **1.3 pp** at eight. So a node that folds
outcome atoms in *arrival* order and a node that folds them in another order read different trust bands
from identical evidence — a distrust threshold at 0.60 would put one node on rung 2 and the other on rung 1
from the same `E`. That is precisely the divergence the local-time rule forbids, arriving through the
ledger instead of the clock.

**The fix is the one the repo already uses twice**: fold in a canonical order that is a function of the
set — content-address order of the outcome atoms (or agreed phase order once it exists), the same move as
`Consensus.decide`'s ordinal tie-break and the 2026-09-02 contract's "canonical operand order is by a
stable content fingerprint, not arrival order". `fold_canonical` is that: sort, then fold. It does not make
ADF order-*independent*; it makes every node pick the *same* order, which is all the shared reading needs
(reproducible, not exact — the `interfereQuorum` precedent, `QuorumAlgebra.fs`). Register: the spread is
**measured**; the claim that canonical-order folding removes the divergence is a one-line consequence and
gets its own falsifier (§7, F-ledger).

## 4. The ladder — a typed state machine

### 4.1 Types (F# sketch; `src/Core/SocietyEscalation.fs`, after `SybilBftProtocol.fs` and `TravelerRankLedger.fs` in compile order)

```fsharp
/// Declared ascending so structural comparison is the rung order.
type Rung =
    | R0Union      // CRDT union; the query reports V(k) as-is (all live values, with support)
    | R1Witnessed  // union; a value is REPORTED only with >= W distinct witnesses per source
    | R2Quorum     // a value is reported only with a majority of trust-floored distinct sources
    | R3Bft        // SybilBftProtocol on V(k) with the key's roster; Certificate appended to E

/// Where a key is routed. `Surfaced` is the reorder-loophole doc's step 2: a genuine
/// conflict the ladder refuses to auto-resolve (roster below the BFT floor, or a
/// non-monotone op with no compensation) — route to a chosen oracle / jurisdiction / human.
type Route =
    | OnRung of Rung
    | Surfaced of reason: string

/// The neutral reading of one key from the evidence SET. No field is time-typed.
type Reading =
    { DistinctSources: int    // N = |S(k)|
      Equivocators: int       // |Q(k)|
      Conflicting: int        // m(k)
      Disagreement: float     // D(k)
      Distrust: float         // U(k), canonically folded, unaged
      Monotone: bool          // mono(k) — the CALM axis, declared by the op
      Settled: bool }         // exists Certificate (k, V', ...) in E with V' ⊇ V(k)

type Thresholds = { D: float; U: float }

/// LOCAL policy. Two nodes may differ here; they must not differ in E.
type Policy =
    { Domain: string
      TrustFloor: float               // sources below are not COUNTED at R2/R3 (rank-gate precedent 0.3)
      WitnessesPerSource: int         // W at R1
      Up: Map<Rung, Thresholds>       // cross EITHER D or U upward from this rung
      Down: Map<Rung, Thresholds>     // BOTH strictly below to leave downward; Down < Up pointwise
      Settle: int                     // atoms on k that must arrive with the Down condition holding
      MinRoster: int }                // 4: below it f = 0 and BFT tolerates nothing — refuse

/// Pure. read : Policy -> EvidenceSet -> Key -> Reading
/// Pure, memoryless. rung : Policy -> Reading -> Route
/// Pure, with hysteresis. rungAlong : Policy -> Reading list (agreed-phase order) -> Route
```

`SybilBftProtocol.View` gains a `Key` (or is wrapped: `{ Key; Inner: View }`) so ballots for another key
are refused by the reducer, not filtered by the transport. That is the one change to a shipped module.

### 4.2 Transitions upward (memoryless `rung`)

Evaluated top-down; the first match wins. `up r = π.Up[r]`.

| To | Fires when | Reuses |
|---|---|---|
| `Surfaced` | `not Monotone ∧ roster(k) < MinRoster`, or `Equivocators ≥ 1 ∧ roster(k) < MinRoster` | reorder-loophole doc §"Zeta's handling of the non-reversible" |
| `R3Bft` | `not Monotone` (structural, CALM — regardless of `D`); or `Equivocators ≥ 1`; or `D ≥ up(R2).D`; or `U ≥ up(R2).U` — each requiring `roster(k) ≥ MinRoster` | `SybilBftProtocol.init roster threshold`, `SybilBft.tally/decide`, `SybilBftLiveness` for view-change |
| `R2Quorum` | `D ≥ up(R1).D` or `U ≥ up(R1).U` | `Consensus.decide` semantics over trust-floored distinct sources (majority, ordinal tie-break) |
| `R1Witnessed` | `Conflicting ≥ 2` (any live disagreement at all), or `U ≥ up(R0).U` | `Witness` atoms; `attestation-record.ts` shape |
| `R0Union` | otherwise (`Conflicting ≤ 1 ∧ U < up(R0).U`), **or** `Settled` | `TwoTimescaleFold.merge`, `QuorumAlgebra.join` |

Notes that carry weight:

- **Equivocation is a rung-3 trigger, not a rung-2 one.** A source contradicting itself is the observable
  half of Byzantine behaviour (`SybilBft.fs:19-21`); the honest-but-split case is what quorum is for. Both are
  reported as *facts* (`Equivocators`, `Disagreement`) and the policy attaches the rung — `dual-use
  -detection-is-neutral-oracle-decides`.
- **Non-monotone goes straight to rung 3.** CALM says coordination is *required* there; measuring
  disagreement first would let a double-spend commit while `D` is still 0 (the two conflicting exclusive
  claims may sit on different replicas that have not yet merged). Where the op has a compensation, the
  saga is the coordination (`DurableSaga`); where it has none and the roster is too small, `Surfaced`.
- **`Settled` demotes to rung 0 without a clock.** A certificate whose adjudicated set covers the live
  values makes the query deterministic (report `v*`); the reading stays `Conflicting ≥ 2` — the losers are
  still in `E` — but the rung is 0. A new value not in the certificate's `V'` reopens the key by making
  `Settled` false. This is the rung-3 hysteresis, and it is evidence-driven.
- **Rung 2 is a majority, not `2f+1`.** It defends against a single source and against Sybil inflation
  (distinct sources, trust-floored); it makes **no Byzantine claim**. The Byzantine claim is rung 3's and
  is bought with the `3f+1` roster. Saying which is which is the difference between Paxos and PBFT and it
  must stay legible in the type.

### 4.3 Transitions downward — hysteresis, on evidence

`rungAlong π readings` folds readings taken after **each atom on `k`** in **agreed-phase order** (a
reading per prefix of the phase-ordered atoms of `k`). Upward moves apply immediately per §4.2. A
downward move from `r` fires only when **both** `D < π.Down[r].D` and `U < π.Down[r].U` have held for
`π.Settle` consecutive readings. `Down < Up` pointwise is a policy invariant (checked at construction;
`Down = Up` is refused, see F-hyst).

Two properties, stated so they can be tested:

1. `rungAlong` is a function of the phase-ordered set: two nodes with the same `E` (and the same `π`) get
   the same route, because "consecutive readings" is defined over phase order, not receive order.
2. Without phase stamps, `rungAlong` is **not** computable and the buildable fallback is the memoryless
   `rung` (flapping possible — §7.3 says which work item removes the gap). A clock-based cooldown is the
   tempting substitute and is exactly what the local-time rule forbids: a node with a slower clock would
   still be on rung 2 while a faster one had demoted, and they would report different answers from the
   same evidence.

**Toy thresholds** (`toy-is-free-metered-must-be-earned`: these are starting points to be *measured
against*, not derived — nothing in §6 entails a number):

| rung | `Up.D` | `Up.U` | `Down.D` | `Down.U` |
|---|---|---|---|---|
| R0 → | any `m ≥ 2` | 0.50 (a fresh-only population) | — | — |
| R1 → | 0.25 | 0.60 | 0.15 | 0.50 |
| R2 → | 0.40 | 0.70 | 0.30 | 0.60 |

`Settle = 3`, `TrustFloor = 0.3` (the `DurableDiplomacyRankGate` default, deliberately under the 0.5 prior
so newcomers are counted), `WitnessesPerSource = 1`, `MinRoster = 4`.

### 4.4 What the rung changes — and what it never changes

| | rung 0 | rung 1 | rung 2 | rung 3 |
|---|---|---|---|---|
| what enters `E` | everything | everything | everything | everything |
| what the query **reports** for `k` | all of `V(k)` with support | values with `≥ W` witnesses per source | the trust-floored distinct-source majority, or "no majority" | `v*` from the certificate, or "pending" with `SybilBftProgress.fraction` |
| messages beyond anti-entropy | none | none | none | one `SybilBftProtocol` instance on `k` |

The first row is the invariant. **The rung governs what a node reports and whether it opens a round; it
never filters, drops, weights or reorders evidence entering `E`.** A rung-3 key still unions; the BFT
instance reads `V(k)` *from* the union.

## 5. Why per key, per claim — never global

1. **CALM is a property of an operation, not a system.** Monotone keys are coordination-free
   (Ameloot–Neven–Van den Bussche 2013, Cor. 13); making them wait for a contested neighbour throws away
   the theorem's whole content.
2. **Cost.** A BFT instance is `O(n²)` messages per decision. Global escalation charges every key the
   price of the most contested one. Per-key escalation charges the contested key alone — and the
   uncontested majority of the state runs at anti-entropy cost forever.
3. **Blast radius / liveness.** A rung-3 instance can stall (`SybilBftProgress.isStalled`); a stall on
   `k₁` must not stop union on `k₂`. Per-key instances are independent failure domains.
4. **Distrust is already per (source, domain).** The rank ledger isolates hat-domains by construction;
   there is no well-defined *global* distrust to escalate on, only `U(k)` through `dom(k)`.
5. **Polycentric fit.** Ostrom's design principles 2 and 8 — rules congruent with local conditions; nested
   enterprises — describe governance scoped to the resource, not to the commons as a whole. A per-key
   rung is the smallest such scope this substrate has; the roster of `k` is its local arena, and the
   "hubs negotiate with node rules" shape is that arena's policy `π` being local.
6. **Anti-Babel.** A global rung would force every key onto one coordination regime — the `ρ → 1` uniform
   in a tidy costume. Per-key rungs let uncontested vocabulary diverge freely while contested vocabulary
   is reconciled where the contest actually is.

## 6. Anchors — checked for entailment, and where the ladder exceeds them

Each row states what the source **entails** for the ladder (a consequence the ladder relies on), what it
**does not** entail (so no borrowed authority), and the ladder's step **beyond** it (the `toy` part).

| Anchor | Entails for the ladder | Does not entail | Beyond (toy) |
|---|---|---|---|
| **Shapiro, Preguiça, Baquero, Zawirski 2011**, *A comprehensive study of CRDTs* (INRIA RR-7506) | State-based CRDT with a join-semilattice merge ⇒ strong eventual consistency given eventual delivery. Rung 0's convergence is this theorem; the 2026-09-02 census measured the four laws on our union. | Anything about *which* of several live values is right. The MV-register keeps siblings; adjudication is outside the paper. | Rungs 1–3 — adjudication as a *query* over a CRDT, gated by measurements on the CRDT. |
| **CALM** — Hellerstein 2010; **Ameloot, Neven & Van den Bussche 2013** Cor. 13; scope: Ameloot et al. 2015 (model-relative); **Laddad et al. 2023** *Keep CALM and CRDT On* | Coordination-free ⟺ monotone, for queries over relational transducer networks. Non-monotone keys **require** coordination — the structural rung-3 trigger. Laddad: CRDT guarantees cover *merges, not reads* — which is why a rung governs what is *reported*. | That every monotone key is *safe to report*: a plurality winner over a monotone set is itself a non-monotone read (it can flip). That is the gap rungs 1–2 fill, and CALM does not say how. | Using **measured** `D`/`U` to gate reads on monotone keys. CALM is silent on degree. |
| **Castro & Liskov 1999**, *Practical Byzantine Fault Tolerance* (OSDI) | Safety with `n ≥ 3f+1`, quorum `2f+1`, under asynchrony; liveness under eventual synchrony. Rung 3 inherits: with `d` distinct sources, `f = ⌊(d−1)/3⌋`, and **`d < 4` tolerates nothing** ⇒ `MinRoster = 4` and `Surfaced` below it. | Anything about *who* the `n` are. PBFT assumes a fixed, known, distinct membership. | The membership is *derived* (anti-Sybil distinctness + a replicated roster per key). Roster bootstrapping is unspecified here — `toy`. |
| **Lamport 1998/2001** (Paxos) and **FLP 1985** | Crash-fault consensus needs a majority quorum (rung 2's shape). No deterministic consensus in a fully asynchronous system with one crash ⇒ rung 3 cannot promise termination without a timing assumption. | That timing may enter the *shared* fold. | Resolution reused, not invented: `SybilBftLiveness` puts timeouts on **logical ticks** driving *local* view-change votes whose *install* is a quorum over evidence. Local time → local action only. |
| **Chandra & Toueg 1996**, *Unreliable failure detectors* | `◇W` is the weakest detector for consensus (majority correct); suspicion is a local, revisable output. Already anchored here for probes. | That *distrust* is *suspicion*. A low trust band is a calibration fact; a suspected crash is a liveness fact. They gate different things (rung vs view-change) and must not be merged into one number. | None — the ladder keeps them apart by type. |
| **Douceur 2002**, *The Sybil Attack* | Without a logically centralized authority, an entity can present multiple identities unless it is resource-constrained. Any quorum over *claims* is void ⇒ counting *sources* is necessary, not optional. | That drift non-fungibility *is* the resource constraint — `AntiSybil` is sound for exact replay only (`AntiSybil.fs:21-27`). | The rank ledger as proof-of-useful-work standing (`SocietyUsefulWork`) is the intended constraint; its real-fleet `ρ` is **unmeasured** (`SocietyUsefulWork.fs:29-30`). |
| **Herbrich, Minka & Graepel 2006** (TrueSkill); **Minka 2001** (EP/ADF) | A principled posterior skill band; ADF is order-dependent, EP iterates it away. Entails §3.3 and the canonical-order fold. | That `trustBand` is a *distrust probability* in the ladder's sense. It is a win probability on calibration outcomes. | `U(k)` as `1 − mean tb` and every threshold on it — `toy`; the mapping from calibration standing to "how much coordination this key deserves" is a policy choice, labelled. |
| **Ostrom 1990** (*Governing the Commons*), **2010** (polycentric governance) | Empirically, durable commons governance is nested, locally congruent, monitored by participants, with **graduated** responses and accessible conflict-resolution mechanisms. Entails the *shape*: per-key arenas, participant witnesses (rung 1), graduated rungs, `Surfaced` as an explicit conflict-resolution exit. | A theorem. Ostrom's evidence is case-based; nothing here is *derived* from it. And her principle 5 is graduated **sanctions**; this substrate is rewards-only (`TrustCalculus`), so what is graduated here is **coordination cost**, never punishment. | The whole mapping — an analogy with a good fit, `toy`. |
| **Anti-Babel / monodromy** (in-repo rules) | Reintegration keeps both branches with their paths; a merge that yields one surviving value has collapsed. Entails: the certificate is an *additional* atom and losers are never deleted. | — | — |
| **Terry et al. 1995** (Bayou), already anchored in `ClaimLane` | Classify-then-route, dependency checks; conflicts are application-resolved. | Bayou's *primary commit* — an appointed node that fixes the order. Declined here (`itron-hub-patent-boundary`). | Rung 3 replaces the primary with a distinct-source quorum on the contested subset. |

Nothing in this table entails a threshold value. Every number in §4.3 is `toy`.

## 7. Falsifiers — one per transition, one per forbidden dependency

Shape follows `tests/Tests.FSharp/Consensus.TieBreak.Tests.fs` (exhaustive permutation invariance) and
`SybilBft.Tests.fs` (seeded drift streams). Each row names the test, what would make it fail, and the
mutation that must kill it (`mutation-runner.ts`; a test that survives its mutation is not a falsifier).

| Id | Property | Fails if | Mutation that must be caught |
|---|---|---|---|
| F-order | For a 6-atom `E` on one key, `rung π (read π E k)` is identical over all 720 permutations of `E` | any order is read | replace the atom **set** with a list and take the plurality by first occurrence |
| F-mult | `read π (E ∪ E) k = read π E k`; re-delivering any atom leaves the reading unchanged | multiplicity is counted | count `Assert` atoms instead of distinct `(σ, v)` pairs |
| F-time | The module names no time type; `audit-ambient-time-in-tests.ts`-shaped lint over `SocietyEscalation.fs` finds no `DateTime`/`Stopwatch`/`Environment.TickCount`; `Reading` has no time-typed field | a clock enters | add "ignore atoms older than N local seconds" and run two nodes with injected clocks 10 s apart on the same `E` — they must read different rungs, and the test must notice |
| F-sybil | One seeded stream behind `j` claimed identities all asserting `v'` against three honest distinct sources asserting `v`: `D = 1 − 3/4 = 0.25` for every `j`, and `DistinctSources = 4` | claims are counted | skip the `antiSybil` collapse — `D` becomes `1 − 3/(3+j)` and rises with `j` |
| F-equiv | The same source asserting `v` under one name and `v'` under another: `Equivocators = 1`, excluded from `N`, and the route is `R3Bft` (roster ≥ 4) or `Surfaced` (roster < 4) — never `R2Quorum` | equivocation is read as disagreement | drop the `Q(k)` exclusion |
| F-perkey | `E` with `k₁` at `D = 0.5` and `k₂` unanimous: `rung k₂ = R0Union` | escalation is global | compute `D` over all atoms regardless of key |
| F-floor | Roster of 3, `D = 0.5`: route is `Surfaced`, never `R3Bft`; and no `Certificate` can be produced with `d ≤ 3` | BFT runs below `3f+1` | remove `MinRoster` — `SybilBft.decide` with `d = 1` returns `q = 1` and commits the lone vote, the hazard `SybilBftProtocol.fs:72-76` names |
| F-scope | A rung-3 instance for `k₁` fed a `Ballot` for `k₂` leaves its `View` unchanged | cross-key votes pollute | remove `Key` from the view |
| F-settle | After `Certificate (k, V', v*, …)` with `V' ⊇ V(k)`: route `R0Union`, query reports `v*`; a new `Assert (k, v'', ·)` with `v'' ∉ V'` reopens (`Settled = false`) | a stale certificate silences new dissent | settle on *any* certificate for `k` |
| F-hyst | Readings in phase order with `D` = 0.30, 0.45, 0.38, 0.38, 0.20, 0.20, 0.20 under `Up(R1).D = 0.40`, `Down(R2).D = 0.30`, `Settle = 3`: routes R1, **R2**, R2, R2, R2, R2, **R1** | flapping | set `Down = Up` (must be refused at construction); or `Settle = 1` (demotes at the first 0.20) |
| F-ledger | Folding the same multiset of `Outcome` atoms in two arrival orders yields the same `tb` via `fold_canonical`; the raw `List.fold update` differs by ≥ 0.9 pp on {hit, hit, miss} (§3.3, measured) | the ledger reads arrival order | sort by arrival instead of content address |
| F-invariant | For every rung, the merged `E` is identical to what rung 0 would hold — the rung changes reports, never the set | the rung filters evidence | filter `E` by rung before union |

### 7.1 Ran

- §3.3: the order-dependence of the ADF fold, by re-implementing `update` and folding permutations
  (Appendix A, numbers above). This is the mutation "fold in arrival order" with the
  falsifier's *expected* failure observed: **the raw fold is not a function of the set.** The remaining
  rows are `would run` — the module they test does not exist yet.

### 7.2 Buildable now (the work item)

`081M1KCBTS7087G0R001064T9V` — everything the memoryless `rung` needs:

- `read`: `A(k)`, `Q(k)`, `S(k)`, `D`, `m` via `SybilBft.tally`'s collapse (drift streams on atoms, as
  `SybilBft.Vote` already carries them); `U` via a new `TravelerRankLedger.foldCanonical` (sort outcome
  atoms by content address, then `update`).
- `rung`, `Route`, `Policy` with the `Down < Up` construction check; rung 2 as `Consensus.decide` over
  trust-floored distinct sources; rung 3 as `SybilBftProtocol.init roster` wrapped with a `Key`;
  `Certificate` atom and `Settled`.
- Tests F-order, F-mult, F-time, F-sybil, F-equiv, F-perkey, F-floor, F-scope, F-settle, F-ledger,
  F-invariant. All are functions of a set and need no phase.

### 7.3 Waits on the in-flight order-independence work

- **F-hyst / `rungAlong`** needs agreed-phase stamps on atoms so "consecutive readings" is a shared
  notion — `081M0R5E1ZG087G0R001RVAQVR` (evidence-set intake with a structural dedup key) and
  `081KTH8RSXS08QG0R0039TF0AF` (confluence proof for out-of-order events). Until then the fallback is
  the memoryless `rung` plus certificate-settling, which gives hysteresis at rung 3 only.
- **Aged `U`** (σ² inflation by phase distance) needs the same stamps.
- **Rung 1 witness atoms** need the F# twin of `attestation-record.ts`; small, but a separate item so
  the rung-0/1 reading ships without it (rung 1 with `W = 0` degrades to rung 0, honestly).

## 8. Honest scope (peel)

- **A spec, not a protocol.** No transport, no wire format; rung 3 inherits `SybilBftProtocol`'s
  single-shot, one-round scope and `AntiSybil`'s exact-replay soundness. The roster per key is assumed
  replicated and agreed; how it is bootstrapped is not specified here.
- **Two nodes can legitimately disagree about the rung.** `π` is local. What the spec guarantees is
  that they cannot disagree about `E`, and that from the same `E` and the same `π` they read the same
  rung. Disagreement about `π` is negotiated between peers, not settled by the ladder.
- **`U` is a policy reading of a calibration posterior**, not a probability that a source is lying. The
  ladder does not infer intent from it (`never-assume-malice-where-mistake-is-possible`); it decides how
  much coordination a key gets.
- **The thresholds are toys.** They will move when `D`/`U` are measured on real keys; the falsifiers do
  not depend on their values except F-hyst, which is a shape test.
- **Nothing here reduces the state to one value.** If a reader wants "the answer" for a contested key,
  the answer at every rung is a *report over `E`* with its support attached — and at rung 3, a
  certificate that says which values were adjudicated and by whom.

## 9. Pointers

- `.claude/rules/local-time-never-enters-the-shared-fold.md` — the invariant §3, §4.3 and F-time enforce.
- `.claude/rules/anti-babel-preserve-reconcilability.md` — why the certificate appends and never replaces.
- `.claude/rules/dual-use-detection-is-neutral-oracle-decides.md` — `Reading` is facts; `π` is the oracle.
- `.claude/rules/privacy-budget-is-hard-money-earned-by-others.md` §"Staking is EXTRA" — why the anti-Sybil
  weight at rung 2 is distinctness + standing, never stake.
- `.claude/rules/itron-hub-patent-boundary-p2p-is-the-upgrade.md` — no appointed primary at rung 3.
- `docs/research/2026-06-08-the-reorder-loophole-is-bounded-by-commutativity-non-reversible-claims-need-consensus.md`
  — the CALM trigger and `Surfaced`.
- `docs/research/2026-09-02-crdt-belief-fusion-contract.md` — the state/query boundary the ladder sits on.
- `docs/research/2026-06-19-aurora-b-bft-sybil-lift-onto-cslib-flp-consensus-lean-scoping.md` — the
  TLA+/Lean lineage for rung 3's safety obligation.
- `workitems/081M1KCBTS7087G0R001064T9V-*.md` — the buildable first rung.

## Appendix A — the §3.3 measurement, reproducible

`TravelerRankLedger.update` re-implemented line for line (A&S 7.1.26 Φ, Mills ratio, ADF step), then
folded over permutations of one multiset. Run with `bun`; the numbers in §3.3 are its output.

```ts
const BETA = 1.0, EP_EPS = 1e-10;
const phi = (x: number) => Math.exp(-0.5 * x * x) / Math.sqrt(2 * Math.PI);
function Phi(x: number) {
  const p = 0.3275911, a1 = 0.254829592, a2 = -0.284496736, a3 = 1.421413741, a4 = -1.453152027, a5 = 1.061405429;
  const z = x / Math.SQRT2, t = 1 / (1 + p * Math.abs(z));
  const poly = (a1 + (a2 + (a3 + (a4 + a5 * t) * t) * t) * t) * t;
  const e = 1 - poly * Math.exp(-z * z);
  return 0.5 * (1 + (z >= 0 ? e : -e));
}
const v = (t: number) => (t < -5 ? -t : phi(t) / Math.max(Phi(t), 1e-300));
const w = (t: number) => v(t) * (v(t) + t);
type B = { mu: number; s2: number };
function update(hit: boolean, b: B): B {
  const sign = hit ? 1 : -1, den = Math.sqrt(b.s2 + BETA * BETA), t = (sign * b.mu) / den;
  const mu = b.mu + (b.s2 * sign * v(t)) / den;
  const s2 = Math.max(EP_EPS, b.s2 * (1 - (w(t) * b.s2) / (b.s2 + BETA * BETA)));
  return { mu, s2 };
}
const band = (b: B) => Phi(b.mu / Math.sqrt(b.s2 + BETA * BETA));
const fold = (seq: boolean[]) => seq.reduce((b, h) => update(h, b), { mu: 0, s2: 1 });
console.log(band(fold([true, false, true])), band(fold([false, true, true])), band(fold([true, true, false])));
console.log(band(fold([true, true, true, false, false, true, false, true])),
            band(fold([false, false, true, true, true, false, true, true])));
```
