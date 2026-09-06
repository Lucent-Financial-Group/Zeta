---
id: 081M1VNS22M087G0R000P9A1XH
type: task
state: backlog
priority: P2
slug: first-boot-conf-consume-names-bao-site-and-path-tpmrm0-does
title: "First-boot conf consume names bao site and path; tpmrm0 does not"
created: 2026-09-06T15:35:48.053Z
depends_on: ["081M1VM7S47087G0R001VQ1QK5"]
composes_with: ["081M1VJGMMP087G0R002JRZ458"]
---

# First-boot conf consume names bao site and path; tpmrm0 does not

Aaron 2026-09-06: continue after #16800. The carrier emits both
names. First-boot still has to *read* them. Parse sourced conf
assignments back into a `NamedBaoElfAsk`. Do not expand
`ZetaFirstbootRole`. Do not edit `zeta-first-boot.sh`. Do not
land the stanza.

## Pre-start checklist

- Substrate-drift: `composeFirstbootBaoElfCarrier` and
  `appendFirstbootBaoElfConf` exist. Nothing parses those
  conf lines back into `parseNamedBaoElfArgs` / a named ask.
  Overlay / unseal-path still must not `readFileSync`.
- Prior-art: #16800 (`081M1VM7S47087G0R001VQ1QK5`),
  `parseNamedBaoElfArgs` both-or-neither, firstboot conf
  `KEY='value'` (single-quoted allowlist). `/dev/tpmrm0`
  still matches the allowlist. `references/prior-art/` not
  searched recursively.
- Depends on the carrier. Does not depend on editing bash.

## Kill

- `seal "pkcs11"` in Application.yaml.
- Expanding `ZetaFirstbootRole` / editing `zeta-first-boot.sh`.
- Inferring `on-host` from `/dev/tpmrm0` or a `.so`.
- Treating one conf key as enough.
- Spawning `readelf`. `existsSync` then `readFileSync`.
- extraContainer. `yubihsm.nix`. SoftHSM overlay.
