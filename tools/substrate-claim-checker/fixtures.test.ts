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
import { checkFile as checkExistence } from "./check-existence.ts";

const fixtures = join(import.meta.dir, "fixtures");

describe("eval-set fixtures / count drift", () => {
  test("count-drift-9-vs-15.md — claim '9 drift instances' vs 15-row table is detected", () => {
    const result = checkCounts(join(fixtures, "count-drift-9-vs-15.md"));
    expect(result.ok).toBe(true);
    // Per PR #3611 review threads (chatgpt-codex-connector + copilot):
    // assert exact finding count and pin the body claim's line so a
    // regression in body-claim detection cannot be masked by an
    // HTML-comment match. The fixture's provenance comment is
    // intentionally worded to not restate the `<number> <noun>` pair
    // from the body claim.
    expect(result.findings.length).toBe(1);
    const finding = result.findings[0]!;
    expect(finding.line).toBe(24);
    expect(finding.claimedCount).toBe(9);
    expect(finding.actualCount).toBe(15);
    expect(finding.claim).toContain("drift instances");
    expect(finding.claimIsMinimum).toBe(false);
  });
});

describe("eval-set fixtures / existence drift", () => {
  test("existence-drift-missing-doc.md — backtick-quoted path that doesn't exist anywhere is detected", () => {
    const result = checkExistence(join(fixtures, "existence-drift-missing-doc.md"));
    expect(result.ok).toBe(true);
    // Same PR #3611 discipline applied to existence-drift: exact count
    // and pin the body claim's line so a regression in body-claim
    // detection cannot be masked by an HTML-comment match. The fixture
    // path is intentionally synthetic (won't be created accidentally),
    // so the test stays stable across substrate evolution.
    expect(result.findings.length).toBe(1);
    const finding = result.findings[0]!;
    expect(finding.line).toBe(24);
    expect(finding.pathClaim).toBe(
      "docs/_fixture_existence_drift_target_b0170_2026_05_15.md",
    );
    expect(finding.severity).toBe("drift");
  });
});
