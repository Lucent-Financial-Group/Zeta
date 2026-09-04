/**
 * corporate/work-schedule.ts — the clock a hat runs on. What it is doing now, and whether it is free.
 *
 * ── THE GAP THIS CLOSES ──────────────────────────────────────────────────────
 * Nothing of this existed in the canonical package. `grep -r ScheduleBlock src/Core.TypeScript`
 * returned zero. There is a `clock/` module (tick codecs) and a `tick-dial/`, but no notion of an
 * agent having a *rhythm* — no working hours, no busy, no meetings, no way to ask "what is this hat
 * supposed to be doing right now".
 *
 * The corporate register treats that as the centre of the runtime, not as calendar decoration
 * (`AGENT_WORK_RHYTHM_AND_PROMPT_FLOWS.md`):
 *
 *   > This schedule is not just calendar metadata. It is part of runtime authority.
 *
 * and it names the mechanism that makes it authority rather than a note:
 *
 *   > Persistence rejects overlapping scheduled or active blocks for the same hat assignment.
 *
 * That refusal is the whole design. A calendar that accepts overlaps cannot answer "is this hat
 * busy", because the honest answer becomes "in three ways at once" — and every downstream question
 * (may it take this work, can it attend, is it late) inherits the ambiguity.
 *
 * ── TIME IS PASSED IN, NEVER READ ────────────────────────────────────────────
 * No function here reads a clock. `atMs` is an argument at every call site, because
 * `.claude/rules/local-time-never-enters-the-shared-fold.md` is explicit that a node's wall-clock
 * steers local behaviour and must never enter shared evidence — and a schedule IS shared evidence:
 * two hats must agree about whether a meeting is happening. Reading `Date.now()` in here would make
 * the answer depend on which machine asked.
 */

import type { HatLevel, OrgChart } from "./org-chart";
import { LEVEL_RANK, reportsUpTo } from "./org-chart";

/**
 * What a block is for. The eight from the reference table, verbatim — including `free_time`, which
 * the doc is careful to say *"is not idle time. It is bounded exploration."*
 */
export const ScheduleBlockType = {
  PrioritizedWork: "prioritized_work",
  PromptFlowExecution: "prompt_flow_execution",
  Review: "review",
  Reflection: "reflection",
  MemoryMaintenance: "memory_maintenance",
  FreeTime: "free_time",
  Meeting: "meeting",
  Reporting: "reporting",
} as const;

export type ScheduleBlockType = (typeof ScheduleBlockType)[keyof typeof ScheduleBlockType];

export const ScheduleBlockState = {
  Scheduled: "scheduled",
  Active: "active",
  Paused: "paused",
  Completed: "completed",
  Canceled: "canceled",
  Missed: "missed",
} as const;

export type ScheduleBlockState = (typeof ScheduleBlockState)[keyof typeof ScheduleBlockState];

/**
 * The states that HOLD THE SLOT.
 *
 * `scheduled` and `active` occupy, exactly as the reference says. `paused` occupies too: a paused
 * block is one the hat intends to resume, and letting something else be booked over it would mean
 * the resume lands on a slot already taken.
 *
 * `completed`, `canceled` and `missed` do NOT occupy — they are history. A calendar in which
 * yesterday's finished work still blocks today is a calendar that fills up and never empties.
 */
const OCCUPYING: ReadonlySet<ScheduleBlockState> = new Set([
  ScheduleBlockState.Scheduled,
  ScheduleBlockState.Active,
  ScheduleBlockState.Paused,
]);

export function occupies(state: ScheduleBlockState): boolean {
  return OCCUPYING.has(state);
}

/**
 * One block on one hat's calendar.
 *
 * The interval is HALF-OPEN — `[startMs, endMs)`. Back-to-back blocks (10:00–11:00 and 11:00–12:00)
 * therefore do not collide, which is how a working day is actually laid out. Closed intervals would
 * make every adjacent pair an overlap and force artificial gaps.
 */
export interface ScheduleBlock {
  readonly blockId: string;
  readonly hatId: string;
  readonly blockType: ScheduleBlockType;
  readonly startMs: number;
  /** Exclusive. */
  readonly endMs: number;
  readonly state: ScheduleBlockState;
  /** The work this block is against, when it is against work. */
  readonly workItemId?: string;
  /** Set on every leg of a meeting — the same id on each attendee's block. */
  readonly meetingId?: string;
  /** The artifact this block deliberates on (`discussion-anchor.ts`). */
  readonly anchorId?: string;
}

