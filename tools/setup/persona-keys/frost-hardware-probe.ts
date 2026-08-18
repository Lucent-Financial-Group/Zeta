/**
 * frost-hardware-probe.ts — Hardware Security Device Probe Engine.
 *
 * Probes local system interfaces for physical YubiKey / smart-card readers (PCSC/CCID),
 * TPM 2.0 device nodes (/dev/tpmrm0, /sys/class/tpm), PKCS#11 shared libraries, and the
 * Apple Secure Enclave.
 *
 * Reports what is ATTACHED. It does not choose a seal tier and it does not authorise a
 * fallback: under no-silent-downgrade the caller declares a required tier and
 * frost-share-adapter throws if that tier is unavailable. A probe result of
 * noHardwareDetected means "do not ask for a hardware tier here", never "quietly use
 * software instead".
 *
 * ============================================================================
 * A DRIVER IS NOT A DEVICE (corrected 2026-08-14, Nazar — exercised on real hardware)
 * ============================================================================
 *
 * The previous version computed
 *
 *     hardwareAvailable = tpm.available || yubi.detected || pkcs11.found
 *
 * where `pkcs11.found` is true when a shared LIBRARY EXISTS ON DISK. Installing
 * yubico-piv-tool drops ykcs11.dylib into /opt/homebrew/lib with no token anywhere near
 * the machine, and the probe then reported "Hardware present: YES". That is a
 * false positive on physical presence: a PKCS#11 module is a driver, and a driver is
 * evidence that someone once ran brew, not that a device is attached. `pkcs11ModuleFound`
 * is now reported on its own and NEVER clears `noHardwareDetected`.
 *
 * The same probe was also wrong in the other direction: YubiKey detection shelled out to
 * `ykman`, so a genuinely attached token on a machine without the Yubico CLI installed
 * read as "not detected". Reader detection now goes through the OS smart-card stack
 * (CCID interface class on Linux sysfs, SPSmartCardsDataType on macOS), which sees the
 * hardware whether or not ykman exists; `ykman` is kept only for the serial number.
 *
 * ============================================================================
 * THE SECURE ENCLAVE IS PRESENT AND NO SEAL TIER CAN USE IT
 * ============================================================================
 *
 * On Apple Silicon `secureEnclaveAvailable` is true and `noHardwareDetected` is ALSO
 * true, which looks like a contradiction and is not. There is a real hardware root on
 * the machine, and `FrostSealTier` has no member that can reach it: hardware-tpm2 needs
 * a TPM 2.0 that Apple Silicon does not have, and hardware-pkcs11 needs an external
 * token. The Secure Enclave is reached through the Keychain
 * (kSecAttrTokenIDSecureEnclave), is P-256 only, and exposes no AES key-wrapping
 * primitive of the shape frost-share-adapter needs — see the TPM section of that file.
 * Letting SEP presence clear `noHardwareDetected` would reintroduce exactly the
 * false-positive fixed above, so it deliberately does not.
 *
 * `availableHardwareSealTiers()` below is the field to read when the question is "can
 * this host honour a hardware tier", because that is the only question the adapter can
 * act on. It is ADVISORY: it never selects a tier for a caller.
 *
 * ============================================================================
 * A YubiHSM 2 IS NOT A YubiKey, AND A MODULE MUST MATCH ITS DEVICE
 * (2026-08-18, Nazar — written before the hardware landed, so the probe is not the
 * thing that has to be debugged on ceremony day)
 * ============================================================================
 *
 * Two devices arrived in the same conversation and they are not interchangeable at any
 * layer — bus, tool, module, or custody gate:
 *
 *   - A **YubiKey** is a CCID smart card. The reader probe sees it, `ykman` names it, and
 *     `ykcs11`/OpenSC drive it. It has a touch sensor, so it can carry a
 *     `human-touch-present` custody gate.
 *   - A **YubiHSM 2** is a USB **bulk** device (Yubico's own documentation is explicit
 *     that it is not CCID). It is reached through `yubihsm-connector` or libusb and driven
 *     by `yubihsm_pkcs11`. It has **no button and no biometric**, so it can only carry an
 *     `autonomous-hsm` gate — which is precisely why the approval it acts under has to be
 *     gated somewhere else (see the readiness note).
 *
 * Two consequences are encoded below rather than left to be discovered at 2am:
 *
 *   1. `probeYubiHsm2` exists because NOTHING else in this file can see one. Without it a
 *      host with an HSM plugged in reports `Device present: NO`.
 *   2. `pkcs11MatchedPair` exists because "a module is on disk AND a device is on the bus"
 *      is not the same claim as "this module can drive this device". Installing
 *      yubico-piv-tool and attaching a YubiHSM 2 satisfies the first and not the second.
 *
 * ============================================================================
 * THE TPM PATH IS A STATE, NOT A BOOLEAN (2026-08-17, 081M00VN9P1087G0R000FYTTVS)
 * ============================================================================
 *
 * `probeTpm2` used to answer `{ available: boolean }` from `existsSync` on three paths.
 * That reproduced the driver-is-not-a-device error one layer down and added a second:
 *
 *   - `existsSync` returns `false` for EVERY error, so a permission denial and an
 *     unreadable sysfs both read as "no TPM" — a check that could not run looking exactly
 *     like a check that ran and said no.
 *   - `/dev/tpm0` is also the device node of a TPM **1.2**. `exists(node) ⇒ TPM 2.0` is
 *     the same false inference as `library on disk ⇒ token attached`: TPM 1.2 has no
 *     `tpm2_unseal` and cannot honour `hardware-tpm2` at all.
 *
 * The Linux path now lives in `./tpm2-linux-probe.ts` as a capture/classify pair and
 * answers a five-way `Tpm2State` — `present` / `absent` / `unreadable` / `unavailable` /
 * `indeterminate` — carried through this file as `tpm2State`. `tpm2Available` survives as
 * the narrow question the adapter asks, and it is true for `present` ONLY: a confirmed
 * family-2.0 reading AND a device node. Read `tpm2Reason` before reporting "no TPM"
 * anywhere, because three of the other four states are not findings about the hardware.
 *
 * Noninterference (manifesto §13): every reading of the outside world — filesystem,
 * subprocess, platform string — enters through the injected `HardwareProbeEffects` door.
 * The default door is the real host; tests inject a fake host and therefore assert on
 * outcomes that can actually be wrong.
 */

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { platform as osPlatform } from "node:os";
import type { FrostSealTier } from "./frost-share-adapter.ts";
import {
  probeTpm2Linux,
  realTpm2LinuxEffects,
  tpm2CheckRan,
  type Tpm2LinuxEffects,
  type Tpm2State,
} from "./tpm2-linux-probe.ts";

