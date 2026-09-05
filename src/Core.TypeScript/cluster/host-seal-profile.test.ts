/**
 * Falsifiers for host-seal-profile: NixOS-measured hardware picks the
 * oracle; developer FIDO/biometric vs prod automatic rotation.
 *
 * REFUTE:
 *   * SoftHSM / swtpm inferred from a NixOS metal capture.
 *   * Prod rotation via FIDO or biometric.
 *   * A PKCS#11 driver on disk selecting a metal oracle.
 *   * Unprobed / check-did-not-run collapsed into drift.
 *   * Darwin os-release parsed as NixOS.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "bun:test";
import {
  assessHardware,
  classifyHostSeal,
  emptyCapture,
  osFamilyFromOsRelease,
  pickSealOracleFromCapture,
  type HostHardwareCapture,
} from "./host-seal-profile.ts";

const nixosMetal = (overrides: Partial<HostHardwareCapture> = {}): HostHardwareCapture =>
  emptyCapture({ os: "nixos", ...overrides });

describe("os-release — NixOS detection is ID=, not a k8s label", () => {
  test("ID=nixos is nixos, quoted or not", () => {
    expect(osFamilyFromOsRelease("NAME=NixOS\nID=nixos\nVERSION_ID=25.11\n")).toBe("nixos");
    expect(osFamilyFromOsRelease('ID="nixos"\n')).toBe("nixos");
  });

  test("any other ID is linux-other; empty is unknown", () => {
    expect(osFamilyFromOsRelease("ID=ubuntu\n")).toBe("linux-other");
    expect(osFamilyFromOsRelease("")).toBe("unknown");
    expect(osFamilyFromOsRelease("NAME=NixOS\n")).toBe("unknown");
  });
});

describe("metal oracle follows attached hardware, never an emulator", () => {
  test("YubiHSM attached wins over TPM", () => {
    expect(pickSealOracleFromCapture(nixosMetal({ yubiHsm2: "attached", tpm2: "present" }))).toBe("yubihsm2");
  });

  test("smartcard HSM wins over TPM when no YubiHSM", () => {
    expect(pickSealOracleFromCapture(nixosMetal({ smartcardHsm: true, tpm2: "present" }))).toBe("smartcard-hsm");
  });

  test("TPM present is tpm2-pkcs11, not swtpm", () => {
    expect(pickSealOracleFromCapture(nixosMetal({ tpm2: "present" }))).toBe("tpm2-pkcs11");
  });

  test("a driver on disk with no device is none, not yubihsm2", () => {
    expect(pickSealOracleFromCapture(nixosMetal({ pkcs11ModuleOnDisk: true, yubiHsm2: "absent" }))).toBe("none");
  });

  test("YubiKey FIDO is not a seal oracle", () => {
    expect(pickSealOracleFromCapture(nixosMetal({ yubikeyFido: true }))).toBe("none");
  });
});

describe("prod-metal — rotation is automatic; FIDO and biometric are refused", () => {
  test("NixOS + YubiHSM → automatic-hsm", () => {
    const p = classifyHostSeal("prod-metal", nixosMetal({ yubiHsm2: "attached", tpm2: "present" }));
    expect(p.nixosDetected).toBe(true);
    expect(p.oracle).toBe("yubihsm2");
    expect(p.rotation).toEqual({ ok: true, gate: "automatic-hsm" });
    expect(p.assess).toBe("agree");
  });

  test("NixOS + TPM only → automatic-tpm", () => {
    const p = classifyHostSeal("prod-metal", nixosMetal({ tpm2: "present", yubiHsm2: "absent" }));
    expect(p.rotation).toEqual({ ok: true, gate: "automatic-tpm" });
  });

  test("prod + only FIDO refuses FIDO rotation", () => {
    const p = classifyHostSeal("prod-metal", nixosMetal({ yubikeyFido: true, yubiHsm2: "absent", tpm2: "absent" }));
    expect(p.rotation).toEqual({ ok: false, reason: "prod-refuses-fido-rotation" });
    expect(p.assess).toBe("drift");
  });

  test("prod + only biometric refuses biometric rotation", () => {
    const p = classifyHostSeal(
      "prod-metal",
      nixosMetal({ biometricEnrolled: true, yubiHsm2: "absent", tpm2: "absent" }),
    );
    expect(p.rotation).toEqual({ ok: false, reason: "prod-refuses-biometric-rotation" });
  });

  test("prod with nothing attached and nothing looked is unprobed, not drift", () => {
    expect(assessHardware("prod-metal", nixosMetal())).toBe("unprobed");
    const p = classifyHostSeal("prod-metal", nixosMetal());
    expect(p.assess).toBe("unprobed");
    expect(p.rotation).toEqual({ ok: false, reason: "prod-no-automatic-oracle" });
  });

  test("prod TPM unavailable (check did not run) is not drift", () => {
    expect(assessHardware("prod-metal", nixosMetal({ tpm2: "unavailable", yubiHsm2: "indeterminate" }))).toBe(
      "check-did-not-run",
    );
  });

  test("a driver without a device is refused, not honoured as HSM", () => {
    const p = classifyHostSeal(
      "prod-metal",
      nixosMetal({ pkcs11ModuleOnDisk: true, yubiHsm2: "absent", tpm2: "absent" }),
    );
    expect(p.rotation).toEqual({ ok: false, reason: "driver-is-not-a-device" });
  });
});

describe("developer — FIDO and biometric are supported; HSM still wins if attached", () => {
  test("developer + FIDO → developer-fido", () => {
    const p = classifyHostSeal("developer", emptyCapture({ os: "darwin", yubikeyFido: true }));
    expect(p.rotation).toEqual({ ok: true, gate: "developer-fido" });
    expect(p.assess).toBe("no-claim");
    expect(p.oracle).toBe("none");
  });

  test("developer + biometric → developer-biometric", () => {
    const p = classifyHostSeal("developer", emptyCapture({ os: "darwin", biometricEnrolled: true }));
    expect(p.rotation).toEqual({ ok: true, gate: "developer-biometric" });
  });

  test("developer with a YubiHSM still rotates automatically — FIDO is not preferred over HSM", () => {
    const p = classifyHostSeal(
      "developer",
      emptyCapture({
        os: "darwin",
        yubiHsm2: "attached",
        yubikeyFido: true,
        biometricEnrolled: true,
      }),
    );
    expect(p.oracle).toBe("yubihsm2");
    expect(p.rotation).toEqual({ ok: true, gate: "automatic-hsm" });
  });
});

describe("ci-emulator is declared, never inferred from /dev/tpmrm0", () => {
  test("default CI oracle is SoftHSM2 even if a TPM node exists on the runner", () => {
    const p = classifyHostSeal("ci-emulator", nixosMetal({ tpm2: "present" }));
    expect(p.oracle).toBe("softhsm2");
    expect(p.rotation).toEqual({ ok: true, gate: "ci-emulator" });
    expect(p.assess).toBe("no-claim");
  });

  test("swtpm is an explicit CI declaration, not a metal TPM", () => {
    const p = classifyHostSeal("ci-emulator", nixosMetal({ tpm2: "present" }), "swtpm");
    expect(p.oracle).toBe("swtpm");
    expect(p.rotation).toEqual({ ok: true, gate: "ci-emulator" });
  });

  test("an attached YubiHSM on the runner is still the declared SoftHSM2 oracle", () => {
    const p = classifyHostSeal("ci-emulator", nixosMetal({ yubiHsm2: "attached" }));
    expect(p.oracle).toBe("softhsm2");
    expect(p.rotation).toEqual({ ok: true, gate: "ci-emulator" });
  });
});

describe("a k8s label is not an OS family", () => {
  test("darwin capture is not nixosDetected", () => {
    const p = classifyHostSeal("developer", emptyCapture({ os: "darwin", yubikeyFido: true }));
    expect(p.nixosDetected).toBe(false);
    expect(p.os).toBe("darwin");
  });
});

describe("NixOS host-seal files (CI-executed twin — flake check is not in CI)", () => {
  const repoRoot = join(import.meta.dir, "../../..");
  const read = (rel: string) => readFileSync(join(repoRoot, rel), "utf8");

  test("Nix boxRoles are undeclared/developer/prod-metal — CI is TypeScript-only", () => {
    const model = read("full-ai-cluster/nixos/modules/host-seal-model.nix");
    expect(model).toContain('"undeclared"');
    expect(model).toContain('"developer"');
    expect(model).toContain('"prod-metal"');
    expect(model).toContain("unknown boxRole");
    expect(model).not.toMatch(/boxRoles = \[[^\]]*ci-emulator/s);
  });

  test("default host-seal import is a no-op and does not enable PAM u2f", () => {
    const profile = read("full-ai-cluster/nixos/modules/host-seal-profile.nix");
    const common = read("full-ai-cluster/nixos/modules/common.nix");
    const flake = read("full-ai-cluster/flake.nix");
    expect(profile).toContain('default = "undeclared"');
    expect(profile).toContain("lib.optionalString plan.enableYubiHsmUdev");
    expect(profile).not.toMatch(/security\.pam\.u2f\.enable\s*=/);
    expect(profile).not.toMatch(/services\.pcscd\.enable\s*=\s*mkIf/);
    expect(common).toContain("./host-seal-profile.nix");
    expect(flake).toContain("host-seal-profile-model");
  });
});
