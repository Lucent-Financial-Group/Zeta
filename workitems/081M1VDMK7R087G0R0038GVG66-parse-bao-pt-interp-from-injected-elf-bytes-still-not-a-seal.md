---
id: 081M1VDMK7R087G0R0038GVG66
type: task
state: backlog
priority: P2
slug: parse-bao-pt-interp-from-injected-elf-bytes-still-not-a-seal
title: "Parse bao PT_INTERP from injected ELF bytes; still not a seal"
created: 2026-09-06T13:14:00.000Z
depends_on: ["081M1VB58YS087G0R001G1RSXW"]
composes_with: ["081M1TZH2PW087G0R0036F3S18"]
---

# Parse bao PT_INTERP from injected ELF bytes; still not a seal

Aaron 2026-09-06: continue after #16791. Load-site classifies a
captured interpreter string. Measurement of a candidate `bao`
belongs in installer/first-boot, not in the overlay classifier.
Parse `PT_INTERP` from injected ELF bytes. Do not spawn
`readelf`. Do not land the stanza.

## Pre-start checklist

- Substrate-drift: `BaoElfCapture.interpreter` is a string.
  Nothing parses ELF. Nothing lives under `installer/` for this
  capture. Overlay still must not `readFileSync`.
- Prior-art: `bao-load-site.ts` (#16791), RestoredPkcs11PointerCapture
  (injected read), ELF64 little-endian `PT_INTERP` (3).
- Depends on the load-site classifier.

## Kill

- `seal "pkcs11"` in Application.yaml.
- Spawning `readelf`.
- Live `readFileSync` in `bao-load-site.ts` / overlay / unseal-path.
- Inferring `on-host` from `/dev/tpmrm0` or from a `.so`.
- Opening the restore pointer or a `.so` as the bao binary.
- extraContainer. `yubihsm.nix`. SoftHSM overlay.
