/**
 * observe/room/room.ts — Room primitive: keyed state slot + enforced scope predicate.
 *
 * A Room is the minimal extension to the observe→choose→execute loop that earns
 * its existence (per Rodney's Razor):
 *   1. Keyed state slot — tick-surviving cursor, content-addressed
 *   2. Scope predicate — declared read/write envelope, ENFORCED at runtime
 *
 * Without these two, a Room is just a labeled async function (accidental complexity).
 * With them, it handles multi-tick concerns (PR thread resolution, merge queue)
 * without scope violations between concurrent rooms.
 *
 * Design input: Rodney (reducer), Kenji (architect), Lior (antigravity check).
 */

import type { NextAction, World, BacklogItem } from "../observe";
import type { ChooserResult } from "../chooser";
import type { CommandExecutor } from "../do-item";
import { isMergeItem, itemIdOf, rowFor } from "../action-reconciliation";
import { grantedTools, sandboxedExecutor, type RoomSandbox, type ToolGrant } from "./sandbox";

// ─── Scope predicate (Lior's enforcement requirement) ───────────────

/** What a Room is allowed to read and write. Enforced, not advisory. */
export interface ScopePredicate {
  /** Backlog item IDs this room may act on (empty = no backlog access). */
  readonly backlogIds: ReadonlySet<string>;
  /** PR numbers this room may act on (empty = no PR access). */
  readonly prNumbers: ReadonlySet<number>;
  /** Whether this room may read/write the operator channel. */
  readonly operatorAccess: boolean;
  /** Whether this room may trigger git push / PR creation. */
  readonly writeAccess: boolean;
}

/** Narrow a World to only what the scope predicate allows. */
export function scopeWorld(world: World, scope: ScopePredicate): World {
  const filteredBacklog: readonly BacklogItem[] =
    scope.backlogIds.size === 0 ? [] : world.backlog.filter((item) => scope.backlogIds.has(item.id));

  const scoped: World = {
    ...world,
    backlog: filteredBacklog,
  };

  const copy = { ...scoped };

  if (!scope.operatorAccess) {
    delete (copy as any).operator;
  }

  // Strip forgeState PR numbers not in scope
  if (world.forgeState && scope.prNumbers.size > 0) {
    copy.forgeState = {
      ...world.forgeState,
      cleanPrNumbers: world.forgeState.cleanPrNumbers.filter((n) => scope.prNumbers.has(n)),
    };
  }

  return copy;
}

// ─── Room state (tick-surviving, content-addressed) ─────────────────

/** Opaque per-room state that survives across ticks. JSON-serializable. */
export type RoomState = Record<string, unknown>;

// ─── Seam mode + budget: a room is BOUNDED, in either mode ──────────

/**
 * Which dependencies this room's seams are bound to.
 *
 * `mock` = injected test doubles at every IO boundary (the deterministic-simulation mode);
 * `real` = the live adapters. Same room, same code path, different bindings — which is the point:
 * a room run under mocks and the same room run in production differ in what is INJECTED, never in
 * kind. Mirrors `agentic-organization/packages/application/src/room.ts`'s `SeamMode`.
 */
export type SeamMode = "real" | "mock";

/**
 * A room's execution bound. **In EITHER seam mode a room cannot run forever** — that is the whole
 * property, and it was previously nowhere: the org-side `RoomBudget` declared `maxSteps` and
 * nothing ever read it (`maxSteps` appeared only in its own file; the factory was called only by
 * its own test), while this runner had no bound of any kind and would await a room's tick
 * indefinitely.
 */
export interface RoomBudget {
  /** Total ticks this room may ever run. Refused once reached — it is not a soft target. */
  readonly maxSteps: number;
  /** How long the runner will wait for ONE tick before giving up on it. */
  readonly maxTickMs: number;
}

/** `maxSteps` matches the org-side default (1024) so the two halves agree on the ceiling. */
export const DEFAULT_ROOM_BUDGET: RoomBudget = { maxSteps: 1024, maxTickMs: 30_000 };

/** Where the runner records consumed steps. Namespaced so it cannot collide with a room's own keys. */
export const STEPS_USED_KEY = "__zeta_stepsUsed";

function stepsUsedOf(state: RoomState): number {
  const raw = state[STEPS_USED_KEY];
  return typeof raw === "number" && Number.isFinite(raw) && raw >= 0 ? raw : 0;
}

