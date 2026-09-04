/**
 * portfolio.test.ts — the long-lived thing goals are about.
 *
 * The property that makes this worth having, and the one the cascade cannot provide: a portfolio
 * ACCUMULATES across goals. Each goal is its own tree, so "how has checkout done over six goals"
 * has nowhere to be asked without a container that outlives them.
 *
 * The property that keeps it honest: it is never delivered. A goal completes; a product does not.
 */

import { describe, expect, test } from "bun:test";
import {
  associateGoal,
  EMPTY_BOOK,
  goalsIn,
  idlePortfolios,
  MIN_OWNER_LEVEL,
  openPortfolio,
  portfolioById,
  PortfolioKind,
  portfolioHistory,
  portfolioOf,
  retirePortfolio,
  type PortfolioBook,
} from "./portfolio";
import { buildOrgChart, LEVEL_RANK } from "./org-chart";
import { SEED_HATS } from "./org-seed";
import { WorkState, WorkType, type Cascade } from "./goal-cascade";

const chart = (() => {
  const r = buildOrgChart(SEED_HATS);
  if (!r.ok) throw new Error(r.reason);
  return r.chart;
})();

const must = (r: ReturnType<typeof openPortfolio>): PortfolioBook => {
  if (!r.ok) throw new Error(r.reason);
  return r.book;
};

const opened = (over: Partial<Parameters<typeof openPortfolio>[2]> = {}) =>
  must(
    openPortfolio(EMPTY_BOOK, chart, {
      portfolioId: "checkout",
      title: "Checkout",
      kind: PortfolioKind.Product,
      ownerHatId: "engineering_director",
      ...over,
    }),
  );

/** A goal and its one task, so `isDelivered` has something real to fold. */
const goalTree = (goalId: string, done: boolean): Cascade["nodes"] => [
  { workId: goalId, workType: WorkType.Goal, title: goalId, state: WorkState.Open, ownerHatId: "cto" },
  {
    workId: `${goalId}-t`,
    workType: WorkType.Task,
    title: "t",
    state: done ? WorkState.Done : WorkState.Open,
    ownerHatId: "tech_lead",
    parentWorkId: goalId,
    assigneeHatId: "backend_implementer",
  },
];

