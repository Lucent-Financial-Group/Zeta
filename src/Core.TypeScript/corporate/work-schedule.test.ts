import { describe, expect, test } from "bun:test";
import {
  blockAt,
  cadenceOwnerLevel,
  conflictsFor,
  EMPTY_CALENDAR,
  firstCommonFreeSlot,
  intervalsOverlap,
  isBusy,
  markMissed,
  maySetCadence,
  mayAdjustSchedule,
  meetingLegs,
  occupies,
  scheduleBlock,
  scheduleMeeting,
  ScheduleBlockState,
  ScheduleBlockType,
  setBlockState,
  type Calendar,
  type ScheduleBlock,
} from "./work-schedule";
import { buildOrgChart } from "./org-chart";
import { SEED_HATS } from "./org-seed";

const H = 3_600_000;
const T9 = 0; // treat 0 as "09:00" — all times are relative and passed in, never read from a clock.

const block = (over: Partial<ScheduleBlock> & Pick<ScheduleBlock, "blockId" | "hatId">): ScheduleBlock => ({
  blockType: ScheduleBlockType.PrioritizedWork,
  startMs: T9,
  endMs: T9 + H,
  state: ScheduleBlockState.Scheduled,
  ...over,
});

const put = (cal: Calendar, b: ScheduleBlock): Calendar => {
  const r = scheduleBlock(cal, b);
  if (!r.ok) throw new Error(`expected the block to schedule, got: ${r.reason}`);
  return r.calendar;
};

const chart = (() => {
  const r = buildOrgChart(SEED_HATS);
  if (!r.ok) throw new Error(r.reason);
  return r.chart;
})();

describe("intervals are half-open", () => {
  test("back-to-back blocks do not collide", () => {
    // Closed intervals would make every adjacent pair an overlap, and a working day is adjacent
    // pairs all the way down.
    expect(intervalsOverlap(0, H, H, 2 * H)).toBe(false);
  });

  test("a shared instant is an overlap", () => {
    expect(intervalsOverlap(0, H, H - 1, 2 * H)).toBe(true);
  });

  test("containment counts, in both directions", () => {
    expect(intervalsOverlap(0, 4 * H, H, 2 * H)).toBe(true);
    expect(intervalsOverlap(H, 2 * H, 0, 4 * H)).toBe(true);
  });
});

describe("only some states hold the slot", () => {
  test("scheduled, active and paused occupy; the rest are history", () => {
    expect(occupies(ScheduleBlockState.Scheduled)).toBe(true);
    expect(occupies(ScheduleBlockState.Active)).toBe(true);
    expect(occupies(ScheduleBlockState.Paused)).toBe(true);
    expect(occupies(ScheduleBlockState.Completed)).toBe(false);
    expect(occupies(ScheduleBlockState.Canceled)).toBe(false);
    expect(occupies(ScheduleBlockState.Missed)).toBe(false);
  });

  test("a canceled block frees its slot", () => {
    let cal = put(EMPTY_CALENDAR, block({ blockId: "b1", hatId: "tech_lead" }));
    expect(scheduleBlock(cal, block({ blockId: "b2", hatId: "tech_lead" })).ok).toBe(false);

    const canceled = setBlockState(cal, "b1", ScheduleBlockState.Canceled);
    expect(canceled.ok).toBe(true);
    if (!canceled.ok) return;
    cal = canceled.calendar;
    // Without this, a calendar fills up with finished work and never empties.
    expect(scheduleBlock(cal, block({ blockId: "b2", hatId: "tech_lead" })).ok).toBe(true);
  });
});

