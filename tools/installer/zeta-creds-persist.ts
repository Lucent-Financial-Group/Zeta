#!/usr/bin/env bun
// zeta-creds-persist.ts — write encrypted cred-blob to ESP. B-0852.2b CLI.
//
// Reads --bake-cred args + per-cred handler validation + crypto encrypt +
// envelope serialize → writes to --output (e.g., /esp/zeta-creds.enc).
//
// Composes:
//   - tools/installer/zeta-creds-crypto.ts (B-0852.1; encrypt)
//   - tools/installer/zeta-creds-manifest.ts (B-0852.5; cred catalog)
//   - tools/installer/zeta-cred-handlers.ts (B-0852.10; parse + validate args)
//   - tools/installer/zeta-creds-envelope.ts (B-0852.2a; wire format + bundle)
//
// Usage:
//   bun tools/installer/zeta-creds-persist.ts \
//     --usb-uuid <uuid> \
//     --output /esp/zeta-creds.enc \
//     [--passphrase-file <path> | --passphrase-env <VAR> | (interactive prompt)] \
//     [--persona <name>] \
//     [--bake-cred <id>=<value-source>] ...
//
// Per .claude/rules/non-coercion-invariant.md HC-8: operator authority over
// own creds; passphrase NEVER logged; --bake-cred error messages redact
// value-source contents per B-0852.10 P0 security discipline.

import { writeFileSync, readFileSync, existsSync } from "node:fs";
import { encrypt } from "./zeta-creds-crypto";
import { DEFAULT_HANDLERS, resolveBakeCred } from "./zeta-cred-handlers";
import { encodeBundle, serializeEnvelope, type CredBundle } from "./zeta-creds-envelope";
import { DEFAULT_MANIFEST } from "./zeta-creds-manifest";

interface Args {
  readonly usbUuid: string;
  readonly output: string;
  readonly passphrase: string;
  readonly persona: string | null;
  readonly bakeCredArgs: readonly string[];
}

/** Parse CLI args. Pure (no I/O). Returns args OR error message. */
export function parseArgs(argv: readonly string[], env: NodeJS.ProcessEnv): Args | { readonly error: string } {
  let usbUuid: string | null = null;
  let output: string | null = null;
  let passphraseFile: string | null = null;
  let passphraseEnv: string | null = null;
  let persona: string | null = null;
  const bakeCredArgs: string[] = [];

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]!;
    const next = (): string => {
      if (i + 1 >= argv.length) throw new Error(`${arg} requires a value`);
      return argv[++i]!;
    };
    try {
      if (arg === "--usb-uuid") usbUuid = next();
      else if (arg === "--output") output = next();
      else if (arg === "--passphrase-file") passphraseFile = next();
      else if (arg === "--passphrase-env") passphraseEnv = next();
      else if (arg === "--persona") persona = next();
      else if (arg === "--bake-cred") bakeCredArgs.push(next());
      else return { error: `unknown flag: ${arg}` };
    } catch (err) {
      return { error: err instanceof Error ? err.message : String(err) };
    }
  }

  if (!usbUuid) return { error: "--usb-uuid required" };
  if (!output) return { error: "--output required" };

  // Resolve passphrase source. Interactive prompt handled by caller (main); this
  // path is exercised when --passphrase-file or --passphrase-env is given.
  let passphrase: string | null = null;
  if (passphraseFile) {
    if (!existsSync(passphraseFile)) return { error: `--passphrase-file not found: ${passphraseFile}` };
    passphrase = readFileSync(passphraseFile, "utf8").replace(/\r?\n$/, "");
    if (passphrase.length === 0) return { error: "--passphrase-file is empty" };
  } else if (passphraseEnv) {
    const v = env[passphraseEnv];
    if (v === undefined || v === null || v === "") {
      return { error: `--passphrase-env ${passphraseEnv} not set or empty` };
    }
    passphrase = v;
  }
  if (passphrase === null)
    return {
      error:
        "passphrase source required (interactive prompt not supported in this entry-point; use --passphrase-file or --passphrase-env)",
    };

  return { usbUuid, output, passphrase, persona, bakeCredArgs };
}

/** Compose a CredBundle from --bake-cred args + manifest. Pure (in test mode). */
export function composeBundle(args: Args): CredBundle | { readonly error: string } {
  const globalCreds: Record<string, Buffer> = {};
  const personaCreds: Record<string, Record<string, Buffer>> = {};

  for (const arg of args.bakeCredArgs) {
    const result = resolveBakeCred(arg, DEFAULT_HANDLERS);
    if ("error" in result) return { error: `bake-cred parse failed: ${result.error}` };

    // Look up manifest entry to determine personaScoped
    const manifestEntry = DEFAULT_MANIFEST.credentials.find((c) => c.id === result.ok.id);
    if (!manifestEntry) return { error: `cred id "${result.ok.id}" not declared in manifest` };

    if (manifestEntry.personaScoped) {
      if (!args.persona) return { error: `cred "${result.ok.id}" is personaScoped; --persona required` };
      personaCreds[args.persona] ??= {};
      personaCreds[args.persona]![result.ok.id] = result.ok.value;
    } else {
      globalCreds[result.ok.id] = result.ok.value;
    }
  }

  return { schemaVersion: 1, globalCreds, personaCreds };
}

/** Pure pipeline (no FS write): bundle → encrypt → serialize. */
export function buildBlob(bundle: CredBundle, usbUuid: string, passphrase: string): Buffer {
  const plaintext = encodeBundle(bundle);
  const env = encrypt(plaintext, usbUuid, passphrase);
  return serializeEnvelope(env);
}

async function main(): Promise<number> {
  const argv = process.argv.slice(2);
  const parsed = parseArgs(argv, process.env);
  if ("error" in parsed) {
    console.error(`zeta-creds-persist: ${parsed.error}`);
    return 2;
  }
  const bundle = composeBundle(parsed);
  if ("error" in bundle) {
    console.error(`zeta-creds-persist: ${bundle.error}`);
    return 3;
  }
  const blob = buildBlob(bundle, parsed.usbUuid, parsed.passphrase);
  writeFileSync(parsed.output, blob);
  console.log(`zeta-creds-persist: wrote ${blob.length} bytes to ${parsed.output}`);
  console.log(`  globalCreds: ${Object.keys(bundle.globalCreds).join(", ") || "(none)"}`);
  for (const [persona, creds] of Object.entries(bundle.personaCreds)) {
    console.log(`  personaCreds[${persona}]: ${Object.keys(creds).join(", ")}`);
  }
  return 0;
}

if (import.meta.main) {
  main().then((code) => process.exit(code));
}
