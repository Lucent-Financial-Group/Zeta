#!/usr/bin/env bun
/**
 * B-0414: Generate demo/metrics.json from GitHub API.
 *
 * Called by the autonomous loop on each tick. Produces a static
 * JSON file that both the HTML dashboard and agents can read
 * without hitting the GitHub API directly.
 *
 * Usage:
 *   bun tools/dashboard/generate-metrics.ts
 *
 * Output:
 *   demo/metrics.json (overwritten each run)
 */

const OWNER = "Lucent-Financial-Group";
const REPO = "Zeta";
const API = `https://api.github.com/repos/${OWNER}/${REPO}`;

type GitHubCommit = {
  sha: string;
  commit: {
    message: string;
    author: {
      name?: string;
      date: string;
    };
  };
};

type GitHubPullRequest = {
  number: number;
  title: string;
  created_at: string;
  merged_at: string | null;
};

type MergedPullRequest = GitHubPullRequest & { merged_at: string };

const AGENT_MAP: Record<string, { harness: string; patterns: string[] }> = {
  Otto: { harness: "Claude Code", patterns: ["Co-Authored-By: Claude"] },
  Alexa: { harness: "Kiro/Qwen", patterns: ["kiro", "alexa", "qwen"] },
  Lior: { harness: "Gemini/Antigravity", patterns: ["lior", "gemini"] },
  Vera: { harness: "Codex IDE", patterns: ["codex", "vera"] },
  Riven: { harness: "Cursor/Grok", patterns: ["riven", "grok"] },
  Aaron: { harness: "Human", patterns: ["Aaron Stainback", "AceHack"] },
};

async function apiFetch<T>(url: string): Promise<T> {
  const token = process.env.GITHUB_TOKEN;
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  const resp = await fetch(url, { headers });
  if (!resp.ok) throw new Error(`${resp.status} ${resp.statusText}: ${url}`);
  return (await resp.json()) as T;
}

function detectAgent(commit: GitHubCommit): string {
  const msg = commit.commit?.message ?? "";
  const author = commit.commit?.author?.name ?? "";
  for (const [name, info] of Object.entries(AGENT_MAP)) {
    if (info.patterns.some((p) => msg.includes(p) || author.includes(p))) {
      return name;
    }
  }
  return author.split(" ")[0] || "Unknown";
}

