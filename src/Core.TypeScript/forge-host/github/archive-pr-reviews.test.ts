/**
 * archive-pr-reviews — non-vacuity probes for the heartbeat backfill step.
 *
 * The defect these exist to prevent recurring (081M005VXY6087G0R001T04ATY):
 * `agent-heartbeat.yml` invoked this tool with `--batch 3`, a flag the parser has
 * never accepted, so every tick died at argument parsing having archived nothing —
 * and the `| tail -10` pipeline swallowed the exit code so the step reported
 * success anyway. The first test below would have failed on day one.
 */

import { describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parse as parseYaml } from "yaml";

import { normalizeSince, selectBatch } from "./archive-pr-reviews.ts";

const REPO_ROOT = join(import.meta.dir, "..", "..", "..", "..");
const TOOL = "src/Core.TypeScript/forge-host/github/archive-pr-reviews.ts";
const WORKFLOW = join(REPO_ROOT, ".github", "workflows", "agent-heartbeat.yml");

/** Pull the literal argv this workflow hands to the archive tool. */
function workflowArgvForTool(runBlock: string): string[] {
  const joined = runBlock.replace(/\\\r?\n\s*/g, " ");
  const m = new RegExp(`bun\\s+${TOOL.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\\\$&")}([^\\n]*)`).exec(
    joined,
  );
  if (m === null) return [];
  // Cut at the first redirect/operator. `2>&1` must be matched WITHOUT requiring a
  // trailing space: the real invocation ends `... --limit 3 2>&1)` inside a command
  // substitution, and a whitespace-anchored split leaves `2>&1)` in the argv.
  const args = (m[1] ?? "").split(/\s*(?:2>&1|\|\||\||&&|;|>)/)[0] ?? "";
  return args
    .trim()
    .split(/\s+/)
    .filter((t) => t.length > 0 && !t.includes("$") && !t.includes("{{"));
}

function archiveStepRunBlock(): string {
  const doc = parseYaml(readFileSync(WORKFLOW, "utf8")) as {
    jobs: Record<string, { steps?: Array<{ name?: string; run?: string }> }>;
  };
  for (const job of Object.values(doc.jobs)) {
    for (const step of job.steps ?? []) {
      if (step.name?.includes("Archive PR review history") === true) return step.run ?? "";
    }
  }
  throw new Error("archive step not found in agent-heartbeat.yml");
}

describe("heartbeat archive step is not vacuous", () => {
  test("every flag the workflow passes is accepted by the REAL parser", () => {
    const argv = workflowArgvForTool(archiveStepRunBlock());
    expect(argv.length).toBeGreaterThan(0);

    // `--help` is appended so the parser runs to completion on the workflow's own
    // argv and then exits 0 WITHOUT making any `gh` call. Arg parsing happens in
    // order, so any unaccepted flag still exits 1 before `--help` is reached.
    // This executes the actual parser rather than approximating it with a regex.
    const result = spawnSync("bun", [TOOL, ...argv, "--help"], {
      cwd: REPO_ROOT,
      encoding: "utf8",
    });

    expect(result.stderr ?? "").not.toContain("unknown arg");
    expect(result.status).toBe(0);
  });

  test("the known-bad historical argv is genuinely rejected (probe is not vacuous)", () => {
    // If this ever exits 0, the probe above has stopped discriminating and is
    // worthless — it would pass no matter what the workflow said.
    const result = spawnSync(
      "bun",
      [TOOL, "--owner", "Lucent-Financial-Group", "--repo", "Zeta", "--batch", "3", "--help"],
      { cwd: REPO_ROOT, encoding: "utf8" },
    );
    expect(result.status).toBe(1);
    expect(result.stderr ?? "").toContain("unknown arg: --batch");
  });

  test("the step does not mask the tool's exit code behind a pipe", () => {
    const run = archiveStepRunBlock();
    // The original defect: `bun ...archive-pr-reviews.ts ... 2>&1 | tail -10 || echo`.
    // A pipeline's status is the last command's, so the failure vanished and the
    // `||` fallback was unreachable. Require an explicit exit-code check instead.
    const joined = run.replace(/\\\r?\n\s*/g, " ");
    const invocation = new RegExp(`bun\\s+${TOOL}[^\\n]*`).exec(joined)?.[0] ?? "";
    expect(invocation).not.toMatch(/\|\s*tail/);
    expect(run).toMatch(/ARCHIVE_RC=\$\?/);
    expect(run).toMatch(/ARCHIVE_RC["}\s]*-ne 0|ARCHIVE_RC" -ne 0/);
  });

  test("the step actually asks for work: --all-merged with a bound", () => {
    const argv = workflowArgvForTool(archiveStepRunBlock());
    // Without --all-merged and without a PR number the tool returns 1 ("must provide
    // PR number or --all-merged"); a bound is what keeps a 30-minute tick sane.
    expect(argv).toContain("--all-merged");
    expect(argv).toContain("--limit");
  });
});

describe("selectBatch — bounded drain, oldest first", () => {
  const archived = (set: Set<number>) => (pr: number) => set.has(pr);

  test("skips PRs that already have a shard", () => {
    const got = selectBatch([1, 2, 3, 4], "/unused", 2, archived(new Set([1, 2])));
    expect(got).toEqual([3, 4]);
  });

  test("takes the OLDEST n, not the newest", () => {
    const got = selectBatch([10, 20, 30, 40], "/unused", 2, archived(new Set()));
    expect(got).toEqual([10, 20]);
  });

  test("unbounded when no limit is given", () => {
    expect(selectBatch([3, 1, 2], "/unused", undefined, archived(new Set()))).toEqual([1, 2, 3]);
  });

  test("a backlog drains completely under repeated bounded ticks (anti-starvation)", () => {
    // The property that matters. Newest-first + a small cap re-picks the same head
    // every tick and never reaches the tail; oldest-first over a shrinking queue
    // guarantees every PR is eventually archived.
    const done = new Set<number>();
    const candidates = Array.from({ length: 50 }, (_, i) => i + 1);
    for (let tick = 0; tick < 100 && done.size < candidates.length; tick += 1) {
      for (const pr of selectBatch(candidates, "/unused", 3, archived(done))) done.add(pr);
    }
    expect(done.size).toBe(50);
  });

  test("returns empty once the backlog is drained (healthy steady state)", () => {
    const all = new Set([1, 2, 3]);
    expect(selectBatch([1, 2, 3], "/unused", 3, archived(all))).toEqual([]);
  });
});

describe("normalizeSince — the silent-zero-match trap", () => {
  const now = new Date("2026-08-14T12:00:00Z");

  test("'7d' becomes a real cutoff instead of matching nothing", () => {
    const cutoff = normalizeSince("7d", now);
    expect(cutoff).toBe("2026-08-07T12:00:00.000Z");
    // The original bug, pinned: a raw lexicographic compare against "7d" excluded
    // every ISO timestamp, so the sweep silently found zero PRs and exited 0.
    expect("2026-08-14T00:00:00Z" >= "7d").toBe(false);
    expect("2026-08-14T00:00:00Z" >= cutoff).toBe(true);
  });

  test("'24h' does not overflow into nonsense", () => {
    expect(normalizeSince("24h", now)).toBe("2026-08-13T12:00:00.000Z");
  });

  test("absolute dates pass through", () => {
    expect(normalizeSince("2026-07-01", now)).toBe("2026-07-01");
  });
});
