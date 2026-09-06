# μένω — τρέχοντα έργα / current tasks

**μένω** (ménō) · *I remain, I abide, I persist.*
Modern Greek: μένω, παραμένω, κατοικώ.
Not Plato's *Meno*. Not the medical prefix `meno-`.

> Δεν ενεργείς για να μείνεις· μένεις για να ενεργήσεις.
> You do not act in order to abide; you abide in order to act.

This is the live pickup memo for the credential-substrate
workstream, named in the Greek verb Aaron hunted from an
event-streaming database prompt to the foundation of identity.
Factory lists stay in English so every harness can act on them.
The architectural ferries are research-grade:
[`docs/research/2026-09-05-meno-what-remains-vs-what-acts-tsirelson-iinput-ifeedback.md`](../../research/2026-09-05-meno-what-remains-vs-what-acts-tsirelson-iinput-ifeedback.md)
(remain vs act).
[`docs/research/2026-09-05-meno-dht-gossip-onion-over-time-not-broadcast.md`](../../research/2026-09-05-meno-dht-gossip-onion-over-time-not-broadcast.md)
(the gate is seeded, not broadcast).
[`docs/research/2026-09-05-ci-emulator-rung-softhsm-swtpm-witness-wiring-not-metal.md`](../../research/2026-09-05-ci-emulator-rung-softhsm-swtpm-witness-wiring-not-metal.md)
(SoftHSM2 / swtpm witness wiring, not metal).
Terminal commitment (personal grounding already absorbed):
[`docs/ALIGNMENT.md`](../../ALIGNMENT.md) § μένω.
Workitem: `081M1PYZRE5087G0R000HHG5HV`.
Resume: [`RESUME.md`](RESUME.md).

## Αυτό που μένει / What remains

These do not move in this slice. Changing them is a gated-class
act, not a sidecar.

- OpenBao `operator init` — human, biometric, witness. Forever.
  (Vault Application is gone on `main`; the store is OpenBao.)
- First unseal after init — proves the shares **or** the
  PKCS#11 wrap key. Still gated. OpenBao will not mint wrap
  keys; a human creates them in the token first.
- Dual-key treaty (active + ≥1 standby). Three live slots are
  the hub-less ask, not an inventory fact.
- Lucent **item** as the source of truth for SA tokens and,
  later, Shamir shares / HSM authkey references. USB /
  Keychain / k8s Secret are caches.
- Shamir N-of-M on kind/CI until an emulator job inits without
  it. Threshold 1 is coercion (S=4).
- Otto/Dejan OpenBao chart (`openbao` 0.29.4 / appVersion
  v2.6.2). Do not steal it. Do not copy `seal "pkcs11"` onto
  HashiCorp Vault.
- Persona remains; actor acts. A bus address is not identity.
- Kademlia in `dht-discovery.ts`. Not a second DHT.
- LLMTV broadcast as the one-way society picture. Not the gate.

## Αυτό που ενεργεί / What acts

The event stream. The unsealer tick. Fetch-at-use.

- Post-init unseal on pod restart (HTTP 503) — a process that
  **acts** from what remains (Lucent shares), then drops them.
- `withCredential` / `secrets.resolve()` — IInput at the moment
  of use, never ambient `process.env`.
