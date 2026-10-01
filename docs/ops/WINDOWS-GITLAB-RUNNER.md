# Windows GitLab runner on KubeVirt

Run Windows CI jobs on the cluster: a Windows VM hosted by KubeVirt that registers itself with the
in-cluster GitLab as a runner tagged `windows`. **Opt-in** — nothing here is applied by a fresh install,
nothing here ships or downloads Windows, and the cluster keeps tracking `main` (GitOps, no reflash).

Read this first: [what is proven and what is not](#what-is-proven-and-what-is-unproven). No Windows image
exists in CI, so the guest's boot and the runner's registration have **never been run**. The runbook is
written so you find out quickly and unambiguously which step failed.

## What you get

| Piece | File | Applied by |
|---|---|---|
| Runner record + `glrt-` token Secret `gitlab-windows-runner-token` | `full-ai-cluster/k8s/examples/gitlab-windows-runner-token.yaml` | you, once |
| The Windows guest (disk, drivers, bootstrap, RDP Service) | `full-ai-cluster/k8s/examples/kubevirt-windows-gitlab-runner.yaml` | you, after editing one line |
| KubeVirt + CDI (the hypervisor layer) | `k8s/applications/kubevirt`, `k8s/applications/cdi` | the first-boot roster (`zeta-virt-first-sync`) |
| GitLab and its Linux runner | `k8s/applications/gitlab` | ArgoCD |

Both example files live beside, not under, `k8s/applications/`, for the reason recorded in
`kubevirt-windows-vm.yaml`: ArgoCD's root reads only `applications/*/Application.yaml` (so nothing syncs
them), and the audits that price the cluster walk that tree for volume claims, so a 64Gi claim inside it
would be counted as always-on demand that no sync provisions.

### The tag contract (why this is safe next to the Linux runner)

| | Linux runner (`zeta-cluster`) | Windows runner (`zeta-windows`) |
|---|---|---|
| tags | `kubernetes`, `zeta-cluster` | `windows`, `zeta-windows` |
| takes untagged jobs | **yes** | **no** |
| minted by | Job `gitlab-runner-token` (in the GitLab Application) | Job `gitlab-windows-runner-token` (this runbook) |
| token Secret | `gitlab-gitlab-runner-secret` | `gitlab-windows-runner-token` |

A tag-less `.gitlab-ci.yml` can never land on Windows, and `tags: [windows]` can never land on Linux.
`src/Core.TypeScript/cluster/gitlab-windows-runner.test.ts` reads both sides from their sources and fails if
the tag sets overlap or the Windows runner ever takes untagged jobs.

## Prerequisites

1. GitLab is Synced/Healthy and you can log in as `root` (see the GitLab runbook for the initial password).
2. KubeVirt and CDI are Available: `kubectl get kubevirt -n kubevirt` and `kubectl get cdi`. On a host with
   no `/dev/kvm` they run under software emulation, where **Windows is not usable** — you need hardware
   virtualisation on the node (`kubectl describe node <n> | grep devices.kubevirt.io/kvm`).
