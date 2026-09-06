---
id: 081M1TG31X8087G0R000W4EHQC
type: task
state: backlog
priority: P2
slug: subset-of-jumprope-leaves-is-not-readable-after-freeze
title: "Subset of jumprope leaves is not readable after freeze"
created: 2026-09-06T04:37:09.672Z
depends_on: []
composes_with: []
---

# Subset of jumprope leaves is not readable after freeze

PR7: readable iff commit+leaves. Falsifier: freeze a multi-leaf jumprope,
`BlockCas.Delete` one leaf chunk, `isReadable` is false on the live volume
and after `CloneMedia` reopen. Does not promote PR12 recovery out of `toy`.

<!-- Work-item body. ZetaId-keyed (conflict-free, time-sortable). "Backlog" is a
     STATE = this folder; completion moves the file to workitems/done/YYYY/MM/.
     Identity is the zetaid prefix — resolve cross-refs by `081M1TG31X8087G0R000W4EHQC-*.md` glob. -->
