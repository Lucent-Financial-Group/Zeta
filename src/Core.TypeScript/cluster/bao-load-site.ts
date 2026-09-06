#!/usr/bin/env bun
/**
 * src/Core.TypeScript/cluster/bao-load-site.ts
 *
 * Metal `seal "pkcs11"` waits on a reachable module in the same
 * commit: a same-libc chart image, or option D host `bao`
 * (docs/research/2026-08-21-hands-off-metal-*.md §1.4). This
 * module CLASSIFIES the load site and the captured ELF
 * interpreter. It does not run `readelf`, does not open a
 * filesystem, and does not edit Application.yaml.
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
 * PT_INTERP → libc. `ld-musl` is musl. `ld-linux` is glibc
 * (including NixOS store paths). Empty / other is unknown —
 * unknown is not a glibc proof.
 */
export function classifyElfInterpreter(interpreter: string | null): ElfLibc {
  if (interpreter === null) return "unknown";
  const trimmed = interpreter.trim();
  if (trimmed.length === 0) return "unknown";
  if (trimmed.includes("ld-musl")) return "alpine-musl";
  if (trimmed.includes("ld-linux")) return "glibc";
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
