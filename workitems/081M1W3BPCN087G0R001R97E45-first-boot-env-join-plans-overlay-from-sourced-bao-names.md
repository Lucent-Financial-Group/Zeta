---
id: 081M1W3BPCN087G0R001R97E45
type: task
state: backlog
priority: P2
slug: first-boot-env-join-plans-overlay-from-sourced-bao-names
title: "First-boot env join plans overlay from sourced bao names"
created: 2026-09-06T19:33:10.165Z
depends_on: ["081M1W1NCDT087G0R002H3VG6Y"]
composes_with: ["081M1VNS22M087G0R000P9A1XH", "081M1VXAQEJ087G0R00325DJRS"]
---

# First-boot env join plans overlay from sourced bao names

Aaron 2026-09-06: continue after #16834. Bash exports names and
the installer bun-consumes them after Step 6.95a. Argv and conf
already join a named ask into `planSetupFromNamedBaoElf`. Env
does not. Add `planSetupFromNamedBaoElfEnv` next to those
siblings in `src/Core.TypeScript/installer/bao-elf-capture.ts`.
Do not invent an integrate decision. Do not open the installer
ISO's `/run/current-system/sw/bin/bao`. Do not expand
`ZetaFirstbootRole`. Do not land the stanza.

## Pre-start checklist

- Substrate-drift: #16834 (`081M1W1NCDT087G0R002H3VG6Y`)
  invokes `src/Core.TypeScript/zflash/firstboot-bao-env.ts`
  after 6.95a and logs JSON. `planSetupFromNamedBaoElfArgv`
  and `planSetupFromNamedBaoElfConf` exist.
  `consumeFirstbootBaoElfProcessEnv` exists. Env join into
  the overlay does not.
- Prior-art: conf join (`081M1VNS22M087G0R000P9A1XH`), argv
  join (`081M1VJGMMP087G0R002JRZ458`). Overlay / unseal-path
  still must not `readFileSync`. `references/prior-art/` not
  searched recursively.
- Depends on the bun consume existing so the env keys are
  real process env, not a hypothetical.

## Kill

- `seal "pkcs11"` in Application.yaml.
- Expanding `ZetaFirstbootRole` / `ZetaFirstbootConfig`.
- Opening `/run/current-system/sw/bin/bao` during ISO
  install and treating that ELF as metal option D.
- Inventing `integrateAtSetup` from `/dev/tpmrm0` or a
  missing probe.
- Silent PKCS#11 to Lucent when a named bao ask is present
  but the hardware probe did not run.
- Calling this join from
  `full-ai-cluster/usb-nixos-installer/zeta-first-boot.sh`.
- Filling `NIXOS_HOST_BAO` when env is unmeasured.
- Opening `/dev/tpmrm0` or a `.so`.
- extraContainer. `yubihsm.nix`. SoftHSM overlay.
