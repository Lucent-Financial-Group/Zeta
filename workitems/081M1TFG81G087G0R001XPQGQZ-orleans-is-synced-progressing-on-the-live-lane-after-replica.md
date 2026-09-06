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

## 2026-09-06 — the live proof reproduced it, and my own fix could not see it

**Read from check-run 101435639577**, the `live kind included Synced+Healthy proof` on
#16740's head:

```
orleans is Synced/Progressing -- expected Synced/Healthy
headscale is OutOfSync/Progressing -- expected Synced/Healthy
```

So this reproduces, and it is not alone. **`forgejo` is NOT in that list**, which is the
first live confirmation that pulling it out of `DEV_INCLUDED_PROOF_DEFERRED_DIRS` was
safe: it reached Synced/Healthy with its minted credential.

### The diagnostic gap is WIDER than this work-item said, and the first fix missed it

This item's closing line was *"a Pending pod is currently diagnosed by guesswork, which is
a gap in the lane rather than in orleans."* #16754 added `not-running-pods` and
`warning-events` to `REPO_BACKED_CHILD_WAIT_DIAGNOSTIC_COMMANDS` to close it.

**That bundle hung only off the repo-backed child-wait timeout.** This failure is a
health-verdict failure and does not take that path, so the run above dumped **no pod state
at all** — the commands existed, were correct, and were unreachable from the one case they
were written for. A diagnostic that cannot fire for its own motivating failure is the
vacuity class pointed at instrumentation, and it is worse than none: the roster reads as
coverage.

Fixed by attaching the bundle to the health-wait failure as well, pinned by a falsifier
that asserts BOTH call sites exist.

### What is still unknown, and stays unknown

**Why** orleans is Progressing. The hypothesis in this item — Pending on the 500m CPU
request — is still a hypothesis, and the run that could have refuted it produced no pod
data. The next included proof carrying the second call site is what answers it, and the
answer will be one `FailedScheduling` line or something else entirely.

`headscale is OutOfSync/Progressing` is a **different** symptom from the `Missing` that the
`base_domain` fix cleared, and is not assumed to be the same defect.

