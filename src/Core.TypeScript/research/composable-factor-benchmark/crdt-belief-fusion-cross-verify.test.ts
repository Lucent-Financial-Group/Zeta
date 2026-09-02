import { expect, test } from "bun:test";
import { resolve } from "node:path";

test("the independent Python oracle agrees on evidence-union, Gaussian-product, and CI law witnesses", () => {
  const dispatcher = resolve(import.meta.dir, "../../../../tests/cross-verification/crdt-belief-fusion/cross-verify.ts");
  const processResult = Bun.spawnSync([process.execPath, dispatcher], { stdout: "pipe", stderr: "pipe" });
  expect(processResult.exitCode).toBe(0);
  expect(processResult.stderr.toString()).toBe("");
  expect(processResult.stdout.toString().trim()).toBe("CRDT belief-fusion cross-verification: 4 law groups; failures 0");
}, 30_000);

test("the comparator rejects an independently mutated trace-grid discretization", () => {
  const dispatcher = resolve(import.meta.dir, "../../../../tests/cross-verification/crdt-belief-fusion/cross-verify.ts");
  const processResult = Bun.spawnSync([process.execPath, dispatcher], {
    env: { ...process.env, CRDT_BELIEF_MUTANT: "trace-grid-999" },
    stdout: "pipe",
    stderr: "pipe",
  });
  expect(processResult.exitCode).toBe(1);
  expect(processResult.stderr.toString()).toContain("traceGrid");
}, 30_000);
