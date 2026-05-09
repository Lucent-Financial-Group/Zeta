#!/usr/bin/env bun
// b0266-review-policy-ruleset.ts — one-shot migration for B-0266.
//
// Creates "Review Policy" ruleset with pull_request + copilot_code_review
// rules, then removes those rules from the "Default" ruleset.
// After both API calls succeed, re-snapshots expected.json.
//
// Usage:
//   bun tools/migrations/b0266-review-policy-ruleset.ts [--dry-run]
//
// Requires: gh CLI authenticated with repo admin scope.

const OWNER = "Lucent-Financial-Group";
const REPO = "Zeta";
const DEFAULT_RULESET_ID = 15256879;

interface SpawnResult {
  readonly stdout: string;
  readonly stderr: string;
  readonly exitCode: number;
}

async function run(cmd: readonly string[]): Promise<SpawnResult> {
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

async function ghApi(
  method: string,
  path: string,
  body?: unknown,
): Promise<unknown> {
  const args = ["gh", "api", path, "--method", method];
  if (body !== undefined) {
    args.push("--input", "-");
  }
  const proc = Bun.spawn({
    cmd: args,
    stdout: "pipe",
    stderr: "pipe",
    stdin: body !== undefined ? new Blob([JSON.stringify(body)]) : undefined,
  });
  const [stdout, stderr] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
  ]);
  const exitCode = await proc.exited;
  if (exitCode !== 0) {
    throw new Error(
      `gh api ${method} ${path} failed (exit ${exitCode}): ${stderr.trim()}`,
    );
  }
  return JSON.parse(stdout);
}

const reviewPolicyPayload = {
  name: "Review Policy",
  target: "branch",
  enforcement: "active",
  conditions: {
    ref_name: {
      include: ["~DEFAULT_BRANCH"],
      exclude: [],
    },
  },
  rules: [
    {
      type: "copilot_code_review",
      parameters: {
        review_draft_pull_requests: true,
        review_on_push: true,
      },
    },
    {
      type: "pull_request",
      parameters: {
        allowed_merge_methods: ["squash"],
        dismiss_stale_reviews_on_push: false,
        require_code_owner_review: false,
        require_last_push_approval: false,
        required_approving_review_count: 0,
        required_review_thread_resolution: true,
        required_reviewers: [],
      },
    },
  ],
};

const updatedDefaultPayload = {
  name: "Default",
  enforcement: "active",
  conditions: {
    ref_name: {
      include: ["~DEFAULT_BRANCH"],
      exclude: [],
    },
  },
  rules: [
    { type: "deletion" },
    { type: "non_fast_forward" },
    { type: "required_linear_history" },
  ],
};

async function main(): Promise<void> {
  const dryRun = process.argv.includes("--dry-run");

  console.log("B-0266: Review Policy ruleset migration");
  console.log("========================================");
  console.log();

  if (dryRun) {
    console.log("[DRY RUN] Would create Review Policy ruleset:");
    console.log(JSON.stringify(reviewPolicyPayload, null, 2));
    console.log();
    console.log(
      `[DRY RUN] Would update Default ruleset (${DEFAULT_RULESET_ID}) to:`,
    );
    console.log(JSON.stringify(updatedDefaultPayload, null, 2));
    console.log();
    console.log("[DRY RUN] Would re-snapshot expected.json");
    return;
  }

  console.log("Step 1: Creating Review Policy ruleset...");
  const created = (await ghApi(
    "POST",
    `repos/${OWNER}/${REPO}/rulesets`,
    reviewPolicyPayload,
  )) as { id: number; name: string };
  console.log(`  Created ruleset "${created.name}" (id: ${created.id})`);
  console.log();

  console.log(
    `Step 2: Updating Default ruleset (${DEFAULT_RULESET_ID}) — removing pull_request + copilot_code_review...`,
  );
  await ghApi(
    "PUT",
    `repos/${OWNER}/${REPO}/rulesets/${DEFAULT_RULESET_ID}`,
    updatedDefaultPayload,
  );
  console.log("  Default ruleset updated (3 rules: deletion, non_fast_forward, required_linear_history)");
  console.log();

  console.log("Step 3: Re-snapshotting expected.json...");
  const snapshotResult = await run([
    "bun",
    "tools/hygiene/snapshot-github-settings.ts",
  ]);
  if (snapshotResult.exitCode !== 0) {
    console.error("  Snapshot failed:", snapshotResult.stderr);
    process.exit(1);
  }
  const expectedPath = "tools/hygiene/github-settings.expected.json";
  await Bun.write(expectedPath, snapshotResult.stdout);
  console.log(`  Wrote ${expectedPath}`);
  console.log();

  console.log("Done. Verify with:");
  console.log("  bun tools/hygiene/check-github-settings-drift.ts");
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
