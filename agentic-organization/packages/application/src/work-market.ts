export const WorkShardState = {
  Ready: "ready",
  Claimed: "claimed",
  Completed: "completed",
  Merged: "merged",
  Blocked: "blocked",
} as const;

export type WorkShardState = (typeof WorkShardState)[keyof typeof WorkShardState];

export const WorkClaimState = {
  Active: "active",
  Completed: "completed",
  Released: "released",
  Expired: "expired",
} as const;

export type WorkClaimState = (typeof WorkClaimState)[keyof typeof WorkClaimState];

export const WorkMarketClaimOutcome = {
  Claimed: "claimed",
  Empty: "empty",
  Rejected: "rejected",
} as const;

export type WorkMarketClaimOutcome = (typeof WorkMarketClaimOutcome)[keyof typeof WorkMarketClaimOutcome];

export const WorkMarketCompleteOutcome = {
  Completed: "completed",
  Rejected: "rejected",
} as const;

export type WorkMarketCompleteOutcome = (typeof WorkMarketCompleteOutcome)[keyof typeof WorkMarketCompleteOutcome];

export const WorkMarketQuorumOutcome = {
  Accepted: "accepted",
  Rejected: "rejected",
} as const;

export type WorkMarketQuorumOutcome = (typeof WorkMarketQuorumOutcome)[keyof typeof WorkMarketQuorumOutcome];

export const WorkMarketMergeOutcome = {
  Merged: "merged",
  Rejected: "rejected",
} as const;

export type WorkMarketMergeOutcome = (typeof WorkMarketMergeOutcome)[keyof typeof WorkMarketMergeOutcome];

export type WorkMarketScope = {
  readonly kind: "organization" | "department" | "project" | "initiative" | "work_batch" | "work_item";
  readonly id: string;
};

export type WorkShardMergePolicy = "independent" | "aggregate_before_merge";

export type WorkShard = {
  readonly shardId: string;
  readonly workItemId: string;
  readonly title: string;
  readonly priority: number;
  readonly state: WorkShardState;
  readonly dependencyShardIds: readonly string[];
  readonly mergePolicy: WorkShardMergePolicy;
  readonly claimedByClaimId?: string;
  readonly completedAt?: string;
  readonly mergedAt?: string;
  readonly evidenceRefs?: readonly string[];
};

export type WorkClaim = {
  readonly claimId: string;
  readonly shardId: string;
  readonly ownerAgentId: string;
  readonly hatAssignmentId: string;
  readonly fencingToken: string;
  readonly leaseExpiresAt: string;
  readonly heartbeatAt: string;
  readonly scheduleBlockId: string;
  readonly runtimeSessionId: string;
  readonly workspaceRef: string;
  readonly credentialScope: string;
  readonly compensatingAction: string;
  readonly state: WorkClaimState;
  readonly claimedAt: string;
  readonly completedAt?: string;
  readonly releasedAt?: string;
  readonly releaseReason?: string;
  readonly evidenceRefs?: readonly string[];
};

export type WorkShardReviewQuorum = {
  readonly requiredApprovals: number;
  readonly reviewerHatIds: readonly string[];
  readonly allowProducerApproval?: boolean;
};

export type WorkShardReviewApproval = {
  readonly reviewerAgentId: string;
  readonly reviewerHatId: string;
  readonly approved: boolean;
  readonly evidenceRef: string;
  readonly reviewedAt: string;
};

export type WorkShardReview = {
  readonly shardId: string;
  readonly producerAgentId: string;
  readonly outcome: WorkMarketQuorumOutcome;
  readonly approvalCount: number;
  readonly acceptedEvidenceRefs: readonly string[];
  readonly reviewedAt: string;
  readonly reason?: WorkShardReviewRejectReason;
};

export type HatWorkQueue = {
  readonly queueId: string;
  readonly organizationId: string;
  readonly hatId: string;
  readonly revision?: number;
  readonly scope: WorkMarketScope;
  readonly priorityClass?: string;
  readonly slaDeadlineAt?: string;
  readonly shardability: "none" | "by_file" | "by_component" | "by_test_suite" | "manual";
  readonly requiredSkills: readonly string[];
  readonly reviewQuorum: WorkShardReviewQuorum;
  readonly shards: readonly WorkShard[];
  readonly claims: readonly WorkClaim[];
  readonly reviews?: readonly WorkShardReview[];
};

