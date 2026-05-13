// create-repo.test.ts — DST coverage for the B-0424 Stage 1 scaffold tool.
//
// All tests run create-repo.ts as a subprocess with --dry-run (no external
// side effects, no network, no GitHub calls). Each test asserts the planned
// operation set is correct and complete before anyone runs --apply.
//
// Runs via:
//   bun test tools/scaffold/create-repo.test.ts
//
// Zero network — all data comes from the on-disk scaffold templates.

import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { beforeAll, describe, expect, test } from "bun:test";

const SCRIPT = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "create-repo.ts"
);

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

function runDryRun(repo: "forge" | "ace"): RunResult {
  const result = spawnSync("bun", [SCRIPT, "--repo", repo, "--dry-run"], {
    encoding: "utf8",
    maxBuffer: 4 * 1024 * 1024,
  });
  if (result.status !== 0) {
    throw new Error(
      `create-repo.ts exited ${result.status}: ${result.stderr}`
    );
  }
  return JSON.parse(result.stdout) as RunResult;
}

// Canonical step IDs emitted by the tool (order matches execution order in
// main: 01, 01b, 06, 02, 02b, 03a, 03b, 03c, 03d, 04, 05, 07).
const EXPECTED_STEPS = [
  "01-create-repo",
  "01b-merge-settings",
  "06-push-scaffold-files",
  "02-branch-protection",
  "02b-required-signed-commits",
  "03a-secret-scanning",
  "03b-dependabot-alerts",
  "03c-dependabot-security-updates",
  "03d-private-vuln-reporting",
  "04-codeql-default-setup",
  "05-fork-to-acehack",
  "07-next-steps",
] as const;

function assertCommonInvariants(result: RunResult, repoName: string): void {
  expect(result.dryRun).toBe(true);
  expect(result.repo).toBe(`Lucent-Financial-Group/${repoName}`);
  expect(result.summary).toContain("DRY RUN");
  expect(result.summary).toContain("planned");

  // Every operation is "planned" in dry-run mode.
  for (const op of result.operations) {
    expect(op.status).toBe("planned");
  }

  // Exact step inventory (order-independent).
  const steps = result.operations.map((o) => o.step);
  for (const expected of EXPECTED_STEPS) {
    expect(steps).toContain(expected);
  }
  expect(result.operations).toHaveLength(EXPECTED_STEPS.length);
}

// --- forge ---

describe("forge dry-run", () => {
  let result: RunResult;
  beforeAll(() => {
    result = runDryRun("forge");
  });

  test("produces dryRun:true with LFG/Forge repo name", () => {
    expect(result.dryRun).toBe(true);
    expect(result.repo).toBe("Lucent-Financial-Group/Forge");
  });

  test("all operations are planned (no executions in dry-run)", () => {
    for (const op of result.operations) {
      expect(op.status).toBe("planned");
    }
  });

  test("contains all 12 expected step IDs", () => {
    assertCommonInvariants(result, "Forge");
  });

  test("step 01 targets LFG/Forge as public squash-merge repo", () => {
    const op = result.operations.find((o) => o.step === "01-create-repo");
    expect(op).toBeDefined();
    expect(op!.data).toMatchObject({
      visibility: "public",
      allow_squash_merge: true,
      allow_merge_commit: false,
      allow_rebase_merge: false,
      delete_branch_on_merge: true,
      allow_auto_merge: true,
    });
  });

  test("step 02 branch protection disables force-push and requires linear history", () => {
    const op = result.operations.find((o) => o.step === "02-branch-protection");
    expect(op).toBeDefined();
    expect(op!.data).toMatchObject({
      allow_force_pushes: false,
      required_linear_history: true,
      required_conversation_resolution: true,
    });
  });

  test("step 02 branch protection has empty required_status_checks (avoids deadlock)", () => {
    const op = result.operations.find((o) => o.step === "02-branch-protection");
    expect(op).toBeDefined();
    const checks = (op!.data as { required_status_checks: { contexts: string[] } }).required_status_checks;
    // Empty at creation time — CI workflows don't exist yet; adding them before
    // the workflows land deadlocks the repo. Populated after CI is wired.
    expect(checks.contexts).toEqual([]);
  });

  test("step 04 enables CodeQL default-setup (not advanced-only)", () => {
    const op = result.operations.find((o) => o.step === "04-codeql-default-setup");
    expect(op).toBeDefined();
    expect(op!.data).toMatchObject({ state: "configured", query_suite: "default" });
    // Confirm description calls out the ruleset-rule requirement.
    expect(op!.description).toContain("code_scanning");
    expect(op!.description).toContain("default-setup");
  });

  test("step 05 forks to AceHack org", () => {
    const op = result.operations.find((o) => o.step === "05-fork-to-acehack");
    expect(op).toBeDefined();
    expect(op!.data).toMatchObject({ organization: "AceHack" });
    expect(op!.description).toContain("AceHack/Forge");
  });

  test("step 06 lists scaffold files to push", () => {
    const op = result.operations.find((o) => o.step === "06-push-scaffold-files");
    expect(op).toBeDefined();
    const files = (op!.data as { files: string[] }).files;
    expect(files.length).toBeGreaterThan(0);
    // Core governance files must be present.
    expect(files.some((f) => f.includes("README.md"))).toBe(true);
    expect(files.some((f) => f.includes("AGENTS.md"))).toBe(true);
    expect(files.some((f) => f.includes("GOVERNANCE.md"))).toBe(true);
    expect(files.some((f) => f.includes("SECURITY.md"))).toBe(true);
    expect(files.some((f) => f.includes("LICENSE"))).toBe(true);
    // GHA injection protection must be present from day one (B-0424.6).
    expect(files.some((f) => f.includes(".semgrep.yml"))).toBe(true);
    // Toolchain pin for semgrep must be scaffolded alongside it (B-0424.6).
    expect(files.some((f) => f.includes(".mise.toml"))).toBe(true);
  });

  test("step 07 lists manual steps including budget-cap verification", () => {
    const op = result.operations.find((o) => o.step === "07-next-steps");
    expect(op).toBeDefined();
    const manual = (op!.data as { manualSteps: string[] }).manualSteps;
    expect(manual.length).toBeGreaterThan(0);
    expect(manual.some((s) => s.toLowerCase().includes("budget"))).toBe(true);
    expect(manual.some((s) => s.toLowerCase().includes("codeql"))).toBe(true);
  });
});

