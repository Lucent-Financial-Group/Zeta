#!/usr/bin/env bun
// archive-pr-reviews.ts -- git-native PR-review archive (Phase 2 prototype).
//
// Phase 2 of the 5-phase plan named in
// memory/project_git_native_pr_review_archive_high_signal_training_data_for_reviewer_tuning_2026_04_23.md
// (Aaron 2026-04-23 Otto-57). Phases:
//   1. research doc        -- the memory file itself (DONE)
//   2. prototype tool      -- THIS FILE
//   3. first-run baseline  -- archive every merged PR (OWED)
//   4. cadence             -- post-merge hook / weekly cron (OWED)
//   5. training pipeline   -- DEFERRED, separate L/XL arc
//
// Why now: Aaron 2026-05-05 -- the 60+ PR review threads + 30 substantive
// resolutions + reviewer comments are high-quality AI training data living
// ONLY on GitHub. Host-durable-not-git-canonical risk per CLAUDE.md
// substrate-or-it-didn't-happen rule. This tool converts that host-only
// substrate into committed git-canonical markdown under
// docs/history/pr-reviews/.
//
// Rule 0 (TS-only, bash for install-graph only): TypeScript+Bun, matches
// tools/github/poll-pr-gate.ts pattern.
//
// Usage:
//   bun tools/archive/archive-pr-reviews.ts <PR_NUMBER>
//   bun tools/archive/archive-pr-reviews.ts <PR_NUMBER> --owner X --repo Y
//   bun tools/archive/archive-pr-reviews.ts --all-merged --since=YYYY-MM-DD
//
// Output: markdown files at
//   docs/history/pr-reviews/PR-<NUMBER>-<slug>.md
// (creates the directory tree if absent).
//
// Schema (matching the memory file's "Schema dimensions" section):
//   - PR metadata: number, title, author, created-at, merged-at,
//     merge-commit-SHA, branch
//   - Review threads: per-thread ID, author (agent vs. human),
//     initial-comment body, all-replies, final-state (resolved / unresolved)
//   - Fix commits touching the threads' file paths: SHA + message
//   - Outcome bits: did the PR merge, was it re-reviewed post-fix
//
// Exit codes:
//   0 -- success, markdown written
//   1 -- invocation / argument / dependency error
//   2 -- gh CLI returned non-zero
//   3 -- gh CLI output couldn't be parsed
//   4 -- file write error

import { spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

// ---------------------------------------------------------------------------
// Types -- matching the memory file's "Schema dimensions" exactly.
// ---------------------------------------------------------------------------

export interface PRMetadata {
  number: number;
  title: string;
  author: string;
  authorIsBot: boolean;
  createdAt: string;
  mergedAt: string | null;
  mergeCommitSha: string | null;
  branch: string;
  baseBranch: string;
  state: "OPEN" | "MERGED" | "CLOSED";
  body: string;
  url: string;
  changedFiles: number;
  additions: number;
  deletions: number;
}

export interface ReviewComment {
  id: number;
  nodeId: string;
  author: string;
  authorIsBot: boolean;
  authorAssociation: string;
  createdAt: string;
  updatedAt: string;
  body: string;
  /** Diff hunk anchor for the comment (for inline review comments). */
  diffHunk?: string;
  /** Path the comment is anchored to (for inline review comments). */
  path?: string;
  /** Line number anchored to in the diff (for inline review comments). */
  line?: number;
  /** Top-level comment id this reply is under, if any. */
  inReplyToId?: number;
}

export interface ReviewThread {
  /** Synthesized thread id: top-level comment node-id of the thread root. */
  threadId: string;
  /** Path the thread is anchored to (if anchored to code). */
  path: string | null;
  /** Initial comment body + author + timestamp. */
  initialComment: ReviewComment;
  /** All replies under the thread root, ordered chronologically. */
  replies: ReviewComment[];
  /** Final resolution state. */
  resolved: boolean | null; // null when API didn't surface state
  /** Set when GitHub's reviewThreads GraphQL surfaced the thread. */
  isOutdated?: boolean;
  /** Set when GitHub's reviewThreads GraphQL surfaced the thread. */
  isCollapsed?: boolean;
}

export interface FixCommit {
  sha: string;
  message: string;
  author: string;
  committedAt: string;
  /** Files touched by this commit, intersection with files-with-threads. */
  touchedFiles: string[];
}

export interface OutcomeBits {
  merged: boolean;
  rereviewedPostFix: boolean;
  totalThreads: number;
  resolvedThreads: number;
  unresolvedThreads: number;
  totalReviewComments: number;
  totalFixCommits: number;
}

export interface PRReviewArchive {
  metadata: PRMetadata;
  threads: ReviewThread[];
  fixCommits: FixCommit[];
  outcome: OutcomeBits;
  /** Schema version of this archive shape -- bump if the schema changes. */
  schemaVersion: 1;
  /** UTC timestamp this archive was generated. */
  generatedAt: string;
}

// ---------------------------------------------------------------------------
// gh shell-out helpers (mirroring tools/github/poll-pr-gate.ts).
// ---------------------------------------------------------------------------

const SPAWN_MAX_BUFFER = 64 * 1024 * 1024; // 64 MiB -- review-heavy PRs

function runGhOrExit(args: string[], context: string): string {
  // eslint-disable-next-line sonarjs/no-os-command-from-path -- gh is a
  // standard CI/dev dependency invoked by name.
  const result = spawnSync("gh", args, {
    encoding: "utf8",
    maxBuffer: SPAWN_MAX_BUFFER,
  });
  if (result.error) {
    process.stderr.write(`${context}: failed to launch gh: ${result.error.message}\n`);
    process.exit(1);
  }
  if (result.status !== 0) {
    process.stderr.write(
      `${context}: gh exited ${result.status}: ${result.stderr || result.stdout}\n`,
    );
    process.exit(2);
  }
  return result.stdout;
}

/**
 * Split a concatenation of top-level JSON values (objects or arrays) emitted
 * by `gh api --paginate` into individual JSON strings.
 *
 * `gh api --paginate` does NOT delimit pages -- for raw graphql it emits
 * `{...}{...}{...}` back-to-back; for REST endpoints returning arrays it
 * emits `[...][...][...]`. Both must be split on top-level boundaries
 * (depth-0 closing brace/bracket immediately followed by an opening one),
 * being careful not to split inside string literals.
 */
function splitConcatenatedJson(raw: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let inString = false;
  let escape = false;
  let start = -1;
  for (let i = 0; i < raw.length; i++) {
    const ch = raw[i]!;
    if (inString) {
      if (escape) {
        escape = false;
      } else if (ch === "\\") {
        escape = true;
      } else if (ch === '"') {
        inString = false;
      }
      continue;
    }
    if (ch === '"') {
      inString = true;
      continue;
    }
    if (ch === "{" || ch === "[") {
      if (depth === 0) start = i;
      depth++;
      continue;
    }
    if (ch === "}" || ch === "]") {
      depth--;
      if (depth === 0 && start >= 0) {
        out.push(raw.slice(start, i + 1));
        start = -1;
      }
    }
  }
  return out;
}

function parseJsonOrExit<T>(raw: string, context: string): T {
  try {
    return JSON.parse(raw) as T;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    process.stderr.write(`${context}: JSON parse error: ${msg}\n`);
    process.stderr.write(`first 200 bytes of output: ${raw.slice(0, 200)}\n`);
    process.exit(3);
  }
}

// ---------------------------------------------------------------------------
// PR data fetching
// ---------------------------------------------------------------------------

interface RawPRView {
  number: number;
  title: string;
  state: string;
  body: string;
  author: { login: string; is_bot?: boolean; isBot?: boolean };
  createdAt: string;
  mergedAt: string | null;
  mergeCommit: { oid: string } | null;
  headRefName: string;
  baseRefName: string;
  url: string;
  changedFiles: number;
  additions: number;
  deletions: number;
}

function fetchPRMetadata(owner: string, repo: string, number: number): PRMetadata {
  const out = runGhOrExit(
    [
      "pr",
      "view",
      String(number),
      "--repo",
      `${owner}/${repo}`,
      "--json",
      "number,title,state,body,author,createdAt,mergedAt,mergeCommit,headRefName,baseRefName,url,changedFiles,additions,deletions",
    ],
    "fetchPRMetadata",
  );
  const raw = parseJsonOrExit<RawPRView>(out, "fetchPRMetadata");
  const isBot = Boolean(raw.author?.is_bot ?? raw.author?.isBot);
  return {
    number: raw.number,
    title: raw.title,
    author: raw.author?.login ?? "(unknown)",
    authorIsBot: isBot,
    createdAt: raw.createdAt,
    mergedAt: raw.mergedAt,
    mergeCommitSha: raw.mergeCommit?.oid ?? null,
    branch: raw.headRefName,
    baseBranch: raw.baseRefName,
    state: raw.state as PRMetadata["state"],
    body: raw.body ?? "",
    url: raw.url,
    changedFiles: raw.changedFiles,
    additions: raw.additions,
    deletions: raw.deletions,
  };
}

// REST review-comments endpoint -- gives us full bodies + diffHunk + replies.
interface RestReviewComment {
  id: number;
  node_id: string;
  user: { login: string; type: string };
  author_association: string;
  created_at: string;
  updated_at: string;
  body: string;
  diff_hunk?: string;
  path?: string;
  line?: number | null;
  original_line?: number | null;
  in_reply_to_id?: number;
}

function fetchReviewComments(
  owner: string,
  repo: string,
  number: number,
): RestReviewComment[] {
  // Paginate with `gh api --paginate` so review-heavy PRs (60+) all come
  // through. The endpoint returns a flat array per page.
  const out = runGhOrExit(
    [
      "api",
      "--paginate",
      `repos/${owner}/${repo}/pulls/${number}/comments`,
    ],
    "fetchReviewComments",
  );
  // gh --paginate concatenates page arrays back-to-back without delimiter.
  // Split into individual JSON values then flatten.
  const pages = splitConcatenatedJson(out);
  const all: RestReviewComment[] = [];
  for (const page of pages) {
    if (!page.trim()) continue;
    const parsed = parseJsonOrExit<RestReviewComment[]>(page, "fetchReviewComments.page");
    all.push(...parsed);
  }
  return all;
}

// GraphQL reviewThreads -- gives us thread-level resolved/outdated state.
interface RawReviewThreadsPage {
  data?: {
    repository?: {
      pullRequest?: {
        reviewThreads?: {
          pageInfo: { hasNextPage: boolean; endCursor: string | null };
          nodes: Array<{
            id: string;
            isResolved: boolean;
            isOutdated: boolean;
            isCollapsed: boolean;
            path: string | null;
            comments: {
              nodes: Array<{
                databaseId: number;
                id: string;
              }>;
            };
          }>;
        };
      };
    };
  };
}

interface ReviewThreadGraphQL {
  id: string;
  isResolved: boolean;
  isOutdated: boolean;
  isCollapsed: boolean;
  path: string | null;
  rootCommentDatabaseId: number | null;
  rootCommentNodeId: string | null;
  allCommentDatabaseIds: number[];
}

function fetchReviewThreadStates(
  owner: string,
  repo: string,
  number: number,
): ReviewThreadGraphQL[] {
  const out = runGhOrExit(
    [
      "api",
      "graphql",
      "--paginate",
      "-f",
      `query=query($o:String!,$r:String!,$n:Int!,$endCursor:String){repository(owner:$o,name:$r){pullRequest(number:$n){reviewThreads(first:50,after:$endCursor){pageInfo{hasNextPage endCursor}nodes{id isResolved isOutdated isCollapsed path comments(first:100){nodes{databaseId id}}}}}}}`,
      "-F",
      `o=${owner}`,
      "-F",
      `r=${repo}`,
      "-F",
      `n=${number}`,
    ],
    "fetchReviewThreadStates",
  );
  // gh api graphql --paginate concatenates JSON documents back-to-back
  // (no delimiter, no newline). Use a streaming parser that tracks brace
  // depth + string state to slice each top-level JSON object.
  const pages = splitConcatenatedJson(out);
  const threads: ReviewThreadGraphQL[] = [];
  for (const page of pages) {
    if (!page.trim()) continue;
    const parsed = parseJsonOrExit<RawReviewThreadsPage>(
      page,
      "fetchReviewThreadStates.page",
    );
    const nodes = parsed.data?.repository?.pullRequest?.reviewThreads?.nodes ?? [];
    for (const node of nodes) {
      const commentDbIds = (node.comments?.nodes ?? [])
        .map((c) => c.databaseId)
        .filter((id): id is number => typeof id === "number");
      const rootDbId = commentDbIds[0] ?? null;
      const rootNodeId = node.comments?.nodes?.[0]?.id ?? null;
      threads.push({
        id: node.id,
        isResolved: node.isResolved,
        isOutdated: node.isOutdated,
        isCollapsed: node.isCollapsed,
        path: node.path,
        rootCommentDatabaseId: rootDbId,
        rootCommentNodeId: rootNodeId,
        allCommentDatabaseIds: commentDbIds,
      });
    }
  }
  return threads;
}

// ---------------------------------------------------------------------------
// Thread reconstruction
// ---------------------------------------------------------------------------

function toReviewComment(raw: RestReviewComment): ReviewComment {
  const out: ReviewComment = {
    id: raw.id,
    nodeId: raw.node_id,
    author: raw.user?.login ?? "(unknown)",
    authorIsBot: raw.user?.type === "Bot",
    authorAssociation: raw.author_association ?? "NONE",
    createdAt: raw.created_at,
    updatedAt: raw.updated_at,
    body: raw.body ?? "",
  };
  if (raw.diff_hunk !== undefined) out.diffHunk = raw.diff_hunk;
  if (raw.path !== undefined) out.path = raw.path;
  const line = raw.line ?? raw.original_line;
  if (typeof line === "number") out.line = line;
  if (raw.in_reply_to_id !== undefined) out.inReplyToId = raw.in_reply_to_id;
  return out;
}

function buildThreads(
  comments: RestReviewComment[],
  threadStates: ReviewThreadGraphQL[],
): ReviewThread[] {
  const byId = new Map<number, RestReviewComment>();
  for (const c of comments) byId.set(c.id, c);

  // Each GraphQL thread has its own comment-id list. Use that as ground truth
  // -- it groups REST comments correctly even when in_reply_to_id is sparse.
  const threads: ReviewThread[] = [];
  for (const ts of threadStates) {
    const ids = ts.allCommentDatabaseIds;
    if (ids.length === 0) continue;
    const root = byId.get(ids[0]!);
    if (!root) continue;
    const replies: ReviewComment[] = [];
    for (let i = 1; i < ids.length; i++) {
      const replyRaw = byId.get(ids[i]!);
      if (replyRaw) replies.push(toReviewComment(replyRaw));
    }
    threads.push({
      threadId: ts.id,
      path: ts.path,
      initialComment: toReviewComment(root),
      replies,
      resolved: ts.isResolved,
      isOutdated: ts.isOutdated,
      isCollapsed: ts.isCollapsed,
    });
  }

  // Some review comments may be issue-level (not anchored to a reviewThread,
  // e.g., top-level review summaries posted as issue comments). The REST
  // /pulls/N/comments endpoint only returns inline review comments, so any
  // unmatched ID here represents a thread the GraphQL query missed -- fall
  // back to in_reply_to_id grouping.
  const claimed = new Set<number>();
  for (const ts of threadStates) {
    for (const id of ts.allCommentDatabaseIds) claimed.add(id);
  }
  const unclaimed = comments.filter((c) => !claimed.has(c.id));
  // Group unclaimed comments by reply-chain root.
  const rootIdFor = (c: RestReviewComment): number => {
    let cur: RestReviewComment | undefined = c;
    const seen = new Set<number>();
    while (cur && cur.in_reply_to_id !== undefined && !seen.has(cur.id)) {
      seen.add(cur.id);
      const next = byId.get(cur.in_reply_to_id);
      if (!next) break;
      cur = next;
    }
    return cur?.id ?? c.id;
  };
  const fallbackGroups = new Map<number, RestReviewComment[]>();
  for (const c of unclaimed) {
    const root = rootIdFor(c);
    const arr = fallbackGroups.get(root) ?? [];
    arr.push(c);
    fallbackGroups.set(root, arr);
  }
  for (const [rootId, group] of fallbackGroups) {
    group.sort((a, b) => a.created_at.localeCompare(b.created_at));
    const root = group.find((c) => c.id === rootId) ?? group[0]!;
    const replies = group.filter((c) => c.id !== root.id).map(toReviewComment);
    threads.push({
      threadId: `fallback-${root.node_id}`,
      path: root.path ?? null,
      initialComment: toReviewComment(root),
      replies,
      resolved: null, // unknown -- not surfaced via reviewThreads GraphQL
    });
  }

  // Sort threads by creation time of the initial comment.
  threads.sort((a, b) =>
    a.initialComment.createdAt.localeCompare(b.initialComment.createdAt),
  );
  return threads;
}

// ---------------------------------------------------------------------------
// Fix commits touching thread file paths
// ---------------------------------------------------------------------------

interface RawCommit {
  oid: string;
  messageHeadline: string;
  messageBody?: string;
  authoredDate: string;
  authors: Array<{ login?: string; name?: string }>;
}

interface RawCommitFiles {
  sha: string;
  commit: { message: string; author: { date: string; name: string; email: string } };
  files?: Array<{ filename: string }>;
}

function fetchFixCommits(
  owner: string,
  repo: string,
  number: number,
  threadPaths: Set<string>,
): FixCommit[] {
  // Pull commit list via gh pr view.
  const out = runGhOrExit(
    [
      "pr",
      "view",
      String(number),
      "--repo",
      `${owner}/${repo}`,
      "--json",
      "commits",
    ],
    "fetchFixCommits.commits",
  );
  const parsed = parseJsonOrExit<{ commits: RawCommit[] }>(
    out,
    "fetchFixCommits.commits",
  );
  const commits = parsed.commits ?? [];
  const fixCommits: FixCommit[] = [];
  for (const c of commits) {
    // Get files for this commit via the REST commits endpoint.
    const fOut = runGhOrExit(
      ["api", `repos/${owner}/${repo}/commits/${c.oid}`],
      "fetchFixCommits.files",
    );
    const fParsed = parseJsonOrExit<RawCommitFiles>(fOut, "fetchFixCommits.files");
    const files = (fParsed.files ?? []).map((f) => f.filename);
    const intersect = files.filter((f) => threadPaths.has(f));
    if (intersect.length === 0) continue;
    const author =
      c.authors?.[0]?.login ?? c.authors?.[0]?.name ?? "(unknown)";
    fixCommits.push({
      sha: c.oid,
      message: c.messageHeadline +
        (c.messageBody && c.messageBody.length > 0 ? `\n\n${c.messageBody}` : ""),
      author,
      committedAt: c.authoredDate,
      touchedFiles: intersect,
    });
  }
  return fixCommits;
}

// ---------------------------------------------------------------------------
// Markdown rendering
// ---------------------------------------------------------------------------

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function escapeMarkdown(s: string): string {
  // Body content is preserved as-is inside fenced blocks elsewhere; this is
  // only used for short metadata lines where we want to neutralise pipe and
  // angle-bracket interactions. Keep it conservative.
  return s.replace(/\|/g, "\\|");
}

function authorTag(author: string, isBot: boolean): string {
  return isBot ? `\`${author}\` (bot)` : `\`${author}\` (human)`;
}

function renderComment(c: ReviewComment, depth: number): string {
  const indent = depth === 0 ? "" : "  ".repeat(depth);
  const header = `${indent}- **${authorTag(c.author, c.authorIsBot)}** at ${c.createdAt}` +
    (c.path ? ` on \`${c.path}\`${c.line ? `:${c.line}` : ""}` : "") +
    ` (association: ${c.authorAssociation})`;
  // Indent body lines so list-nesting holds in markdown.
  const bodyIndent = indent + "  ";
  const bodyLines = (c.body || "(empty)").split("\n").map((l) => `${bodyIndent}${l}`);
  return [header, ...bodyLines].join("\n");
}

function renderThread(t: ReviewThread, idx: number): string {
  const status = t.resolved === null
    ? "unknown"
    : t.resolved
      ? "resolved"
      : "unresolved";
  const flags: string[] = [];
  if (t.isOutdated) flags.push("outdated");
  if (t.isCollapsed) flags.push("collapsed");
  const flagSuffix = flags.length > 0 ? ` [${flags.join(", ")}]` : "";
  const lines: string[] = [];
  lines.push(`### Thread ${idx + 1} -- ${status}${flagSuffix}`);
  lines.push("");
  lines.push(`- **Thread ID**: \`${t.threadId}\``);
  if (t.path) lines.push(`- **Path**: \`${t.path}\``);
  lines.push(`- **Replies**: ${t.replies.length}`);
  lines.push("");
  lines.push("**Initial comment:**");
  lines.push("");
  lines.push(renderComment(t.initialComment, 0));
  if (t.replies.length > 0) {
    lines.push("");
    lines.push("**Replies:**");
    lines.push("");
    for (const reply of t.replies) {
      lines.push(renderComment(reply, 1));
    }
  }
  lines.push("");
  return lines.join("\n");
}

function renderArchive(a: PRReviewArchive): string {
  const m = a.metadata;
  const lines: string[] = [];
  lines.push(`# PR #${m.number} -- ${m.title}`);
  lines.push("");
  lines.push("> Git-native PR-review archive (Phase 2 prototype). Generated by");
  lines.push("> `tools/archive/archive-pr-reviews.ts`. Schema version: " + a.schemaVersion + ".");
  lines.push(`> Generated at: ${a.generatedAt}.`);
  lines.push("");
  lines.push("## Metadata");
  lines.push("");
  lines.push("| Field | Value |");
  lines.push("|---|---|");
  lines.push(`| Number | ${m.number} |`);
  lines.push(`| Title | ${escapeMarkdown(m.title)} |`);
  lines.push(`| Author | ${authorTag(m.author, m.authorIsBot)} |`);
  lines.push(`| State | ${m.state} |`);
  lines.push(`| Created at | ${m.createdAt} |`);
  lines.push(`| Merged at | ${m.mergedAt ?? "(not merged)"} |`);
  lines.push(`| Merge commit SHA | ${m.mergeCommitSha ? `\`${m.mergeCommitSha}\`` : "(none)"} |`);
  lines.push(`| Branch | \`${m.branch}\` |`);
  lines.push(`| Base branch | \`${m.baseBranch}\` |`);
  lines.push(`| URL | ${m.url} |`);
  lines.push(`| Changed files | ${m.changedFiles} |`);
  lines.push(`| Additions / deletions | +${m.additions} / -${m.deletions} |`);
  lines.push("");
  lines.push("## Description");
  lines.push("");
  lines.push(m.body || "(empty)");
  lines.push("");
  lines.push("## Outcome");
  lines.push("");
  lines.push("| Field | Value |");
  lines.push("|---|---|");
  lines.push(`| Merged | ${a.outcome.merged} |`);
  lines.push(`| Re-reviewed post-fix | ${a.outcome.rereviewedPostFix} |`);
  lines.push(`| Total threads | ${a.outcome.totalThreads} |`);
  lines.push(`| Resolved threads | ${a.outcome.resolvedThreads} |`);
  lines.push(`| Unresolved threads | ${a.outcome.unresolvedThreads} |`);
  lines.push(`| Total review comments | ${a.outcome.totalReviewComments} |`);
  lines.push(`| Total fix commits (touching thread paths) | ${a.outcome.totalFixCommits} |`);
  lines.push("");
  lines.push("## Review threads");
  lines.push("");
  if (a.threads.length === 0) {
    lines.push("(no review threads on this PR)");
    lines.push("");
  } else {
    for (let i = 0; i < a.threads.length; i++) {
      lines.push(renderThread(a.threads[i]!, i));
    }
  }
  lines.push("## Fix commits (touching thread paths)");
  lines.push("");
  if (a.fixCommits.length === 0) {
    lines.push("(no commits in this PR touched files anchored by review threads)");
    lines.push("");
  } else {
    for (const c of a.fixCommits) {
      lines.push(`### \`${c.sha}\` -- ${c.committedAt} -- \`${c.author}\``);
      lines.push("");
      lines.push("**Touched files (intersect with thread paths):**");
      lines.push("");
      for (const f of c.touchedFiles) lines.push(`- \`${f}\``);
      lines.push("");
      lines.push("**Message:**");
      lines.push("");
      lines.push("```");
      lines.push(c.message);
      lines.push("```");
      lines.push("");
    }
  }
  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// Build archive
// ---------------------------------------------------------------------------

function buildOutcome(
  meta: PRMetadata,
  threads: ReviewThread[],
  fixCommits: FixCommit[],
  reviewComments: RestReviewComment[],
): OutcomeBits {
  const resolvedThreads = threads.filter((t) => t.resolved === true).length;
  const unresolvedThreads = threads.filter((t) => t.resolved === false).length;
  // Heuristic: re-reviewed post-fix iff at least one fix commit predates a
  // review comment (i.e., a comment exists timestamped after a fix commit).
  let rereviewed = false;
  if (fixCommits.length > 0 && reviewComments.length > 0) {
    const lastFixAt = fixCommits
      .map((c) => c.committedAt)
      .sort()
      .pop()!;
    rereviewed = reviewComments.some((c) => c.created_at > lastFixAt);
  }
  return {
    merged: meta.state === "MERGED",
    rereviewedPostFix: rereviewed,
    totalThreads: threads.length,
    resolvedThreads,
    unresolvedThreads,
    totalReviewComments: reviewComments.length,
    totalFixCommits: fixCommits.length,
  };
}

export function buildArchive(
  owner: string,
  repo: string,
  number: number,
): PRReviewArchive {
  const metadata = fetchPRMetadata(owner, repo, number);
  const reviewComments = fetchReviewComments(owner, repo, number);
  const threadStates = fetchReviewThreadStates(owner, repo, number);
  const threads = buildThreads(reviewComments, threadStates);
  const threadPaths = new Set<string>();
  for (const t of threads) {
    if (t.path) threadPaths.add(t.path);
  }
  const fixCommits = fetchFixCommits(owner, repo, number, threadPaths);
  const outcome = buildOutcome(metadata, threads, fixCommits, reviewComments);
  return {
    metadata,
    threads,
    fixCommits,
    outcome,
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
  };
}

// ---------------------------------------------------------------------------
// File output
// ---------------------------------------------------------------------------

export function writeArchive(
  archive: PRReviewArchive,
  outputDir: string,
): string {
  const slug = slugify(archive.metadata.title);
  const filename = `PR-${archive.metadata.number}-${slug}.md`;
  const path = resolve(outputDir, filename);
  try {
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, renderArchive(archive), "utf8");
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    process.stderr.write(`failed to write archive ${path}: ${msg}\n`);
    process.exit(4);
  }
  return path;
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

interface ParsedArgs {
  number?: number;
  owner: string;
  repo: string;
  outputDir: string;
  allMerged: boolean;
  since?: string;
}

function parseArgs(argv: string[]): ParsedArgs {
  const out: ParsedArgs = {
    owner: "Lucent-Financial-Group",
    repo: "Zeta",
    outputDir: "docs/history/pr-reviews",
    allMerged: false,
  };
  const requireValue = (flag: string, v: string | undefined): string => {
    if (v === undefined || v.startsWith("--")) {
      process.stderr.write(`${flag} requires a value\n`);
      process.exit(1);
    }
    return v;
  };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === undefined) continue;
    if (arg === "--owner") {
      out.owner = requireValue("--owner", argv[++i]);
    } else if (arg === "--repo") {
      out.repo = requireValue("--repo", argv[++i]);
    } else if (arg === "--output-dir") {
      out.outputDir = requireValue("--output-dir", argv[++i]);
    } else if (arg === "--all-merged") {
      out.allMerged = true;
    } else if (arg.startsWith("--since=")) {
      out.since = arg.slice("--since=".length);
    } else if (arg === "--since") {
      out.since = requireValue("--since", argv[++i]);
    } else if (arg === "--help" || arg === "-h") {
      process.stdout.write(
        "Usage:\n" +
          "  bun tools/archive/archive-pr-reviews.ts <PR_NUMBER> [--owner X] [--repo Y] [--output-dir DIR]\n" +
          "  bun tools/archive/archive-pr-reviews.ts --all-merged --since=YYYY-MM-DD [--owner X] [--repo Y]\n",
      );
      process.exit(0);
    } else if (/^\d+$/.test(arg)) {
      const parsed = Number.parseInt(arg, 10);
      if (parsed <= 0) {
        process.stderr.write("PR number must be a positive integer\n");
        process.exit(1);
      }
      out.number = parsed;
    } else {
      process.stderr.write(`unknown arg: ${arg}\n`);
      process.exit(1);
    }
  }
  return out;
}

