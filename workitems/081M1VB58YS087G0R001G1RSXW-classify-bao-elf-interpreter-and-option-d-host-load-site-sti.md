---
id: 081M1VB58YS087G0R001G1RSXW
type: task
state: backlog
priority: P2
slug: classify-bao-elf-interpreter-and-option-d-host-load-site-sti
title: "Classify bao ELF interpreter and option D host load-site; still not a seal"
created: 2026-09-06T12:30:13.977Z
depends_on: ["081M1V9KQFX087G0R0038J326D"]
composes_with: ["081M1TZH2PW087G0R0036F3S18"]
---

# Classify bao ELF interpreter and option D host load-site; still not a seal

Aaron 2026-09-06: continue after #16789. Metal `seal "pkcs11"` waits
on a reachable module in the same commit: same-libc image (glibc
`bao` that can `dlopen` the host `.so`) or option D host `bao`
(hands-off-metal §1.4). Today's chart is Alpine/musl; NixOS
libraries are glibc. The overlay still hard-codes
`OPENBAO_HSM_IMAGE_ABI`. Drive ABI from a captured ELF interpreter
string. Name the load site. Do not land the stanza.

## Pre-start checklist

- Substrate-drift: `planPkcs11HostPathOverlay` takes `imageAbi` as
  an injected enum. `currentChartOverlayInput` always sets
  `alpine-musl`. Nothing classifies `PT_INTERP`. Nothing names
  option D `on-host`. `mayCommitSeal` is the only commit flag, so
  a host-bao HCL would look like a chart seal.
- Prior-art: `pkcs11-hostpath-overlay.ts` ABI refuse;
  `seal-emulator-bao.ts` glibc tarball (`/lib64/ld-linux`);
  hands-off-metal §1.4 A vs D; RestoredPkcs11PointerCapture
  (injected read, no live fs).
- Depends on restore-file capture (#16789). Composes with the
  overlay planner (#16776).

## Kill

- `seal "pkcs11"` in Application.yaml.
- Treating a glibc CI tarball on disk as the chart image.
- Treating glibc-host-into-musl hostPath as `moduleInImage`.
- Live `readelf` / `readFileSync` in this classifier.
- Inferring `on-host` from `/dev/tpmrm0`.
- Opening a `.so` or the restore pointer as the bao ELF.
- extraContainer. `yubihsm.nix`. SoftHSM overlay.
- Two OpenBao seals. PIN in HCL / values.
