/**
 * action-grammar.ts — TypeScript oracle for `src/Core/ActionGrammar.fs`.
 *
 * A LANGUAGE MIGRATION, NOT A REIMPLEMENTATION. F# is canonical; this file conforms to it. Every
 * function below mirrors a named F# binding one-for-one, and the pairing is pinned mechanically by
 * `hat-treaty-transcript.json` — generated here, replayed by `tests/Tests.FSharp/HatTreaty.Tests.fs`
 * against the F# module. Same discipline as `Core/WorkflowEngine.fs` and its TS twin: the treaty
 * transcript is what stops the two drifting once someone edits only one side.
 *
 * ── The model ────────────────────────────────────────────────────────────────
 * An `Action` is a 16-bool held-key set over the CHIP-8 4x4 keypad. Held-key sets form a BOOLEAN
 * LATTICE (the powerset of 16): `bottom` is no keys, `top` is every key, `join`/`meet`/`complement`
 * are the lattice operations, and `leq` is subset. That algebra is the whole reason a hat's
 * authority is expressed as a set of these rather than as ad-hoc permission flags — a permission
 * model that IS a lattice composes by construction.
 *
 * ── Two boundary rules that differ on purpose ────────────────────────────────
 * `single k` MASKS (`k & 0xF`, from `SoftController.singleKey`), so 16 wraps to 0 and -1 wraps to
 * 15. `ofGrid row col` CLAMPS (`max 0 (min 3 x)`), so out-of-range coordinates saturate at the grid
 * edge. They disagree, and both are copied verbatim: a port that "tidied" one into the other would
 * pass its own tests and diverge from the oracle at exactly the inputs nobody thinks to try. The
 * treaty transcript exercises both boundaries.
 *
 * ── Structural equality is load-bearing ──────────────────────────────────────
 * F#'s `List.contains` and `List.distinct` compare arrays STRUCTURALLY; JavaScript compares them by
 * reference. Ported naively, `permits` would answer "no" for an action that is element-wise equal to
 * an allowed one, and every allow-list would be silently empty of matches. `actionEquals` /
 * `distinctActions` exist to close exactly that gap, and are used everywhere the F# relies on it.
 */

/** An action = a held-key set: 16 bools, one element of the Boolean lattice. */
export type Action = readonly boolean[];

/** A word = an action sequence over time (a string over the alphabet). */
export type Word = readonly Action[];

/** The alphabet size (the grid is 4x4). */
export const ALPHABET_SIZE = 16;

// ---- alphabet + geometry ----

/** The bottom element ⊥ — no keys held (`SoftController.none`). */
export function bottom(): Action {
  return new Array<boolean>(ALPHABET_SIZE).fill(false);
}

/**
 * The top element ⊤ — every key held at once: a single classical PRODUCT action (a conjunction),
 * NOT a superposition. The F# doc is emphatic about that distinction; the superposition is a
 * weighted sum over basis actions and lives in the soft layer, not here.
 */
export function top(): Action {
  return new Array<boolean>(ALPHABET_SIZE).fill(true);
}

/** A single key held. Mirrors `SoftController.singleKey`: the index MASKS (`k & 0xF`), never clamps. */
export function single(k: number): Action {
  const a = new Array<boolean>(ALPHABET_SIZE).fill(false);
  a[k & 0xf] = true;
  return a;
}

/** Grid coord (row, col) in 0..3 x 0..3 → key index (row-major). Out-of-range CLAMPS into the grid. */
export function ofGrid(row: number, col: number): number {
  return Math.max(0, Math.min(3, row)) * 4 + Math.max(0, Math.min(3, col));
}

/** Key index → grid coord [row, col]. */
export function toGrid(k: number): readonly [number, number] {
  return [Math.trunc(k / 4), k % 4];
}

// ---- Boolean lattice on held-key sets ----

/** Is key `k` held in `a`? Bounds-checked, exactly as the F#. */
export function holds(k: number, a: Action): boolean {
  return k >= 0 && k < ALPHABET_SIZE && a[k] === true;
}

/** The held keys, as indices. */
export function keys(a: Action): readonly number[] {
  const out: number[] = [];
  for (let k = 0; k < ALPHABET_SIZE; k += 1) if (a[k]) out.push(k);
  return out;
}

/** Join (∨) — the union of both actions' keys. */
export function join(a: Action, b: Action): Action {
  return Array.from({ length: ALPHABET_SIZE }, (_, k) => a[k] === true || b[k] === true);
}

/** Meet (∧) — the keys held by both. */
export function meet(a: Action, b: Action): Action {
  return Array.from({ length: ALPHABET_SIZE }, (_, k) => a[k] === true && b[k] === true);
}

/** Complement (¬) — the keys NOT held. */
export function complement(a: Action): Action {
  return Array.from({ length: ALPHABET_SIZE }, (_, k) => !(a[k] === true));
}

/** Lattice order: `a ⊑ b` iff every key of `a` is also in `b` (subset). */
export function leq(a: Action, b: Action): boolean {
  for (let k = 0; k < ALPHABET_SIZE; k += 1) {
    if (a[k] === true && b[k] !== true) return false;
  }
  return true;
}

/** Build an action from a set of held keys. Out-of-range indices are IGNORED (not clamped). */
export function ofKeys(ks: Iterable<number>): Action {
  const a = new Array<boolean>(ALPHABET_SIZE).fill(false);
  for (const k of ks) {
    if (k >= 0 && k < ALPHABET_SIZE) a[k] = true;
  }
  return a;
}

/** The number of keys held (the action's weight/grade — 0 at ⊥, 16 at ⊤). */
export function weight(a: Action): number {
  let n = 0;
  for (let k = 0; k < ALPHABET_SIZE; k += 1) if (a[k]) n += 1;
  return n;
}

// ---- structural equality (what F# gets for free, and JS does not) ----

/** Element-wise equality. F#'s array equality is structural; JavaScript's is reference. */
export function actionEquals(a: Action, b: Action): boolean {
  if (a.length !== b.length) return false;
  for (let k = 0; k < a.length; k += 1) {
    if ((a[k] === true) !== (b[k] === true)) return false;
  }
  return true;
}

/** `List.contains` over actions, with structural comparison. */
export function containsAction(actions: readonly Action[], a: Action): boolean {
  return actions.some(x => actionEquals(x, a));
}

/** `List.distinct` over actions, with structural comparison. First occurrence wins, order kept. */
export function distinctActions(actions: readonly Action[]): readonly Action[] {
  const out: Action[] = [];
  for (const a of actions) if (!containsAction(out, a)) out.push(a);
  return out;
}

// ---- grammar: words (action sequences) ----

/** The empty word (no actions). */
export const emptyWord: Word = [];

/** A one-action word. */
export function wordOf(a: Action): Word {
  return [a];
}

/** Word length (number of time-steps). */
export function wordLength(w: Word): number {
  return w.length;
}

/** Concatenate action sequences. */
export function concat(u: Word, v: Word): Word {
  return [...u, ...v];
}
