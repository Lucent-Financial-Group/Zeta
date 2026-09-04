/**
 * git-worktree.test.ts — two changes open at once, which the sibling adapter cannot survive.
 *
 * `gitChangeControl` moves the shared HEAD with `checkout -b`, so two open changes in one
 * repository fight over which branch is checked out and whose files are on disk. Nothing breaks
 * today because the runtime is sequential — but that is a property held by an accident of the
 * CALLER, not by the adapter, and limits of that kind stop being true silently.
 *
 * The first test here is the one that earns the adapter: it opens two changes without closing the
 * first, writes different content in each, and merges both. Run against `gitChangeControl` it
 * would be a mess of clobbered files; here each change has its own directory and its own HEAD.
 */

import { describe, expect, test } from "bun:test";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

import { agentWorkExecutor, commandWorkExecutor, gitChangeControl, gitWorktreeChangeControl, worktreeDirName } from "./adapters";
import { Fidelity } from "./providers";
import { WorkState, WorkType, type CascadeNode } from "./goal-cascade";

const node = (workId: string): CascadeNode => ({
  workId,
  workType: WorkType.Task,
  title: `do ${workId}`,
  state: WorkState.Open,
  ownerHatId: "tech_lead",
  assigneeHatId: "backend_implementer",
});

/** A repository with one commit on `main`, plus a place to put worktrees. */
function repo(label: string) {
  const root = mkdtempSync(join(tmpdir(), `worktree-${label}-`));
  const cwd = join(root, "repo");
  const worktreeRoot = join(root, "trees");
  mkdirSync(cwd, { recursive: true });
  mkdirSync(worktreeRoot, { recursive: true });
  const git = (...args: string[]) => {
    const r = spawnSync("git", args, { cwd, encoding: "utf-8" });
    if (r.status !== 0) throw new Error(`git ${args.join(" ")}: ${r.stderr ?? ""}`);
  };
  git("init", "-b", "main");
  git("config", "user.email", "t@example.invalid");
  git("config", "user.name", "T");
  writeFileSync(join(cwd, "README.md"), "seed\n");
  git("add", "README.md");
  git("commit", "-m", "seed");
  return { cwd, worktreeRoot };
}

/**
 * The change's checkout, or a THROW.
 *
 * Never defaulted to an empty string. An empty path makes `join` produce a relative one and
 * `spawnSync` inherit the process's own directory — so a test whose `workdir` went missing would
 * silently write and COMMIT into the repository it is running inside.
 *
 * That is not hypothetical. It happened here, under the mutation that strips `workdir` from the
 * handle: the mutant was correctly killed, and on its way past it put two commits into this very
 * repo. The failure is the one this whole register is about — a fallback that quietly redirects a
 * real side effect — so the test helper refuses, exactly as the adapters do.
 */
function checkoutOf(opened: { readonly workdir?: string }): string {
  const workdir = opened.workdir;
  if (workdir === undefined || workdir.trim() === "") {
    throw new Error("the change reported no checkout; refusing to fall back to the current directory");
  }
  return workdir;
}

/** Commit a file inside a worktree, the way a work executor handed `ctx.workdir` would. */
function commitIn(workdir: string, file: string, body: string) {
  if (workdir.trim() === "") throw new Error("refusing to commit into the current directory");
  writeFileSync(join(workdir, file), body);
  for (const args of [["add", file], ["commit", "-m", `add ${file}`]]) {
    const r = spawnSync("git", args, { cwd: workdir, encoding: "utf-8" });
    expect(r.status).toBe(0);
  }
}

