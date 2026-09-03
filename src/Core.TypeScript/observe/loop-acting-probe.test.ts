/**
 * loop-acting-probe.test.ts — the refusal that makes the acting probe safe to have in the tree.
 *
 * `loop-acting-probe.ts` runs the loop WITHOUT `--dry-run`: it commits and pushes for real. The
 * entire safety argument is that it only ever does so against a bare repository it created moments
 * earlier in a temp directory.
 *
 * An argument like that is worth exactly as much as its enforcement. `assertDisposable` reads the
 * clone's actual `origin` and refuses anything outside the disposable root — so pointing the probe
 * at a real checkout is an error rather than a very bad afternoon. These are the tests for that
 * refusal, because the one guard standing between a chaos harness and someone's repository should
 * not itself be untested.
 */

import { describe, expect, it } from "bun:test";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ACTING_SCENARIOS, assertDisposable } from "./loop-acting-probe";

const git = (cwd: string, ...args: string[]): string => execFileSync("git", args, { cwd, encoding: "utf-8" }).trim();

/** A clone whose `origin` points wherever we say — the shape the refusal must judge. */
function cloneWithOrigin(root: string, originUrl: string): string {
  const clone = join(root, "work");
  mkdirSync(clone, { recursive: true });
  git(clone, "init", "--quiet", "--initial-branch=main");
  git(clone, "remote", "add", "origin", originUrl);
  writeFileSync(join(clone, "README.md"), "x\n");
  return clone;
}

describe("the acting probe refuses a repository it did not create", () => {
  it("REFUSES a clone whose origin is outside the disposable root", () => {
    const root = mkdtempSync(join(tmpdir(), "zeta-acting-guard-"));
    const elsewhere = mkdtempSync(join(tmpdir(), "zeta-somebody-elses-repo-"));

    try {
      const clone = cloneWithOrigin(root, elsewhere);
      expect(() => {
        assertDisposable(clone, root);
      }).toThrow(/refusing to act/);
    } finally {
      rmSync(root, { recursive: true, force: true });
      rmSync(elsewhere, { recursive: true, force: true });
    }
  });

  it("ACCEPTS a clone whose origin is inside the disposable root", () => {
    // The other half. A guard that refused everything would pass the test above and make the probe
    // useless, so the accepting case is asserted too.
    const root = mkdtempSync(join(tmpdir(), "zeta-acting-guard-ok-"));

    try {
      const clone = cloneWithOrigin(root, join(root, "origin.git"));
      expect(() => {
        assertDisposable(clone, root);
      }).not.toThrow();
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("refuses a repository that merely SHARES A PREFIX with the disposable root", () => {
    // A prefix comparison on raw strings would accept "/tmp/zeta-acting-evil" for the root
    // "/tmp/zeta-acting" — the classic path-prefix hole, and here it would mean pushing into a
    // repository the probe did not create.
    const root = mkdtempSync(join(tmpdir(), "zeta-acting-prefix-"));
    const sibling = `${root}-evil`;
    mkdirSync(sibling, { recursive: true });

    try {
      const clone = cloneWithOrigin(root, join(sibling, "origin.git"));
      expect(() => {
        assertDisposable(clone, root);
      }).toThrow(/refusing to act/);
    } finally {
      rmSync(root, { recursive: true, force: true });
      rmSync(sibling, { recursive: true, force: true });
    }
  });

  it("every scenario declares whether an event must reach the remote", () => {
    // The assertion that gives this probe its teeth is `expectEventOnOrigin`: a tick can print every
    // expected line and push nothing. A scenario that forgot to declare it would silently check only
    // the log text, which is the weaker half.
    expect(ACTING_SCENARIOS.length).toBeGreaterThan(0);
    for (const s of ACTING_SCENARIOS) {
      expect(typeof s.expectEventOnOrigin).toBe("boolean");
      expect(s.expectation.length).toBeGreaterThan(20);
    }
  });

  it("at least one scenario expects NO event on the remote", () => {
    // Without this the probe could only ever confirm that pushing works. The gates it exists to
    // check are the ones that STOP a push, so a corpus where every scenario expects an event would
    // be unable to catch a gate that stopped working.
    expect(ACTING_SCENARIOS.some((s) => !s.expectEventOnOrigin)).toBe(true);
    expect(ACTING_SCENARIOS.some((s) => s.expectEventOnOrigin)).toBe(true);
  });

  it("no scenario runs the loop in dry-run mode", () => {
    // The whole point. If a scenario slipped a `--dry-run` in, this probe would quietly become a
    // second copy of the resilience probe and the acting path would go back to being untested.
    for (const s of ACTING_SCENARIOS) {
      expect(s.mustNotPrint ?? []).not.toContain("--dry-run");
      expect(JSON.stringify(s.env("/tmp/x"))).not.toContain("dry-run");
    }
  });
});
