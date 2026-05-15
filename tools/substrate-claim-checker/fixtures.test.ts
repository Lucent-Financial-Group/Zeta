/**
 * Eval-set fixture regression tests for substrate-claim-checker (B-0170).
 *
 * Each test runs an existing `check-*.ts` against a frozen historical
 * drift fixture under `fixtures/` and asserts that the checker still
 * detects the empirical drift that prompted the fixture's capture.
 *
 * Run with `bun test tools/substrate-claim-checker/fixtures.test.ts`.
 *
 * Adding fixtures: see `fixtures/README.md`.
 */

import { describe, expect, test } from "bun:test";
import { join } from "node:path";
import { checkFile as checkCounts } from "./check-counts.ts";

const fixtures = join(import.meta.dir, "fixtures");

describe("eval-set fixtures / count drift", () => {
  test("count-drift-9-vs-15.md — claim '9 drift instances' vs 15-row table is detected", () => {
    const result = checkCounts(join(fixtures, "count-drift-9-vs-15.md"));
    expect(result.ok).toBe(true);
    expect(result.findings.length).toBeGreaterThanOrEqual(1);
    const finding = result.findings[0]!;
    expect(finding.claimedCount).toBe(9);
    expect(finding.actualCount).toBe(15);
    expect(finding.claim).toContain("drift instances");
    expect(finding.claimIsMinimum).toBe(false);
  });
});
