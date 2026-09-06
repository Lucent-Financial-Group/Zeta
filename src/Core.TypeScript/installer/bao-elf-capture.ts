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
 * Conf consume parses those assignments back into a named ask.
 * Role conf plus named bao is one planner call; the role type
 * is unchanged. Pure join + argv parse live in
 * firstboot-bao-elf.ts so zflash/lib.ts and file-backed.ts
 * can write the ESP without installer `fs`. Does not expand
 * `ZetaFirstbootRole`. Does not edit `zeta-first-boot.sh`.
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
import {
  FIRSTBOOT_BAO_LOAD_SITE_KEY,
  FIRSTBOOT_BAO_PATH_KEY,
  namedBaoElfAsk,
  parseNamedBaoElfArgs,
  type NamedBaoElfArgError,
  type NamedBaoElfArgResult,
  type NamedBaoElfAsk,
} from "../zflash/firstboot-bao-elf.ts";

export {
  appendFirstbootBaoElfConf,
  composeFirstbootBaoElfCarrier,
  FIRSTBOOT_BAO_LOAD_SITE_KEY,
  FIRSTBOOT_BAO_PATH_KEY,
  firstbootBaoElfArgvFromAsk,
  NIXOS_HOST_BAO,
  namedBaoElfAsk,
  nixosHostBaoAsk,
  parseNamedBaoElfArgs,
  planFirstbootConfWithNamedBaoElf,
  type FirstbootBaoElfCarrier,
  type FirstbootBaoElfCarrierRefuse,
  type NamedBaoElfArgError,
  type NamedBaoElfArgResult,
  type NamedBaoElfAsk,
} from "../zflash/firstboot-bao-elf.ts";

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

export interface FirstbootBaoElfEnv {
  readonly ZETA_BAO_LOAD_SITE?: string;
  readonly ZETA_BAO_PATH?: string;
}

function unquoteFirstbootConfValue(raw: string): string | null {
  if (raw.startsWith("'")) {
    if (raw.length < 2 || !raw.endsWith("'")) return null;
    const inner = raw.slice(1, -1);
    if (inner.includes("'")) return null;
    return inner;
  }
  if (raw.includes("'") || raw.includes('"') || raw.includes("`")) return null;
  return raw;
}

function envValueOrUnsafe(value: string | undefined): { ok: true; value: string | undefined } | { ok: false } {
  if (value === undefined) return { ok: true, value: undefined };
  if (value.length > 0 && !SHELL_SAFE_CONF_VALUE_REGEX.test(value)) return { ok: false };
  return { ok: true, value };
}

/**
 * Env after a sourced firstboot conf. Values are unquoted.
 * Both keys or neither — same rule as argv. tpmrm0 is
 * shell-safe and still not an ask.
 */
export function parseFirstbootBaoElfEnv(env: FirstbootBaoElfEnv): NamedBaoElfArgResult {
  const siteGot = envValueOrUnsafe(env[FIRSTBOOT_BAO_LOAD_SITE_KEY]);
  const pathGot = envValueOrUnsafe(env[FIRSTBOOT_BAO_PATH_KEY]);
  if (!siteGot.ok || !pathGot.ok) return { ok: false, reason: "unsafe-conf-value" };
  const argv: string[] = [];
  if (siteGot.value !== undefined) argv.push(`--bao-load-site=${siteGot.value}`);
  if (pathGot.value !== undefined) argv.push(`--bao-path=${pathGot.value}`);
  return parseNamedBaoElfArgs(argv);
}

/**
 * Parse ESP / ISO firstboot conf content. HOST / ZETA_ROLE
 * are ignored. One bao key without the other refuses. Does
 * not open files. Does not edit `zeta-first-boot.sh`.
 */
export function parseFirstbootBaoElfConf(conf: string): NamedBaoElfArgResult {
  let site: string | undefined;
  let openedPath: string | undefined;
  for (const rawLine of conf.split("\n")) {
    const line = rawLine.replace(/\r$/u, "").trim();
    if (line.length === 0 || line.startsWith("#")) continue;
    if (line.startsWith(`${FIRSTBOOT_BAO_LOAD_SITE_KEY}=`)) {
      const parsed = unquoteFirstbootConfValue(line.slice(FIRSTBOOT_BAO_LOAD_SITE_KEY.length + 1));
      if (parsed === null) return { ok: false, reason: "unsafe-conf-value" };
      site = parsed;
      continue;
    }
    if (line.startsWith(`${FIRSTBOOT_BAO_PATH_KEY}=`)) {
      const parsed = unquoteFirstbootConfValue(line.slice(FIRSTBOOT_BAO_PATH_KEY.length + 1));
      if (parsed === null) return { ok: false, reason: "unsafe-conf-value" };
      openedPath = parsed;
    }
  }
  return parseFirstbootBaoElfEnv({
    ...(site === undefined ? {} : { [FIRSTBOOT_BAO_LOAD_SITE_KEY]: site }),
    ...(openedPath === undefined ? {} : { [FIRSTBOOT_BAO_PATH_KEY]: openedPath }),
  });
}

/** First-boot conf consume. Overlay still does not open files. */
export function planSetupFromNamedBaoElfConf(
  decision: IntegrateDecision,
  restore: RestoredPkcs11PointerCapture,
  conf: string,
  read: BaoElfRead,
): FirstBootBaoElfFromArgv {
  const parsed = parseFirstbootBaoElfConf(conf);
  if (!parsed.ok) return parsed;
  return { ok: true, plan: planSetupFromNamedBaoElf(decision, restore, parsed.ask, read) };
}
