#!/usr/bin/env bun
// check-github-settings-drift.ts — diff the current GitHub settings of a
// repo against the checked-in expected snapshot. Detects click-ops drift
// for settings that GitHub does not expose as declarative config.
//
// TypeScript+Bun port of check-github-settings-drift.sh, per Rule 0
// (no more .sh files except install-graph; TS IS cross-platform DST).
//
// Usage:
//   bun tools/hygiene/check-github-settings-drift.ts [--repo OWNER/NAME] [--expected PATH]
//
// Defaults:
//   --repo        $GH_REPO, else `gh repo view --json nameWithOwner`
//   --expected    tools/hygiene/github-settings.expected.json (next to this script)
//
// Exit codes:
//   0   — no drift
//   1   — drift detected (diff printed to stdout)
//   2   — tooling / input error

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { snapshot } from "./snapshot-github-settings.ts";

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));

interface SpawnResult {
  readonly stdout: string;
  readonly stderr: string;
  readonly exitCode: number;
}

async function runCmd(cmd: readonly string[]): Promise<SpawnResult> {
  const proc = Bun.spawn({
    cmd: [...cmd],
    stdout: "pipe",
    stderr: "pipe",
  });
  const [stdout, stderr] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
  ]);
  const exitCode = await proc.exited;
  return { stdout, stderr, exitCode };
}

interface Args {
  readonly repo: string;
  readonly expected: string;
}

type ParseResult =
  | { readonly kind: "args"; readonly args: Args }
  | { readonly kind: "error"; readonly message: string };

async function parseArgs(argv: readonly string[]): Promise<ParseResult> {
  let repo = "";
  let expected = resolve(SCRIPT_DIR, "github-settings.expected.json");
  let i = 0;

  while (i < argv.length) {
    const arg = argv[i];
    if (arg === "--repo") {
      const value = argv[i + 1];
      if (value === undefined) {
        return { kind: "error", message: "error: --repo requires OWNER/NAME argument" };
      }
      repo = value;
      i += 2;
    } else if (arg === "--expected") {
      const value = argv[i + 1];
      if (value === undefined) {
        return { kind: "error", message: "error: --expected requires PATH argument" };
      }
      expected = value;
      i += 2;
    } else {
      return { kind: "error", message: `error: unknown arg: ${String(arg)}` };
    }
  }

  if (repo.length === 0) {
    repo = process.env.GH_REPO ?? "";
  }

  if (repo.length === 0) {
    const r = await runCmd(["gh", "repo", "view", "--json", "nameWithOwner", "--jq", ".nameWithOwner"]);
    if (r.exitCode === 0 && r.stdout.trim().length > 0) {
      repo = r.stdout.trim();
    }
  }

  if (repo.length === 0) {
    return { kind: "error", message: "error: cannot determine repo; pass --repo OWNER/NAME or set GH_REPO" };
  }

  return { kind: "args", args: { repo, expected } };
}

export async function main(argv: readonly string[]): Promise<number> {
  const parsed = await parseArgs(argv);
  if (parsed.kind === "error") {
    process.stderr.write(`${parsed.message}\n`);
    return 2;
  }

  const { repo, expected } = parsed.args;

  // Read expected snapshot
  let expectedContent: string;
  try {
    expectedContent = readFileSync(expected, "utf8");
  } catch {
    process.stderr.write(`error: expected snapshot not found: ${expected}\n`);
    return 2;
  }

  // Generate live snapshot
  let liveContent: string;
  try {
    liveContent = await snapshot(repo);
    // Ensure trailing newline for clean diff
    if (!liveContent.endsWith("\n")) {
      liveContent += "\n";
    }
  } catch (err: unknown) {
    process.stderr.write(`error: snapshot failed: ${err instanceof Error ? err.message : String(err)}\n`);
    return 2;
  }

  // Write live snapshot to temp file for diff
  const tmpPath = resolve(SCRIPT_DIR, `.github-settings-live-${Date.now()}.json`);
  try {
    writeFileSync(tmpPath, liveContent, "utf8");

    // Run diff
    const diffResult = await runCmd(["diff", "-u", expected, tmpPath]);

    if (diffResult.exitCode === 0) {
      process.stderr.write(`github-settings-drift: no drift (repo=${repo})\n`);
      return 0;
    } else {
      // Print diff to stdout
      process.stdout.write(diffResult.stdout);
      process.stderr.write("\n");
      process.stderr.write(`github-settings-drift: DRIFT DETECTED (repo=${repo})\n`);
      process.stderr.write(`  expected: ${expected}\n`);
      process.stderr.write("  current : (live from gh api)\n");
      process.stderr.write("\n");
      process.stderr.write("Resolve options:\n");
      process.stderr.write("  1. Intentional change -> update expected snapshot:\n");
      process.stderr.write(`     bun tools/hygiene/snapshot-github-settings.ts --repo ${repo} > ${expected}\n`);
      process.stderr.write("     Then commit the diff with a message explaining the policy change.\n");
      process.stderr.write("  2. Unintentional change -> revert the setting in GitHub UI/API\n");
      process.stderr.write("     and re-run this script to confirm.\n");
      return 1;
    }
  } finally {
    // Clean up temp file
    try {
      const { unlinkSync } = await import("node:fs");
      unlinkSync(tmpPath);
    } catch {
      // Best-effort cleanup
    }
  }
}

if (import.meta.main) {
  main(process.argv.slice(2)).then(
    (code) => process.exit(code),
    (err) => {
      process.stderr.write(`fatal: ${err instanceof Error ? err.message : String(err)}\n`);
      process.exit(2);
    },
  );
}
