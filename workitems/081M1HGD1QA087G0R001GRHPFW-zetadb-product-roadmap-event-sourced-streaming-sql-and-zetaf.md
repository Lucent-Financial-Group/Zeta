---
id: 081M1HGD1QA087G0R001GRHPFW
type: task
state: backlog
priority: P1
slug: zetadb-product-roadmap-event-sourced-streaming-sql-and-zetaf
title: "ZetaDB product roadmap: event-sourced streaming SQL and ZetaFS requirements"
created: 2026-09-02T16:49:27.274Z
depends_on: []
composes_with: ["081M1C59ZG4087G0R000VM8DZN"]
---

# ZetaDB product roadmap: event-sourced streaming SQL and ZetaFS requirements

<!-- Work-item body. ZetaId-keyed (conflict-free, time-sortable). "Backlog" is a
     STATE = this folder; completion moves the file to workitems/done/YYYY/MM/.
     Identity is the zetaid prefix — resolve cross-refs by `081M1HGD1QA087G0R001GRHPFW-*.md` glob. -->

Design (current state):
[`docs/design/2026-09-02-zetadb-roadmap-event-sourced-streaming-sql-not-feldera-on-postgres.md`](../docs/design/2026-09-02-zetadb-roadmap-event-sourced-streaming-sql-not-feldera-on-postgres.md).

Composes with ZetaFS first product `081M1C59ZG4087G0R000VM8DZN` (D1–D8 in that spec).

ZD0 (this cut): the map, WONT-DO revisit, Mac Q2/Lookup, group-commit one-segment falsifier, `Regen` stays Singleton. Does not ship v0.9 FS or a SQL parser.

Follow-ups in the design PR plan: ZD1 standing-query bench → ZD2 freeze-through-ferry → ZD4 product-existence bench → ZD5 SQL package.
