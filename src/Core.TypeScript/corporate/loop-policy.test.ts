/**
 * loop-policy.test.ts — the register actually reaching the loop.
 *
 * The wiring test that matters: `createLoopRoom` is the REAL room the real loop builds, driven here
 * with a stub participant. If these pass, a hat's level and its calendar change what the loop can
 * pick — which is the thing that was not true of this codebase before, since `hatFilter` had no
 * production caller at all.
 */

import { describe, expect, test } from "bun:test";
import { bindWearerToLoop, createScheduleMenuPolicy, workIsInScopeDuring } from "./loop-policy";
import {
  advanceBinding,
  beginBinding,
  BindingPhase,
  DEFAULT_TTL_MS,
  DEFAULT_WARMUP_MS,
  revokeBinding,
} from "./hat-binding";
import { buildOrgChart } from "./org-chart";
import { SEED_HATS } from "./org-seed";
import {
  EMPTY_CALENDAR,
  scheduleBlock,
  ScheduleBlockState,
  ScheduleBlockType,
  type Calendar,
} from "./work-schedule";
import { createLoopRoom, GATE_REFUSED_ALL } from "../observe/run-loop-real";
import { authorityForLevel, hatFilter, SOVEREIGN } from "../observe/room/hat-gate";
import type { NextAction } from "../observe/observe";
import type { Participant } from "../observe/participant";
import type { World } from "../observe/observe";

const chart = (() => {
  const r = buildOrgChart(SEED_HATS);
  if (!r.ok) throw new Error(r.reason);
  return r.chart;
})();

const H = 3_600_000;

const MENU: readonly NextAction[] = [
  { kind: "do_item", item: { id: "081KPYCJH0008QG0R003MDS51N", title: "Work", ready: true, ambiguous: false } },
  { kind: "do_item", item: { id: "merge-pr-42", title: "Merge", ready: true, ambiguous: false } },
  { kind: "decompose", item: { id: "081KQ0YZ80008QG0R002T6TM7Z", title: "Big", ready: true, ambiguous: true } },
  { kind: "explore", reason: "curiosity" },
  { kind: "play", reason: "rest" },
  { kind: "edit_grammar", reason: "new action needed" },
  { kind: "respond_to_operator", reason: "operator spoke" },
];

const withBlock = (hatId: string, blockType: ScheduleBlockType): Calendar => {
  const r = scheduleBlock(EMPTY_CALENDAR, {
    blockId: "b1",
    hatId,
    blockType,
    startMs: 0,
    endMs: H,
    state: ScheduleBlockState.Scheduled,
  });
  if (!r.ok) throw new Error(r.reason);
  return r.calendar;
};

describe("what the schedule puts in scope", () => {
  test("work blocks admit work; meetings, free time and reflection do not", () => {
    expect(workIsInScopeDuring(ScheduleBlockType.PrioritizedWork)).toBe(true);
    expect(workIsInScopeDuring(ScheduleBlockType.PromptFlowExecution)).toBe(true);
    expect(workIsInScopeDuring(ScheduleBlockType.Review)).toBe(true);
    expect(workIsInScopeDuring(ScheduleBlockType.Meeting)).toBe(false);
    expect(workIsInScopeDuring(ScheduleBlockType.FreeTime)).toBe(false);
    expect(workIsInScopeDuring(ScheduleBlockType.Reflection)).toBe(false);
  });

  test("every block type has an answer — the table is total", () => {
    for (const t of Object.values(ScheduleBlockType)) {
      expect(typeof workIsInScopeDuring(t)).toBe("boolean");
    }
  });
});

describe("the schedule menu policy", () => {
  test("nothing scheduled narrows NOTHING", () => {
    // An organization that has not planned someone's day has not forbidden them to work.
    const policy = createScheduleMenuPolicy(EMPTY_CALENDAR, "backend_implementer", 1);
    expect(policy(MENU)).toHaveLength(MENU.length);
  });

  test("a prioritized-work block narrows nothing", () => {
    const cal = withBlock("backend_implementer", ScheduleBlockType.PrioritizedWork);
    expect(createScheduleMenuPolicy(cal, "backend_implementer", 1)(MENU)).toHaveLength(MENU.length);
  });

  test("DURING A MEETING, work items drop out", () => {
    const cal = withBlock("backend_implementer", ScheduleBlockType.Meeting);
    const narrowed = createScheduleMenuPolicy(cal, "backend_implementer", 1)(MENU);
    expect(narrowed.some((a) => a.kind === "do_item")).toBe(false);
    expect(narrowed.some((a) => a.kind === "decompose")).toBe(false);
  });

  test("…but the FREE MODES survive — the non-coercion floor", () => {
    // A calendar may say what work is in scope. It may not say that an agent must work.
    const cal = withBlock("backend_implementer", ScheduleBlockType.Meeting);
    const narrowed = createScheduleMenuPolicy(cal, "backend_implementer", 1)(MENU);
    expect(narrowed.map((a) => a.kind).sort()).toEqual(["explore", "play"]);
    expect(narrowed.length).toBeGreaterThan(0);
  });

  test("outside the block's window it narrows nothing again", () => {
    const cal = withBlock("backend_implementer", ScheduleBlockType.Meeting);
    // The end is exclusive, so at H the meeting is over.
    expect(createScheduleMenuPolicy(cal, "backend_implementer", H)(MENU)).toHaveLength(MENU.length);
  });

  test("another hat's meeting does not narrow THIS hat's menu", () => {
    const cal = withBlock("qa_engineer", ScheduleBlockType.Meeting);
    expect(createScheduleMenuPolicy(cal, "backend_implementer", 1)(MENU)).toHaveLength(MENU.length);
  });
});

