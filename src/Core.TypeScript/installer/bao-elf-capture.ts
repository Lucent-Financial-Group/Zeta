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

import { existsSync, readFileSync } from "node:fs";
import {
  baoElfCaptureFromBytes,
  baoElfOpenedPathIsBinary,
  type BaoElfCapture,
  type BaoLoadSite,
} from "../cluster/bao-load-site.ts";
import { USB_PKCS11_MODULE_POINTER } from "../cluster/pkcs11-hostpath-overlay.ts";

export interface BaoElfFileRead {
  readonly exists: boolean;
  readonly bytes: Uint8Array | null;
}

export type BaoElfRead = (path: string) => BaoElfFileRead;

/** Live host read. Tests inject a fake. Never used by the overlay. */
export function nodeBaoElfRead(path: string): BaoElfFileRead {
  if (!existsSync(path)) return { exists: false, bytes: null };
  return { exists: true, bytes: readFileSync(path) };
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
