/**
 * Result discipline (Merge1 §10 MP-7: Result Over Exception).
 *
 * Every async operation that can fail returns a `Result<T, E>` — it never
 * throws on the hot path. The shape matches the existing `outcome` discriminant
 * used across the application package (see observe-work-item.ts), so Result
 * composes with the readout/feedback unions already in use.
 *
 * Pure, total functions (simulate, fold, transition, environment draws) do not
 * return Result — they cannot fail.
 */
export type Result<T, E> =
  | { readonly outcome: "ok"; readonly value: T }
  | { readonly outcome: "feedback"; readonly feedback: E };

export function ok<T>(value: T): { readonly outcome: "ok"; readonly value: T } {
  return { outcome: "ok", value };
}

export function feedback<E>(error: E): { readonly outcome: "feedback"; readonly feedback: E } {
  return { outcome: "feedback", feedback: error };
}

export function isOk<T, E>(result: Result<T, E>): result is { readonly outcome: "ok"; readonly value: T } {
  return result.outcome === "ok";
}
