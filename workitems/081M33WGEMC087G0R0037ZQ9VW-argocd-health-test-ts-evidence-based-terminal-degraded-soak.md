---
id: 081M33WGEMC087G0R0037ZQ9VW
type: bug
state: in-progress
priority: P2
slug: argocd-health-test-ts-evidence-based-terminal-degraded-soak
title: "argocd-health-test.ts: evidence-based terminal Degraded + soak phase for the live-kind-included lane"
created: 2026-09-22T06:23:03.308Z
depends_on: ["081KSXN940008QG0R000SCP2H1"]
composes_with: []
---

# argocd-health-test.ts: evidence-based terminal Degraded + soak phase for the live-kind-included lane

<!-- Work-item body. ZetaId-keyed (conflict-free, time-sortable). "Backlog" is a
     STATE = this folder; completion moves the file to workitems/done/YYYY/MM/.
     Identity is the zetaid prefix — resolve cross-refs by `081M33WGEMC087G0R0037ZQ9VW-*.md` glob. -->

Parent **081KSXN940008QG0R000SCP2H1** (Kubernetes + ArgoCD kind/k3d integration health
tests)'s daily `live-kind-included` lane has been red on the daily schedule since
2026-09-19 (runs 35456502519, 35524259964, 35628762464). Run 35628762464 aborted at
~T+10min of a 2400s budget on `asserted Application is Degraded
(kube-prometheus-stack=Synced/Degraded)` while its pods were simply `PodInitializing`.
`confirmedDegradedTerminalFailure`'s two-consecutive-poll rule cannot distinguish an
ordinary first-rollout Degraded blip from a genuinely dead workload.

Two deliverables, both in PR #17480:

- **Evidence-based terminal Degraded**: `podBlockingReason` / `podStillProvisioning` /
  `degradedApplicationTerminalEvidence` / `evidenceBasedDegradedTerminalFailure` in
  `src/Core.TypeScript/cluster/argocd-health-test.ts`, replacing the sample-count rule
  at the `waitForApplications` call site.
- **A soak phase** ("does it crash-loop after the all-Healthy verdict?"): `runSoakPhase`
  (new `--soak-sec` flag), a STARTUP-RESTARTS report (`startupRestartEntries`), and a
  ratchet (`ratchetStartupRestarts`) against
  `src/Core.TypeScript/cluster/startup-restart-baseline.json`.

Measured fix confirmed live on run 35692573183 (PR #17480, `--soak-sec 300`): the
all-Healthy verdict is now reached without the false-positive abort recurring.
