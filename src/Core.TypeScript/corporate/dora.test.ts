/**
 * dora.test.ts — the four metrics, and the two the run cannot honestly produce.
 *
 * The load-bearing test in this file is not that the arithmetic is right. It is that a field which
 * could not be measured says so, because a `0` that means "unmeasured" is indistinguishable from a
 * `0` that means "measured, and it is zero" — and the second is a claim.
 */

import { describe, expect, test } from "bun:test";
import { deriveDora, isFullyMeasured, median, renderDora } from "./dora";
import { ClaimState, ShardState, type WorkClaim, type WorkQueue, type WorkShard } from "./work-market";
import { GateKind, GateOutcome, type GateEvaluation } from "./quality-gate";
import { RunOutcome, type QaCycleReport } from "./qa";
import type { ClassificationResult } from "../dora-classify/classify";

const shard = (workId: string, state: ShardState, id = `s-${workId}`): WorkShard => ({
  shardId: id,
  workId,
  state,
  fencingToken: 1,
});

const claim = (id: string, shardId: string, over: Partial<WorkClaim> = {}): WorkClaim => ({
  claimId: id,
  shardId,
  ownerAgentId: "agent-1",
  state: ClaimState.Completed,
  claimedAtMs: 0,
  leaseExpiresMs: 300_000,
  heartbeatAtMs: 0,
  fencingToken: 1,
  releasedAtMs: 10_000,
  ...over,
});

/** A completed claim whose end was never recorded — the shape the old `completeClaim` produced. */
const noEnd = (c: WorkClaim): WorkClaim => {
  const copy: WorkClaim = { ...c };
  delete (copy as { releasedAtMs?: number }).releasedAtMs;
  return copy;
};

const queue = (shards: WorkShard[], claims: WorkClaim[] = []): WorkQueue =>
  ({ shards, claims, version: 1 }) as unknown as WorkQueue;

const gate = (workId: string, outcome: GateOutcome): GateEvaluation => ({
  workId,
  gate: GateKind.ImplementationReview,
  outcome,
  byHatId: "tech_lead",
  reason: "r",
  atMs: 0,
});

const qaCycle = (over: Partial<QaCycleReport> = {}): QaCycleReport => ({
  runs: [],
  regressions: [],
  failedFeatureIds: [],
  untestedIds: [],
  defects: [],
  passed: 0,
  failed: 0,
  ...over,
});

const classified = (lanes: readonly string[]): readonly ClassificationResult[] =>
  lanes.map((lane, i) => ({
    sha: `w${i}`,
    author: "a",
    lane,
    perFileLanes: [],
    distinctLanes: [lane],
  })) as unknown as readonly ClassificationResult[];

const input = (over: Partial<Parameters<typeof deriveDora>[0]> = {}) => ({
  queue: queue([]),
  gateEvaluations: [],
  qa: [],
  ...over,
});

describe("THE UNMEASURED FIELDS ARE DECLARED, NOT ZERO-FILLED", () => {
  test("a run is never fully measured, and names exactly which fields it could not produce", () => {
    const d = deriveDora(input());
    expect(isFullyMeasured(d)).toBe(false);
    expect(d.unmeasured.map((u) => u.field).sort()).toEqual(["mttrMedianSeconds", "substrateRatio"]);
    // And that list is not a constant — see the substrateRatio suite, where classifying the work
    // removes one of them.
    // Each carries a REASON, not just a flag — a reader learns why rather than that it failed.
    for (const u of d.unmeasured) expect(u.why.length).toBeGreaterThan(10);
  });

  test("the rendering says UNMEASURED rather than printing a plausible number", () => {
    const lines = renderDora(deriveDora(input()));
    const mttr = lines.find((l) => l.startsWith("mttrMedianSeconds"));
    const deployments = lines.find((l) => l.startsWith("deploymentCount"));
    expect(mttr).toContain("UNMEASURED");
    // And a MEASURED field is not decorated — the two are visibly different.
    expect(deployments).not.toContain("UNMEASURED");
    expect(deployments).toBe("deploymentCount: 0");
  });

  test("`isFullyMeasured` is not vacuous — it says true when nothing is unmeasured", () => {
    expect(isFullyMeasured({ metrics: deriveDora(input()).metrics, unmeasured: [] })).toBe(true);
  });
});

