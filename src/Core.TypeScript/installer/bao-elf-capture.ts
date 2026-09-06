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
 * Env join is the argv/conf sibling: sourced process env
 * into `planSetupFromNamedBaoElf`. Epoch is named — ISO
 * current-system bao is not option D. Role conf plus named bao
 * is one planner call; the role type is unchanged. Pure join
 * + argv parse + conf/env consume live in firstboot-bao-elf.ts
 * so zflash can consume sourced names without installer `fs`.
 * Does not expand `ZetaFirstbootRole`. Does not edit
 * `zeta-first-boot.sh`. Does not open the installer ISO's
 * `/run/current-system/sw/bin/bao` as metal option D.
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
import {
  consumeFirstbootBaoElfProcessEnv,
  namedBaoElfAsk,
  namedBaoElfAskAtEpoch,
  parseFirstbootBaoElfConf,
  parseNamedBaoElfArgs,
  type BaoElfEpoch,
  type NamedBaoElfArgError,
  type NamedBaoElfAsk,
} from "../zflash/firstboot-bao-elf.ts";

export {
  appendFirstbootBaoElfConf,
  composeFirstbootBaoElfCarrier,
  consumeFirstbootBaoElfEnvWithEpoch,
  consumeFirstbootBaoElfProcessEnv,
  FIRSTBOOT_BAO_ELF_EPOCH_KEY,
  FIRSTBOOT_BAO_LOAD_SITE_KEY,
  FIRSTBOOT_BAO_PATH_KEY,
  firstbootBaoElfArgvFromAsk,
  NIXOS_HOST_BAO,
  namedBaoElfAsk,
  namedBaoElfAskAtEpoch,
  nixosHostBaoAsk,
  parseBaoElfEpoch,
  parseFirstbootBaoElfConf,
  parseFirstbootBaoElfEnv,
  parseNamedBaoElfArgs,
  planFirstbootConfWithNamedBaoElf,
  type BaoElfEpoch,
  type FirstbootBaoElfCarrier,
  type FirstbootBaoElfCarrierRefuse,
  type FirstbootBaoElfEnv,
  type FirstbootBaoElfEnvConsume,
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

/**
 * First-boot env consume after bash export. Overlay still
 * does not open files. Epoch is named: `installer-iso` does
 * not open `NIXOS_HOST_BAO` (that string is the live ISO's
 * bao). `installed-host` may. Injected `read` is required.
 * A refused env is not filled with `NIXOS_HOST_BAO` or a
 * `/mnt/...` path. tpmrm0 is still not an ask. `/mnt`
 * existing does not pick the epoch.
 */
export function planSetupFromNamedBaoElfEnv(
  decision: IntegrateDecision,
  restore: RestoredPkcs11PointerCapture,
  env: { readonly [key: string]: string | undefined },
  epoch: BaoElfEpoch,
  read: BaoElfRead,
): FirstBootBaoElfFromArgv {
  const parsed = consumeFirstbootBaoElfProcessEnv(env);
  if (!parsed.ok) return parsed;
  const ask =
    parsed.ask === null ? null : namedBaoElfAskAtEpoch(parsed.ask.site, parsed.ask.openedPath, epoch);
  return { ok: true, plan: planSetupFromNamedBaoElf(decision, restore, ask, read) };
}
