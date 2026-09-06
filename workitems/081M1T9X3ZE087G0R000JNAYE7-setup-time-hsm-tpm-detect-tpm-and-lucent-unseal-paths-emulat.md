---
id: 081M1T9X3ZE087G0R000JNAYE7
type: task
state: backlog
priority: P2
slug: setup-time-hsm-tpm-detect-tpm-and-lucent-unseal-paths-emulat
title: "Setup-time HSM/TPM detect; TPM and Lucent unseal paths; emulator install 2x2"
created: 2026-09-06T02:49:03.726Z
depends_on: ["081M1SD6GZ8087G0R001TNHN19", "081M1PYZRE5087G0R000HHG5HV"]
composes_with: ["081M1S6D1M5087G0R000N11GND"]
---

# Setup-time HSM/TPM detect; TPM and Lucent unseal paths; emulator install 2x2

Aaron 2026-09-06: detect HSM/TPM during setup; integrate only if
the device is accessible on the physical box; emulator install
tests with and without HSM/TPM; TPM auto-unseal as well as HSM;
keep the Lucent 1Password unseal path (2026-09-04 design);
multiple paths.

Classifier: `src/Core.TypeScript/cluster/unseal-path.ts`.

## Pre-start checklist

- Substrate-drift: host-seal-profile and seal-emulator-rung
  landed (#16689, #16694). PKCS#11 seal is still not in
  Application.yaml. This row is the path picker, not a second
  OpenBao seal stanza.
- Prior-art (explicit-target):
  - OpenBao PKCS#11 seal (HSM or tpm2-pkcs11). TPM floor is
    `CKM_RSA_PKCS_OAEP` (tpm2-pkcs11 has no AES-GCM).
  - `docs/design/2026-09-04-credential-substrate-production-hardening-review.md`
    Lucent fetch-at-unseal / Google sidecar rewrite.
  - `frost-hardware-probe.ts`: driver is not a device;
    no-silent-downgrade.
  - `tpm2-linux-probe.ts`: five-state TPM; unreadable is not
    absent.
- Depends on 081M1SD6GZ8087G0R001TNHN19 (emulator rung) and
  081M1PYZRE5087G0R000HHG5HV (Lucent unseal design). Does not
  steal Otto's OpenBao chart.

## Kill

- Two active OpenBao seals on one node.
- Integrating PKCS#11 because a `.so` is on disk.
- Silent downgrade from requested PKCS#11 to Lucent.
- skip-if-absent wearing pass on an emulator matrix cell.
- `seal "pkcs11"` in Application.yaml without a module.
