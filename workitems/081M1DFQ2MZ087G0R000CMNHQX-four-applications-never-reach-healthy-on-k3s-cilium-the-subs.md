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

## MEASURED 2026-09-03 — run 33697305243 (CoreDNS-fix SHA `bd240fbd2`)

Dispatch: [run 33697305243](https://github.com/Lucent-Financial-Group/Zeta/actions/runs/33697305243)
`workflow_dispatch` `cilium_included_probe=true` on
`cursor/child-wait-ahead-of-hat-27c5`. Proof failed at 00:46:47Z
(`ApplicationUnhealthy`). That is a **roster**, not another silent catalog.

**The four this item asked about are Healthy on kind+Cilium:**

    openziti-controller   OutOfSync   Healthy
    trust-manager         Synced      Healthy
    spire                 Synced      Healthy
    vault                 OutOfSync   Healthy

Same shape as kindnetd on run 33684309073. Cilium is not the cause.
Do not invent a Cilium values tweak. Do not re-lift k3d `--scope included`.

**Asserted failures on this probe** (not the four):

    arc-controller   Unknown   Degraded
    mimir            Unknown   Degraded

kindnetd included on the **same SHA** failed only on `mimir`. `mimir` is
Otto's live-cluster item (`081M1FG1RCW`). `arc-controller` Degraded on
Cilium and not in the kindnetd failure set is a named residual, not a
reason to tweak Cilium helm values.

**CoreDNS fix held:**

    configmap/coredns patched
    forward . 1.1.1.1 8.8.8.8
    children appeared (vault unsealed at 00:06:26Z)

**Testing load balancer assigned three addresses:**

    zeta-lb-pool   IPS AVAILABLE=18
    kube-system/cilium-ingress   172.18.255.200
    weaviate/weaviate           172.18.255.201
    weaviate/weaviate-grpc      172.18.255.202

weaviate Application: `OutOfSync/Healthy`. Residual OutOfSync is
`StatefulSet/weaviate` rolling update complete. That is the LIFTS WHEN
for asserting weaviate on kind `--cni cilium` only. kindnetd still has no
LoadBalancer. Do not lift the metal `cilium-lb-ipam` Application.

The probe's "ZERO VERDICTS PARSED" line is a **log-grep miss**: the harness
prints JSON, not `=== name: sync=` lines. The cluster dump has the roster.
The verdicts step now reads kubectl.

## MEASURED 2026-09-03 — run 33701456828 (weaviate asserted)

Dispatch: [run 33701456828](https://github.com/Lucent-Financial-Group/Zeta/actions/runs/33701456828)
`workflow_dispatch` `cilium_included_probe=true` on
`cursor/cilium-catalog-dns-failfast-27c5` at `6a4f54eb5`. Probe job
`100482190681` failed at 01:44:31Z (`ApplicationUnhealthy`). kubectl
printed the roster. ZERO VERDICTS: 0 hits. Health wait ended
`32/34 ok` with the same two laggards from T+743s through 2400s.

**weaviate was asserted** (`dir: weaviate` `excludedFromDev: false`)
and is `OutOfSync/Healthy`. It is **not** in `failure.detail`.
kindnetd on the same run still has `weaviate` `excludedFromDev: true`.

**The four remain Healthy:**

    === openziti-controller: sync=Unknown health=Healthy
    === trust-manager: sync=Synced health=Healthy
    === spire: sync=Synced health=Healthy
    === vault: sync=OutOfSync health=Healthy

**`failure.detail` is only those two:**

    arc-controller   Unknown   Degraded
    mimir            Unknown   Degraded

**kindnetd included on the same run** (job `100482190605`, failed
01:47:00Z) is `31/32 ok`; `failure.detail` is only `mimir`
Unknown/Degraded. `arc-controller` Degraded is Cilium-lane residual,
not a Cilium helm-values finding, not Otto's mimir item.

LoadBalancer IPs from `zeta-lb-pool` (DISABLED=false, CONFLICTING=False,
IPS AVAILABLE=18):

    kube-system/cilium-ingress   172.18.255.200
    weaviate/weaviate           172.18.255.201
    weaviate/weaviate-grpc      172.18.255.202

Corefile still `forward . 1.1.1.1 8.8.8.8`.

State stays in-progress: the kind+Cilium cell has per-app verdicts
(the four are Healthy; weaviate is asserted and Healthy). Remaining is
k3d/k3s, plus named residuals `mimir` and `arc-controller`. Do not
invent a Cilium values tweak. Do not lift the metal `cilium-lb-ipam`
Application. Do not re-lift k3d `--scope included`. Do not dispatch
another competing Cilium included probe: 33701456828 already measured
the weaviate assert.

## Landed 2026-09-03 — wait-fix + kind+Cilium CoreDNS on `main`

PR #16412 squash `db60442338`. Child wait is any child, 180s, not
`hat-system`. Kind `--cni cilium` rewrites the kubeadm Corefile to
`forward . 1.1.1.1 8.8.8.8` after the LB-IPAM alias. Measured on
33697305243 (pre-squash `bd240fbd2`) and confirmed on 33701456828.

## Landed 2026-09-03 — catalog DNS fail-fast + weaviate on kind+Cilium

PR #16419 squash `18367ea19`, AceHack 02:40:33Z. On `main`:

- Catalog `github.com` ComparisonError is a **terminal** `ArgoCdTimeout`.
- Health wait logs `N/M ok` plus named laggards every 60s.
- Probe verdicts come from kubectl, not a `=== name: sync=` grep.
- weaviate is asserted on kind `--cni cilium` only. kindnetd/k3d still
  exclude it. Metal `cilium-lb-ipam` stays excluded.
- Hostname match is the regex, not `text.includes("github.com")`.

Kind+Cilium cell is closed for the four (Healthy) and for weaviate
(asserted and Healthy). Item stays in-progress for k3d/k3s plus named
residuals `mimir` (`081M1FG1RCW`) and `arc-controller`. Do not invent a
Cilium values tweak. Do not re-lift k3d `--scope included`. Do not
dispatch another competing Cilium included probe.

## MEASURED 2026-09-03 — k3d included lift 33429761222 is a cascade, not four independent defects

Source: [run 33429761222](https://github.com/Lucent-Financial-Group/Zeta/actions/runs/33429761222)
(`feat(k8s): lift the k3d lane from smoke to included`, job `99614682092`
`live k3d ArgoCD health`, 2026-08-31). Revert was #16218. This is a
**diagnostic dump of that already-run included lift**, not another
included proof.

**`failure.detail` at included:**

    cert-manager           Unknown   Progressing
    openziti-controller    Unknown   Degraded
    spire                  Synced   Progressing
    trust-manager          Synced   Degraded
    vault                  Unknown   Progressing

**Runtime (the dump):**

- **cert-manager controller CrashLoopBackOff** (17 restarts):
  `the Gateway API CRDs do not seem to be present, but ExperimentalGatewayAPISupport is set to true`.
- **trust-manager** ContainerCreating 40m: `FailedMount` secret
  `trust-manager-tls` not found (cert-manager never issued it).
- **openziti** Init:0/1: `FailedMount` ConfigMap
  `ziti-controller-ctrl-plane-cas` missing; secrets
  `ziti-controller-ctrl-plane-client-identity-secret`,
  `ziti-controller-web-identity-secret`,
  `ziti-controller-ctrl-plane-identity-secret` missing.
- **spire-agent** CrashLoop: `lookup spire-server.spire on 10.43.0.10:53: dial udp 10.43.0.10:53: i/o timeout`.
  Server + SPIFFE CSI Running. **Separate** from cert-manager (CoreDNS/UDP
  to cluster DNS). Do not invent a Cilium `routingMode` tweak from it.
- **vault-0** 0/1 Running (not Ready). Not fully dumped.

**Lead for trust-manager / ziti (and likely vault certs):** k3d bring-up
**did not apply Gateway API CRDs**. Metal does (`k3s-server.nix`
`aa-gateway-api-crds` first). Kindnetd applies remote
`gateway-api` v1.2.0. Kind `--cni cilium` applies vendored
`full-ai-cluster/k8s/bootstrap/gateway-api-crds.yaml`. k3d skipped all of
that. The kindnetd log line even said `"kind/k3d"` while the call was
**only** on the kindnetd branch.

Three of the four (openziti, trust-manager, and the cert-manager smoke
anchor that feeds them) are **one cascade**. spire-agent DNS i/o timeout
is a **second k3s/k3d class**. Do not collapse it into Gateway API.

**Distinguishing table (the useful artifact):**

| Substrate | The four |
|---|---|
| kindnetd | Healthy |
| kind+Cilium | Healthy |
| k3d (k3s+Cilium) | Degraded / Progressing |

Isolates to **k3s vs k3d**, not Cilium. Next software is k3d bring-up
applying the **vendored** metal bundle (same file, never the GitHub
remote — CI already RST'd `helm.cilium.io`). That is matching metal
first-boot order. It is **not** a Cilium values tweak and **not** a
k3d included re-lift.

**Split (AceHack + Otto, 2026-09-03):** Otto takes mimir (`081M1FG1RCW`).
Riven keeps this item. Hardware/USB stays Riven by default. Ownership of
a loop, not a wall. Otto's mimir note (do not steal): static path is
coherent; strongest live lead is Kafka ingest
(`docker.io/apache/kafka-native:4.1.0`), look there before S3.
Seaweedfs 4.33 was fail-open with zero identities; 4.45 made auth real;
consumers already carry matching credentials, so that is not the break.

## MEASURED 2026-09-03 — live-k3d smoke with vendored CRDs (run 33739778288)

Job `100600115401` on SHA `d83e0b643` **succeeded**. This is the
diagnostic, not a re-lift.

**Gateway API CRDs present** (bring-up applied the vendored bundle;
dump is not NONE):

    gatewayclasses.gateway.networking.k8s.io
    gateways.gateway.networking.k8s.io
    grpcroutes.gateway.networking.k8s.io
    httproutes.gateway.networking.k8s.io
    referencegrants.gateway.networking.k8s.io

**cert-manager cascade is broken.** Contrast 33429761222 (17
CrashLoopBackOff restarts, no TLS):

    cert-manager Application   Synced   Healthy
    cert-manager-* pods        1/1 Running, RESTARTS=0
    trust-manager pod         1/1 Running, RESTARTS=0
    CertificateIssued         certificaterequest/trust-manager-1
                              "Certificate fetched from issuer successfully"

**The four at dump (smoke does not wait for them; NOT FOUND/Missing is
honest at T+~60s of cert-manager):**

    openziti-controller   OutOfSync   Missing
    trust-manager         OutOfSync  Missing   (pod already 1/1 Running)
    spire                 Synced      Progressing
    vault                 Synced      Progressing   (vault-0 0/1 Running)

**spire-agent is the remaining second class, live:** `spire-agent-fhvdt`
0/1 Running, 2 restarts, hostNetwork IP `172.18.0.2`. Server + SPIFFE CSI
2/2. `-l app=spire-agent` printed no logs (label miss); the restart count
is the measurement. Do not invent a Cilium `routingMode` tweak. Do not
re-lift `--scope included` because smoke went green.

**Sibling on the same run:** `live kind included` failed
`ApplicationUnhealthy` with `failure.detail` **only** `mimir`
Unknown/Degraded. Otto `081M1FG1RCW`. This change did not leak onto
kindnetd. `live kind Cilium CNI` succeeded. Probe stayed skipped.

## Chart fact (2026-09-03) — the dump's `-l app=spire-agent` cannot see the agent

spire-agent 0.24.2 `daemonset.yaml` **hardcodes** (not a values key, so
the Application cannot turn it off):

    hostNetwork: true
    dnsPolicy: ClusterFirstWithHostNet

Selector labels, MEASURED on live-k3d 33751425785 (not the helper's
`.Chart.Name`):

    app.kubernetes.io/name: agent
    app.kubernetes.io/instance: spire
    app.kubernetes.io/component: default

DaemonSet name is `spire-agent`. There is no `app=spire-agent` label.
That is why smoke 33739778288 printed an empty log block while the pod
was 0/1 with 2 restarts. The dump now logs `daemonset/spire-agent`.

## MEASURED 2026-09-03 — live-k3d smoke 33751425785, dump can see the agent

Job `100636645454` on SHA `d81e93441` (PR #16501)
[run 33751425785](https://github.com/Lucent-Financial-Group/Zeta/actions/runs/33751425785)
**succeeded**. Dump is no longer empty.

**The four at dump (smoke, T+~42s of the agent):**

    openziti-controller   OutOfSync   Missing
    trust-manager          OutOfSync  Progressing
    spire                  Synced     Progressing
    vault                  Synced      Progressing

**spire-agent CrashLoop, and it is NOT the DNS timeout yet:**

    could not parse trust bundle: open /run/spire/bundle/bundle.crt: no such file or directory

Both current and `--previous` logs are that one line. hostNetwork=true,
dnsPolicy=ClusterFirstWithHostNet, host IP `172.18.0.2`.

**Why the bundle is missing:** `spire-server-0` is **0/2 Pending**.
PVC `spire-data-spire-server-0` is still
`ExternalProvisioning` on `rancher.io/local-path` (helper-pod
ContainerCreating). The server writes `bundle.crt` into the ConfigMap
at runtime. No server → empty mount → agent CrashLoop. This is the
startup race smoke always sees. It is **not** the included-class
`lookup spire-server.spire on 10.43.0.10:53: i/o timeout` from
33429761222, where server + CSI were already Running.

**kube-dns is programmed:** ClusterIP `10.43.0.10`, endpoints
`10.143.0.41` (cluster-pool). `cilium-dbg service list` was grepped
with stderr discarded and printed nothing — next dump prints the
list without swallowing exec failure.

Do not invent a Cilium values tweak. Do not re-lift `--scope included`.
The included-class DNS timeout is still the remaining second class
**after** the server writes the bundle. Smoke cannot see it while
the PVC is still provisioning.

## MEASURED 2026-09-03 — k3d skipped metal's `control-plane` hosts + SAN, and never waited for nodes Ready

Smoke 33754516236 dump, T+~47s of catalog:

- kube-dns already had cluster-pool IP `10.143.0.138` (CNI assigned once)
- cert-manager, trust-manager, SPIFFE CSI: ContainerCreating, no pod IP
- `cilium-dbg` failed `container not found ("cilium-agent")`
- PVC `spire-data-spire-server-0` still Pending

That is not "Cilium never installed". Helm `--wait` is Cilium pods.
k3d create is `wait: false` because there is no CNI yet. kind `--cni
cilium` then calls `waitForAllNodesReady(180)`. k3d did not.

Separately, metal `k3s-server.nix` maps `control-plane -> 127.0.0.1` on
the founder and `--tls-san=control-plane` so Cilium can dial the
Application's `k8sServiceHost: control-plane`. k3d skipped both (the
same class as skipping Gateway API CRDs). Helm deltas the host to the
Docker DNS name; ArgoCD's cilium Application wants the metal name back.

Next software is matching those metal first-boot facts, **not** a
Cilium values tweak and **not** an included re-lift. The CI profile
(agents: 0) may `hostAliases` 127.0.0.1 on every node it creates. The
local three-node profile must SAN the cert and write founder hosts on
the server container only — the same mapping on an agent is the
joining-node defect `k3s-server.nix` refuses.

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

- `.github/workflows/k8s-argocd-health-test.yml` — `live-k3d`, the
  in-place note recording the reverted lift, and the always() dump of
  Gateway API CRDs + the four + `daemonset/spire-agent` logs + PVC/CM
- `src/Core.TypeScript/cluster/provider-coverage.test.ts` — dump must
  not use a label the chart never sets, and must not swallow cilium-dbg
- `src/Core.TypeScript/cluster/provider-coverage.test.ts` — dump must
  not use a label the chart never sets
- `src/Core.TypeScript/cluster/argocd-health-test.ts` — `APPLIED_BUT_UNASSERTED_REASONS`,
  the format a justified deferral takes
- `src/Core.TypeScript/cluster/applied-vs-asserted-agreement.test.ts` — the check
  that the applied and asserted layers agree, added after they did not
