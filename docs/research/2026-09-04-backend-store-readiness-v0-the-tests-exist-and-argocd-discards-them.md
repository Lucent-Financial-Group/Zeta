# Backend-store readiness v0 — the chart tests already exist, and ArgoCD discards every one

**Date:** 2026-09-04 · **Agent:** shadow · **Work item:** 081M1Q0WR89087G0R0036G0T0B
**Register:** measured, except where marked. Every count below came from a command
against the checked-in tree or a pulled upstream chart; the commands are named inline
so a reader can re-run them rather than trust the number.

## The question

Three asks, taken together: are we on the latest of everything (including Temporal);
should any charts be hooked up to backend stores; and *what would it take before the
Helm charts could honestly be called fully tested* — with the suggestion that tests and
queries could be slipped into the chart-of-charts via an Argo tool.

The version half is answered in the sibling commit. This doc is the other two, and the
answer to the third one is not the one I expected going in.

## 1. The tests already exist. ArgoCD throws them away.

Pulled all 32 upstream charts at our exact pins and searched them. **Thirteen ship test
templates; ten of those are real runtime `helm test` hooks**, not build-time unit tests:

| chart | test | what it actually exercises |
|---|---|---|
| nats | `templates/tests/request-reply.yaml` | a real request/reply round-trip |
| cockroachdb | `templates/tests/client.yaml` | client connect (`hook: test-success`) |
| vault | `templates/tests/server-test.yaml` | server reachable |
| redis (valkey) | `templates/tests/auth.yaml` | auth path |
| ollama | `templates/tests/test-connection.yaml` | connection |
| argocd | redis-ha subchart | configmap sanity |
| mimir | grafana-agent-operator subchart | operator |
| spire | spiffe-oidc-discovery-provider subchart | key material |
| gitlab | webservice subchart | webservice |
| temporal | grafana subchart | grafana |

The remaining three (`external-secrets`, `trust-manager`, `headlamp`) ship
helm-unittest `*_test.yaml` files, which are template assertions run at build time by a
plugin — not workloads, and not what was asked for.

**None of the ten has ever run here, and none can.** ArgoCD deploys via `helm template`
and maps a subset of Helm hooks onto its own (`pre-install`→PreSync,
`post-install`→PostSync). `helm.sh/hook: test` is not in that map. The manifests render
— `helm template n nats/nats` emits the test Pod — and ArgoCD then ignores the resource.

This is not a new discovery so much as a previously-unjoined one. The repo already
recorded it twice, in passing, while measuring something else:

> the chart's `forgejo-test-connection` Pod is a `helm.sh/hook: test` **ArgoCD never
> applies on sync** — `PR-13373` review, and again in the forgejo work item

Both times it was noted as a reason a Pod contributes **0** to a resource budget. Nobody
followed the sentence to its other consequence: if ArgoCD never applies them, then the
supplier-written acceptance tests for ten of our charts are dead weight in the tree.

So the work Aaron proposed — *write queries and tests for the charts* — is mostly
already done, upstream, by the people who wrote the charts. **The missing piece is a
carrier that runs them.**

### The carrier — and a distinction that makes it much simpler than I first wrote

The obvious move is to re-annotate the test Pods `argocd.argoproj.io/hook: PostSync`.
My first draft of this section said *do not do that*, citing the deadlock recorded in
`cockroachdb/Application.yaml`. Reading that note properly, the warning does not apply
here, and the reason is worth stating because it is the whole design:

The cockroachdb note is precise about the mechanism. ArgoCD's PostSync phase runs only
after every Sync-phase resource is Synced **and Healthy** (gitops-engine
`pkg/sync/sync_context.go` — a non-hook task stays `running` until
`health.GetResourceHealth` says Healthy). The chart's `cockroachdb-init` Job is
annotated `helm.sh/hook: post-install`, which ArgoCD maps to PostSync — but a
multi-node CockroachDB is *not healthy until init has run*. Init waits for health;
health waits for init. Measured: three pods Running on bound PVCs for 38 minutes,
every readiness probe 503, no init Job anywhere.

