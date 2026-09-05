import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "bun:test";

const GATE_PATH = join(import.meta.dir, "..", "..", "..", ".github", "workflows", "gate.yml");
const workflow = readFileSync(GATE_PATH, "utf8");
const BUN_ACTION = "oven-sh/setup-bun@0c5077e51419868618aeaa5fe8019c62421857d6";

function jobBlock(jobId: string): string {
  const start = workflow.indexOf(`  ${jobId}:\n`);
  if (start < 0) throw new Error(`missing gate job ${jobId}`);
  const next = workflow.slice(start + 1).search(/^  [A-Za-z0-9_-]+:\n/m);
  return next < 0 ? workflow.slice(start) : workflow.slice(start, start + 1 + next);
}

describe("narrow JavaScript gate jobs", () => {
  const jobs = [
    "lint-bash-retirement-inventory",
    "lint-tick-history-order",
    "test-typescript-hermetic",
  ] as const;

  for (const jobId of jobs) {
    test(`FALSIFIER: ${jobId} refuses heavyweight setup regression`, () => {
      const block = jobBlock(jobId);
      expect(block).toContain(BUN_ACTION);
      expect(block).toContain('bun-version: "1.3.13"');
      expect(block).toContain("bun install --frozen-lockfile");
      expect(block).not.toContain("./tools/setup/install.sh");
    });
  }

  test("FALSIFIER: hermetic timeout holds the measured 18-20min suite", () => {
    // 2026-09-04: timeout-minutes: 20 cancelled the floor job mid-suite
    // (run 33833532558, bun test 19m47s). A silent revert to 20 reopens that
    // red: cancelled reads as FAIL, rerun-cancelled-gate will not heal a
    // second attempt, and auto-merge sits blocked.
    const block = jobBlock("test-typescript-hermetic");
    const match = /^    timeout-minutes: (\d+)$/m.exec(block);
    expect(match).not.toBeNull();
    expect(Number(match?.[1])).toBeGreaterThanOrEqual(30);
  });
});
