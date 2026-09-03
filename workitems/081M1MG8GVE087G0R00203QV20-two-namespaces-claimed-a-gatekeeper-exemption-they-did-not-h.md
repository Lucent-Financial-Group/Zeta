---
id: 081M1MG8GVE087G0R00203QV20
type: bug
state: backlog
priority: P1
slug: two-namespaces-claimed-a-gatekeeper-exemption-they-did-not-h
title: "two namespaces claimed a gatekeeper exemption they did not have, so both Applications were permanently unsyncable"
created: 2026-09-03T20:44:42.222Z
depends_on: []
composes_with: []
---

# two namespaces claimed a gatekeeper exemption they did not have, so both Applications were permanently unsyncable

<!-- Work-item body. ZetaId-keyed (conflict-free, time-sortable). "Backlog" is a
     STATE = this folder; completion moves the file to workitems/done/YYYY/MM/.
     Identity is the zetaid prefix — resolve cross-refs by `081M1MG8GVE087G0R00203QV20-*.md` glob. -->

## What happened

Gatekeeper ships its own validating webhook, `check-ignore-label.gatekeeper.sh`, which refuses
the label `admission.gatekeeper.sh/ignore` on any namespace outside the controller's
`exemptNamespaces` set. It is not one of our ConstraintTemplates and no Constraint can switch
it off — it guards the exemption mechanism itself, so a workload cannot exempt itself from
policy merely by labelling its own namespace.

Three namespace manifests carried that label. One was exempt.

| namespace | manifest | in `exemptNamespaces`? |
|---|---|---|
| `zeta-platform` | `applications/platform/namespace.yaml` | yes |
| `agent-memory` | `applications/agent-memory/namespace.yaml` | **no** |
| `game-hosting` | `applications/game-hosting/gmod/namespace.yaml` | **no** |

MEASURED on run 33790413535 (`main`, 2026-09-03), both non-exempt namespaces were denied on
every sync attempt:

```
application/agent-memory  Sync operation ... failed: the namespace failed to apply, reason:
  admission webhook "check-ignore-label.gatekeeper.sh" denied the request: Only exempt
  namespace can have the admission.gatekeeper.sh/ignore label (retried 5 times).
application/gmod          ... identical ...
```

The Namespace never applies, so the Application never syncs, so it reads `OutOfSync`/`Missing`
indefinitely. Two Applications were permanently undeployable, and `agent-memory is
OutOfSync/Missing` is one of the two findings that failed the included Synced+Healthy proof.

## Why it survived

The correspondence was asserted in a YAML **comment** — `agent-memory/namespace.yaml` said
"(matches open-policy-agent exemptions)" — and never read from the other side. It was false
when it was written. Nothing in the repo compared the two files, so the claim could stay wrong
until someone deployed it, and the failure then arrived as an ArgoCD sync error a long way from
the label that caused it.

## The fix: drop the label, do not widen the exemption

Both labels removed rather than both namespaces added to `exemptNamespaces`, because the label
was buying nothing and the alternative is a security decision nobody argued for:

1. **The stated reason was already covered.** Both comments said the label was so "a policy
   outage can't block" the workload. The Gatekeeper Application already sets
   `validatingWebhookFailurePolicy: Ignore` — it fails **open**, admitting cluster-wide when
   the engine is unreachable. Nothing about outage resilience was lost.
2. **No Constraint targets these namespaces' kinds.** All seven ConstraintTemplates in the tree
   (`applications/hat-system/policies/*.yaml`) match `apiGroups: ["society.zeta.io"]`, kinds
   `Hat` / `HatBinding`. None matches a Pod, Deployment, StatefulSet or Namespace, so the label
   exempted these namespaces from nothing they were subject to.
3. Adding a namespace to `exemptNamespaces` exempts it from **every** Constraint, present and
   future. That is a policy call for the maintainer, and it is not needed to fix this.

## Falsifier

`src/Core.TypeScript/cluster/gatekeeper-ignore-label.ts` — reproduces the whole failure offline
in about a second by comparing every `kind: Namespace` manifest against the Gatekeeper
Application's `exemptNamespaces`. Wired into `k8s-argocd-health-test.yml` as two explicitly
named steps, because that workflow runs named test files only and a new test file there is
orphaned by default.

Its own vacuity guards, each with a test: a zero-namespace walk is an **alarm**, not a pass; an
unreadable exempt list is **reported** rather than defaulted in either direction (`[]` would
manufacture false findings, "assume exempt" would manufacture silence); and an empty list is
kept distinct from an unreadable one. The converse — an exempt namespace with no label — is
deliberately not a finding, since the list names infra namespaces this tree never creates.

Mutation-verified 2026-09-03: reinstating the label on `agent-memory` turns the tree assertion
red (12 pass / 1 fail).

## Not fixed here

The other half of the failing proof is CPU: `mimir-kafka-0`, `hindsight-api`,
`hindsight-control-plane` and `hindsight-postgresql` are `Pending` on `Insufficient cpu`
because CI applies the committed tree and the committed tree is the `metal` rung (6390m on the
dev lane against a 2500m budget / 4000m node). That is the resource-rung override point, a
separate and larger change.
