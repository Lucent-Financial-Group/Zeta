#!/usr/bin/env bun
/**
 * src/Core.TypeScript/zflash/test-harness/prepare-boot-image.ts
 *
 * 081KSNY2Z0008QG0R0008PN7RQ — produce a zflash-prepared raw boot image for QEMU scenarios 3–4.
 *
 * Wraps src/Core.TypeScript/zflash/file-backed.ts with deterministic test
 * credentials so CI can set ZFLASH_QEMU_*_BOOT_IMAGE without physical USB.
 *
 * Usage:
 *   bun src/Core.TypeScript/zflash/test-harness/prepare-boot-image.ts \
 *     --iso <installer.iso> \
 *     --output <zflash-boot.img> \
 *     [--with-credential-blob] \
 *     [--fresh] \
 *     [--hostname node-qemu-test] \
 *     [--with-wifi-credentials] \
 *     [--role first-control-plane|joiner] \
 *     [--flake-host <attr>] \
 *     [--join-server-url https://host[:port]] \
 *     [--join-token <path to k3s node-token>] \
 *     [--bao-load-site on-host|in-chart-image] \
 *     [--bao-path <named bao binary>] \
 *     [--cluster-segment-mac <aa:bb:cc:dd:ee:ff>] \
 *     [--cluster-host-index <2..254>]
 *
 * Exit 0 prints JSON with outputImagePath (+ credentialBlobPath when baked).
 */

import { spawnSync } from "node:child_process";
import { closeSync, existsSync, mkdtempSync, openSync, readSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  detectIsohybridEspOffset,
  ISOHYBRID_ESP_OFFSET_FALLBACK_BYTES,
  type IsohybridEspOffset,
} from "../lib.ts";
import { runFileBackedZflashCli } from "../file-backed.ts";
import { firstbootRoleFromFlags, type ZetaFirstbootRole } from "../firstboot-role.ts";
import {
  namedBaoElfArgErrorMessage,
  parseNamedBaoElfArgs,
  type NamedBaoElfAsk,
} from "../firstboot-bao-elf.ts";
import { buildBlob, composeBundle } from "../../installer/zeta-creds-persist";

export const DEFAULT_QEMU_USB_UUID = "b0891-qemu-test-usb-00000001";
export const DEFAULT_QEMU_PASSPHRASE = "b0891-qemu-test-passphrase";
export const DEFAULT_QEMU_HOSTNAME = "node-qemu-test";
/** Deterministic QEMU-only gh-cli probe token (never a real PAT). */
export const DEFAULT_QEMU_PROBE_GH_CLI = "test-token-for-qemu-b0891";
/** Env var the installer uses to pass {@link DEFAULT_QEMU_PROBE_GH_CLI} into persist. */
export const QEMU_PROBE_GH_CLI_ENV = "ZETA_QEMU_PROBE_GH_CLI";

/** Deterministic QEMU-only wifi ESP blob (never a real network secret). */
export const DEFAULT_QEMU_WIFI_SSID = "zeta-qemu-homelab";
export const DEFAULT_QEMU_WIFI_PASSWORD = "qemu-wifi-test-psk";

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../../../..");
const TEST_INFRA_PUBKEY = join(REPO_ROOT, "src/Core.TypeScript/zflash/test-harness/keys/zeta-test-infra.pub");

export interface PrepareBootImageWifiCredentials {
  readonly ssid: string;
  readonly password: string;
}

