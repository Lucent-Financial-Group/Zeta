#!/usr/bin/env bun
// pr-publication-plan.ts -- deterministic PR publication packet builder for
// autonomous backlog pickup.
//
// This is the first B-0280 slice: it does not push, create PRs, or arm
// auto-merge by itself. It builds the exact review packet and command argv
// from machine-readable inputs so the executor path can stay small and
// testable.

import { readFileSync } from "node:fs";

export type CheckStatus = "passed" | "failed" | "running" | "pending" | "skipped";

export interface FocusedCheck {
  command: string;
  status: CheckStatus;
  notes?: string;
}

export interface RequiredCheckCounts {
  ok: number;
  inProgress: number;
  pending: number;
  failed: number;
}

export interface PublicationInput {
  backlogId: string;
  backlogTitle: string;
  backlogPath: string;
  branch: string;
  baseBranch: string;
  summary: string[];
  checks: FocusedCheck[];
  requiredChecks: RequiredCheckCounts;
  unresolvedReviewThreads: number;
}

export interface AutoMergeDecision {
  allowed: boolean;
  reason: string;
}

export interface PublicationPlan {
  prTitle: string;
  prBody: string;
  autoMerge: AutoMergeDecision;
  commands: {
    push: string[];
    createPr: string[];
    armAutoMerge: string[] | null;
  };
}

interface Args {
  inputPath: string | null;
  json: boolean;
}

const DEFAULT_REPO = "Lucent-Financial-Group/Zeta";
const DEFAULT_BRANCHES = new Set(["main", "master", "trunk"]);

function usage(): string {
  return [
    "Usage:",
    "  bun tools/backlog/pr-publication-plan.ts --input publication.json [--json]",
    "",
    "Input JSON shape: PublicationInput exported by this module.",
  ].join("\n");
}

function requireValue(flag: string, value: string | undefined): string {
  if (value === undefined || value.startsWith("--")) {
    throw new Error(`${flag} requires a value`);
  }
  return value;
}

function parseArgs(argv: readonly string[]): Args {
  const args: Args = { inputPath: null, json: false };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--input") {
      args.inputPath = requireValue(arg, argv[++i]);
    } else if (arg === "--json") {
      args.json = true;
    } else if (arg === "--help" || arg === "-h") {
      process.stdout.write(`${usage()}\n`);
      process.exit(0);
    } else {
      throw new Error(`unknown arg: ${arg}`);
    }
  }
  if (args.inputPath === null) {
    throw new Error("--input is required");
  }
  return args;
}

function assertNonEmpty(label: string, value: string): void {
  if (value.trim().length === 0) {
    throw new Error(`${label} is required`);
  }
}

function validateRepoPath(path: string): void {
  const normalized = path.replace(/\\/g, "/");
  if (
    normalized.trim().length === 0 ||
    normalized.startsWith("/") ||
    normalized.startsWith("../") ||
    normalized.includes("/../") ||
    normalized === ".git" ||
    normalized.startsWith(".git/")
  ) {
    throw new Error(`unsafe repo-relative path: ${path}`);
  }
}

export function validatePublicationInput(input: PublicationInput): void {
  if (!/^B-[0-9]+$/.test(input.backlogId)) {
    throw new Error(`invalid backlog id: ${input.backlogId}`);
  }
  assertNonEmpty("backlogTitle", input.backlogTitle);
  assertNonEmpty("branch", input.branch);
  assertNonEmpty("baseBranch", input.baseBranch);
  validateRepoPath(input.backlogPath);
  if (DEFAULT_BRANCHES.has(input.branch)) {
    throw new Error(`refusing to publish from default branch: ${input.branch}`);
  }
  if (input.summary.length === 0 || input.summary.some((line) => line.trim().length === 0)) {
    throw new Error("summary must contain at least one non-empty line");
  }
  if (input.checks.length === 0) {
    throw new Error("at least one focused check is required");
  }
  for (const check of input.checks) {
    assertNonEmpty("check.command", check.command);
  }
}

export function decideAutoMerge(input: PublicationInput): AutoMergeDecision {
  if (input.unresolvedReviewThreads > 0) {
    return {
      allowed: false,
      reason: `${input.unresolvedReviewThreads} unresolved review thread(s)`,
    };
  }
  if (input.requiredChecks.failed > 0) {
    return {
      allowed: false,
      reason: `${input.requiredChecks.failed} required check(s) failed`,
    };
  }
  return {
    allowed: true,
    reason: "no unresolved review threads and no failed required checks",
  };
}

function trimTitle(value: string, maxLength: number): string {
  if (value.length <= maxLength) {
    return value;
  }
  return `${value.slice(0, maxLength - 1).trimEnd()}…`;
}

export function buildPrTitle(input: PublicationInput): string {
  return trimTitle(`feat(backlog): advance ${input.backlogId} ${input.backlogTitle}`, 120);
}

function formatCheck(check: FocusedCheck): string {
  const suffix = check.notes === undefined ? "" : ` — ${check.notes}`;
  return `- ${check.status}: \`${check.command}\`${suffix}`;
}

function requiredCheckSummary(counts: RequiredCheckCounts): string {
  return `${counts.ok} ok, ${counts.inProgress} in progress, ${counts.pending} pending, ${counts.failed} failed`;
}

export function buildPrBody(input: PublicationInput): string {
  const autoMerge = decideAutoMerge(input);
  return [
    "## Summary",
    ...input.summary.map((line) => `- ${line}`),
    "",
    "## Backlog row",
    `- ${input.backlogId}: ${input.backlogTitle}`,
    `- Path: \`${input.backlogPath}\``,
    "",
    "## Checks",
    ...input.checks.map(formatCheck),
    "",
    "## Auto-merge gate",
    `- Required checks: ${requiredCheckSummary(input.requiredChecks)}`,
    `- Unresolved review threads: ${input.unresolvedReviewThreads}`,
    `- Decision: ${autoMerge.allowed ? "arm auto-merge" : "do not arm auto-merge"} (${autoMerge.reason})`,
    "",
  ].join("\n");
}

export function buildPublicationPlan(input: PublicationInput): PublicationPlan {
  validatePublicationInput(input);
  const title = buildPrTitle(input);
  const autoMerge = decideAutoMerge(input);
  const createPr = [
    "gh",
    "pr",
    "create",
    "--repo",
    DEFAULT_REPO,
    "--base",
    input.baseBranch,
    "--head",
    input.branch,
    "--title",
    title,
    "--body-file",
    "<body-file>",
  ];
  return {
    prTitle: title,
    prBody: buildPrBody(input),
    autoMerge,
    commands: {
      push: ["git", "push", "-u", "origin", input.branch],
      createPr,
      armAutoMerge: autoMerge.allowed
        ? ["gh", "pr", "merge", "<pr-url>", "--repo", DEFAULT_REPO, "--auto", "--squash"]
        : null,
    },
  };
}

function readInput(path: string): PublicationInput {
  return JSON.parse(readFileSync(path, "utf8")) as PublicationInput;
}

export function main(argv: readonly string[]): number {
  try {
    const args = parseArgs(argv);
    const plan = buildPublicationPlan(readInput(args.inputPath ?? ""));
    process.stdout.write(args.json ? `${JSON.stringify(plan, null, 2)}\n` : plan.prBody);
    return 0;
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n\n${usage()}\n`);
    return 1;
  }
}

if (import.meta.main) {
  process.exit(main(process.argv.slice(2)));
}
