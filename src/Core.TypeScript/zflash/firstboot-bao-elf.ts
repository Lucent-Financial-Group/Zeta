/**
 * src/Core.TypeScript/zflash/firstboot-bao-elf.ts
 *
 * Pure first-boot bao carrier + role-conf join. No filesystem.
 * `lib.ts` writes the joined conf onto the ESP. Installer
 * capture / overlay still live in bao-elf-capture.ts (that
 * module may read). Does not expand `ZetaFirstbootRole`.
 * Does not edit `zeta-first-boot.sh`.
 *
 * Cite: firstboot-role.ts, bao-load-site.ts,
 * docs/research/2026-08-21-hands-off-metal-*.md §1.4.
 */

import { baoElfOpenedPathIsBinary, type BaoLoadSite } from "../cluster/bao-load-site.ts";
import { USB_PKCS11_MODULE_POINTER } from "../cluster/pkcs11-hostpath-overlay.ts";
import {
  planFirstbootConfFileContent,
  SHELL_SAFE_CONF_VALUE_REGEX,
  type FirstbootConfFileContentResult,
  type ZetaFirstbootRole,
} from "./firstboot-role.ts";

/**
 * Named NixOS host `bao` path (option D). First-boot may pass
 * this. Existence of this path, of a `.so`, or of `/dev/tpmrm0`
 * does not pick the site.
 */
export const NIXOS_HOST_BAO = "/run/current-system/sw/bin/bao";

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

/**
 * Join a role conf with the bao carrier. Null / tpmrm0 / `.so`
 * leave the role conf byte-identical. Option D appends both
 * names. A refused role is unchanged — bao cannot paper over
 * it. Does not add bao fields to `ZetaFirstbootConfig`. Does
 * not edit `zeta-first-boot.sh`. `lib.ts` may import this
 * module; it must not import installer `fs`.
 */
export function planFirstbootConfWithNamedBaoElf(
  role: ZetaFirstbootRole,
  named: NamedBaoElfAsk | null,
  restorePointer: string = USB_PKCS11_MODULE_POINTER,
): FirstbootConfFileContentResult {
  const planned = planFirstbootConfFileContent(role);
  if (!planned.ok) return planned;
  return {
    ok: true,
    value: appendFirstbootBaoElfConf(planned.value, named, restorePointer),
    config: planned.config,
  };
}
