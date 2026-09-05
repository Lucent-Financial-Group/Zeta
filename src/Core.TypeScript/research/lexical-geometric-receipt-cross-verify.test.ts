import { expect, test } from "bun:test";
import { resolve } from "node:path";

test("the finite lexical-geometric receipt agrees with an independent Python oracle and detects declared mutations", () => {
  const dispatcher = resolve(import.meta.dir, "../../../tests/cross-verification/lexical-geometric/cross-verify.ts");
  const processResult = Bun.spawnSync([process.execPath, dispatcher], { stdout: "pipe", stderr: "pipe" });
  const decoder = new TextDecoder();
  const diagnostics = `${decoder.decode(processResult.stdout)}${decoder.decode(processResult.stderr)}`.trim();
  expect(processResult.exitCode, diagnostics).toBe(0);
  expect(processResult.stderr.toString()).toBe("");
  expect(processResult.stdout.toString().trim()).toBe(
    "Lexical-geometric receipt cross-verification: independent F#/Python base, canonical-order, correction-conflict, and coordinate-mutation controls passed; failures 0",
  );
}, 60_000);
