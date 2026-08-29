#!/usr/bin/env bun
/**
 * passphrase-source.ts — hexagonal passphrase door for zeta-creds-restore.
 *
 * The Nix unit used to inline three transports in shell (fw_cfg / pre-staged
 * file / systemd-ask-password). That made the metal tty1 path untestable: the
 * only way to reach `interactive-ask-password metal-capable=yes` was a human
 * at a real console. This module is the same decision as a pure function of a
 * capture, plus a thin IO seam (`PassphraseSourceEffects`) so:
 *
 *   - QEMU injects fw_cfg (real adapter)
 *   - unit tests inject a mock ask-password / missing fw_cfg (metal path)
 *   - a human hardware run uses the real systemd-ask-password adapter
 *
 * Noninterference: every reading of the host enters through the effects door.
 * `planPassphraseSource` is a pure function of `PassphraseSourceCapture`.
 *
 * Serial strings are byte-identical to the previous Nix inline so existing
 * QEMU restore contracts keep matching.
 */

import { execFileSync } from "node:child_process";
import { chmodSync, readFileSync, writeFileSync } from "node:fs";

export const QEMU_FWCFG_RAW_DEFAULT =
  "/sys/firmware/qemu_fw_cfg/by_name/opt/org.zeta/creds-passphrase/raw";

/** Byte-identical to zeta-creds-restore.nix / qemu-full-install-test.ts. */
export const PASSPHRASE_SOURCE_SERIAL = {
  stagedFromFwcfg: "zeta-creds-restore: passphrase staged from qemu fw_cfg",
  transportFwcfgNotMetal:
    "zeta-creds-restore: passphrase transport=qemu-fw_cfg metal-capable=no (hypervisor-only; this run proves NOTHING about the tty1 path on hardware)",
  transportInteractive:
    "zeta-creds-restore: passphrase transport=interactive-ask-password metal-capable=yes",
  transportPreStaged:
    "zeta-creds-restore: passphrase transport=pre-staged-file metal-capable=unknown",
  emptyAskPassword: "zeta-creds-restore: empty passphrase from systemd-ask-password",
  missingFile: (path: string): string =>
    `zeta-creds-restore: passphrase file ${path} missing (passphraseMode=file)`,
} as const;

export type PassphraseMode = "file" | "interactive";

export type PassphraseTransportKind =
  | "qemu-fw_cfg"
  | "pre-staged-file"
  | "interactive-ask-password";

export type PassphraseSourceCapture = {
  readonly fwCfgReadable: boolean;
  readonly passphraseFileNonempty: boolean;
  readonly passphraseMode: PassphraseMode;
};

export type PassphraseSourcePlan =
  | { readonly kind: "stage-from-fwcfg" }
  | { readonly kind: "use-existing-file" }
  | { readonly kind: "ask-password" }
  | { readonly kind: "refuse"; readonly reason: "missing-file" | "empty-ask-password" };

/**
 * Pure. fw_cfg wins when the hypervisor node is readable — metal never has
 * that node, so a capture with fwCfgReadable=false is the metal decision.
 */
export function planPassphraseSource(capture: PassphraseSourceCapture): PassphraseSourcePlan {
  if (capture.fwCfgReadable) return { kind: "stage-from-fwcfg" };
  if (capture.passphraseFileNonempty) return { kind: "use-existing-file" };
  if (capture.passphraseMode === "file") return { kind: "refuse", reason: "missing-file" };
  return { kind: "ask-password" };
}

export type PassphraseSourceEffects = {
  readonly probeFwCfg: () => boolean;
  readonly readFwCfg: () => Uint8Array;
  readonly passphraseFileNonempty: () => boolean;
  readonly askPassword: () => string;
  readonly writePassphraseFile: (path: string, contents: Uint8Array) => void;
};

export type StagePassphraseConfig = {
  readonly passphraseFile: string;
  readonly passphraseMode: PassphraseMode;
  readonly interactiveTempFile: string;
};

export type StagePassphraseResult =
  | {
      readonly ok: true;
      readonly transport: PassphraseTransportKind;
      readonly passphrasePath: string;
      readonly serial: readonly string[];
    }
  | { readonly ok: false; readonly serial: readonly string[]; readonly reason: string };

function transportSerial(kind: PassphraseTransportKind): string {
  if (kind === "qemu-fw_cfg") return PASSPHRASE_SOURCE_SERIAL.transportFwcfgNotMetal;
  if (kind === "interactive-ask-password") return PASSPHRASE_SOURCE_SERIAL.transportInteractive;
  return PASSPHRASE_SOURCE_SERIAL.transportPreStaged;
}

