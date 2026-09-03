---
id: 081M1DFQ2MZ087G0R000CMNHQX
type: bug
state: in-progress
priority: P2
slug: four-applications-never-reach-healthy-on-k3s-cilium-the-subs
title: "Four Applications never reach Healthy on k3s+Cilium — the substrate metal runs"
created: 2026-09-01T03:20:29.599Z
depends_on: []
composes_with: []
---

# Four Applications never reach Healthy on k3s+Cilium — the substrate metal runs

<!-- Work-item body. ZetaId-keyed (conflict-free, time-sortable). "Backlog" is a
     STATE = this folder; completion moves the file to workitems/done/YYYY/MM/.
     Identity is the zetaid prefix — resolve cross-refs by `081M1DFQ2MZ087G0R000CMNHQX-*.md` glob. -->

## Pre-start checklist

- Prior art: kind `networking.disableDefaultCNI: true` and Cilium's kind install
  path are already in `full-ai-cluster/dev-cluster/profiles/ci.cilium.kind-config.yaml`
  and `docs.cilium.io/en/stable/installation/kind/`. The missing piece was never
  "can kind host Cilium" (`live-kind-cilium` proves that). It was "can the
  included proof CREATE that cluster" — `--existing` is not a supported path.
- Four `--existing` refusals (this item): `UsageError` git-ref; `--ephemeral-vault-init`
  refused with `--existing`; `DevStorageClassMissing`; `DevBootstrapSecretMissing`.
  Do not add a fifth hand-applied preparation step.
- Do not re-lift k3d `--scope included`. The lift condition is these four
  understood, not another green smoke.
- Cilium helm-install follows the Application `targetRevision` (currently
  `1.20.1`, via `shippedCiliumChartVersion()`). Do not bump
  `cilium-install.yaml` (still `1.16.5`, metal first-boot) in this item:
  Cilium forbids skipping minors on an in-place upgrade, and matching the two
  pins is a different job.

## What was measured

The k3d lane was lifted to `--scope included` on 2026-08-31 and reverted on
2026-09-01. It has **never** passed at that scope — it failed on the lift's own
branch, then on `main`, then on every run of the follow-up branch. The same
Applications are unhealthy each time:

    openziti-controller   Unknown   Degraded
    trust-manager         Synced    Degraded
    spire                 Synced    Progressing
    vault                 Unknown   Progressing

    cilium                Unknown   HEALTHY     <- for contrast: the lifted one is fine

`sync=Unknown` is a ComparisonError on the diff, not a sync failure — this repo's
lanes already assert several Applications at `sync=Unknown health=Healthy`. The
signal here is the **health** column.

## Why this is worth a bug and not a deferral

**k3s + Cilium is what metal runs.** Until 2026-08-31 nothing in this repo had
ever reconciled an App-of-Apps on a Cilium cluster: `live-kind-cilium` proves
Cilium installs and serves but runs no ArgoCD; `live-kind-included` reconciles 33
Applications but on kind's default CNI. The k3d lane is the first job that does
both, and the first thing it found is that four Applications do not come up.

So these are plausibly **real metal findings surfaced early**, not k3d artifacts.
That is exactly what the lane was built to do, and it would be a waste to file
them as "k3d is weird".

