#!/usr/bin/env bun
/**
 * src/Core.TypeScript/cluster/pkcs11-hostpath-overlay.ts
 *
 * Metal `seal "pkcs11"` needs a module in the OpenBao image **or** a
 * hostPath overlay **in the same commit**. This module PLANS the
 * overlay. It does not edit Application.yaml, does not load a
 * PKCS#11 module, and does not run bao.
 *
 * Why the stanza still stays out of the committed chart: today's
 * `quay.io/openbao/openbao-hsm` is Alpine/musl and ships no module.
 * NixOS PKCS#11 libraries are glibc. hostPath of a glibc `.so` into
 * that image is option A in
 * docs/research/2026-08-21-hands-off-metal-*.md §1.4 — unproven.
 * That ABI mismatch is **not** `moduleInImage`. Option D host
 * `bao` is a named load site, not a chart seal. ABI is measured
 * from a captured ELF interpreter when one is supplied; the
 * current-chart helper still defaults to alpine-musl.
 *
 * USB `--bake-cred` restores a path *string* at
 * `/etc/zeta/seal/pkcs11-module-path`. That pointer file is not the
 * module. SoftHSM / swtpm are the CI job, not this overlay.
 * Dual-vendor per node is ZetaFS k-of-n, not two OpenBao seals.
 *
 * Cite: bao-load-site.ts, seal-emulator-rung.ts, usb-hsm-companion.ts,
 * host-seal-profile.ts, unseal-path.ts,
 * openbao.org/docs/configuration/seal/pkcs11/.
 */

import {
  baoElfOpenedPathIsBinary,
  classifyElfInterpreter,
  imageAbiFromBaoElf,
  type BaoElfCapture,
  type BaoLoadSite,
} from "./bao-load-site.ts";
import {
  hclHasPkcs11Seal,
  pickOpenbaoMechanism,
  refuseCommittedPkcs11SealWithoutModule,
  type MechanismPick,
  type SealOracle,
} from "./seal-emulator-rung.ts";

export type { BaoElfCapture, BaoLoadSite } from "./bao-load-site.ts";

/** Chart image today. Measured: Alpine musl, no PKCS#11 module in the image. */
export const OPENBAO_HSM_IMAGE_ABI = "alpine-musl" as const;

/** NixOS host libraries (opensc, tpm2-pkcs11, yubihsm_pkcs11) are glibc. */
export const NIXOS_HOST_ABI = "glibc" as const;

export const BAO_HSM_PIN_ENV = "BAO_HSM_PIN";

/**
 * USB companion restore path. Contents are the module path string.
 * This file is not a PKCS#11 module.
 */
export const USB_PKCS11_MODULE_POINTER = "/etc/zeta/seal/pkcs11-module-path";

/** Path contracts on NixOS. A path is not a device and not "installed". */
export const NIXOS_PKCS11_MODULE_PATH = {
  "tpm2-pkcs11": "/run/current-system/sw/lib/libtpm2_pkcs11.so",
  yubihsm2: "/run/current-system/sw/lib/pkcs11/yubihsm_pkcs11.so",
  "smartcard-hsm": "/run/current-system/sw/lib/pkcs11/opensc-pkcs11.so",
} as const;

export type LibcAbi = "alpine-musl" | "glibc";

export type OverlayAbi = "same-libc" | "glibc-host-into-musl-image" | "musl-host-into-glibc-image" | "unknown";

export type OverlayRefuseReason =
  | "no-oracle"
  | "softhsm-is-not-a-hostpath-overlay"
  | "swtpm-is-not-a-hostpath-overlay"
  | "companion-pointer-is-not-the-module"
  | "module-path-missing"
  | "module-file-absent"
  | "pin-in-values-refuse"
  | "two-openbao-seals"
  | "glibc-host-into-musl-image"
  | "abi-mismatch"
  | "bao-elf-unmeasured"
  | "elf-capture-is-not-bao";

export interface Pkcs11HostPathVolume {
  readonly name: string;
  readonly hostPath: string;
  readonly mountPath: string;
  readonly type: "File" | "Directory" | "CharDevice" | "Socket";
}

export interface Pkcs11HostPathInput {
  readonly oracle: SealOracle;
  /** Resolved module path (companion *contents* or NixOS contract). */
  readonly modulePath: string | null;
  readonly moduleFileExists: boolean;
  readonly imageAbi: LibcAbi;
  readonly hostAbi: LibcAbi;
  /** Named load site. Default is the chart image, not option D. */
  readonly loadSite?: BaoLoadSite;
  /** PT_INTERP of host `bao`. Required when loadSite is `on-host`. */
  readonly baoElfInterpreter?: string | null;
  /** PIN bytes. Any non-null value is refused — PIN is BAO_HSM_PIN env. */
  readonly pinValue?: string | null;
  /** A second seal oracle on the same node. Dual-vendor is ZetaFS k-of-n. */
  readonly secondOracle?: SealOracle | null;
  readonly envPointerName?: string;
}

