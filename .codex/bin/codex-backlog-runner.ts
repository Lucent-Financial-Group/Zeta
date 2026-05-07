#!/usr/bin/env bun
// codex-backlog-runner.ts -- Tier 1 queue-empty backlog pickup gate.
//
// This runner is intentionally a gate, not an unattended broad executor. It
// refuses to select backlog work while any PR is open, then delegates the
// deterministic backlog choice to tools/backlog/autonomous-pickup.ts.

import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

interface GateResult {
  status: "wait-pr-queue" | "ready";
  openPrCount: number;
  pickup: unknown | null;
}

function usage(): string {
  return [
    "Usage:",
    "  bun .codex/bin/codex-backlog-runner.ts [--json] [--repo-root DIR]",
    "",
    "Runs only when the PR queue is empty. Emits the selected backlog",
    "execution prompt from tools/backlog/autonomous-pickup.ts.",
  ].join("\n");
}

function parseArgs(argv: string[]): { json: boolean; repoRoot: string } {
  const out = { json: false, repoRoot: process.cwd() };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--json") {
      out.json = true;
    } else if (arg === "--repo-root") {
      const value = argv[++i];
      if (value === undefined || value.startsWith("--")) {
        throw new Error("--repo-root requires a value");
      }
      out.repoRoot = value;
    } else if (arg === "--help" || arg === "-h") {
      process.stdout.write(`${usage()}\n`);
      process.exit(0);
    } else {
      throw new Error(`unknown arg: ${arg}`);
    }
  }
  out.repoRoot = resolve(out.repoRoot);
  return out;
}

function run(repoRoot: string, command: string, args: string[]): { status: number; stdout: string; stderr: string } {
  const result = spawnSync(command, args, {
    cwd: repoRoot,
    encoding: "utf8",
    env: {
      ...process.env,
      PATH: `/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin:${process.env.HOME ?? "/Users/acehack"}/.bun/bin`,
    },
    maxBuffer: 32 * 1024 * 1024,
  });
  return {
    status: result.status ?? 1,
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? String(result.error ?? ""),
  };
}

function openPrCount(repoRoot: string): number {
  const result = run(repoRoot, "bun", ["tools/github/poll-pr-gate-batch.ts", "--all-open"]);
  if (result.status !== 0) {
    throw new Error(`poll-pr-gate-batch failed: ${result.stderr || result.stdout}`);
  }
  const parsed = JSON.parse(result.stdout) as { count?: number };
  return Number(parsed.count ?? 0);
}

function pickup(repoRoot: string): unknown {
  const result = run(repoRoot, "bun", ["tools/backlog/autonomous-pickup.ts", "--json"]);
  if (result.status !== 0) {
    throw new Error(`autonomous-pickup failed: ${result.stderr || result.stdout}`);
  }
  return JSON.parse(result.stdout) as unknown;
}

function printText(result: GateResult): void {
  if (result.status === "wait-pr-queue") {
    process.stdout.write(`wait-pr-queue: ${result.openPrCount} open PR(s)\n`);
    return;
  }
  process.stdout.write(`${JSON.stringify(result.pickup, null, 2)}\n`);
}

export function main(argv: string[]): number {
  let args: { json: boolean; repoRoot: string };
  try {
    args = parseArgs(argv);
    const count = openPrCount(args.repoRoot);
    const result: GateResult =
      count > 0
        ? { status: "wait-pr-queue", openPrCount: count, pickup: null }
        : { status: "ready", openPrCount: 0, pickup: pickup(args.repoRoot) };

    if (args.json) {
      process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    } else {
      printText(result);
    }
    return 0;
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n\n${usage()}\n`);
    return 1;
  }
}

if (import.meta.main) {
  process.exit(main(process.argv.slice(2)));
}
