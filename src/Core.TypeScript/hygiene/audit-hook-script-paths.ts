#!/usr/bin/env bun
// audit-hook-script-paths.ts — every script a Claude Code hook points at must exist.
//
// WHY THIS EXISTS. `.claude/hooks/verify-branch-pretooluse.ts` spawned
// `${projectDir}/tools/orchestrator-checks/verify-branch.ts`. PR #8048 relocated that whole
// directory to `src/Core.TypeScript/orchestrator-checks/` and the hook's literal was not updated,
// so from that merge onward the branch gate spawned a file that did not exist.
//
// WHAT MAKES THIS CLASS WORTH A GUARD RATHER THAN A FIXUP. The failure is INVISIBLE FROM THE
// OUTSIDE, in both directions at once:
//
//   • The hook still ran, still returned a well-formed `permissionDecision: "deny"`, and still
//     looked like a working gate. Its deny reason was `Module not found "...verify-branch.ts"` —
//     a refusal that reads as enforcement to anyone not reading the string.
//   • And it only speaks at all when `ZETA_EXPECTED_BRANCH` is set, which is opt-in. With the
//     variable unset — the normal case — the hook exits 0 before it would ever have discovered
//     that its target was gone. A gate nobody armed cannot report its own absence.
//
// So the defect survived a refactor, a full CI gate, and every interactive session in between:
// nothing in the repo asserted that the path in the literal names a file. `tsc` cannot catch it
// (the path lives in a string), `git grep` for the old prefix finds it only if someone thinks to
// look, and the hook's own tests do not exist. A path inside a string is not type-checked by
// anything — so it has to be checked by something.
//
// WHAT IT CHECKS. Both ends of the wiring, because either can rot independently:
//   1. `.claude/settings.json` — every `$CLAUDE_PROJECT_DIR`-rooted hook command names a real file
//      (a hook wired into settings but deleted from disk).
//   2. `.claude/hooks/*.ts` — every `${projectDir}`-rooted path a hook spawns names a real file
//      (the #8048 shape: the hook exists, its target moved).
//
// Usage:  bun src/Core.TypeScript/hygiene/audit-hook-script-paths.ts
//
// Exit codes:
//   0   every referenced path resolves
//   1   at least one reference is dangling

import { readFileSync, existsSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";

/** One `<source file>` → `<repo-relative path it names>` reference. */
export interface HookReference {
  /** Repo-relative path of the file that CONTAINS the reference. */
  readonly source: string;
  /** Repo-relative path the reference names. */
  readonly target: string;
}

/**
 * Paths are extracted from two rooting idioms, and only those two.
 *
 * `$CLAUDE_PROJECT_DIR` is the shell form Claude Code substitutes in `settings.json` commands;
 * `${projectDir}` is the TS form the hook scripts build with. Both are followed by `/<path>`.
 * A bare relative path is deliberately NOT matched: it would be resolved against the process cwd
 * at fire time, which is not knowable here, and guessing would produce false positives.
 */
const ROOTED_PATH_PATTERNS: readonly RegExp[] = [
  // `\\?"?` because settings.json is JSON and this audit reads the RAW file, not a parsed value:
  // the shell quote around the variable is stored escaped, as `\"$CLAUDE_PROJECT_DIR\"/...`.
  // Without tolerating that backslash the settings half of this audit matches nothing and
  // silently checks only the hook scripts — a guard that half-guards while reporting success.
  /\$CLAUDE_PROJECT_DIR\\?"?\/([A-Za-z0-9_./-]+\.[A-Za-z0-9]+)/g,
  /\$\{projectDir\}\/([A-Za-z0-9_./-]+\.[A-Za-z0-9]+)/g,
];

/** Extract every rooted path reference from one file's text. Pure — no IO. */
export function extractReferences(source: string, text: string): readonly HookReference[] {
  const found: HookReference[] = [];
  const seen = new Set<string>();
  for (const pattern of ROOTED_PATH_PATTERNS) {
    // `lastIndex` is per-RegExp object and these are module-level, so reset before each scan.
    pattern.lastIndex = 0;
    let match = pattern.exec(text);
    while (match !== null) {
      const target = match[1];
      if (target !== undefined && !seen.has(target)) {
        seen.add(target);
        found.push({ source, target });
      }
      match = pattern.exec(text);
    }
  }
  return found;
}

/** The references that name nothing. Pure — `exists` is injected so tests need no fixture tree. */
export function danglingReferences(
  references: readonly HookReference[],
  exists: (target: string) => boolean,
): readonly HookReference[] {
  return references.filter((r) => !exists(r.target));
}

/**
 * Read a file, or report it absent.
 *
 * NOT `existsSync` then `readFileSync`: the answer the check returned is already stale when the
 * use runs, so the guard reads as defensive and prevents nothing. One syscall, one answer.
 * (`lint-check-then-use-file-races.ts` enforces this, and caught the first draft of this file.)
 */
function readTextOrAbsent(path: string): string | undefined {
  try {
    return readFileSync(path, "utf8");
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return undefined;
    throw err;
  }
}

/** List a directory, or report it absent — same one-syscall discipline as readTextOrAbsent. */
function listDirOrAbsent(path: string): readonly string[] | undefined {
  try {
    return readdirSync(path);
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code === "ENOENT" || code === "ENOTDIR") return undefined;
    throw err;
  }
}

/**
 * The candidate files this audit reads: `.claude/settings.json` + `.claude/hooks/*.ts`.
 *
 * Settings is listed unconditionally — a candidate, not a promise. `audit` skips what it cannot
 * read, which is the same answer without a second syscall to race against.
 */
export function hookSourceFiles(repoRoot: string): readonly string[] {
  const sources: string[] = [".claude/settings.json"];
  for (const entry of [...(listDirOrAbsent(join(repoRoot, ".claude", "hooks")) ?? [])].sort()) {
    if (entry.endsWith(".ts")) sources.push(`.claude/hooks/${entry}`);
  }
  return sources;
}

export function audit(repoRoot: string): readonly HookReference[] {
  const references: HookReference[] = [];
  for (const source of hookSourceFiles(repoRoot)) {
    const text = readTextOrAbsent(join(repoRoot, source));
    if (text !== undefined) references.push(...extractReferences(source, text));
  }
  // Existence is the whole question here — nothing is read afterwards, so there is no
  // check-then-use window to close.
  return danglingReferences(references, (target) => existsSync(join(repoRoot, target)));
}

if (import.meta.main) {
  const repoRoot = resolve(process.argv[2] ?? process.cwd());
  const dangling = audit(repoRoot);

  if (dangling.length === 0) {
    console.log("audit-hook-script-paths: every hook-referenced path resolves.");
    process.exit(0);
  }

  console.error(`audit-hook-script-paths: ${dangling.length} dangling hook reference(s).`);
  for (const r of dangling) {
    console.error(`  ${r.source} → ${r.target}  (no such file)`);
  }
  console.error("");
  console.error("A hook whose target moved still returns a well-formed deny — it just denies for");
  console.error("the wrong reason. Update the literal, or delete the wiring.");
  process.exit(1);
}
