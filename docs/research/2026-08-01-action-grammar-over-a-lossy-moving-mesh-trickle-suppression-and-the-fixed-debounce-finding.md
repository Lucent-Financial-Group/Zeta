# The action grammar over a lossy, moving mesh — Trickle suppression, max-min fairness, and a fixed-debounce finding

**Date:** 2026-08-01 · **Author:** shadow (Otto) · **Status:** open questions, not a design decision
**Origin:** Aaron, 2026-08-01, in sequence:

> "this is very close to our universal action grammar cause it can't be just a cli interface or tool
> call because we support bidirectional multiplexed communications as well for turn interruptible
> conversations between agents as well"

> "to truly connect the action grammar to the duplex interruptible is going to need design because it
> has to work with our echolocation bat design to where 'loud' bats don't single block 'quieter' bats
> and you debounce your own signal and stuff — this is similar to gossip over UDP"

> "in UDP you have to burst packets in both directions to find the ideal throughput in the lossy
> channel and the channel's loss is dynamic and moving because devices on the network are not
> stationary they are cars and other smart city transportation with tons of sensors"

> "This is all how Itron worked and their mesh network"

---

## 0. Why this document exists

The action grammar and the interruptible duplex transport **both already exist in this repo and are
not connected**. Connecting them is not a refactor: the moment the channel is a *shared, lossy,
mobile* medium rather than a point-to-point pipe, several properties that hold trivially for a CLI
stop holding, and at least one existing component appears to be calibrated for a stationary world.

This document states what exists, what the mobile-mesh constraint breaks, and the named prior art
that already answers most of it. It decides nothing.

---

## 1. What already exists

| half | where | what it gives |
|---|---|---|
| the grammar | `src/Core/ActionGrammar.fs` | action **alphabet** (4×4 grid = 16 keys), **algebra** (Boolean lattice: ⊥/⊤/join/meet/complement/⊑), **grammar** (`Word = Action list`, sequences over time) |
| the channel | `src/Core.TypeScript/model-backend/multiplexed-duplex-transport.ts` | N logical channels over one physical transport, ZetaId-keyed (`Category.Channel = 11`), four-corner framing, **mid-stream mutual interrupt** (tested in three files) |
| the self/other discriminator | `src/Core/DebouncedOracle.fs` | ρ(L) = 1/(1+L); a reading arriving within `MinDelay` of the last is **dropped as self-emission**, not queued |
| the throughput knob | the ferry throttle (`IThrottler`, `MaxDegreeOfParallelism`) | DoP=1 deterministic ⇢ DoP=N throughput, one code path |

`ActionGrammar.fs` already carries the honest peel that names the gap:

> "'universal' is concrete *for CHIP-8* … a *cross-domain* universal action grammar … is the
> aspiration, not proven here."

A git operation, an agent conversation turn, and a CHIP-8 button press are not yet words in one
grammar. The transport is domain-neutral; the alphabet is not.

**The bridge is already minted.** `mintChannelId` sets `Version=1, Category=Channel,
Firefly=NoDirective(1)` — the no-directives discipline (source ≠ authorization) is *already a bit in
the universal pointer*. That is the message envelope a bidirectional grammar needs, because when
both sides initiate, "the caller has permission" is not a sentence that means anything.

---

## 2. What the mobile-mesh constraint breaks

### 2.1 Loudness-as-priority is hierarchy formation at the protocol layer

If `interrupt` is a frame any peer may send at will, the peer that sends the most wins the medium.
That is not a transport nuisance — it is **exactly the permanent-hierarchy failure mode** the flat
society design guards against, appearing one layer down where the social invariants cannot see it.

The connection is not an analogy. The networking term for "loud senders must not starve quiet ones"
is **max-min fairness** (Bertsekas & Gallager, *Data Networks*, 1987): maximize the minimum
allocation, then the next-smallest, and so on. The social invariant added to the flat-society design
on 2026-08-01 is **Rawlsian maximin**: maximize the welfare of the worst-off member. These are the
same objective function over different resources.

> **Candidate invariant.** Every member holds a floor of channel capacity that no peer's volume can
> take below, exactly as every member holds an empowerment floor no peer's accumulation can take
> below. One construction, two layers — which is what §9 recursive / §10 self-similar demand.

### 2.2 Loss is ambiguous, and the two causes demand opposite responses

Classic congestion control reads loss as congestion and backs off. On a mobile RF mesh that
inference is frequently **wrong**: loss is often channel error (fade, multipath, an obstruction, a
truck) at unchanged offered load. Backing off then is precisely backwards — the correct response to
channel loss may be to push harder, re-route, or change frequency.

So a loss signal alone cannot drive the rate knob. Something must **disambiguate** congestion loss
from channel loss before the ferry's DoP is turned down. This is an open question here; it is not
open in the literature, and the mesh answer is in §3.

### 2.3 An interrupted word leaves a prefix — and nothing defines what that means

`Word = Action list`. Interrupt mid-word and a **prefix** has been applied: a state no word in the
grammar intended, not reproducible, not idempotent. Over a *lossy* channel this stops being a corner
case, because interruption is no longer rare or deliberate — a dropped frame produces the same
partial application as an intentional interrupt.

