---
name: reference-book-preview-pages-deploy-build-type-workflow-not-legacy
description: "The \"You, Born at the Hinge\" pre-read site URL + the Pages deploy config that keeps it up (build_type=workflow, NOT legacy)"
metadata: 
  node_type: memory
  type: reference
  originSessionId: a9bca54f-fdf0-41b7-8def-cb33ee1bec26
  modified: 2026-08-07T10:41:44.530Z
---

The memoir pre-read site (unlisted, noindex) lives at
`https://lucent-financial-group.github.io/Zeta/preview/ybth-7q2m/` — four editions:
`/` (中文), `/en/`, `/id/`, `/vi/`. Built by `.github/workflows/pages-deploy.yml`
(`bun run pages:build` → `dist`, then a copy-step drops the book HTML into
`dist/preview/ybth-7q2m/…` from `docs/books/you-born-at-the-hinge/site/index.{zh,en,id,vi}.html`).

**Load-bearing config (do NOT revert):** GitHub Pages `build_type` must stay **`workflow`**
(set 2026-08-07 via `gh api -X PUT repos/Lucent-Financial-Group/Zeta/pages -f build_type=workflow`,
Aaron-authorized). It was `legacy` (branch-build from repo root), which has no `/preview/` subtree,
so the legacy builder clobbered the Actions artifact on **every** commit → recurring `/preview/` 404s.
Flipping to `workflow` disabled the legacy builder and the links have held through flush + metrics
commits since. If `/preview/` 404s again, first check `gh api repos/Lucent-Financial-Group/Zeta/pages -q .build_type`
is still `workflow`; a manual `gh workflow run pages-deploy.yml --ref main` restores it (allow ~2-3 min CDN propagation).

**Known quirks:** (1) heartbeat/metrics/flush commits are pushed by the Actions `GITHUB_TOKEN`, so by
GitHub's anti-recursion rule they do NOT trigger `pages-deploy.yml` — but under `workflow` mode that's
fine, the last good deployment keeps serving. (2) A `*/15` self-heal `schedule` trigger was added
(PR #10100) as backup, but GitHub has not actually been firing it — don't rely on it; `workflow` mode
alone is what's holding. (3) The deployed HTML editions are a translated snapshot; the [[book-weave]]
deepened the SOURCE `.md` chapters, so the site is behind the manuscript until a rebuild.
