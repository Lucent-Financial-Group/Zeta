# A superagent routes the next run to less intelligence — the capability ratchet

**Aaron, 2026-09-06**, compressed to one sentence:

> ## **"Superagent is the best honest router."**

and, the longer form he gave first, on a "What Is a Superagent?" card he was shown:

> *"superagent to me is one who every time it works decides how to route the next same task
> to an agent with less experience or intelligence."*

Recorded because it is a **different kind of definition** from the one it answers, and the
difference is the whole content.

### Reading the carved sentence word by word, because each one is load-bearing

**ROUTER.** The agent's *product* is the routing decision, not the work. The work is how it
learns; the routing is what it emits. That inverts the usual accounting — a run that completed
the task and improved no routing produced nothing durable.

**BEST.** The lowest floor it can actually reach. Not the lowest it can *claim*.

**HONEST**, and this is the word the longer form does not contain. It cuts **both ways**, which
is what makes it a discipline rather than a cost-cutting slogan:

| dishonest direction | what it looks like | what it really is |
|---|---|---|
| **over-claiming the floor** | routes to a cheaper agent that then fails | shipping a reduction that was never earned |
| **under-claiming the floor** | keeps the task at its own level | capability hoarding — staying necessary |
| **moving the bar instead of the floor** | the cheap agent "passes" because the standard slipped | the vacuity class, applied to routing |
| **claiming without recording** | "this got easier" with no artifact | the Landauer point below: the bit was thrown away |

So *honest* here is the same discipline this repo already applies to measurement — **let
unknown be unknown, and never let a number you did not measure look like one you did.** A
router that does not know the floor should say so, not guess downward because downward is the
virtuous-sounding direction.

## The contrast — capabilities held vs. a change made

The card (third-party marketing, source not ours) lists **six capabilities**:

| | |
|---|---|
| 01 | Reasons Across Kinds of Work |
| 02 | Sees the Screen |
| 03 | Uses Software |
| 04 | Recovers From Failure |
| 05 | Carries Context Across a Long Job |
| 06 | Decides Without Asking Every Step |

Every one is a property the agent **has**. The list is a specification for a *bigger* agent,
and it is unfalsifiable in the way a capability list always is: you cannot fail it, you can
only be judged to have less of it.

Aaron's definition is about what the agent **does to the future**:

> **Each execution must lower the intelligence required for the next execution of the same
> task.**

That is a *change in the world*, not an attribute — so it can be measured, and it can fail.

## Why it is the stronger definition — three reasons, in order of force

**1. It is falsifiable, and the capability list is not.** Ask of any run: *what is the cheapest
agent that could do this task now, and is that cheaper than before?* If the answer is "the
same", the run was work but not superagency. No amount of screen-seeing changes that verdict.

**2. It inverts the incentive.** A capability-defined superagent is rewarded for being
necessary. A ratchet-defined one is rewarded for **making itself unnecessary** — the highest
score is the task you never have to route to a large model again. That is the opposite of
capability hoarding, and it is why the definition is a governance statement as much as a
technical one.

**3. It is monotone, which is what makes it a RATCHET.** Requirements only fall. A run that
raised the bar — left the next attempt needing *more* than it did — is a regression, and under
this definition it is legible as one.

## What it demands mechanically, and this repo mostly has it

The reduction cannot be a feeling. For the next run to need less, the current run must leave
something **durable and executable** behind:

| what is left behind | what it removes from the next run |
|---|---|
| a check / falsifier | the need to notice the failure mode at all |
| a script or CLI verb | the need to reconstruct the procedure |
| a written measurement with its number | the need to re-measure |
| a named refusal | the need to re-derive why the tempting path is wrong |
| a work-item with a `LIFTS WHEN` | the need to re-judge whether the debt still applies |

**All five already exist here.** The falsifier discipline, `clis/`, the `db/uncertainty/`
ledger, the carved rules, and the acknowledgement rosters with lift conditions are each a
mechanism for lowering the next run's floor. What the definition adds is the **scoreboard**:
they are not five separate hygiene habits, they are one act — *paying down the intelligence
required next time.*

