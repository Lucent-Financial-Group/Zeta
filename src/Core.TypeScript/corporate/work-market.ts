/**
 * corporate/work-market.ts — many agents claiming work from one queue, without stepping on each other.
 *
 * ── THE GAP THIS CLOSES ──────────────────────────────────────────────────────
 * Everything else in this register assumes one actor at a time: `assignHat` hands a hat to an agent,
 * `mayTakeHat` refuses a second wearer. That is the ORGANIZATION's view. It says nothing about what
 * happens when several agents are ticking concurrently against the same backlog — which is the
 * normal case for this substrate, and where a naive queue loses or duplicates work.
 *
 * ── THE FOUR MECHANISMS, AND WHAT EACH PREVENTS ──────────────────────────────
 *
 *   1. **A claim, exclusive per shard.** Two agents cannot hold one piece of work, so it is not done
 *      twice.
 *   2. **A lease with a heartbeat.** A claim that stops heartbeating is REAPED and its shard returns
 *      to `Ready`, so work is not lost to an agent that died holding it. Without this a crash
 *      silently removes work from the world.
 *   3. **A fencing token.** Monotonic per shard, issued at claim time. A completion is refused
 *      unless it carries the CURRENT token — so an agent whose lease expired, which believes it is
 *      still working, cannot write its result over whoever took over. This is the classic
 *      lease-expiry hazard: the reaping is what makes work recoverable, and the fence is what stops
 *      the recovery being corrupted by the agent that was reaped.
 *      (Anchor: Kleppmann, *How to do distributed locking*, 2016 — a lease alone is not mutual
 *      exclusion, because the holder cannot know it has lost the lease.)
 *   4. **An optimistic queue revision.** Two agents reading the same queue and both claiming: the
 *      second sees a stale revision and is refused rather than both succeeding.
 *
 * ── REVIEW QUORUM ────────────────────────────────────────────────────────────
 * A completed shard merges only after `quorumSize` DISTINCT approvals, and the claimant's own
 * approval never counts. Self-approval is the shape that makes a review threshold decorative — one
 * agent could satisfy a quorum of one by approving itself, and of three by being counted once and
 * finding two others.
 *
 * ── TIME IS MILLISECONDS AND IS PASSED IN ────────────────────────────────────
 * The reference stores ISO strings and validates them with `isValidIso` at every entry point,
 * because a malformed one silently becomes `NaN` and every comparison against it is false — a lease
 * that never expires. Numbers here, validated once at the boundary.
 */

export const ShardState = {
  Ready: "ready",
  Claimed: "claimed",
  Completed: "completed",
  Merged: "merged",
  Blocked: "blocked",
} as const;

export type ShardState = (typeof ShardState)[keyof typeof ShardState];

export const ClaimState = {
  Active: "active",
  Completed: "completed",
  Released: "released",
  Expired: "expired",
} as const;

export type ClaimState = (typeof ClaimState)[keyof typeof ClaimState];

export interface WorkShard {
  readonly shardId: string;
  readonly workId: string;
  readonly state: ShardState;
  readonly claimedByClaimId?: string;
  /**
   * The highest fencing token ever issued for this shard. Monotonic, never reset — a token that has
   * been superseded must never become current again, or a reaped claimant could be fenced back in.
   */
  readonly fencingToken: number;
}

export interface WorkClaim {
  readonly claimId: string;
  readonly shardId: string;
  readonly ownerAgentId: string;
  readonly state: ClaimState;
  readonly claimedAtMs: number;
  readonly leaseExpiresMs: number;
  readonly heartbeatAtMs: number;
  /** The token this claim was issued. Its completion must still match the shard's. */
  readonly fencingToken: number;
  /**
   * When the claim STOPPED being active — completed, released, or reaped alike.
   *
   * Named for the release rather than for success because all three ends set it; `releaseReason`
   * says which. Absent means the claim is still active, never means "we forgot".
   */
  readonly releasedAtMs?: number;
  readonly releaseReason?: string;
}

export interface ShardApproval {
  readonly shardId: string;
  readonly byAgentId: string;
  readonly atMs: number;
}

export interface WorkQueue {
  readonly queueId: string;
  readonly hatId: string;
  readonly revision: number;
  readonly shards: readonly WorkShard[];
  readonly claims: readonly WorkClaim[];
  readonly approvals: readonly ShardApproval[];
  /** Distinct non-claimant approvals a completed shard needs before it may merge. */
  readonly quorumSize: number;
  /** A claim whose last heartbeat is older than this is stale even if its lease has not expired. */
  readonly heartbeatTimeoutMs: number;
}

