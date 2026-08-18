# YubiHSM / YubiKey readiness: the probe could not see the HSM, and the runbook for the day it lands

**Date:** 2026-08-18
**Status:** Operational readiness note. One code change landed with it; everything else is a runbook.
**Author:** Nazar (security-operations-engineer), for Aaron
**Confidence:** the device-layer findings are CHECKED against Yubico documentation and against the
repo's own code; the runbook is unexercised because no ceremony has been run. Every step is marked
with who fires it.

**Hardware state at time of writing:** a YubiHSM is in Aaron's hand; a YubiKey is in transit, expected
today. **No device was touched, plugged in, unlocked, or read by the author of this note.** The probe
output quoted below is from the machine as it stands, with nothing attached.

---

## 0. The finding that made this note urgent

`tools/setup/persona-keys/frost-hardware-probe.ts` — the file whose entire purpose is to answer "is
there a device here" — **could not see a YubiHSM 2 at all**. Not "reported it poorly": it had no code
path capable of observing one.

Every detection route it owned is structurally blind to the device:

| route                          | what it looks for                          | why a YubiHSM 2 misses it                                       |
| ------------------------------ | ------------------------------------------ | --------------------------------------------------------------- |
| `probeSmartCardReader` (Linux) | USB interface class `0x0B` (CCID)          | the HSM is a **bulk** USB interface, not CCID                   |
| `probeSmartCardReader` (macOS) | `Readers:` block of `SPSmartCardsDataType` | it is not a smart-card reader, so it never appears there        |
| `probeYubikey`                 | `ykman list --serials`                     | `ykman` enumerates YubiKeys; the HSM's CLI is `yubihsm-shell`   |
| `probePkcs11`                  | `ykcs11` / OpenSC module paths             | the HSM's module is `yubihsm_pkcs11`, which was not in the list |

**Checked, not assumed:** Yubico's own documentation describes the YubiHSM 2 as a USB full-speed
peripheral with a **bulk** interface, reached through `yubihsm-connector` (default `localhost:12345`)
or directly over libusb — not through the CCID/smart-card stack. See §8.

### Blast radius

- **Who is affected:** Aaron, on the day he plugs the HSM in — and nobody else, because no downstream
  consumer reads this probe.
- **What they observe:** `Device present: NO - a hardware seal tier will THROW here` and
  `Honourable tiers: (none)`, on a machine with an HSM physically attached. Then
  `assertHardwareSealTierAvailable("hardware-pkcs11", ...)` refuses with **"no smart-card reader or
  token attached"** — a sentence that is _false about the hardware in front of him_.
- **Severity:** not a key-compromise path. It is a **truthfulness** defect in the one instrument the
  ceremony depends on to tell it what is real, and it fails in the direction that wastes ceremony
  time and invites the operator to distrust or bypass the check.
- **SLA:** fixed in this change, before the hardware landed.

This is the same bug class as the `081M00HVPGS...` finding of 2026-08-14 (_a PKCS#11 driver on disk
reported as attached hardware_), inverted: there, a driver was mistaken for a device; here, a device
is invisible and reported as absent. Both make the probe's answer wrong, and the second is arguably
worse, because "absent" reads as a finding rather than as a gap.

## 1. The second finding: a module is not a driver _for the device that is present_

While adding the HSM path, a live defect surfaced in `availableHardwareSealTiers`. It read:

```ts
if (res.pkcs11ModuleFound && (res.yubikeyDetected || res.smartCardReaderAttached))
```

That is `some module && some device` — the two halves are never matched to each other. The forcing
case is reachable on Aaron's own desk within the hour:

1. `brew install yubico-piv-tool` puts `ykcs11.dylib` on disk (it may already be there — that is how
   the 08-14 false positive was found).
2. A YubiHSM 2 goes on the bus.
3. Flat logic sees a module and a device and reports `hardware-pkcs11` **honourable**.
4. `ykcs11` speaks PIV to a CCID card and **cannot address a YubiHSM 2**. The seal attempt dies
   inside an FFI call, having promised at preflight that it would not.