function timeAgo(date: string): string {
  const mins = Math.floor((Date.now() - new Date(date).getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function mergedWithin(dateNow: number, windowMs: number) {
  return (pr: GitHubPullRequest): pr is MergedPullRequest =>
    pr.merged_at !== null && dateNow - new Date(pr.merged_at).getTime() < windowMs;
}

// maxPages is a safety cap bounding worst-case GitHub API request
// volume per tick. Default 10 = up to 1000 closed PRs. Typical-case
// is 1-2 requests because early-stop fires when (a) batch is empty,
// (b) batch < 100 items (no more pages), or (c) oldest item in batch
// predates the window cutoff. Cap protects pathological cases (e.g.
// high-churn period where every PR stays "recently updated") without
// leaving the loop unbounded. Per Copilot P1 on PR #2766.
async function fetchClosedPRsUntilWindow(
  windowMs: number,
  maxPages = 10,
): Promise<GitHubPullRequest[]> {
  const all: GitHubPullRequest[] = [];
  const cutoff = Date.now() - windowMs;
  for (let page = 1; page <= maxPages; page++) {
    const batch = await apiFetch<Array<GitHubPullRequest & { updated_at?: string }>>(
      `${API}/pulls?state=closed&sort=updated&direction=desc&per_page=100&page=${page}`,
    );
    if (batch.length === 0) break;
    all.push(...batch);
    if (batch.length < 100) break;
    const lastUpdated = batch[batch.length - 1];
    if (!lastUpdated) break;
    const lastUpdatedAt = new Date(lastUpdated.updated_at ?? lastUpdated.merged_at ?? 0).getTime();
    if (lastUpdatedAt < cutoff) break;
  }
  return all;
}

async function main() {
  const [commits, openPRs, closedPRs] = await Promise.all([
    apiFetch<GitHubCommit[]>(`${API}/commits?per_page=100`),
    apiFetch<GitHubPullRequest[]>(`${API}/pulls?state=open&per_page=100`),
    fetchClosedPRsUntilWindow(24 * 60 * 60 * 1000),
  ]);

  const now = Date.now();
  const h24 = 24 * 60 * 60 * 1000;
  const h1 = 60 * 60 * 1000;
  const commits24h = commits.filter((c) => now - new Date(c.commit.author.date).getTime() < h24);
  const commits1h = commits.filter((c) => now - new Date(c.commit.author.date).getTime() < h1);
  // Sort merged-in-window by merged_at desc once — downstream consumers
  // (last_merge, recent_merged) all read from the sorted view. GitHub
  // /pulls?sort=updated does NOT guarantee merged_at order (label/comment
  // updates can leapfrog older-but-more-recently-merged PRs). Copilot P0
  // on PR #2766 + P1 follow-up that recent_merged still used unsorted.
  const mergedToday = (closedPRs.filter(mergedWithin(now, h24)) as MergedPullRequest[])
    .sort((a, b) => new Date(b.merged_at).getTime() - new Date(a.merged_at).getTime());
  const mergedLastHour = mergedToday.filter(mergedWithin(now, h1));
  const lastMerged = mergedToday[0] ?? null;

  let avgLeadTimeMinutes: number | null = null;
  if (mergedToday.length > 0) {
    const totalMins = mergedToday.reduce((sum, pr) => {
      return sum + (new Date(pr.merged_at).getTime() - new Date(pr.created_at).getTime()) / 60000;
    }, 0);
    avgLeadTimeMinutes = Math.round(totalMins / mergedToday.length);
  }

  const agentActivity: Record<string, { lastCommit: string; count: number; harness: string }> = {};
  for (const c of commits) {
    const agent = detectAgent(c);
    if (!agentActivity[agent]) {
      agentActivity[agent] = {
        lastCommit: c.commit.author.date,
        count: 0,
        harness: AGENT_MAP[agent]?.harness || "Unknown",
      };
    }
    agentActivity[agent].count++;
  }

  const activeAgents = Object.values(agentActivity).filter((a) => now - new Date(a.lastCommit).getTime() < h24).length;

  const agents = Object.entries(agentActivity)
    .sort((a, b) => new Date(b[1].lastCommit).getTime() - new Date(a[1].lastCommit).getTime())
    .map(([name, info]) => ({
      name,
      harness: info.harness,
      commits: info.count,
      lastCommit: info.lastCommit,
      lastCommitAgo: timeAgo(info.lastCommit),
      status:
        now - new Date(info.lastCommit).getTime() < 30 * 60000
          ? "active"
          : now - new Date(info.lastCommit).getTime() < 6 * 60 * 60000
            ? "recent"
            : "stale",
    }));

  const prQueue = openPRs.slice(0, 10).map((pr) => ({
    number: pr.number,
    title: pr.title,
    createdAgo: timeAgo(pr.created_at),
    state: "open",
  }));

  const recentMerged = mergedToday.slice(0, 5).map((pr) => ({
    number: pr.number,
    title: pr.title,
    mergedAgo: timeAgo(pr.merged_at),
    state: "merged",
  }));

  const recentCommits = commits.slice(0, 20).map((c) => ({
    sha: c.sha.substring(0, 7),
    message: c.commit.message.split("\n")[0],
    agent: detectAgent(c),
    date: c.commit.author.date,
    dateAgo: timeAgo(c.commit.author.date),
  }));

  const metrics = {
    generated: new Date().toISOString(),
    schema_version: "0.1.0",
    metrics: {
      prs_merged_24h: mergedToday.length,
      prs_merged_1h: mergedLastHour.length,
      avg_lead_time_minutes: avgLeadTimeMinutes,
      open_prs: openPRs.length,
      last_merge: lastMerged?.merged_at ?? null,
      last_merge_ago: lastMerged ? timeAgo(lastMerged.merged_at) : "none",
      commits_24h: commits24h.length,
      commits_1h: commits1h.length,
      active_agents: activeAgents,
      consecutive_days_operational: null,
      verification_gate_pass_rate: null,
      promotion_rate_mirror_to_beacon: null,
    },
    agents,
    pr_queue: [...prQueue, ...recentMerged],
    recent_commits: recentCommits,
  };

  const outPath = "demo/metrics.json";
  await Bun.write(outPath, JSON.stringify(metrics, null, 2));
  console.log(
    `Wrote ${outPath}: ${mergedToday.length} PRs merged, ${commits24h.length} commits, ${activeAgents} active agents`,
  );
}

if (import.meta.main) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}

export { main };