/** A calendar is just the blocks. Kept as a value so a schedule can be folded, replayed and diffed. */
export interface Calendar {
  readonly blocks: readonly ScheduleBlock[];
}

export const EMPTY_CALENDAR: Calendar = { blocks: [] };

export type ScheduleResult =
  | { readonly ok: true; readonly calendar: Calendar }
  | { readonly ok: false; readonly reason: string };

/** Half-open overlap: `[aStart, aEnd)` and `[bStart, bEnd)` share at least one instant. */
export function intervalsOverlap(aStart: number, aEnd: number, bStart: number, bEnd: number): boolean {
  return aStart < bEnd && bStart < aEnd;
}

/** Every block on this hat's calendar, occupying or not. */
export function blocksFor(calendar: Calendar, hatId: string): readonly ScheduleBlock[] {
  return calendar.blocks.filter((b) => b.hatId === hatId);
}

/**
 * The occupying block covering `atMs`, if any.
 *
 * At most one can exist — that is what `scheduleBlock` refuses to violate, and it is why this can
 * return a single block rather than a list. If it could return several, "what is this hat doing"
 * would have no answer.
 */
export function blockAt(calendar: Calendar, hatId: string, atMs: number): ScheduleBlock | undefined {
  return calendar.blocks.find(
    (b) => b.hatId === hatId && occupies(b.state) && b.startMs <= atMs && atMs < b.endMs,
  );
}

/**
 * Is this hat busy at `atMs`?
 *
 * `free_time` counts as BUSY, and that is deliberate rather than a quirk. The reference is explicit
 * that free time is bounded exploration the hat is genuinely doing, not a gap — so booking a meeting
 * over it is taking something, and the taking should be a decision someone makes rather than a slot
 * the calendar quietly hands out. A caller that wants "free time is interruptible" can ask
 * `blockAt(...)?.blockType` and decide; a caller that cannot see the block cannot decide anything.
 */
export function isBusy(calendar: Calendar, hatId: string, atMs: number): boolean {
  return blockAt(calendar, hatId, atMs) !== undefined;
}

/** Occupying blocks for this hat that overlap the window. */
export function conflictsFor(
  calendar: Calendar,
  hatId: string,
  startMs: number,
  endMs: number,
): readonly ScheduleBlock[] {
  return calendar.blocks.filter(
    (b) => b.hatId === hatId && occupies(b.state) && intervalsOverlap(b.startMs, b.endMs, startMs, endMs),
  );
}

/**
 * Add a block, or REFUSE.
 *
 * The refusals, and what each one prevents:
 *
 *   - **duplicate id** — two blocks answering to one name; a cancel would hit whichever came first.
 *   - **empty or reversed interval** — `endMs <= startMs` never overlaps anything (see
 *     `intervalsOverlap`), so a zero-width block is a booking that occupies nothing while appearing
 *     on the calendar. It would pass every conflict check ever run against it.
 *   - **overlap with an occupying block** — the reference's own rule, and the one that makes
 *     "is this hat busy" answerable.
 */
export function scheduleBlock(calendar: Calendar, block: ScheduleBlock): ScheduleResult {
  if (calendar.blocks.some((b) => b.blockId === block.blockId)) {
    return { ok: false, reason: `duplicate block id '${block.blockId}'` };
  }
  if (!Number.isFinite(block.startMs) || !Number.isFinite(block.endMs)) {
    return { ok: false, reason: `block '${block.blockId}' has a non-finite bound` };
  }
  if (block.endMs <= block.startMs) {
    return {
      ok: false,
      reason: `block '${block.blockId}' ends at or before it starts (${block.startMs}..${block.endMs}) — it would occupy no instant and collide with nothing`,
    };
  }
  if (occupies(block.state)) {
    const clash = conflictsFor(calendar, block.hatId, block.startMs, block.endMs)[0];
    if (clash !== undefined) {
      return {
        ok: false,
        reason: `hat '${block.hatId}' is already booked ${clash.startMs}..${clash.endMs} by '${clash.blockId}' (${clash.blockType})`,
      };
    }
  }
  return { ok: true, calendar: { blocks: [...calendar.blocks, block] } };
}

