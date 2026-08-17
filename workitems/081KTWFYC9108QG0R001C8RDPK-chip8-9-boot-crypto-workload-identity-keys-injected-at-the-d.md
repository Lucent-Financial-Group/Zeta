---
id: 081KTWFYC9108QG0R001C8RDPK
type: task
state: backlog
priority: P2
slug: chip8-9-boot-crypto-workload-identity-keys-injected-at-the-d
title: "chip8/9 boot crypto + workload identity — keys INJECTED at the door (never in cartridges); Reticulum-native identities; attestation at the host layer"
created: 2026-06-11T23:23:00.000Z
depends_on: []
composes_with: []
---

# chip8/9 boot crypto + workload identity

<!-- Work-item body. ZetaId-keyed (conflict-free, time-sortable). "Backlog" is a
     STATE = this folder; completion moves the file to workitems/done/YYYY/MM/.
     Identity is the zetaid prefix — resolve cross-refs by `081KTWFYC9108QG0R001C8RDPK-*.md` glob. -->

Migrated from the accidental legacy `081KTSZN10008QG0R000YE3TBC` row so the item lives on the current
ZetaId workitem surface instead of extending the frozen sequential backlog.

Review required before build: Nazar (ops) + Mateo (research); security-sensitive.

Tags: security, identity, spiffe, reticulum, zflash, keys, membrane, red-light.

## Auth for the little machine, without teaching it crypto

> Aaron: "should we give it any crypto primitives inside, for initial boot and such — keys
> injected for auth, like workload identity?"

The design observation (to be red-teamed before any code):

1. **NOT inside the ISA.** chip8/9 stays tiny and deterministic; rolling crypto into a toy ISA is
   the roll-your-own-crypto smell wearing a cartridge. The machine never holds key material.
2. **Keys are INJECTED CAPABILITIES at the door** — an `io` line by ZetaId resolved up the ladder
   (Live/Injected/Mock), with the RED LIGHT showing when a signing capability is bound. NEVER a
   cartridge line: cartridges are public diffable text — a key in one is a secret on a visible
   surface, wrong by construction (the red-light law). The Mock rung = a rehearsal signer that
   cannot produce valid signatures (honest by construction, like the flat inference engine).
3. **Workload identity = the room's, not the machine's:** SPIFFE/SVID is the prior art — identity
   issued to the WORKLOAD at startup by the host (zflash maintainer-key chain + the warm-cache
   startup from 081KTSZN10008QG0R002J0GE0Z is exactly the issuance moment), scoped to the room's lifetime (the
   5-minute bound rotates credentials for free).
4. **Reticulum already speaks identity natively** (cryptographic identities are built into RNS) —
   the bus IS the auth surface; a crossing is signed at the membrane, metered and lit. Boot
   attestation stays at the HOST layer (zflash/SLSA lineage already in-tree).
5. Existing pieces to compose, not duplicate: Crypto.fs, Blake3/Sha256 treaty primitives,
   KeyStore.fs, AntiSybil, the headscale/github trust-bootstrap research, docs/security/.

Gate: Nazar + Mateo review the surface BEFORE implementation; no key handling lands without it.

## State of play (2026-08-17, Otto — the door half only)

**The gate above is UNMET and this item stays open.** What landed is deliberately upstream of it:
`src/Core.TypeScript/zflash/injection-rail.ts` performs **no cryptography and handles no key
material** — it classifies destinations and returns verdicts — so it is policy, not key handling.
Everything that would touch bytes is named as an open question rather than decided.

Landed:

- The **constitutional rail is a type**, exhaustive over `FileBackedEspWrite`'s destination union
  (`satisfies Record<EspDestination, InjectionContentClass>`). A seventh ESP destination without a
  declared content class is now a compile error — the #11485 shape (illegal state unrepresentable),
  applied to the #11477 gap.
- `runFileBackedZflash` **discloses** every secret-class ESP write at flash time. Disclosure, not
  refusal: turning either live case into a hard refusal removes a shipped operator workflow, which
  is a maintainer's call.
- **Point 3 above, answered from the prior art:** a SPIFFE workload identity is `SPIFFE ID` +
  `trust bundle` + `SVID private key`, and only the third is secret. Under SPIFFE the private key
  is *never transported* — the workload generates it and only a CSR leaves. So "keys injected at
  the door" resolves to: the key is **not** injected; the public half and the node coordinate are.
  `deriveNodeWorkloadSpiffeId` composes the already-injected `/zeta-hostname.txt` into the identity
  treaty's Article 3 form and validates by round-trip through `parseSpiffe`.

Found while doing it — **an unrecorded divergence, not an exception**: `INJECTION-POINTS.md` §4
says WiFi credentials are secret material and NEVER on the USB ESP; `planFileBackedZflashImage`
writes the SSID and PSK to the ESP as plaintext JSON whenever `--wifi-ssid`/`--wifi-password` is
passed, and three existing tests assert that as expected behaviour. Recorded at §4a and in
`RAIL_DIVERGENCES`; **left unresolved on purpose**.

Not done, and blocked on this item's gate: the chip8/9 `io`-line / red-light half (point 2), any
trust-bundle ESP destination, and every custody decision (sealing, TPM binding, issuance authority,
governance class). Nothing has been flashed or booted.
