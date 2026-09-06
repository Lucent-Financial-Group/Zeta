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
mentions in `full-ai-cluster/k8s/object-store/BLOB-STORE-CONTRACT.md`:

| file | occurrences |
|---|---|
| `full-ai-cluster/k8s/applications/seaweedfs/Application.yaml` | 1 (the producer) |
| `full-ai-cluster/k8s/applications/loki/Application.yaml` | 1 (consumer) |
| `full-ai-cluster/k8s/applications/mimir/Application.yaml` | 3 (tsdb, ruler, alertmanager) |

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

## Still not started — but two more things are now MEASURED (2026-09-06, shadow*)

Rendering the chart rather than reasoning about it, because
`full-ai-cluster/k8s/applications/seaweedfs/Application.yaml` sets `s3.enabled: false` and `allInOne.enabled: true`,
which makes it look like the `s3.credentials` block might be inert. It is not.

**1. CONFIRMED — the literal reaches a real Secret.** `helm template seaweedfs 4.45.0`
against this Application's own `valuesObject` renders a Secret carrying:

```
stringData:
  admin_access_key_id: zeta-blob-store
  admin_secret_access_key: <the committed literal>
  seaweedfs_s3_config: '{"identities":[{"name":"anvAdmin","credentials":[{"accessKey":"zeta-blob-store","secretKey":"<the committed literal>"}],"actions":["Admin","Read","Write"]}, ...]}'
```

So the value is live in two places in one object, and the `s3.enabled: false` reading
is wrong — `allInOne` consumes the same credentials block.

**2. A CORRECTION TO MY OWN FIRST READ, recorded because the next agent will make it
too.** That same render also carries `read_access_key_id` / `read_secret_access_key`
for an `anvReadOnly` identity, and at first glance they look like a second committed
credential pair. THEY ARE NOT. Rendering twice gives two different values
(`TfyV3sgj7l7wdsMzP3Mf` then `97iPWEs9okjBlwK8XdRT`), so the chart mints them with
`randAlphaNum` per render. Nothing in this tree declares them.

**What that does raise is a different question, and it is a real one:** a Secret whose
content is non-deterministic per render would churn on every ArgoCD sync. It does not,
and the reason is two annotations the chart puts on that object —
`helm.sh/resource-policy: keep` and `helm.sh/hook: "pre-install,pre-upgrade"` — so it
is created once and never updated. **That is an undeclared dependency on hook
semantics**: if either annotation changed upstream, every sync would rotate a
credential nobody is watching. Worth a falsifier when this work-item is picked up,
since the fix here replaces this Secret anyway.

## Not started

Filed with the hooks measured so the next agent does not re-derive them. Nothing here
is implemented. The remaining unmeasured half is the CONSUMER side: loki and mimir both
need `-config.expand-env=true` plus an env var from a `secretKeyRef`, and the mint API
needs a shape it does not have today — `applyDevBootstrapSecrets` draws a fresh
`randomBytes(24)` PER SPEC, so three namespaces sharing ONE value (object-store, loki,
mimir) cannot be expressed by adding three entries to `DEV_BOOTSTRAP_SECRETS`.
