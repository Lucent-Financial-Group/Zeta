import { withGitHubSession, type GitHubSession } from "./auth";

/**
 * Snapshot result for a GitHub read-only page.
 * Bounded slice: types + stub; full extraction in follow-up.
 */
export interface GitHubPageSnapshot {
  url: string;
  timestamp: string;
  username: string;
  extracted: {
    toggles: Record<string, boolean>;
    formValues: Record<string, string>;
    visibleFeatures: string[];
  };
  rawSnapshotRef?: string;
}

export interface SnapshotOptions {
  /** Optional custom extractors for page-specific patterns. */
  extractors?: Partial<{
    toggles: (page: GitHubSession["page"]) => Promise<Record<string, boolean>>;
    formValues: (page: GitHubSession["page"]) => Promise<Record<string, string>>;
    features: (page: GitHubSession["page"]) => Promise<string[]>;
  }>;
}

/**
 * Navigate to GitHub URL using authenticated session and capture read-only snapshot.
 * Read-only: no state changes, no submissions.
 */
export async function snapshotGitHubPage(
  targetUrl: string,
  options: SnapshotOptions = {},
): Promise<GitHubPageSnapshot> {
  return withGitHubSession(async (session: GitHubSession) => {
    await session.page.goto(targetUrl, { waitUntil: "domcontentloaded", timeout: 30_000 });

    // Stub extraction for smallest safe slice (B-0318 first step).
    // Real DOM snapshot + structured extract follows in next bounded slice.
    const extracted = {
      toggles: {},
      formValues: {},
      visibleFeatures: [],
    };

    return {
      url: session.page.url(),
      timestamp: new Date().toISOString(),
      username: session.username,
      extracted,
    };
  }, options as any);
}
