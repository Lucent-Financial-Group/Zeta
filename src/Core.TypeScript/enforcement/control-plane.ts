/**
 * control-plane.ts — the halt the fleet did not have.
 *
 * Brought over from `agentic-organization/packages/application/src/control-plane-guard.ts`, which is
 * the only e-stop anywhere in the repository. Measured before writing this: `run-loop-real.ts`
 * consulted **no halt flag of any kind**, and neither did `tickRooms`. The loop is cron-driven and
 * its event sink pushes direct to `origin/main`, so the only ways to stop it were deleting the cron
 * or revoking the credential — both of which stop *everything*, including the ability to observe
 * what went wrong.
 *
 * ── THE FAIL-CLOSED RULE, WHICH IS THE WHOLE DESIGN ──────────────────────────
 * An e-stop that fails open is not an e-stop. But a halt that fires whenever a file is missing
 * would mean the fleet can never start. Those two pressures resolve on a distinction that has to be
 * made precisely:
 *
 *   file ABSENT     -> nothing has been declared          -> PROCEED
 *   file PRESENT but unreadable/malformed -> we cannot tell whether a halt is set -> HALT
 *
 * Absence is a definite statement: no operator has declared a flag. Corruption is not a statement at
 * all, and "I could not tell" must never be read as permission — that is the same swallowed-error
 * shape as a check that returns `allow` from its catch block. The distinction is what keeps this
 * both safe and startable.
 *
 * ── SCOPES ───────────────────────────────────────────────────────────────────
 * A halt is scoped, so one misbehaving agent or one bad provider does not require stopping the
 * fleet. `organization` matches everything; `agent`, `hat` and `provider` match the acting context.
 * A hat flag matches if the actor is wearing that hat — the actor's whole worn set is checked, not
 * just one, because a persona wears a subset (`Persona.Worn`) and halting "the reviewer hat" must
 * hold however many other hats that persona is also wearing.
 *
 * ── WHAT THIS IS NOT ─────────────────────────────────────────────────────────
 * It stops agents that *consult it*. It is not a kernel-level kill: a process that never calls
 * `haltDecision` is unaffected, and nothing here can stop code already executing. That is why the
 * loop consults it before acting rather than relying on it as an ambient property.
 */

import { readFileSync } from "node:fs";

/**
 * Default location of the flag document, relative to the repo root.
 *
 * Git-native on purpose: setting a halt is a commit, so it is attributable, reviewable and revertible
 * by the same machinery as everything else, and it reaches every clone through the path they already
 * pull. The path is a parameter because where operators want it is theirs to decide.
 */
export const DEFAULT_FLAGS_PATH = "db/control-plane/flags.json";

/** Where a halt applies. `organization` needs no id; the others name their target. */
export type ControlPlaneScope =
  | { readonly kind: "organization" }
  | { readonly kind: "agent"; readonly id: string }
  | { readonly kind: "hat"; readonly id: string }
  | { readonly kind: "provider"; readonly id: string };

/**
 * What kind of halt. Ordered by severity — `estop` is checked first and cannot be overridden by a
 * narrower flag, because an emergency stop that a lower-priority flag could soften is not one.
 */
export const FLAG_SEVERITY = ["estop", "freeze", "budget_freeze", "provider_freeze"] as const;
export type ControlPlaneFlagKind = (typeof FLAG_SEVERITY)[number];

export interface ControlPlaneFlag {
  readonly kind: ControlPlaneFlagKind;
  readonly scope: ControlPlaneScope;
  /** Why it was set. Required — an unexplained halt is indistinguishable from a fault. */
  readonly reason: string;
  /** Who set it. Required for the same reason. */
  readonly setBy: string;
}

/** Who is about to act, and under what. */
export interface ActingContext {
  readonly agent: string;
  /** Every hat currently worn — a persona wears a subset, and any one of them can be halted. */
  readonly hats?: readonly string[];
  readonly provider?: string;
}

export type HaltDecision =
  | { readonly halted: false }
  | { readonly halted: true; readonly flag: ControlPlaneFlagKind; readonly reason: string; readonly setBy: string };

function scopeMatches(scope: ControlPlaneScope, ctx: ActingContext): boolean {
  switch (scope.kind) {
    case "organization":
      return true;
    case "agent":
      return scope.id === ctx.agent;
    case "hat":
      return (ctx.hats ?? []).includes(scope.id);
    case "provider":
      return ctx.provider !== undefined && scope.id === ctx.provider;
  }
}

/**
 * Should this actor stop?
 *
 * Severity-ordered: the most severe matching flag wins, so a `freeze` never reports in place of an
 * `estop` that is also in force. Within a severity the first match wins; they are equivalent by
 * construction, since the decision is "halt" either way.
 */
export function haltDecision(flags: readonly ControlPlaneFlag[], ctx: ActingContext): HaltDecision {
  for (const kind of FLAG_SEVERITY) {
    for (const flag of flags) {
      if (flag.kind !== kind) continue;
      if (!scopeMatches(flag.scope, ctx)) continue;
      return { halted: true, flag: flag.kind, reason: flag.reason, setBy: flag.setBy };
    }
  }
  return { halted: false };
}