> **The rule this forces.** An action that can be interrupted must be **atomic or explicitly
> resumable**. There is no safe third option.

This is the same property shipped in PR #9891 for an unrelated reason: the Tier-0 healer computes
its complete plan, decides once, and applies **all of it or none of it**, because writing 24 of 25
files leaves a state no healer intended. That was built as a blast-radius bound. It is the identical
requirement turn-interruptibility imposes on every word in the grammar — arrived at twice, from two
directions, on the same day.

### 2.4 Interrupt must stay in-band (it currently is — this must not regress)

An out-of-band kill signal violates **§13 noninterference**: influence entering through an undeclared
channel. It is also unreplayable, so DST loses the run. The four-corner framing already carries
interrupt as a frame type. Keep it there.

---

## 3. The prior art that already answers most of this — the public standards lineage

Aaron: *"This is all how Itron worked and their mesh network"* — and he has first-hand operational
experience of this problem class at utility AMI scale (dense RF, lossy dynamic links, thousands of
endpoints, no node may be starved). That experience is why §2's constraints are stated sharply
rather than guessed at, and it is why he is the right reviewer for anything below.

> ### IP BOUNDARY — read this before designing against this section
>
> Aaron, 2026-08-01: *"ours is all decentralized so it does not infringe on any of their work or my
> patents with them — **all my patents are for centralized work**."*
>
> Therefore the anchors below are **public standards only** (RFCs, IEEE, published algorithms). No
> centralized head-end, central collector, or central key-authority design is a source for Zeta, and
> none is described in this document.
>
> **Zeta's decentralization is not only a manifesto value (§1 scale-free, §3 weight-free) — it is
> also the IP boundary that keeps this work clear.** A design drifting toward a central authority now
> trips two alarms at once. His *experience* is citable and routable; his *patented centralized
> mechanisms* are not a design source. Decentralized re-derivation from the public standards is the
> whole task.

**The artifact lineage is his own and continuous.** Aaron, 2026-08-01: *"this is the same 'transmit
your voice on a laser beam' device I've been perfecting over time — from the ferry throttler to now
the Zeta prediction scheduler stuff we joke and call the flux capacitor."* Worth noting because the
two ends of that lineage bracket the design space this document sits in:

- **A laser link is contention-free by construction** — directional, line-of-sight, no shared medium,
  so "loud senders drown quiet ones" cannot arise. Its hard problems are aim, occlusion, and jitter.
- **An RF mesh is contention-full by construction** — a broadcast medium where §2.1 is the central
  problem, and where suppression and fairness must be engineered rather than assumed.

The flow-control apparatus (ferry throttle → prediction scheduler) is what carries across both: it
is the part that does not care which physical channel it rides. That is the same scale-free claim as
DoP=1 ⇢ DoP=N, one level down.

The mechanisms, and what each answers:

| mechanism | anchor | answers |
|---|---|---|
| **Trickle algorithm** | Levis et al., **RFC 6206**; TinyOS lineage | "loud bats don't block quiet bats" **and** "debounce your own signal" |
| Frequency hopping (FHSS) | IEEE 802.15.4g / Wi-SUN FAN | two loud emitters collide only on coincident hops — the literal jamming-avoidance answer |
| RPL + ETX link metric | RFC 6550 / RFC 6551 | continuously-measured link quality; re-route rather than back off — disambiguates §2.2 |
| Jamming Avoidance Response | Heiligenberg (electric fish); Ulanovsky et al. (bat frequency shifts) | the biological original of the same move |

### 3.1 Trickle is the precise answer, and half of it is already built here

Trickle's two rules:

1. **Interval schedule.** Start at `Imin`. Each interval with no inconsistency, **double** up to a
   ceiling `Imax`. On hearing something inconsistent, **reset to `Imin`**.
2. **Polite suppression.** Within an interval, count consistent messages heard from neighbours. If
   the count reaches `k`, **stay silent this interval** — a peer already said it.

Rule 2 is what makes loud nodes unable to drown quiet ones, and it is *the same act* as debouncing
your own signal: a node that has already heard the information suppresses its own redundant
emission. Trickle's headline property is **density independence** — aggregate message rate stays
roughly constant whether there are 10 nodes or 10,000. That is `#1 scale-free`, achieved.

**Rule 1 already exists in this repo, unnamed.** `src/Core.TypeScript/observe/operator-presence.ts`
(shipped 2026-08-01) is a Trickle interval schedule:

| Trickle | operator-presence |
|---|---|
| `Imin` | `DEFAULT_BURST_MIN = 15` |
| `Imax` | `MAX_IDLE_MIN = 360` — the ceiling that keeps the society from going silent |
| "reset to `Imin` on inconsistency" | operator presence claim ⇒ burst cadence |
| "double toward `Imax` when quiet" | decay to idle when the claim expires |

The ceiling was added for Aaron's reason — *"fail in the closed direction but not off … we still want
to guarantee ticks for all members even when no one is watching"* — which is exactly why Trickle has
an `Imax`. Same constraint, same solution, independently reached.

