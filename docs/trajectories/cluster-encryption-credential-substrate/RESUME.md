# Trajectory - Cluster Encryption / Credential Substrate

Status: active — first surfaced 2026-05-29 from substrate inventory (was tracked only as scattered backlog rows; never had a trajectory surface, which is why it was easy to lose at cold-boot)
Last refreshed: 2026-09-05 (μένω remain vs act; unsealer loop; Zeta Gate is seed/DHT/gossip over time, not a broadcast)
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

Continuation (same day): the gate is **seeded, not broadcast**.
DHT / gossip over time / onion-shape — not a tweet, not DNS.
Classifier: `src/Core.TypeScript/discovery/seed-not-broadcast.ts`.
Research:
[`docs/research/2026-09-05-meno-dht-gossip-onion-over-time-not-broadcast.md`](../../research/2026-09-05-meno-dht-gossip-onion-over-time-not-broadcast.md).
Kademlia already in `dht-discovery.ts`. Pin against TTL fade is
`lastSeenMs` refresh. LLMTV broadcast stays (society picture).
Onion is hop-count shape, not a Tor stack. Pattern 1 refused.

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