/** The parse result, kept separate from the halt decision so "unreadable" is not silently "empty". */
export type FlagSource =
  { readonly ok: true; readonly flags: readonly ControlPlaneFlag[] } | { readonly ok: false; readonly why: string };

const VALID_KINDS: ReadonlySet<string> = new Set(FLAG_SEVERITY);
const VALID_SCOPES: ReadonlySet<string> = new Set(["organization", "agent", "hat", "provider"]);

/**
 * Parse a flag document. STRICT on purpose: an entry it cannot understand makes the whole source
 * unreadable rather than being skipped.
 *
 * Skipping a malformed entry is the tempting, friendlier behaviour and it is wrong here — the entry
 * nobody could parse is exactly the one that might have been the estop. A parser that drops what it
 * does not understand turns a corrupt halt into a silent go.
 */
/**
 * Parse one flag's scope.
 *
 * Extracted so `parseFlags` stays under the complexity bound, but also because the null check below
 * only reads as a real check when `scope` arrives as `unknown`. It previously arrived pre-cast to
 * `Record<string, unknown> | undefined`, which told the type system `null` was impossible — so
 * `scope === null` looked dead to a reader and to the linter while remaining load-bearing at
 * runtime, since `typeof null === "object"`. A cast that makes a live guard look dead is exactly
 * the shape that gets "tidied away" later.
 */
function parseScope(scope: unknown, i: number): { ok: true; scope: ControlPlaneScope } | { ok: false; why: string } {
  if (typeof scope !== "object" || scope === null) return { ok: false, why: `flag ${String(i)} has no scope` };
  const sc = scope as Record<string, unknown>;
  const kind = sc.kind;
  if (typeof kind !== "string" || !VALID_SCOPES.has(kind)) {
    return { ok: false, why: `flag ${String(i)} has an unknown scope kind` };
  }
  if (kind === "organization") return { ok: true, scope: { kind: "organization" } };
  const id = sc.id;
  if (typeof id !== "string" || id.length === 0) {
    return { ok: false, why: `flag ${String(i)} scope "${kind}" needs an id` };
  }
  return { ok: true, scope: { kind, id } as ControlPlaneScope };
}

export function parseFlags(raw: string): FlagSource {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    return { ok: false, why: `flags document is not valid JSON: ${(err as Error).message}` };
  }
  if (!Array.isArray(parsed)) return { ok: false, why: "flags document must be a JSON array" };

  const flags: ControlPlaneFlag[] = [];
  for (const [i, entry] of parsed.entries()) {
    if (typeof entry !== "object" || entry === null) return { ok: false, why: `flag ${String(i)} is not an object` };
    const e = entry as Record<string, unknown>;
    const kind = e.kind;
    const reason = e.reason;
    const setBy = e.setBy;
    if (typeof kind !== "string" || !VALID_KINDS.has(kind))
      return { ok: false, why: `flag ${String(i)} has an unknown kind` };
    if (typeof reason !== "string" || reason.length === 0) return { ok: false, why: `flag ${String(i)} has no reason` };
    if (typeof setBy !== "string" || setBy.length === 0) return { ok: false, why: `flag ${String(i)} has no setBy` };
    const scope = parseScope(e.scope, i);
    if (!scope.ok) return { ok: false, why: scope.why };
    flags.push({ kind: kind as ControlPlaneFlagKind, reason, setBy, scope: scope.scope });
  }
  return { ok: true, flags };
}

/**
 * Read the flag document.
 *
 * One syscall, one answer — no `existsSync` then `readFileSync`, because the answer the check
 * returned would already be stale when the use ran, and here that window is the window in which an
 * operator sets an estop. ENOENT is the only error treated as "absent"; every other failure
 * (permissions, a directory, an I/O fault) is an unreadable source and therefore a halt.
 */
export function loadFlags(path: string): FlagSource | { readonly absent: true } {
  let raw: string;
  try {
    raw = readFileSync(path, "utf8");
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code === "ENOENT") return { absent: true };
    return { ok: false, why: `flags document at ${path} could not be read: ${code ?? (err as Error).message}` };
  }
  return parseFlags(raw);
}

/**
 * The decision an actor should make from a source that may not have loaded.
 *
 * `absent` is the caller telling us the document does not exist — a definite "nothing declared", so
 * it proceeds. Anything the caller could not read or parse halts.
 */
export function haltDecisionFromSource(
  source: FlagSource | { readonly absent: true },
  ctx: ActingContext,
): HaltDecision {
  if ("absent" in source) return { halted: false };
  if (!source.ok) {
    return {
      halted: true,
      flag: "estop",
      reason: `control-plane flags could not be read (${source.why}) — halting, because "could not tell" is not permission`,
      setBy: "control-plane",
    };
  }
  return haltDecision(source.flags, ctx);
}
