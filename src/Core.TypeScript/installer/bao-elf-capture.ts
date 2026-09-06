#!/usr/bin/env bun
/**
 * src/Core.TypeScript/installer/bao-elf-capture.ts
 *
 * First-boot / installer gate for a candidate `bao` ELF.
 * Overlay and unseal-path consume a capture; they do not open
 * files. This module may read. It does not spawn `readelf`.
 *
 * Site is named by the caller. `/dev/tpmrm0`, a `.so`, and the
 * restore pointer are not opened. A glibc tarball on disk is
 * not the chart image unless the caller names `in-chart-image`.
 *
 * Cite: bao-load-site.ts, pkcs11-hostpath-overlay.ts,
 * docs/research/2026-08-21-hands-off-metal-*.md §1.4.
 */

import { readFileSync } from "node:fs";
import {
  baoElfCaptureFromBytes,
  baoElfOpenedPathIsBinary,
  type BaoElfCapture,
  type BaoLoadSite,
} from "../cluster/bao-load-site.ts";
import { USB_PKCS11_MODULE_POINTER, type OverlayPlan } from "../cluster/pkcs11-hostpath-overlay.ts";
import {
  planSetupFromRestoredCompanion,
  type IntegrateDecision,
  type RestoredPkcs11PointerCapture,
} from "../cluster/unseal-path.ts";

/**
 * Named NixOS host `bao` path (option D). First-boot may pass
 * this. Existence of this path, of a `.so`, or of `/dev/tpmrm0`
 * does not pick the site.
 */
export const NIXOS_HOST_BAO = "/run/current-system/sw/bin/bao";

export interface BaoElfFileRead {
  readonly exists: boolean;
  readonly bytes: Uint8Array | null;
}

export type BaoElfRead = (path: string) => BaoElfFileRead;

/** Live host read. Tests inject a fake. Never used by the overlay. */
export function nodeBaoElfRead(path: string): BaoElfFileRead {
  // One syscall, one answer, no check-then-use window (CWE-367): read and
  // interpret ENOENT as "does not exist" rather than probing first.
  try {
    return { exists: true, bytes: readFileSync(path) };
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === "ENOENT") {
      return { exists: false, bytes: null };
    }
    throw e;
  }
}

/**
 * Build a BaoElfCapture. Non-bao paths are not opened. Missing
 * files are unmeasured. Site stays named.
 */
export function captureBaoElfFromRead(
  openedPath: string,
  site: BaoLoadSite,
  read: BaoElfRead,
  restorePointer: string = USB_PKCS11_MODULE_POINTER,
): BaoElfCapture {
  if (!baoElfOpenedPathIsBinary(openedPath, restorePointer)) {
    return { site, openedPath, interpreter: null };
  }
  const got = read(openedPath);
  return baoElfCaptureFromBytes({
    site,
    openedPath,
    exists: got.exists,
    bytes: got.bytes,
  });
}

/**
 * First-boot names site and path together. Non-bao paths
 * (`/dev/tpmrm0`, `.so`, restore pointer) are not an ask.
 */
export interface NamedBaoElfAsk {
  readonly site: BaoLoadSite;
  readonly openedPath: string;
}

export function namedBaoElfAsk(
  site: BaoLoadSite,
  openedPath: string,
  restorePointer: string = USB_PKCS11_MODULE_POINTER,
): NamedBaoElfAsk | null {
  if (!baoElfOpenedPathIsBinary(openedPath, restorePointer)) return null;
  return { site, openedPath };
}

/** Option D contract path. Caller still names the site by invoking this. */
export function nixosHostBaoAsk(): NamedBaoElfAsk {
  return { site: "on-host", openedPath: NIXOS_HOST_BAO };
}

/**
 * First-boot join: named site + named bao path + injected read
 * into the restore-companion overlay. Null ask is unmeasured,
 * not `on-host`. Overlay still does not open files. Does not
 * edit Application.yaml.
 */
export function planSetupFromNamedBaoElf(
  decision: IntegrateDecision,
  restore: RestoredPkcs11PointerCapture,
  named: NamedBaoElfAsk | null,
  read: BaoElfRead,
): OverlayPlan {
  const ask = named === null ? null : namedBaoElfAsk(named.site, named.openedPath);
  const baoElf = ask === null ? null : captureBaoElfFromRead(ask.openedPath, ask.site, read);
  return planSetupFromRestoredCompanion(decision, restore, baoElf);
}
