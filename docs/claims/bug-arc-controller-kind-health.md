# Claim - bug-arc-controller-kind-health

- **Session ID:** 019e9b66-4ea9-75e3-9452-c5816b3e945d
- **Harness:** codex
- **Claimed at:** 2026-08-08T22:42:26Z
- **ETA:** 2026-08-09T02:00:00Z
- **Scope:** Diagnose and repair the ARC controller crash in the included kind health proof.
- **Durable target:** `.github/workflows/k8s-argocd-health-test.yml`, `full-ai-cluster/k8s/applications/arc-controller/`, and focused cluster tests
- **Platform mirror:** none

## Notes

The included-cluster job is an allowed failure today. The first step is to
capture controller logs, then correct the smallest proven manifest, version,
or harness defect without weakening the health assertion.
