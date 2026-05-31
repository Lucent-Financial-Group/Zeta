#!/usr/bin/env bun
/**
 * tools/observe/backlog-reader.ts — bridge the REAL backlog to the observe DU.
 *
 * observe.ts's `observe()` is the pure 4-button controller (a toy oracle over a
 * synthetic BacklogItem). The REAL backlog already has a deterministic selector:
 * `tools/backlog/autonomous-pickup.ts` `selectNextBacklogItem` (priority-ranked,
 * dependency-aware, claim-aware, decompose-vs-claim). This reader REUSES it and
 * maps its `PickupSelection` onto the observe `NextAction` DU — it does NOT
 * reimplement selection. So on real rows, `selectNextBacklogItem` is the oracle;
 * `observe()` stays the DU definition + the LLM-chooser grading oracle for
 * synthetic scenarios.
 *
 * Mapping:
 *   selected + "claim-and-implement" → do_item
 *   selected + "decompose-first"     → decompose
 *   empty                            → free_time   (the exit)
 *   (edit_grammar is the escape-hatch the agent/LLM raises — not derivable from
 *    backlog frontmatter, so this DETERMINISTIC reader never emits it; it stays
 *    available in the LLM-chooser menu via observe.ts `buildMenu`.)
 *
 * ── FORWARD CONTEXT / MIGRATION SEAM (operator 2026-05-31) ────────────────────
 * Two things this reader absorbs as the system scales — and it is the single
 * place the rest of observe.ts is insulated from both:
 *  1. Backlog-item is ONE SUB-TYPE of a general WORK-ITEM (Max's framing) —
 *     work-items can be bugs and other kinds too. Today this reads the backlog
 *     sub-type; the general shape is a work-item carrying a sub-type.
 *  2. ZetaId gets a new `WorkItem` CATEGORY (operator 2026-05-31: "zetaid gets a
 *     new workitem category too after bus") — sequenced after the `Bus` category,
 *     alongside `Spawn`/`Heartbeat`. The backlog uses `B-xxxxx` ids today, which
 *     COLLIDE at scale — the very problem 128-bit ZetaIds solve everywhere else.
 *     The migration is `B-xxxxx` → 128-bit ZetaId **WorkItem-category** ids
 *     (backlog-item + bug + … as sub-types within `WorkItem`), and THIS reader is
 *     where that mapping lands: today `id` carries `B-xxxxx`; post-migration it
 *     carries (or pairs with) a `WorkItem` ZetaId.
 * Keeping the reader the single seam means observe.ts never sees `B-xxxxx` vs
 * ZetaId — only the observe DU.
 */

import { readBacklogItems, selectNextBacklogItem, type PickupSelection } from "../backlog/autonomous-pickup";
import { type BacklogItem, type NextAction, renderAction } from "./observe";

/** Backlog priority tiers (mirrors the non-exported union in autonomous-pickup). */
export type Priority = "P0" | "P1" | "P2" | "P3";

/**
 * Map the existing backlog selector's result onto the observe DU (pure).
 * `selectNextBacklogItem` only returns an item that already passed its blockers,
 * so a selected item is `ready: true`; `decompose-first` is the `ambiguous` signal.
 */
export function pickupToAction(sel: PickupSelection): NextAction {
  if (sel.status === "empty" || sel.selected === null) {
    return { kind: "free_time", reason: sel.reason };
  }
  const picked = sel.selected;
  const item: BacklogItem = {
    id: picked.id, // B-xxxxx today → ZetaId work-item id post-migration (the seam)
    title: picked.title,
    ready: true,
    ambiguous: sel.action === "decompose-first",
  };
  return sel.action === "decompose-first" ? { kind: "decompose", item } : { kind: "do_item", item };
}

/** Read the real backlog and return the next observe action (deterministic). */
export function nextActionFromBacklog(
  repoRoot: string,
  activeClaims: readonly string[] = [],
  maxPriority: Priority = "P2",
): NextAction {
  const items = readBacklogItems(repoRoot);
  const sel = selectNextBacklogItem(items, activeClaims, maxPriority);
  return pickupToAction(sel);
}

// ─── demo: print the real next action from the actual backlog ────────────────
if (import.meta.main) {
  const repoRoot = process.argv[2] ?? process.cwd();
  const action = nextActionFromBacklog(repoRoot);
  console.log(`observe ← real backlog (${repoRoot})`);
  console.log(`  ${renderAction(action)}`);
}
