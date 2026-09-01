---
id: 081M1F6X5JX087G0R003DP137N
type: task
state: backlog
priority: P2
slug: re-measure-the-vault-chart-at-0-34-1-and-bump-measured-chart
title: "Re-measure the vault chart at 0.34.1 and bump MEASURED_CHART_VERSION — nine encoded behaviours, before the unseal ceremony"
created: 2026-09-01T19:25:00.893Z
depends_on: []
composes_with: []
---

# Re-measure the vault chart at 0.34.1 and bump MEASURED_CHART_VERSION — nine encoded behaviours, before the unseal ceremony

<!-- Work-item body. ZetaId-keyed (conflict-free, time-sortable). "Backlog" is a
     STATE = this folder; completion moves the file to workitems/done/YYYY/MM/.
     Identity is the zetaid prefix — resolve cross-refs by `081M1F6X5JX087G0R003DP137N-*.md` glob. -->

## What refused the bump, and why it was right

`audit-vault-topology-coherence` rejected `0.29.1 -> 0.34.1` under the rule
`chart-version-unmeasured`, with the clearest statement of the principle in this repo:

> a silent bump would make this audit assert things it never checked

`MEASURED_CHART_VERSION` is not decoration. Every behaviour the audit encodes was measured
against **0.29.1**:

- HA replicas against the declared topology (`ha-replicas-below-topology-nodes`,
  `replicas-exceed-topology-nodes`)
- raft `retry_join` for multi-node (`raft-multinode-without-retry-join`, `raft-config-inherited`)
- the PodDisruptionBudget that would block a drain at one replica (`pdb-blocks-drain-at-single-replica`)
- the seal stanza's Enterprise requirement (`seal-stanza-requires-vault-enterprise`)
- listener scheme against `VAULT_ADDR` (`listener-scheme-disagrees-with-vault-addr`)
- anti-affinity declaration (`antiaffinity-not-declared`)
- storage class availability at its sync wave (`storage-class-unavailable-at-sync-wave`)
- the injector

Bumping the constant to make the gate pass would be the exact vacuity this repo exists to
refuse — **an audit asserting what it never checked** — on the one Application that holds
the cluster's secrets.

## The work

Render vault `0.34.1` with the Application's own `valuesObject`, confirm each encoded
behaviour above still holds (or correct the encoding where it does not), then move
`MEASURED_CHART_VERSION` **in the same commit**, which is what the audit's own message asks for.

## Timing — this one has a deadline

The chart audit's standing note: decide vault **before the unseal ceremony creates live
data**. That is now. After the ceremony this stops being a version bump and becomes a
migration with secrets in it.

## Done when

`MEASURED_CHART_VERSION` names the version the tree pins, every encoded behaviour has been
re-rendered against it, and `audit-vault-topology-coherence` passes on evidence rather than
on a raised literal.
