import { deepEqual, equal, ok } from "node:assert/strict";
import { test } from "node:test";

import {
  WorkClaimState,
  WorkMarketClaimOutcome,
  WorkMarketCompleteOutcome,
  WorkMarketMergeOutcome,
  WorkMarketQuorumOutcome,
  WorkShardState,
  claimNextWorkShard,
  completeWorkClaim,
  evaluateWorkShardReviewQuorum,
  mergeReviewedWorkShards,
  reapStaleWorkClaims,
  workMarketReadoutForHat,
  type HatWorkQueue,
} from "../src/index.ts";

const NOW = "2026-05-31T12:00:00.000Z";
const LATER = "2026-05-31T12:30:00.000Z";
const AFTER_LATER = "2026-05-31T13:00:00.000Z";

test("two same-hat agents claim distinct ready shards instead of duplicating work", () => {
  const first = claimNextWorkShard(queue(), claimInput("agent-backend-1", "claim-1", "fence-1"));
  equal(first.outcome, WorkMarketClaimOutcome.Claimed);
  if (first.outcome !== WorkMarketClaimOutcome.Claimed) throw new Error("expected first claim");

  const second = claimNextWorkShard(first.queue, claimInput("agent-backend-2", "claim-2", "fence-2"));
  equal(second.outcome, WorkMarketClaimOutcome.Claimed);
  if (second.outcome !== WorkMarketClaimOutcome.Claimed) throw new Error("expected second claim");

  deepEqual(
    [first.claim.shardId, second.claim.shardId].sort(),
    ["shard-api", "shard-worker"],
  );
  equal(new Set([first.claim.shardId, second.claim.shardId]).size, 2);
  equal(second.queue.claims.filter((claim) => claim.state === WorkClaimState.Active).length, 2);
});

test("duplicate same-hat claim attempts deterministically skip active leased shards", () => {
  const first = claimNextWorkShard(queue(), claimInput("agent-backend-1", "claim-1", "fence-1"));
  if (first.outcome !== WorkMarketClaimOutcome.Claimed) throw new Error("expected first claim");

  const duplicate = claimNextWorkShard(first.queue, claimInput("agent-backend-2", "claim-2", "fence-2"));
  equal(duplicate.outcome, WorkMarketClaimOutcome.Claimed);
  if (duplicate.outcome !== WorkMarketClaimOutcome.Claimed) throw new Error("expected second claim");

  equal(duplicate.claim.shardId, "shard-worker");
  equal(duplicate.queue.claims.filter((claim) => claim.shardId === "shard-api" && claim.state === WorkClaimState.Active).length, 1);
});

test("stale queue revisions reject duplicate claim commits at the store boundary", () => {
  const initial = queue();
  const first = claimNextWorkShard(initial, claimInput("agent-backend-1", "claim-1", "fence-1", { expectedQueueRevision: 0 }));
  equal(first.outcome, WorkMarketClaimOutcome.Claimed);
  if (first.outcome !== WorkMarketClaimOutcome.Claimed) throw new Error("expected first claim");

  const staleCommit = claimNextWorkShard(first.queue, claimInput("agent-backend-2", "claim-2", "fence-2", { expectedQueueRevision: 0 }));
  equal(staleCommit.outcome, WorkMarketClaimOutcome.Rejected);
  if (staleCommit.outcome === WorkMarketClaimOutcome.Rejected) {
    equal(staleCommit.reason, "stale_queue_revision");
  }
});

