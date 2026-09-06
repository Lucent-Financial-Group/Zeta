---
id: 081M1V880WV087G0R002E07KGH
type: task
state: backlog
priority: P2
slug: usb-bake-cred-refuses-softhsm-swtpm-as-a-metal-pkcs-11-modul
title: "USB bake-cred refuses SoftHSM/swtpm as a metal PKCS#11 module path"
created: 2026-09-06T11:39:18.300Z
depends_on: ["081M1V6WCHN087G0R0022FN5DV", "081M1TX6CV6087G0R002GZEXMP"]
composes_with: ["081M1TS32Y3087G0R0026Y21F5"]
---

# USB bake-cred refuses SoftHSM/swtpm as a metal PKCS#11 module path

Aaron 2026-09-06: continue after the restore-filename bake refuse
(#16785). MENO already says SoftHSM CI is not this metal companion
set. `--bake-cred pkcs11-module-path=/usr/lib/softhsm/libsofthsm2.so`
still accepted. Overlay refuses SoftHSM as a hostPath overlay. The
repair stick must refuse it too. swtpm is the same CI rung, not a
metal `.so`. `libtpm2_pkcs11.so` stays metal.

## Pre-start checklist

- Substrate-drift: overlay refuses `softhsm-is-not-a-hostpath-overlay`.
  Bake-cred still accepts `libsofthsm2.so` (explicit test).
- Prior-art: `validatePkcs11ModulePath`, `USB_PKCS11_MODULE_POINTER`
  refuse, `seal-emulator-rung.ts` CI vs metal, 2×2 install job.
- Depends on USB companions + restore-filename refuse.

## Kill

- `seal "pkcs11"` in Application.yaml.
- Calling this refuse "YubiHSM green" or "this-board TPM green."
- Inferring swtpm from `/dev/tpmrm0`.
- Refusing `libtpm2_pkcs11.so` (metal). extraContainer. `yubihsm.nix`.
