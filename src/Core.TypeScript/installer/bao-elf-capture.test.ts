/**
 * Falsifiers for the installer bao ELF capture gate.
 *
 * REFUTE:
 *   * Overlay / unseal-path opening the filesystem.
 *   * Opening `/dev/tpmrm0`, a `.so`, or the restore pointer.
 *   * Inferring `on-host` from a glibc interpreter.
 *   * Inferring `on-host` from `/dev/tpmrm0` or a `.so`.
 *   * Spawning `readelf`.
 */
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, test } from "bun:test";
import { ELF_INTERP_GLIBC_X86_64, ELF_INTERP_MUSL_X86_64, TPM_CHAR_DEVICE } from "../cluster/bao-load-site.ts";
import { emptyCapture } from "../cluster/host-seal-profile.ts";
import {
  NIXOS_PKCS11_MODULE_PATH,
  USB_PKCS11_MODULE_POINTER,
  hostBaoSealHcl,
  overlaySealHcl,
  planSetupPkcs11Overlay,
} from "../cluster/pkcs11-hostpath-overlay.ts";
import { integrateAtSetup } from "../cluster/unseal-path.ts";
import {
  NIXOS_HOST_BAO,
  captureBaoElfFromRead,
  namedBaoElfAsk,
  nixosHostBaoAsk,
  nodeBaoElfRead,
  parseNamedBaoElfArgs,
  planSetupFromNamedBaoElf,
  planSetupFromNamedBaoElfArgv,
} from "./bao-elf-capture.ts";

function elf64LeWithInterp(interp: string): Uint8Array {
  const interpBytes = new TextEncoder().encode(`${interp}\0`);
  const phoff = 64;
  const interpOff = phoff + 56;
  const buf = new Uint8Array(interpOff + interpBytes.length);
  const view = new DataView(buf.buffer);
  buf[0] = 0x7f;
  buf[1] = 0x45;
  buf[2] = 0x4c;
  buf[3] = 0x46;
  buf[4] = 2;
  buf[5] = 1;
  buf[6] = 1;
  view.setUint16(16, 3, true);
  view.setUint16(18, 0x3e, true);
  view.setUint32(20, 1, true);
  view.setBigUint64(32, BigInt(phoff), true);
  view.setUint16(52, 64, true);
  view.setUint16(54, 56, true);
  view.setUint16(56, 1, true);
  view.setUint32(phoff, 3, true);
  view.setBigUint64(phoff + 8, BigInt(interpOff), true);
  view.setBigUint64(phoff + 32, BigInt(interpBytes.length), true);
  buf.set(interpBytes, interpOff);
  return buf;
}

