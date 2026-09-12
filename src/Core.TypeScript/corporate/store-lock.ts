/**
 * corporate/store-lock.ts — one run at a time on an organization's store.
 *
 * A store is one organization's record of one body of work, and two runs over it at once interleave
 * two records into one: both raise the same action items, both follow up the same change, both push.
 * Until something watched the organization on a timer that was a matter of the operator's care; with
 * a watcher starting runs by itself it is a race waiting for its first overlap. So a run takes the
 * store's lock before it touches anything and gives it back when it exits.
 *
 * A lock whose owner is no longer running is stale - the run crashed, or the machine restarted - and
 * is taken over rather than obeyed, so a crash never wedges an organization. Liveness is asked of the
 * operating system (`kill(pid, 0)` sends nothing and only asks); a pid that is alive but belongs to
 * another program is read as alive, which errs toward not running - the direction that cannot
 * double-push.
 *
 * THE TAKEOVER USED TO BREAK MUTUAL EXCLUSION, which is why the mechanism now lives in
 * `io/exclusive-lock.ts` rather than here. This file read the stale owner and then `rmSync`-ed the
 * PATH, and a path resolves afresh on every call: two runs racing one stale lock could both read the
 * dead owner, the second's unlink could delete the first's brand-new live lock, and both would
 * proceed. Release had the same shape - read the owner, compare the pid, unlink the path - so a run
 * that outlived its own takeover could still delete its successor's lock, which is exactly what the
 * comparison was written to prevent. CodeQL reported the read as `js/file-system-race` (alert #955);
 * the report was right and the defect was a real double-run, not a scanner's opinion.
 *
 * The replacement never deletes a lock it did not create: see `io/exclusive-lock.ts` for the
 * generation protocol and the falsifiers that race eight processes at one lock.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { currentHolder, takeExclusiveLock } from "../io/exclusive-lock.ts";
import type { LockOwner } from "../io/exclusive-lock.ts";

export type StoreLockOwner = LockOwner;

export type StoreLock =
  | { readonly ok: true; readonly release: () => void; readonly tookOverFrom?: StoreLockOwner }
  | { readonly ok: false; readonly heldBy: StoreLockOwner };

/** Is this process running? Asked, never assumed. */
export function isRunning(pid: number): boolean {
  if (!Number.isInteger(pid) || pid <= 0) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch (err) {
    // EPERM: it exists and belongs to someone else - that is running.
    return (err as NodeJS.ErrnoException).code === "EPERM";
  }
}

/**
 * The longest a run may hold the store's lock before another run may take it.
 *
 * WHY A DEADLINE EXISTS AT ALL. `isRunning` asks the operating system whether a pid is alive,
 * which answers the CRASH case and nothing else. A holder that is alive but wedged -- a stalled
 * network read, a stopped process, an agent that simply never called `release` -- is reported
 * alive forever, and the lock is obeyed forever with it. Aaron 2026-09-12: *"we need timeouts
 * cause agents often forget to release locks."* That is the ordinary case here, not the exotic
 * one, so the absence of a deadline is the live defect rather than a theoretical one.
 *
 * WHY TAKING IT OVER IS SAFE HERE, which is the part that has to be argued rather than assumed.
 * A deadline-based takeover means two runs can proceed at once, and in general that is worse than
 * a wedge -- a lease without a fencing token converts "stuck forever" into "silent double write"
 * (Kleppmann, *How to do distributed locking*, 2016). It is safe for THIS store because the store
 * cannot interleave: every event is written as its own shard whose FILENAME IS ITS CONTENT
 * ADDRESS (`identifyEvent` in org-store.ts), and `readEvents` orders by the event's own `atMs`,
 * never by filename. Two byte-identical events collapse to one address; two different events get
 * different addresses and BOTH SURVIVE. No file is shared between writers, so there is nothing to
 * interleave -- two concurrent runs produce a union, which is two versions somebody can compare.
 * Aaron, same day: *"duplicate work is okay, we can just compare the two versions."*
 *
 * That argument is load-bearing, so it is stated rather than implied: if a future run ever writes
 * to a SHARED APPEND TARGET rather than to content-addressed shards, this deadline stops being
 * safe on its own and needs the generation fenced at the resource (081M2B02991087G0R002XYKG54).
 *
 * Two hours by default: long enough that no honest run is interrupted, short enough that a
 * forgotten lock does not outlive the working day. Override with ZETA_STORE_LOCK_MAX_HOLD_MS.
 */
export function defaultMaxHoldMs(): number {
  const raw = process.env.ZETA_STORE_LOCK_MAX_HOLD_MS;
  if (raw === undefined || raw.length === 0) return 2 * 60 * 60 * 1000;
  const parsed = Number(raw);
  // A malformed override is REPORTED and ignored, never silently treated as zero -- zero would
  // expire every holder instantly, which is the loudest possible way to get this wrong quietly.
  if (!Number.isFinite(parsed) || parsed <= 0) {
    process.stderr.write(
      `store-lock: ignoring ZETA_STORE_LOCK_MAX_HOLD_MS=${raw} (not a positive number); using the default\n`,
    );
    return 2 * 60 * 60 * 1000;
  }
  return parsed;
}

