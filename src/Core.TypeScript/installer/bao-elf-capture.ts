#!/usr/bin/env bun
/**
 * src/Core.TypeScript/installer/bao-elf-capture.ts
 *
 * First-boot / installer gate for a candidate `bao` ELF.
 * Overlay and unseal-path consume a capture; they do not open
 * files. This module may read. It does not spawn `readelf`.
 *
 * Site is named by the caller — `--bao-load-site` plus `--bao-path`.
 * `/dev/tpmrm0`, a `.so`, and the restore pointer are not opened.
 * A glibc tarball on disk is not the chart image unless the caller
 * names `in-chart-image`. A bare tpmrm0 argv is not `on-host`.
 * First-boot conf/argv carrier emits both names or neither.
 * Does not expand `ZetaFirstbootRole`. Does not edit
 * `zeta-first-boot.sh`.
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
import { SHELL_SAFE_CONF_VALUE_REGEX } from "../zflash/firstboot-role.ts";

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

export type NamedBaoElfArgError =
  "site-without-path" | "path-without-site" | "unknown-site" | "empty-site" | "empty-path";

export type NamedBaoElfArgResult =
  | { readonly ok: true; readonly ask: NamedBaoElfAsk | null }
  | { readonly ok: false; readonly reason: NamedBaoElfArgError };

function isBaoLoadSite(value: string): value is BaoLoadSite {
  return value === "on-host" || value === "in-chart-image";
}

function takeFlagValue(
  argv: readonly string[],
  i: number,
  prefix: string,
): { value: string | undefined; next: number } {
  const arg = argv[i]!;
  if (arg === prefix) {
    const next = argv[i + 1];
    if (next === undefined || next.startsWith("--")) return { value: "", next: i };
    return { value: next, next: i + 1 };
  }
  if (arg.startsWith(`${prefix}=`)) return { value: arg.slice(prefix.length + 1), next: i };
  return { value: undefined, next: i };
}

/**
 * Live-installer invoke: `--bao-load-site` and `--bao-path` together.
 * Neither flag is unmeasured, not `on-host`. One without the other
 * refuses — do not fill `NIXOS_HOST_BAO`, do not infer site from a
 * path or from `/dev/tpmrm0`. Other argv is ignored.
 */
export function parseNamedBaoElfArgs(argv: readonly string[]): NamedBaoElfArgResult {
  let site: string | undefined;
  let openedPath: string | undefined;
  for (let i = 0; i < argv.length; i++) {
    const siteFlag = takeFlagValue(argv, i, "--bao-load-site");
    if (siteFlag.value !== undefined) {
      site = siteFlag.value;
      i = siteFlag.next;
      continue;
    }
    const pathFlag = takeFlagValue(argv, i, "--bao-path");
    if (pathFlag.value !== undefined) {
      openedPath = pathFlag.value;
      i = pathFlag.next;
    }
  }
  const hasSite = site !== undefined;
  const hasPath = openedPath !== undefined;
  if (!hasSite && !hasPath) return { ok: true, ask: null };
  if (hasSite && !hasPath) return { ok: false, reason: "site-without-path" };
  if (!hasSite && hasPath) return { ok: false, reason: "path-without-site" };
  const namedSite = site;
  const namedPath = openedPath;
  if (namedSite === undefined || namedPath === undefined) return { ok: true, ask: null };
  if (namedSite.length === 0) return { ok: false, reason: "empty-site" };
  if (namedPath.length === 0) return { ok: false, reason: "empty-path" };
  if (!isBaoLoadSite(namedSite)) return { ok: false, reason: "unknown-site" };
  return { ok: true, ask: namedBaoElfAsk(namedSite, namedPath) };
}

export type FirstBootBaoElfFromArgv =
  { readonly ok: true; readonly plan: OverlayPlan } | { readonly ok: false; readonly reason: NamedBaoElfArgError };