export type OverlayPlan =
  | {
      readonly ok: true;
      readonly oracle: SealOracle;
      readonly mechanism: MechanismPick;
      readonly modulePath: string;
      readonly volumes: readonly Pkcs11HostPathVolume[];
      readonly envPointerName: string;
      readonly abi: "same-libc";
      readonly loadSite: "in-chart-image";
      readonly mayCommitSeal: true;
      readonly mayCommitHostHcl: false;
    }
  | {
      readonly ok: true;
      readonly oracle: SealOracle;
      readonly mechanism: MechanismPick;
      readonly modulePath: string;
      readonly volumes: readonly Pkcs11HostPathVolume[];
      readonly envPointerName: string;
      readonly abi: "same-libc";
      readonly loadSite: "on-host";
      readonly mayCommitSeal: false;
      readonly mayCommitHostHcl: true;
    }
  | {
      readonly ok: false;
      readonly reason: OverlayRefuseReason;
      readonly oracle: SealOracle;
      readonly mechanism: MechanismPick;
      readonly modulePath: string | null;
      readonly volumes: readonly Pkcs11HostPathVolume[];
      readonly envPointerName: string;
      readonly abi: OverlayAbi;
      readonly loadSite: BaoLoadSite;
      readonly mayCommitSeal: false;
      readonly mayCommitHostHcl: false;
    };

function classifyAbi(imageAbi: LibcAbi, hostAbi: LibcAbi): OverlayAbi {
  if (imageAbi === hostAbi) return "same-libc";
  if (hostAbi === "glibc" && imageAbi === "alpine-musl") return "glibc-host-into-musl-image";
  if (hostAbi === "alpine-musl" && imageAbi === "glibc") return "musl-host-into-glibc-image";
  return "unknown";
}

export function defaultNixosModulePath(oracle: SealOracle): string | null {
  if (oracle === "tpm2-pkcs11") return NIXOS_PKCS11_MODULE_PATH["tpm2-pkcs11"];
  if (oracle === "yubihsm2") return NIXOS_PKCS11_MODULE_PATH.yubihsm2;
  if (oracle === "smartcard-hsm") return NIXOS_PKCS11_MODULE_PATH["smartcard-hsm"];
  return null;
}

/**
 * Companion pointer file wins only as a *source of the path string*.
 * Passing the pointer path itself as modulePath is a refuse.
 */
export function resolveOverlayModulePath(oracle: SealOracle, companionModulePath: string | null): string | null {
  if (companionModulePath !== null && companionModulePath.length > 0) return companionModulePath;
  return defaultNixosModulePath(oracle);
}

function volumesFor(oracle: SealOracle, modulePath: string): readonly Pkcs11HostPathVolume[] {
  const moduleVol: Pkcs11HostPathVolume = {
    name: "pkcs11-module",
    hostPath: modulePath,
    mountPath: modulePath,
    type: "File",
  };
  const nixStore: Pkcs11HostPathVolume = {
    name: "nix-store",
    hostPath: "/nix/store",
    mountPath: "/nix/store",
    type: "Directory",
  };
  const needsNixStore = modulePath.startsWith("/nix/store/") || modulePath.startsWith("/run/current-system/");
  const usb: Pkcs11HostPathVolume = {
    name: "usb-bus",
    hostPath: "/dev/bus/usb",
    mountPath: "/dev/bus/usb",
    type: "Directory",
  };
  const pcscd: Pkcs11HostPathVolume = {
    name: "pcscd",
    hostPath: "/var/run/pcscd",
    mountPath: "/var/run/pcscd",
    type: "Directory",
  };
  const tpmrm: Pkcs11HostPathVolume = {
    name: "tpmrm",
    hostPath: "/dev/tpmrm0",
    mountPath: "/dev/tpmrm0",
    type: "CharDevice",
  };
  const connector: Pkcs11HostPathVolume = {
    name: "yubihsm-connector",
    hostPath: "/var/run/yubihsm-connector",
    mountPath: "/var/run/yubihsm-connector",
    type: "Socket",
  };

  const vols: Pkcs11HostPathVolume[] = [moduleVol];
  if (needsNixStore) vols.push(nixStore);
  if (oracle === "yubihsm2") vols.push(usb, connector);
  if (oracle === "smartcard-hsm") vols.push(usb, pcscd);
  if (oracle === "tpm2-pkcs11") vols.push(tpmrm);
  return vols;
}

function loadSiteOf(input: Pkcs11HostPathInput): BaoLoadSite {
  return input.loadSite ?? "in-chart-image";
}

