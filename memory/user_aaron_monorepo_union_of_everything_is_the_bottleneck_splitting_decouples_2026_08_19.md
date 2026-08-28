---
name: user-aaron-monorepo-union-of-everything-bottleneck
description: Aaron's years-of-experience observation that a monorepo without hardcore tooling makes the union-of-all-dependencies the bottleneck; splitting speeds things up and decouples
metadata:
  type: user
---

Aaron 2026-08-19, on why he wants repo splits driven by **dependency closure**:

> "this is my key observation over the years trying to work with mono repos,
> without hardcore tooling support for monorepo, the union of everything becomes
> the bottleneck, splitting it out actually can speed things up and help decouple
> everything from everything"

**The mechanism**, stated as he means it: in a monorepo every job pays for the
*union* of all dependencies, not the subset it needs. Absent heavy monorepo
tooling (Bazel/Nx/Pants-class build graphs with per-target dependency
resolution), that union is installed, cached, and invalidated for everyone —
so cost and fragility scale with the whole tree rather than with the change.

**Why this is a `user` fact and not a project fact:** it is the prior he brings
to every repo-architecture decision, formed *before* Zeta and independent of it.
It is the WHY behind the round-3 brief (split by dependency closure, DDD-style),
and it predicts what he will find persuasive: measured per-subset closures beat
elegance arguments.

**Live instance that confirmed it on 2026-08-19** (this is the falsifier that
fired *for* the claim, not against it): the `Install toolchain via three-way-parity
script (GOVERNANCE §24)` step installs one union-of-everything toolchain on every
job. On 2026-08-19 that single step was the largest source of CI failure —
`apt-get install` stalling 09:49Z–17:00Z+, burning the full 420s budget, and only
5 of 16 completed main gate runs succeeded. A repo needing no .NET still installs
.NET. The union is not a theoretical cost; it was the day's outage surface.

**Applies with**: [[dv2-change-rate-is-the-repo-split-smell]] — change rate (CCP)
and dependency closure (CRP) are the two cohesion axes and they are *in tension*
(Robert C. Martin's package principles). Aaron wants both used, plus intended
categories, in one synthesis. Do not treat either axis as the answer alone.

Anchors he'd accept: Parnas 1972 (decompose by information hiding / likely
change, not processing steps); Martin's CCP/CRP tension; Evans 2003 bounded
context — with the honest caveat that a bounded context is *semantic* and a
dependency closure is *mechanical*, so they are not the same boundary.
