/**
 * Dark Matter Observatory algebra lane: the full external dispatcher must compile and execute
 * both independent oracles rather than treating their checked source as verification.
 */

import { spawnSync } from "node:child_process";
import { join, resolve } from "node:path";
import { describe, expect, test } from "bun:test";

const REPOSITORY_ROOT = resolve(import.meta.dir, "../../../..");
const DISPATCHER = join(
  REPOSITORY_ROOT,
  "tests/cross-verification/adinkra-halfspin-decomposition/cross-verify.ts",
);

describe("finite intertwiner decomposition three-language cross-verification", () => {
  test("TypeScript, F#, and Rust agree on four baselines and three quarantined target faults", () => {
    const child = spawnSync(process.execPath, [DISPATCHER], {
      cwd: REPOSITORY_ROOT,
      encoding: "utf8",
      timeout: 180_000,
      env: { ...process.env, DOTNET_CLI_TELEMETRY_OPTOUT: "1" },
    });

    expect(child.error).toBeUndefined();
    expect(child.status, child.stderr || child.stdout).toBe(0);
    expect(child.stdout).toContain(
      "adinkra-halfspin-decomposition cross-verify: 4 baselines + 3 faults across TypeScript/F#/Rust, 0 failure(s).",
    );
  }, 180_000);
});