function listMergedPRs(owner: string, repo: string, since?: string): number[] {
  // Phase 3 helper -- listed for completeness; Phase 2 prototype runs against
  // a single PR by number. When --all-merged is passed, this fans out.
  const args = [
    "pr",
    "list",
    "--repo",
    `${owner}/${repo}`,
    "--state",
    "merged",
    "--limit",
    "1000",
    "--json",
    "number,mergedAt",
  ];
  const out = runGhOrExit(args, "listMergedPRs");
  const parsed = parseJsonOrExit<Array<{ number: number; mergedAt: string }>>(
    out,
    "listMergedPRs",
  );
  let filtered = parsed;
  if (since) {
    filtered = parsed.filter((p) => p.mergedAt >= since);
  }
  return filtered.map((p) => p.number).sort((a, b) => a - b);
}

export function main(argv: string[]): number {
  const args = parseArgs(argv);
  let numbers: number[];
  if (args.allMerged) {
    numbers = listMergedPRs(args.owner, args.repo, args.since);
    if (numbers.length === 0) {
      process.stderr.write("no merged PRs found for the given filter\n");
      return 0;
    }
  } else if (args.number !== undefined) {
    numbers = [args.number];
  } else {
    process.stderr.write("must provide PR number or --all-merged\n");
    return 1;
  }
  for (const n of numbers) {
    process.stderr.write(`archiving PR #${n}...\n`);
    const archive = buildArchive(args.owner, args.repo, n);
    const path = writeArchive(archive, args.outputDir);
    process.stdout.write(
      `wrote ${path} (threads=${archive.outcome.totalThreads}, ` +
        `resolved=${archive.outcome.resolvedThreads}, ` +
        `unresolved=${archive.outcome.unresolvedThreads}, ` +
        `comments=${archive.outcome.totalReviewComments}, ` +
        `fixCommits=${archive.outcome.totalFixCommits})\n`,
    );
  }
  return 0;
}

if (import.meta.main) {
  process.exit(main(process.argv.slice(2)));
}