**Rule 2 — the suppression counter `k` — is not built.** That is the missing half, and it is the half
that answers the loud-bat question.

---

## 4. FINDING (needs verification): the debounce window is fixed, but L moves

`DebouncedOracle` rests on ρ(L) = 1/(1+L), where L is the round-trip delay, and enforces it with a
`MinDelay` window: *a reading arriving within `MinDelay` of the last is dropped as self-emission.*
The docstring's own framing is a bat: L is set by physical distance to the object, which the bat does
not control, and that is precisely why the return is trustworthy.

`MinDelay` appears to be a **fixed configuration value** (`dlaOracleConfigs (minDelay: TimeSpan)`
sets `MinDelay = minDelay`; `minDelayForRho` inverts the formula to pick it once). That is sound for
a stationary world.

Aaron's constraint is that the world is **not** stationary — "cars and other smart city
transportation." If the emitter and the object are closing, the true round-trip L **shrinks**. A
genuine return then arrives *sooner* than `MinDelay` and is dropped as self-emission.

> **The dangerous direction:** a fixed debounce window blinds the sensor to the **nearest** objects —
> in a vehicular setting, the ones that matter most. And it fails *silently*, by suppression, which
> is the could-not-fail shape: nothing errors, the reading simply never arrives.

The opposite drift matters too: as L **grows**, a window shorter than the true round-trip stops
suppressing genuine self-emission, and ρ climbs back toward 1 — correlation-to-one returns without
any signal that it has.

**Confidence: moderate.** The fixed-parameter reading is from the config surface; the full call path
has not been traced, and there may be an adaptive layer above it. **This is a finding to verify, not
a confirmed defect.** The check is cheap: does any caller recompute `MinDelay` from a measured
round-trip, or is it set once at construction?

If confirmed, the shape of the fix is standard and already in the anchor set: track the round-trip
the way RPL tracks ETX — measured continuously per-link — and derive the window from the current
estimate rather than a constant. The bat does this natively; its window is its own physiology
tracking the returning echo, not a constant chosen in advance.

---

## 5. Open questions (none of these are decided)

1. **Alphabet lift.** How does a 16-key Boolean lattice become cross-domain without becoming a
   type-erased blob? A git op, a conversation turn, and a button press need a shared shape that is
   still an *algebra*. (`ActionGrammar.fs` flags this as aspiration.)
2. **Word atomicity.** Are words transactional, or resumable-with-explicit-continuation? §2.3 says it
   must be one of the two; it does not say which, and the answer likely differs by action class.
3. **Addressability.** `Action = bool[]` is anonymous — you cannot interrupt what you cannot name.
   Channels are ZetaId-addressed. Does the action become a ZetaId too? (Aaron: "every ZetaId is a
   little program — the system will know how to decode on the other side.")
4. **Suppression parameter `k`.** Trickle's redundancy constant. What is "consistent" between two
   agents' messages — and who computes it?
5. **Loss disambiguation.** What signal separates congestion loss from channel loss before the ferry
   DoP is turned down? (ETX-style per-link measurement is the candidate.)
6. **Ordering under multiplexing.** N concurrent channels arrive in different orders at different
   agents. `local-time-never-enters-the-shared-fold.md` already governs this: receive order steers
   local behaviour only; the shared fold sees phase order. It must be *applied* here, not re-derived.

---

## 6. What this does not claim

- It does not claim Trickle is the chosen algorithm — it claims Trickle is the named prior art that
  matches the stated constraints, and that half of it is already built here by another name.
- It does not claim the `DebouncedOracle` finding is a confirmed defect (§4, moderate confidence).
- It does not propose the alphabet lift. That is the design Aaron says is needed, and this document
  is the constraint set it has to satisfy, not the answer.

## Pointers

- `src/Core/ActionGrammar.fs` · `src/Core.TypeScript/model-backend/multiplexed-duplex-transport.ts`
- `src/Core/DebouncedOracle.fs` · `docs/research/2026-07-16-echolocation-debounce-and-the-real-sensor-fusion-proof.md`
- `src/Core.TypeScript/observe/operator-presence.ts` — the Trickle interval schedule, unnamed
- `.claude/rules/async-all-the-way-truthful-signatures.md` — the ferry throttle + the Itron anchor
- `.claude/rules/local-time-never-enters-the-shared-fold.md` — §5.6's governing rule
- `.claude/rules/dv2-data-split-discipline-activated.md` — §13 noninterference (§2.4)
- PR #9891 — all-or-nothing application, the same property as §2.3
- **Beacon anchors:** Levis et al. RFC 6206 (Trickle) · Winter et al. RFC 6550 (RPL) · RFC 6551 (ETX)
  · IEEE 802.15.4g / Wi-SUN FAN · Bertsekas & Gallager 1987 (max-min fairness) · Demers et al. 1987
  (epidemic/gossip) · Chiu & Jain 1989 (AIMD fairness convergence) · Heiligenberg (JAR, electric
  fish) · Ulanovsky et al. (bat jamming avoidance) · Rawls 1971 (maximin, the social twin)