/** Replace one block's state. Refuses an unknown id rather than silently doing nothing. */
export function setBlockState(calendar: Calendar, blockId: string, state: ScheduleBlockState): ScheduleResult {
  if (!calendar.blocks.some((b) => b.blockId === blockId)) {
    return { ok: false, reason: `no block '${blockId}'` };
  }
  return {
    ok: true,
    calendar: { blocks: calendar.blocks.map((b) => (b.blockId === blockId ? { ...b, state } : b)) },
  };
}

/**
 * Mark as `missed` every `scheduled` block whose window has fully passed.
 *
 * Without this a schedule only ever records intent. `missed` is what makes it a record of what the
 * organization actually did — and it is the input the reference's review cadence needs, since
 * "schedule reliability" is not measurable if a block that never ran still reads as `scheduled`.
 *
 * `active` and `paused` are deliberately untouched: a block that started is the hat's to finish or
 * abandon, and calling it missed would overwrite a fact with an inference.
 */
export function markMissed(calendar: Calendar, nowMs: number): Calendar {
  return {
    blocks: calendar.blocks.map((b) =>
      b.state === ScheduleBlockState.Scheduled && b.endMs <= nowMs ? { ...b, state: ScheduleBlockState.Missed } : b,
    ),
  };
}

// ─── Meetings ───────────────────────────────────────────────────────────────

export interface MeetingRequest {
  readonly meetingId: string;
  readonly attendeeHatIds: readonly string[];
  readonly startMs: number;
  readonly endMs: number;
  /** Block ids, one per attendee, in attendee order. */
  readonly blockIds: readonly string[];
  readonly workItemId?: string;
  readonly anchorId?: string;
}

/**
 * Book a meeting on EVERY attendee's calendar, or on none.
 *
 * Atomicity is the property that matters and the reason this is not a loop over `scheduleBlock` at
 * the call site. A partially-booked meeting is the worst outcome available: some attendees have it
 * on their calendar and will show up, the rest are booked elsewhere and will not, and nothing in the
 * data says the meeting is broken. Every attendee sees a consistent calendar and the meeting still
 * does not happen.
 *
 * So the write is all-or-nothing, and the refusal names *which* attendee was busy — because
 * "someone was busy" is not actionable and the organizer's next move is to ask that specific hat.
 */
export function scheduleMeeting(calendar: Calendar, request: MeetingRequest): ScheduleResult {
  if (request.attendeeHatIds.length < 2) {
    // A meeting with one attendee is a work block. Naming it a meeting would let a hat manufacture
    // an unavailability that no one else is party to.
    return { ok: false, reason: `meeting '${request.meetingId}' needs at least two attendees` };
  }
  if (new Set(request.attendeeHatIds).size !== request.attendeeHatIds.length) {
    return { ok: false, reason: `meeting '${request.meetingId}' lists an attendee twice` };
  }
  if (request.blockIds.length !== request.attendeeHatIds.length) {
    return {
      ok: false,
      reason: `meeting '${request.meetingId}' has ${request.blockIds.length} block ids for ${request.attendeeHatIds.length} attendees`,
    };
  }

  let next = calendar;
  for (let i = 0; i < request.attendeeHatIds.length; i += 1) {
    const hatId = request.attendeeHatIds[i];
    const blockId = request.blockIds[i];
    if (hatId === undefined || blockId === undefined) {
      return { ok: false, reason: `meeting '${request.meetingId}' has a hole in its attendee list` };
    }
    const leg: ScheduleBlock = {
      blockId,
      hatId,
      blockType: ScheduleBlockType.Meeting,
      startMs: request.startMs,
      endMs: request.endMs,
      state: ScheduleBlockState.Scheduled,
      meetingId: request.meetingId,
      ...(request.workItemId === undefined ? {} : { workItemId: request.workItemId }),
      ...(request.anchorId === undefined ? {} : { anchorId: request.anchorId }),
    };
    const step = scheduleBlock(next, leg);
    // Abandon `next` entirely on the first refusal — the earlier legs are discarded with it, which
    // is what makes this atomic. `next` is a local, so nothing outside has seen the partial state.
    if (!step.ok) return { ok: false, reason: `meeting '${request.meetingId}' refused: ${step.reason}` };
    next = step.calendar;
  }
  return { ok: true, calendar: next };
}

