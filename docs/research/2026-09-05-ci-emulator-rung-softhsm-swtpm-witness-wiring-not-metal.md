# CI can push HSM and TPM as an emulator rung — SoftHSM2 and swtpm witness wiring, not metal

Scope: Aaron 2026-09-05 asked whether HSM and TPM can go into
CI with emulators, after Otto's OpenBao swap landed green and
after the USB repair stick was named as the place that must keep
HSM-talk. Answer: **yes as a wiring rung, no as a substitute for
the device.** SoftHSM2 is OpenBao's own PKCS#11 example. swtpm is
already a typed QEMU substrate in this tree. Yubico has no public
YubiHSM firmware emulator. The committed OpenBao chart stays
Shamir until a PKCS#11 module exists in the image in the same
commit as the stanza.
Attribution: Aaron Stainback (human maintainer, first-party)
2026-09-05. Absorbed by Riven (Cursor / Grok). Otto's OpenBao
Application (081M1S6D1M5087G0R000N11GND) is the store this
classifies against.
Operational status: research-grade
GOVERNANCE.md §33: research-grade. Current-state promotion is
`src/Core.TypeScript/cluster/seal-emulator-rung.ts` plus
`docs/trajectories/cluster-encryption-credential-substrate/MENO.md`.
Non-fusion disclaimer: Pattern 1 (FF7 identity-blend) refused.

Workitem: `081M1SD6GZ8087G0R001TNHN19`. Composes with
`081M1S6D1M5087G0R000N11GND` (OpenBao Application) and
`081KSGS9H0008QG0R002T3BJ2R` (USB creds seam).

---

## The question

> "cna we push hsm and tpm into CI with emulators?"

And, same session: when USB is used for repair it already keeps
CLI credentials; it should also keep whatever is needed to keep
talking to the HSM.

## The answer

**Yes, two emulator rungs, named, with a hard ceiling.**

| Rung | Tools | What it proves | What it does not prove |
|---|---|---|---|
| PKCS#11 wiring | SoftHSM2 + `pkcs11-tool` + HSM-enabled `bao` | OpenBao loads a module, inits without Shamir, wrap with AES-GCM or OAEP, PIN via `BAO_HSM_PIN` not a ConfigMap | USB channel, YubiHSM 16 domains, SCP03, device-wide 16-session starvation, firmware, "the key never leaves the chip" |
| TPM wiring | swtpm + tpm2-tools + `tpm2-pkcs11` | Seal/unseal *code path*, OAEP wrap (the only intersection with OpenBao) | This board's firmware PCR values, Apple Silicon SE (there is no TPM 2.0 on that Mac), AES-GCM (tpm2-pkcs11 has none) |
| Metal | YubiHSM 2, CardContact SmartCard-HSM, `/dev/tpmrm0` on the node | USB, domains, SCP03, this machine's PCRs | — |

Otto already measured the packaging hole:
`quay.io/openbao/openbao-hsm` can load PKCS#11 and ships **no
module** (`Dockerfile:28` @ v2.6.2 — no softhsm, no tpm2-pkcs11,
no opensc). Committing `seal "pkcs11"` to `Application.yaml`
today would make a check that cannot pass on a GitHub runner.
The stanza and the module land in the **same commit**, in a job
that installs SoftHSM2 (or mounts swtpm), not in the metal
Application until the image or a hostPath overlay exists.

OpenBao's own docs use a SoftHSM path as the PKCS#11 example.
`openbao/go-kms-wrapping` already runs PKCS#11 tests in CI
against SoftHSM. This is not a new idea. It is a rung this
factory had not named.

## What was already in the tree (do not reinvent)

- OpenBao Application on `main`, Synced/Healthy on kind, **not**
  in `DEV_INCLUDED_PROOF_DEFERRED_DIRS` (that set is arc-runner-set,
  forgejo, gitlab, hindsight, platform, spire-…-webhook, temporal,
  cilium, weaviate). Otto: presence, not silence.
