import { describe, expect, test } from "bun:test";

import {
  buildInventoryReport,
  EXPECTED_RETAINED_BASH,
  hasDrift,
  renderReport,
} from "./check-bash-retirement-inventory";

describe("buildInventoryReport", () => {
  test("accepts the retained setup/bootstrap allowlist", () => {
    const report = buildInventoryReport(EXPECTED_RETAINED_BASH);

    expect(hasDrift(report)).toBe(false);
    expect(report.retained).toHaveLength(EXPECTED_RETAINED_BASH.length);
    expect(report.drift.unexpected).toEqual([]);
    expect(report.drift.missingRetained).toEqual([]);
  });

  test("flags new post-install bash files as drift", () => {
    const report = buildInventoryReport([...EXPECTED_RETAINED_BASH, "tools/hygiene/new-post-install-wrapper.sh"]);

    expect(hasDrift(report)).toBe(true);
    expect(report.drift.unexpected).toEqual(["tools/hygiene/new-post-install-wrapper.sh"]);
    expect(report.drift.missingRetained).toEqual([]);
  });

  test("flags missing retained setup scripts", () => {
    const [missing, ...rest] = EXPECTED_RETAINED_BASH;
    const report = buildInventoryReport(rest);

    expect(hasDrift(report)).toBe(true);
    expect(report.drift.unexpected).toEqual([]);
    expect(report.drift.missingRetained).toEqual([missing]);
  });
});

describe("renderReport", () => {
  test("renders an OK summary for a matching inventory", () => {
    const report = buildInventoryReport(EXPECTED_RETAINED_BASH);

    expect(renderReport(report)).toContain("OK: retained non-Lean bash surface matches setup/bootstrap allowlist.");
  });

  test("renders drift sections", () => {
    const [missing, ...rest] = EXPECTED_RETAINED_BASH;
    const report = buildInventoryReport([...rest, "tools/hygiene/new-post-install-wrapper.sh"]);
    const rendered = renderReport(report);

    expect(rendered).toContain("## Unexpected non-Lean bash files");
    expect(rendered).toContain("tools/hygiene/new-post-install-wrapper.sh");
    expect(rendered).toContain("## Missing retained setup/bootstrap files");
    expect(rendered).toContain(missing);
  });
});
