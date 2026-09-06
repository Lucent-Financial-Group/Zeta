/**
 * corporate/portfolio.ts — the long-lived thing goals are ABOUT.
 *
 * ── THE MISSING RUNG THAT IS NOT A RUNG ──────────────────────────────────────
 * The reference's product shape reads `Goal -> Project -> Initiative -> ...`, and its Project is a
 * *"long-lived product, platform, repo family, customer area, or internal system"*. Comparing that
 * to this register's ladder looked at first like an inverted pair — we nest initiative above
 * project, it nests project above initiative.
 *
 * It is not an inversion. A long-lived product CANNOT be the child of a single goal: goals are
 * accepted and delivered while the product persists across all of them. That top arrow is an
 * ASSOCIATION — *this goal is about that product* — and `goal-cascade.ts` models decomposition
 * edges only, where every node has one parent and delivery rolls up from the leaves.
 *
 * So the real divergence was never the ordering. It was a MISSING CONCEPT: nothing here outlived a
 * goal. This is that concept, deliberately kept OUT of the cascade so the ladder stays a
 * decomposition and this stays a container.
 *
 * ── A PORTFOLIO IS NEVER DELIVERED ───────────────────────────────────────────
 * The property that makes it long-lived is that it has no terminal state. A goal completes; a
 * product does not. `completePortfolio` therefore does not exist, and `retire` is a separate,
 * explicit act with a reason — because a product being wound down is a decision somebody makes,
 * not a consequence of its work finishing.
 *
 * ── WHAT IT BUYS ─────────────────────────────────────────────────────────────
 * A question the cascade cannot answer. Each goal is its own tree, so "how has checkout done over
 * the last six goals" has nowhere to be asked. With an association it is a fold across goals —
 * which is the whole reason a portfolio exists in an organization rather than just a label.
 *
 * ── NAMING ───────────────────────────────────────────────────────────────────
 * Called `Portfolio` and not `Project`, because `WorkType.Project` already means a unit of delivery
 * inside an initiative here. Reusing the word would make one term mean two things one rung apart —
 * the anti-Babel failure, in the vocabulary this register has to share with the reference. The
 * mapping is recorded in `goal-cascade.ts`.
 */

import { LEVEL_RANK, type OrgChart } from "./org-chart";
import { isDelivered, WorkType, type Cascade } from "./goal-cascade";

/** What kind of long-lived thing this is. The reference's own list. */
export const PortfolioKind = {
  Product: "product",
  Platform: "platform",
  RepoFamily: "repo_family",
  CustomerArea: "customer_area",
  InternalSystem: "internal_system",
} as const;

export type PortfolioKind = (typeof PortfolioKind)[keyof typeof PortfolioKind];

/** The lowest level that may own a portfolio. It spans goals, so it outranks any one goal's owner. */
export const MIN_OWNER_LEVEL = "director";

export interface Portfolio {
  readonly portfolioId: string;
  readonly title: string;
  readonly kind: PortfolioKind;
  readonly ownerHatId: string;
  /**
   * Why it was wound down, if it was. Absent means live.
   *
   * Not a `state` field with a `retired` member: a portfolio has no lifecycle to move through, and
   * giving it one would invite the completion this type exists to refuse.
   */
  readonly retiredReason?: string;
}

/** Goals are associated with a portfolio; a portfolio accumulates goals over time. */
export interface PortfolioBook {
  readonly portfolios: readonly Portfolio[];
  /** goalId → portfolioId. Many goals to one portfolio, never the reverse. */
  readonly goalOf: Readonly<Record<string, string>>;
}

export const EMPTY_BOOK: PortfolioBook = { portfolios: [], goalOf: {} };

export type BookResult =
  | { readonly ok: true; readonly book: PortfolioBook }
  | { readonly ok: false; readonly reason: string };

export function portfolioById(book: PortfolioBook, portfolioId: string): Portfolio | undefined {
  return book.portfolios.find((p) => p.portfolioId === portfolioId);
}

/**
 * Open a portfolio.
 *
 * Refuses an owner below director: a container that spans goals cannot be owned by a hat junior to
 * the people who own the goals inside it, or the association would invert the reporting line.
 */
export function openPortfolio(
  book: PortfolioBook,
  chart: OrgChart,
  input: { readonly portfolioId: string; readonly title: string; readonly kind: PortfolioKind; readonly ownerHatId: string },
): BookResult {
  if (input.title.trim() === "") return { ok: false, reason: "a portfolio needs a title" };
  if (portfolioById(book, input.portfolioId) !== undefined) {
    return { ok: false, reason: `portfolio '${input.portfolioId}' already exists` };
  }
  const owner = chart.byId.get(input.ownerHatId);
  if (owner === undefined) return { ok: false, reason: `no hat '${input.ownerHatId}'` };
  // Lower rank is more senior.
  if (LEVEL_RANK[owner.level] > LEVEL_RANK[MIN_OWNER_LEVEL]) {
    return {
      ok: false,
      reason: `'${input.ownerHatId}' is a ${owner.level}; a portfolio spans goals and needs ${MIN_OWNER_LEVEL} or above`,
    };
  }
  return {
    ok: true,
    book: { ...book, portfolios: [...book.portfolios, { ...input }] },
  };
}

