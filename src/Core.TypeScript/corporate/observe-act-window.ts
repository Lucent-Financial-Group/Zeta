/**
 * observe-act-window.ts — the durable record that makes the promotion gate REACHABLE.
 *
 * ── WHY THIS EXISTS ──────────────────────────────────────────────────────────
 * `slot-dispatch.ts` built the gate and defaulted it to shadow, which was correct and left the
 * lane permanently there: nothing recorded a tick, so `shadowTicks` was always 0, and nothing
 * compared anything, so `divergenceMeasured` was always false. A gate that CANNOT pass is not a
 * safety property — it is the vacuity class with the sign flipped. A check that cannot fail proves
 * nothing; a gate that cannot open measures nothing, and both look responsible from outside.
 *
 * The design says where the window comes from: *"the default Cockroach-backed rolling window from
 * durable worker-lane `observe_act_tick` events"* (OBSERVE_ACT_PROMOTION_GATE.md). So the tick is a
 * FACT on the event log, and the window is a FOLD — the same fact/fold shape this register already
 * uses for fidelity, queues, QA and pace. Nothing new is invented; the missing piece was a fact
 * nobody was emitting.
 *
 * ── WHAT DIVERGENCE MEANS HERE, STATED RATHER THAN ASSUMED ───────────────────
 * The design says shadow runs "side by side" with the legacy lane and names a divergence rate, but
 * never defines it — so the definition is ours to make, and it must be one that can be WRONG:
 *
 *   for one tick, the observe-act lane selected a slot, and the legacy lane would have selected
 *   some slot. They AGREED or they DIVERGED. If the legacy lane was never consulted for that tick,
 *   the tick is NOT COMPARED — a third state, and not a quiet agreement.
 *
 * ── AND WHY A PARTIAL COMPARISON IS STILL "UNMEASURED" ───────────────────────
 * `divergenceMeasured` is true only when EVERY tick in the window carries a comparison. A rate
 * over the 3 ticks somebody happened to compare, out of 500, is a rate whose denominator is not
 * the window — and the 497 uncompared ticks are not evidence of agreement, they are the absence of
 * evidence. This is the strict direction on purpose: what the number unlocks is real dispatch of
 * side effects, so the sample has to be the window and not a convenience subset of it.
 *
 * `comparedTicks` is reported alongside, so the shortfall is legible rather than merely blocking.
 */

import type { PromotionWindow } from "./slot-dispatch";

/**
 * Whether the legacy lane agreed with what observe-act chose — three states, never two.
 *
 * `NotCompared` exists because the alternative is to record an unconsulted tick as agreement, and
 * a lane that promotes on comparisons nobody ran is exactly the failure the gate is for.
 */
export const TickComparison = {
  Agreed: "agreed",
  Diverged: "diverged",
  NotCompared: "not_compared",
} as const;

export type TickComparison = (typeof TickComparison)[keyof typeof TickComparison];

/**
 * One durable observe-act tick.
 *
 * Every field is something that HAPPENED, not something configured. `illegalSelection` is recorded
 * rather than derived later because legality is a property of the menu at the moment of choosing,
 * and the menu is gone by the time anyone folds the log.
 */
export interface ObserveActTick {
  readonly tickId: string;
  readonly atMs: number;
  /** The mode this tick actually ran in — so a window cannot be built out of mixed lanes unnoticed. */
  readonly mode: string;
  readonly slot: string;
  readonly workId?: string;
  /** Did the dispatch reach anything outside the process? False for every shadow tick. */
  readonly performed: boolean;
  /** The chooser tried to select something the menu did not offer. Any at all blocks promotion. */
  readonly illegalSelection: boolean;
  /**
   * Act-time authorization refused this dispatch.
   *
   * A DISTINCT fact from an illegal selection, and recorded rather than derived: an illegal
   * selection is a bad choice caught by the menu, a control bypass is a legal-looking choice caught
   * at the door. The first draft of this file inferred the second from `performed && illegal`,
   * which is not a second signal — it is the first one wearing a conjunction, and it would have
   * made the two demotion thresholds one threshold counted twice.
   */
  readonly controlBypassRejected: boolean;
  readonly comparison: TickComparison;
  /** What the legacy lane would have chosen. Present only when a comparison was actually run. */
  readonly legacySlot?: string;
}

/** The window's own accounting — what the gate judged, and how complete the evidence was. */
export interface WindowReadout {
  readonly window: PromotionWindow;
  readonly totalTicks: number;
  /** Ticks that carry a real comparison. Below `totalTicks` means the rate is not the window's. */
  readonly comparedTicks: number;
  /** One line a human can read without folding the log themselves. */
  readonly summary: string;
}

/**
 * The rolling window, folded from the log.
 *
 * `windowMs` bounds it: a promotion is a statement about the lane's RECENT behaviour, and a tick
 * from six weeks ago says nothing about the code running now. Ticks outside the window are dropped
 * rather than aged down, because a weighted old tick is still an old tick wearing a smaller number.
 *
 * The primary safety counters come from the last 30 minutes specifically — the demotion window the
 * design names — and they are counted over PRIMARY ticks only. A shadow tick cannot reject a
 * selection at act time, so counting shadow ticks there would let a long quiet shadow soak dilute
 * live primary failures, which is precisely backwards.
 */
