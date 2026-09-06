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
 *   * Non-ELF / truncated bytes treated as a glibc proof.
 */
import { describe, expect, test } from "bun:test";
import {
  ELF_INTERP_GLIBC_AARCH64,
  ELF_INTERP_GLIBC_X86_64,
  ELF_INTERP_GLIBC_X86_64_LIB,
  ELF_INTERP_MUSL_AARCH64,
  ELF_INTERP_MUSL_X86_64,
  TPM_CHAR_DEVICE,
  baoElfCaptureFromBytes,
  baoElfOpenedPathIsBinary,
  classifyElfInterpreter,
  hostBaoAbiFromCapture,
  imageAbiFromBaoElf,
  ptInterpFromElfBytes,
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

/** Minimal ELF64 LE with one PT_INTERP. Not a real bao. */
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

describe("ptInterpFromElfBytes — injected bytes, not readelf", () => {
  test("ELF64 LE musl and glibc interpreters round-trip", () => {
    expect(ptInterpFromElfBytes(elf64LeWithInterp(ELF_INTERP_MUSL_X86_64))).toBe(ELF_INTERP_MUSL_X86_64);
    expect(ptInterpFromElfBytes(elf64LeWithInterp(ELF_INTERP_GLIBC_X86_64))).toBe(ELF_INTERP_GLIBC_X86_64);
  });

  test("non-ELF, truncated, and empty are unmeasured", () => {
    expect(ptInterpFromElfBytes(new Uint8Array())).toBeNull();
    expect(ptInterpFromElfBytes(new Uint8Array([0x7f, 0x45, 0x4c, 0x46]))).toBeNull();
    expect(ptInterpFromElfBytes(new Uint8Array(64))).toBeNull();
  });

  test("32-bit ELF is unmeasured, not a glibc proof", () => {
    const bytes = elf64LeWithInterp(ELF_INTERP_GLIBC_X86_64);
    bytes[4] = 1;
    expect(ptInterpFromElfBytes(bytes)).toBeNull();
  });

  test("missing file is interpreter null; glibc bytes on-host stay on-host", () => {
    expect(
      baoElfCaptureFromBytes({
        site: "on-host",
        openedPath: "/run/current-system/sw/bin/bao",
        exists: false,
        bytes: null,
      }),
    ).toEqual({
      site: "on-host",
      openedPath: "/run/current-system/sw/bin/bao",
      interpreter: null,
    });
    const capture = baoElfCaptureFromBytes({
      site: "on-host",
      openedPath: "/run/current-system/sw/bin/bao",
      exists: true,
      bytes: elf64LeWithInterp(ELF_INTERP_GLIBC_X86_64),
    });
    expect(capture.interpreter).toBe(ELF_INTERP_GLIBC_X86_64);
    expect(hostBaoAbiFromCapture(capture)).toBe("glibc");
    expect(imageAbiFromBaoElf(capture, "alpine-musl")).toBe("alpine-musl");
  });
});
