/**
 * corporate/loop-policy.ts — the register composing onto the loop. The schedule as runtime authority.
 *
 * ── WHAT THIS CONNECTS ───────────────────────────────────────────────────────
 * `observe/run-loop-real.ts` declares two seams and owns neither policy:
 *
 *   `authority`   — a `HatAuthority`, applied by the core's own `hatFilter`
 *   `menuPolicy`  — an opaque `(menu) => menu` narrowing, applied after it
 *
 * This module supplies both from an organization. The loop never imports `corporate/`; the caller
 * that wires them together does. That is the direction the ADR fixes and
 * `register-boundary.test.ts` enforces, and it is what makes the hierarchy a plugin rather than a
 * property of the machine.
 *
 * ── THE SCHEDULE DECIDES WHAT KIND OF TICK THIS IS ───────────────────────────
 * `AGENT_WORK_RHYTHM_AND_PROMPT_FLOWS.md` is explicit that a schedule *"is not just calendar
 * metadata. It is part of runtime authority."* Here that becomes literal: what a hat is booked to
 * be doing at `nowMs` narrows what it may pick this tick. A hat in a meeting is not free to start a
 * work item, and until now nothing in the loop could express that, because nothing in the loop knew
 * the hat had a calendar.
 *
 * ── THE NON-COERCION FLOOR IS PRESERVED, DELIBERATELY ────────────────────────
 * The four free modes (`explore`, `play`, `self_reflect`, `free_time`) are NEVER removed. The core's
 * hat gate already refuses to gate them — its comment is *"Free modes ... are NEVER gated — per
 * NCI"* — and a schedule that could remove them would reintroduce the coercion the invariant exists
 * to prevent, one layer up, where the gate could not see it. A calendar may say what work is in
 * scope; it may not say that an agent must work.
 */

import { rowFor } from "../observe/action-reconciliation";
import type { NextAction } from "../observe/observe";
import type { HatAuthority } from "../observe/room/hat-gate";
import type { OrgChart } from "./org-chart";
import { blockAt, ScheduleBlockType, type Calendar } from "./work-schedule";
import { activeAuthorityFor, isAuthorizing, type HatBinding } from "./hat-binding";

/**
 * Which block types have EXECUTING WORK ITEMS in scope.
 *
 * A `Record` rather than a set of the permitted ones, so a new block type is a compile error here
 * instead of silently defaulting — defaulting either way would be wrong, and defaulting to
 * permitted is the fail-open shape that makes a policy advisory.
 */
const WORK_IN_SCOPE: Record<ScheduleBlockType, boolean> = {
  [ScheduleBlockType.PrioritizedWork]: true,
  [ScheduleBlockType.PromptFlowExecution]: true,
  [ScheduleBlockType.Review]: true,
  // In a meeting the hat is with other hats; starting a work item is not what this block is for.
  [ScheduleBlockType.Meeting]: false,
  // Free time is bounded exploration, and the free modes survive the filter below regardless.
  [ScheduleBlockType.FreeTime]: false,
  [ScheduleBlockType.Reflection]: false,
  [ScheduleBlockType.MemoryMaintenance]: false,
  [ScheduleBlockType.Reporting]: false,
};

export function workIsInScopeDuring(blockType: ScheduleBlockType): boolean {
  return WORK_IN_SCOPE[blockType];
}

/**
 * A menu policy driven by one hat's calendar at one instant.
 *
 * `nowMs` is passed in rather than read, for the same reason the schedule module reads no clock:
 * two hats must agree about whether a meeting is happening, and a wall-clock read here would make
 * the answer depend on which machine asked.
 *
 * With NOTHING scheduled the policy narrows nothing. An empty calendar must not mean "this hat may
 * do nothing" — an organization that has not yet planned someone's day has not thereby forbidden
 * them to work, and treating absence as prohibition would make adopting the register a lockout.
 */
