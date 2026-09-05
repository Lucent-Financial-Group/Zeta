import { spawnSync } from "node:child_process";
import { join, resolve } from "node:path";
import { describe, expect, test } from "bun:test";

const ROOT = resolve(import.meta.dir, "../../..");
const DISPATCHER = join(ROOT, "tests/cross-verification/multilayer-bnn-online-update/cross-verify.ts");

describe("multilayer BNN online factor-graph update cross-verification", () => {
  test("production F# agrees with an independent Python joint-Gaussian solve and pins mean- and covariance-sensitive mutants", () => {
    const child = spawnSync(process.execPath, [DISPATCHER], {
      cwd: ROOT,
      encoding: "utf8",
      timeout: 240_000,
      env: { ...process.env, DOTNET_CLI_TELEMETRY_OPTOUT: "1" },
    });
    expect(child.error).toBeUndefined();
    expect(child.status, child.stderr || child.stdout).toBe(0);
    expect(child.stdout).toContain(
      "multilayer-bnn-online-update cross-verify: 11 cross-oracle comparisons, 19 production-only receipt controls, 3 mutation controls",
    );
    expect(child.stdout).toContain("coupling-sign disagreements=means:4,variances:0");
    expect(child.stdout).toContain("channel-variance disagreements=means:4,variances:4");
    expect(child.stdout).toContain("double-count disagreements=means:4,variances:4");
  }, 240_000);
});
