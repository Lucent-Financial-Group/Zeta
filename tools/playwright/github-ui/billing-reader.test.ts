import { describe, expect, test } from "bun:test";
import {
  parseUsageNumber,
  extractUsageMetric,
  extractCopilotSeats,
  extractBillingHeadings,
  detectPermissionDenied,
  BillingPermissionError,
} from "./billing-reader";

// ---------------------------------------------------------------------------
// parseUsageNumber
// ---------------------------------------------------------------------------

describe("parseUsageNumber", () => {
  test("integer", () => expect(parseUsageNumber("2345")).toBe(2345));
  test("comma-separated integer", () => expect(parseUsageNumber("2,345")).toBe(2345));
  test("large comma-separated", () => expect(parseUsageNumber("10,000")).toBe(10000));
  test("float", () => expect(parseUsageNumber("1.5")).toBe(1.5));
  test("empty string returns null", () => expect(parseUsageNumber("")).toBeNull());
  test("non-numeric returns null", () => expect(parseUsageNumber("unlimited")).toBeNull());
  test("trims whitespace", () => expect(parseUsageNumber("  123  ")).toBe(123));
});

// ---------------------------------------------------------------------------
// extractUsageMetric — strategy 1: progress[aria-valuenow]
// ---------------------------------------------------------------------------

describe("extractUsageMetric — progress element", () => {
  function makeProgressHtml(keyword: string, used: number, max: number): string {
    return `<section>
      <h2>${keyword}</h2>
      <progress aria-valuenow="${used}" aria-valuemax="${max}" value="${used}" max="${max}"></progress>
      <span>${used} of ${max} minutes used</span>
    </section>`;
  }

  test("Actions: extracts used and included from progress element", () => {
    const html = makeProgressHtml("Actions", 2345, 3000);
    const result = extractUsageMetric(html, "Actions");
    expect(result.used).toBe(2345);
    expect(result.included).toBe(3000);
  });

  test("Packages: extracts used and included from progress element", () => {
    const html = makeProgressHtml("Packages", 500, 2000);
    const result = extractUsageMetric(html, "Packages");
    expect(result.used).toBe(500);
    expect(result.included).toBe(2000);
  });

  test("zero usage", () => {
    const html = makeProgressHtml("Actions", 0, 2000);
    const result = extractUsageMetric(html, "Actions");
    expect(result.used).toBe(0);
    expect(result.included).toBe(2000);
  });
});

// ---------------------------------------------------------------------------
// extractUsageMetric — strategy 2: "N of N" text pattern
// ---------------------------------------------------------------------------

describe("extractUsageMetric — 'N of N' text", () => {
  test("plain text pattern", () => {
    const html = `<div><h2>Actions</h2><p>2,345 of 3,000 minutes used</p></div>`;
    const result = extractUsageMetric(html, "Actions");
    expect(result.used).toBe(2345);
    expect(result.included).toBe(3000);
  });

  test("no comma variant", () => {
    const html = `<div><h2>Codespaces</h2><p>10 of 120 hours included</p></div>`;
    const result = extractUsageMetric(html, "Codespaces");
    expect(result.used).toBe(10);
    expect(result.included).toBe(120);
  });
});

// ---------------------------------------------------------------------------
// extractUsageMetric — strategy 3: bare number fallback
// ---------------------------------------------------------------------------

describe("extractUsageMetric — bare number fallback", () => {
  test("extracts used when no limit shown", () => {
    const html = `<div><h2>Actions</h2><span>1,234</span><p>minutes used this period</p></div>`;
    const result = extractUsageMetric(html, "Actions");
    expect(result.used).toBe(1234);
    expect(result.included).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// extractUsageMetric — not found
// ---------------------------------------------------------------------------

describe("extractUsageMetric — not found", () => {
  test("returns null/null when keyword absent", () => {
    const html = `<div><h2>Packages</h2><p>No data</p></div>`;
    const result = extractUsageMetric(html, "Actions");
    expect(result.used).toBeNull();
    expect(result.included).toBeNull();
  });

  test("returns null/null on empty html", () => {
    const result = extractUsageMetric("", "Actions");
    expect(result.used).toBeNull();
    expect(result.included).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// extractCopilotSeats
// ---------------------------------------------------------------------------

describe("extractCopilotSeats", () => {
  test("extracts active seat count", () => {
    const html = `<div><h2>GitHub Copilot</h2><p>12 active seats</p></div>`;
    expect(extractCopilotSeats(html)).toBe(12);
  });

  test("extracts bare seat count", () => {
    const html = `<div><h2>Copilot</h2><span>5 seats</span></div>`;
    expect(extractCopilotSeats(html)).toBe(5);
  });

  test("returns null when Copilot section absent", () => {
    const html = `<div><h2>Actions</h2><p>1000 minutes</p></div>`;
    expect(extractCopilotSeats(html)).toBeNull();
  });

  test("returns null on empty html", () => {
    expect(extractCopilotSeats("")).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// extractBillingHeadings
// ---------------------------------------------------------------------------

describe("extractBillingHeadings", () => {
  test("extracts h2 and h3 headings", () => {
    const html = `
      <h2>GitHub Actions</h2>
      <p>some content</p>
      <h3>Actions minutes</h3>
      <h2>GitHub Packages</h2>
    `;
    const headings = extractBillingHeadings(html);
    expect(headings).toContain("GitHub Actions");
    expect(headings).toContain("Actions minutes");
    expect(headings).toContain("GitHub Packages");
  });

  test("strips inner HTML tags", () => {
    const html = `<h2><span class="icon">⚡</span> Actions</h2>`;
    const headings = extractBillingHeadings(html);
    expect(headings[0]).toBe("⚡ Actions");
  });

  test("returns empty array when no headings", () => {
    expect(extractBillingHeadings("<p>no headings here</p>")).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// detectPermissionDenied
// ---------------------------------------------------------------------------

describe("detectPermissionDenied", () => {
  test("detects 404 URL redirect", () => {
    expect(detectPermissionDenied("<html></html>", "https://github.com/404")).toBe(true);
  });

  test("detects login redirect", () => {
    expect(detectPermissionDenied("<html></html>", "https://github.com/login")).toBe(true);
  });

  test("detects permission message in HTML", () => {
    const html = `<p>You don't have permission to view this page.</p>`;
    expect(detectPermissionDenied(html, "https://github.com/organizations/foo/settings/billing/summary")).toBe(true);
  });

  test("returns false on normal billing page", () => {
    const html = `<h2>GitHub Actions</h2><progress aria-valuenow="100" aria-valuemax="2000"></progress>`;
    expect(detectPermissionDenied(html, "https://github.com/organizations/foo/settings/billing/summary")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// BillingPermissionError
// ---------------------------------------------------------------------------

describe("BillingPermissionError", () => {
  test("has correct name and org in message", () => {
    const err = new BillingPermissionError("my-org");
    expect(err.name).toBe("BillingPermissionError");
    expect(err.message).toContain("my-org");
    expect(err instanceof Error).toBe(true);
  });
});
