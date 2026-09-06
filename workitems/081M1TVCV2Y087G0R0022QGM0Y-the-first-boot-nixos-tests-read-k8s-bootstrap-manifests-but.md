---
id: 081M1TVCV2Y087G0R0022QGM0Y
type: bug
state: backlog
priority: P2
slug: the-first-boot-nixos-tests-read-k8s-bootstrap-manifests-but
title: "The first-boot NixOS tests read k8s/bootstrap manifests but never run when those manifests change"
created: 2026-09-06T07:54:44.702Z
depends_on: []
composes_with: []
---

# The first-boot NixOS tests read k8s/bootstrap manifests but never run when those manifests change

<!-- Work-item body. ZetaId-keyed (conflict-free, time-sortable). "Backlog" is a
     STATE = this folder; completion moves the file to workitems/done/YYYY/MM/.
     Identity is the zetaid prefix — resolve cross-refs by `081M1TVCV2Y087G0R0022QGM0Y-*.md` glob. -->

Found 2026-09-06 while continuing the metal-parity work Aaron asked for. **Filed with the
fix priced rather than applied, because every option costs CI minutes in a repo that is
actively being slimmed — that trade is the maintainer's.**

## The measurement

`full-ai-cluster/nixos/tests/k3s-first-boot-apply-order-eval-test.nix` **reads the
bootstrap manifests themselves.** Its own section header says so — *"Reading the manifests
themselves"* — it filters `services.k3s.manifests` entries by `hasPathSource` and opens the
path-sourced ones, naming `spire-install.yaml`, `trust-manager-install.yaml` and
`root-application.yaml` among them. A sibling, `k3s-first-boot-roster.nix`, asserts all 11
rostered manifests are staged and applied.

`.github/workflows/build-ai-cluster-iso.yml` is the only lane that runs them. Its
`paths:` filter covers `full-ai-cluster/nixos/**`, `flake.nix`, `flake.lock`,
`usb-nixos-installer/**`, `tools/setup/**` and a list of `src/` scripts.

**It does not cover `full-ai-cluster/k8s/bootstrap/**` or `infra/k8s/bootstrap/**`.**

So a change to a first-boot manifest does not run the tests that read first-boot manifests.

## Confirmed on this session's own work

PR #16755 changed `infra/k8s/bootstrap/argocd-install.yaml` — the ArgoCD chart pin K3S
installs on metal first boot, moved 7.7.10 → 10.8.0. `build-ai-cluster-iso` has no run for
that branch; its most recent run at the time of writing was 2026-09-06T01:48 on `main`,
before the change existed.

**I edited a first-boot manifest and the first-boot tests did not run.** That is the
finding, and it is not hypothetical because it already happened.

## The irony worth preserving

The apply-order test is scrupulous about exactly this failure, in its own words:

> *"Naming what was not opened is the point: a check that silently skips an input is the
> vacuity class."*

The test names every input it cannot open. The **workflow** silently skips the entire test
when its inputs change. Same defect, one layer out — which is the shape
`docs/research/2026-08-18-five-ways-a-checks-domain-diverges-from-its-apparent-scope.md`
already catalogues.

## Three options, priced

Measured from the last run: `build-iso` took **32 min**, `build-iso-aarch64 + qemu-boot`
**26 min**, in parallel.

| option | cost | closes |
|---|---|---|
| **A.** add the two `k8s/bootstrap/**` globs to `build-ai-cluster-iso.yml` | **~32 min per bootstrap edit** | everything, including the VM tests |
| **B.** a small lane running only the PURE-EVAL checks on `k8s/bootstrap/**` | **seconds** — `k3s-first-boot-apply-order` is `import <eval-test>.nix` plus a trivial `runCommand`, no VM | the apply-order/roster *properties*, not the boot |
| **C.** leave it, and record the gap | free | nothing |

**B is the honest recommendation** and the split is real: `k3s-first-boot-apply-order` is
pure evaluation, while `k3s-first-boot-roster` is a full `nixosTest` whose own header says
it *"REQUIRES INTERNET (five Helm charts and roughly 2-3 GB of images)"*. The cheap half
carries most of the value for a manifest edit — order, roster completeness, and the
before-its-kind-exists property — and costs seconds.

**B adds a workflow**, which cuts against Aaron 2026-09-06: *"zeta is trying to stay
small."* A new lane is a check rather than accreted data, so it is a different kind of
growth than the PR archive — but it is still growth, and that is why this is filed rather
than done.

## Done when

A change to `full-ai-cluster/k8s/bootstrap/**` or `infra/k8s/bootstrap/**` runs at least
`k3s-first-boot-apply-order`, **and** the choice between A, B and C is recorded so the next
reader knows the cheap half was deliberate rather than forgotten.

