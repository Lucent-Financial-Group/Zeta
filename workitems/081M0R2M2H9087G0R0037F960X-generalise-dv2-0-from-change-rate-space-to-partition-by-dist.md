---
id: 081M0R2M2H9087G0R0037F960X
type: task
state: backlog
priority: P2
slug: generalise-dv2-0-from-change-rate-space-to-partition-by-dist
title: "DV2.0 change-rate partition at cluster granularity — clusters formed by embedding distance"
created: 2026-08-23T19:47:36.617Z
depends_on: []
composes_with: []
---

# Generalise DV2.0 from change-rate space to partition-by-distance — etymological space as the second instance

<!-- Work-item body. ZetaId-keyed (conflict-free, time-sortable). "Backlog" is a
     STATE = this folder; completion moves the file to workitems/done/YYYY/MM/.
     Identity is the zetaid prefix — resolve cross-refs by `081M0R2M2H9087G0R0037F960X-*.md` glob. -->

## Scope

Proposes that DV2.0's change-rate partition applies at **cluster granularity**, where clusters are formed by distance in an embedding space. NOT a new metric competing with change-rate — semantic distance defines the **unit**, change-rate still defines the **partition**. A cluster of synonyms has one change rate; its members are never measured individually. A RULE change — `.claude/rules/` is startup-loaded and razored, so this is a proposal, not an edit. Worked second instance: design §2a.

**Do not build ahead of the design.** Filed deliberately rather than half-built.

## Disagreement is the measurement (Aaron 2026-08-23)

Within-cluster change-rate disagreement is NOT a coherence precondition to check
and refuse on — it is an **etymological lifecycle signal**, and the obstruction
itself is the readout. Same move `anti-babel-preserve-reconcilability.md` already
makes for monodromy: _"that difference is information, not error"_. See design
§2a for the proposed three-state table, its `proposed` register, and the confound
(file churn / author count) that must be excluded before it is believed.
