import { expect, test } from "bun:test";
import { resolve } from "node:path";

test("the independent English-seed oracle agrees on the declared lexical coverage receipt and detects a removed seed entry", () => {
  const dispatcher = resolve(import.meta.dir, "../../../tests/cross-verification/english-seed-coverage/cross-verify.ts");
  const processResult = Bun.spawnSync([process.execPath, dispatcher], { stdout: "pipe", stderr: "pipe" });
  expect(processResult.exitCode).toBe(0);
  expect(processResult.stderr.toString()).toBe("");
  expect(processResult.stdout.toString().trim()).toBe("English-seed coverage cross-verification: 2 receipts; removed-good mutation detected; failures 0");
}, 30_000);