describe("the overlap refusal is what makes the schedule authority", () => {
  test("a second overlapping block is refused, and the refusal names the clash", () => {
    const cal = put(EMPTY_CALENDAR, block({ blockId: "b1", hatId: "backend_implementer" }));
    const r = scheduleBlock(cal, block({ blockId: "b2", hatId: "backend_implementer", startMs: T9 + H / 2 }));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toContain("b1");
  });

  test("a different hat is not blocked by the first hat's day", () => {
    const cal = put(EMPTY_CALENDAR, block({ blockId: "b1", hatId: "backend_implementer" }));
    expect(scheduleBlock(cal, block({ blockId: "b2", hatId: "frontend_implementer" })).ok).toBe(true);
  });

  test("a ZERO-WIDTH block is refused", () => {
    // It overlaps nothing by construction, so it would pass every conflict check ever run against
    // it while still appearing on the calendar — a booking that occupies no instant.
    const r = scheduleBlock(EMPTY_CALENDAR, block({ blockId: "z", hatId: "sre", endMs: T9 }));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toContain("occupy no instant");
  });

  test("a reversed interval is refused", () => {
    expect(scheduleBlock(EMPTY_CALENDAR, block({ blockId: "z", hatId: "sre", endMs: T9 - H })).ok).toBe(false);
  });

  test("a duplicate block id is refused", () => {
    const cal = put(EMPTY_CALENDAR, block({ blockId: "b1", hatId: "sre" }));
    const r = scheduleBlock(cal, block({ blockId: "b1", hatId: "qa_engineer" }));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toContain("duplicate");
  });

  test("a non-occupying block may be added over a busy slot", () => {
    // Recording that something was completed or missed must not be blocked by what is booked now.
    const cal = put(EMPTY_CALENDAR, block({ blockId: "b1", hatId: "sre" }));
    const r = scheduleBlock(cal, block({ blockId: "b2", hatId: "sre", state: ScheduleBlockState.Completed }));
    expect(r.ok).toBe(true);
  });
});

describe("what is this hat doing right now", () => {
  const cal = put(EMPTY_CALENDAR, block({ blockId: "b1", hatId: "qa_engineer", blockType: ScheduleBlockType.Review }));

  test("inside the window it is busy, and the block says what with", () => {
    expect(isBusy(cal, "qa_engineer", T9 + 1)).toBe(true);
    expect(blockAt(cal, "qa_engineer", T9 + 1)?.blockType).toBe(ScheduleBlockType.Review);
  });

  test("the end is exclusive", () => {
    expect(isBusy(cal, "qa_engineer", T9 + H - 1)).toBe(true);
    expect(isBusy(cal, "qa_engineer", T9 + H)).toBe(false);
  });

  test("the start is inclusive", () => {
    expect(isBusy(cal, "qa_engineer", T9)).toBe(true);
  });

  test("a hat with no calendar is not busy", () => {
    expect(isBusy(cal, "ceo", T9 + 1)).toBe(false);
  });

  test("free time counts as busy — it is bounded exploration, not a gap", () => {
    const ft = put(EMPTY_CALENDAR, block({ blockId: "f", hatId: "sre", blockType: ScheduleBlockType.FreeTime }));
    expect(isBusy(ft, "sre", T9 + 1)).toBe(true);
    // …and the caller can still see what it is and decide to interrupt.
    expect(blockAt(ft, "sre", T9 + 1)?.blockType).toBe(ScheduleBlockType.FreeTime);
  });
});

describe("missed blocks", () => {
  test("a scheduled block whose window passed becomes missed", () => {
    const cal = put(EMPTY_CALENDAR, block({ blockId: "b1", hatId: "sre" }));
    const after = markMissed(cal, T9 + H);
    expect(after.blocks[0]?.state).toBe(ScheduleBlockState.Missed);
    // And it stops holding the slot, so the day can be re-planned.
    expect(isBusy(after, "sre", T9 + 1)).toBe(false);
  });

  test("a block still in its window is untouched", () => {
    const cal = put(EMPTY_CALENDAR, block({ blockId: "b1", hatId: "sre" }));
    expect(markMissed(cal, T9 + 1).blocks[0]?.state).toBe(ScheduleBlockState.Scheduled);
  });

  test("an ACTIVE block that overran is NOT marked missed", () => {
    // It started. Calling it missed would overwrite a fact with an inference.
    const cal = put(EMPTY_CALENDAR, block({ blockId: "b1", hatId: "sre", state: ScheduleBlockState.Active }));
    expect(markMissed(cal, T9 + 10 * H).blocks[0]?.state).toBe(ScheduleBlockState.Active);
  });
});