// ─── The loop itself ────────────────────────────────────────────────────────

/** A participant that always takes the first option and records what it was shown. */
function recordingParticipant(): { participant: Participant; seen: NextAction[][] } {
  const seen: NextAction[][] = [];
  return {
    seen,
    participant: {
      kind: "oracle",
      name: "test",
      choose: async (_world: World, menu: readonly NextAction[]) => {
        seen.push([...menu]);
        return { index: 0, raw: "0", fallback: false };
      },
    } as unknown as Participant,
  };
}

/** The minimum world `buildMenu` needs to produce a menu with a ready backlog item. */
function worldWith(itemId: string): World {
  return {
    backlog: [{ id: itemId, title: "Work", ready: true, ambiguous: false }],
    operator: { pending: [] },
  } as unknown as World;
}

describe("the loop actually consults the gate — the wiring, not the module", () => {
  const ITEM = "081KPYCJH0008QG0R003MDS51N";

  test("an unhatted tick sees the full menu (sovereign, unchanged)", async () => {
    const { participant, seen } = recordingParticipant();
    const room = createLoopRoom({
      by: "t",
      dryRun: true,
      backlogIds: [ITEM],
      participant,
      deadlineMs: 5000,
      onChoose: () => {},
    });
    await room.tick(worldWith(ITEM));
    expect(seen).toHaveLength(1);
    // Every existing caller keeps today's behaviour: absent authority restricts nothing.
    expect(seen[0]!.length).toBeGreaterThan(0);
    expect(hatFilter(seen[0]!, SOVEREIGN)).toHaveLength(seen[0]!.length);
  });

  test("an IC is shown FEWER options than the board — the levels are no longer a label", async () => {
    const shownTo = async (level: Parameters<typeof authorityForLevel>[0]) => {
      const { participant, seen } = recordingParticipant();
      const room = createLoopRoom({
        by: "t",
        dryRun: true,
        backlogIds: [ITEM],
        participant,
        deadlineMs: 5000,
        onChoose: () => {},
        authority: authorityForLevel(level),
      });
      await room.tick(worldWith(ITEM));
      return seen[0]!;
    };

    const board = await shownTo("executive_board");
    const ic = await shownTo("individual_contributor");
    // The whole point. Before this wiring both saw exactly the same menu.
    expect(ic.length).toBeLessThan(board.length);
    expect(board.some((a) => a.kind === "edit_grammar")).toBe(true);
    expect(ic.some((a) => a.kind === "edit_grammar")).toBe(false);
  });

  test("the pick is indexed against the FILTERED menu the participant was shown", async () => {
    // The off-by-one that would let the gate defeat itself: showing the filtered menu but resolving
    // the index against the unfiltered one, so a chooser's pick lands on an action the hat may not
    // perform. Index 0 cannot catch it — the gate removes items from the middle and end here, so
    // both arrays start with the same action. Choosing the LAST index is what discriminates.
    const seen: NextAction[][] = [];
    const lastPicker = {
      kind: "oracle",
      name: "last",
      choose: async (_w: World, menu: readonly NextAction[]) => {
        seen.push([...menu]);
        return { index: menu.length - 1, raw: String(menu.length - 1), fallback: false };
      },
    } as unknown as Participant;

    const room = createLoopRoom({
      by: "t",
      dryRun: true,
      backlogIds: [ITEM],
      participant: lastPicker,
      deadlineMs: 5000,
      onChoose: () => {},
      authority: authorityForLevel("individual_contributor"),
    });
    const result = await room.tick(worldWith(ITEM));

    const shown = seen[0]!;
    const unfiltered = hatFilter(shown, SOVEREIGN);
    expect(result.action).toEqual(shown[shown.length - 1]!);
    // And the gate really did remove something, so "last of filtered" and "last of unfiltered" are
    // genuinely different questions. Without this the assertion above could hold vacuously.
    expect(shown.length).toBeLessThan(
      // Rebuild what an ungated tick would have been shown, via the sovereign path.
      (
        await (async () => {
          const { participant: p2, seen: s2 } = recordingParticipant();
          const sovereignRoom = createLoopRoom({
            by: "t",
            dryRun: true,
            backlogIds: [ITEM],
            participant: p2,
            deadlineMs: 5000,
            onChoose: () => {},
          });
          await sovereignRoom.tick(worldWith(ITEM));
          return s2[0]!;
        })()
      ).length,
    );
    expect(unfiltered).toHaveLength(shown.length);
  });

  test("the register's menuPolicy is applied AFTER the hat gate", async () => {
    const { participant, seen } = recordingParticipant();
    const cal = withBlock("backend_implementer", ScheduleBlockType.Meeting);
    const dev = chart.byId.get("backend_implementer")!;
    const begun = beginBinding(dev, { bindingId: "b1", wearerAgentId: "alexa", nowMs: 0 });
    expect(begun.ok).toBe(true);
    if (!begun.ok) return;
    const bound = bindWearerToLoop(
      chart,
      cal,
      [advanceBinding(begun.binding, dev, DEFAULT_WARMUP_MS)],
      "alexa",
      DEFAULT_WARMUP_MS,
      dev.id,
    );
    expect(bound.ok).toBe(true);
    if (!bound.ok) return;

    const room = createLoopRoom({
      by: "t",
      dryRun: true,
      backlogIds: [ITEM],
      participant,
      deadlineMs: 5000,
      onChoose: () => {},
      authority: bound.binding.authority,
      menuPolicy: bound.binding.menuPolicy,
    });
    await room.tick(worldWith(ITEM));
    // In a meeting: no work items reach the chooser at all, and only free modes remain.
    expect(seen[0]!.some((a) => a.kind === "do_item")).toBe(false);
    expect(seen[0]!.length).toBeGreaterThan(0);
    expect(seen[0]!.every((a) => ["explore", "play", "self_reflect", "free_time"].includes(a.kind))).toBe(true);
  });

  test("a policy that empties the menu makes the loop REFUSE, not fall back to ungated", async () => {
    // Falling back to the unfiltered menu here would make the whole gate advisory — the fallback
    // would fire exactly when the gate had something to say.
    const { participant } = recordingParticipant();
    let raw = "";
    const room = createLoopRoom({
      by: "t",
      dryRun: true,
      backlogIds: [ITEM],
      participant,
      deadlineMs: 5000,
      onChoose: (r) => {
        raw = r.raw;
      },
      menuPolicy: () => [],
    });
    await expect(room.tick(worldWith(ITEM))).rejects.toThrow(GATE_REFUSED_ALL);
    // …and it is a REFUSAL, distinguishable from a crash.
    expect(raw).toBe(GATE_REFUSED_ALL);
  });
});

