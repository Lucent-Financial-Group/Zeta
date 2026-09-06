/**
 * schedule-pressure.test.ts — is this hat's week survivable, and if not, what changes?
 *
 * The calendar could already say a week was conflict-free. It could not say the week was
 * impossible. These tests pin the difference — and the rule that keeps a score from becoming a
 * dashboard: every reading carries the corrective it implies, and every corrective names an
 * authority that can actually perform it.
 */

import { describe, expect, test } from "bun:test";
import {
  authorityFor,
  Corrective,
  MEETING_SHARE_LIMIT,
  MISSED_RATE_LIMIT,
  pressureBoard,
  schedulePressure,
  type PressureInput,
} from "./schedule-pressure";
import { EMPTY_CALENDAR, ScheduleBlockState, ScheduleBlockType, type Calendar, type ScheduleBlock } from "./work-schedule";
import { buildOrgChart } from "./org-chart";
import { SEED_HATS } from "./org-seed";
import { WorkState, WorkType, type Cascade } from "./goal-cascade";
import { PriorityClass, type PriorityDecision } from "./prioritization";
import { eligibleVoters } from "./rmo";

const chart = (() => {
  const r = buildOrgChart(SEED_HATS);
  if (!r.ok) throw new Error(r.reason);
  return r.chart;
})();

const HAT = "backend_implementer";
const HOUR = 3_600_000;

let blockSeq = 0;
/**
 * A block of `hours`, starting at zero.
 *
 * Duration rather than start/end on purpose: an earlier version derived `startMs` from a
 * file-wide counter, so a test overriding only `endMs` produced a block whose start was AFTER its
 * end — a negative span, silently clamped to zero, which made a calendar full of meetings report a
 * meeting share of 0.
 */
const block = (over: Partial<ScheduleBlock> & { readonly hours?: number } = {}): ScheduleBlock => {
  blockSeq += 1;
  const { hours, ...rest } = over;
  return {
    blockId: `b-${blockSeq}`,
    hatId: HAT,
    blockType: ScheduleBlockType.PrioritizedWork,
    startMs: 0,
    endMs: (hours ?? 1) * HOUR,
    state: ScheduleBlockState.Scheduled,
    ...rest,
  };
};

const calendar = (...blocks: ScheduleBlock[]): Calendar => ({ blocks });

const leaf = (workId: string, over: Partial<Cascade["nodes"][number]> = {}) => ({
  workId,
  workType: WorkType.Task,
  title: workId,
  state: WorkState.Open,
  ownerHatId: "tech_lead",
  parentWorkId: "p1",
  assigneeHatId: HAT,
  ...over,
});

const cascade = (...nodes: Cascade["nodes"][number][]): Cascade => ({
  nodes: [
    { workId: "p1", workType: WorkType.Project, title: "p", state: WorkState.InProgress, ownerHatId: "engineering_manager" },
    ...nodes,
  ],
});

const priority = (workId: string, priorityClass: PriorityClass): PriorityDecision => ({
  workId,
  priorityClass,
  decidedByHatId: "cto",
  reason: "r",
  recommended: PriorityClass.Normal,
  reasonCodes: [],
});

const input = (over: Partial<PressureInput> = {}): PressureInput => ({
  chart,
  calendar: calendar(block()),
  cascade: cascade(),
  supply: { cascade: cascade(), priorities: [] },
  currentWearers: 1,
  ...over,
});

describe("A HAT WITH NO CALENDAR HAS NO READING", () => {
  test("undefined, not zero — a schedule nobody wrote is not a comfortable one", () => {
    // Zero would claim the week is fine, which is a statement about a calendar that does not exist.
    expect(schedulePressure(HAT, input({ calendar: EMPTY_CALENDAR }))).toBeUndefined();
  });

  test("a hat with blocks gets a reading even when everything is fine", () => {
    const p = schedulePressure(HAT, input());
    expect(p).toBeDefined();
    expect(p?.score).toBe(0);
    expect(p?.correctives).toEqual([]);
  });
});

