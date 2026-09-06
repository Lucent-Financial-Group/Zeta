#!/usr/bin/env bun
/**
 * src/Core.TypeScript/cluster/bao-load-site.ts
 *
 * Metal `seal "pkcs11"` waits on a reachable module in the same
 * commit: a same-libc chart image, or option D host `bao`
 * (docs/research/2026-08-21-hands-off-metal-*.md §1.4). This
 * module CLASSIFIES the load site and the captured ELF
 * interpreter. It parses `PT_INTERP` from injected bytes. It
 * does not spawn `readelf`, does not open a filesystem, and
 * does not edit Application.yaml.
 *
 * Today's `quay.io/openbao/openbao-hsm` is Alpine/musl
 * (`/lib/ld-musl-x86_64.so.1`). The off-cluster CI job uses the
 * glibc tarball (`/lib64/ld-linux-x86-64.so.2`). A glibc tarball
 * sitting on disk is not the chart image. Site is named in the
 * capture; it is not inferred from `/dev/tpmrm0` or from a
 * `.so` existing.
 *
 * Option D is not a recommendation and is not landed. Host `bao`
 * HCL is not a chart seal.
 *
 * Cite: pkcs11-hostpath-overlay.ts, seal-emulator-bao.ts,
 * unseal-path.ts, openbao.org/docs/configuration/seal/pkcs11/.
 */

/** Chart image today. Alpine musl PT_INTERP. */
export const ELF_INTERP_MUSL_X86_64 = "/lib/ld-musl-x86_64.so.1";
export const ELF_INTERP_MUSL_AARCH64 = "/lib/ld-musl-aarch64.so.1";

/**
 * Upstream `openbao-hsm_*_linux_*.tar.gz` on ubuntu-24.04.
 * seal-emulator-bao.ts measured `/lib64/ld-linux`.
 */
export const ELF_INTERP_GLIBC_X86_64 = "/lib64/ld-linux-x86-64.so.2";
export const ELF_INTERP_GLIBC_X86_64_LIB = "/lib/ld-linux-x86-64.so.2";
export const ELF_INTERP_GLIBC_AARCH64 = "/lib/ld-linux-aarch64.so.1";

/** TPM char device. Not a bao binary. Not a reason to pick on-host. */
export const TPM_CHAR_DEVICE = "/dev/tpmrm0";

export type BaoLoadSite = "in-chart-image" | "on-host";

export type ElfLibc = "glibc" | "alpine-musl" | "unknown";

/**
 * Injected PT_INTERP of a candidate `bao` binary.
 * `openedPath` is which file was opened, not the module and not
 * the site. No live filesystem here.
 */
export interface BaoElfCapture {
  readonly site: BaoLoadSite;
  readonly interpreter: string | null;
  readonly openedPath: string;
}

/**
 * PT_INTERP → libc. Named contracts first (chart musl, CI glibc
 * tarball, aarch64 peers), then substring for NixOS store paths
 * (`.../ld-linux-x86-64.so.2`). Empty / other is unknown —
 * unknown is not a glibc proof.
 */
export function classifyElfInterpreter(interpreter: string | null): ElfLibc {
  if (interpreter === null) return "unknown";
  const trimmed = interpreter.trim();
  if (trimmed.length === 0) return "unknown";
  if (trimmed === ELF_INTERP_MUSL_X86_64 || trimmed === ELF_INTERP_MUSL_AARCH64 || trimmed.includes("ld-musl")) {
    return "alpine-musl";
  }
  if (
    trimmed === ELF_INTERP_GLIBC_X86_64 ||
    trimmed === ELF_INTERP_GLIBC_X86_64_LIB ||
    trimmed === ELF_INTERP_GLIBC_AARCH64 ||
    trimmed.includes("ld-linux")
  ) {
    return "glibc";
  }
  return "unknown";
}

/**
 * A bao binary path. The restore pointer, a `.so`, and the TPM
 * char device are not this capture. Site is still named
 * separately — this does not pick `on-host`.
 */