export function emptyQueue(queueId: string, hatId: string, quorumSize = 2, heartbeatTimeoutMs = 60_000): WorkQueue {
  return {
    queueId,
    hatId,
    revision: 0,
    shards: [],
    claims: [],
    approvals: [],
    quorumSize,
    heartbeatTimeoutMs,
  };
}

export type QueueResult<T> =
  | ({ readonly ok: true; readonly queue: WorkQueue } & T)
  | { readonly ok: false; readonly reason: string };

function bump(queue: WorkQueue, changes: Partial<WorkQueue>): WorkQueue {
  return { ...queue, ...changes, revision: queue.revision + 1 };
}

export function shardById(queue: WorkQueue, shardId: string): WorkShard | undefined {
  return queue.shards.find((s) => s.shardId === shardId);
}

export function claimById(queue: WorkQueue, claimId: string): WorkClaim | undefined {
  return queue.claims.find((c) => c.claimId === claimId);
}

/** Shards nobody holds, in a TOTAL order so two readers see the same next item. */
export function readyShards(queue: WorkQueue): readonly WorkShard[] {
  return queue.shards
    .filter((s) => s.state === ShardState.Ready)
    .sort((a, b) => (a.shardId < b.shardId ? -1 : a.shardId > b.shardId ? 1 : 0));
}

export function addShard(queue: WorkQueue, shardId: string, workId: string): QueueResult<{}> {
  if (shardById(queue, shardId) !== undefined) return { ok: false, reason: `duplicate shard '${shardId}'` };
  const shard: WorkShard = { shardId, workId, state: ShardState.Ready, fencingToken: 0 };
  return { ok: true, queue: bump(queue, { shards: [...queue.shards, shard] }) };
}

export interface ClaimInput {
  readonly claimId: string;
  readonly ownerAgentId: string;
  readonly nowMs: number;
  readonly leaseMs: number;
  /** Optimistic concurrency. When given it must match, or the claim is refused. */
  readonly expectedRevision?: number;
  /** Claim this specific shard rather than the next ready one. */
  readonly shardId?: string;
}

/**
 * Claim the next ready shard.
 *
 * The refusals, and what each prevents:
 *   - **stale revision** — two agents read the same queue and both claim; the second is refused
 *     rather than both succeeding against a queue that has moved.
 *   - **duplicate claim id** — a retried request must not produce a second claim on the same work.
 *   - **a non-positive lease** — a lease that has already expired makes the claim reapable the
 *     instant it is created, so the shard would bounce between agents forever.
 */
export function claimShard(
  queue: WorkQueue,
  input: ClaimInput,
): QueueResult<{ claim: WorkClaim; shard: WorkShard }> {
  if (input.expectedRevision !== undefined && input.expectedRevision !== queue.revision) {
    return {
      ok: false,
      reason: `stale queue revision ${input.expectedRevision} (queue is at ${queue.revision})`,
    };
  }
  if (claimById(queue, input.claimId) !== undefined) {
    return { ok: false, reason: `duplicate claim id '${input.claimId}'` };
  }
  if (!Number.isFinite(input.nowMs) || !Number.isFinite(input.leaseMs) || input.leaseMs <= 0) {
    return { ok: false, reason: "a claim needs a finite clock and a positive lease" };
  }

  const candidate =
    input.shardId === undefined
      ? readyShards(queue)[0]
      : queue.shards.find((s) => s.shardId === input.shardId && s.state === ShardState.Ready);
  if (candidate === undefined) {
    return { ok: false, reason: input.shardId === undefined ? "no ready shard" : `'${input.shardId}' is not ready` };
  }

  // Monotonic. The new token strictly exceeds every token this shard has issued, so any earlier
  // claimant's token is now stale by construction.
  const fencingToken = candidate.fencingToken + 1;
  const claim: WorkClaim = {
    claimId: input.claimId,
    shardId: candidate.shardId,
    ownerAgentId: input.ownerAgentId,
    state: ClaimState.Active,
    claimedAtMs: input.nowMs,
    leaseExpiresMs: input.nowMs + input.leaseMs,
    heartbeatAtMs: input.nowMs,
    fencingToken,
  };
  const shard: WorkShard = {
    ...candidate,
    state: ShardState.Claimed,
    claimedByClaimId: claim.claimId,
    fencingToken,
  };
  return {
    ok: true,
    claim,
    shard,
    queue: bump(queue, {
      claims: [...queue.claims, claim],
      shards: queue.shards.map((s) => (s.shardId === shard.shardId ? shard : s)),
    }),
  };
}

