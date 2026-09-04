/**
 * work-projection.test.ts — the org and the loop closing on each other.
 *
 * The end-to-end claim this file has to earn: a goal accepted by the C-suite becomes an item the
 * DEV'S OWN LOOP offers, the dev picks it, and the completion travels back up so the goal becomes
 * delivered. Both halves, or the bridge is one-way.
 */

import { describe, expect, test } from "bun:test";
import { completionsFrom, projectFor } from "./work-projection";
import { firstContributorUnder, runOrgCycle, type OrgCycleDeps } from "./org-cycle";
import { buildOrgChart } from "./org-chart";
import { SEED_HATS } from "./org-seed";
import { isDelivered, nodeById, setState, WorkState, WorkType, type Cascade } from "./goal-cascade";
import { bindWearerToLoop } from "./loop-policy";
import { createLoopRoom } from "../observe/run-loop-real";
import { advanceBinding, beginBinding, DEFAULT_WARMUP_MS } from "./hat-binding";
import type { NextAction, World } from "../observe/observe";
import type { Participant } from "../observe/participant";

const chart = (() => {
  const r = buildOrgChart(SEED_HATS);
  if (!r.ok) throw new Error(r.reason);
  return r.chart;
})();

const H = 3_600_000;

function cycle(over: Partial<OrgCycleDeps> = {}) {
  let n = 0;
  return runOrgCycle({
    chart,
    plan: {
      goalTitle: "cut checkout abandonment",
      acceptingHatId: "cto",
      initiativeTitles: ["fix the coupon path"],
      projectTitles: ["coupon service hardening"],
      taskTitles: ["stop the double-apply", "add the regression test"],
    },
    createId: (prefix) => `${prefix}-${String(++n).padStart(3, "0")}`,
    nowMs: 0,
    workBlockMs: H,
    resourceAuthorityHatId: "rmo_office",
    contributorFor: (task) => firstContributorUnder(chart, task.ownerHatId),
    outcomeFor: () => "done",
    ...over,
  });
}

/** The cascade as it stands right after staffing, before anyone did the work. */
function staffedButUndone(): Cascade {
  const report = cycle({ outcomeFor: () => "blocked" });
  return report.cascade;
}

describe("one hat's view of the work", () => {
  const cascade = staffedButUndone();

  test("the DEV sees its own assigned tasks, ready to do", () => {
    const items = projectFor(cascade, "backend_implementer");
    expect(items).toHaveLength(2);
    for (const item of items) {
      expect(item.ready).toBe(true);
      expect(item.ambiguous).toBe(false);
      expect(nodeById(cascade, item.id)?.assigneeHatId).toBe("backend_implementer");
    }
  });

  test("a hat sees NOTHING of another team's work", () => {
    // Otherwise the hat gate would be the only thing between a dev and a director's initiative —
    // an authority model doing scoping's job.
    expect(projectFor(cascade, "qa_engineer")).toHaveLength(0);
    const devIds = projectFor(cascade, "backend_implementer").map((i) => i.id);
    const leadIds = projectFor(cascade, "tech_lead").map((i) => i.id);
    expect(devIds.some((id) => leadIds.includes(id))).toBe(false);
  });

  test("an UNASSIGNED task is not offered to anyone — the RMO has not staffed it", () => {
    const unstaffed = cycle({ contributorFor: () => undefined }).cascade;
    for (const hat of chart.hats) {
      expect(projectFor(unstaffed, hat.id).every((i) => i.ready === false)).toBe(true);
    }
  });

  test("a DONE task drops out of the backlog", () => {
    const report = cycle();
    expect(projectFor(report.cascade, "backend_implementer")).toHaveLength(0);
  });

  test("a CANCELED task drops out too", () => {
    let c = staffedButUndone();
    const first = projectFor(c, "backend_implementer")[0]!;
    const r = setState(c, first.id, WorkState.Canceled);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(projectFor(r.cascade, "backend_implementer").map((i) => i.id)).not.toContain(first.id);
  });

  test("an ALREADY-DECOMPOSED rung is not re-offered as planning work", () => {
    // The CTO's goal has an initiative under it. Offering it again would put "break this down" in
    // front of a hat that already did, every tick, forever.
    expect(projectFor(cascade, "cto")).toHaveLength(0);
    expect(projectFor(cascade, "engineering_director")).toHaveLength(0);
  });

  test("an owner with an UNBROKEN-DOWN rung sees planning work, marked ambiguous", () => {
    // A goal with nothing beneath it is a thing to decompose, not to do — which is exactly what
    // `ambiguous` tells `buildMenu`.
    let n = 0;
    const report = runOrgCycle({
      chart,
      plan: {
        goalTitle: "explore new markets",
        acceptingHatId: "cto",
        initiativeTitles: [],
        projectTitles: [],
        taskTitles: [],
      },
      createId: (p) => `${p}-${String(++n)}`,
      nowMs: 0,
      workBlockMs: H,
      resourceAuthorityHatId: "rmo_office",
      contributorFor: () => undefined,
      outcomeFor: () => "done",
    });
    const items = projectFor(report.cascade, "cto");
    expect(items).toHaveLength(1);
    expect(items[0]?.ready).toBe(false);
    expect(items[0]?.ambiguous).toBe(true);
  });
});

