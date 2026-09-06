---
id: 081M1V32K68087G0R000SW5PJB
type: task
state: backlog
priority: P2
slug: setup-wires-pkcs-11-overlay-from-usb-companion-contents-stil
title: "Setup wires PKCS#11 overlay from USB companion contents; still not a seal stanza"
created: 2026-09-06T10:08:57.544Z
depends_on: ["081M1V19MC5087G0R002P2W9EK", "081M1TX6CV6087G0R002GZEXMP", "081M1TZH2PW087G0R0036F3S18"]
composes_with: []
---

# Setup wires PKCS#11 overlay from USB companion contents; still not a seal stanza

Aaron 2026-09-06: continue after the NixOS probe path (#16779).
USB companions restore a path *string*. The overlay planner
consumes a resolved module path. Setup must join them: companion
*contents* win, NixOS contract is the fallback, the restore
filename is not the `.so`, and a companion without an attached
device is not a seal.

This is still not `seal "pkcs11"` in Application.yaml. Current
chart ABI stays `glibc-host-into-musl-image`.

## Pre-start checklist

- Substrate-drift: overlay planner + USB companion + NixOS
  probe paths are on main. No setup function joins them.
- Prior-art: `resolveOverlayModulePath`,
  `currentChartOverlayInput`, `USB_PKCS11_MODULE_POINTER`,
  `unseal-path.ts` (device, not driver).
- Depends on probe paths, USB companions, overlay planner.

## Kill

- `seal "pkcs11"` in Application.yaml.
- Treating the restore file path as the module.
- Companion path without an attached device as a seal.
- PIN in values. Two seals. SoftHSM overlay. `yubihsm.nix`.
  extraContainer.