export type ClaimNextWorkShardInput = {
  readonly ownerAgentId: string;
  readonly hatAssignmentId: string;
  readonly claimId: string;
  readonly fencingToken: string;
  readonly now: string;
  readonly leaseExpiresAt: string;
  readonly scheduleBlockId: string;
  readonly runtimeSessionId: string;
  readonly workspaceRef: string;
  readonly credentialScope: string;
  readonly compensatingAction: string;
  readonly expectedQueueRevision?: number;
};

export type WorkMarketClaimResult =
  | {
      readonly outcome: typeof WorkMarketClaimOutcome.Claimed;
      readonly queue: HatWorkQueue;
      readonly claim: WorkClaim;
      readonly shard: WorkShard;
    }
  | {
      readonly outcome: typeof WorkMarketClaimOutcome.Empty;
      readonly queue: HatWorkQueue;
      readonly reason: "no_ready_shards";
    }
  | {
      readonly outcome: typeof WorkMarketClaimOutcome.Rejected;
      readonly queue: HatWorkQueue;
      readonly reason: "stale_queue_revision" | "duplicate_claim_id" | "invalid_lease_window";
    };

export type ReapStaleWorkClaimsInput = {
  readonly now: string;
  readonly reason: string;
};

export type ReapStaleWorkClaimsResult = {
  readonly queue: HatWorkQueue;
  readonly reapedClaims: readonly WorkClaim[];
};

export type CompleteWorkClaimInput = {
  readonly claimId: string;
  readonly fencingToken: string;
  readonly now?: string;
  readonly completedAt: string;
  readonly evidenceRefs: readonly string[];
};

export type CompleteWorkClaimRejectReason =
  | "claim_not_active"
  | "stale_fencing_token"
  | "lease_expired"
  | "invalid_timestamp"
  | "shard_not_owned_by_claim";

export type CompleteWorkClaimResult =
  | {
      readonly outcome: typeof WorkMarketCompleteOutcome.Completed;
      readonly queue: HatWorkQueue;
      readonly claim: WorkClaim;
      readonly shard: WorkShard;
    }
  | {
      readonly outcome: typeof WorkMarketCompleteOutcome.Rejected;
      readonly queue: HatWorkQueue;
      readonly reason: CompleteWorkClaimRejectReason;
    };

export type EvaluateWorkShardReviewQuorumInput = {
  readonly shardId: string;
  readonly producerAgentId?: string;
  readonly approvals: readonly WorkShardReviewApproval[];
};

export type WorkShardReviewRejectReason =
  | "self_only_review"
  | "insufficient_quorum"
  | "no_such_shard"
  | "producer_claim_missing"
  | "reviewer_hat_not_allowed";

export type EvaluateWorkShardReviewQuorumResult =
  | {
      readonly outcome: typeof WorkMarketQuorumOutcome.Accepted;
      readonly queue: HatWorkQueue;
      readonly review: WorkShardReview;
      readonly acceptedEvidenceRefs: readonly string[];
    }
  | {
      readonly outcome: typeof WorkMarketQuorumOutcome.Rejected;
      readonly review: WorkShardReview;
      readonly reason: WorkShardReviewRejectReason;
    };

export type MergeReviewedWorkShardsInput = {
  readonly shardIds: readonly string[];
  readonly reviews?: readonly WorkShardReview[];
  readonly mergedAt: string;
};

export type WorkMarketMergeRejectReason =
  | "no_shards_requested"
  | "shard_not_completed"
  | "review_quorum_missing";

export type MergeReviewedWorkShardsResult =
  | {
      readonly outcome: typeof WorkMarketMergeOutcome.Merged;
      readonly queue: HatWorkQueue;
      readonly shardIds: readonly string[];
      readonly evidenceRefs: readonly string[];
    }
  | {
      readonly outcome: typeof WorkMarketMergeOutcome.Rejected;
      readonly queue: HatWorkQueue;
      readonly reason: WorkMarketMergeRejectReason;
    };

export type WorkMarketReadoutInput = {
  readonly organizationId: string;
  readonly hatId: string;
  readonly visibleHatIds?: readonly string[];
  readonly now: string;
};

