import { withGitHubSession, type GitHubSessionOptions } from "./auth";

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

export class BillingPermissionError extends Error {
  constructor(org: string) {
    super(
      `Insufficient permissions to read billing for org "${org}". ` +
        "The authenticated user must have billing-admin or owner role.",
    );
    this.name = "BillingPermissionError";
  }
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface UsageMetric {
  /** Minutes / GB / seats consumed. `null` when the value could not be parsed. */
  readonly used: number | null;
  /** Included quota. `null` when unlimited or could not be parsed. */
  readonly included: number | null;
}

export interface OrgBillingData {
  readonly org: string;
  readonly url: string;
  readonly timestamp: string;
  /** GitHub Actions compute minutes for the billing period. */
  readonly actions: UsageMetric;
  /** GitHub Packages storage (GB). */
  readonly packages: UsageMetric;
  /** GitHub Codespaces compute (hours) or storage (GB) when visible. */
  readonly codespaces: UsageMetric;
  /** GitHub Copilot active seats. `null` when Copilot is not enabled or not visible. */
  readonly copilotSeats: number | null;
  /**
   * Unparsed heading text found on the page — useful for discovering new billing
   * sections and for debugging extraction misses.
   */
  readonly rawHeadings: readonly string[];
}

export interface BillingReaderOptions extends Pick<GitHubSessionOptions, "storageStatePath" | "driver"> {}

// ---------------------------------------------------------------------------
// Pure HTML extractors (unit-testable without Playwright)
// ---------------------------------------------------------------------------

/**
 * Parse a usage number from billing-page HTML.
 * Strips commas (e.g. "2,345") and returns the parsed float.
 */
export function parseUsageNumber(text: string): number | null {
  const cleaned = text.replace(/,/g, "").trim();
  const match = /(\d+(?:\.\d+)?)/.exec(cleaned);
  if (!match) return null;
  const val = parseFloat(match[1] as string);
  return isFinite(val) ? val : null;
}

/**
 * Extract a UsageMetric from the billing HTML for the given section keyword.
 *
 * Tries three strategies in order:
 *   1. progress[aria-valuenow + aria-valuemax] — most reliable.
 *   2. "N,NNN of N,NNN" text pattern.
 *   3. First bare number near the keyword (used-only, no limit).
 */
export function extractUsageMetric(html: string, sectionKeyword: string): UsageMetric {
  const kwEsc = sectionKeyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  // Strategy 1: <progress aria-valuenow="N" aria-valuemax="N">
  const progressPattern = new RegExp(
    `${kwEsc}[\\s\\S]{0,3000}?aria-valuenow\\s*=\\s*["'](\\d+(?:\\.\\d+)?)["'][\\s\\S]{0,500}?aria-valuemax\\s*=\\s*["'](\\d+(?:\\.\\d+)?)["']`,
    "i",
  );
  const progressMatch = progressPattern.exec(html);
  if (progressMatch) {
    const used = parseFloat(progressMatch[1] as string);
    const included = parseFloat(progressMatch[2] as string);
    return {
      used: isFinite(used) ? used : null,
      included: isFinite(included) ? included : null,
    };
  }

  // Strategy 2: "N,NNN of N,NNN" text pattern
  const ofPattern = new RegExp(
    `${kwEsc}[\\s\\S]{0,3000}?(\\d[\\d,]*(?:\\.\\d+)?)\\s+of\\s+(\\d[\\d,]*(?:\\.\\d+)?)`,
    "i",
  );
  const ofMatch = ofPattern.exec(html);
  if (ofMatch) {
    return {
      used: parseUsageNumber(ofMatch[1] as string),
      included: parseUsageNumber(ofMatch[2] as string),
    };
  }

  // Strategy 3: first bare number after keyword
  const usedOnlyPattern = new RegExp(
    `${kwEsc}[\\s\\S]{0,3000}?>(\\d[\\d,]*(?:\\.\\d+)?)<`,
    "i",
  );
  const usedOnlyMatch = usedOnlyPattern.exec(html);
  if (usedOnlyMatch) {
    return {
      used: parseUsageNumber(usedOnlyMatch[1] as string),
      included: null,
    };
  }

  return { used: null, included: null };
}

/**
 * Extract Copilot seat count from billing HTML.
 * Returns null when Copilot is not listed on the page.
 */
export function extractCopilotSeats(html: string): number | null {
  const pattern = /Copilot[\s\S]{0,2000}?(\d+)\s*(?:active\s+)?seat/i;
  const match = pattern.exec(html);
  if (!match) return null;
  const val = parseInt(match[1] as string, 10);
  return isFinite(val) ? val : null;
}

/**
 * Extract h2/h3 headings from billing page HTML for diagnostics.
 */
export function extractBillingHeadings(html: string): string[] {
  const headings: string[] = [];
  const pattern = /<h[23]\b[^>]*>([\s\S]*?)<\/h[23]>/gi;
  for (const [, inner] of html.matchAll(pattern)) {
    if (inner == null) continue;
    const text = inner.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    if (text) headings.push(text);
  }
  return headings;
}

/**
 * Returns true when the page indicates the user lacks billing access.
 * GitHub redirects to /404 or /login, or renders a permission-denied message.
 */
export function detectPermissionDenied(html: string, pageUrl: string): boolean {
  if (/^https?:\/\/github\.com\/404/.test(pageUrl) || /^https?:\/\/github\.com\/login/.test(pageUrl)) return true;
  if (/you don['\u2019]t have (permission|access)/i.test(html)) return true;
  if (/not (authorized|permitted) to (view|access|manage) billing/i.test(html)) return true;
  return false;
}

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

/**
 * Read GitHub org billing usage data via authenticated Playwright session.
 *
 * Read-only: navigates to the billing summary page, extracts usage numbers,
 * returns structured data. Never modifies billing settings or plan.
 *
 * @throws BillingPermissionError when the authenticated user lacks billing access.
 */
export async function readOrgBilling(
  org: string,
  options: BillingReaderOptions = {},
): Promise<OrgBillingData> {
  const billingUrl = `https://github.com/organizations/${org}/settings/billing/summary`;

  return withGitHubSession(async (session) => {
    await session.page.goto(billingUrl, { waitUntil: "domcontentloaded", timeout: 30_000 });

    const finalUrl = session.page.url();
    const html = await session.page.content();

    if (detectPermissionDenied(html, finalUrl)) {
      throw new BillingPermissionError(org);
    }

    return {
      org,
      url: finalUrl,
      timestamp: new Date().toISOString(),
      actions: extractUsageMetric(html, "Actions"),
      packages: extractUsageMetric(html, "Packages"),
      codespaces: extractUsageMetric(html, "Codespaces"),
      copilotSeats: extractCopilotSeats(html),
      rawHeadings: extractBillingHeadings(html),
    };
  }, options);
}
