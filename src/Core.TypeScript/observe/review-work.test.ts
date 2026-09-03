/**
 * review-work.test.ts — falsifiers for "a review is work the agent owes".
 *
 * Two properties are load-bearing and pull in opposite directions:
 *
 *   LIVENESS   a PR blocked on an unanswered review must become pickable work. It used to be
 *              invisible: the loop saw `openPrCount` and acted only on CLEAN PRs.
 *   HONESTY    the responder must never be able to make a thread go quiet without answering it.
 *              A prompt that omits what the reviewer said produces a change that looks like a
 *              response and addresses nobody.
 */

import { describe, expect, test } from "bun:test";
import type { ReviewThread } from "../forge-host/types";
import { MAX_PROMPT_THREADS, renderThread, reviewPrompt } from "./review-work";
import { firstReviewBlockedPr, observe, buildMenu, type World } from "./observe";
import { forgePrNumber, isMergeItem, isReviewItem, isSyntheticForgeItem } from "./action-reconciliation";
import { tickRooms, type Room, type ScopePredicate } from "./room/room";

function thread(patch: Partial<ReviewThread> = {}): ReviewThread {
  return {
    id: "PRRT_1",
    isResolved: false,
    isOutdated: false,
    path: "src/Core.TypeScript/observe/do-item.ts",
    line: 42,
    firstComment: { author: "lior", body: "this retry has no bound" },
    ...patch,
  };
}

describe("observe — a review-blocked PR is offered as work", () => {
  const withForge = (patch: Partial<NonNullable<World["forgeState"]>>): World => ({
    backlog: [],
    forgeState: { openPrCount: 3, cleanPrCount: 0, cleanPrNumbers: [], ...patch },
  });

  test("a PR awaiting a review answer becomes a pickable item", () => {
    // THE liveness fix. Before this, an open-but-not-clean PR was invisible to the loop entirely.
    const action = observe(withForge({ changesRequestedPrNumbers: [77] }));
    expect(action.kind).toBe("do_item");
    if (action.kind !== "do_item") return;
    expect(action.item.id).toBe("review-pr-77");
  });

  test("and it is in the menu, so the chooser can actually take it", () => {
    const menu = buildMenu(withForge({ changesRequestedPrNumbers: [77] }));
    expect(menu.some((a) => a.kind === "do_item" && a.item.id === "review-pr-77")).toBe(true);
  });

  test("merge work is offered BEFORE review work — a clean PR is one action from landing", () => {
    const action = observe(withForge({ cleanPrCount: 1, cleanPrNumbers: [5], changesRequestedPrNumbers: [77] }));
    expect(action.kind).toBe("do_item");
    if (action.kind !== "do_item") return;
    expect(action.item.id).toBe("merge-pr-5");
  });

  test("real backlog work still outranks both", () => {
    const world: World = {
      backlog: [{ id: "081K", title: "real work", ready: true, ambiguous: false }],
      forgeState: { openPrCount: 1, cleanPrCount: 0, cleanPrNumbers: [], changesRequestedPrNumbers: [77] },
    };
    const action = observe(world);
    expect(action.kind === "do_item" && action.item.id).toBe("081K");
  });

  test("an ABSENT list is not an empty one — nothing is offered, and nothing is claimed", () => {
    // "The forge did not report" and "there is no review work" produce the same offer (none) and
    // must not produce the same CLAIM. The difference is reported by the forge diagnosis.
    expect(firstReviewBlockedPr(withForge({}))).toBeUndefined();
    expect(firstReviewBlockedPr({ backlog: [] })).toBeUndefined();
    expect(firstReviewBlockedPr(withForge({ changesRequestedPrNumbers: [] }))).toBeUndefined();
  });
});