function refuse(
  input: Pkcs11HostPathInput,
  reason: OverlayRefuseReason,
  modulePath: string | null,
  volumes: readonly Pkcs11HostPathVolume[],
): OverlayPlan {
  return {
    ok: false,
    reason,
    oracle: input.oracle,
    mechanism: pickOpenbaoMechanism(input.oracle),
    modulePath,
    volumes,
    envPointerName: input.envPointerName ?? BAO_HSM_PIN_ENV,
    abi: classifyAbi(input.imageAbi, input.hostAbi),
    loadSite: loadSiteOf(input),
    mayCommitSeal: false,
    mayCommitHostHcl: false,
  };
}

export function planPkcs11HostPathOverlay(input: Pkcs11HostPathInput): OverlayPlan {
  const envPointerName = input.envPointerName ?? BAO_HSM_PIN_ENV;
  const mechanism = pickOpenbaoMechanism(input.oracle);
  const second = input.secondOracle ?? null;

  if (input.oracle === "none") {
    return refuse(input, "no-oracle", input.modulePath, []);
  }
  if (input.oracle === "softhsm2") {
    return refuse(input, "softhsm-is-not-a-hostpath-overlay", input.modulePath, []);
  }
  if (input.oracle === "swtpm") {
    return refuse(input, "swtpm-is-not-a-hostpath-overlay", input.modulePath, []);
  }
  if (second !== null && second !== "none" && second !== input.oracle) {
    return refuse(input, "two-openbao-seals", input.modulePath, []);
  }
  if (input.pinValue !== null && input.pinValue !== undefined && input.pinValue.length > 0) {
    return refuse(input, "pin-in-values-refuse", input.modulePath, []);
  }

  const modulePath = input.modulePath;
  if (modulePath === null || modulePath.length === 0) {
    return refuse(input, "module-path-missing", null, []);
  }
  if (modulePath === USB_PKCS11_MODULE_POINTER) {
    return refuse(input, "companion-pointer-is-not-the-module", modulePath, []);
  }
  if (!input.moduleFileExists) {
    return refuse(input, "module-file-absent", modulePath, volumesFor(input.oracle, modulePath));
  }

  const site = loadSiteOf(input);
  if (site === "on-host") {
    const hostBaoAbi = classifyHostBaoAbi(input.baoElfInterpreter);
    if (hostBaoAbi === "unknown") {
      return refuse(input, "bao-elf-unmeasured", modulePath, []);
    }
    if (hostBaoAbi !== input.hostAbi) {
      return refuse(input, "abi-mismatch", modulePath, []);
    }
    return {
      ok: true,
      oracle: input.oracle,
      mechanism,
      modulePath,
      volumes: [],
      envPointerName,
      abi: "same-libc",
      loadSite: "on-host",
      mayCommitSeal: false,
      mayCommitHostHcl: true,
    };
  }

  const abi = classifyAbi(input.imageAbi, input.hostAbi);
  const volumes = volumesFor(input.oracle, modulePath);
  if (abi !== "same-libc") {
    const reason: OverlayRefuseReason =
      abi === "glibc-host-into-musl-image" ? "glibc-host-into-musl-image" : "abi-mismatch";
    return {
      ok: false,
      reason,
      oracle: input.oracle,
      mechanism,
      modulePath,
      volumes,
      envPointerName,
      abi,
      loadSite: "in-chart-image",
      mayCommitSeal: false,
      mayCommitHostHcl: false,
    };
  }

  return {
    ok: true,
    oracle: input.oracle,
    mechanism,
    modulePath,
    volumes,
    envPointerName,
    abi: "same-libc",
    loadSite: "in-chart-image",
    mayCommitSeal: true,
    mayCommitHostHcl: false,
  };
}

function classifyHostBaoAbi(interpreter: string | null | undefined): "glibc" | "alpine-musl" | "unknown" {
  if (interpreter === undefined) return "unknown";
  return classifyElfInterpreter(interpreter);
}

/**
 * Current chart + NixOS host. Overlay volumes can be planned; the
 * committed Application may not gain `seal "pkcs11"`.
 */
export function currentChartOverlayInput(
  oracle: SealOracle,
  modulePath: string | null,
  moduleFileExists: boolean,
): Pkcs11HostPathInput {
  return {
    oracle,
    modulePath,
    moduleFileExists,
    imageAbi: OPENBAO_HSM_IMAGE_ABI,
    hostAbi: NIXOS_HOST_ABI,
  };
}

export interface SetupPkcs11OverlayInput {
  /** Attached-device oracle. `none` is a missing device, not a missing .so. */
  readonly oracle: SealOracle;
  /** Contents of `/etc/zeta/seal/pkcs11-module-path`, never that filename. */
  readonly companionModulePath: string | null;
  readonly moduleFileExists: boolean;
  /** Injected PT_INTERP of a candidate `bao`. Null keeps the chart constant. */
  readonly baoElf?: BaoElfCapture | null;
}

