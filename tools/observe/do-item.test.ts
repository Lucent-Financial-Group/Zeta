/**
 * tools/observe/do-item.test.ts — Phase-1 acceptance for effectful do_item (B-0964).
 *
 * Proves: the fact envelope (Started→Succeeded|Failed), the injected executor port
 * (fake — no shell), the success/failure transitions, the audit tier in the
 * Started fact, applyFact-delegates-to-simulate (single reducer), and the
 * load-bearing correctness guarantee — **replay folds facts without an executor**
 * (foldFacts has no executor param, so re-running the log cannot re-run the work).
 */

import { describe, expect, it } from "bun:test";

import { simulate, type BacklogItem, type World } from "./observe";
import type { ActionFact, RunOutcome } from "./do-item";
import { applyFact, executeDoItem, fakeExecutor, foldFacts, type CommandExecutor } from "./do-item";
import type { AppendOutcome, EventSink } from "./execute";

const item = (id: string): BacklogItem => ({ id, title: id, ready: true, ambiguous: false });
const w = (backlog: BacklogItem[]): World => ({ backlog });

/** Fake fact-sink: records appends; never touches git. */
function fakeFactSink(): EventSink<ActionFact> & { appended: ActionFact[] } {
  const appended: ActionFact[] = [];
  return {
    appended,
    append: (event: ActionFact): Promise<AppendOutcome> => {
      appended.push(event);
      return Promise.resolve({ ok: true, eventId: `evt-${String(appended.length)}` });
    },
  };
}
/** Fact-sink that fails the Nth append (1-based) — for durability-failure tests. */
function failingFactSink(failOn: number): EventSink<ActionFact> & { appended: ActionFact[]; calls: number } {
  const appended: ActionFact[] = [];
  const sink = {
    appended,
    calls: 0,
    append: (event: ActionFact): Promise<AppendOutcome> => {
      sink.calls += 1;
      if (sink.calls === failOn) return Promise.resolve({ ok: false, reason: "remote ahead" });
      appended.push(event);
      return Promise.resolve({ ok: true, eventId: `evt-${String(sink.calls)}` });
    },
  };
  return sink;
}

const okRun: RunOutcome = { ok: true, stdout: "built", exitCode: 0 };
const failRun: RunOutcome = { ok: false, reason: "build failed", exitCode: 1, stderr: "error" };
const opts = { spec: { script: "noop" }, gated: false };

describe("executeDoItem — the fact envelope", () => {
  it("success: Started→Succeeded logged, item leaves backlog, completed=true", async () => {
    const world = w([item("B-1"), item("B-2")]);
    const sink = fakeFactSink();
    const r = await executeDoItem(world, item("B-1"), sink, fakeExecutor(okRun), opts);

    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.completed).toBe(true);
    expect(r.world.backlog.map((i) => i.id)).toEqual(["B-2"]); // B-1 done, gone
    expect(r.world.mode).toBe("work");
    expect(sink.appended.map((f) => f.kind)).toEqual(["ActionExecutionStarted", "ActionExecutionSucceeded"]);
  });

  it("failure: Started→Failed logged, item STAYS, completed=false, reason carried", async () => {
    const world = w([item("B-1")]);
    const sink = fakeFactSink();
    const r = await executeDoItem(world, item("B-1"), sink, fakeExecutor(failRun), opts);

    expect(r.ok).toBe(true);
    if (!r.ok || r.completed) return;
    expect(r.world.backlog.map((i) => i.id)).toEqual(["B-1"]); // still there — work failed
    expect(r.reason).toBe("build failed");
    expect(sink.appended.map((f) => f.kind)).toEqual(["ActionExecutionStarted", "ActionExecutionFailed"]);
  });

  it("the Started fact records the executor TIER + gated (the §3 glass-halo audit)", async () => {
    const sink = fakeFactSink();
    const dockerish: CommandExecutor = { tier: "docker", run: () => Promise.resolve(okRun) };
    await executeDoItem(w([item("B-1")]), item("B-1"), sink, dockerish, { spec: { script: "x" }, gated: true });

    const started = sink.appended[0];
    expect(started?.kind).toBe("ActionExecutionStarted");
    if (started?.kind !== "ActionExecutionStarted") return;
    expect(started.tier).toBe("docker");
    expect(started.gated).toBe(true);
  });

  it("durability failure on Started: no executor run, no transition, ok=false", async () => {
    const world = w([item("B-1")]);
    const sink = failingFactSink(1); // first append (Started) fails
    let ran = false;
    const watchExecutor: CommandExecutor = {
      tier: "fake",
      run: () => {
        ran = true;
        return Promise.resolve(okRun);
      },
    };

    const r = await executeDoItem(world, item("B-1"), sink, watchExecutor, opts);
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.feedback.kind).toBe("append-failed");
    expect(ran).toBe(false); // executor never ran — append-first
    expect(sink.appended).toHaveLength(0);
  });
});

describe("foldFacts — replay folds FACTS, never re-runs (B-0964 §0 correctness)", () => {
  it("replaying [Started, Succeeded] reconstructs the executed world — with NO executor", async () => {
    const world = w([item("B-1"), item("B-2")]);
    const sink = fakeFactSink();
    const r = await executeDoItem(world, item("B-1"), sink, fakeExecutor(okRun), opts);
    if (!r.ok) throw new Error("expected ok");

    // foldFacts takes only (initial, facts) — structurally cannot call an executor.
    const replayed = foldFacts(world, sink.appended);
    expect(replayed).toEqual(r.world); // the log reconstructs the executed state
    expect(replayed.backlog.map((i) => i.id)).toEqual(["B-2"]);
  });

  it("replaying a failed run leaves the item in the backlog", () => {
    const world = w([item("B-1")]);
    const facts: ActionFact[] = [
      { kind: "ActionExecutionStarted", item: item("B-1"), tier: "fake", gated: false },
      { kind: "ActionExecutionFailed", item: item("B-1"), reason: "x" },
    ];
    expect(foldFacts(world, facts).backlog.map((i) => i.id)).toEqual(["B-1"]);
  });

  it("applyFact(Succeeded) is IDENTICAL to simulate(do_item) — the single reducer, no drift", () => {
    const world = w([item("B-1"), item("B-2")]);
    const viaFact = applyFact(world, { kind: "ActionExecutionSucceeded", item: item("B-1") });
    const viaSimulate = simulate(world, { kind: "do_item", item: item("B-1") });
    expect(viaFact).toEqual(viaSimulate);
  });
});
