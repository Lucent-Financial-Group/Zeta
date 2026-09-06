---
id: 081M1VJGMMP087G0R002JRZ458
type: task
state: backlog
priority: P2
slug: first-boot-argv-names-bao-site-and-path-tpmrm0-does-not
title: "First-boot argv names bao site and path; tpmrm0 does not"
created: 2026-09-06T14:38:46.422Z
depends_on: ["081M1VGV2N6087G0R001ZHWZDS"]
composes_with: ["081M1TZH2PW087G0R0036F3S18"]
---

# First-boot argv names bao site and path; tpmrm0 does not

Aaron 2026-09-06: continue after #16795. `planSetupFromNamedBaoElf`
exists. The live installer still has to invoke it with a named
site. Parse `--bao-load-site` and `--bao-path`. Do not infer
`on-host` from `/dev/tpmrm0`. Do not default the NixOS host
path. Do not land the stanza.

## Pre-start checklist

- Substrate-drift: `planSetupFromNamedBaoElf` and
  `namedBaoElfAsk` exist. Nothing parses first-boot argv into
  that join. Overlay / unseal-path still must not
  `readFileSync`.
- Prior-art: #16795 (`081M1VGV2N6087G0R001ZHWZDS`),
  `zeta-creds-to-k8s.ts` `parseArgs`, installer-binding-cli
  (reject, do not rewrite), hands-off-metal §1.4 option D.
  `references/prior-art/` not searched recursively.
- Depends on the named-site join.

## Kill

- `seal "pkcs11"` in Application.yaml.
- Defaulting `--bao-path` to `NIXOS_HOST_BAO` when only the
  site is named.
- Inferring `on-host` from `/dev/tpmrm0` or a `.so`.
- Spawning `readelf`. `existsSync` then `readFileSync`.
- extraContainer. `yubihsm.nix`. SoftHSM overlay.
- Editing `zeta-first-boot.sh` in this slice.
