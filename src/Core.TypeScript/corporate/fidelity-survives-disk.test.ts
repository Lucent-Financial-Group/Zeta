/**
 * fidelity-survives-disk.test.ts — what a run could do, written down.
 *
 * `fidelityOf` told a LIVE run whether it had touched anything. That answer lived in memory and died
 * at the disk boundary, so a store built from real commands and real `--no-ff` merges resumed
 * IDENTICALLY to one built from a pure simulation — same run count, same `delivered: true`, same
 * facts, same work items. Measured before this existed.
 *
 * That is the failure the port layer exists to prevent, displaced in time, and worse than the
 * original: after the fact it is not recoverable even in principle, because the evidence was never
 * written down.
 *
 * The headline test is the one that would have caught it: two stores, one real and one simulated,
 * must be TELLABLE APART from disk alone.
 */

import { describe, expect, test } from "bun:test";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { agentsFromChart, runOrgRuntime, type OrgRuntimeDeps } from "./org-runtime";
import { buildOrgChart } from "./org-chart";
import { SEED_HATS } from "./org-seed";
import { appendRun, deliveryRate, readEvents, readRuns } from "./org-store";
import { everyRunWasSimulated, foldOrganization, foldRunFidelity } from "./org-fold";
import { IntakeKind, Severity, type ExternalEvent } from "./intake";
import { RunOutcome } from "./qa";
import { Port, type ProviderSet } from "./providers";
import {
  autoApproveReview,
  simulatedChangeControl,
  simulatedIntake,
  simulatedTestRunner,
} from "./adapters";
import { OrgEventKind, type OrgEvent } from "./org-event";

const tempRoot = () => mkdtempSync(join(tmpdir(), "fidelity-disk-"));

const chart = (() => {
  const r = buildOrgChart(SEED_HATS);
  if (!r.ok) throw new Error(r.reason);
  return r.chart;
})();

const GOOD: ExternalEvent = {
  source: "portal",
  externalId: "T-1",
  kind: IntakeKind.Defect,
  severity: Severity.High,
  title: "checkout double-charges",
  reproduction: "twice",
  evidenceRefs: ["log/1"],
};

/** A set whose WORK port claims to be real without doing anything — fidelity is about the label. */
const withRealWork = (): ProviderSet => ({
  intake: simulatedIntake([GOOD]),
  work: {
    meta: { port: Port.WorkExecution, name: "realish", fidelity: "real", describes: "claims to reach" },
    execute: async (node) => ({
      ok: true,
      value: { workId: node.workId, succeeded: true, artifacts: [], summary: "s" },
      evidence: [],
    }),
  },
  tests: simulatedTestRunner(new Map(), RunOutcome.Passed),
  review: autoApproveReview(),
  change: simulatedChangeControl(),
});

function deps(over: Partial<OrgRuntimeDeps> = {}): OrgRuntimeDeps {
  let n = 0;
  return {
    chart,
    externalEvents: [GOOD],
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
      executivePriority: 0.5, customerImpact: 1, severity: 1, releaseRisk: 0.2,
      blockedDownstreamCount: 2, dependencyFanOut: 1, queueAgeMs: 0, hatScarcity: 0,
      budgetBurn: 0, estimatedEffort: 0.2,
    }),
    ...over,
  };
}

/** Run, and persist the way the CLIs do. */
async function runInto(store: string, providers?: ProviderSet) {
  const report = await runOrgRuntime(deps(providers === undefined ? {} : { providers }));
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
    store,
  );
  return report;
}

describe("TWO STORES THAT DIFFER IN REALITY MUST DIFFER ON DISK", () => {
  test("a simulated history and a real one are TELLABLE APART from the store alone", async () => {
    // The whole point. Before the `run_fidelity` fact these two were byte-identical in every
    // observable the store offered.
    const sim = tempRoot();
    const real = tempRoot();
    await runInto(sim);
    await runInto(real, withRealWork());

    // Identical in everything that was recorded BEFORE...
    expect(readRuns(sim)[0]?.delivered).toBe(readRuns(real)[0]?.delivered);
    expect(foldOrganization(readEvents(sim)).cascade.nodes.length)
      .toBe(foldOrganization(readEvents(real)).cascade.nodes.length);

    // ...and distinguishable now.
    const simFold = foldOrganization(readEvents(sim));
    const realFold = foldOrganization(readEvents(real));
    expect(everyRunWasSimulated(simFold.fidelities)).toBe(true);
    expect(everyRunWasSimulated(realFold.fidelities)).toBe(false);
    expect(simFold.fidelities[0]?.realPorts).toEqual([]);
    expect(realFold.fidelities[0]?.realPorts).toEqual([Port.WorkExecution]);
  });

  test("deliveryRate no longer reports a number that cannot tell shipped from decided", async () => {
    const sim = tempRoot();
    const real = tempRoot();
    await runInto(sim);
    await runInto(real, withRealWork());

    const simRate = deliveryRate(sim);
    const realRate = deliveryRate(real);
    // The old signature agreed on both, which was the defect.
    expect(simRate.delivered).toBe(realRate.delivered);
    // The new one does not.
    expect(simRate.deliveredSimulated).toBe(1);
    expect(simRate.deliveredForReal).toBe(0);
    expect(realRate.deliveredForReal).toBe(1);
    expect(realRate.deliveredSimulated).toBe(0);
  });

  test("THE PROSE AGREES WITH THE PORTS — the sentence a human reads is derived too", async () => {
    // `decision` is what appears in a log dump, and it is the only part of this fact most readers
    // will ever see. A constant sentence there would let the log say "performed nothing" over a run
    // that merged to a real branch — the exact failure, relocated from the field to the prose.
    const sim = tempRoot();
    const real = tempRoot();
    await runInto(sim);
    await runInto(real, withRealWork());

    const decisionIn = (store: string) =>
      readEvents(store).find((e) => e.kind === OrgEventKind.RunFidelity)?.decision ?? "";
    expect(decisionIn(sim)).toContain("performed nothing");
    expect(decisionIn(real)).not.toContain("performed nothing");
    expect(decisionIn(real)).toContain(Port.WorkExecution);
  });

  test("the fact names WHICH port was real, not merely that one was", async () => {
    // A reader asking "was the work performed, or was it the merge?" needs the ports, not a verdict.
    const store = tempRoot();
    await runInto(store, withRealWork());
    const reports = foldRunFidelity(readEvents(store));
    expect(reports).toHaveLength(1);
    expect(reports[0]?.realPorts).toEqual([Port.WorkExecution]);
    // Every port is still described, so nothing is hidden by being simulated.
    expect(reports[0]?.ports).toHaveLength(5);
  });
});

