#!/usr/bin/env bun
// codex-backlog-runner.ts -- Tier 1 parallel trajectory/backlog pickup gate.
//
// This runner is intentionally a gate, not an unattended broad executor. It
// keeps a bounded number of non-overlapping PRs in flight. While the open PR
// count is below capacity, it picks trajectory enhancement first, then falls
// back to backlog pickup.

import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

interface GateResult {
  status: "wait-pr-capacity" | "ready";
  openPrCount: number;
  maxOpenPrs: number;
  availablePrSlots: number;
  pickupSource: "trajectory" | "backlog" | null;
  pickup: unknown | null;
}

interface PickupStatus {
  status?: string;
}

export interface OpenPrListItem {
  number?: number;
  headRefName?: string;
  title?: string;
}

interface CapacityGate {
  status: "wait-pr-capacity" | "ready";
  availablePrSlots: number;
}

const DEFAULT_MAX_OPEN_PRS = 3;

function usage(): string {
  return [
    "Usage:",
    "  bun .codex/bin/codex-backlog-runner.ts [--json] [--repo-root DIR] [--max-open-prs N]",
    "",
    "Runs while open PR count is below the bounded parallel PR capacity.",
    "Emits a trajectory-first pickup prompt, then falls back to backlog",
    "pickup when no trajectory action is available.",
  ].join("\n");
}

function positiveInteger(flag: string, value: string): number {
  if (!/^[1-9][0-9]*$/.test(value)) {
    throw new Error(`${flag} must be a positive integer`);
  }
  return Number(value);
}

function parseMaxOpenPrsFromEnv(): number {
  const raw = process.env.CODEX_BACKLOG_RUNNER_MAX_OPEN_PRS ?? process.env.ZETA_MAX_OPEN_PRS;
  return raw === undefined || raw.trim().length === 0 ? DEFAULT_MAX_OPEN_PRS : positiveInteger("CODEX_BACKLOG_RUNNER_MAX_OPEN_PRS", raw.trim());
}

function parseArgs(argv: string[]): { json: boolean; repoRoot: string; maxOpenPrs: number } {
  const out = { json: false, repoRoot: process.cwd(), maxOpenPrs: parseMaxOpenPrsFromEnv() };
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
    } else if (arg === "--max-open-prs") {
      const value = argv[++i];
      if (value === undefined || value.startsWith("--")) {
        throw new Error("--max-open-prs requires a value");
      }
      out.maxOpenPrs = positiveInteger("--max-open-prs", value);
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

export function activeClaimsFromOpenPrs(openPrs: readonly OpenPrListItem[]): string[] {
  const claims: string[] = [];
  for (const pr of openPrs) {
    if (pr.headRefName !== undefined && pr.headRefName.trim().length > 0) {
      claims.push(pr.headRefName.trim());
    }
    if (pr.title !== undefined && pr.title.trim().length > 0) {
      claims.push(`pr-${pr.number ?? "unknown"}:${pr.title.trim()}`);
    }
  }
  return [...new Set(claims)].sort((a, b) => a.localeCompare(b));
}

function openPrActiveClaims(repoRoot: string): string[] {
  const result = run(repoRoot, "gh", ["pr", "list", "--state", "open", "--limit", "100", "--json", "number,headRefName,title"]);
  if (result.status !== 0) {
    throw new Error(`gh pr list failed while reading rotation signals: ${result.stderr || result.stdout}`);
  }
  const parsed = JSON.parse(result.stdout) as OpenPrListItem[];
  return activeClaimsFromOpenPrs(parsed);
}

function runPicker(repoRoot: string, script: string, activeClaims: readonly string[]): unknown {
  const claimArgs = activeClaims.flatMap((claim) => ["--active-claim", claim]);
  const result = run(repoRoot, "bun", [script, "--json", ...claimArgs]);
  if (result.status !== 0) {
    throw new Error(`${script} failed: ${result.stderr || result.stdout}`);
  }
  return JSON.parse(result.stdout) as unknown;
}

function isSelected(pickup: unknown): boolean {
  return typeof pickup === "object" && pickup !== null && (pickup as PickupStatus).status === "selected";
}

export function capacityGate(openPrCount: number, maxOpenPrs: number): CapacityGate {
  const availablePrSlots = Math.max(0, maxOpenPrs - openPrCount);
  return {
    status: openPrCount >= maxOpenPrs ? "wait-pr-capacity" : "ready",
    availablePrSlots,
  };
}

function pickup(repoRoot: string, activeClaims: readonly string[]): { source: "trajectory" | "backlog" | null; value: unknown | null } {
  const trajectory = runPicker(repoRoot, "tools/trajectories/autonomous-pickup.ts", activeClaims);
  if (isSelected(trajectory)) {
    return { source: "trajectory", value: trajectory };
  }

  const backlog = runPicker(repoRoot, "tools/backlog/autonomous-pickup.ts", activeClaims);
  return { source: "backlog", value: backlog };
}

function printText(result: GateResult): void {
  if (result.status === "wait-pr-capacity") {
    process.stdout.write(`wait-pr-capacity: ${result.openPrCount}/${result.maxOpenPrs} open PR slot(s) used\n`);
    return;
  }
  process.stdout.write(`pr-capacity: ${result.openPrCount}/${result.maxOpenPrs} open, ${result.availablePrSlots} slot(s) available\n`);
  process.stdout.write(`pickup-source: ${result.pickupSource ?? "none"}\n`);
  process.stdout.write(`${JSON.stringify(result.pickup, null, 2)}\n`);
}

export function main(argv: string[]): number {
  let args: { json: boolean; repoRoot: string; maxOpenPrs: number };
  try {
    args = parseArgs(argv);
    const count = openPrCount(args.repoRoot);
    const gate = capacityGate(count, args.maxOpenPrs);
    const activePrClaims = gate.status === "ready" ? openPrActiveClaims(args.repoRoot) : [];
    const selected = gate.status === "ready" ? pickup(args.repoRoot, activePrClaims) : { source: null, value: null };
    const result: GateResult = {
      status: gate.status,
      openPrCount: count,
      maxOpenPrs: args.maxOpenPrs,
      availablePrSlots: gate.availablePrSlots,
      pickupSource: selected.source,
      pickup: selected.value,
    };

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