test("stale claims are reaped back into the queue and cannot complete with old fencing tokens", () => {
  const claimed = claimNextWorkShard(queue(), claimInput("agent-backend-1", "claim-1", "fence-old", {
    now: "2026-05-31T11:55:00.000Z",
    leaseExpiresAt: NOW,
  }));
  if (claimed.outcome !== WorkMarketClaimOutcome.Claimed) throw new Error("expected stale claim");

  const reaped = reapStaleWorkClaims(claimed.queue, { now: NOW, reason: "lease_expired" });
  equal(reaped.reapedClaims.length, 1);
  equal(reaped.queue.shards.find((shard) => shard.shardId === claimed.claim.shardId)?.state, WorkShardState.Ready);

  const reclaimed = claimNextWorkShard(reaped.queue, claimInput("agent-backend-2", "claim-2", "fence-new"));
  if (reclaimed.outcome !== WorkMarketClaimOutcome.Claimed) throw new Error("expected reclaimed shard");
  equal(reclaimed.claim.shardId, claimed.claim.shardId);

  const staleCompletion = completeWorkClaim(reclaimed.queue, {
    claimId: claimed.claim.claimId,
    fencingToken: claimed.claim.fencingToken,
    completedAt: LATER,
    evidenceRefs: ["evidence:stale"],
  });
  equal(staleCompletion.outcome, WorkMarketCompleteOutcome.Rejected);
  if (staleCompletion.outcome === WorkMarketCompleteOutcome.Rejected) {
    equal(staleCompletion.reason, "claim_not_active");
  }

  const validCompletion = completeWorkClaim(reclaimed.queue, {
    claimId: reclaimed.claim.claimId,
    fencingToken: reclaimed.claim.fencingToken,
    now: LATER,
    completedAt: LATER,
    evidenceRefs: ["evidence:valid"],
  });
  equal(validCompletion.outcome, WorkMarketCompleteOutcome.Completed);
  if (validCompletion.outcome !== WorkMarketCompleteOutcome.Completed) throw new Error("expected valid completion");
  equal(validCompletion.queue.shards.find((shard) => shard.shardId === reclaimed.claim.shardId)?.state, WorkShardState.Completed);
});

test("review quorum rejects self-only approval and accepts distinct reviewer hats", () => {
  const claimed = claimNextWorkShard(queue(), claimInput("agent-backend-1", "claim-1", "fence-1"));
  if (claimed.outcome !== WorkMarketClaimOutcome.Claimed) throw new Error("expected claim");
  const completed = completeWorkClaim(claimed.queue, {
    claimId: claimed.claim.claimId,
    fencingToken: claimed.claim.fencingToken,
    now: LATER,
    completedAt: LATER,
    evidenceRefs: ["evidence:implementation"],
  });
  if (completed.outcome !== WorkMarketCompleteOutcome.Completed) throw new Error("expected completion");

  const selfOnly = evaluateWorkShardReviewQuorum(completed.queue, {
    shardId: claimed.claim.shardId,
    approvals: [
      {
        reviewerAgentId: "agent-backend-1",
        reviewerHatId: "backend_implementer",
        approved: true,
        evidenceRef: "evidence:self-review",
        reviewedAt: LATER,
      },
    ],
  });
  equal(selfOnly.outcome, WorkMarketQuorumOutcome.Rejected);
  if (selfOnly.outcome === WorkMarketQuorumOutcome.Rejected) {
    equal(selfOnly.reason, "self_only_review");
  }

  const peer = evaluateWorkShardReviewQuorum(completed.queue, {
    shardId: claimed.claim.shardId,
    approvals: [
      {
        reviewerAgentId: "agent-reviewer-1",
        reviewerHatId: "architect_reviewer",
        approved: true,
        evidenceRef: "evidence:peer-review",
        reviewedAt: LATER,
      },
    ],
  });
  equal(peer.outcome, WorkMarketQuorumOutcome.Accepted);
  if (peer.outcome !== WorkMarketQuorumOutcome.Accepted) throw new Error("expected accepted peer review");
  deepEqual(peer.acceptedEvidenceRefs, ["evidence:peer-review"]);
});