describe("A HISTORY IS PLURAL, and is never collapsed to one verdict", () => {
  test("one real run among simulated ones does not make the history 'simulated'", async () => {
    const store = tempRoot();
    await runInto(store);
    await runInto(store, withRealWork());
    const folded = foldOrganization(readEvents(store));
    expect(folded.fidelities).toHaveLength(2);
    expect(everyRunWasSimulated(folded.fidelities)).toBe(false);
  });

  test("AN EMPTY LOG IS NOT 'ALL SIMULATED' — no evidence of reality is not evidence of simulation", () => {
    // The conservative direction. Answering `true` here would let a store nobody has written to
    // assert something about runs that never happened.
    expect(everyRunWasSimulated([])).toBe(false);
    expect(foldRunFidelity([])).toEqual([]);
  });
});

describe("UNKNOWN is a real answer and is reported as one", () => {
  const ev = (over: Partial<OrgEvent> = {}): OrgEvent => ({
    id: "e1",
    kind: OrgEventKind.WorkItemTransition,
    atMs: 1_000,
    subjectId: "w1",
    decision: "d",
    supervisorChain: [],
    evidenceRefs: [],
    ...over,
  });

  test("a run recorded WITHOUT fidelity counts as unknown, never as simulated", () => {
    // Records predating the fact carry no fidelity. Reading that silence as "nothing was real"
    // would invent a fact about history nobody observed — the same refusal `directoryReview` makes
    // when no verdict was filed.
    const store = tempRoot();
    appendRun({ atMs: 0, delivered: true, levelsEngaged: [], refusals: [], trace: [ev()] }, store);
    const rate = deliveryRate(store);
    expect(rate.delivered).toBe(1);
    expect(rate.deliveredUnknownFidelity).toBe(1);
    expect(rate.deliveredSimulated).toBe(0);
    expect(rate.deliveredForReal).toBe(0);
  });

  test("and the record itself carries no invented field", () => {
    // `runId` is minted from the summary, so a defaulted `replayable: false` would both assert
    // something unmeasured AND change the identity of every such run.
    const store = tempRoot();
    appendRun({ atMs: 0, delivered: true, levelsEngaged: [], refusals: [], trace: [ev()] }, store);
    const record = readRuns(store)[0];
    expect(record).toBeDefined();
    expect("replayable" in (record ?? {})).toBe(false);
    expect("realPorts" in (record ?? {})).toBe(false);
  });

  test("A REFUSED RUN IS IN NO DELIVERED BUCKET — the buckets partition `delivered`, not the log", () => {
    // `deliveredSimulated` counting an undelivered run would inflate the only number that says how
    // much of the history actually shipped, and it would do so silently: the totals still add up
    // against each other, just not against `delivered`.
    const store = tempRoot();
    appendRun({ atMs: 0, delivered: false, levelsEngaged: [], refusals: ["nobody accepted the goal"],
      trace: [ev({ id: "e-refused" })], replayable: true, realPorts: [] }, store);
    const rate = deliveryRate(store);
    expect(rate.runs).toBe(1);
    expect(rate.delivered).toBe(0);
    expect(rate.deliveredSimulated).toBe(0);
    expect(rate.deliveredForReal).toBe(0);
    expect(rate.deliveredUnknownFidelity).toBe(0);
  });

  test("the three buckets account for every delivered run", async () => {
    const store = tempRoot();
    await runInto(store);
    appendRun({ atMs: 5, delivered: true, levelsEngaged: [], refusals: [], trace: [ev({ id: "e9", atMs: 5_000 })] }, store);
    const rate = deliveryRate(store);
    expect(rate.deliveredForReal + rate.deliveredSimulated + rate.deliveredUnknownFidelity).toBe(rate.delivered);
    expect(rate.deliveredSimulated).toBe(1);
    expect(rate.deliveredUnknownFidelity).toBe(1);
  });
});
