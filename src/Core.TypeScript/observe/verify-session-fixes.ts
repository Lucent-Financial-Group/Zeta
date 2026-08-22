#!/usr/bin/env bun
/**
 * verify-session-fixes.ts — confirm the 2026-08-22 session fixes took effect.
 *
 * Run after a few heartbeat ticks to verify:
 * 1. data/ci-runs.jsonl exists and is growing (drift-rate recording)
 * 2. RS blocks show real phase ranges (not all 1-1)
 * 3. Vault status reflects actual activity
 * 4. Connectivity is capped at 100%
 *
 * Exit 0 = all confirmed. Exit 1 = some still pending.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

const repoRoot = process.cwd();
let issues = 0;

function check(name: string, ok: boolean, detail: string): void {
  const icon = ok ? "✓" : "✗";
  console.log(`${icon} ${name}: ${detail}`);
  if (!ok) issues++;
}

/**
 * The file's bytes, or `null` when it is not there.
 *
 * ONE SYSCALL, ONE ANSWER. `existsSync(p)` followed by `readFileSync(p)` is a
 * check-then-use race: between the two the path can be created, deleted or
 * replaced, so the answer the check returned is already stale when the read
 * runs. The check reads as defensive and prevents nothing — the read has to be
 * able to fail either way, so let it fail and interpret the failure.
 *
 * This is the shape `cluster/rendered-storage-claims.ts` already uses. Refused
 * by `src/Core.TypeScript/hygiene/lint-check-then-use-file-races.ts`.
 *
 * ENOENT is the ordinary "the tick has not written it yet" case that this script
 * exists to report. Anything else — unreadable, a directory, EIO — is rethrown
 * rather than reported as "does not exist", because a script whose whole job is
 * to say whether a fix landed must not answer "no" when it means "I could not
 * tell". That distinction is the reason the catch is narrow.
 */
function readIfPresent(abs: string): string | null {
  try {
    return readFileSync(abs, "utf-8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }
}

// 1. Drift-rate accumulating
const ciRunsText = readIfPresent(join(repoRoot, "data", "ci-runs.jsonl"));
if (ciRunsText !== null) {
  const lines = ciRunsText.trim().split("\n").filter((l) => l);
  check("Drift-rate", lines.length > 0, `${lines.length} run(s) recorded`);
} else {
  check("Drift-rate", false, "data/ci-runs.jsonl does not exist yet — wait for next heartbeat tick");
}

// 2. RS blocks with real phase ranges
const rsBlocksText = readIfPresent(join(repoRoot, "data", "rs-blocks.jsonl"));
if (rsBlocksText !== null) {
  const lines = rsBlocksText.trim().split("\n").filter((l) => l);
  const blocks = lines.map((l) => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);
  const realBlocks = blocks.filter((b: any) => b.endPhase - b.startPhase > 1);
  check("RS blocks", realBlocks.length > 0,
    realBlocks.length > 0
      ? `${realBlocks.length} block(s) with real phase ranges (fix confirmed)`
      : `${blocks.length} total blocks but all show phases 1-1 (buffer fix pending next tick)`);
} else {
  check("RS blocks", false, "data/rs-blocks.jsonl does not exist");
}

// 3. Vault status
//
// READ ONCE, not once per check. Sections 3 and 4 both need vault-state.json and
// previously read it twice, so a write landing between the two reads could have
// reported a vault count from one file and a connectivity list from another —
// two checks disagreeing about the same tick. One read, one snapshot.
const vaultText = readIfPresent(join(repoRoot, "data", "vault-state.json"));
if (vaultText !== null) {
  const vault = JSON.parse(vaultText);
  const liveVaults = vault.vaults.filter((v: any) => v.status === "live").length;
  check("Vault status", liveVaults >= 3,
    `${liveVaults}/5 vaults live (action-recognition fix ${liveVaults >= 3 ? "confirmed" : "pending"})`);
} else {
  check("Vault status", false, "data/vault-state.json does not exist");
}

// 4. Connectivity capped
if (vaultText !== null) {
  const vault = JSON.parse(vaultText);
  const connectivity = vault.connectivity ?? [];
  const allCapped = connectivity.every((c: any) => c.connectivity <= 1.0);
  check("Connectivity", allCapped && connectivity.length > 0,
    connectivity.length > 0
      ? `all agents ≤100% (max: ${Math.max(...connectivity.map((c: any) => c.connectivity)) * 100}%)`
      : "no connectivity data");
} else {
  check("Connectivity", false, "no vault-state");
}

console.log(`\n${issues === 0 ? "All fixes confirmed ✓" : `${issues} item(s) still pending — run again after a few ticks`}`);
process.exit(issues > 0 ? 1 : 0);
