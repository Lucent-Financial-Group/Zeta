import { describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { defaultMaxHoldMs, heldPastDeadline, takeStoreLock } from "./store-lock.ts";
import type { StoreLockOwner } from "./store-lock.ts";

describe("A HOLD DEADLINE, because a hung holder answers kill(pid,0) as alive forever", () => {
  // Aaron 2026-09-12: "we need timeouts cause agents often forget to release locks."
  // `isRunning` answers the CRASH case only. Every test below fails without the deadline.
  const OWNER = (pid: number, startedAt: string): StoreLockOwner => ({ pid, startedAt });

  test("a holder inside its deadline is still held", () => {
    const now = "2026-09-12T12:00:00.000Z";
    expect(heldPastDeadline(OWNER(1, "2026-09-12T11:00:00.000Z"), now, 2 * 60 * 60 * 1000)).toBe(false);
  });

  test("a holder PAST its deadline is not", () => {
    const now = "2026-09-12T12:00:00.000Z";
    expect(heldPastDeadline(OWNER(1, "2026-09-12T09:00:00.000Z"), now, 2 * 60 * 60 * 1000)).toBe(true);
  });

  test("the boundary is inclusive — exactly at the deadline expires", () => {
    const now = "2026-09-12T12:00:00.000Z";
    expect(heldPastDeadline(OWNER(1, "2026-09-12T10:00:00.000Z"), now, 2 * 60 * 60 * 1000)).toBe(true);
  });

  test("a holder whose clock is AHEAD of ours does not read as freshly started forever", () => {
    // Negative age is SKEW, not freshness. Clamped at zero, so only elapsed time counts and a
    // future timestamp cannot buy an unbounded hold.
    const now = "2026-09-12T12:00:00.000Z";
    expect(heldPastDeadline(OWNER(1, "2027-01-01T00:00:00.000Z"), now, 1)).toBe(false);
    expect(heldPastDeadline(OWNER(1, "2027-01-01T00:00:00.000Z"), now, 0)).toBe(true);
  });

  test("an UNPARSEABLE startedAt expires rather than wedging forever", () => {
    // Deliberate, and argued in the source: obeying a holder whose age cannot be established
    // makes one malformed record a permanent wedge, which is what the deadline exists to remove.
    const now = "2026-09-12T12:00:00.000Z";
    expect(heldPastDeadline(OWNER(1, "not-a-timestamp"), now, 2 * 60 * 60 * 1000)).toBe(true);
    expect(heldPastDeadline(OWNER(1, "unknown"), now, 2 * 60 * 60 * 1000)).toBe(true);
  });

  test("END TO END: a LIVE holder past the deadline is taken over", () => {
    const dir = mkdtempSync(join(tmpdir(), "storelock-deadline-"));
    // process.pid is genuinely alive, so `isRunning` says HELD and only the deadline can free it.
    const first = takeStoreLock(dir, "2026-09-12T09:00:00.000Z", process.pid, 60 * 60 * 1000);
    expect(first.ok).toBe(true);
    // A DIFFERENT pid, also alive (ours), three hours later.
    const second = takeStoreLock(dir, "2026-09-12T12:00:00.000Z", process.pid + 1, 60 * 60 * 1000);
    expect(second.ok).toBe(true);
    if (second.ok) expect(second.tookOverFrom?.pid).toBe(process.pid);
    rmSync(dir, { recursive: true, force: true });
  });

  test("THE CONTROL: a live holder INSIDE the deadline is still refused", () => {
    // Without this, a deadline of zero would pass every test above and the lock would exclude
    // nothing at all.
    const dir = mkdtempSync(join(tmpdir(), "storelock-deadline-ctl-"));
    const first = takeStoreLock(dir, "2026-09-12T11:59:00.000Z", process.pid, 60 * 60 * 1000);
    expect(first.ok).toBe(true);
    const second = takeStoreLock(dir, "2026-09-12T12:00:00.000Z", process.pid + 1, 60 * 60 * 1000);
    expect(second.ok).toBe(false);
    if (!second.ok) expect(second.heldBy.pid).toBe(process.pid);
    rmSync(dir, { recursive: true, force: true });
  });

  test("a malformed ZETA_STORE_LOCK_MAX_HOLD_MS is reported and ignored, never read as zero", () => {
    // Zero would expire every holder instantly — the loudest possible way to get this wrong.
    const prev = process.env.ZETA_STORE_LOCK_MAX_HOLD_MS;
    for (const bad of ["0", "-5", "abc", "NaN"]) {
      process.env.ZETA_STORE_LOCK_MAX_HOLD_MS = bad;
      expect(defaultMaxHoldMs()).toBe(2 * 60 * 60 * 1000);
    }
    process.env.ZETA_STORE_LOCK_MAX_HOLD_MS = "1500";
    expect(defaultMaxHoldMs()).toBe(1500);
    if (prev === undefined) delete process.env.ZETA_STORE_LOCK_MAX_HOLD_MS;
    else process.env.ZETA_STORE_LOCK_MAX_HOLD_MS = prev;
  });
});
