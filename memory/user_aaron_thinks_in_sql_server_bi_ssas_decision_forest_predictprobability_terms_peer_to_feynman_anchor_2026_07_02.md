---
name: user-aaron-thinks-in-sql-server-bi-ssas-decision-forest-terms
description: "Aaron's other native mental frame (peer to Feynman) is old-school SQL Server BI / SSAS data mining — a forest of trees, each node a probability distribution, PredictProbability, DMX, the UDM cube"
metadata: 
  node_type: memory
  type: user
  originSessionId: a9bca54f-fdf0-41b7-8def-cb33ee1bec26
---

Aaron's native mental model for probabilistic-tree / forest / inference work is **old-school
SQL Server Analysis Services (SSAS) data mining** — the Microsoft BI stack (deprecated 2017,
discontinued 2022). When he says "look up old school sql server BI forest to understand how i
think," he means: a **forest of decision trees, each node carrying a probability distribution**
(`NodeDistribution`), producing a **`PredictProbability`** (0→1 weighted answer, not an argmax),
**queried like a table via DMX**, over the typed dimensional **UDM cube**, with **feature
selection** picking what matters.

This is a **peer to [[user_aaron_feynman_is_the_root_anchor_technique_and_sees_feynman_diagrams_of_distributed_systems]]** — Feynman is his physics/first-principles frame; SSAS/BI decision-forest
is his **data/probabilistic/prediction** frame (his BI + financial/metering lineage, Itron/Lucent).

**How to apply:** frame probabilistic / forest / inference / prediction work in his BI terms —
the GLR **parse forest** = the mining forest; **BP/EP marginals** = `NodeDistribution`;
**`SoftValue`** = `PredictProbability`; **`DynamicValue`** = the UDM substrate; querying the
model = DMX. The "ambiguous superposition over the ISA" IS `PredictProbability` over a decision
forest. Expansion beyond SSAS: homoiconic substrate (model = data), real message-passing
inference (not heuristic bagging), soft/never-collapse resolution, custom emotional propagation,
and predictions that are *executable ISA programs* not just values. Full:
`docs/research/2026-07-02-how-aaron-thinks-sql-server-bi-decision-forest-mental-model-expanded-to-parse-forest-inference.md`.
