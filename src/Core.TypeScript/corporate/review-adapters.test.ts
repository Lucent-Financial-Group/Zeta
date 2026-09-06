/**
 * review-adapters.test.ts — who decides a gate, and the refusals that keep the answer honest.
 *
 * The port exists because six of the seven gates could not fail: the default chooser returned
 * `Approved` with the reason "reviewed" — a constant — while the fidelity block reported four
 * adapters and said nothing about it. So a run printed `DST-replayable: yes`, named four honest
 * providers, and rubber-stamped its own architecture review in silence.
 *
 * Two properties carry this file:
 *   - the simulated adapter ADMITS it reads nothing, because unlabelled auto-approval is the defect
 *   - every real adapter REFUSES rather than approving when it cannot obtain a judgement. "Nobody
 *     was available to review this" and "this was reviewed and approved" are the two sentences an
 *     organization must never confuse.
 */

import { describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { agentReview, autoApproveReview, commandReview, directoryReview } from "./adapters";
import { Fidelity, type ReviewRequest } from "./providers";
import { GateKind, GateOutcome } from "./quality-gate";

const scratch = (label: string) => mkdtempSync(join(tmpdir(), `review-${label}-`));

/** This process's own executable, used as a check that certainly exists. */
const SELF = process.execPath;

const ask = (gate: GateKind = GateKind.ArchitectureApproval, workId = "task-1"): ReviewRequest => ({
  gate,
  workId,
  evidence: [{ kind: "trace", ref: "qa:1/1 passed" }],
});

describe("autoApproveReview — the rubber stamp, now wearing a label", () => {
  test("IT ADMITS WHAT IT IS — the admission is the whole point of the adapter", async () => {
    // The behaviour is unchanged from before this port existed: every gate approved. What is new is
    // that a run can no longer report five honest adapters while six of seven gates rubber-stamp.
    const port = autoApproveReview();
    expect(port.meta.fidelity).toBe(Fidelity.Simulated);
    expect(port.meta.describes).toContain("reads no evidence");
    expect(port.meta.describes).toContain("consults nobody");

    const r = await port.review(ask());
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.outcome).toBe(GateOutcome.Approved);
      // NOT the word "reviewed", which is what made the old constant read as a judgement.
      expect(r.value.reason).toContain("nothing reviewed this");
      expect(r.value.reason).not.toContain("reviewed by");
    }
  });
});

describe("directoryReview — the human queue", () => {
  const filed = (label: string, gate: string, verdict: unknown) => {
    const dir = scratch(label);
    mkdirSync(join(dir, "task-1"), { recursive: true });
    writeFileSync(
      join(dir, "task-1", `${gate}.json`),
      typeof verdict === "string" ? verdict : JSON.stringify(verdict),
    );
    return dir;
  };

  test("a filed verdict is honoured, reason and all", async () => {
    const dir = filed("ok", GateKind.ArchitectureApproval, {
      outcome: GateOutcome.ChangesRequested,
      reason: "the design couples payment to the coupon path",
    });
    const r = await directoryReview(dir).review(ask());
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.outcome).toBe(GateOutcome.ChangesRequested);
      expect(r.value.reason).toContain("coupon path");
    }
    expect(directoryReview(dir).meta.fidelity).toBe(Fidelity.Real);
  });

  test("AN UNREVIEWED GATE REFUSES — absence is never consent", async () => {
    // The one property separating a review queue from a rubber stamp. Treating "nobody has looked
    // at this yet" as approval so the pipeline keeps moving turns the queue into what it replaced.
    const dir = filed("missing", GateKind.BrdApproval, { outcome: GateOutcome.Approved, reason: "fine" });
    const r = await directoryReview(dir).review(ask(GateKind.ArchitectureApproval));
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.reason).toContain("no verdict filed");
      expect(r.reason).toContain(GateKind.ArchitectureApproval);
    }
  });

  test("verdicts are per WORK ITEM — one item's approval does not cover another's", async () => {
    const dir = filed("scoped", GateKind.ArchitectureApproval, { outcome: GateOutcome.Approved, reason: "fine" });
    expect((await directoryReview(dir).review(ask(GateKind.ArchitectureApproval, "task-1"))).ok).toBe(true);
    expect((await directoryReview(dir).review(ask(GateKind.ArchitectureApproval, "task-2"))).ok).toBe(false);
  });

  test("a malformed verdict is refused BY PATH, not skipped", async () => {
    const dir = filed("bad", GateKind.ArchitectureApproval, "{not json");
    const r = await directoryReview(dir).review(ask());
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toContain("architecture_approval.json");
  });

  test("an unrecognised outcome is refused, and the refusal lists the real ones", async () => {
    const dir = filed("outcome", GateKind.ArchitectureApproval, { outcome: "looks_good_to_me", reason: "y" });
    const r = await directoryReview(dir).review(ask());
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toContain(GateOutcome.ChangesRequested);
  });

  test("A VERDICT WITH NO REASON IS REFUSED — that is a vote, not a review", async () => {
    // The gate record carries the reason forward; an empty one puts a bare word in front of
    // everyone downstream who has to act on it.
    const dir = filed("noreason", GateKind.ArchitectureApproval, { outcome: GateOutcome.Approved, reason: "   " });
    const r = await directoryReview(dir).review(ask());
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toContain("not a review");
  });
});