// --- ace ---

describe("ace dry-run", () => {
  let result: RunResult;
  beforeAll(() => {
    result = runDryRun("ace");
  });

  test("produces dryRun:true with LFG/ace repo name", () => {
    expect(result.dryRun).toBe(true);
    expect(result.repo).toBe("Lucent-Financial-Group/ace");
  });

  test("all operations are planned (no executions in dry-run)", () => {
    for (const op of result.operations) {
      expect(op.status).toBe("planned");
    }
  });

  test("contains all 12 expected step IDs", () => {
    assertCommonInvariants(result, "ace");
  });

  test("step 01 targets LFG/ace as public squash-merge repo (no homepage)", () => {
    const op = result.operations.find((o) => o.step === "01-create-repo");
    expect(op).toBeDefined();
    expect(op!.data).toMatchObject({
      name: "ace",
      visibility: "public",
      allow_squash_merge: true,
    });
    // ace has no homepage in the config (unlike Forge which links back to Zeta).
    expect((op!.data as Record<string, unknown>)["homepage"]).toBeUndefined();
  });

  test("step 05 forks to AceHack org", () => {
    const op = result.operations.find((o) => o.step === "05-fork-to-acehack");
    expect(op).toBeDefined();
    expect(op!.data).toMatchObject({ organization: "AceHack" });
    expect(op!.description).toContain("AceHack/ace");
  });

  test("step 06 lists scaffold files to push", () => {
    const op = result.operations.find((o) => o.step === "06-push-scaffold-files");
    expect(op).toBeDefined();
    const files = (op!.data as { files: string[] }).files;
    expect(files.length).toBeGreaterThan(0);
    expect(files.some((f) => f.includes("README.md"))).toBe(true);
    expect(files.some((f) => f.includes("SECURITY.md"))).toBe(true);
    // GHA injection protection must be present from day one (B-0424.6).
    expect(files.some((f) => f.includes(".semgrep.yml"))).toBe(true);
    // Toolchain pin for semgrep must be scaffolded alongside it (B-0424.6).
    expect(files.some((f) => f.includes(".mise.toml"))).toBe(true);
  });
});

// --- error handling ---

describe("invalid --repo argument", () => {
  test("exits non-zero with usage message for unknown repo", () => {
    const result = spawnSync("bun", [SCRIPT, "--repo", "nonexistent", "--dry-run"], {
      encoding: "utf8",
    });
    expect(result.status).not.toBe(0);
    expect(result.stderr + result.stdout).toContain("Usage:");
  });

  test("exits non-zero when --repo is omitted", () => {
    const result = spawnSync("bun", [SCRIPT, "--dry-run"], {
      encoding: "utf8",
    });
    expect(result.status).not.toBe(0);
    expect(result.stderr + result.stdout).toContain("Usage:");
  });
});