/**
 * The ONLY door through which this module reads the outside world (§13 noninterference).
 * Injected wholesale so a test can describe a machine — an Apple Silicon laptop, a Linux
 * box with a TPM, a host with a driver but no token — and get a deterministic result.
 */
export interface HardwareProbeEffects {
  readonly exists: (path: string) => boolean;
  readonly readDir: (path: string) => readonly string[];
  readonly readFile: (path: string) => string;
  /** argv form, NEVER a shell string. Throws when the command is absent or fails. */
  readonly run: (cmd: string, args: readonly string[]) => string;
  /** node:os platform string ("darwin" | "linux" | "win32" | …). */
  readonly platform: string;
  /**
   * The Linux TPM 2.0 surface has its OWN door, because the three coarse operations above
   * cannot express what that probe must not lose: `exists` collapses a permission denial
   * into `false`, and `run` collapses "the tool is not installed" into the same throw as
   * "the tool ran and refused". See `./tpm2-linux-probe.ts`.
   */
  readonly tpm2: Tpm2LinuxEffects;
}

/** The real host. The only place in this module that touches fs/subprocess directly. */
export function realProbeEffects(): HardwareProbeEffects {
  return {
    exists: (p) => existsSync(p),
    readDir: (p) => readdirSync(p),
    readFile: (p) => readFileSync(p, "utf8"),
    run: (cmd, args) =>
      execFileSync(cmd, [...args], { encoding: "utf8", timeout: 5000, stdio: ["ignore", "pipe", "ignore"] }),
    platform: osPlatform(),
    tpm2: realTpm2LinuxEffects(),
  };
}

