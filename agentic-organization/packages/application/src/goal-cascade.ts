/**
 * goal-cascade.ts — a company goal decomposing down the hierarchy, each rung owned by the level
 * that is actually accountable for it.
 *
 * ── THE GAP THIS CLOSES ──────────────────────────────────────────────────────
 * The organization already modelled the AUTHORITY to take goals: `GoalIntake` is a tool bundle held
 * by the Executive Board, the CEO and the Product Director; the CEO's approval scopes include
 * `portfolio_priority` and `org_direction`; `initiative_planner` is a seeded hat whose documented
 * job (DEPARTMENT_HAT_TOOL_INVENTORY.md) is *"convert approved goals into initiatives, milestones,
 * dependencies, and staffing plan"*; and `WorkItemType.Goal` exists with its own workflow policy.
 *
 * What was missing was the EDGE. Nothing linked a goal to the work that delivers it — a `Goal` work
 * item and a `Task` work item were siblings with no relationship, and no code performed the
 * conversion that hat is named for. So the C-suite had the authority to accept a goal and no way for
 * one to reach a dev.
 *
 * ── OWNERSHIP IS THE POINT, NOT THE TREE ─────────────────────────────────────
 * A parent pointer alone would be a tree with no organization in it. What makes this the *company's*
 * cascade is that each rung is owned by the level accountable for that rung, and that the owner is
 * DERIVED from the hat graph rather than hand-assigned:
 *
 *   goal        → C-suite            direction and portfolio priority
 *   initiative  → Director           the department that will carry it
 *   task        → Manager            staffing and sequencing
 *   (execution) → Individual Contributor, via the existing assignment path
 *
 * Each child's owner must SUPERVISE-OR-BE the parent's owner, walking the same `reportsTo` edge the
 * org graph is validated acyclic on. A cascade whose rungs are not connected in the supervisor graph
 * is an org chart drawn twice and agreeing by luck.
 */

import { HatLevel, WorkItemState, WorkItemType, type HatDefinition, type WorkItem } from "../../domain/src/index.ts";

/** One rung: the type of work it is, and the level accountable for it. */
export type CascadeRung = {
  readonly workItemType: WorkItemType;
  readonly ownerLevel: HatLevel;
};

/**
 * The ladder, top-down.
 *
 * `Goal → Task` is deliberately short: these are the rungs the hat catalog actually staffs at
 * distinct levels. Inserting a rung nobody owns would make the cascade longer and no truer.
 */
export const CASCADE_RUNGS: readonly CascadeRung[] = [
  { workItemType: WorkItemType.Goal, ownerLevel: HatLevel.CSuite },
  { workItemType: WorkItemType.Task, ownerLevel: HatLevel.Manager },
];

export type CascadeNode = {
  readonly workItem: WorkItem;
  readonly ownerHatId: string;
  readonly ownerLevel: HatLevel;
  /** Root → this node, by work item id. Depth is the rung index. */
  readonly chain: readonly string[];
};

export type DecomposeGoalInput = {
  readonly organizationId: string;
  readonly projectId: string;
  readonly initiativeId?: string;
  readonly goalTitle: string;
  /** One child title per task the goal decomposes into. */
  readonly taskTitles: readonly string[];
  readonly hats: readonly HatDefinition[];
  /** The C-suite hat accepting the goal — must hold the goal-intake authority. */
  readonly acceptingHatId: string;
  readonly createId: (prefix: string) => string;
  readonly nowIso: () => string;
};

export type DecomposeGoalResult =
  | { readonly ok: true; readonly nodes: readonly CascadeNode[] }
  | { readonly ok: false; readonly reason: string };

/** Walk `reportsTo` upward from `hatId`, root last. */
export function supervisorChainOf(hatId: string, byId: ReadonlyMap<string, HatDefinition>): readonly string[] {
  const chain: string[] = [];
  const seen = new Set<string>();
  let cursor: string | undefined = hatId;
  while (cursor !== undefined && !seen.has(cursor)) {
    chain.push(cursor);
    seen.add(cursor);
    cursor = byId.get(cursor)?.reportsToHatIds[0];
  }
  return chain;
}

/**
 * Does `descendantHatId` sit under `ancestorHatId` in the supervisor graph (or equal it)?
 *
 * This is the check that keeps the cascade an ORG cascade. Without it a "manager-owned" task could
 * hang off a goal owned by a C-suite hat in an unrelated branch, and the tree would look right while
 * describing a reporting line that does not exist.
 */
export function reportsUpTo(
  descendantHatId: string,
  ancestorHatId: string,
  byId: ReadonlyMap<string, HatDefinition>,
): boolean {
  return supervisorChainOf(descendantHatId, byId).includes(ancestorHatId);
}

