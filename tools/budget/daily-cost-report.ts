#!/usr/bin/env bun
// daily-cost-report.ts — daily cost-monitoring entry point.
//
// TypeScript+Bun port of daily-cost-report.sh, slice 18 of the
// TS+Bun migration. Wraps snapshot-burn.sh + project-runway.sh and
// writes the human-readable projection to docs/budget-history/
// latest-report.md. Designed to be the single entry point for the
// daily /schedule remote-trigger routine (task #287 visibility
// surface for the human maintainer).
//
// Usage:
//   bun tools/budget/daily-cost-report.ts                  # full run, writes report
//   bun tools/budget/daily-cost-report.ts --dry-run        # snapshot dry-run
//   bun tools/budget/daily-cost-report.ts --skip-snapshot  # only regenerate report
//
// Exit codes:
//   0 success
//   1 if any wrapped step fails (snapshot-burn or project-runway)
//   2 on CLI-argument errors
//
// Composes with:
//   - tools/budget/snapshot-burn.sh (data-capture primitive; ported in #894)
//   - tools/budget/project-runway.sh (projection primitive; bash-only)
//   - docs/budget-history/snapshots.jsonl (append-only data store)
//   - docs/budget-history/latest-report.md (visibility surface;
//     OVERWRITTEN each run, not append-only)
//
// Note: this wrapper spawns the bash siblings (snapshot-burn.sh,
// project-runway.sh) NOT the TS port — the bash versions are the
// soak-period reference until they retire. Once project-runway is
// also TS-ported and the cluster soaks clean, this wrapper can
// switch to spawning the .ts versions.

import { existsSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const SPAWN_MAX_BUFFER = 64 * 1024 * 1024;

interface ParsedArgs {
  readonly dryRun: boolean;
  readonly skipSnapshot: boolean;
}

interface ArgError {
  readonly error: string;
  readonly exitCode: 2;
}

function parseArgs(argv: readonly string[]): ParsedArgs | ArgError | { readonly help: true } {
  let dryRun = false;
  let skipSnapshot = false;
  for (const a of argv) {
    if (a === "--dry-run") dryRun = true;
    else if (a === "--skip-snapshot") skipSnapshot = true;
    else if (a === "-h" || a === "--help") return { help: true };
    else return { error: `error: unknown argument '${a}'`, exitCode: 2 };
  }
  return { dryRun, skipSnapshot };
}

function emitHelp(): void {
  process.stdout.write(
    `daily-cost-report.ts — daily cost-monitoring entry point.\n` +
      `\n` +
      `Usage:\n` +
      `  bun tools/budget/daily-cost-report.ts                  # full run, writes report\n` +
      `  bun tools/budget/daily-cost-report.ts --dry-run        # snapshot dry-run\n` +
      `  bun tools/budget/daily-cost-report.ts --skip-snapshot  # only regenerate report\n`,
  );
}

function scriptDir(): string {
  return dirname(fileURLToPath(import.meta.url));
}

function repoRoot(): string {
  return resolve(scriptDir(), "..", "..");
}

function nowIsoUtc(): string {
  return new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
}

function gitHeadSha(root: string): string {
  // eslint-disable-next-line sonarjs/no-os-command-from-path
  const result = spawnSync("git", ["-C", root, "rev-parse", "HEAD"], {
    encoding: "utf8",
    maxBuffer: SPAWN_MAX_BUFFER,
  });
  return result.status === 0 ? result.stdout.trim() : "unknown";
}

function runSnapshotBurn(dryRun: boolean): { exitCode: number } {
  const args = dryRun ? ["--dry-run"] : [];
  const argsSuffix = args.length > 0 ? ` ${args.join(" ")}` : "";
  process.stdout.write(`==> snapshot-burn.sh${argsSuffix}\n`);

  const path = resolve(scriptDir(), "snapshot-burn.sh");
  const result = spawnSync(path, args, {
    stdio: "inherit",
    maxBuffer: SPAWN_MAX_BUFFER,
  });
  return { exitCode: result.status ?? 1 };
}

function runProjectRunway(): { exitCode: number; output: string } {
  const path = resolve(scriptDir(), "project-runway.sh");
  // Capture combined stdout+stderr; bash original uses
  // `$("$script_dir/project-runway.sh" 2>&1)`.
  const result = spawnSync(path, [], {
    encoding: "utf8",
    maxBuffer: SPAWN_MAX_BUFFER,
    stdio: ["inherit", "pipe", "pipe"],
  });
  return {
    exitCode: result.status ?? 1,
    output: `${result.stdout}${result.stderr}`,
  };
}

function buildReport(args: { ts: string; gitSha: string; projection: string }): string {
  return `# Latest cost projection — auto-generated

**Generated:** \`${args.ts}\`
**Factory git SHA:** \`${args.gitSha}\`
**Source:** \`tools/budget/daily-cost-report.ts\` (wraps snapshot-burn.sh + project-runway.sh)

This file is **OVERWRITTEN** on each daily run. Historical snapshots live in
\`docs/budget-history/snapshots.jsonl\` (append-only); historical projections
can be reconstructed from any snapshot subset via \`tools/budget/project-runway.sh\`.

---

## Projection text

\`\`\`text
${args.projection}
\`\`\`

---

## How to read this

- **\`Actions billable_ms cumulative\`** — cumulative GitHub-Actions billable runtime across captured snapshots. On public repos this is typically 0 (included minutes); meaningful for macOS / private-repo / Enterprise-plan accounts.
- **\`Per-PR Actions ms (naive)\`** — rolling-window estimate of per-merged-PR Actions cost. Caveats in the projection text below; treat as proxy until \`N \\geq 3\` cumulative snapshots exist.
- **\`Actions fit\`** — whether projected Stages 1-4 burn fits the configured free-tier allowance. If \`EXCEEDS\`, the gate-conditions section names escape valves.
- **\`Copilot projected USD\`** — assumed-30-day span at the current seat count and rate. Re-run with \`--copilot-rate\` to model rate changes.

---

## Source data

- Snapshots: \`docs/budget-history/snapshots.jsonl\`
- Methodology: \`docs/budget-history/README.md\`
- Wrapper: \`tools/budget/daily-cost-report.ts\` (this run)
- Capture script: \`tools/budget/snapshot-burn.sh\`
- Projection script: \`tools/budget/project-runway.sh\`
`;
}

export function main(argv: readonly string[]): number {
  const parsed = parseArgs(argv);
  if ("help" in parsed) {
    emitHelp();
    return 0;
  }
  if ("error" in parsed) {
    process.stderr.write(`${parsed.error}\n`);
    return parsed.exitCode;
  }

  const root = repoRoot();
  const reportPath = resolve(root, "docs", "budget-history", "latest-report.md");
  const snapshotsPath = resolve(root, "docs", "budget-history", "snapshots.jsonl");

  // Step 1 — capture snapshot (unless skipped)
  if (!parsed.skipSnapshot) {
    const burn = runSnapshotBurn(parsed.dryRun);
    if (burn.exitCode !== 0) {
      process.stderr.write(`error: snapshot-burn.sh failed (exit ${String(burn.exitCode)})\n`);
      return 1;
    }
  } else {
    process.stdout.write("==> snapshot-burn.sh SKIPPED per --skip-snapshot\n");
  }

  // Step 2 — run projection (text mode)
  let projection: string;
  if (!existsSync(snapshotsPath)) {
    process.stdout.write(
      "==> project-runway.sh SKIPPED (no snapshots yet); writing bootstrap report\n",
    );
    projection =
      "No snapshots captured yet. The first snapshot-burn.sh run will append a baseline row to docs/budget-history/snapshots.jsonl. Once N >= 2 snapshots exist across LFG merges, projection becomes available.";
  } else {
    process.stdout.write("==> project-runway.sh\n");
    const runway = runProjectRunway();
    if (runway.exitCode !== 0) {
      process.stderr.write(`error: project-runway.sh failed (exit ${String(runway.exitCode)})\n`);
      return 1;
    }
    projection = runway.output;
  }

  // Step 3 — write the report (overwrite, not append)
  const report = buildReport({
    ts: nowIsoUtc(),
    gitSha: gitHeadSha(root),
    projection,
  });
  writeFileSync(reportPath, report);
  process.stdout.write(`==> wrote ${reportPath}\n`);
  process.stdout.write("OK: daily cost report regenerated\n");
  return 0;
}

if (import.meta.main) {
  process.exit(main(process.argv.slice(2)));
}