The distinguishing property is therefore **not** "PostSync is dangerous". It is:

> A PostSync hook that **produces** the health it waits on deadlocks.
> A PostSync hook that merely **observes** health does not.

`cockroach init` produces health. **A test observes it** — that is what a test is. So
PostSync is not merely safe for the ten chart tests, it is the semantically correct
phase: run after the thing is healthy, report whether it actually works.

The same note also supplies the mechanism that makes this possible at all. From
gitops-engine `pkg/sync/hook/hook.go`, quoted in our own comment: `Types()` reads
`argocd.argoproj.io/hook` first and *"we ignore Helm hooks if we have Argo hook"*. So
an Argo annotation **replaces** the Helm mapping rather than fighting it — which is
exactly the lever needed to bring a `helm.sh/hook: test` Pod back from being discarded.

**The real obstacle is ownership, not semantics.** These Pods are rendered by upstream
charts, and an Application's `helm.valuesObject` cannot add an annotation to an
arbitrary rendered resource. Getting the annotation onto them needs either a kustomize
patch layer over the Helm output, or our own copies of the ten Pods maintained beside
the charts. That is a genuine cost and it is the part to decide before building.

Which is where Aaron's Argo-tool instinct earns its keep as the alternative: we already
deploy **argo-workflows 2.0.3** and **argo-rollouts 2.43.0**. A Workflow that runs
*after* the app-of-apps converges — gated on the existing
`live kind included Synced+Healthy proof` — can apply the ten Pods verbatim with the
`helm.sh/hook` annotation stripped, collect exit codes, and fail the Workflow rather
than any Application. It cannot deadlock, because nothing in the sync graph waits on it,
and it needs no patch layer because it owns the copies outright.

Two properties either route must keep, because they are what stop this becoming
ceremony: the tests are **upstream-authored**, so they are not tests we wrote to pass;
and a test Pod that never gets scheduled must be a **failure**, not a skip — otherwise
the carrier is a check that cannot fail, which is the class this repo exists to hunt.

## 2. Backend stores — mostly right already, with one real gap

Measured from the Applications themselves.

| chart | backend store | status |
|---|---|---|
| temporal | **CockroachDB** via `postgres12`, every bundled subchart off | wired |
| loki | seaweedfs S3 (chunks) + PVC (WAL) | wired |
| mimir | seaweedfs S3 (blocks) + PVC (WAL) | wired |
| argocd, spire | PVC only, **no object store** | correct as-is — neither needs one |
| **tempo** | `backend: local`, `path: /var/tempo/traces` on a PVC | **gap** — the odd one out of the LGTM stack |
| **gitlab** | PVC | **forced gap** — 10.x requires external object storage |

Temporal being already-correct also settles the Cassandra question from the opposite
direction to the earlier analysis. Temporal is the one chart in this tree where
Cassandra is a *first-class, first-choice* backend — the upstream chart historically
bundled it — and we deliberately chose CockroachDB instead. That is the right call
(one fewer datastore, horizontally scalable, already deployed), and it means Cassandra
would not turn on a feature we lack here either.

> **A correction, recorded because the method matters.** An earlier pass of this table
> listed argocd and spire as seaweedfs S3 consumers. That came from a loose
> `grep -E 'seaweedfs|s3:'` over the Applications, which matched a *comment* in
> spire's file discussing mimir's S3 auth, and matched nothing real in argocd's at all.
> Checking each file directly returns zero object-store configuration for both. A grep
> answers "does this string appear", never "is this wired" — and I read the first as
> the second.

## 3. The finding I did not go looking for: a backups bucket with no writer

seaweedfs provisions five buckets. Four are consumed. The fifth is `zeta-backups`, and
a search of the entire tree for any writer returns **nothing**:

