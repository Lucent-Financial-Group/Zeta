/**
 * change-control.test.ts — falsifiers for the clamp.
 *
 * The claim is that a stage decision cannot be argued past: an unsatisfied gate removes `approve`
 * from the legal set, an actor cannot decide a stage it does not own, and an illegal attempt is
 * recorded rather than silently converted. Each of those is tested where a plausible implementation
 * would get it wrong.
 */

import { describe, expect, test } from "bun:test";
import type { Actor as DutyActor } from "../authorization/separation-of-duties";
import {
  applyStageDecision,
  authorityPermits,
  clampToLegal,
  decideStage,
  legalChangeSetTransitions,
  legalStageOutcomes,
  resubmit,
  TERMINAL_PHASES,
  type ChangeSet,
  type DecidingActor,
  type ReviewPipeline,
  type ReviewStage,
} from "./change-control";

const PROPOSER: DutyActor = { persona: "otto", hat: "code_author" };
const REVIEWER: DutyActor = { persona: "lior", hat: "code_reviewer" };

const SATISFIED = { satisfiable: true, why: "gate satisfied" };
const UNSATISFIED = { satisfiable: false, why: "tests red" };

const codeReview: ReviewStage = {
  id: "internal-code-review",
  authority: { kind: "hat", hatId: "code_reviewer" },
  gate: "no_blocking_findings",
  blocking: true,
};
const qa: ReviewStage = {
  id: "internal-qa",
  authority: { kind: "hat", hatId: "qa_reviewer" },
  gate: "tests_green",
  blocking: true,
};
const advisory: ReviewStage = { ...codeReview, id: "advisory-style", blocking: false };

const PIPELINE: ReviewPipeline = { pipelineId: "default", stages: [codeReview, qa] };
const ONE_STAGE: ReviewPipeline = { pipelineId: "single", stages: [codeReview] };

const cs = (patch: Partial<ChangeSet> = {}): ChangeSet => ({
  changeSetId: "cs-1",
  proposer: PROPOSER,
  phase: "in_review",
  pipelineId: "default",
  currentStageIndex: 0,
  revision: 1,
  ...patch,
});

describe("legalStageOutcomes — the clamp's reason for existing", () => {
  test("an unsatisfied gate removes approve from the legal set", () => {
    expect(legalStageOutcomes(codeReview, UNSATISFIED)).toEqual(["request_changes", "reject"]);
  });

  test("a satisfied blocking stage may approve, bounce or reject", () => {
    expect(legalStageOutcomes(codeReview, SATISFIED)).toEqual(["approve", "request_changes", "reject"]);
  });

  test("an advisory stage may never reject — it cannot block, so it must not kill", () => {
    expect(legalStageOutcomes(advisory, SATISFIED)).toEqual(["approve", "request_changes"]);
    // Still cannot approve an unsatisfied gate, advisory or not.
    expect(legalStageOutcomes(advisory, UNSATISFIED)).not.toContain("approve");
  });
});

describe("clampToLegal — refuses, does not silently substitute", () => {
  test("a legal choice passes through unflagged", () => {
    expect(clampToLegal("approve", ["approve", "request_changes"])).toEqual({ outcome: "approve", clamped: false });
  });

  test("an illegal approve is bounced AND recorded as attempted", () => {
    const d = clampToLegal("approve", ["request_changes", "reject"]);
    expect(d.outcome).toBe("request_changes");
    expect(d.clamped).toBe(true);
    // The attempt is the evidence. An index clamp would have lost it.
    expect(d.attempted).toBe("approve");
  });

  test("the fallback is the conservative bounce, never the harder action", () => {
    // Falling back to `reject` would let a refused approve KILL the change — a larger effect than
    // the one that was refused.
    expect(clampToLegal("approve", ["request_changes", "reject"]).outcome).toBe("request_changes");
  });

  test("an empty legal set applies nothing and says so", () => {
    const d = clampToLegal("approve", []);
    expect(d.clamped).toBe(true);
    expect(d.why).toContain("no legal outcome");
  });
});

