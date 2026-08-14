---
id: 081M00HVPGS087G0R0001T4BF8
type: bug
state: backlog
priority: P2
slug: frost-hardware-probe-reported-a-pkcs-11-driver-on-disk-as-at
title: "frost-hardware-probe reported a PKCS#11 driver on disk as attached hardware"
created: 2026-08-14T16:32:08.729Z
depends_on: []
composes_with: []
---

# frost-hardware-probe reported a PKCS#11 driver on disk as attached hardware

<!-- Work-item body. ZetaId-keyed (conflict-free, time-sortable). "Backlog" is a
     STATE = this folder; completion moves the file to workitems/done/YYYY/MM/.
     Identity is the zetaid prefix — resolve cross-refs by `081M00HVPGS087G0R0001T4BF8-*.md` glob. -->

**Found by:** Nazar, 2026-08-14, while exercising the hardware lane on real hardware.
**Fixed in the same PR.** Filed because a bug is a priced measurement, not a liability to hide.

## The bug (two of them, opposite directions)

`probeHardwareSecurity()` computed

```ts
const hardwareAvailable = tpm.available || yubi.detected || pkcs11.found;
```

where `pkcs11.found` is true when a shared **library exists on disk**.

1. **False positive on presence.** `brew install yubico-piv-tool` drops `ykcs11.dylib` into
   `/opt/homebrew/lib` on a machine with no token anywhere near it, and the probe then printed
   `Hardware present: YES`. A PKCS#11 module is a **driver**; a driver is evidence that someone ran
   brew, not that a device is attached. The probe's own docstring says `noHardwareDetected` means
   "do not ask for a hardware tier here" — a driver clearing that flag inverts the meaning.
2. **False negative on presence.** YubiKey detection shelled out to `ykman`, so a genuinely attached
   token on a machine without the Yubico CLI read as *not detected*. `ykman` is not installed on the
   dev machine this was found on.

Neither is a silent-downgrade (the adapter still throws), but both make the probe's answer wrong, and
nothing else in the repo answers the question it is there to answer.

## Two further findings, fixed alongside

3. **The Secure Enclave was invisible.** Apple Silicon has a real hardware root and the probe never
   looked. It is now reported — and deliberately does **not** clear `noHardwareDetected`, because no
   `FrostSealTier` can reach it. SEP-present *and* no-honourable-tier is the honest answer, not a
   contradiction.
4. **The tests could not fail.** All four were `expect(typeof x).toBe("boolean")`, which passes for
   any implementation returning an object — including one that always answers "hardware present".
   The probe now takes an injected host (§13 noninterference) so tests describe a machine and assert
   the answer. 23 tests, 7/7 planted mutants killed.

## Repro (pre-fix)

```bash
touch /opt/homebrew/lib/ykcs11.dylib     # no token attached
bun tools/setup/persona-keys/frost-hardware-probe.ts
# old: "Hardware present:  YES"
# new: "Device present: NO", "Honourable tiers: (none)"
```

## Follow-ups NOT done here

- A Secure Enclave seal tier (`kSecAttrTokenIDSecureEnclave`, P-256, no AES key-wrap of the shape
  `frost-share-adapter.ts` needs) — would need its own adapter and a Security.framework bridge.
- Exercising the PKCS#11 FFI path against a real token, and the TPM2 path on a Linux TPM host.
  Both remain documentary; see the "What has actually been exercised" section of
  `docs/research/2026-08-14-agent-sovereign-keys-incremental-ladder-L0-to-L6-destruction-not-leakage.md`.