test("merge requires completed shards plus accepted review quorum", () => {
  const first = claimNextWorkShard(queue(), claimInput("agent-backend-1", "claim-1", "fence-1"));
  if (first.outcome !== WorkMarketClaimOutcome.Claimed) throw new Error("expected first claim");
  const completed = completeWorkClaim(first.queue, {
    claimId: first.claim.claimId,
    fencingToken: first.claim.fencingToken,
    now: LATER,
    completedAt: LATER,
    evidenceRefs: ["evidence:implementation"],
  });
  if (completed.outcome !== WorkMarketCompleteOutcome.Completed) throw new Error("expected completion");

  const rejected = mergeReviewedWorkShards(completed.queue, {
    shardIds: [first.claim.shardId],
    reviews: [],
    mergedAt: LATER,
  });
  equal(rejected.outcome, WorkMarketMergeOutcome.Rejected);

  const acceptedReview = evaluateWorkShardReviewQuorum(completed.queue, {
    shardId: first.claim.shardId,
    approvals: [
      {
        reviewerAgentId: "agent-reviewer-1",
        reviewerHatId: "architect_reviewer",
        approved: true,
        evidenceRef: "evidence:peer-review",
        reviewedAt: LATER,
      },
    ],
  });
  if (acceptedReview.outcome !== WorkMarketQuorumOutcome.Accepted) throw new Error("expected accepted review");

  const merged = mergeReviewedWorkShards(acceptedReview.queue, {
    shardIds: [first.claim.shardId],
    mergedAt: LATER,
  });
  equal(merged.outcome, WorkMarketMergeOutcome.Merged);
  if (merged.outcome !== WorkMarketMergeOutcome.Merged) throw new Error("expected merge");
  equal(merged.queue.shards.find((shard) => shard.shardId === first.claim.shardId)?.state, WorkShardState.Merged);
  ok(merged.evidenceRefs.includes("evidence:peer-review"));
});

test("review quorum ignores spoofed producer identity and merge rejects fabricated accepted reviews", () => {
  const claimed = claimNextWorkShard(queue(), claimInput("agent-backend-1", "claim-1", "fence-1"));
  if (claimed.outcome !== WorkMarketClaimOutcome.Claimed) throw new Error("expected claim");
  const completed = completeWorkClaim(claimed.queue, {
    claimId: claimed.claim.claimId,
    fencingToken: claimed.claim.fencingToken,
    now: LATER,
    completedAt: LATER,
    evidenceRefs: ["evidence:implementation"],
  });
  if (completed.outcome !== WorkMarketCompleteOutcome.Completed) throw new Error("expected completion");

  const spoofedSelfReview = evaluateWorkShardReviewQuorum(completed.queue, {
    shardId: claimed.claim.shardId,
    producerAgentId: "agent-someone-else",
    approvals: [
      {
        reviewerAgentId: claimed.claim.ownerAgentId,
        reviewerHatId: "architect_reviewer",
        approved: true,
        evidenceRef: "evidence:self-review-spoof",
        reviewedAt: LATER,
      },
    ],
  });
  equal(spoofedSelfReview.outcome, WorkMarketQuorumOutcome.Rejected);
  if (spoofedSelfReview.outcome === WorkMarketQuorumOutcome.Rejected) {
    equal(spoofedSelfReview.reason, "self_only_review");
  }

  const fabricated = mergeReviewedWorkShards(completed.queue, {
    shardIds: [claimed.claim.shardId],
    reviews: [
      {
        shardId: claimed.claim.shardId,
        producerAgentId: claimed.claim.ownerAgentId,
        outcome: WorkMarketQuorumOutcome.Accepted,
        approvalCount: 1,
        acceptedEvidenceRefs: ["evidence:fabricated-review"],
        reviewedAt: LATER,
      },
    ],
    mergedAt: LATER,
  });
  equal(fabricated.outcome, WorkMarketMergeOutcome.Rejected);
  if (fabricated.outcome === WorkMarketMergeOutcome.Rejected) {
    equal(fabricated.reason, "review_quorum_missing");
  }
});