describe("capacity: short of PEOPLE", () => {
  test("work beyond one wearer's load asks the RMO to expand", () => {
    const c = cascade(leaf("t1"), leaf("t2"), leaf("t3"), leaf("t4"));
    const ps = ["t1", "t2", "t3", "t4"].map((id) => priority(id, PriorityClass.Expedite));
    const p = schedulePressure(
      HAT,
      input({
        cascade: c,
        supply: { cascade: c, priorities: ps },
        currentWearers: 1,
        // Ample time booked, so the pressure is about headcount and not about hours.
        calendar: calendar(block({ hours: 100 })),
      }),
    );
    expect(p?.components.requiredWearers).toBe(2);
    expect(p?.correctives).toContain(Corrective.ExpandSupply);
    expect(p?.score).toBeGreaterThan(0);
  });

  test("enough wearers for the work is no supply pressure", () => {
    const c = cascade(leaf("t1"), leaf("t2"));
    const ps = ["t1", "t2"].map((id) => priority(id, PriorityClass.Expedite));
    const p = schedulePressure(
      HAT,
      input({ cascade: c, supply: { cascade: c, priorities: ps }, currentWearers: 5, calendar: calendar(block({ hours: 100 })) }),
    );
    expect(p?.correctives).not.toContain(Corrective.ExpandSupply);
  });
});

describe("capacity: short of TIME with the people it has", () => {
  test("no work time booked against open work is MAXIMUM pressure, not zero", () => {
    // Dividing by zero booked hours would have made the worst case look like the best.
    const c = cascade(leaf("t1"));
    const p = schedulePressure(
      HAT,
      input({
        cascade: c,
        supply: { cascade: c, priorities: [] },
        currentWearers: 9,
        calendar: calendar(block({ blockType: ScheduleBlockType.Reflection })),
      }),
    );
    expect(p?.score).toBe(1);
    expect(p?.correctives).toContain(Corrective.Reprioritize);
    expect(p?.correctives).toContain(Corrective.DeferWork);
  });

  test("REVIEW AND REFLECTION ARE NOT QUEUE CAPACITY", () => {
    // Real work, but not time for the hat's OWN items — counting them would hide a hat with no
    // time for the queue behind a full-looking calendar.
    const c = cascade(leaf("t1"));
    const busyWithOther = schedulePressure(
      HAT,
      input({
        cascade: c,
        supply: { cascade: c, priorities: [] },
        currentWearers: 9,
        calendar: calendar(
          block({ blockType: ScheduleBlockType.Review, hours: 50 }),
          block({ blockType: ScheduleBlockType.MemoryMaintenance, hours: 60 }),
        ),
      }),
    );
    expect(busyWithOther?.components.workMs).toBe(0);
    expect(busyWithOther?.score).toBe(1);
  });

  test("ample booked work time against little work is no time pressure", () => {
    const c = cascade(leaf("t1"));
    const p = schedulePressure(
      HAT,
      input({ cascade: c, supply: { cascade: c, priorities: [] }, currentWearers: 9, calendar: calendar(block({ hours: 100 })) }),
    );
    expect(p?.correctives).not.toContain(Corrective.Reprioritize);
  });

  test("FINISHED work is not open work", () => {
    // Counting delivered items as load would keep a hat under pressure for work it has already
    // done, and keep asking for people to do it again.
    const c = cascade(leaf("t1", { state: WorkState.Done }), leaf("t2", { state: WorkState.Canceled }));
    const p = schedulePressure(
      HAT,
      input({ cascade: c, supply: { cascade: c, priorities: [] }, currentWearers: 1, calendar: calendar(block()) }),
    );
    expect(p?.components.openWork).toBe(0);
    expect(p?.score).toBe(0);
    expect(p?.correctives).toEqual([]);
  });

  test("no open work is no time pressure however little is booked", () => {
    const p = schedulePressure(HAT, input({ calendar: calendar(block({ blockType: ScheduleBlockType.Meeting })) }));
    expect(p?.components.openWork).toBe(0);
    expect(p?.correctives).not.toContain(Corrective.DeferWork);
  });
});

describe("meetings", () => {
  test("a hat mostly in meetings is told to give the time back", () => {
    const p = schedulePressure(
      HAT,
      input({
        calendar: calendar(
          block({ blockType: ScheduleBlockType.Meeting, hours: 9 }),
          block({ blockType: ScheduleBlockType.PrioritizedWork, hours: 1 }),
        ),
      }),
    );
    expect(p?.components.meetingShare).toBeGreaterThan(MEETING_SHARE_LIMIT);
    expect(p?.correctives).toContain(Corrective.ReduceMeetingLoad);
  });

  test("a normal meeting load is not a corrective", () => {
    const p = schedulePressure(
      HAT,
      input({
        calendar: calendar(
          block({ blockType: ScheduleBlockType.Meeting }),
          block({ blockType: ScheduleBlockType.PrioritizedWork, hours: 10 }),
        ),
      }),
    );
    expect(p?.correctives).not.toContain(Corrective.ReduceMeetingLoad);
  });
});

