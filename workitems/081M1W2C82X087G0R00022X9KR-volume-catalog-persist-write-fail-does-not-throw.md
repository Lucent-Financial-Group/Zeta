---
id: 081M1W2C82X087G0R00022X9KR
type: task
state: backlog
priority: P2
slug: volume-catalog-persist-write-fail-does-not-throw
title: "Volume catalog persist write-fail does not throw"
created: 2026-09-06T19:15:59.709Z
depends_on: []
composes_with: []
---

# Volume catalog persist write-fail does not throw

FreezeLog maps catalog persist IOException/BUGGIFY to `FreezeError.Fsync`.
Volume `History` setter, reclaim-meter, post-ack `noteFreeze` / `applyRetention`,
and `noteKnownObject` still called `persistCatalog` and threw. Those paths are
not the freeze ack: keep in-memory state, ignore Fsync, let the next FreezeLog
persist retry. Falsifier: History setter under CatalogFailFs does not throw;
prior Journaled freeze stays readable. Crash/power/bad-memory still raise.
Recovery stays `toy`.

<!-- Work-item body. ZetaId-keyed (conflict-free, time-sortable). "Backlog" is a
     STATE = this folder; completion moves the file to workitems/done/YYYY/MM/.
     Identity is the zetaid prefix — resolve cross-refs by `081M1W2C82X087G0R00022X9KR-*.md` glob. -->