export interface HardwareProbeResult {
  readonly timestamp: string;
  /**
   * A TPM 2.0 is PRESENT — family 2.0 confirmed AND a device node to open. True for the
   * `present` state and nothing else, so it is never true on the strength of a node alone
   * (which a TPM 1.2 also has) and never false on the strength of a denial or a missing
   * tool (which are not answers). When it is false, `tpm2State` says which of the four
   * "not present" it is and `tpm2Reason` says what to do about it.
   */
  readonly tpm2Available: boolean;
  /** The five-way answer. See `./tpm2-linux-probe.ts`. */
  readonly tpm2State: Tpm2State;
  /** One sentence naming the cause of `tpm2State`, in terms an operator can act on. */
  readonly tpm2Reason: string;
  readonly tpmDeviceNode?: string | undefined;
  readonly yubikeyDetected: boolean;
  readonly yubikeySerial?: string | undefined;
  /**
   * A CCID / PCSC smart-card reader is physically attached. Independent of whether the
   * Yubico CLI is installed, which is why it — not `yubikeyDetected` — is what
   * hardware-pkcs11 availability keys on.
   */
  readonly smartCardReaderAttached: boolean;
  /**
   * A PKCS#11 shared library exists on disk. THIS IS A DRIVER, NOT A DEVICE, and on its
   * own it is not evidence that any token is attached. It never clears
   * `noHardwareDetected`.
   */
  readonly pkcs11ModuleFound: boolean;
  readonly pkcs11LibraryPath?: string | undefined;
  /**
   * A YubiHSM 2 is ATTACHED. It is a bulk-USB device, not CCID, so it is invisible to
   * `smartCardReaderAttached` and to `ykman` -- this is the only field that reports it.
   */
  readonly yubiHsm2Detected: boolean;
  /**
   * The YubiHSM 2 own PKCS#11 module exists on disk. A DRIVER, not a device: it never
   * clears `noHardwareDetected`, and it is tracked apart from `pkcs11ModuleFound` because
   * a token module cannot drive an HSM nor an HSM module a token.
   */
  readonly yubiHsm2Pkcs11ModuleFound: boolean;
  readonly yubiHsm2Pkcs11LibraryPath?: string | undefined;
  /**
   * An Apple Secure Enclave is present. Real hardware, and NO `FrostSealTier` can reach
   * it, so it does not clear `noHardwareDetected` either. See the header.
   */
  readonly secureEnclaveAvailable: boolean;
  /**
   * No DEVICE that a hardware seal tier could use was found. NOT a licence to fall back:
   * the adapter has no fallback path. True on an Apple Silicon machine with a Secure
   * Enclave, because no tier can use one.
   */
  readonly noHardwareDetected: boolean;
}

/**
 * PKCS#11 modules that drive a CCID **token** (a YubiKey's PIV applet via ykcs11, or any
 * smart card via OpenSC). NONE of these can drive a YubiHSM 2 — see
 * `YUBIHSM2_PKCS11_LIBRARY_PATHS` and the MATCHED PAIR section of the header.
 */
