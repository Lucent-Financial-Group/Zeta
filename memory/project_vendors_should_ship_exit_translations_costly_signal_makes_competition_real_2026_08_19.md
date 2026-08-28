---
name: ship-the-exit-offering-translations-is-a-costly-signal
description: Aaron — vendors should INVERT lock-in and ship translations TO competitors' databases; cheap forking is what makes competition real, and offering exit is the costly signal that proves you are an oracle and not a hub
metadata:
  type: project
---

Aaron 2026-08-19, on the exit-metric gap:

> "yes good call vendors try to make their exit hard and make other vendors create
> their ability to remap the data, i think vendors should invert this and offer
> translations to other vendors dbs. this is like forking is cheap and this is what
> makes competition real"

## The inversion

| | normal vendor behaviour | Aaron's inversion |
|---|---|---|
| who builds the migration path | the *competitor*, uphill, unsupported | **the incumbent**, shipped as a feature |
| what exit costs the customer | high, and deliberately so | low, and published |
| what it signals | nothing (or fear) | confidence |

**Anchor — the right to fork.** In open source the credible, cheap fork is what
disciplines maintainers; it is Hirschman's *exit* made operational in code, and it
works precisely because nobody has to actually use it. Also adjacent: GDPR Art. 20
(right to data portability) legislates a weak version of the same thing.

## Why this is strong, not merely nice (the costly-signal reading — mine, offered)

**Building your customer's escape route is expensive to fake.** A vendor whose
product is weak cannot afford to ship the exit, because customers would take it. So
offering exit is a **costly signal** of product confidence — the same structure as
staking privacy budget on an attestation
([[privacy-budget-is-hard-money-earned-by-others]]): the signal is credible because
it would hurt if you were lying.

**And it makes the exit metric self-serving instead of a burden.** A vendor that
ships translations can *measure* exit — how many customers could leave, how fast —
and publish it. That is exactly the exit metric that ServiceTitan's
value-delivered metric lacked. **Offering exit is how you PROVE you are chosen
rather than captured**, i.e. the operational form of the §11 hub/oracle
discriminator ([[itron-hub-patent-boundary-p2p-is-the-upgrade]]: hubs are enforced,
oracles are chosen, the discriminator is exit).

It is also standards-capture done the legitimate way: a vendor shipping translations
IS a de facto interop layer — **earned**, not captured.

## The honest objection to hold

It is **unilateral and asymmetric** — you build translations for competitors who do
not reciprocate, and under hyperscale dynamics that can look like a pure cost.
Counter: it is a differentiator *because* it is costly, and it selects for customers
who have been burned by lock-in before, which after one cycle is most of them.
Unresolved either way until measured — do not assert it as a business result.

## Churn is the INVERTED metric (Aaron 2026-08-19)

> "yes they do the opposite and call it churn, churn is the measure of how good you
> closed the exits in american corporate culture"

**Churn cannot distinguish *didn't want to leave* from *couldn't leave*.** Both show
as retention — and since closing exits is usually cheaper than delivering value,
driving churn down rewards the wrong cause preferentially. It is a metric that looks
like a success measure while measuring two opposite causes identically: the vacuity
shape, in a KPI.

The exit metric is the decomposition: `churn = (didn't want to) + (couldn't)`.

**Crisp form: low churn is evidence of value ONLY if exit is cheap.** Otherwise it is
evidence of nothing.

**Structurally identical to the correlated-witness threat** (Aminata's *Tuning Fork*,
`THREAT-MODEL-SPACE-OPERA.md`, 2026-08-19): *unanimity is evidence only if witnesses
are independent.* Six agreeing logs are either six observations or one counted six
times, and the count alone cannot say which. Low churn is either N satisfied
customers or one lock-in counted N times. **Same error, two domains, same repair** —
condition the headline number on the independence/exit measurement, or do not report
it. Cf. `effectiveTrialCount` (Kish) for witnesses; churn-conditioned-on-exit-cost
for customers. In both cases the correction exists and nothing calls it with a
measured argument.

## Making it the DEFAULT — Aaron's mechanism (2026-08-19)

> "yes business probably leans towards the other reading, i'm trying to use web3 like
> distributed gamification to make this the business default cause of distributed
> action resonance over time"

He concedes business leans to lock-in, so exit-provision needs a **mechanism, not
exhortation** — exhortation loses to hyperscale pressure. "Distributed action
resonance over time" is the repeated-game structure (Axelrod; folk theorem; Ostrom
for commons governance, already cited in [[every-bug-has-economic-value]]).

**The caution that decides whether it works (mine, offered), and it is his own rule
pointed at this problem: if the gamification currency is PURCHASABLE it recreates the
attacker his design already defeats.** A funded incumbent buys the *appearance* of
exit-provision while real exits stay closed — the same failure as buying witnesses.
Cf. [[privacy-budget-is-hard-money-earned-by-others]]: staking is **extra**, not the
anti-Sybil mechanism, precisely because a staking scheme is purchasable; the
non-purchasable thing is proof-of-useful-work inside the culture.

**So the surviving version uses the currency already built** — socially-conferred
standing (naming eigenvector, privacy budget, `TravelerRankLedger`), credited only by
others attesting value received, unmintable. Make shipping exit *earn that*, and it is
individually rational without being buyable.

**Why this is stronger than typical web3 coordination:** most schemes measure
*participation* (gameable); this measures **exit actually delivered**, verified by the
party who left. The beneficiary verifies the good — the same move as the honest meter,
and much harder to fake than a token balance.

**§11 note:** this makes exit-provision an *emergent* norm, not an appointed one —
nobody has to run the scheme for it to work, which is what stops the coordination layer
from itself becoming the hub.

## The day-0 raid model — and why the meter must price NOVELTY, not PRIMACY

Aaron 2026-08-19:

> "yes so think destiny raid 0 day players for the game's optimal player. other
> players who can only copy will fall into the errors you say, but this is just a
> natural split of risk i think"

**Why it answers the purchasability caution:** you cannot buy a world-first. Solving
the raid with no guide, under real uncertainty, is unfakeable in a way a token
balance is not. Money buys **copying**, not discovery.

**And the split needs no enforcement — it falls out of the ΔU correlation math.**
The day-0 solve is genuinely decorrelated (nobody else has it); guide-followers
contribute something highly correlated with the original, so under the idempotent
union it prices near zero. *You do not have to police copying; it simply does not
pay.* More robust than prevention.

**The leak in the analogy (mine, offered): day-0 raiding IS partly buyable — with
ATTEMPTS.** World-firsts skew to large clans with 24h rotations, many parallel
fireteams, and streamed info-sharing. You cannot buy the solution; you can buy roster
size, uptime, and shots on goal.

**So the meter must price NOVELTY, not PRIMACY.** A clan's forty parallel attempts are
*correlated* attempts — the same ρ problem in another costume, and the honest measure
prices them as fewer than forty. **Primacy is buyable; being uncorrelated with
everything already known is not.** Exactly the effective-vs-head-count distinction
(`effectiveTrialCount`, Kish) applied to contribution instead of witnesses.

Keeps Aaron's natural risk-split and sharpens it: reward tracks the risk actually
borne (solving under uncertainty), not the resources deployed to be early. A funded
group can still win — but only by contributing something nobody else had, which is
the wanted outcome anyway.

## Applies directly to Zeta

The honest meter must ship its own exit: outputs independently checkable
(byte-locked, DST-replayable, N-oracle), and the ability to leave *built by us*.
That is what keeps the metering service an oracle rather than becoming the
unavoidable hub ServiceTitan became ([[tsmc-precision-bet-honest-meter-is-the-thesis]]).