// ─── Binding by wearer ──────────────────────────────────────────────────────

describe("an agent's authority comes from the hat it is ACTIVELY wearing", () => {
  const DEV = chart.byId.get("backend_implementer")!;
  const CTO = chart.byId.get("cto")!;
  const b = (hat: typeof DEV, id: string, agent: string) => {
    const r = beginBinding(hat, { bindingId: id, wearerAgentId: agent, nowMs: 0 });
    if (!r.ok) throw new Error(r.reason);
    return r.binding;
  };

  test("an agent wearing nothing gets NO authority", () => {
    const r = bindWearerToLoop(chart, EMPTY_CALENDAR, [], "alexa", 0);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toContain("wears no hat");
  });

  test("a WARMING-UP binding authorizes nothing yet, and says so distinctly", () => {
    // An operator debugging a silent agent needs to know "wears nothing" from "wears something
    // that is not active yet".
    const r = bindWearerToLoop(chart, EMPTY_CALENDAR, [b(DEV, "b1", "alexa")], "alexa", 0);
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.reason).toContain("no ACTIVE binding");
      expect(r.reason).toContain(BindingPhase.Warmup);
    }
  });

  test("once active, the agent gets exactly that hat's authority", () => {
    const active = advanceBinding(b(DEV, "b1", "alexa"), DEV, DEFAULT_WARMUP_MS);
    const r = bindWearerToLoop(chart, EMPTY_CALENDAR, [active], "alexa", DEFAULT_WARMUP_MS);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.hatId).toBe("backend_implementer");
    expect(r.binding.authority).toEqual(authorityForLevel("individual_contributor"));
  });

  test("A REVOKED AGENT KEEPS NOTHING — no fallback to the hat's level", () => {
    // Falling back here would mean a revoked agent kept acting with the authority it was stripped
    // of, which is precisely what revocation exists to stop.
    const active = advanceBinding(b(CTO, "b1", "otto"), CTO, DEFAULT_WARMUP_MS);
    const revoked = revokeBinding(active, DEFAULT_WARMUP_MS + 1, "incident");
    expect(revoked.ok).toBe(true);
    if (!revoked.ok) return;
    const r = bindWearerToLoop(chart, EMPTY_CALENDAR, [revoked.binding], "otto", DEFAULT_WARMUP_MS + 2);
    expect(r.ok).toBe(false);
  });

  test("an EXPIRED binding stops authorizing even if nobody ticked it", () => {
    const stale = advanceBinding(b(CTO, "b1", "otto"), CTO, DEFAULT_WARMUP_MS);
    expect(stale.phase).toBe(BindingPhase.Active);
    const r = bindWearerToLoop(chart, EMPTY_CALENDAR, [stale], "otto", DEFAULT_TTL_MS + 1);
    expect(r.ok).toBe(false);
  });

  test("the schedule still narrows the menu for the hat being worn", () => {
    const active = advanceBinding(b(DEV, "b1", "alexa"), DEV, DEFAULT_WARMUP_MS);
    const cal = withBlock("backend_implementer", ScheduleBlockType.Meeting);
    const r = bindWearerToLoop(chart, cal, [active], "alexa", DEFAULT_WARMUP_MS);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.binding.currentBlockType).toBe(ScheduleBlockType.Meeting);
    expect(r.binding.menuPolicy(MENU).some((a) => a.kind === "do_item")).toBe(false);
  });

  test("two agents wearing different hats get different authority", () => {
    const dev = advanceBinding(b(DEV, "b1", "alexa"), DEV, DEFAULT_WARMUP_MS);
    const boss = advanceBinding(b(CTO, "b2", "otto"), CTO, DEFAULT_WARMUP_MS);
    const a = bindWearerToLoop(chart, EMPTY_CALENDAR, [dev, boss], "alexa", DEFAULT_WARMUP_MS);
    const o = bindWearerToLoop(chart, EMPTY_CALENDAR, [dev, boss], "otto", DEFAULT_WARMUP_MS);
    expect(a.ok && a.binding.authority.canMerge).toBe(false);
    expect(o.ok && o.binding.authority.canMerge).toBe(true);
  });
});