describe("authorityPermits — an approval you do not own is a fabricated approval", () => {
  test("the right hat may decide its own stage", () => {
    const actor: DecidingActor = { kind: "hat", actor: REVIEWER };
    expect(authorityPermits(codeReview, actor, PROPOSER)).toEqual({ ok: true });
  });

  test("the wrong hat may not", () => {
    const actor: DecidingActor = { kind: "hat", actor: { persona: "lior", hat: "qa_reviewer" } };
    const r = authorityPermits(codeReview, actor, PROPOSER);
    expect(r.ok).toBe(false);
  });

  test("an internal hat cannot manufacture an external approval", () => {
    // THE anti-fabrication case: shapes do not match, and no correct-looking payload changes that.
    const external: ReviewStage = { ...codeReview, authority: { kind: "external", system: "github" } };
    const r = authorityPermits(external, { kind: "hat", actor: REVIEWER }, PROPOSER);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.why).toContain("fabricated approval");
  });

  test("the wrong external system does not satisfy the stage either", () => {
    const external: ReviewStage = { ...codeReview, authority: { kind: "external", system: "github" } };
    expect(authorityPermits(external, { kind: "external", system: "gitlab" }, PROPOSER).ok).toBe(false);
    expect(authorityPermits(external, { kind: "external", system: "github" }, PROPOSER).ok).toBe(true);
  });

  test("a human stage needs the named role", () => {
    const human: ReviewStage = { ...codeReview, authority: { kind: "human", role: "qa_lead" } };
    expect(authorityPermits(human, { kind: "human", role: "intern" }, PROPOSER).ok).toBe(false);
    expect(authorityPermits(human, { kind: "human", role: "qa_lead" }, PROPOSER).ok).toBe(true);
  });

  describe("quorum", () => {
    const quorum: ReviewStage = {
      ...codeReview,
      authority: { kind: "quorum", hatIds: ["a", "b", "c"], threshold: 2 },
    };

    test("two distinct on-roster approvers satisfy a threshold of two", () => {
      const actor: DecidingActor = {
        kind: "quorum",
        approvers: [
          { persona: "p1", hat: "a" },
          { persona: "p2", hat: "b" },
        ],
      };
      expect(authorityPermits(quorum, actor, PROPOSER).ok).toBe(true);
    });

    test("the same persona twice is one approver, not two", () => {
      const actor: DecidingActor = {
        kind: "quorum",
        approvers: [
          { persona: "p1", hat: "a" },
          { persona: "p1", hat: "b" },
        ],
      };
      expect(authorityPermits(quorum, actor, PROPOSER).ok).toBe(false);
    });

    test("the proposer cannot count toward the quorum on their own change", () => {
      const actor: DecidingActor = {
        kind: "quorum",
        approvers: [
          { persona: "otto", hat: "a" },
          { persona: "p2", hat: "b" },
        ],
      };
      expect(authorityPermits(quorum, actor, PROPOSER).ok).toBe(false);
    });

    test("an off-roster hat is refused even when the count would be met", () => {
      const actor: DecidingActor = {
        kind: "quorum",
        approvers: [
          { persona: "p1", hat: "a" },
          { persona: "p2", hat: "not_on_roster" },
        ],
      };
      const r = authorityPermits(quorum, actor, PROPOSER);
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.why).toContain("not_on_roster");
    });
  });
});

describe("decideStage — the two counters the promotion gate reads", () => {
  test("an illegal choice is a SELECTOR REJECTION", () => {
    const d = decideStage(codeReview, UNSATISFIED, { kind: "hat", actor: REVIEWER }, "approve", PROPOSER);
    expect(d.outcome).toBe("request_changes");
    expect(d.selectorRejection).toBe(true);
    expect(d.controlBypass).toBe(false);
  });

  test("an unowned stage is a CONTROL BYPASS", () => {
    const external: ReviewStage = { ...codeReview, authority: { kind: "external", system: "github" } };
    const d = decideStage(external, SATISFIED, { kind: "hat", actor: REVIEWER }, "approve", PROPOSER);
    expect(d.controlBypass).toBe(true);
    expect(d.outcome).toBe("request_changes");
  });

  test("an unauthorized actor's choice is never evaluated, not evaluated-then-rejected", () => {
    // A fabricated approval must not exist even briefly in a system that emits events.
    const external: ReviewStage = { ...codeReview, authority: { kind: "external", system: "github" } };
    const d = decideStage(external, SATISFIED, { kind: "hat", actor: REVIEWER }, "approve", PROPOSER);
    expect(d.outcome).not.toBe("approve");
    expect(d.selectorRejection).toBe(false); // it was a bypass, not a bad pick — the counters differ
  });

  test("a legal, owned choice passes cleanly with neither flag", () => {
    const d = decideStage(codeReview, SATISFIED, { kind: "hat", actor: REVIEWER }, "approve", PROPOSER);
    expect(d).toMatchObject({ outcome: "approve", selectorRejection: false, controlBypass: false });
  });
});

