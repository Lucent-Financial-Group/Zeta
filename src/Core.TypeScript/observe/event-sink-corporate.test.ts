/**
 * event-sink-corporate.test.ts — falsifiers for "the corporate lane proposes; it does not land".
 *
 * The property worth the most here is a NEGATIVE one: no configuration, no failure path, and no
 * retry may end with this sink writing the base branch. A sink that usually proposes and
 * occasionally pushes is a sink nobody can trust with the harness's push stage.
 */

import { describe, expect, test } from "bun:test";
import type { ForgeHost } from "../forge-host/forge-host";
import type { ForgeError, PullRequest, Result } from "../forge-host/types";
import type { NextAction } from "./observe";
import {
  DEFAULT_BASE_REF,
  DEFAULT_BRANCH_PREFIX,
  branchForBatch,
  branchIsProposable,
  commitMessageFor,
  corporateSink,
  prBodyFor,
  prTitleFor,
  type CorporateEventEnvelope,
} from "./event-sink-corporate";

const okR = <T>(value: T): Result<T, ForgeError> => ({ ok: true, value });
const errR = (kind: ForgeError["kind"], message: string): Result<never, ForgeError> => ({
  ok: false,
  error: { kind, message, retryable: kind === "network" || kind === "rate-limited" },
});

interface Recorded {
  readonly refsCreated: string[];
  readonly refsUpdated: string[];
  readonly blobs: string[];
  readonly prs: { head: string; base: string; title: string }[];
  /** The `baseTree` each createTree was given. Recorded because omitting it DELETES the repo. */
  readonly treeBases: (string | undefined)[];
}

function fakeForge(over: Partial<ForgeHost> = {}): { forge: ForgeHost; rec: Recorded } {
  const rec: Recorded = { refsCreated: [], refsUpdated: [], blobs: [], prs: [], treeBases: [] };
  const base: Partial<ForgeHost> = {
    forgeName: "fake",
    getRef: async () => okR({ ref: "refs/heads/main", sha: "basesha" }),
    getCommit: async (sha: string) => okR({ sha, treeSha: "basetree", message: "base", parents: [] }),
    createBlob: async (content: string) => {
      rec.blobs.push(content);
      return okR(`blob${String(rec.blobs.length)}`);
    },
    createTree: async (_entries: unknown, baseTree?: string) => {
      rec.treeBases.push(baseTree);
      return okR("newtree");
    },
    createCommit: async () => okR("newcommit"),
    createRef: async (ref: string) => {
      rec.refsCreated.push(ref);
      return okR(undefined);
    },
    updateRef: async (ref: string) => {
      rec.refsUpdated.push(ref);
      return okR(undefined);
    },
    createPullRequest: async (o: { head: string; base: string; title: string }) => {
      rec.prs.push({ head: o.head, base: o.base, title: o.title });
      return okR({
        number: 4242,
        title: o.title,
        headRef: o.head,
        baseRef: o.base,
        state: "open",
        isDraft: false,
        mergeStateStatus: "clean",
        reviewDecision: null,
        url: "https://forge/pull/4242",
        updatedAt: "",
        author: "a",
      } as unknown as PullRequest);
    },
    ...over,
  };
  return { forge: base as ForgeHost, rec };
}

let seq = 0;
const mint = () => `event${String(++seq)}`;
const now = () => 1_700_000_000_000;
const explore: NextAction = { kind: "explore", reason: "r" };

function sinkWith(over: Partial<Parameters<typeof corporateSink>[0]> = {}, forge?: ForgeHost) {
  return corporateSink({
    eventDir: "docs/observe-events",
    by: "otto",
    mint,
    now,
    ...(forge === undefined ? {} : { forge }),
    ...over,
  });
}

describe("branchIsProposable — the safety property, exercised directly", () => {
  test("the base branch is refused outright", () => {
    const r = branchIsProposable("main", DEFAULT_BRANCH_PREFIX, "main");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toContain("proposes, it does not land");
  });

  test("anything outside the prefix is refused, however plausible", () => {
    for (const b of ["release/1.0", "hotfix", "refs/heads/main", "observe-but-not-really/x"]) {
      expect(branchIsProposable(b, DEFAULT_BRANCH_PREFIX, DEFAULT_BASE_REF).ok).toBe(false);
    }
  });

  test("a branch under the prefix is allowed", () => {
    expect(branchIsProposable("observe/event1", DEFAULT_BRANCH_PREFIX, DEFAULT_BASE_REF).ok).toBe(true);
  });

  test("traversal and whitespace are refused", () => {
    expect(branchIsProposable("observe/../main", DEFAULT_BRANCH_PREFIX, DEFAULT_BASE_REF).ok).toBe(false);
    expect(branchIsProposable("observe/a b", DEFAULT_BRANCH_PREFIX, DEFAULT_BASE_REF).ok).toBe(false);
  });

  test("a prefix that IS the base is still refused — the base check comes first", () => {
    // Someone configuring `branchPrefix: "main"` must not thereby authorise writing main.
    expect(branchIsProposable("main", "main", "main").ok).toBe(false);
  });
});

