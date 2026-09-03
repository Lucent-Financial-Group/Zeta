/**
 * observe/forge-diagnosis.ts — what the loop does about a forge failure, and what it tells you.
 *
 * ── THE DEFECT THIS EXISTS TO CLOSE ──────────────────────────────────────────
 * Found by running the loop end to end against a local model. It printed:
 *
 *     [forge] PR state read FAILED: [object Object] — continuing WITHOUT PR state
 *
 * `ForgeError` is a RICH value — `{ kind, message, retryable, raw }` — carrying exactly the three
 * facts an operator needs: why it failed, in words, and whether waiting will help. Two steps threw
 * all of it away:
 *
 *   1. `readPRStateAsync` declared its error `unknown`, widening away a type it had in hand.
 *   2. The loop then did `String(error)`, which on a plain object is `"[object Object]"`.
 *
 * So an EXPIRED TOKEN and a TRANSIENT NETWORK BLIP printed identically, and both printed nothing.
 * The loop retried the expired token forever and the operator was never told to fix it.
 *
 * ── `retryable` WAS ALREADY COMPUTED AND READ BY NOBODY ──────────────────────
 * `forge-host/result.ts` classifies every error kind (`rate-limited` / `network` retryable;
 * `auth-failure` / `permission-denied` / `not-supported` / `not-found` / `parse-failure` /
 * `internal` not). Every adapter sets it. Nothing in `observe/` read it — a field that exists to be
 * acted on and never was, which is the dead-control shape this repo keeps finding.
 *
 * This module is small on purpose: it does not re-classify anything (that would be a second opinion
 * competing with the adapter's), it reads what the adapter already decided and names the CONSEQUENCE.
 */

import type { ForgeError } from "../forge-host/types";

/**
 * What the loop does about a failure — as distinct from what the failure IS.
 *
 * They coincide today (`retryable` decides it), and they are still different statements: one is a
 * property of the error, the other is a commitment about behaviour. Naming the second is what makes
 * "waiting will not fix this" something an operator can read rather than infer.
 */
export type ForgeFailureDisposition = "retry-next-tick" | "operator-must-act";

export function forgeFailureDisposition(error: ForgeError): ForgeFailureDisposition {
  return error.retryable ? "retry-next-tick" : "operator-must-act";
}

/**
 * A one-line description that can never degrade to `[object Object]`.
 *
 * Includes the kind, because "auth-failure" and "rate-limited" call for opposite responses and the
 * message alone often does not distinguish them.
 */
export function describeForgeError(error: ForgeError): string {
  const disposition = forgeFailureDisposition(error);
  const hint =
    disposition === "operator-must-act"
      ? "not retryable — waiting will not fix this, an operator must act"
      : "retryable — the next tick will try again";
  return `${error.kind}: ${error.message} (${hint})`;
}

/**
 * Describe a value that really is `unknown`.
 *
 * The repo-wide idiom `e instanceof Error ? e.message : String(e)` is right for an `Error` and for a
 * string, and silently loses everything for a plain object — which is how the defect above reached a
 * log line. This keeps the same two good cases and serialises the third instead of erasing it.
 *
 * Honest limit: a value with circular references cannot be serialised, so it falls back to naming
 * its shape. That is still strictly more than `[object Object]`.
 */
export function describeError(value: unknown): string {
  if (value instanceof Error) return value.message;
  if (typeof value === "string") return value;
  if (value === null || value === undefined) return String(value);
  if (typeof value !== "object") return String(value);
  try {
    return JSON.stringify(value);
  } catch {
    // `Object.prototype.toString.call` returns the literal string "[object Object]" for a plain
    // object — so the obvious fallback reintroduces the exact output this module exists to
    // eliminate. Its own test caught that. Name the constructor and the top-level keys instead:
    // strictly more than the shape, and never the phrase.
    const ctor = (value as { constructor?: { name?: string } }).constructor?.name ?? "object";
    const keys = Object.keys(value as Record<string, unknown>);
    return `[unserialisable ${ctor}${keys.length > 0 ? ` with keys: ${keys.join(", ")}` : ""}]`;
  }
}
