#!/usr/bin/env bun
/**
 * audit-shard-name-integrity.ts — detect memory-corruption bit-flips in shard filenames.
 *
 * WHY THIS EXISTS. On 2026-08-28 Apple Diagnostics returned RED ON MEMORY for the
 * maintainer's Mac Studio, confirming what eight days of crash forensics had inferred: an
 * intermittent memory-integrity fault below every runtime. A single-bit flip from that fault
 * had already reached `origin/main` — `shards` -> `shazds` (`r` 0x72 -> `z` 0x7a, ONE BIT)
 * and `...7803000&lt;...` (`0` 0x30 -> `<` 0x3c) inside a `.git/index`, committed and merged
 * as PR #15007 before being cleaned up by #15194 / #15206.
 *
 * WHY `git fsck` CANNOT FIND THIS. Git hashes what it is given. A bit flip that happens
 * BEFORE hashing produces an object that is internally consistent — correctly hashed, and
 * wrong. Git validates the hash, not the meaning. Every integrity guarantee git offers is
 * downstream of the moment the corruption already occurred.
 *
 * WHAT IS DETECTABLE INSTEAD: a DERIVABLE INVARIANT. A shard filename encodes its PR number
 * in its last four hex digits, and its directory is that number divided by 1000:
 *
 *     docs/github/prs/shards/015/08000000000000007803000000003a98.json
 *                            ^^^                              ^^^^
 *                            015 == floor(0x3a98 / 1000) == floor(15000 / 1000)
 *
 * That redundancy is what makes corruption visible. Two independent encodings of the same
 * fact must agree, so a flip in either one breaks the relation. This catches BOTH shapes:
 *   - a flip producing a non-hex character (the observed `0` -> `<`), and
 *   - a flip that stays valid hex but moves the implied bucket (`3a98` -> `3298`).
 *
 * MEASURED at introduction: 13,448 shards, 0 violations. That zero is the control — a check
 * whose population is empty proves nothing, so the runner refuses an empty scan.
 *
 * WHERE THIS MUST RUN — the part that is easy to get backwards. It belongs in CI, on Linux,
 * NOT on the machine under suspicion. Verifying integrity using the hardware suspected of
 * corrupting it is self-blinding by construction: the same error class as probing whether a
 * job finished over the API you are saturating. A clean local run of this audit is worth
 * very little; a clean CI run is worth what it says.
 */

export interface ShardViolation {
  readonly path: string;
  readonly reason: "non-hex-basename" | "directory-mismatch" | "bad-length";
  readonly detail: string;
}

/** Digits of the PR number encoded in the tail of a shard basename. */
const PR_HEX_DIGITS = 4;
/** Shards per directory bucket. */
const BUCKET = 1000;

/**
 * Check one shard path against the derivable invariant.
 *
 * Pure, so the rule is testable without a repository — the audit's whole value is this
 * function, and a rule that can only be exercised against real files is a rule nobody can
 * write a failing case for.
 */
export function checkShardPath(path: string): ShardViolation | null {
  const parts = path.split("/");
  const file = parts[parts.length - 1] ?? "";
  const dir = parts[parts.length - 2] ?? "";
  const base = file.replace(/\.json$/, "");

  if (!/^[0-9a-f]+$/.test(base)) {
    return { path, reason: "non-hex-basename", detail: `basename '${base}' is not lowercase hex` };
  }
  if (base.length < PR_HEX_DIGITS) {
    return { path, reason: "bad-length", detail: `basename '${base}' shorter than ${String(PR_HEX_DIGITS)} hex digits` };
  }
  const pr = Number.parseInt(base.slice(-PR_HEX_DIGITS), 16);
  const expected = String(Math.floor(pr / BUCKET)).padStart(3, "0");
  if (dir !== expected) {
    return {
      path,
      reason: "directory-mismatch",
      detail: `tail 0x${base.slice(-PR_HEX_DIGITS)} = ${String(pr)} implies directory '${expected}', found '${dir}'`,
    };
  }
  return null;
}

export function auditShardPaths(paths: readonly string[]): readonly ShardViolation[] {
  const out: ShardViolation[] = [];
  for (const p of paths) {
    const v = checkShardPath(p);
    if (v !== null) out.push(v);
  }
  return out;
}

if (import.meta.main) {
  const r = Bun.spawnSync(["git", "ls-files", "docs/github/prs/shards/*/*"]);
  const paths = r.stdout.toString().split("\n").filter((l) => l.trim() !== "");

  // THE CONTROL. An empty population makes "0 violations" vacuous — it is the difference
  // between "nothing is broken" and "nothing was examined". Refuse rather than report green.
  if (paths.length < 100) {
    console.log(`REFUSING: only ${String(paths.length)} shard paths found; expected thousands.`);
    console.log("A near-empty scan cannot distinguish a clean repository from a broken query.");
    process.exit(2);
  }

  const violations = auditShardPaths(paths);
  if (violations.length === 0) {
    console.log(`shard-name integrity: ${String(paths.length)} shards checked, 0 violations.`);
    process.exit(0);
  }
  console.log(`shard-name integrity: ${String(violations.length)} VIOLATION(S) of ${String(paths.length)} shards.`);
  for (const v of violations) {
    console.log(`::error title=Shard name integrity (${v.reason})::${v.path} — ${v.detail}`);
    console.log(`  ${v.path}\n    ${v.reason}: ${v.detail}`);
  }
  console.log("\nA violation here is a candidate MEMORY-CORRUPTION bit flip, not a typo:");
  console.log("these names are generated, never hand-written. Compare against the PR number");
  console.log("the shard claims to describe before assuming which half is wrong.");
  process.exit(1);
}