export function foldObserveActWindow(
  ticks: readonly ObserveActTick[],
  nowMs: number,
  windowMs: number = DEFAULT_WINDOW_MS,
): WindowReadout {
  const inWindow = ticks.filter((t) => nowMs - t.atMs <= windowMs && t.atMs <= nowMs);
  const shadow = inWindow.filter((t) => t.mode === "observe_act_shadow");
  const compared = shadow.filter((t) => t.comparison !== TickComparison.NotCompared);
  const diverged = shadow.filter((t) => t.comparison === TickComparison.Diverged);

  // EVERY shadow tick must carry a comparison — see the header. An empty window is unmeasured too:
  // `every` over nothing is vacuously true, and a window with no ticks has measured nothing at all.
  const divergenceMeasured = shadow.length > 0 && compared.length === shadow.length;

  const recent = inWindow.filter(
    (t) => t.mode === "observe_act_primary" && nowMs - t.atMs <= DEMOTION_WINDOW_MS,
  );

  const window: PromotionWindow = {
    shadowTicks: shadow.length,
    shadowSoakHours: soakHoursOf(shadow),
    shadowIllegalSelections: shadow.filter((t) => t.illegalSelection).length,
    // Zero when unmeasured, and the gate blocks on the FLAG rather than on this number — so the
    // zero can never be read as a clean rate by anything downstream.
    shadowDivergenceRate: divergenceMeasured ? diverged.length / shadow.length : 0,
    divergenceMeasured,
    primarySelectorRejections30m: recent.filter((t) => t.illegalSelection).length,
    primaryControlBypassRejections30m: recent.filter((t) => t.controlBypassRejected).length,
  };

  return {
    window,
    totalTicks: inWindow.length,
    comparedTicks: compared.length,
    summary:
      `${String(shadow.length)} shadow tick(s) over ${window.shadowSoakHours.toFixed(1)}h, ` +
      `${String(compared.length)} compared` +
      (divergenceMeasured
        ? `, divergence ${(window.shadowDivergenceRate * 100).toFixed(1)}%`
        : ` — divergence UNMEASURED (${String(shadow.length - compared.length)} tick(s) never compared)`),
  };
}

/** Seven days. Long enough to hold a 24h soak with room, short enough that it is about now. */
export const DEFAULT_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

/** The 30 minutes the design's demotion rule names. */
export const DEMOTION_WINDOW_MS = 30 * 60 * 1000;

/**
 * How long the shadow lane has been soaking: the span from its first tick to its last.
 *
 * The SPAN, not the count times an assumed interval. A lane that ticked twice a day apart has
 * soaked for a day and has two ticks — both facts are true and the gate wants both, which is why
 * the soak requirement is a disjunction rather than a rate.
 */
function soakHoursOf(ticks: readonly ObserveActTick[]): number {
  if (ticks.length === 0) return 0;
  const times = ticks.map((t) => t.atMs);
  return (Math.max(...times) - Math.min(...times)) / (60 * 60 * 1000);
}

/**
 * Compare what observe-act chose against what the legacy lane would have chosen.
 *
 * `legacy` is `undefined` when the legacy lane could not be consulted — and that yields
 * `NotCompared`, never `Agreed`. The mapping from "no answer" to "not compared" lives in ONE place
 * so it cannot be re-derived differently at a call site, which is how an unconsulted tick would
 * quietly become an agreeing one.
 *
 * BOTH HALVES OF THE SELECTION COUNT. Two lanes that both say `PickWork` and name different items
 * have diverged on the only thing that matters — which work gets done — and comparing the slot tag
 * alone would score that as agreement. That is the coarser check the first draft made, and it would
 * have driven the measured rate toward zero for a reason having nothing to do with the lanes
 * agreeing.
 */
export function compareToLegacy(
  observeAct: Selection,
  legacy: Selection | undefined,
): { readonly comparison: TickComparison; readonly legacySlot?: string } {
  if (legacy === undefined) return { comparison: TickComparison.NotCompared };
  const agreed = observeAct.slot === legacy.slot && observeAct.workId === legacy.workId;
  return {
    comparison: agreed ? TickComparison.Agreed : TickComparison.Diverged,
    legacySlot: legacy.workId === undefined ? legacy.slot : `${legacy.slot}:${legacy.workId}`,
  };
}

/** A lane's choice for one tick: which slot, and on which item. */
export interface Selection {
  readonly slot: string;
  readonly workId?: string;
}

/**
 * The LEGACY lane's selection — the second opinion the divergence rate is measured against.
 *
 * A comparison is only worth running when the two selectors are genuinely different, so this is
 * deliberately NOT the menu generator with different weights. It is the priority-ordered assignment
 * path the organization already runs on: take the highest-contribution live candidate; if there is
 * no work, emit a heartbeat. No trajectory heat, no balance term, no agent interest — the three
 * things the observe-act menu weighs and this lane does not.
 *
 * That is what lets the rate be non-zero. A divergence measurement between one selector and itself
 * is guaranteed to read 0%, which would sail through the gate while proving nothing — the vacuity
 * class in the exact place it would do the most harm.
 *
 * Ties break on the id, ORDINAL — `localeCompare` is culture-sensitive, and a comparator whose
 * answer depends on the machine's locale would make the divergence rate depend on it too.
 */
export function legacySelection(
  candidates: readonly { readonly id: string; readonly estimatedDoraContribution: number }[],
): Selection {
  const ranked = [...candidates].sort(
    (a, b) =>
      b.estimatedDoraContribution - a.estimatedDoraContribution || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0),
  );
  const top = ranked[0];
  return top === undefined ? { slot: "EmitHeartbeat" } : { slot: "PickWork", workId: top.id };
}