describe("TWO CHANGES OPEN AT ONCE", () => {
  test("each gets its own checkout, and both merge", async () => {
    const { cwd, worktreeRoot } = repo("concurrent");
    const change = gitWorktreeChangeControl({ cwd, worktreeRoot, baseBranch: "main" });

    // BOTH opened before either is merged. This is the case the shared-HEAD adapter cannot take.
    const first = await change.open(node("task-1"), { branch: "work/task-1" });
    const second = await change.open(node("task-2"), { branch: "work/task-2" });
    expect(first.ok).toBe(true);
    expect(second.ok).toBe(true);
    if (!first.ok || !second.ok) return;

    // Separate directories, and the port SAYS where each one is.
    expect(first.value.workdir).toBeDefined();
    expect(second.value.workdir).toBeDefined();
    expect(first.value.workdir).not.toBe(second.value.workdir);

    commitIn(checkoutOf(first.value), "one.txt", "from task-1\n");
    commitIn(checkoutOf(second.value), "two.txt", "from task-2\n");

    // Neither worktree sees the other's file — the isolation is real, not nominal.
    expect(existsSync(join(checkoutOf(first.value), "two.txt"))).toBe(false);
    expect(existsSync(join(checkoutOf(second.value), "one.txt"))).toBe(false);

    expect((await change.merge(first.value)).ok).toBe(true);
    expect((await change.merge(second.value)).ok).toBe(true);

    // The shared repository ends with BOTH pieces of work, on main.
    expect(readFileSync(join(cwd, "one.txt"), "utf-8")).toContain("from task-1");
    expect(readFileSync(join(cwd, "two.txt"), "utf-8")).toContain("from task-2");
    const head = spawnSync("git", ["rev-parse", "--abbrev-ref", "HEAD"], { cwd, encoding: "utf-8" });
    expect(head.stdout.trim()).toBe("main");
  });

  test("THE SHARED CHECKOUT NEVER MOVES — that is what makes the concurrency safe", async () => {
    // `checkout -b` in the sibling adapter changes which branch the repository is on. Here `main`
    // stays checked out the whole time, which is precisely why a second open cannot disturb a
    // first one's files.
    const { cwd, worktreeRoot } = repo("head");
    const branchNow = () => spawnSync("git", ["rev-parse", "--abbrev-ref", "HEAD"], { cwd, encoding: "utf-8" }).stdout.trim();
    expect(branchNow()).toBe("main");

    const change = gitWorktreeChangeControl({ cwd, worktreeRoot, baseBranch: "main" });
    const opened = await change.open(node("task-1"), { branch: "work/task-1" });
    expect(opened.ok).toBe(true);
    expect(branchNow()).toBe("main");

    // ...and the sibling adapter does the opposite, which is the whole reason this one exists.
    const shared = gitChangeControl({ cwd, baseBranch: "main" });
    expect((await shared.open(node("task-9"), { branch: "work/task-9" })).ok).toBe(true);
    expect(branchNow()).toBe("work/task-9");
  });

  test("the merge leaves a MERGE COMMIT, and the worktree is cleaned up", async () => {
    const { cwd, worktreeRoot } = repo("cleanup");
    const change = gitWorktreeChangeControl({ cwd, worktreeRoot, baseBranch: "main" });
    const opened = await change.open(node("task-1"), { branch: "work/task-1" });
    if (!opened.ok) throw new Error(opened.reason);
    commitIn(checkoutOf(opened.value), "one.txt", "work\n");

    expect(existsSync(checkoutOf(opened.value))).toBe(true);
    expect((await change.merge(opened.value)).ok).toBe(true);

    const parents = spawnSync("git", ["rev-list", "--parents", "-n", "1", "HEAD"], { cwd, encoding: "utf-8" });
    expect(parents.stdout.trim().split(/ +/)).toHaveLength(3);
    // A worktree left behind holds a lock on its branch, and the next run's open would refuse.
    expect(existsSync(checkoutOf(opened.value))).toBe(false);
  });
});

describe("the refusals", () => {
  test("a branch that already exists is refused, not silently reused", async () => {
    const { cwd, worktreeRoot } = repo("dup");
    const change = gitWorktreeChangeControl({ cwd, worktreeRoot, baseBranch: "main" });
    expect((await change.open(node("task-1"), { branch: "work/task-1" })).ok).toBe(true);
    const again = await change.open(node("task-2"), { branch: "work/task-1" });
    expect(again.ok).toBe(false);
    if (!again.ok) expect(again.reason).toContain("work/task-1");
  });

  test("a base branch that does not exist is refused", async () => {
    const { cwd, worktreeRoot } = repo("nobase");
    const change = gitWorktreeChangeControl({ cwd, worktreeRoot, baseBranch: "no-such-base" });
    expect((await change.open(node("task-1"), { branch: "work/task-1" })).ok).toBe(false);
  });

  test("A MERGE THAT DID NOT HAPPEN IS REFUSED, and the work is NOT destroyed", async () => {
    // Removal comes after a successful merge on purpose: tidying up first would delete the only
    // checkout of work whose merge then refused.
    const { cwd, worktreeRoot } = repo("badmerge");
    const change = gitWorktreeChangeControl({ cwd, worktreeRoot, baseBranch: "main" });
    const r = await change.merge({ changeId: "c", branch: "never-existed", workdir: join(worktreeRoot, "never") });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toContain("never-existed");
  });

  test("A FAILED MERGE LEAVES THE WORK ON DISK — removal comes after success, never before", async () => {
    // Tidying up first would delete the only checkout of work whose merge then refused, and the
    // branch would be the sole copy of something nobody could look at.
    const { cwd, worktreeRoot } = repo("keepwork");
    const change = gitWorktreeChangeControl({ cwd, worktreeRoot, baseBranch: "main" });
    const opened = await change.open(node("task-1"), { branch: "work/task-1" });
    if (!opened.ok) throw new Error(opened.reason);
    commitIn(checkoutOf(opened.value), "shared.txt", "from the worktree\n");

    // A conflicting commit on main, so the merge cannot succeed.
    writeFileSync(join(cwd, "shared.txt"), "from main\n");
    for (const args of [["add", "shared.txt"], ["commit", "-m", "conflicting"]]) {
      expect(spawnSync("git", args, { cwd, encoding: "utf-8" }).status).toBe(0);
    }

    const merged = await change.merge(opened.value);
    expect(merged.ok).toBe(false);
    // The work survives, in its own checkout, exactly where the port said it was.
    expect(existsSync(checkoutOf(opened.value))).toBe(true);
    expect(readFileSync(join(checkoutOf(opened.value), "shared.txt"), "utf-8")).toContain("from the worktree");
  });

  test("outside a repository it refuses rather than throwing", async () => {
    const root = mkdtempSync(join(tmpdir(), "worktree-none-"));
    const r = await gitWorktreeChangeControl({ cwd: root, worktreeRoot: root, baseBranch: "main" })
      .open(node("task-1"), { branch: "b" });
    expect(r.ok).toBe(false);
  });

  test("it says it is real, and where the worktrees live", () => {
    const port = gitWorktreeChangeControl({ cwd: ".", worktreeRoot: "/tmp/trees", baseBranch: "main" });
    expect(port.meta.fidelity).toBe(Fidelity.Real);
    expect(port.meta.describes).toContain("/tmp/trees");
  });
});

