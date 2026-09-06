---
id: 081M1VM7S47087G0R001VQ1QK5
type: task
state: backlog
priority: P2
slug: first-boot-bao-conf-and-argv-carrier-both-names-or-neither
title: "First-boot bao conf and argv carrier; both names or neither"
created: 2026-09-06T15:08:53.255Z
depends_on: ["081M1VJGMMP087G0R002JRZ458"]
composes_with: ["081M1VGV2N6087G0R001ZHWZDS"]
---

# First-boot bao conf and argv carrier; both names or neither

Aaron 2026-09-06: continue after #16797. `parseNamedBaoElfArgs`
exists. First-boot still has to *carry* both names onto the
medium. Emit `ZETA_BAO_LOAD_SITE` plus `ZETA_BAO_PATH` (and the
matching argv) together, or emit neither. Do not expand
`ZetaFirstbootRole`. Do not edit `zeta-first-boot.sh`. Do not
land the stanza.

## Pre-start checklist

- Substrate-drift: `parseNamedBaoElfArgs` and
  `planSetupFromNamedBaoElfArgv` exist. Nothing turns a
  `NamedBaoElfAsk` into firstboot conf lines or argv tokens
  for the medium. Overlay / unseal-path still must not
  `readFileSync`. `zeta-first-boot.sh` still does not pass
  the flags.
- Prior-art: #16797 (`081M1VJGMMP087G0R002JRZ458`),
  `firstboot-role.ts` cluster-segment "all three fields or
  none" plus `SHELL_SAFE_CONF_VALUE_REGEX` (cloud-init /
  kickstart / preseed already cited there). `/dev/tpmrm0`
  matches that allowlist, so the bao-path filter must run
  first. `references/prior-art/` not searched recursively.
- Depends on the argv parser. Does not depend on expanding
  the first-boot role type.

## Kill

- `seal "pkcs11"` in Application.yaml.
- Expanding `ZetaFirstbootRole` / editing `zeta-first-boot.sh`.
- Emitting only one of the two names.
- Treating `/dev/tpmrm0` as shell-safe enough to be a bao path.
- Inferring `on-host` from `/dev/tpmrm0` or a `.so`.
- Spawning `readelf`. `existsSync` then `readFileSync`.
- extraContainer. `yubihsm.nix`. SoftHSM overlay.
