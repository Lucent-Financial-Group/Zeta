---
id: 081M1PZA3W6087G0R003DJ5RDD
type: task
state: backlog
priority: P3
slug: headscale-is-dormant-with-no-upgrade-path-replace-or-retire
title: "headscale is DORMANT with no upgrade path: replace or retire"
created: 2026-09-04T19:46:11.974Z
depends_on: []
composes_with: []
---

# headscale is DORMANT with no upgrade path: replace or retire

<!-- Work-item body. ZetaId-keyed (conflict-free, time-sortable). "Backlog" is a
     STATE = this folder; completion moves the file to workitems/done/YYYY/MM/.
     Identity is the zetaid prefix — resolve cross-refs by `081M1PZA3W6087G0R003DJ5RDD-*.md` glob. -->

`headscale` is pinned at 0.16.0, which is **the newest published version**. It is not
behind. Upstream has not published in **560 days**.

That is the distinction `docs/CHART-CURRENCY.md` exists to draw, and it names this exact
trap: *"a pure versions-behind metric reports the most dangerous dependency in this tree
as the healthiest one"*. `headscale` reads `DORMANT`, not `CURRENT`, for that reason.

**There is no bump to make**, so this is not maintenance — it is a decision:

1. **Keep and accept.** Mesh VPN, single-node today, low blast radius. The risk is that
   an unpatched CVE has no upstream fix.
2. **Replace.** Tailscale's own operator, or drop back to Cilium-native connectivity if
   the mesh is not carrying anything a cluster network cannot.
3. **Retire.** `headscale` is currently in the dev lane and renders one workload. What
   actually depends on it should be established before either of the above.

Question to answer first, and it is cheap: **what in this tree uses headscale today?** If
the answer is nothing, option 3 costs nothing and removes an unmaintained dependency.