describe("completions travel back UP", () => {
  const cascade = staffedButUndone();
  const taskId = projectFor(cascade, "backend_implementer")[0]!.id;

  test("do_item on an assigned task counts", () => {
    expect(completionsFrom(cascade, "backend_implementer", [{ kind: "do_item", item: { id: taskId } }])).toEqual([
      taskId,
    ]);
  });

  test("DECOMPOSE is not completion", () => {
    // A node with children is delivered by them. Counting the split as progress is how a plan
    // reports itself finished for having been made.
    expect(completionsFrom(cascade, "backend_implementer", [{ kind: "decompose", item: { id: taskId } }])).toEqual(
      [],
    );
  });

  test("another hat cannot close this hat's work by naming its id", () => {
    expect(completionsFrom(cascade, "qa_engineer", [{ kind: "do_item", item: { id: taskId } }])).toEqual([]);
  });

  test("a free-mode action closes nothing", () => {
    expect(completionsFrom(cascade, "backend_implementer", [{ kind: "explore" }])).toEqual([]);
  });

  test("an unknown id closes nothing", () => {
    expect(completionsFrom(cascade, "backend_implementer", [{ kind: "do_item", item: { id: "ghost" } }])).toEqual([]);
  });

  test("an ALREADY-DONE task cannot be completed a second time", () => {
    // Double-counting a completion is how a cascade reports more delivered than it has.
    const done = setState(cascade, taskId, WorkState.Done);
    expect(done.ok).toBe(true);
    if (!done.ok) return;
    expect(
      completionsFrom(done.cascade, "backend_implementer", [{ kind: "do_item", item: { id: taskId } }]),
    ).toEqual([]);
  });
});