export interface PrepareBootImageInput {
  readonly isoPath: string;
  readonly outputImagePath: string;
  readonly withCredentialBlob: boolean;
  readonly testMode: boolean;
  readonly hostname: string;
  readonly pubkeyPath: string;
  readonly wifiCredentials?: PrepareBootImageWifiCredentials;
  /** 081KSNY2Z0008QG0R0008PN7RQ scenario 5 — role written to the ESP. */
  readonly firstbootRole?: ZetaFirstbootRole;
  /**
   * Named bao site + path for `/zeta-firstboot.conf`. Sibling of
   * `firstbootRole`. Both flags or neither. Null is unmeasured.
   */
  readonly namedBaoElf?: NamedBaoElfAsk | null;
  readonly joinTokenSourcePath?: string;
  /** QEMU-only: bake `/zeta-bind-uefi-keyfile` so the guest writes the target ESP keyfile. */
  readonly bindUefiKeyfileMarker?: boolean;
  /** QEMU-only: bake `/zeta-qemu-creds-passphrase` so non-interactive 6.95-picker can run. */
  readonly qemuCredsPassphrase?: string;
  /** QEMU restore only: bake `/zeta-qemu-bake-test-cred` so picker writes ≥1 cred. */
  readonly qemuBakeTestCredMarker?: boolean;
  /** WP11 QEMU-only: bake `/zeta-qemu-k3s-first-boot-verify` so the installed disk's first boot runs the k3s bring-up verdict unit. */
  readonly qemuK3sFirstBootVerifyMarker?: boolean;
  /**
   * WP27 (081M392JR97087G0R003QAFH0Y): stage
   * `ZETA_ALLOW_LONGHORN_UNDERSIZED='1'` on the ESP for this ONE image.
   *
   * Every QEMU install lane runs on a single virtual disk of 40 or 64 GiB,
   * which is BY DESIGN -- these lanes test install mechanics, not capacity --
   * and the #17611/#17614 pre-wipe Longhorn refusal correctly bails on it. The
   * override travels with the flashed image, never with the ISO.
   */
  readonly allowLonghornUndersized?: boolean;
  /**
   * WP21 (081M35C7NJR087G0R002S4R654): full 40-hex commit sha to bake as
   * `/zeta-repo-pin`, overriding the ISO-baked ZETA_ISO_COMMIT so
   * zeta-install.sh checks out this exact commit after cloning. The QEMU
   * full-install lane sets this to the workflow's own commit so a PR's
   * NixOS-module changes are what actually gets installed.
   */
  readonly repoPinCommit?: string;
}

export interface PrepareBootImageResult {
  readonly outputImagePath: string;
  readonly credentialBlobPath?: string;
  readonly bootImageEnv: "ZFLASH_QEMU_RETENTION_BOOT_IMAGE" | "ZFLASH_QEMU_PATH_FORK_BOOT_IMAGE";
  readonly wifiCredentialsBaked: boolean;
  /** `undefined` means the image carries no role and installs a control plane. */
  readonly firstbootRoleBaked?: ZetaFirstbootRole["kind"];
}

/**
 * How much of the ISO's front the ESP scan is allowed to see.
 *
 * 081M39CJP96087G0R001T4J2R3 (WP29) — this bound used to be
 * `max(512, ISOHYBRID_ESP_OFFSET_FALLBACK_BYTES + 512)` = 141_824, i.e.
 * exactly enough to check the LBA-276 fallback and nothing else. An MBR 0xEF
 * entry pointing anywhere past LBA 276 failed `isoHead.length >= partOffset +
 * 512`, so the scan skipped its own best evidence and silently returned the
 * constant. The measured ISO of run 36044770870 puts its ESP at LBA 268
 * (offset 137_216, 3 MiB, FAT12) — under the old bound by 4_608 bytes. An ESP
 * one megabyte further in would not have been, and nothing would have said so.
 *
 * 8 MiB, read with a bounded `read()` rather than by loading the file.
 */
export const ISO_HEAD_SCAN_BYTES = 8 * 1024 * 1024;

/**
 * Read a bounded head of the ISO.
 *
 * The previous implementation was `readFileSync(isoPath).subarray(0, headSize)`
 * — it pulled the ENTIRE image into memory (1.67 GiB for the measured
 * installer ISO) in order to look at its first 138 KB, and an ISO past
 * `readFileSync`'s ~2 GiB ceiling would have thrown rather than degraded.
 */
export function readIsoHead(isoPath: string, length: number = ISO_HEAD_SCAN_BYTES): Buffer {
  const head = Buffer.alloc(length);
  const fd = openSync(isoPath, "r");
  try {
    const bytesRead = readSync(fd, head, 0, length, 0);
    return head.subarray(0, bytesRead);
  } finally {
    closeSync(fd);
  }
}

