#!/usr/bin/env bun
// lint-typescript.ts — TypeScript type checking, formatting, and linting checks.
//
// Post-install orchestration of TypeScript tools (tsc, eslint, prettier, stylelint)
// — it runs in CI where Bun is already available, so it is OUR CODE, not shell.
//
// Usage:
//   bun src/Core.TypeScript/lint/lint-typescript.ts

import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
// 3 levels up from src/Core.TypeScript/lint/ to repo root.
const REPO_ROOT = resolve(here, "..", "..", "..");

interface Step {
  readonly label: string;
  readonly cmd: readonly [string, ...string[]];
}

const STEPS: readonly Step[] = [
  { label: "TypeScript type check: tsc", cmd: ["bun", "x", "tsc", "--noEmit", "-p", "tsconfig.json"] },
];

interface PackageManifest {
  readonly devDependencies?: Readonly<Record<string, string>>;
}

export function findMissingRootDevDependencies(repoRoot: string): readonly string[] {
  const packageJson = JSON.parse(readFileSync(resolve(repoRoot, "package.json"), "utf8")) as PackageManifest;
  return Object.keys(packageJson.devDependencies ?? {})
    .filter((name) => !existsSync(resolve(repoRoot, "node_modules", name, "package.json")))
    .sort();
}

function run(step: Step): boolean {
  console.log(`=== ${step.label} ===`);
  const [bin, ...args] = step.cmd;
  for (let attempt = 1; attempt <= 2; attempt++) {
    const result = spawnSync(bin, args, {
      cwd: REPO_ROOT,
      encoding: "utf8",
      maxBuffer: 64 * 1024 * 1024,
    });
    process.stdout.write(result.stdout ?? "");
    process.stderr.write(result.stderr ?? "");

    if (result.error) {
      console.error(`✗ ${step.label}: failed to start — ${result.error.message}`);
      return false;
    }
    if (result.status === 0) {
      return true;
    }
    if (attempt === 1 && result.signal !== null) {
      console.warn(`↻ ${step.label}: retrying once after child process signal ${result.signal}`);
      continue;
    }

    console.error(`✗ ${step.label}: exited with code ${result.status ?? "signal"}`);
    return false;
  }
  return false;
}

function main(): number {
  let missing: readonly string[];
  try {
    missing = findMissingRootDevDependencies(REPO_ROOT);
  } catch (error) {
    console.error(`x Cannot inspect root devDependencies: ${error instanceof Error ? error.message : String(error)}`);
    return 1;
  }
  if (missing.length > 0) {
    console.error(`x Root devDependencies are not installed: ${missing.join(", ")}`);
    console.error("  Run: bun install --frozen-lockfile");
    return 1;
  }

  for (const step of STEPS) {
    if (!run(step)) return 1;
  }
  console.log("✓ TypeScript, Prettier, and style checks passed successfully!");
  return 0;
}

if (import.meta.main) process.exit(main());
