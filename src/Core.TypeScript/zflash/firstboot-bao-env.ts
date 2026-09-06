#!/usr/bin/env bun
/**
 * src/Core.TypeScript/zflash/firstboot-bao-env.ts
 *
 * First-boot bun consume of sourced bao names. Bash `.` sources
 * `/zeta-firstboot.conf`; this reads `ZETA_BAO_LOAD_SITE` and
 * `ZETA_BAO_PATH` from the resulting env. Does not open files.
 * Does not edit `zeta-first-boot.sh`. Does not expand
 * `ZetaFirstbootRole`. Does not land Application.yaml.
 *
 * Usage: bun src/Core.TypeScript/zflash/firstboot-bao-env.ts
 * Exit 0: JSON `{ ok: true, ask }` (ask may be null).
 * Exit 2: JSON `{ ok: false, reason }`.
 */

import { consumeFirstbootBaoElfProcessEnv, type NamedBaoElfArgResult } from "./firstboot-bao-elf.ts";

export function runFirstbootBaoElfEnvCli(
  env: { readonly [key: string]: string | undefined },
  write: (line: string) => void = (line) => {
    process.stdout.write(line);
  },
): number {
  const parsed: NamedBaoElfArgResult = consumeFirstbootBaoElfProcessEnv(env);
  write(`${JSON.stringify(parsed)}\n`);
  return parsed.ok ? 0 : 2;
}

function main(): void {
  process.exit(runFirstbootBaoElfEnvCli(process.env));
}

if (import.meta.main) {
  main();
}
