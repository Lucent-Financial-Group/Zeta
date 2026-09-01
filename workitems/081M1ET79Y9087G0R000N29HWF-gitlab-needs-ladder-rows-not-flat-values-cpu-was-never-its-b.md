---
id: 081M1ET79Y9087G0R000N29HWF
type: task
state: backlog
priority: P2
slug: gitlab-needs-ladder-rows-not-flat-values-cpu-was-never-its-b
title: "gitlab needs ladder rows, not flat values: CPU was never its blocker, 76 GiB of PVCs was"
created: 2026-09-01T15:43:21.545Z
depends_on: []
composes_with: []
---

# gitlab needs ladder rows, not flat values: CPU was never its blocker, 76 GiB of PVCs was

<!-- Work-item body. ZetaId-keyed (conflict-free, time-sortable). "Backlog" is a
     STATE = this folder; completion moves the file to workitems/done/YYYY/MM/.
     Identity is the zetaid prefix — resolve cross-refs by `081M1ET79Y9087G0R000N29HWF-*.md` glob. -->

## THE FINDING: CPU was never gitlab's blocker

`lane-partition` reports gitlab as the one oversize quarantine (`cpu 2525m > 2125m`),
so the obvious reading is "shrink the CPU and it fits". That reading is wrong. The
recorded deferral reason in `argocd-health-test.ts` says what actually blocks it:

> what it renders is **76 GiB of PersistentVolumeClaims** across four workloads --
> gitaly 50Gi, minio 10Gi, postgresql 8Gi, redis 8Gi -- every one of them declaring
> NO storageClassName ... A kind runner cannot schedule that inside the lane's
> assertion budget.

A runner has ~70 GiB free. **Fixing CPU alone unlocks nothing.**

## MEASURED 2026-09-01, by rendering rather than by reading the ledger

`helm template gitlab/gitlab --version 8.7.0` against this Application's own
`valuesObject`, summed with k8s semantics (per pod:
`max(sum(containers), max(initContainers)) x replicas`):

| | default | achievable dev | source of the default |
|---|---|---|---|
| cpu | **2525m** | 1350m | chart defaults |
| memory | **5733Mi** | 4191Mi | chart defaults |
| PVC | **76.00 GiB** | 5.00 GiB | 4 claims |

The default render REPRODUCED the ledger's stored `2525m / 5733Mi` and the reason's
`76 GiB` exactly (2525m / 5732Mi / 76.00 GiB -- 1Mi of rounding). That agreement is
why the second column is trustworthy: the same instrument agreed with the existing
numbers before it produced new ones.

Dominant costs: `sidekiq` 900m/5G and `webservice` 1.5CPU/3G are most of the CPU;
`gitaly` 50Gi is two thirds of the disk.

## THE KNOBS, verified against the pinned 8.7.0 subchart values.yaml

CPU/memory: `gitlab.{sidekiq,webservice,gitaly,toolbox,migrations,gitlab-exporter,
gitlab-shell,kas}.resources`, plus top-level `registry.resources` and
`minio.resources`.

Storage: `gitlab.gitaly.persistence.size` (50Gi), `minio.persistence.size` (10Gi),
`postgresql.primary.persistence.size` (8Gi), `redis.master.persistence.size` (8Gi).

## WHY THIS IS NOT A FLAT `valuesObject` EDIT -- the part that cost the attempt

Writing those values straight into `valuesObject` WORKS and was measured to work
(1350m / 4191Mi / 5 GiB, and `lane-partition` then reports
`TOO BIG FOR ONE HOSTED RUNNER: 0`, `covered by a lane: 45/47`). It is still the
wrong mechanism, for two reasons found only by doing it:

1. **It hits every rung.** `resourceProfiles` is `["dev","metal"]` and a rung is
   expressed through `resourceClaims` rows, not through the base values. With no
   claims, `valuesObject` is what renders at BOTH rungs --
   `storage-profiles.test.ts` caught this immediately (metal total moved
   9256m -> 8081m). A dev-sized RESERVATION would silently ship to metal.
2. **Storage has its own ladder**, `profiles: ["minimal","standard","measured",
   "large"]`, separate from the CPU rungs. A flat `persistence.size` applies at
   `large` too -- i.e. a real GitLab would get 2 GiB of git storage.

`storage-profiles.ts --profile NAME --apply` and `--resource-profile NAME --apply`
WRITE the ladder's values into the Applications. The ladder is the mechanism; the
base values are its output, not its input.

## WHAT TO DO

Add gitlab to both ladders and let `--apply` write the values:

* ~10 `resourceClaims` rows (one per component above) with dev + metal values.
  Note the validator requires the ladder to CLIMB and requires a stated
  `consequence` when a request is cut between rungs.
* 4 storage claims (`id`, `path`, `docIndex`, `storageClassField`, `sizeField`,
  `podsField`, `podsSource`, `scheduledAtBringUp`, `bringUpNote`, `consequence`)
  for gitaly / minio / postgresql / redis.
* Then the deferral: `gitlab/**` is in `DEFAULT_ROOT_DEV_CATALOG.excludeGlob`, so
  even a gitlab that fits stays untested until that entry is retired and its reason
  in `argocd-health-test.ts` is updated to say why it no longer holds.

## BLAST RADIUS, measured rather than guessed

The flat attempt turned 8+ checked-in ledger figures red -- the compute-prose
checker, the metal ladder total, the storage ledger audit, the quarantine test, and
the CLI's own exit code. Every one is a number that ENCODES the old gitlab, and each
must become a real reading rather than an edited constant. That is the "separate
blast radius" `storage-profiles.json` already warned about in the sentence
"Governing it is a separate decision with a separate blast radius and is not taken
here."

Maintainer 2026-09-01 authorised taking that decision ("can we not set it's
resources so it will fit? ... it's best practice to have all the limits set
anyways"). This row is the specification for doing it through the ladder instead of
around it.