// ─── Room interface ─────────────────────────────────────────────────

export interface Room {
  /** Stable identifier (e.g. "pr-42", "merge-queue", "backlog-081KSNY2Z0008QG0R002JKH50A"). */
  readonly id: string;
  /** Declared read/write envelope — enforced by the tick runner. */
  readonly scope: ScopePredicate;
  /** Tick-surviving state. Mutated by the room, persisted by the runner. */
  state: RoomState;
  /** Whether this room's seams are bound to test doubles or live adapters. Default `real`. */
  readonly seamMode?: SeamMode;
  /** Execution bound. Default `DEFAULT_ROOM_BUDGET` — a room without one is still bounded. */
  readonly budget?: RoomBudget;
  /**
   * The room's isolation boundary: who is acting, what they may reach, and the credential proxy that
   * mediates tools. Absent means the room declares no sandbox — and the runner then hands it NO
   * executor at all rather than an unguarded one (see `tickRooms`).
   */
  readonly sandbox?: RoomSandbox;
  /**
   * Run one tick of this room against its scoped world.
   * Returns the chosen action (which the runner executes within the scope).
   *
   * `ctx.executor` is the ONLY way a room should run a command: the runner has already wrapped it in
   * the room's own policy, so egress and credential rules are applied before anything executes. It is
   * absent when the room declared no sandbox — the room then has no execution capability, which is
   * the safe reading of "no policy declared".
   */
  tick(scopedWorld: World, ctx?: RoomTickContext): Promise<ChooserResult>;
}

/** What the runner hands a room for the duration of one tick. */
export interface RoomTickContext {
  /** Already wrapped in this room's sandbox policy. Absent when the room declared no sandbox. */
  readonly executor?: CommandExecutor;
  /** Tool grants for this room's identity — scope NAMES, never credentials. */
  readonly grants?: readonly ToolGrant[];
}

// ─── Room runner (the fan-out) ──────────────────────────────────────

export interface RoomTickResult {
  readonly roomId: string;
  /** Absent when the room did not produce one — refused on budget, or timed out. */
  readonly result?: ChooserResult;
  readonly scopeViolation: boolean;
  /** Seam bindings this room ran under. */
  readonly seamMode: SeamMode;
  /** Steps consumed INCLUDING this tick. */
  readonly stepsUsed: number;
  /** The room had already spent `maxSteps`; it was not run at all. */
  readonly budgetExhausted: boolean;
  /** The tick exceeded `maxTickMs` and the runner stopped waiting for it. */
  readonly timedOut: boolean;
}

/** Resolves to the sentinel after `ms`, so a tick can be raced against its deadline. */
const TIMED_OUT = Symbol("room-tick-timeout");
function deadline(ms: number): Promise<typeof TIMED_OUT> {
  return new Promise((resolve) => {
    const t = setTimeout(() => resolve(TIMED_OUT), ms);
    // Never hold the process open just to enforce a deadline.
    (t as unknown as { unref?: () => void }).unref?.();
  });
}

/**
 * Run all active rooms in parallel against the world.
 *
 * Each room sees only its scoped slice, and — the property this runner previously did not have —
 * **a room cannot run forever, in either seam mode.** Two independent bounds, because one alone
 * does not close it:
 *
 *   maxSteps   the room is REFUSED once it has spent its steps. Not throttled, not warned: not run.
 *   maxTickMs  the runner stops waiting for a single tick that overruns.
 *
 * A TIMED-OUT TICK STILL CONSUMES A STEP, and that is the load-bearing detail. If timeouts were
 * free, a room that hangs on every tick would be retried forever — bounded per tick and unbounded
 * in aggregate, which is the same runaway wearing a smaller costume.
 *
 * HONEST LIMIT, stated rather than implied: JavaScript cannot cancel an in-flight promise, so the
 * deadline bounds HOW LONG THE RUNNER WAITS, not the room's own execution — a hung tick's work may
 * continue in the background until the process ends. What the step budget then guarantees is that
 * such a room is never STARTED again. Claiming the tick itself was killed would be a stronger
 * promise than the runtime can keep.
 */
