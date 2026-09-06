/**
 * Falsifiers for USB --bake-cred HSM-talk companions.
 *
 * REFUTE:
 *   * PIN / Shamir / OP_SESSION / brand-type as bake-cred originals.
 *   * Baking the .so bytes instead of the module path.
 *   * connector JSON carrying pin=.
 *   * env pointer as NAME=value.
 *   * hex key material as an authkey "reference".
 *   * restore filename /etc/zeta/seal/pkcs11-module-path as the .so path.
 */
import { describe, expect, test } from "bun:test";
import { NIXOS_PKCS11_MODULE_PATH, USB_PKCS11_MODULE_POINTER } from "../cluster/pkcs11-hostpath-overlay.ts";
import { USB_HSM_COMPANION, USB_HSM_FORBIDDEN, classifyUsbRepairArtifact } from "../cluster/seal-emulator-rung.ts";
import { resolveBakeCred } from "./zeta-cred-handlers.ts";
import { FORBIDDEN_BAKE_CRED_ALIASES, refuseForbiddenBakeCredId, validateCompanionValue } from "./usb-hsm-companion.ts";

describe("companion ids are bake-cred handlers; forbidden ids never are", () => {
  test("each USB_HSM_COMPANION id classifies as companion and bakes a reference", () => {
    const samples: Record<(typeof USB_HSM_COMPANION)[number], string> = {
      "pkcs11-module-path": "/usr/lib/yubihsm2/pkcs11/yubihsm_pkcs11.so",
      "connector-config": '{"url":"http://127.0.0.1:12345"}',
      "authkey-reference": "label:zeta-unseal",
      "domain-map": '{"1":"unseal","2":"backup"}',
      "openbao-seal-env-pointer": "BAO_HSM_PIN",
    };
    for (const id of USB_HSM_COMPANION) {
      expect(classifyUsbRepairArtifact(id)).toBe("companion");
      const result = resolveBakeCred(`${id}=${samples[id]}`);
      expect("ok" in result).toBe(true);
    }
  });

  test("forbidden classifier ids refuse before any handler", () => {
    for (const id of USB_HSM_FORBIDDEN) {
      expect(classifyUsbRepairArtifact(id)).toBe("forbidden");
      const result = resolveBakeCred(`${id}=not-a-secret-for-tests`);
      expect("error" in result).toBe(true);
      if (!("error" in result)) return;
      expect(result.error).toContain("refuses");
    }
  });

  test("PIN / OP_SESSION / shamir aliases refuse", () => {
    for (const id of FORBIDDEN_BAKE_CRED_ALIASES) {
      expect(refuseForbiddenBakeCredId(id)).not.toBeNull();
      const result = resolveBakeCred(`${id}=1234`);
      expect("error" in result).toBe(true);
    }
  });
});

describe("companion values are references, not originals", () => {
  test("module path accepts an absolute .so; rejects ELF bytes and brand-only paths", () => {
    expect(validateCompanionValue("pkcs11-module-path", Buffer.from("/usr/lib/softhsm/libsofthsm2.so"))).toBeNull();
    expect(validateCompanionValue("pkcs11-module-path", Buffer.from("\x7fELF...."))).toContain("not the .so bytes");
    expect(validateCompanionValue("pkcs11-module-path", Buffer.from("/yubihsm"))).toContain("not a brand type");
    expect(validateCompanionValue("pkcs11-module-path", Buffer.from("yubihsm_pkcs11.so"))).toContain("absolute path");
  });

  test("restore filename is not a module path, even though it contains pkcs11", () => {
    expect(validateCompanionValue("pkcs11-module-path", Buffer.from(USB_PKCS11_MODULE_POINTER))).toBe(
      "pkcs11-module-path is the restore file, not the .so",
    );
    expect(validateCompanionValue("pkcs11-module-path", Buffer.from(`  ${USB_PKCS11_MODULE_POINTER}  `))).toBe(
      "pkcs11-module-path is the restore file, not the .so",
    );
    expect(validateCompanionValue("pkcs11-module-path", Buffer.from(NIXOS_PKCS11_MODULE_PATH.yubihsm2))).toBeNull();
    const baked = resolveBakeCred(`pkcs11-module-path=${USB_PKCS11_MODULE_POINTER}`);
    expect("error" in baked).toBe(true);
    if (!("error" in baked)) return;
    expect(baked.error).toBe("pkcs11-module-path: pkcs11-module-path is the restore file, not the .so");
  });

  test("connector-config refuses a pin field", () => {
    expect(validateCompanionValue("connector-config", Buffer.from('{"url":"http://127.0.0.1:12345"}'))).toBeNull();
    expect(validateCompanionValue("connector-config", Buffer.from('{"pin":"1234"}'))).toContain("pin");
  });

  test("authkey-reference refuses hex key material", () => {
    expect(validateCompanionValue("authkey-reference", Buffer.from("label:zeta-unseal"))).toBeNull();
    expect(validateCompanionValue("authkey-reference", Buffer.from("a".repeat(32)))).toContain("not key material");
  });

  test("openbao-seal-env-pointer is the env name, not NAME=value", () => {
    expect(validateCompanionValue("openbao-seal-env-pointer", Buffer.from("BAO_HSM_PIN"))).toBeNull();
    expect(validateCompanionValue("openbao-seal-env-pointer", Buffer.from("BAO_HSM_PIN=1234"))).toContain("env *name*");
  });

  test("CLI creds still bake; companions do not steal gh-cli", () => {
    const cli = resolveBakeCred("gh-cli=TEST-NOT-A-REAL-TOKEN-xxxxxxxx");
    expect("ok" in cli).toBe(true);
    const companion = resolveBakeCred("pkcs11-module-path=/usr/lib/pkcs11/lib.so");
    expect("ok" in companion).toBe(true);
  });
});
