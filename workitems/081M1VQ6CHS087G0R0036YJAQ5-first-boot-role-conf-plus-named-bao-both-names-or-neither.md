---
id: 081M1VQ6CHS087G0R0036YJAQ5
type: task
state: backlog
priority: P2
slug: first-boot-role-conf-plus-named-bao-both-names-or-neither
title: "First-boot role conf plus named bao; both names or neither"
created: 2026-09-06T16:00:33.338Z
depends_on: ["081M1VNS22M087G0R000P9A1XH"]
composes_with: ["081M1VM7S47087G0R001VQ1QK5"]
---

# First-boot role conf plus named bao; both names or neither

Aaron 2026-09-06: continue after #16802. Conf consume exists.
The flash still has to *compose* a role conf with the bao
carrier in one call. Do not expand `ZetaFirstbootRole`. Do
not edit `zeta-first-boot.sh`. Do not land the stanza. Do
not import this join into `src/Core.TypeScript/zflash/lib.ts` this slice (that
module stays free of installer `fs`).

## Pre-start checklist

- Substrate-drift: `appendFirstbootBaoElfConf` and
  `parseFirstbootBaoElfConf` exist. Nothing joins
  `planFirstbootConfFileContent` with that append. Overlay
  / unseal-path still must not `readFileSync`.
- Prior-art: #16802 (`081M1VNS22M087G0R000P9A1XH`),
  `joinTokenSourcePath` requiring a role (token with no
  conf is a file nothing reads). Null ask is byte-identical
  to today's role conf. `references/prior-art/` not searched
  recursively.
- Depends on conf consume. Does not depend on editing bash
  or expanding the role type.

## Kill

- `seal "pkcs11"` in Application.yaml.
- Expanding `ZetaFirstbootRole` / `ZetaFirstbootConfig`.
- Editing `zeta-first-boot.sh`.
- Wiring `src/Core.TypeScript/zflash/lib.ts` to import installer `fs` this slice.
- Inferring `on-host` from `/dev/tpmrm0` or a `.so`.
- extraContainer. `yubihsm.nix`. SoftHSM overlay.