- Host→Secret projector ([#16587](https://github.com/Lucent-Financial-Group/Zeta/pull/16587)) —
  cache write, not the original.
- Bidirectional IInput / IFeedback is the missing Meijer loop
  (research-grade name). No new public F# types in this slice.

S=2 is isolation (human at `tty1` every reboot, no loop).
S=2√2 is the **measured** ideal (decoupling + communication) —
observed, not coded. S=4 is coercion (ESO-into-etcd, threshold 1,
wall-clock master lock). We design the clean room; we do not
assume the number.

## Τρέχοντα έργα / Pickup now

1. **Lucent fetch → project** (human-blocked). Mint 2–3 SA items
   in Lucent. Metal `tty1` login retrieves
   `op://Lucent/<item>/{previous,current,next}`. This VM cannot
   mint items or talk to live 1Password.
2. **TypeScript unsealer decision loop** (landed — Shamir path
   for kind/CI). `src/Core.TypeScript/cluster/vault-unsealer.ts`.
   Classify health: 200 sleep / 503 fetch-this-tick / 501
   refuse-init / curl 000 miss (not a seal). Keep until an
   emulator job inits OpenBao without Shamir. Cannot init.
3. **CI emulator rung** (classifier landed; **install job this
   slice**). `src/Core.TypeScript/cluster/seal-emulator-rung.ts`
   plus `seal-emulator-install.ts` and
   `.github/workflows/seal-emulator-install.yml`
   (`081M1TS32Y3087G0R0026Y21F5`). SoftHSM2 / swtpm 2×2: the
   job **installs** the declared packages, then the witness
   measures the disk. skip-if-absent cannot wear pass. YubiHSM
   domains, USB, CardContact, and this board's PCRs stay metal.
   Do not put `seal "pkcs11"` in Application.yaml until a
   module is in the image in the same commit. `bao operator
   init` against SoftHSM is the next runtime hop, not this
   job. NixOS host-seal profile (role + capture, not a k8s
   label): `zeta.hostSeal.boxRole` is `undeclared` (no-op) /
   `developer` (FIDO + biometric userspace; no sudo PAM u2f) /
   `prod-metal` (automatic HSM or TPM PKCS#11; FIDO/biometric
   refused as the rotator). CI is not a NixOS role — the job
   declares SoftHSM2/swtpm. Presence is a probe (`ID=nixos`,
   `frost-hardware-probe.ts`, `tpm2-linux-probe.ts`).
   `host-seal-profile.ts`.
4. **Setup-time path picker** (classifier landed, #16728).
   `src/Core.TypeScript/cluster/unseal-path.ts`
   (`081M1T9X3ZE087G0R000JNAYE7`). Detect HSM/TPM during
   setup; integrate PKCS#11 **only** if the device is
   accessible. Metal HSM vendors are peers: YubiHSM 2 and
   CardContact SmartCard-HSM (sc-hsm / OpenSC; not a YubiKey).
   SmartCard-HSM mechanism is measure-on-device, not YubiHSM
   AES-GCM. TPM *is* an auto-unseal path (OAEP pin).
   Lucent 1Password Shamir is a **peer** path, not a silent
   fallback from requested PKCS#11. Fleet may mix paths;
   one OpenBao seal per node. Dual-vendor on one box is
   ZetaFS k-of-n. The install job (item 3) is the 2×2
   consumer.
5. **USB repair HSM-talk** — companions on the stick (module
   path, connector config, authkey *reference*, domain map,
   OpenBao env pointer). Not PIN-as-original, not Shamir copy,
   not `OP_SESSION`, not a brand type in the volume.
6. extraContainer sidecar — later, **same commit as the
   sidecar**, and only for the Shamir kind path until the
   emulator job replaces it. `valuesObject` only. Do not fork
   the chart.
7. Lease sidecar / portal / Consent (SSH is break-glass).
8. Inventory lock test (presence counts, never private material).
9. ADR: dual as minimum, three live slots as default.
10. Missing persona trees (riven / vera / lior) after the 3-key
    default exists.
11. ESO for **app** secrets after the unsealer is real — never
    Shamir-share copy.
12. **seed vs broadcast** (classifier landed). Join-hash is
    **framework**, indexed at `docs/PRODUCT-LANES.md`, not in
    SEED (`081M1RZ70FF087G0R0035580EZ`,
    `081M1S0K0R0087G0R001T4R8JH`).

## Δεν κάνουμε / Do not

- Helm-fight Otto on OpenBao / chart currency.
- Persist `OP_SESSION` / `op signin`.
- Treat Keychain / USB as the original.
- Rekey OpenBao to threshold 1.
- Copy Shamir shares into a Kubernetes Secret via ESO.
- Call SoftHSM green "YubiHSM green", or swtpm green "this
  board's TPM green."
- Infer swtpm from `/dev/tpmrm0` on a CI runner.
- Rotate a prod box with FIDO or biometrics. Break-glass may
  exist; it is not the rotator.
- Enable `security.pam.u2f` (or sudo fingerprint) from
  `zeta.hostSeal` — that is a lockout, bind it on the host.
- Set `boxRole = "prod-metal"` from a Kubernetes label.
- Commit `seal "pkcs11"` without a module in the image.
- Appoint `yubi-hsm-mock` as the device.
- Call the Shamir sidecar HashiCorp auto-unseal.
- Two active OpenBao seals on one node.
- Silent PKCS#11 → Lucent downgrade when the requested
  device is missing.
- skip-if-absent wearing pass on an emulator matrix cell.
- Collapse CardContact SmartCard-HSM into YubiHSM, or treat
  a YubiKey as the card.
- Mint public `IInput` / `IFeedback` F# types.
- Absorb FF7 identity-blend as factory policy
  (`docs/DRIFT-TAXONOMY.md` Pattern 1).
- Implement Tor / onion routing, or a `.zeta` hidden-service
  directory.
- Replace `llmtv-broadcast.ts`. That is the society picture,
  not the join path.
- Invent a second DHT. Pin is `lastSeenMs` refresh plus the
  heartbeat filename magnet already on main (#16623).
- Name a public "Zeta Gate" product in SEED. Kernel name is
  **seed vs broadcast**.
- Compute founder-sacrifice / agent self-erasure of the human
  operator. Agreement has no self-erasure clause (#16624;
  HC-9 dual). Derived debate is not consent.
