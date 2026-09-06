---
id: 081M1VRW8ZY087G0R000XDM4BG
type: task
state: backlog
priority: P2
slug: zflash-esp-writes-joined-bao-names-without-installer-fs
title: "zflash ESP writes joined bao names without installer fs"
created: 2026-09-06T16:29:59.166Z
depends_on: ["081M1VQ6CHS087G0R0036YJAQ5"]
composes_with: ["081M1VM7S47087G0R001VQ1QK5"]
---

# zflash ESP writes joined bao names without installer fs

Aaron 2026-09-06: continue after #16807. The join exists.
`src/Core.TypeScript/zflash/lib.ts` still has to write the
joined conf onto the ESP. Do not import installer `fs`.
Do not expand `ZetaFirstbootRole`. Do not edit
`zeta-first-boot.sh`. Do not land the stanza.

## Pre-start checklist

- Substrate-drift: `planFirstbootConfWithNamedBaoElf` exists
  in installer `bao-elf-capture.ts` (which imports `fs`).
  `planFileBackedZflashImage` still calls
  `planFirstbootConfFileContent` only. Overlay / unseal-path
  still must not `readFileSync`.
- Prior-art: #16807 (`081M1VQ6CHS087G0R0036YJAQ5`),
  `joinTokenSourcePath` requiring a role. Extract the pure
  join next to `firstboot-role.ts` so `lib.ts` can call it.
  `references/prior-art/` not searched recursively.
- Depends on the join. Does not depend on editing bash.

## Kill

- `seal "pkcs11"` in Application.yaml.
- Expanding `ZetaFirstbootRole` / `ZetaFirstbootConfig`.
- Editing `zeta-first-boot.sh`.
- Importing `src/Core.TypeScript/installer/bao-elf-capture.ts`
  from `src/Core.TypeScript/zflash/lib.ts`.
- Inferring `on-host` from `/dev/tpmrm0` or a `.so`.
- extraContainer. `yubihsm.nix`. SoftHSM overlay.
