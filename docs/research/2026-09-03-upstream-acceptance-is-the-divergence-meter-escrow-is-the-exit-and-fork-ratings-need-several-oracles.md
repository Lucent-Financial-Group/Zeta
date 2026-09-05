# Upstream acceptance is the divergence meter, escrow is the exit, and fork ratings need several oracles

*2026-09-03. Operational status: STRATEGY, plus one proposed meter that does not
exist yet. Everything cited as in-tree is checked; the meters are `toy` under
[`toy-is-free-metered-must-be-earned`](../../.claude/rules/toy-is-free-metered-must-be-earned.md).
GOVERNANCE.md §33.*

Aaron 2026-09-03, on the whole Kubernetes stack:

> our entire k8s stack is something we want to replace with our own version over time
> but only the community will decide if our version is better[.] until they do we want
> to support the popular and well supported ver[s]ion too and our own replacement[,] and
> contr[i]bute to the popular version with what we learn[.] if they reject our PRs over
> time after earning credit with them for making small bug fixes[,] this is how we know
> where o[u]r product is most needed cause we are diverging. if we stay aligned the
> upstream version is good to support as long as we escrow the depe[n]dencies and co[d]e
> incase they disappear tommorw[.] this is the nation state hacking resistant version of
> zeta.

## 1. Three claims, and they are separable

It is worth pulling them apart, because each has a different evidential status:

1. **Support both, replace only if the community agrees.** A commitment, not a claim.
2. **Upstream PR acceptance is a divergence meter.** A *proposed measurement*, and the
   interesting one — §2.
3. **Escrow is what makes depending on upstream safe.** An engineering requirement with a
   clear test — §4.

## 2. The divergence meter, and the control that makes it mean anything

The naive version of this idea is worthless: *"they rejected our PR, so we should fork."*
Every project rejects PRs, and most rejections say nothing about divergence at all — scope,
bandwidth, style, timing, licensing, a maintainer on holiday.

**Aaron's version has a control built in, and that is what makes it a measurement rather
than a grievance:** *after earning credit with them for making small bug fixes.* That clause
separates two hypotheses the raw rejection rate cannot:

| | reads as |
| --- | --- |
| our PRs are rejected and we have no track record | **we are strangers** |
| our PRs are rejected and we have a track record of accepted fixes | **we want different things** |

Earning credit is the same construction as everything else in this substrate — the
TrueSkill-style rank ledger, the naming eigenvector, the privacy budget: **standing is
conferred by others and cannot be self-asserted.** Here it is conferred by an outside
community, which makes it the strongest form available. A fleet that could rate its own
alignment with upstream would be measuring nothing.

### The sharpening this needs, or it will read every healthy project as divergent

**Accepting small fixes and declining architectural changes is the normal, healthy state of
every mature project.** A meter that does not grade by change class will therefore report
divergence from Kubernetes, from Linux, and from every well-run upstream in existence — and
a meter that fires on everything discriminates nothing
([`numerology-vs-number-theory`](../../.claude/rules/numerology-vs-number-theory.md): too
many correlations is a warning, not a confirmation).

So the measurement is **acceptance rate per change class**, and the signal is the *shape*:

| small fixes | architectural changes | reading |
| --- | --- | --- |
| accepted | accepted | aligned; upstream is the right home |
| accepted | declined | **normal** — a project with a scope. Not divergence |
| accepted | declined *for reasons that name our requirements as out of scope* | **divergence, and located** |
| declined | declined | we are strangers, or we are bad citizens; fix that first |

The third row is the one worth acting on, and note what it needs: **the stated reason**, not
just the outcome. A rejection whose reason names the requirement they will not take is a
*located* divergence — it says which part of the stack our product is for. That is what
Aaron means by "where our product is most needed", and it is a qualitative reading over a
quantitative meter, not a threshold.

### It is a meter; the fork decision is an oracle's

