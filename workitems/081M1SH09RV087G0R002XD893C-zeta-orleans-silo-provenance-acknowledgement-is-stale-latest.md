---
id: 081M1SH09RV087G0R002XD893C
type: bug
state: backlog
priority: P2
slug: zeta-orleans-silo-provenance-acknowledgement-is-stale-latest
title: "zeta-orleans-silo provenance acknowledgement is stale: latest went 401 to 200"
created: 2026-09-05T19:33:53.563Z
depends_on: []
composes_with: []
---

# zeta-orleans-silo provenance acknowledgement is stale: latest went 401 to 200

<!-- Work-item body. ZetaId-keyed (conflict-free, time-sortable). "Backlog" is a
     STATE = this folder; completion moves the file to workitems/done/YYYY/MM/.
     Identity is the zetaid prefix — resolve cross-refs by `081M1SH09RV087G0R002XD893C-*.md` glob. -->

## The measurement

Found 2026-09-05 while adding a headscale image row: running the sanctioned
`bun src/Core.TypeScript/cluster/image-source-provenance.ts --refresh` re-measured every
repository and moved one of ours.

```
ghcr.io/lucent-financial-group/zeta-orleans-silo
  bootstrap:  401 -> 404
  latest:     401 -> 200
  artifact:   "denied" -> (readable)
  packagePresence: "absent" -> (found)
  resolvedAt: 2026-08-23 -> 2026-09-05
```

**`latest` going 401 -> 200 means the image is now PUBLISHED and publicly readable.** It was
previously recorded as denied/absent, and is acknowledged in the ledger as one of the
"ours-unpublished" references. That acknowledgement is now **stale by measurement**, which the
`acknowledgement-stale` rule correctly reports.

## Why it is filed rather than fixed in the headscale PR

The refresh is wholesale — it rewrites all 29 repositories — so absorbing it would have carried an
unrelated acknowledgement retirement inside a change about a Helm-to-manifests migration. Retiring
an acknowledgement is a deliberate judgement about our own publishing posture, not a side effect of
someone else's PR. So the headscale change carries **only the measured headscale row**, added by
hand from the refresh's own output, and this row carries the rest.

## What has to be decided

1. **Is `latest` being public intended?** A silo image readable by anyone is a posture change, and
   the ledger cannot tell an intentional publish from an accidental one.
2. **`bootstrap` 401 -> 404** is the opposite direction — it was denied, now it is absent. Either
   the tag was removed or the package was renamed.
3. If both are intended, retire the `ours-unpublished` acknowledgement for this repository and let
   the refresh land. If not, the publish is the defect and the ledger caught it.

**Not adjudicated here.** The measurement is reproducible by re-running the refresh.