function companionContents(raw: string | null): string | null {
  if (raw === null) return null;
  const trimmed = raw.trim();
  return trimmed.length === 0 ? null : trimmed;
}

/**
 * Setup-time join: USB companion *contents* win; NixOS contract is
 * the fallback; current chart ABI still cannot commit the stanza
 * unless a capture names a same-libc in-chart `bao`. Option D
 * host `bao` may produce host HCL and still cannot edit
 * Application.yaml.
 */
export function planSetupPkcs11Overlay(input: SetupPkcs11OverlayInput): OverlayPlan {
  const companion = companionContents(input.companionModulePath);
  const modulePath = resolveOverlayModulePath(input.oracle, companion);
  const capture = input.baoElf ?? null;
  const chartInput = currentChartOverlayInput(input.oracle, modulePath, input.moduleFileExists);
  if (capture !== null && !baoElfOpenedPathIsBinary(capture.openedPath, USB_PKCS11_MODULE_POINTER)) {
    return refuse({ ...chartInput, loadSite: capture.site }, "elf-capture-is-not-bao", modulePath, []);
  }
  const imageAbi = imageAbiFromBaoElf(capture, OPENBAO_HSM_IMAGE_ABI);
  const loadSite = capture?.site ?? "in-chart-image";
  const baoElfInterpreter = loadSite === "on-host" ? (capture?.interpreter ?? null) : null;
  return planPkcs11HostPathOverlay({
    oracle: input.oracle,
    modulePath,
    moduleFileExists: input.moduleFileExists,
    imageAbi,
    hostAbi: NIXOS_HOST_ABI,
    loadSite,
    baoElfInterpreter,
  });
}

function sealHclBody(plan: OverlayPlan): string | null {
  if (plan.modulePath === null) return null;
  const lines = ['seal "pkcs11" {', `  lib = "${plan.modulePath}"`, '  token_label = "zeta-openbao"'];
  if (plan.mechanism.kind === "must-pin-rsa-oaep") {
    lines.push('  mechanism = "CKM_RSA_PKCS_OAEP"');
  }
  if (plan.mechanism.kind === "preferred-aes-gcm") {
    lines.push('  mechanism = "CKM_AES_GCM"');
  }
  lines.push("  # pin: never here. BAO_HSM_PIN env.");
  lines.push("}");
  return lines.join("\n");
}

export function overlaySealHcl(plan: OverlayPlan): string | null {
  if (!plan.ok || !plan.mayCommitSeal) return null;
  return sealHclBody(plan);
}

/** Option D host `bao` HCL. Not a chart seal. Not Application.yaml. */
export function hostBaoSealHcl(plan: OverlayPlan): string | null {
  if (!plan.ok || !plan.mayCommitHostHcl) return null;
  return sealHclBody(plan);
}

/**
 * Helm valuesObject fragment: volumes + mounts + env *name*.
 * Never includes a PIN value. Never includes the seal stanza
 * (that is overlaySealHcl, and only when mayCommitSeal).
 */
export function overlayValuesObject(plan: OverlayPlan): {
  readonly extraVolumes: readonly {
    readonly name: string;
    readonly hostPath: { readonly path: string; readonly type: string };
  }[];
  readonly extraVolumeMounts: readonly { readonly name: string; readonly mountPath: string }[];
  readonly extraEnvironmentVars: Readonly<Record<string, never>>;
  readonly envPointerName: string;
} {
  return {
    extraVolumes: plan.volumes.map((v) => ({
      name: v.name,
      hostPath: { path: v.hostPath, type: v.type },
    })),
    extraVolumeMounts: plan.volumes.map((v) => ({
      name: v.name,
      mountPath: v.mountPath,
    })),
    extraEnvironmentVars: {},
    envPointerName: plan.envPointerName,
  };
}

export function overlayCountsAsModuleInImage(plan: OverlayPlan): boolean {
  return plan.ok && plan.mayCommitSeal;
}

export function refuseSealWithoutReachableModule(
  hcl: string,
  plan: OverlayPlan,
): ReturnType<typeof refuseCommittedPkcs11SealWithoutModule> {
  return refuseCommittedPkcs11SealWithoutModule(hcl, overlayCountsAsModuleInImage(plan));
}

export function applicationMayGainPkcs11Seal(applicationYaml: string, plan: OverlayPlan): boolean {
  if (hclHasPkcs11Seal(applicationYaml) && !overlayCountsAsModuleInImage(plan)) return false;
  return overlayCountsAsModuleInImage(plan);
}
