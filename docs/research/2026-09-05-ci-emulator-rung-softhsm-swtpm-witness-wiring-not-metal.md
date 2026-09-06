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
`src/Core.TypeScript/cluster/unseal-path.ts` plus
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
- Inferring swtpm from `/dev/tpmrm0` on a CI runner.
- Prod key rotation via FIDO or biometric.
- Enabling `security.pam.u2f` from `zeta.hostSeal`.
- Setting `boxRole = "prod-metal"` from a Kubernetes label.
- Two OpenBao seals on one node.
- Silent PKCS#11 → Lucent when the requested device is missing.
- skip-if-absent wearing pass on an emulator cell.
- Collapsing CardContact SmartCard-HSM into YubiHSM (AES-GCM
  stolen; YubiKey treated as the card).
- Pattern 1.

## Host-seal profile — NixOS role, not a k8s label (Aaron 2026-09-05)

Aaron: make the emulator-vs-metal distinction follow **detected
hardware**; NixOS, not just Kubernetes; developers get FIDO and
biometrics; prod boxes rotate automatically.

Kubernetes labels cannot see a USB YubiHSM or a fingerprint
reader. Nix eval also cannot see a hot-plugged device
(`hardware-configuration.nix` in this tree is still
`not-detected.nix`). Split:

| Surface | What it may declare | What it may not |
|---|---|---|
| NixOS `zeta.hostSeal.boxRole` | `undeclared` / `developer` / `prod-metal`. Enables pcscd, YubiHSM udev, libfido2 / fprintd userspace | CI (`ci-emulator` is TypeScript-only). Presence of silicon. `security.pam.u2f` / sudo fingerprint (lockout) |
| `/etc/os-release` `ID=nixos` | This host is NixOS | A YubiHSM is attached |
| `frost-hardware-probe.ts` / `tpm2-linux-probe.ts` | Attached / present / absent / indeterminate / unavailable | SoftHSM2 / swtpm (those are job declarations) |
| CI job | `classifyHostSeal("ci-emulator", …, "softhsm2" \| "swtpm")` | Inferring swtpm from `/dev/tpmrm0` on the runner |

Rotation:

- **developer** — FIDO and biometric *supported*. An attached
  YubiHSM / smartcard HSM / TPM still wins. Assess is
  `no-claim` (allowed, not required).
