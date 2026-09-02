import { spawnSync } from "node:child_process";
import { join, resolve } from "node:path";
import { describe, expect, test } from "bun:test";

const ROOT = resolve(import.meta.dir, "../../..");
const DISPATCHER = join(ROOT, "tests/cross-verification/multilayer-bnn-online-update/cross-verify.ts");

describe("multilayer BNN online factor-graph update cross-verification", () => {
  test("production F# agrees with an independent Python joint-Gaussian solve and catches a coupling-sign mutant", () => {
    const child = spawnSync(process.execPath, [DISPATCHER], {
      cwd: ROOT,
      encoding: "utf8",
      timeout: 240_000,
      env: { ...process.env, DOTNET_CLI_TELEMETRY_OPTOUT: "1" },
    });
    expect(child.error).toBeUndefined();
    expect(child.status, child.stderr || child.stdout).toBe(0);
    expect(child.stdout).toContain(
      "multilayer-bnn-online-update cross-verify: 14 finite witness groups across production F#/independent Python",
    );
  }, 240_000);
});