export type WorkMarketQueueReadout = {
  readonly queueId: string;
  readonly scope: WorkMarketScope;
  readonly priorityClass?: string;
  readonly slaDeadlineAt?: string;
  readonly readyShardCount: number;
  readonly claimedShardCount: number;
  readonly completedShardCount: number;
  readonly mergedShardCount: number;
  readonly staleClaimCount: number;
  readonly activeClaims: readonly WorkClaim[];
  readonly shards: readonly WorkShard[];
};

export type WorkMarketPressure = "none" | "normal" | "elevated" | "critical";

export type WorkMarketReadout = {
  readonly organizationId: string;
  readonly hatId: string;
  readonly queues: readonly WorkMarketQueueReadout[];
  readonly totalReadyShards: number;
  readonly totalClaimedShards: number;
  readonly totalCompletedShards: number;
  readonly totalMergedShards: number;
  readonly totalStaleClaims: number;
  readonly queuePressure: WorkMarketPressure;
};

export function claimNextWorkShard(queue: HatWorkQueue, input: ClaimNextWorkShardInput): WorkMarketClaimResult {
  const currentRevision = queue.revision ?? 0;
  if (input.expectedQueueRevision !== undefined && input.expectedQueueRevision !== currentRevision) {
    return { outcome: WorkMarketClaimOutcome.Rejected, queue, reason: "stale_queue_revision" };
  }
  if (queue.claims.some((claim) => claim.claimId === input.claimId)) {
    return { outcome: WorkMarketClaimOutcome.Rejected, queue, reason: "duplicate_claim_id" };
  }
  if (!isValidIso(input.now) || !isValidIso(input.leaseExpiresAt) || isIsoAtOrBefore(input.leaseExpiresAt, input.now)) {
    return { outcome: WorkMarketClaimOutcome.Rejected, queue, reason: "invalid_lease_window" };
  }
  const candidate = readyClaimableShards(queue)[0];
  if (candidate === undefined) {
    return { outcome: WorkMarketClaimOutcome.Empty, queue, reason: "no_ready_shards" };
  }

  const claim: WorkClaim = {
    claimId: input.claimId,
    shardId: candidate.shardId,
    ownerAgentId: input.ownerAgentId,
    hatAssignmentId: input.hatAssignmentId,
    fencingToken: input.fencingToken,
    leaseExpiresAt: input.leaseExpiresAt,
    heartbeatAt: input.now,
    scheduleBlockId: input.scheduleBlockId,
    runtimeSessionId: input.runtimeSessionId,
    workspaceRef: input.workspaceRef,
    credentialScope: input.credentialScope,
    compensatingAction: input.compensatingAction,
    state: WorkClaimState.Active,
    claimedAt: input.now,
    evidenceRefs: [],
  };
  const claimedShard: WorkShard = {
    ...candidate,
    state: WorkShardState.Claimed,
    claimedByClaimId: claim.claimId,
  };
  const updated = bumpQueueRevision(replaceShard(queue, claimedShard));
  return {
    outcome: WorkMarketClaimOutcome.Claimed,
    queue: { ...updated, claims: [...updated.claims, claim] },
    claim,
    shard: claimedShard,
  };
}

export function reapStaleWorkClaims(queue: HatWorkQueue, input: ReapStaleWorkClaimsInput): ReapStaleWorkClaimsResult {
  if (!isValidIso(input.now)) return { queue, reapedClaims: [] };
  const reapedIds = new Set(
    queue.claims
      .filter((claim) => claim.state === WorkClaimState.Active && isIsoAtOrBefore(claim.leaseExpiresAt, input.now))
      .map((claim) => claim.claimId),
  );
  if (reapedIds.size === 0) return { queue, reapedClaims: [] };

  const claims = queue.claims.map((claim): WorkClaim => {
    if (!reapedIds.has(claim.claimId)) return claim;
    return {
      ...claim,
      state: WorkClaimState.Expired,
      releasedAt: input.now,
      releaseReason: input.reason,
    };
  });
  const shards = queue.shards.map((shard): WorkShard => {
    if (shard.claimedByClaimId === undefined || !reapedIds.has(shard.claimedByClaimId)) return shard;
    const { claimedByClaimId: _claimedByClaimId, ...unclaimedShard } = shard;
    return {
      ...unclaimedShard,
      state: WorkShardState.Ready,
    };
  });

  return {
    queue: bumpQueueRevision({ ...queue, claims, shards }),
    reapedClaims: claims.filter((claim) => reapedIds.has(claim.claimId)),
  };
}

