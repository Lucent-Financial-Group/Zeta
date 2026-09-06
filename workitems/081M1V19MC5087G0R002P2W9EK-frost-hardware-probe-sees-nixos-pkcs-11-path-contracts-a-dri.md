---
id: 081M1V19MC5087G0R002P2W9EK
type: task
state: backlog
priority: P2
slug: frost-hardware-probe-sees-nixos-pkcs-11-path-contracts-a-dri
title: "frost-hardware-probe sees NixOS PKCS#11 path contracts; a driver is still not a device"
created: 2026-09-06T09:38:00.000Z
depends_on: ["081M1TZH2PW087G0R0036F3S18"]
composes_with: ["081M0B5V6Z5087G0R0026RANJ3"]
---

# frost-hardware-probe sees NixOS PKCS#11 path contracts; a driver is still not a device

Aaron 2026-09-06: continue after the hostPath overlay planner
(#16776). Cluster nodes are NixOS. The overlay names
`/run/current-system/sw/lib/pkcs11/yubihsm_pkcs11.so` (and
OpenSC for CardContact). `frost-hardware-probe.ts` Linux
YubiHSM list has three Debian-shaped paths and **none** of
the NixOS contract (`081M0B5V6Z5087G0R0026RANJ3` acceptance).
A correctly provisioned node reports
`yubiHsm2Pkcs11ModuleFound: false` until the exact fourth
path is added. Never a wildcard.

A module on disk remains a DRIVER. It does not clear
`noHardwareDetected`. This slice does not land `yubihsm.nix`
(sign-off still open). It does not put `seal "pkcs11"` in
Application.yaml.

## Pre-start checklist

- Substrate-drift: overlay `NIXOS_PKCS11_MODULE_PATH` landed
  (#16776). Probe path lists do not include them.
- Prior-art: PR #12042 (driver ≠ device; YubiHSM ≠ YubiKey);
  overlay planner path contracts; YubiHSM SDK row's fourth
  path (this is that bullet, not the systemd unit).
- Depends on overlay planner. Composes with SDK row (path
  contract only).

## Kill

- Wildcard / glob under `/run/current-system`.
- Treating a NixOS `.so` as an attached device.
- Landing `yubihsm.nix`. `seal "pkcs11"` in Application.yaml.
- extraContainer. SoftHSM as metal. Collapsing OpenSC into
  the YubiHSM module list.
