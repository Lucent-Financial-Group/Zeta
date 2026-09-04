/**
 * corporate/schedule-pressure.ts — is this hat's week survivable, and if not, what changes?
 *
 * ── THE HALF THAT WAS MISSING ────────────────────────────────────────────────
 * `work-schedule.ts` models a calendar: blocks, overlap refusal, meetings, missed blocks, and who
 * may adjust whose schedule. What it could not answer is the question a schedule exists to answer —
 * *is there enough time in this for the work assigned to it* — so a hat could be booked solid with
 * meetings, carrying twice its capacity, and the calendar would report a clean, conflict-free week.
 *
 * The reference asks for exactly this: a schedule *"determined by the supervising hat or department
 * policy, with adjustments based on performance reviews, capacity, queue pressure, budget, and
 * current initiative needs"*, and lists what an organization may do when the bottleneck is real —
 * reprioritize, create more hat assignments, defer lower-priority work, build tooling.
 *
 * ── PRESSURE CARRIES ITS CORRECTIVES, LIKE MOVEMENT DOES ─────────────────────
 * A number on its own becomes a dashboard nobody acts on. So this returns the named components AND
 * the corrective each one implies — a reader has already been handed what to do about it. Same
 * discipline as `work-batch.movement`, and for the same reason.
 *
 * ── EVERY CORRECTIVE HAS AN AUTHORITY ────────────────────────────────────────
 * A corrective nobody may perform is a complaint. Each one below names the hat that can act on it,
 * derived from the chart via `mayAdjustSchedule` and the RMO's own voter rule — never a fixed name.
 *
 * ── UNKNOWN STAYS UNKNOWN ────────────────────────────────────────────────────
 * A hat with no calendar has NO pressure reading, not a reading of zero. Zero would say its week is
 * comfortable, which is a claim about a schedule nobody wrote.
 */

import { blocksFor, mayAdjustSchedule, ScheduleBlockState, ScheduleBlockType, type Calendar } from "./work-schedule";
import { eligibleVoters, requiredSupply, type SupplyInput } from "./rmo";
import { childrenOf, isLeafType, WorkState, type Cascade } from "./goal-cascade";
import type { OrgChart } from "./org-chart";

/** What an organization can do about pressure, from the reference's own bottleneck list. */
export const Corrective = {
  /** Ask the RMO to authorize more wearers for this hat. */
  ExpandSupply: "expand_supply",
  /** Re-sequence the queue so the capacity that exists goes to the work that matters. */
  Reprioritize: "reprioritize",
  /** Push lower-priority work out of the window rather than pretending it fits. */
  DeferWork: "defer_work",
  /** Give the time back: the hat is in meetings instead of doing the work it is booked for. */
  ReduceMeetingLoad: "reduce_meeting_load",
  /** The hat is not keeping the blocks it has — a reliability problem, not a capacity one. */
  ReviewReliability: "review_reliability",
} as const;

export type Corrective = (typeof Corrective)[keyof typeof Corrective];

export interface PressureComponents {
  /** Open leaves assigned to this hat. */
  readonly openWork: number;
  /** Wearers the workload implies, from the RMO's own computation. */
  readonly requiredWearers: number;
  readonly currentWearers: number;
  /** Milliseconds booked for doing work. */
  readonly workMs: number;
  /** Milliseconds booked for meetings. */
  readonly meetingMs: number;
  /** Booked blocks the hat did not keep, over booked blocks in total. 0 when nothing was booked. */
  readonly missedRate: number;
  /** Meeting time over all booked time. 0 when nothing was booked. */
  readonly meetingShare: number;
}

export interface Pressure {
  readonly hatId: string;
  /**
   * 0 (comfortable) .. 1 (impossible). Named components travel with it, so the number is never
   * the whole answer.
   */
  readonly score: number;
  readonly components: PressureComponents;
  readonly correctives: readonly Corrective[];
}

/** Above this share of booked time in meetings, the hat is attending rather than working. */
export const MEETING_SHARE_LIMIT = 0.5;
/** Above this share of booked blocks missed, the problem is reliability rather than capacity. */
export const MISSED_RATE_LIMIT = 0.25;

export interface PressureInput {
  readonly chart: OrgChart;
  readonly calendar: Calendar;
  readonly cascade: Cascade;
  readonly supply: SupplyInput;
  readonly currentWearers: number;
}

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

