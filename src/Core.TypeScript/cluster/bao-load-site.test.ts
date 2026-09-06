/**
 * Falsifiers for the bao load-site / ELF interpreter classifier.
 *
 * REFUTE:
 *   * `/lib/ld-musl-x86_64.so.1` classified as glibc.
 *   * `/lib64/ld-linux-x86-64.so.2` classified as musl.
 *   * Empty / unknown interpreter treated as a glibc proof.
 *   * A glibc CI tarball on disk flipping the chart ABI without
 *     a capture that names `in-chart-image`.
 *   * Opening a `.so`, the restore pointer, or `/dev/tpmrm0`
 *     as the bao ELF.
 *   * Inferring `on-host` from `/dev/tpmrm0`.
 */
import { describe, expect, test } from "bun:test";
import {
  ELF_INTERP_GLIBC_AARCH64,
  ELF_INTERP_GLIBC_X86_64,
  ELF_INTERP_GLIBC_X86_64_LIB,
  ELF_INTERP_MUSL_AARCH64,
  ELF_INTERP_MUSL_X86_64,
  TPM_CHAR_DEVICE,
  baoElfOpenedPathIsBinary,
  classifyElfInterpreter,
  hostBaoAbiFromCapture,
  imageAbiFromBaoElf,
  type BaoElfCapture,
} from "./bao-load-site.ts";
import { USB_PKCS11_MODULE_POINTER } from "./pkcs11-hostpath-overlay.ts";

describe("classifyElfInterpreter — PT_INTERP is the measurement", () => {
  test("musl x86_64 and aarch64 are alpine-musl", () => {
    expect(classifyElfInterpreter(ELF_INTERP_MUSL_X86_64)).toBe("alpine-musl");
    expect(classifyElfInterpreter(ELF_INTERP_MUSL_AARCH64)).toBe("alpine-musl");
  });

  test("glibc ld-linux paths are glibc, including NixOS store", () => {
    expect(classifyElfInterpreter(ELF_INTERP_GLIBC_X86_64)).toBe("glibc");
    expect(classifyElfInterpreter(ELF_INTERP_GLIBC_X86_64_LIB)).toBe("glibc");
    expect(classifyElfInterpreter(ELF_INTERP_GLIBC_AARCH64)).toBe("glibc");
    expect(classifyElfInterpreter("/nix/store/hash-glibc-2.40/lib/ld-linux-x86-64.so.2")).toBe("glibc");
  });

  test("empty, null, and other interpreters are unknown — not a glibc proof", () => {
    expect(classifyElfInterpreter(null)).toBe("unknown");
    expect(classifyElfInterpreter("")).toBe("unknown");
    expect(classifyElfInterpreter("   ")).toBe("unknown");
    expect(classifyElfInterpreter("/lib/ld-uClibc.so.0")).toBe("unknown");
  });
});

describe("imageAbiFromBaoElf — a disk tarball is not the chart", () => {
  test("null capture keeps the alpine-musl fallback", () => {
    expect(imageAbiFromBaoElf(null, "alpine-musl")).toBe("alpine-musl");
  });

  test("on-host glibc capture does not flip the chart ABI", () => {
    const capture: BaoElfCapture = {
      site: "on-host",
      interpreter: ELF_INTERP_GLIBC_X86_64,
      openedPath: "/run/current-system/sw/bin/bao",
    };
    expect(imageAbiFromBaoElf(capture, "alpine-musl")).toBe("alpine-musl");
    expect(hostBaoAbiFromCapture(capture)).toBe("glibc");
  });

  test("in-chart-image glibc capture is the measurement", () => {
    const capture: BaoElfCapture = {
      site: "in-chart-image",
      interpreter: ELF_INTERP_GLIBC_X86_64,
      openedPath: "/bin/bao",
    };
    expect(imageAbiFromBaoElf(capture, "alpine-musl")).toBe("glibc");
    expect(hostBaoAbiFromCapture(capture)).toBe("unknown");
  });

  test("in-chart-image with unknown interpreter keeps the fallback", () => {
    const capture: BaoElfCapture = {
      site: "in-chart-image",
      interpreter: null,
      openedPath: "/bin/bao",
    };
    expect(imageAbiFromBaoElf(capture, "alpine-musl")).toBe("alpine-musl");
  });
});

describe("baoElfOpenedPathIsBinary — module / pointer / TPM are not bao", () => {
  test("host bao and chart bao paths count", () => {
    expect(baoElfOpenedPathIsBinary("/run/current-system/sw/bin/bao", USB_PKCS11_MODULE_POINTER)).toBe(true);
    expect(baoElfOpenedPathIsBinary("/bin/bao", USB_PKCS11_MODULE_POINTER)).toBe(true);
  });

  test("restore pointer, .so, and tpmrm0 do not count", () => {
    expect(baoElfOpenedPathIsBinary(USB_PKCS11_MODULE_POINTER, USB_PKCS11_MODULE_POINTER)).toBe(false);
    expect(baoElfOpenedPathIsBinary("/run/current-system/sw/lib/libtpm2_pkcs11.so", USB_PKCS11_MODULE_POINTER)).toBe(
      false,
    );
    expect(baoElfOpenedPathIsBinary("/nix/store/hash-glibc/lib/ld-linux-x86-64.so.2", USB_PKCS11_MODULE_POINTER)).toBe(
      false,
    );
    expect(baoElfOpenedPathIsBinary(TPM_CHAR_DEVICE, USB_PKCS11_MODULE_POINTER)).toBe(false);
  });
});
