#!/usr/bin/env bun
import { readFileSync } from "fs";
import process from "process";

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");

const manifestPath = "docs/bootstrap-razor/SEED-MANIFEST.md";
const manifest = readFileSync(manifestPath, "utf8");

if (dryRun) {
  console.log("DRY-RUN: would read manifest from", manifestPath);
  const includeMatch = manifest.match(/include:([\s\S]*?)(?=\nexclude:|\n##|$)/);
  if (includeMatch) {
    console.log("DRY-RUN: would seed these globs:");
    console.log(includeMatch[1].trim());
  } else {
    console.log("DRY-RUN: manifest parse fallback (no include block)");
  }
  console.log("DRY-RUN: no repo created (gh api skipped in slice 1)");
  process.exit(0);
}

console.log("seed-test-repo: real run not implemented in this bounded slice; use --dry-run");
process.exit(1);