describe("substrateRatio becomes a MEASUREMENT once the work is classified", () => {
  test("unclassified stays unmeasured; classified does not", () => {
    // The point of the pair: `unmeasured` VARIES with what the run could supply. If it were a
    // constant list, asserting its contents would say nothing about this run.
    expect(deriveDora(input()).unmeasured.map((u) => u.field)).toContain("substrateRatio");
    const measured = deriveDora(input({ classifications: classified(["operational", "memory"]) }));
    expect(measured.unmeasured.map((u) => u.field)).not.toContain("substrateRatio");
    expect(measured.metrics.substrateRatio).toBe(0.5);
  });

  test("all-operational is 0 and all-substrate is 1", () => {
    expect(deriveDora(input({ classifications: classified(["operational", "operational"]) })).metrics.substrateRatio).toBe(0);
    expect(deriveDora(input({ classifications: classified(["memory", "docs-general"]) })).metrics.substrateRatio).toBe(1);
  });

  test("a MIXED commit that touched operational paths gets the classifier's partial credit", () => {
    const mixed = [
      { sha: "w0", author: "a", lane: "mixed", perFileLanes: [], distinctLanes: ["mixed", "operational"] },
      { sha: "w1", author: "a", lane: "mixed", perFileLanes: [], distinctLanes: ["mixed", "memory"] },
    ] as unknown as readonly ClassificationResult[];
    // One counts as operational, the other does not — reimplementing the rule would have made both
    // the same and silently disagreed with the classifier.
    expect(deriveDora(input({ classifications: mixed })).metrics.substrateRatio).toBe(0.5);
  });

  test("an EMPTY classification is unmeasured, with a reason that says which case it was", () => {
    const d = deriveDora(input({ classifications: [] }));
    const why = d.unmeasured.find((u) => u.field === "substrateRatio")?.why;
    expect(why).toContain("empty");
    // And it differs from the never-classified reason, so the two cases are distinguishable.
    expect(why).not.toBe(deriveDora(input()).unmeasured.find((u) => u.field === "substrateRatio")?.why);
  });

  test("MTTR stays unmeasured either way — classifying work says nothing about incidents", () => {
    expect(deriveDora(input({ classifications: classified(["operational"]) })).unmeasured.map((u) => u.field)).toEqual([
      "mttrMedianSeconds",
    ]);
  });
});

describe("MTTR becomes measurable once incidents are a work type of their own", () => {
  test("restored incidents give a median; none recorded stays unmeasured", () => {
    expect(deriveDora(input()).unmeasured.map((u) => u.field)).toContain("mttrMedianSeconds");
    // Deliberately SKEWED: one long outage. Median 60, mean 1020 — a symmetric sample would let a
    // mean pass as a median, and MTTR is exactly the metric one bad night distorts.
    const measured = deriveDora(
      input({
        incidents: [
          { workId: "i1", detectedAtMs: 0, restoredAtMs: 30_000 },
          { workId: "i2", detectedAtMs: 0, restoredAtMs: 60_000 },
          { workId: "i3", detectedAtMs: 0, restoredAtMs: 2_970_000 },
        ],
      }),
    );
    expect(measured.unmeasured.map((u) => u.field)).not.toContain("mttrMedianSeconds");
    expect(measured.metrics.mttrMedianSeconds).toBe(60);
  });

  test("AN OPEN INCIDENT IS EXCLUDED, not counted as an instant fix", () => {
    // Counting it as zero would say the outage was fixed the instant it started — at exactly the
    // moment it is doing the most damage.
    const d = deriveDora(
      input({
        incidents: [
          { workId: "i1", detectedAtMs: 0, restoredAtMs: 60_000 },
          { workId: "i2", detectedAtMs: 0 },
        ],
      }),
    );
    // Median of [60], not of [0, 60].
    expect(d.metrics.mttrMedianSeconds).toBe(60);
  });

  test("incidents recorded but NONE restored is unmeasured, and says so specifically", () => {
    const d = deriveDora(input({ incidents: [{ workId: "i1", detectedAtMs: 0 }] }));
    const why = d.unmeasured.find((u) => u.field === "mttrMedianSeconds")?.why;
    expect(why).toContain("none restored yet");
    // Different from the no-incidents-at-all reason, so the two situations are distinguishable.
    expect(why).not.toBe(deriveDora(input()).unmeasured.find((u) => u.field === "mttrMedianSeconds")?.why);
  });

  test("a restoration recorded BEFORE detection is rejected rather than made negative", () => {
    const d = deriveDora(input({ incidents: [{ workId: "i1", detectedAtMs: 60_000, restoredAtMs: 0 }] }));
    expect(d.unmeasured.map((u) => u.field)).toContain("mttrMedianSeconds");
    expect(d.metrics.mttrMedianSeconds).toBe(0);
  });

  test("EVERY field can be measured at once — the run is then fully measured", () => {
    const d = deriveDora(
      input({
        queue: queue([shard("w1", ShardState.Merged)], [claim("c1", "s-w1", { releasedAtMs: 5_000 })]),
        classifications: classified(["operational"]),
        incidents: [{ workId: "i1", detectedAtMs: 0, restoredAtMs: 30_000 }],
      }),
    );
    expect(isFullyMeasured(d)).toBe(true);
    expect(d.unmeasured).toEqual([]);
    expect(renderDora(d).some((l) => l.includes("UNMEASURED"))).toBe(false);
  });
});

