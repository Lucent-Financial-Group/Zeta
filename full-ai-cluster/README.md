# full-ai-cluster

End-to-end declarative AI cluster. Starts with the USB bootstrap
(identical snippet at `./usb-nixos-installer/`) and continues
through every layer up to running AI workloads.

## What's inside

```
full-ai-cluster/
├── usb-nixos-installer/        ← byte-identical copy of ../usb-nixos-installer
├── flake.nix                   ← cluster flake (host configs + linux-builder)
├── nixos/
│   ├── modules/                ← shared NixOS modules
│   │   ├── common.nix
│   │   ├── k3s-server.nix      ← K3S control-plane (flannel disabled for Cilium)
│   │   ├── k3s-agent.nix       ← K3S worker
│   │   ├── gpu.nix             ← NVIDIA drivers + container toolkit
│   │   ├── gpu-passthrough.nix ← VFIO passthrough for VM workloads
│   │   ├── gpu-device-plugin.nix ← K8s device plugin (NVIDIA/AMD/Intel)
│   │   ├── docker.nix          ← Docker via NixFlake
│   │   └── local-storage.nix   ← local-path-provisioner storage class
│   └── hosts/
│       ├── control-plane/      ← configuration.nix + hardware + README
│       └── worker-gpu/         ← configuration.nix + hardware + README
└── k8s/
    ├── bootstrap/              ← K3S auto-applies on first boot
    │   ├── argocd-namespace.yaml
    │   ├── argocd-install.yaml
    │   └── root-application.yaml ← App-of-Apps root
    └── applications/           ← ArgoCD watches recursively
        ├── cilium/             ← CNI + Hubble + KPR + BPF MASQUERADE
        ├── orleans/            ← distributed cron #1
        ├── temporal/           ← distributed cron #2 (TS)
        ├── dapr/               ← distributed cron #3 (actors)
        ├── gitlab/             ← self-hosted Git host (option A)
        ├── forgejo/            ← self-hosted Git host (option B, lighter)
        ├── argo-workflows/     ← DAG job scheduler
        ├── argo-rollouts/      ← progressive delivery
        ├── longhorn/           ← distributed block storage
        ├── cockroachdb/        ← distributed SQL
        ├── hindsight/          ← TODO: ambiguous component (see PR)
        ├── oz/                 ← TODO: ambiguous component (see PR)
        ├── hermes/             ← TODO: ambiguous component + OZ integration
        ├── warp/               ← TODO: ambiguous component (see PR)
        ├── ollama/             ← LLM serving (option A — local)
        ├── vllm/               ← LLM serving (option B — high-throughput)
        ├── deepseek-coder/     ← model deploy → Ollama or vLLM
        ├── qwen-coder/         ← model deploy → Ollama or vLLM
        ├── kube-prometheus-stack/ ← Prometheus + Grafana + Alertmanager
        ├── nats/               ← messaging
        ├── redis/              ← cache
        ├── weaviate/           ← vector DB
        ├── loki/               ← logs
        ├── tempo/              ← traces
        ├── alloy/              ← OpenTelemetry collector
        ├── mimir/              ← long-term metrics storage
        ├── istio/              ← service mesh
        ├── open-policy-agent/  ← admission policy
        ├── sealed-secrets/     ← secrets at rest in git (option A)
        └── vault/              ← runtime secrets (option B)
```

## Two layers, two reconcilers

- **OS layer** is reconciled by **Nix + NixOS**. Everything in
  `./nixos/` lands on a target machine via `nixos-install --flake`
  (initial install) or `nixos-rebuild switch --flake` (updates).
- **Cluster layer** is reconciled by **ArgoCD**. K3S auto-applies
  the three bootstrap manifests at `./k8s/bootstrap/` on first boot;
  ArgoCD then reads `./k8s/applications/root-application.yaml`
  (App-of-Apps) and reconciles every workload from the same Git
  repo every ~3 minutes.

This split is intentional: anything that must run BEFORE the
cluster API exists (kernel modules, CNI host setup, container
runtime, GPU drivers, K3S itself, base packages, storage class
host bits) belongs in Nix. Everything else belongs in K8s manifests
ArgoCD reconciles.

## Bootstrap end-to-end

### 1. Build the installer ISO (one-time, on your workstation)

```bash
cd full-ai-cluster
nix build .#installer-iso
# Output: ./result/iso/zeta-installer-24.11.iso (~1.5-2 GB)
```

If you're on Apple Silicon and don't yet have the linux-builder
running, apply the nix-darwin config first:

```bash
nix run nix-darwin/nix-darwin-24.11#darwin-rebuild -- switch --flake .#zeta-mac
```

### 2. Write to USB stick

```bash
# macOS:
diskutil list
diskutil unmountDisk /dev/diskN          # N = your USB device number
sudo dd if=result/iso/zeta-installer-*.iso of=/dev/rdiskN bs=4m status=progress
diskutil eject /dev/diskN

# Linux:
lsblk
sudo dd if=result/iso/zeta-installer-*.iso of=/dev/sdX bs=4M status=progress conv=fsync
sync
```

(Or use Balena Etcher / Rufus for a GUI — same outcome.)

### 3. Install on each target machine

Boot the target on the USB stick. Then at the console:

