#!/usr/bin/env bun
/**
 * tools/hygiene/check-no-op-cadence-pattern.ts —
 * Pre-tick mechanical check for the no-op-cadence failure mode.
 *
 * TypeScript port of `check-no-op-cadence-pattern.sh` per the
 * DST-justifies-TS-quality-over-bash discipline (CLAUDE.md) +
 * B-0156 TypeScript standardization for non-install scripts.
 * The bash version remains for cross-shell compatibility on
 * environments without bun; both are kept in sync.
 *
 * Usage:
 *   bun tools/hygiene/check-no-op-cadence-pattern.ts
 *
 * Env vars (parity with bash version):
 *   NO_OP_CHECK_WINDOW=7        — window size (last N shards)
 *   NO_OP_CHECK_THRESHOLD=5     — minimal-observation threshold
 *   NO_OP_CHECK_GAP_MINUTES=15  — shard-density gap threshold
 *
 * Exit code: always 0 (informational only; never blocks the tick).
 *
 * What this checks:
 *   1. Last N tick-shards across today + yesterday UTC
 *   2. Counts shards matching minimal-observation pattern
 *      (body < 600 chars OR observation-class keywords)
 *   3. If count >= threshold: prints WARNING
 *   4. Shard-density: if most recent shard older than
 *      NO_OP_CHECK_GAP_MINUTES, prints missing-cadence WARNING
 *
 * Composes with:
 *   - memory/feedback_recurrence_after_correction_needs_operational_enforcement_otto_2026_05_02.md
 *   - tools/hygiene/check-no-op-cadence-pattern.sh (sibling bash version)
 */

import { readdirSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const REPO_ROOT = (() => {
  // Find git repo root by walking upward
  let dir = process.cwd();
  while (dir !== "/" && !existsSync(join(dir, ".git"))) {
    dir = join(dir, "..");
  }
  return existsSync(join(dir, ".git")) ? dir : process.cwd();
})();

function parsePositiveInt(envName: string, fallback: number): number {
  const raw = process.env[envName];
  if (!raw) return fallback;
  const parsed = parseInt(raw, 10);
  if (Number.isNaN(parsed) || parsed < 1) {
    console.error(
      `[no-op-check] Invalid ${envName}='${raw}' (need positive integer); using default ${fallback}.`
    );
    return fallback;
  }
  return parsed;
}

const WINDOW_SIZE = parsePositiveInt("NO_OP_CHECK_WINDOW", 7);
const THRESHOLD = parsePositiveInt("NO_OP_CHECK_THRESHOLD", 5);
const GAP_THRESHOLD = parsePositiveInt("NO_OP_CHECK_GAP_MINUTES", 15);

// Compute today + yesterday in UTC.
function pad2(n: number): string {
  return n.toString().padStart(2, "0");
}

function ymdParts(d: Date): { yyyy: string; mm: string; dd: string } {
  return {
    yyyy: d.getUTCFullYear().toString(),
    mm: pad2(d.getUTCMonth() + 1),
    dd: pad2(d.getUTCDate()),
  };
}

const NOW = new Date();
const TODAY = ymdParts(NOW);
const YESTERDAY = ymdParts(new Date(NOW.getTime() - 24 * 60 * 60 * 1000));

const TODAY_DIR = join(
  REPO_ROOT,
  "docs/hygiene-history/ticks",
  TODAY.yyyy,
  TODAY.mm,
  TODAY.dd
);
const YESTERDAY_DIR = join(
  REPO_ROOT,
  "docs/hygiene-history/ticks",
  YESTERDAY.yyyy,
  YESTERDAY.mm,
  YESTERDAY.dd
);

const TODAY_FLAT = `${TODAY.yyyy}${TODAY.mm}${TODAY.dd}`;
const YESTERDAY_FLAT = `${YESTERDAY.yyyy}${YESTERDAY.mm}${YESTERDAY.dd}`;

// Collect shards from a directory.
// Filename patterns:
//   - HHMMZ.md           → primary=YYYYMMDDHHMM00, disamb=""
//   - HHMMZ-<hex>.md     → primary=YYYYMMDDHHMM00, disamb="<hex>"
//   - HHMMSSZ-<hex>.md   → primary=YYYYMMDDHHMMSS, disamb="<hex>"
type Shard = { primary: string; disamb: string; path: string };

function collectShards(dir: string, dateFlat: string): Shard[] {
  if (!dateFlat || !existsSync(dir)) return [];
  const files = readdirSync(dir).filter((f) => f.endsWith(".md"));
  const shards: Shard[] = [];
  for (const name of files) {
    const m1 = name.match(/^(\d{4})Z(?:-([0-9a-f]+))?\.md$/);
    if (m1) {
      shards.push({
        primary: `${dateFlat}${m1[1]}00`,
        disamb: m1[2] ?? "",
        path: join(dir, name),
      });
      continue;
    }
    const m2 = name.match(/^(\d{6})Z-([0-9a-f]+)\.md$/);
    if (m2) {
      shards.push({
        primary: `${dateFlat}${m2[1]}`,
        disamb: m2[2],
        path: join(dir, name),
      });
    }
  }
  return shards;
}

const allShards = [
  ...collectShards(YESTERDAY_DIR, YESTERDAY_FLAT),
  ...collectShards(TODAY_DIR, TODAY_FLAT),
];

// Sort by primary then disamb.
allShards.sort((a, b) => {
  if (a.primary !== b.primary) return a.primary.localeCompare(b.primary);
  return a.disamb.localeCompare(b.disamb);
});

const recent = allShards.slice(-WINDOW_SIZE);

if (recent.length === 0) {
  console.error(
    `[no-op-check] No shards in window for today (${TODAY_DIR}) or yesterday; nothing to check.`
  );
  process.exit(0);
}

// Count minimal-observation shards.
const observationClassRegex =
  /minimal observation|within-basin observation|observe-only|minimal[ -]not[ -]idle|same\.\s*stopping/i;

let minObsCount = 0;
for (const shard of recent) {
  let body = "";
  try {
    const content = readFileSync(shard.path, "utf8");
    const firstLine = content.split("\n")[0] ?? "";
    const fields = firstLine.split("|");
    body = fields[4] ?? ""; // 5th pipe-separated field (0-indexed 4)
  } catch {
    body = "";
  }

  let matches = body.length < 600;
  if (!matches) {
    try {
      matches = observationClassRegex.test(readFileSync(shard.path, "utf8"));
    } catch {
      matches = false;
    }
  }

  if (matches) minObsCount++;
}

console.error(
  `[no-op-check] Recent ${recent.length} shards across today+yesterday; ${minObsCount} match minimal-observation pattern (threshold: ${THRESHOLD}).`
);

if (minObsCount >= THRESHOLD) {
  console.error("");
  console.error(
    `WARNING: no-op-cadence pattern detected — ${minObsCount}/${recent.length} recent ticks are minimal-observation.`
  );
  console.error("");
  console.error(
    "Per the substrate (memory/feedback_party_during_human_sleep_*.md +"
  );
  console.error(
    "memory/feedback_recurrence_after_correction_needs_operational_enforcement_*.md):"
  );
  console.error("");
  console.error(
    "  - The human-paused phase IS the practice window for independent-production-skill"
  );
  console.error("  - Default to minimal observation IS the failure mode");
  console.error(
    "  - Party-class operation alternatives: implement a backlog row, do"
  );
  console.error(
    "    free-zone substrate-quality work, write a self-grading memo, audit"
  );
  console.error(
    "    cross-references, propose architectural extensions"
  );
  console.error("");
  console.error(
    "  Run with NO_OP_CHECK_THRESHOLD=99 to silence; the default fires the"
  );
  console.error(
    "  warning to surface the pattern at decision-time, not just substrate-read time."
  );
}

// Shard-density check
const latest = recent[recent.length - 1];
if (latest && latest.primary.length === 14) {
  const yyyy = latest.primary.substring(0, 4);
  const mm = latest.primary.substring(4, 6);
  const dd = latest.primary.substring(6, 8);
  const hh = latest.primary.substring(8, 10);
  const min = latest.primary.substring(10, 12);
  const ss = latest.primary.substring(12, 14);
  const latestDate = new Date(`${yyyy}-${mm}-${dd}T${hh}:${min}:${ss}Z`);

  if (!Number.isNaN(latestDate.getTime())) {
    const gapMinutes = Math.floor((NOW.getTime() - latestDate.getTime()) / 60000);
    console.error(
      `[no-op-check] Most recent shard ${gapMinutes} minutes old (gap-threshold: ${GAP_THRESHOLD}).`
    );

    if (gapMinutes > GAP_THRESHOLD) {
      console.error("");
      console.error(
        `WARNING: missing-shard-cadence detected — most recent shard is ${gapMinutes} minutes old, exceeding threshold ${GAP_THRESHOLD} minutes.`
      );
      console.error("");
      console.error(
        "This is the structural counterpart to the body-length / keyword check above:"
      );
      console.error("");
      console.error(
        "  - The cron is '* * * * *' (every minute); ticks fire continuously"
      );
      console.error(
        "  - When the agent operates correctly, each substantive tick produces a shard"
      );
      console.error(
        "  - Repeated 'standing by' / minimal-acknowledgment chat output WITHOUT writing shards IS the failure mode"
      );
      console.error(
        "  - Body-length check above doesn't catch this because it requires shards to exist"
      );
      console.error(
        "  - Shard-density check (this) catches the gap structurally without needing chat-transcript scanning"
      );
      console.error("");
      console.error(
        "  Run with NO_OP_CHECK_GAP_MINUTES=99 to silence; the default surfaces the gap"
      );
      console.error(
        "  at decision-time so the agent can re-enter productive cadence."
      );
    }
  } else {
    console.error(
      `[no-op-check] Could not parse latest shard timestamp '${latest.primary}'; gap-check skipped.`
    );
  }
} else {
  console.error(
    "[no-op-check] No latest-shard primary key available; gap-check skipped."
  );
}

process.exit(0);