describe("the branch guard is consulted AT FLUSH, not only in isolation", () => {
  test("a minter that produces a traversal segment cannot make this sink write outside its prefix", async () => {
    // The guard is only a safety property if the flush path CONSULTS it. A mutation removing the
    // call SURVIVED until this test existed: with a well-behaved minter the derived branch always
    // passes, so the happy path never exercised the check.
    const { forge, rec } = fakeForge();
    const s2 = corporateSink({
      eventDir: "d",
      by: "otto",
      mint: () => "../main",
      now,
      forge,
    });
    await s2.append(explore);
    const f = await s2.flush();
    expect(f.ok).toBe(false);
    if (!f.ok) expect(f.reason).toContain("not a plausible branch name");
    expect(rec.refsCreated).toEqual([]);
    expect(rec.prs).toEqual([]);
    expect(s2.pending()).toHaveLength(1);
  });

  test("a prefix the derived branch does not match is refused at flush", async () => {
    const { forge, rec } = fakeForge();
    const s2 = corporateSink({
      eventDir: "d",
      by: "otto",
      // The minter is fine; the CONFIG is inconsistent — the guard must still catch it.
      branchPrefix: "observe/",
      mint: () => "x",
      now,
      forge,
    });
    // Force the mismatch by pointing the base at the branch this batch would produce.
    const s3 = corporateSink({
      eventDir: "d",
      by: "otto",
      branchPrefix: "",
      baseRef: "x",
      mint: () => "x",
      now,
      forge,
    });
    await s2.append(explore);
    await s3.append(explore);
    expect((await s3.flush()).ok).toBe(false);
    expect(rec.refsCreated.filter((r) => r.includes("heads/x"))).toEqual([]);
  });
});

describe("append stages; it does not propose", () => {
  test("append returns the id and touches the forge not at all", async () => {
    const { forge, rec } = fakeForge();
    const s = sinkWith({}, forge);
    const out = await s.append(explore);
    expect(out.ok).toBe(true);
    expect(s.pending()).toHaveLength(1);
    expect(rec.blobs).toEqual([]);
    expect(rec.prs).toEqual([]);
  });

  test("pending() is a COPY — a caller cannot mutate the batch", async () => {
    const { forge } = fakeForge();
    const s = sinkWith({}, forge);
    await s.append(explore);
    (s.pending() as CorporateEventEnvelope[]).length = 0;
    expect(s.pending()).toHaveLength(1);
  });
});

describe("flush proposes — branch, then pull request", () => {
  test("it creates a ref under the prefix and opens a PR against the base", async () => {
    const { forge, rec } = fakeForge();
    const s = sinkWith({}, forge);
    await s.append(explore);
    const f = await s.flush();
    expect(f.ok).toBe(true);
    if (!f.ok || f.kind !== "proposed") return;
    expect(rec.refsCreated).toHaveLength(1);
    expect(rec.refsCreated[0]!.startsWith(`refs/heads/${DEFAULT_BRANCH_PREFIX}`)).toBe(true);
    expect(rec.prs).toEqual([{ head: f.branch, base: "main", title: expect.any(String) }]);
    expect(f.prNumber).toBe(4242);
  });

  test("it NEVER updates a ref — only creates one under the prefix", async () => {
    // `updateRef` on `heads/main` is the one call that would land the batch. It is not made.
    const { forge, rec } = fakeForge();
    const s = sinkWith({}, forge);
    await s.append(explore);
    await s.flush();
    expect(rec.refsUpdated).toEqual([]);
  });

  test("one blob per event, and one PR for the batch — that is what BATCHED means", async () => {
    const { forge, rec } = fakeForge();
    const s = sinkWith({}, forge);
    await s.append(explore);
    await s.append({ kind: "play", reason: "r" });
    await s.append({ kind: "free_time", reason: "r" });
    await s.flush();
    expect(rec.blobs).toHaveLength(3);
    expect(rec.prs).toHaveLength(1);
  });

  test("the tree is built ON the base tree — omitting it would delete the whole repo", async () => {
    // `createTree(entries)` with no `base_tree` produces a tree containing ONLY those entries, so
    // the commit deletes every other file in the branch. The fake ignored its arguments, so a
    // mutant dropping the base tree SURVIVED — invisible in the happy path and catastrophic in life.
    const { forge, rec } = fakeForge();
    const s2 = sinkWith({}, forge);
    await s2.append(explore);
    await s2.flush();
    expect(rec.treeBases).toEqual(["basetree"]);
  });

  test("the batch is cleared only AFTER the PR exists", async () => {
    const { forge } = fakeForge();
    const s = sinkWith({}, forge);
    await s.append(explore);
    const f = await s.flush();
    expect(f.ok).toBe(true);
    expect(s.pending()).toHaveLength(0);
  });

  test("an empty flush is a no-op, not an empty PR", async () => {
    const { forge, rec } = fakeForge();
    const s = sinkWith({}, forge);
    const f = await s.flush();
    expect(f).toEqual({ ok: true, kind: "nothing-to-flush" });
    expect(rec.prs).toEqual([]);
  });
});

