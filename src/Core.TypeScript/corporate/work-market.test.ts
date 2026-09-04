import { describe, expect, test } from "bun:test";
import {
  addShard,
  approvalCount,
  approveShard,
  ClaimState,
  claimById,
  claimIsStale,
  claimShard,
  completeClaim,
  emptyQueue,
  hasQuorum,
  heartbeat,
  mergeShard,
  readout,
  readyShards,
  reapStaleClaims,
  releaseClaim,
  ShardState,
  shardById,
  type WorkQueue,
} from "./work-market";

const LEASE = 30_000;

function must<R extends { ok: boolean }>(r: R): Extract<R, { ok: true }> {
  if (!r.ok) throw new Error((r as unknown as { reason?: string }).reason ?? "refused");
  return r as Extract<R, { ok: true }>;
}

/** A queue with two ready shards. */
function seeded(quorum = 2): WorkQueue {
  let q = emptyQueue("q1", "backend_implementer", quorum);
  q = must(addShard(q, "s1", "w1")).queue;
  q = must(addShard(q, "s2", "w1")).queue;
  return q;
}

const claim = (q: WorkQueue, claimId: string, agent: string, nowMs = 0, shardId?: string) =>
  must(
    claimShard(q, {
      claimId,
      ownerAgentId: agent,
      nowMs,
      leaseMs: LEASE,
      ...(shardId === undefined ? {} : { shardId }),
    }),
  );

describe("shards", () => {
  test("added shards start ready with token zero", () => {
    const q = seeded();
    expect(readyShards(q).map((s) => s.shardId)).toEqual(["s1", "s2"]);
    expect(shardById(q, "s1")?.fencingToken).toBe(0);
  });

  test("a duplicate shard id is refused", () => {
    expect(addShard(seeded(), "s1", "w1").ok).toBe(false);
  });

  test("ready order is TOTAL, so two readers see the same next item", () => {
    let q = emptyQueue("q", "h");
    q = must(addShard(q, "z", "w")).queue;
    q = must(addShard(q, "a", "w")).queue;
    expect(readyShards(q).map((s) => s.shardId)).toEqual(["a", "z"]);
  });
});

describe("claiming is exclusive", () => {
  test("a claim takes the shard and issues a token", () => {
    const r = claim(seeded(), "c1", "alexa");
    expect(r.shard.shardId).toBe("s1");
    expect(r.shard.state).toBe(ShardState.Claimed);
    expect(r.claim.fencingToken).toBe(1);
    expect(r.claim.leaseExpiresMs).toBe(LEASE);
  });

  test("a second agent gets the NEXT shard, not the same one", () => {
    const first = claim(seeded(), "c1", "a");
    expect(claim(first.queue, "c2", "b").shard.shardId).toBe("s2");
  });

  test("when nothing is ready the claim is refused", () => {
    const first = claim(seeded(), "c1", "a");
    const second = claim(first.queue, "c2", "b");
    const r = claimShard(second.queue, { claimId: "c3", ownerAgentId: "c", nowMs: 0, leaseMs: LEASE });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toContain("no ready shard");
  });

  test("A STALE REVISION IS REFUSED — two readers cannot both win", () => {
    const q = seeded();
    const rev = q.revision;
    const first = must(
      claimShard(q, { claimId: "c1", ownerAgentId: "a", nowMs: 0, leaseMs: LEASE, expectedRevision: rev }),
    );
    // The second agent read the queue at the same revision and is now behind.
    const second = claimShard(first.queue, {
      claimId: "c2",
      ownerAgentId: "b",
      nowMs: 0,
      leaseMs: LEASE,
      expectedRevision: rev,
    });
    expect(second.ok).toBe(false);
    if (!second.ok) expect(second.reason).toContain("stale queue revision");
  });

  test("a duplicate claim id is refused — a retry must not double-claim", () => {
    const q = claim(seeded(), "c1", "a").queue;
    expect(claimShard(q, { claimId: "c1", ownerAgentId: "a", nowMs: 0, leaseMs: LEASE }).ok).toBe(false);
  });

  test("a non-positive lease is refused — it would be reapable instantly", () => {
    expect(claimShard(seeded(), { claimId: "c1", ownerAgentId: "a", nowMs: 0, leaseMs: 0 }).ok).toBe(false);
    expect(claimShard(seeded(), { claimId: "c1", ownerAgentId: "a", nowMs: 0, leaseMs: -5 }).ok).toBe(false);
    expect(
      claimShard(seeded(), { claimId: "c1", ownerAgentId: "a", nowMs: Number.NaN, leaseMs: LEASE }).ok,
    ).toBe(false);
  });

  test("claiming a named shard that is not ready is refused", () => {
    const q = claim(seeded(), "c1", "a").queue;
    expect(
      claimShard(q, { claimId: "c2", ownerAgentId: "b", nowMs: 0, leaseMs: LEASE, shardId: "s1" }).ok,
    ).toBe(false);
  });
});

