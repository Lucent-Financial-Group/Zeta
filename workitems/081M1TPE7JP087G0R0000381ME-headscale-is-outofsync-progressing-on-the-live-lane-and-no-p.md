---
id: 081M1TPE7JP087G0R0000381ME
type: bug
state: backlog
priority: P2
slug: headscale-is-outofsync-progressing-on-the-live-lane-and-no-p
title: "headscale is OutOfSync/Progressing on the live lane, and no pod data exists to say why"
created: 2026-09-06T06:28:07.382Z
depends_on: []
composes_with: []
---

# headscale is OutOfSync/Progressing on the live lane, and no pod data exists to say why

<!-- Work-item body. ZetaId-keyed (conflict-free, time-sortable). "Backlog" is a
     STATE = this folder; completion moves the file to workitems/done/YYYY/MM/.
     Identity is the zetaid prefix — resolve cross-refs by `081M1TPE7JP087G0R0000381ME-*.md` glob. -->

## The observation

`live kind included Synced+Healthy proof`, check-run **101435639577** (on #16740's head):

```
orleans is Synced/Progressing -- expected Synced/Healthy
headscale is OutOfSync/Progressing -- expected Synced/Healthy
```

**This is a DIFFERENT symptom from the one that was fixed on 2026-09-06.** headscale was
`Missing` -> `Progressing` and then green after `base_domain` moved from `zeta.local` to
`tailnet.zeta.local` (the server refuses a `base_domain` that is a suffix of, or equal to,
the server URL's host). `OutOfSync` says the live objects differ from the manifests and the
sync did not converge, which the `base_domain` defect never produced. It is NOT assumed to
be the same defect returning.

## What is ELIMINATED, statically — and this is deliberately short

Two things were checked in the tree, because they are cheap and they are facts rather than
guesses:

| candidate | checked | verdict |
|---|---|---|
| a sync-policy gap (missing `ServerSideApply`, missing `CreateNamespace`) | `Application.yaml` carries `automated: {prune: true, selfHeal: true}` and `syncOptions: [CreateNamespace=true, ServerSideApply=true]` | **not it** |
| a `storageClassName` the dev lane does not provide | the StatefulSet asks for `longhorn`, and the lane applies a `longhorn` alias StorageClass over `rancher.io/local-path` at bring-up | **not it** |

## What is NOT eliminated, and is NOT being guessed at

Everything else. In particular the image is `ghcr.io/juanfont/headscale:0.29.3` and the
dev bring-up prints, every run, that it mints no ghcr.io pull Secret and that
*"Applications whose images live in ghcr.io will not start in this cluster"* — but that
normally surfaces as `ImagePullBackOff`/Degraded rather than `OutOfSync/Progressing`, and
**no pod state was captured on this run**, so writing that down as the cause would be the
same move this lane keeps punishing.

## The blocker on diagnosing it

`081M1TFG81G087G0R001XPQGQZ` and PR #16758: the pod-level diagnostics
(`not-running-pods`, `warning-events`) were wired only to the repo-backed child-wait
timeout, and a health-verdict failure does not take that path — so the run above dumped no
pod state at all. Once #16758 lands, the next included proof carries one
`FailedScheduling` / `ImagePullBackOff` / `FailedMount` line for this app, and this
work-item is answerable in one read instead of one experiment.

## Done when

The live lane reports `headscale` at `Synced/Healthy`, **and** the cause of this
`OutOfSync` is named from a captured event rather than inferred from the manifests.

## Origin

Found 2026-09-06 (shadow\*) while reading the included proof for the orleans bug. Filed
rather than diagnosed, deliberately: the data needed to diagnose it does not exist yet, and
a bug report that guesses is worse than one that says what it does not know.