export function createScheduleMenuPolicy(
  calendar: Calendar,
  hatId: string,
  nowMs: number,
): (menu: readonly NextAction[]) => readonly NextAction[] {
  return (menu) => {
    const block = blockAt(calendar, hatId, nowMs);
    if (block === undefined) return menu;
    if (workIsInScopeDuring(block.blockType)) return menu;
    // Keep the free modes. This is the NCI floor, and it is also what guarantees the policy can
    // never empty the menu on its own — the loop's refusal path stays reachable only through the
    // hat gate, where it belongs.
    return menu.filter((action) => rowFor(action.kind).freeMode);
  };
}

/** Everything the loop needs to run one tick as a hat in an organization. */
export interface CorporateLoopBinding {
  readonly authority: HatAuthority;
  readonly menuPolicy: (menu: readonly NextAction[]) => readonly NextAction[];
  /** What the hat is booked to be doing, for the log. `undefined` = nothing scheduled. */
  readonly currentBlockType?: ScheduleBlockType;
}

/**
 * Bind an AGENT to the loop through the hat it is currently wearing.
 *
 * This is the real-world question, and the one `bindHatToLoop` cannot ask: a tick belongs to an
 * agent, not to a hat. Which hat it is wearing — and whether that hat still authorizes anything — is
 * a fact about its bindings at `nowMs`.
 *
 * REFUSES when the agent has no ACTIVE binding. That is what makes `hat-binding.ts` load-bearing
 * rather than bookkeeping: an agent whose binding is still warming up, or has expired, or was
 * revoked, gets no authority at all — not a reduced one, and not the hat's default. Falling back to
 * the hat's level here would mean a revoked agent kept acting with the authority it was stripped of,
 * which is precisely the thing revocation exists to stop.
 *
 * The refusal reason distinguishes "wears nothing" from "wears something that is not active", since
 * an operator debugging a silent agent needs to know which.
 */
export type WearerBinding =
  | { readonly ok: true; readonly binding: CorporateLoopBinding; readonly hatId: string }
  | { readonly ok: false; readonly reason: string };

export function bindWearerToLoop(
  chart: OrgChart,
  calendar: Calendar,
  bindings: readonly HatBinding[],
  agentId: string,
  nowMs: number,
  /**
   * Which hat this tick is under. REQUIRED when the agent actively wears more than one.
   *
   * An agent may hold several hats at once (`assignment-engine` caps it, it does not forbid it), and
   * a tick belongs to an (agent, HAT) pair rather than to an agent. Taking the first active binding
   * — which this did — makes a two-hatted agent act under whichever binding happened to be earlier
   * in the array: an arbitrary choice between two different authorities, which is precisely what
   * hat-gating exists to prevent. Ambiguity is refused rather than resolved by array order.
   */
  hatId?: string,
): WearerBinding {
  const mine = bindings.filter((b) => b.wearerAgentId === agentId);
  if (mine.length === 0) return { ok: false, reason: `'${agentId}' wears no hat` };

  const live = mine.filter((b) => isAuthorizing(b, nowMs));
  if (live.length === 0) {
    const phases = [...new Set(mine.map((b) => b.phase))].join(", ");
    return { ok: false, reason: `'${agentId}' has no ACTIVE binding (holds: ${phases})` };
  }

  let active: HatBinding | undefined;
  if (hatId !== undefined) {
    active = live.find((b) => b.hatId === hatId);
    if (active === undefined) {
      return { ok: false, reason: `'${agentId}' has no active binding for '${hatId}'` };
    }
  } else if (live.length > 1) {
    return {
      ok: false,
      reason: `'${agentId}' actively wears ${live.length} hats (${live.map((b) => b.hatId).join(", ")}) — name which one this tick is under`,
    };
  } else {
    active = live[0];
  }
  if (active === undefined) return { ok: false, reason: `'${agentId}' has no active binding` };

  const authority = activeAuthorityFor(chart, active, nowMs);
  if (authority === undefined) {
    return { ok: false, reason: `binding '${active.bindingId}' names hat '${active.hatId}', which is not in the chart` };
  }

  const block = blockAt(calendar, active.hatId, nowMs);
  return {
    ok: true,
    hatId: active.hatId,
    binding: {
      authority,
      menuPolicy: createScheduleMenuPolicy(calendar, active.hatId, nowMs),
      ...(block === undefined ? {} : { currentBlockType: block.blockType }),
    },
  };
}
