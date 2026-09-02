/**
 * hat-gate.dst.test.ts — deterministic simulation over the corporate gate.
 *
 * WHY DST AND NOT MORE EXAMPLES. The two defects this suite locks were both invisible to
 * example-based tests, and for the same reason: each was a statement about the RELATIONSHIP
 * between menu entries, not about any one entry. `self_claim` was ungated while `do_item` was
 * gated, so every single-action assertion passed while the pair was incoherent; and `do_item` was
 * gated on `canCreateWork`, which is only visibly wrong once you ask what the LOWEST tier can
 * still do. Relations across a whole menu, held over many generated worlds, is what a simulation
 * checks and a fixture does not.
 *
 * THE SHAPE. `splitmix64.mix` — the mixer the C#/F#/Rust oracles agree on — turns a seed into a
 * stream, and the stream generates both the worlds and the choices. For every seed, every tick and
 * every hat level, five invariants are checked over the FULL menu. Nothing here reads a clock, the
 * network or the filesystem, so the same seed yields the same trace on any machine: a failure is
 * re-runnable rather than a story about a bad afternoon (DST, per
 * `.claude/rules/dv2-data-split-discipline-activated.md` #4).
 *
 * THE INVARIANTS, and what each would have caught:
 *   1. CONTAINMENT     — a filtered menu never contains an action the authority forbids.
 *   2. NON-COERCION    — all four free modes survive at EVERY level (`non-coercion-invariant`).
 *   3. MONOTONICITY    — a junior menu is a subset of every senior one. The hierarchy is nested; no
 *                        level may hold an authority its superior lacks. Also fails if a new
 *                        HatLevel is ever inserted out of rank, which no fixture would notice.
 *   4. CLAIM COHERENCE — `self_claim` for an item is offered only where `do_item` for that same
 *                        item is. This is the one that was false.
 *   5. DETERMINISM     — same seed, same trace; and `fold(initial, trace)` equals the world reached
 *                        by stepping `simulate`. The gate must not perturb the event-sourcing
 *                        identity the rest of `observe.ts` rests on.
 *
 * Every invariant is asserted with the seed and tick in the expectation object, so a failure names
 * the exact case to replay instead of only reporting that something, somewhere, was false.
 */

import { describe, expect, test } from "bun:test";
import { mix } from "../../splitmix64/splitmix64";
import { buildMenu, fold, simulate, type BacklogItem, type NextAction, type World } from "../observe";
import { authorityForLevel, hatFilter, type HatAuthority, type HatLevel } from "./hat-gate";

/** Seniority order, most junior first. Invariant 3 is stated over this ordering. */
const LEVELS_JUNIOR_FIRST: readonly HatLevel[] = [
  "individual_contributor",
  "lead",
  "manager",
  "director",
  "c_suite",
  "executive_board",
];

const FREE_MODES = ["explore", "play", "self_reflect", "free_time"] as const;

/** A seeded stream. `mix` is the four-oracle-locked finaliser, so the stream is portable. */
function stream(seed: bigint) {
  let state = seed;
  const next = (): bigint => {
    state = mix(state);
    return state;
  };
  return {
    next,
    /** Integer in [0, n). */
    below: (n: number): number => Number(next() % BigInt(n)),
    bool: (): boolean => Number(next() % 2n) === 1,
  };
}

/** A deterministic world. Merge items are minted on purpose — they are the second authority axis. */
function generateWorld(rng: ReturnType<typeof stream>): World {
  const count = rng.below(4); // 0..3 items; 0 exercises the empty-backlog default
  const backlog: BacklogItem[] = [];
  for (let i = 0; i < count; i += 1) {
    const isMerge = rng.below(3) === 0;
    backlog.push({
      id: isMerge ? `merge-pr-${rng.below(1000)}` : `081KDST${String(rng.below(1000000)).padStart(6, "0")}`,
      title: isMerge ? "merge a pull request" : "do a unit of work",
      ready: rng.bool(),
      ambiguous: rng.bool(),
      ...(rng.below(4) === 0 ? { needsNewAction: true } : {}),
    });
  }
  return {
    backlog,
    ...(rng.bool() ? { operator: { pendingMessage: rng.bool(), pendingFerry: rng.bool() } } : {}),
    ...(rng.below(3) === 0 ? { mode: "explore" as const } : {}),
  };
}

