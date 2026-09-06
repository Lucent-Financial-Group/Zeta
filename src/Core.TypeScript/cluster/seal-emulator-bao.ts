#!/usr/bin/env bun
/**
 * src/Core.TypeScript/cluster/seal-emulator-bao.ts
 *
 * Off-cluster PKCS#11 init against SoftHSM2. The install job proved the
 * module exists; this module proves HSM-enabled `bao` can init without
 * Shamir unseal keys. SoftHSM green is not YubiHSM green. The stanza
 * does not land in Application.yaml.
 *
 * Why the glibc tarball, not the Alpine image: 2026-08-21 measured
 * the musl `openbao-hsm` image as having no PKCS#11 module, and
 * Ubuntu `libsofthsm2.so` as glibc. This job runs the upstream
 * `openbao-hsm_*_linux_*.tar.gz` (interpreter `/lib64/ld-linux`) on
 * ubuntu-24.04 next to the apt module.
 *
 * OpenBao will not mint wrap keys. `pkcs11-tool` creates the AES key
 * before `bao operator init`. PIN is `BAO_HSM_PIN`, never HCL
 * (Helm renders HCL into a ConfigMap).
 *
 * Live recipe (this VM, 2026-09-06): uninitialized health 501;
 * init JSON has recovery_keys_b64 and zero-length unseal_keys_b64;
 * health 200 with "unsealed with stored key". No `bao operator unseal`.
 *
 * Cite: seal-emulator-rung.ts, seal-emulator-install.ts,
 * ephemeral-vault-init.ts (throw-away CI material),
 * openbao.org/docs/configuration/seal/pkcs11/,
 * docs/research/2026-09-05-ci-emulator-rung-softhsm-swtpm-witness-wiring-not-metal.md.
 */