```
grep -rn 'zeta-backups' --include='*.yaml' --include='*.ts' --include='*.json' .
  → only the line in seaweedfs/Application.yaml that creates it
```

Meanwhile Longhorn's chart exposes `defaultSettings.backupTarget` and
`backupTargetCredentialSecret`. Our Application sets **neither** — both are `~`.

Measured against `rendered-storage-claims.snapshot.json`: **24 Applications hold PVCs
totalling 1,168 GiB**, twelve of them explicitly on `longhorn`, and nine more that name
no storageClass at all and silently inherit the cluster default. None of it is backed
up anywhere.

A bucket named for backups, with nothing writing to it, is the storage form of the
vacuity class: it produces the *belief* that backups exist, which is the expensive part.

### And the obvious fix is unsound as it stands — three ways

Pointing `backupTarget` at `s3://zeta-backups` is one line, and it would be worse than
leaving it unset:

1. **Capacity.** The seaweedfs allInOne PVC is **20 GiB**. The volumes it would back up
   total **1,168 GiB** — a **58×** shortfall, and that same 20 GiB is already holding
   Loki chunks and Mimir TSDB blocks.
2. **A durability inversion.** seaweedfs sits on `zeta-local-path` — node-local,
   unreplicated. Longhorn volumes are replicated. The backup would live on a *less*
   durable substrate than its source.
3. **One failure domain.** Same cluster, same nodes. A backup that dies with the thing
   it backs up is a copy, not a backup.

So the honest disposition is: **the wiring is right in shape and must not be turned on
until the target is fixed.** The conditions are nameable, which is what makes this a
filed gap rather than a complaint —

> **LIFTS WHEN:** the backup target is (a) off-cluster or in a distinct failure domain,
> (b) sized against the measured 1,168 GiB rather than against the 20 GiB that happens
> to be there, and (c) has a restore actually exercised. Until (c), a backup is an
> assertion.

## 4. What "fully tested" would require — the honest list

Asked directly what still stands between us and calling the charts fully tested. Ranked
by what each would actually buy:

| # | gap | state today |
|---|---|---|
| 1 | **Upstream chart tests never execute** | 10 available, 0 run — §1 |
| 2 | **No restore has ever been exercised** | no backup target set at all — §3 |
| 3 | **tempo has no object backend** | asymmetric with loki/mimir — §2 |
| 4 | **9 PVC apps inherit an unnamed storageClass** | silent dependency on cluster default |
| 5 | **No HA story** | `ha: false` where set; dapr scheduler asks 3×16Gi anyway |
| 6 | **23 apps still declare no resource requests** | filed, unstarted; BestEffort = evicted first |
| 7 | **Upgrade path untested** | we test install; nothing tests chart N → N+1 |

What we *do* have, and should not be undersold: 55 Applications rendering at two rungs
with 0 unrenderable, a live `Synced+Healthy` proof on a real kind cluster, pinned
resource-request and storage-claim snapshots that fail on drift, a currency audit
against live repo indexes, and an inert-key check that catches a values key going dead
under a chart bump. That is a genuinely strong *deployment* gate. It is not a *behaviour*
gate, and items 1–3 are what would begin to make it one.

## Register

§1, §2, §3 are measured — commands named, re-runnable. §4's ranking is a judgement, and
the individual rows in it are measured. The Workflow carrier in §1 is a **design, not an
implementation**; nothing here claims it is built.

## Pointers

- `full-ai-cluster/k8s/applications/cockroachdb/Application.yaml` — the PostSync deadlock note, and the gitops-engine citations that show an Argo hook annotation replaces the Helm one
- `docs/history/pr-reviews/PR-13373-*` — the earlier, unjoined observation that ArgoCD never applies `helm.sh/hook: test`
- `src/Core.TypeScript/cluster/rendered-storage-claims.snapshot.json` — the 1,168 GiB
- `.claude/rules/toy-is-free-metered-must-be-earned.md` — a bucket with no writer is unmetered wearing metered's clothes
