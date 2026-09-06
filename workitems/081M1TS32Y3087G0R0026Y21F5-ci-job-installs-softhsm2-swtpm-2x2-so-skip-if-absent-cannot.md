---
id: 081M1TS32Y3087G0R0026Y21F5
type: task
state: backlog
priority: P2
slug: ci-job-installs-softhsm2-swtpm-2x2-so-skip-if-absent-cannot
title: "CI job installs SoftHSM2/swtpm 2x2 so skip-if-absent cannot wear pass"
created: 2026-09-06T07:14:27.907Z
depends_on: ["081M1SD6GZ8087G0R001TNHN19", "081M1T9X3ZE087G0R000JNAYE7"]
composes_with: ["081M1S6D1M5087G0R000N11GND"]
---

# CI job installs SoftHSM2/swtpm 2x2 so skip-if-absent cannot wear pass

Aaron 2026-09-06: continue after setup-time path picker landed
(#16728). Next runtime rung is the job that **installs**
SoftHSM2 / swtpm so skip-if-absent cannot wear pass.

Classifier already on main: `unseal-path.ts` `emulatorMatrixCell`.
This row is the consumer. It does **not** put `seal "pkcs11"` in
Application.yaml. It does **not** run `bao operator init`. SoftHSM
green is still not YubiHSM green.

## Pre-start checklist

- Substrate-drift: `seal-emulator-rung.ts` and `unseal-path.ts`
  exist; no workflow installs softhsm2; Application.yaml has no
  PKCS#11 stanza. This is new work, not drift.
- Prior-art (explicit-target):
  - OpenBao PKCS#11 example uses SoftHSM.
  - Ubuntu 24.04 packages `softhsm2` and `swtpm`.
  - In-tree: installer-repair-mode apt-installs then asserts
    tools exist (no skip). `emulatorMatrixCell` fail-missing.
  - `tools/setup/manifests/apt` is the laptop/CI-runtime image
    list — SoftHSM is **not** a laptop requirement; the job
    installs it so a check that did not run cannot look like a
    pass.
- Depends on 081M1SD6GZ8087G0R001TNHN19 (classifier) and
  081M1T9X3ZE087G0R000JNAYE7 (2x2 picker). Does not steal Otto's
  OpenBao chart.

## Kill

- `continue-on-error`, `|| true`, skip-if-absent on a cell.
- Inferring swtpm from `/dev/tpmrm0`.
- `seal "pkcs11"` in Application.yaml.
- Calling this job YubiHSM green or this-board TPM green.
- Adding softhsm2 to every laptop via `manifests/apt`.