describe("meetings are atomic", () => {
  const req = {
    meetingId: "m1",
    attendeeHatIds: ["engineering_manager", "tech_lead", "backend_implementer"],
    blockIds: ["m1-a", "m1-b", "m1-c"],
    startMs: T9,
    endMs: T9 + H,
  };

  test("every attendee gets a leg, sharing one meeting id", () => {
    const r = scheduleMeeting(EMPTY_CALENDAR, req);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(meetingLegs(r.calendar, "m1")).toHaveLength(3);
    for (const hat of req.attendeeHatIds) expect(isBusy(r.calendar, hat, T9 + 1)).toBe(true);
  });

  test("ONE busy attendee refuses the WHOLE meeting — nobody is left half-booked", () => {
    // This is the property the whole function exists for. A partial booking is the worst outcome:
    // some attendees show up, others are elsewhere, and every calendar looks consistent.
    const busy = put(EMPTY_CALENDAR, block({ blockId: "x", hatId: "tech_lead" }));
    const r = scheduleMeeting(busy, req);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toContain("tech_lead");
  });

  test("a refused meeting leaves the calendar EXACTLY as it was", () => {
    const busy = put(EMPTY_CALENDAR, block({ blockId: "x", hatId: "tech_lead" }));
    const r = scheduleMeeting(busy, req);
    expect(r.ok).toBe(false);
    // The first attendee comes BEFORE the busy one, so a non-atomic implementation would have
    // already written its leg. This is the assertion that catches that.
    expect(busy.blocks).toHaveLength(1);
    expect(isBusy(busy, "engineering_manager", T9 + 1)).toBe(false);
  });

  test("a one-attendee meeting is refused", () => {
    const r = scheduleMeeting(EMPTY_CALENDAR, { ...req, attendeeHatIds: ["ceo"], blockIds: ["only"] });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toContain("two attendees");
  });

  test("a duplicated attendee is refused", () => {
    const r = scheduleMeeting(EMPTY_CALENDAR, {
      ...req,
      attendeeHatIds: ["ceo", "ceo"],
      blockIds: ["a", "b"],
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toContain("twice");
  });

  test("a block-id count mismatch is refused", () => {
    const r = scheduleMeeting(EMPTY_CALENDAR, { ...req, blockIds: ["only-one"] });
    expect(r.ok).toBe(false);
  });
});

describe("finding a time everyone is free", () => {
  test("the first common slot skips over what is booked", () => {
    let cal = put(EMPTY_CALENDAR, block({ blockId: "a", hatId: "cto", startMs: T9, endMs: T9 + H }));
    cal = put(cal, block({ blockId: "b", hatId: "ceo", startMs: T9 + H, endMs: T9 + 2 * H }));
    // CTO busy 0–1h, CEO busy 1h–2h, so the first hour both are free starts at 2h.
    const slot = firstCommonFreeSlot(cal, ["cto", "ceo"], T9, T9 + 8 * H, H, H);
    expect(slot).toBe(T9 + 2 * H);
  });

  test("no common slot returns undefined rather than a near miss", () => {
    let cal = put(EMPTY_CALENDAR, block({ blockId: "a", hatId: "cto", startMs: T9, endMs: T9 + 8 * H }));
    cal = put(cal, block({ blockId: "b", hatId: "ceo", startMs: T9, endMs: T9 + 8 * H }));
    expect(firstCommonFreeSlot(cal, ["cto", "ceo"], T9, T9 + 8 * H, H, H)).toBeUndefined();
  });

  test("a slot that would run past the window is not offered", () => {
    // The last candidate start is `untilMs - durationMs`; offering later would book past the bound.
    expect(firstCommonFreeSlot(EMPTY_CALENDAR, ["cto"], T9, T9 + H, 2 * H, H)).toBeUndefined();
    expect(firstCommonFreeSlot(EMPTY_CALENDAR, ["cto"], T9, T9 + 2 * H, 2 * H, H)).toBe(T9);
  });

  test("degenerate inputs return undefined, not a slot", () => {
    expect(firstCommonFreeSlot(EMPTY_CALENDAR, [], T9, T9 + H, H, H)).toBeUndefined();
    expect(firstCommonFreeSlot(EMPTY_CALENDAR, ["cto"], T9, T9 + H, 0, H)).toBeUndefined();
    expect(firstCommonFreeSlot(EMPTY_CALENDAR, ["cto"], T9, T9 + H, H, 0)).toBeUndefined();
  });

  test("the slot it returns is actually bookable", () => {
    // The end-to-end property: what the finder offers, the scheduler accepts.
    const cal = put(EMPTY_CALENDAR, block({ blockId: "a", hatId: "cto", startMs: T9, endMs: T9 + H }));
    const slot = firstCommonFreeSlot(cal, ["cto", "ceo"], T9, T9 + 8 * H, H, H);
    expect(slot).toBeDefined();
    const r = scheduleMeeting(cal, {
      meetingId: "m",
      attendeeHatIds: ["cto", "ceo"],
      blockIds: ["m-a", "m-b"],
      startMs: slot!,
      endMs: slot! + H,
    });
    expect(r.ok).toBe(true);
  });
});

describe("schedule ownership follows the reporting line, not rank", () => {
  test("a supervisor may adjust a subordinate's schedule", () => {
    expect(mayAdjustSchedule(chart, "engineering_manager", "backend_implementer")).toBe(true);
    expect(mayAdjustSchedule(chart, "cto", "backend_implementer")).toBe(true);
  });

  test("a hat may always adjust its own", () => {
    expect(mayAdjustSchedule(chart, "backend_implementer", "backend_implementer")).toBe(true);
  });

  test("a subordinate may NOT adjust its supervisor's", () => {
    expect(mayAdjustSchedule(chart, "backend_implementer", "engineering_manager")).toBe(false);
  });

  test("rank alone does not grant it — a director cannot rearrange another department", () => {
    // This is the check that makes it a graph question. `engineering_director` outranks the QA
    // engineer and is not in its line, so it has no say in its day.
    expect(mayAdjustSchedule(chart, "engineering_director", "qa_engineer")).toBe(false);
    expect(mayAdjustSchedule(chart, "qa_manager", "qa_engineer")).toBe(true);
  });

  test("unknown hats never grant authority", () => {
    expect(mayAdjustSchedule(chart, "ghost", "qa_engineer")).toBe(false);
    expect(mayAdjustSchedule(chart, "ceo", "ghost")).toBe(false);
  });
});

describe("cadence ownership", () => {
  test("review and reporting cadence is a C-suite posture", () => {
    expect(cadenceOwnerLevel(ScheduleBlockType.Review)).toBe("c_suite");
    expect(maySetCadence("c_suite", ScheduleBlockType.Review)).toBe(true);
    expect(maySetCadence("manager", ScheduleBlockType.Review)).toBe(false);
  });

  test("day-to-day work sequencing is a manager's", () => {
    expect(cadenceOwnerLevel(ScheduleBlockType.PrioritizedWork)).toBe("manager");
    expect(maySetCadence("manager", ScheduleBlockType.PrioritizedWork)).toBe(true);
    // Seniority is sufficient — a director may set what a manager may set.
    expect(maySetCadence("director", ScheduleBlockType.PrioritizedWork)).toBe(true);
    expect(maySetCadence("individual_contributor", ScheduleBlockType.PrioritizedWork)).toBe(false);
  });

  test("every block type has an owner — the table is total", () => {
    for (const t of Object.values(ScheduleBlockType)) {
      expect(cadenceOwnerLevel(t)).toBeDefined();
    }
  });
});

describe("conflictsFor", () => {
  test("reports only occupying, overlapping blocks for that hat", () => {
    let cal = put(EMPTY_CALENDAR, block({ blockId: "a", hatId: "sre", startMs: T9, endMs: T9 + H }));
    cal = put(cal, block({ blockId: "b", hatId: "sre", startMs: T9 + 2 * H, endMs: T9 + 3 * H }));
    cal = put(cal, block({ blockId: "c", hatId: "qa_engineer", startMs: T9, endMs: T9 + H }));
    const clashes = conflictsFor(cal, "sre", T9 + H / 2, T9 + H);
    expect(clashes.map((b) => b.blockId)).toEqual(["a"]);
  });
});
