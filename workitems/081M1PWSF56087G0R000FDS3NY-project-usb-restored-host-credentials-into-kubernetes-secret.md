---
id: 081M1PWSF56087G0R000FDS3NY
type: task
state: in-progress
priority: P2
slug: project-usb-restored-host-credentials-into-kubernetes-secret
title: "Project USB-restored host credentials into Kubernetes Secrets for agent pods"
created: 2026-09-04T19:02:09.318Z
depends_on: []
composes_with: ["081KSKBP80008QG0R003AX2A69"]
---

# Project USB-restored host credentials into Kubernetes Secrets for agent pods

Aaron 2026-09-04: credentials entered on the host (GitHub, other AI logins)
must persist and restore on USB **and** be available as Kubernetes Secrets
so future agent pods pick up what the machine already has.

This is not a Helm chart bump (Otto owns chart currency). It is the first
hop from restored host files to namespaced Opaque Secrets.

## Pre-start checklist

- Substrate-drift: restore writes host files
  (`full-ai-cluster/nixos/modules/zeta-creds-restore.nix`,
  `src/Core.TypeScript/installer/zeta-creds-restore.ts`). No host→Secret
  projector existed. Not drift.
- Prior-art (explicit-target): Kubernetes native Secret + Role;
  in-tree External Secrets Application (ClusterSecretStore still
  commented); Sealed Secrets declined for this hop (would put
  ciphertext in git; USB blob is the source of truth); Vault declined
  as first hop (may be sealed at first boot).
- Depends on shipped USB persist/restore (`081KSKBP80008QG0R003AX2A69`).
  Does not depend on Otto mimir / chart bumps.

## Acceptance

- Allowlisted creds (`gh-cli`, `claude`, `gemini`, `codex`) plan into
  Opaque Secrets in `zeta-host-creds`.
- Host-only creds (wifi, ssh-host-keys, ssh-operator-pubkey,
  install-answers) never become Secrets even when those files exist.
- Summary / dry-run output never contains credential plaintext or
  base64.
- Control-plane systemd unit runs after restore + k3s and does not
  `requiredBy` k3s.
- New `DEFAULT_MANIFEST` ids without a classification fail the lock
  test.

## Implementation

- `src/Core.TypeScript/installer/zeta-creds-to-k8s.ts`
- `full-ai-cluster/nixos/modules/zeta-creds-to-k8s.nix`
- Design: `docs/design/2026-09-04-host-creds-as-k8s-secrets.md`
- Skill: `.claude/skills/agent-runtime-and-persistence/blueprints/host-creds-k8s-secrets.md`

## Out of scope

- Vault ingest / ExternalSecret CRs
- Cross-namespace Secret copies
- Physical USB flash
- Helm chart version bumps