/** Refresh a claim's heartbeat. Refused once the claim is no longer active. */
export function heartbeat(queue: WorkQueue, claimId: string, nowMs: number): QueueResult<{}> {
  const claim = claimById(queue, claimId);
  if (claim === undefined) return { ok: false, reason: `no claim '${claimId}'` };
  if (claim.state !== ClaimState.Active) {
    // A reaped agent must learn it was reaped. Silently accepting the heartbeat would let it keep
    // working on something already reassigned.
    return { ok: false, reason: `claim '${claimId}' is ${claim.state}` };
  }
  return {
    ok: true,
    queue: bump(queue, {
      claims: queue.claims.map((c) => (c.claimId === claimId ? { ...c, heartbeatAtMs: nowMs } : c)),
    }),
  };
}

/** Is this claim stale — lease expired, or heartbeat too old? */
export function claimIsStale(queue: WorkQueue, claim: WorkClaim, nowMs: number): boolean {
  if (claim.state !== ClaimState.Active) return false;
  if (nowMs >= claim.leaseExpiresMs) return true;
  return nowMs - claim.heartbeatAtMs >= queue.heartbeatTimeoutMs;
}

/**
 * Return every stale claim's shard to `Ready`.
 *
 * This is what makes work survive an agent dying: without it a crash silently removes work from the
 * world, and nothing ever notices because the shard still looks claimed.
 *
 * The shard's `fencingToken` is deliberately NOT reset — it only ever increases, so the reaped
 * claimant's token is permanently stale and its later completion is refused.
 */
export function reapStaleClaims(
  queue: WorkQueue,
  nowMs: number,
  reason = "lease expired",
): { readonly queue: WorkQueue; readonly reaped: readonly string[] } {
  const stale = queue.claims.filter((c) => claimIsStale(queue, c, nowMs));
  if (stale.length === 0) return { queue, reaped: [] };
  const staleIds = new Set(stale.map((c) => c.claimId));

  const claims = queue.claims.map((c) =>
    staleIds.has(c.claimId) ? { ...c, state: ClaimState.Expired, releasedAtMs: nowMs, releaseReason: reason } : c,
  );
  const shards = queue.shards.map((s) => {
    if (s.claimedByClaimId === undefined || !staleIds.has(s.claimedByClaimId)) return s;
    const { claimedByClaimId: _dropped, ...rest } = s;
    return { ...rest, state: ShardState.Ready };
  });
  return { queue: bump(queue, { claims, shards }), reaped: [...staleIds].sort() };
}

/**
 * Complete a claim — REFUSED unless its fencing token is still the shard's current one.
 *
 * The property this module exists for. An agent whose lease expired does not know it: from inside,
 * it is still working. When it finishes and reports, the shard may already have been reaped and
 * re-claimed by someone else. Accepting that write would overwrite the new claimant's work with the
 * stale one's — reaping would make the system lose less work and corrupt more.
 *
 * The token makes the check trivial and total: it only increases, so "is my token the current one"
 * is exactly "has anyone claimed this since me".
 */
export function completeClaim(
  queue: WorkQueue,
  input: { readonly claimId: string; readonly fencingToken: number; readonly nowMs: number },
): QueueResult<{}> {
  const claim = claimById(queue, input.claimId);
  if (claim === undefined) return { ok: false, reason: `no claim '${input.claimId}'` };
  if (claim.state !== ClaimState.Active) {
    return { ok: false, reason: `claim '${input.claimId}' is ${claim.state} — it was reaped or already finished` };
  }
  const shard = shardById(queue, claim.shardId);
  if (shard === undefined) return { ok: false, reason: `no shard '${claim.shardId}'` };
  if (input.fencingToken !== shard.fencingToken) {
    return {
      ok: false,
      reason: `fencing token ${input.fencingToken} is stale (shard '${shard.shardId}' is at ${shard.fencingToken}) — another claimant holds this work`,
    };
  }
  return {
    ok: true,
    queue: bump(queue, {
      // FINISHING RECORDS WHEN. `nowMs` was already being passed in and thrown away, so a released
      // or reaped claim carried a timestamp and a COMPLETED one did not — the successful path was
      // the one that lost its time. That made claim→complete, i.e. DORA lead time, the single
      // metric this engine exists to move and the single one that could not be computed.
      claims: queue.claims.map((c) =>
        c.claimId === input.claimId
          ? { ...c, state: ClaimState.Completed, releasedAtMs: input.nowMs, releaseReason: "completed" }
          : c,
      ),
      shards: queue.shards.map((s) =>
        s.shardId === shard.shardId ? { ...s, state: ShardState.Completed } : s,
      ),
    }),
  };
}