/**
 * Has this owner held the lock longer than it is allowed to?
 *
 * `startedAt` is written by the HOLDER and compared against the OBSERVER's clock, so across two
 * machines this carries their skew. That is acceptable precisely here and nowhere else: this
 * decides a LOCAL action (do I wait, or do I proceed), which
 * `.claude/rules/local-time-never-enters-the-shared-fold.md` explicitly permits. It must never be
 * used to decide what enters a shared conclusion.
 *
 * AN UNPARSEABLE `startedAt` IS TREATED AS EXPIRED, and that is a deliberate choice against the
 * usual instinct. The alternative -- obey a holder whose age cannot be established -- makes a
 * single malformed record a permanent wedge, which is the exact failure this deadline exists to
 * remove. It is defensible only because a takeover here costs a duplicated run and never
 * corrupted state (see above); under a shared-append store the safe default would invert.
 */
export function heldPastDeadline(owner: StoreLockOwner, nowIso: string, maxHoldMs: number): boolean {
  const started = Date.parse(owner.startedAt);
  const now = Date.parse(nowIso);
  if (!Number.isFinite(started) || !Number.isFinite(now)) return true;
  // A holder whose clock is AHEAD of ours yields a negative age. That is skew, not freshness, and
  // it must not read as "just started" forever -- clamp at zero so only elapsed time counts.
  const heldMs = Math.max(0, now - started);
  return heldMs >= maxHoldMs;
}

/** Where the generations live. A DIRECTORY, so a holder is a file only its creator can remove. */
function lockRoot(store: string): string {
  return join(store, "run.lock.d");
}

/**
 * A run started under the single-file protocol this file used to implement.
 *
 * READ-ONLY, AND NEVER DELETED. A run that is mid-flight when this version lands still holds
 * `<store>/run.lock`, and ignoring it would let the new protocol start a second run over the same
 * store - the precise failure the lock exists to prevent. So a LIVE owner recorded there is still
 * obeyed. A dead one is ignored, and the file is left alone rather than cleaned up, because
 * deleting a path whose contents were read separately is the defect this whole change removes.
 */
function legacyHolder(store: string): StoreLockOwner | undefined {
  try {
    const raw: unknown = JSON.parse(readFileSync(join(store, "run.lock"), "utf-8"));
    if (typeof raw !== "object" || raw === null) return undefined;
    const rec = raw as { pid?: unknown; startedAt?: unknown };
    if (typeof rec.pid !== "number" || typeof rec.startedAt !== "string") return undefined;
    return isRunning(rec.pid) ? { pid: rec.pid, startedAt: rec.startedAt } : undefined;
  } catch {
    return undefined;
  }
}

/** Who holds the store's lock right now, if anyone living does. */
export function lockHolder(store: string): StoreLockOwner | undefined {
  return currentHolder(lockRoot(store), (owner) => isRunning(owner.pid)) ?? legacyHolder(store);
}

const heldHere = new Set<() => void>();
let exitHooked = false;

/** Give the lock back when this process exits, however it exits - one hook, however many locks. */
export function releaseOnExit(release: () => void): void {
  heldHere.add(release);
  if (exitHooked) return;
  exitHooked = true;
  process.once("exit", () => {
    for (const r of heldHere) r();
  });
}

/** Take the store's lock for this process, or say who has it. */
export function takeStoreLock(
  store: string,
  nowIso: string = new Date().toISOString(),
  pid: number = process.pid,
  maxHoldMs: number = defaultMaxHoldMs(),
): StoreLock {
  const legacy = legacyHolder(store);
  if (legacy !== undefined && legacy.pid !== pid) return { ok: false, heldBy: legacy };

  const held = takeExclusiveLock(lockRoot(store), {
    pid,
    nowIso,
    // Our own pid is not an obstacle to ourselves: a re-entrant take is a takeover, as before.
    // A holder must be BOTH running AND within its hold deadline. `isRunning` alone cannot see
    // a hung holder, and an agent that forgets to release is the common case, not the exotic one.
    isHeld: (owner) => owner.pid !== pid && isRunning(owner.pid) && !heldPastDeadline(owner, nowIso, maxHoldMs),
  });
  if (!held.ok) {
    // `heldBy` is absent only when every attempt lost the generation race without ever reading an
    // owner - report the unknown holder rather than claiming the lock is free.
    return { ok: false, heldBy: held.heldBy ?? { pid: -1, startedAt: "unknown" } };
  }
  return held.tookOverFrom !== undefined
    ? { ok: true, release: held.release, tookOverFrom: held.tookOverFrom }
    : { ok: true, release: held.release };
}
