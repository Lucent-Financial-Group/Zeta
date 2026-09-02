import { expect, test } from "bun:test";
import { resolve } from "node:path";

test("CFB-A agrees with the independent F# production-message oracle", () => {
  const root = resolve(import.meta.dir, "../../../..");
  const dispatcher = resolve(root, "tests/cross-verification/composable-factor-benchmark/cross-verify.ts");
  const result = Bun.spawnSync([process.execPath, dispatcher], {
    cwd: root,
    env: process.env,
    stdout: "pipe",
    stderr: "pipe",
  });
  expect(result.exitCode, result.stderr.toString()).toBe(0);
  expect(result.stdout.toString()).toContain("CFB-A cross-verification: 6 cases; failures 0");
}, 180_000);
