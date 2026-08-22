// Falsifiers for PM001 (`lint-no-direct-push-to-main.ts`).
//
// The check exists because a lane that pushes at `main` is DEAD CODE that stays green
// until the day it matters. A test suite for it that only asserted "the repo passes
// today" would be the same defect wearing the test's clothes — green because nothing
// exercised it. So every test below asserts on a shape the scanner must CATCH or must
// NOT catch, with the real pre-fix text from the three lanes this change repaired.

import { describe, expect, test } from "bun:test";

import {
  applyRoster,
  importsOf,
  isTestFile,
  scanText,
  scriptsInvokedBy,
  type Finding,
} from "./lint-no-direct-push-to-main.ts";

const at = (src: string): readonly Finding[] => scanText("f", src, "workflow");

describe("scanText — the shapes that must be caught", () => {
  test("catches the exact line lockfile-healer.yml carried", () => {
    expect(at("          git push origin HEAD:main")).toHaveLength(1);
  });

  test("catches it inside a shell `if`, as zetadb-scheduled-node.yml had it", () => {
    // The push was the condition of an `if`, buried in a five-attempt retry loop. A
    // scanner anchored to start-of-line would have missed the one that mattered.
    expect(at("            if git push origin HEAD:main; then")).toHaveLength(1);
  });

  test("catches a push performed from TypeScript, as retraction-actuator.ts did", () => {
    // This is the site no grep of `.github/workflows/**` could find, and the reason
    // this check follows workflow-invoked code instead of stopping at the YAML.
    expect(at('        sh("git push origin HEAD:main");')).toHaveLength(1);
  });

  test("catches the argv-array spelling used by execFileSync/spawnSync callers", () => {
    expect(at('      execFileSync("git", ["push", "origin", "HEAD:main"], opts);')).toHaveLength(1);
    expect(at('    git(["push", "origin", "main"]);')).toHaveLength(1);
  });

  test("catches an argv array wrapped across lines", () => {
    // Hand-wrapping the array must not be a way around the check.
    expect(at('run([\n  "push",\n  "origin",\n  "HEAD:main",\n]);')).not.toHaveLength(0);
  });

  test("catches the longhand ref spelling", () => {
    expect(at("git push origin HEAD:refs/heads/main")).toHaveLength(1);
  });

  test("a rebase first does not launder it — that is AH001's question, not this one", () => {
    // Every lane in this class rebased diligently and passed AH001 while being unable
    // to push at all. If this assertion ever flips, the two checks have collapsed into
    // one and this one has stopped constraining anything.
    const block = "git pull --rebase --autostash origin main\ngit push origin HEAD:main";
    expect(at(block)).toHaveLength(1);
  });

  test("`[skip ci]` does not launder it either — the check is missing, not failing", () => {
    expect(at('git commit -m "x [skip ci]"\ngit push origin HEAD:main')).toHaveLength(1);
  });
});

describe("scanText — the shapes that must NOT be caught", () => {
  test("the legal route: a force-with-lease push to a heartbeat staging ref", () => {
    expect(at('git push --force-with-lease origin "HEAD:refs/heads/heartbeat/tick-metrics"')).toHaveLength(0);
    expect(at('const push = git("push", "--force-with-lease", "origin", `HEAD:refs/heads/${ref}`);')).toHaveLength(0);
  });

  test("prose describing the defect is not the defect", () => {
    // This file, the lint's own header, and three workflow headers all now spell the
    // forbidden command out in comments to explain why it is forbidden. If comments
    // counted, documenting the rule would violate it.
    expect(at("# it used to end in `git push origin HEAD:main`, which cannot succeed")).toHaveLength(0);
    expect(at("// This edge used to run `git push origin HEAD:main`.")).toHaveLength(0);
    expect(at(" * git push origin HEAD:main")).toHaveLength(0);
  });

  test("an echoed instruction names a push, it does not perform one", () => {
    expect(at('echo "run: git push origin HEAD:main"')).toHaveLength(0);
  });

  test("Array.prototype.push is not a git push, even when it carries a refspec", () => {
    // The reason the verb is matched as `git push` / `"push",` and never as bare
    // `push` — this repo has thousands of the latter.
    //
    // The second line is the one that earns its keep: mutating PUSH_VERB to bare
    // /push/ SURVIVED an earlier version of this test, because `out.push(main)` has no
    // destination for the window to find and so passed either way. A collected refspec
    // does have one, so it separates the two regexes instead of agreeing with both.
    expect(at("  out.push(main);\n  findings.push(mainBranch);")).toHaveLength(0);
    expect(at('  refspecs.push("HEAD:main");')).toHaveLength(0);
  });

  test("pushing some other branch is out of scope — only `main` is ruleset-fatal", () => {
    expect(at("git push origin HEAD:my-feature-branch")).toHaveLength(0);
    expect(at("git push origin HEAD:refs/heads/research/foo")).toHaveLength(0);
  });
});