/** Every leg of a meeting, across all attendees. */
export function meetingLegs(calendar: Calendar, meetingId: string): readonly ScheduleBlock[] {
  return calendar.blocks.filter((b) => b.meetingId === meetingId);
}

/**
 * The earliest start at which every hat is simultaneously free for `durationMs`, searched on
 * `stepMs` boundaries within `[fromMs, untilMs)`.
 *
 * This is what lets agents schedule with each other rather than being scheduled: an organizer asks
 * the calendar when everyone is free instead of proposing times and collecting refusals.
 *
 * Returns `undefined` when there is no such slot — which is a real answer, and a different one from
 * "here is a time when most of them are free". A common slot that does not exist should not be
 * approximated; the organizer needs to shorten the meeting, drop an attendee, or look further out.
 */
export function firstCommonFreeSlot(
  calendar: Calendar,
  hatIds: readonly string[],
  fromMs: number,
  untilMs: number,
  durationMs: number,
  stepMs: number,
): number | undefined {
  if (hatIds.length === 0 || durationMs <= 0 || stepMs <= 0) return undefined;
  for (let start = fromMs; start + durationMs <= untilMs; start += stepMs) {
    const end = start + durationMs;
    if (hatIds.every((hatId) => conflictsFor(calendar, hatId, start, end).length === 0)) return start;
  }
  return undefined;
}

// ─── Schedule ownership ─────────────────────────────────────────────────────

/**
 * May `actorHatId` change `targetHatId`'s schedule?
 *
 * The reference puts schedule authority on the reporting line — *"A supervising hat can adjust a
 * schedule"* — so this is a graph question, not a level comparison. A director in Engineering does
 * not get to rearrange a QA engineer's day because it outranks them; it is not their supervisor.
 *
 * A hat may always adjust its own, which is the other half of the same doc: *"the agent should be
 * able to report that the schedule is causing slowdowns"*, and a hat with no say in its own day
 * cannot do that.
 */
export function mayAdjustSchedule(chart: OrgChart, actorHatId: string, targetHatId: string): boolean {
  if (!chart.byId.has(actorHatId) || !chart.byId.has(targetHatId)) return false;
  if (actorHatId === targetHatId) return true;
  // `reportsUpTo` is reflexive, so the self case above is what keeps this a strict-supervisor test.
  return reportsUpTo(chart, targetHatId, actorHatId);
}

/**
 * The level that owns cadence for a block type, per the reference's schedule-ownership table.
 *
 * Used to answer "who sets this rhythm" — org-wide review cadence is a C-suite posture, day-to-day
 * work sequencing is a manager's.
 */
export function cadenceOwnerLevel(blockType: ScheduleBlockType): HatLevel {
  switch (blockType) {
    // "Executive Board / C-suite — sets organization rhythm, review cadence, standards".
    case ScheduleBlockType.Review:
    case ScheduleBlockType.Reporting:
      return "c_suite";
    // "Directors — set department schedules and initiative staffing rhythm".
    case ScheduleBlockType.Reflection:
    case ScheduleBlockType.MemoryMaintenance:
      return "director";
    // "Engineering Managers / equivalent — set team schedules and individual adjustments".
    case ScheduleBlockType.PrioritizedWork:
    case ScheduleBlockType.PromptFlowExecution:
    case ScheduleBlockType.Meeting:
    case ScheduleBlockType.FreeTime:
      return "manager";
  }
  return assertNeverBlockType(blockType);
}

/** Exhaustiveness, enforced by the compiler: a new block type fails to typecheck here. */
function assertNeverBlockType(x: never): never {
  throw new Error(`unhandled schedule block type: ${String(x)}`);
}

/** Is `level` senior enough to set cadence for `blockType`? */
export function maySetCadence(level: HatLevel, blockType: ScheduleBlockType): boolean {
  return LEVEL_RANK[level] <= LEVEL_RANK[cadenceOwnerLevel(blockType)];
}