/** Give a claim back voluntarily. The shard returns to `Ready`. */
export function releaseClaim(queue: WorkQueue, claimId: string, nowMs: number, reason: string): QueueResult<{}> {
  const claim = claimById(queue, claimId);
  if (claim === undefined) return { ok: false, reason: `no claim '${claimId}'` };
  if (claim.state !== ClaimState.Active) return { ok: false, reason: `claim '${claimId}' is ${claim.state}` };
  return {
    ok: true,
    queue: bump(queue, {
      claims: queue.claims.map((c) =>
        c.claimId === claimId ? { ...c, state: ClaimState.Released, releasedAtMs: nowMs, releaseReason: reason } : c,
      ),
      shards: queue.shards.map((s) => {
        if (s.claimedByClaimId !== claimId) return s;
        const { claimedByClaimId: _dropped, ...rest } = s;
        return { ...rest, state: ShardState.Ready };
      }),
    }),
  };
}

// ─── Review quorum ──────────────────────────────────────────────────────────

/**
 * Approve a completed shard.
 *
 * THE CLAIMANT'S OWN APPROVAL IS REFUSED. Self-approval makes a threshold decorative: one agent
 * could satisfy a quorum of one alone, and shave one off every larger quorum.
 *
 * A duplicate approval from the same agent is refused too, for the same reason at a different scale
 * — approving twice is self-approval spread over two calls.
 */
export function approveShard(queue: WorkQueue, approval: ShardApproval): QueueResult<{}> {
  const shard = shardById(queue, approval.shardId);
  if (shard === undefined) return { ok: false, reason: `no shard '${approval.shardId}'` };
  if (shard.state !== ShardState.Completed) {
    return { ok: false, reason: `shard '${approval.shardId}' is ${shard.state}, not completed` };
  }
  const claimant = queue.claims.find(
    (c) => c.shardId === approval.shardId && c.state === ClaimState.Completed,
  );
  if (claimant?.ownerAgentId === approval.byAgentId) {
    return { ok: false, reason: `'${approval.byAgentId}' did this work and cannot approve it` };
  }
  if (
    queue.approvals.some((a) => a.shardId === approval.shardId && a.byAgentId === approval.byAgentId)
  ) {
    return { ok: false, reason: `'${approval.byAgentId}' has already approved '${approval.shardId}'` };
  }
  return { ok: true, queue: bump(queue, { approvals: [...queue.approvals, approval] }) };
}

/** Distinct approvers for a shard. */
export function approvalCount(queue: WorkQueue, shardId: string): number {
  return new Set(queue.approvals.filter((a) => a.shardId === shardId).map((a) => a.byAgentId)).size;
}

export function hasQuorum(queue: WorkQueue, shardId: string): boolean {
  return approvalCount(queue, shardId) >= queue.quorumSize;
}

/**
 * Merge a completed, approved shard.
 *
 * Refused without quorum. A quorum of ZERO is also refused — a threshold nobody has to meet is not
 * a review, and configuring one to zero should not silently disable the gate.
 */
export function mergeShard(queue: WorkQueue, shardId: string): QueueResult<{}> {
  const shard = shardById(queue, shardId);
  if (shard === undefined) return { ok: false, reason: `no shard '${shardId}'` };
  if (shard.state !== ShardState.Completed) {
    return { ok: false, reason: `shard '${shardId}' is ${shard.state}, not completed` };
  }
  if (queue.quorumSize < 1) {
    return { ok: false, reason: `queue '${queue.queueId}' has quorum ${queue.quorumSize} — a review nobody must pass is not a review` };
  }
  if (!hasQuorum(queue, shardId)) {
    return {
      ok: false,
      reason: `shard '${shardId}' has ${approvalCount(queue, shardId)}/${queue.quorumSize} approvals`,
    };
  }
  return {
    ok: true,
    queue: bump(queue, {
      shards: queue.shards.map((s) => (s.shardId === shardId ? { ...s, state: ShardState.Merged } : s)),
    }),
  };
}

// ─── Readout ────────────────────────────────────────────────────────────────

export interface QueueReadout {
  readonly ready: number;
  readonly claimed: number;
  readonly completed: number;
  readonly merged: number;
  readonly blocked: number;
  readonly activeClaims: number;
  readonly staleClaims: number;
  /** Completed shards still short of quorum — the review backlog. */
  readonly awaitingReview: number;
}

export function readout(queue: WorkQueue, nowMs: number): QueueReadout {
  const count = (s: ShardState) => queue.shards.filter((x) => x.state === s).length;
  return {
    ready: count(ShardState.Ready),
    claimed: count(ShardState.Claimed),
    completed: count(ShardState.Completed),
    merged: count(ShardState.Merged),
    blocked: count(ShardState.Blocked),
    activeClaims: queue.claims.filter((c) => c.state === ClaimState.Active).length,
    staleClaims: queue.claims.filter((c) => claimIsStale(queue, c, nowMs)).length,
    awaitingReview: queue.shards.filter(
      (s) => s.state === ShardState.Completed && !hasQuorum(queue, s.shardId),
    ).length,
  };
}