describe("leases and reaping", () => {
  const claimed = () => claim(seeded(), "c1", "a");

  test("an unexpired, heartbeating claim is not stale", () => {
    const q = claimed().queue;
    expect(claimIsStale(q, claimById(q, "c1")!, 1_000)).toBe(false);
  });

  test("an expired lease is stale", () => {
    const q = claimed().queue;
    expect(claimIsStale(q, claimById(q, "c1")!, LEASE)).toBe(true);
  });

  test("A MISSED HEARTBEAT is stale even before the lease expires", () => {
    // A dead agent holding a LONG lease would otherwise keep the work until the lease ran out.
    // The default heartbeat timeout is 60s, so this needs a lease longer than that to make the
    // point — a shorter one expires first and the heartbeat rule is never what fires.
    const longLease = 10 * 60_000;
    const q = must(
      claimShard(seeded(), { claimId: "c1", ownerAgentId: "a", nowMs: 0, leaseMs: longLease }),
    ).queue;
    expect(q.heartbeatTimeoutMs).toBeLessThan(longLease);
    const c = claimById(q, "c1")!;
    expect(claimIsStale(q, c, q.heartbeatTimeoutMs - 1)).toBe(false);
    expect(claimIsStale(q, c, q.heartbeatTimeoutMs)).toBe(true);
    // …and the lease itself has not run out at that point.
    expect(q.heartbeatTimeoutMs).toBeLessThan(c.leaseExpiresMs);
  });

  test("a heartbeat keeps the claim alive", () => {
    const longLease = 10 * 60_000;
    let q = must(
      claimShard(seeded(), { claimId: "c1", ownerAgentId: "a", nowMs: 0, leaseMs: longLease }),
    ).queue;
    q = must(heartbeat(q, "c1", 50_000)).queue;
    // 90s is past the 60s timeout measured from the ORIGINAL claim, but only 40s since the beat.
    expect(claimIsStale(q, claimById(q, "c1")!, 90_000)).toBe(false);
    // …and it does go stale once the beat itself is old enough.
    expect(claimIsStale(q, claimById(q, "c1")!, 110_000)).toBe(true);
  });

  test("REAPING returns the shard to ready and expires the claim", () => {
    // Without this a crash silently removes work from the world, and nothing notices because the
    // shard still looks claimed.
    const { queue, reaped } = reapStaleClaims(claimed().queue, LEASE);
    expect(reaped).toEqual(["c1"]);
    expect(shardById(queue, "s1")?.state).toBe(ShardState.Ready);
    expect(shardById(queue, "s1")?.claimedByClaimId).toBeUndefined();
    expect(claimById(queue, "c1")?.state).toBe(ClaimState.Expired);
  });

  test("reaping nothing changes nothing", () => {
    const q = claimed().queue;
    const { queue, reaped } = reapStaleClaims(q, 1);
    expect(reaped).toEqual([]);
    expect(queue).toBe(q);
  });

  test("A REAPED AGENT'S HEARTBEAT IS REFUSED — it must learn it was reaped", () => {
    // Silently accepting it would let the agent keep working on something already reassigned.
    const { queue } = reapStaleClaims(claimed().queue, LEASE);
    expect(heartbeat(queue, "c1", LEASE + 1).ok).toBe(false);
  });

  test("the reaped shard can be claimed again, with a HIGHER token", () => {
    const { queue } = reapStaleClaims(claimed().queue, LEASE);
    expect(claim(queue, "c2", "b", LEASE, "s1").claim.fencingToken).toBe(2);
  });
});

