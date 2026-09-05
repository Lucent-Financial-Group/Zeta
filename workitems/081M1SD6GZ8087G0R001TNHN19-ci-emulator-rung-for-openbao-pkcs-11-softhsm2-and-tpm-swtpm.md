---
id: 081M1SD6GZ8087G0R001TNHN19
type: task
state: backlog
priority: P2
slug: ci-emulator-rung-for-openbao-pkcs-11-softhsm2-and-tpm-swtpm
title: "CI emulator rung for OpenBao PKCS#11 (SoftHSM2) and TPM (swtpm); USB repair keeps HSM-talk"
created: 2026-09-05T18:27:23.240Z
depends_on: []
composes_with: ["081M1S6D1M5087G0R000N11GND", "081KSGS9H0008QG0R002T3BJ2R"]
---

# CI emulator rung for OpenBao PKCS#11 (SoftHSM2) and TPM (swtpm); USB repair keeps HSM-talk

Aaron 2026-09-05: can we push HSM and TPM into CI with emulators?
USB repair already keeps CLI creds; it must also keep HSM-talk.

**Answer named this slice:** yes as a wiring rung (SoftHSM2 /
swtpm). No as a substitute for YubiHSM domains, USB, or this
board's firmware PCRs. Classifier:
`src/Core.TypeScript/cluster/seal-emulator-rung.ts`. Research:
`docs/research/2026-09-05-ci-emulator-rung-softhsm-swtpm-witness-wiring-not-metal.md`.

Otto's OpenBao Application (081M1S6D1M5087G0R000N11GND) is on
`main` and green by presence (not in
`DEV_INCLUDED_PROOF_DEFERRED_DIRS`). This row does **not** steal
that chart. It does **not** put `seal "pkcs11"` in
`Application.yaml` until a module exists in the image in the
same commit.

## Pre-start checklist

- Substrate-drift: Otto's Application.yaml exists; PKCS#11 seal
  does not; `--bake-cred` is still PLACEHOLDER. This row is new
  work, not drift.
- Prior-art (explicit-target, not a runaway grep):
  - OpenBao docs `seal "pkcs11"` example uses SoftHSM
    (`/usr/lib64/softhsm/libsofthsm.so`).
  - `openbao/go-kms-wrapping` CI already runs PKCS#11 against
    SoftHSM (commit 28f1ee5).
  - Yubico yubihsm-shell#381: no public firmware emulator;
    unofficial `yubi-hsm-mock` is HTTP connector in-memory, not
    PKCS#11, not a device.
  - In-tree: 2026-08-21 OpenBao migration §6.2–6.3 (mechanism
    intersection + image has no module); 2026-08-26 NixOS VM
    tests §5.6 (swtpm costs mechanism, not this board's PCRs);
    2026-08-18 shared connector is not a boundary; zflash
    `qemu-tpm-emulator` type already exists.
- Depends: none blocking. Composes with OpenBao Application +
  USB creds seam.

## Acceptance

1. Classifier distinguishes CI emulator claims from metal
   claims. SoftHSM green ≠ YubiHSM green. Tests refute the
   collapse.
2. Committed Application.yaml has no `seal "pkcs11"` while the
   image has no module (tripwire in the same test file).
3. USB repair inventory names companions vs forbidden originals
   (PIN / Shamir / OP_SESSION / brand type in volume).
4. Follow-on (not this PR): Dejan install SoftHSM2/swtpm on the
   runner; off-cluster `bao` job that **installs** the emulator
   so skip-if-absent cannot wear pass.

## Kill

- Seal stanza without a module.
- Appointing `yubi-hsm-mock` as the HSM.
- Helm-fighting Otto on chart currency.
- Baking `YubiHSM` types into the ZetaFS volume.