- **prod-metal** — rotation **must** be automatic (HSM or TPM
  PKCS#11). FIDO / biometric may exist as break-glass; they are
  refused as the rotator (`prod-refuses-fido-rotation` /
  `prod-refuses-biometric-rotation`). Unprobed ≠ drift.
- **ci-emulator** — SoftHSM2 / swtpm, declared by the job.

Init stays gated on every role. Default NixOS `undeclared` is a
no-op (same as `zeta.tpm2Seal.mode = "off"`). Do not set
`prod-metal` on control-plane from a label.

Classifier: `src/Core.TypeScript/cluster/host-seal-profile.ts`.
Nix model: `full-ai-cluster/nixos/modules/host-seal-model.nix`.

## Next slices (after USB HSM-talk companions)

The 2×2 install job is `081M1TS32Y3087G0R0026Y21F5`.
Off-cluster `bao operator init` is `081M1TV43F6087G0R0008QFTKM`.
USB `--bake-cred` companions are `081M1TX6CV6087G0R002GZEXMP`
(`usb-hsm-companion.ts`): module path, connector config,
authkey *reference*, domain map, OpenBao env *name*. PIN /
Shamir / `OP_SESSION` / brand-type refuse as originals.
Application.yaml stays Shamir. SoftHSM green is not
YubiHSM green.

HostPath overlay **planner** is `081M1TZH2PW087G0R0036F3S18`
(`pkcs11-hostpath-overlay.ts`). Volumes, mechanism pin, ABI.
glibc NixOS `.so` into Alpine `openbao-hsm` is
`glibc-host-into-musl-image` and is **not** a module in
reach (hands-off-metal §1.4 option A, unproven). The
companion pointer file is not the `.so`.
`frost-hardware-probe.ts` now looks at those exact NixOS
contracts (`081M1V19MC5087G0R002P2W9EK`); a `.so` is still
a driver. Setup glue (`081M1V32K68087G0R000SW5PJB`)
joins USB companion *contents* into that overlay;
the restore filename is not the `.so`; a companion
without an attached device is not a seal. The current
chart still cannot commit the stanza. Integrate join
(`081M1V5ER44087G0R0000WPCC4`) feeds that overlay from
the path picker; Lucent / a refused request / SoftHSM
are not a hostPath overlay. Bake-cred
(`081M1V6WCHN087G0R0022FN5DV`) refuses the restore
filename as the module-path *value* (it contains
`pkcs11`, so the old rule would bake a self-pointer).
Bake-cred also refuses SoftHSM / swtpm module paths
(`081M1V880WV087G0R002E07KGH`); `libtpm2_pkcs11.so`
stays metal. Setup overlay now consumes an injected
restore-file capture (`081M1V9KQFX087G0R0038J326D`);
opening any other path is not this companion.

Load-site / ELF (`081M1VB58YS087G0R001G1RSXW`): captured
`PT_INTERP` classifies musl vs glibc. Option D host `bao`
is a named site; host HCL is not a chart seal. A glibc
CI tarball on disk is not the chart image.

Installer bytes (`081M1VDMK7R087G0R0038GVG66`):
`ptInterpFromElfBytes` plus `captureBaoElfFromRead`.
No `readelf`. Overlay still does not open a filesystem.

1. Metal: `seal "pkcs11"` in Application.yaml still waits.
   Same commit as a **reachable** module: same-libc image
   (glibc OpenBao that can load the host `.so`) or option D
   host `bao`. Dual-vendor per node is ZetaFS k-of-n, not
   two active OpenBao seals. Do not treat this planner as
   that commit. First-boot still has to pass a named site
   plus a bao path into `captureBaoElfFromRead`.
2. extraContainer Shamir sidecar (`valuesObject` only) until
   kind/CI consume the emulator init.

## Setup-time detect; TPM auto-unseal; Lucent as a peer path (Aaron 2026-09-06)

Aaron: detect during setup whether the real hardware has HSM
and/or TPM; integrate only if that hardware is accessible on
the physical device; use the emulators to test install *with
and without* HSM/TPM; can TPM auto-unseal or only HSM; still
allow hardware that uses 1Password for unsealing (the
2026-09-04 Lucent design); multiple paths.

Classifier: `src/Core.TypeScript/cluster/unseal-path.ts`.
Workitem: `081M1T9X3ZE087G0R000JNAYE7`. This is the path
picker. It does not put `seal "pkcs11"` in Application.yaml
and it does not install SoftHSM2.

| Question | Answer |
|---|---|
| Detect when? | Setup. Capture is injected (`frost-hardware-probe` / `tpm2-linux-probe`). A driver on disk is not a device. Unprobed / unavailable / unreadable / indeterminate is a check that did not run, not absent. |
| Integrate PKCS#11 when? | Only if accessible: YubiHSM `attached`, CardContact SmartCard-HSM present (<https://www.smartcard-hsm.com/>), or TPM `present`. A YubiKey is not a SmartCard-HSM. Requested PKCS#11 that is missing **refuses** — it does not fall to Lucent (no-silent-downgrade). SoftHSM2 is not a substitute for either metal vendor. |
| TPM auto-unseal? | **Yes.** `tpm2-pkcs11`, mechanism **must pin** `CKM_RSA_PKCS_OAEP`. AES-GCM is not a TPM path. |
| HSM auto-unseal? | Yes, both metal vendors. YubiHSM prefers AES-GCM. SmartCard-HSM AES-GCM is **measured on the device** (not inherited from SoftHSM/YubiHSM). `pkcs11-hsm` is a request umbrella; the result names `pkcs11-yubihsm` or `pkcs11-smartcard`. |
| 1Password / Lucent? | **Peer path**, not a silent fallback. Shamir HTTP loop / fetch-at-unseal, threshold >= 2, cannot init. Explicit `lucent-shamir` is allowed even when an HSM is attached. `auto` with a completed look and nothing accessible picks Lucent. |
| Multiple paths? | Fleet may mix PKCS#11-YubiHSM, PKCS#11-SmartCard-HSM, PKCS#11-TPM, Lucent-Shamir, kind-Shamir. **One OpenBao seal per node.** Two distinct paths as seals refuse, including YubiHSM + CardContact on the same member. Dual-vendor custody is ZetaFS k-of-n. |
| Emulator 2×2? | SoftHSM × swtpm, **declared by installing**. Cell that wants an emulator the runner did not install is `fail-missing`. skip-if-absent cannot wear pass. Both installed → ci-softhsm (HSM wins). Neither + Lucent fetcher → lucent-shamir. Neither + kind unsealer → kind-shamir. Neither + nothing → `no-path`. `ci-softhsm` / `ci-swtpm` via `integrateAtSetup` without a job is `emulator-not-declared`. |

YubiHSM wins over SmartCard-HSM wins over TPM when more than
one is accessible (`auto`). That is one OpenBao seal, not a
ranking of vendors for ZetaFS k-of-n.
