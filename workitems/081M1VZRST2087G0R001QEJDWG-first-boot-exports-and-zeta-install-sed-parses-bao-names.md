---
id: 081M1VZRST2087G0R001QEJDWG
type: task
state: backlog
priority: P2
slug: first-boot-exports-and-zeta-install-sed-parses-bao-names
title: "first-boot exports and zeta-install sed-parses bao names"
created: 2026-09-06T18:30:25.346Z
depends_on: ["081M1VXAQEJ087G0R00325DJRS"]
composes_with: ["081M1VNS22M087G0R000P9A1XH"]
---

# first-boot exports and zeta-install sed-parses bao names

Aaron 2026-09-06: continue after #16820. Names can land on
the ESP and bun can consume sourced env. First-boot still
has to **export** `ZETA_BAO_LOAD_SITE` and `ZETA_BAO_PATH`
so the child `zeta-install` inherits them. Manual
`zeta-install` still has to **sed-parse** both keys from
the ESP conf (both or neither). Do not invoke bun from
`full-ai-cluster/usb-nixos-installer/zeta-first-boot.sh`
— bun/mise are not on PATH until
`full-ai-cluster/usb-nixos-installer/zeta-install.sh`
Step 6.95a. Do not expand `ZetaFirstbootRole`. Do not
land the stanza. Do not fill `NIXOS_HOST_BAO`. Do not
stage unused files.

## Pre-start checklist

- Substrate-drift: #16820 (`081M1VXAQEJ087G0R00325DJRS`)
  landed `src/Core.TypeScript/zflash/firstboot-bao-env.ts`.
  `full-ai-cluster/usb-nixos-installer/zeta-first-boot.sh`
  already `.` sources `/zeta-firstboot.conf` and exports
  join URL; it does not export bao names.
  `full-ai-cluster/usb-nixos-installer/zeta-install.sh`
  sed-parses join URL for the manual path; it does not
  sed-parse bao names. bun invoke after 6.95a is a later
  slice.
- Prior-art: join-URL pickup in both scripts; cluster
  addressing ALL THREE OR NONE. `references/prior-art/`
  not searched recursively.
- Depends on #16820 consume, not on Application.yaml.

## Kill

- `seal "pkcs11"` in Application.yaml.
- Expanding `ZetaFirstbootRole` / `ZetaFirstbootConfig`.
- Invoking `src/Core.TypeScript/zflash/firstboot-bao-env.ts`
  / bun from
  `full-ai-cluster/usb-nixos-installer/zeta-first-boot.sh`
  or from this pickup (bun is not installed yet).
- Filling `NIXOS_HOST_BAO` when one name is missing.
- Staging unused files under `/mnt/etc/zeta/`.
- Inferring `on-host` from `/dev/tpmrm0` or a `.so`.
- extraContainer. `yubihsm.nix`. SoftHSM overlay.