describe("deployments are MERGED shards, not completed ones", () => {
  test("completing a claim finishes a turn; merging is what ships", () => {
    const d = deriveDora(
      input({
        queue: queue([
          shard("w1", ShardState.Merged, "s1"),
          shard("w2", ShardState.Merged, "s2"),
          shard("w3", ShardState.Completed, "s3"),
          shard("w4", ShardState.Ready, "s4"),
        ]),
      }),
    );
    expect(d.metrics.deploymentCount).toBe(2);
  });
});

describe("lead time is claim → completion, as a MEDIAN", () => {
  test("only claims that actually finished are counted", () => {
    const d = deriveDora(
      input({
        queue: queue(
          [shard("w1", ShardState.Merged)],
          [
            claim("c1", "s-w1", { claimedAtMs: 0, releasedAtMs: 10_000 }),
            // An expired claim measures an abandonment, not a delivery.
            claim("c2", "s-w1", { state: ClaimState.Expired, claimedAtMs: 0, releasedAtMs: 999_000 }),
            claim("c3", "s-w1", { state: ClaimState.Released, claimedAtMs: 0, releasedAtMs: 999_000 }),
          ],
        ),
      }),
    );
    // 10s, and the two abandonments do not drag it to 999s.
    expect(d.metrics.leadTimeMedianSeconds).toBe(10);
  });

  test("a completed claim with no recorded end is SKIPPED, not counted as instant", () => {
    // Mixed on purpose. With one endless claim alone, "skipped" and "timed as zero" both yield 0
    // and the assertion cannot tell them apart. Alongside a real 10s claim they diverge: skipping
    // gives median([10]) = 10, counting it as instant gives median([0, 10]) = 5.
    const d = deriveDora(
      input({
        queue: queue(
          [shard("w1", ShardState.Merged)],
          [claim("c1", "s-w1", { releasedAtMs: 10_000 }), noEnd(claim("c2", "s-w1"))],
        ),
      }),
    );
    expect(d.metrics.leadTimeMedianSeconds).toBe(10);

    // And with nothing timeable at all the answer is 0, not NaN.
    const none = deriveDora(
      input({ queue: queue([shard("w1", ShardState.Merged)], [noEnd(claim("c1", "s-w1"))]) }),
    );
    expect(none.metrics.leadTimeMedianSeconds).toBe(0);
  });

  test("MEDIAN, NOT MEAN — one long item does not move it", () => {
    const claims = [
      claim("c1", "s-w1", { releasedAtMs: 10_000 }),
      claim("c2", "s-w1", { releasedAtMs: 10_000 }),
      claim("c3", "s-w1", { releasedAtMs: 10_000 }),
      claim("c4", "s-w1", { releasedAtMs: 1_000_000 }),
    ];
    const d = deriveDora(input({ queue: queue([shard("w1", ShardState.Merged)], claims) }));
    // Median of [10,10,10,1000] is 10; the mean would be 257.5 and would report a delivery problem
    // this organization does not have.
    expect(d.metrics.leadTimeMedianSeconds).toBe(10);
  });
});

