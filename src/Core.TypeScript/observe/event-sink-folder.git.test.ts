/**
 * event-sink-folder.git.test.ts — `gitCommitToMain` against a REAL git repository.
 *
 * ── THE GAP THIS CLOSES ──────────────────────────────────────────────────────
 * `event-sink-folder.test.ts` injects a fake `commit`, which is right for testing the sink's own
 * logic. It leaves `gitCommitToMain` — the **default transport for every event the loop emits** —
 * with exactly one assertion, under a `describe` block named *"real default; not run here"*:
 *
 *     expect(typeof gitCommitToMain).toBe("function");
 *
 * That is the vacuity class in its purest form. It cannot fail while the import resolves, so it
 * reports coverage of the one function in this file that talks to the outside world.
 *
 * ── WHAT IT ACTUALLY EXERCISES ───────────────────────────────────────────────
 * A bare repository standing in for `origin`, plus a working clone, plus a second clone acting as a
 * peer. Real `git add` / `commit` / `push` / `pull --rebase`. Nothing is mocked, and nothing here
 * can reach a network or the Zeta remote: every path is a temp directory.
 *
 * ── THE CLAIM THAT MOST NEEDED CHECKING ──────────────────────────────────────
 * The undo path carries a strong comment: a `reset --hard` "would wipe an agent's concurrent
 * uncommitted work in other files", so the code does a targeted `reset --soft` + `restore --staged`
 * and promises **"every other file exactly as it was"**. Nothing checked that. It is the kind of
 * claim whose failure surfaces as another agent's lost work, hours later, attributed to anything but
 * the sink — so it gets its own test with a real dirty file in the tree.
 *
 * ── WHY `process.chdir` ──────────────────────────────────────────────────────
 * `gitCommitToMain` builds its own `execFileSync("git", …)` runner with no `cwd` option, so it acts
 * on the process's working directory by construction. Testing it therefore means moving there and
 * moving back. Done in `beforeEach`/`afterEach` so a failing assertion cannot strand the process in
 * a temp directory that the same hook then deletes.
 */

import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { execFileSync } from "node:child_process";
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { gitCommitToMain, type EventEnvelope } from "./event-sink-folder";

/** Run git in a specific directory. The helper the TEST uses; the sink brings its own. */
const git = (cwd: string, ...args: string[]): string => execFileSync("git", args, { cwd, encoding: "utf-8" }).trim();

/**
 * A committer identity for the fixtures.
 *
 * Passed per-command rather than written to a config the sink might inherit, and deliberately not
 * the real one: nothing in this file should be able to author a commit that looks like a person's.
 */
const IDENT = ["-c", "user.name=zeta-test", "-c", "user.email=zeta-test@example.invalid", "-c", "commit.gpgsign=false"];

const gitAs = (cwd: string, ...args: string[]): string =>
  execFileSync("git", [...IDENT, ...args], { cwd, encoding: "utf-8" }).trim();

let root: string;
let origin: string;
let work: string;
let previousCwd: string;

const envelope = (id: string): EventEnvelope =>
  ({
    id,
    by: "zeta-test",
    at: "2026-05-31T12:00:00.000Z",
    action: { kind: "explore", detail: "a fixture event" },
  }) as unknown as EventEnvelope;

/** Write an event file under the working clone and return its repo-relative path. */
function writeEvent(name: string, body = "{}\n"): string {
  const rel = `events/${name}.json`;
  mkdirSync(join(work, "events"), { recursive: true });
  writeFileSync(join(work, rel), body);
  return rel;
}

/**
 * Make `origin` reject every push while leaving fetch working.
 *
 * The first version of the three failure tests below broke the remote URL instead. That made
 * `fetch` throw at the TOP of `gitCommitToMain`, before `git add` — so the sink never created a
 * commit, the undo path was never entered, and "HEAD is unchanged" was trivially true. All three
 * PASSED while testing nothing, which is precisely the failure this file exists to remove.
 *
 * A `pre-receive` hook is the honest injection: the remote is a real repository, fetch and
 * `pull --rebase` succeed, and only the push is refused — so the sink commits, retries three
 * times, and reaches the undo it promises.
 */