describe("THE FENCING TOKEN — the reaped claimant cannot overwrite its successor", () => {
  test("a current token completes", () => {
    const first = claim(seeded(), "c1", "a");
    const done = completeClaim(first.queue, { claimId: "c1", fencingToken: first.claim.fencingToken, nowMs: 1 });
    expect(done.ok).toBe(true);
    if (!done.ok) return;
    expect(shardById(done.queue, "s1")?.state).toBe(ShardState.Completed);
  });

  test("A STALE TOKEN IS REFUSED after the work was reaped and re-claimed", () => {
    // The property the whole module exists for. The first agent does not know it lost the lease;
    // from inside it is still working. Accepting its write would overwrite the new claimant's work,
    // so reaping would make the system lose less work and corrupt more.
    const first = claim(seeded(), "c1", "a");
    const { queue: reaped } = reapStaleClaims(first.queue, LEASE);
    const second = claim(reaped, "c2", "b", LEASE, "s1");

    const zombie = completeClaim(second.queue, {
      claimId: "c1",
      fencingToken: first.claim.fencingToken,
      nowMs: LEASE + 1,
    });
    expect(zombie.ok).toBe(false);
    if (!zombie.ok) expect(zombie.reason).toContain("reaped");

    // …and the rightful claimant still completes.
    expect(
      completeClaim(second.queue, { claimId: "c2", fencingToken: second.claim.fencingToken, nowMs: LEASE + 2 }).ok,
    ).toBe(true);
  });

  test("a WRONG token on an active claim is refused too", () => {
    const first = claim(seeded(), "c1", "a");
    const wrong = completeClaim(first.queue, { claimId: "c1", fencingToken: 999, nowMs: 1 });
    expect(wrong.ok).toBe(false);
    if (!wrong.ok) expect(wrong.reason).toContain("stale");
    expect(completeClaim(first.queue, { claimId: "c1", fencingToken: 0, nowMs: 1 }).ok).toBe(false);
  });

  test("the token NEVER goes backwards, so a reaped claimant cannot be fenced back in", () => {
    let q = seeded();
    const c1 = claim(q, "c1", "a");
    q = reapStaleClaims(c1.queue, LEASE).queue;
    const c2 = claim(q, "c2", "b", LEASE, "s1");
    q = reapStaleClaims(c2.queue, 2 * LEASE).queue;
    const c3 = claim(q, "c3", "c", 2 * LEASE, "s1");
    expect([c1.claim.fencingToken, c2.claim.fencingToken, c3.claim.fencingToken]).toEqual([1, 2, 3]);
  });

  test("completing twice is refused", () => {
    const first = claim(seeded(), "c1", "a");
    const done = must(completeClaim(first.queue, { claimId: "c1", fencingToken: 1, nowMs: 1 }));
    expect(completeClaim(done.queue, { claimId: "c1", fencingToken: 1, nowMs: 2 }).ok).toBe(false);
  });

  test("releasing gives the shard back", () => {
    const first = claim(seeded(), "c1", "a");
    const rel = must(releaseClaim(first.queue, "c1", 5, "changed my mind"));
    expect(shardById(rel.queue, "s1")?.state).toBe(ShardState.Ready);
    expect(claimById(rel.queue, "c1")?.state).toBe(ClaimState.Released);
  });
});

