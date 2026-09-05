---
id: 081M1MGVSWK087G0R001EQ0YQN
type: task
state: backlog
priority: P1
slug: resource-rung-override-point-the-lane-serves-a-dev-rung-tree
title: "resource-rung override point: the lane serves a dev-rung tree instead of syncing the committed metal one"
created: 2026-09-03T20:55:14.067Z
depends_on: []
composes_with: []
---

# resource-rung override point: the lane serves a dev-rung tree instead of syncing the committed metal one

<!-- Work-item body. ZetaId-keyed (conflict-free, time-sortable). "Backlog" is a
     STATE = this folder; completion moves the file to workitems/done/YYYY/MM/.
     Identity is the zetaid prefix — resolve cross-refs by `081M1MGVSWK087G0R001EQ0YQN-*.md` glob. -->

## The blocker, as the harness already stated it

`src/Core.TypeScript/cluster/argocd-health-test.ts` carries this in the hindsight
blocker note, and it is exactly right:

> THE `dev` RESOURCE RUNG CANNOT REACH THIS LANE, which is the part that looked like the fix
> and is not. `storage-profiles.ts --resource-profile dev --apply` rewrites the WORKING TREE;
> ArgoCD syncs the COMMITTED tree at `--git-ref` ... **One committed tree, two substrates, no
> override point.**

MEASURED 2026-09-03, `storage-profiles.ts --resource-profile <rung> --budget`:

| rung | dev lane (39 apps) | budget | |
|---|---|---|---|
| `dev` | 1165m / 9164Mi | 2500m / 9216Mi | fits |
| `metal` | **6390m** / 14352Mi | 2500m / 9216Mi | does not |

The committed rung is `metal` (`single-node-budget.json` → `activeResourceProfile`), so CI
applies 6390m of requests to one 4000m node. On run 33790413535 that was four unschedulable
pods, each `0/1 nodes are available: 1 Insufficient cpu`:

| pod | metal | dev |
|---|---|---|
| `mimir-kafka-0` | 1000m | 25m |
| `hindsight-api` | 500m | 25m |
| `hindsight-control-plane` | 250m | 25m |
| `hindsight-postgresql` | 250m | 25m |

`mimir` is therefore Degraded and the included Synced+Healthy proof fails.

**It is not fixable by trimming numbers.** The gap is 2.5×, and the metal rung is correct for
the substrate it names — 6390m on a 16-core box is unremarkable. Both rungs are right; what is
missing is a way for one deployment to get one of them.

## The mechanism

`ports.ts` builds the root Application from `gitRepoUrl` + `gitRef` + `path`, and `gitRepoUrl`
is already an injected parameter (`ZETA_ARGOCD_GIT_REPO_URL`). So the override point is not a
new concept — it is a repository to point at.

`lane-tree-source.ts` builds it: a staged copy of `full-ai-cluster/k8s` with the rung applied
through the same `applyResourceProfile` the `--verify` path checks (it already accepts a
`repoRoot`, so no working tree is mutated), self-referencing `repoURL`s pointed at an
in-cluster server, committed to a bare repository, repacked, and packed into a ConfigMap
served over git's dumb-HTTP transport by a `busybox httpd` pod.

Measured: **419,840 bytes packed against a 716,800-byte budget (58.6%)**, 134 files, 12
repoURL rewrites.

### Why in-cluster and not a pushed ref

| cost | |
|---|---|
| repository growth | a per-run ref grows the repo forever; the maintainer's standing concern |
| credentials | a pushed ref needs write access, so it cannot work for a fork PR |
| **races** | a *shared* ref force-pushed by two concurrent runs makes one lane sync the other's tree — a correctness fault, not churn |

Serving in-cluster has none: nothing is pushed, nothing leaves the runner, and two concurrent
runs cannot see each other because each cluster holds its own copy.

### Why dumb HTTP over a static server

The bare repo is built locally, including `git update-server-info`, which is the whole of what
the dumb-HTTP transport needs. The server therefore needs no git binary, no smart-HTTP CGI and
no credentials — every capability it does not have is one that cannot break in a lane whose
failures cost forty minutes each. `git://` was rejected because the daemon protocol is disabled
by default in some hardened git builds.

## Falsifiers

`src/Core.TypeScript/cluster/lane-tree-source.test.ts` — 15 tests, wired into
`k8s-argocd-health-test.yml` as a named step (that workflow runs named test files only).

The end-to-end one is genuinely end-to-end despite being offline: it **clones the bare
repository it just built** and reads mimir's kafka request out of the clone, asserting `25m`
(dev) rather than `1000m` (the value that could not be scheduled).

Mutation-verified 2026-09-03: applying the rung *after* the commit — a plausible ordering bug —
turns exactly that assertion red.

Four refusals, each with a test: a zero-file staging copy; a rung apply producing zero edits (a
lane that believes it runs `dev` while serving `metal`); no self-referencing repoURL rewritten
(a *partial* override, the worst kind); and a packed tree over budget, named here rather than
discovered as an etcd rejection in a lane.

The rewrite is targeted, not global — a test pins that third-party chart repoURLs
(`grafana.github.io/helm-charts`) are left alone, since rewriting those would trade a
scheduling failure for a render failure.

## Not done here

The harness wiring — a `--serve-tree <rung>` flag that applies these manifests, waits for the
server, and points the root Application at it — is a separate change. Split deliberately: each
live-lane verification costs about forty minutes, and landing an unverified big-bang change
into the critical path of the one proof that gates the k8s lane is worse than landing the
verified mechanism first.
