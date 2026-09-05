---
id: 081M1S6Z5S3087G0R000GEPSS2
type: bug
state: backlog
priority: P2
slug: the-blob-store-s3-credential-is-a-literal-in-five-committed
title: "The blob-store S3 credential is a literal in five committed files; mint and rotate it like the others"
created: 2026-09-05T16:38:30.947Z
depends_on: []
composes_with: []
---

# The blob-store S3 credential is a literal in five committed files; mint and rotate it like the others

<!-- Work-item body. ZetaId-keyed (conflict-free, time-sortable). "Backlog" is a
     STATE = this folder; completion moves the file to workitems/done/YYYY/MM/.
     Identity is the zetaid prefix — resolve cross-refs by `081M1S6Z5S3087G0R000GEPSS2-*.md` glob. -->

## The finding

`zeta-blob-store-dev-secret` is the S3 secret key for the in-cluster blob store,
and it is a PLAINTEXT LITERAL in five committed YAML files plus five more
mentions in `BLOB-STORE-CONTRACT.md`:

| file | occurrences |
|---|---|
| `applications/seaweedfs/Application.yaml` | 1 (the producer) |
| `applications/loki/Application.yaml` | 1 (consumer) |
| `applications/mimir/Application.yaml` | 3 (tsdb, ruler, alertmanager) |

It is *named* dev, but loki and mimir authenticate with it for real, and the
committed tree is the **metal** rung. In a PUBLIC repository that is a shared
credential in git forever — the exact thing the minted-secret pattern exists to
prevent.

Aaron 2026-09-05: *"passwords can be auto generated on cluster started never
stored and then just the same secrets can be injected to the pod that need
them"*, and *"in a really really perfect world all these passwrod will have at
least two or three so the password can be easily rotated on a schedule."*

## Why this one is harder than OpenSearch's, and what the hooks are

OpenSearch needed ONE consumer to read ONE Secret. This needs **one producer and
three consumers to agree on the same minted value**, and each chart exposes a
different mechanism. Measured, not assumed:

- **seaweedfs (producer)** — `s3.existingConfigSecret` (values.yaml:967). It takes
  the whole S3 identities config from a Secret rather than inline
  `s3.credentials`, so the minted Secret must carry the identities JSON, not a
  bare password.
- **loki (consumer)** — takes `secretAccessKey` inline. Needs either the chart's
  own secret support or `-config.expand-env=true` with the value arriving as an
  env var from a `secretKeyRef`.
- **mimir (consumer, ×3)** — same shape, three separate storage blocks
  (tsdb / ruler / alertmanager) that must all read the same value.

## Rotation is the harder half, and it is the point

The current `DevBootstrapSecretSpec` carries ONE `passwordKey`, so "rotation"
today means deleting the Secret and restarting every consumer. Aaron's ask is
two or three live keys with an active pointer, which is a real change to the
spec shape and to every consumer that reads it.

**S3 makes this tractable in a way a single password does not:** an S3 identity
store can hold MULTIPLE access-key pairs for the same identity, so a rotation is
"add key B, switch consumers, remove key A" with no window where nothing
authenticates. That is the same shape as a JWT signing-key rollover and it is
worth building here first, because the blob store is the one place the tree
already has a natural two-key mechanism.

## Not started

Filed with the hooks measured so the next agent does not re-derive them. Nothing
here is implemented.