[`dual-use-detection-is-neutral-oracle-decides`](../../.claude/rules/dual-use-detection-is-neutral-oracle-decides.md)
applies exactly. The meter reports **`ArchitecturalChangeDeclined(reason)`** — a fact. It
does not report `ForkJustified`, which is a verdict. Two parties reading the same acceptance
history can honestly disagree about whether to diverge, and if the meter's own vocabulary
settles it, an oracle got in upstream of the measurement.

### And it is the ρ band, executed against humans

`docs/VISION.md` carries the two-sided correlation band: decorrelation is wanted;
**Babel is decorrelation that stopped being reconcilable**. The falsifier in
[`anti-babel-preserve-reconcilability`](../../.claude/rules/anti-babel-preserve-reconcilability.md)
is *"can a diverged peer reconstruct your meaning from anchors you both already hold?"*

**An upstream PR is that falsifier, run against a human community, with a recorded verdict.**
Merged means reconcilable. Declined-with-a-reason-that-names-our-requirement means we have
diverged and can say where. Declined-with-no-engagement means we failed to make ourselves
reconstructible, which is our defect, not theirs.

## 3. Support both, and what that costs honestly

The commitment is to run the popular implementation *and* ours until the community decides.
That is not free and the cost should be named rather than discovered:

- **Two substrates to keep green**, and the cross-check between them is the value — the
  four-oracle byte-lock argument applied to infrastructure. Two implementations that agree
  is evidence; one that nobody can contradict is an authority.
- **The replacement must never become mandatory internally**, or we have built the appointed
  hub we object to, inside our own tree
  ([`clone-at-tag-stays-sufficient`](../../.claude/rules/clone-at-tag-stays-sufficient.md),
  [`itron-hub-patent-boundary-p2p-is-the-upgrade`](../../.claude/rules/itron-hub-patent-boundary-p2p-is-the-upgrade.md)).
  **Exit, not degree**: ours may be the good path and may accumulate any amount of use; the
  day it is the *only* path, §1 is violated by us.

## 4. Escrow is the exit test applied to dependencies

> "as long as we escrow the depe[n]dencies and co[d]e incase they disappear tommorw ... this
> is the nation state hacking resistant version of zeta."

The threat model is not only nation-state takedown. The same escrow answers a maintainer
deleting a package, a registry unpublishing, a licence changing, an org being acquired, a
repository going private, and a CDN that simply stops. **The events differ; the recovery is
identical.**

Escrow is `clone-at-tag-stays-sufficient` pointed outward. That rule already says this tree
must build from `git clone` at a tag with no package manager present; escrow is the same
sentence about everything the tree depends on.

**What escrow actually requires, because holding bytes is not the same as being able to
continue:**

| have | without it you have |
| --- | --- |
| source at the pinned revision | a binary you cannot patch |
| its transitive dependency closure | a build that stops at the first missing edge |
| the build toolchain, pinned | source you cannot turn into the artifact |
| a **reproduced** build, not just a stored one | a claim that you could rebuild it |
| the licence, recorded | bytes you may not be allowed to use |

The fourth row is the one that decides whether this is real. An escrow nobody has rebuilt
from is the storage form of a check that cannot fail — it looks like continuity and has
never once been exercised.

**In tree already:** `references/prior-art/` mirrors external repositories,
`vendored-upstream-parity.ts` makes a "vendored verbatim from upstream" claim checkable
against the upstream release, and `ace` carries pinned artifacts, a lockfile and
package-hash. The pieces exist; nothing yet composes them into a *closure* with a
reproduce-from-escrow test.

**The honest limit, stated because it is the thing people forget:** escrow preserves the
CODE, never the COMMUNITY. Hold every byte of Kubernetes and you still do not have the
people who review its security patches. Escrow buys the ability to keep running and to fork
under duress. It does not buy maintenance, and a plan that treats it as though it does has
mispriced the risk.

## 5. Fork ratings need SEVERAL oracles, over boring metrics

