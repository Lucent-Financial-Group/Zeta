/**
 * Falsifiers for the PKCS#11 hostPath overlay planner.
 *
 * REFUTE:
 *   * glibc NixOS .so into Alpine openbao-hsm counts as module-in-image.
 *   * SoftHSM / swtpm as this metal overlay.
 *   * USB companion pointer file treated as the .so.
 *   * PIN in Helm values.
 *   * Two OpenBao seals (dual-vendor is ZetaFS k-of-n).
 *   * Today's Application.yaml gaining seal "pkcs11".
 *   * TPM overlay omitting CKM_RSA_PKCS_OAEP.
 *   * Setup treating the restore filename as the .so.
 *   * Companion path without an attached device as a seal.
 *   * Option D host bao HCL counting as a chart seal.
 *   * `/dev/tpmrm0` picking on-host.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "bun:test";
import {
  classifyElfInterpreter,
  ELF_INTERP_GLIBC_X86_64,
  ELF_INTERP_MUSL_X86_64,
  TPM_CHAR_DEVICE,
} from "./bao-load-site.ts";
import {
  BAO_HSM_PIN_ENV,
  NIXOS_HOST_ABI,
  NIXOS_PKCS11_MODULE_PATH,
  OPENBAO_HSM_IMAGE_ABI,
  OPENBAO_HSM_IMAGE_INTERP,
  USB_PKCS11_MODULE_POINTER,
  applicationMayGainPkcs11Seal,
  currentChartOverlayInput,
  defaultNixosModulePath,
  overlayCountsAsModuleInImage,
  overlaySealHcl,
  overlayValuesObject,
  planPkcs11HostPathOverlay,
  planSetupPkcs11Overlay,
  refuseSealWithoutReachableModule,
  resolveOverlayModulePath,
  hostBaoSealHcl,
} from "./pkcs11-hostpath-overlay.ts";
import { hclHasPkcs11Seal } from "./seal-emulator-rung.ts";

const APPLICATION = join(import.meta.dir, "../../../full-ai-cluster/k8s/applications/openbao/Application.yaml");

const yubihsmSameLibc = {
  oracle: "yubihsm2" as const,
  modulePath: "/usr/lib/pkcs11/yubihsm_pkcs11.so",
  moduleFileExists: true,
  imageAbi: "glibc" as const,
  hostAbi: "glibc" as const,
};

describe("ABI — glibc host into musl image is not a module in reach", () => {
  test("current chart overlay cannot commit seal (Alpine musl + NixOS glibc)", () => {
    const plan = planPkcs11HostPathOverlay(
      currentChartOverlayInput("yubihsm2", NIXOS_PKCS11_MODULE_PATH.yubihsm2, true),
    );
    expect(plan.ok).toBe(false);
    expect(plan.mayCommitSeal).toBe(false);
    expect(plan.abi).toBe("glibc-host-into-musl-image");
    if (!plan.ok) expect(plan.reason).toBe("glibc-host-into-musl-image");
    expect(overlayCountsAsModuleInImage(plan)).toBe(false);
    expect(overlaySealHcl(plan)).toBeNull();
  });

  test("same-libc glibc image + glibc host may commit seal", () => {
    const plan = planPkcs11HostPathOverlay(yubihsmSameLibc);
    expect(plan.ok).toBe(true);
    expect(plan.mayCommitSeal).toBe(true);
    expect(plan.mayCommitHostHcl).toBe(false);
    expect(plan.loadSite).toBe("in-chart-image");
    expect(plan.abi).toBe("same-libc");
    expect(overlaySealHcl(plan)).toContain('seal "pkcs11"');
    expect(overlaySealHcl(plan)).toContain("CKM_AES_GCM");
    expect(hostBaoSealHcl(plan)).toBeNull();
  });

  test("OPENBAO_HSM_IMAGE_ABI is alpine-musl; NixOS host is glibc", () => {
    expect(OPENBAO_HSM_IMAGE_ABI).toBe("alpine-musl");
    expect(NIXOS_HOST_ABI).toBe("glibc");
    expect(OPENBAO_HSM_IMAGE_INTERP).toBe(ELF_INTERP_MUSL_X86_64);
    expect(classifyElfInterpreter(OPENBAO_HSM_IMAGE_INTERP)).toBe("alpine-musl");
  });
});

describe("oracles — CI emulators are not this overlay; TPM is metal hostPath", () => {
  test("SoftHSM refuses — that is the off-cluster CI job", () => {
    const plan = planPkcs11HostPathOverlay({
      ...yubihsmSameLibc,
      oracle: "softhsm2",
      modulePath: "/usr/lib/softhsm/libsofthsm2.so",
    });
    expect(plan.ok).toBe(false);
    if (!plan.ok) expect(plan.reason).toBe("softhsm-is-not-a-hostpath-overlay");
  });

  test("swtpm refuses — not inferred from /dev/tpmrm0", () => {
    const plan = planPkcs11HostPathOverlay({
      ...yubihsmSameLibc,
      oracle: "swtpm",
      modulePath: NIXOS_PKCS11_MODULE_PATH["tpm2-pkcs11"],
    });
    expect(plan.ok).toBe(false);
    if (!plan.ok) expect(plan.reason).toBe("swtpm-is-not-a-hostpath-overlay");
  });

  test("none is no-oracle", () => {
    const plan = planPkcs11HostPathOverlay({ ...yubihsmSameLibc, oracle: "none", modulePath: null });
    expect(plan.ok).toBe(false);
    if (!plan.ok) expect(plan.reason).toBe("no-oracle");
  });
});

describe("volumes and mechanism pin", () => {
  test("YubiHSM mounts module + usb + connector; prefers AES-GCM", () => {
    const plan = planPkcs11HostPathOverlay(yubihsmSameLibc);
    expect(plan.ok).toBe(true);
    const names = plan.volumes.map((v) => v.name);
    expect(names).toContain("pkcs11-module");
    expect(names).toContain("usb-bus");
    expect(names).toContain("yubihsm-connector");
    expect(names).not.toContain("tpmrm");
    expect(plan.mechanism).toEqual({ kind: "preferred-aes-gcm" });
  });

  test("SmartCard-HSM mounts usb + pcscd; mechanism is measure-on-device", () => {
    const plan = planPkcs11HostPathOverlay({
      ...yubihsmSameLibc,
      oracle: "smartcard-hsm",
      modulePath: NIXOS_PKCS11_MODULE_PATH["smartcard-hsm"],
    });
    expect(plan.ok).toBe(true);
    const names = plan.volumes.map((v) => v.name);
    expect(names).toContain("pcscd");
    expect(names).toContain("usb-bus");
    expect(plan.mechanism).toEqual({ kind: "measure-on-device" });
    expect(overlaySealHcl(plan)).not.toContain("CKM_AES_GCM");
    expect(overlaySealHcl(plan)).not.toContain("CKM_RSA_PKCS_OAEP");
  });

  test("TPM mounts /dev/tpmrm0 and must pin OAEP", () => {
    const plan = planPkcs11HostPathOverlay({
      ...yubihsmSameLibc,
      oracle: "tpm2-pkcs11",
      modulePath: NIXOS_PKCS11_MODULE_PATH["tpm2-pkcs11"],
    });
    expect(plan.ok).toBe(true);
    expect(plan.volumes.some((v) => v.hostPath === "/dev/tpmrm0" && v.type === "CharDevice")).toBe(true);
    expect(plan.mechanism).toEqual({
      kind: "must-pin-rsa-oaep",
      reason: "tpm2-pkcs11-has-no-aes-gcm",
    });
    expect(overlaySealHcl(plan)).toContain('mechanism = "CKM_RSA_PKCS_OAEP"');
  });

  test("NixOS /run/current-system path also mounts /nix/store", () => {
    const plan = planPkcs11HostPathOverlay({
      ...yubihsmSameLibc,
      modulePath: NIXOS_PKCS11_MODULE_PATH.yubihsm2,
    });
    expect(plan.volumes.some((v) => v.name === "nix-store" && v.hostPath === "/nix/store")).toBe(true);
  });
});

describe("companion pointer vs module path", () => {
  test("the restore file is not the .so", () => {
    const plan = planPkcs11HostPathOverlay({
      ...yubihsmSameLibc,
      modulePath: USB_PKCS11_MODULE_POINTER,
    });
    expect(plan.ok).toBe(false);
    if (!plan.ok) expect(plan.reason).toBe("companion-pointer-is-not-the-module");
  });

  test("companion contents win over the NixOS contract path", () => {
    expect(resolveOverlayModulePath("yubihsm2", "/opt/vendor/yubihsm_pkcs11.so")).toBe("/opt/vendor/yubihsm_pkcs11.so");
    expect(resolveOverlayModulePath("yubihsm2", null)).toBe(NIXOS_PKCS11_MODULE_PATH.yubihsm2);
    expect(defaultNixosModulePath("softhsm2")).toBeNull();
  });

  test("missing path / missing file refuse", () => {
    expect(planPkcs11HostPathOverlay({ ...yubihsmSameLibc, modulePath: null }).ok).toBe(false);
    const absent = planPkcs11HostPathOverlay({ ...yubihsmSameLibc, moduleFileExists: false });
    expect(absent.ok).toBe(false);
    if (!absent.ok) expect(absent.reason).toBe("module-file-absent");
  });
});

describe("PIN and dual seal", () => {
  test("PIN bytes in the plan are refused", () => {
    const plan = planPkcs11HostPathOverlay({ ...yubihsmSameLibc, pinValue: "1234" });
    expect(plan.ok).toBe(false);
    if (!plan.ok) expect(plan.reason).toBe("pin-in-values-refuse");
    expect(overlayValuesObject(plan).extraEnvironmentVars).toEqual({});
    expect(overlayValuesObject(plan).envPointerName).toBe(BAO_HSM_PIN_ENV);
  });

  test("YubiHSM + CardContact on one node is two seals, refused", () => {
    const plan = planPkcs11HostPathOverlay({ ...yubihsmSameLibc, secondOracle: "smartcard-hsm" });
    expect(plan.ok).toBe(false);
    if (!plan.ok) expect(plan.reason).toBe("two-openbao-seals");
  });
});

describe("committed Application.yaml stays Shamir until same-libc", () => {
  test("today's Application.yaml has no pkcs11 seal", () => {
    const yaml = readFileSync(APPLICATION, "utf8");
    expect(hclHasPkcs11Seal(yaml)).toBe(false);
    const current = planPkcs11HostPathOverlay(
      currentChartOverlayInput("tpm2-pkcs11", NIXOS_PKCS11_MODULE_PATH["tpm2-pkcs11"], true),
    );
    expect(applicationMayGainPkcs11Seal(yaml, current)).toBe(false);
    expect(refuseSealWithoutReachableModule(yaml, current)).toEqual({ ok: true });
  });

  test("a seal stanza plus current-chart overlay is seal-without-module", () => {
    const hcl = ['seal "pkcs11" {', '  lib = "/lib/lib.so"', "}"].join("\n");
    const current = planPkcs11HostPathOverlay(
      currentChartOverlayInput("yubihsm2", NIXOS_PKCS11_MODULE_PATH.yubihsm2, true),
    );
    expect(refuseSealWithoutReachableModule(hcl, current)).toEqual({
      ok: false,
      reason: "seal-without-module",
    });
  });

  test("valuesObject never carries extraEnvironmentVars PIN", () => {
    const plan = planPkcs11HostPathOverlay(yubihsmSameLibc);
    const values = overlayValuesObject(plan);
    expect(JSON.stringify(values)).not.toContain("1234");
    expect(JSON.stringify(values)).not.toContain("BAO_HSM_PIN=");
    expect(values.envPointerName).toBe("BAO_HSM_PIN");
  });
});

describe("setup wires companion contents into the current-chart overlay", () => {
  test("companion contents win on an attached YubiHSM; stanza still cannot commit", () => {
    const plan = planSetupPkcs11Overlay({
      oracle: "yubihsm2",
      companionModulePath: "/opt/vendor/yubihsm_pkcs11.so",
      moduleFileExists: true,
    });
    expect(plan.modulePath).toBe("/opt/vendor/yubihsm_pkcs11.so");
    expect(plan.mayCommitSeal).toBe(false);
    expect(plan.abi).toBe("glibc-host-into-musl-image");
    expect(overlaySealHcl(plan)).toBeNull();
  });

  test("blank companion falls back to the NixOS contract", () => {
    const plan = planSetupPkcs11Overlay({
      oracle: "smartcard-hsm",
      companionModulePath: "  ",
      moduleFileExists: true,
    });
    expect(plan.modulePath).toBe(NIXOS_PKCS11_MODULE_PATH["smartcard-hsm"]);
    expect(plan.mayCommitSeal).toBe(false);
  });

  test("restore filename is not the .so", () => {
    const plan = planSetupPkcs11Overlay({
      oracle: "yubihsm2",
      companionModulePath: USB_PKCS11_MODULE_POINTER,
      moduleFileExists: true,
    });
    expect(plan.ok).toBe(false);
    if (!plan.ok) expect(plan.reason).toBe("companion-pointer-is-not-the-module");
  });

  test("companion without an attached device is no-oracle, not a seal", () => {
    const plan = planSetupPkcs11Overlay({
      oracle: "none",
      companionModulePath: "/opt/vendor/yubihsm_pkcs11.so",
      moduleFileExists: true,
    });
    expect(plan.ok).toBe(false);
    if (!plan.ok) expect(plan.reason).toBe("no-oracle");
    expect(plan.mayCommitSeal).toBe(false);
  });
});

describe("bao ELF capture — measured ABI and option D host load-site", () => {
  const tpmModule = NIXOS_PKCS11_MODULE_PATH["tpm2-pkcs11"];
  const hostBaoHcl = [
    'seal "pkcs11" {',
    `  lib = "${tpmModule}"`,
    '  token_label = "zeta-openbao"',
    '  mechanism = "CKM_RSA_PKCS_OAEP"',
    "  # pin: never here. BAO_HSM_PIN env.",
    "}",
  ].join("\n");

  test("in-chart musl capture keeps current-chart refuse", () => {
    const plan = planSetupPkcs11Overlay({
      oracle: "tpm2-pkcs11",
      companionModulePath: null,
      moduleFileExists: true,
      baoElf: { site: "in-chart-image", interpreter: ELF_INTERP_MUSL_X86_64, openedPath: "/bin/bao" },
    });
    expect(plan.ok).toBe(false);
    if (!plan.ok) expect(plan.reason).toBe("glibc-host-into-musl-image");
    expect(plan.mayCommitSeal).toBe(false);
    expect(plan.mayCommitHostHcl).toBe(false);
    expect(overlaySealHcl(plan)).toBeNull();
    expect(hostBaoSealHcl(plan)).toBeNull();
  });

  test("in-chart glibc capture may commit the chart seal; host HCL stays null", () => {
    const plan = planSetupPkcs11Overlay({
      oracle: "tpm2-pkcs11",
      companionModulePath: null,
      moduleFileExists: true,
      baoElf: { site: "in-chart-image", interpreter: ELF_INTERP_GLIBC_X86_64, openedPath: "/bin/bao" },
    });
    expect(plan.ok).toBe(true);
    expect(plan.loadSite).toBe("in-chart-image");
    expect(plan.mayCommitSeal).toBe(true);
    expect(plan.mayCommitHostHcl).toBe(false);
    expect(overlaySealHcl(plan)).toBe(hostBaoHcl);
    expect(hostBaoSealHcl(plan)).toBeNull();
  });

  test("option D on-host glibc bao may commit host HCL; Application.yaml still cannot", () => {
    const yaml = readFileSync(APPLICATION, "utf8");
    const plan = planSetupPkcs11Overlay({
      oracle: "tpm2-pkcs11",
      companionModulePath: null,
      moduleFileExists: true,
      baoElf: {
        site: "on-host",
        interpreter: ELF_INTERP_GLIBC_X86_64,
        openedPath: "/run/current-system/sw/bin/bao",
      },
    });
    expect(plan.ok).toBe(true);
    expect(plan.loadSite).toBe("on-host");
    expect(plan.mayCommitSeal).toBe(false);
    expect(plan.mayCommitHostHcl).toBe(true);
    expect(plan.volumes).toEqual([]);
    expect(overlaySealHcl(plan)).toBeNull();
    expect(hostBaoSealHcl(plan)).toBe(hostBaoHcl);
    expect(overlayCountsAsModuleInImage(plan)).toBe(false);
    expect(applicationMayGainPkcs11Seal(yaml, plan)).toBe(false);
    expect(overlayValuesObject(plan).extraVolumes).toEqual([]);
  });

  test("on-host without interpreter is unmeasured, not a seal", () => {
    const plan = planSetupPkcs11Overlay({
      oracle: "yubihsm2",
      companionModulePath: null,
      moduleFileExists: true,
      baoElf: { site: "on-host", interpreter: null, openedPath: "/run/current-system/sw/bin/bao" },
    });
    expect(plan.ok).toBe(false);
    if (!plan.ok) expect(plan.reason).toBe("bao-elf-unmeasured");
    expect(plan.mayCommitHostHcl).toBe(false);
    expect(hostBaoSealHcl(plan)).toBeNull();
  });

  test("opening the restore pointer as bao ELF is refused", () => {
    const plan = planSetupPkcs11Overlay({
      oracle: "yubihsm2",
      companionModulePath: null,
      moduleFileExists: true,
      baoElf: { site: "on-host", interpreter: ELF_INTERP_GLIBC_X86_64, openedPath: USB_PKCS11_MODULE_POINTER },
    });
    expect(plan.ok).toBe(false);
    if (!plan.ok) expect(plan.reason).toBe("elf-capture-is-not-bao");
  });

  test("opening a .so or tpmrm0 is not a bao ELF; tpmrm0 does not pick on-host", () => {
    const so = planSetupPkcs11Overlay({
      oracle: "tpm2-pkcs11",
      companionModulePath: null,
      moduleFileExists: true,
      baoElf: {
        site: "on-host",
        interpreter: ELF_INTERP_GLIBC_X86_64,
        openedPath: NIXOS_PKCS11_MODULE_PATH["tpm2-pkcs11"],
      },
    });
    expect(so.ok).toBe(false);
    if (!so.ok) expect(so.reason).toBe("elf-capture-is-not-bao");
    const tpm = planSetupPkcs11Overlay({
      oracle: "tpm2-pkcs11",
      companionModulePath: null,
      moduleFileExists: true,
      baoElf: { site: "in-chart-image", interpreter: ELF_INTERP_GLIBC_X86_64, openedPath: TPM_CHAR_DEVICE },
    });
    expect(tpm.ok).toBe(false);
    if (!tpm.ok) expect(tpm.reason).toBe("elf-capture-is-not-bao");
    expect(tpm.loadSite).toBe("in-chart-image");
  });
});