describe("a failed flush KEEPS the batch — an error handled by forgetting is data loss", () => {
  test("no forge means the batch is held and said out loud, never landed another way", async () => {
    const s = sinkWith({});
    await s.append(explore);
    const f = await s.flush();
    expect(f.ok).toBe(false);
    if (!f.ok) expect(f.reason).toContain("no forge is wired");
    expect(s.pending()).toHaveLength(1);
  });

  test("a forge failure at any step leaves every event pending", async () => {
    const steps: (keyof ForgeHost)[] = ["getRef", "getCommit", "createBlob", "createTree", "createCommit", "createRef"];
    for (const step of steps) {
      const { forge } = fakeForge({ [step]: async () => errR("network", `${step} exploded`) } as Partial<ForgeHost>);
      const s = sinkWith({}, forge);
      await s.append(explore);
      await s.append({ kind: "play", reason: "r" });
      const f = await s.flush();
      expect(f.ok).toBe(false);
      expect(s.pending()).toHaveLength(2);
    }
  });

  test("a failure carries the forge's real diagnosis, not a bare 'failed'", async () => {
    const { forge } = fakeForge({ getRef: async () => errR("auth-failure", "token expired") });
    const s = sinkWith({}, forge);
    await s.append(explore);
    const f = await s.flush();
    expect(f.ok).toBe(false);
    if (!f.ok) {
      expect(f.reason).toContain("token expired");
      expect(f.reason).toContain("an operator must act");
    }
  });

  test("a created branch with no PR SAYS the branch exists — a blind retry would misread a 422", async () => {
    const { forge } = fakeForge({ createPullRequest: async () => errR("rate-limited", "slow down") });
    const s = sinkWith({}, forge);
    await s.append(explore);
    const f = await s.flush();
    expect(f.ok).toBe(false);
    if (!f.ok) expect(f.reason).toContain("was created but the pull request was not");
    expect(s.pending()).toHaveLength(1);
  });

  test("a retry reuses the SAME branch — the name comes from the first event, not the clock", async () => {
    const { forge, rec } = fakeForge({ createPullRequest: async () => errR("network", "blip") });
    const s = sinkWith({}, forge);
    await s.append(explore);
    const first = await s.flush();
    const second = await s.flush();
    expect(first.ok).toBe(false);
    expect(second.ok).toBe(false);
    expect(new Set(rec.refsCreated).size).toBe(1);
  });
});

describe("auto-flush", () => {
  test("it fires at the threshold and not before", async () => {
    const { forge, rec } = fakeForge();
    const s = sinkWith({ autoFlushAt: 2 }, forge);
    await s.append(explore);
    expect(rec.prs).toHaveLength(0);
    await s.append({ kind: "play", reason: "r" });
    expect(rec.prs).toHaveLength(1);
  });

  test("a failed auto-flush reports the append as NOT durable, and keeps the event", async () => {
    // "Your event is durable" would be a stronger claim than the truth.
    const { forge } = fakeForge({ createRef: async () => errR("network", "blip") });
    const s = sinkWith({ autoFlushAt: 1 }, forge);
    const out = await s.append(explore);
    expect(out.ok).toBe(false);
    if (!out.ok) expect(out.reason).toContain("could not be proposed");
    expect(s.pending()).toHaveLength(1);
  });

  test("zero disables it", async () => {
    const { forge, rec } = fakeForge();
    const s = sinkWith({ autoFlushAt: 0 }, forge);
    for (let i = 0; i < 5; i++) await s.append(explore);
    expect(rec.prs).toHaveLength(0);
    expect(s.pending()).toHaveLength(5);
  });
});

describe("what the reviewer reads", () => {
  const batch: readonly CorporateEventEnvelope[] = [
    { id: "e1", at: "2026-09-03T00:00:00.000Z", by: "otto", action: { kind: "explore", reason: "r" } },
    {
      id: "e2",
      at: "2026-09-03T00:01:00.000Z",
      by: "otto",
      action: { kind: "do_item", item: { id: "081K", title: "t", ready: true, ambiguous: false } },
    },
  ];

  test("the commit message lists every event", () => {
    const m = commitMessageFor(batch);
    expect(m).toContain("2 event(s)");
    expect(m).toContain("explore");
    expect(m).toContain("do_item 081K");
  });

  test("the PR title names the distinct kinds", () => {
    expect(prTitleFor(batch)).toContain("do_item, explore");
  });

  test("the PR body says the lane does not push to the base", () => {
    const b = prBodyFor(batch);
    expect(b).toContain("does not push to the base branch");
    expect(b).toContain("e1");
    expect(b).toContain("e2");
  });

  test("branchForBatch is a pure function of the prefix and the first id", () => {
    expect(branchForBatch("observe/", "abc")).toBe("observe/abc");
  });
});