describe("commandReview — an external check", () => {
  test("exit 0 approves; a NON-ZERO exit rejects, carrying what the check said", async () => {
    const dir = scratch("cmd");
    const approve = await commandReview({ command: SELF, argsFor: () => ["-e", "process.exit(0)"], cwd: dir }).review(ask());
    expect(approve.ok && approve.value.outcome).toBe(GateOutcome.Approved);

    const reject = await commandReview({
      command: SELF,
      argsFor: () => ["-e", "console.log('coupling between payment and coupons'); process.exit(1)"],
      cwd: dir,
    }).review(ask());
    expect(reject.ok).toBe(true);
    if (reject.ok) {
      expect(reject.value.outcome).toBe(GateOutcome.Rejected);
      expect(reject.value.reason).toContain("coupling between payment");
    }
  });

  test("THE GATE AND THE WORK ID REACH THE CHECK", async () => {
    const seen: string[][] = [];
    await commandReview({
      command: SELF,
      argsFor: (request) => {
        seen.push([request.gate, request.workId]);
        return ["-e", "process.exit(0)"];
      },
      cwd: scratch("cmd-args"),
    }).review(ask(GateKind.ReleaseReadiness, "task-9"));
    expect(seen).toEqual([[GateKind.ReleaseReadiness, "task-9"]]);
  });

  test("A MISSING CHECK REFUSES rather than rejecting — a missing linter is not a finding", async () => {
    const r = await commandReview({
      command: join(scratch("cmd-missing"), "nope"),
      argsFor: () => [],
      cwd: scratch("cmd-missing-cwd"),
    }).review(ask());
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toContain("could not run");
  });
});

describe("agentReview — a judgement made elsewhere", () => {
  test("the judgement passes through, and the adapter is labelled REAL", async () => {
    // Real even though this particular judge is pure: the adapter cannot know, and the two mistakes
    // are not symmetric. Calling a model `simulated` would let a run report itself replayable while
    // a network decided its gates; calling a pure function `real` only costs a false "not
    // replayable". Conservative in the direction that cannot mislead.
    const port = agentReview(() => ({ outcome: GateOutcome.Waived, reason: "not applicable to a docs change" }));
    expect(port.meta.fidelity).toBe(Fidelity.Real);
    const r = await port.review(ask());
    expect(r.ok && r.value.outcome).toBe(GateOutcome.Waived);
  });

  test("an async judge is awaited — the model case", async () => {
    const r = await agentReview(async () => ({ outcome: GateOutcome.Rejected, reason: "no rollback plan" })).review(ask());
    expect(r.ok && r.value.outcome).toBe(GateOutcome.Rejected);
  });

  test("A REVIEWER THAT THREW DID NOT APPROVE", async () => {
    // And it must not take the organization down either: one opinion failing is not an outage.
    const r = await agentReview(() => {
      throw new Error("the model timed out");
    }).review(ask());
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toContain("timed out");
  });

  test("an outcome that is not a gate outcome is refused, not coerced", async () => {
    const r = await agentReview(() => ({ outcome: "lgtm" as GateOutcome, reason: "sure" })).review(ask());
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toContain("lgtm");
  });

  test("a verdict with no reason is refused here too", async () => {
    const r = await agentReview(() => ({ outcome: GateOutcome.Approved, reason: "" })).review(ask());
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toContain("no reason");
  });
});
