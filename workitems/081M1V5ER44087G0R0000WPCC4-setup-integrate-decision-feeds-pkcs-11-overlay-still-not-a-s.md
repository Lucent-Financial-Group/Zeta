---
id: 081M1V5ER44087G0R0000WPCC4
type: task
state: backlog
priority: P2
slug: setup-integrate-decision-feeds-pkcs-11-overlay-still-not-a-s
title: "Setup integrate decision feeds PKCS#11 overlay; still not a seal stanza"
created: 2026-09-06T10:50:32.964Z
depends_on: ["081M1V32K68087G0R000SW5PJB", "081M1T9X3ZE087G0R000JNAYE7"]
composes_with: ["081M1TZH2PW087G0R0036F3S18"]
---

# Setup integrate decision feeds PKCS#11 overlay; still not a seal stanza

Aaron 2026-09-06: continue after the companion-contents overlay glue
(#16781). `integrateAtSetup` picks a path. `planSetupPkcs11Overlay`
plans volumes. Setup must join them: the integrate decision is the
oracle, companion *contents* still win, a refused integrate is
`no-oracle` (not a seal), SoftHSM / swtpm stay the CI job, and the
current chart still cannot commit the stanza.

## Pre-start checklist

- Substrate-drift: overlay glue + path picker are on main. Nothing
  maps `UnsealPath` → `SealOracle` → overlay plan.
- Prior-art: `planSetupPkcs11Overlay`, `integrateAtSetup`,
  `pickSealOracleFromCapture` (same vendor order: YubiHSM, then
  CardContact, then TPM). OpenBao PKCS#11 seal docs
  (one seal, PIN as env).
- Depends on `081M1V32K68087G0R000SW5PJB` and
  `081M1T9X3ZE087G0R000JNAYE7`.

## Kill

- `seal "pkcs11"` in Application.yaml.
- Companion path without an attached device as a seal.
- Lucent / kind Shamir as this overlay.
- SoftHSM / swtpm as this overlay.
- PIN in values. Two seals. `yubihsm.nix`. extraContainer.