A preflight that green-lights a configuration the runtime cannot execute is worse than no preflight:
it converts a fast, legible refusal into a deep, confusing failure — during a ceremony, holding key
material. Fixed by `pkcs11MatchedPair`, which returns a module **paired to the device it can drive**
or `undefined`. The refusal now names the mismatch instead of claiming nothing is attached.

**A latent trap was removed alongside it.** The real-host test asserted
`if (tiers.includes("hardware-pkcs11")) expect(res.pkcs11ModuleFound).toBeTrue()`. That holds only
while the token module is the _only_ module the file knows about — it would have gone red the first
time `yubihsm_pkcs11` + an HSM were the honourable pair. In other words it was scheduled to fail on
ceremony day, in a test named "the real host". It now asserts the matched pair.

## 2. The two devices are not interchangeable — and they fill the two custody gates we already have

This is the part worth holding onto, because the repo already encodes it and the vocabulary is easy
to blur.

`frost-custody-contract.ts` declares exactly two custody gates:

```ts
export type CustodyGate = "autonomous-hsm" | "human-touch-present";
```

The devices map onto them **disjointly**, and the difference is physical:

|                           | YubiKey               | YubiHSM 2                             |
| ------------------------- | --------------------- | ------------------------------------- |
| bus                       | CCID smart card       | bulk USB                              |
| tool                      | `ykman`               | `yubihsm-shell` / `yubihsm-connector` |
| PKCS#11 module            | `ykcs11` / OpenSC     | `yubihsm_pkcs11`                      |
| human presence            | **touch sensor**      | **no button, no biometric**           |
| custody gate it can carry | `human-touch-present` | `autonomous-hsm`                      |

The custody contract's own header states the property that makes the left column valuable:

> because a token cannot be pressed at a distance, an adversary with full remote access to every site
> still cannot produce a touch-gated signature

**The YubiHSM has no such property, and this is the single most important operational consequence of
the purchase.** An attacker with the auth-key credential and network reach to the connector can
exercise it exactly as well as Aaron can. It is a fine at-rest sealing root and it is _not_ a
human-presence gate — so it must never be the thing standing in for one.

That is the direct operational reading of the standing invariant _nothing operator-run, only
operator-approved via biometric_: the HSM is the thing that gets approved, never the thing that does
the approving.

## 3. What already exists (real, in-repo, and mostly exercised)

Stated plainly so the runbook is not read as building from nothing. The lane is unusually mature.

**Real and tested in software:**

- `frost-share-adapter.ts` (1251 lines) — seal tiers, no-silent-downgrade (a caller declares a tier
  and the adapter throws if it is unavailable; it never quietly substitutes software),
  `FrostSealedShareFileV2` with `sealedByToken` identity binding in the AAD _and_ an in-plaintext
  bind string, so stripping or editing it fails the binding check.
- `frost-token-roster.ts` (840 lines) — token identity as `label#serial`, re-read on every call and
  never cached; `assertRosterSound`; the 1-of-N collapse detector.