/**
 * Read one hat's pressure.
 *
 * `undefined` when the hat has no blocks at all: a schedule nobody wrote cannot be over-subscribed,
 * and reporting 0 would claim it is comfortable.
 */
export function schedulePressure(hatId: string, input: PressureInput): Pressure | undefined {
  const blocks = blocksFor(input.calendar, hatId);
  if (blocks.length === 0) return undefined;

  let workMs = 0;
  let meetingMs = 0;
  let bookedMs = 0;
  let missed = 0;
  for (const block of blocks) {
    const span = Math.max(0, block.endMs - block.startMs);
    bookedMs += span;
    if (block.blockType === ScheduleBlockType.Meeting) meetingMs += span;
    // Work is the blocks where the hat is doing the thing it is accountable for. Review, reflection
    // and memory maintenance are real work but not capacity for the QUEUE, which is what pressure
    // is about — counting them would hide a hat with no time for its own items.
    if (block.blockType === ScheduleBlockType.PrioritizedWork || block.blockType === ScheduleBlockType.PromptFlowExecution) {
      workMs += span;
    }
    if (block.state === ScheduleBlockState.Missed) missed += 1;
  }

  const openWork = input.cascade.nodes.filter(
    (n) =>
      n.assigneeHatId === hatId &&
      isLeafType(n.workType) &&
      childrenOf(input.cascade, n.workId).length === 0 &&
      n.state !== WorkState.Done &&
      n.state !== WorkState.Canceled,
  ).length;

  const requiredWearers = requiredSupply(hatId, input.supply);
  const missedRate = blocks.length === 0 ? 0 : missed / blocks.length;
  const meetingShare = bookedMs === 0 ? 0 : meetingMs / bookedMs;

  // The capacity gap: how far short of the required wearers the hat is, as a share of what it needs.
  const supplyGap =
    requiredWearers === 0 ? 0 : clamp01((requiredWearers - input.currentWearers) / requiredWearers);
  // No open work is no time pressure; otherwise it is the shortfall against an hour per item. The
  // zero-booked case needs no branch of its own, because 1 minus zero-over-x is already 1, which IS
  // maximum pressure. An earlier version special-cased it, which read as a guard and guarded nothing.
  const timeGap = openWork === 0 ? 0 : clamp01(1 - workMs / (openWork * 3_600_000));

  const score = clamp01(Math.max(supplyGap, timeGap, meetingShare > MEETING_SHARE_LIMIT ? meetingShare : 0));

  const correctives: Corrective[] = [];
  // Short of people: only the RMO can authorize more, so that is the ask.
  if (supplyGap > 0) correctives.push(Corrective.ExpandSupply);
  // Short of time with the people it has: the queue has to change, not the headcount.
  if (timeGap > 0) {
    correctives.push(Corrective.Reprioritize);
    correctives.push(Corrective.DeferWork);
  }
  if (meetingShare > MEETING_SHARE_LIMIT) correctives.push(Corrective.ReduceMeetingLoad);
  // Missing booked blocks is a different problem from having too few: adding people to a hat that
  // does not keep its calendar adds absent people.
  if (missedRate > MISSED_RATE_LIMIT) correctives.push(Corrective.ReviewReliability);

  return {
    hatId,
    score,
    components: { openWork, requiredWearers, currentWearers: input.currentWearers, workMs, meetingMs, missedRate, meetingShare },
    correctives,
  };
}

/**
 * Who may act on a corrective for this hat.
 *
 * Supply is the RMO's to authorize — its voters, from the chart. Everything else is a schedule
 * adjustment, which follows the reporting line: `mayAdjustSchedule` already decides that, and
 * asking it here keeps one rule rather than two that can disagree.
 */
export function authorityFor(chart: OrgChart, hatId: string, corrective: Corrective): readonly string[] {
  if (corrective === Corrective.ExpandSupply) return eligibleVoters(chart, hatId);
  return chart.hats.filter((h) => h.id !== hatId && mayAdjustSchedule(chart, h.id, hatId)).map((h) => h.id);
}

/** Every hat under pressure, worst first — the queue a supervisor should work down. */
export function pressureBoard(hatIds: readonly string[], input: PressureInput): readonly Pressure[] {
  const out: Pressure[] = [];
  for (const hatId of hatIds) {
    const p = schedulePressure(hatId, input);
    if (p !== undefined && p.correctives.length > 0) out.push(p);
  }
  return out.sort((a, b) => (b.score !== a.score ? b.score - a.score : a.hatId < b.hatId ? -1 : 1));
}
