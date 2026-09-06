/**
 * lifecycle.test.ts — the delivery lifecycle, and the claim that an agent cannot step around it.
 *
 * The chain the organization actually runs:
 *
 *   business context groomed  ->  RFP read  ->  BRD approved  ->  PEER review of the context
 *   ->  architecture designed ->  architecture approved  ->  ADVERSARIAL review of all of it
 *   ->  implemented + reviewed ->  UAT  ->  tests actually ran  ->  business sign-off
 *   ->  architect reviews what was BUILT  ->  release
 *
 * Three properties make that a workflow rather than a checklist, and each has a test here:
 *
 *   ORDERED     a gate whose priors have not passed is refused, so no ordering of calls reaches
 *               release early.
 *   OWNED       every gate has a hat that holds its approval scope, and an unowned gate BLOCKS
 *               rather than passing.
 *   UNFORGEABLE the decision comes from the evaluator's own authority; a hat cannot approve its
 *               own work, and cannot award itself an outcome its level does not hold.
 *
 * The interesting direction is the negative one. A chain that only ever gets exercised by a
 * cooperative caller is a chain nobody has tested — so most of this file drives it adversarially.
 */

import { describe, expect, test } from "bun:test";
import {
  allGatesPassed,
  evaluateGate,
  GateKind,
  GateOutcome,
  gateOwners,
  mayEvaluate,
  nextLegalGate,
  NO_PROPOSER,
  ORDERED_GATES,
  recoveryPathFor,
  type GateEvaluation,
} from "./quality-gate";
import { buildOrgChart } from "./org-chart";
import { SEED_HATS } from "./org-seed";
import type { OrgChooser } from "./org-decision";

const chart = (() => {
  const r = buildOrgChart(SEED_HATS);
  if (!r.ok) throw new Error(r.reason);
  return r.chart;
})();

const approve: OrgChooser<GateOutcome> = (legal) => ({
  index: Math.max(0, legal.indexOf(GateOutcome.Approved)),
  reason: "looks right",
});

const priorsOf = (gate: GateKind): Set<GateKind> =>
  new Set(ORDERED_GATES.slice(0, ORDERED_GATES.indexOf(gate)));

/** An owner of `gate` other than `exclude`, so a test can pick a legitimate evaluator. */
const anOwnerOf = (gate: GateKind, exclude?: string): string => {
  const owner = gateOwners(chart, gate).find((h) => h.id !== exclude);
  if (owner === undefined) throw new Error(`no owner for ${gate}`);
  return owner.id;
};

describe("THE LIFECYCLE IS THE ONE THAT WAS ASKED FOR", () => {
  test("every named phase exists as a gate", () => {
    // Written as the phases a reader asked for rather than as the enum's own names, so renaming a
    // constant cannot quietly delete a phase from the process.
    const has = (g: GateKind) => ORDERED_GATES.includes(g);
    expect(has(GateKind.BusinessContextGrooming)).toBe(true); // groom from a data source
    expect(has(GateKind.PeerReview)).toBe(true); // peer review
    expect(has(GateKind.ArchitectureDesign)).toBe(true); // architecture doc design
    expect(has(GateKind.ArchitectureApproval)).toBe(true); // doc review
    expect(has(GateKind.AdversarialReview)).toBe(true); // adversarial review across all of it
    expect(has(GateKind.ImplementationReview)).toBe(true); // review after implementing
    expect(has(GateKind.QaUat)).toBe(true); // QA UAT
    expect(has(GateKind.RuntimeValidation)).toBe(true); // strong testing
    expect(has(GateKind.FinalBusinessValidation)).toBe(true); // business review
    expect(has(GateKind.FinalArchitectureReview)).toBe(true); // architect review of what was built
    expect(has(GateKind.ReleaseReadiness)).toBe(true); // delivery
  });

  test("EVERY gate has an owner — an unstaffed phase would block the whole organization", () => {
    for (const gate of ORDERED_GATES) {
      expect(gateOwners(chart, gate).length).toBeGreaterThan(0);
    }
  });

  test("the adversarial gate is owned by MORE THAN ONE line", () => {
    // A single owner makes an adversarial review a formality performed by whoever built the plan's
    // neighbourhood. Architecture, engineering and QA all hold it, so the pass can come from
    // outside the line that produced the thing.
    const owners = gateOwners(chart, GateKind.AdversarialReview).map((h) => h.departmentId);
    expect(new Set(owners).size).toBeGreaterThan(1);
  });
});

describe("ORDERED — no sequence of calls reaches release early", () => {
  test("EVERY gate refuses when its priors have not passed", () => {
    // Not just the last one. Each gate is attempted with an empty history by a hat that genuinely
    // owns it, so the only thing that can refuse the call is the ordering.
    for (const gate of ORDERED_GATES.slice(1)) {
      const r = evaluateGate(chart, {
        workId: "w1",
        gate,
        evaluatorHatId: anOwnerOf(gate),
        passed: new Set(),
        chooser: approve,
        atMs: 0,
        proposerHatId: NO_PROPOSER,
      });
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.reason).toContain("crossed in order");
    }
  });

  test("...and the FIRST gate is accepted from an empty history, so the refusal is not blanket", () => {
    const first = ORDERED_GATES[0]!;
    const r = evaluateGate(chart, {
      workId: "w1",
      gate: first,
      evaluatorHatId: anOwnerOf(first),
      passed: new Set(),
      chooser: approve,
      atMs: 0,
      proposerHatId: NO_PROPOSER,
    });
    expect(r.ok).toBe(true);
  });

  test("SKIPPING ONE gate stops the chain at exactly that gate", () => {
    // The adversarial review is the one an impatient agent would most want to skip: it costs time
    // and its only output is bad news. Passing everything except it must not reach release.
    const passed = new Set(ORDERED_GATES.filter((g) => g !== GateKind.AdversarialReview));
    expect(allGatesPassed(passed)).toBe(false);
    expect(nextLegalGate(passed)).toBe(GateKind.AdversarialReview);
  });

  test("a full history minus ANY one gate is never complete", () => {
    for (const missing of ORDERED_GATES) {
      const passed = new Set(ORDERED_GATES.filter((g) => g !== missing));
      expect(allGatesPassed(passed)).toBe(false);
      expect(nextLegalGate(passed)).toBe(missing);
    }
  });

  test("and the complete history IS complete — the check can pass", () => {
    expect(allGatesPassed(new Set(ORDERED_GATES))).toBe(true);
  });
});

