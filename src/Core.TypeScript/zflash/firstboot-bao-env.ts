#!/usr/bin/env bun
/**
 * src/Core.TypeScript/zflash/firstboot-bao-env.ts
 *
 * First-boot bun consume of sourced bao names. Bash `.` sources
 * `/zeta-firstboot.conf` and exports both keys (or neither);
 * this reads `ZETA_BAO_LOAD_SITE` and `ZETA_BAO_PATH` from the
 * resulting env. After Step 6.95a the installer names
 * `ZETA_BAO_ELF_EPOCH=installer-iso` (literal, not from `/mnt`).
 * Does not open files. bun invoke lives in
 * `zeta-install.sh` after Step 6.95a (mise/bun on PATH).
 * bun invoke from `zeta-first-boot.sh` stays forbidden.
 * Does not expand `ZetaFirstbootRole`. Does not land
 * Application.yaml.
 *
 * Usage: bun src/Core.TypeScript/zflash/firstboot-bao-env.ts
 * Exit 0: JSON `{ ok: true, ask, epoch }` (ask and epoch may be null).
 * Exit 2: JSON `{ ok: false, reason }`.
 */

import { consumeFirstbootBaoElfEnvWithEpoch, type FirstbootBaoElfEnvConsume } from "./firstboot-bao-elf.ts";

export function runFirstbootBaoElfEnvCli(
  env: { readonly [key: string]: string | undefined },
  write: (line: string) => void = (line) => {
    process.stdout.write(line);
  },
): number {
  const parsed: FirstbootBaoElfEnvConsume = consumeFirstbootBaoElfEnvWithEpoch(env);
  write(`${JSON.stringify(parsed)}\n`);
  return parsed.ok ? 0 : 2;
}

function main(): void {
  process.exit(runFirstbootBaoElfEnvCli(process.env));
}

if (import.meta.main) {
  main();
}
