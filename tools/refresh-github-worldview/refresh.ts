#!/usr/bin/env bun
import { spawnSync } from "node:child_process";

interface CommandResult {
  stdout: string;
  stderr: string;
  status: number;
}

interface RecentMerge {
  oid: string;
  parents: string[];
  author: string;
  authoredAt: string;
  subject: string;
}

interface WorldviewSnapshot {
  generatedAt: string;
  repository: string;
  recentMergeRange: string;
  prs: unknown[];
  recentMerges: RecentMerge[];
}

function run(command: string, args: string[]): CommandResult {
  const result = spawnSync(command, args, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });

  return {
    stdout: result.stdout.trim(),
    stderr: result.stderr.trim(),
    status: result.status ?? 1,
  };
}

function fail(message: string, result: CommandResult): never {
  const detail = result.stderr || result.stdout || "no output";
  console.error(`${message}: ${detail}`);
  process.exit(1);
}

function readOpenPullRequests(repository: string): unknown[] {
  const fields = [
    "number",
    "title",
    "headRefName",
    "baseRefName",
    "state",
    "isDraft",
    "mergeStateStatus",
    "reviewDecision",
    "url",
    "updatedAt",
    "author",
  ].join(",");

  const result = run("gh", [
    "pr",
    "list",
    "--repo",
    repository,
    "--state",
    "open",
    "--limit",
    "100",
    "--json",
    fields,
  ]);

  if (result.status !== 0) {
    fail("failed to query open pull requests", result);
  }

  try {
    const parsed: unknown = JSON.parse(result.stdout || "[]");
    if (!Array.isArray(parsed)) {
      throw new Error("expected array");
    }
    return parsed;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`failed to parse gh JSON: ${message}`);
    process.exit(1);
  }
}

function readRecentMerges(range: string): RecentMerge[] {
  const result = run("git", [
    "log",
    range,
    "--format=%H%x1f%P%x1f%an%x1f%aI%x1f%s",
  ]);

  if (result.status !== 0) {
    fail("failed to query recent merges", result);
  }

  if (result.stdout.length === 0) {
    return [];
  }

  return result.stdout.split("\n").map((line) => {
    const [oid, parents, author, authoredAt, subject] = line.split("\x1f");
    if (!oid || !parents || !author || !authoredAt || subject === undefined) {
      throw new Error(`unexpected git log row: ${line}`);
    }
    return {
      oid,
      parents: parents.length === 0 ? [] : parents.split(" "),
      author,
      authoredAt,
      subject,
    };
  });
}

function main(): void {
  const repository =
    process.env.ZETA_GITHUB_REPOSITORY ??
    process.env.GITHUB_REPOSITORY ??
    "Lucent-Financial-Group/Zeta";
  const recentMergeRange = process.env.ZETA_WORLDVIEW_RECENT_RANGE ?? "origin/main..HEAD";

  const snapshot: WorldviewSnapshot = {
    generatedAt: new Date().toISOString(),
    repository,
    recentMergeRange,
    prs: readOpenPullRequests(repository),
    recentMerges: readRecentMerges(recentMergeRange),
  };

  console.log(JSON.stringify(snapshot, null, 2));
}

main();