describe("reliability is a DIFFERENT problem from capacity", () => {
  test("a hat that does not keep its blocks is reviewed, not staffed", () => {
    // Adding people to a hat that misses its calendar adds absent people.
    const p = schedulePressure(
      HAT,
      input({
        calendar: calendar(
          block({ state: ScheduleBlockState.Missed }),
          block({ state: ScheduleBlockState.Missed }),
          block({ state: ScheduleBlockState.Completed }),
        ),
      }),
    );
    expect(p?.components.missedRate).toBeGreaterThan(MISSED_RATE_LIMIT);
    expect(p?.correctives).toContain(Corrective.ReviewReliability);
    // ...and it is NOT a supply ask, because nothing about the workload changed.
    expect(p?.correctives).not.toContain(Corrective.ExpandSupply);
  });

  test("a kept calendar raises no reliability corrective", () => {
    const p = schedulePressure(HAT, input({ calendar: calendar(block({ state: ScheduleBlockState.Completed })) }));
    expect(p?.correctives).not.toContain(Corrective.ReviewReliability);
  });
});

describe("EVERY CORRECTIVE NAMES AN AUTHORITY", () => {
  test("supply goes to the RMO's voters; the rest follows the reporting line", () => {
    // A corrective nobody may perform is a complaint.
    expect(authorityFor(chart, HAT, Corrective.ExpandSupply)).toEqual([...eligibleVoters(chart, HAT)]);
    const schedulers = authorityFor(chart, HAT, Corrective.Reprioritize);
    expect(schedulers.length).toBeGreaterThan(0);
    expect(schedulers).not.toContain(HAT);
    // The two lists differ — supply and scheduling are not the same authority.
    expect(schedulers).not.toEqual([...eligibleVoters(chart, HAT)]);
  });

  test("every corrective a real reading produces has someone who can act on it", () => {
    const c = cascade(leaf("t1"), leaf("t2"), leaf("t3"), leaf("t4"));
    const ps = ["t1", "t2", "t3", "t4"].map((id) => priority(id, PriorityClass.Expedite));
    const p = schedulePressure(
      HAT,
      input({
        cascade: c,
        supply: { cascade: c, priorities: ps },
        currentWearers: 1,
        calendar: calendar(block({ blockType: ScheduleBlockType.Meeting, hours: 9 }), block({ state: ScheduleBlockState.Missed })),
      }),
    );
    expect(p!.correctives.length).toBeGreaterThan(1);
    for (const corrective of p!.correctives) {
      expect(authorityFor(chart, HAT, corrective).length).toBeGreaterThan(0);
    }
  });
});

describe("the board", () => {
  test("only hats under pressure appear, worst first", () => {
    const c = cascade(leaf("t1"), leaf("t2"), leaf("t3"), leaf("t4"));
    const ps = ["t1", "t2", "t3", "t4"].map((id) => priority(id, PriorityClass.Expedite));
    const board = pressureBoard(
      [HAT, "frontend_implementer"],
      input({
        cascade: c,
        supply: { cascade: c, priorities: ps },
        currentWearers: 1,
        calendar: calendar(
          block({ hatId: HAT, blockType: ScheduleBlockType.Reflection }),
          block({ hatId: "frontend_implementer", hours: 100 }),
        ),
      }),
    );
    // Only the hat with a problem is listed — a board that lists everyone is a roster.
    expect(board.map((p) => p.hatId)).toEqual([HAT]);
  });

  test("a hat with no calendar is absent from the board rather than scored zero", () => {
    expect(pressureBoard(["ghost"], input()).map((p) => p.hatId)).toEqual([]);
  });

  test("the ordering is total — ties break on the hat id", () => {
    const c = cascade(leaf("t1", { assigneeHatId: HAT }), leaf("t2", { assigneeHatId: "frontend_implementer" }));
    // Passed in REVERSE, so a stable sort with no tie-break would leave frontend first.
    const board = pressureBoard(
      ["frontend_implementer", HAT],
      input({
        cascade: c,
        supply: { cascade: c, priorities: [] },
        currentWearers: 0,
        calendar: calendar(
          block({ hatId: HAT, blockType: ScheduleBlockType.Reflection }),
          block({ hatId: "frontend_implementer", blockType: ScheduleBlockType.Reflection }),
        ),
      }),
    );
    expect(board.map((p) => p.hatId)).toEqual(["backend_implementer", "frontend_implementer"]);
  });
});