describe("captureBaoElfFromRead — installer opens bao, not the overlay", () => {
  test("injected glibc bytes on-host keep site on-host", () => {
    const bytes = elf64LeWithInterp(ELF_INTERP_GLIBC_X86_64);
    const capture = captureBaoElfFromRead(NIXOS_HOST_BAO, "on-host", () => ({
      exists: true,
      bytes,
    }));
    expect(capture.site).toBe("on-host");
    expect(capture.interpreter).toBe(ELF_INTERP_GLIBC_X86_64);
  });

  test("tpmrm0, restore pointer, and .so are not opened", () => {
    let reads = 0;
    const read = (): { exists: boolean; bytes: Uint8Array | null } => {
      reads += 1;
      return { exists: true, bytes: elf64LeWithInterp(ELF_INTERP_GLIBC_X86_64) };
    };
    expect(captureBaoElfFromRead(TPM_CHAR_DEVICE, "on-host", read).interpreter).toBeNull();
    expect(captureBaoElfFromRead(USB_PKCS11_MODULE_POINTER, "in-chart-image", read).interpreter).toBeNull();
    expect(
      captureBaoElfFromRead("/run/current-system/sw/lib/libtpm2_pkcs11.so", "on-host", read).interpreter,
    ).toBeNull();
    expect(reads).toBe(0);
  });

  test("live temp file round-trips musl PT_INTERP without readelf", () => {
    const dir = mkdtempSync(join(tmpdir(), "bao-elf-"));
    const path = join(dir, "bao");
    writeFileSync(path, elf64LeWithInterp(ELF_INTERP_MUSL_X86_64));
    const capture = captureBaoElfFromRead(path, "in-chart-image", nodeBaoElfRead);
    expect(capture.openedPath).toBe(path);
    expect(capture.site).toBe("in-chart-image");
    expect(capture.interpreter).toBe(ELF_INTERP_MUSL_X86_64);
  });

  test("nodeBaoElfRead: ENOENT is unmeasured; a directory is not ENOENT", () => {
    const missing = nodeBaoElfRead(join(tmpdir(), `bao-elf-missing-${Date.now()}`));
    expect(missing).toEqual({ exists: false, bytes: null });
    const dir = mkdtempSync(join(tmpdir(), "bao-elf-dir-"));
    expect(() => nodeBaoElfRead(dir)).toThrow();
  });

  test("on-host glibc bytes may emit host HCL and cannot commit Application.yaml", () => {
    const capture = captureBaoElfFromRead(NIXOS_HOST_BAO, "on-host", () => ({
      exists: true,
      bytes: elf64LeWithInterp(ELF_INTERP_GLIBC_X86_64),
    }));
    const plan = planSetupPkcs11Overlay({
      oracle: "tpm2-pkcs11",
      companionModulePath: null,
      moduleFileExists: true,
      baoElf: capture,
    });
    expect(plan.mayCommitSeal).toBe(false);
    expect(plan.mayCommitHostHcl).toBe(true);
    expect(overlaySealHcl(plan)).toBeNull();
    expect(hostBaoSealHcl(plan)).toBe(
      [
        'seal "pkcs11" {',
        `  lib = "${NIXOS_PKCS11_MODULE_PATH["tpm2-pkcs11"]}"`,
        '  token_label = "zeta-openbao"',
        '  mechanism = "CKM_RSA_PKCS_OAEP"',
        "  # pin: never here. BAO_HSM_PIN env.",
        "}",
      ].join("\n"),
    );
  });
});

describe("planSetupFromNamedBaoElf — first-boot names site and path", () => {
  const missingRestore = {
    openedPath: USB_PKCS11_MODULE_POINTER,
    exists: false,
    contents: null,
    resolvedModuleExists: true,
  };

  function tpmDecision() {
    return integrateAtSetup({ requested: "pkcs11-tpm" }, emptyCapture({ os: "nixos", tpm2: "present" }));
  }

  test("TPM present without a named bao is unmeasured, not on-host", () => {
    let reads = 0;
    const plan = planSetupFromNamedBaoElf(tpmDecision(), missingRestore, null, () => {
      reads += 1;
      return { exists: true, bytes: elf64LeWithInterp(ELF_INTERP_GLIBC_X86_64) };
    });
    expect(plan.loadSite).toBe("in-chart-image");
    expect(plan.mayCommitSeal).toBe(false);
    expect(plan.mayCommitHostHcl).toBe(false);
    expect(overlaySealHcl(plan)).toBeNull();
    expect(hostBaoSealHcl(plan)).toBeNull();
    expect(reads).toBe(0);
  });

  test("tpmrm0 and .so cannot name a bao ask", () => {
    expect(namedBaoElfAsk("on-host", TPM_CHAR_DEVICE)).toBeNull();
    expect(namedBaoElfAsk("on-host", NIXOS_PKCS11_MODULE_PATH["tpm2-pkcs11"])).toBeNull();
    expect(namedBaoElfAsk("in-chart-image", USB_PKCS11_MODULE_POINTER)).toBeNull();
  });

  test("named NixOS host bao with glibc bytes may emit host HCL, not Application.yaml", () => {
    const opened: { path: string | null } = { path: null };
    const plan = planSetupFromNamedBaoElf(tpmDecision(), missingRestore, nixosHostBaoAsk(), (path) => {
      opened.path = path;
      return { exists: true, bytes: elf64LeWithInterp(ELF_INTERP_GLIBC_X86_64) };
    });
    expect(opened.path).toBe(NIXOS_HOST_BAO);
    expect(plan.ok).toBe(true);
    expect(plan.loadSite).toBe("on-host");
    expect(plan.mayCommitSeal).toBe(false);
    expect(plan.mayCommitHostHcl).toBe(true);
    expect(overlaySealHcl(plan)).toBeNull();
    expect(hostBaoSealHcl(plan)).toBe(
      [
        'seal "pkcs11" {',
        `  lib = "${NIXOS_PKCS11_MODULE_PATH["tpm2-pkcs11"]}"`,
        '  token_label = "zeta-openbao"',
        '  mechanism = "CKM_RSA_PKCS_OAEP"',
        "  # pin: never here. BAO_HSM_PIN env.",
        "}",
      ].join("\n"),
    );
  });

  test("passing tpmrm0 as the named path does not open it and cannot commit host HCL", () => {
    let reads = 0;
    const plan = planSetupFromNamedBaoElf(
      tpmDecision(),
      missingRestore,
      { site: "on-host", openedPath: TPM_CHAR_DEVICE },
      () => {
        reads += 1;
        return { exists: true, bytes: elf64LeWithInterp(ELF_INTERP_GLIBC_X86_64) };
      },
    );
    expect(reads).toBe(0);
    expect(plan.loadSite).toBe("in-chart-image");
    expect(plan.mayCommitHostHcl).toBe(false);
    expect(hostBaoSealHcl(plan)).toBeNull();
  });
});