/** The ESP offset AND whether anything confirmed it — see {@link IsohybridEspOffset}. */
export function resolveEspOffsetForIso(isoPath: string): IsohybridEspOffset {
  return detectIsohybridEspOffset(readIsoHead(isoPath));
}

export function resolveEspOffsetBytesForIso(isoPath: string): number {
  return resolveEspOffsetForIso(isoPath).offsetBytes;
}

export function checkZflashToolchain(): string | null {
  for (const [bin, installHint, probeArgs] of [
    ["qemu-img", "qemu-utils", ["--version"] as const],
    ["mcopy", "mtools", ["-V"] as const],
    // 081M39CJP96087G0R001T4J2R3 (WP29): the post-bake read-back in
    // file-backed.ts runs `mdir` and `mtype`. `mdir` was already being used
    // without ever being probed for — same package as `mcopy`, so in practice
    // it is there, but "in practice it is there" is how a missing tool becomes
    // a confusing mid-bake failure instead of a named precondition.
    ["mdir", "mtools", ["-V"] as const],
    ["mtype", "mtools", ["-V"] as const],
  ] as const) {
    try {
      const result = spawnSync(bin, [...probeArgs], { encoding: "utf8" });
      if (result.status !== 0) {
        return `${bin} not usable (exit ${String(result.status)}); install via apt/brew (${installHint})`;
      }
    } catch {
      return `${bin} not found in PATH; install via apt/brew (${installHint})`;
    }
  }
  return null;
}

export function writeTestCredentialBlob(outputPath: string): void {
  // `composeBundle` takes only { persona, bakeCredArgs }. This literal also carried
  // usbUuid / output / passphrase, which it never read: the uuid and passphrase are
  // passed separately to `buildBlob` below, and `outputPath` is used by the caller.
  // They were silently ignored until TypeScript's excess-property check (which fires
  // on object LITERALS but not on variables — which is why `composeBundle(parsed)` in
  // cli.ts never flagged) reported them.
  const bundle = composeBundle({
    persona: null,
    bakeCredArgs: [`gh-cli=${DEFAULT_QEMU_PROBE_GH_CLI}`],
  });
  if ("error" in bundle) {
    throw new Error(bundle.error);
  }
  const blob = buildBlob(bundle, DEFAULT_QEMU_USB_UUID, DEFAULT_QEMU_PASSPHRASE);
  writeFileSync(outputPath, blob);
}