describe("a Cascade is a plain value — the projection must be robust to one it did not build", () => {
  // `assign` refuses non-tasks and `decompose` refuses tasks, so these shapes are unreachable
  // through the public API today. They are reachable by anyone who constructs a `Cascade` literal,
  // which is every caller, so the guards are tested against hand-built values rather than left as
  // lines no test can reach.

  test("a NON-TASK carrying an assignee is never offered as executable", () => {
    const forged: Cascade = {
      nodes: [
        {
          workId: "p1",
          workType: WorkType.Project,
          title: "not a task",
          state: WorkState.Open,
          ownerHatId: "engineering_manager",
          assigneeHatId: "backend_implementer",
        },
      ],
    };
    expect(projectFor(forged, "backend_implementer")).toHaveLength(0);
    expect(
      completionsFrom(forged, "backend_implementer", [{ kind: "do_item", item: { id: "p1" } }]),
    ).toEqual([]);
  });

  test("a TASK WITH CHILDREN is not offered as do-able", () => {
    const forged: Cascade = {
      nodes: [
        {
          workId: "t1",
          workType: WorkType.Task,
          title: "parent task",
          state: WorkState.Open,
          ownerHatId: "tech_lead",
          assigneeHatId: "backend_implementer",
        },
        {
          workId: "t2",
          workType: WorkType.Task,
          title: "child task",
          state: WorkState.Open,
          ownerHatId: "tech_lead",
          parentWorkId: "t1",
          assigneeHatId: "backend_implementer",
        },
      ],
    };
    const ids = projectFor(forged, "backend_implementer").map((i) => i.id);
    // Only the leaf is do-able; the parent is delivered by its child.
    expect(ids).toEqual(["t2"]);
    expect(
      completionsFrom(forged, "backend_implementer", [{ kind: "do_item", item: { id: "t1" } }]),
    ).toEqual([]);
  });
});

describe("THE FULL CIRCUIT: a company goal reaches the dev's loop and comes back delivered", () => {
  test("cascade → projection → the real loop room → completion → rollup", async () => {
    let cascade = staffedButUndone();
    const goalId = cascade.nodes.find((n) => n.parentWorkId === undefined)!.workId;
    expect(isDelivered(cascade, goalId)).toBe(false);

    // The dev's own loop, bound through an ACTIVE binding on its hat — the real `createLoopRoom`.
    const dev = chart.byId.get("backend_implementer")!;
    const begun = beginBinding(dev, { bindingId: "b1", wearerAgentId: "alexa", nowMs: 0 });
    expect(begun.ok).toBe(true);
    if (!begun.ok) return;
    const active = advanceBinding(begun.binding, dev, DEFAULT_WARMUP_MS);
    const bound = bindWearerToLoop(chart, { blocks: [] }, [active], "alexa", DEFAULT_WARMUP_MS, dev.id);
    expect(bound.ok).toBe(true);
    if (!bound.ok) return;
    const binding = bound.binding;

    let guard = 0;
    while (projectFor(cascade, "backend_implementer").length > 0 && guard++ < 10) {
      const backlog = projectFor(cascade, "backend_implementer");
      const world = { backlog, operator: { pending: [] } } as unknown as World;

      const picked: NextAction[] = [];
      const participant = {
        kind: "oracle",
        name: "test",
        choose: async (_w: World, menu: readonly NextAction[]) => {
          // Take the first executable item the ORGANIZATION put in front of it.
          const i = menu.findIndex((a) => a.kind === "do_item");
          return { index: i < 0 ? 0 : i, raw: String(i), fallback: false };
        },
      } as unknown as Participant;

      const room = createLoopRoom({
        by: "backend_implementer",
        dryRun: true,
        backlogIds: backlog.map((b) => b.id),
        participant,
        deadlineMs: 5000,
        onChoose: () => {},
        authority: binding.authority,
        menuPolicy: binding.menuPolicy,
      });

      const result = await room.tick(world);
      picked.push(result.action);

      // The loop's pick is a real cascade task — the projection put it there.
      expect(result.action.kind).toBe("do_item");

      // …and it travels back up.
      const done = completionsFrom(cascade, "backend_implementer", picked as never);
      expect(done).toHaveLength(1);
      const step = setState(cascade, done[0]!, WorkState.Done);
      expect(step.ok).toBe(true);
      if (!step.ok) return;
      cascade = step.cascade;
    }

    // Two tasks, two ticks, and the guard never fired.
    expect(guard).toBe(2);
    // The goal is delivered — and NOBODY marked it. It is a function of the leaves the dev closed.
    expect(nodeById(cascade, goalId)?.state).toBe(WorkState.Open);
    expect(isDelivered(cascade, goalId)).toBe(true);
  });
});
