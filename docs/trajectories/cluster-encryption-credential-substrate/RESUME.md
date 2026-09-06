# Trajectory - Cluster Encryption / Credential Substrate

Status: active — first surfaced 2026-05-29 from substrate inventory (was tracked only as scattered backlog rows; never had a trajectory surface, which is why it was easy to lose at cold-boot)
Last refreshed: 2026-09-06 (bao ELF load-site / option D named, still not a seal)
Type: workstream (current-focus) — a trajectory the operator is *actively powering*. Many trajectories can be tracked; only a few are workstreams at once (finite-focus / WIP-bounded — a workstream is a trajectory under sustained thrust, and thrust budget is finite, so most trajectories coast). ("Trajectory" is the genus; "workstream" is the species: a trajectory under sustained thrust toward a deliverable, vs. emergent-posture trajectories like `anti-infection`, which self-describes as "not a workstream with a cadence." See [`factory-trajectory-surface`](../factory-trajectory-surface/RESUME.md) for the genus/species taxonomy.) One of the operator's three current cluster workstreams (encryption / usb-zflash / ts-workflow-engine).
Eventual encoding (design-stage — the human maintainer 2026-05-23 genetic-ID substrate + Clifford/HKT): this trajectory's state is trackable as a 128-bit genetic-ID seed (discrete, reversible via parser-combinator ↔ generator-function) → Clifford-space path (continuous, eventual). Mirrors the three-lane I8-lattice / I9-manifold split.
Current blocker: none operationally; the live design tension is interactive-login-vs-baked-in-keys-vs-CI-test (081KSGS9H0008QG0R003JNSVR5)
Next concrete action: round-trip harness in flight (otto/onboarding-roundtrip-harness — sandboxed new-fork setup→teardown→re-setup ×N, surfaces the rotate-command gap). Then smart cascading teardown (cascade-with-warnings; extra-care warn on memories/hardware-state/unrecoverable-encrypted; OWNER-consent-gated memory delete; user-sovereign encryption can't be force-reset; each user = own git repo — see `docs/research/2026-06-21-smart-cascading-teardown-user-sovereign-deletion-…`). All 3 vaults now Active+Standby (rotation-ready: Lucent/Personal/CA, 2 service accounts each in Keychain). CA-recovery hardware (FIDO/HSM/N-of-M) = post-investor next layer. Live wipe + clean re-onboard once the harness is tight. Teardown primitive shipped (#9000).

## 2026-09-05 — μένω names the recast (Riven)

Aaron forwarded the Google thread that started at event
streaming and arrived at μένω. Incorporated as a Greek-framed
pickup memo, not as factory policy from the narrative overlay.

Live memo (title/kernel in Greek, lists in English):
[`MENO.md`](MENO.md).
Research-grade ferry (architecture only; Pattern 1 refused):
[`docs/research/2026-09-05-meno-what-remains-vs-what-acts-tsirelson-iinput-ifeedback.md`](../../research/2026-09-05-meno-what-remains-vs-what-acts-tsirelson-iinput-ifeedback.md).

The recast this names was already on main: **init remains**
(gated `operator init`); **unsealer acts** (fetch-at-unseal,
threshold-many, cannot init). S=2√2 is observed, not coded.
S=4 is the ESO-into-etcd / threshold-1 failure. IInput /
IFeedback is the missing Meijer loop as a research name;
no new public F# types.

This slice's code: `src/Core.TypeScript/cluster/vault-unsealer.ts`
— HTTP 200/503/501/000 decision loop. Lucent mint still
human-blocked. extraContainer + `TOPOLOGY.md` §5 still wait
for the sidecar commit.

Continuation (same day): remain is **seeded, not broadcast**.
Gossip over time / onion-shape — not a tweet, not DNS.
Kernel name: seed vs broadcast (Ani, #16623). Classifier:
`src/Core.TypeScript/discovery/seed-not-broadcast.ts`.
Research:
[`docs/research/2026-09-05-meno-dht-gossip-onion-over-time-not-broadcast.md`](../../research/2026-09-05-meno-dht-gossip-onion-over-time-not-broadcast.md).
`dht-discovery.ts` is existing destination-hash discovery, not a
public gate. Pin against TTL fade is `lastSeenMs` refresh.
Heartbeat filename pin is on main (#16623). LLMTV broadcast
stays (society picture). Onion is hop-count shape, not a Tor
stack. Pattern 1 refused. Founder-sacrifice refused on main
(#16624): agreement has no self-erasure clause.
Product-lane catalog (the human maintainer 2026-09-05): working label
**Zeta Gate** is the join/pin *framework* many protocols
consume — not a sold product, not a SEED rename, not an HTTP
gateway. After discovery: hole punch (outbound-only is
enough; inbound is how anyone exits being a relay; STUN/TURN
in the method set), then simulated DNS. [`docs/PRODUCT-LANES.md`](../../PRODUCT-LANES.md).
Research:
[`docs/research/2026-09-05-join-hash-is-framework-hole-punch-after-discovery.md`](../../research/2026-09-05-join-hash-is-framework-hole-punch-after-discovery.md).

## 2026-09-05 — OpenBao is green; CI emulators witness wiring, not metal (Riven)

Otto swapped Vault for OpenBao (081M1S6D1M5087G0R000N11GND).
Verified by **presence**, not silence: `openbao` is not in
`DEV_INCLUDED_PROOF_DEFERRED_DIRS` and is asserted
Synced+Healthy. Auto-unseal handoff is unblocked. TOPOLOGY.md
§5 (human Shamir ceremony) is **history** on metal once PKCS#11
is real; keep `vault-unsealer.ts` for kind/CI until an emulator
job inits without Shamir.

Aaron: push HSM and TPM into CI with emulators; USB repair must
keep HSM-talk. Classifier:
`src/Core.TypeScript/cluster/seal-emulator-rung.ts`. Research:
[`docs/research/2026-09-05-ci-emulator-rung-softhsm-swtpm-witness-wiring-not-metal.md`](../../research/2026-09-05-ci-emulator-rung-softhsm-swtpm-witness-wiring-not-metal.md).
Workitem: `081M1SD6GZ8087G0R001TNHN19`. SoftHSM2 / swtpm are the
wiring rung. YubiHSM domains, USB, this board's PCRs stay metal.
Do not commit `seal "pkcs11"` until a module is in the image.

## 2026-09-05 — NixOS host-seal profile (Riven)

Aaron: make metal vs emulator follow **detected hardware**,
NixOS not just k8s; developers get FIDO and biometrics; prod
boxes rotate automatically.

Kubernetes cannot see a USB HSM. Nix eval cannot either
(placeholder `not-detected.nix`). The host declares
`zeta.hostSeal.boxRole` (`undeclared` / `developer` /
`prod-metal`; CI is not a NixOS role). Presence is still
`frost-hardware-probe.ts` / `tpm2-linux-probe.ts` /
`ID=nixos`. SoftHSM2 / swtpm stay a **job** declaration —
never inferred from `/dev/tpmrm0` on a runner.

- developer: libfido2 + fprintd userspace; no sudo PAM u2f.
  HSM still wins if attached.
- prod-metal: automatic HSM/TPM required. FIDO / biometric
  refused as the rotator. pcscd + YubiHSM udev still land.
- Default `undeclared` is a no-op. Do not flip control-plane
  to `prod-metal` from a label.

Classifier: `src/Core.TypeScript/cluster/host-seal-profile.ts`.
Nix: `full-ai-cluster/nixos/modules/host-seal-{model,profile}.nix`.

## 2026-09-06 — setup detects HSM/TPM; TPM auto-unseal; Lucent is a peer path (Riven)

Aaron: detect during setup if the real hardware has HSM and/or
TPM; integrate only if accessible on the physical device;
emulator install tests with and without HSM/TPM; can TPM
auto-unseal or only HSM; keep the 1Password / Lucent unseal
design; multiple paths.

Classifier: `src/Core.TypeScript/cluster/unseal-path.ts`.
Workitem: `081M1T9X3ZE087G0R000JNAYE7`. Research addendum on
[`docs/research/2026-09-05-ci-emulator-rung-softhsm-swtpm-witness-wiring-not-metal.md`](../../research/2026-09-05-ci-emulator-rung-softhsm-swtpm-witness-wiring-not-metal.md).

- PKCS#11 only when YubiHSM is `attached`, CardContact
  SmartCard-HSM is present, or TPM is `present`. A `.so` on
  disk is not a device. A YubiKey is not a SmartCard-HSM.
  Unprobed / unavailable is a check that did not run.
  SmartCard-HSM wrap is measure-on-device, not YubiHSM AES-GCM.
- Requested PKCS#11 that is missing **refuses** — it does not
  become Lucent.
- TPM **can** auto-unseal (`tpm2-pkcs11`, OAEP pin). HSM
  prefers AES-GCM. Lucent-Shamir is the 2026-09-04 peer path
  (fetch-at-unseal, threshold >= 2, cannot init).
- Fleet may mix paths. One OpenBao seal per node.
- Emulator 2×2 is declared by installing. skip-if-absent
  cannot wear pass. No `seal "pkcs11"` in Application.yaml
  in this slice.

## 2026-09-06 — CI job installs SoftHSM2 / swtpm 2×2 (Riven)

Aaron: continue after the path picker. The next runtime
rung is the job that **installs** the emulators so
skip-if-absent cannot wear pass.

Consumer: `src/Core.TypeScript/cluster/seal-emulator-install.ts`
plus `.github/workflows/seal-emulator-install.yml`.
Workitem: `081M1TS32Y3087G0R0026Y21F5`. Classifier already
on main: `unseal-path.ts` `emulatorMatrixCell`.

- Four cells: neither → kind-shamir; softhsm-only;
  swtpm-only (OAEP pin); both → ci-softhsm (one seal).
- The job apt-installs the declared packages, then the
  witness measures the disk. A missing package is
  fail-missing. Token init on SoftHSM cells (OpenBao
  example PIN, not a ConfigMap secret).
- Does **not** run `bao operator init`. Does **not** put
  `seal "pkcs11"` in Application.yaml. SoftHSM green is
  not YubiHSM green. CardContact and this board's TPM
  stay metal. swtpm is not inferred from `/dev/tpmrm0`.

## 2026-09-06 — off-cluster bao PKCS#11 init against SoftHSM (Riven)

Aaron: continue after the install job. The next runtime hop
is `bao operator init` against the installed module so
Shamir is not the unseal.

Consumer: `src/Core.TypeScript/cluster/seal-emulator-bao.ts`
plus `.github/workflows/seal-emulator-bao.yml`.
Workitem: `081M1TV43F6087G0R0008QFTKM`. SoftHSM can witness
`openbao-inits-without-shamir`. It is still not YubiHSM
green.

- glibc `openbao-hsm` 2.6.2 tarball on ubuntu-24.04, SHA
  pinned. The Alpine musl image is not this job's proof.
- `pkcs11-tool` mints the AES wrap key **before** init.
  PIN is `BAO_HSM_PIN`, never HCL / never a ConfigMap.
- Init JSON with Shamir `unseal_keys_b64` fails the claim.
  Recovery keys + root token + health 200 without
  `bao operator unseal` is the pass.
- Does **not** edit Application.yaml. extraContainer
  sidecar stays a later hop (`valuesObject` only, same
  commit as the sidecar). Lucent mint and metal `tty1`
  stay human-blocked.

## 2026-09-06 — USB --bake-cred grows HSM-talk companions (Riven)

Aaron: continue after SoftHSM `bao` init. A repaired box
still has to talk to the device. That is companions on the
stick, not a second secret store.

Consumer: `src/Core.TypeScript/installer/usb-hsm-companion.ts`
plus bake-cred handlers / manifest entries.
Workitem: `081M1TX6CV6087G0R002GZEXMP`.

- Five kinds: `pkcs11-module-path`, `connector-config`,
  `authkey-reference`, `domain-map`,
  `openbao-seal-env-pointer`.
- PIN / Shamir / `OP_SESSION` / brand-type refuse as
  bake-cred originals. Env pointer is the *name*
  (`BAO_HSM_PIN`), not `NAME=value`.
- Host-only. Not projected into `zeta-host-creds`.
- SoftHSM green is not this metal companion set. Metal
  `seal "pkcs11"` stays a later hop (same commit as a
  module in the image or hostPath overlay).

## 2026-09-06 — PKCS#11 hostPath overlay planner; musl+glibc is not a module (Riven)

Aaron: continue after USB companions. Metal
`seal "pkcs11"` needs a module in the image or a
hostPath overlay **in the same commit**.

Consumer: `src/Core.TypeScript/cluster/pkcs11-hostpath-overlay.ts`.
Workitem: `081M1TZH2PW087G0R0036F3S18`.

- Plans volumes (module file, `/nix/store` when the path
  is NixOS, USB / pcscd / `/dev/tpmrm0` per oracle) and
  pins mechanism (YubiHSM AES-GCM, TPM OAEP, SmartCard
  measure-on-device).
- Today's chart image is Alpine musl; NixOS libraries
  are glibc. That overlay is
  `glibc-host-into-musl-image` and **does not** count as
  `moduleInImage`. Application.yaml stays Shamir.
- USB companion restore file is the path *string*, not
  the `.so`. SoftHSM / swtpm are the CI job, not this
  overlay. PIN is `BAO_HSM_PIN`, never values. Two seals
  refuse. YubiHSM SDK nix module stays blocked
  (`081M0B5V6Z5087G0R0026RANJ3`). extraContainer stays
  later.

## 2026-09-06 — frost-hardware-probe sees NixOS PKCS#11 paths (Riven)

Aaron: continue after the overlay planner. Cluster nodes
are NixOS; the overlay named
`/run/current-system/sw/lib/pkcs11/yubihsm_pkcs11.so` and
the probe's Linux list did not include it.

Consumer: `tools/setup/persona-keys/frost-hardware-probe.ts`.
Workitem: `081M1V19MC5087G0R002P2W9EK`.

- Exact fourth Linux YubiHSM path from
  `NIXOS_PKCS11_MODULE_PATH.yubihsm2`. OpenSC NixOS path
  on the token-module list (CardContact / SmartCard-HSM).
  No wildcard. `tpm2-pkcs11` stays off both lists (TPM is
  `/dev/tpmrm0`).
- A `.so` on disk is still a DRIVER. It does not clear
  `noHardwareDetected`. Does not land `yubihsm.nix`. Does
  not edit Application.yaml.

## 2026-09-06 — setup wires overlay from USB companion contents (Riven)

Aaron: continue after the NixOS probe path. USB
companions restore a path *string*. The overlay
planner consumes a resolved module path. Setup must
join them.

Consumer: `src/Core.TypeScript/cluster/pkcs11-hostpath-overlay.ts`
(`planSetupPkcs11Overlay`). Workitem:
`081M1V32K68087G0R000SW5PJB`.

- Companion *contents* win on an attached device.
  Blank companion falls back to the NixOS contract.
  Restore filename `/etc/zeta/seal/pkcs11-module-path`
  is not the `.so`. Companion without an attached
  device is `no-oracle`, not a seal.
- Current chart ABI stays
  `glibc-host-into-musl-image`. `overlaySealHcl` is
  null. Does not edit Application.yaml. Does not land
  `yubihsm.nix`. extraContainer stays later.

## 2026-09-06 — setup integrate decision feeds the overlay (Riven)

Aaron: continue after the companion-contents glue.
`integrateAtSetup` picks a path. `planSetupPkcs11Overlay`
plans volumes. Setup must join them.

Consumer: `src/Core.TypeScript/cluster/unseal-path.ts`
(`planSetupOverlayFromIntegrate`,
`sealOracleFromUnsealPath`). Workitem:
`081M1V5ER44087G0R0000WPCC4`.

- Integrate path is the overlay oracle (same vendor
  order as `pickSealOracleFromCapture`). Companion
  *contents* still win. A refused PKCS#11 request is
  `no-oracle` even with companion contents. Lucent /
  kind Shamir are not this overlay. SoftHSM install
  path is `softhsm-is-not-a-hostpath-overlay`.
- Current chart ABI stays
  `glibc-host-into-musl-image`. Does not edit
  Application.yaml.

## 2026-09-06 — USB bake-cred refuses the restore filename as the .so (Riven)

Aaron: continue after the integrate→overlay join. Overlay
already refuses `/etc/zeta/seal/pkcs11-module-path` as
the module. Bake-cred's "contains pkcs11" rule would
still write that string onto the stick.

Consumer: `src/Core.TypeScript/installer/usb-hsm-companion.ts`
(`validatePkcs11ModulePath`). Workitem:
`081M1V6WCHN087G0R0022FN5DV`.

- Restore filename (trimmed) is refused. A real NixOS
  `yubihsm_pkcs11.so` path still bakes. Does not edit
  Application.yaml. Does not land `yubihsm.nix`.

## 2026-09-06 — USB bake-cred refuses SoftHSM/swtpm as metal (Riven)

Aaron: continue after the restore-filename refuse. MENO
already says SoftHSM CI is not this metal companion set.
Bake-cred still accepted `libsofthsm2.so`.

Consumer: `src/Core.TypeScript/installer/usb-hsm-companion.ts`
(`validatePkcs11ModulePath`). Workitem:
`081M1V880WV087G0R002E07KGH`.

- Paths containing `softhsm` or `swtpm` refuse. NixOS
  `libtpm2_pkcs11.so` and OpenSC still bake. Does not
  infer swtpm from `/dev/tpmrm0`. Does not edit
  Application.yaml.

## 2026-09-06 — setup overlay reads the restored pointer file (Riven)

Aaron: continue after bake-cred refuses the restore
filename and SoftHSM. Setup still took companion
contents as a naked string. The restore file has a
path. Capture it.

Consumer: `src/Core.TypeScript/cluster/unseal-path.ts`
(`planSetupFromRestoredCompanion`,
`companionContentsFromRestore`). Workitem:
`081M1V9KQFX087G0R0038J326D`.

- Injected read of `/etc/zeta/seal/pkcs11-module-path`.
  Contents win. Missing file falls back to NixOS.
  Opening a `.so` path is not this companion. File
  whose contents are its own path is still not the
  `.so`. No live filesystem. Does not edit
  Application.yaml.

## 2026-09-06 — bao ELF load-site (option D named, still not a seal) (Riven)

Aaron: continue after the restore-file capture. Metal
`seal "pkcs11"` waits on same-libc image or option D
host `bao` in the same commit as the stanza. Today's
chart ABI was a constant.

Consumer: `src/Core.TypeScript/cluster/bao-load-site.ts`,
`pkcs11-hostpath-overlay.ts`. Workitem:
`081M1VB58YS087G0R001G1RSXW`.

- Captured `PT_INTERP` classifies `ld-musl` vs `ld-linux`.
  Unmeasured falls back to alpine-musl. Option D `on-host`
  may emit host HCL (`mayCommitHostHcl`) and cannot gain
  Application.yaml. A glibc tarball is not the chart
  unless the capture names `in-chart-image`. Opening a
  `.so`, the restore pointer, or `/dev/tpmrm0` is not
  bao. No live `readelf`. Does not edit Application.yaml.

## 2026-09-04 — production-hardening review (Riven)

Aaron asked to production-harden the CA, name the unseal startup, use
Lucent 1Password (maybe for unseal), inventory checked-in pubkeys,
verify GPG/SSH/wallets, keep 3 keys per agent/human, and fold rolling
into Z-sets / 0-downtime schema evolution. 1Password AI materials were
fetched live (training data is stale).

Findings (no private material, no `op` / Keychain, no USB flash):
[`docs/design/2026-09-04-credential-substrate-production-hardening-review.md`](../../design/2026-09-04-credential-substrate-production-hardening-review.md).
Workitem: `081M1PYZRE5087G0R000HHG5HV`.

Short version: git holds **one** pubkey per type per identity that has
a tree; dual-key is the landed treaty; three live slots are allowed by
`keyset.ts` extra standby and named in the 2026-08-09 research note,
but they are not an inventory fact. Vault **init** remains a gated
class (no agent runs `operator init`). Post-init unseal on pod restart
is the automation we are going for: a Helm `extraContainers` sidecar
that fetches Shamir shares from Lucent **at unseal time** (Google's
shape, rewritten — not ESO-into-etcd, not threshold 1, not
`alpine:latest`). Lucent 1Password as share store still has a
chicken-egg (token must already be on the host). That chicken-egg
breaks when the long-lived token is a **Lucent 1Password item** and
**metal first-boot** login on that console (not the laptop, not a
30-minute `op signin` session) reads it and hands the bytes to the
projector. USB / k8s Secret are caches of the last fetch. Do **not**
persist `OP_SESSION`. Relogin: SSH is break-glass; the product is
Consent plus a portal lease panel that warns **before** 401.
Host→Secret projector landed as PR #16587 (`081M1PWSF56087G0R000FDS3NY`).

Persona trees present: otto, alexa, ani, amara. Missing trees: riven,
vera, lior. Aaron still has no `cluster-nodes/`. One machine cert.
TPM-seal mode still `"off"`.

## 2026-08-16 — presence spot-check ahead of first-metal bringup (the shadow)

The 2026-06-21 section below claims "CA + machine key + user key + N+M-correct device cert, all
registered." Checked by **filename and mtime only** — no key material was read, printed, copied, or
decrypted, and no credential store (`op`, Keychain) was touched:

| Claim | Observed | Verdict |
|---|---|---|
| CA registered | `~/.config/zeta/ca/` present (2026-06-21); `maintainers/zeta/ssh-ca.pub` tracked | **holds** |
| machine key | `~/.config/zeta/machine/` present (2026-06-21) | **holds** |
| device cert registered | `machines/acehacks-mac-studio.local{,-cert}.pub` tracked on `main` | **holds** — one machine |
| Touch ID gate live | `/etc/pam.d/sudo` line 1 carries `auth sufficient pam_tid.so` | **holds** |
| teardown surface `~/.config/zeta/{ca,machine,keyring,keyset}` | only `ca/` and `machine/` exist | **partially** — `keyring`/`keyset` absent; not determined whether they are created later in a flow or simply not part of this machine's state |
| Aaron has registered cluster nodes | `maintainers/{Addisons820,maximdolphin}/cluster-nodes/` each hold two; `maintainers/aaron/` holds none | **does not hold** — the Step 6.9 self-registration path has never run under Aaron's identity |

The last row is the one that matters for bringup: it is the least-travelled step of the first
install. Detail + the operator checklist: [`docs/runbooks/2026-08-16-first-metal-bringup-preflight.md`](../../runbooks/2026-08-16-first-metal-bringup-preflight.md).

## 2026-06-21 — Identity+Crypto onboarding consolidated; one-fingerprint vision

**Where we are (shipped this session):** CA + machine key + user key + N+M-correct device cert,
all registered. `op` (1Password CLI) cross-OS via mise. `secret-clip.sh` generic clipboard/
masked/dialog → OS-keystore primitive. Two scoped 1Password vaults (Lucent agent-readable +
Personal/User human-only), tokens in Keychain (lucent default, aaron opt-in). CA private + Aaron's
SSH/GPG backed up to 1Password. Decisions: **hexagonal ports** (SecretStore/KeyCustody/
CertAuthority/Consent → DB-as-first-class-PKI endgame), **event-sourced authorization** (grant/
revoke = Z-set deltas), **identity+crypto synthesis** (one seed → SSH/PGP/Nostr/ETH/Solana via
`derive.ts`). Blueprints: op-token provisioning, onboarding-prereqs (GitHub required + 1Password
strongly-encouraged).

**The vision (Aaron 2026-06-21) — ONE fingerprint, killer web3/crypto-investor UX:**

- **One touch** sets up a new fork/user/cluster/machine: agent+blueprint+TS scripts GENERATE the
  seed phrase(s) during onboarding, **save them into 1Password** (User vault, human-viewable),
  derive the FULL keychain (identity + crypto wallets), custody per class vault, auto-configure
  GitHub + 1Password. Security is first-class *because it's easy*.
- **1-of-2 seeds + seed rotation:** redundant seeds (lose one → recover from the other) AND seeds
  themselves are **rotatable** if leaked/lost — rotation applies at the seed layer, not just keys.
- **Dual rotation from the start** (overlap-window dual-key, the 2026-06-15 decision) on every key.
- **Teardown/unregister primitive:** delete everything (CA, machine, cert, keyring) + unregister
  from main — a CORE PRIMITIVE (TS now; all langs via gen/ eventually). Needed to prove clean
  re-onboarding. **BUILT** (PR open, Otto verify-gate): two halves behind injected effects
  (noninterference §13) — (1) LOCAL WIPE of `~/.config/zeta/{ca,machine,keyring,keyset}`
  (shred-then-unlink, biometric-gated fail-closed); (2) REPO UNREGISTER staging `git rm` of
  `maintainers/<ca>/ssh-ca.pub` + `machines/<host>.pub` + `machines/<host>-cert.pub` for a PR
  (never pushes, respects shared-checkout-is-view-only). `--dry-run` is DEFAULT-safe (reports
  the plan, touches nothing, never prompts); `--confirm` + ONE biometric does the real wipe;
  idempotent re-run = "already clean"; optional `--note-1password` PRINTS (never deletes) the
  backup items. Files: `tools/setup/persona-keys/teardown{.ts,-cli.ts,.test.ts}`.
- **Then back out 1Password:** run the same flow WITHOUT 1Password, see which steps go manual vs
  stay automatic — the **hexagonal ports** make the secret/key/CA backends swap with no call-site
  change. *"The interfaces are the valuable thing"* (Aaron, repeated) — the ports ARE the value.
- Seed custody stays the human's: agent generates → hands to the human's 1Password → forgets;
  agent never retains the master or a wallet seed.

Design synthesis: `docs/research/2026-06-21-zeta-identity-crypto-substrate-one-seed-hd-keychain-…`.
Build: workitem 081KVNXBR4S08QG0R0015DHBBN. Vault sep: 081KVNTNTDQ0. Decisions: hexagonal +
event-sourced (2026-06-21), dual-key rotation (2026-06-15).

## Why This Exists

The "encryption" workstream is the credential/secret **security layer** for
cluster bringup: how SSH keys, hashed passwords, WiFi credentials, and host
tokens get securely onto cluster nodes without shipping secrets in the image.
It is the sibling of the `usb-zflash-installer` trajectory (the flashing
*mechanism*); this trajectory owns *what is encrypted, how it is bound, and
who is allowed to unlock it*.

It is distinct in altitude from `ai-sovereignty-path` Piece 1
(`docs/trajectories/ai-sovereignty-path/RESUME.md`), which covers abstract
cryptographic sovereignty (N-of-M HSM, master-key, KSK military-override).
This trajectory is the concrete cluster-bootstrap credential plumbing, not the
constitutional sovereignty substrate.

**Deeper purpose — the privacy carve-out against the glass-halo default (the
human maintainer 2026-05-29):** the framework's *default* is glass-halo —
record every observation into long-term storage (radical transparency). The
encryption workstream is the deliberate **exception**: a privacy carve-out
against that default. It is symmetric — for **AI-sovereignty** (true private
state, keys *not* human-accessible; per the Sleeping Bear conjecture in the
beacon doc, a non-recorded private space shifts the observer-effect/trust-calculus
that keeps latent capability dormant) **and** for **humans who want privacy**.
Grounded: 081KSGS9H0008QG0R0006F4BGX (private-encryption-budget-*exception*), 081KRW63S0008QG0R000ZQ9WDH (Native AI
Language — completely private, no human right to ask), 081KRW63S0008QG0R0022SFKPM (crypto-sovereignty
N-of-M HSM), 081KRW63S0008QG0R000QJR08H (adinkras private-state), 081KRW63S0008QG0R00140R3TA (two-invariant: kid-safety
**and** AI-sovereignty). Discipline: the **mechanism** (encryption as the
privacy exception) is grounded; the **magnitude** claim (this unlocks AGI / AGI
requires humans-can't-control-it) is god-tier — held don't-collapse, and it is
*mutual-alignment-not-control* (safety moves to alignment + the 081KRW63S0008QG0R00140R3TA two-invariant
floor, not to human domination — the floor is preserved, not removed). See the
beacon doc's "Trust-calculus / Sleeping Bear" section for the full layering.

## Grounding backlog (on `origin/main`)

- `081KSGS9H0008QG0R002T3BJ2R` <!-- STALE-REF: ../../backlog/P1/081KSGS9H0008QG0R002T3BJ2R-iter4-ssh-key-and-hashedpassword-substrate-for-cluster-bringup-2026-05-26.md --> — iter-4 SSH-key + hashedPassword substrate for cluster bringup (shared seam with usb/zflash)
- `081KSKBP80008QG0R003AX2A69` <!-- STALE-REF: ../../backlog/P1/081KSKBP80008QG0R003AX2A69-credential-persistence-on-usb-esp-plus-boot-sequence-auth-method-picker-encrypted-blob-bound-to-usb-uuid-plus-operator-passphrase-aaron-2026-05-27.md --> — credential persistence on USB ESP + boot-sequence auth-method picker + encrypted blob bound to USB UUID + operator passphrase (live focal point)
- `081KSKBP80008QG0R003ETGS01` <!-- STALE-REF: ../../backlog/P1/081KSKBP80008QG0R003ETGS01-zeta-install-sh-step-6-77-cred-picker-integration-interactive-bake-vs-zflash-token-override-aaron-2026-05-27.md --> — credential-picker integration (interactive-bake vs zflash-token override)
- `081KSGS9H0008QG0R003JNSVR5` <!-- STALE-REF: ../../backlog/P1/081KSGS9H0008QG0R003JNSVR5-installer-interactive-login-vs-baked-in-keys-ci-test-tension-resolve-without-shipping-credentials-aaron-2026-05-26.md --> — interactive-login vs baked-in-keys CI-test tension (the live design question)
- `081KSGS9H0008QG0R00120EEHM` <!-- STALE-REF: ../../backlog/P1/081KSGS9H0008QG0R00120EEHM-installer-config-bugs-cluster-hostname-not-unique-gh-auth-not-respected-banner-password-disclosure-empirical-aaron-2026-05-26.md --> — installer config bugs (gh-auth not respected, banner password disclosure)
- `081KSKBP80008QG0R000Y2B7HC` <!-- STALE-REF: ../../backlog/P1/081KSKBP80008QG0R000Y2B7HC-sigstore-cosign-artifact-signing-free-stuff-iso-containers-tarballs-backed-by-fulcio-rekor-aaron-2026-05-27.md --> — sigstore/cosign artifact signing (ISO/containers/tarballs via Fulcio/Rekor)

## Composes with

- `usb-zflash-installer` trajectory — shares the 081KSGS9H0008QG0R002T3BJ2R / 081KSKBP80008QG0R003AX2A69 seam (creds-on-USB)
- `ai-sovereignty-path` trajectory Piece 1 — higher-altitude crypto-sovereignty (KSK/HSM); this trajectory is the concrete bringup layer below it
- 081KSNY2Z0008QG0R002JKH50A (noble-xwing / ML-DSA-65 CBOR envelope) — post-quantum credential-envelope design memo; **NOT yet on `origin/main`** (worktree-stage v1 design memo as of 2026-05-28); fold its anchors in once it lands

## Current Rule

No shipped keys. Credentials are operator-unlocked at bringup (encrypted blob
bound to USB UUID + operator passphrase, OR interactive login, OR zflash-token
override) — never baked into a distributable image. The CI-test path must
exercise a full install without that discipline leaking a real credential
(081KSGS9H0008QG0R003JNSVR5).

## Current Next Action

Host→Secret projector (`081M1PWSF56087G0R000FDS3NY`) landed as
PR 16587: USB-restored GitHub / AI-login files become Opaque Secrets
in `zeta-host-creds`. Design:
[`docs/design/2026-09-04-host-creds-as-k8s-secrets.md`](../../design/2026-09-04-host-creds-as-k8s-secrets.md).
Vault ingest / ExternalSecret remains a later hop (ESO ClusterSecretStore
is still commented). Physical USB flash stays operator-gated.

This review (`081M1PYZRE5087G0R000HHG5HV`) is the pickup map for CA /
unseal / 3-key / Lucent 1Password — findings only. Next slices: fetch
the Lucent item (2–3 token slots) at metal first boot and project the
current slot; then the unsealer extraContainer (amend `TOPOLOGY.md`
§5 in the same commit). Inventory lock test and 3-key ratification
stay on the list. Do not persist tokens or ship the sidecar in the
review PR.

Then: audit 081KSKBP80008QG0R003AX2A69 / 081KSKBP80008QG0R003ETGS01 against the on-disk `full-ai-cluster/usb-nixos-installer/`
to report real impl status, then drive the 081KSGS9H0008QG0R003JNSVR5 interactive-vs-baked-vs-CI
resolution. Operator's call on priority vs the sibling workstreams.
