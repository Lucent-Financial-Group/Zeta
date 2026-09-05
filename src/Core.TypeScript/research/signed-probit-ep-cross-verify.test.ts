import { expect, test } from "bun:test";
import { resolve } from "node:path";

test("the independent signed-probit numerical oracle agrees with the finite F# EP receipt and detects a label mutation", () => {
  const dispatcher = resolve(import.meta.dir, "../../../tests/cross-verification/signed-probit-ep/cross-verify.ts");
  const processResult = Bun.spawnSync([process.execPath, dispatcher], { stdout: "pipe", stderr: "pipe" });
  const decoder = new TextDecoder();
  const diagnostics = `${decoder.decode(processResult.stdout)}${decoder.decode(processResult.stderr)}`.trim();
  expect(processResult.exitCode, diagnostics).toBe(0);
  expect(processResult.stderr.toString()).toBe("");
  expect(processResult.stdout.toString().trim()).toBe("Signed-probit EP cross-verification: 3 groups; maximum fixed-catalogue exact-integral discrepancy below 2e-3; label mutation detected; failures 0");
}, 60_000);
