/**
 * enforcement/promotion-gate.ts — a lane earns the right to dispatch side effects.
 *
 * Ported from `agentic-organization/docs/OBSERVE_ACT_PROMOTION_GATE.md`, whose load-bearing sentence
 * is the reason this is worth having at all:
 *
 *   *"The gate is deterministic. Agents may select from legal menu slots, but they do not decide
 *   whether the organization is safe to promote a lane."*
 *
 * That is exactly the shape this harness is built out of — a guardrail the agent cannot argue with —
 * applied to the one decision that matters most: whether this loop's actions reach the world.
 *
 * ── THE TWO MODES ────────────────────────────────────────────────────────────
 *   shadow    the loop observes, builds the menu, chooses, and RECORDS — but dispatch is a shadow
 *             implementation. Everything is exercised except the side effect.
 *   primary   dispatch uses the real injected runtime.
 *
 * ── FOUR PROPERTIES, EACH OF WHICH IS A FAIL-OPEN IF DROPPED ─────────────────
 *
 * 1. **DEMOTION OUTRANKS PROMOTION.** Evaluated first, always. A window that satisfies every
 *    promotion threshold AND trips a demotion threshold demotes. Ordering them the other way is a
 *    gate that congratulates a lane on its soak while it is actively rejecting control checks.
 *
 * 2. **AN INSUFFICIENT WINDOW RESOLVES TO SHADOW.** The org doc: *"A fresh or insufficient durable
 *    window resolves to shadow."* Absence of evidence is not evidence of safety — the same reading
 *    the e-stop takes when it cannot read its flags.
 *
 * 3. **A NON-FINITE METRIC RESOLVES TO SHADOW.** This is the sharp one, and it is invisible until
 *    you look for it: every comparison against `NaN` is `false`, so a naive `divergence > MAX` test
 *    lets `NaN` through as "not too divergent" — a corrupt counter reading as a clean record. The
 *    window is validated BEFORE any threshold is applied.
 *
 * 4. **A REFUSAL EMITS EVIDENCE TOO.** Evidence refs are produced for every decision, not just
 *    promotions. A gate that only records its yeses cannot be audited for its noes.
 *
 * ── HONEST SCOPE ─────────────────────────────────────────────────────────────
 * This is the DECISION, not the plumbing. The org side reads its window from durable
 * `observe_act_tick` events in Cockroach; here the window arrives as a value (from a file, a fold
 * over the event log, or a test), so the gate stays pure and replays under DST. What the gate
 * cannot do is verify that the numbers it was handed are true — a lane that reports its own clean
 * window is trusting the reporter, and that is a property of the window SOURCE, stated here rather
 * than implied away.
 */

// ─── Modes ───────────────────────────────────────────────────────────────────

export type ExecutionMode = "shadow" | "primary";

/** Why the gate landed where it did. A DU, so reasons are enumerable rather than prose. */
export type GateReason =
  | "demoted_selector_rejections"
  | "demoted_control_bypass"
  | "window_unreadable"
  | "window_invalid"
  | "insufficient_soak"
  | "illegal_selections"
  | "divergence_too_high"
  | "promoted";

export interface GateDecision {
  readonly mode: ExecutionMode;
  readonly reason: GateReason;
  /** Human-facing sentence. Never the machine-readable part — that is `reason`. */
  readonly detail: string;
  /** Emitted on EVERY decision, promotion or refusal. */
  readonly evidence: readonly string[];
}

// ─── The window ──────────────────────────────────────────────────────────────

export interface PromotionWindow {
  /** Ticks observed in shadow. */
  readonly shadowTicks: number;
  /** Hours of shadow soak. */
  readonly shadowSoakHours: number;
  /** Slots selected in shadow that the grammar did not permit. Must be zero. */
  readonly illegalSelections: number;
  /** Fraction in [0,1] — how often shadow and legacy disagreed. */
  readonly divergenceRate: number;
  /** Primary-mode selector rejections in the last 30 minutes. */
  readonly primarySelectorRejections30m: number;
  /** Primary-mode control-bypass rejections in the last 30 minutes. */
  readonly primaryControlBypassRejections30m: number;
}

export const PROMOTION_THRESHOLDS = {
  /** Either bound satisfies the soak — ticks OR hours, per the org doc. */
  minShadowTicks: 100,
  minShadowSoakHours: 24,
  /** Exactly zero. Not "few". */
  maxIllegalSelections: 0,
  maxDivergenceRate: 0.05,
} as const;

export const DEMOTION_THRESHOLDS = {
  /** At least this many trips demotion. */
  selectorRejections30m: 2,
  controlBypassRejections30m: 1,
} as const;

const WINDOW_FIELDS = [
  "shadowTicks",
  "shadowSoakHours",
  "illegalSelections",
  "divergenceRate",
  "primarySelectorRejections30m",
  "primaryControlBypassRejections30m",
] as const;

/**
 * Is every counter a real, non-negative, finite number?
 *
 * Runs BEFORE any threshold. See property 3: `NaN > 0.05` is `false`, so an unvalidated window
 * turns a corrupt counter into a clean record.
 */
export function windowIsValid(window: PromotionWindow): boolean {
  for (const field of WINDOW_FIELDS) {
    const v = window[field];
    if (typeof v !== "number" || !Number.isFinite(v) || v < 0) return false;
  }
  return window.divergenceRate <= 1;
}

