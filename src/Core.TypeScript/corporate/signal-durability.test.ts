/**
 * signal-durability.test.ts — the upward channel has to survive a process boundary.
 *
 * ── THE QUESTION THIS ANSWERS ────────────────────────────────────────────────
 * "Do we need the agent bus?" turned on one measurable thing: whether a supervisor signal
 * survives being written down. It did not. `supervisor_signal_sent` carried
 * `decision: "<tool> → <hat>"` and no fact, so the routed, evidenced signal was flattened to a
 * sentence the moment it was logged — fourteen other event kinds carried a value and this one did
 * not. A second process could read THAT a signal happened and not WHAT WAS ASKED.
 *
 * That is what made the gap look bus-shaped. It is not: corporate already has a content-addressed,
 * append-only, idempotent store that folds. The channel needed a fact, not a second substrate.
 *
 * So the load-bearing test here writes a run to disk, reads it back through a SEPARATE fold, and
 * asks the question a second process would ask: what is waiting for me?
 */

import { describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { agentsFromChart, runOrgRuntime, type OrgRuntimeDeps } from "./org-runtime";
import { buildOrgChart } from "./org-chart";
import { SEED_HATS } from "./org-seed";
import { appendRun, readEvents } from "./org-store";
import { foldEscalations, foldSupervisorSignals, signalsTo } from "./org-fold";

const chart = (() => {
  const r = buildOrgChart(SEED_HATS);
  if (!r.ok) throw new Error(r.reason);
  return r.chart;
})();

function deps(over: Partial<OrgRuntimeDeps> = {}): OrgRuntimeDeps {
  let n = 0;
  return {
    chart,
    externalEvents: [{ source: "t", externalId: "T-1", title: "checkout double charge", body: "b" }],
    agents: agentsFromChart(chart),
    observations: [],
    acceptingHatId: "cto",
    resourceAuthorityHatId: "rmo_office",
    priorityDeciderHatId: "cto",
    createId: (p) => `${p}-${String(++n).padStart(3, "0")}`,
    nowMs: 0,
    workBlockMs: 3_600_000,
    leaseMs: 300_000,
    priorityInputsFor: () => ({
      executivePriority: 0.5,
      customerImpact: 1,
      severity: 1,
      releaseRisk: 0.2,
      blockedDownstreamCount: 2,
      dependencyFanOut: 1,
      queueAgeMs: 0,
      hatScarcity: 0,
      budgetBurn: 0,
      estimatedEffort: 0.2,
    }),
    ...over,
  } as OrgRuntimeDeps;
}

/** Write a run to a fresh store and read the events back, as a second process would. */
async function roundTrip(runDeps: OrgRuntimeDeps = deps()) {
  const root = mkdtempSync(join(tmpdir(), "zeta-sig-"));
  const report = await runOrgRuntime(runDeps);
  appendRun(
    {
      atMs: 0,
      delivered: report.delivered,
      levelsEngaged: report.levelsEngaged,
      refusals: report.refusals,
      trace: report.trace,
      replayable: report.fidelity.replayable,
      realPorts: report.fidelity.realPorts,
    },
    root,
  );
  // READ FROM DISK. Not `report.trace` — that is the in-memory value, and the whole question is
  // whether the signal survives being written down and read by someone who was not there.
  const fromDisk = readEvents(root);
  rmSync(root, { recursive: true, force: true });
  return { report, fromDisk };
}

describe("A SIGNAL SURVIVES THE STORE — the upward channel crosses a process", () => {
  test("the run sends signals at all", async () => {
    const { report } = await roundTrip();
    expect(report.signals.length).toBeGreaterThan(0);
  });

  test("...and every one of them comes back off DISK as a value, not a sentence", async () => {
    // The defect this replaces: the event carried `decision: "<tool> → <hat>"` and no fact, so
    // this fold returned nothing and the channel ended at the process boundary.
    const { report, fromDisk } = await roundTrip();
    const folded = foldSupervisorSignals(fromDisk);
    expect(folded.length).toBe(report.signals.length);
  });

  test("THE STRUCTURE SURVIVES — tool, routing, evidence and message, not just the fact one was sent", async () => {
    const { report, fromDisk } = await roundTrip();
    const sent = report.signals[0];
    const read = foldSupervisorSignals(fromDisk).find((s) => s.signalId === sent?.signalId);
    expect(read).toBeDefined();
    expect(read?.tool).toBe(sent!.tool);
    expect(read?.fromHatId).toBe(sent!.fromHatId);
    expect(read?.toHatId).toBe(sent!.toHatId);
    expect(read?.message).toBe(sent!.message);
    // Evidence especially: a signal whose evidence did not survive is one the supervisor must
    // re-derive, which is the thing `evidenceSatisfies` refuses to let a sender skip.
    expect(read?.evidence.length).toBe(sent!.evidence.length);
  });

  test("'WHAT IS WAITING FOR ME?' is answerable from disk alone", async () => {
    // The question a second process actually asks. Answering it needs no bus — the store and a
    // fold are enough, because the signal is a fact in the same log as everything else.
    const { report, fromDisk } = await roundTrip();
    const target = report.signals[0]?.toHatId;
    expect(target).toBeDefined();
    const waiting = signalsTo(fromDisk, target!);
    expect(waiting.length).toBeGreaterThan(0);
    for (const s of waiting) expect(s.toHatId).toBe(target!);
  });

  test("a hat nobody signalled has nothing waiting — an empty answer, not a wrong one", async () => {
    const { fromDisk } = await roundTrip();
    expect(signalsTo(fromDisk, "no_such_hat")).toEqual([]);
  });
});

describe("ESCALATIONS survive as DECISIONS", () => {
  test("an escalating run's decisions come back off disk", async () => {
    // Forced by making every gate reject, so the churn threshold trips and the runtime escalates.
    const { report, fromDisk } = await roundTrip(deps({ qaFallback: "failed" } as Partial<OrgRuntimeDeps>));
    const folded = foldEscalations(fromDisk);
    // EXPLICITLY NON-ZERO first. `folded.length === report.escalations.length` alone passes as
    // 0 === 0 if this fixture ever stops escalating, and the test would then assert nothing while
    // still looking like a round-trip check. Measured: this deps set produces 2.
    expect(report.escalations.length).toBeGreaterThan(0);
    expect(folded.length).toBe(report.escalations.length);
    for (const e of folded) {
      expect(e.action).not.toBe("");
      expect(e.byHatId).not.toBe("");
      // The trigger too: an escalation without its cause is a decision nobody can review.
      expect(e.trigger).not.toBe("");
    }
  });

  test("a run with no escalations folds to none, rather than to something", async () => {
    const { report, fromDisk } = await roundTrip();
    expect(foldEscalations(fromDisk).length).toBe(report.escalations.length);
  });
});

describe("the folds are separate because the questions are", () => {
  test("SIGNALS ARE ASKING AND ESCALATIONS ARE DECIDING — one list is not the other", async () => {
    // A caller wanting to know what was DECIDED should not have to filter a list of REQUESTS.
    const { fromDisk } = await roundTrip();
    const signals = foldSupervisorSignals(fromDisk);
    const escalations = foldEscalations(fromDisk);
    expect(signals.length).toBeGreaterThan(0);
    // Disjoint by construction — no fact is both kinds.
    expect(escalations.some((e) => signals.some((s) => s.signalId === e.taskId))).toBe(false);
  });

  test("folding an empty log yields empty lists, never undefined", async () => {
    expect(foldSupervisorSignals([])).toEqual([]);
    expect(foldEscalations([])).toEqual([]);
    expect(signalsTo([], "anyone")).toEqual([]);
  });
});
