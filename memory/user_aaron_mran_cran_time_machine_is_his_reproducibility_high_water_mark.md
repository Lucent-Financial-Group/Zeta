---
name: user-aaron-mran-cran-time-machine-is-his-reproducibility-high-water-mark
description: Aaron's named prior-art anchor for reproducibility is Microsoft's MRAN / CRAN Time Machine — time-indexed snapshots of a whole package universe; he notes Microsoft abandoned it.
metadata:
  type: user
---

Aaron 2026-08-26: *"for me the most advanced bit reproducablity i've ever seen was
MRAN R archive from microsoft, this would let things pin exact versions everywhere
for scientific reporducablity but microsft abandond it it seems."*

**What made it good — and it is a real insight, not nostalgia.** MRAN's CRAN Time
Machine indexed by **time, not by package**. One scalar (a date) reconstructed an
entire consistent universe including all transitive deps: `checkpoint("2019-03-15")`
gave exactly what CRAN held that morning. No per-package pinning, no lockfile to
maintain — it worked for scientists who would never maintain one. Better ergonomics
than most things since.

**Why it died, and why that is the load-bearing half.** It was an **appointed hub**
(see [[.claude/rules/itron-hub-patent-boundary-p2p-is-the-upgrade.md]]). Every
`checkpoint()` call was a pointer into ONE vendor's archive; Microsoft retired the
snapshots (~mid-2023) and every such call stopped resolving. Exit test: could a
consumer resolve without it? No. So a hub, not an oracle — however good, however
freely given. Posit's P3M offers the same dated-snapshot scheme today with the
identical single-vendor risk.

**The synthesis to reach for:** keep the time-index ergonomic, drop the pointer.
A date references someone else's archive; a **content hash is self-describing** —
any holder can serve the bytes and you can verify them without trusting the source.

> **A locked `flake.lock` is MRAN's good idea with MRAN's fatal flaw removed.**
> One coordinate -> the whole consistent universe, but the coordinate is a content
> hash rather than a vendor's date-stamped URL.

Guix archives sources too; Software Heritage (SWHIDs) is the durable
content-addressed backstop for when upstream vanishes.

**How to apply:** when Aaron raises reproducibility, this is his reference frame —
engage with the time-index insight rather than defaulting to lockfiles-per-project,
which he already knows and finds inferior ergonomically. And when proposing any
resolver/registry, run the exit test on it first. Connects to
[[project-hygiene-enforced-by-capability-not-policy-explicit-escape-hatch-not-override-button]]
(the pre-ace bootstrap layering) and to the repo's missing `flake.lock`.
