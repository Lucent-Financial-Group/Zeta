import { test, expect } from "bun:test";

// DELIBERATE FAILURE — scratch branch only, never merged.
// Proves the cancelled-run auto-rerun leaves a GENUINE failure alone (guard 1).
// Re-running a real red would launder it into a flaky green, which is strictly
// worse than the bug the recovery treats.
test("deliberate failure to prove the rerun policy declines genuine failures", () => {
  expect(1).toBe(2);
});