describe("median", () => {
  test("an even sample averages the two middle values", () => {
    // Taking the lower would make the median of [10,20] equal 10, biasing every even sample down.
    expect(median([10, 20])).toBe(15);
    expect(median([1, 2, 3, 4])).toBe(2.5);
  });

  test("an odd sample takes the middle, and order does not matter", () => {
    expect(median([5, 1, 3])).toBe(3);
    expect(median([3, 1, 5])).toBe(3);
  });

  test("empty is 0 and non-finite values are dropped rather than poisoning it", () => {
    expect(median([])).toBe(0);
    expect(median([Number.NaN, 4, 6])).toBe(5);
  });
});

describe("change failure rate is per WORK ITEM, not per event", () => {
  test("five rejections on one item is one item that had trouble", () => {
    const d = deriveDora(
      input({
        queue: queue([shard("w1", ShardState.Merged, "s1"), shard("w2", ShardState.Merged, "s2")]),
        gateEvaluations: Array.from({ length: 5 }, () => gate("w1", GateOutcome.Rejected)),
      }),
    );
    // 1 of 2 delivered items had trouble. Counting events would give 5/2 = 2.5 — a "rate" above 1.
    expect(d.metrics.changeFailureRate).toBe(0.5);
  });

  test("trouble on work that never shipped does not count against what did", () => {
    const d = deriveDora(
      input({
        queue: queue([shard("w1", ShardState.Merged, "s1")]),
        gateEvaluations: [gate("w-never-shipped", GateOutcome.Rejected)],
      }),
    );
    expect(d.metrics.changeFailureRate).toBe(0);
  });

  test("QA failures and regressions count as well as gate rejections", () => {
    const failed = deriveDora(
      input({
        queue: queue([shard("w1", ShardState.Merged, "s1")]),
        qa: [qaCycle({ failedFeatureIds: ["w1"] })],
      }),
    );
    expect(failed.metrics.changeFailureRate).toBe(1);

    const regressed = deriveDora(
      input({
        queue: queue([shard("w1", ShardState.Merged, "s1")]),
        qa: [
          qaCycle({
            regressions: [{ testCaseId: "w1", lastPassedRunId: "r1", failingRunId: "r2", detectedAtMs: 0 }],
          }),
        ],
      }),
    );
    expect(regressed.metrics.changeFailureRate).toBe(1);
  });

  test("an APPROVED gate is not a failure", () => {
    const d = deriveDora(
      input({
        queue: queue([shard("w1", ShardState.Merged, "s1")]),
        gateEvaluations: [gate("w1", GateOutcome.Approved)],
      }),
    );
    expect(d.metrics.changeFailureRate).toBe(0);
  });

  test("nothing delivered is a rate of 0, not a division by zero", () => {
    const d = deriveDora(input({ gateEvaluations: [gate("w1", GateOutcome.Rejected)] }));
    expect(d.metrics.changeFailureRate).toBe(0);
    expect(Number.isFinite(d.metrics.changeFailureRate)).toBe(true);
  });

  test("the rate can never exceed 1", () => {
    const d = deriveDora(
      input({
        queue: queue([shard("w1", ShardState.Merged, "s1")]),
        gateEvaluations: Array.from({ length: 20 }, () => gate("w1", GateOutcome.Rejected)),
        qa: [qaCycle({ failedFeatureIds: ["w1", "w1"] })],
      }),
    );
    expect(d.metrics.changeFailureRate).toBeLessThanOrEqual(1);
  });
});

test("the QA outcome vocabulary is the one this module reads", () => {
  // Guards the import: if `RunOutcome` loses `Failed`, the failure paths above silently stop
  // exercising anything.
  expect(RunOutcome.Failed).toBeDefined();
});
