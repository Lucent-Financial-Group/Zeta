#!/usr/bin/env bun
/**
 * src/Core.TypeScript/cluster/seal-emulator-rung.ts
 *
 * Aaron 2026-09-05: "cna we push hsm and tpm into CI with emulators?"
 *
 * Yes as a *wiring* rung. No as a substitute for metal. This module
 * classifies which claims SoftHSM2 / swtpm can witness and which claims
 * still need a YubiHSM, a smartcard HSM, or this board's TPM. It does
 * not start OpenBao, does not load a PKCS#11 module, and does not put
 * `seal "pkcs11"` into Application.yaml.
 *
 * Why the committed chart stays Shamir until a module exists in the
 * same commit: `quay.io/openbao/openbao-hsm` ships a cgo `bao` that
 * *can* load PKCS#11 and ships *no* module (no softhsm, no tpm2-pkcs11,
 * no opensc — measured Dockerfile:28 @ v2.6.2). A seal stanza without
 * a library is a check that cannot pass.
 *
 * USB repair is the metal counterpart: the stick already keeps CLI
 * creds; it must also keep HSM-*talk* (module path, connector config,
 * authkey *reference*, domain map, OpenBao env pointer) so a repaired
 * box can keep talking to the device. PIN bytes, Shamir shares,
 * OP_SESSION, and a brand type baked into the ZetaFS volume are
 * forbidden on that stick as originals.
 *
 * Cite, do not reinvent:
 *   docs/research/2026-08-21-openbao-migration-path-for-the-deployed-vault-*.md §6.2–6.3
 *   docs/research/2026-08-26-cluster-join-boot-path-in-nixos-vm-tests-*.md §5.6
 *   docs/research/2026-08-18-hsm-container-isolation-*.md
 *   openbao.org/docs/configuration/seal/pkcs11/ (SoftHSM path is the example)
 *   Yubico yubihsm-shell#381: no public firmware emulator
 *
 * Pattern 1 refused. PKCS#11, not a brand.
 */

export type SealOracle = "softhsm2" | "swtpm" | "tpm2-pkcs11" | "yubihsm2" | "smartcard-hsm" | "none";

export type SealClaim =
  | "openbao-loads-pkcs11-module"
  | "openbao-inits-without-shamir"
  | "mechanism-ckm-rsa-pkcs-oaep"
  | "mechanism-ckm-aes-gcm"
  | "pin-via-env-not-configmap"
  | "usb-channel"
  | "yubihsm-domain-isolation"
  | "scp03"
  | "session-exhaustion-device-wide"
  | "firmware-pcr-this-machine"
  | "apple-silicon-se";

export type Witness = "yes" | "no";

export type MechanismPick =
  | { readonly kind: "preferred-aes-gcm" }
  | { readonly kind: "must-pin-rsa-oaep"; readonly reason: "tpm2-pkcs11-has-no-aes-gcm" }
  | { readonly kind: "measure-on-device" }
  | { readonly kind: "none" };

export type UsbRepairClass = "companion" | "forbidden" | "cli-cred" | "unknown";

export const USB_HSM_COMPANION = [
  "pkcs11-module-path",
  "connector-config",
  "authkey-reference",
  "domain-map",
  "openbao-seal-env-pointer",
] as const;

export const USB_HSM_FORBIDDEN = [
  "pin-plaintext-as-original",
  "shamir-share",
  "op-session",
  "brand-type-in-volume",
] as const;

export const USB_CLI_CREDS = ["gh-cli", "claude", "codex", "gemini"] as const;

const CI_EMULATORS: ReadonlySet<SealOracle> = new Set(["softhsm2", "swtpm", "tpm2-pkcs11"]);
const METAL_ORACLES: ReadonlySet<SealOracle> = new Set(["yubihsm2", "smartcard-hsm"]);

const SOFTHSM_YES: ReadonlySet<SealClaim> = new Set([
  "openbao-loads-pkcs11-module",
  "openbao-inits-without-shamir",
  "mechanism-ckm-rsa-pkcs-oaep",
  "mechanism-ckm-aes-gcm",
  "pin-via-env-not-configmap",
]);

const SWTPM_YES: ReadonlySet<SealClaim> = new Set([
  "openbao-loads-pkcs11-module",
  "openbao-inits-without-shamir",
  "mechanism-ckm-rsa-pkcs-oaep",
  "pin-via-env-not-configmap",
]);

