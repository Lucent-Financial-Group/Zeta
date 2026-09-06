/**
 * goal-cascade.test.ts — the company goal reaching a dev, and refusing to pretend when it cannot.
 */

import { equal, ok } from "node:assert/strict";
import { test } from "node:test";

import { HatLevel, WorkItemState, WorkItemType } from "../../domain/src/index.ts";
import { buildHatDefinitions } from "../src/org-seed.ts";
import {
  childrenOf,
  decomposeGoal,
  goalIsDelivered,
  ownerForRung,
  reportsUpTo,
  supervisorChainOf,
} from "../src/goal-cascade.ts";

const hats = buildHatDefinitions();
const byId = new Map(hats.map((h) => [h.id, h]));
let n = 0;
const deps = {
  organizationId: "org",
  projectId: "proj",
  hats,
  createId: (p: string) => `${p}-${String(++n).padStart(4, "0")}`,
  nowIso: () => "2026-09-03T12:00:00.000Z",
};

test("the supervisor chain walks reportsTo to the Executive Board root", () => {
  const chain = supervisorChainOf("backend_implementer", byId);
  ok(chain[0] === "backend_implementer", "the chain starts at the hat itself");
  equal(chain[chain.length - 1], "executive_board_member");
  // The whole point of a chain: a dev really does report up to the top, through named hats.
  ok(chain.includes("cto") || chain.includes("coo") || chain.includes("ceo"), `no C-suite in ${chain.join(" → ")}`);
});

test("reportsUpTo is TRUE up the line and FALSE across it", () => {
  ok(reportsUpTo("backend_implementer", "cto", byId));
  // A dev under the CTO does not report to the CFO — this is the check that stops the cascade
  // hanging a task off an unrelated branch and calling it an org chart.
  equal(reportsUpTo("backend_implementer", "cfo", byId), false);
});

test("a goal decomposes into tasks owned one level down, in the same reporting line", () => {
  const result = decomposeGoal({
    ...deps,
    goalTitle: "cut checkout abandonment",
    taskTitles: ["fix the coupon path", "instrument the funnel"],
    acceptingHatId: "ceo",
  });

  ok(result.ok, result.ok ? "" : result.reason);
  if (!result.ok) return;

  const [goal] = result.nodes;
  equal(goal?.workItem.workItemType, WorkItemType.Goal);
  equal(goal?.ownerLevel, HatLevel.CSuite);

  const tasks = childrenOf(result.nodes, goal?.workItem.workItemId ?? "");
  equal(tasks.length, 2);
  for (const task of tasks) {
    equal(task.workItem.workItemType, WorkItemType.Task);
    equal(task.ownerLevel, HatLevel.Manager);
    equal(task.workItem.parentWorkItemId, goal?.workItem.workItemId);
    // The rung's owner must actually report to the hat that accepted the goal.
    ok(reportsUpTo(task.ownerHatId, "ceo", byId), `${task.ownerHatId} does not report to the ceo`);
  }
});

test("a goal cannot be accepted below the top", () => {
  // The authority check. `GoalIntake` is held by the Executive Board, the CEO and the Product
  // Director; a manager holding the tool would still not be setting company direction.
  const result = decomposeGoal({
    ...deps,
    goalTitle: "x",
    taskTitles: ["y"],
    acceptingHatId: "engineering_manager",
  });
  equal(result.ok, false);
  if (!result.ok) ok(result.reason.includes("C-suite"), result.reason);
});

test("a goal with no tasks is REFUSED, not recorded as an empty success", () => {
  // A goal that decomposes into nothing is the shape that lets an organization report progress on
  // work it never created.
  const result = decomposeGoal({ ...deps, goalTitle: "x", taskTitles: [], acceptingHatId: "ceo" });
  equal(result.ok, false);
});

test("an unknown accepting hat is REFUSED", () => {
  const result = decomposeGoal({ ...deps, goalTitle: "x", taskTitles: ["y"], acceptingHatId: "not_a_hat" });
  equal(result.ok, false);
});

test("ownerForRung derives the owner from the graph and returns nothing when the line is empty", () => {
  // Derived, so adding a department does not need this file edited…
  const owner = ownerForRung(HatLevel.Manager, "ceo", hats, byId);
  ok(owner !== undefined);
  ok(reportsUpTo(owner?.id ?? "", "ceo", byId));

  // …and undefined rather than a guess when nobody at that level reports to the parent. A leaf hat
  // supervises no one, so no manager can hang beneath it.
  equal(ownerForRung(HatLevel.Manager, "backend_implementer", hats, byId), undefined);
});

test("a goal is delivered only when every task beneath it is done", () => {
  const result = decomposeGoal({
    ...deps,
    goalTitle: "g",
    taskTitles: ["a", "b"],
    acceptingHatId: "ceo",
  });
  ok(result.ok);
  if (!result.ok) return;
  const goalId = result.nodes[0]?.workItem.workItemId ?? "";

  // Nothing done yet.
  equal(goalIsDelivered(result.nodes, goalId), false);

  // One of two done — still not delivered. This is the assertion that makes the edge load-bearing:
  // without it "the goal is done" is a claim nobody can check.
  const partly = result.nodes.map((node, i) =>
    i === 1 ? { ...node, workItem: { ...node.workItem, state: WorkItemState.Done } } : node,
  );
  equal(goalIsDelivered(partly, goalId), false);

  const all = result.nodes.map((node, i) =>
    i === 0 ? node : { ...node, workItem: { ...node.workItem, state: WorkItemState.Done } },
  );
  equal(goalIsDelivered(all, goalId), true);
});

test("a goal with no children is NOT delivered", () => {
  // Otherwise `every` over an empty list would report a goal nobody decomposed as complete —
  // vacuously true, and the most dangerous kind of green.
  const result = decomposeGoal({ ...deps, goalTitle: "g", taskTitles: ["a"], acceptingHatId: "ceo" });
  ok(result.ok);
  if (!result.ok) return;
  equal(goalIsDelivered(result.nodes, "no-such-goal"), false);
});