const PKCS11_LIBRARY_PATHS: readonly string[] = [
  "/usr/local/lib/ykcs11.dylib",
  "/opt/homebrew/lib/ykcs11.dylib",
  "/Library/OpenSC/lib/opensc-pkcs11.so",
  "/usr/lib/x86_64-linux-gnu/opensc-pkcs11.so",
  "/usr/lib/x86_64-linux-gnu/libykcs11.so",
  "/usr/lib/libykcs11.so",
];

/**
 * The YubiHSM 2's OWN PKCS#11 module, shipped in the YubiHSM SDK. A SEPARATE list from the
 * token modules above, because the two are not interchangeable in either direction:
 * `ykcs11` speaks PIV to a CCID card and cannot address a YubiHSM 2, and `yubihsm_pkcs11`
 * speaks the YubiHSM session protocol (over yubihsm-connector or libusb) and cannot address
 * a YubiKey. One flat list would let the module for one device vouch for the presence of
 * the other.
 */
const YUBIHSM2_PKCS11_LIBRARY_PATHS: readonly string[] = [
  "/usr/local/lib/yubihsm_pkcs11.dylib",
  "/opt/homebrew/lib/yubihsm_pkcs11.dylib",
  "/usr/local/lib/pkcs11/yubihsm_pkcs11.dylib",
  "/usr/lib/x86_64-linux-gnu/pkcs11/yubihsm_pkcs11.so",
  "/usr/local/lib/pkcs11/yubihsm_pkcs11.so",
  "/usr/lib/pkcs11/yubihsm_pkcs11.so",
];

/** USB interface class 0x0B is "Smart Card" (USB-IF CCID). */
const USB_CCID_INTERFACE_CLASS = "0b";

/**
 * Substring identifying a YubiHSM 2 in a USB product string, matched case-insensitively so
 * "YubiHSM", "YubiHSM 2" and vendor casing variants all hit. Deliberately a product STRING
 * and not a numeric VID/PID: the numeric pair is named but not printed in the Yubico
 * documents checked while writing this, and an unverified magic constant inside a presence
 * check is exactly how a probe becomes confidently wrong.
 */
const YUBIHSM2_USB_PRODUCT_MARKER = "yubihsm";

/**
 * Probes for a usable TPM 2.0. LINUX ONLY — Apple Silicon has a Secure Enclave, which is
 * not a TPM 2.0 — and on any other platform the answer is `unavailable` ("we did not ask")
 * rather than `absent` ("we asked and there is none").
 *
 * `available` is true for the `present` state ONLY. The four other states are all "not
 * present" and only ONE of them (`absent`) is a finding about the hardware; report
 * `reason`, never a bare "no TPM", when it is false.
 */
export function probeTpm2(fx: HardwareProbeEffects = realProbeEffects()): {
  available: boolean;
  path?: string;
  state: Tpm2State;
  reason: string;
} {
  const res = probeTpm2Linux(fx.tpm2);
  return {
    available: res.state === "present",
    ...(res.deviceNode !== undefined ? { path: res.deviceNode } : {}),
    state: res.state,
    reason: res.reason,
  };
}

/**
 * Probes the OS smart-card stack for an ATTACHED CCID reader (a YubiKey in CCID mode is
 * one). Deliberately independent of `ykman`: the previous ykman-only path reported a real
 * attached token as absent whenever the Yubico CLI was not installed.
 *
 * Linux: sysfs USB interface class 0x0B, readable with no tools installed.
 * macOS: the Readers section of `system_profiler SPSmartCardsDataType`. Reader DRIVERS
 * are always listed on a stock macOS and are ignored — only the Readers block counts.
 */
export function probeSmartCardReader(fx: HardwareProbeEffects = realProbeEffects()): boolean {
  if (fx.platform === "linux") {
    try {
      for (const dev of fx.readDir("/sys/bus/usb/devices")) {
        try {
          const cls = fx.readFile(`/sys/bus/usb/devices/${dev}/bInterfaceClass`).trim().toLowerCase();
          if (cls === USB_CCID_INTERFACE_CLASS) return true;
        } catch {
          // Not an interface dir, or unreadable — next.
        }
      }
    } catch {
      // No sysfs USB tree.
    }
    return false;
  }
  if (fx.platform === "darwin") {
    try {
      const out = fx.run("system_profiler", ["SPSmartCardsDataType"]);
      return macReadersBlockIsNonEmpty(out);
    } catch {
      return false;
    }
  }
  return false;
}

