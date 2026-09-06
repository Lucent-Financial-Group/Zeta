/**
 * cycle-fidelity.test.ts — the pure path says what its answers were made of.
 *
 * `runOrgCycle` is deliberately a function of its inputs: no clock, no randomness, no I/O. That is a
 * feature. The defect was never the behaviour — it was the SILENCE. Measured before this existed:
 * 14 of 14 gate verdicts approved (runtime validation included), and no field anywhere in the report
 * from which a reader could learn it, while `run-org.ts --cycle` printed "task-004 passed the gates"
 * and "goal DELIVERED" in exactly the same voice as the run that reaches a real repository.
 *
 * The property under test is that the statement is DERIVED. A fidelity block that said the same
 * thing whatever the caller supplied would be the vacuity class wearing a disclosure.
 */

import { describe, expect, test } from "bun:test";
import { cycleFidelity, firstContributorUnder, runOrgCycle, type OrgCycleDeps } from "./org-cycle";
import { buildOrgChart } from "./org-chart";
import { SEED_HATS } from "./org-seed";
import { GateOutcome } from "./quality-gate";
import { EscalationAction } from "./escalation";
import type { OrgChooser } from "./org-decision";

const chart = (() => {
  const r = buildOrgChart(SEED_HATS);
  if (!r.ok) throw new Error(r.reason);
  return r.chart;
})();

function deps(over: Partial<OrgCycleDeps> = {}): OrgCycleDeps {
  let n = 0;
  return {
    chart,
    plan: {
      goalTitle: "cut checkout abandonment",
      acceptingHatId: "cto",
      initiativeTitles: ["fix the coupon path"],
      projectTitles: ["coupon service hardening"],
      taskTitles: ["stop the double-apply", "add the regression test"],
    },
    createId: (p) => `${p}-${String(++n).padStart(3, "0")}`,
    nowMs: 0,
    workBlockMs: 3_600_000,
    resourceAuthorityHatId: "rmo_office",
    contributorFor: (task) => firstContributorUnder(chart, task.ownerHatId),
    outcomeFor: () => "done",
    ...over,
  };
}

const sourceOf = (f: ReturnType<typeof cycleFidelity>, decision: string) =>
  f.decisions.find((d) => d.decision === decision);

describe("the statement is DERIVED, not declared", () => {
  test("with no choosers, the gate and the escalation are PREFERENCES", () => {
    const f = cycleFidelity(deps());
    expect(sourceOf(f, "gate")?.from).toBe("preference");
    expect(sourceOf(f, "gate")?.detail).toContain("approved");
    expect(sourceOf(f, "escalation")?.from).toBe("preference");
  });

  test("SUPPLYING A CHOOSER CHANGES THE REPORT — this is what makes it a measurement", () => {
    // A block that said the same thing whatever the caller supplied would disclose nothing.
    const chooser: OrgChooser<GateOutcome> = () => ({ index: 0, reason: "mine" });
    const f = cycleFidelity(deps({ gateChooser: chooser }));
    expect(sourceOf(f, "gate")?.from).toBe("caller");
    expect(sourceOf(f, "gate")?.detail).toContain("caller-supplied");
    // ...and only that entry moved. The escalation was not supplied, so it stays a preference.
    expect(sourceOf(f, "escalation")?.from).toBe("preference");
  });

  test("the escalation chooser moves independently of the gate chooser", () => {
    const escalate: OrgChooser<EscalationAction> = () => ({ index: 0, reason: "mine" });
    const f = cycleFidelity(deps({ escalationChooser: escalate }));
    expect(sourceOf(f, "escalation")?.from).toBe("caller");
    expect(sourceOf(f, "gate")?.from).toBe("preference");
  });

  test("EVERY decision is listed, including the ones the caller always answers", () => {
    // An omitted row reads as "not applicable" rather than "somebody else answered", and a reader
    // asking "did the organization decide this?" needs the answer for all of them.
    const f = cycleFidelity(deps());
    expect(f.decisions.map((d) => d.decision).sort()).toEqual([
      "escalation",
      "gate",
      "staffing",
      "work_outcome",
    ]);
    expect(sourceOf(f, "staffing")?.from).toBe("caller");
    expect(sourceOf(f, "work_outcome")?.from).toBe("caller");
    for (const d of f.decisions) expect(d.detail.length).toBeGreaterThan(10);
  });

  test("the SUMMARY is rendered from the decisions rather than written beside them", () => {
    // Counted, so it cannot drift from the table underneath it.
    expect(cycleFidelity(deps()).summary).toContain("2 of 4");
    const bothSupplied = cycleFidelity(
      deps({
        gateChooser: () => ({ index: 0, reason: "m" }),
        escalationChooser: () => ({ index: 0, reason: "m" }),
      }),
    );
    expect(bothSupplied.summary).toContain("4 of 4");
  });

  test("it says PERFORMED NOTHING, which is the sentence a reader needs beside 'DELIVERED'", () => {
    expect(cycleFidelity(deps()).summary).toContain("PERFORMED NOTHING");
  });
});

describe("the report carries it on every path", () => {
  test("a DELIVERED cycle reports it", async () => {
    const report = runOrgCycle(deps());
    expect(report.delivered).toBe(true);
    expect(report.fidelity.summary).toContain("PERFORMED NOTHING");
    expect(report.fidelity.decisions).toHaveLength(4);
  });

  test("AND SO DOES THE EARLY RETURN — the path that never reaches a goal", () => {
    // `runOrgCycle` returns early when the goal is not accepted. That return built its report by
    // hand, so it is exactly where a new field goes missing without anything noticing.
    const report = runOrgCycle(deps({ plan: { ...deps().plan, acceptingHatId: "backend_implementer" } }));
    expect(report.delivered).toBe(false);
    expect(report.refusals.length).toBeGreaterThan(0);
    expect(report.fidelity.decisions).toHaveLength(4);
    expect(report.fidelity.summary).toContain("PERFORMED NOTHING");
  });

  test("the reported source matches what the cycle ACTUALLY did", () => {
    // The statement and the behaviour have to agree, or the disclosure is decorative. With no
    // chooser every gate is approved; with a rejecting one the cycle does not deliver.
    const approved = runOrgCycle(deps());
    expect(approved.fidelity.decisions.find((d) => d.decision === "gate")?.from).toBe("preference");
    expect(approved.gateEvaluations.every((g) => g.outcome === GateOutcome.Approved)).toBe(true);

    const rejecting = runOrgCycle(
      deps({
        gateChooser: (legal) => ({
          index: Math.max(0, legal.indexOf(GateOutcome.Rejected)),
          reason: "not this time",
        }),
      }),
    );
    expect(rejecting.fidelity.decisions.find((d) => d.decision === "gate")?.from).toBe("caller");
    expect(rejecting.delivered).toBe(false);
  });
});
