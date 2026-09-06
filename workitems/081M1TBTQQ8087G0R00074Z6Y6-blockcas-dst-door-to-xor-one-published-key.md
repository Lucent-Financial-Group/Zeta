---
id: 081M1TBTQQ8087G0R00074Z6Y6
type: task
state: backlog
priority: P2
slug: blockcas-dst-door-to-xor-one-published-key
title: "BlockCas DST door to XOR one published key"
created: 2026-09-06T03:22:42.792Z
depends_on: []
composes_with: []
---

# BlockCas DST door to XOR one published key

`XorLastPayloadByteAll` poisons every published payload. A freeze test that
needs one jumprope internal garbage (trunk still honest) needs a keyed door.
`XorLastPayloadByte` XORs 0xA5 into the last byte of one key; missing key is
false. Superblock and names stay. Does not claim freeze `isReadable` for that
case -- that peel waits on ObjectSets persist.

<!-- Work-item body. ZetaId-keyed (conflict-free, time-sortable). "Backlog" is a
     STATE = this folder; completion moves the file to workitems/done/YYYY/MM/.
     Identity is the zetaid prefix — resolve cross-refs by `081M1TBTQQ8087G0R00074Z6Y6-*.md` glob. -->