describe("review quorum", () => {
  /** s1 claimed by 'a' and completed. */
  function completed(quorum = 2): WorkQueue {
    const first = claim(seeded(quorum), "c1", "a");
    return must(completeClaim(first.queue, { claimId: "c1", fencingToken: 1, nowMs: 1 })).queue;
  }

  test("approvals accumulate and reach quorum", () => {
    let q = completed();
    expect(hasQuorum(q, "s1")).toBe(false);
    q = must(approveShard(q, { shardId: "s1", byAgentId: "b", atMs: 2 })).queue;
    expect(approvalCount(q, "s1")).toBe(1);
    expect(hasQuorum(q, "s1")).toBe(false);
    q = must(approveShard(q, { shardId: "s1", byAgentId: "c", atMs: 3 })).queue;
    expect(hasQuorum(q, "s1")).toBe(true);
  });

  test("THE CLAIMANT CANNOT APPROVE ITS OWN WORK", () => {
    // Self-approval makes a threshold decorative — one agent satisfies a quorum of one alone, and
    // shaves one off every larger quorum.
    const r = approveShard(completed(), { shardId: "s1", byAgentId: "a", atMs: 2 });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toContain("cannot approve");
  });

  test("approving twice is refused — that is self-approval over two calls", () => {
    let q = completed();
    q = must(approveShard(q, { shardId: "s1", byAgentId: "b", atMs: 2 })).queue;
    expect(approveShard(q, { shardId: "s1", byAgentId: "b", atMs: 3 }).ok).toBe(false);
    expect(approvalCount(q, "s1")).toBe(1);
  });

  test("a shard that is not completed cannot be approved", () => {
    const first = claim(seeded(), "c1", "a");
    expect(approveShard(first.queue, { shardId: "s1", byAgentId: "b", atMs: 2 }).ok).toBe(false);
  });

  test("merging without quorum is refused, and says how short it is", () => {
    const r = mergeShard(completed(), "s1");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toContain("0/2");
  });

  test("with quorum it merges", () => {
    let q = completed();
    q = must(approveShard(q, { shardId: "s1", byAgentId: "b", atMs: 2 })).queue;
    q = must(approveShard(q, { shardId: "s1", byAgentId: "c", atMs: 3 })).queue;
    const merged = must(mergeShard(q, "s1"));
    expect(shardById(merged.queue, "s1")?.state).toBe(ShardState.Merged);
  });

  test("A QUORUM OF ZERO IS REFUSED — a review nobody must pass is not a review", () => {
    const r = mergeShard(completed(0), "s1");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toContain("not a review");
  });

  test("approvals for one shard do not count toward another", () => {
    let q = completed();
    q = must(approveShard(q, { shardId: "s1", byAgentId: "b", atMs: 2 })).queue;
    expect(approvalCount(q, "s2")).toBe(0);
  });
});

describe("readout", () => {
  test("it counts what is where, including the review backlog", () => {
    const first = claim(seeded(), "c1", "a");
    const done = must(completeClaim(first.queue, { claimId: "c1", fencingToken: 1, nowMs: 1 }));
    const r = readout(done.queue, 2);
    expect(r.ready).toBe(1);
    expect(r.completed).toBe(1);
    expect(r.awaitingReview).toBe(1);
    expect(r.activeClaims).toBe(0);
  });

  test("stale claims are visible before they are reaped", () => {
    const first = claim(seeded(), "c1", "a");
    expect(readout(first.queue, 1).staleClaims).toBe(0);
    expect(readout(first.queue, LEASE).staleClaims).toBe(1);
  });
});

describe("a WorkQueue is a plain value — counting must be robust to one it did not build", () => {
  test("duplicate approvals from one agent count ONCE toward quorum", () => {
    // `approveShard` refuses a duplicate, so this shape is unreachable through the API today. The
    // queue is a literal any caller can construct, and a quorum that counts one agent twice is
    // self-approval wearing two hats — tested against a hand-built value for that reason.
    const first = claim(seeded(2), "c1", "a");
    const done = must(completeClaim(first.queue, { claimId: "c1", fencingToken: 1, nowMs: 1 }));
    const forged: WorkQueue = {
      ...done.queue,
      approvals: [
        { shardId: "s1", byAgentId: "b", atMs: 2 },
        { shardId: "s1", byAgentId: "b", atMs: 3 },
      ],
    };
    expect(approvalCount(forged, "s1")).toBe(1);
    expect(hasQuorum(forged, "s1")).toBe(false);
    expect(mergeShard(forged, "s1").ok).toBe(false);
  });
});
