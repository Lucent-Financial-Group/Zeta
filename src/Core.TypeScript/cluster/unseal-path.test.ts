import { describe, expect, test } from "bun:test";
import { UNSEAL_THRESHOLD } from "./vault-unsealer.ts";
import { emptyCapture, pickSealOracleFromCapture, type HostHardwareCapture } from "./host-seal-profile.ts";
import { NIXOS_PKCS11_MODULE_PATH, USB_PKCS11_MODULE_POINTER, overlaySealHcl } from "./pkcs11-hostpath-overlay.ts";
import {
  availablePaths,
  emulatorMatrixCell,
  integrateAtSetup,
  pickInstallPath,
  planSetupOverlayFromIntegrate,
  refuseTwoOpenBaoSeals,
  sealOracleFromUnsealPath,
  skipIfAbsentCannotWearPass,
  tpmCanAutoUnseal,
} from "./unseal-path.ts";

/** Completed metal look: both automatic oracles absent. */
const METAL: HostHardwareCapture = emptyCapture({
  os: "nixos",
  yubiHsm2: "absent",
  tpm2: "absent",
});

function capture(partial: Partial<HostHardwareCapture>): HostHardwareCapture {
  return emptyCapture({ ...METAL, ...partial });
}

describe("integrateAtSetup — PKCS#11 only when the device is accessible", () => {
  test("auto + attached YubiHSM2 → pkcs11-yubihsm (not Lucent)", () => {
    const r = integrateAtSetup({ requested: "auto" }, capture({ yubiHsm2: "attached" }));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.path).toBe("pkcs11-yubihsm");
    expect(r.mechanism).toBe("aes-gcm");
    expect(r.autoUnseal).toBe(true);
  });

  test("auto + TPM present, no HSM → pkcs11-tpm (TPM can auto-unseal)", () => {
    const r = integrateAtSetup({ requested: "auto" }, capture({ tpm2: "present" }));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.path).toBe("pkcs11-tpm");
    expect(r.mechanism).toBe("must-pin-rsa-oaep");
    expect(r.autoUnseal).toBe(true);
  });

  test("HSM attached wins over TPM present (one OpenBao seal)", () => {
    const r = integrateAtSetup({ requested: "auto" }, capture({ yubiHsm2: "attached", tpm2: "present" }));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.path).toBe("pkcs11-yubihsm");
  });

  test("CardContact SmartCard-HSM wins over TPM when no YubiHSM", () => {
    const r = integrateAtSetup({ requested: "auto" }, capture({ smartcardHsm: true, tpm2: "present" }));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.path).toBe("pkcs11-smartcard");
    expect(r.mechanism).toBe("measure-on-device");
  });

  test("CardContact SmartCard-HSM is a peer vendor — measure-on-device, not YubiHSM AES-GCM", () => {
    const r = integrateAtSetup({ requested: "auto" }, capture({ smartcardHsm: true }));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.path).toBe("pkcs11-smartcard");
    expect(r.mechanism).toBe("measure-on-device");
    expect(r.autoUnseal).toBe(true);
  });

  test("YubiKey FIDO is not a SmartCard-HSM", () => {
    const r = integrateAtSetup({ requested: "auto" }, capture({ yubikeyFido: true }));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.path).toBe("lucent-shamir");
  });

  test("both metal HSM vendors attached → one OpenBao seal (YubiHSM first)", () => {
    const r = integrateAtSetup({ requested: "auto" }, capture({ yubiHsm2: "attached", smartcardHsm: true }));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.path).toBe("pkcs11-yubihsm");
  });

  test("umbrella pkcs11-hsm with only CardContact names pkcs11-smartcard", () => {
    const r = integrateAtSetup({ requested: "pkcs11-hsm" }, capture({ smartcardHsm: true }));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.path).toBe("pkcs11-smartcard");
    expect(r.mechanism).toBe("measure-on-device");
  });

  test("requested pkcs11-smartcard with only YubiHSM refuses — not the other vendor, not Lucent", () => {
    const r = integrateAtSetup({ requested: "pkcs11-smartcard" }, capture({ yubiHsm2: "attached" }));
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.reason).toBe("requested-pkcs11-not-accessible");
  });

  test("requested pkcs11-yubihsm with only SmartCard-HSM refuses — not the other vendor", () => {
    const r = integrateAtSetup({ requested: "pkcs11-yubihsm" }, capture({ smartcardHsm: true }));
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.reason).toBe("requested-pkcs11-not-accessible");
  });

  test("auto + nothing accessible → lucent-shamir (1Password peer path)", () => {
    const r = integrateAtSetup({ requested: "auto" }, METAL);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.path).toBe("lucent-shamir");
    expect(r.autoUnseal).toBe(false);
    expect(r.threshold).toBe(UNSEAL_THRESHOLD);
    expect(r.threshold).toBeGreaterThanOrEqual(2);
  });

  test("explicit lucent-shamir is always a peer path, even with HSM attached", () => {
    const r = integrateAtSetup({ requested: "lucent-shamir" }, capture({ yubiHsm2: "attached" }));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.path).toBe("lucent-shamir");
  });

  test("requested pkcs11-hsm without attached device refuses — does not fall to Lucent", () => {
    const r = integrateAtSetup({ requested: "pkcs11-hsm" }, METAL);
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.reason).toBe("requested-pkcs11-not-accessible");
    expect(r.requested).toBe("pkcs11-hsm");
  });

  test("requested pkcs11-tpm without present TPM refuses — does not fall to Lucent", () => {
    const r = integrateAtSetup({ requested: "pkcs11-tpm" }, METAL);
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.reason).toBe("requested-pkcs11-not-accessible");
  });

  test("driver on disk is not a device (explicit HSM request)", () => {
    const r = integrateAtSetup({ requested: "pkcs11-hsm" }, capture({ pkcs11ModuleOnDisk: true, yubiHsm2: "absent" }));
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.reason).toBe("driver-is-not-a-device");
  });

  test("TPM unavailable is a check that did not run, not absent", () => {
    const r = integrateAtSetup({ requested: "pkcs11-tpm" }, capture({ tpm2: "unavailable" }));
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.reason).toBe("probe-did-not-run");
  });

  test("TPM not-asked is a check that did not run, not absent", () => {
    const r = integrateAtSetup({ requested: "auto" }, capture({ tpm2: "not-asked" }));
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.reason).toBe("probe-did-not-run");
  });

  test("HSM indeterminate is a check that did not run", () => {
    const r = integrateAtSetup({ requested: "pkcs11-hsm" }, capture({ yubiHsm2: "indeterminate" }));
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.reason).toBe("probe-did-not-run");
  });

  test("ci-softhsm via integrateAtSetup without a job is emulator-not-declared", () => {
    const r = integrateAtSetup({ requested: "ci-softhsm" }, METAL);
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.reason).toBe("emulator-not-declared");
  });
});

