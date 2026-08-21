---
id: 081M0JXF6MS087G0R001HC34TM
type: task
state: backlog
priority: P2
slug: dev-alias-storageclass-named-longhorn-makes-longhorn-backed
title: "Dev alias StorageClass named longhorn makes longhorn-backed Applications testable in the kind lane"
created: 2026-08-21T19:41:21.945Z
depends_on: []
composes_with: []
---

# Dev alias StorageClass named longhorn makes longhorn-backed Applications testable in the kind lane

<!-- Work-item body. ZetaId-keyed (conflict-free, time-sortable). "Backlog" is a
     STATE = this folder; completion moves the file to workitems/done/YYYY/MM/.
     Identity is the zetaid prefix — resolve cross-refs by `081M0JXF6MS087G0R001HC34TM-*.md` glob. -->

## The circle

`isExcludedFromIncludedProof` in `src/Core.TypeScript/cluster/argocd-health-test.ts`
auto-excluded any Application whose YAML tree said `storageClass: longhorn`. That
rule was circular: the apps were excluded because Longhorn was excluded from the
dev catalog, and Longhorn was excluded because a kind node has no second disk.

Cost: the included Synced+Healthy proof asserted **19 of 45** Applications, and
eleven of the exclusions came from this one rule -- most of the stateful core.

## The cut

A StorageClass is a NAME bound to a provisioner, and workloads only ever name it.
`full-ai-cluster/dev-cluster/manifests/longhorn.yaml` binds `longhorn` to
`rancher.io/local-path`, so the same unmodified manifests bind on a kind node.
Zero application manifests changed. Production is untouched structurally: that
file lives under `dev-cluster/`, which ArgoCD never reads.

The shape is not new -- `zeta-local-path` has been exactly this alias since it was
added. This adds the second name and routes both through one shared apply path,
which also fixes `bringUpK3dDevCluster` never having applied `zeta-local-path` at
all.

## Conditional, not deleted

An unbindable PVC does not fail -- it sits `Pending` until the harness times out,
and a timeout prints no verdict. So the old rule still applies in full whenever
the substrate is absent:

1. `devLonghornStorageClassAliasDeclared()` fails closed on absent / unparseable /
   wrong-kind / wrong-name / provisioner-less. `false` restores the blanket rule.
2. `ReadWriteMany` claims stay excluded regardless -- local-path is node-local and
   RWO-only. Read off the access mode, not a hand-kept list.
3. New `DevStorageClassMissing` failure: an included-scope run verifies the class
   is actually in the cluster before waiting on anything.

## Measured

19 -> 29 asserted. Newly asserted: cockroachdb, headscale, hindsight,
kube-prometheus-stack, mimir, nats, oz (openziti-controller), redis, tempo,
weaviate. Still deferred for named NON-storage reasons: arc-runner-set (GitHub App
credential + RWX model cache), forgejo, spire, vault.

Six mutations, all killed; each byte-verified with `cmp` against a saved pristine
copy before its result was read. See PR #13326.
