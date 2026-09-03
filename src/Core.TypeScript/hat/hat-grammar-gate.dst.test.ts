/**
 * hat-grammar-gate.dst.test.ts — deterministic simulation over persona x grammar.
 *
 * The migrated model is pinned to F# by the treaty transcript; this pins the JOIN — what happens
 * when a persona's hats meet the 16-slot grammar the observe loop actually renders. Seeded by
 * `splitmix64.mix`, no clock, no network, no filesystem.
 *
 * INVARIANTS
 *   1. VETO ONLY          — the gate never makes a slot MORE available than the render did.
 *   2. FIXED LAYOUT       — always 16 slots, indices 0..15, order unchanged. Vetoing renders `F`;
 *                           it never removes a slot, because muscle memory must not depend on which
 *                           hat someone is wearing.
 *   3. NON-COERCION       — slot 14 (free modes) is never vetoed, at any persona, including one
 *                           wearing no hats at all.
 *   4. UNRESTRICTED IS IDENTITY — a persona wearing ANY unrestricted hat gates nothing. This is the
 *                           empty-means-unrestricted inversion carried from `Hat.fs`, checked end to
 *                           end rather than trusted.
 *   5. MONOTONE IN HATS   — wearing MORE hats never removes a permitted slot. This is the direct
 *                           consequence of the F# union rule ("more hats grant more; unrestricted if
 *                           any worn hat is unrestricted"), and it is the invariant that fails first
 *                           if someone ever "hardens" the composition into an intersection.
 *   6. DETERMINISM        — same seed, same gated availability vector.
 */

import { describe, expect, test } from "bun:test";
import { mix } from "../splitmix64/splitmix64";
import { renderGrammar16 } from "../observe/grammar-16-render";
import type { BacklogItem, World } from "../observe/observe";
import * as AG from "./action-grammar";
import type { Hat } from "./hat";
import * as P from "./persona";
import { gateSlots, permittedSlots, SLOT_FREE_TIME, slotPermitted } from "./hat-grammar-gate";

type TestHat = Hat<string, string, never>;

function stream(seed: bigint) {
  let state = seed;
  const next = (): bigint => {
    state = mix(state);
    return state;
  };
  return {
    below: (n: number): number => Number(next() % BigInt(n)),
    bool: (): boolean => Number(next() % 2n) === 1,
  };
}

function generateHat(rng: ReturnType<typeof stream>, i: number): TestHat {
  const unrestricted = rng.below(4) === 0; // 1-in-4 hats carry no restriction
  const allowed: AG.Action[] = [];
  if (!unrestricted) {
    for (let n = 0; n < 1 + rng.below(3); n += 1) {
      const ks: number[] = [];
      for (let k = 0; k < 16; k += 1) if (rng.below(3) === 0) ks.push(k);
      allowed.push(AG.ofKeys(ks));
    }
  }
  return {
    name: `hat-${i}`,
    scope: rng.bool() ? "Meta" : "GameSpecific",
    lenses: [],
    landmarks: [],
    allowedActions: allowed,
    traversals: [],
    controls: [],
  };
}

function generateWorld(rng: ReturnType<typeof stream>): World {
  const backlog: BacklogItem[] = [];
  for (let i = 0; i < rng.below(3); i += 1) {
    backlog.push({
      id: `081KHATDST${String(rng.below(100000)).padStart(5, "0")}`,
      title: "generated",
      ready: rng.bool(),
      ambiguous: rng.bool(),
    });
  }
  return {
    backlog,
    ...(rng.bool() ? { operator: { pendingMessage: rng.bool(), pendingFerry: rng.bool() } } : {}),
  };
}

/** Availability ordering for "never more available": T is the most available, F the least. */
const rank = (s: "T" | "F" | "N"): number => (s === "T" ? 2 : s === "N" ? 1 : 0);

const SEEDS = [1n, 3n, 9n, 42n, 512n, 0xfeedn];
const ROUNDS = 10;

