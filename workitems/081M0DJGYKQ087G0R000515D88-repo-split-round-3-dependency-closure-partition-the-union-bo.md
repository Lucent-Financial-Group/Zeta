---
id: 081M0DJGYKQ087G0R000515D88
type: task
state: backlog
priority: P2
slug: repo-split-round-3-dependency-closure-partition-the-union-bo
title: "Repo-split round 3: dependency-closure partition, the union bottleneck measured, CCP-vs-CRP synthesis"
created: 2026-08-19T17:44:00.000Z
depends_on: []
composes_with:
  - docs/research/2026-08-19-repo-split-round-3-the-union-is-the-bottleneck-dependency-closure-measured-against-change-rate.md
  - docs/research/2026-08-19-repo-split-round-2-the-change-rate-partition-is-measured-and-the-first-cut-is-not-the-one-the-adr-drew.md
  - 081M0DG68ZH087G0R001RMAX88
  - docs/DECISIONS/2026-04-22-three-repo-split-zeta-forge-ace.md
---

# Repo-split round 3: dependency-closure partition, the union bottleneck measured

The design round landed as
`docs/research/2026-08-19-repo-split-round-3-the-union-is-the-bottleneck-dependency-closure-measured-against-change-rate.md`.
This row tracks what it left open.

## Hypothesis tested (Aaron's, formed before Zeta)

> "without hardcore tooling support for monorepo, the union of everything
> becomes the bottleneck, splitting it out actually can speed things up and
> help decouple everything from everything"

Holds on this tree. The conditional does not: the tooling is 90% built and
unwired.

## Settled (measured, re-runnable)

- Union toolchain: **11,533 MB / 23 components** (developer clone). CI standard
  tier: ~1.5 GB per job restore (`install-v2` cache = 1,487 MB). Two different
  unions; conflating them inflates the result 7x.
- **20 gate jobs install the union; 10 of them need only `bun` (178 MB)** --
  65x over-provision against the developer union, 8x against the CI one.
- **94% of provisioning work per gate run is waste.** On a GREEN run
  (32281902548): 2,830 of 7,766 runner-seconds = **36% of wall-time is the
  install step**.
- Actions cache measured **11.57 GB / 31 entries** against GitHub's documented
  **10 GB** default -- i.e. the regime GitHub itself names "cache thrashing".
- Today's failures: 45 failing jobs across 13 failed main gate runs;
  **28 died in `Install toolchain`** = 82% of real (non-aggregator) failures.
  5 of the 8 distinct jobs that died there need only `bun`.
- The repo's OWN `build-graph.json`: **107 targets, 50 connected components,
  43% singletons, 36% with no CI leg** (35 of 36 Rust crates have none).
- **Only 2,282 of 9,191 commits (25%) touch any build target.**
- **87% of the union footprint (10,055 MB) is needed by exactly ONE candidate.**
- `zeta-formal` + `zeta-wasm` remove **5,982 MB = 52% of the union** and were
  not round-2 candidates at all.

## Corrections to round 2 (recorded, not quietly amended)

- The byte-lock rendezvous constrains **regeneration**, not **verification**:
  `cross-verify` asserts COMMITTED outputs and needs only `bun`. Cut B is
  cheaper than round 2 priced it.
- `zeta-archive` still leads on change rate and removes **zero** toolchain. It
  is no longer the obvious first move.

## Open -- the decision for the human

Four options in §13 of the doc. Not restated; the doc is the surface.

## Open -- two cheap checks independent of the option chosen

1. **Is the Actions cache ceiling raised?** Measured 11.57 GB vs a documented
   10 GB default. The usage-policy endpoint is Not Found at agent permission
   level. One click in Actions settings.
2. **The §1 guard:** `git clone` at a pinned tag must stay SUFFICIENT forever,
   never merely transitional. A dependency-driven split makes an `ace`-shaped
   mandatory resolver MORE tempting, so this matters more now, not less.

## Open -- unmeasured, and named as such

- The cost of the tooling branch's third piece (per-leg toolchain subsets in
  `tools/setup/`). Steps (a) workflow step + (b) `if:` guards alone reduce job
  COUNT without reducing per-job provisioning -- that would look like progress
  and bank little.
- Whether low churn really makes a closure cut cheap to OPERATE (the pin-bump
  frequency claim). No cross-repo pin exists yet to measure. Falsified by a
  `zeta-formal` split whose pin needs bumping weekly.
- Round 2's still-ungathered falsifier: how often agents actually read
  `docs/history/` and `docs/github/` from their own clone.

## Coverage gap found in passing (not this row's to fix)

35 of 36 Rust crates have **no CI leg**. Only `Core.Rust.Observe` runs, in
`full-verify`. The 1,534 MB rust+cargo toolchain in the union serves exactly
one crate's test suite.
