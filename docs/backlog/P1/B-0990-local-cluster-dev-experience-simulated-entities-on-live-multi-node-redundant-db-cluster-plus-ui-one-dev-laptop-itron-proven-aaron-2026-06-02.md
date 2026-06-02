---
id: B-0990
priority: P1
status: open
title: "Local-cluster dev-experience — simulated entities billed on a real live multi-node-redundant DB cluster + UI, all on ONE dev laptop, lightweight (Itron-proven; concept-not-code) (Aaron 2026-06-02)"
tier: research
effort: L
created: 2026-06-02
last_updated: 2026-06-02
depends_on: []
composes_with: [B-0924, B-0925, B-0989, B-0988, B-0986, B-0954, B-0703]
tags: [dev-experience, local-cluster, multi-node-redundant, simulation, dst, billing, ui, one-laptop, itron, concept-not-code, full-ai-cluster, emulator-as-dst, aaron]
type: research
---

# Local-cluster dev-experience — full multi-node cluster + UI + simulation on one dev laptop

## Why

Aaron 2026-06-02 (verbatim): *"At Itron we could see our billing of simulated meters on a real live database cluster with UI and multi node redundant on one dev laptop without breaking a sweat."*

The dev-experience target, proven achievable at Itron: a developer can, **on one laptop, without breaking a sweat**, run a **real live multi-node-redundant database cluster** + a **UI** + a **simulation of entities** (Itron: meters) + the **real domain logic over them** (Itron: billing) — and *watch it work*. This is the local-cluster DX Zeta should match: full production-shaped cluster + observable UI + deterministic simulation, lightweight enough for a single dev laptop.

## What it is — the capability

A developer can spin up, locally on one laptop:

1. **A real live multi-node-redundant DB cluster** — not a mock; the actual clustered, redundant data substrate, running multi-node locally (the `full-ai-cluster/` NixOS substrate is the natural home).
2. **Simulated entities** — deterministic simulation of the domain entities (Itron: meters → Zeta: agents/wallets/tiles/jurisdictions/whatever the domain), per **DST** (deterministic simulation testing) + **emulators-as-DST-oracles** (B-0924/B-0925).
3. **Real domain logic over the simulation** — the actual logic running against the simulated entities on the live cluster (Itron: billing → Zeta: the domain operation under test).
4. **A UI to watch it** — observable: *see* the simulated entities + the domain-logic output on the cluster, live.
5. **Lightweight** — all of the above on **one dev laptop**, "without breaking a sweat." The whole point: production-shaped, but local + cheap.

## Why this matters

- **DST + real-cluster, not mock-vs-prod split.** Simulated entities (deterministic, seeded) feeding a *real* cluster means you test the real data/cluster behavior against reproducible simulation — the DST discipline at full-stack scope.
- **Observability built in (UI).** "see our billing" — the dev *watches* the simulation run on the cluster; composes the ASCIIsphere visible-layer + a real UI (B-0991 geospatial-ux is one instance).
- **One-laptop = the DX floor.** If the full multi-node cluster + UI + simulation runs lightweight on one laptop, every contributor can run the whole thing locally — the `zeta-ships-with-skills` immediate-value + the local-bounded-sovereign dev posture.
- **Itron proof-point.** Aaron built/ran exactly this at production scale — concept-not-code: the *capability* is the target; Itron proprietary code is never reproduced; public substrate (NixOS cluster, DST, standard DB clustering) is the build path.

## Acceptance (capability target)

1. **One-laptop multi-node-redundant cluster** — `full-ai-cluster/` (or successor) brings up a real clustered+redundant DB locally, multi-node, lightweight.
2. **Deterministic simulation of domain entities** — seeded DST simulation feeding the live cluster (compose B-0924/B-0925 emulator-as-DST oracles).
3. **Real domain logic over the simulation** — the actual operation under test runs against the simulated entities on the cluster.
4. **UI to observe** — live view of entities + logic output (compose ASCIIsphere + B-0991 geospatial-ux for spatial domains).
5. **Lightweight verification** — the whole stack runs on one dev laptop within a modest resource budget; document the budget.

## Composes with substrate

- **`full-ai-cluster/`** (NixOS cluster substrate) — the multi-node-redundant cluster home
- **B-0924 / B-0925** — emulators-as-DST-oracles (the simulation discipline)
- **B-0989 / B-0988 / B-0986** — geospatial core / world-borders / orientation-tile (one concrete domain to simulate + observe; the meters→tiles/jurisdictions analog)
- **B-0991** — geospatial UX (the UI instance for spatial domains)
- **B-0954** — relativistic bus / zetaspace (the cluster's coordination substrate)
- **B-0703** — multi-oracle (multi-node redundancy ↔ multi-oracle consensus)
- rules: `dv2-data-split-discipline-activated` (DST + idempotency), `zeta-ships-with-skills-immediate-value`, `dont-ask-permission` (free-for-OSS local capability)

## Substrate-honest framing

`[labeling-confidence: hypothesized]` capability/DX target — operator-named, Itron-proven-achievable. The deliverable (full multi-node cluster + UI + simulation + domain-logic, lightweight on one laptop) is operator-explicit; the cluster bring-up + simulation harness + UI are the build work. Concept-not-code: Itron proprietary never reproduced; public substrate (NixOS, DST, standard clustering) only. Nouns interchangeable (meters/entities/agents = the domain's simulated unit).
