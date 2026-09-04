/**
 * corporate/org-decision.ts — determinism computes the LEGAL SET; the agent picks inside it.
 *
 * ── THIS IS THE OBSERVE KERNEL, AT ORGANIZATIONAL SCOPE ──────────────────────
 * The canonical loop already works this way and the shape is worth naming, because the two halves
 * of this repo arrived at it independently:
 *
 *     buildMenu(world) → hatFilter(menu, authority) → participant.choose(menu)
 *     legalOptions()   → (already filtered)         → chooser(legal)
 *
 * In both, code decides WHAT MAY BE CHOSEN and an agent decides WHICH. That division is the whole
 * governance story: a rule the agent could argue its way past is a suggestion, and an outcome the
 * code picks is not a decision anybody made.
 *
 * ── THE CLAMP IS THE LOAD-BEARING LINE ───────────────────────────────────────
 * The chooser returns an INDEX, and the index is clamped to the legal range. So a chooser — a
 * deterministic stub, a local model, a cloud persona, a confused one — cannot select outside the
 * rules even by returning `999` or `-1`. Reading the option out by an unclamped index is how a
 * model's arithmetic mistake becomes an authorization bypass.
 *
 * The alternative designs are both worse:
 *   - returning the OPTION rather than an index lets a chooser return something not in the set;
 *   - REJECTING an out-of-range index turns a chooser's slip into a stalled organization.
 *
 * ── AN EMPTY LEGAL SET IS A RESULT, NOT AN ERROR ─────────────────────────────
 * `no_legal_option` is a real answer with a reason attached: this authority, in this state, may do
 * nothing. Throwing would make "the rules permit nothing here" indistinguishable from a bug, and
 * defaulting to *some* option would invent an authority nobody granted.
 */

export type OrgChoice<T> =
  | { readonly outcome: "chosen"; readonly option: T; readonly reason: string; readonly clamped: boolean }
  | { readonly outcome: "no_legal_option"; readonly reason: string };

/**
 * An agent chooser: given the legal options and a context string, it returns the index it wants and
 * why. Deliberately the same shape as the loop's `Participant.choose`, so the same model-backed
 * chooser can drive both.
 */
export type OrgChooser<T> = (legal: readonly T[], context: string) => { index: number; reason: string };

/**
 * Choose within the legal set.
 *
 * `clamped` is reported rather than swallowed. A chooser that keeps asking for out-of-range indices
 * is malfunctioning, and a caller that cannot see the clamping cannot notice — the pick would still
 * be legal, which is exactly what makes the failure quiet.
 */
export function chooseWithinLegal<T>(
  legal: readonly T[],
  context: string,
  chooser: OrgChooser<T>,
): OrgChoice<T> {
  if (legal.length === 0) return { outcome: "no_legal_option", reason: `no legal option for: ${context}` };

  let pick: { index: number; reason: string };
  try {
    pick = chooser(legal, context);
  } catch (err) {
    // A chooser that throws must not take the organization down with it. Falling back to the first
    // legal option keeps the choice inside the rules, and the reason records that nobody chose.
    const message = err instanceof Error ? err.message : String(err);
    const option = legal[0];
    if (option === undefined) return { outcome: "no_legal_option", reason: `clamp failed for: ${context}` };
    return { outcome: "chosen", option, reason: `chooser threw (${message}); took the first legal option`, clamped: true };
  }

  // `Math.trunc` before clamping, because a fractional index is not a choice between two options.
  // `|| 0` catches NaN, which survives both `Math.max` and `Math.min` untouched and would index to
  // `undefined` — the one input that defeats a naive clamp.
  const raw = Math.trunc(pick.index) || 0;
  const idx = Math.max(0, Math.min(legal.length - 1, raw));
  const option = legal[idx];
  if (option === undefined) return { outcome: "no_legal_option", reason: `clamp failed for: ${context}` };
  return { outcome: "chosen", option, reason: pick.reason, clamped: idx !== pick.index };
}

/** The deterministic baseline: always the first (highest-priority) legal option. */
export function firstLegalChooser<T>(): OrgChooser<T> {
  return (legal) => ({ index: 0, reason: `deterministic: first of ${legal.length} legal option(s)` });
}

/** A chooser that always takes a named option when it is legal, else the first. For tests and policy. */
export function preferChooser<T>(preferred: T, label = "preferred"): OrgChooser<T> {
  return (legal) => {
    const i = legal.indexOf(preferred);
    return i < 0
      ? { index: 0, reason: `${label} not legal here; took the first of ${legal.length}` }
      : { index: i, reason: `${label} was legal` };
  };
}

/**
 * A chooser that takes the first legal option matching a predicate, else the first.
 *
 * `preferChooser` compares with `indexOf`, which is IDENTITY for objects — so preferring a candidate
 * object fails silently when the legal set was recomputed between building the preference and using
 * it, and silently taking the first option instead is exactly the shape that looks like a working
 * preference. Use this whenever the options are not primitives.
 */
export function preferWhere<T>(match: (option: T) => boolean, label = "preferred"): OrgChooser<T> {
  return (legal) => {
    const i = legal.findIndex(match);
    return i < 0
      ? { index: 0, reason: `${label} not legal here; took the first of ${legal.length}` }
      : { index: i, reason: `${label} was legal` };
  };
}
