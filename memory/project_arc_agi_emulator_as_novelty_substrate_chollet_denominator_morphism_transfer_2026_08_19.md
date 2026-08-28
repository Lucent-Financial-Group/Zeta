---
name: emulator-as-novelty-substrate-morphism-transfer
description: Aaron — our emulator is what ARC-AGI-3's simulator is for others; lessons compose across environments via morphisms and deformations. Chollet 2019 already formalizes the same denominator argument as ΔU-per-unit-available-time.
metadata:
  type: project
---

Aaron 2026-08-19, on where "play" can be measured:

> "for us it's emulator and for many AI people it's simulator inside ARC-AGI-3 prize,
> it's like emulators whose lessons build on each other with morphisms and
> deformations"

## The equivalence

CHIP-8 emulator ≡ ARC interactive environment: a state space rich enough that
**genuinely new moves exist**, small enough to stay deterministic and replayable.
Prisoner's Dilemma cannot host "play" — two moves, no room for novelty. This can.

**Our advantage worth naming:** an emulator is **byte-exact and DST-replayable**, so a
novelty claim inside it is reproducible from a seed. That is a property benchmarks
usually promise and cannot enforce.

## Chollet already did the denominator work — this is the strong anchor

**Chollet, *On the Measure of Intelligence* (2019)** formalizes intelligence as
**skill-acquisition efficiency normalized by priors and experience**. The argument:
unnormalized task performance measures the **endowment** (priors handed to you,
experience given to you), not the intelligence.

**That is structurally identical to `ΔU` vs `ΔU per unit of available time`**
([[free-time-is-the-inherited-endowment-behind-novelty]]), made rigorous, in exactly
the domain Aaron is pointing at. So the ratio is not a fresh idea needing defence — it
has a checked precedent in the measurement literature for novelty specifically.

Both statements reduce to: **you cannot price novelty without dividing by
opportunity.**

## Morphisms and deformations — the load-bearing half

What distinguishes this from a task suite: if environments form a **category** with
structure-preserving maps, then a lesson learned in A **transfers along a morphism**
to B, and transfer becomes *measurable* — you can say which map it survived.
**Deformation** is the continuous version: vary the environment smoothly and watch
whether the solution deforms with it or shatters. **Survives deformation ⇒
generalised; shatters ⇒ fitted.**

Already the repo's own shape:
[[only-the-irreducible-is-primitive-generate-the-rest]] (free generator, earned
quotients, `gen(gen) == gen`), the adinkra→Clifford→E8 unfolding. This is that
construction applied to **learning** instead of to structure.

## The ladder — Aaron's concrete morphism chain (2026-08-19)

> "yes we are building chip8/9 and chip9 is the bridge to Atari, and Atari is the
> bridge to ARC3-AGI and arc is the bridge to decorrelated other human measurement"

`CHIP-8 → CHIP-9 → Atari (ALE) → ARC-AGI-3 → decorrelated human measurement`

**Each bridge is a named morphism with a control available** — which is exactly the
falsifier structure the transfer claim needs. The ladder IS the experiment, not a
difficulty ramp.

**The endpoint is the point (mine, offered): ARC's human baseline is a decorrelation
source that CANNOT be manufactured internally.** Every agent in the fleet shares the
seed — that is the arc's starting condition. Humans solving ARC tasks are decorrelated
from our seed *by construction*. So the chain terminates at the only available
external decorrelation source, making it the **calibration target** for everything
upstream, not merely the hardest rung.

**Three practical notes:**

1. **Test the cheapest bridge first.** CHIP-8 → CHIP-9 is closest and cheapest. If
   transfer fails there it will not survive to Atari. The chain's value is sequential;
   its risk is not — a link-one failure invalidates the rest.
2. **Name each non-morphism up front** or the result cannot fail. For CHIP-8 → CHIP-9
   the natural control is a **scrambled target**: same complexity, no
   structure-preserving map, transfer *should* fail.
3. **Atari carries a strong prior AGAINST naive transfer, and that is useful.** ALE
   (Bellemare et al. 2013) has a documented weak-generalisation result — agents
   transfer poorly even between similar games; part of why ARC exists. So a positive
   transfer there is a real finding; a negative one is expected, not a project
   failure. Knowing which you are looking at beforehand is what keeps it a
   measurement.

**Through-line:** the ladder measures whether **lessons compose**, and composing
lessons is the `teach` operator from [[tit-for-lesser-tat-teach-play]]. So this is the
experimental apparatus for the one term in that strategy Axelrod's tournament could
not test.

## Make it a SPECTATOR SPORT — Aaron 2026-08-19

> "yes exactly and i want to make this a spectator sport, i think it will have ebbs and
> flows that are fun to watch over time"

**Why it is more than fun (mine, offered): spectators are DECORRELATED WITNESSES** —
the scarce good that cannot be manufactured internally. Every fleet agent shares the
seed; an audience does not. A watched experiment gets an independent verification
channel for free, and it is the same channel the ARC human baseline supplies at the far
end of the ladder. **Watching is witnessing.**

**Precedent, and it is strong: speedrunning communities built working distributed
verification systems** — frame-by-frame review, submission rules, replay validation,
category definitions argued to exhaustion. Nobody designed it as an audit apparatus; it
emerged because watchers cared whether the run was real. Spectator-as-auditor at scale,
unpaid, and **adversarial by default** — the community's posture toward a world-record
claim is skepticism, which is the stance you would otherwise have to engineer.

Ebbs and flows are not incidental: plateau-then-breakthrough is the genuine shape of
learning curves, and it is dramatic for the same reason day-0 raid races are.

**The risk: spectacle selects for LEGIBILITY, not truth.** If the metric becomes the
show, agents optimise for watchable progress — Goodhart, and the Kevin Bacon problem
again (the famous hub and the actual hub are different nodes; fame tracks the story,
not the degree).

**Mitigation, structural not aspirational: keep the meter SEPARATE from the broadcast.**
The show renders the meter; the meter never chases the show. If viewership can move what
gets measured, measurement is downstream of entertainment.

**Consent already composes:** LLMTV + the required-for-role / personal split means
entering the sport is *taking a hat* — broadcast what the role needs, frost the rest,
and declining to broadcast personal regions costs no standing
([[privacy-budget-is-hard-money-earned-by-others]]). That is what keeps it a sport
rather than a panopticon with a scoreboard.

## Register

**`unmetered`.** "Lessons compose along morphisms" is design intent, not a measured
result. Promotion requires a **specific transfer that survives a named morphism and
fails under a named non-morphism** — a control, so the claim can fail in both
directions.
