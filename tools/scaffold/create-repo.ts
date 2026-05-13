#!/usr/bin/env bun
// create-repo.ts — scaffolds a new GitHub repo with B-0424 best-practice settings.
//
// Implements Stage 1 of the three-repo split (ADR 2026-04-22). Applies
// the full best-practice checklist: merge settings, branch protection,
// security scanning, CodeQL default-setup, Dependabot, budget caps,
// and day-one governance files from tools/scaffold/<repoName>/.
//
// Usage:
//   bun tools/scaffold/create-repo.ts --repo forge --dry-run   # preview (default)
//   bun tools/scaffold/create-repo.ts --repo ace  --dry-run
//   bun tools/scaffold/create-repo.ts --repo forge --apply     # create for real
//   bun tools/scaffold/create-repo.ts --repo ace  --apply
//
// Requires:
//   gh CLI authenticated with: repo, read:org, workflow scopes
//   (add admin:org for budget-cap verification — optional)
//
// Output: one JSON object describing planned/executed operations.
//
// IMPORTANT: --apply creates real GitHub repos under LFG org.
// Review the --dry-run output carefully before passing --apply.

import { spawnSync } from "node:child_process";
import { existsSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

// --- Types ---

interface RepoConfig {
  org: string;
  name: string;
  description: string;
  homepage?: string;
}

interface Operation {
  step: string;
  description: string;
  command?: string;
  data?: Record<string, unknown>;
  status: "planned" | "executed" | "skipped" | "failed";
  error?: string;
}

interface RunResult {
  repo: string;
  dryRun: boolean;
  operations: Operation[];
  summary: string;
}

// --- Config ---

const REPO_CONFIGS: Record<string, RepoConfig> = {
  forge: {
    org: "Lucent-Financial-Group",
    name: "Forge",
    description:
      "Software factory that builds Zeta and ace — Claude-owned governance",
    homepage: "https://github.com/Lucent-Financial-Group/Zeta",
  },
  ace: {
    org: "Lucent-Financial-Group",
    name: "ace",
    description:
      "Package manager for the Lucent Financial Group software stack",
  },
};

const FORK_ORG = "AceHack";
const SCAFFOLD_DIR = new URL(".", import.meta.url).pathname;

// Required status checks for branch protection.
// CI workflows must emit these check names once they exist.
const REQUIRED_CHECKS = ["bun-test", "bun-lint", "codeql", "scorecard"];

// --- Argument parsing ---

const args = process.argv.slice(2);
const repoArg = args.find((_, i) => args[i - 1] === "--repo");
const dryRun = !args.includes("--apply");

if (!repoArg || !REPO_CONFIGS[repoArg]) {
  console.error(
    `Usage: bun tools/scaffold/create-repo.ts --repo <forge|ace> [--dry-run|--apply]`
  );
  console.error(`Known repos: ${Object.keys(REPO_CONFIGS).join(", ")}`);
  process.exit(1);
}

const config = REPO_CONFIGS[repoArg];
const ops: Operation[] = [];

// --- Helpers ---

function gh(args: string[]): { ok: boolean; stdout: string; stderr: string } {
  const result = spawnSync("gh", args, {
    encoding: "utf8",
    maxBuffer: 8 * 1024 * 1024,
  });
  return {
    ok: result.status === 0,
    stdout: (result.stdout ?? "").trim(),
    stderr: (result.stderr ?? "").trim(),
  };
}

function plan(
  step: string,
  description: string,
  command: string,
  data?: Record<string, unknown>
): Operation {
  const op: Operation = { step, description, command, data, status: "planned" };
  ops.push(op);
  return op;
}

function ghApiPatch(
  path: string,
  data: Record<string, unknown>,
  description: string,
  step: string
): Operation {
  const body = JSON.stringify(data);
  const op = plan(step, description, `gh api --method PATCH ${path} --input -`, data);
  if (!dryRun) {
    const result = spawnSync(
      "gh",
      ["api", "--method", "PATCH", path, "--input", "-"],
      { input: body, encoding: "utf8", maxBuffer: 8 * 1024 * 1024 }
    );
    op.status = result.status === 0 ? "executed" : "failed";
    if (op.status === "failed") op.error = result.stderr;
  }
  return op;
}

function ghApiPut(
  path: string,
  data: Record<string, unknown>,
  description: string,
  step: string
): Operation {
  const body = JSON.stringify(data);
  const op = plan(step, description, `gh api --method PUT ${path} --input -`, data);
  if (!dryRun) {
    const result = spawnSync(
      "gh",
      ["api", "--method", "PUT", path, "--input", "-"],
      { input: body, encoding: "utf8", maxBuffer: 8 * 1024 * 1024 }
    );
    op.status = result.status === 0 ? "executed" : "failed";
    if (op.status === "failed") op.error = result.stderr;
  }
  return op;
}

// --- Step implementations ---

function step01_createRepo(): void {
  const op = plan(
    "01-create-repo",
    `Create ${config.org}/${config.name} (public, squash-merge, auto-merge, delete-branch)`,
    `gh repo create ${config.org}/${config.name} --public --description "${config.description}"`,
    {
      name: config.name,
      description: config.description,
      visibility: "public",
      allow_squash_merge: true,
      allow_merge_commit: false,
      allow_rebase_merge: false,
      delete_branch_on_merge: true,
      allow_auto_merge: true,
    }
  );
  if (!dryRun) {
    // Create repo
    const create = gh([
      "repo",
      "create",
      `${config.org}/${config.name}`,
      "--public",
      "--description",
      config.description,
      "--clone=false",
    ]);
    if (!create.ok) {
      op.status = "failed";
      op.error = create.stderr;
      return;
    }
    // Apply merge settings via PATCH
    ghApiPatch(
      `/repos/${config.org}/${config.name}`,
      {
        allow_squash_merge: true,
        allow_merge_commit: false,
        allow_rebase_merge: false,
        delete_branch_on_merge: true,
        allow_auto_merge: true,
      },
      "Apply merge/auto-merge settings",
      "01b-merge-settings"
    );
    op.status = "executed";
  }
}

function step02_branchProtection(): void {
  ghApiPut(
    `/repos/${config.org}/${config.name}/branches/main/protection`,
    {
      required_status_checks: {
        strict: true,
        contexts: REQUIRED_CHECKS,
      },
      enforce_admins: true,
      required_pull_request_reviews: {
        dismiss_stale_reviews: true,
        required_approving_review_count: 1,
        require_last_push_approval: false,
      },
      restrictions: null,
      required_linear_history: true,
      allow_force_pushes: false,
      allow_deletions: false,
      block_creations: false,
      required_conversation_resolution: true,
    },
    `Apply branch protection to ${config.name}/main (1 review, signed commits, linear history, no force-push)`,
    "02-branch-protection"
  );

  // Required signed commits is a separate endpoint — the main protection PUT does not cover it.
  ghApiPut(
    `/repos/${config.org}/${config.name}/branches/main/protection/required_signatures`,
    {},
    `Require signed commits on ${config.name}/main`,
    "02b-required-signed-commits"
  );
}

function step03_enableSecurity(): void {
  // Secret scanning + push protection
  ghApiPatch(
    `/repos/${config.org}/${config.name}`,
    {
      security_and_analysis: {
        secret_scanning: { status: "enabled" },
        secret_scanning_push_protection: { status: "enabled" },
      },
    },
    "Enable secret scanning + push protection",
    "03a-secret-scanning"
  );

  // Dependabot alerts (vulnerability alerts)
  const depOp = plan(
    "03b-dependabot-alerts",
    "Enable Dependabot vulnerability alerts",
    `gh api --method PUT /repos/${config.org}/${config.name}/vulnerability-alerts`,
    {}
  );
  if (!dryRun) {
    const result = gh([
      "api",
      "--method",
      "PUT",
      `/repos/${config.org}/${config.name}/vulnerability-alerts`,
    ]);
    depOp.status = result.ok ? "executed" : "failed";
    if (!result.ok) depOp.error = result.stderr;
  }

  // Dependabot security updates (automated PRs)
  const autoOp = plan(
    "03c-dependabot-security-updates",
    "Enable Dependabot security updates (automated PRs)",
    `gh api --method PUT /repos/${config.org}/${config.name}/automated-security-fixes`,
    {}
  );
  if (!dryRun) {
    const result = gh([
      "api",
      "--method",
      "PUT",
      `/repos/${config.org}/${config.name}/automated-security-fixes`,
    ]);
    autoOp.status = result.ok ? "executed" : "failed";
    if (!result.ok) autoOp.error = result.stderr;
  }

  // Private vulnerability reporting
  ghApiPatch(
    `/repos/${config.org}/${config.name}`,
    { private_vulnerability_reporting_enabled: true },
    "Enable private vulnerability reporting",
    "03d-private-vuln-reporting"
  );
}

function step04_codeqlDefaultSetup(): void {
  // CodeQL default-setup is required (NOT advanced-only) because
  // the code_scanning ruleset rule requires default-setup.
  // Ref: memory/reference_github_code_scanning_ruleset_rule_requires_default_setup.md
  ghApiPatch(
    `/repos/${config.org}/${config.name}/code-scanning/default-setup`,
    {
      state: "configured",
      query_suite: "default",
    },
    "Enable CodeQL default-setup (required for code_scanning ruleset rule — advanced-only fails)",
    "04-codeql-default-setup"
  );
}

function step05_forkToAcehack(): void {
  const op = plan(
    "05-fork-to-acehack",
    `Fork ${config.org}/${config.name} → ${FORK_ORG}/${config.name}`,
    `gh api --method POST /repos/${config.org}/${config.name}/forks --field organization=${FORK_ORG}`,
    { organization: FORK_ORG }
  );
  if (!dryRun) {
    const result = spawnSync(
      "gh",
      [
        "api",
        "--method",
        "POST",
        `/repos/${config.org}/${config.name}/forks`,
        "--field",
        `organization=${FORK_ORG}`,
      ],
      { encoding: "utf8", maxBuffer: 8 * 1024 * 1024 }
    );
    op.status = result.status === 0 ? "executed" : "failed";
    if (op.status === "failed") op.error = result.stderr;
  }
}

function step06_pushScaffoldFiles(): void {
  const scaffoldPath = join(SCAFFOLD_DIR, repoArg);
  if (!existsSync(scaffoldPath)) {
    plan(
      "06-push-scaffold-files",
      `No scaffold directory found at ${scaffoldPath} — skipping file push`,
      "",
      {}
    ).status = "skipped";
    return;
  }

  // Enumerate scaffold files
  const files = collectFiles(scaffoldPath);
  const op = plan(
    "06-push-scaffold-files",
    `Push ${files.length} scaffold files to ${config.org}/${config.name} via git`,
    `git clone + git add + git commit + git push`,
    { files: files.map((f) => relative(scaffoldPath, f)) }
  );

  if (!dryRun) {
    // Clone, copy files, commit, push
    const tmpDir = `/tmp/scaffold-${config.name}-${Date.now()}`;
    const cloneResult = gh([
      "repo",
      "clone",
      `${config.org}/${config.name}`,
      tmpDir,
    ]);
    if (!cloneResult.ok) {
      op.status = "failed";
      op.error = `Clone failed: ${cloneResult.stderr}`;
      return;
    }

    // Copy files
    for (const src of files) {
      const rel = relative(scaffoldPath, src);
      const dst = join(tmpDir, rel);
      const dstDir = dst.substring(0, dst.lastIndexOf("/"));
      spawnSync("mkdir", ["-p", dstDir]);
      spawnSync("cp", [src, dst]);
    }

    // Commit and push
    const gitOpts = { cwd: tmpDir, encoding: "utf8" as const };
    spawnSync("git", ["add", "-A"], gitOpts);
    spawnSync(
      "git",
      [
        "commit",
        "-m",
        `chore(scaffold): day-one governance files\n\nB-0424 Stage 1 — three-repo split scaffolding.\nSee docs/DECISIONS/2026-04-22-three-repo-split-zeta-forge-ace.md\n\nCo-Authored-By: Claude <noreply@anthropic.com>`,
      ],
      gitOpts
    );
    const push = spawnSync("git", ["push", "origin", "main"], gitOpts);
    op.status = push.status === 0 ? "executed" : "failed";
    if (op.status === "failed") op.error = push.stderr ?? "";

    // Cleanup
    spawnSync("rm", ["-rf", tmpDir]);
  }
}

function collectFiles(dir: string): string[] {
  const results: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      results.push(...collectFiles(full));
    } else {
      results.push(full);
    }
  }
  return results;
}