```bash
# Network up:
nmtui

# Pick the target disk + partition (parted/gptfdisk/zfs all on the stick).
# Example minimal layout (single ext4 + EFI):
sgdisk --zap-all /dev/sda
sgdisk -n 1:0:+512M -t 1:ef00 -c 1:boot /dev/sda
sgdisk -n 2:0:0     -t 2:8300 -c 2:nixos /dev/sda
mkfs.fat -F 32 -n boot /dev/sda1
mkfs.ext4 -L nixos /dev/sda2
mount /dev/disk/by-label/nixos /mnt
mkdir -p /mnt/boot && mount /dev/disk/by-label/boot /mnt/boot

# Clone the cluster flake:
git clone https://github.com/Lucent-Financial-Group/Zeta /mnt/etc/zeta

# Generate per-machine hardware config and copy into the host dir:
nixos-generate-config --root /mnt
cp /mnt/etc/nixos/hardware-configuration.nix \
   /mnt/etc/zeta/full-ai-cluster/nixos/hosts/<host>/hardware-configuration.nix

# Seed the K3S cluster token (control-plane only on first run):
nixos-enter --root /mnt -- bash -c '
  mkdir -p /var/lib/rancher/k3s/server
  openssl rand -hex 64 > /var/lib/rancher/k3s/server/token
  chmod 600 /var/lib/rancher/k3s/server/token
'
# (Copy this token to /var/lib/rancher/k3s/agent/token on every worker)

# Install:
nixos-install --flake /mnt/etc/zeta/full-ai-cluster#<host>
# <host> = control-plane | worker-gpu | ...

# Reboot. K3S, Cilium, ArgoCD, all workloads come up declaratively.
reboot
```

### 4. Verify the cluster is alive

After the control-plane reboots:

```bash
ssh zeta@control-plane.zeta.local
sudo kubectl get nodes
sudo kubectl -n argocd get pods
sudo kubectl -n argocd get applications
sudo cilium status
sudo cilium hubble enable --ui   # if not already enabled by Helm values
```

### 5. Add more machines

Repeat step 3 on each machine with the appropriate `<host>` name.
Add new `nixosConfigurations.<host>` entries to `flake.nix` as needed.

## Component status

- ✅ Well-defined upstream charts (Cilium, ArgoCD, Temporal, GitLab,
  Forgejo, Argo Workflows / Rollouts, Longhorn, CockroachDB, NATS,
  Redis, Weaviate, Loki / Tempo / Alloy / Mimir, kube-prometheus-stack,
  Istio, OPA, Sealed Secrets, Vault, Ollama, vLLM)
- 🟡 Custom workloads needing your input on image + Helm chart
  choice (Orleans Silo, Dapr Actors config, Hermes Docker image
  with SOPS, Deepseek/Qwen Coder model deploys)
- ⚠️ Ambiguous components that need you to confirm which upstream:
  - **OZ** — multiple possibilities (OpenZiti? Auth0 OZ? specific
    Aaron-built component?). Application.yaml has a TODO.
  - **Hermes** — multiple possibilities (Cosmos IBC relayer? a
    message broker? an Aaron-built agent?). Application.yaml has
    a TODO with SOPS-baking-into-the-image structure already wired.
  - **Warp** — multiple possibilities (Cloudflare Warp? Warp
    terminal? Dagger Warp engine? an Aaron-built component?).
  - **Hindsight** — multiple possibilities (Lockheed Martin's
    OpenTelemetry processor? Microsoft's Hindsight? AWS?).

Sharpen each ambiguous one by editing its `Application.yaml`
to point at the right repoURL/chart/version.

## Secrets

- **Sealed Secrets** — store encrypted secrets directly in Git,
  decrypted by the controller at apply time. Good for low-churn
  config-style secrets.
- **HashiCorp Vault** — runtime secrets injection via the Vault
  Agent or external-secrets operator. Good for high-churn secrets
  + rotation + audit.
- **SOPS** — file-level encryption (age/gpg/KMS); used for
  Hermes-image-time secrets baked at Docker build per your spec.

All three coexist deliberately: different secrets have different
lifetimes + access patterns.

## Component composition

| Component | NixFlake or ArgoCD | Notes |
|---|---|---|
| NixOS + bootloader | Nix | USB installer |
| K3S | Nix (per-host module) | flannel + servicelb disabled (Cilium takes over) |
| Cilium | ArgoCD | KPR, Hubble Relay + UI, BPF MASQUERADE enabled |
| Docker | Nix (per-host module) | for non-K8s container workloads |
| Local-path storage | Nix (per-host module) | host-path PV for stateless workloads |
| GPU drivers (NVIDIA) | Nix (per-host module) | proprietary driver, container toolkit |
| GPU passthrough (VFIO) | Nix (per-host module) | for VM workloads on the same hosts |
| GPU device plugin (K8s) | Nix (per-host module) | exposes `nvidia.com/gpu`, `amd.com/gpu`, `intel.com/gpu` to pods |
| Everything else | ArgoCD | reconciled from `k8s/applications/` |

The Cilium choice DISPLACES K3S's default flannel CNI. The
control-plane's `k3s-server.nix` passes `--flannel-backend=none`
and `--disable-network-policy` to K3S; Cilium owns CNI, kube-proxy
replacement, and network policy.

## Updating the cluster

- **OS layer** changes: edit the relevant file under `./nixos/`,
  commit, push. Then on each target:
  `sudo nixos-rebuild switch --flake /etc/zeta/full-ai-cluster#<host>`
- **Cluster layer** changes: edit the relevant `Application.yaml`
  or referenced manifest, commit, push. ArgoCD reconciles within
  ~3 minutes.

For a full cluster rebuild from scratch: this directory IS the
desired state. Wipe everything, rerun the bootstrap, end up at
the same place.