describe("parseNamedBaoElfArgs — live installer names both flags", () => {
  const missingRestore = {
    openedPath: USB_PKCS11_MODULE_POINTER,
    exists: false,
    contents: null,
    resolvedModuleExists: true,
  };

  function tpmDecision() {
    return integrateAtSetup({ requested: "pkcs11-tpm" }, emptyCapture({ os: "nixos", tpm2: "present" }));
  }

  test("no flags is unmeasured; a bare tpmrm0 argv is not on-host", () => {
    expect(parseNamedBaoElfArgs([])).toEqual({ ok: true, ask: null });
    expect(parseNamedBaoElfArgs([TPM_CHAR_DEVICE, "--tpm"])).toEqual({ ok: true, ask: null });
  });

  test("one flag without the other refuses — does not fill the NixOS host path", () => {
    expect(parseNamedBaoElfArgs(["--bao-load-site=on-host"])).toEqual({ ok: false, reason: "site-without-path" });
    expect(parseNamedBaoElfArgs(["--bao-path", NIXOS_HOST_BAO])).toEqual({ ok: false, reason: "path-without-site" });
    expect(parseNamedBaoElfArgs(["--bao-load-site="])).toEqual({ ok: false, reason: "site-without-path" });
  });

  test("unknown site is not on-host; tpmrm0 as path is not an ask", () => {
    expect(parseNamedBaoElfArgs(["--bao-load-site=tpmrm0", "--bao-path", NIXOS_HOST_BAO])).toEqual({
      ok: false,
      reason: "unknown-site",
    });
    expect(parseNamedBaoElfArgs(["--bao-load-site=on-host", `--bao-path=${TPM_CHAR_DEVICE}`])).toEqual({
      ok: true,
      ask: null,
    });
  });

  test("both flags name option D; argv still cannot commit Application.yaml", () => {
    const parsed = parseNamedBaoElfArgs(["--bao-load-site", "on-host", "--bao-path", NIXOS_HOST_BAO]);
    expect(parsed).toEqual({ ok: true, ask: { site: "on-host", openedPath: NIXOS_HOST_BAO } });
    const fromArgv = planSetupFromNamedBaoElfArgv(
      tpmDecision(),
      missingRestore,
      ["--bao-load-site=on-host", `--bao-path=${NIXOS_HOST_BAO}`],
      (path) => ({
        exists: true,
        bytes: path === NIXOS_HOST_BAO ? elf64LeWithInterp(ELF_INTERP_GLIBC_X86_64) : null,
      }),
    );
    expect(fromArgv.ok).toBe(true);
    if (!fromArgv.ok) return;
    expect(fromArgv.plan.mayCommitSeal).toBe(false);
    expect(fromArgv.plan.mayCommitHostHcl).toBe(true);
    expect(overlaySealHcl(fromArgv.plan)).toBeNull();
    const empty = planSetupFromNamedBaoElfArgv(tpmDecision(), missingRestore, [], () => ({
      exists: true,
      bytes: elf64LeWithInterp(ELF_INTERP_GLIBC_X86_64),
    }));
    expect(empty.ok).toBe(true);
    if (!empty.ok) return;
    expect(empty.plan.mayCommitHostHcl).toBe(false);
    expect(hostBaoSealHcl(empty.plan)).toBeNull();
  });
});