describe("OWNED — authority is checked, not asserted by the caller", () => {
  test("a hat that does not hold the scope is refused even in the right order", () => {
    const r = evaluateGate(chart, {
      workId: "w1",
      gate: GateKind.AdversarialReview,
      evaluatorHatId: "product_manager", // owns the context gates, not this one
      passed: priorsOf(GateKind.AdversarialReview),
      chooser: approve,
      atMs: 0,
      proposerHatId: NO_PROPOSER,
    });
    expect(r.ok).toBe(false);
  });

  test("...and an actual owner of the same gate, at the same point, is accepted", () => {
    // The pair is the measurement. Without it the refusal above could be an ordering bug.
    const r = evaluateGate(chart, {
      workId: "w1",
      gate: GateKind.AdversarialReview,
      evaluatorHatId: anOwnerOf(GateKind.AdversarialReview),
      passed: priorsOf(GateKind.AdversarialReview),
      chooser: approve,
      atMs: 0,
      proposerHatId: NO_PROPOSER,
    });
    expect(r.ok).toBe(true);
  });

  test("mayEvaluate agrees with gateOwners for every gate and every hat", () => {
    // Two answers to one question, from different code. If they disagree, one of them is deciding
    // authority in a way the other cannot see.
    for (const gate of ORDERED_GATES) {
      const owners = new Set(gateOwners(chart, gate).map((h) => h.id));
      for (const hat of chart.byId.keys()) {
        expect(mayEvaluate(chart, hat, gate)).toBe(owners.has(hat));
      }
    }
  });
});

describe("UNFORGEABLE — the evaluator cannot be the author", () => {
  test("no gate lets a hat approve work it did itself", () => {
    for (const gate of ORDERED_GATES) {
      const owner = anOwnerOf(gate);
      const r = evaluateGate(chart, {
        workId: "w1",
        gate,
        evaluatorHatId: owner,
        passed: priorsOf(gate),
        chooser: approve,
        atMs: 0,
        proposerHatId: owner, // the evaluator IS the author
      });
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.reason).toContain("did this work");
    }
  });

  test("...and the same call with a different author is accepted", () => {
    for (const gate of ORDERED_GATES) {
      const owner = anOwnerOf(gate);
      const other = anOwnerOf(gate, owner) ?? "backend_implementer";
      const r = evaluateGate(chart, {
        workId: "w1",
        gate,
        evaluatorHatId: owner,
        passed: priorsOf(gate),
        chooser: approve,
        atMs: 0,
        proposerHatId: other === owner ? "backend_implementer" : other,
      });
      expect(r.ok).toBe(true);
    }
  });
});

describe("A FAILED GATE ROUTES SOMEWHERE — a rejection is never a dead end", () => {
  test("every gate has a recovery path", () => {
    for (const gate of ORDERED_GATES) {
      expect(recoveryPathFor(gate)).toBeDefined();
    }
  });

  test("a rejected gate does NOT enter the passed set", () => {
    const reject: OrgChooser<GateOutcome> = (legal) => ({
      index: Math.max(0, legal.indexOf(GateOutcome.Rejected)),
      reason: "not solid",
    });
    const gate = GateKind.AdversarialReview;
    const r = evaluateGate(chart, {
      workId: "w1",
      gate,
      evaluatorHatId: anOwnerOf(gate),
      passed: priorsOf(gate),
      chooser: reject,
      atMs: 0,
      proposerHatId: NO_PROPOSER,
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.passed.has(gate)).toBe(false);
    expect(r.recovery).toBeDefined();
    // ...and the chain still points at it, so the work cannot drift past a rejection.
    expect(nextLegalGate(r.passed)).toBe(gate);
  });
});

describe("the record of a run is a record of the PROCESS", () => {
  test("a full approving run produces one evaluation per gate, in chain order", () => {
    const evaluations: GateEvaluation[] = [];
    const passed = new Set<GateKind>();
    for (const gate of ORDERED_GATES) {
      const r = evaluateGate(chart, {
        workId: "w1",
        gate,
        evaluatorHatId: anOwnerOf(gate),
        passed,
        chooser: approve,
        atMs: 0,
        proposerHatId: NO_PROPOSER,
      });
      expect(r.ok).toBe(true);
      if (!r.ok) return;
      evaluations.push(r.evaluation);
      for (const g of r.passed) passed.add(g);
    }
    expect(evaluations.map((e) => e.gate)).toEqual([...ORDERED_GATES]);
    expect(allGatesPassed(passed)).toBe(true);
    // Every evaluation names WHO decided it, so the trace answers "who let this through".
    for (const e of evaluations) expect(e.byHatId).not.toBe("");
  });
});