The honest alternative is stated too: they could be k3d-substrate artifacts (as
the CoreDNS `127.0.0.11` finding turned out to be — see the k3d lane's history).
Distinguishing the two is the work.

## MEASURED 2026-09-01 — the four are TWO classes, and  is the lead

The distinguishing test below was run against an existing GREEN
 job (kindnetd, same 33-app roster, same commit range). No
new CI was needed.

** diverges by substrate:**

    kind (kindnetd)     vault   sync=OutOfSync   health=Healthy
    k3d  (k3s+Cilium)   vault   sync=Unknown     health=Progressing

Same Application, same roster — Healthy on one substrate, never converging on
the other. That is a substrate difference, not an Application defect, and since
k3s+Cilium is what METAL runs it is the one of the four most likely to matter for
hardware. **Investigate this one first.**

**The other three are UNMEASURED, not exonerated.** ,
 and  produce NO verdict line at all in the kind run — they
are not in its asserted set, so there is no kind baseline to compare against.
"Unhealthy on k3d" cannot yet be called a regression or an artifact for them, and
saying so would be inventing a comparison that was never made.

Incidental confirmation worth recording:  is likewise absent from the kind
run, which is exactly what the provider-conditional lift specifies — it is
included on k3d only. The mechanism does what it claims.

**Method caution, because it nearly went the other way.** The first two queries
for these apps returned empty and would have read as "not asserted on kind". The
CONTROL was also empty -- ,  and  came back blank
too, and those are certainly asserted -- which is the only reason the empty
result was recognised as a broken regex (the format is )
rather than a finding. An empty grep is not a measurement.

## MEASURED 2026-09-01 — STEP 2 AS WRITTEN IS NOT A VIABLE TEST

Step 2 below says to run `live-kind-cilium` to separate k3s from Cilium. That lane
was built (`live-kind-cilium-included`, dispatch-gated) and run FOUR times. It has
produced **zero** per-application verdicts, and the reason is structural rather than
incidental: **`--existing` is not a supported path for the `included` proof.**

The probe MUST pass `--existing`, because the no-CNI kind profile cannot schedule
ArgoCD until Cilium is installed, so `cilium-kind-up.ts` has to build the cluster
first. But the `included` proof depends on preparation the harness performs during
ITS OWN cluster creation, and `--existing` skips all of it. Each run surfaced
exactly one more missing piece:

| attempt | refusal | what `--existing` skipped |
|---|---|---|
| 1 | `UsageError` | `ZETA_ARGOCD_GIT_REF` unset in the step (my bug, not a coupling) |
| 2 | `UsageError` | `--ephemeral-vault-init` is refused together with `--existing` |
| 3 | `DevStorageClassMissing` | the `longhorn` dev StorageClass |
| 4 | `DevBootstrapSecretMissing` | `grafana-admin-credentials` in namespace `monitoring` |

**THE GUARDS ARE WHY THIS IS A REPORT AND NOT A NEAR-MISS.** Attempts 3 and 4 each
name the same consequence in their own message: the missing piece would leave pods
Pending or in `CreateContainerConfigError`, **which ArgoCD reports as `Progressing`
rather than `Degraded`** — the EXACT symptom the four Applications show on k3d. Every
one of these gaps would have produced a clean-looking verdict table full of
`Progressing`, and the obvious reading ("Cilium causes it") would have been wrong.
The harness refused four times instead of letting a plausible false answer through.

**DO NOT ADD A FIFTH PREPARATION STEP TO THE JOB.** Three of the four failures are one
defect wearing different clothes, and there is no reason to think the bootstrap secret
is the last: the preparation set is whatever `bringUpKindCiCluster` does, which is not
enumerated anywhere as a list a caller can replay.

**The exit is to make the harness build the cluster.** Give the kind provider a
Cilium-CNI mode so the proof creates and prepares its own cluster and `--existing` is
not needed. That is `argocd-health-test.ts --cni cilium` plus
`bringUpKindCiCluster({ cni: "cilium" })`. The mode exists; `live-kind-cilium-included`
is rewired to one harness invocation with `--ephemeral-vault-init` and no
`--existing`. **State stays in-progress until a dispatch produces per-app
verdicts.** Do not treat the code landing as the distinguishing test.

**Consequence for this item:** step 2 cannot settle `openziti-controller`,
`trust-manager` or `spire` until that lands. `vault` is separately unmeasurable on this
lane at all — the ceremony is refused with `--existing` while the green baseline runs
it, so the two are not comparable even if the proof completes.

The probe lane is kept: it is dispatch-gated, blocks nothing, and now refuses to report
a non-measurement as a roster. It is one harness change away from answering the question.

## MEASURED 2026-09-02 — first `--cni cilium` included dispatch still produced zero verdicts

Dispatch: [run 33684309073](https://github.com/Lucent-Financial-Group/Zeta/actions/runs/33684309073)
`workflow_dispatch` on `main` at `e9adba250776`, `cilium_included_probe=true`.
The probe is **not skipped**. `--existing` is gone. This is the distinguishing
test the item asked for, and it still did not emit per-app lines.

**kind+Cilium included (the probe):**

- Cilium helm-installed 1.20.1. Nodes Ready. Dev StorageClass aliases + grafana /
  ziti / redis-auth secrets minted. ArgoCD installed. Root App-of-Apps applied
  at 21:26:36Z.
- Then 2400s of silence. Failure:

      kind: ArgoCdTimeout
      message: timed out waiting for repo-backed child Applications before git-ref patch
      stderr: Error from server (NotFound): applications.argoproj.io "hat-system" not found

- Verdict table: `ZERO VERDICTS PARSED`. Correctly refused to list the four.
  **openziti-controller, trust-manager, spire, vault remain unmeasured on
  kind+Cilium.** Do not read this as those four being unhealthy.

**kindnetd included (same run, same SHA) DID create children.** Failed later on
`mimir is Unknown/Degraded`. The four at timeout:

    openziti-controller   OutOfSync   Healthy
    trust-manager         Synced      Healthy
    spire                 Synced      Healthy
    vault                 OutOfSync   Healthy

Contrast still red on kindnetd: `mimir` Unknown/Degraded (CrashLoopBackOff +
Pending pods); `arc-controller` Unknown/Healthy; `redis` OutOfSync/Healthy
with all three valkey replicas Running.

So the Cilium cell is a **third class**, earlier than health: App-of-Apps never
produced children in 40 minutes, while kindnetd on the same SHA did. That is
compatible with ArgoCD repo-server failing to clone over Cilium (DNS /
kube-proxy replacement), but run 33684309073 dumped only `NotFound`. The next
dispatch must print `zeta-root-dev` status, the Application list, and
repo-server / application-controller logs at that timeout. Do not invent a
Cilium values tweak from a silent wait.

**Wait defect, not a Cilium finding:** `hat-system` is sync-wave `-10` (the
head of the catalog). Pinning the wait to that NAME made a silent catalog look
like a slow hat-system and spent the entire 2400s health budget on one
NotFound. The next dispatch waits for ANY child other than `zeta-root-dev`,
capped at 180s, dumps the kind LB-IPAM pool (`zeta-lb-pool`) and LoadBalancer
Services at timeout, and refuses in seconds if bring-up dropped the pool
alias. Dispatch that probe on the wait-fix branch, not on current `main` —
another 40-minute hat-system wait is not a second measurement.

## MEASURED 2026-09-02 — run 33695849211 (wait-fix branch, 180s)

Dispatch: [run 33695849211](https://github.com/Lucent-Financial-Group/Zeta/actions/runs/33695849211)
`workflow_dispatch` on `cursor/child-wait-ahead-of-hat-27c5` at `3f13a8c23`,
`cilium_included_probe=true`.

**The wait-fix held.** Child wait logged at 0/60/120s and timed out at 180s.
Not 2400s. Not `hat-system` NotFound.

**The testing load balancer is real:**

    zeta-lb-pool   DISABLED=false  CONFLICTING=False  IPS AVAILABLE=20
    kube-system/cilium-ingress  LoadBalancer  EXTERNAL-IP=172.18.255.200

**Why there are still zero children:** `zeta-root-dev` is Healthy with
`sync=Unknown` and ComparisonError:

    Could not resolve host: github.com

Same class as the k3d CoreDNS `127.0.0.11` finding (2026-08-31). kubeadm
CoreDNS does not import `coredns-custom`, so the k3d ConfigMap would be
ignored on kind. The next probe patches the kubeadm Corefile to
`forward . 1.1.1.1 8.8.8.8` on kind `--cni cilium` only. Do not invent a
Cilium values tweak (`routingMode`, chart bump) from this.

State stays in-progress until a dispatch produces per-app verdicts.

## The distinguishing test

For each of the four, the question is the same and it is answerable:

1. Does it reach Healthy on `live-kind-included` (kindnetd, same 33-app roster)?
   If YES on kind and NO on k3d, the difference is substrate — CNI or k3s.
   If NO on both, it is the Application and kind was never asserting it either.
2. If substrate: is the cause k3s or Cilium? `live-kind-cilium` runs Cilium
   without ArgoCD, so a targeted check there separates the two.

Two named suspects worth checking first, from the shape of the four:
`trust-manager` and `spire` are both certificate/identity infrastructure with
webhook and CA-distribution dependencies, and `openziti-controller` and `vault`
both want persistent identity material. A CNI/DNS-dependent readiness path is the
obvious common thread, and the k3d lane has already produced one DNS defect.

## Do NOT

- Do not re-lift the k3d scope to `included` because a smoke run went green.
  That inference is what produced the revert this item records. The lift
  condition is **these four understood**, not another green smoke.
- Do not defer them into `APPLIED_BUT_UNASSERTED_REASONS` without a measured
  reason. A deferral whose reason is "it was red" is the vacuity class wearing a
  reason's clothes.

## Pointers

- `.github/workflows/k8s-argocd-health-test.yml` — `live-k3d`, and the in-place
  note recording the reverted lift
- `src/Core.TypeScript/cluster/argocd-health-test.ts` — `APPLIED_BUT_UNASSERTED_REASONS`,
  the format a justified deferral takes
- `src/Core.TypeScript/cluster/applied-vs-asserted-agreement.test.ts` — the check
  that the applied and asserted layers agree, added after they did not
