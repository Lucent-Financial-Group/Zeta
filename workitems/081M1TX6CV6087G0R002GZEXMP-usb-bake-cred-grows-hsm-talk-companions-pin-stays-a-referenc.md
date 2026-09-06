---
id: 081M1TX6CV6087G0R002GZEXMP
type: task
state: backlog
priority: P2
slug: usb-bake-cred-grows-hsm-talk-companions-pin-stays-a-referenc
title: "USB --bake-cred grows HSM-talk companions; PIN stays a reference"
created: 2026-09-06T08:26:10.662Z
depends_on: ["081M1TV43F6087G0R0008QFTKM", "081M1SD6GZ8087G0R001TNHN19"]
composes_with: ["081KSKBP80008QG0R003AX2A69"]
---

# USB --bake-cred grows HSM-talk companions; PIN stays a reference

Aaron 2026-09-06: continue after off-cluster SoftHSM `bao`
init (#16772). A repaired box still has to talk to the
YubiHSM / CardContact HSM. That is a companion inventory on
the stick, not a second secret store.

`--bake-cred` already ships CLI creds. This slice grows the
five HSM-talk kinds the classifier already named
(`USB_HSM_COMPANION` in `seal-emulator-rung.ts`). PIN stays a
reference (env *name*, not bytes). SoftHSM green is not this
metal companion set.

## Pre-start checklist

- Substrate-drift: classifier kinds exist; bake-cred handlers
  do not. `--bake-cred` was PLACEHOLDER for companions.
- Prior-art (explicit-target):
  - In-tree: `USB_HSM_COMPANION` /
    `classifyUsbRepairArtifact`. `zeta-cred-handlers.ts`
    `resolveBakeCred`. Host→Secret projector allowlist
    (`zeta-creds-to-k8s.ts`) — companions are host-only.
  - OpenBao PKCS#11: PIN via `BAO_HSM_PIN`, never HCL.
  - 081KSKBP80008QG0R003AX2A69 bake-cred pipeline.
- Depends on 081M1TV43F6087G0R0008QFTKM (off-cluster init)
  and 081M1SD6GZ8087G0R001TNHN19 (classifier). Composes with
  the USB cred blob (081KSKBP80008QG0R003AX2A69).

## Kill

- PIN plaintext / Shamir shares / `OP_SESSION` as originals.
- A brand type (`YubiHSM`) as a volume type.
- Projecting companions into `zeta-host-creds` Secrets.
- Calling this YubiHSM green. SoftHSM CI is not this stick.
- `seal "pkcs11"` in Application.yaml.
