#!/usr/bin/env bun
// lint-go-python.ts — Go + Python formatting, linting, and type checking.
//
// Bun port of the former tools/lint/lint-go-python.sh. This is post-install
// orchestration of native toolchains (go fmt / golangci-lint in src/Core.Go;
// uv + ruff + mypy in src/Core.Python) — it runs in CI where Bun is already
// available, so it is OUR CODE, not shell (the bash-retirement discipline:
// shell is retained only for pre-runtime bootstrap or direct dev/OS surfaces).
//
// Usage:
//   bun src/Core.TypeScript/lint/lint-go-python.ts
//
// Exit codes: 0 — all checks pass; 1 — any check failed (fail-fast, matching
// the former `set -euo pipefail`).

import { spawnSync } from "node:child_process";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
// 3 levels up from src/Core.TypeScript/lint/ to repo root.
const REPO_ROOT = resolve(here, "..", "..", "..");

const GO_DIR = join(REPO_ROOT, "src", "Core.Go");
const PY_DIR = join(REPO_ROOT, "src", "Core.Python");

interface Step {
  readonly label: string;
  readonly cwd: string;
  readonly cmd: readonly [string, ...string[]];
}

const STEPS: readonly Step[] = [
  { label: "Linting Go: go fmt", cwd: GO_DIR, cmd: ["go", "fmt", "./..."] },
  { label: "Linting Go: golangci-lint", cwd: GO_DIR, cmd: ["golangci-lint", "run", "./..."] },
  { label: "Linting Python: uv sync", cwd: PY_DIR, cmd: ["uv", "sync"] },
  { label: "Linting Python: ruff check", cwd: PY_DIR, cmd: ["uv", "run", "ruff", "check"] },
  { label: "Linting Python: ruff format --check", cwd: PY_DIR, cmd: ["uv", "run", "ruff", "format", "--check"] },
  { label: "Linting Python: mypy", cwd: PY_DIR, cmd: ["uv", "run", "mypy", "src/", "tests/"] },
];

function run(step: Step): boolean {
  console.log(`=== ${step.label} ===`);
  const [bin, ...args] = step.cmd;
  // Repo-pinned toolchain binaries with explicit argv; no shell expansion.
  // eslint-disable-next-line sonarjs/no-os-command-from-path
  const result = spawnSync(bin, args, { cwd: step.cwd, stdio: "inherit" });
  if (result.error) {
    console.error(`✗ ${step.label}: failed to start — ${result.error.message}`);
    return false;
  }
  if (result.status !== 0) {
    console.error(`✗ ${step.label}: exited with code ${result.status ?? "signal"}`);
    return false;
  }
  return true;
}

function main(): number {
  for (const step of STEPS) {
    if (!run(step)) return 1;
  }
  console.log("✓ Go and Python linting checks passed successfully!");
  return 0;
}

process.exit(main());