/**
 * The authority predicate, restated here independently of the implementation.
 *
 * Deliberately NOT imported from hat-gate: a test that calls the function under test to decide what
 * that function should have done cannot fail. This is the second opinion.
 */
function forbids(action: NextAction, auth: HatAuthority): boolean {
  switch (action.kind) {
    case "explore":
    case "play":
    case "self_reflect":
    case "free_time":
      return false;
    case "preserve_ferry":
    case "respond_to_operator":
      return !auth.canAccessOperator;
    case "do_item":
    case "self_claim":
      return action.item.id.startsWith("merge-pr-") ? !auth.canMerge : !auth.canDoWork;
    case "decompose":
      return !auth.canDecompose;
    case "edit_grammar":
      return !auth.canEditGrammar;
    default:
      return false;
  }
}

/** Stable identity for an action, so menus can be compared as sets. */
function key(a: NextAction): string {
  if (a.kind === "do_item" || a.kind === "self_claim") return `${a.kind}:${a.item.id}`;
  if (a.kind === "decompose") return `${a.kind}:${a.item.id}`;
  if (a.kind === "navigate_cartography" || a.kind === "scope_cartography") return `${a.kind}:${a.direction}`;
  return a.kind;
}

const SEEDS = [1n, 2n, 3n, 7n, 42n, 1337n, 90210n, 0xdeadbeefn];
const TICKS = 12;

