/**
 * followup-commands.test.ts — the seam between the runtime and a session command.
 *
 * ── WHY THIS FILE EXISTS ─────────────────────────────────────────────────────
 * `ferry.test.ts` proved the queue runs N at once, and passed, because it is handed async work.
 * The port underneath it called `spawnSync`, which holds the only thread for as long as the session
 * runs — so the COMPOSITION was serial while both halves looked right. MEASURED on agentic-tpm,
 * 2026-09-12: `--parallel 3`, the runtime queued two requests and recorded "3 at a time", and
 * task-032's session started at 15:15:46 — the second task-040's ended.
 *
 * So this tests the thing neither unit test could: two real port calls, through the real command
 * path, must OVERLAP.
 */

import { describe, expect, test } from "bun:test";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { commandFollowUp, commandFollowUpReview, commandVerifier } from "./followup-commands";
import { ferry } from "./ferry";
import type { FollowUpRequest } from "./change-followup";

/** A stand-in session: sleeps, then answers the protocol. Nothing here calls a model. */
function stubSession(dir: string, sleepMs: number): string {
  const stub = join(dir, "session.cjs");
  writeFileSync(
    stub,
    `const ms=${String(sleepMs)};` +
      `setTimeout(()=>{process.stdout.write(JSON.stringify({decisions:[],syncWithTarget:false,summary:"done"}));},ms);`,
  );
  return stub;
}

const request = (workId: string, workdir: string): FollowUpRequest => ({
  workId,
  hatId: "backend_implementer",
  branch: `defect/${workId}`,
  workdir,
  items: [],
  mode: "triage",
  canSync: false,
});

describe("A SESSION MUST NOT HOLD THE ONLY THREAD", () => {
  test("two follow-ups at dop 2 overlap — the port is awaited, not blocked", async () => {
    const dir = mkdtempSync(join(tmpdir(), "followup-port-"));
    const sleepMs = 1500;
    const follow = commandFollowUp({ command: "node", args: [stubSession(dir, sleepMs)] }, dir);

    const started = Date.now();
    const results = await ferry(["task-a", "task-b"], 2, async (w) => await follow(request(w, dir)));
    const elapsed = Date.now() - started;

    expect(results.every((r) => r.ok)).toBe(true);
    // Serial would be >= 2 x sleep. Overlapped is a little over one. The midpoint is the falsifier:
    // with `spawnSync` this measured ~2x and failed; with an awaited spawn it is ~1x.
    expect(elapsed).toBeLessThan(sleepMs * 2);
    rmSync(dir, { recursive: true, force: true });
  }, 30_000);

  test("the result still reads like spawnSync's: a non-zero exit is a refusal carrying its reason", async () => {
    const dir = mkdtempSync(join(tmpdir(), "followup-port-"));
    const stub = join(dir, "boom.cjs");
    writeFileSync(stub, `process.stderr.write("the session refused");process.exit(4);`);
    const follow = commandFollowUp({ command: "node", args: [stub] }, dir);

    const r = await follow(request("task-a", dir));
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.reason).toContain("exited 4");
      expect(r.reason).toContain("the session refused");
    }
    rmSync(dir, { recursive: true, force: true });
  }, 30_000);

  test("a session that answers nothing is a refusal, not an empty set of decisions", async () => {
    const dir = mkdtempSync(join(tmpdir(), "followup-port-"));
    const stub = join(dir, "quiet.cjs");
    writeFileSync(stub, `process.exit(0);`);
    const follow = commandFollowUp({ command: "node", args: [stub] }, dir);

    const r = await follow(request("task-a", dir));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toContain("printed no decisions");
    rmSync(dir, { recursive: true, force: true });
  }, 30_000);
});

