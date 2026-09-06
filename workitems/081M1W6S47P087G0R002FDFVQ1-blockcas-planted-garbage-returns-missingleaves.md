---
id: 081M1W6S47P087G0R002FDFVQ1
type: task
state: backlog
priority: P2
slug: blockcas-planted-garbage-returns-missingleaves
title: "BlockCas planted garbage returns MissingLeaves"
created: 2026-09-06T20:32:56.054Z
depends_on: []
composes_with: []
---

# BlockCas planted garbage returns MissingLeaves

#16848 hash-verifies after putLeaves on both POSIX and BlockCas, but the
falsifier only planted garbage on the POSIX object path. `BlockCas.Put`
skips an existing key, so the same plant on CAS must return MissingLeaves
and keep the prior freeze readable. Recovery stays `toy`.

<!-- Work-item body. ZetaId-keyed (conflict-free, time-sortable). "Backlog" is a
     STATE = this folder; completion moves the file to workitems/done/YYYY/MM/.
     Identity is the zetaid prefix — resolve cross-refs by `081M1W6S47P087G0R002FDFVQ1-*.md` glob. -->
