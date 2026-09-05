---
id: 081M1S5X49C087G0R002TMVKQM
type: task
state: done
priority: P2
slug: blockcas-delete-is-the-reclaim-door-for-default-freeze-volum
title: "BlockCas delete is the reclaim door for default freeze volumes"
created: 2026-09-05T16:19:55.311Z
completed: 2026-09-05T17:08:56.890Z
depends_on:
  - 081M1S440QQ087G0R00218K9AM
composes_with: []
---

# BlockCas delete is the reclaim door for default freeze volumes

Default `create` / `createManual` put CAS objects on `BlockCas`
(`storeDir/cas`), not POSIX `objects/xx/yy`. Reclaim still deleted POSIX
paths. `BlockCas` had Put and Exists, no Delete. Named leftovers on the
default door could not leave the index.

- `BlockCas.Delete` unpublishes the key (dual-slot superblock, then RAM).
  Payload holes stay until a later compaction. Extra garbage on crash, not
  a missing live object.
- Orphan catalog and the reclaim ferry use `cas.Exists` / `cas.Delete`
  when the volume has a CAS device.
- Persist `known.pins` after a successful `cas.Put` so a crash before
  freeze-commit still catalogs the leftover.

Falsifier: freeze A on `createManual`; publish an unpinned BlockCas key;
dispose; reopen; `pumpReclaim` without a new freeze unpublishes the key;
A stays readable. POSIX `createManualStream` path unchanged. Dual-slot
`Put` does not publish a torn write, so this is the named leftover, not
a torn payload.

PR12 slice. Recovery still `toy`. Native NVMe still off.
