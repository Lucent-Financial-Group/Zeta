---
id: 081M1PZA3VF087G0R003W8FWMS
type: task
state: backlog
priority: P2
slug: temporal-0-59-0-to-1-6-x-deletes-the-bundled-subcharts-we-al
title: "temporal 0.59.0 to 1.6.x deletes the bundled subcharts we already refuse to use"
created: 2026-09-04T19:46:11.951Z
depends_on: []
composes_with: []
---

# temporal 0.59.0 to 1.6.x deletes the bundled subcharts we already refuse to use

<!-- Work-item body. ZetaId-keyed (conflict-free, time-sortable). "Backlog" is a
     STATE = this folder; completion moves the file to workitems/done/YYYY/MM/.
     Identity is the zetaid prefix — resolve cross-refs by `081M1PZA3VF087G0R003W8FWMS-*.md` glob. -->

## The lower-risk of the two major bumps

| | vendored subcharts |
| --- | --- |
| **0.59.0** (our pin) | `cassandra`, `elasticsearch`, `grafana`, `prometheus` |
| **1.6.0** (newest) | none |

**We already refuse to use the bundled datastore.** The Application's own header argues
the case at length: the bundled subchart is `cassandra` 0.14.3 from the **archived**
`helm/incubator` repo, image `cassandra:3.11.5`, `persistence.enabled: false` by default
— *"i.e. emptyDir, i.e. a durable-execution engine on a store that loses its data on
restart"*. The Application uses CockroachDB instead.

So 1.6.0 **deletes a subchart the manifest already declines**, which makes this bump
aligned with the design rather than a migration away from it. Contrast
[081M1PZA3TF087G0R002VKM8RJ], where the same structural change forces three new wirings.

What still needs checking: whether 1.6.x's external-datastore values keep the same
`server.config.persistence.<store>.sql.driver` passthrough the Application relies on, and
whether the visibility store still resolves to the same schema set.

Also excluded from the dev lane (`temporal/**`), so hardware-only verification.
