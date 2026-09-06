---
id: 081M1VZ0MEJ087G0R0022K821S
type: task
state: backlog
priority: P2
slug: catalog-write-fail-of-tmp-does-not-publish-a-new-generation
title: "Catalog write-fail of tmp does not publish a new generation"
created: 2026-09-06T18:17:13.426Z
depends_on: []
composes_with: []
---

# Catalog write-fail of tmp does not publish a new generation

#16822 called `SimulatedFs.Write` after the slot was already renamed into
place, so a failed freeze could still load on reopen. Write the tmp, intercept,
then Move. Falsifier: unacked second freeze is not readable after reopen.
Recovery stays `toy`.

<!-- Work-item body. ZetaId-keyed (conflict-free, time-sortable). "Backlog" is a
     STATE = this folder; completion moves the file to workitems/done/YYYY/MM/.
     Identity is the zetaid prefix — resolve cross-refs by `081M1VZ0MEJ087G0R0022K821S-*.md` glob. -->
