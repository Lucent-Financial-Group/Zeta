/**
 * review-calendar.ts — a review nobody has time booked for is a review nobody is doing.
 *
 * ── WHAT WAS ON THE CALENDAR, AND WHAT WAS NOT ───────────────────────────────
 * The runtime booked exactly one kind of block: `prioritized_work`, for the hat assigned to the
 * item. Thirteen gates were then evaluated by hats with nothing on their calendars at all, and QA
 * ran against a schedule that never mentioned it. `ScheduleBlockType` has had `Review` and
 * `Reporting` values the whole time and nothing produced them.
 *
 * ── AND IT IS NOT BOOKKEEPING ────────────────────────────────────────────────
 * `loop-policy.ts` makes the calendar RUNTIME AUTHORITY — what a hat is booked to be doing at
 * `nowMs` narrows what it may pick this tick, and its own header quotes the requirement: a schedule
 * *"is not just calendar metadata. It is part of runtime authority."*
 *
 * So a review that is not on a calendar is not merely unrecorded. The reviewing hat's tick cannot
 * see that it is supposed to be reviewing, because the only thing that could have told it is the
 * block that was never booked. Work was authorised by the schedule and reviews were not, which is
 * why the review lane could never drive itself.
 *
 * ── WHO GETS THE BLOCK ───────────────────────────────────────────────────────
 * The gate's OWNERS, minus the proposer. That is the same rule `runPipeline` applies when it picks
 * an evaluator — separation of duties, whoever did the work does not review it — so the hat that
 * ends up judging is one that had time booked for it. Deriving the two independently would let a
 * gate be evaluated by a hat whose calendar said it was doing something else.
 */

import { gateOwners, type GateKind } from "./quality-gate";
import type { OrgChart } from "./org-chart";
import {
  scheduleBlock,
  ScheduleBlockState,
  ScheduleBlockType,
  type Calendar,
  type ScheduleBlock,
} from "./work-schedule";

export interface ReviewBookingInput {
  readonly chart: OrgChart;
  readonly calendar: Calendar;
  /** The gates this work item will actually cross — the pipeline's own chain, never a constant. */
  readonly gates: readonly GateKind[];
  readonly workId: string;
  /** Whoever did the work. Excluded from its own reviews. */
  readonly proposerHatId: string;
  readonly fromMs: number;
  readonly blockMs: number;
  readonly createId: (prefix: string) => string;
}

export interface BookedReview {
  readonly block: ScheduleBlock;
  readonly gate: GateKind;
}

export interface ReviewBookingResult {
  readonly calendar: Calendar;
  readonly booked: readonly BookedReview[];
  /** Gates nobody could be booked for, and why. Reported, never silently skipped. */
  readonly refusals: readonly string[];
}

/**
 * Book a review block for every gate this item will cross.
 *
 * ONE HAT PER GATE — the first eligible owner, matching `runPipeline`'s own `owners[0]` default.
 * Booking every owner would fill the calendars of hats who will not judge it, and a calendar full
 * of blocks nobody honours is worse than an empty one: it makes `firstCommonFreeSlot` refuse
 * meetings that could actually have happened.
 *
 * Blocks are laid END TO END from `fromMs` rather than all at the same instant, because gates are
 * crossed in order and a reviewer cannot be judging phase nine while phase two is still unwritten.
 * The resulting calendar is a plan of the review sequence, which is what makes it schedulable.
 *
 * A GATE WITH NO ELIGIBLE OWNER IS A REFUSAL, not a skipped block. It means the only hat holding
 * that scope is the one that did the work, and `runPipeline` will block there for exactly the same
 * reason — surfacing it here, before anything runs, is the difference between a plan that is known
 * to be unrunnable and one that fails halfway.
 */
export function bookReviewBlocks(input: ReviewBookingInput): ReviewBookingResult {
  let calendar = input.calendar;
  const booked: BookedReview[] = [];
  const refusals: string[] = [];
  let cursor = input.fromMs;

  for (const gate of input.gates) {
    const eligible = gateOwners(input.chart, gate).filter((h) => h.id !== input.proposerHatId);
    const reviewer = eligible[0];
    if (reviewer === undefined) {
      refusals.push(
        `no hat can be booked to review '${gate}' for ${input.workId}: ` +
          `the only holder is '${input.proposerHatId}', which did the work`,
      );
      continue;
    }
    const block: ScheduleBlock = {
      blockId: input.createId("rev"),
      hatId: reviewer.id,
      blockType: ScheduleBlockType.Review,
      startMs: cursor,
      endMs: cursor + input.blockMs,
      state: ScheduleBlockState.Scheduled,
      workItemId: input.workId,
    };
    const r = scheduleBlock(calendar, block);
    if (!r.ok) {
      // A CONFLICT IS REPORTED, never worked around by moving the block. Silently sliding it would
      // reorder the review sequence, and a reviewer booked out of order is judging a phase whose
      // input does not exist yet.
      refusals.push(`could not book '${gate}' review for ${input.workId}: ${r.reason}`);
      cursor += input.blockMs;
      continue;
    }
    calendar = r.calendar;
    booked.push({ block, gate });
    cursor += input.blockMs;
  }

  return { calendar, booked, refusals };
}

export interface QaBookingInput {
  readonly calendar: Calendar;
  /** The hats that will run the tests. */
  readonly qaHatIds: readonly string[];
  readonly workId: string;
  readonly fromMs: number;
  readonly blockMs: number;
  readonly createId: (prefix: string) => string;
}

/**
 * Book QA's own time.
 *
 * A separate function rather than another gate row, because QA is not a review: it produces
 * evidence rather than an opinion, and `runtime_validation` is the one gate decided by what the
 * tests said rather than by what a reviewer thought. Booking it as a review block would put the
 * two on the same footing on the calendar, which is exactly the equivalence the gate chooser
 * refuses.
 *
 * Every QA hat is booked, not just the first — tests are run, not adjudicated, so more hands are
 * more throughput rather than a redundant panel.
 */
export function bookQaBlocks(input: QaBookingInput): ReviewBookingResult {
  let calendar = input.calendar;
  const booked: BookedReview[] = [];
  const refusals: string[] = [];

  for (const hatId of input.qaHatIds) {
    const block: ScheduleBlock = {
      blockId: input.createId("qa"),
      hatId,
      // `PromptFlowExecution` is the block type for running something rather than judging it, and
      // `loop-policy` already has work in scope during it.
      blockType: ScheduleBlockType.PromptFlowExecution,
      startMs: input.fromMs,
      endMs: input.fromMs + input.blockMs,
      state: ScheduleBlockState.Scheduled,
      workItemId: input.workId,
    };
    const r = scheduleBlock(calendar, block);
    if (!r.ok) {
      refusals.push(`could not book QA for ${input.workId} on ${hatId}: ${r.reason}`);
      continue;
    }
    calendar = r.calendar;
    booked.push({ block, gate: "runtime_validation" as GateKind });
  }
  return { calendar, booked, refusals };
}
