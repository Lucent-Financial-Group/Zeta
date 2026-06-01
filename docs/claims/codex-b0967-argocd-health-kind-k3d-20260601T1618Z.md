---
slug: codex-b0967-argocd-health-kind-k3d-20260601T1618Z
task: B-0967 Kubernetes and ArgoCD integration health tests via kind/k3d
claimed-by: Vera / OpenAI Codex
claimed-at: 2026-06-01T16:18:00Z
branch: claim/codex-b0967-argocd-health-kind-k3d-20260601T1618Z
paths:
  - tools/cluster/
  - .github/workflows/
  - full-ai-cluster/dev-cluster/
  - docs/backlog/P1/B-0967-kubernetes-argocd-kind-k3d-integration-health-tests-separate-from-usb-iso-aaron-2026-05-31.md
excludes:
  - tools/zflash/test-harness/
  - full-ai-cluster/tools/zflash*
  - docs/backlog/P1/B-0891-zflash-done-acceptance-criteria-qemu-test-harness-5-scenarios-initial-format-cluster-up-reformat-with-retention-reformat-from-scratch-cluster-joining-aaron-2026-05-28.md
status: active
---

# Claim: B-0967 ArgoCD health via kind/k3d

Implement the first TypeScript-first integration harness slice for ArgoCD
health in an ephemeral local Kubernetes cluster. The slice is intentionally
separate from B-0891 USB/ISO zflash retention proof so cluster-health failures
and USB-retention failures keep crisp attribution.

Initial target:

- add a structured `tools/cluster/` health-test entrypoint that can dry-run and
  run against an existing or newly created k3d/kind cluster,
- reuse the existing `full-ai-cluster/k8s/bootstrap` and App-of-Apps manifests,
- report missing Docker/k3d/kind/kubectl/helm dependencies as named failures,
- add CI wiring on a path-filtered cadence without pulling this into zflash.

Release condition: PR carries the implementation and removes this claim file.
