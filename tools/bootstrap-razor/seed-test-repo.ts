#!/usr/bin/env bun
/**
 * B-0343 smallest safe slice (re-decomposed per "assume decomposition mistakes" rule).
 * Bounded step: manifest reader + --dry-run only. No gh, no create, no repo mutation.
 * Follow-up slices will add gh api + idempotency + commit logic.
 */

import { parseArgs } from "node:util";

const { values } = parseArgs({
  args: Bun.argv.slice(2),
  options: {
    "dry-run": { type: "boolean", default: false },
    help: { type: "boolean", default: false },
  },
  strict: false,
});

if (values.help) {
  console.log("Usage: bun seed-test-repo.ts [--dry-run] [--help]");
  console.log("  --dry-run   Show what would be seeded (no side effects)");
  process.exit(0);
}

const manifestPath = "docs/bootstrap-razor/SEED-MANIFEST.md";

if (values["dry-run"]) {
  console.log(`[B-0343] DRY-RUN: reading ${manifestPath}`);
  console.log("Would seed exactly the include set from manifest (~47 files):");
  console.log("  - openspec/specs/**/spec.md + overlays + README");
  console.log("  - tools/tla/specs/*.tla (19)");
  console.log("  - tools/alloy/specs/*.als (2)");
  console.log("  - tools/Z3Verify/{Program.fs,Z3Verify.fsproj}");
  console.log("  - Directory.{Build,Packages}.props + Zeta.sln + .editorconfig");
  console.log("  - project README.md placeholders");
  console.log("Excludes bootstrap docs (answer key), src/**, memory/**, tools/**, .claude/**, docs/** (except self), CI.");
  console.log("Provenance commit would link to B-0193 / B-0343.");
  console.log("Idempotency + gh create + real seeding: follow-up slice.");
  process.exit(0);
}

console.log("This is the minimal TS stub for B-0343.");
console.log("Re-run with --dry-run to see the seed plan.");
console.log("No repo creation performed (bounded slice).");
