---
id: 081M1W4XQH4087G0R000F69WYQ
type: task
state: backlog
priority: P2
slug: installer-iso-epoch-does-not-treat-current-system-bao-as-opt
title: "Installer-iso epoch does not treat current-system bao as option D"
created: 2026-09-06T20:00:29.733Z
depends_on: ["081M1W3BPCN087G0R001R97E45"]
composes_with: ["081M1W1NCDT087G0R002H3VG6Y"]
---

# Installer-iso epoch does not treat current-system bao as option D

Aaron 2026-09-06: continue after #16839. Env join exists.
`zeta-install.sh` Step 6.95a still runs on the live ISO
(`ZETA_HOME=/mnt/home/zeta`). `/run/current-system/sw/bin/bao`
there is the installer ISO's bao, not metal option D. Name
the epoch. Do not infer it from `/mnt` or `/dev/tpmrm0`.
Do not invent an integrate decision. Do not land the stanza.

## Pre-start checklist

- Substrate-drift: #16839 (`081M1W3BPCN087G0R001R97E45`)
  landed `planSetupFromNamedBaoElfEnv` with an injected read
  and no epoch. A later live call with `nodeBaoElfRead` on
  `src/Core.TypeScript/zflash/firstboot-bao-elf.ts`
  `NIXOS_HOST_BAO` during ISO install is the named kill.
- Prior-art: `full-ai-cluster/usb-nixos-installer/zeta-install.sh`
  Bug 1 fix (live ISO root vs `/mnt`). Overlay / unseal-path
  still must not `readFileSync`. `references/prior-art/` not
  searched recursively.
- Depends on the env join. Does not depend on wiring
  `zeta-install.sh` to the overlay.

## Kill

- `seal "pkcs11"` in Application.yaml.
- Opening `/run/current-system/sw/bin/bao` at `installer-iso`
  epoch and treating that ELF as metal option D.
- Inferring epoch from `/mnt` or `/dev/tpmrm0`.
- Filling a `/mnt/run/current-system/...` path when ISO
  current-system is refused.
- Wildcard under `/run/current-system`.
- Inventing `integrateAtSetup`. Silent PKCS#11 to Lucent.
- Expanding `ZetaFirstbootRole`. extraContainer. `yubihsm.nix`.