describe("hat-gate DST — invariants over seeded worlds", () => {
  test("1. containment: a filtered menu never contains a forbidden action", () => {
    let checked = 0;
    for (const seed of SEEDS) {
      const rng = stream(seed);
      for (let tick = 0; tick < TICKS; tick += 1) {
        const menu = buildMenu(generateWorld(rng));
        for (const level of LEVELS_JUNIOR_FIRST) {
          const auth = authorityForLevel(level);
          for (const action of hatFilter(menu, auth)) {
            const at = { seed: String(seed), tick, level, action: key(action) };
            expect({ ...at, forbidden: forbids(action, auth) }).toEqual({ ...at, forbidden: false });
            checked += 1;
          }
        }
      }
    }
    expect(checked).toBeGreaterThan(1000); // the sweep actually swept
  });

  test("2. non-coercion: every free mode survives at every level, in every world", () => {
    for (const seed of SEEDS) {
      const rng = stream(seed);
      for (let tick = 0; tick < TICKS; tick += 1) {
        const menu = buildMenu(generateWorld(rng));
        for (const level of LEVELS_JUNIOR_FIRST) {
          const kinds = new Set(hatFilter(menu, authorityForLevel(level)).map(a => a.kind));
          for (const mode of FREE_MODES) {
            const at = { seed: String(seed), tick, level, mode };
            expect({ ...at, present: kinds.has(mode) }).toEqual({ ...at, present: true });
          }
        }
      }
    }
  });

  test("3. monotonicity: a junior menu is a subset of every senior menu", () => {
    for (const seed of SEEDS) {
      const rng = stream(seed);
      for (let tick = 0; tick < TICKS; tick += 1) {
        const menu = buildMenu(generateWorld(rng));
        const byLevel = LEVELS_JUNIOR_FIRST.map(level => ({
          level,
          keys: new Set(hatFilter(menu, authorityForLevel(level)).map(key)),
        }));
        for (let j = 0; j < byLevel.length; j += 1) {
          for (let s = j + 1; s < byLevel.length; s += 1) {
            const junior = byLevel[j]!;
            const senior = byLevel[s]!;
            const escaped = [...junior.keys].filter(k => !senior.keys.has(k)).sort();
            const at = { seed: String(seed), tick, junior: junior.level, senior: senior.level };
            expect({ ...at, escaped }).toEqual({ ...at, escaped: [] });
          }
        }
      }
    }
  });

  test("4. claim coherence: a claim is offered only where the execution is", () => {
    let sawClaims = 0;
    for (const seed of SEEDS) {
      const rng = stream(seed);
      for (let tick = 0; tick < TICKS; tick += 1) {
        const menu = buildMenu(generateWorld(rng));
        for (const level of LEVELS_JUNIOR_FIRST) {
          const filtered = hatFilter(menu, authorityForLevel(level));
          const doable = new Set(filtered.filter(a => a.kind === "do_item").map(a => key(a).slice("do_item:".length)));
          for (const action of filtered) {
            if (action.kind !== "self_claim") continue;
            sawClaims += 1;
            const at = { seed: String(seed), tick, level, item: action.item.id };
            expect({ ...at, alsoDoable: doable.has(action.item.id) }).toEqual({ ...at, alsoDoable: true });
          }
        }
      }
    }
    // A vacuous pass would be a check that cannot fail: assert the case actually occurred.
    expect(sawClaims).toBeGreaterThan(0);
  });

  test("6. liveness: every level that may work is offered the work that exists", () => {
    // THE DUAL OF 1-4, AND THE REASON IT IS HERE. Invariants 1-4 are all SAFETY properties — they
    // say the gate never offers too much. A gate that returned the empty menu at every level would
    // satisfy every one of them. That is not hypothetical: the defect this suite was written for
    // was over-restriction (`do_item` gated on `canCreateWork`, so the individual contributor was
    // offered no work at all), and it is invisible to a safety-only suite.
    //
    // So: if the world holds a ready, unambiguous, non-merge item and the level has `canDoWork`,
    // that level's menu MUST contain a `do_item` for it. Mutating `canDoWork` back to
    // `canCreateWork` turns this red at individual_contributor and nowhere else — which is exactly
    // where the original defect lived.
    // The statement is about what the GATE removes, so it has to start from what `buildMenu`
    // actually offered. buildMenu offers exactly ONE do_item — `find(ready && !ambiguous)`, the
    // first such item, merge or not — so an invariant quantified over "any ready non-merge item"
    // is false for reasons that have nothing to do with authority. (Worth noting separately: when
    // that single first pick happens to be a merge, a level without `canMerge` is offered no work
    // at all even though later items are doable. That is a `buildMenu` selection property, not a
    // gate property, so it is reported rather than asserted here.)
    let sawOfferable = 0;
    for (const seed of SEEDS) {
      const rng = stream(seed);
      for (let tick = 0; tick < TICKS; tick += 1) {
        const world = generateWorld(rng);
        const picked = world.backlog.find(i => i.ready && !i.ambiguous);
        if (picked === undefined || picked.id.startsWith("merge-pr-")) continue;
        const offerable = picked;
        sawOfferable += 1;
        const menu = buildMenu(world);
        for (const level of LEVELS_JUNIOR_FIRST) {
          const auth = authorityForLevel(level);
          if (!auth.canDoWork) continue;
          const offered = hatFilter(menu, auth).some(a => a.kind === "do_item" && a.item.id === offerable.id);
          const at = { seed: String(seed), tick, level, item: offerable.id };
          expect({ ...at, offered }).toEqual({ ...at, offered: true });
        }
      }
    }
    expect(sawOfferable).toBeGreaterThan(0); // not vacuous
  });

  test("5. determinism: same seed replays identically, and the log folds to the stepped world", () => {
    const run = (seed: bigint, level: HatLevel) => {
      const rng = stream(seed);
      const auth = authorityForLevel(level);
      const initial = generateWorld(rng);
      let world = initial;
      const trace: NextAction[] = [];
      for (let tick = 0; tick < TICKS; tick += 1) {
        const filtered = hatFilter(buildMenu(world), auth);
        if (filtered.length === 0) break;
        const pick = filtered[rng.below(filtered.length)]!;
        trace.push(pick);
        world = simulate(world, pick);
      }
      return { initial, trace, world };
    };

    for (const seed of SEEDS) {
      for (const level of LEVELS_JUNIOR_FIRST) {
        const a = run(seed, level);
        const b = run(seed, level);
        expect(a.trace.map(key)).toEqual(b.trace.map(key)); // replay is exact
        expect(a.trace.length).toBeGreaterThan(0);
        // The event log IS the state: folding the trace must reach the stepped world.
        expect(fold(a.initial, a.trace)).toEqual(a.world);
      }
    }
  });
});