describe("A GREEN SUITE AT A COMMIT IS NOT RUN AGAIN AT THAT COMMIT", () => {
  // ── WHY THIS FILE CARES ──────────────────────────────────────────────────────────────────────
  // MEASURED on agentic-tpm, 2026-09-12: every check ran the whole suite - 81-88s of jest plus 7-8s
  // of vitest - and `verify.log` shows those same two suites re-run round after round on the same
  // two branches. A turned-back round leaves its commits unpushed, so the next round verifies an
  // IDENTICAL tree from scratch; a round that changes no code at all does too.
  //
  // The receipt lives in the checkout's `.git`, because `watch-org` spawns a fresh `run-org` each
  // tick and anything held in memory dies with it. These tests use a real repository for that
  // reason - the receipt's whole point is that it outlives the process.

  /**
   * A counter dressed as a verifier: appends a line each time it runs, so runs can be counted.
   *
   * The stub and its log live OUTSIDE the checkout on purpose. Untracked files in the repository
   * make the working tree dirty, and a dirty tree is deliberately not covered by a receipt - so a
   * harness written into the repo would silently disable the thing under test. (Real suites write
   * their artifacts to gitignored paths, which `git status --porcelain` already ignores.)
   */
  function countingVerifier(harness: string, exit = 0): { spec: { command: string; args: string[] }; runs: () => number } {
    const log = join(harness, "runs.log");
    const stub = join(harness, "verify.cjs");
    writeFileSync(stub, `require("fs").appendFileSync(${JSON.stringify(log)},"x");process.exit(${String(exit)});`);
    return {
      spec: { command: "node", args: [stub] },
      runs: () => {
        try {
          return readFileSync(log, "utf-8").length;
        } catch {
          return 0;
        }
      },
    };
  }

  /** A scratch directory for stubs and logs that must not sit inside the checkout. */
  function harnessDir(): string {
    return mkdtempSync(join(tmpdir(), "verify-harness-"));
  }

  function repo(): string {
    const dir = mkdtempSync(join(tmpdir(), "verify-receipt-"));
    const git = (...a: string[]) => spawnSync("git", a, { cwd: dir, encoding: "utf-8" });
    git("init", "-q");
    git("config", "user.email", "org@example.invalid");
    git("config", "user.name", "org");
    writeFileSync(join(dir, "a.txt"), "one");
    git("add", "-A");
    git("commit", "-qm", "one");
    return dir;
  }

  const handle = (dir: string) => ({ changeId: "c1@task-1", branch: "defect/x", workdir: dir }) as never;

  test("a clean tree verified twice at the same commit runs the suite once", async () => {
    const dir = repo();
    try {
      const h = harnessDir();
      const v = countingVerifier(h);
      const verify = commandVerifier(v.spec, dir);
      const first = await verify(handle(dir));
      const second = await verify(handle(dir));
      expect(first.ok).toBe(true);
      expect(second.ok).toBe(true);
      // The falsifier: without the receipt this is 2. It is the whole saving.
      expect(v.runs()).toBe(1);
      if (second.ok) expect(second.value).toContain("nothing has changed since");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  }, 30_000);

  test("the receipt outlives the process - a second verifier built fresh still honours it", async () => {
    const dir = repo();
    try {
      const h = harnessDir();
      const v = countingVerifier(h);
      await commandVerifier(v.spec, dir)(handle(dir));
      // A NEW closure, as a new `run-org` would build after the watcher respawns it.
      await commandVerifier(v.spec, dir)(handle(dir));
      expect(v.runs()).toBe(1);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  }, 30_000);

  test("an uncommitted change is not covered by the receipt - the suite has not seen it", async () => {
    const dir = repo();
    try {
      const h = harnessDir();
      const v = countingVerifier(h);
      const verify = commandVerifier(v.spec, dir);
      await verify(handle(dir));
      writeFileSync(join(dir, "a.txt"), "changed but not committed");
      await verify(handle(dir));
      expect(v.runs()).toBe(2);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  }, 30_000);

  test("a new commit is verified again", async () => {
    const dir = repo();
    try {
      const h = harnessDir();
      const v = countingVerifier(h);
      const verify = commandVerifier(v.spec, dir);
      await verify(handle(dir));
      writeFileSync(join(dir, "b.txt"), "two");
      spawnSync("git", ["add", "-A"], { cwd: dir });
      spawnSync("git", ["commit", "-qm", "two"], { cwd: dir });
      await verify(handle(dir));
      expect(v.runs()).toBe(2);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  }, 30_000);

  test("a failure is never cached - the next round runs the suite again", async () => {
    const dir = repo();
    try {
      const h = harnessDir();
      const v = countingVerifier(h, 3);
      const verify = commandVerifier(v.spec, dir);
      const first = await verify(handle(dir));
      const second = await verify(handle(dir));
      expect(first.ok).toBe(false);
      expect(second.ok).toBe(false);
      // A cached red would outlive the fix somebody is about to make.
      expect(v.runs()).toBe(2);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  }, 30_000);

  test("a different verifier does not inherit the other's receipt", async () => {
    const dir = repo();
    try {
      const h = harnessDir();
      const a = countingVerifier(h);
      await commandVerifier(a.spec, dir)(handle(dir));
      const other = join(h, "other.cjs");
      writeFileSync(other, `require("fs").appendFileSync(${JSON.stringify(join(h, "other.log"))},"y");process.exit(0);`);
      await commandVerifier({ command: "node", args: [other] }, dir)(handle(dir));
      expect(readFileSync(join(h, "other.log"), "utf-8").length).toBe(1);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  }, 30_000);

  test("a checkout that is not a repository verifies normally, every time", async () => {
    const dir = mkdtempSync(join(tmpdir(), "verify-norepo-"));
    try {
      const h = harnessDir();
      const v = countingVerifier(h);
      const verify = commandVerifier(v.spec, dir);
      expect((await verify(handle(dir))).ok).toBe(true);
      await verify(handle(dir));
      // No receipt can be written or believed, so nothing is skipped - the old behaviour exactly.
      expect(v.runs()).toBe(2);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  }, 30_000);
});

describe("THE SCRATCH COPY A REVIEW MAKES IS THE ORGANIZATION'S TO REMOVE", () => {
  // Proving a test non-vacuous means a throwaway worktree. The reviewer used to choose the path and
  // was asked to remove it afterwards - cleanup that depends on an agent remembering. On a synced
  // folder each leaked copy is a whole checkout being uploaded, for ever.
  function repoWithCommit(): string {
    const dir = mkdtempSync(join(tmpdir(), "review-scratch-"));
    const git = (...a: string[]) => spawnSync("git", a, { cwd: dir, encoding: "utf-8" });
    git("init", "-q");
    git("config", "user.email", "org@example.invalid");
    git("config", "user.name", "org");
    writeFileSync(join(dir, "a.txt"), "one");
    git("add", "-A");
    git("commit", "-qm", "one");
    return dir;
  }

  const request = (dir: string) => ({
    gate: "implementation_review",
    reviewerHatId: "staff_engineer",
    workId: "task-1",
    branch: "defect/x",
    workdir: dir,
    from: "HEAD",
    to: "HEAD",
    items: [{ summary: "s", outcome: "addressed", how: "h" }],
  });

  test("a worktree the session leaves behind at the named path is removed anyway", async () => {
    const dir = repoWithCommit();
    const harness = mkdtempSync(join(tmpdir(), "review-harness-"));
    const where = join(harness, "where.txt");
    const stub = join(harness, "review.cjs");
    // A reviewer that makes the scratch copy and then, like a real one sometimes does, forgets it.
    writeFileSync(
      stub,
      'const cp=require("child_process");const fs=require("fs");' +
        'const s=process.env.ORG_REVIEW_SCRATCH;fs.writeFileSync(' + JSON.stringify(where) + ',s||"");' +
        'cp.spawnSync("git",["-C",process.cwd(),"worktree","add","--detach",s,"HEAD"]);' +
        'process.stdout.write("approved");process.exit(0);',
    );
    try {
      const review = commandFollowUpReview({ command: "node", args: [stub] }, dir);
      const verdict = await review(request(dir) as never);
      expect(verdict.ok).toBe(true);
      const scratch = readFileSync(where, "utf-8").trim();
      expect(scratch).not.toBe("");
      // The falsifier: without the organization removing it, this directory is still there.
      expect(existsSync(scratch)).toBe(false);
      // And it is not left registered as a stale worktree either.
      const listed = spawnSync("git", ["-C", dir, "worktree", "list"], { encoding: "utf-8" }).stdout ?? "";
      expect(listed).not.toContain(scratch);
    } finally {
      rmSync(dir, { recursive: true, force: true });
      rmSync(harness, { recursive: true, force: true });
    }
  }, 30_000);

  test("a reviewer that never makes the copy still gets a verdict - cleanup cannot fail a review", async () => {
    const dir = repoWithCommit();
    const harness = mkdtempSync(join(tmpdir(), "review-harness-"));
    const stub = join(harness, "review.cjs");
    writeFileSync(stub, 'process.stdout.write("rejected: no proof");process.exit(1);');
    try {
      const review = commandFollowUpReview({ command: "node", args: [stub] }, dir);
      const verdict = await review(request(dir) as never);
      expect(verdict.ok).toBe(true);
      if (verdict.ok) {
        expect(verdict.value.approved).toBe(false);
        expect(verdict.value.reason).toContain("no proof");
      }
    } finally {
      rmSync(dir, { recursive: true, force: true });
      rmSync(harness, { recursive: true, force: true });
    }
  }, 30_000);

  test("each review is given its own path - two reviews never share a scratch copy", async () => {
    const dir = repoWithCommit();
    const harness = mkdtempSync(join(tmpdir(), "review-harness-"));
    const log = join(harness, "paths.txt");
    const stub = join(harness, "review.cjs");
    writeFileSync(stub, 'require("fs").appendFileSync(' + JSON.stringify(log) + ',(process.env.ORG_REVIEW_SCRATCH||"")+"|");process.exit(0);');
    try {
      const review = commandFollowUpReview({ command: "node", args: [stub] }, dir);
      await review(request(dir) as never);
      await review(request(dir) as never);
      const paths = readFileSync(log, "utf-8").split("|").filter((x) => x !== "");
      expect(paths.length).toBe(2);
      expect(paths[0]).not.toBe(paths[1]);
    } finally {
      rmSync(dir, { recursive: true, force: true });
      rmSync(harness, { recursive: true, force: true });
    }
  }, 30_000);
});