describe("isTestFile — the declared scope boundary", () => {
  test("test files are out of scope, by convention name", () => {
    // Pinned so the boundary is a decision and not an accident. It exists because this
    // suite must QUOTE the forbidden command to assert that it is caught, and a push in
    // a string literal is indistinguishable from the real `sh("git push origin
    // HEAD:main")` defect. See the header for the limit this leaves open.
    expect(isTestFile("src/Core.TypeScript/hygiene/lint-no-direct-push-to-main.test.ts")).toBe(true);
    expect(isTestFile("a/b.spec.mts")).toBe(true);
  });

  test("production modules are IN scope — the boundary is narrow", () => {
    expect(isTestFile("src/Core.TypeScript/hygiene/retraction-actuator.ts")).toBe(false);
    // A file that merely has "test" in its name is not a test file.
    expect(isTestFile("src/Core.TypeScript/hygiene/test-harness.ts")).toBe(false);
    expect(isTestFile("src/Core.TypeScript/latest.ts")).toBe(false);
  });
});

describe("scriptsInvokedBy — the indirection that hid the third defect", () => {
  test("finds the bun-invoked script in a workflow run block", () => {
    const wf = "      - name: Act\n        run: |\n          bun src/Core.TypeScript/hygiene/retraction-actuator.ts\n";
    expect(scriptsInvokedBy(wf)).toContain("src/Core.TypeScript/hygiene/retraction-actuator.ts");
  });

  test("does not invent paths from prose mentioning a directory", () => {
    expect(scriptsInvokedBy("# see src/Core.TypeScript/hygiene/ for the lints")).toHaveLength(0);
  });

  test("a path that merely ENDS with src/... is not a repo path", () => {
    // The left lookbehind is load-bearing: without it, `references/prior-art/.../src/x.ts`
    // matches on its suffix and the scanner walks a vendored tree it must never read
    // (that directory is gigabytes; a naive walk of it is a two-hour runaway). Removing
    // the anchor SURVIVED an earlier version of this suite.
    expect(scriptsInvokedBy("bun references/prior-art/foo/src/Core.TypeScript/a.ts")).toHaveLength(0);
    expect(scriptsInvokedBy("bun ./vendor/src/tools/b.ts")).toHaveLength(0);
    // ...while the real thing still matches.
    expect(scriptsInvokedBy("bun src/Core.TypeScript/a.ts")).toEqual(["src/Core.TypeScript/a.ts"]);
  });
});

describe("importsOf — resolution is by existence, never by guess", () => {
  test("resolves a real sibling module in this directory", () => {
    const src = 'import { readLedger } from "./drift-ledger.ts";';
    expect(importsOf(process.cwd(), "src/Core.TypeScript/hygiene/x.ts", src)).toContain(
      "src/Core.TypeScript/hygiene/drift-ledger.ts",
    );
  });

  test("a specifier that resolves to nothing yields nothing", () => {
    const src = 'import { q } from "./definitely-not-a-real-module-here";';
    expect(importsOf(process.cwd(), "src/Core.TypeScript/hygiene/x.ts", src)).toHaveLength(0);
  });

  test("bare package specifiers are not repo files", () => {
    expect(importsOf(process.cwd(), "src/Core.TypeScript/hygiene/x.ts", 'import { z } from "node:fs";')).toHaveLength(
      0,
    );
  });
});

describe("applyRoster — the ratchet, which is the whole difference from an allowlist", () => {
  const f = (file: string, line: number): Finding => ({
    file,
    line,
    snippet: "git push origin HEAD:main",
    via: "workflow",
  });
  const roster = { "a.ts": { sites: 2, reason: "known" } };

  test("an unrostered file fails outright", () => {
    const r = applyRoster([f("b.ts", 1)], roster);
    expect(r.findings).toHaveLength(1);
    expect(r.rostered).toHaveLength(0);
  });

  test("a rostered file at its exact count is reported, not failed", () => {
    const r = applyRoster([f("a.ts", 1), f("a.ts", 2)], roster);
    expect(r.findings).toHaveLength(0);
    expect(r.rostered).toHaveLength(2);
    expect(r.rosterErrors).toHaveLength(0);
  });

  test("a rostered file that GREW fails — the class cannot spread under cover", () => {
    const r = applyRoster([f("a.ts", 1), f("a.ts", 2), f("a.ts", 3)], roster);
    expect(r.findings).toHaveLength(3);
    expect(r.rosterErrors.join()).toContain("roster allows 2");
  });

  test("a rostered file that SHRANK fails as STALE — a roster may not over-permit", () => {
    // Without this the roster would silently keep granting two sites forever after one
    // was fixed, which is exactly how an allowlist rots into a licence.
    const r = applyRoster([f("a.ts", 1)], roster);
    expect(r.rosterErrors.join()).toContain("STALE");
  });

  test("a roster entry whose file is clean fails as STALE — entries must be deleted", () => {
    const r = applyRoster([], roster);
    expect(r.rosterErrors.join()).toContain("Delete the entry");
  });

  test("an empty roster is simply a zero-tolerance check", () => {
    const r = applyRoster([f("b.ts", 1)], {});
    expect(r.findings).toHaveLength(1);
    expect(r.rosterErrors).toHaveLength(0);
  });
});
