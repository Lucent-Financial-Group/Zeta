/**
 * Falsifiers for the CI emulator rung vs metal HSM/TPM claims.
 *
 * The claims this file has to be able to REFUTE:
 *
 *   * SoftHSM2 green is not YubiHSM green.
 *   * swtpm can seal; it cannot seal to this board's firmware PCRs.
 *   * tpm2-pkcs11 has no AES-GCM; OpenBao must pin OAEP.
 *   * A PKCS#11 seal in committed HCL without a module in the image is refused.
 *   * Today's OpenBao Application.yaml does not carry that stanza.
 *   * yubi-hsm-mock is not a device proof.
 *   * USB repair may carry HSM-talk companions and CLI creds; PIN-as-original,
 *     Shamir shares, OP_SESSION, and a brand type in the volume are forbidden.
 */
import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  USB_CLI_CREDS,
  USB_HSM_COMPANION,
  USB_HSM_FORBIDDEN,
  classifyOracleLabel,
  classifyUsbRepairArtifact,
  emulatorWitness,
  hclHasPkcs11Seal,
  isCiEmulatorRung,
  isMetalOracle,
  pickOpenbaoMechanism,
  refuseCommittedPkcs11SealWithoutModule,
  softhsmGreenIsMetalGreen,
  unofficialMockIsDeviceProof,
  type SealClaim,
  type SealOracle,
} from "./seal-emulator-rung.ts";

const WIRING: readonly SealClaim[] = [
  "openbao-loads-pkcs11-module",
  "openbao-inits-without-shamir",
  "mechanism-ckm-rsa-pkcs-oaep",
  "pin-via-env-not-configmap",
];

const METAL_ONLY: readonly SealClaim[] = [
  "usb-channel",
  "yubihsm-domain-isolation",
  "scp03",
  "session-exhaustion-device-wide",
  "firmware-pcr-this-machine",
  "apple-silicon-se",
];

const APPLICATION = join(import.meta.dir, "../../../full-ai-cluster/k8s/applications/openbao/Application.yaml");

describe("emulator vs metal — what CI can honestly witness", () => {
  test("SoftHSM2 and swtpm are CI rungs; YubiHSM and smartcard are metal", () => {
    expect(isCiEmulatorRung("softhsm2")).toBe(true);
    expect(isCiEmulatorRung("swtpm")).toBe(true);
    expect(isCiEmulatorRung("tpm2-pkcs11")).toBe(true);
    expect(isMetalOracle("yubihsm2")).toBe(true);
    expect(isMetalOracle("smartcard-hsm")).toBe(true);
    expect(isCiEmulatorRung("yubihsm2")).toBe(false);
    expect(isMetalOracle("softhsm2")).toBe(false);
    expect(softhsmGreenIsMetalGreen("softhsm2")).toBe(false);
    expect(softhsmGreenIsMetalGreen("yubihsm2")).toBe(true);
  });

  test("SoftHSM2 witnesses the OpenBao PKCS#11 wiring, including AES-GCM", () => {
    for (const claim of WIRING) {
      expect(emulatorWitness("softhsm2", claim)).toBe("yes");
    }
    expect(emulatorWitness("softhsm2", "mechanism-ckm-aes-gcm")).toBe("yes");
  });

  test("SoftHSM2 does not witness USB, domains, SCP03, this board's PCRs, or SE", () => {
    for (const claim of METAL_ONLY) {
      expect(emulatorWitness("softhsm2", claim)).toBe("no");
    }
  });

  test("swtpm / tpm2-pkcs11 witness OAEP wrap, not AES-GCM and not this board's PCRs", () => {
    expect(emulatorWitness("swtpm", "mechanism-ckm-rsa-pkcs-oaep")).toBe("yes");
    expect(emulatorWitness("swtpm", "mechanism-ckm-aes-gcm")).toBe("no");
    expect(emulatorWitness("swtpm", "firmware-pcr-this-machine")).toBe("no");
    expect(emulatorWitness("tpm2-pkcs11", "mechanism-ckm-aes-gcm")).toBe("no");
    expect(emulatorWitness("swtpm", "usb-channel")).toBe("no");
  });

  test("YubiHSM witnesses USB channel, 16 domains, SCP03, and session starvation", () => {
    expect(emulatorWitness("yubihsm2", "usb-channel")).toBe("yes");
    expect(emulatorWitness("yubihsm2", "yubihsm-domain-isolation")).toBe("yes");
    expect(emulatorWitness("yubihsm2", "scp03")).toBe("yes");
    expect(emulatorWitness("yubihsm2", "session-exhaustion-device-wide")).toBe("yes");
    expect(emulatorWitness("yubihsm2", "firmware-pcr-this-machine")).toBe("no");
    expect(emulatorWitness("yubihsm2", "apple-silicon-se")).toBe("no");
  });

  test("none witnesses nothing — silence is not a proof", () => {
    const claims: readonly SealClaim[] = [...WIRING, ...METAL_ONLY, "mechanism-ckm-aes-gcm"];
    for (const claim of claims) {
      expect(emulatorWitness("none", claim)).toBe("no");
    }
  });
});

