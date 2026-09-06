---
id: 081M1TFG81G087G0R001XPQGQZ
type: bug
state: backlog
priority: P2
slug: orleans-is-synced-progressing-on-the-live-lane-after-replica
title: "orleans is Synced/Progressing on the live lane after replicas 0 to 1"
created: 2026-09-06T04:26:53.360Z
depends_on: []
composes_with: []
---

# orleans is Synced/Progressing on the live lane after replicas 0 to 1

<!-- Work-item body. ZetaId-keyed (conflict-free, time-sortable). "Backlog" is a
     STATE = this folder; completion moves the file to workitems/done/YYYY/MM/.
     Identity is the zetaid prefix — resolve cross-refs by `081M1TFG81G087G0R001XPQGQZ-*.md` glob. -->

## What is known, and what is not

PR #16731 merged with its live proof RED. The annotation:

```
orleans is Synced/Progressing -- expected Synced/Healthy
```

`Synced` means ArgoCD applied the manifests successfully. `Progressing` means the StatefulSet
exists and its pod has not become Ready. **That is strictly more information than the state it
replaced** — at `replicas: 0` the Application reached Healthy with no pod at all, which is the
"half a test" the zero-pod checker exists to name. It is still a red that merged, and that is worth
saying plainly rather than filing as progress.

**Not crash-looping.** The lane's "Logs from crash-looping pods, including the PREVIOUS container"
step captured nothing for `orleans-silo-0`, so the container is not starting and dying — the pod is
most likely **Pending**, i.e. unschedulable, or still pulling.

**The leading hypothesis, not yet confirmed:** the committed manifest requests **500m CPU**, and a
kind runner is already carrying cilium, ArgoCD, kube-system and ~40 other Applications. The dev
rung claim added in the same PR is `dev: 250m / metal: 500m`, so the answer turns on whether the
live lane applies the dev resource profile before syncing. If it does not, orleans asks for 500m on
a runner that may not have it.

**The second candidate** is Redis: the silo needs `redis-valkey:6379` to form membership, and
`host.RunAsync` throws if clustering fails — but that would be a CRASH, and the absence of
crash-loop logs argues against it.

## What would settle it in one reading

`kubectl -n orleans describe pod orleans-silo-0` on the next lane run: a Pending pod names its own
reason in `Events` (`Insufficient cpu`, `ImagePullBackOff`, unbound PVC). The lane already prints
cluster diagnostics; whether it prints *this* for a non-crash-looping pod is the thing to check
first, because if it does not, then a Pending pod is currently diagnosed by guesswork — which is a
gap in the lane rather than in orleans.

## Register

The bump was right and is not in question: the blocker it removed was stale (the silo image exists,
`Microsoft.Orleans.Server 10.3.1` is referenced, the Dockerfile and build workflow are real). What
is open is whether a single silo *fits* on a dev runner, and that is a resource question with a
measured answer available on the next run.
