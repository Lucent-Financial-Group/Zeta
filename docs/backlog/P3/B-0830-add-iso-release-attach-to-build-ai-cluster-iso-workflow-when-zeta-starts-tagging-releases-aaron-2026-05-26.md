---
id: B-0830
title: Add ISO release-attach to build-ai-cluster-iso.yml workflow when Zeta starts tagging releases
status: open
priority: P3
created: 2026-05-26
last_updated: 2026-05-26
depends_on: []
composes_with: []
---

# B-0830 — Add ISO release-attach to build-ai-cluster-iso.yml workflow (when Zeta starts tagging releases) (Aaron 2026-05-26)

## Scope

Add a `release: types: [published]` trigger + attach-to-release job to `.github/workflows/build-ai-cluster-iso.yml` so that when Zeta starts tagging GitHub releases, the AI-cluster installer ISO gets automatically built at the release tag + attached to the release as a downloadable asset.

## Why this is a follow-up row (not done in USB cleanup PR 2)

USB cleanup PR 2 retired the legacy `build-installer-iso.yml` workflow which had a release-attach feature. The canonical `build-ai-cluster-iso.yml` does NOT have the same feature. PR 2's substrate-honest scope was deletion-of-legacy; adding release-attach to the canonical workflow is its own focused engineering work + can wait until Zeta starts tagging releases (currently zero releases per `gh release list` 2026-05-26).

## What the legacy workflow had (reference implementation)

From `.github/workflows/build-installer-iso.yml` (deleted in USB cleanup PR 2):

```yaml
on:
  release:
    types: [published]

jobs:
  build-iso:
    if: github.event_name != 'release'  # release uses attach-to-release-job below
    # ... existing build steps

  attach-to-release:
    if: github.event_name == 'release'
    permissions:
      contents: write  # elevated for release-asset upload
    # ... checkout at release tag, build ISO, upload as release asset
```

Pattern:

- Regular PR / push / workflow_dispatch builds the ISO + uploads as workflow artifact (current state)
- Release `published` event triggers a separate job that rebuilds the ISO AT the release tag commit + uploads as release asset (so the release has a downloadable installer)
- Skip the regular build-iso job on release events (avoid building twice)

## Acceptance

- [ ] `release: types: [published]` trigger added to `build-ai-cluster-iso.yml`
- [ ] `attach-to-release` job added with `permissions: contents: write` (elevated only for that job)
- [ ] Job checks out at release tag SHA, builds canonical ISO, uploads as release asset
- [ ] Skip existing build-iso job on release events (no duplicate builds)
- [ ] Discipline preserved (runner pinned to ubuntu-24.04; SHA-pinned third-party actions; concurrency groups; no `github.event.*` interpolation into `run:` lines per the actions injection guide)
- [ ] Test: tag a small release (e.g., `v0.0.1-test`) + verify ISO attached + then untag

## Out of scope

- Decision to start tagging releases at all (separate governance question)
- Release-versioning scheme (semver vs date-based; separate row when releases start)
- Release notes generation (separate row)

## Composes with

- `.github/workflows/build-ai-cluster-iso.yml` (the workflow this extends)
- `full-ai-cluster/usb-nixos-installer/` (the canonical AI-cluster installer substrate)
- USB cleanup PR 2 (this row's origin)

## Origin

USB cleanup PR 2 (2026-05-26) retired `build-installer-iso.yml`; the release-attach feature it carried was UNUSED at deletion time (zero existing releases per `gh release list`) but the capability is worth preserving for when Zeta starts tagging releases. This row tracks the canonical-workflow re-implementation.
