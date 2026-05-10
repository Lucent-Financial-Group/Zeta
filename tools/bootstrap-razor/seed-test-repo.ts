#!/usr/bin/env bun
import { readFileSync } from "fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import process from "process";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(scriptDir, "../..");
const manifestPath = resolve(repoRoot, "docs/bootstrap-razor/SEED-MANIFEST.md");

export function main(argv: string[]): number {
  const dryRun = argv.includes("--dry-run");

  if (dryRun) {
    const manifest = readFileSync(manifestPath, "utf8");
    console.log("DRY-RUN: would read manifest from", manifestPath);
    // Capture only the fenced YAML block content under `include:`, stopping
    // before the closing fence (```) to avoid leaking Markdown syntax.
    const includeMatch = manifest.match(
      /include:\s*```yaml\s*([\s\S]*?)```/,
    );
    if (includeMatch) {
      const captured = includeMatch[1];
      console.log("DRY-RUN: would seed these globs:");
      console.log(captured !== undefined ? captured.trim() : "(empty)");
    } else {
      console.log("DRY-RUN: manifest parse fallback (no fenced include block)");
    }
    console.log("DRY-RUN: no repo created (gh api skipped in slice 1)");
    return 0;
  }

  console.log("seed-test-repo: real run not implemented in this bounded slice; use --dry-run");
  return 1;
}

if (import.meta.main) {
  process.exit(main(process.argv.slice(2)));
}
