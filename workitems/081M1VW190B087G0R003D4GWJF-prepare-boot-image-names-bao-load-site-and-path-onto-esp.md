---
id: 081M1VW190B087G0R003D4GWJF
type: task
state: backlog
priority: P2
slug: prepare-boot-image-names-bao-load-site-and-path-onto-esp
title: "prepare-boot-image names bao load site and path onto ESP"
created: 2026-09-06T17:25:00.000Z
depends_on: ["081M1VTE7TZ087G0R002XSHAYZ"]
composes_with: ["081M1VRW8ZY087G0R000XDM4BG"]
---

# prepare-boot-image names bao load site and path onto ESP

Aaron 2026-09-06: continue after #16813. Production
`file-backed.ts` parses `--bao-load-site` and `--bao-path`.
The QEMU harness that actually boots still cannot name a
bao. Wire `prepare-boot-image.ts`. Do not expand
`ZetaFirstbootRole`. Do not edit `zeta-first-boot.sh`.
Do not land the stanza. Do not default `--bao-path` to
`NIXOS_HOST_BAO`.

## Pre-start checklist

- Substrate-drift: `runFileBackedZflashCli` already takes
  `namedBaoElf`. `parseNamedBaoElfArgs` lives in
  `firstboot-bao-elf.ts`. `prepare-boot-image.ts` still
  forwards only `firstbootRole`. Overlay / unseal-path
  still must not `readFileSync`.
- Prior-art: #16813 (`081M1VTE7TZ087G0R002XSHAYZ`). Same
  two flags, same refusals. `references/prior-art/` not
  searched recursively.
- Depends on the file-backed CLI. Does not depend on
  editing bash.

## Kill

- `seal "pkcs11"` in Application.yaml.
- Expanding `ZetaFirstbootRole` / `ZetaFirstbootConfig`.
- Editing `zeta-first-boot.sh`.
- Defaulting `--bao-path` to `NIXOS_HOST_BAO`.
- Inferring `on-host` from `/dev/tpmrm0` or a `.so`.
- extraContainer. `yubihsm.nix`. SoftHSM overlay.
