#!/usr/bin/env bun
/**
 * B-0267 smallest safe slice: Branch Safety ruleset creator (dry-run skeleton).
 * Creates "Branch Safety" ruleset with deletion protection, no force-push, linear history.
 * Usage: bun tools/github/create-branch-safety-ruleset.ts --dry-run
 * Part of ruleset split from B-0155 / B-0265.
 */
const DRY_RUN = process.argv.includes("--dry-run");

async function main() {
  console.log("B-0267: Branch Safety ruleset (smallest slice)");
  if (DRY_RUN) {
    console.log("DRY-RUN: would create ruleset 'Branch Safety' via gh api");
    console.log("Rules: deletion + non_fast_forward + linear_history");
    console.log("Target: all branches, enforce on main + develop");
    return;
  }
  // TODO: gh api repos/.../rulesets --method POST with payload
  console.log("Implement full create in next slice");
}

main().catch(console.error);