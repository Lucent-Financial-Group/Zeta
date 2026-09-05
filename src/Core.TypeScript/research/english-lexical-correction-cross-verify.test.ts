import { expect, test } from "bun:test";
import { resolve } from "node:path";

test("the independent lexical-correction oracle preserves canonical receipt order and detects omitted-version identity collapse", () => {
  const dispatcher = resolve(import.meta.dir, "../../../tests/cross-verification/english-lexical-correction/cross-verify.ts");
  const processResult = Bun.spawnSync([process.execPath, dispatcher], { stdout: "pipe", stderr: "pipe" });
  expect(processResult.exitCode).toBe(0);
  expect(processResult.stderr.toString()).toBe("");
  expect(processResult.stdout.toString().trim()).toBe("Lexical correction cross-verification: 2 receipts; canonical order mutation detected; omitted-version mutation detected; failures 0");
}, 30_000);