const YUBIHSM_YES: ReadonlySet<SealClaim> = new Set([
  "openbao-loads-pkcs11-module",
  "openbao-inits-without-shamir",
  "mechanism-ckm-rsa-pkcs-oaep",
  "mechanism-ckm-aes-gcm",
  "pin-via-env-not-configmap",
  "usb-channel",
  "yubihsm-domain-isolation",
  "scp03",
  "session-exhaustion-device-wide",
]);

const SMARTCARD_YES: ReadonlySet<SealClaim> = new Set([
  "openbao-loads-pkcs11-module",
  "openbao-inits-without-shamir",
  "mechanism-ckm-rsa-pkcs-oaep",
  "pin-via-env-not-configmap",
  "usb-channel",
]);

const WITNESS: Readonly<Record<SealOracle, ReadonlySet<SealClaim>>> = {
  softhsm2: SOFTHSM_YES,
  swtpm: SWTPM_YES,
  "tpm2-pkcs11": SWTPM_YES,
  yubihsm2: YUBIHSM_YES,
  "smartcard-hsm": SMARTCARD_YES,
  none: new Set(),
};

const PKCS11_SEAL_RE = /^\s*seal\s+"pkcs11"\s*\{/m;

export function isCiEmulatorRung(oracle: SealOracle): boolean {
  return CI_EMULATORS.has(oracle);
}

export function isMetalOracle(oracle: SealOracle): boolean {
  return METAL_ORACLES.has(oracle);
}

export function emulatorWitness(oracle: SealOracle, claim: SealClaim): Witness {
  return WITNESS[oracle].has(claim) ? "yes" : "no";
}

/**
 * OpenBao prefers CKM_AES_GCM then CKM_RSA_PKCS_OAEP.
 * tpm2-pkcs11 offers OAEP and has no AES-GCM (mech.c @ v1.10.1).
 * A TPM-backed seal MUST pin OAEP or the default negotiates to a
 * mechanism the token cannot do.
 */
export function pickOpenbaoMechanism(oracle: SealOracle): MechanismPick {
  switch (oracle) {
    case "softhsm2":
    case "yubihsm2":
      return { kind: "preferred-aes-gcm" };
    case "swtpm":
    case "tpm2-pkcs11":
      return { kind: "must-pin-rsa-oaep", reason: "tpm2-pkcs11-has-no-aes-gcm" };
    case "smartcard-hsm":
      return { kind: "measure-on-device" };
    case "none":
      return { kind: "none" };
  }
}

export function classifyUsbRepairArtifact(kind: string): UsbRepairClass {
  const k = kind.trim();
  if ((USB_HSM_COMPANION as readonly string[]).includes(k)) return "companion";
  if ((USB_HSM_FORBIDDEN as readonly string[]).includes(k)) return "forbidden";
  if ((USB_CLI_CREDS as readonly string[]).includes(k)) return "cli-cred";
  return "unknown";
}

export function hclHasPkcs11Seal(hcl: string): boolean {
  return PKCS11_SEAL_RE.test(hcl);
}

/**
 * Committing `seal "pkcs11"` without a module in the image (or a
 * hostPath / initContainer that copies one in the same commit) is a
 * check that cannot pass on GitHub runners.
 */
export function refuseCommittedPkcs11SealWithoutModule(
  hcl: string,
  moduleInImage: boolean,
): { readonly ok: true } | { readonly ok: false; readonly reason: "seal-without-module" } {
  if (hclHasPkcs11Seal(hcl) && !moduleInImage) {
    return { ok: false, reason: "seal-without-module" };
  }
  return { ok: true };
}

/**
 * Yubico has no public YubiHSM firmware emulator (yubihsm-shell#381).
 * An unofficial in-memory connector mock is not a device proof and is
 * not a PKCS#11 seal target.
 */
export function classifyOracleLabel(raw: string): SealOracle | "unofficial-mock" | "unknown" {
  const s = raw.trim().toLowerCase();
  if (s === "softhsm2" || s === "softhsm") return "softhsm2";
  if (s === "swtpm" || s === "qemu-tpm-emulator") return "swtpm";
  if (s === "tpm2-pkcs11") return "tpm2-pkcs11";
  if (s === "yubihsm2" || s === "yubihsm") return "yubihsm2";
  if (s === "smartcard-hsm" || s === "cardcontact") return "smartcard-hsm";
  if (s === "none") return "none";
  if (s === "yubi-hsm-mock" || s === "yubihsm-mock") return "unofficial-mock";
  return "unknown";
}

export function unofficialMockIsDeviceProof(label: string): boolean {
  return classifyOracleLabel(label) !== "unofficial-mock";
}

export function softhsmGreenIsMetalGreen(oracle: SealOracle): boolean {
  return isMetalOracle(oracle);
}