export async function tickRooms(
  rooms: readonly Room[],
  world: World,
  opts?: { readonly executor?: CommandExecutor },
): Promise<readonly RoomTickResult[]> {
  // Validate no overlapping scopes (Lior's drift guard)
  validateNoOverlap(rooms);

  const results = await Promise.all(
    rooms.map(async (room): Promise<RoomTickResult> => {
      const budget = room.budget ?? DEFAULT_ROOM_BUDGET;
      const seamMode: SeamMode = room.seamMode ?? "real";
      const alreadyUsed = stepsUsedOf(room.state);

      // Out of steps: the room is not run. No tick, no action, no chance to overrun again.
      if (alreadyUsed >= budget.maxSteps) {
        return {
          roomId: room.id,
          scopeViolation: false,
          seamMode,
          stepsUsed: alreadyUsed,
          budgetExhausted: true,
          timedOut: false,
        };
      }

      // The attempt is charged BEFORE it runs, so a tick that hangs or throws still costs a step.
      const stepsUsed = alreadyUsed + 1;
      room.state[STEPS_USED_KEY] = stepsUsed;

      const scopedWorld = scopeWorld(world, room.scope);

      // THE ROOM IS THE SANDBOX. A room gets an executor only through its own policy: the base
      // executor is wrapped in the room's egress + credential rules before it is handed over, so a
      // room cannot run a command that skipped them.
      //
      // A room with NO declared sandbox gets NO executor — not an unguarded one. "No policy
      // declared" must not read as "no policy applies", which is the fail-open shape that turns an
      // isolation boundary into a comment.
      const ctx: RoomTickContext =
        room.sandbox === undefined || opts?.executor === undefined
          ? {}
          : {
              executor: sandboxedExecutor(opts.executor, room.sandbox),
              grants: grantedTools(room.sandbox),
            };

      const raced = await Promise.race([room.tick(scopedWorld, ctx), deadline(budget.maxTickMs)]);

      if (raced === TIMED_OUT) {
        return { roomId: room.id, scopeViolation: false, seamMode, stepsUsed, budgetExhausted: false, timedOut: true };
      }

      const result = raced;
      // Enforce: action must be within scope
      const scopeViolation = !isActionInScope(result.action, room.scope);
      return { roomId: room.id, result, scopeViolation, seamMode, stepsUsed, budgetExhausted: false, timedOut: false };
    }),
  );

  return results;
}

/**
 * Is this action within the room's declared scope?
 *
 * A LOOKUP, not a switch. The previous form enumerated the kinds it knew and ended in
 * `return true`, so an unrecognised kind was in scope for every room — the scope predicate's own
 * fail-open. Reading the requirement out of `ACTION_RECONCILIATION` makes a new kind a compile
 * error, and it closed a live hole on the way: `self_claim` carries an item and was reaching that
 * trailing `return true`, so a room could claim work outside its envelope.
 */
function isActionInScope(action: NextAction, scope: ScopePredicate): boolean {
  const requirement = rowFor(action.kind).scope;
  switch (requirement) {
    case "unrestricted":
      return true;
    case "operator_access":
      return scope.operatorAccess;
    case "item_in_scope": {
      const id = itemIdOf(action);
      // No item on an item-scoped action is a shape the table does not describe; nothing is being
      // reached into, so nothing is out of scope.
      if (id === null) return true;
      return scope.backlogIds.has(id) || isMergeItem(id);
    }
  }
  return assertNeverScope(requirement);
}

/** Exhaustiveness, enforced by the compiler: a new `ScopeRequirement` fails to typecheck here. */
function assertNeverScope(x: never): never {
  throw new Error(`unhandled scope requirement: ${String(x)}`);
}

/** Validate no two rooms claim overlapping backlog IDs or PR numbers. */
function validateNoOverlap(rooms: readonly Room[]): void {
  const seenBacklog = new Set<string>();
  const seenPrs = new Set<number>();

  for (const room of rooms) {
    for (const id of room.scope.backlogIds) {
      if (seenBacklog.has(id)) {
        throw new Error(`Scope overlap: backlog item "${id}" claimed by multiple rooms`);
      }
      seenBacklog.add(id);
    }
    for (const pr of room.scope.prNumbers) {
      if (seenPrs.has(pr)) {
        throw new Error(`Scope overlap: PR #${pr} claimed by multiple rooms`);
      }
      seenPrs.add(pr);
    }
  }
}
