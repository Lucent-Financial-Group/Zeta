---
id: 081M1W6J9MH087G0R003VNMDDR
type: task
state: backlog
priority: P2
slug: iso-bun-consume-names-installer-iso-epoch
title: "ISO bun consume names installer-iso epoch"
created: 2026-09-06T20:29:12.209Z
depends_on: ["081M1W4XQH4087G0R000F69WYQ"]
composes_with: ["081M1W1NCDT087G0R002H3VG6Y"]
---

# ISO bun consume names installer-iso epoch

Aaron 2026-09-06: continue after #16846. Epoch is a TypeScript
parameter. Step 6.95a in
`full-ai-cluster/usb-nixos-installer/zeta-install.sh` still
runs on the live ISO and does not name that epoch. Export
`ZETA_BAO_ELF_EPOCH='installer-iso'` as a literal in that
bun consume. Do not infer it from `/mnt` or `/dev/tpmrm0`.
Do not invent an integrate decision. Do not land the stanza.

## Pre-start checklist

- Substrate-drift: #16846 (`081M1W4XQH4087G0R000F69WYQ`)
  landed `namedBaoElfAskAtEpoch`. #16834
  (`081M1W1NCDT087G0R002H3VG6Y`) invokes
  `src/Core.TypeScript/zflash/firstboot-bao-env.ts` after
  6.95a without an epoch key. Overlay still must not
  `readFileSync`.
- Prior-art: named site+path export in the same bun `-c`.
  `references/prior-art/` not searched recursively.
- Depends on the epoch type. Does not depend on wiring
  `planSetupFromNamedBaoElfEnv`.

## Kill

- `seal "pkcs11"` in Application.yaml.
- Inferring epoch from `/mnt` or `/dev/tpmrm0`.
- Defaulting a missing epoch to `installed-host`.
- Filling `NIXOS_HOST_BAO` or a `/mnt/run/current-system/...`
  path.
- Opening the ISO current-system bao as option D.
- Inventing `integrateAtSetup`. extraContainer. `yubihsm.nix`.
- Expanding `ZetaFirstbootRole`. Invoking bun from
  `full-ai-cluster/usb-nixos-installer/zeta-first-boot.sh`.