export function completeWorkClaim(queue: HatWorkQueue, input: CompleteWorkClaimInput): CompleteWorkClaimResult {
  const trustedNow = input.now ?? input.completedAt;
  if (!isValidIso(trustedNow) || !isValidIso(input.completedAt)) {
    return { outcome: WorkMarketCompleteOutcome.Rejected, queue, reason: "invalid_timestamp" };
  }
  const claim = queue.claims.find((candidate) => candidate.claimId === input.claimId);
  if (claim === undefined || claim.state !== WorkClaimState.Active) {
    return { outcome: WorkMarketCompleteOutcome.Rejected, queue, reason: "claim_not_active" };
  }
  if (claim.fencingToken !== input.fencingToken) {
    return { outcome: WorkMarketCompleteOutcome.Rejected, queue, reason: "stale_fencing_token" };
  }
  const shard = queue.shards.find((candidate) => candidate.shardId === claim.shardId);
  if (shard === undefined || shard.state !== WorkShardState.Claimed || shard.claimedByClaimId !== claim.claimId) {
    return { outcome: WorkMarketCompleteOutcome.Rejected, queue, reason: "shard_not_owned_by_claim" };
  }
  if (!isValidIso(claim.leaseExpiresAt) || isIsoAtOrBefore(claim.leaseExpiresAt, trustedNow)) {
    return { outcome: WorkMarketCompleteOutcome.Rejected, queue, reason: "lease_expired" };
  }
  const completedClaim: WorkClaim = {
    ...claim,
    state: WorkClaimState.Completed,
    completedAt: input.completedAt,
    evidenceRefs: input.evidenceRefs,
  };
  const completedShard: WorkShard = {
    ...shard,
    state: WorkShardState.Completed,
    completedAt: input.completedAt,
    evidenceRefs: [...(shard.evidenceRefs ?? []), ...input.evidenceRefs],
  };

  const updated = bumpQueueRevision(replaceShard(queue, completedShard));
  return {
    outcome: WorkMarketCompleteOutcome.Completed,
    queue: {
      ...updated,
      claims: updated.claims.map((candidate) => candidate.claimId === completedClaim.claimId ? completedClaim : candidate),
    },
    claim: completedClaim,
    shard: completedShard,
  };
}

export function evaluateWorkShardReviewQuorum(
  queue: HatWorkQueue,
  input: EvaluateWorkShardReviewQuorumInput,
): EvaluateWorkShardReviewQuorumResult {
  const shard = queue.shards.find((candidate) => candidate.shardId === input.shardId);
  const reviewedAt = input.approvals[0]?.reviewedAt ?? new Date(0).toISOString();
  if (shard === undefined) {
    const review = rejectedReview({ ...input, producerAgentId: input.producerAgentId ?? "" }, "no_such_shard", reviewedAt);
    return { outcome: WorkMarketQuorumOutcome.Rejected, review, reason: "no_such_shard" };
  }

  const producerAgentId = completedProducerAgentId(queue, input.shardId);
  if (producerAgentId === undefined) {
    const review = rejectedReview({ ...input, producerAgentId: input.producerAgentId ?? "" }, "producer_claim_missing", reviewedAt);
    return { outcome: WorkMarketQuorumOutcome.Rejected, review, reason: "producer_claim_missing" };
  }

  const approved = input.approvals.filter((approval) => approval.approved);
  const nonProducerApprovals = queue.reviewQuorum.allowProducerApproval
    ? approved
    : approved.filter((approval) => approval.reviewerAgentId !== producerAgentId);
  const allowedApprovals = nonProducerApprovals.filter((approval) =>
    queue.reviewQuorum.reviewerHatIds.includes(approval.reviewerHatId),
  );
  const distinctReviewerEvidence = distinctBy(allowedApprovals, (approval) => approval.reviewerAgentId);

  if (approved.length > 0 && nonProducerApprovals.length === 0) {
    const review = rejectedReview({ ...input, producerAgentId }, "self_only_review", reviewedAt);
    return { outcome: WorkMarketQuorumOutcome.Rejected, review, reason: "self_only_review" };
  }
  if (nonProducerApprovals.length > 0 && allowedApprovals.length === 0) {
    const review = rejectedReview({ ...input, producerAgentId }, "reviewer_hat_not_allowed", reviewedAt);
    return { outcome: WorkMarketQuorumOutcome.Rejected, review, reason: "reviewer_hat_not_allowed" };
  }
  if (distinctReviewerEvidence.length < queue.reviewQuorum.requiredApprovals) {
    const review = rejectedReview({ ...input, producerAgentId }, "insufficient_quorum", reviewedAt);
    return { outcome: WorkMarketQuorumOutcome.Rejected, review, reason: "insufficient_quorum" };
  }

  const acceptedEvidenceRefs = distinctReviewerEvidence.map((approval) => approval.evidenceRef);
  const review: WorkShardReview = {
    shardId: input.shardId,
    producerAgentId,
    outcome: WorkMarketQuorumOutcome.Accepted,
    approvalCount: distinctReviewerEvidence.length,
    acceptedEvidenceRefs,
    reviewedAt,
  };
  return {
    outcome: WorkMarketQuorumOutcome.Accepted,
    queue: bumpQueueRevision({ ...queue, reviews: [...(queue.reviews ?? []), review] }),
    review,
    acceptedEvidenceRefs,
  };
}

