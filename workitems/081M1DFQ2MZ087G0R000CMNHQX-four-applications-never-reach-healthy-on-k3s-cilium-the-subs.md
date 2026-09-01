---
id: 081M1DFQ2MZ087G0R000CMNHQX
type: bug
state: backlog
priority: P2
slug: four-applications-never-reach-healthy-on-k3s-cilium-the-subs
title: "Four Applications never reach Healthy on k3s+Cilium — the substrate metal runs"
created: 2026-09-01T03:20:29.599Z
depends_on: []
composes_with: []
---

# Four Applications never reach Healthy on k3s+Cilium — the substrate metal runs

<!-- Work-item body. ZetaId-keyed (conflict-free, time-sortable). "Backlog" is a
     STATE = this folder; completion moves the file to workitems/done/YYYY/MM/.
     Identity is the zetaid prefix — resolve cross-refs by `081M1DFQ2MZ087G0R000CMNHQX-*.md` glob. -->

## What was measured

The k3d lane was lifted to `--scope included` on 2026-08-31 and reverted on
2026-09-01. It has **never** passed at that scope — it failed on the lift's own
branch, then on `main`, then on every run of the follow-up branch. The same
Applications are unhealthy each time:

    openziti-controller   Unknown   Degraded
    trust-manager         Synced    Degraded
    spire                 Synced    Progressing
    vault                 Unknown   Progressing

    cilium                Unknown   HEALTHY     <- for contrast: the lifted one is fine

`sync=Unknown` is a ComparisonError on the diff, not a sync failure — this repo's
lanes already assert several Applications at `sync=Unknown health=Healthy`. The
signal here is the **health** column.

## Why this is worth a bug and not a deferral

**k3s + Cilium is what metal runs.** Until 2026-08-31 nothing in this repo had
ever reconciled an App-of-Apps on a Cilium cluster: `live-kind-cilium` proves
Cilium installs and serves but runs no ArgoCD; `live-kind-included` reconciles 33
Applications but on kind's default CNI. The k3d lane is the first job that does
both, and the first thing it found is that four Applications do not come up.

So these are plausibly **real metal findings surfaced early**, not k3d artifacts.
That is exactly what the lane was built to do, and it would be a waste to file
them as "k3d is weird".

The honest alternative is stated too: they could be k3d-substrate artifacts (as
the CoreDNS `127.0.0.11` finding turned out to be — see the k3d lane's history).
Distinguishing the two is the work.

## The distinguishing test

For each of the four, the question is the same and it is answerable:

1. Does it reach Healthy on `live-kind-included` (kindnetd, same 33-app roster)?
   If YES on kind and NO on k3d, the difference is substrate — CNI or k3s.
   If NO on both, it is the Application and kind was never asserting it either.
2. If substrate: is the cause k3s or Cilium? `live-kind-cilium` runs Cilium
   without ArgoCD, so a targeted check there separates the two.

Two named suspects worth checking first, from the shape of the four:
`trust-manager` and `spire` are both certificate/identity infrastructure with
webhook and CA-distribution dependencies, and `openziti-controller` and `vault`
both want persistent identity material. A CNI/DNS-dependent readiness path is the
obvious common thread, and the k3d lane has already produced one DNS defect.

## Do NOT

- Do not re-lift the k3d scope to `included` because a smoke run went green.
  That inference is what produced the revert this item records. The lift
  condition is **these four understood**, not another green smoke.
- Do not defer them into `APPLIED_BUT_UNASSERTED_REASONS` without a measured
  reason. A deferral whose reason is "it was red" is the vacuity class wearing a
  reason's clothes.

## Pointers

- `.github/workflows/k8s-argocd-health-test.yml` — `live-k3d`, and the in-place
  note recording the reverted lift
- `src/Core.TypeScript/cluster/argocd-health-test.ts` — `APPLIED_BUT_UNASSERTED_REASONS`,
  the format a justified deferral takes
- `src/Core.TypeScript/cluster/applied-vs-asserted-agreement.test.ts` — the check
  that the applied and asserted layers agree, added after they did not
