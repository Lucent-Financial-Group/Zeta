/**
 * hat-grammar-gate.ts — the join: a persona's hats govern the 16-slot action grammar.
 *
 * This is where the migrated F# model meets the sovereign observe loop, and it needs no new
 * concepts because both sides were already the same shape and had simply never been introduced:
 *
 *   Hat.allowedActions : Action[]      — each Action is a 16-bool over the keypad  (`Hat.fs`)
 *   GRAMMAR_16_V0      : 16 slots      — fixed indices 0..15                        (`grammar-16.ts`)
 *
 * A slot index IS a key index. So "may this persona use slot i" is exactly "does some allowed
 * action hold key i" — `ActionGrammar.holds`, nothing invented. That correspondence is the reason
 * the F# expresses authority as a set of 16-bools instead of as permission flags, and it is why the
 * grammar doc calls itself "the thing corporate retrofits onto".
 *
 * ── THE GATE VETOES; IT NEVER GRANTS ─────────────────────────────────────────
 * A slot the render already marked unavailable stays unavailable. A hat can only take away, in
 * keeping with `hat-gate.ts`'s rule that the filter "is additive — it removes options, never adds
 * them". If a persona could turn an F into a T it would be able to manufacture an action the world
 * state does not support, which is a different and much worse thing than an authority check.
 *
 * ── THE 16 SLOTS ARE FIXED; VETO IS RENDERED, NOT REMOVED ────────────────────
 * `grammar-16.ts` is explicit that "the 16 DIRECTIONS are FIXED (muscle memory); per-state LABELS +
 * Tri availability move". So a vetoed slot renders `F` and keeps its index — it never disappears
 * from the layout. That is the visible difference from `hat-gate.ts`'s list filter, and it is the
 * behaviour the grammar's own contract requires: an operator's muscle memory must not depend on
 * which hat they happen to be wearing.
 *
 * ── FREE TIME IS NEVER VETOED ────────────────────────────────────────────────
 * Slot 14 carries the free modes and the renderer already pins it "always T (NCI)". The gate
 * declines to touch it. An authority model that could switch a wearer's rest off would make the
 * corporate mode a cage rather than a hierarchy, and the non-coercion invariant is precisely the
 * line that stops it. Note this holds even at the floor — a persona wearing NO hats still has
 * slot 14.
 */

import { F, type Tri } from "../tri-boolean/index";
import { holds } from "./action-grammar";
import { allowedActions, type Persona } from "./persona";
import type { RenderedMenuSlot } from "../observe/grammar-16-render";

/** Slot 14 carries the free modes (`grammar-16-render.ts`, Option A) and is never vetoed. */
export const SLOT_FREE_TIME = 14;

/**
 * May this persona use slot `index`?
 *
 * An EMPTY allow-list means unrestricted — the inversion carried from `Hat.fs` and `Persona.fs`,
 * where "no restriction configured" and "permits nothing" are opposite states. Read it wrong and an
 * unconfigured fleet locks itself out entirely.
 */
export function slotPermitted<L, G, T>(persona: Persona<L, G, T>, index: number): boolean {
  if (index === SLOT_FREE_TIME) return true; // NCI: rest is not an authority question
  const allowed = allowedActions(persona);
  if (allowed.length === 0) return true; // unrestricted
  return allowed.some(action => holds(index, action));
}

/** The 16 slot indices this persona may use, in order. */
export function permittedSlots<L, G, T>(persona: Persona<L, G, T>): readonly number[] {
  const out: number[] = [];
  for (let i = 0; i < 16; i += 1) if (slotPermitted(persona, i)) out.push(i);
  return out;
}

/**
 * Apply a persona's authority to a rendered grammar.
 *
 * Returns all 16 slots, in the same order, with vetoed ones marked `F`. Availability that was
 * already `F` or `N` is left alone: the gate only ever moves a slot toward less available, never
 * toward more.
 */
export function gateSlots<L, G, T>(
  slots: readonly RenderedMenuSlot[],
  persona: Persona<L, G, T>,
): readonly RenderedMenuSlot[] {
  return slots.map(slot => {
    if (slotPermitted(persona, slot.index)) return slot;
    const vetoed: Tri = F;
    return { ...slot, availability: vetoed };
  });
}