export function mergeReviewedWorkShards(queue: HatWorkQueue, input: MergeReviewedWorkShardsInput): MergeReviewedWorkShardsResult {
  if (input.shardIds.length === 0) {
    return { outcome: WorkMarketMergeOutcome.Rejected, queue, reason: "no_shards_requested" };
  }
  const completed = input.shardIds.every((shardId) =>
    queue.shards.some((shard) => shard.shardId === shardId && shard.state === WorkShardState.Completed),
  );
  if (!completed) {
    return { outcome: WorkMarketMergeOutcome.Rejected, queue, reason: "shard_not_completed" };
  }
  const suppliedReviewIds = new Set((input.reviews ?? []).map(reviewIdentity));
  const reviewByShard = new Map(
    (queue.reviews ?? [])
      .filter((review) => review.outcome === WorkMarketQuorumOutcome.Accepted)
      .filter((review) => suppliedReviewIds.size === 0 || suppliedReviewIds.has(reviewIdentity(review)))
      .map((review) => [review.shardId, review]),
  );
  const allReviewed = input.shardIds.every((shardId) => reviewByShard.has(shardId));
  if (!allReviewed) {
    return { outcome: WorkMarketMergeOutcome.Rejected, queue, reason: "review_quorum_missing" };
  }

  const evidenceRefs = input.shardIds.flatMap((shardId) => reviewByShard.get(shardId)?.acceptedEvidenceRefs ?? []);
  const shards = queue.shards.map((shard): WorkShard => {
    if (!input.shardIds.includes(shard.shardId)) return shard;
    return {
      ...shard,
      state: WorkShardState.Merged,
      mergedAt: input.mergedAt,
      evidenceRefs: [...(shard.evidenceRefs ?? []), ...evidenceRefs],
    };
  });
  return {
    outcome: WorkMarketMergeOutcome.Merged,
    queue: bumpQueueRevision({ ...queue, shards }),
    shardIds: input.shardIds,
    evidenceRefs,
  };
}

export function workMarketReadoutForHat(queues: readonly HatWorkQueue[], input: WorkMarketReadoutInput): WorkMarketReadout {
  const visibleHatIds = new Set(input.visibleHatIds ?? [input.hatId]);
  const scoped = queues.filter((queue) => queue.organizationId === input.organizationId && visibleHatIds.has(queue.hatId));
  const readouts = scoped.map((queue): WorkMarketQueueReadout => {
    const activeClaims = queue.claims.filter((claim) => claim.state === WorkClaimState.Active);
    return {
      queueId: queue.queueId,
      scope: queue.scope,
      ...(queue.priorityClass !== undefined ? { priorityClass: queue.priorityClass } : {}),
      ...(queue.slaDeadlineAt !== undefined ? { slaDeadlineAt: queue.slaDeadlineAt } : {}),
      readyShardCount: countShards(queue, WorkShardState.Ready),
      claimedShardCount: countShards(queue, WorkShardState.Claimed),
      completedShardCount: countShards(queue, WorkShardState.Completed),
      mergedShardCount: countShards(queue, WorkShardState.Merged),
      staleClaimCount: activeClaims.filter((claim) => isIsoAtOrBefore(claim.leaseExpiresAt, input.now)).length,
      activeClaims,
      shards: queue.shards,
    };
  });
  const totalReadyShards = sum(readouts.map((readout) => readout.readyShardCount));
  const totalClaimedShards = sum(readouts.map((readout) => readout.claimedShardCount));
  const totalCompletedShards = sum(readouts.map((readout) => readout.completedShardCount));
  const totalMergedShards = sum(readouts.map((readout) => readout.mergedShardCount));
  const totalStaleClaims = sum(readouts.map((readout) => readout.staleClaimCount));

  return {
    organizationId: input.organizationId,
    hatId: input.hatId,
    queues: readouts,
    totalReadyShards,
    totalClaimedShards,
    totalCompletedShards,
    totalMergedShards,
    totalStaleClaims,
    queuePressure: pressureFor({ totalReadyShards, totalClaimedShards, totalStaleClaims }),
  };
}