/**
 * True when the `Readers:` block of SPSmartCardsDataType lists at least one reader.
 * Exported for test: this parser is the whole of macOS reader detection, and an
 * always-false or always-true parser is exactly the bug class this file is correcting.
 */
export function macReadersBlockIsNonEmpty(systemProfilerOutput: string): boolean {
  const lines = systemProfilerOutput.split("\n");
  const start = lines.findIndex((l) => l.trim() === "Readers:");
  const header = start < 0 ? undefined : lines[start];
  if (header === undefined) return false;
  const headerIndent = header.length - header.trimStart().length;
  for (const line of lines.slice(start + 1)) {
    if (line.trim() === "") continue;
    // Any subsequent section header ("Reader Drivers:", "SmartCard Drivers:", …) ends
    // the block. Reader entries are indented further than the header.
    const indent = line.length - line.trimStart().length;
    return indent > headerIndent;
  }
  return false;
}

/**
 * Probes for a physical YubiKey and its serial. `ykman` is the serial-number source only;
 * presence does not depend on it (see probeSmartCardReader).
 */
export function probeYubikey(fx: HardwareProbeEffects = realProbeEffects()): {
  detected: boolean;
  serial?: string;
} {
  try {
    const output = fx.run("ykman", ["list", "--serials"]);
    const match = output.match(/\b\d{6,10}\b/);
    if (match) {
      return { detected: true, serial: match[0] };
    }
  } catch {
    // ykman absent or no key — fall through to the tool-independent reader probe.
  }
  return probeSmartCardReader(fx) ? { detected: true } : { detected: false };
}

/**
 * Probes for a PKCS#11 shared library installation. A LIBRARY, not a token — see header.
 */
export function probePkcs11(fx: HardwareProbeEffects = realProbeEffects()): {
  found: boolean;
  path?: string;
} {
  for (const libPath of PKCS11_LIBRARY_PATHS) {
    if (fx.exists(libPath)) {
      return { found: true, path: libPath };
    }
  }
  return { found: false };
}

/**
 * Probes for an ATTACHED YubiHSM 2 by USB product string.
 *
 * A YubiHSM 2 is invisible to every other probe in this file, and that is a property of
 * the device rather than an oversight:
 *
 *   - It is a USB **bulk** interface, not CCID. `probeSmartCardReader` keys on USB
 *     interface class 0x0B on Linux and on the `Readers:` block of SPSmartCardsDataType on
 *     macOS; a YubiHSM 2 appears in neither, so it reads as "no reader attached".
 *   - `ykman` enumerates YubiKeys, not YubiHSMs (the HSM CLI is `yubihsm-shell`), so
 *     `probeYubikey` does not see one either.
 *
 * The consequence before this function existed: plugging a YubiHSM 2 into a machine left
 * `noHardwareDetected` true and `availableHardwareSealTiers` empty, and
 * `assertHardwareSealTierAvailable` refused with "no smart-card reader or token attached"
 * -- a sentence that is FALSE about a host with an HSM in it. That is the same class as
 * the driver-is-not-a-device bug in the header, inverted: a device the probe cannot see is
 * reported as a device that is not there.
 *
 * Linux: the `product` string in the sysfs USB device tree, readable with no tools.
 * macOS: `system_profiler SPUSBDataType`. Both are presence-of-DEVICE readings; the module
 * that drives it is probed separately by `probeYubiHsm2Pkcs11`, and neither implies the
 * other.
 */
