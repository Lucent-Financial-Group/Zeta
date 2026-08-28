/**
 * no-tracked-file-is-ignored.test.ts
 *
 * INVARIANT: no file tracked in git may be matched by `.gitignore`.
 *
 * A tracked-but-ignored file is a trap with a success message. Git honours the index, so
 * the file stays tracked and everything looks fine — but `git add` on a NEW sibling
 * silently does nothing and still exits 0. Nobody discovers it until content that only
 * ever existed in one place quietly fails to be committed.
 *
 * MEASURED 2026-08-28. `.gitignore` line 1 is `bin/`, which matches a directory of that
 * name at ANY depth. Only `.codex/bin/` was exempted, so four tracked files were in this
 * state: `.claude/bin/claude-forward-tick.ts`, `.claude/bin/claude-loop-tick.ts`,
 * `.gemini/bin/lior-loop-tick.ts`, and `src/Core.Rust.Durability/src/bin/durability_fuzz.rs`
 * (Rust's `src/bin/` is a language convention, not a build output). They survived only
 * because each had been force-added at some point.
 *
 * It cost something real the same day: rescuing files from orphaned worktrees,
 * `git add` staged 439 of 447 and reported success. The eight it dropped were
 * `.gemini/bin/lior-loop-tick.ts` copies — the files that, being untracked by design in
 * their source trees, existed in no other copy. The filter removed exactly what most
 * needed rescuing.
 *
 * This test is general on purpose. It does not check the four known paths; it checks the
 * PROPERTY, so the next rule that swallows a tracked path fails here rather than in
 * someone's lost work.
 */

import { expect, test } from "bun:test";

const repoRoot = new URL("../../../", import.meta.url).pathname;

function git(args: readonly string[]): string {
  const r = Bun.spawnSync(["git", ...args], { cwd: repoRoot });
  return r.stdout.toString();
}

test("no tracked file is matched by .gitignore", () => {
  const tracked = git(["ls-files"]).split("\n").filter((l) => l.trim() !== "");

  // CONTROL: if this list is empty the assertion below is vacuous — it would "pass" in a
  // non-repo or on a broken git invocation. A real checkout has thousands of files.
  expect(tracked.length).toBeGreaterThan(1000);

  // `--no-index` is REQUIRED. Without it `check-ignore` stays silent on tracked paths,
  // which is precisely the population under test — the check would inspect nothing and
  // report success. This flag is the difference between a falsifier and a decoration.
  const r = Bun.spawnSync(["git", "check-ignore", "--no-index", "--stdin"], {
    cwd: repoRoot,
    stdin: new TextEncoder().encode(`${tracked.join("\n")}\n`),
  });
  const ignored = r.stdout.toString().split("\n").filter((l) => l.trim() !== "");

  // THE ONE LEGITIMATE CASE. `.gitkeep` exists precisely to be tracked inside a directory
  // that is otherwise ignored, so that git creates the directory on checkout. Being both
  // tracked and ignored is what the file is FOR — `tools/alloy/classes/` and
  // `tools/tla/specs/states/` are output directories their tooling requires to exist.
  //
  // The carve-out is by exact basename, not by directory prefix. A prefix allowlist would
  // grow silently and re-admit the whole failure class it exists to exclude.
  const offenders = ignored.filter((p) => !p.endsWith("/.gitkeep"));

  expect(offenders).toEqual([]);
});