function step07_summary(): void {
  plan(
    "07-next-steps",
    "Manual steps required after this tool completes",
    "",
    {
      manualSteps: [
        "Upload SVG social-preview PNG via GitHub UI (GitHub requires rasterized PNG format)",
        "Enable merge queue via GitHub UI: Settings → Merge queue (org feature, no API)",
        "Wire OpenSSF Scorecard workflow: copy from Zeta's .github/workflows/scorecard.yml",
        "Add Semgrep GHA inline-untrusted-in-run rule workflow",
        "Verify budget caps $0 at org level: github.com/organizations/Lucent-Financial-Group/settings/billing",
        "Confirm CodeQL default-setup is active: Security → Code scanning → Default setup",
      ],
    }
  ).status = "planned";
}

// --- Main ---

step01_createRepo();
step06_pushScaffoldFiles(); // must run before branch protection to allow direct push to main
step02_branchProtection();
step03_enableSecurity();
step04_codeqlDefaultSetup();
step05_forkToAcehack();
step07_summary();

const failed = ops.filter((o) => o.status === "failed").length;
const executed = ops.filter((o) => o.status === "executed").length;
const planned = ops.filter((o) => o.status === "planned").length;

const result: RunResult = {
  repo: `${config.org}/${config.name}`,
  dryRun,
  operations: ops,
  summary: dryRun
    ? `DRY RUN — ${planned} operations planned for ${config.org}/${config.name}. Pass --apply to execute.`
    : `${executed} executed, ${failed} failed out of ${ops.length} total operations.`,
};

console.log(JSON.stringify(result, null, 2));

if (!dryRun && failed > 0) {
  process.exit(1);
}