export function probeYubiHsm2(fx: HardwareProbeEffects = realProbeEffects()): boolean {
  if (fx.platform === "linux") {
    try {
      for (const dev of fx.readDir("/sys/bus/usb/devices")) {
        try {
          const product = fx.readFile("/sys/bus/usb/devices/" + dev + "/product");
          if (product.toLowerCase().includes(YUBIHSM2_USB_PRODUCT_MARKER)) return true;
        } catch {
          // Not a device dir, or unreadable -- next.
        }
      }
    } catch {
      // No sysfs USB tree.
    }
    return false;
  }
  if (fx.platform === "darwin") {
    try {
      return fx.run("system_profiler", ["SPUSBDataType"]).toLowerCase().includes(YUBIHSM2_USB_PRODUCT_MARKER);
    } catch {
      return false;
    }
  }
  return false;
}

/**
 * Probes for the YubiHSM 2 own PKCS#11 module on disk. A DRIVER, not a device -- the same
 * rule as `probePkcs11`, and it never clears `noHardwareDetected` on its own.
 */
export function probeYubiHsm2Pkcs11(fx: HardwareProbeEffects = realProbeEffects()): {
  found: boolean;
  path?: string;
} {
  for (const libPath of YUBIHSM2_PKCS11_LIBRARY_PATHS) {
    if (fx.exists(libPath)) {
      return { found: true, path: libPath };
    }
  }
  return { found: false };
}

/**
 * Probes for an Apple Secure Enclave via the IOKit registry (AppleSEPManager). Real
 * hardware that no seal tier can currently use — reported, never counted as a tier.
 */
export function probeSecureEnclave(fx: HardwareProbeEffects = realProbeEffects()): boolean {
  if (fx.platform !== "darwin") return false;
  try {
    const out = fx.run("ioreg", ["-rc", "AppleSEPManager"]);
    return out.includes("AppleSEPManager");
  } catch {
    return false;
  }
}

/**
 * Runs the full hardware security probe.
 *
 * `noHardwareDetected` is derived from DEVICES ONLY. A PKCS#11 driver on disk and an
 * Apple Secure Enclave are both reported and neither clears it, for the reasons in the
 * header. There is still no fallback anywhere: the flag informs a caller not to declare a
 * hardware tier, and the adapter throws if one declares it anyway.
 */
export function probeHardwareSecurity(fx: HardwareProbeEffects = realProbeEffects()): HardwareProbeResult {
  const tpm = probeTpm2(fx);
  const yubi = probeYubikey(fx);
  const reader = yubi.detected || probeSmartCardReader(fx);
  const pkcs11 = probePkcs11(fx);
  const hsm = probeYubiHsm2(fx);
  const hsmPkcs11 = probeYubiHsm2Pkcs11(fx);
  const sep = probeSecureEnclave(fx);

  // A driver on disk is NOT a device, and the Secure Enclave is a device no tier reaches.
  // Neither belongs in this disjunction. A YubiHSM 2 IS a device and does belong.
  const deviceAvailable = tpm.available || yubi.detected || reader || hsm;

  return {
    timestamp: new Date().toISOString(),
    tpm2Available: tpm.available,
    tpm2State: tpm.state,
    tpm2Reason: tpm.reason,
    tpmDeviceNode: tpm.path,
    yubikeyDetected: yubi.detected,
    yubikeySerial: yubi.serial,
    smartCardReaderAttached: reader,
    pkcs11ModuleFound: pkcs11.found,
    pkcs11LibraryPath: pkcs11.path,
    yubiHsm2Detected: hsm,
    yubiHsm2Pkcs11ModuleFound: hsmPkcs11.found,
    yubiHsm2Pkcs11LibraryPath: hsmPkcs11.path,
    secureEnclaveAvailable: sep,
    noHardwareDetected: !deviceAvailable,
  };
}

