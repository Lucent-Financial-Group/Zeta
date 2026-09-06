---
id: 081M1VTE7TZ087G0R002XSHAYZ
type: task
state: backlog
priority: P2
slug: zflash-cli-names-bao-load-site-and-path-onto-esp
title: "zflash CLI names bao load site and path onto ESP"
created: 2026-09-06T16:57:16.383Z
depends_on: ["081M1VRW8ZY087G0R000XDM4BG"]
composes_with: ["081M1VJGMMP087G0R002JRZ458"]
---

# zflash CLI names bao load site and path onto ESP

Aaron 2026-09-06: continue after #16810. The ESP planner
writes joined bao names, but only tests can set
`namedBaoElf`. Production `file-backed.ts` still has to
parse `--bao-load-site` and `--bao-path`. Do not expand
`ZetaFirstbootRole`. Do not edit `zeta-first-boot.sh`.
Do not land the stanza. Do not default `--bao-path` to
`NIXOS_HOST_BAO` when only the site is named.

## Pre-start checklist

- Substrate-drift: `planFileBackedZflashImage` already
  takes `namedBaoElf`. `parseNamedBaoElfArgs` lives in
  installer `bao-elf-capture.ts` (pure; re-home next to
  the carrier so `file-backed.ts` does not import
  installer `fs`). Overlay / unseal-path still must not
  `readFileSync`.
- Prior-art: #16810 (`081M1VRW8ZY087G0R000XDM4BG`),
  argv parser `081M1VJGMMP087G0R002JRZ458`. Other
  file-backed flags are space-separated `--flag value`.
  `references/prior-art/` not searched recursively.
- Depends on the ESP write. Does not depend on editing
  bash. Bash consume of empty keys is a no-op until the
  medium carries them.

## Kill

- `seal "pkcs11"` in Application.yaml.
- Expanding `ZetaFirstbootRole` / `ZetaFirstbootConfig`.
- Editing `zeta-first-boot.sh`.
- Defaulting `--bao-path` to `NIXOS_HOST_BAO` when only
  `--bao-load-site` is named.
- Inferring `on-host` from `/dev/tpmrm0` or a `.so`.
- Importing `src/Core.TypeScript/installer/bao-elf-capture.ts`
  from `src/Core.TypeScript/zflash/file-backed.ts`.
- extraContainer. `yubihsm.nix`. SoftHSM overlay.
