/**
 * tools/observe/event-sink-folder.test.ts — the real folder-direct-to-main sink.
 *
 * No real git: `commit` is injected with a fake. Writes go to a real temp dir.
 * Verifies the fact envelope shape + ZetaId identity (Category.WorkItem) +
 * idempotency (EEXIST = ok, G-Set) + Result discipline (write/commit failure →
 * ok:false, never throws) + composition with `execute`.
 */

import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { unpack } from "../../src/Core.TypeScript/zeta-id/zeta-id";
import { Category, type ZetaId } from "../../src/Core.TypeScript/zeta-id/types";
import { execute } from "./execute";
import { folderSink, gitCommitToMain, mintObserveEventIdHex, type CommitOutcome, type EventEnvelope } from "./event-sink-folder";
import type { NextAction, World } from "./observe";

let dir: string;
let committed: { path: string; envelope: EventEnvelope }[];
const okCommit = (path: string, envelope: EventEnvelope): CommitOutcome => {
  committed.push({ path, envelope });
  return { ok: true };
};
const FIXED = Date.UTC(2026, 4, 31, 12, 0, 0); // 2026-05-31T12:00:00.000Z

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "observe-events-"));
  committed = [];
});
afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

const freeTime: NextAction = { kind: "free_time", reason: "rest" };

describe("folderSink — write the fact envelope + commit", () => {
  it("writes <eventDir>/<id>.json and commits it; returns ok + eventId", async () => {
    const sink = folderSink({ eventDir: dir, by: "otto-cli", mint: () => "abc123", now: () => FIXED, commit: okCommit });
    const r = await sink.append(freeTime);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.eventId).toBe("abc123");
    expect(committed).toHaveLength(1);
    expect(committed[0]?.path).toBe(join(dir, "abc123.json"));

    const env = JSON.parse(readFileSync(join(dir, "abc123.json"), "utf-8")) as EventEnvelope;
    expect(env).toEqual({ id: "abc123", at: "2026-05-31T12:00:00.000Z", by: "otto-cli", action: freeTime });
  });

  it("is idempotent: same id appended twice → both ok (EEXIST is a no-op, G-Set)", async () => {
    const sink = folderSink({ eventDir: dir, by: "otto-cli", mint: () => "dup", now: () => FIXED, commit: okCommit });
    const a = await sink.append(freeTime);
    const b = await sink.append(freeTime);
    expect(a.ok && b.ok).toBe(true);
  });

  it("surfaces a commit failure as ok:false (never throws)", async () => {
    const failCommit = (): CommitOutcome => ({ ok: false, reason: "not on main" });
    const sink = folderSink({ eventDir: dir, by: "otto-cli", mint: () => "x", now: () => FIXED, commit: failCommit });
    const r = await sink.append(freeTime);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("not on main");
  });

  it("surfaces a write failure as ok:false (unwritable dir, never throws)", async () => {
    const sink = folderSink({ eventDir: "/dev/null/cannot-create", by: "otto-cli", mint: () => "y", now: () => FIXED, commit: okCommit });
    const r = await sink.append(freeTime);
    expect(r.ok).toBe(false);
    expect(committed).toHaveLength(0); // never reached commit
  });
});

describe("mintObserveEventIdHex — stable WorkItem-category identity", () => {
  it("mints a 32-hex id tagged Category.WorkItem", () => {
    const id = mintObserveEventIdHex();
    expect(id).toMatch(/^[0-9a-f]{32}$/);
    expect(unpack(BigInt(`0x${id}`) as ZetaId).category).toBe(Category.WorkItem);
  });

  it("two mints are distinct (crypto env)", () => {
    expect(mintObserveEventIdHex()).not.toBe(mintObserveEventIdHex());
  });
});

describe("folderSink composes with execute (the real adapter end-to-end)", () => {
  it("execute(free_time, folderSink) appends the event + transitions mode", async () => {
    const world: World = { backlog: [] };
    const sink = folderSink({ eventDir: dir, by: "otto-cli", mint: () => "evt", now: () => FIXED, commit: okCommit });
    const r = await execute(world, freeTime, sink);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.world.mode).toBe("free_time");
      expect(r.eventId).toBe("evt");
    }
    // the durable event landed (one file, one commit)
    expect(committed).toHaveLength(1);
    const env = JSON.parse(readFileSync(join(dir, "evt.json"), "utf-8")) as EventEnvelope;
    expect(env.action).toEqual(freeTime);
  });
});

describe("gitCommitToMain — exported (real default; not run here)", () => {
  it("is a function (real git path is exercised by the runtime, not unit tests)", () => {
    expect(typeof gitCommitToMain).toBe("function");
  });
});