/** First-boot calls this. Overlay still does not open files. */
export function planSetupFromNamedBaoElfArgv(
  decision: IntegrateDecision,
  restore: RestoredPkcs11PointerCapture,
  argv: readonly string[],
  read: BaoElfRead,
): FirstBootBaoElfFromArgv {
  const parsed = parseNamedBaoElfArgs(argv);
  if (!parsed.ok) return parsed;
  return { ok: true, plan: planSetupFromNamedBaoElf(decision, restore, parsed.ask, read) };
}

/**
 * ESP / firstboot conf keys for a named bao. Both lines or
 * neither — the same all-or-none rule as cluster-segment
 * addressing. `/dev/tpmrm0` is shell-safe, so the bao-path
 * filter runs before the allowlist. Does not expand
 * `ZetaFirstbootRole`. Does not edit `zeta-first-boot.sh`.
 */
export const FIRSTBOOT_BAO_LOAD_SITE_KEY = "ZETA_BAO_LOAD_SITE";
export const FIRSTBOOT_BAO_PATH_KEY = "ZETA_BAO_PATH";

export type FirstbootBaoElfCarrierRefuse = "unmeasured" | "not-bao-path" | "unsafe-conf-value";

export type FirstbootBaoElfCarrier =
  | {
      readonly ok: true;
      readonly confLines: readonly [string, string];
      readonly argv: readonly [string, string];
    }
  | { readonly ok: false; readonly reason: FirstbootBaoElfCarrierRefuse };

function shellQuoteConfValue(value: string): string {
  return `'${value}'`;
}

/**
 * Turn a named bao ask into both conf lines and both argv
 * tokens, or neither. Null ask is unmeasured. tpmrm0 / `.so`
 * / restore pointer are not a bao path even when they match
 * the bash allowlist. A path with `;` `$` or whitespace
 * refuses both names.
 */
export function composeFirstbootBaoElfCarrier(
  named: NamedBaoElfAsk | null,
  restorePointer: string = USB_PKCS11_MODULE_POINTER,
): FirstbootBaoElfCarrier {
  if (named === null) return { ok: false, reason: "unmeasured" };
  const ask = namedBaoElfAsk(named.site, named.openedPath, restorePointer);
  if (ask === null) return { ok: false, reason: "not-bao-path" };
  if (!SHELL_SAFE_CONF_VALUE_REGEX.test(ask.site) || !SHELL_SAFE_CONF_VALUE_REGEX.test(ask.openedPath)) {
    return { ok: false, reason: "unsafe-conf-value" };
  }
  return {
    ok: true,
    confLines: [
      `${FIRSTBOOT_BAO_LOAD_SITE_KEY}=${shellQuoteConfValue(ask.site)}`,
      `${FIRSTBOOT_BAO_PATH_KEY}=${shellQuoteConfValue(ask.openedPath)}`,
    ],
    argv: [`--bao-load-site=${ask.site}`, `--bao-path=${ask.openedPath}`],
  };
}

/** Argv form for a later `zeta-first-boot.sh` / bun invoke. Empty when neither name may travel. */
export function firstbootBaoElfArgvFromAsk(
  named: NamedBaoElfAsk | null,
  restorePointer: string = USB_PKCS11_MODULE_POINTER,
): readonly string[] {
  const carrier = composeFirstbootBaoElfCarrier(named, restorePointer);
  if (!carrier.ok) return [];
  return carrier.argv;
}

/**
 * Append both bao names to an existing firstboot conf, or
 * leave the conf unchanged. Never one line. Does not rewrite
 * HOST / ZETA_ROLE.
 */
export function appendFirstbootBaoElfConf(
  conf: string,
  named: NamedBaoElfAsk | null,
  restorePointer: string = USB_PKCS11_MODULE_POINTER,
): string {
  const carrier = composeFirstbootBaoElfCarrier(named, restorePointer);
  if (!carrier.ok) return conf;
  const prefix = conf.length === 0 || conf.endsWith("\n") ? conf : `${conf}\n`;
  return `${prefix}${carrier.confLines[0]}\n${carrier.confLines[1]}\n`;
}