/** The hardware members of FrostSealTier. Kept as a narrowing of that union so a new
 *  hardware tier in the adapter cannot silently go unconsidered here. */
export type HardwareSealTier = Extract<FrostSealTier, "hardware-pkcs11" | "hardware-tpm2">;

/**
 * Which hardware seal tiers this host could honour right now — the CHECKABLE form of the
 * ladder's L1 rung claim, which is otherwise only asserted in a document.
 *
 * ADVISORY ONLY. It selects nothing. The caller still DECLARES its tier and
 * `createHsmShareAdapter` still throws when the declared tier cannot be built; this
 * function exists so a runbook step like "seal each share to that node's TPM 2.0" can be
 * checked against the machine in front of you instead of assumed.
 *
 *  - hardware-tpm2 requires a TPM 2.0 device node. Apple Silicon never qualifies.
 *  - hardware-pkcs11 requires a driver AND an attached token. A module with no token is
 *    the false positive this file was fixed to stop reporting, so it is not a tier here.
 */
export function availableHardwareSealTiers(res: HardwareProbeResult): readonly HardwareSealTier[] {
  const tiers: HardwareSealTier[] = [];
  if (res.tpm2Available) tiers.push("hardware-tpm2");
  if (pkcs11MatchedPair(res) !== undefined) tiers.push("hardware-pkcs11");
  return tiers;
}

/**
 * A PKCS#11 module and the device it can actually drive, or `undefined` when no such pair
 * is present. THE PAIR IS THE UNIT: `module && device` over a flat list is a third
 * instance of the bug this file exists to refuse.
 *
 * Concretely, and this is reachable on the maintainer machine the moment both devices are
 * on the desk: `brew install yubico-piv-tool` puts `ykcs11.dylib` on disk, and plugging in
 * a YubiHSM 2 puts a device on the bus. Flat-list logic reads `module found && device
 * present` and reports `hardware-pkcs11` honourable — but `ykcs11` speaks PIV to a CCID
 * card and cannot address a YubiHSM 2, so the seal attempt dies inside an FFI call having
 * promised at preflight that it would not. Matching the module to the device it drives is
 * what makes the preflight answer mean anything.
 */
export function pkcs11MatchedPair(res: HardwareProbeResult): { module: string; device: string } | undefined {
  if (res.pkcs11ModuleFound && (res.yubikeyDetected || res.smartCardReaderAttached)) {
    return { module: res.pkcs11LibraryPath ?? "(token PKCS#11 module)", device: "CCID token / smart-card reader" };
  }
  if (res.yubiHsm2Pkcs11ModuleFound && res.yubiHsm2Detected) {
    return { module: res.yubiHsm2Pkcs11LibraryPath ?? "(yubihsm_pkcs11)", device: "YubiHSM 2" };
  }
  return undefined;
}

/**
 * Preflight a declared hardware tier against this host. THROWS when the host cannot
 * honour it — the same direction as the adapter, never a downgrade. Use it to fail a
 * runbook early with a legible reason instead of deep inside a PKCS#11 FFI call.
 */