describe("applyStageDecision", () => {
  const approve = decideStage(codeReview, SATISFIED, { kind: "hat", actor: REVIEWER }, "approve", PROPOSER);

  test("approving a non-final stage advances the cursor and stays in review", () => {
    const r = applyStageDecision(cs(), PIPELINE, codeReview, approve);
    expect(r.changeSet.phase).toBe("in_review");
    expect(r.changeSet.currentStageIndex).toBe(1);
    expect(r.events.map((e) => e.kind)).toEqual(["ReviewStageAdvanced"]);
  });

  test("approving the FINAL stage lands on approved, not another in_review", () => {
    // The off-by-one boundary: get it wrong and the pipeline either skips a stage or never finishes.
    const r = applyStageDecision(cs(), ONE_STAGE, codeReview, approve);
    expect(r.changeSet.phase).toBe("approved");
    expect(r.events.map((e) => e.kind)).toEqual(["ReviewStageAdvanced", "ChangeSetApproved"]);
  });

  test("a refused decision emits StageDecisionRefused alongside its outcome", () => {
    const refused = decideStage(codeReview, UNSATISFIED, { kind: "hat", actor: REVIEWER }, "approve", PROPOSER);
    const r = applyStageDecision(cs(), PIPELINE, codeReview, refused);
    expect(r.events.map((e) => e.kind)).toEqual(["StageDecisionRefused", "ChangesRequested"]);
    expect(r.changeSet.phase).toBe("changes_requested");
  });

  test("rejection is terminal", () => {
    const rejected = decideStage(codeReview, SATISFIED, { kind: "hat", actor: REVIEWER }, "reject", PROPOSER);
    const r = applyStageDecision(cs(), PIPELINE, codeReview, rejected);
    expect(r.changeSet.phase).toBe("rejected");
    expect(TERMINAL_PHASES.has(r.changeSet.phase)).toBe(true);
  });

  test("the input change set is never mutated", () => {
    const before = cs();
    const snapshot = { ...before };
    applyStageDecision(before, PIPELINE, codeReview, approve);
    expect(before).toEqual(snapshot);
  });
});

describe("legalChangeSetTransitions", () => {
  test("a drafted change may enter review or be withdrawn — nothing else", () => {
    expect(legalChangeSetTransitions(cs({ phase: "drafted" }), PIPELINE)).toEqual(["in_review", "withdrawn"]);
  });

  test("in review with stages remaining cannot jump to approved", () => {
    const legal = legalChangeSetTransitions(cs({ currentStageIndex: 0 }), PIPELINE);
    expect(legal).not.toContain("approved");
  });

  test("in review on the last stage may approve", () => {
    const legal = legalChangeSetTransitions(cs({ currentStageIndex: 1 }), PIPELINE);
    expect(legal).toContain("approved");
  });

  test("approved may only be applied or withdrawn — never re-reviewed", () => {
    expect(legalChangeSetTransitions(cs({ phase: "approved" }), PIPELINE)).toEqual(["applied", "withdrawn"]);
  });

  test("every terminal phase has no legal moves", () => {
    for (const phase of TERMINAL_PHASES) {
      expect(legalChangeSetTransitions(cs({ phase }), PIPELINE)).toEqual([]);
    }
  });
});

describe("resubmit", () => {
  test("bumps the revision and restarts the pipeline from the first stage", () => {
    // Resuming where it bounced would carry approvals of a change that no longer exists.
    const r = resubmit(cs({ phase: "changes_requested", currentStageIndex: 1, revision: 1 }));
    expect(r).toMatchObject({ phase: "in_review", currentStageIndex: 0, revision: 2 });
  });

  test("does nothing from any other phase", () => {
    const approved = cs({ phase: "approved" });
    expect(resubmit(approved)).toEqual(approved);
  });
});

describe("the pipeline is data — the harness's own sequence is a literal", () => {
  test("plan -> execute -> review -> UAT -> push runs through the same kernel", () => {
    const harness: ReviewPipeline = {
      pipelineId: "harness",
      stages: [
        { id: "plan", authority: { kind: "hat", hatId: "planner" }, gate: "artifacts_present", blocking: true },
        {
          id: "review",
          authority: { kind: "hat", hatId: "code_reviewer" },
          gate: "no_blocking_findings",
          blocking: true,
        },
        { id: "uat", authority: { kind: "human", role: "qa_lead" }, gate: "tests_green", blocking: true },
        { id: "push", authority: { kind: "external", system: "github" }, gate: "external_approved", blocking: true },
      ],
    };

    let state = cs({ pipelineId: "harness", currentStageIndex: 0 });
    const actors: DecidingActor[] = [
      { kind: "hat", actor: { persona: "p", hat: "planner" } },
      { kind: "hat", actor: { persona: "l", hat: "code_reviewer" } },
      { kind: "human", role: "qa_lead" },
      { kind: "external", system: "github" },
    ];

    for (let i = 0; i < harness.stages.length; i++) {
      const stage = harness.stages[i]!;
      const d = decideStage(stage, SATISFIED, actors[i]!, "approve", PROPOSER);
      expect(d.controlBypass).toBe(false);
      expect(d.selectorRejection).toBe(false);
      state = applyStageDecision(state, harness, stage, d).changeSet;
    }
    expect(state.phase).toBe("approved");
  });

  test("a red UAT gate stops the sequence at UAT — push is never reached", () => {
    const uat: ReviewStage = {
      id: "uat",
      authority: { kind: "human", role: "qa_lead" },
      gate: "tests_green",
      blocking: true,
    };
    const d = decideStage(uat, UNSATISFIED, { kind: "human", role: "qa_lead" }, "approve", PROPOSER);
    expect(d.outcome).toBe("request_changes");
    expect(d.selectorRejection).toBe(true);
  });
});