describe("availablePaths — fleet may mix; Lucent is always listed", () => {
  test("nothing accessible → only lucent-shamir", () => {
    expect(availablePaths(METAL)).toEqual(["lucent-shamir"]);
  });

  test("HSM + TPM both accessible → three paths; caller still picks one seal", () => {
    expect(availablePaths(capture({ yubiHsm2: "attached", tpm2: "present" }))).toEqual([
      "pkcs11-yubihsm",
      "pkcs11-tpm",
      "lucent-shamir",
    ]);
  });

  test("both metal HSM vendors + TPM are listed; Lucent stays a peer", () => {
    expect(availablePaths(capture({ yubiHsm2: "attached", smartcardHsm: true, tpm2: "present" }))).toEqual([
      "pkcs11-yubihsm",
      "pkcs11-smartcard",
      "pkcs11-tpm",
      "lucent-shamir",
    ]);
  });
});

describe("TPM auto-unseal is PKCS#11 OAEP, not AES-GCM", () => {
  test("must-pin-rsa-oaep is the only TPM auto-unseal mechanism", () => {
    expect(tpmCanAutoUnseal("must-pin-rsa-oaep")).toBe(true);
    expect(tpmCanAutoUnseal("aes-gcm")).toBe(false);
    expect(tpmCanAutoUnseal("refused-aes-gcm-on-tpm")).toBe(false);
  });
});