export function prepareBootImage(input: PrepareBootImageInput): PrepareBootImageResult | { readonly error: string } {
  // Inputs are judged before the environment is: what was ASKED FOR can be
  // wrong on any machine, so refusing it first makes the refusal reproducible
  // rather than conditional on which binaries happen to be installed. The
  // toolchain probe still runs below, before anything is executed.
  const absIso = resolve(input.isoPath);
  if (!existsSync(absIso)) {
    return { error: `installer ISO not found: ${absIso}` };
  }
  if (!existsSync(input.pubkeyPath)) {
    return { error: `ssh pubkey not found: ${input.pubkeyPath}` };
  }

  // 081M39CJP96087G0R001T4J2R3 (WP29) — REFUSE AN OFFSET NOTHING CONFIRMED.
  //
  // Every ESP write, and the post-bake read-back that judges them, addresses
  // this one number. When it is wrong they are wrong TOGETHER: `mcopy` writes
  // at the bad offset and `mdir` reads its own writes back from the bad offset
  // and reports success. The bake cannot detect its own miss by looking harder
  // at the place it already looked, so the number has to be refused up front
  // or not at all.
  //
  // `fallback-unconfirmed` means no 0xEF partition entry resolved AND no FAT
  // boot sector was found at the fallback — the offset is a constant that
  // nothing about this ISO agrees with.
  const espOffset = resolveEspOffsetForIso(absIso);
  if (espOffset.source === "fallback-unconfirmed") {
    return {
      error:
        `ESP offset could not be confirmed for ${absIso}: no MBR 0xEF partition entry resolved to a ` +
        `FAT boot sector, and there is no FAT boot sector at the LBA-276 fallback ` +
        `(${ISOHYBRID_ESP_OFFSET_FALLBACK_BYTES} bytes) either. Baking would write every injection to ` +
        `an offset nothing verified, and the post-bake read-back reads from that same offset, so it ` +
        `would confirm the writes and the guest would still find nothing. Refusing instead.`,
    };
  }
  const espOffsetBytes = espOffset.offsetBytes;

  const toolchainError = checkZflashToolchain();
  if (toolchainError !== null) {
    return { error: toolchainError };
  }

  let credentialBlobPath: string | undefined;
  if (input.withCredentialBlob) {
    const staging = mkdtempSync(join(tmpdir(), "zeta-zflash-cred-blob-"));
    credentialBlobPath = join(staging, "zeta-creds.enc");
    writeTestCredentialBlob(credentialBlobPath);
  }

  const result = runFileBackedZflashCli({
    isoPath: absIso,
    outputImagePath: resolve(input.outputImagePath),
    espOffsetBytes,
    pubkeyPath: input.pubkeyPath,
    testMode: input.testMode,
    hostname: input.hostname,
    ...(credentialBlobPath === undefined ? {} : { credentialBlobPath }),
    ...(input.wifiCredentials === undefined
      ? {}
      : {
          wifiSsid: input.wifiCredentials.ssid,
          wifiPassword: input.wifiCredentials.password,
        }),
    ...(input.firstbootRole === undefined ? {} : { firstbootRole: input.firstbootRole }),
    ...(input.namedBaoElf === undefined ? {} : { namedBaoElf: input.namedBaoElf }),
    ...(input.joinTokenSourcePath === undefined ? {} : { joinTokenSourcePath: input.joinTokenSourcePath }),
    ...(input.bindUefiKeyfileMarker === true ? { bindUefiKeyfileMarker: true } : {}),
    ...(input.qemuBakeTestCredMarker === true ? { qemuBakeTestCredMarker: true } : {}),
    ...(input.qemuK3sFirstBootVerifyMarker === true ? { qemuK3sFirstBootVerifyMarker: true } : {}),
    ...(input.allowLonghornUndersized === true ? { allowLonghornUndersized: true } : {}),
    ...(input.qemuCredsPassphrase === undefined ? {} : { qemuCredsPassphrase: input.qemuCredsPassphrase }),
    ...(input.repoPinCommit === undefined ? {} : { repoPinCommit: input.repoPinCommit }),
  });

  if (!result.ok) {
    return { error: result.error };
  }

  return {
    outputImagePath: resolve(input.outputImagePath),
    ...(credentialBlobPath === undefined ? {} : { credentialBlobPath }),
    bootImageEnv: input.withCredentialBlob ? "ZFLASH_QEMU_RETENTION_BOOT_IMAGE" : "ZFLASH_QEMU_PATH_FORK_BOOT_IMAGE",
    wifiCredentialsBaked: input.wifiCredentials !== undefined,
    ...(input.firstbootRole === undefined ? {} : { firstbootRoleBaked: input.firstbootRole.kind }),
  };
}

