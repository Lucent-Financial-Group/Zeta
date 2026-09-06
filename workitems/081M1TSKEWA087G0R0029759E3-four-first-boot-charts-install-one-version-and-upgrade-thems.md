---
id: 081M1TSKEWA087G0R0029759E3
type: bug
state: backlog
priority: P2
slug: four-first-boot-charts-install-one-version-and-upgrade-thems
title: "Four first-boot charts install one version and upgrade themselves in the first sync wave"
created: 2026-09-06T07:23:24.426Z
depends_on: []
composes_with: []
---

# Four first-boot charts install one version and upgrade themselves in the first sync wave

<!-- Work-item body. ZetaId-keyed (conflict-free, time-sortable). "Backlog" is a
     STATE = this folder; completion moves the file to workitems/done/YYYY/MM/.
     Identity is the zetaid prefix — resolve cross-refs by `081M1TSKEWA087G0R0029759E3-*.md` glob. -->

Aaron 2026-09-06: *"continue with our k8s/helm testing that closely matches metal in CI."*
This is what that testing found on its first run.

## The measurement

Four charts are installed **twice** on the same cluster at different times — by a
`helm.cattle.io/v1` HelmChart that K3S auto-applies on **NixOS first boot**, and by an
ArgoCD Application that adopts the same Helm release once ArgoCD is up — and the two pin
**different versions**:

| chart | first boot | Application | gap |
|---|---|---|---|
| `cert-manager` | v1.16.2 | v1.21.1 | 5 minor, **CRD-bearing** |
| `external-secrets` | 0.10.7 | 2.10.0 | **major**, 0.x → 2.x |
| `spire-crds` | 0.5.0 | 0.6.1 | **pure CRD chart** |
| `trust-manager` | v0.15.0 | v0.24.0 | **CRD-bearing** |

The other four bootstrap pins agree (`argo-cd` ×2, `cilium`, `spire`).

## Why it matters, in the tree's own words

`argocd-install.yaml`'s header, written after the incident it describes:

> *"a bootstrap behind the self-managed Application means a mid-run self-upgrade, which is
> exactly the failure that cached the seaweedfs manifest error."*

Measured on run 33736439359 (2026-09-03): ArgoCD v2.13.2 could not render a Helm-4-only
template, the repo-server **cached** the manifest-generation error per revision, and the
wave −90 self-upgrade arrived too late to clear it. seaweedfs then read `health=Healthy`
**vacuously**, with zero applied resources.

`trust-manager-install.yaml` states the same coupling for a **value** rather than a
version: the bootstrap and the Application *"share a Helm release"*, so a mismatch is
*"two reconcilers flipping the flag against each other."* That reasoning applies to the
chart version identically, and was never extended to it — the file guards the smaller half
of its own hazard.

## Why nothing caught it

**No CI lane applies `*/k8s/bootstrap/` at all.** The kind and k3d lanes bring ArgoCD up
from `dev-cluster/use-cases.ts`. So first boot is the least-exercised surface in the tree,
and a divergence there is invisible to every live lane. `validate-bootstrap.ts` checks that
each HelmChart pins an *exact* version — it never asks whether that version agrees with
anything else.

## What is done, and what is not

**Done:** `audit-bootstrap-application-pin-parity.ts`, text-only and offline — which is what
lets it cover a path no CI cluster takes — wired into `cross-verify` as two legs. All four
pairs are **acknowledged** in `bootstrap-application-pin-parity.baseline.json` with a reason
and a lift condition each. The key carries **both** versions, so paying a debt makes its
entry stale and the audit says so.

**Not done, deliberately:** the pins are not bumped. Each bootstrap CR carries its own
`valuesContent`, so a bump is a real cluster change per chart that needs those values
re-rendered at the new version first. Four blind bumps to charts that install on real
hardware at first boot is exactly the guessing this repo refuses elsewhere.

## Suggested order, if these are paid

1. **`spire-crds`** — cheapest. No `valuesContent` to re-render; the check is that 0.6.1's
   CRDs suit spire 0.24.2, which is already pinned equal on both sides.
2. **`cert-manager`** — before trust-manager, which consumes its CRDs.
3. **`trust-manager`** — after cert-manager, and extend its `MUST MATCH` note to name the
   version so the file states its whole coupling.
4. **`external-secrets`** — a migration rather than a bump. If 2.10.0 turns out wrong for
   first boot, moving the **Application down** to the bootstrap's line closes it equally.

## Done when

All four pairs agree, each having been re-rendered at its new version — or the baseline is
empty because the divergences were closed the other way. Either ends with an audit that
passes because the tree is right, not because the roster is long.

