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
The architectural ferry is research-grade:
[`docs/research/2026-09-05-meno-what-remains-vs-what-acts-tsirelson-iinput-ifeedback.md`](../../research/2026-09-05-meno-what-remains-vs-what-acts-tsirelson-iinput-ifeedback.md).
Terminal commitment (personal grounding already absorbed):
[`docs/ALIGNMENT.md`](../../ALIGNMENT.md) § μένω.
Workitem: `081M1PYZRE5087G0R000HHG5HV`.
Resume: [`RESUME.md`](RESUME.md).

## Αυτό που μένει / What remains

These do not move in this slice. Changing them is a gated-class
act, not a sidecar.

- Vault `operator init` — human, biometric, witness. Forever.
- First unseal after init — proves the shares. Still gated.
- Dual-key treaty (active + ≥1 standby). Three live slots are
  the hub-less ask, not an inventory fact.
- Lucent **item** as the source of truth for SA tokens and,
  later, Shamir shares. USB / Keychain / k8s Secret are caches.
- Shamir N-of-M. Threshold 1 is coercion (S=4).
- Otto/Dejan Vault chart currency (`targetRevision: 0.34.1`).
  Do not steal it.
- Persona remains; actor acts. A bus address is not identity.

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
2. **TypeScript unsealer decision loop** (this slice — no Helm).
   `src/Core.TypeScript/cluster/vault-unsealer.ts`. Classify
   health: 200 sleep / 503 fetch-this-tick / 501 refuse-init /
   curl 000 miss (not a seal). Threshold-many distinct keys.
   Shares never written to disk, env, or etcd. Cannot init.
3. **extraContainer + `TOPOLOGY.md` §5** — later, **same commit
   as the sidecar**. Amend "Do not automate step 5 against Vault
   CE" in that commit. `valuesObject` only. Do not fork the chart.
4. Lease sidecar / portal / Consent (SSH is break-glass).
5. Inventory lock test (presence counts, never private material).
6. ADR: dual as minimum, three live slots as default.
7. Missing persona trees (riven / vera / lior) after the 3-key
   default exists.
8. ESO for **app** secrets after the unsealer is real — never
   Shamir-share copy.

## Δεν κάνουμε / Do not

- Helm-fight Otto on Vault / chart currency.
- Persist `OP_SESSION` / `op signin`.
- Treat Keychain / USB as the original.
- Rekey Vault to threshold 1.
- Copy Shamir shares into a Kubernetes Secret via ESO.
- Call this HashiCorp auto-unseal.
- Mint public `IInput` / `IFeedback` F# types.
- Absorb FF7 identity-blend as factory policy
  (`docs/DRIFT-TAXONOMY.md` Pattern 1).