3. A Windows disk image you are licensed to use, prepared as in [Preparing the image](#preparing-the-image).
   We do not ship, download or license Windows. The image source is yours.
4. Capacity (not counted in the cluster's ledgers, on purpose — see
   [Storage and capacity](#storage-and-capacity)): 64Gi of disk, 4 vCPU and ~8.5Gi of memory requested on
   the node GitLab runs on.
5. `virtctl` for the console: <https://kubevirt.io/user-guide/user_workloads/virtctl_client_tool/>.

## Steps

### 1. Mint the runner token

```bash
kubectl apply -f full-ai-cluster/k8s/examples/gitlab-windows-runner-token.yaml
kubectl -n gitlab wait --for=condition=complete job/gitlab-windows-runner-token --timeout=15m
kubectl -n gitlab logs job/gitlab-windows-runner-token
# -> minted a glrt- runner token into gitlab-windows-runner-token
```

This is the same in-cluster approach as the Linux runner: `gitlab-rails runner` in the toolbox pod calls
GitLab's own `Ci::Runners::CreateRunnerService`. **No admin personal access token is minted**, and the
token is never printed. The runner record is created with tags `windows,zeta-windows` and *run untagged:
off*. It is idempotent — re-applying, or re-running after `kubectl -n gitlab delete job
gitlab-windows-runner-token`, reuses the existing record and never overwrites a token already present.

Check without printing the token:

```bash
kubectl -n gitlab get secret gitlab-windows-runner-token -o jsonpath='{.data.runner-token}' | wc -c   # > 0
```

If the Job fails it exits 1 and prints the manual step. The `kubectl exec` recipe that does by hand exactly
what the Job does:

```bash
kubectl -n gitlab exec deploy/gitlab-toolbox -c toolbox -- gitlab-rails runner "
root = User.find_by_username('root')
r = Ci::Runners::CreateRunnerService.new(user: root, params: { runner_type: 'instance_type', description: 'zeta-windows', tag_list: %w[windows zeta-windows], run_untagged: false }).execute
raise(r.message.to_s) unless r.success?
print r.payload[:runner].token
" | tail -n1 > /tmp/win-token      # a glrt- string; delete the file afterwards
kubectl -n gitlab patch secret gitlab-windows-runner-token --type merge \
  -p "{\"stringData\":{\"runner-token\":\"$(cat /tmp/win-token)\"}}" && shred -u /tmp/win-token
```

(Or Admin > CI/CD > Runners > New instance runner, tags `windows,zeta-windows`, *Run untagged jobs* unticked;
paste the `glrt-` token into the same Secret key.)

**Mint the token BEFORE starting the VM.** KubeVirt builds Secret and ConfigMap disks when the VM starts;
a token minted later needs a VM restart.

### 2. Point the guest at your image

Edit the one `EDIT:` line in `kubevirt-windows-gitlab-runner.yaml` — the DataVolume `source`. Three forms:

```yaml
  source:
    http: { url: https://files.example.internal/win2022-cloudbase-init.qcow2 }   # qcow2 / raw / .gz / .xz
  # or: pvc: { namespace: images, name: golden-win2022 }                          # CDI clone of a golden disk
  # or: registry: { url: docker://registry.example.internal/win2022-containerdisk }
```

Also set `resources.requests.storage` to at least the image's virtual size. Optionally change
`gitlabUrl` / `concurrent` in the `windows-runner-bootstrap` ConfigMap (see [Networking](#networking)).

### 3. Apply it (the VM stays Halted)

```bash
kubectl apply -f full-ai-cluster/k8s/examples/kubevirt-windows-gitlab-runner.yaml
kubectl -n gitlab get datavolume windows-runner-root -w     # until phase Succeeded
```

Applying the file **untouched** starts nothing: the VM is `runStrategy: Halted` and the image URL is an
RFC 2606 `.invalid` name, so the import fails loudly rather than booting something unintended.

### 4. Start it

```bash
virtctl start windows-runner -n gitlab
virtctl vnc windows-runner -n gitlab          # watch the first boot; RDP: the windows-runner-rdp Service
```

First boot runs the bootstrap (below). When the runner is online, set `runStrategy: Always` so a node
reboot brings the guest back (the bootstrap is a no-op once registered).

### 5. Verify

1. **Admin > CI/CD > Runners** (GitLab UI, as `root`): `zeta-windows` is listed, **Online**, with tags
   `windows`, `zeta-windows`, and *Run untagged jobs* off.
2. Run a pipeline whose job asks for it:

   ```yaml
   windows-smoke:
     tags: [windows]
     script:
       - $PSVersionTable.PSVersion
       - Get-ComputerInfo | Select-Object OsName, OsVersion
       - git --version   # job checkout needs Git for Windows in the image
   ```

   and, to confirm the contract, a job with **no** `tags:` — it must run on the Linux runner and never on
   Windows.

Both are the verification. Until they pass, treat the path as unproven on your hardware.

## What the guest does on first boot

```
CD-ROM  ZETABOOT   <- ConfigMap windows-runner-bootstrap   (settings.json, bootstrap.ps1)   NOT a secret
CD-ROM  ZETATOKEN  <- Secret    gitlab-windows-runner-token (file: runner-token)             the credential
CD-ROM  (sysprep)  <- ConfigMap windows-runner-sysprep      (Unattend.xml)                   optional path B
CD-ROM  (config drive) <- cloudInitConfigDrive.userData     (cloudbase-init script)          optional path A
CD-ROM  virtio-win <- quay.io/kubevirt/virtio-container-disk:<operator release>              drivers
disk    root       <- DataVolume windows-runner-root (YOUR image)
```

`bootstrap.ps1` (idempotent, safe on every boot; log: `C:\ProgramData\zeta\runner-bootstrap.log`):

1. Finds the two labelled CD-ROMs (retrying ~5 min — they appear a little after boot).
2. If `C:\GitLab-Runner\config.toml` already holds a `glrt-` token, stops: already registered.
3. Reads `runner-token`; refuses anything that is not a `glrt-` authentication token.
4. Downloads `gitlab-runner.exe` from GitLab's release bucket (pinned version **and** sha256, retried), and
   refuses it on a hash mismatch.
5. `gitlab-runner register --non-interactive --token <glrt-> --executor shell --shell powershell
   --url <gitlabUrl> --clone-url <gitlabUrl>`, sets `concurrent`, installs the Windows service, starts it.

The token never appears in the VM spec, a ConfigMap, the script, or the log. Tags and *run untagged* live on
the runner record (set when the token was minted), not on that command line — GitLab refuses them next to a
`glrt-` token.

## Preparing the image

The cluster cannot add any of this from outside; the image must already contain:

1. **virtio drivers.** The root disk is `virtio` and the NIC is `virtio` from the first boot. An image
   without `viostor` (disk) and `NetKVM` (network) will not see its disk or have a network. Install them from
   the **virtio-win** CD-ROM that rides along on every boot (pinned to the same release as the vendored
   KubeVirt operator): in Windows Setup choose *Load driver* → the virtio CD → `viostor`, `NetKVM`; on an
   installed system run `virtio-win-gt-x64.msi` from it. If you must install first, flip `bus: virtio` →
   `bus: sata` and `model: virtio` → `e1000e` for the install, install the drivers, flip back (Windows will
   not boot a disk whose bus changed under it without the driver).
2. **One of two first-boot mechanisms** (both are wired; the one the image lacks is ignored):
   - **A. cloudbase-init** (<https://cloudbase.it/cloudbase-init/>) with its default config-drive metadata
     service. It runs the inline `userData` (`#ps1_sysnative` header) which finds `ZETABOOT` and runs
     `bootstrap.ps1`. Bake it in: install cloudbase-init, leave the Config Drive service enabled, run its
     *Sysprep* option at the end of the installer, shut down, and that disk is the image.
   - **B. A generalized image** (`sysprep /generalize /oobe /shutdown`). Windows Setup then reads
     `Unattend.xml` from the `sysprep` CD-ROM. It runs in the `specialize` pass as SYSTEM with no password;
     because the network is not up that early it only copies `bootstrap.ps1` to `C:\ProgramData\zeta\` and
     schedules it at every startup (task `zeta-runner-bootstrap`); the script retries its own download and
     removes the task once the runner is registered.
3. **Outbound HTTPS** from the guest to the runner download bucket. For an air-gapped install point
   `runnerExeUrl` in `settings.json` at an internal mirror of the same file; the sha256 does not change.
4. **Whatever your jobs need** (Git for Windows, compilers, ...). The runner executes jobs with PowerShell on
   the guest itself; there is no per-job container.

Installer-ISO route: use a blank root disk plus an `-iso` DataVolume and a CD-ROM first in the boot order,
exactly as `kubevirt-windows-vm.yaml` does, install, then do 1–2 and shut down. Then source the final disk
via `pvc:` or `http:` above.

## Networking

Pod network, `masquerade`. The guest reaches GitLab over the **same in-cluster Service the Linux runner
uses** (`gitlab-webservice-default`, Workhorse `:8181`), by its fully qualified name
`http://gitlab-webservice-default.gitlab.svc.cluster.local:8181`, because a Windows resolver does not walk a
DHCP search list the way a pod does. DNS reaches the guest through KubeVirt's DHCP, from the launcher pod's
resolver. Alternatives, each only a `gitlabUrl` edit in `settings.json` (edit the ConfigMap **before** the
first boot):

| Use when | `gitlabUrl` |
|---|---|
| default | `http://gitlab-webservice-default.gitlab.svc.cluster.local:8181` |
| guest DNS cannot resolve cluster names | the Service's ClusterIP: `kubectl -n gitlab get svc gitlab-webservice-default -o jsonpath='{.spec.clusterIP}'` → `http://<ip>:8181` |
| the VM is moved off the pod network / LAN | the pinned LAN gateway address `http://<last LB-pool address>/` (`global.zeta.lanAddress`; the `gitlab-lan` Gateway routes `/` to the same webservice) |

`--clone-url` is set to the same value so job checkouts stay in-cluster, as for the Linux runner.
No inbound port is needed for the runner (it polls GitLab). RDP is a `ClusterIP` Service for debugging only;
put a firewall in front before making it a `LoadBalancer` — 3389 is the most-scanned port there is.

## Storage and capacity

| | |
|---|---|
| Windows disk | 64Gi DataVolume `windows-runner-root`, `ReadWriteOnce` |
| Default class | `zeta-block-local` — one copy, pinned to the node holding it. A runner disk is rebuildable from the image, so triplicating it buys durability nobody needs here |
| Replicated alternative | `zeta-block-replicated` (Longhorn, 3-way): **64Gi × 3 = 192Gi of the pool**, survives losing that node's disk, may live-migrate. Change the one `storageClassName`. Check the pool first: `kubectl -n longhorn-system get nodes.longhorn.io -o wide` (allocatable vs scheduled) |
| Memory / CPU | request 8Gi memory (== limit) + KubeVirt's per-VM overhead; 4 vCPU request, no CPU limit. On a single-node install this is the heaviest optional thing you can add next to GitLab (~6Gi of requests) |

**Not counted in the cluster's storage ledgers or the single-node budget, deliberately** (the same placement
and reason as `kubevirt-windows-vm.yaml`): the ledgers price what a sync provisions on every install, and the
capacity preflight checks it against real disks. An opt-in guest must not be priced as if every install ran
it. The arithmetic above is the operator's, and the test pins that the claim names a storage *capability*
(never a provider class), is `ReadWriteOnce`, and is sized.

## Gating: why a fresh install never crash-loops over this

- Neither file is under `k8s/applications/`; nothing syncs them.
- The VM is `runStrategy: Halted`. The image URL is a sentinel that cannot resolve.
- The bootstrap exits non-zero with a plain message when the token or a volume is missing, rather than
  registering something half-configured; a Windows service is only installed after `register` succeeded.
- The token Job fails loudly (exit 1) when run by hand and never wedges an ArgoCD sync — it is not in one.

## Add ANY extra runner (no reflash)

The pattern is the same for every runner: **a runner record in GitLab + its `glrt-` token in a Secret + a
runner process that reads that Secret**. The record carries the tags and *run untagged*; the process is
config in git.

### A second Linux runner (bigger, privileged, GPU, group-scoped)

1. **The record and token** — either reuse the Job in this runbook (copy
   `gitlab-windows-runner-token.yaml`; it is generic) or use the UI/API.
   Edit only the env block and the Secret name:

   ```yaml
   - { name: TARGET_SECRET,       value: gitlab-big-linux-runner-token }
   - { name: RUNNER_DESCRIPTION,  value: zeta-big-linux }
   - { name: RUNNER_TAGS,         value: "linux-big,privileged" }   # never overlap an existing runner's tags
   - { name: RUN_UNTAGGED,        value: "false" }                  # keep exactly ONE runner taking untagged jobs
   ```

   Rename the ServiceAccount / Role / Job / Secret too (the Role names the Secret). UI route: Admin > CI/CD >
   Runners > New instance runner. **Group-scoped:** Group > Build > Runners > New group runner. **API:**
   `POST /api/v4/user/runners` with `runner_type=group_type`, `group_id=<id>`, `tag_list=...`,
   `run_untagged=false`, header `PRIVATE-TOKEN: <PAT with create_runner scope>`; the response's `token` is
   the `glrt-` value. If you create a PAT for that, make it short-lived and revoke it afterwards. (The Job
   in this repo exists precisely so no PAT is needed; it only creates *instance* runners — group scope is UI
   or API.)
2. **The process, in git.** Add a second release of the upstream `gitlab-runner` chart
   (`https://charts.gitlab.io`, chart `gitlab-runner`; pin the version the GitLab chart bundles —
   `helm show chart gitlab/gitlab --version <pin>` lists it) as its own `Application` under
   `full-ai-cluster/k8s/applications/<name>/`, with:

   ```yaml
   gitlabUrl: http://gitlab-webservice-default.gitlab.svc:8181
   runners:
     secret: gitlab-big-linux-runner-token   # chart reads key `runner-token`
     privileged: true                        # only if the jobs need it (docker-in-docker): it is root on the node
   unregisterRunners: false
   concurrent: 2
   resources: { requests: { cpu: 50m, memory: 64Mi } }
   ```

   Because it enters `k8s/applications/`, it also enters the cluster's budget ledgers (single-node budget,
   storage claims, image resolvability, registry-mirror coverage): CI tells you which rows it needs — that is
   the same discipline as every other Application, and it is why the Windows guest (whose 64Gi would be
   priced as always-on demand) is **not** done this way. The GitLab umbrella chart installs exactly one
   runner, which is why a second one is its own Application rather than more values on `gitlab`.
3. ArgoCD applies it; the cluster tracks `main`; nothing is reflashed.

### A second Windows runner

Apply the token file with a different `TARGET_SECRET` / `RUNNER_DESCRIPTION`, copy the VM file with a new
name prefix, and point its `runner-token` volume at the new Secret. Do not share one token between two
guests: GitLab treats them as one runner.

## Troubleshooting

| Symptom | Look at |
|---|---|
| Job exits 1 | `kubectl -n gitlab logs job/gitlab-windows-runner-token` — it prints the manual step |
| DataVolume stuck / failed | the importer pod: `kubectl -n gitlab get pods`, `logs` of the `importer-*` pod; the URL is still the `.invalid` sentinel |
| VM `Pending` | `devices.kubevirt.io/kvm` not allocatable: no hardware virtualisation on any node |
| Boots, no runner appears | in the guest (VNC/RDP): `C:\ProgramData\zeta\runner-bootstrap.log` |
| `no volume labelled ZETABOOT` | the image has neither cloudbase-init nor a sysprep pass reading the volumes, or CD-ROM drivers are missing; run `bootstrap.ps1` by hand from the `ZETABOOT` drive |
| `no runner-token on the ZETATOKEN volume` | the Secret was empty at VM start: mint it (step 1) and `virtctl restart windows-runner -n gitlab` |
| download fails / sha256 mismatch | guest egress; or `runnerExeUrl`/`runnerExeSha256` in `settings.json` disagree (the sha256 is read from the vendor's `release.sha256` for that exact version) |
| runner registers, jobs never start | the job lacks `tags: [windows]`; or the guest cannot resolve/reach `gitlabUrl` (try the ClusterIP form) |
| runner offline after a node reboot | `runStrategy` is still `Halted`; set `Always` |

## What is proven, and what is unproven

### Proven (offline, in this repository's tests)

`src/Core.TypeScript/cluster/gitlab-windows-runner.test.ts`, run in the cluster plan job on every change to
these files:

- The Windows and Linux runner records have **disjoint tags**, exactly one takes untagged jobs and it is the
  Linux one — read from both sources, not restated.
- The token Job's **script is executed** against a stub `kubectl`: what it sends to Rails (tags, run-untagged,
  description), that it writes exactly one Secret key and never prints the token, that it is idempotent,
  retries, **fails loud**, and refuses Ruby-injection through its env knobs.
- The Job's authority: it can patch one named Secret and cannot create Secrets; the pre-created Secret has no
  data key, so re-applying cannot blank a live token.
- The guest spec's internal consistency: every disk has a volume and vice versa, every referenced object
  exists, the volume labels the guest looks for are the ones the volumes carry in every place that names them,
  the virtio CD is pinned to the vendored KubeVirt release, storage names a capability, the VM is Halted and
  the image is a sentinel, nothing is under `k8s/applications/`, and the bootstrap's registration is the
  authentication-token flow with the runner binary verified by sha256 before it can run.

### Proven (live, in CI — the `live-kind-virt` job of `k8s-argocd-health-test.yml`)

`kubevirt-vm-live-test.ts` runs a **server-side dry-run** of both new files (and the existing template)
against a kind cluster with KubeVirt and CDI installed, so KubeVirt's and CDI's own admission webhooks judge
the VM, DataVolume, the Secret/ConfigMap/sysprep volumes and their `volumeLabel`s. That proves the spec is
**valid**. It does not prove a guest boots. (The same lane boots a cirros VM under emulation, so the
KubeVirt/CDI machinery itself is proven to run.) The Linux runner's token flow is proven live by
`gitlab-live-proof.yml`; the Windows token Job reuses that exact call with different tags and
run-untagged.

### UNPROVEN — stated plainly

- **No Windows image exists in CI**, so a Windows guest booting from this spec, `viostor`/`NetKVM` working,
  cloudbase-init or the sysprep pass finding the labelled CD-ROMs, `Get-Volume` seeing them in time, and
  `bootstrap.ps1` running to the end have **never been run**.
- Whether Windows reads an ISO 9660 CD-ROM carrying KubeVirt's `volumeLabel` the way this expects. The
  schema is validated; the guest-side behaviour is not.
- That the `specialize`-pass command in `Unattend.xml` can enumerate volumes that early (path B). Path A is
  the better-trodden one; if B misbehaves, run `bootstrap.ps1` from the `ZETABOOT` drive by hand once.
- That a Windows guest resolves `*.svc.cluster.local` through the DHCP-provided resolver. The ClusterIP form
  of `gitlabUrl` avoids the question.
- That the Rails call accepts these params on GitLab 17.7: the Linux Job proves the `instance_type` path
  live; here only the tags and run-untagged differ.
- Performance, licensing, and Windows-specific job behaviour. A runner with `executor = shell` runs jobs
  directly on the guest with whatever is installed there.

### How you verify, in order

1. `kubectl -n gitlab logs job/gitlab-windows-runner-token` ends with *minted a glrt- runner token*.
2. `kubectl -n gitlab get datavolume windows-runner-root` is `Succeeded`.
3. `virtctl vnc windows-runner -n gitlab` shows the guest booted; `runner-bootstrap.log` ends with
   *gitlab-runner registered and started*.
4. **GitLab Admin > CI/CD > Runners shows `zeta-windows` online**, tags `windows`, `zeta-windows`.
5. A pipeline job with `tags: [windows]` runs and passes, and a job without `tags:` still runs on Linux.

## Uninstall

```bash
kubectl delete -f full-ai-cluster/k8s/examples/kubevirt-windows-gitlab-runner.yaml   # VM, disk, ConfigMaps, Service
kubectl delete -f full-ai-cluster/k8s/examples/gitlab-windows-runner-token.yaml     # Job, RBAC, token Secret
```

then delete the `zeta-windows` runner in Admin > CI/CD > Runners (the record outlives the token Secret).
