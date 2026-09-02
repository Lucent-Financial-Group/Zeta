---
id: 081M1HH1ERN087G0R00309EG9D
type: bug
state: backlog
priority: P2
slug: headscale-is-not-dormant-the-chart-moved-home-we-are-pinned
title: "headscale is NOT dormant — the chart moved home; we are pinned to a stale third-party mirror four server releases behind"
created: 2026-09-02T17:00:35.989Z
depends_on: []
composes_with: []
---

# headscale is NOT dormant — the chart moved home; we are pinned to a stale third-party mirror four server releases behind

<!-- Work-item body. ZetaId-keyed (conflict-free, time-sortable). "Backlog" is a
     STATE = this folder; completion moves the file to workitems/done/YYYY/MM/.
     Identity is the zetaid prefix — resolve cross-refs by `081M1HH1ERN087G0R00309EG9D-*.md` glob. -->

## The correction that started this

`docs/CHART-CURRENCY.md` labels this row **`DORMANT`** — "at the newest published
version ONLY because upstream stopped publishing". Aaron, 2026-09-02:

> i read headscale is still supported not unsupport fyi

He is right, and the label is misleading. `DORMANT` is a fact about the **chart
coordinate** we pin (`gabe565/headscale`, last published 2025-02-19, 559 days),
not about the headscale **project**, which is actively developed.

## What is actually true, measured 2026-09-02

| | chart | appVersion |
|---|---|---|
| what we pin (`charts.gabe565.com`) | `0.16.0` | **v0.25.0** |
| the maintained chart (`headscale/headscale`) | `1.0.19` | **0.29.3** |
| the project's latest release (`juanfont/headscale`) | — | **v0.29.3** (2026-07-29) |

So the chart **moved home**. `charts.gabe565.com` is a third-party personal chart
repo, and **the whole repository is dead**. We are four minor server releases
behind as a result, and nothing in the tree says so.

> **CORRECTED 2026-09-02.** This first said the repo was "still alive (it
> publishes `adguard-home` actively)" and had merely stopped updating its
> headscale chart. Wrong, and wrong in the **acquitting** direction. Measured:
> `max(created)` across **all 39 charts** in that index is 2025-02-19,
> adguard-home's own newest is 2025-02-19, and the index has not been regenerated
> since 2025-02-20. The error came from reading a version LIST and inferring
> activity from version numbers without reading a date — the same shape as reading
> a green check without asking whether it ran. An independent second review of
> every chart pin caught it.

This is the same shape as the `tempo` and `cert-manager` repoURL relocations: the
pin resolves, the chart renders, and the coordinate is quietly abandoned.

## THE GENERAL DEFECT, which is the more valuable half

**Chart currency is not app currency, and the report only measures the first.**

`report-chart-currency.ts` compares our pinned CHART version against the newest
published CHART version. For a chart that pins an application image, a dormant
chart FREEZES THE PRODUCT at whatever `appVersion` it last shipped — and the
report renders that as `DORMANT` / zero versions behind, i.e. *nothing to do
here*.

That is precisely the failure the report's own headline already names for `minio`:

> a pure versions-behind metric reports the most dangerous dependency in this
> tree as the healthiest one

...one level down. `minio` was chart-current because upstream archived. `headscale`
is chart-current because a third-party packager moved on. In both cases the
healthy-looking row is the stale one, and the tree cannot tell.

**The fix is already scoped elsewhere**: `src/Core.TypeScript/ace/currency.ts`
generalised currency across ecosystems (nuget / npm / oci) precisely so images
could be measured. Wiring `appVersion` — or the rendered image tags — into the
chart report would have caught this without anyone reading a row by eye.

## What to decide

1. **Relocate** to `headscale/headscale` 1.0.19 (app 0.29.3). This is a chart
   MIGRATION, not a bump — different packager, different values schema — so it
   needs the treatment redis→valkey got: render both, diff storage/resources,
   check inert keys, re-derive any ledger row.
2. ~~**Or stay** on gabe565 0.16.0 deliberately~~ — **CLOSED BY POLICY**, Aaron
   2026-09-02: *"we never want to stay on projects who don't push updates, this is
   a security hazard."* Staying is not an option, and the dead-repo measurement
   above removes any remaining doubt.

**AND THERE IS NO OFFICIAL CHART TO RELOCATE TO.** Measured 2026-09-02:
`juanfont/headscale` contains no `Chart.yaml` and no `charts/` directory, and its
`packaging/` holds deb/rpm only. So the criterion cannot be "go official"; it has
to be "pick the third party that actually tracks the app". Best measured
candidate: `oci://codeberg.org/wrenix/helm-charts/headscale` **1.0.19 /
appVersion 0.29.3**, using the official `ghcr.io/juanfont/headscale` image.
Runners-up: `sinextra` 0.1.0/v0.29.3, `szpadel` 0.30.2/0.29.1, `quenchworks`
0.0.7/0.29.2. The other honest option is in-repo manifests over the official
image, which the tree already does for 11 git-path Applications.

**DO NOT TAKE THE CHEAP PATH.** A second review rendered gabe565 0.16.0 with
`image.tag: v0.29.3` overridden: it templates fine and the PVC is unchanged — and
that is exactly the trap. The chart's init container writes a v0.25-era config and
hardcodes `HEADSCALE_IP_PREFIXES`, which headscale renamed after 0.25. A clean
render there is **not** evidence the pod boots; it is a check that cannot fail on
the thing that matters. Relocate; do not override the tag.

What is established: the current state is not "headscale is unmaintained" — it is
"our packager is".

## Provenance

Found while working the chart-currency gate before the USB test. The `DORMANT`
label was accepted for several sessions before Aaron questioned it.
