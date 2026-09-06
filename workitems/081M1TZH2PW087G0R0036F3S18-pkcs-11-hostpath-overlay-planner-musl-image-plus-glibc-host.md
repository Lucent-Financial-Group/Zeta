---
id: 081M1TZH2PW087G0R0036F3S18
type: task
state: backlog
priority: P2
slug: pkcs-11-hostpath-overlay-planner-musl-image-plus-glibc-host
title: "PKCS#11 hostPath overlay planner; musl image plus glibc host .so is not a module"
created: 2026-09-06T09:06:57.884Z
depends_on: ["081M1TX6CV6087G0R002GZEXMP", "081M1SD6GZ8087G0R001TNHN19"]
composes_with: ["081M0B5V6Z5087G0R0026RANJ3"]
---

# PKCS#11 hostPath overlay planner; musl image plus glibc host .so is not a module

Aaron 2026-09-06: continue after USB `--bake-cred` HSM-talk
companions (#16774). Metal `seal "pkcs11"` needs a module in
the image **or** a hostPath overlay **in the same commit**.
The overlay is plannable now. The stanza is not, because
today's `quay.io/openbao/openbao-hsm` is Alpine/musl and
NixOS PKCS#11 libraries are glibc
(`docs/research/2026-08-21-hands-off-metal-*.md` §1.4 option A:
unproven). A glibc `.so` hostPath into that image is **not**
a module in reach.

This slice classifies the overlay: volumes, mechanism pin,
ABI, whether the committed Application may gain the stanza.
It does not edit `Application.yaml`. SoftHSM CI is not this
overlay. YubiHSM SDK nixpkgs module stays
`081M0B5V6Z5087G0R0026RANJ3` (blocked on sign-off).

## Pre-start checklist

- Substrate-drift: `refuseCommittedPkcs11SealWithoutModule`
  exists; no hostPath overlay planner. USB companions restore
  a *path string* under `/etc/zeta/seal/pkcs11-module-path`,
  not the `.so`. OpenSC already ships on prod-metal
  host-seal. `security.tpm2.pkcs11.enable` lives behind
  `zeta.tpm2Seal.mode = "prereqs"` (default off).
- Prior-art (explicit-target):
  - In-tree: `seal-emulator-rung.ts` mechanism pick;
    `usb-hsm-companion.ts`; `host-seal-profile.ts`;
    `unseal-path.ts` one-seal-per-node.
  - Research: 2026-08-21 hands-off-metal §1.4 A/B/C/D;
    OpenBao PKCS#11 PIN via `BAO_HSM_PIN`, never HCL.
  - YubiHSM NixOS path contract:
    `/run/current-system/sw/lib/pkcs11/yubihsm_pkcs11.so`
    (`081M0B5V6Z5087G0R0026RANJ3`).
- Depends on USB companions + CI emulator classifier.
  Composes with the blocked YubiHSM SDK row (path contract
  only; this slice does not land `yubihsm.nix`).

## Kill

- `seal "pkcs11"` in Application.yaml.
- Treating glibc-host-into-musl-image as `moduleInImage`.
- SoftHSM / swtpm as this overlay.
- PIN bytes in Helm values / HCL / ConfigMap.
- Two OpenBao seals; dual-vendor as two seals.
- Landing `yubihsm.nix` (sign-off still open).
- Appointing `yubi-hsm-mock`. extraContainer sidecar.
