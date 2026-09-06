---
id: 081M1VXAQEJ087G0R00325DJRS
type: task
state: backlog
priority: P2
slug: first-boot-bun-consumes-sourced-bao-names-from-env
title: "first-boot bun consumes sourced bao names from env"
created: 2026-09-06T17:48:00.000Z
depends_on: ["081M1VW190B087G0R003D4GWJF"]
composes_with: ["081M1VNS22M087G0R000P9A1XH"]
---

# first-boot bun consumes sourced bao names from env

Aaron 2026-09-06: continue after #16816. Names can land on
the ESP. First-boot already sources `/zeta-firstboot.conf`.
A bun entry still has to consume `ZETA_BAO_LOAD_SITE` and
`ZETA_BAO_PATH` from that env. Do not edit
`zeta-first-boot.sh`. Do not expand `ZetaFirstbootRole`.
Do not land the stanza. Do not open files.

## Pre-start checklist

- Substrate-drift: `parseFirstbootBaoElfEnv` lives in
  installer `bao-elf-capture.ts` (pure; re-home next to
  the carrier so a zflash bun entry does not import
  installer `fs`). Overlay / unseal-path still must not
  `readFileSync`.
- Prior-art: #16802 (`081M1VNS22M087G0R000P9A1XH`),
  #16816 (`081M1VW190B087G0R003D4GWJF`). Bash already
  `.` sources the ESP conf. Export + bun invoke stay
  a later bash slice. `references/prior-art/` not
  searched recursively.
- Does not depend on editing bash.

## Kill

- `seal "pkcs11"` in Application.yaml.
- Expanding `ZetaFirstbootRole` / `ZetaFirstbootConfig`.
- Editing `zeta-first-boot.sh`.
- Live `readFileSync` / opening `/dev/tpmrm0`.
- Inferring `on-host` from `/dev/tpmrm0` or a `.so`.
- extraContainer. `yubihsm.nix`. SoftHSM overlay.