function rejectPushes(): void {
  const hook = join(origin, "hooks", "pre-receive");
  writeFileSync(hook, "#!/bin/sh\nexit 1\n");
  chmodSync(hook, 0o755);
}

/** The files present on `origin`'s main branch. */
const filesOnOrigin = (): string[] =>
  git(origin, "ls-tree", "-r", "--name-only", "main")
    .split("\n")
    .filter((l) => l.length > 0);

beforeEach(() => {
  previousCwd = process.cwd();
  root = mkdtempSync(join(tmpdir(), "zeta-sink-git-"));
  origin = join(root, "origin.git");
  work = join(root, "work");

  mkdirSync(origin, { recursive: true });
  git(origin, "init", "--bare", "--initial-branch=main");

  git(root, "clone", "--quiet", origin, work);
  // A first commit, so `origin/main` exists and `rev-list origin/main..HEAD` has a base.
  writeFileSync(join(work, "README.md"), "seed\n");
  gitAs(work, "add", "README.md");
  gitAs(work, "commit", "-q", "-m", "seed");
  gitAs(work, "push", "-q", "origin", "main");

  // The sink uses the ambient identity for its own commit, so the clone needs one configured.
  git(work, "config", "user.name", "zeta-test");
  git(work, "config", "user.email", "zeta-test@example.invalid");
  git(work, "config", "commit.gpgsign", "false");
  // Line endings pinned, and this is a REAL OBSERVATION rather than boilerplate. The undo path
  // reaches `pull --rebase --autostash`, which round-trips a dirty tracked file through the stash;
  // on a host with `core.autocrlf=true` (the Windows default) git REWRITES that file's line endings
  // on the way back. The agent's work is not lost — the content survives — but the bytes change.
  //
  // So the sink's promise is "your concurrent edit survives", not "your file is untouched byte for
  // byte", and the difference is the platform's, not the sink's. Pinned here so the test measures
  // the sink rather than the host's newline policy, and written down so the distinction is on the
  // record instead of being rediscovered as a mystery diff.
  git(work, "config", "core.autocrlf", "false");
  git(work, "config", "core.eol", "lf");

  process.chdir(work);
});

afterEach(() => {
  process.chdir(previousCwd);
  rmSync(root, { recursive: true, force: true });
});