describe("persona x grammar-16 — deterministic simulation over the join", () => {
  test("1+2. veto only, and the 16 slots keep their indices and order", () => {
    let checked = 0;
    for (const seed of SEEDS) {
      const rng = stream(seed);
      for (let round = 0; round < ROUNDS; round += 1) {
        const world = generateWorld(rng);
        const hats = Array.from({ length: 1 + rng.below(3) }, (_, i) => generateHat(rng, i));
        const persona = P.wearAll<string, string, never>(hats, P.create("otto"));
        const rendered = renderGrammar16(world);
        const gated = gateSlots(rendered, persona);

        const at = { seed: String(seed), round };
        expect({ ...at, count: gated.length }).toEqual({ ...at, count: 16 });
        expect({ ...at, indices: gated.map(s => s.index) }).toEqual({
          ...at,
          indices: Array.from({ length: 16 }, (_, i) => i),
        });

        for (let i = 0; i < 16; i += 1) {
          const before = rendered[i]!;
          const after = gated[i]!;
          const where = { ...at, slot: i };
          expect({ ...where, moreAvailable: rank(after.availability.s) > rank(before.availability.s) }).toEqual({
            ...where,
            moreAvailable: false,
          });
          // The fixed identity of a slot never moves — only its availability may.
          expect({ ...where, role: after.role, group: after.group }).toEqual({
            ...where,
            role: before.role,
            group: before.group,
          });
          checked += 1;
        }
      }
    }
    expect(checked).toBeGreaterThan(500);
  });

  test("3. non-coercion: slot 14 is never vetoed, including for a persona wearing nothing", () => {
    const bare = P.create<string, string, never>("otto");
    expect(slotPermitted(bare, SLOT_FREE_TIME)).toBe(true);

    for (const seed of SEEDS) {
      const rng = stream(seed);
      for (let round = 0; round < ROUNDS; round += 1) {
        const world = generateWorld(rng);
        const hats = Array.from({ length: 1 + rng.below(3) }, (_, i) => generateHat(rng, i));
        const persona = P.wearAll<string, string, never>(hats, P.create("otto"));
        const rendered = renderGrammar16(world);
        const gated = gateSlots(rendered, persona);
        const at = { seed: String(seed), round };
        expect({ ...at, free: gated[SLOT_FREE_TIME]!.availability }).toEqual({
          ...at,
          free: rendered[SLOT_FREE_TIME]!.availability,
        });
      }
    }
  });

  test("4. an unrestricted hat makes the gate the identity", () => {
    for (const seed of SEEDS) {
      const rng = stream(seed);
      for (let round = 0; round < ROUNDS; round += 1) {
        const world = generateWorld(rng);
        const restricted = generateHat(rng, 0);
        const unrestricted: TestHat = { ...generateHat(rng, 1), allowedActions: [] };
        // Order must not matter: the unrestricted hat wins from either position.
        for (const worn of [[restricted, unrestricted], [unrestricted, restricted]]) {
          const persona = P.wearAll<string, string, never>(worn, P.create("otto"));
          const rendered = renderGrammar16(world);
          const at = { seed: String(seed), round, first: worn[0]!.name };
          expect({ ...at, gated: gateSlots(rendered, persona) }).toEqual({ ...at, gated: rendered });
        }
      }
    }
  });

  test("5a. THE BARE PERSONA IS UNRESTRICTED — the model's sharp edge, pinned not hidden", () => {
    // Written after invariant 5b failed on its first run and the model turned out to be right.
    //
    // `Hat.fs`/`Persona.fs` define an EMPTY allow-list as UNRESTRICTED. A persona wearing no hats
    // has an empty allow-list. Therefore a persona wearing NOTHING has FULL authority, and putting
    // on its first restricted hat is the one step that can REDUCE what it may do.
    //
    // That is faithful to the F# and it is exactly the fail-open shape a corporate policy layer has
    // to answer for: "unbound" must not mean "unlimited" once hats can be taken off. The place to
    // decide that is the policy layer above this one — the F# says restrictive composition is "the
    // policy layer's call" — so it is pinned here as a known property rather than quietly patched
    // at a level that does not own the decision.
    const bare = P.create<string, string, never>("otto");
    expect(P.allowedActions(bare)).toEqual([]);
    expect(permittedSlots(bare)).toEqual(Array.from({ length: 16 }, (_, i) => i));
  });

  test("5b. monotone once restricted: adding hats never removes a permitted slot", () => {
    let grew = 0;
    for (const seed of SEEDS) {
      const rng = stream(seed);
      for (let round = 0; round < ROUNDS; round += 1) {
        const hats = Array.from({ length: 3 }, (_, i) => generateHat(rng, i));
        // Start from the FIRST hat, not from bare: the bare->first step is the documented
        // exception (5a), and folding it in here would assert the model is something it is not.
        let persona = P.wear(hats[0]!, P.create<string, string, never>("otto"));
        let previous: readonly number[] = permittedSlots(persona);
        for (const hat of hats.slice(1)) {
          persona = P.wear(hat, persona);
          const now = permittedSlots(persona);
          const lost = previous.filter(s => !now.includes(s));
          const at = { seed: String(seed), round, wearing: hat.name };
          expect({ ...at, lost }).toEqual({ ...at, lost: [] });
          if (now.length > previous.length) grew += 1;
          previous = now;
        }
      }
    }
    // Not vacuous: at least sometimes an added hat actually widened the permitted set.
    expect(grew).toBeGreaterThan(0);
  });

  test("7. empty-allow-list arises ONLY from an unrestricted hat, never from composition", () => {
    // ADDED AFTER A MUTATION SURVIVED, and the survival was the interesting part.
    //
    // Mutating `Persona.allowedActions` from UNION to INTERSECTION changed real behaviour (two hats
    // allowing {0,1} and {2,3} went from 4 allowed actions to 0) and every other invariant here
    // stayed green. The reason is the trap:
    //
    //     under `empty = unrestricted`, a composition that intersects to EMPTY does not become
    //     restrictive — it becomes UNRESTRICTED. It fails OPEN, and it does so exactly when two
    //     hats have nothing in common, which is when you would most want it to close.
    //
    // So the union rule cannot be checked by looking at how much authority a persona has; it has to
    // be checked at the place the convention is decided. Stated as a biconditional, which is what
    // the F# means and what intersection breaks: for a persona wearing at least one hat, the
    // allow-list is empty IF AND ONLY IF some worn hat is itself unrestricted.
    //
    // The same trap is why `hat-binding`-style policy layers must never derive authority by
    // intersecting allow-lists — see 5a for the other face of it.
    let sawEmpty = 0;
    let sawNonEmpty = 0;
    for (const seed of SEEDS) {
      const rng = stream(seed);
      for (let round = 0; round < ROUNDS; round += 1) {
        const hats = Array.from({ length: 1 + rng.below(4) }, (_, i) => generateHat(rng, i));
        const persona = P.wearAll<string, string, never>(hats, P.create("otto"));
        const isEmpty = P.allowedActions(persona).length === 0;
        const anyUnrestricted = hats.some(h => h.allowedActions.length === 0);
        const at = { seed: String(seed), round, hats: hats.length };
        expect({ ...at, isEmpty }).toEqual({ ...at, isEmpty: anyUnrestricted });
        if (isEmpty) sawEmpty += 1;
        else sawNonEmpty += 1;
      }
    }
    // Both sides of the biconditional must actually occur, or this proves nothing.
    expect(sawEmpty).toBeGreaterThan(0);
    expect(sawNonEmpty).toBeGreaterThan(0);
  });

  test("6. determinism: the same seed produces the same gated availability", () => {
    const run = (seed: bigint) => {
      const rng = stream(seed);
      const out: string[] = [];
      for (let round = 0; round < ROUNDS; round += 1) {
        const world = generateWorld(rng);
        const hats = Array.from({ length: 1 + rng.below(3) }, (_, i) => generateHat(rng, i));
        const persona = P.wearAll<string, string, never>(hats, P.create("otto"));
        out.push(gateSlots(renderGrammar16(world), persona).map(s => s.availability.s).join(""));
      }
      return out;
    };
    for (const seed of SEEDS) {
      expect(run(seed)).toEqual(run(seed));
      expect(run(seed).length).toBe(ROUNDS);
    }
  });
});