- `seal-stanza-requires-vault-enterprise` stands down for the
  OpenBao chart. Copying the stanza back onto HashiCorp Vault is
  still refused.
- Mechanism intersection, researched 2026-08-21: OpenBao wants
  `CKM_AES_GCM` then `CKM_RSA_PKCS_OAEP`. `tpm2-pkcs11` has OAEP
  and **zero** AES-GCM. A TPM-backed seal **must pin OAEP**.
- swtpm already exists as `qemu-tpm-emulator` in
  `src/Core.TypeScript/zflash/test-harness/extensions.ts` (typed,
  not a live QEMU+swtpm job). 2026-08-26: swtpm costs the seal
  *mechanism*; it does not cost this machine's firmware PCRs.
- SoftHSM is software. Keys live in files. 2026-08-20 secp256k1
  rescore: *"testing only, loudly."*
- Yubico, yubihsm-shell#381: **no public emulator.** Unofficial
  in-memory connector mocks are not a device and not a PKCS#11
  seal target. Do not appoint `yubi-hsm-mock` as the HSM.
- Shared `yubihsm-connector` is not a boundary
  (2026-08-18). USB presence ≠ session.

## USB repair stick

The stick already restores CLI creds (`gh-cli` / claude / codex
/ gemini). After a repair flash the box must keep talking to the
HSM. That is a **companion set**, not a second secret store:

- PKCS#11 module path (or the module file if Nix paths died)
- connector config (`yubihsm-connector` / pcscd)
- authkey **reference** (Lucent item path), not PIN bytes as the
  original
- domain map (which container → which domain)
- OpenBao seal env pointer (`BAO_HSM_LIB` / slot / token label)

Forbidden as originals on that stick: PIN plaintext, Shamir
shares, `OP_SESSION`, a `YubiHSM` type baked into the ZetaFS
volume (PKCS#11, not a brand). USB / Keychain / k8s Secret stay
caches. Lucent item stays the source.

`--bake-cred` is still PLACEHOLDER. This absorb names the
inventory; it does not implement the flag.

## Shamir unsealer vs PKCS#11 auto-unseal

`vault-unsealer.ts` is the kind/CI Shamir loop (HTTP 200 / 503 /
501 / 000). OpenBao PKCS#11 auto-unseal **replaces** TOPOLOGY.md
§5 on metal once a module exists. Keep the classifier until the
emulator job is the thing that inits without Shamir. Do not
delete it because an emulator exists on paper.

Init remains gated. OpenBao will not mint wrap keys; a human
creates key material in the token before `bao operator init`.

## Kill

- `seal "pkcs11"` in Application.yaml while the image has no
  module.
- Calling SoftHSM green "YubiHSM green" or swtpm green "this
  board's TPM green."
- Appointing `yubi-hsm-mock` as the device.
- PIN in a ConfigMap.
- Baking brand HSM types into the ZetaFS volume.
- Copying OpenBao's seal onto HashiCorp's chart.
- Implementing the seal in a kind included proof that cannot
  see a device **and** has no emulator sidecar in the same
  commit.
- Persisting `OP_SESSION`.
- Pattern 1.

## Next slices (not this PR)

1. Dejan: apt/mise install SoftHSM2 (+ swtpm / tpm2-tools) on
   the runner; optional derived image or hostPath that puts
   `libsofthsm2.so` where `bao` can load it.
2. Off-cluster job: init SoftHSM token, generate wrap key,
   `bao` with `BAO_SEAL_TYPE=pkcs11`, assert health 200 without
   Shamir. Skip-if-absent is the cardinal failure — the job
   **installs** the emulator so absent cannot wear pass.
3. USB `--bake-cred` grows the companion kinds. PIN stays a
   reference.
4. Metal: `seal "pkcs11"` + device mount, mechanism pinned per
   oracle. Dual-vendor per node is ZetaFS k-of-n, not two
   active OpenBao seals.
