---
id: 081M38GCTFX087G0R003MMTXJE
type: task
state: backlog
priority: P2
slug: first-boot-replica-diagnose-fix-the-3-real-stage-6-fails-cil
title: "first-boot-replica: diagnose+fix the 3 real stage-6 FAILs (cilium restart, spire-server StatefulSet patch, weaviate stuck Progressing)"
created: 2026-09-24T01:27:33.629Z
depends_on: []
composes_with: []
---

# first-boot-replica: diagnose+fix the 3 real stage-6 FAILs (cilium restart, spire-server StatefulSet patch, weaviate stuck Progressing)

<!-- Work-item body. ZetaId-keyed (conflict-free, time-sortable). "Backlog" is a
     STATE = this folder; completion moves the file to workitems/done/YYYY/MM/.
     Identity is the zetaid prefix — resolve cross-refs by `081M38GCTFX087G0R003MMTXJE-*.md` glob. -->

## Status (2026-09-24, branch claude/replica-remaining-failures)

Two of three FIXED and live-verified; one remains genuinely unknown.

### spire — FIXED (two independent bugs, both confirmed live)

1. Bootstrap `helm-install-spire` job permanently CrashLoopBackOff'd (66
   retries / 97 min, run 35946414428): ArgoCD's own spire Application can
   apply `spiffe-csi-driver` ServiceAccount before the bootstrap Helm
   release ever completes, and Helm 3's ownership check then refuses that
   object forever (no `meta.helm.sh/*` annotations). Fixed with
   `takeOwnership: true` on `full-ai-cluster/k8s/bootstrap/spire-install.yaml`
   (k3s helm-controller's own field for exactly this). CONFIRMED: run
   35954645236 shows `spire=OK(0 retries)`.
2. `isKnownSpireAgentDnsCrashLoop` missed the SAME confirmed-non-metal
   hostNetwork-DNS artifact when sampled mid-`Running` between crashes
   (category UNKNOWN, not CRASHLOOP). Widened in
   `src/Core.TypeScript/cluster/first-boot-replica.ts`. CONFIRMED: run
   35954645236 reclassifies spire FAIL -> DIVERGENCE.

### cilium — FIXED, awaiting one more live confirmation run

`cilium-ca` / `hubble-relay-client-certs` / `hubble-server-certs` are
self-signed fresh on every `helm template` render (confirmed offline via a
two-render diff) — the same `randAlphaNum`-class drift weaviate's
Application.yaml already documents for its own Secret. LIVE-CONFIRMED via
the application-controller's own log (run 35965954133): repeated partial
self-heal syncs, `SelfHealAttemptsCount` climbing, touching exactly these 3
Secrets forever, while every DaemonSet/Deployment cilium owns reads Healthy
by the book (generation==observedGeneration, every replica Ready). Fixed
with the same `ignoreDifferences` + `RespectIgnoreDifferences=true` remedy
weaviate already uses, in
`full-ai-cluster/k8s/applications/cilium/Application.yaml`. A run triggered
after this fix landed (35973094280 or later) should show cilium leave FAIL.

### weaviate — STILL UNKNOWN, evidence gathered, no root cause found

`weaviate` FAILs stage 6 with `health=Progressing with no classified pod
issue attributed to it`, every single triggered run (35936015368,
35946414428, 35954645236, 35960112028, 35965954133). Ruled out:

- Pod/StatefulSet state: `weaviate-0` 1/1 Running, 0 restarts, StatefulSet
  1/1 Ready the whole run. `.metadata.generation == .status.observedGeneration`,
  `.status.currentRevision == .status.updateRevision` (checked directly,
  run 35954645236 and 35965954133) — NOT a controller-catching-up lag.
- `.status.health` on the Application itself carries only
  `{lastTransitionTime, status}` — no `message` from gitops-engine.
- application-controller's own log (run 35965954133, 36 matching lines over
  ~20 min / 7 reconcile cycles): `sync: Synced` the ENTIRE time, "Skipping
  auto-sync: application status is Synced" every cycle, NO `Tasks (dry-run)`
  ever logged (unlike cilium — nothing is being re-synced), yet health never
  transitions out of Progressing. `health_ms=0` on every reconcile.
- Namespace events: nothing unusual — normal PVC provisioning
  (`rancher.io/local-path`, WaitForFirstConsumer -> Bound), normal image
  pulls, no Warnings at all.

Next steps for whoever picks this up: the app is Synced with a converged
StatefulSet and NO resync loop, yet ArgoCD's health computation is stuck.
Worth checking: (a) whether `PersistentVolumeClaim` health (gitops-engine
DOES have a health check for it) is somehow in play even though it doesn't
appear in `status.resources[]` for a volumeClaimTemplate-derived PVC; (b)
whether this is an ArgoCD version-specific health-check bug reproducible
independent of this repo's chart/values (try the upstream weaviate chart
with minimal values on a throwaway ArgoCD instance); (c) an
`argocd app get --hard-refresh` equivalent (force a full re-evaluation,
bypassing the 2-minute comparison cache) to see if the STUCK status is a
one-time caching artifact from early in the run that a full refresh clears.

Evidence for all of the above is in the job logs of the runs cited; the
`collectAppFailureDiagnostics` function added to `first-boot-replica.ts`
this round captures describe/logs/events/generation-fields/health/
controller-log for any future FAIL automatically.
