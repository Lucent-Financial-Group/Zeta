---
id: 081M1VGV2N6087G0R001ZHWZDS
type: task
state: backlog
priority: P2
slug: first-boot-names-bao-load-site-and-path-into-capturebaoelffr
title: "First-boot names bao load-site and path into captureBaoElfFromRead"
created: 2026-09-06T14:09:31.302Z
depends_on: ["081M1VDMK7R087G0R0038GVG66"]
composes_with: ["081M1TZH2PW087G0R0036F3S18"]
---

# First-boot names bao load-site and path into captureBaoElfFromRead

Aaron 2026-09-06: continue after #16793. `captureBaoElfFromRead`
exists. First-boot still has to pass a **named** site plus a bao
path into it. Do not infer `on-host` from `/dev/tpmrm0` or from
a `.so`. Do not land the stanza.

## Pre-start checklist

- Substrate-drift: `captureBaoElfFromRead` and
  `planSetupFromRestoredCompanion(..., baoElf?)` exist.
  Nothing assembles named site + named path + injected read
  at first-boot. Overlay / unseal-path still must not
  `readFileSync`.
- Prior-art: #16793 (`081M1VDMK7R087G0R0038GVG66`),
  RestoredPkcs11PointerCapture (injected read, not live fs),
  hands-off-metal §1.4 option D (host `bao`, not a chart seal),
  `openbao.org/docs/configuration/seal/pkcs11/`.
  `references/prior-art/` not searched recursively (gitignored
  mirror). Explicit notes dir listed; no ELF/PKCS#11 overlap.
- Depends on the bytes parser. Composes with the overlay planner.

## Kill

- `seal "pkcs11"` in Application.yaml.
- Spawning `readelf`.
- Live `readFileSync` in overlay / unseal-path / bao-load-site.
- `existsSync` then `readFileSync` (CWE-367).
- Inferring `on-host` from `/dev/tpmrm0` or from a `.so`.
- Opening the restore pointer or a `.so` as the bao binary.
- extraContainer. `yubihsm.nix`. SoftHSM overlay.
