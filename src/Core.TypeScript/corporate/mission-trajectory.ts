/**
 * mission-trajectory.ts — is the organization ahead of its own schedule, or behind it?
 *
 * ── WHY THIS IS NOT THE SAME QUESTION AS SCHEDULE PRESSURE ───────────────────
 * `schedule-pressure.ts` answers "is this hat's calendar overloaded right now" — an instantaneous
 * reading over meetings, missed blocks and free time. It is about LOAD.
 *
 * This answers "given where we are in the window, is the work where it should be" — a reading over
 * elapsed time against delivered progress. It is about PACE. An organization can be perfectly
 * unloaded and badly behind, or slammed and exactly on schedule; a system that reports only the
 * first will discover the second at the deadline.
 *
 * ── THE COMPARISON IS AGAINST TIME ELAPSED, NOT AGAINST A PLAN ───────────────
 * The expected progress at any instant is the fraction of the window that has passed. That is a
 * deliberately crude model and it is the honest one available here: a per-task plan would need
 * estimates nobody has measured, and inventing them would make this a `toy` reporting as `metered`.
 * Linear pace is checkable from two timestamps and a count, which is exactly what the organization
 * already records.
 *
 * Stated as a limit rather than hidden: a project that legitimately back-loads its delivery reads
 * as `at_risk` under this model for most of its life. The remedy is `tolerance`, supplied by the
 * caller who knows the shape of the work — not a cleverer default here.
 *
 * ── AND IT NEVER DECIDES ANYTHING ────────────────────────────────────────────
 * The status is a measurement. Whether `off_track` becomes an escalation is the organization's
 * call, through `EscalationTrigger.MissionOffTrack` and the normal authority checks — the same
 * meter/oracle split the rest of this register keeps: this reports, somebody else judges.
 */

/** Where the mission stands against its own window. */
export const TrajectoryStatus = {
  OnTrack: "on_track",
  AtRisk: "at_risk",
  OffTrack: "off_track",
  /** The window is not yet open, or has zero length — no pace exists to report. */
  NotStarted: "not_started",
} as const;

export type TrajectoryStatus = (typeof TrajectoryStatus)[keyof typeof TrajectoryStatus];

export interface TrajectoryInput {
  readonly missionId: string;
  readonly startsAtMs: number;
  readonly targetAtMs: number;
  readonly nowMs: number;
  /** Units delivered so far, and the total the mission owes. Counts, never percentages. */
  readonly delivered: number;
  readonly total: number;
  /**
   * How far behind linear pace is still "on track", as a fraction of the whole.
   *
   * Defaulted rather than required, because a caller who has not thought about it should still get
   * a reading — but the default is stated here rather than buried: 10% of the mission's total.
   */
  readonly tolerance?: number;
}

export interface Trajectory {
  readonly missionId: string;
  readonly status: TrajectoryStatus;
  /** Fraction of the window elapsed, clamped to [0,1]. */
  readonly elapsedFraction: number;
  /** Fraction of the work delivered, clamped to [0,1]. */
  readonly deliveredFraction: number;
  /**
   * `deliveredFraction - elapsedFraction`. Negative is behind.
   *
   * Reported as the raw difference rather than as a grade, so a caller can set its own threshold
   * without re-deriving the numbers.
   */
  readonly drift: number;
  /** What the reading rests on, so a disagreement is about the inputs rather than the verdict. */
  readonly basis: string;
}

export const DEFAULT_TOLERANCE = 0.1;

/**
 * OFF-TRACK is twice the tolerance, not a second knob.
 *
 * One threshold and a multiple of it, rather than two independently tunable numbers that can be
 * set into contradiction (`atRisk` looser than `offTrack` would make `at_risk` unreachable).
 */
export const OFF_TRACK_MULTIPLE = 2;

export function evaluateTrajectory(input: TrajectoryInput): Trajectory {
  const tolerance = input.tolerance ?? DEFAULT_TOLERANCE;
  const window = input.targetAtMs - input.startsAtMs;
  const basisFor = (why: string) => `${why}; delivered ${String(input.delivered)}/${String(input.total)}`;

  // A window that has not opened, has no length, or a mission that owes nothing has no PACE — and
  // reporting `on_track` for it would be a claim about a measurement that was never taken.
  if (window <= 0 || input.nowMs < input.startsAtMs || input.total <= 0) {
    return {
      missionId: input.missionId,
      status: TrajectoryStatus.NotStarted,
      elapsedFraction: 0,
      deliveredFraction: 0,
      drift: 0,
      basis: basisFor(
        window <= 0
          ? "the window has zero or negative length"
          : input.total <= 0
            ? "the mission owes no units"
            : "the window has not opened yet",
      ),
    };
  }

  const clamp = (n: number) => (n < 0 ? 0 : n > 1 ? 1 : n);
  const elapsedFraction = clamp((input.nowMs - input.startsAtMs) / window);
  const deliveredFraction = clamp(input.delivered / input.total);
  const drift = deliveredFraction - elapsedFraction;

  // AHEAD is on track. Only the behind direction is graded, because being early is not a condition
  // anybody escalates and grading it would produce a status nothing acts on.
  const status =
    drift >= -tolerance
      ? TrajectoryStatus.OnTrack
      : drift >= -tolerance * OFF_TRACK_MULTIPLE
        ? TrajectoryStatus.AtRisk
        : TrajectoryStatus.OffTrack;

  return {
    missionId: input.missionId,
    status,
    elapsedFraction,
    deliveredFraction,
    drift,
    basis: basisFor(
      `${(elapsedFraction * 100).toFixed(0)}% of the window elapsed, ` +
        `${(deliveredFraction * 100).toFixed(0)}% delivered, tolerance ${String(tolerance)}`,
    ),
  };
}

/**
 * Whether this reading is one the organization should be told about.
 *
 * Separate from the status so the threshold for ACTING is visible and can differ from the threshold
 * for MEASURING. `at_risk` is deliberately not escalated: an escalation for every wobble is an
 * escalation nobody reads, which is how a real one gets missed.
 */
export function warrantsEscalation(t: Trajectory): boolean {
  return t.status === TrajectoryStatus.OffTrack;
}
