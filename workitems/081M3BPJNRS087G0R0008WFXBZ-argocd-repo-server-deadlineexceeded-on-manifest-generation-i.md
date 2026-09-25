---
id: 081M3BPJNRS087G0R0008WFXBZ
type: bug
state: backlog
priority: P2
slug: argocd-repo-server-deadlineexceeded-on-manifest-generation-i
title: "ArgoCD repo-server DeadlineExceeded on manifest generation is what stops the roster converging on an installed disk"
created: 2026-09-25T07:13:20.153Z
depends_on: []
composes_with: []
---

# ArgoCD repo-server DeadlineExceeded on manifest generation is what stops the roster converging on an installed disk

<!-- Work-item body. ZetaId-keyed (conflict-free, time-sortable). "Backlog" is a
     STATE = this folder; completion moves the file to workitems/done/YYYY/MM/.
     Identity is the zetaid prefix — resolve cross-refs by `081M3BPJNRS087G0R0008WFXBZ-*.md` glob. -->

## The measurement

**First live run of WP11 verdict 7** (081M3BEGSQR087G0R003610CGB), dispatch
**36097310492**, `only_wp11=true`. Verdicts 1-6 all PASSED on the installed
disk at t=152s — `k3sServiceActive` 16s, `nodeReady` 58s, `helmJobs` 136s,
`rootLanded` 136s, `noBadPods` 152s over 38 pods. The cluster came up.

Then the roster did **not** converge, and the applications are not the cause:

| t (unit clock) | Synced+Healthy |
|---|---|
| 153s | roster empty, `zeta-root sync=Unknown` |
| **1214s** | **25 / 35 — the PEAK** |
| 3007s | 13 / 35 |
| 3579s | 13 / 35 |
| 3652s | 13 / 35 |
| 3730s | 13 / 35 |

**Convergence went BACKWARDS.** 25 Applications were Synced+Healthy at ~20
minutes and only 13 were at ~50 minutes, unchanged across the last four
samples spanning 723 seconds.

## The cause, in ArgoCD's own words

Of 100 `unconverged` rows printed on serial, the message breakdown was:

| count | message |
|---|---|
| 73 | (none — `Progressing` / `OutOfSync` with no message) |
| **19** | `Failed to load target state: failed to generate manifest for source 1 of 1: rpc error: code = DeadlineExceeded desc = context deadline exceeded` |
| 7 | `Failed to load live state: failed to get cluster info for "https://kubernetes.default.svc": error synchronizing cache state : failed to get server version` |
| 1 | `Resource discovery.k8s.io/EndpointSlice cilium-ingress is excluded in the settings` |

The 19 all read **`sync=Unknown`** — ArgoCD never completed a comparison at
all. That is a **ComparisonError**, not an unhealthy application: the
repo-server could not render the source inside its manifest-generation
deadline. Affected apps included `cloudnativepg`, `external-secrets`,
`hat-system`, `headscale`, `kube-prometheus-stack`, `mimir`.

**`zeta-root` itself read `sync=Unknown`** for most of the run, which is why
the roster was never even known to be COMPLETE, and why only 35 Applications
were ever observed (the tree declares 49; the Docker replica sees 42).

The 7 `failed to get server version` rows say the **API server itself** was
intermittently unreachable — corroborated independently by the verdict's own
collection, which could not list Applications at all on 17 of 59 samples
(081M3BP768B087G0R0010C6GPR).

## Why this is a real finding and not a QEMU artifact to wave away

The installed disk IS the product. "ArgoCD's repo-server cannot render ~48
Applications inside its deadline on the hardware a first boot actually has" is
a statement about the shipped configuration, and it is precisely what the
maintainer's question — *will the applications start up when I plug the USB
in* — is asking. **The Docker replica cannot see it**: it runs on a fatter
host and reports 35 of 42 Healthy.

## Candidate directions (not yet investigated)

- `timeout.reconciliation` / the repo-server's manifest-generation timeout and
  its parallelism limit, against a single-vCPU first boot.
- Whether ~48 Applications each re-cloning/rendering the same repo is the
  load, and whether the repo-server cache is cold for each.
- Resource requests for `argocd-repo-server` on a single-node install.

**Do not "fix" this by relaxing WP11 verdict 7's bound.** More wall clock was
measured NOT to help: convergence peaked at t=1214s and regressed thereafter.

## Cross-lane agreement worth keeping

`cilium`'s `ExcludedResourceWarning: Resource discovery.k8s.io/EndpointSlice
cilium-ingress is excluded in the settings` appeared on **real metal here**,
independently of the Docker replica that first measured it. Two lanes with
different substrates naming the same defect is the strongest form that
evidence takes. WP26 owns that fix.
