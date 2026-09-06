---
id: 081M1V6WCHN087G0R0022FN5DV
type: task
state: backlog
priority: P2
slug: usb-bake-cred-refuses-the-pkcs-11-restore-filename-as-the-mo
title: "USB bake-cred refuses the PKCS#11 restore filename as the module path"
created: 2026-09-06T11:15:28.438Z
depends_on: ["081M1TX6CV6087G0R002GZEXMP", "081M1V32K68087G0R000SW5PJB"]
composes_with: ["081M1V5ER44087G0R0000WPCC4"]
---

# USB bake-cred refuses the PKCS#11 restore filename as the module path

Aaron 2026-09-06: continue after the integrate→overlay join (#16783).
`--bake-cred pkcs11-module-path=...` accepts an absolute path that
*contains* `pkcs11`. The restore filename
`/etc/zeta/seal/pkcs11-module-path` matches that rule, so the stick
can bake a pointer to itself. Overlay already refuses that string.
Bake must refuse it too.

## Pre-start checklist

- Substrate-drift: overlay glue refuses the pointer as modulePath.
  `validatePkcs11ModulePath` does not.
- Prior-art: `USB_PKCS11_MODULE_POINTER`,
  `companion-pointer-is-not-the-module`,
  `validatePkcs11ModulePath` (ELF bytes / brand / relative path).
- Depends on USB companions + overlay pointer constant.

## Kill

- `seal "pkcs11"` in Application.yaml.
- PIN / Shamir / `OP_SESSION` as bake-cred originals.
- Treating this bake refuse as YubiHSM green.
- extraContainer. `yubihsm.nix`.