function readyClaimableShards(queue: HatWorkQueue): readonly WorkShard[] {
  const activeClaimedShardIds = new Set(
    queue.claims
      .filter((claim) => claim.state === WorkClaimState.Active)
      .map((claim) => claim.shardId),
  );
  const stateByShardId = new Map(queue.shards.map((shard) => [shard.shardId, shard.state]));
  return queue.shards
    .filter((shard) => shard.state === WorkShardState.Ready)
    .filter((shard) => !activeClaimedShardIds.has(shard.shardId))
    .filter((shard) => shard.dependencyShardIds.every((dependency) => {
      const state = stateByShardId.get(dependency);
      return state === WorkShardState.Completed || state === WorkShardState.Merged;
    }))
    .slice()
    .sort((left: WorkShard, right: WorkShard) => right.priority - left.priority || left.shardId.localeCompare(right.shardId));
}

function replaceShard(queue: HatWorkQueue, shard: WorkShard): HatWorkQueue {
  return {
    ...queue,
    shards: queue.shards.map((candidate) => candidate.shardId === shard.shardId ? shard : candidate),
  };
}

function rejectedReview(
  input: EvaluateWorkShardReviewQuorumInput & { readonly producerAgentId: string },
  reason: WorkShardReviewRejectReason,
  reviewedAt: string,
): WorkShardReview {
  return {
    shardId: input.shardId,
    producerAgentId: input.producerAgentId,
    outcome: WorkMarketQuorumOutcome.Rejected,
    approvalCount: 0,
    acceptedEvidenceRefs: [],
    reviewedAt,
    reason,
  };
}

function completedProducerAgentId(queue: HatWorkQueue, shardId: string): string | undefined {
  return queue.claims.find((claim) => claim.shardId === shardId && claim.state === WorkClaimState.Completed)?.ownerAgentId;
}

function reviewIdentity(review: WorkShardReview): string {
  return `${review.shardId}:${review.producerAgentId}:${review.reviewedAt}:${review.acceptedEvidenceRefs.join(",")}`;
}

function bumpQueueRevision(queue: HatWorkQueue): HatWorkQueue {
  return { ...queue, revision: (queue.revision ?? 0) + 1 };
}

function countShards(queue: HatWorkQueue, state: WorkShardState): number {
  return queue.shards.filter((shard) => shard.state === state).length;
}

function isIsoAtOrBefore(left: string, right: string): boolean {
  return Date.parse(left) <= Date.parse(right);
}

function isValidIso(value: string): boolean {
  return Number.isFinite(Date.parse(value));
}

function distinctBy<T>(items: readonly T[], key: (item: T) => string): readonly T[] {
  const seen = new Set<string>();
  const result: T[] = [];
  for (const item of items) {
    const value = key(item);
    if (seen.has(value)) continue;
    seen.add(value);
    result.push(item);
  }
  return result;
}

function sum(values: readonly number[]): number {
  return values.reduce((total, value) => total + value, 0);
}

function pressureFor(input: {
  readonly totalReadyShards: number;
  readonly totalClaimedShards: number;
  readonly totalStaleClaims: number;
}): WorkMarketPressure {
  if (input.totalStaleClaims > 0) return "elevated";
  if (input.totalReadyShards + input.totalClaimedShards === 0) return "none";
  if (input.totalReadyShards >= 5 || input.totalClaimedShards >= 10) return "critical";
  if (input.totalReadyShards >= 2 || input.totalClaimedShards >= 4) return "elevated";
  return "normal";
}
