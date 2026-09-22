---
id: 081M33QTNVD087G0R002632YDV
type: task
state: backlog
priority: P2
slug: first-boot-replica-measures-root-landed-k3s-deploy-controlle
title: "First-boot replica measures ROOT_LANDED: k3s deploy controller retries root-application.yaml"
created: 2026-09-22T05:01:15.501Z
depends_on: []
composes_with: []
---

# First-boot replica measures ROOT_LANDED: k3s deploy controller retries root-application.yaml

<!-- Work-item body. ZetaId-keyed (conflict-free, time-sortable). "Backlog" is a
     STATE = this folder; completion moves the file to workitems/done/YYYY/MM/.
     Identity is the zetaid prefix — resolve cross-refs by `081M33QTNVD087G0R002632YDV-*.md` glob. -->

## What this closes

`full-ai-cluster/nixos/modules/k3s-server.nix`'s comment block #5 names an open
question: `root-application.yaml` (an `argoproj.io/v1alpha1 Application`) is
submitted by k3s's deploy controller within seconds of first boot, into an API
server that has never heard of that kind — the ArgoCD Helm chart is what
creates the CRD, minutes later. Whether the deploy controller RETRIES an
unknown-kind apply was, as of 2026-09-22, "NOT established anywhere in this
repo."

`src/Core.TypeScript/cluster/first-boot-replica.ts` (WP1, PR TBD) boots the
REAL manifest roster in a Docker container matching k3s-server.nix's
extraFlags/roster, and measures the answer directly:

**VERDICT: ROOT_LANDED.** `applications.argoproj.io/zeta-root` exists in the
`argocd` namespace once the ArgoCD chart's HelmChart Job completes. The deploy
controller DOES retry the unknown-kind apply and self-heals once the CRD
exists — the outcome the design silently assumed, now measured rather than
hoped for.

## What else the same run measured (ordering evidence)

- `cert-manager`'s helm-install Job retried repeatedly before succeeding,
  waiting for Cilium to supply a CNI and pods to leave the not-ready taint —
  matches the roster comment's documented intent exactly.
- `trust-manager`'s helm-install Job retried repeatedly with
  `failed calling webhook "webhook.cert-manager.io": ... no endpoints
  available for service "cert-manager-webhook"` until cert-manager's webhook
  pod had endpoints — a service-READINESS race the file-order comment does not
  claim to solve, distinct from the submission-order property it does claim.
- k3s's own `helm-install-*` Jobs use `restartPolicy: OnFailure` with a
  SINGLE pod per chart, not one fresh pod per attempt — so
  `job.status.failed` never increments even after several retries; the real
  retry count is only visible on that one pod's
  `containerStatuses[].restartCount`. The harness's stage-3 counter was fixed
  to read pod restarts (job.status.failed alone under-reports every retry as
  zero).

## Measured (first end-to-end local run, 2026-09-22, Docker Desktop / WSL2)

| stage | verdict | elapsed |
|---|---|---|
| 1 k3s API up | PASS | 13.1s |
| 2 Cilium Running + node Ready | PASS | 65.3s |
| 3 every HelmChart Job Succeeded (7 charts) | PASS | 139.3s |
| 4 root-application lands | PASS — **ROOT_LANDED** | 0.9s |
| 5 child Applications appear | PASS (4+ beyond zeta-root) | 151.9s |
| 6 convergence report | best-effort; found a real bug in this run — see below |
| 7 dual-owner churn check | found a real bug in this run — see below |

No dual-owner churn observed on the corrected mechanism (see below);
argocd/cilium/cert-manager/spire/spire-crds/trust-manager/external-secrets
each converged to a stable helm-release resourceVersion once their
helm-install Job succeeded.

## Two more bugs this same run exposed, both in the harness (fixed)

- **Stage 6 silently reported 0 Applications.** `kubectl -n argocd get
  applications.argoproj.io -o json` was polled once, at the very end of an
  8-minute fixed observation window, with the failure path swallowed by a
  bare `catch {}`. Fixed: the exit status and parse failure are now logged
  instead of silently producing an empty list — a check that can fail
  silently is the same vacuity class as one that can never fail.
- **Stage 7's dual-owner check queried the wrong namespace for 5 of 6
  components.** It read `kubectl -n kube-system get secret -l
  owner=helm,name=<chart>` for every chart, but the Helm release Secret lives
  in `spec.targetNamespace`, and MEASURED: argocd->argocd,
  cert-manager->cert-manager, external-secrets->external-secrets,
  spire/spire-crds->spire, trust-manager->cert-manager — only cilium actually
  targets kube-system. So the check found evidence for cilium alone and
  silently reported "no churn" for the other five without ever having looked.
  Fixed: `HelmChartRef` now carries `targetNamespace`, and the check queries
  it directly. Also added a second, independent signal: the corresponding
  ArgoCD Application's own `sync.status` sampled over the same window, so a
  component with no k3s-side Helm secret write can still show ArgoCD
  oscillating (which is what "two reconcilers fighting" looks like from the
  side that doesn't use classic Helm release tracking at all).

## Not yet closed

- **NixOS metal itself was not booted** — this is a Docker replica configured
  to match k3s-server.nix's declared flags/roster, not the NixOS VM test
  (`nixos/tests/k3s-first-boot-roster.nix`, still unbuilt by any workflow —
  needs a KVM host). The Docker replica is corroborating evidence, not a
  substitute for that VM test ever running.
- Whether `k3s-first-boot-roster.nix`'s own three-verdict logic (VERDICT A/B/C)
  agrees is untested — nobody has run it.

## Pointers

- `src/Core.TypeScript/cluster/first-boot-replica.ts` / `.test.ts`
- `full-ai-cluster/nixos/modules/k3s-server.nix` comment block #5 (the question)
- `full-ai-cluster/nixos/tests/k3s-first-boot-roster.nix` (the still-unbuilt VM test)
- `.github/workflows/first-boot-replica.yml` (the new CI lane)