describe("worktreeDirName", () => {
  test("A BRANCH WITH A SLASH BECOMES ONE DIRECTORY, not a nested pair", () => {
    // `work/task-1` used verbatim would put every change inside a shared `work/` parent — and on
    // Windows the slash is not a legal name at all.
    expect(worktreeDirName("work/task-1")).toBe("work-task-1");
    expect(worktreeDirName("work/task-1")).not.toContain("/");
  });

  test("distinct branches stay distinct", () => {
    expect(worktreeDirName("work/task-1")).not.toBe(worktreeDirName("work/task-2"));
    expect(worktreeDirName("feature/a b")).toBe("feature-a-b");
  });

  test("ordinary names are left alone", () => {
    expect(worktreeDirName("task-1.fix_2")).toBe("task-1.fix_2");
  });
});

describe("THE CHANGE'S CHECKOUT REACHES THE WORK — otherwise the worktree is decorative", () => {
  /** A marker only present inside the worktree, so a wrong cwd is observable. */
  const markerCheck = "process.exit(require('node:fs').existsSync('marker.txt') ? 0 : 3)";

  test("commandWorkExecutor runs in `ctx.workdir` when one is given", async () => {
    const { cwd, worktreeRoot } = repo("exec-cwd");
    const change = gitWorktreeChangeControl({ cwd, worktreeRoot, baseBranch: "main" });
    const opened = await change.open(node("task-1"), { branch: "work/task-1" });
    if (!opened.ok) throw new Error(opened.reason);
    writeFileSync(join(checkoutOf(opened.value), "marker.txt"), "here\n");

    // Configured to run in the MAIN repo, which has no marker...
    const port = commandWorkExecutor({
      command: process.execPath,
      argsFor: () => ["-e", markerCheck],
      cwd,
    });
    const inWorktree = await port.execute(node("task-1"), { branch: "work/task-1", workdir: checkoutOf(opened.value) });
    expect(inWorktree.ok && inWorktree.value.succeeded).toBe(true);

    // ...and without the workdir it runs there and does not find it.
    const inRepo = await port.execute(node("task-1"), { branch: "work/task-1" });
    expect(inRepo.ok && inRepo.value.succeeded).toBe(false);
  });

  test("agentWorkExecutor's VERIFIER runs in `ctx.workdir` too", async () => {
    // The verifier is what decides, so a verifier judging the wrong tree would decide about work
    // that is not there — the sharpest form of this mistake.
    const { cwd, worktreeRoot } = repo("verify-cwd");
    const change = gitWorktreeChangeControl({ cwd, worktreeRoot, baseBranch: "main" });
    const opened = await change.open(node("task-1"), { branch: "work/task-1" });
    if (!opened.ok) throw new Error(opened.reason);
    writeFileSync(join(checkoutOf(opened.value), "marker.txt"), "here\n");

    const port = agentWorkExecutor({
      perform: () => ({ summary: "wrote the marker", artifacts: ["marker.txt"] }),
      verify: { command: process.execPath, argsFor: () => ["-e", markerCheck], cwd },
    });
    const inWorktree = await port.execute(node("task-1"), { branch: "work/task-1", workdir: checkoutOf(opened.value) });
    expect(inWorktree.ok && inWorktree.value.succeeded).toBe(true);

    const inRepo = await port.execute(node("task-1"), { branch: "work/task-1" });
    expect(inRepo.ok && inRepo.value.succeeded).toBe(false);
  });
});