test("completion requires trusted server time and current shard ownership", () => {
  const claimed = claimNextWorkShard(queue(), claimInput("agent-backend-1", "claim-1", "fence-1", {
    now: "2026-05-31T11:55:00.000Z",
    leaseExpiresAt: NOW,
  }));
  if (claimed.outcome !== WorkMarketClaimOutcome.Claimed) throw new Error("expected claim");

  const backdated = completeWorkClaim(claimed.queue, {
    claimId: claimed.claim.claimId,
    fencingToken: claimed.claim.fencingToken,
    now: LATER,
    completedAt: NOW,
    evidenceRefs: ["evidence:backdated"],
  });
  equal(backdated.outcome, WorkMarketCompleteOutcome.Rejected);
  if (backdated.outcome === WorkMarketCompleteOutcome.Rejected) {
    equal(backdated.reason, "lease_expired");
  }

  const brokenOwnershipQueue = {
    ...claimed.queue,
    shards: claimed.queue.shards.map((shard) =>
      shard.shardId === claimed.claim.shardId
        ? { ...shard, claimedByClaimId: "claim-other" }
        : shard),
  };
  const wrongOwner = completeWorkClaim(brokenOwnershipQueue, {
    claimId: claimed.claim.claimId,
    fencingToken: claimed.claim.fencingToken,
    now: NOW,
    completedAt: NOW,
    evidenceRefs: ["evidence:wrong-owner"],
  });
  equal(wrongOwner.outcome, WorkMarketCompleteOutcome.Rejected);
  if (wrongOwner.outcome === WorkMarketCompleteOutcome.Rejected) {
    equal(wrongOwner.reason, "shard_not_owned_by_claim");
  }
});

test("hat readout exposes queue pressure, active claims, stale claims, and shard states", () => {
  const claimed = claimNextWorkShard(queue(), claimInput("agent-backend-1", "claim-1", "fence-1", {
    now: "2026-05-31T11:55:00.000Z",
    leaseExpiresAt: NOW,
  }));
  if (claimed.outcome !== WorkMarketClaimOutcome.Claimed) throw new Error("expected claim");

  const readout = workMarketReadoutForHat([claimed.queue], {
    organizationId: "org-1",
    hatId: "backend_implementer",
    now: LATER,
  });

  equal(readout.queues.length, 1);
  equal(readout.totalReadyShards, 1);
  equal(readout.totalClaimedShards, 1);
  equal(readout.totalStaleClaims, 1);
  equal(readout.queuePressure, "elevated");
  equal(readout.queues[0]?.activeClaims[0]?.claimId, "claim-1");
});

function claimInput(
  ownerAgentId: string,
  claimId: string,
  fencingToken: string,
  override: Partial<Parameters<typeof claimNextWorkShard>[1]> = {},
): Parameters<typeof claimNextWorkShard>[1] {
  return {
    ownerAgentId,
    hatAssignmentId: `${ownerAgentId}-backend-hat`,
    claimId,
    fencingToken,
    now: NOW,
    leaseExpiresAt: override.leaseExpiresAt ?? AFTER_LATER,
    scheduleBlockId: `${ownerAgentId}-block`,
    runtimeSessionId: `${ownerAgentId}-session`,
    workspaceRef: `worktree:${ownerAgentId}`,
    credentialScope: "tenant:org-1:repo:agentic-organization",
    compensatingAction: "release_claim_and_requeue_shard",
    ...override,
  };
}

function queue(): HatWorkQueue {
  return {
    queueId: "queue-backend-project-1",
    organizationId: "org-1",
    hatId: "backend_implementer",
    revision: 0,
    scope: { kind: "project", id: "project-1" },
    priorityClass: "p1",
    slaDeadlineAt: "2026-05-31T18:00:00.000Z",
    shardability: "by_component",
    requiredSkills: ["typescript", "distributed-systems"],
    reviewQuorum: {
      requiredApprovals: 1,
      reviewerHatIds: ["architect_reviewer", "qa_reviewer"],
      allowProducerApproval: false,
    },
    shards: [
      {
        shardId: "shard-api",
        workItemId: "work-api",
        title: "Implement command API",
        priority: 100,
        state: WorkShardState.Ready,
        dependencyShardIds: [],
        mergePolicy: "independent",
      },
      {
        shardId: "shard-worker",
        workItemId: "work-worker",
        title: "Implement worker lane",
        priority: 90,
        state: WorkShardState.Ready,
        dependencyShardIds: [],
        mergePolicy: "independent",
      },
    ],
    claims: [],
    reviews: [],
  };
}