describe("gitCommitToMain — against a real repository", () => {
  it("commits the event and pushes it to origin/main", () => {
    const rel = writeEvent("first");

    const outcome = gitCommitToMain(rel, envelope("first"));

    expect(outcome.ok).toBe(true);
    // The assertion that matters: the event is on the REMOTE, not merely committed locally.
    expect(filesOnOrigin()).toContain(rel);
    expect(git(origin, "show", `main:${rel}`)).toBe("{}");
  });

  it("stamps the envelope into the commit message", () => {
    const rel = writeEvent("second");
    gitCommitToMain(rel, envelope("second"));

    const msg = git(origin, "log", "-1", "--format=%B", "main");
    expect(msg).toContain("second");
    expect(msg).toContain(rel);
    // The sovereign transport names itself, so a reader of `git log` can tell how it arrived.
    expect(msg).toContain("folder-direct-to-main");
  });

  it("a re-append of an already-landed event is an idempotent ok, not a second commit", () => {
    // G-Set semantics: appending the same event twice must not fail and must not grow history.
    const rel = writeEvent("third");
    expect(gitCommitToMain(rel, envelope("third")).ok).toBe(true);

    const after = git(origin, "rev-parse", "main");
    writeEvent("third"); // byte-identical content, written again

    expect(gitCommitToMain(rel, envelope("third")).ok).toBe(true);
    expect(git(origin, "rev-parse", "main")).toBe(after);
  });

  it("REFUSES to run off a main checkout, and pushes nothing", () => {
    const before = git(origin, "rev-parse", "main");
    // A branch whose HEAD has diverged from origin/main — not merely a different name.
    gitAs(work, "checkout", "-q", "-b", "side");
    writeFileSync(join(work, "other.txt"), "side work\n");
    gitAs(work, "add", "other.txt");
    gitAs(work, "commit", "-q", "-m", "side commit");

    const rel = writeEvent("fourth");
    const outcome = gitCommitToMain(rel, envelope("fourth"));

    expect(outcome.ok).toBe(false);
    if (!outcome.ok) expect(outcome.reason).toContain("main checkout");
    expect(git(origin, "rev-parse", "main")).toBe(before);
  });

  it("lands the event anyway when a peer advanced origin/main first", () => {
    // Peer contention, the case `pushWithRebaseRetry` exists for. Disjoint files, so the rebase
    // is expected to succeed and BOTH events must survive — a retry that dropped the peer's
    // commit would look identical from this side.
    const peer = join(root, "peer");
    git(root, "clone", "--quiet", origin, peer);
    mkdirSync(join(peer, "events"), { recursive: true });
    writeFileSync(join(peer, "events/peer.json"), "{}\n");
    gitAs(peer, "add", "events/peer.json");
    gitAs(peer, "commit", "-q", "-m", "peer event");
    gitAs(peer, "push", "-q", "origin", "main");

    const rel = writeEvent("mine");
    const outcome = gitCommitToMain(rel, envelope("mine"));

    expect(outcome.ok).toBe(true);
    const files = filesOnOrigin();
    expect(files).toContain(rel);
    expect(files).toContain("events/peer.json");
  });

  it("undoes its local commit when the push cannot land, leaving no residue", () => {
    const headBefore = git(work, "rev-parse", "HEAD");
    // Break the remote so every push and every fetch-based rebase fails.
    rejectPushes();

    const rel = writeEvent("doomed");
    const outcome = gitCommitToMain(rel, envelope("doomed"));

    expect(outcome.ok).toBe(false);
    // The local commit must be gone — a commit that only exists here is the residue the reason
    // string promises was cleaned up.
    expect(git(work, "rev-parse", "HEAD")).toBe(headBefore);
  });

  it("the undo does not touch a concurrent uncommitted edit in another file", () => {
    // THE CLAIM UNDER TEST, verbatim from the source: a `reset --hard` "would wipe an agent's
    // concurrent uncommitted work in other files", so the undo is targeted and leaves "every other
    // file exactly as it was". Failure here looks like another agent's work vanishing, hours later,
    // blamed on anything but the sink.
    writeFileSync(join(work, "README.md"), "an agent was editing this\n");
    const dirtyBefore = readFileSync(join(work, "README.md"), "utf-8");

    const untracked = join(work, "scratch.txt");
    writeFileSync(untracked, "untracked work in progress\n");

    rejectPushes();

    const rel = writeEvent("doomed-with-neighbours");
    expect(gitCommitToMain(rel, envelope("doomed-with-neighbours")).ok).toBe(false);

    // The modified tracked file keeps its uncommitted content…
    expect(readFileSync(join(work, "README.md"), "utf-8")).toBe(dirtyBefore);
    // …and the untracked file is still there.
    expect(existsSync(untracked)).toBe(true);
    expect(readFileSync(untracked, "utf-8")).toBe("untracked work in progress\n");
  });

  it("leaves the index clean after a failed push, so the next rebase is not blocked", () => {
    // The failure mode the source comment names: a staged-add of a file that is later removed
    // leaves a dirty index which blocks the NEXT tick's rebase. That turns one failed push into a
    // wedged agent, which is why the state after the failure matters as much as the outcome.
    rejectPushes();

    const rel = writeEvent("doomed-index");
    expect(gitCommitToMain(rel, envelope("doomed-index")).ok).toBe(false);

    // Our path must not be left staged. It may remain on disk as untracked — `append` removes it on
    // the ok:false return — but the INDEX must carry nothing of ours.
    const staged = git(work, "diff", "--cached", "--name-only");
    expect(staged.split("\n").filter((l) => l.length > 0)).not.toContain(rel);
  });
});