function evidenceFor(window: PromotionWindow): readonly string[] {
  return [
    `observe-act-promotion:shadow_ticks:${window.shadowTicks}`,
    `observe-act-promotion:shadow_soak_hours:${window.shadowSoakHours}`,
    `observe-act-promotion:shadow_divergence_rate:${window.divergenceRate}`,
    `observe-act-promotion:shadow_illegal_selections:${window.illegalSelections}`,
    `observe-act-promotion:primary_selector_rejections_30m:${window.primarySelectorRejections30m}`,
    `observe-act-promotion:primary_control_bypass_rejections_30m:${window.primaryControlBypassRejections30m}`,
  ];
}

// ─── The decision ────────────────────────────────────────────────────────────

/**
 * The effective mode for this tick. Stateless: the same window always yields the same decision, so
 * the gate replays under DST and no lane carries a "promoted" flag it could keep after the evidence
 * for it expired.
 */
export function evaluatePromotion(window: PromotionWindow): GateDecision {
  const evidence = evidenceFor(window);

  // (3) Validate first. A comparison against a non-finite number decides nothing and looks clean.
  if (!windowIsValid(window)) {
    return {
      mode: "shadow",
      reason: "window_invalid",
      detail:
        "promotion window contains a non-finite, negative, or out-of-range counter — a metric that cannot be compared is not a metric that passed",
      evidence,
    };
  }

  // (1) Demotion outranks promotion, unconditionally.
  if (window.primaryControlBypassRejections30m >= DEMOTION_THRESHOLDS.controlBypassRejections30m) {
    return {
      mode: "shadow",
      reason: "demoted_control_bypass",
      detail: `${window.primaryControlBypassRejections30m} control-bypass rejection(s) in the last 30 minutes — one is enough, because a lane that tried to go around a control is not a lane whose soak record means anything`,
      evidence,
    };
  }
  if (window.primarySelectorRejections30m >= DEMOTION_THRESHOLDS.selectorRejections30m) {
    return {
      mode: "shadow",
      reason: "demoted_selector_rejections",
      detail: `${window.primarySelectorRejections30m} selector rejections in the last 30 minutes (threshold ${DEMOTION_THRESHOLDS.selectorRejections30m})`,
      evidence,
    };
  }

  // (2) Soak: EITHER bound satisfies it.
  const soaked =
    window.shadowTicks >= PROMOTION_THRESHOLDS.minShadowTicks ||
    window.shadowSoakHours >= PROMOTION_THRESHOLDS.minShadowSoakHours;
  if (!soaked) {
    return {
      mode: "shadow",
      reason: "insufficient_soak",
      detail: `${window.shadowTicks} ticks / ${window.shadowSoakHours}h of soak — needs ${PROMOTION_THRESHOLDS.minShadowTicks} ticks or ${PROMOTION_THRESHOLDS.minShadowSoakHours}h`,
      evidence,
    };
  }

  if (window.illegalSelections > PROMOTION_THRESHOLDS.maxIllegalSelections) {
    return {
      mode: "shadow",
      reason: "illegal_selections",
      detail: `${window.illegalSelections} illegal slot selection(s) in the shadow window — the bar is zero, because one slot the grammar did not permit is a lane that does not respect the grammar`,
      evidence,
    };
  }

  if (window.divergenceRate > PROMOTION_THRESHOLDS.maxDivergenceRate) {
    return {
      mode: "shadow",
      reason: "divergence_too_high",
      detail: `divergence ${window.divergenceRate} exceeds ${PROMOTION_THRESHOLDS.maxDivergenceRate}`,
      evidence,
    };
  }

  return {
    mode: "primary",
    reason: "promoted",
    detail: `promoted: ${window.shadowTicks} ticks / ${window.shadowSoakHours}h soak, ${window.illegalSelections} illegal selections, divergence ${window.divergenceRate}`,
    evidence,
  };
}

// ─── Window sources ──────────────────────────────────────────────────────────

export const DEFAULT_WINDOW_PATH = "db/promotion/window.json";

/** What a reader hands the gate. Absence and unreadability are DISTINCT — both resolve to shadow. */
export type WindowSource =
  | { readonly absent: true }
  | { readonly ok: true; readonly window: PromotionWindow }
  | { readonly ok: false; readonly why: string };

/**
 * The decision from a source rather than a value.
 *
 * An ABSENT window is not an error — a lane that has never soaked has no window, and shadow is
 * where it belongs. An UNREADABLE window is also shadow, for the harder reason: a window we could
 * not parse might have said anything, and "could not tell" is not permission.
 */
export function decisionFromSource(source: WindowSource): GateDecision {
  if ("absent" in source) {
    return {
      mode: "shadow",
      reason: "insufficient_soak",
      detail: "no promotion window recorded yet — a lane with no soak record starts in shadow",
      evidence: [],
    };
  }
  if (!source.ok) {
    return {
      mode: "shadow",
      reason: "window_unreadable",
      detail: `promotion window could not be read (${source.why}) — staying in shadow, because "could not tell" is not permission`,
      evidence: [],
    };
  }
  return evaluatePromotion(source.window);
}

/**
 * Parse a window document. STRICT: a missing or wrongly-typed field makes the WHOLE document
 * unreadable rather than defaulting the field, because a defaulted counter is a counter nobody
 * measured being treated as one that passed.
 */
export function parseWindow(raw: string): WindowSource {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (e) {
    return { ok: false, why: `invalid JSON: ${e instanceof Error ? e.message : String(e)}` };
  }
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    return { ok: false, why: "document is not a JSON object" };
  }
  const obj = parsed as Record<string, unknown>;
  const out: Record<string, number> = {};
  for (const field of WINDOW_FIELDS) {
    const v = obj[field];
    if (typeof v !== "number") return { ok: false, why: `field "${field}" is missing or not a number` };
    out[field] = v;
  }
  return { ok: true, window: out as unknown as PromotionWindow };
}
