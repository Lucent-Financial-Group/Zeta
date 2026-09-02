/**
 * hat.ts — TypeScript oracle for `src/Core/Hat.fs`.
 *
 * F# is canonical; this conforms. Pinned by `hat-treaty-transcript.json` (generated here, replayed
 * against the F# by `tests/Tests.FSharp/HatTreaty.Tests.fs`).
 *
 * ── What a hat is ────────────────────────────────────────────────────────────
 * A hat is a ROLE: a declarative bundle of lenses (what it attends to), landmarks (the solid ground
 * its lenses are parameterised by), an ACTION RESTRICTION, uncertainty-reduction traversals, and
 * control edges to other hats. It is the ATOMIC base — hats do not nest. Personas compose them
 * (`persona.ts`).
 *
 * ── The authority model, and why it is a set of actions ──────────────────────
 * `allowedActions` is a list of 16-bool `Action`s over the action grammar, and EMPTY MEANS
 * UNRESTRICTED — not "permits nothing". That inversion is deliberate in the F# and is copied
 * exactly: an unconfigured hat is a hat with no restriction, so adding the restriction machinery
 * cannot accidentally lock down every existing role. Read it as "the restriction is absent", never
 * as "the permission set is empty".
 *
 * Note this is a structural ALLOW-LIST, not a proof of authority — the F# says so plainly
 * ("a structural allow-list, not a proof of authority — real authorization stays the human-gated
 * governance model"), and `controls` is a NAME EDGE, not an enforcement mechanism. Neither claim is
 * strengthened in the port; a port that quietly promoted an advisory field into an enforced one
 * would be a security claim invented in translation.
 *
 * ── Generic payloads ─────────────────────────────────────────────────────────
 * `Lens`, `Ground` and `Traversal` are separate F# modules that this slice does not port. They are
 * carried as opaque type parameters rather than modelled, so nothing about them is faked: every
 * function here that touches them (`landmarkCells`, and the persona-level unions) only ever moves
 * them around or compares them, exactly as the F# does.
 */

import { containsAction, type Action } from "./action-grammar";

/**
 * A hat's scope. Most hats are game-specific; some survive into the meta — those are available as
 * personas' meta roles. NOTE the F# correction carried over verbatim: `Meta` means the hat is
 * META-AVAILABLE, not that it IS a persona. The persona is the entity that wears it (`persona.ts`).
 */
export type HatScope = "GameSpecific" | "Meta";

/** A landmark: a cell name paired with its solid-ground kind. */
export type Landmark<G> = readonly [string, G];

/** A role/persona bundle: lenses + landmarks + action restrictions + traversals + control edges + scope. */
export interface Hat<L = unknown, G = unknown, T = unknown> {
  readonly name: string;
  /** Game-specific, or Meta (survives into the meta and plays all games). */
  readonly scope: HatScope;
  readonly lenses: readonly L[];
  /** Suggested solid-ground landmarks for lens parameters (cell → its ground kind). */
  readonly landmarks: readonly Landmark<G>[];
  /** The permitted action subset (action restriction). EMPTY = UNRESTRICTED. */
  readonly allowedActions: readonly Action[];
  /** The role's uncertainty-reduction traversals. */
  readonly traversals: readonly T[];
  /** Names of other hats/agents this hat controls/coordinates. A name edge, not enforcement. */
  readonly controls: readonly string[];
}

/** Is this hat a persona-available (meta-surviving) role? */
export function isPersona<L, G, T>(hat: Hat<L, G, T>): boolean {
  return hat.scope === "Meta";
}

/** The meta-surviving hats among a set. */
export function personas<L, G, T>(hats: readonly Hat<L, G, T>[]): readonly Hat<L, G, T>[] {
  return hats.filter(isPersona);
}

/** The game-specific hats among a set. */
export function gameSpecific<L, G, T>(hats: readonly Hat<L, G, T>[]): readonly Hat<L, G, T>[] {
  return hats.filter(h => h.scope === "GameSpecific");
}

/**
 * Where a hat lives (MUMPS scoping): a meta hat is a GLOBAL (`^hat/<name>`) — persistent and
 * game-independent; a game-specific hat is a LOCAL, scoped under its game fingerprint. The string
 * shapes are part of the treaty and are compared byte-for-byte against the F#.
 */
export function address<L, G, T>(gameKey: string, hat: Hat<L, G, T>): string {
  return hat.scope === "Meta" ? `^hat/${hat.name}` : `game/${gameKey}/hat/${hat.name}`;
}

/** Does this hat permit `action`? Empty `allowedActions` ⇒ unrestricted ⇒ always true. */
export function permits<L, G, T>(action: Action, hat: Hat<L, G, T>): boolean {
  return hat.allowedActions.length === 0 || containsAction(hat.allowedActions, action);
}

/** Filter candidate actions to those this hat permits (the role's action restriction applied). */
export function restrict<L, G, T>(actions: readonly Action[], hat: Hat<L, G, T>): readonly Action[] {
  if (hat.allowedActions.length === 0) return actions;
  return actions.filter(a => containsAction(hat.allowedActions, a));
}

/** Does this hat control the named other hat/agent? */
export function controls<L, G, T>(other: string, hat: Hat<L, G, T>): boolean {
  return hat.controls.includes(other);
}

/** The solid-ground landmark cells this hat suggests as lens parameters (just the names). */
export function landmarkCells<L, G, T>(hat: Hat<L, G, T>): readonly string[] {
  return hat.landmarks.map(([cell]) => cell);
}
