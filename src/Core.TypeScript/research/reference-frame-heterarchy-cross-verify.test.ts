import { spawnSync } from "node:child_process";
import { join, resolve } from "node:path";
import { describe, expect, test } from "bun:test";

const ROOT = resolve(import.meta.dir, "../../..");
const DISPATCHER = join(ROOT, "tests/cross-verification/reference-frame-heterarchy/cross-verify.ts");

describe("reference-frame factor heterarchy cross-verification", () => {
  test("F# and TypeScript agree on Bayesian fusion, Clifford covariance, topology, and K4/K5 controls", () => {
    const child = spawnSync(process.execPath, [DISPATCHER], {
      cwd: ROOT,
      encoding: "utf8",
      timeout: 240_000,
      env: { ...process.env, DOTNET_CLI_TELEMETRY_OPTOUT: "1" },
    });
    expect(child.error).toBeUndefined();
    expect(child.status, child.stderr || child.stdout).toBe(0);
    expect(child.stdout).toContain(
      "reference-frame-heterarchy cross-verify: 14 finite witnesses across F#/TypeScript, 0 failure(s).",
    );
  }, 240_000);
});
