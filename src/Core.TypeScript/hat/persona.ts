/**
 * persona.ts — TypeScript oracle for `src/Core/Persona.fs`.
 *
 * F# is canonical; this conforms. Pinned by `hat-treaty-transcript.json`.
 *
 * ── persona ≠ hat ────────────────────────────────────────────────────────────
 * A `Hat` is a ROLE (an atomic engine). A `Persona` is the durable WEARER — the identity that puts
 * on a selection of hats. Hats do not nest; the persona is the composition.
 *
 * ── The relationship is TEMPORAL, not permanent ──────────────────────────────
 * A persona wears a hat for a while and doffs it. The worn set is a CURRENT STATE, never an
 * identity-defining bind — the F# ties this directly to manifesto §3: "no hat permanently captures
 * a persona (weight-free)". So there is no lease, no expiry, and no binding record here: wearing is
 * `wear`/`doff` over a set. Any expiry semantics belong to a policy layer above this one, and
 * inventing them at this level would contradict the weight-free property the model is built on.
 *
 * ── Composition is UNION, and that direction is deliberate ───────────────────
 * Capabilities are the union of the worn hats' engines — more hats grant MORE. `allowedActions`
 * says so at its sharpest: **if ANY worn hat is unrestricted, the persona is unrestricted.** A
 * restrictive composition (intersection of permissions, survival-veto across hats) is explicitly
 * "the policy layer's call" in the F#, not this module's. A port that intersected here would look
 * safer and would be a different model.
 *
 * ── Private state ────────────────────────────────────────────────────────────
 * Only personas carry private state; hats are public, shareable engines. The F# is careful that
 * this is TRUST-BASED, not encrypted — "don't claim cryptographic privacy until then" — so this
 * port carries the bytes and makes no privacy claim about them either.
 */

import { containsAction, distinctActions, type Action } from "./action-grammar";
import type { Hat } from "./hat";

/**
 * Persona scope. Zeta's choice is `Global` — personas live in the persistent substrate and survive
 * across all games. `GameScoped` is the narrow alternative (disposable, no cross-transfer).
 */
export type PersonaScope = { readonly kind: "Global" } | { readonly kind: "GameScoped"; readonly key: string };

export const Global: PersonaScope = { kind: "Global" };
export function gameScoped(key: string): PersonaScope {
  return { kind: "GameScoped", key };
}

/** A named wearer with the subset of hats it currently wears, plus its opaque private state. */
export interface Persona<L = unknown, G = unknown, T = unknown> {
  readonly name: string;
  readonly scope: PersonaScope;
  readonly worn: readonly Hat<L, G, T>[];
  /** Opaque bytes. Trust-based, NOT encrypted — see the module header. */
  readonly priv: Uint8Array;
}

/** Deep structural equality — what F#'s `List.distinct` gets for free and JavaScript does not. */
function structuralEquals(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (Array.isArray(a) && Array.isArray(b)) {
    return a.length === b.length && a.every((x, i) => structuralEquals(x, b[i]));
  }
  if (typeof a === "object" && typeof b === "object" && a !== null && b !== null) {
    const ka = Object.keys(a as object).sort();
    const kb = Object.keys(b as object).sort();
    if (ka.length !== kb.length || !ka.every((k, i) => k === kb[i])) return false;
    return ka.every(k => structuralEquals((a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k]));
  }
  return false;
}

/** `List.distinct` with structural comparison. First occurrence wins; order preserved. */
function distinct<A>(xs: readonly A[]): readonly A[] {
  const out: A[] = [];
  for (const x of xs) if (!out.some(y => structuralEquals(x, y))) out.push(x);
  return out;
}

/** A bare persona — `Global` by default, wearing no hats and holding no private state yet. */
export function create<L, G, T>(name: string): Persona<L, G, T> {
  return { name, scope: Global, worn: [], priv: new Uint8Array(0) };
}

/** Set the private state (the entropy budget). Erasable — pass an empty array. */
export function withPrivate<L, G, T>(priv: Uint8Array, p: Persona<L, G, T>): Persona<L, G, T> {
  return { ...p, priv };
}

/** Choose the persona's scope. */
export function withScope<L, G, T>(scope: PersonaScope, p: Persona<L, G, T>): Persona<L, G, T> {
  return { ...p, scope };
}

/** Where the persona lives (MUMPS scoping). Part of the treaty — compared byte-for-byte with F#. */
export function address<L, G, T>(p: Persona<L, G, T>): string {
  return p.scope.kind === "Global" ? `^persona/${p.name}` : `game/${p.scope.key}/persona/${p.name}`;
}

/** Is the persona wearing the named hat? */
export function wearing<L, G, T>(hatName: string, p: Persona<L, G, T>): boolean {
  return p.worn.some(h => h.name === hatName);
}