export function stagePassphrase(
  effects: PassphraseSourceEffects,
  config: StagePassphraseConfig,
): StagePassphraseResult {
  const capture: PassphraseSourceCapture = {
    fwCfgReadable: effects.probeFwCfg(),
    passphraseFileNonempty: effects.passphraseFileNonempty(),
    passphraseMode: config.passphraseMode,
  };
  const plan = planPassphraseSource(capture);

  if (plan.kind === "stage-from-fwcfg") {
    const bytes = effects.readFwCfg().subarray(0, 4096);
    effects.writePassphraseFile(config.passphraseFile, bytes);
    const serial = [
      PASSPHRASE_SOURCE_SERIAL.stagedFromFwcfg,
      transportSerial("qemu-fw_cfg"),
    ];
    return {
      ok: true,
      transport: "qemu-fw_cfg",
      passphrasePath: config.passphraseFile,
      serial,
    };
  }

  if (plan.kind === "use-existing-file") {
    return {
      ok: true,
      transport: "pre-staged-file",
      passphrasePath: config.passphraseFile,
      serial: [transportSerial("pre-staged-file")],
    };
  }

  if (plan.kind === "refuse") {
    const line = PASSPHRASE_SOURCE_SERIAL.missingFile(config.passphraseFile);
    return { ok: false, serial: [line], reason: line };
  }

  const typed = effects.askPassword();
  if (typed.length === 0) {
    return {
      ok: false,
      serial: [PASSPHRASE_SOURCE_SERIAL.emptyAskPassword],
      reason: PASSPHRASE_SOURCE_SERIAL.emptyAskPassword,
    };
  }
  const encoded = new TextEncoder().encode(typed);
  effects.writePassphraseFile(config.interactiveTempFile, encoded);
  return {
    ok: true,
    transport: "interactive-ask-password",
    passphrasePath: config.interactiveTempFile,
    serial: [transportSerial("interactive-ask-password")],
  };
}

function fileNonempty(path: string): boolean {
  try {
    const st = readFileSync(path);
    return st.byteLength > 0;
  } catch {
    return false;
  }
}

export function realPassphraseSourceEffects(options: {
  readonly fwCfgRaw: string;
  readonly passphraseFile: string;
  readonly askPasswordBin: string;
}): PassphraseSourceEffects {
  return {
    probeFwCfg: (): boolean => {
      try {
        execFileSync("modprobe", ["qemu_fw_cfg"], { stdio: "ignore" });
      } catch {
        /* metal: module absent */
      }
      try {
        // Match the prior Nix `[ -s ]` check: an empty fw_cfg node must not
        // win over ask-password / a pre-staged file.
        return readFileSync(options.fwCfgRaw).byteLength > 0;
      } catch {
        return false;
      }
    },
    readFwCfg: (): Uint8Array => new Uint8Array(readFileSync(options.fwCfgRaw)),
    passphraseFileNonempty: (): boolean => fileNonempty(options.passphraseFile),
    askPassword: (): string => {
      const out = execFileSync(
        options.askPasswordBin,
        ["--timeout=300", "Zeta cred-blob passphrase: "],
        { encoding: "utf-8" },
      );
      return out.replace(/\r?\n$/u, "");
    },
    writePassphraseFile: (path: string, contents: Uint8Array): void => {
      writeFileSync(path, contents, { mode: 0o600 });
      chmodSync(path, 0o400);
    },
  };
}

function parseStageArgs(argv: readonly string[]): {
  readonly passphraseFile: string;
  readonly passphraseMode: PassphraseMode;
  readonly fwCfgRaw: string;
  readonly askPasswordBin: string;
  readonly interactiveTempFile: string;
} {
  let passphraseFile = "/run/zeta-creds-passphrase";
  let passphraseMode: PassphraseMode = "file";
  let fwCfgRaw = QEMU_FWCFG_RAW_DEFAULT;
  let askPasswordBin = "systemd-ask-password";
  let interactiveTempFile = "/run/zeta-creds-passphrase-temp";
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]!;
    const next = (): string => {
      const v = argv[i + 1];
      if (v === undefined) throw new Error(`${arg} requires a value`);
      i += 1;
      return v;
    };
    if (arg === "--stage") continue;
    if (arg === "--passphrase-file") passphraseFile = next();
    else if (arg === "--mode") {
      const mode = next();
      if (mode !== "file" && mode !== "interactive") {
        throw new Error(`--mode must be file|interactive; got ${mode}`);
      }
      passphraseMode = mode;
    } else if (arg === "--fwcfg-raw") fwCfgRaw = next();
    else if (arg === "--ask-password-bin") askPasswordBin = next();
    else if (arg === "--temp-file") interactiveTempFile = next();
    else throw new Error(`unknown flag: ${arg}`);
  }
  return { passphraseFile, passphraseMode, fwCfgRaw, askPasswordBin, interactiveTempFile };
}

function main(argv: readonly string[]): number {
  const args = parseStageArgs(argv);
  const result = stagePassphrase(
    realPassphraseSourceEffects({
      fwCfgRaw: args.fwCfgRaw,
      passphraseFile: args.passphraseFile,
      askPasswordBin: args.askPasswordBin,
    }),
    {
      passphraseFile: args.passphraseFile,
      passphraseMode: args.passphraseMode,
      interactiveTempFile: args.interactiveTempFile,
    },
  );
  for (const line of result.serial) {
    console.log(line);
  }
  if (!result.ok) return 1;
  console.log(`PASSPHRASE_TRANSPORT=${result.transport}`);
  console.log(`PASSPHRASE_PATH=${result.passphrasePath}`);
  return 0;
}

if (import.meta.main) {
  try {
    process.exit(main(process.argv.slice(2)));
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`zeta-creds-restore: passphrase-source: ${msg}`);
    process.exit(2);
  }
}
