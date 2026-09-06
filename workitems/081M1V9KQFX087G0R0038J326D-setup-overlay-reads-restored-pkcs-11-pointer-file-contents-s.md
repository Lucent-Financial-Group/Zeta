---
id: 081M1V9KQFX087G0R0038J326D
type: task
state: backlog
priority: P2
slug: setup-overlay-reads-restored-pkcs-11-pointer-file-contents-s
title: "Setup overlay reads restored PKCS#11 pointer file contents; still not a seal"
created: 2026-09-06T12:03:10.462Z
depends_on: ["081M1V5ER44087G0R0000WPCC4", "081M1V6WCHN087G0R0022FN5DV"]
composes_with: ["081M1V880WV087G0R002E07KGH"]
---

# Setup overlay reads restored PKCS#11 pointer file contents; still not a seal

Aaron 2026-09-06: continue after bake-cred refuses the restore
filename and SoftHSM (#16785, #16787). Setup still takes companion
*contents* as a naked string. The restore file lives at
`/etc/zeta/seal/pkcs11-module-path`. Setup must consume a capture of
that file: contents win, missing file falls back to NixOS, opening
any other path is not this companion, and the current chart still
cannot commit the stanza. No live filesystem — capture is injected.

## Pre-start checklist

- Substrate-drift: `planSetupOverlayFromIntegrate` takes a string.
  Nothing names the restore file as the read.
- Prior-art: `USB_PKCS11_MODULE_POINTER`, HostHardwareCapture
  injection, bake-cred pointer refuse.
- Depends on integrate join + restore-filename bake refuse.

## Kill

- `seal "pkcs11"` in Application.yaml.
- Treating `openedPath` as the module.
- Live `readFileSync` in this classifier.
- SoftHSM overlay. extraContainer. `yubihsm.nix`.
