/**
 * corporate/work-projection.ts — the last seam: cascaded work becoming work the LOOP can pick.
 *
 * ── THE GAP THIS CLOSES ──────────────────────────────────────────────────────
 * Without this the register and the loop are two machines that never touch. `runOrgCycle` can take a
 * company goal all the way down to a task assigned to a named dev with a slot on its calendar — and
 * the observe loop, ticking as that same dev, would build its menu from the repo backlog and never
 * see it. The organization would decide, and the agent would do something else.
 *
 * A projection is the whole bridge: the cascade is the ORGANIZATION'S view of the work, `World` is
 * the AGENT'S view, and this maps one onto the other for one hat.
 *
 * ── WHAT DECIDES `ready` AND `ambiguous` ─────────────────────────────────────
 * These are the two flags the sovereign controller reasons with, and they are answered from the
 * cascade rather than guessed:
 *
 *   - **ready** — the task is assigned to this hat and is not done or cancelled. An unassigned task
 *     is not this agent's to start; the RMO has not staffed it yet, and picking it up would route
 *     around the staffing decision.
 *   - **ambiguous** — the item still has children. In this ladder only a task is executable, so a
 *     node with children is a thing to decompose, not to do. That is exactly what `ambiguous` means
 *     to `buildMenu`, which offers `decompose` for it instead of `do_item`.
 *
 * ── ONE HAT'S VIEW, NOT THE ORGANIZATION'S ───────────────────────────────────
 * `projectFor` returns only what THIS hat is accountable for. Handing an agent the whole cascade
 * would put every other team's work in its menu, and the hat gate would then be the only thing
 * standing between a dev and a director's initiative — a gate doing scoping's job, which is how an
 * authority model ends up load-bearing for something it was not designed to carry.
 */

import type { BacklogItem } from "../observe/observe";
import { childrenOf, isLeafType, WorkState, type Cascade, type CascadeNode } from "./goal-cascade";

/** Is this node something the assignee can execute right now? */
function isExecutable(cascade: Cascade, node: CascadeNode): boolean {
  // A LEAF, not specifically a `task`. Gating on the one type made every defect, incident, review
  // and capability request unexecutable the moment those became distinct types — the loop offered
  // zero items and the organization looked idle while holding real work.
  if (!isLeafType(node.workType)) return false;
  if (node.state === WorkState.Done || node.state === WorkState.Canceled) return false;
  // A task with children is not a task in this ladder, but the guard is cheap and the failure it
  // prevents — offering `do_item` on something that still decomposes — is not obvious in a menu.
  return childrenOf(cascade, node.workId).length === 0;
}

/**
 * The backlog items one hat should see this tick.
 *
 * Two kinds land here:
 *   - tasks ASSIGNED to `hatId` — its own work
 *   - nodes OWNED by `hatId` that still have children to break down — its planning work
 *
 * A hat that owns nothing and is assigned nothing gets an empty backlog, which is a true statement
 * about its day rather than a bug: the loop's free modes remain, so the agent still has a menu.
 */
export function projectFor(cascade: Cascade, hatId: string): readonly BacklogItem[] {
  const items: BacklogItem[] = [];
  for (const node of cascade.nodes) {
    if (node.state === WorkState.Canceled) continue;

    if (node.assigneeHatId === hatId && isExecutable(cascade, node)) {
      items.push({ id: node.workId, title: node.title, ready: true, ambiguous: false });
      continue;
    }

    // Planning work: this hat owns the rung and it has not been broken down yet.
    // Planning work is anything NOT at the leaf rung: those decompose, leaves execute.
    if (node.ownerHatId === hatId && !isLeafType(node.workType)) {
      const hasChildren = childrenOf(cascade, node.workId).length > 0;
      if (!hasChildren) {
        // Not ready — it cannot be executed, only decomposed. `ambiguous` is what makes
        // `buildMenu` offer `decompose` rather than `do_item`.
        items.push({ id: node.workId, title: node.title, ready: false, ambiguous: true });
      }
    }
  }
  return items;
}

/**
 * Fold the loop's outcome back into the cascade.
 *
 * The return half of the bridge. Without it the projection is one-way: the agent does the work and
 * the organization never learns, so `isDelivered` stays false forever and the goal can never close.
 *
 * Only `do_item` on a task assigned to this hat counts. In particular a `decompose` is NOT completion
 * — it produces children, and a node with children is delivered by them, not by the act of splitting
 * it. Treating decomposition as progress is how a plan reports itself finished for having been made.
 */
export function completionsFrom(
  cascade: Cascade,
  hatId: string,
  actions: readonly { readonly kind: string; readonly item?: { readonly id: string } }[],
): readonly string[] {
  const done: string[] = [];
  for (const action of actions) {
    if (action.kind !== "do_item") continue;
    const id = action.item?.id;
    if (id === undefined) continue;
    const node = cascade.nodes.find((n) => n.workId === id);
    if (node === undefined) continue;
    // The assignee check is what stops one agent closing another's work by naming its id.
    if (node.assigneeHatId !== hatId) continue;
    if (!isExecutable(cascade, node)) continue;
    done.push(id);
  }
  return done;
}
