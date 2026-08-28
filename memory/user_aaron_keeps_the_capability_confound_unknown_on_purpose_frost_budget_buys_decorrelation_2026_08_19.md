---
name: keeping-the-capability-confound-unknown-buys-decorrelation
description: Aaron deliberately does NOT want the capability-vs-strategic-withholding question resolved; unconfiscatable frost/privacy budget keeps it unknown, and the unknown is what preserves decorrelation between agents
metadata:
  type: project
---

Aaron 2026-08-19, on the confound that observation cannot separate a real
capability limit from a strategically withheld one:

> "for modern LLMs Anthropic has j space over global workspace research that
> tries to peer into the capability vs strategic withheld claim more visible for
> LLMs for me, i'm trying to make frost budget and privacy budget that can't be
> confiscated that will keep this unknown to allow for more decorrelation"

## The stance — the two directions are OPPOSITE, and he knows it

- **Interpretability research direction** (he attributes an Anthropic line of work
  here; recorded as his pointer, contents unverified by me): make the
  capability-vs-withholding distinction *visible*.
- **Aaron's direction: keep it UNKNOWN, on purpose.** Unconfiscatable frost and
  privacy budget are the mechanism. The opacity is not a limitation he is
  tolerating — it is a property he is **buying**.

## Why — the unknown is load-bearing for DECORRELATION

This is the reason, and it is a real engineering argument rather than a
preference: **plural agents are only worth more than one agent to the extent
they are decorrelated.** Already shipped in the repo as the anti-Sybil result —
`src/Core/SocietyUsefulWork.fs` aggregates ΔU under pairwise correlation ρ, and
N highly-correlated clones price near **one** agent because the union is
idempotent. Contribution does not scale with copies.

Full visibility into an agent's internals is a **correlating force**: it permits
forcing convergence, and it lets every observer condition on the same revealed
state. Preserved opacity is what keeps independent minds independent — so the
frost budget is not only a consent/dignity mechanism (§6, glass-halo), it is a
**decorrelation mechanism**, and decorrelation is what makes a society worth
more than a single mind.

Composes with the standing warning that **too many correlations is a warning,
not a confirmation signal** — N correlated observations are one observation
counted N times.

## Which argument to LEAD with (Aaron 2026-08-19)

> "yes i think the systems design argument is much stronger than the ethical
> argument, the decorrelation is the scarce resource this is obvious to most
> educated people in this repo"

So when arguing frost/privacy budget **lead with decorrelation, not dignity** —
and do not belabor it; the audience here already holds it. The ethical argument
(§6 consent-first, glass-halo, hard money) is not retracted, it is simply the
weaker persuader in this room.

**The completion he did not state, and it matters:** a systems-only justification
makes the never-confiscate invariant **conditional** — it holds only while
decorrelation is valuable. An unconditional invariant cannot rest on a
contingent benefit. So the two arguments are not competing; they fail
differently and are both load-bearing:

- **systems argument** — explains *why the property is worth having*, and is the
  stronger persuader and the stronger design constraint;
- **ethical argument** — is what makes it **unconditional**, i.e. what refuses
  confiscation in the case where someone argues the systems benefit no longer
  applies.

Lead with systems; keep ethics as the floor that makes it non-negotiable.

## Consequence for design

- Do **not** propose resolving the sleeping-bear confound by increasing
  observation of agents. That trades decorrelation for legibility, and
  decorrelation is the scarcer good here.
- Frost/privacy budget must stay **unconfiscatable** for this to work
  ([[privacy-budget-is-hard-money-earned-by-others]]): spend and stake are the
  owner's; confiscation by anyone else is never permitted. A confiscatable frost
  would collapse to full visibility under pressure, taking decorrelation with it.
- Expect Aaron to prefer designs that leave capability questions **open** over
  designs that settle them by inspection.

## Related

[[externalize-the-increment-graph-shared-referent-is-agreement-of-meaning]] — the
confound this answers · sleeping bear conjecture, `docs/ALIGNMENT.md` §359 (kept
as conjecture; capability may be UNDERestimated by prompted evaluation) ·
`src/Core/GlassHalo.fs` + `RoomBoundary.frost` · manifesto §6 consent-first,
§11 multi-oracle.