describe("an agent wearing SEVERAL hats must say which one it is acting as", () => {
  const DEV = chart.byId.get("backend_implementer")!;
  const FE = chart.byId.get("frontend_implementer")!;
  const active = (hat: typeof DEV, id: string) => {
    const r = beginBinding(hat, { bindingId: id, wearerAgentId: "alexa", nowMs: 0 });
    if (!r.ok) throw new Error(r.reason);
    return advanceBinding(r.binding, hat, DEFAULT_WARMUP_MS);
  };
  const both = [active(DEV, "b1"), active(FE, "b2")];

  test("WITHOUT naming a hat it is REFUSED, not resolved by array order", () => {
    // Taking the first active binding makes a two-hatted agent act under whichever happened to be
    // earlier in the array — an arbitrary choice between two different authorities, which is
    // precisely what hat-gating exists to prevent.
    const r = bindWearerToLoop(chart, EMPTY_CALENDAR, both, "alexa", DEFAULT_WARMUP_MS);
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.reason).toContain("actively wears 2 hats");
      expect(r.reason).toContain(DEV.id);
      expect(r.reason).toContain(FE.id);
    }
  });

  test("naming either one works, and they are different bindings", () => {
    const a = bindWearerToLoop(chart, EMPTY_CALENDAR, both, "alexa", DEFAULT_WARMUP_MS, DEV.id);
    const b = bindWearerToLoop(chart, EMPTY_CALENDAR, both, "alexa", DEFAULT_WARMUP_MS, FE.id);
    expect(a.ok && a.hatId).toBe(DEV.id);
    expect(b.ok && b.hatId).toBe(FE.id);
  });

  test("naming a hat the agent does NOT actively wear is refused", () => {
    const r = bindWearerToLoop(chart, EMPTY_CALENDAR, both, "alexa", DEFAULT_WARMUP_MS, "qa_engineer");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toContain("no active binding for 'qa_engineer'");
  });

  test("a SINGLE active binding still needs no hat named", () => {
    const r = bindWearerToLoop(chart, EMPTY_CALENDAR, [both[0]!], "alexa", DEFAULT_WARMUP_MS);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.hatId).toBe(DEV.id);
  });
});