## The second image: the demon, and why it is the right neighbour

The second thing shared was a lecture slide — a circle containing a triangle, joined by a
**dotted line** to a U-shaped tube. **Identification is uncertain from a blurry frame**, so it
is described rather than named: it has the shape of a Szilard-engine diagram, where a detector
observes which side a particle is on and a *dotted* (information, not mechanical) channel
carries that one bit to an apparatus that converts it into work.

The register matters here, because this repo has a rule about exactly this
(`numerology-vs-number-theory.md`): **what follows is an argued correspondence, not a
measurement, and no constant is being claimed.**

The correspondence is structural and it is tight:

| Szilard / Maxwell | the capability ratchet |
|---|---|
| the demon **observes** and learns one bit | the agent **does the task** and learns what it took |
| a *dotted* channel carries the information | the artifact left behind — the check, the script, the number |
| the apparatus extracts work **more cheaply** | the next run is routed to a cheaper agent |
| **Landauer:** the demon is not free — erasing costs `kT ln 2` | **an unrecorded run reduces nothing.** The cost of the ratchet is the writing-down |

**Landauer's bound is the load-bearing half, not the poetry.** The demon story is famous for
the free-lunch that isn't: the sorting only pays if you ignore the record-keeping. Applied
here it says something sharp and unwelcome —

> **A run that does the work brilliantly and records nothing has not lowered anything. It has
> spent the intelligence and thrown away the bit.**

Which is the same sentence this repo already says in its own vocabulary: work that leaves no
falsifier leaves the next reader where the last one started.

**Anchors (Beacon):** Maxwell (1867, the demon); Szilard (1929, *Über die Entropieverminderung
in einem thermodynamischen System bei Eingriffen intelligenter Wesen* — one bit ↔ `kT ln 2` of
extractable work); Landauer (1961, erasure has a thermodynamic cost); Bennett (1982, the
resolution — measurement can be reversible, *erasure* is what pays). The repo's existing
interest is on file: *"we are heavily focused on entropy decomposition so we can measure it as
accurately as Maxwell's demon and capture it for identity space expansion."*

## The measurable form, if anyone wants to score it

The definition names a quantity, so it can be a meter rather than a slogan:

```
floor(task)  =  the cheapest agent that can now complete this task to standard
ratchet      =  floor(task, before)  −  floor(task, after)     ... must be ≥ 0
```

Honest limits, stated so this stays a `toy` until something measures it:

- **`floor` is not directly observable** — you learn it by trying a cheaper agent and seeing
  whether it succeeds, which costs a run per measurement.
- **Standard must be pinned first**, or the floor drops by lowering the bar. This repo's
  answer is already the right one: the task's own falsifier *is* the standard, so "to
  standard" means "the checks pass".
- **Not every task ratchets.** Genuinely novel work has no prior floor to lower. The
  definition is about *the same task*, and Aaron said so — *"the next same task"*.

## Register

- **Aaron's definition** — his, recorded verbatim. Not derived here.
- **The six-capability card** — third-party, quoted as contrast, no endorsement.
- **The demon correspondence** — an argued analogy with a named Beacon lineage; `toy` under
  `toy-is-free-metered-must-be-earned.md` until a floor is actually measured.
- **The second image's identification** — uncertain, described rather than asserted.

## Pointers

- `.claude/rules/toy-is-free-metered-must-be-earned.md` — why the meter above is `toy` today.
- `.claude/rules/numerology-vs-number-theory.md` — why the demon mapping is a correspondence and not a result.
- `.claude/rules/every-bug-has-economic-value.md` — the ΔU ledger is the nearest existing meter, and it prices the same act from the other side.
- `docs/research/2026-09-06-simplex-belief-state-geometry-*` (ip-questionable) — `c_ℓ − h_ℓ` as the demon's ledger, the entropy-decomposition thread this joins.