export function assertHardwareSealTierAvailable(tier: HardwareSealTier, res: HardwareProbeResult): void {
  if (availableHardwareSealTiers(res).includes(tier)) return;
  const why: string[] = [];
  if (tier === "hardware-tpm2" && !res.tpm2Available) {
    // The refusal must name WHICH not-present this is. "no TPM 2.0 device node" was the
    // old message for all four, and it is a false statement in three of them: it asserts
    // a finding about the hardware where the probe obtained no answer at all.
    why.push(
      `TPM 2.0 is not PRESENT here — state ${res.tpm2State.toUpperCase()}` +
        (tpm2CheckRan(res.tpm2State) ? "" : " (the check did NOT run — this is not a finding about the hardware)") +
        `: ${res.tpm2Reason}`,
    );
    if (res.secureEnclaveAvailable) {
      why.push("this host has an Apple Secure Enclave, which is NOT a TPM 2.0 and which no seal tier can use");
    }
  }
  if (tier === "hardware-pkcs11") {
    const anyModule = res.pkcs11ModuleFound || res.yubiHsm2Pkcs11ModuleFound;
    const anyDevice = res.yubikeyDetected || res.smartCardReaderAttached || res.yubiHsm2Detected;
    if (!anyModule) why.push("no PKCS#11 module on disk (neither a token module nor yubihsm_pkcs11)");
    if (!anyDevice) {
      why.push("no smart-card reader, token, or YubiHSM 2 attached (a PKCS#11 driver alone is not a device)");
    }
    if (anyModule && anyDevice) {
      // Both halves present and still refused: the module cannot drive the device that is
      // here. Naming the mismatch is the whole point -- "module found, device attached,
      // refused" with no reason is indistinguishable from a broken check.
      why.push(
        "a PKCS#11 module and a device are both present but they are NOT a matched pair: " +
          (res.yubiHsm2Detected && !res.yubiHsm2Pkcs11ModuleFound
            ? "a YubiHSM 2 is attached and yubihsm_pkcs11 is not installed (ykcs11/OpenSC cannot drive an HSM)"
            : "a CCID token is attached and no token module (ykcs11/OpenSC) is installed (yubihsm_pkcs11 cannot drive a token)"),
      );
    }
  }
  throw new Error(
    `frost-hardware-probe: this host cannot honour seal tier "${tier}": ${why.join("; ")}. ` +
      `No fallback is offered — pick a tier this host can honour, or attach the hardware.`,
  );
}

if (import.meta.main) {
  const res = probeHardwareSecurity();
  const tiers = availableHardwareSealTiers(res);
  console.log(`[Hardware Security Probe] Result:`);
  // NOT "Not found": three of the four not-present states are not findings about the
  // hardware, and printing one word for all four is how the gap became invisible.
  console.log(`  TPM 2.0:            ${res.tpm2Available ? res.tpmDeviceNode : res.tpm2State.toUpperCase()}`);
  console.log(
    `                      ${tpm2CheckRan(res.tpm2State) ? "(the check ran)" : "(THE CHECK DID NOT RUN)"} ${res.tpm2Reason}`,
  );
  console.log(
    `  YubiKey / token:    ${res.yubikeyDetected ? `Detected${res.yubikeySerial ? ` (S/N: ${res.yubikeySerial})` : " (no serial; ykman absent)"}` : "Not detected"}`,
  );
  console.log(`  Smart-card reader:  ${res.smartCardReaderAttached ? "Attached" : "None attached"}`);
  console.log(
    `  PKCS#11 module:     ${res.pkcs11ModuleFound ? `${res.pkcs11LibraryPath} (a DRIVER — not evidence of a device)` : "Not found"}`,
  );
  console.log(
    `  YubiHSM 2:          ${res.yubiHsm2Detected ? "ATTACHED (bulk USB — invisible to the reader/ykman probes above)" : "Not detected"}`,
  );
  console.log(
    `  yubihsm_pkcs11:     ${res.yubiHsm2Pkcs11ModuleFound ? `${res.yubiHsm2Pkcs11LibraryPath} (a DRIVER — not evidence of a device)` : "Not found"}`,
  );
  const pair = pkcs11MatchedPair(res);
  console.log(
    `  PKCS#11 pair:       ${pair ? `${pair.module} drives ${pair.device}` : "(no matched module+device pair)"}`,
  );
  console.log(
    `  Secure Enclave:     ${res.secureEnclaveAvailable ? "Present (no seal tier can use it — see header)" : "Not present"}`,
  );
  console.log(`  Device present:     ${res.noHardwareDetected ? "NO - a hardware seal tier will THROW here" : "YES"}`);
  console.log(`  Honourable tiers:   ${tiers.length > 0 ? tiers.join(", ") : "(none)"}`);
}