/**
 * Associate a goal with a portfolio.
 *
 * Re-association is ALLOWED and overwrites: an organization does re-org, and a goal moving from one
 * product to another is a real thing that happens. What is refused is associating with a portfolio
 * that does not exist, or with a RETIRED one — new work does not start on a product being wound
 * down, and letting it would make retirement advisory.
 */
export function associateGoal(book: PortfolioBook, goalId: string, portfolioId: string): BookResult {
  const portfolio = portfolioById(book, portfolioId);
  if (portfolio === undefined) return { ok: false, reason: `no portfolio '${portfolioId}'` };
  if (portfolio.retiredReason !== undefined) {
    return { ok: false, reason: `portfolio '${portfolioId}' is retired (${portfolio.retiredReason})` };
  }
  return { ok: true, book: { ...book, goalOf: { ...book.goalOf, [goalId]: portfolioId } } };
}

/**
 * Wind a portfolio down.
 *
 * A deliberate act with a reason, not a consequence of its goals finishing — that is the whole
 * difference between a container and a work item. Retiring one with LIVE goals is refused: the work
 * has to be dealt with first, and closing the container over the top of it would orphan it.
 */
export function retirePortfolio(
  book: PortfolioBook,
  cascade: Cascade,
  portfolioId: string,
  reason: string,
): BookResult {
  const portfolio = portfolioById(book, portfolioId);
  if (portfolio === undefined) return { ok: false, reason: `no portfolio '${portfolioId}'` };
  if (reason.trim() === "") return { ok: false, reason: "retiring a portfolio needs a reason" };
  if (portfolio.retiredReason !== undefined) {
    return { ok: false, reason: `portfolio '${portfolioId}' is already retired` };
  }
  const live = goalsIn(book, portfolioId).filter((goalId) => !isDelivered(cascade, goalId));
  if (live.length > 0) {
    return { ok: false, reason: `portfolio '${portfolioId}' has ${live.length} undelivered goal(s): ${live.join(", ")}` };
  }
  return {
    ok: true,
    book: {
      ...book,
      portfolios: book.portfolios.map((p) => (p.portfolioId === portfolioId ? { ...p, retiredReason: reason } : p)),
    },
  };
}

/** Every goal associated with a portfolio, in association order. */
export function goalsIn(book: PortfolioBook, portfolioId: string): readonly string[] {
  return Object.keys(book.goalOf).filter((goalId) => book.goalOf[goalId] === portfolioId);
}

/** Which portfolio a goal is about, if any. */
export function portfolioOf(book: PortfolioBook, goalId: string): Portfolio | undefined {
  const id = book.goalOf[goalId];
  return id === undefined ? undefined : portfolioById(book, id);
}

export interface PortfolioHistory {
  readonly portfolioId: string;
  readonly goals: number;
  readonly delivered: number;
  /** Goals associated with the portfolio that the cascade has never heard of. */
  readonly unknownGoals: readonly string[];
}

/**
 * How a portfolio has done ACROSS its goals.
 *
 * The question the cascade cannot answer, and the reason the association is worth having: each goal
 * is its own tree, so delivery over six goals has nowhere to be asked without a container.
 *
 * A goal the cascade does not contain is reported rather than counted either way — a portfolio
 * pointing at work nobody can find is a broken association, and scoring it as undelivered would
 * make a bookkeeping error look like a delivery problem.
 */
export function portfolioHistory(book: PortfolioBook, cascade: Cascade, portfolioId: string): PortfolioHistory {
  const goals = goalsIn(book, portfolioId);
  const known = goals.filter((g) => cascade.nodes.some((n) => n.workId === g && n.workType === WorkType.Goal));
  return {
    portfolioId,
    goals: known.length,
    delivered: known.filter((g) => isDelivered(cascade, g)).length,
    unknownGoals: goals.filter((g) => !known.includes(g)),
  };
}

/** Portfolios with no live goals — candidates for attention, not automatically for retirement. */
export function idlePortfolios(book: PortfolioBook, cascade: Cascade): readonly Portfolio[] {
  return book.portfolios.filter((p) => {
    if (p.retiredReason !== undefined) return false;
    const goals = goalsIn(book, p.portfolioId);
    return goals.length > 0 && goals.every((g) => isDelivered(cascade, g));
  });
}
