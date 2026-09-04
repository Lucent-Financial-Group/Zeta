---
id: 081M1F1K5N5087G0R0019JKRV0
type: task
state: backlog
priority: P2
slug: get-off-bitnamilegacy-six-images-pinned-to-an-archive-frozen
title: "Get off bitnamilegacy — six images pinned to an archive frozen since 2025-08, and Orleans clustering now depends on one"
created: 2026-09-01T17:52:10.405Z
depends_on: []
composes_with: []
---

# Get off bitnamilegacy — six images pinned to an archive frozen since 2025-08, and Orleans clustering now depends on one

<!-- Work-item body. ZetaId-keyed (conflict-free, time-sortable). "Backlog" is a
     STATE = this folder; completion moves the file to workitems/done/YYYY/MM/.
     Identity is the zetaid prefix — resolve cross-refs by `081M1F1K5N5087G0R0019JKRV0-*.md` glob. -->

## The measurement (2026-09-01, Docker Hub `last_updated`, not assumed)

| repository | last published | status |
|---|---|---|
| `bitnamilegacy/redis` | **2025-08-22** | frozen > 1 year |
| `bitnamilegacy/postgresql` | **2025-08-28** | frozen > 1 year |
| `bitnami/redis` | 2026-08-22 | alive — but every tag is `latest` or a cosign artifact |
| `bitnami/postgresql` | 2026-08-22 | same |

`bitnamilegacy` is where Bitnami moved the free versioned catalogue when it withdrew
those tags from `bitnami/*`. It is **explicitly an archive**: no updates, no security
fixes, and Bitnami reserves the right to remove it.

## Exposure — six images, three Applications

| Application | images | note |
|---|---|---|
| `redis` | ~~`bitnamilegacy/redis:7.4.1-debian-12-r2`~~ | **LEFT 2026-09-02** — Valkey project chart `valkey-io/valkey-helm` 0.12.0, image `valkey/valkey` (#16292). Orleans endpoint moved in the same commit. |
| `gitlab` | `postgresql:14.8.0`, `postgres-exporter:0.12.0-…-r86`, `redis:6.2.16-…-r1`, `redis-exporter:1.46.0-…-r8` | gitlab is deferred for other reasons already |
| `hat-system` | ~~`bitnamilegacy/kubectl:1.32.3`~~ | **LEFT** — wait Job rewritten onto `registry.k8s.io/kubectl:v1.32.3` (shell-free `kubectl wait`; not a tag swap). |

**`sealed-secrets` is NOT affected.** It runs `bitnami/sealed-secrets-controller:0.39.1`,
which is a Bitnami *product* rather than a packaged-app-catalogue image — it still
publishes versioned tags and was updated 2026-08-20. Checked rather than assumed, because
"it says bitnami" would have swept it in wrongly.

## Progress 2026-09-04

Redis/Orleans path closed by #16292 (`valkey-io/valkey-helm` 0.12.0,
`valkey/valkey`). hat-system wait Job rewritten onto
`registry.k8s.io/kubectl:v1.32.3` (shell-free `kubectl wait`; CRD names
derived from ConstraintTemplates, not guessed plurals). Remaining
outside deferred gitlab: none.

## Why this is urgent NOW and was defensible before

The pins were a knowing, disclosed trade. `redis/Application.yaml` says it in its own
words: *"this pin buys a testable chart today and is not a long-term answer. The long-term
answers are a non-Bitnami redis chart or a Bitnami Secure Images subscription, and both are
maintainer calls rather than ones to make inside a measurement fix."* That was the right
call for a measurement fix — the alternative was leaving the chart unpullable and unpriced.

Two things changed:

1. **Orleans clustering now depends on it.** `orleans/configmap.yaml` points membership at
   `redis-master.redis.svc.cluster.local:6379`. The silo built in `081M0QB1Q6Z087G0R00091JH3Q`
   therefore has an archived, unpatched image on its critical path — a silo that cannot form
   membership does not run at all.
2. **We just removed MinIO for exactly this.** Archived upstream, unpatched advisories. Keeping
   six archived images while removing one is not a consistent position, and the inconsistency
   is the argument, not the CVE count.

Worth naming plainly: the re-point **optimised the metric at the cost of the thing the metric
was for.** "Unmeasurable" became "measurable" by pinning to an archive — the image got a
number and got worse. That is the failure mode a measurement culture has to watch for in
itself, and it is why this is filed rather than left in a comment.

## Recommended direction (a maintainer call, per the comment that deferred it)

**redis → Valkey.** `docker.io/valkey/valkey` published 9.0.6 on 2026-09-01 (checked), is
BSD-3 under the Linux Foundation, and is wire-compatible with Redis — so it is a drop-in for
`StackExchange.Redis`, which is what `Microsoft.Orleans.Clustering.Redis` uses. It also steps
around the *original* cause: Valkey exists because of the Redis licence change that set this
whole chain in motion.

**UNVERIFIED, and it is the first thing to test:** that Orleans' Redis clustering provider
works against Valkey. It should — the provider speaks ordinary Redis commands — but "should"
is not a measurement, and this item must not repeat the mistake above by asserting it.

Second choice if Valkey is ruled out: `docker.io/redis` (official, 8.8.2 on 2026-08-27) with a
non-Bitnami chart. Both avoid a paid subscription; both need a chart that is not Bitnami's,
since the Bitnami chart asserts its own image paths (`allowInsecureImages` exists precisely
because of that assertion).

`hat-system`'s kubectl is independent and much smaller — any maintained kubectl image closes it. Closed: the wait Job is `registry.k8s.io/kubectl:v1.32.3` with no shell.

`gitlab` should be left alone until its own deferral lifts. Note its bundled chart *also*
pulls `minio/minio:RELEASE.2017-12-28` and `minio/mc:RELEASE.2018-07-13` — nine years old —
which is its own argument against lifting that deferral casually.

## Done when

No `bitnamilegacy` path renders from any Application outside `gitlab`, the `redis` (or
Valkey) Application pulls from a repository that published within the last 90 days, and
Orleans forms membership against it — demonstrated, not assumed.

## Origin

Aaron, 2026-09-01, reading the word `bitnamilegacy` in a summary of the minio removal:
*"this sounds like we should not be on this, we should be on some upgraded image, this
sounds old/almost unsupported."* Correct on both counts, and found from a single word.
