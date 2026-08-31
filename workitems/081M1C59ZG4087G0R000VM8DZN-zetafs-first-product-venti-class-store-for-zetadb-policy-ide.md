---
id: 081M1C59ZG4087G0R000VM8DZN
type: task
state: backlog
priority: P1
slug: zetafs-first-product-venti-class-store-for-zetadb-policy-ide
title: "ZetaFS first product: Venti-class store for ZetaDB (policy, identities, log-as-truth)"
created: 2026-08-31T14:59:20.196Z
depends_on: []
composes_with:
  - 081KTH1Z6G708QG0R002KCPHWF
  - 081M108RYNT087G0R001JSRNZE
  - 081M177JJX9087G0R000BDYG88
---

# ZetaFS first product: Venti-class store for ZetaDB (policy, identities, log-as-truth)

Spec:
[`docs/design/2026-08-30-zetafs-first-product-cas-store-per-entity-policy.md`](../docs/design/2026-08-30-zetafs-first-product-cas-store-per-entity-policy.md).

ROADMAP item 1 (no git CLI; dual Z-set folds) is this product. ZetaFS is a
custom filesystem **for ZetaDB**, not a Finder disk. POSIX is a mount.

First implementation slice is spec PR1: route `.zetafs` through `IFileSystem`,
FORMAT grammar (`zetafs/2 ns=git-trees body=blob hash=blake3-256`). Object
filenames stay 32-hex MerkleHash handles until the hasher port grows 256-bit.
Do not claim crash-safe until PR12 DST corpus. Separate repo only after
ZetaDB dogfood proves it is worth extracting.

Composable knobs (C1-C10 in the spec): rolling caps AND together; crypto as
layers (GCM on objects, XTS later under a block volume); adapters as views;
git import+export with our log as truth. Exclusive: `StoreEntity = 13`; object
AEAD is GCM.