describe("OpenBao mechanism pick — TPM floor cannot inherit AES-GCM default", () => {
  test("SoftHSM2 and YubiHSM may use the preferred AES-GCM", () => {
    expect(pickOpenbaoMechanism("softhsm2")).toEqual({ kind: "preferred-aes-gcm" });
    expect(pickOpenbaoMechanism("yubihsm2")).toEqual({ kind: "preferred-aes-gcm" });
  });

  test("swtpm / tpm2-pkcs11 must pin CKM_RSA_PKCS_OAEP", () => {
    expect(pickOpenbaoMechanism("swtpm")).toEqual({
      kind: "must-pin-rsa-oaep",
      reason: "tpm2-pkcs11-has-no-aes-gcm",
    });
    expect(pickOpenbaoMechanism("tpm2-pkcs11")).toEqual({
      kind: "must-pin-rsa-oaep",
      reason: "tpm2-pkcs11-has-no-aes-gcm",
    });
  });

  test("smartcard HSM AES-GCM is measured on the device, not assumed from SoftHSM", () => {
    expect(pickOpenbaoMechanism("smartcard-hsm")).toEqual({ kind: "measure-on-device" });
  });
});

describe("committed tree — no PKCS#11 seal without a module in the image", () => {
  test("refuses seal stanza when the image has no module", () => {
    const hcl = ['seal "pkcs11" {', '  lib = "/usr/lib/softhsm/libsofthsm2.so"', "}"].join("\n");
    expect(hclHasPkcs11Seal(hcl)).toBe(true);
    expect(refuseCommittedPkcs11SealWithoutModule(hcl, false)).toEqual({
      ok: false,
      reason: "seal-without-module",
    });
  });

  test("allows Shamir HCL when the image has no module", () => {
    const hcl = 'storage "raft" { path = "/openbao/data" }';
    expect(hclHasPkcs11Seal(hcl)).toBe(false);
    expect(refuseCommittedPkcs11SealWithoutModule(hcl, false)).toEqual({ ok: true });
  });

  test("allows the stanza once a module is in the image in the same commit", () => {
    const hcl = ['seal "pkcs11" {', '  lib = "/usr/lib/softhsm/libsofthsm2.so"', "}"].join("\n");
    expect(refuseCommittedPkcs11SealWithoutModule(hcl, true)).toEqual({ ok: true });
  });

  test("today's OpenBao Application.yaml has no pkcs11 seal (image has no module)", () => {
    const yaml = readFileSync(APPLICATION, "utf8");
    expect(hclHasPkcs11Seal(yaml)).toBe(false);
    expect(refuseCommittedPkcs11SealWithoutModule(yaml, false)).toEqual({ ok: true });
  });

  test("commented seal stanzas are not active", () => {
    expect(hclHasPkcs11Seal('# seal "pkcs11" {\n#   lib = "x"\n# }')).toBe(false);
  });
});

describe("unofficial YubiHSM mocks are not a device proof", () => {
  test("classifies known oracles and refuses yubi-hsm-mock as metal", () => {
    expect(classifyOracleLabel("SoftHSM2")).toBe("softhsm2");
    expect(classifyOracleLabel("qemu-tpm-emulator")).toBe("swtpm");
    expect(classifyOracleLabel("YubiHSM")).toBe("yubihsm2");
    expect(classifyOracleLabel("yubi-hsm-mock")).toBe("unofficial-mock");
    expect(unofficialMockIsDeviceProof("yubi-hsm-mock")).toBe(false);
    expect(unofficialMockIsDeviceProof("yubihsm2")).toBe(true);
  });
});

describe("USB repair stick — CLI creds plus HSM-talk, not PIN-as-original", () => {
  test("HSM companions are allowed on the repair stick", () => {
    for (const kind of USB_HSM_COMPANION) {
      expect(classifyUsbRepairArtifact(kind)).toBe("companion");
    }
  });

  test("existing CLI creds stay CLI creds", () => {
    for (const kind of USB_CLI_CREDS) {
      expect(classifyUsbRepairArtifact(kind)).toBe("cli-cred");
    }
  });

  test("PIN plaintext, Shamir shares, OP_SESSION, and brand types in the volume are forbidden", () => {
    for (const kind of USB_HSM_FORBIDDEN) {
      expect(classifyUsbRepairArtifact(kind)).toBe("forbidden");
    }
  });

  test("does not promote junk", () => {
    expect(classifyUsbRepairArtifact("YubiHSM")).toBe("unknown");
    expect(classifyUsbRepairArtifact("")).toBe("unknown");
  });
});

describe("type coverage — every oracle is classified", () => {
  test("isCiEmulatorRung and isMetalOracle partition the oracles", () => {
    const oracles: readonly SealOracle[] = ["softhsm2", "swtpm", "tpm2-pkcs11", "yubihsm2", "smartcard-hsm", "none"];
    for (const oracle of oracles) {
      const ci = isCiEmulatorRung(oracle);
      const metal = isMetalOracle(oracle);
      expect(ci && metal).toBe(false);
      if (oracle === "none") {
        expect(ci).toBe(false);
        expect(metal).toBe(false);
      }
    }
  });
});
