---
id: 081M1TV43F6087G0R0008QFTKM
type: task
state: backlog
priority: P2
slug: off-cluster-bao-pkcs-11-init-against-softhsm-so-shamir-is-no
title: "Off-cluster bao PKCS#11 init against SoftHSM so Shamir is not the unseal"
created: 2026-09-06T07:49:58.374Z
depends_on: ["081M1TS32Y3087G0R0026Y21F5", "081M1SD6GZ8087G0R001TNHN19"]
composes_with: ["081M1S6D1M5087G0R000N11GND"]
---

# Off-cluster bao PKCS#11 init against SoftHSM so Shamir is not the unseal

Aaron 2026-09-06: continue after the SoftHSM2 / swtpm install job
(#16767). Next runtime hop is off-cluster `bao` against the
installed module so OpenBao inits without Shamir unseal keys.

This is the `openbao-inits-without-shamir` claim SoftHSM can
witness. It is still not YubiHSM green. It does **not** put
`seal "pkcs11"` in Application.yaml. The glibc `openbao-hsm`
2.6.2 tarball loads Ubuntu `libsofthsm2.so`; the Alpine
`openbao-hsm` image is musl and is not this job.

## Pre-start checklist

- Substrate-drift: install job landed (#16767). Application.yaml
  still Shamir. `quay.io/openbao/openbao-hsm` ships no module.
- Prior-art (explicit-target):
  - OpenBao PKCS#11 docs: SoftHSM example; key material created
    with `pkcs11-tool` **before** `bao operator init`; PIN via
    `BAO_HSM_PIN` not HCL (Helm renders HCL into a ConfigMap).
  - In-tree: `seal-emulator-rung.ts` SOFTHSM_YES includes
    `openbao-inits-without-shamir`. `ephemeral-vault-init.ts`
    authorises throw-away CI material.
  - 2026-08-21: musl image + glibc `.so` is unproven; this job
    uses the glibc tarball on ubuntu-24.04 instead.
- Depends on 081M1TS32Y3087G0R0026Y21F5 (install) and
  081M1SD6GZ8087G0R001TNHN19 (classifier). Does not steal Otto's
  OpenBao chart.

## Kill

- `seal "pkcs11"` in Application.yaml.
- PIN in the HCL / ConfigMap.
- Mounting Ubuntu SoftHSM into the Alpine image as the proof.
- Calling this YubiHSM / CardContact / this-board TPM green.
- skip-if-absent / `continue-on-error` / `|| true`.

## Recipe (measured 2026-09-06)

1. Fresh SoftHSM tokendir; `softhsm2-util --init-token --free
   --label zeta-ci --pin 1234 --so-pin 1234`.
2. `pkcs11-tool --keygen --key-type aes:32 --label
   bao-root-key-aes` (OpenBao will not mint wrap keys).
3. glibc `openbao-hsm` 2.6.2 tarball, SHA256
   `340511b6f87662b80252c202a7c5aa90dbe32341ea741458d49ce6839c2d7721`.
4. HCL `seal "pkcs11"` with `CKM_AES_GCM`, **no** `pin =`.
   PIN is `BAO_HSM_PIN`.
5. Uninitialized `/v1/sys/health` → 501. `bao operator init
   -recovery-shares=1 -recovery-threshold=1 -format=json`.
   Live JSON has `recovery_keys_b64` (len 1) and
   `unseal_keys_b64` (len 0). Health → 200, log line
   `unsealed with stored key`. No `bao operator unseal`.

Throw-away CI material: `ephemeral-vault-init.ts`. Init JSON
is mode 0600 in `RUNNER_TEMP` and is not printed.