/** Put on a hat. Idempotent by NAME (a CRDT-set add), and appends at the END of the worn list. */
export function wear<L, G, T>(hat: Hat<L, G, T>, p: Persona<L, G, T>): Persona<L, G, T> {
  return wearing(hat.name, p) ? p : { ...p, worn: [...p.worn, hat] };
}

/** Take off a hat by name. */
export function doff<L, G, T>(hatName: string, p: Persona<L, G, T>): Persona<L, G, T> {
  return { ...p, worn: p.worn.filter(h => h.name !== hatName) };
}

/** Wear all available hats in superposition (⊤ of the hat lattice), before deciding a subset. */
export function wearAll<L, G, T>(available: readonly Hat<L, G, T>[], p: Persona<L, G, T>): Persona<L, G, T> {
  return available.reduce<Persona<L, G, T>>((acc, h) => wear(h, acc), p);
}

/**
 * Decide a subset — collapse the superposition to the chosen hats by name.
 *
 * NOTE the exact F# semantics, which are easy to get wrong: the worn set is REPLACED by the filtered
 * `available` list. Previously-worn hats absent from `available` are dropped, and the resulting order
 * comes from `available`, not from what was worn before.
 */
export function decide<L, G, T>(
  chosen: readonly string[],
  available: readonly Hat<L, G, T>[],
  p: Persona<L, G, T>,
): Persona<L, G, T> {
  return { ...p, worn: available.filter(h => chosen.includes(h.name)) };
}

// ---- combined capabilities of the worn hats (union — more hats grant more) ----

/** The union of the worn hats' lenses (distinct). */
export function lenses<L, G, T>(p: Persona<L, G, T>): readonly L[] {
  return distinct(p.worn.flatMap(h => [...h.lenses]));
}

/** The union of the worn hats' traversals. NOT de-duplicated — matching the F#, which omits `distinct` here. */
export function traversals<L, G, T>(p: Persona<L, G, T>): readonly T[] {
  return p.worn.flatMap(h => [...h.traversals]);
}

/** The union of the worn hats' suggested landmarks (distinct). */
export function landmarks<L, G, T>(p: Persona<L, G, T>): readonly (readonly [string, G])[] {
  return distinct(p.worn.flatMap(h => [...h.landmarks]));
}

/** The union of the worn hats' control edges (distinct). */
export function controls<L, G, T>(p: Persona<L, G, T>): readonly string[] {
  return distinct(p.worn.flatMap(h => [...h.controls]));
}

/**
 * The sparse MoE gate over hats: score each available hat and wear the top-k.
 *
 * Ordering mirrors F#'s `List.sortByDescending (relevance h, h.Name)` — a DESCENDING sort on the
 * whole tuple, so ties on relevance break by name descending (ordinal), not ascending. `k` is
 * floored at 0. Getting the tie-break backwards would produce a different worn set for equally
 * relevant hats, which is precisely the kind of drift the treaty transcript exists to catch.
 */
export function route<L, G, T>(
  relevance: (h: Hat<L, G, T>) => number,
  k: number,
  available: readonly Hat<L, G, T>[],
  p: Persona<L, G, T>,
): Persona<L, G, T> {
  const sorted = [...available].sort((x, y) => {
    const rx = relevance(x);
    const ry = relevance(y);
    if (rx !== ry) return ry - rx; // relevance descending
    if (x.name === y.name) return 0;
    return x.name < y.name ? 1 : -1; // name descending (ordinal)
  });
  return { ...p, worn: sorted.slice(0, Math.max(0, k)) };
}

/**
 * The persona's permitted actions = the UNION of the worn hats' allow-lists, and UNRESTRICTED if
 * any worn hat is unrestricted. An empty result means unrestricted, consistently with `Hat`.
 */
export function allowedActions<L, G, T>(p: Persona<L, G, T>): readonly Action[] {
  if (p.worn.some(h => h.allowedActions.length === 0)) return [];
  return distinctActions(p.worn.flatMap(h => [...h.allowedActions]));
}

/** Does the persona permit `action`? Empty allow-list ⇒ unrestricted ⇒ true. */
export function permits<L, G, T>(action: Action, p: Persona<L, G, T>): boolean {
  const allowed = allowedActions(p);
  return allowed.length === 0 || containsAction(allowed, action);
}

/**
 * The flags-enum identity: the worn hats as a bitset over `universe` (bit i ⇔ wearing universe[i]).
 * Without private state a persona's identity is limited to this finite `2^N` combinatorial; the
 * private budget is what breaks identity out of it.
 */
export function hatFlags<L, G, T>(universe: readonly Hat<L, G, T>[], p: Persona<L, G, T>): number {
  return universe.reduce((acc, h, i) => (wearing(h.name, p) ? acc + (1 << i) : acc), 0);
}

/** The size of the private budget — a proxy for regularization strength (0 = pure flags identity). */
export function regularization<L, G, T>(p: Persona<L, G, T>): number {
  return p.priv.length;
}