describe("opening one", () => {
  test("a director may own a portfolio", () => {
    const book = opened();
    expect(portfolioById(book, "checkout")?.title).toBe("Checkout");
    expect(portfolioById(book, "checkout")?.retiredReason).toBeUndefined();
  });

  test("A HAT BELOW DIRECTOR MAY NOT — the container spans the goals inside it", () => {
    // A container owned by a hat junior to the people who own its goals would invert the reporting
    // line: the owner could not act on the work it supposedly contains.
    const r = openPortfolio(EMPTY_BOOK, chart, {
      portfolioId: "p",
      title: "P",
      kind: PortfolioKind.Product,
      ownerHatId: "tech_lead",
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toContain(MIN_OWNER_LEVEL);
    // ...and the level check is a real threshold, not a rejection of everything.
    expect(LEVEL_RANK["director"]).toBeLessThan(LEVEL_RANK["lead"]);
    expect(openPortfolio(EMPTY_BOOK, chart, { portfolioId: "p", title: "P", kind: PortfolioKind.Product, ownerHatId: "cto" }).ok).toBe(true);
  });

  test("an unknown owner, an empty title and a duplicate id are all refused", () => {
    expect(openPortfolio(EMPTY_BOOK, chart, { portfolioId: "p", title: "P", kind: PortfolioKind.Product, ownerHatId: "ghost" }).ok).toBe(false);
    expect(openPortfolio(EMPTY_BOOK, chart, { portfolioId: "p", title: "  ", kind: PortfolioKind.Product, ownerHatId: "cto" }).ok).toBe(false);
    expect(openPortfolio(opened(), chart, { portfolioId: "checkout", title: "again", kind: PortfolioKind.Product, ownerHatId: "cto" }).ok).toBe(false);
  });
});

describe("goals are ASSOCIATED, never contained", () => {
  test("many goals accumulate on one portfolio", () => {
    let book = opened();
    book = must(associateGoal(book, "g1", "checkout"));
    book = must(associateGoal(book, "g2", "checkout"));
    expect([...goalsIn(book, "checkout")].sort()).toEqual(["g1", "g2"]);
    expect(portfolioOf(book, "g1")?.portfolioId).toBe("checkout");
  });

  test("RE-ASSOCIATION IS ALLOWED — organizations re-org", () => {
    let book = opened();
    book = must(openPortfolio(book, chart, { portfolioId: "payments", title: "Payments", kind: PortfolioKind.Platform, ownerHatId: "engineering_director" }));
    book = must(associateGoal(book, "g1", "checkout"));
    book = must(associateGoal(book, "g1", "payments"));
    expect(portfolioOf(book, "g1")?.portfolioId).toBe("payments");
    // Moved, not duplicated: the goal belongs to one portfolio at a time.
    expect(goalsIn(book, "checkout")).toEqual([]);
  });

  test("associating with a portfolio that does not exist is refused", () => {
    expect(associateGoal(opened(), "g1", "nope").ok).toBe(false);
  });

  test("a goal with no portfolio simply has none — not a default one", () => {
    expect(portfolioOf(opened(), "unassociated")).toBeUndefined();
  });
});

describe("A PORTFOLIO IS NEVER DELIVERED", () => {
  test("there is no completion — only an explicit retirement, with a reason", () => {
    // The type carries no state to complete. Retirement is a decision somebody makes, not a
    // consequence of the work inside finishing.
    let book = opened();
    book = must(associateGoal(book, "g1", "checkout"));
    const cascade: Cascade = { nodes: goalTree("g1", true) };
    expect(retirePortfolio(book, cascade, "checkout", "  ").ok).toBe(false);
    const r = retirePortfolio(book, cascade, "checkout", "product sunset");
    expect(r.ok).toBe(true);
    if (r.ok) expect(portfolioById(r.book, "checkout")?.retiredReason).toBe("product sunset");
  });

  test("RETIRING OVER LIVE WORK IS REFUSED — it would orphan the goals", () => {
    let book = opened();
    book = must(associateGoal(book, "g1", "checkout"));
    const live: Cascade = { nodes: goalTree("g1", false) };
    const r = retirePortfolio(book, live, "checkout", "sunset");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toContain("undelivered");
  });

  test("a retired portfolio takes no NEW goals — otherwise retirement is advisory", () => {
    let book = opened();
    book = must(associateGoal(book, "g1", "checkout"));
    const done: Cascade = { nodes: goalTree("g1", true) };
    const retired = retirePortfolio(book, done, "checkout", "sunset");
    expect(retired.ok).toBe(true);
    if (!retired.ok) return;
    const r = associateGoal(retired.book, "g2", "checkout");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toContain("retired");
  });

  test("retiring twice is refused", () => {
    let book = opened();
    const empty: Cascade = { nodes: [] };
    const once = retirePortfolio(book, empty, "checkout", "sunset");
    expect(once.ok).toBe(true);
    if (once.ok) expect(retirePortfolio(once.book, empty, "checkout", "again").ok).toBe(false);
  });
});

describe("THE QUESTION THE CASCADE CANNOT ANSWER", () => {
  test("delivery ACROSS goals — each goal is its own tree, so this needs the container", () => {
    let book = opened();
    book = must(associateGoal(book, "g1", "checkout"));
    book = must(associateGoal(book, "g2", "checkout"));
    book = must(associateGoal(book, "g3", "checkout"));
    const cascade: Cascade = { nodes: [...goalTree("g1", true), ...goalTree("g2", true), ...goalTree("g3", false)] };

    const history = portfolioHistory(book, cascade, "checkout");
    expect(history.goals).toBe(3);
    expect(history.delivered).toBe(2);
    expect(history.unknownGoals).toEqual([]);
  });

  test("a goal the cascade never heard of is REPORTED, not scored", () => {
    // Counting it as undelivered would make a bookkeeping error look like a delivery problem.
    let book = opened();
    book = must(associateGoal(book, "ghost", "checkout"));
    const history = portfolioHistory(book, { nodes: [] }, "checkout");
    expect(history.goals).toBe(0);
    expect(history.delivered).toBe(0);
    expect(history.unknownGoals).toEqual(["ghost"]);
  });

  test("another portfolio's goals are not counted", () => {
    let book = opened();
    book = must(openPortfolio(book, chart, { portfolioId: "payments", title: "P", kind: PortfolioKind.Platform, ownerHatId: "engineering_director" }));
    book = must(associateGoal(book, "g1", "checkout"));
    book = must(associateGoal(book, "g2", "payments"));
    const cascade: Cascade = { nodes: [...goalTree("g1", true), ...goalTree("g2", true)] };
    expect(portfolioHistory(book, cascade, "checkout").goals).toBe(1);
  });
});

describe("idle portfolios", () => {
  test("all goals delivered means idle — and idle is not retired", () => {
    // Attention, not an automatic wind-down: a product between goals is normal.
    let book = opened();
    book = must(associateGoal(book, "g1", "checkout"));
    const cascade: Cascade = { nodes: goalTree("g1", true) };
    expect(idlePortfolios(book, cascade).map((p) => p.portfolioId)).toEqual(["checkout"]);
    expect(portfolioById(book, "checkout")?.retiredReason).toBeUndefined();
  });

  test("live work means not idle, and a portfolio with NO goals is not idle either", () => {
    let book = opened();
    // No goals at all: never started is not the same as finished, so it does not appear.
    expect(idlePortfolios(book, { nodes: [] })).toEqual([]);
    book = must(associateGoal(book, "g1", "checkout"));
    expect(idlePortfolios(book, { nodes: goalTree("g1", false) })).toEqual([]);
  });

  test("a retired portfolio is never listed as idle", () => {
    // It must have DELIVERED GOALS, or the `goals.length > 0` guard excludes it for a different
    // reason and the retirement check is never exercised.
    let book = opened();
    book = must(associateGoal(book, "g1", "checkout"));
    const cascade: Cascade = { nodes: goalTree("g1", true) };
    // Idle while live...
    expect(idlePortfolios(book, cascade).map((p) => p.portfolioId)).toEqual(["checkout"]);
    const retired = retirePortfolio(book, cascade, "checkout", "sunset");
    expect(retired.ok).toBe(true);
    // ...and absent once retired, from the very same cascade.
    if (retired.ok) expect(idlePortfolios(retired.book, cascade)).toEqual([]);
  });
});
