---
id: B-0940
priority: P2
status: open
title: Evaluate what Ubuntu support brings us — NixOS is primary; Ubuntu's value is community/contributor reach
tier: strategic-evaluation
ask: Aaron 2026-05-30
created: 2026-05-30
last_updated: 2026-05-30
decomposition: leaf
composes_with:
  - tools/setup/install.sh
  - .github/workflows/docker-nixos-install-sh-test.yml
  - .claude/rules/dv2-data-split-discipline-activated.md
tags: [install-sh, nixos, ubuntu, ci, docker, three-way-parity, strategic]
type: evaluation
---

# B-0940 — Evaluate what Ubuntu support brings us (NixOS primary)

## Origin

Aaron 2026-05-30 (during the Docker Ubuntu+NixOS test build): *"i would also say
nixos is our primary we should put on backlog and evaluate what ubuntu is bringing
us, the community of ubuntu is really why i'm thinking ubuntu matters."*

## The question

**NixOS is the primary target.** It's reproducible + declarative — it fits the
framework's DST + declarative-everything ethos (the `install.sh` entropy-lever +
declarative dependency manifests; per `dv2-data-split-discipline-activated.md` and
the install-as-entropy-lever framing). NixOS gives content-addressed, reproducible
substrate by construction.

**Ubuntu's value is community/contributor reach**, not technical superiority.
Aaron's framing: Ubuntu matters because of its *community* — contributor
familiarity, the default-mental-model for most devs, GitHub-hosted runner
ubiquity (ubuntu-latest is the CI default), and the volume of Ubuntu-targeting
prior art. The question is whether that reach justifies Ubuntu as a *first-class*
install/CI target or whether it's community-convenience only.

## What to evaluate

- **Contributor reach**: how many would-be contributors are Ubuntu-default vs
  willing to use NixOS? Does first-class Ubuntu lower the contribution barrier
  enough to matter?
- **CI ubiquity**: `ubuntu-24.04` is the default GH-hosted runner; NixOS in CI is
  container/QEMU-mediated. What does dropping/keeping Ubuntu cost in CI surface?
- **Maintenance cost** of the Ubuntu path: the `apt` manifest, the floating-binary
  installs (e.g. the ollama `.tar.zst` linux install in `common/local-llm.sh`),
  and the non-reproducibility vs NixOS's pinned closure.
- **Decision**: Ubuntu stays first-class (community justifies it) OR Ubuntu becomes
  community-convenience-only (best-effort, NixOS is the supported/reproducible
  path) OR some tiered support level.

## Acceptance

1. A short decision doc (in `docs/research/` or as this row's Resolution) weighing
   Ubuntu's community-reach value against its maintenance + non-reproducibility
   cost, with NixOS established as primary.
2. A clear support-tier statement for Ubuntu (first-class / community-convenience /
   tiered) that the install-graph + CI strategy follow.

## Notes

Surfaced alongside the Docker Ubuntu+NixOS install.sh test pair (both OSes run
install.sh in containers; per Aaron's "center our docker tests around ubuntu and
nixos"). This row is the *strategic* counterpart: building the Ubuntu test does not
by itself decide Ubuntu's long-term support tier — this row does. NixOS-primary is
the standing default; Ubuntu is retained pending this evaluation because of its
community reach.