import { spawn, spawnSync, type ChildProcess } from "node:child_process";
import { createHash } from "node:crypto";
import { chmodSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { SOFTHSM2_MODULE_CANDIDATES } from "./seal-emulator-install.ts";
import { emulatorWitness, hclHasPkcs11Seal, refuseCommittedPkcs11SealWithoutModule } from "./seal-emulator-rung.ts";

export const OPENBAO_HSM_VERSION = "2.6.2";

export interface OpenbaoHsmTar {
  readonly url: string;
  readonly sha256: string;
  readonly filename: string;
}

export const OPENBAO_HSM_LINUX_AMD64_TAR: OpenbaoHsmTar = {
  url: `https://github.com/openbao/openbao/releases/download/v${OPENBAO_HSM_VERSION}/openbao-hsm_${OPENBAO_HSM_VERSION}_linux_amd64.tar.gz`,
  sha256: "340511b6f87662b80252c202a7c5aa90dbe32341ea741458d49ce6839c2d7721",
  filename: `openbao-hsm_${OPENBAO_HSM_VERSION}_linux_amd64.tar.gz`,
} as const;

export const OPENBAO_HSM_LINUX_ARM64_TAR: OpenbaoHsmTar = {
  url: `https://github.com/openbao/openbao/releases/download/v${OPENBAO_HSM_VERSION}/openbao-hsm_${OPENBAO_HSM_VERSION}_linux_arm64.tar.gz`,
  sha256: "b796dae3269323a06ae198732f0c3727f8f041df9e45893a3d7ec5eeac627730",
  filename: `openbao-hsm_${OPENBAO_HSM_VERSION}_linux_arm64.tar.gz`,
} as const;

/** OpenBao example PIN. Env only. Never a ConfigMap / never HCL. */
export const CI_SOFTHSM_PIN = "1234";
export const CI_TOKEN_LABEL = "zeta-ci";
export const CI_KEY_LABEL = "bao-root-key-aes";

export interface Pkcs11HclInput {
  readonly modulePath: string;
  readonly storagePath: string;
  readonly listenAddr: string;
  readonly tokenLabel?: string;
  readonly keyLabel?: string;
}

export function pickSoftHsmModule(fileExists: (path: string) => boolean): string | undefined {
  return SOFTHSM2_MODULE_CANDIDATES.find((p) => fileExists(p));
}

export function openbaoHsmTarForArch(arch: string): OpenbaoHsmTar {
  if (arch === "arm64" || arch === "aarch64") return OPENBAO_HSM_LINUX_ARM64_TAR;
  return OPENBAO_HSM_LINUX_AMD64_TAR;
}

export function sha256Hex(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

export function sha256Matches(bytes: Uint8Array, expectedHex: string): boolean {
  return sha256Hex(bytes) === expectedHex.toLowerCase();
}

/**
 * HCL for a throw-away off-cluster bao. PIN is omitted on purpose.
 */
export function offClusterPkcs11Hcl(input: Pkcs11HclInput): string {
  const tokenLabel = input.tokenLabel ?? CI_TOKEN_LABEL;
  const keyLabel = input.keyLabel ?? CI_KEY_LABEL;
  return [
    "ui = false",
    "disable_mlock = true",
    `api_addr = "http://${input.listenAddr}"`,
    "",
    'storage "file" {',
    `  path = "${input.storagePath}"`,
    "}",
    "",
    'listener "tcp" {',
    `  address = "${input.listenAddr}"`,
    "  tls_disable = true",
    "}",
    "",
    'seal "pkcs11" {',
    `  lib         = "${input.modulePath}"`,
    `  token_label = "${tokenLabel}"`,
    `  key_label   = "${keyLabel}"`,
    '  mechanism   = "CKM_AES_GCM"',
    "}",
    "",
  ].join("\n");
}

export function hclContainsPinAssignment(hcl: string): boolean {
  return /^\s*pin\s*=/m.test(hcl);
}

export function pinMustBeEnvNotHcl(hcl: string): boolean {
  return hclHasPkcs11Seal(hcl) && !hclContainsPinAssignment(hcl);
}

export function refuseSealInApplicationYaml(
  path: string,
): { readonly ok: true } | { readonly ok: false; readonly reason: "application-yaml-seal" } {
  const n = path.replaceAll("\\", "/");
  if (n.endsWith("/Application.yaml") || n.endsWith("/Application.yml") || n.includes("/k8s/applications/openbao/")) {
    return { ok: false, reason: "application-yaml-seal" };
  }
  return { ok: true };
}

export function softhsm2ConfContents(tokendir: string): string {
  return `directories.tokendir = ${tokendir}\nobjectstore.backend = file\nlog.level = ERROR\n`;
}

export function softhsm2InitTokenArgv(label = CI_TOKEN_LABEL, pin = CI_SOFTHSM_PIN): readonly string[] {
  return ["--init-token", "--free", "--label", label, "--pin", pin, "--so-pin", pin];
}

export function pkcs11ToolAesKeygenArgv(
  modulePath: string,
  tokenLabel = CI_TOKEN_LABEL,
  pin = CI_SOFTHSM_PIN,
): readonly string[] {
  return [
    "--module",
    modulePath,
    "--token-label",
    tokenLabel,
    "--login",
    "--pin",
    pin,
    "--keygen",
    "--key-type",
    "aes:32",
    "--label",
    CI_KEY_LABEL,
  ];
}

export function baoOperatorInitArgv(): readonly string[] {
  return ["operator", "init", "-recovery-shares=1", "-recovery-threshold=1", "-format=json"];
}

export function baoHsmPinEnv(pin = CI_SOFTHSM_PIN): Readonly<Record<string, string>> {
  return { BAO_HSM_PIN: pin };
}

export interface Pkcs11InitParse {
  readonly rootToken: string;
  readonly recoveryKeysB64: readonly string[];
  readonly unsealKeysB64: readonly string[];
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

export function parsePkcs11InitOutput(stdout: string): Pkcs11InitParse | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(stdout);
  } catch {
    return null;
  }
  if (typeof parsed !== "object" || parsed === null) return null;
  const record = parsed as Record<string, unknown>;
  const rootToken = isNonEmptyString(record.root_token) ? record.root_token : "";
  if (rootToken.length === 0) return null;
  const recovery = Array.isArray(record.recovery_keys_b64) ? record.recovery_keys_b64.filter(isNonEmptyString) : [];
  const unseal = Array.isArray(record.unseal_keys_b64) ? record.unseal_keys_b64.filter(isNonEmptyString) : [];
  return { rootToken, recoveryKeysB64: recovery, unsealKeysB64: unseal };
}

export type Pkcs11InitDecision =
  | { readonly ok: true; readonly recoveryKeyCount: number }
  | { readonly ok: false; readonly reason: "shamir-unseal-keys" | "unparseable" | "seal-without-module" };

/**
 * SoftHSM can witness openbao-inits-without-shamir only when init JSON
 * has a root token and zero Shamir unseal keys. Recovery keys may exist.
 * Live OpenBao v2.6.2+hsm emits `unseal_keys_b64: []` under PKCS#11;
 * an empty array is not Shamir.
 */
export function classifyPkcs11Init(stdout: string, moduleInProcess: boolean): Pkcs11InitDecision {
  if (!moduleInProcess) {
    return { ok: false, reason: "seal-without-module" };
  }
  const parsed = parsePkcs11InitOutput(stdout);
  if (parsed === null) return { ok: false, reason: "unparseable" };
  if (parsed.unsealKeysB64.length > 0) return { ok: false, reason: "shamir-unseal-keys" };
  return { ok: true, recoveryKeyCount: parsed.recoveryKeysB64.length };
}

export function softhsmCanWitnessOffClusterInit(): boolean {
  return emulatorWitness("softhsm2", "openbao-inits-without-shamir") === "yes";
}

export function alpineImageIsThisJobsProof(): false {
  return false;
}

export function committedChartMayGainPkcs11Seal(applicationYamlHcl: string, moduleInImage: boolean): boolean {
  return refuseCommittedPkcs11SealWithoutModule(applicationYamlHcl, moduleInImage).ok;
}

export function refuseInitMaterialInServerLog(serverLog: string, initJson: string): void {
  const parsed = parsePkcs11InitOutput(initJson);
  if (parsed === null) {
    throw new Error("seal-emulator-bao: unparseable init json for leak scan");
  }
  if (serverLog.includes(parsed.rootToken)) {
    throw new Error("seal-emulator-bao: root token leaked into bao server log");
  }
  for (const key of parsed.recoveryKeysB64) {
    if (serverLog.includes(key)) {
      throw new Error("seal-emulator-bao: recovery key leaked into bao server log");
    }
  }
}

export async function waitForHttpStatus(
  url: string,
  expected: number,
  timeoutMs: number,
  options: {
    readonly fetcher?: typeof fetch;
    readonly sleep?: (ms: number) => Promise<void>;
    readonly now?: () => number;
    readonly exited?: () => boolean;
  } = {},
): Promise<number> {
  const fetcher = options.fetcher ?? fetch;
  const sleep = options.sleep ?? ((ms: number) => new Promise((resolve) => setTimeout(resolve, ms)));
  const now = options.now ?? Date.now;
  const deadline = now() + timeoutMs;
  let last = 0;
  while (now() < deadline) {
    if (options.exited?.() === true) {
      throw new Error(`seal-emulator-bao: process exited before HTTP ${String(expected)} (last=${String(last)})`);
    }
    try {
      const res = await fetcher(url, { method: "GET" });
      last = res.status;
      if (last === expected) return last;
    } catch {
      last = 0;
    }
    await sleep(250);
  }
  throw new Error(`seal-emulator-bao: timeout waiting for ${url} HTTP ${String(expected)}; last=${String(last)}`);
}

function runOrThrow(bin: string, argv: readonly string[], env: NodeJS.ProcessEnv): string {
  const result = spawnSync(bin, [...argv], { env, encoding: "utf8" });
  if (result.status !== 0) {
    const err = (result.stderr ?? "").trim();
    throw new Error(`${bin} exited ${String(result.status)}${err.length > 0 ? `: ${err}` : ""}`);
  }
  return result.stdout ?? "";
}

function stopChild(child: ChildProcess): void {
  if (child.exitCode !== null || child.killed) return;
  child.kill("SIGTERM");
}

export interface OffClusterRunInput {
  readonly workdir: string;
  readonly baoBin: string;
  readonly modulePath: string;
  readonly pin?: string;
  readonly listenAddr?: string;
}

export interface OffClusterRunResult {
  readonly classified: Extract<Pkcs11InitDecision, { ok: true }>;
  readonly healthAfterInit: number;
}

export async function runOffClusterBaoPkcs11Init(input: OffClusterRunInput): Promise<OffClusterRunResult> {
  const pin = input.pin ?? CI_SOFTHSM_PIN;
  const listenAddr = input.listenAddr ?? "127.0.0.1:8200";
  const tokens = join(input.workdir, "tokens");
  const data = join(input.workdir, "data");
  mkdirSync(tokens, { recursive: true });
  mkdirSync(data, { recursive: true });
  const confPath = join(input.workdir, "softhsm2.conf");
  const hclPath = join(input.workdir, "bao.hcl");
  const initPath = join(input.workdir, "init.json");
  writeFileSync(confPath, softhsm2ConfContents(tokens), { encoding: "utf8" });
  const hcl = offClusterPkcs11Hcl({
    modulePath: input.modulePath,
    storagePath: data,
    listenAddr,
  });
  if (hclContainsPinAssignment(hcl)) {
    throw new Error("seal-emulator-bao: PIN leaked into HCL");
  }
  writeFileSync(hclPath, hcl, { encoding: "utf8" });
  const env: NodeJS.ProcessEnv = {
    ...process.env,
    SOFTHSM2_CONF: confPath,
    BAO_HSM_PIN: pin,
    BAO_ADDR: `http://${listenAddr}`,
  };
  runOrThrow("softhsm2-util", softhsm2InitTokenArgv(), env);
  runOrThrow("pkcs11-tool", pkcs11ToolAesKeygenArgv(input.modulePath, CI_TOKEN_LABEL, pin), env);

  let serverLog = "";
  const child = spawn(input.baoBin, ["server", "-config", hclPath], {
    env,
    stdio: ["ignore", "pipe", "pipe"],
  });
  child.stdout?.on("data", (chunk: Buffer | string) => {
    serverLog += typeof chunk === "string" ? chunk : chunk.toString("utf8");
  });
  child.stderr?.on("data", (chunk: Buffer | string) => {
    serverLog += typeof chunk === "string" ? chunk : chunk.toString("utf8");
  });
  const healthUrl = `http://${listenAddr}/v1/sys/health`;
  try {
    await waitForHttpStatus(healthUrl, 501, 60_000, {
      exited: () => child.exitCode !== null,
    });
    const init = spawnSync(input.baoBin, [...baoOperatorInitArgv()], {
      env,
      encoding: "utf8",
      timeout: 120_000,
    });
    if (init.status !== 0) {
      throw new Error(`bao operator init exited ${String(init.status)}`);
    }
    const initJson = init.stdout ?? "";
    writeFileSync(initPath, initJson, { encoding: "utf8" });
    chmodSync(initPath, 0o600);
    const decision = classifyPkcs11Init(initJson, true);
    if (!decision.ok) {
      throw new Error(`seal-emulator-bao: ${decision.reason}`);
    }
    const healthAfterInit = await waitForHttpStatus(healthUrl, 200, 30_000, {
      exited: () => child.exitCode !== null,
    });
    refuseInitMaterialInServerLog(serverLog, initJson);
    return { classified: decision, healthAfterInit };
  } catch (error) {
    const tail = serverLog.slice(-4000);
    if (tail.length > 0) {
      process.stderr.write("seal-emulator-bao: bao server log tail (no init json):\n");
      process.stderr.write(`${tail}\n`);
    }
    throw error;
  } finally {
    stopChild(child);
  }
}

function parseArg(argv: readonly string[], name: string): string | undefined {
  const prefix = `--${name}=`;
  for (const a of argv) {
    if (a.startsWith(prefix)) return a.slice(prefix.length);
  }
  return undefined;
}

export async function main(argv: readonly string[]): Promise<number> {
  if (argv.includes("--print-hcl")) {
    const modulePath = parseArg(argv, "module") ?? pickSoftHsmModule((p) => existsSync(p));
    if (modulePath === undefined) {
      process.stderr.write("seal-emulator-bao: no SoftHSM module on disk\n");
      return 1;
    }
    const storagePath = parseArg(argv, "storage") ?? "/tmp/zeta-bao-pkcs11-data";
    const listenAddr = parseArg(argv, "listen") ?? "127.0.0.1:8200";
    process.stdout.write(offClusterPkcs11Hcl({ modulePath, storagePath, listenAddr }));
    return 0;
  }
  const initFile = parseArg(argv, "classify-init-file");
  if (initFile !== undefined) {
    const stdout = readFileSync(initFile, "utf8");
    const modulePresent = parseArg(argv, "module-present") !== "0";
    const decision = classifyPkcs11Init(stdout, modulePresent);
    if (!decision.ok) {
      process.stderr.write(`seal-emulator-bao: ${decision.reason}\n`);
      return 1;
    }
    process.stdout.write(`seal-emulator-bao: pkcs11-init ok recovery_keys=${String(decision.recoveryKeyCount)}\n`);
    return 0;
  }
  if (argv.includes("--run")) {
    const baoBin = parseArg(argv, "bao-bin");
    if (baoBin === undefined || !existsSync(baoBin)) {
      process.stderr.write("seal-emulator-bao: --run needs --bao-bin= to an executable\n");
      return 1;
    }
    const modulePath = parseArg(argv, "module") ?? pickSoftHsmModule((p) => existsSync(p));
    if (modulePath === undefined) {
      process.stderr.write("seal-emulator-bao: no SoftHSM module on disk\n");
      return 1;
    }
    const workdir = parseArg(argv, "workdir") ?? join(process.env.RUNNER_TEMP ?? "/tmp", "zeta-bao-pkcs11");
    const listenAddr = parseArg(argv, "listen") ?? "127.0.0.1:8200";
    const pin = process.env.BAO_HSM_PIN ?? CI_SOFTHSM_PIN;
    const result = await runOffClusterBaoPkcs11Init({
      workdir,
      baoBin,
      modulePath,
      pin,
      listenAddr,
    });
    process.stdout.write(
      `seal-emulator-bao: pkcs11-init ok recovery_keys=${String(result.classified.recoveryKeyCount)} health=${String(result.healthAfterInit)}\n`,
    );
    return 0;
  }
  process.stderr.write("seal-emulator-bao: pass --print-hcl, --classify-init-file=, or --run\n");
  return 2;
}

if (import.meta.main) {
  void main(process.argv.slice(2)).then(
    (code) => {
      process.exit(code);
    },
    (error: unknown) => {
      const message = error instanceof Error ? error.message : String(error);
      process.stderr.write(`seal-emulator-bao: ${message}\n`);
      process.exit(1);
    },
  );
}