describe("synthetic forge items are scoped by the forge, not the backlog", () => {
  test("both prefixes are recognised, and the authorities stay distinct", () => {
    expect(isSyntheticForgeItem("merge-pr-1")).toBe(true);
    expect(isSyntheticForgeItem("review-pr-1")).toBe(true);
    expect(isSyntheticForgeItem("081KSNY2Z0008QG0R002JKH50A")).toBe(false);
    // Merging is a distinct AUTHORITY; answering a review is ordinary work. Keeping the predicates
    // separate is what stops a review item quietly acquiring merge rights.
    expect(isMergeItem("review-pr-1")).toBe(false);
    expect(isReviewItem("merge-pr-1")).toBe(false);
  });

  test("the PR number is recovered, and a malformed id yields null rather than NaN", () => {
    expect(forgePrNumber("review-pr-77")).toBe(77);
    expect(forgePrNumber("merge-pr-5")).toBe(5);
    expect(forgePrNumber("review-pr-abc")).toBeNull();
    expect(forgePrNumber("review-pr-0")).toBeNull();
    expect(forgePrNumber("081KSNY2Z0008QG0R002JKH50A")).toBeNull();
  });

  test("a room does not refuse its own forge work as out of scope", async () => {
    // A forge item has no backlog file, so `backlogIds` can never contain one. Scoping it by
    // backlog membership made the loop refuse the very work it had just offered itself.
    const scope: ScopePredicate = {
      backlogIds: new Set(),
      prNumbers: new Set(),
      operatorAccess: false,
      writeAccess: true,
    };
    const room: Room = {
      id: "r",
      scope,
      state: {},
      tick: async () => ({
        action: {
          kind: "do_item",
          item: { id: "review-pr-77", title: "answer", ready: true, ambiguous: false },
        },
        tier: "oracle" as const,
        confidence: 1,
      }),
    };
    const [result] = await tickRooms([room], { backlog: [] });
    expect(result?.scopeViolation).toBe(false);
  });
});

describe("reviewPrompt — the reviewer's own words, and a boundary the agent can read", () => {
  test("it carries who said what, and where", () => {
    const p = reviewPrompt({ prNumber: 77, threads: [thread()], unanswerable: 0 });
    expect(p).toContain("PR #77");
    expect(p).toContain("lior");
    expect(p).toContain("this retry has no bound");
    expect(p).toContain("do-item.ts:42");
    expect(p).toContain("PRRT_1");
  });

  test("it forbids resolving, IN THE PROMPT — not only in the module header", () => {
    // A boundary the executing agent never sees is one that depends on it already knowing.
    const p = reviewPrompt({ prNumber: 77, threads: [thread()], unanswerable: 0 });
    expect(p).toContain("cannot mark a thread resolved");
  });

  test("resolved threads are not put to the responder", () => {
    const p = reviewPrompt({
      prNumber: 77,
      threads: [thread(), thread({ id: "PRRT_2", isResolved: true, firstComment: { author: "v", body: "settled" } })],
      unanswerable: 0,
    });
    expect(p).toContain("1 unresolved thread(s)");
    expect(p).not.toContain("settled");
  });

  test("an OUTDATED thread is marked, never dropped", () => {
    // "The code changed" is not "the reviewer was answered".
    const p = reviewPrompt({ prNumber: 77, threads: [thread({ isOutdated: true })], unanswerable: 0 });
    expect(p).toContain("OUTDATED");
    expect(p).toContain("the concern still stands");
  });

  test("threads the forge could not identify are DECLARED, not silently dropped", () => {
    const p = reviewPrompt({ prNumber: 77, threads: [thread()], unanswerable: 2 });
    expect(p).toContain("2 further unresolved thread(s) could not be identified");
    expect(p).toContain("still block");
  });

  test("the listing is bounded but the COUNT is exact", () => {
    const many = Array.from({ length: MAX_PROMPT_THREADS + 4 }, (_, i) =>
      thread({ id: `t${String(i)}`, firstComment: { author: "r", body: `point ${String(i)}` } }),
    );
    const p = reviewPrompt({ prNumber: 77, threads: many, unanswerable: 0 });
    expect(p).toContain(`${String(MAX_PROMPT_THREADS + 4)} unresolved thread(s)`);
    expect(p).toContain("and 4 further thread(s) not shown");
    expect(p).toContain("point 0");
    expect(p).not.toContain(`point ${String(MAX_PROMPT_THREADS + 3)}`);
  });

  test("a thread with no comment body says so rather than reading as empty", () => {
    const bare: ReviewThread = { id: "t", isResolved: false, isOutdated: false };
    expect(renderThread(bare)).toContain("not returned by the forge");
    expect(renderThread(bare)).toContain("(no file)");
  });

  test("a multi-line comment survives intact", () => {
    const p = renderThread(thread({ firstComment: { author: "lior", body: "first\nsecond\nthird" } }));
    expect(p).toContain("first");
    expect(p).toContain("second");
    expect(p).toContain("third");
  });
});