export function baoElfOpenedPathIsBinary(openedPath: string, restorePointer: string): boolean {
  const trimmed = openedPath.trim();
  if (trimmed.length === 0) return false;
  if (trimmed === restorePointer) return false;
  if (trimmed === TPM_CHAR_DEVICE) return false;
  if (trimmed.endsWith(".so")) return false;
  if (trimmed.includes(".so.")) return false;
  return true;
}

/**
 * Chart-image ABI. Unmeasured / unknown / on-host capture falls
 * back to the caller constant (today: alpine-musl). A glibc
 * tarball only flips this when the capture names `in-chart-image`.
 */
export function imageAbiFromBaoElf(
  capture: BaoElfCapture | null,
  fallback: "alpine-musl" | "glibc",
): "alpine-musl" | "glibc" {
  if (capture === null || capture.site !== "in-chart-image") return fallback;
  const classified = classifyElfInterpreter(capture.interpreter);
  if (classified === "unknown") return fallback;
  return classified;
}

/** Host-bao ABI. Any other site is not this measurement. */
export function hostBaoAbiFromCapture(capture: BaoElfCapture): ElfLibc {
  if (capture.site !== "on-host") return "unknown";
  return classifyElfInterpreter(capture.interpreter);
}

const ELFCLASS64 = 2;
const ELFDATA2LSB = 1;
const PT_INTERP = 3;
const ELF64_EHDR_SIZE = 64;
const ELF64_PHDR_SIZE = 56;

function u16le(view: DataView, offset: number): number {
  return view.getUint16(offset, true);
}

function u32le(view: DataView, offset: number): number {
  return view.getUint32(offset, true);
}

function u64leAsNumber(view: DataView, offset: number): number | null {
  const n = view.getBigUint64(offset, true);
  if (n > BigInt(Number.MAX_SAFE_INTEGER)) return null;
  return Number(n);
}

/**
 * ELF64 little-endian `PT_INTERP` string, or null. Not a spawn of
 * `readelf`. 32-bit / big-endian / truncated / non-ELF is
 * unmeasured, not a glibc proof. No filesystem.
 */
export function ptInterpFromElfBytes(bytes: Uint8Array): string | null {
  if (bytes.length < ELF64_EHDR_SIZE) return null;
  if (bytes[0] !== 0x7f || bytes[1] !== 0x45 || bytes[2] !== 0x4c || bytes[3] !== 0x46) return null;
  if (bytes[4] !== ELFCLASS64 || bytes[5] !== ELFDATA2LSB) return null;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const phoff = u64leAsNumber(view, 32);
  if (phoff === null) return null;
  const phentsize = u16le(view, 54);
  const phnum = u16le(view, 56);
  if (phentsize !== ELF64_PHDR_SIZE || phnum === 0) return null;
  for (let i = 0; i < phnum; i += 1) {
    const off = phoff + i * ELF64_PHDR_SIZE;
    if (off + ELF64_PHDR_SIZE > bytes.length) return null;
    if (u32le(view, off) !== PT_INTERP) continue;
    const pOffset = u64leAsNumber(view, off + 8);
    const pFilesz = u64leAsNumber(view, off + 32);
    if (pOffset === null || pFilesz === null || pFilesz === 0) return null;
    if (pOffset + pFilesz > bytes.length) return null;
    const slice = bytes.subarray(pOffset, pOffset + pFilesz);
    const nul = slice.indexOf(0);
    const text = slice.subarray(0, nul === -1 ? slice.length : nul);
    const interp = new TextDecoder("utf-8").decode(text).trim();
    return interp.length === 0 ? null : interp;
  }
  return null;
}

export interface BaoElfBytesInput {
  readonly site: BaoLoadSite;
  readonly openedPath: string;
  readonly exists: boolean;
  readonly bytes: Uint8Array | null;
}

/**
 * Bytes → capture. Missing / unreadable / non-ELF is interpreter
 * null (unmeasured). Site stays named. Opening a `.so` still
 * produces a capture so the overlay can refuse the path.
 */
export function baoElfCaptureFromBytes(input: BaoElfBytesInput): BaoElfCapture {
  if (!input.exists || input.bytes === null) {
    return { site: input.site, openedPath: input.openedPath, interpreter: null };
  }
  return {
    site: input.site,
    openedPath: input.openedPath,
    interpreter: ptInterpFromElfBytes(input.bytes),
  };
}