- `frost-custody-contract.ts` — the gate model above, plus the symmetric anti-capture rule (a share's
  gate must be controlled by that share's own holder — catching both "B exercises A's share" and "B
  vetoes A's participation in A's own wallet").
- `frost-partial-signer.ts` — RFC 9591 two-round FROST; nonces born and consumed inside the boundary;
  no method returns a share scalar.
- `frost-delta-rotation.ts`, `frost-reshare.ts` — revoke a share without the revoked party; reshare
  without reconstitution.
- `biometric.ts` — Touch ID / Windows Hello approval gate: `requireBiometric`, `sessionBiometric`,
  and `analyzeSudoAuthChain` for the `pam_tid` precondition.
- `frost-hardware-probe.ts` + `tpm2-linux-probe.ts` — device probing, now including the HSM. The TPM
  path answers a five-way state (`present`/`absent`/`unreadable`/`unavailable`/`indeterminate`), so
  "the check did not run" is never printed as "there is no TPM".

**Exercised on real hardware** (2026-08-14, recorded in the ladder doc's exercised table): the probe
on the M2 Ultra; Secure Enclave present via `ioreg`; Touch ID gate _precondition_ verified
(`bioutil -r` enrolment + `pam_tid.so` in `/etc/pam.d/sudo`) — the dialog was deliberately **not**
fired, because summoning an approval nobody asked for is not an agent's call.

**Aspirational / documentary — do not read as shipped:**

- The PKCS#11 FFI path has **never** talked to a real token. The multi-token lane is written and unrun.
- The TPM2 path has never run on a Linux TPM host (`081M00VN9P1...`).
- L2 of the ladder — _use-without-extract for the signing operation_ — is **not reachable with either
  of these devices**, and this is structural rather than a missing feature. A FROST partial is an
  extractable affine function of the secret; a generic PKCS#11 primitive that emitted one would become
  a key-extraction oracle the moment a caller replayed it against a second challenge on one nonce.
  **Neither a YubiKey nor a YubiHSM changes invariant 2.** Both land at _L1 with better hardware_ —
  at-rest sealing. Plugging the HSM in is not a rung upgrade and must not be recorded as one.
- `docs/inventory/hardware-to-buy.md` and workitem `081M00S8RPS...` still say **no HSM is owned**.
  That is now stale — one is in hand. Correcting the inventory needs Aaron's confirmation of the exact
  model (YubiHSM 2 vs YubiHSM 2 FIPS), so it is left to him rather than guessed. See §7.

**Where the security value of this purchase actually is:** the **YubiKey count**, not the HSM tier.
_N_ tokens each sealing a **distinct** share is a genuine threshold — take one token, get one share,
which is below threshold and worth nothing. One HSM holding one key is one point of compromise.

## 4. The runbook for the day the hardware lands

Ordered. Each step is marked **[AGENT]** (an agent executes it; no credential, no device secret) or
**[AARON]** (requires the physical device, a PIN/password, or a biometric approval). The split is the
standing invariant made operational: the machine does the work, Aaron approves.

### Phase A — before anything is plugged in

- **A1 [AGENT]** Run the probe on the untouched machine and keep the output as the _before_ baseline:
  `bun tools/setup/persona-keys/frost-hardware-probe.ts`
  Recorded 2026-08-18 on the M2 Ultra: `YubiHSM 2: Not detected`, `Device present: NO`,
  `Honourable tiers: (none)`, `Secure Enclave: Present`.
- **A2 [AGENT]** Confirm the biometric precondition without firing a prompt:
  `bun tools/setup/persona-keys/biometric.ts` (reports platform + `pam_tid` chain analysis).
- **A3 [AARON]** Decide the roster shape **before** provisioning: how many YubiKeys, how many shares,
  what threshold, which share is HSM-sealed vs touch-gated. This is a governance decision, not a
  technical one, and it is very expensive to change after the irreversible steps in §5.

### Phase B — YubiKeys (the part that carries real security value)

- **B1 [AARON]** Plug in the tokens. Physical act.
- **B2 [AGENT]** Re-run the probe. Expect `Smart-card reader: Attached`. If `ykman` is installed a
  serial appears; if not, presence is still detected (that was the 08-14 fix).
- **B3 [AARON]** Install the token PKCS#11 module if absent (`brew install yubico-piv-tool`), and set
  each token's PIN / management key. Credential-bearing; an agent never sees these.
- **B4 [AARON]** Provision a **distinct** AES-256 wrapping key labelled `zeta-frost-wrap` on **each**
  token. _The failure mode to refuse here is the tempting one:_ one wrapping key copied to every token
  means one PIN and an easy spare — and it silently collapses the roster to 1-of-N, because every
  token can then open every share. Cryptography cannot detect this; the second token genuinely _can_
  decrypt. The artifact-level guard is `sealedByToken`, and it only helps if the keys actually differ.
- **B5 [AGENT]** Discover token identities — **reads no key material, only `label#serial`**:
  `bun tools/setup/persona-keys/frost-token-roster.ts tokens <module-path>`
- **B6 [AGENT]** Verify the pair is honourable before attempting anything:
  `bun tools/setup/persona-keys/frost-hardware-probe.ts` -> expect `PKCS#11 pair:` to name the token
  module driving the CCID token.
- **B7 [AARON]** Run the multi-token hardware lane. **It requires `ZETA_FROST_PKCS11_PIN`, so Aaron
  runs it, not an agent:**

  ```bash
  ZETA_FROST_HARDWARE_LANE=pkcs11-multi \
  ZETA_FROST_PKCS11_LIB=/opt/homebrew/lib/ykcs11.dylib \
  ZETA_FROST_PKCS11_PIN=... \
  ZETA_FROST_PKCS11_TOKENS='house-a#12345678,house-b#87654321' \
  bun test ./tools/setup/persona-keys/frost-share-adapter.hardware.test.ts
  ```

  This is the first time the FFI path meets a real token. **Opting in and finding no hardware is a
  FAILURE, not a skip** — by design, so the lane cannot go green because nothing ran.

- **B8 [AGENT]** Record the result in the ladder doc's exercised table. First anchored L1 cell.

### Phase C — the YubiHSM

- **C1 [AARON]** Plug it in.
- **C2 [AGENT]** Re-run the probe. **This step is the reason for this change:** expect
  `YubiHSM 2: ATTACHED`. If it still reports `Not detected` with the device plugged in, the product
  string differs from the marker — that is a probe bug to fix, _not_ evidence about the hardware, and
  it must not be worked around by loosening the check until it passes.
- **C3 [AARON]** Install the YubiHSM SDK (`yubihsm-connector`, `yubihsm-shell`, `yubihsm_pkcs11`).
- **C4 [AGENT]** Re-run the probe -> expect a `PKCS#11 pair:` naming `yubihsm_pkcs11` driving the
  YubiHSM 2. If the pair is absent while both halves are present, the refusal now says which half is
  mismatched.
- **C5 [AARON]** **Change the default authentication key.** A YubiHSM ships with a well-known default
  auth-key and password; leaving it in place is equivalent to having no HSM. Credential act, Aaron
  only, and it belongs in the same sitting as C3 rather than "later".
- **C6 [AARON]** Create domains / auth-keys per the A3 roster decision, and record the **non-secret**
  metadata (auth-key ids, domains, capabilities) for the contract.
- **C7 [AGENT]** Write the `ShareContract` rows: gate `autonomous-hsm` for HSM-held shares,
  `human-touch-present` for token-held shares, `gateControlledBy` **left defaulted to the holder**
  (any other value is a capture and `validateShareContract` refuses it in both directions).
- **C8 [AGENT]** `assertRosterSound` + `assertOneTokenOneRole` over the full roster.

### Phase D — after

- **D1 [AGENT]** Update the ladder doc's exercised table with measured results; correct any claim the
  measurement contradicts.
- **D2 [AGENT]** File the residue as work-items.
- **D3 [AARON]** Confirm the HSM model so `docs/inventory/hardware-to-buy.md` and `081M00S8RPS...`
  can be corrected from _procurement_ to _inventory_.

## 5. What could go wrong irreversibly

Key material is the one thing that cannot be re-derived. Ranked by how hard recovery is.

| #   | Action                                                   | Reversible?                                                                            | Guard                                                                                                                                 |
| --- | -------------------------------------------------------- | -------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **Overwriting a slot that already holds a key**          | **NO** — the previous key is gone                                                      | Never provision into a slot without listing it first. The device will not warn.                                                       |
| 2   | **Losing the only copy of a share with no reshare path** | **NO**                                                                                 | Set threshold `t < n`, and exercise `frost-reshare.ts` _before_ it is needed rather than discovering it is broken during an incident. |
| 3   | **PIN / auth-key lockout**                               | **NO** — YubiKey PIV wipes the slot after the PIN and PUK retry counters are exhausted | Aaron enters PINs; agents never retry a credential. An agent that retries is a device-bricking machine.                               |
| 4   | **Same wrapping key on every token** (B4)                | recoverable if caught, invisible if not                                                | `sealedByToken` binding + `assertRosterSound`. The danger is that it _looks_ correct.                                                 |
| 5   | **Factory-reset to clear a mistake**                     | **NO**                                                                                 | Never the first response. Reset destroys every key on the device, including the ones that were fine.                                  |
| 6   | Leaving the default auth-key (C5)                        | reversible                                                                             | Do it in the same sitting as C3.                                                                                                      |

**The general shape:** every irreversible row above is an **[AARON]** step, and that is not a
coincidence — it is the invariant working. An agent that could fire any row of this table is a
misconfigured agent.

## 6. What is deliberately still missing

- **No Secure Enclave seal tier.** P-256 only through the Keychain, and no AES key-wrap primitive of
  the shape `frost-share-adapter.ts` needs. It would need its own adapter and a Security.framework
  bridge. The probe reports SEP presence and deliberately does **not** let it clear
  `noHardwareDetected` — "present and unusable" is the honest answer, not a contradiction.
- **No connector-status probe.** Detecting the HSM via `http://127.0.0.1:12345/connector/status`
  would be a stronger positive signal, and it would add an ambient **network** read to a probe whose
  every other input arrives through the injected effects door (manifesto §13 noninterference). It is
  a runbook step for Aaron, not probe code.
- **No numeric USB VID/PID.** The Yubico documents checked name the constants without printing their
  values, so detection uses the product string. An unverified magic constant inside a presence check
  is how a probe becomes confidently wrong.
- **No attestation chain.** Any future measured-boot rung must not assume full security on this host:
  it is at **Reduced Security** (`system_profiler SPiBridgeDataType`, measured 2026-08-14).

## 7. Corrections owed to other documents

1. `docs/inventory/hardware-to-buy.md` §2 and workitem `081M00S8RPS...` say no HSM is owned.
   **Stale** — one is in hand. Left for Aaron to confirm the exact model (D3) rather than guessed.
2. The ladder doc's exercised table records `Device present: NO` for the M2 Ultra. Still true today
   with nothing attached; it goes stale the moment Phase B/C runs, and D1 is the step that fixes it.

## 8. Sources (CHECKED 2026-08-18)

- **YubiHSM 2 is a bulk USB interface, not CCID; reached via yubihsm-connector or libusb** — Yubico,
  _YubiHSM 2 User Guide_; the `yubihsm` Rust crate's connector documentation.
- **yubihsm-connector defaults to `localhost:12345`, status at `/connector/status`** — Yubico,
  _YubiHSM 2 Connector_ documentation.
- **`yubihsm_pkcs11` module path (`/usr/local/lib/yubihsm_pkcs11.dylib` on macOS)** — Yubico,
  _YubiHSM 2 User Guide_, PKCS#11 and OpenSSL deployment sections.
- **RFC 9591** — FROST two-round threshold signatures (the protocol in `frost-partial-signer.ts`).
- **PKCS#11 v3.1** — checked 2026-08-14 for the structural finding that a FROST partial cannot be
  composed from generic PKCS#11 mechanisms.

In-repo: `tools/setup/persona-keys/frost-hardware-probe.ts` (+ `.test.ts`) ·
`frost-share-adapter.ts` · `frost-token-roster.ts` · `frost-custody-contract.ts` · `biometric.ts` ·
`docs/research/2026-08-14-agent-sovereign-keys-incremental-ladder-L0-to-L6-destruction-not-leakage.md` ·
workitems `081M00HVPGS...`, `081M00S8RPS...`, `081M00VN9P1...`