describe("one OpenBao seal per node", () => {
  test("two distinct PKCS#11 paths refuse", () => {
    const r = refuseTwoOpenBaoSeals(["pkcs11-yubihsm", "pkcs11-tpm"]);
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.reason).toBe("two-openbao-seals");
  });

  test("YubiHSM plus CardContact on the same node is two OpenBao seals — dual-vendor is ZetaFS k-of-n", () => {
    const r = refuseTwoOpenBaoSeals(["pkcs11-yubihsm", "pkcs11-smartcard"]);
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.reason).toBe("two-openbao-seals");
  });

  test("HSM plus Lucent on the same node is still two OpenBao seals if both are requested as seals", () => {
    const r = refuseTwoOpenBaoSeals(["pkcs11-yubihsm", "lucent-shamir"]);
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.reason).toBe("two-openbao-seals");
  });

  test("a single path is allowed", () => {
    expect(refuseTwoOpenBaoSeals(["lucent-shamir"]).ok).toBe(true);
  });
});

describe("emulator install 2×2 — declared by installing, never skip-if-absent", () => {
  test("skip-if-absent cannot wear a pass", () => {
    expect(skipIfAbsentCannotWearPass()).toBe(false);
  });

  test("neither emulator, lucent fetcher present → lucent-shamir", () => {
    const r = pickInstallPath({
      softhsmInstalled: false,
      swtpmInstalled: false,
      lucentFetcherPresent: true,
      kindUnsealerPresent: false,
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.path).toBe("lucent-shamir");
  });

  test("neither emulator, kind unsealer present → kind-shamir", () => {
    const r = pickInstallPath({
      softhsmInstalled: false,
      swtpmInstalled: false,
      lucentFetcherPresent: false,
      kindUnsealerPresent: true,
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.path).toBe("kind-shamir");
  });

  test("neither emulator and nothing to unseal with is no-path, not a skip-pass", () => {
    const r = pickInstallPath({
      softhsmInstalled: false,
      swtpmInstalled: false,
      lucentFetcherPresent: false,
      kindUnsealerPresent: false,
    });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.reason).toBe("no-path");
  });

  test("softhsm installed, swtpm not → ci-softhsm", () => {
    const r = pickInstallPath({
      softhsmInstalled: true,
      swtpmInstalled: false,
      lucentFetcherPresent: false,
      kindUnsealerPresent: false,
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.path).toBe("ci-softhsm");
    expect(r.mechanism).toBe("aes-gcm");
  });

  test("swtpm installed, softhsm not → ci-swtpm OAEP", () => {
    const r = pickInstallPath({
      softhsmInstalled: false,
      swtpmInstalled: true,
      lucentFetcherPresent: false,
      kindUnsealerPresent: false,
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.path).toBe("ci-swtpm");
    expect(r.mechanism).toBe("must-pin-rsa-oaep");
  });

  test("both emulators installed → ci-softhsm (HSM wins; one seal)", () => {
    const r = pickInstallPath({
      softhsmInstalled: true,
      swtpmInstalled: true,
      lucentFetcherPresent: true,
      kindUnsealerPresent: true,
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.path).toBe("ci-softhsm");
  });

  test("emulatorMatrixCell fail-missing never skip-passes", () => {
    const r = emulatorMatrixCell({
      wantSofthsm: true,
      wantSwtpm: false,
      softhsmInstalled: false,
      swtpmInstalled: false,
    });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.reason).toBe("fail-missing");
  });

  test("emulatorMatrixCell with the declared packages installed is ok", () => {
    const r = emulatorMatrixCell({
      wantSofthsm: true,
      wantSwtpm: true,
      softhsmInstalled: true,
      swtpmInstalled: true,
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.path).toBe("ci-softhsm");
  });

  test("cell that wants neither still needs a Lucent or kind path", () => {
    const r = emulatorMatrixCell({
      wantSofthsm: false,
      wantSwtpm: false,
      softhsmInstalled: false,
      swtpmInstalled: false,
    });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.reason).toBe("no-path");
  });
});

describe("setup integrate decision feeds the PKCS#11 overlay", () => {
  test("attached YubiHSM + companion contents: overlay path wins; stanza still cannot commit", () => {
    const decision = integrateAtSetup({ requested: "auto" }, capture({ yubiHsm2: "attached" }));
    expect(sealOracleFromUnsealPath("pkcs11-yubihsm")).toBe("yubihsm2");
    expect(pickSealOracleFromCapture(capture({ yubiHsm2: "attached" }))).toBe("yubihsm2");
    const plan = planSetupOverlayFromIntegrate(decision, "/opt/vendor/yubihsm_pkcs11.so", true);
    expect(plan.modulePath).toBe("/opt/vendor/yubihsm_pkcs11.so");
    expect(plan.mayCommitSeal).toBe(false);
    expect(plan.abi).toBe("glibc-host-into-musl-image");
    expect(overlaySealHcl(plan)).toBeNull();
  });

  test("blank companion on CardContact falls back to the NixOS OpenSC contract", () => {
    const decision = integrateAtSetup({ requested: "auto" }, capture({ smartcardHsm: true }));
    expect(sealOracleFromUnsealPath("pkcs11-smartcard")).toBe("smartcard-hsm");
    const plan = planSetupOverlayFromIntegrate(decision, "  ", true);
    expect(plan.modulePath).toBe(NIXOS_PKCS11_MODULE_PATH["smartcard-hsm"]);
    expect(plan.mayCommitSeal).toBe(false);
  });

  test("TPM integrate pins OAEP on the overlay and still cannot commit the stanza", () => {
    const decision = integrateAtSetup({ requested: "pkcs11-tpm" }, capture({ tpm2: "present" }));
    expect(sealOracleFromUnsealPath("pkcs11-tpm")).toBe("tpm2-pkcs11");
    const plan = planSetupOverlayFromIntegrate(decision, null, true);
    expect(plan.mechanism).toEqual({
      kind: "must-pin-rsa-oaep",
      reason: "tpm2-pkcs11-has-no-aes-gcm",
    });
    expect(plan.mayCommitSeal).toBe(false);
  });

  test("Lucent Shamir is no-oracle, not a hostPath overlay", () => {
    const decision = integrateAtSetup({ requested: "lucent-shamir" }, METAL);
    expect(sealOracleFromUnsealPath("lucent-shamir")).toBe("none");
    const plan = planSetupOverlayFromIntegrate(decision, "/opt/vendor/yubihsm_pkcs11.so", true);
    expect(plan.ok).toBe(false);
    if (!plan.ok) expect(plan.reason).toBe("no-oracle");
    expect(plan.mayCommitSeal).toBe(false);
  });

  test("refused PKCS#11 request is no-oracle even with companion contents", () => {
    const decision = integrateAtSetup({ requested: "pkcs11-yubihsm" }, METAL);
    expect(decision.ok).toBe(false);
    const plan = planSetupOverlayFromIntegrate(decision, "/opt/vendor/yubihsm_pkcs11.so", true);
    expect(plan.ok).toBe(false);
    if (!plan.ok) expect(plan.reason).toBe("no-oracle");
  });

  test("SoftHSM install path is not this overlay", () => {
    const decision = pickInstallPath({
      softhsmInstalled: true,
      swtpmInstalled: false,
      lucentFetcherPresent: false,
      kindUnsealerPresent: false,
    });
    expect(sealOracleFromUnsealPath("ci-softhsm")).toBe("softhsm2");
    const plan = planSetupOverlayFromIntegrate(decision, "/usr/lib/softhsm/libsofthsm2.so", true);
    expect(plan.ok).toBe(false);
    if (!plan.ok) expect(plan.reason).toBe("softhsm-is-not-a-hostpath-overlay");
  });

  test("restore filename through integrate is still not the .so", () => {
    const decision = integrateAtSetup({ requested: "auto" }, capture({ yubiHsm2: "attached" }));
    const plan = planSetupOverlayFromIntegrate(decision, USB_PKCS11_MODULE_POINTER, true);
    expect(plan.ok).toBe(false);
    if (!plan.ok) expect(plan.reason).toBe("companion-pointer-is-not-the-module");
  });
});
