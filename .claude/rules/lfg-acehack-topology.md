# LFG is the factory; AceHack is the backup mirror

Carved sentence:

> All PRs open against LFG. AceHack is a disposable backup — fast-forward only,
> delete-and-recreate if diverged, never force-push.

## Operational content

**`Lucent-Financial-Group/Zeta` (LFG)** is the only active development/review
repo. All PRs open against LFG. All maintainers and agents work through LFG.
Issues, anchors, and backlog live on LFG only. Force-push to LFG main is
forbidden (host-enforced via `non_fast_forward` rule).

**`AceHack/Zeta` (AceHack)** is a backup mirror — preservation in case LFG
is degraded. Fungible: could be deleted and recreated; the maintainer has
explicitly declared AceHack a learning sandbox + disposable backup. Its main
branch tracks LFG/main on a daily cadence; full SHA equality is no longer a
maintained invariant.

**Mirror-refresh protocol (Path 2, B-0110, 2026-04-30):**

- AceHack/main is updated by **fast-forward only** when it has not picked up
  commits LFG/main doesn't have.
- When AceHack/main has diverged (AceHack has commits LFG doesn't), reconcile
  via PR-based reset OR delete-and-recreate — **not force-push**.
- Host blocks force-push uniformly (`non_fast_forward` ruleset; no bypass actors).

**Pre-2026-04-29 double-hop workflow was abandoned 2026-05-02** per the human
maintainer: *"we abandoned the double hop it was too much trouble."* Existing
artifacts from prior rounds are historical evidence; 0/0/0 invariant no longer
maintained; revival is not the operational expectation.

In-flight feature branches on either fork remain untouched by mirror-refresh;
only `main` is mirrored.

## Full reasoning

`memory/feedback_lfg_only_development_flow_acehack_is_mirror_aaron_amara_2026_04_29.md`
`docs/backlog/P1/B-0110-acehack-mirror-protocol-drift-2026-04-30.md`
