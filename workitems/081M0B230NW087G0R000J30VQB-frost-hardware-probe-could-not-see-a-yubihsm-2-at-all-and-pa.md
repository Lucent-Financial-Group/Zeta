---
id: 081M0B230NW087G0R000J30VQB
type: bug
state: backlog
priority: P2
slug: frost-hardware-probe-could-not-see-a-yubihsm-2-at-all-and-pa
title: "frost-hardware-probe could not see a YubiHSM 2 at all, and paired any module with any device"
created: 2026-08-18T18:28:10.044Z
depends_on: []
composes_with: []
---

# frost-hardware-probe could not see a YubiHSM 2 at all, and paired any module with any device

**Found by:** Nazar, 2026-08-18, preparing the lane for hardware arriving the same day.
**Fixed in the same PR.** Filed because a bug is a priced measurement, not a liability to hide.
**No hardware was touched:** the device was never plugged in, and every test below is a described host.

## The bug (two, same class, opposite directions)

### 1. A YubiHSM 2 was invisible to the probe

`frost-hardware-probe.ts` had no code path capable of observing a YubiHSM 2. Each of its
detection routes is structurally blind to that device:

- `probeSmartCardReader` keys on USB interface class `0x0B` (CCID) on Linux and on the
  `Readers:` block of `SPSmartCardsDataType` on macOS. A YubiHSM 2 is a **bulk** USB
  interface, not CCID (Yubico's own documentation), so it appears in neither.
- `probeYubikey` shells out to `ykman`, which enumerates YubiKeys. The HSM's CLI is
  `yubihsm-shell`.
- `probePkcs11` searched only `ykcs11` / OpenSC paths. The HSM's module is `yubihsm_pkcs11`.

So a host with an HSM plugged in reported `Device present: NO` / `Honourable tiers: (none)`,
and `assertHardwareSealTierAvailable` refused with **"no smart-card reader or token
attached"** — false about the hardware in the machine.

This is `081M00HVPGS087G0R0001T4BF8` inverted. There a driver was read as a device; here a
device is unseeable and reported as absent. The second is worse, because "absent" reads as a
finding rather than as a gap.

### 2. Any module was paired with any device

`availableHardwareSealTiers` computed `pkcs11ModuleFound && (yubikeyDetected || smartCardReaderAttached)`
— `some module && some device`, never matched to each other. The forcing case is reachable on
the maintainer's desk: `ykcs11.dylib` on disk (from `yubico-piv-tool`) plus an attached
YubiHSM 2 reported `hardware-pkcs11` as honourable, and `ykcs11` cannot address a YubiHSM 2.
The seal then dies inside an FFI call having promised at preflight that it would not — which
is worse than no preflight, because a fast legible refusal became a deep failure mid-ceremony.

## The fix

- `probeYubiHsm2` (USB product string: `system_profiler SPUSBDataType` on macOS, sysfs
  `product` on Linux) and `probeYubiHsm2Pkcs11` (the HSM's own module paths, tracked apart
  from the token modules). A YubiHSM 2 now clears `noHardwareDetected`; its module, being a
  driver, never does.
- `pkcs11MatchedPair` returns a module **paired to the device it can drive**, or `undefined`.
  `availableHardwareSealTiers` keys on the pair, and the refusal names the mismatch instead
  of claiming nothing is attached.
- Detection uses the product **string**, not a numeric VID/PID: the Yubico documents checked
  name those constants without printing their values, and an unverified magic constant inside
  a presence check is how a probe becomes confidently wrong.

## A latent trap removed alongside

The real-host test asserted `if (tiers.includes("hardware-pkcs11")) expect(res.pkcs11ModuleFound).toBeTrue()`.
That holds only while the token module is the only module the file knows about — it was
scheduled to go red the first time `yubihsm_pkcs11` + an HSM were the honourable pair, i.e.
**on ceremony day, in a test named "the real host"**. It now asserts the matched pair.

## Evidence

40 tests pass (was 23). 5 planted mutants, 5 killed — including the flat
`module && device` pairing, which is the original defect:

| mutant | result |
|---|---|
| drop the device requirement from the HSM pair | KILLED |
| HSM no longer counts as a device | KILLED |
| darwin USB probe always returns true | KILLED |
| flat module/device pairing (the original bug) | KILLED |
| product marker matches anything | KILLED |

## Not done here (needs hardware or a credential)

- Exercising the PKCS#11 FFI path against a real token or HSM. The lane needs
  `ZETA_FROST_PKCS11_PIN`; Aaron runs it.
- Confirming the YubiHSM's USB product string on a real device. If C2 of the runbook reports
  `Not detected` with the device attached, the marker needs correcting — and must not be
  loosened until it merely passes.
- Correcting `docs/inventory/hardware-to-buy.md` / `081M00S8RPS087G0R0003J5Q56` from
  procurement to inventory; needs Aaron to confirm the model.

## Pointers

- `docs/research/2026-08-18-yubihsm-yubikey-readiness-the-probe-could-not-see-the-hsm-and-the-ceremony-runbook.md`
  — the readiness note and the ordered ceremony runbook this was found while writing.