/**
 * The hat that should own a rung beneath `parentHatId`.
 *
 * Chosen as the highest-standing hat at the rung's level that still reports up to the parent —
 * derived from the graph, never named here, so adding a department does not require editing this
 * file.
 */
export function ownerForRung(
  level: HatLevel,
  parentHatId: string,
  hats: readonly HatDefinition[],
  byId: ReadonlyMap<string, HatDefinition>,
): HatDefinition | undefined {
  const candidates = hats.filter((h) => h.level === level && reportsUpTo(h.id, parentHatId, byId));
  // Shortest chain to the parent = closest in the reporting line, which is the hat a real
  // organization would hand it to.
  return candidates.sort(
    (a, b) => supervisorChainOf(a.id, byId).indexOf(parentHatId) - supervisorChainOf(b.id, byId).indexOf(parentHatId),
  )[0];
}

/**
 * Decompose a goal into owned work items.
 *
 * REFUSES rather than inventing an owner: if no hat at a rung's level reports up to the rung above,
 * the cascade cannot be staffed and saying so is the honest answer. Silently attaching the work to
 * whoever was nearest would produce a plan the organization cannot execute and cannot detect.
 */
export function decomposeGoal(input: DecomposeGoalInput): DecomposeGoalResult {
  const byId = new Map(input.hats.map((h) => [h.id, h]));
  const accepting = byId.get(input.acceptingHatId);
  if (accepting === undefined) return { ok: false, reason: `unknown accepting hat '${input.acceptingHatId}'` };
  if (accepting.level !== HatLevel.CSuite && accepting.level !== HatLevel.ExecutiveBoard) {
    return {
      ok: false,
      reason: `a goal is accepted at the top: '${input.acceptingHatId}' is ${accepting.level}, not C-suite or the Executive Board`,
    };
  }
  if (input.taskTitles.length === 0) return { ok: false, reason: "a goal with no tasks decomposes into nothing" };

  const actor = { agentId: "goal-cascade", hatAssignmentId: `ha-${input.acceptingHatId}` };
  const base = {
    organizationId: input.organizationId,
    projectId: input.projectId,
    ...(input.initiativeId === undefined ? {} : { initiativeId: input.initiativeId }),
    state: WorkItemState.Created,
    createdAt: input.nowIso(),
    createdBy: actor,
  };

  const goalId = input.createId("wi");
  const goal: WorkItem = {
    ...base,
    workItemId: goalId,
    workItemType: WorkItemType.Goal,
    title: input.goalTitle,
    description: `Company goal accepted by ${accepting.name}.`,
    ownerHatId: accepting.id,
  };

  const taskRung = CASCADE_RUNGS[1];
  if (taskRung === undefined) return { ok: false, reason: "cascade rungs are misconfigured" };

  const taskOwner = ownerForRung(taskRung.ownerLevel, accepting.id, input.hats, byId);
  if (taskOwner === undefined) {
    return {
      ok: false,
      reason: `no ${taskRung.ownerLevel} hat reports up to '${accepting.id}', so this goal cannot be staffed`,
    };
  }

  const nodes: CascadeNode[] = [
    { workItem: goal, ownerHatId: accepting.id, ownerLevel: accepting.level, chain: [goalId] },
  ];

  for (const title of input.taskTitles) {
    const taskId = input.createId("wi");
    nodes.push({
      workItem: {
        ...base,
        workItemId: taskId,
        workItemType: taskRung.workItemType,
        title,
        description: `Decomposed from goal '${input.goalTitle}'.`,
        parentWorkItemId: goalId,
        ownerHatId: taskOwner.id,
      },
      ownerHatId: taskOwner.id,
      ownerLevel: taskOwner.level,
      chain: [goalId, taskId],
    });
  }

  return { ok: true, nodes };
}

/** Every node whose parent is `workItemId`. */
export function childrenOf(nodes: readonly CascadeNode[], workItemId: string): readonly CascadeNode[] {
  return nodes.filter((n) => n.workItem.parentWorkItemId === workItemId);
}

/**
 * Is the goal delivered?
 *
 * True only when EVERY descendant task is done — a goal cannot be closed by closing the goal. That is
 * the whole reason the edge exists: without it, "the goal is done" was an assertion nobody could
 * check, and with it the goal's state is a function of the work beneath it.
 */
export function goalIsDelivered(nodes: readonly CascadeNode[], goalWorkItemId: string): boolean {
  const children = childrenOf(nodes, goalWorkItemId);
  if (children.length === 0) return false;
  return children.every((c) => c.workItem.state === WorkItemState.Done);
}