Aaron 2026-09-03:

> i'd like to push on this a bit so we have some community oracles[,] not just one but a
> few[,] that rate the forks of the same packages by some DORA like bo[r]ing metrics we can
> all agree on mostly. this way you can kind of navigate who is c[a]nonical vs who is
> experimenting.

Three design constraints are already in that sentence, and each is a carved rule:

**"not just one but a few."** A single fork-rating authority is an appointed hub at the
package layer — whoever runs it decides what is canonical. That is what download counts on
one registry already are today: one number, one authority, and a popularity contest standing
in for a judgement. §11 multi-oracle is not a preference here; it is the only shape in which
the rating is not a capture.

**"boring metrics we can all agree on mostly."** This is the good-meter test verbatim:
*anyone can inspect it and agree to the rules* — in advance, not after seeing the result.
Boring is the requirement, not a modesty. A metric that needs interpretation to compute is a
metric two parties will compute differently.

**"canonical vs experimenting."** That is a **reading**, and the metrics must support both
readings without preferring either. Which is exactly what a DORA-shaped set does:

| release cadence | change-failure / revert rate | honest reading |
| --- | --- | --- |
| low | low | **canonical** — mature, or finished |
| high | high | **experimenting** — moving fast, and saying so |
| high | low | unusually good, or under-measured |
| low | high | **abandoned or in trouble** |

No cell says "better". `canonical` and `experimenting` are both legitimate things to be, and
a consumer picking the experimental fork on purpose is making a choice, not a mistake — the
neutral-mechanism rule again.

**The DORA analogues for a fork**, since the originals are about a deploying team rather
than a published package:

| DORA | fork analogue |
| --- | --- |
| deployment frequency | release cadence |
| lead time for changes | time from issue opened to fix released |
| change failure rate | releases requiring a follow-up fix; revert rate |
| time to restore | time from a CVE's publication to a patched release |

**Anchor (Beacon):** Forsgren, Humble & Kim, *Accelerate* (2018) — the four key metrics and
the evidence that they predict organisational performance. The claim being borrowed is the
*shape* (a small, boring, agreed set beats a large contested one), not the original
validation, which was about delivery teams and does not transfer by assertion.

**In tree already:** `src/Core.TypeScript/backlog/dora-metrics.ts` folds DORA over
work-item events. It measures *us*. Nothing measures a third-party fork, and doing so is the
increment.

## 6. What stays open

- **Who runs the oracles.** "A few" is the requirement; how they come to exist, and how a
  consumer discovers more than one, is unanswered. If they all end up hosted by the same
  party the plurality is decorative.
- **Gaming.** Every published metric becomes a target (Goodhart). Release cadence is trivial
  to inflate. The mitigation is probably that the metrics are *derived from public artifacts*
  rather than self-reported — but that is an assertion here, not a design.
- **Whether upstream engagement scales to an agent fleet.** Earning credit means a sustained
  relationship with human maintainers. Whether a fleet can hold one, and whether upstreams
  want PRs from it at all, is genuinely unknown and is upstream's call, not ours.
- **What "the community decides" means operationally.** Adoption? The fork ratings above?
  Nothing here settles it, and it should not be settled by us alone — that would be scoring
  our own exam.

## 7. Register

**STRATEGY plus a proposed meter.** §2's control (earn credit first) is a real methodological
improvement over the naive rejection count; §2's change-class sharpening is my addition and
should be checked against how Aaron reads it. §4's escrow requirements are engineering, and
the reproduce-from-escrow row is the falsifiable one. §5's DORA analogues are `toy` — nothing
has computed them for any fork.

Nothing here is measured. Nothing here has shed `toy`.

Work items: `081M1N452KZ087G0R0026W017Z` (upstream acceptance meter),
`081M1N452MT087G0R001WA5621` (dependency escrow closure),
`081M1N452NN087G0R001NZK901` (multi-oracle fork ratings).