export function parsePrepareBootImageArgs(argv: readonly string[]): PrepareBootImageInput | { readonly error: string } {
  let isoPath = "";
  let outputImagePath = "";
  let withCredentialBlob = true;
  let fresh = false;
  let withWifiCredentials = false;
  let hostname = DEFAULT_QEMU_HOSTNAME;
  let roleFlag: string | undefined;
  let flakeHostFlag: string | undefined;
  let joinServerUrlFlag: string | undefined;
  let joinTokenSourcePath: string | undefined;
  let baoLoadSiteFlag: string | undefined;
  let baoPathFlag: string | undefined;
  let clusterSegmentMac: string | undefined;
  let clusterHostIndex: string | undefined;

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]!;
    if (arg === "--iso") {
      isoPath = argv[++i] ?? "";
    } else if (arg === "--output") {
      outputImagePath = argv[++i] ?? "";
    } else if (arg === "--with-credential-blob") {
      withCredentialBlob = true;
    } else if (arg === "--fresh") {
      fresh = true;
    } else if (arg === "--with-wifi-credentials") {
      withWifiCredentials = true;
    } else if (arg === "--hostname") {
      hostname = argv[++i] ?? "";
    } else if (arg === "--role") {
      roleFlag = argv[++i] ?? "";
    } else if (arg === "--flake-host") {
      flakeHostFlag = argv[++i] ?? "";
    } else if (arg === "--join-server-url") {
      joinServerUrlFlag = argv[++i] ?? "";
    } else if (arg === "--join-token") {
      joinTokenSourcePath = argv[++i] ?? "";
    } else if (arg === "--bao-load-site") {
      const value = argv[i + 1];
      if (value === undefined || value.startsWith("-")) {
        return { error: "--bao-load-site requires a value" };
      }
      baoLoadSiteFlag = value;
      i++;
    } else if (arg === "--bao-path") {
      const value = argv[i + 1];
      if (value === undefined || value.startsWith("-")) {
        return { error: "--bao-path requires a value" };
      }
      baoPathFlag = value;
      i++;
    } else if (arg === "--cluster-segment-mac") {
      clusterSegmentMac = argv[++i] ?? "";
    } else if (arg === "--cluster-host-index") {
      clusterHostIndex = argv[++i] ?? "";
    } else if (arg === "-h" || arg === "--help") {
      return { error: "see file header for usage" };
    } else {
      return { error: `unknown argument: ${arg}` };
    }
  }

  if (isoPath === "") return { error: "--iso is required" };
  if (outputImagePath === "") return { error: "--output is required" };

  const firstbootRole = firstbootRoleFromFlags({
    ...(roleFlag === undefined ? {} : { role: roleFlag }),
    ...(flakeHostFlag === undefined ? {} : { flakeHost: flakeHostFlag }),
    ...(joinServerUrlFlag === undefined ? {} : { joinServerUrl: joinServerUrlFlag }),
    ...(joinTokenSourcePath === undefined ? {} : { joinTokenSourcePath }),
    ...(clusterSegmentMac === undefined ? {} : { clusterSegmentMac }),
    ...(clusterHostIndex === undefined ? {} : { clusterHostIndex }),
  });
  if (!firstbootRole.ok) return { error: firstbootRole.error };

  const namedArgv: string[] = [];
  if (baoLoadSiteFlag !== undefined) namedArgv.push(`--bao-load-site=${baoLoadSiteFlag}`);
  if (baoPathFlag !== undefined) namedArgv.push(`--bao-path=${baoPathFlag}`);
  let namedBaoElf: NamedBaoElfAsk | null | undefined;
  if (namedArgv.length > 0) {
    const parsedNamed = parseNamedBaoElfArgs(namedArgv);
    if (!parsedNamed.ok) return { error: namedBaoElfArgErrorMessage(parsedNamed.reason) };
    namedBaoElf = parsedNamed.ask;
  }

  return {
    isoPath,
    outputImagePath,
    withCredentialBlob: fresh ? false : withCredentialBlob,
    testMode: true,
    hostname,
    pubkeyPath: TEST_INFRA_PUBKEY,
    ...(withWifiCredentials
      ? {
          wifiCredentials: {
            ssid: DEFAULT_QEMU_WIFI_SSID,
            password: DEFAULT_QEMU_WIFI_PASSWORD,
          },
        }
      : {}),
    ...(firstbootRole.value === undefined ? {} : { firstbootRole: firstbootRole.value }),
    ...(namedBaoElf === undefined ? {} : { namedBaoElf }),
    ...(joinTokenSourcePath === undefined ? {} : { joinTokenSourcePath }),
  };
}

function main(argv: readonly string[]): number {
  const parsed = parsePrepareBootImageArgs(argv.slice(2));
  if ("error" in parsed) {
    console.error(parsed.error);
    return 2;
  }
  const prepared = prepareBootImage(parsed);
  if ("error" in prepared) {
    console.error(prepared.error);
    return 1;
  }
  console.log(JSON.stringify(prepared, null, 2));
  return 0;
}

if (import.meta.main) {
  process.exit(main(process.argv));
}
