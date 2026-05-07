---
id: B-0062
priority: P0
status: open
title: Wallet v0 build-out — concrete spec-logic punch list aggregating PR #72 deferred review concerns (Aaron 2026-04-28 honest-tracking catch)
tier: wallet-experiment-v0
effort: L
ask: maintainer Aaron 2026-04-28 ("bulk-resolve what is buld resolve does it actually answer the questions? or does it just close them? have they been answered?") — surfaced that ~15 PR #72 wallet-spec review threads were resolved with "deferred to v0 build-out" replies but no concrete tracking. This row IS the concrete tracking.
created: 2026-04-28
last_updated: 2026-05-07
decomposition: decomposed
depends_on: []
composes_with: [B-0060, B-0061]
tags: [wallet-experiment-v0, eat, spec-logic, pr-72-deferrals, honest-tracking, build-out, no-papering-over]
---

The EAT packet + wallet v0 operational spec PR (#72) absorbed
the research-grade docs but had ~15 review threads that
flagged real spec-logic gaps. Those threads were resolved
with "acknowledged + filed under v0 build-out phase" replies.
The honest tracking is THIS row, so the deferred concerns
don't get lost in closed-thread comments.

## Context

PR #72 framing: research-grade absorb of the EAT canonical
packet + wallet v0 operational specification. Not canonical
doctrine. Not a build-out commitment. The deferred concerns
are appropriate for the implementation phase when state-
machine shapes will be surfaced by real code, not for the
research-grade absorb scope the PR represents.

Aaron 2026-04-28 honest-tracking catch:

> *"bulk-resolve what is buld resolve does it actually answer
> the questions? or does it just close them? have they been
> answered?"*

Translation: deferral is fine, but it must be tracked. A
"deferred to v0 build-out" reply on a closed thread is not
tracking; it's papering. This row converts the deferred
threads into a concrete actionable punch list.

## Punch list (resolve before v0 acceptance, not before this PR merge)

Each item references the PR #72 review thread that surfaced
it (closed-thread links survive in the PR's review history).

### Spec-logic — preflight retraction state machine

1. **Add a terminal path for preflight-retracted proposals**
   (cid 3151220960 P1). The tick state machine currently
   enforces `signed → broadcast → settled`; a preflight-
   retracted proposal has no terminal state. The wallet
   spec needs an explicit `preflight-retracted` terminal
   state with the receipt-schema fields the monitor will
   write.

   **Proposed (Otto 2026-05-07):** Add `retracted`
   terminal state: `signed → retracted`. The receipt
   for a retracted proposal uses the nullable tx block
   (PR #1922) and records `pre_flight_retracted: true`
   + `retraction_reason`. The state machine becomes:
   `signed → broadcast → settled` (normal) OR
   `signed → retracted` (preflight cancellation).

   **Aaron correction (2026-05-07):** Terminal state is the
   sharp edge of one proposal instance, not the round shape
   of the standing Rx query. Retraction is a delta/receipt;
   it closes that local proposal without popping the standing
   query wave. The query remains live, and any materialized
   cache is reconstructable (`cache = I o D`) rather than
   load-bearing lifecycle state.
2. **Drop the impossible pre-broadcast classification freeze
   trigger** (cid 3150897609 P1). §6.1 currently freezes
   when the pre-flight retraction monitor disagrees with
   the agent's classification, but the spec also says
   classification happens post-broadcast. The two
   statements can't both be true. Decision needed: does
   classification happen pre- or post-broadcast?

   **Resolved (Otto 2026-05-07):** No actual contradiction.
   The pre-broadcast freeze (§9.1 line 431) is about THESIS
   disagreement ("monitor's reasoning-trace check disagrees
   with the agent's thesis"), not classification disagreement.
   Classification IS post-broadcast (§6.1 lines 249-253
   confirm: "classification follows broadcast, not signed").
   Two different gates at two different stages. The original
   item conflated thesis-review with classification-review.
3. **Add a pre-broadcast freeze terminal state** (cid
   3151408384 P1). §9.1 allows the monitor to trigger
   `freeze-on-dissent` before broadcast — the spec needs
   the matching terminal state in the tick state machine.

   **Proposed (Otto 2026-05-07):** Add `frozen`
   terminal state: `signed → frozen`. Distinct from
   `retracted` (agent-initiated) — `frozen` is
   monitor/Aaron-initiated. Unfreeze (per §6.2:
   smart-contract + Aaron) transitions back to
   `signed` for re-evaluation. State machine:
   `signed → broadcast → settled` (normal) OR
   `signed → retracted` (agent cancels) OR
   `signed → frozen` (monitor/Aaron freezes).
4. **Make tx-receipt fields optional for preflight retractions**
   (cid 3151233788 P1). Receipt schema currently requires
   on-chain transaction fields (`hash`, `block_number`,
   etc.); a preflight-retracted proposal has no on-chain
   transaction. Schema needs `Optional<>` markers for the
   on-chain-only fields.

   **Resolved:** PR #1922 made the on-chain `tx` fields nullable
   for `pre_flight_retracted = true` receipts.

### Spec-logic — agent self-revocation

1. **Define a revocation auth path the agent can actually use**
   (cid 3151301493 P1). §9.1 requires the agent to self-
   revoke via a call authenticated by the active session
   key, but §3.3/§3.4 say the agent doesn't hold keys.
   Reconcile: either the agent has a session-key signed
   mandate (separate from tx-signing), or the revocation
   goes through a different auth channel (oracle, monitor-
   signed message, etc.).

   **Proposed (Otto 2026-05-07):** Agent holds a
   ZeroDev session-key mandate scoped to
   RETRACTION-ONLY (cancel own proposal during
   retraction window). Not tx-signing — cancellation
   only. §3.3/§3.4 "no keys" means no TX-SIGNING
   keys; a retraction-scoped session key is not a
   contradiction — it's a permission boundary. The
   ZeroDev session-key permission model (§12.1)
   already supports scoped mandates.

2. **Clarify §9.1 revocation mechanism vs §3.3/§3.4 no-keys**
   (cid 3151222680 P1). Same root cause as item 1 above.

   **Proposed (Otto 2026-05-07):** Same resolution as
   item 1. §3.3/§3.4 should say "no tx-signing keys"
   not "no keys." The retraction-scoped session key
   is explicitly allowed.

### Spec-logic — monitor placement + lifecycle

1. **§12.5 sibling-repo vs in-repo monitor reconciliation**
   (cids 3151300145, 3151300160 P1). §12.5 RESOLVED the
   monitor implementation to a sibling repository; the
   acceptance criteria + Phase 1 roadmap still permit the
   in-repo `tools/wallet-monitor/` form factor. Pick one.
2. **Topology section alignment with §12.1 framework choice**
   (cid 3151260676 P2). Topology section still labels the
   smart-account framework as "open question" but §12.1
   RESOLVED it to ZeroDev-on-7702. Update topology to
   match.
3. **Phase 1 roadmap sibling-repo monitor requirement**
   (cid 3151260677 P2). Phase 1 still lists "stub
   tools/wallet-monitor/ directory or sibling-repo
   bootstrap"; §12.5 RESOLVED removes the "or in-repo"
   option. Update roadmap.

### Spec-logic — monitor-stall freeze + classification

1. **Enforce monitor-stall freeze before broadcast**
    (cid 3151321309 P1). The spec requires the monitor
    pipeline to complete within 60s; needs an explicit
    `freeze-on-monitor-stall` rule + the terminal state
    that the freeze creates.

    **Resolved (Otto 2026-05-07):** The `frozen`
    terminal state (PR #1935) covers this. Monitor
    stall triggers `signed → frozen` via the same
    path as freeze-on-dissent. §9.1 line 550 already
    says "monitor defaults to freeze-on-stall."
2. **Define an on-chain classification signal for Tx N+1
    gating** (cid 3151333578 P1). §7.1 requires the
    smart-account contract to reject Tx N+1 if Tx N's
    classification is unresolved. The spec doesn't define
    where the contract reads the classification signal
    from (oracle? monitor-signed message? bond escrow?).
    Pick one.

    **Proposed (Otto 2026-05-07):** Monitor-signed
    classification message — same pattern as the drawdown
    oracle. Monitor classifies Tx N, signs the result,
    posts to smart-account. Contract checks for signed
    classification before allowing Tx N+1. Minimum signed
    payload: `chainId`, smart-account address, Tx N
    identifier, classification value, monotonic nonce or
    round, and expiry. Single pattern for both drawdown and
    classification: monitor signs, contract verifies
    signature + reads value + freshness.

### Spec-logic — drawdown oracle + glass-halo logging

1. **Define a deterministic oracle for drawdown freeze
    checks** (cid 3151362883 P1). §5.5 requires the
    smart-account to freeze when bond drawdown crosses a
    threshold. The on-chain check needs a deterministic
    oracle (Chainlink? own pricing oracle? off-chain
    monitor-signed update?). Spec needs the choice.

    **Proposed (Otto 2026-05-07):** Monitor-signed price
    update. The off-chain monitor already watches drawdown;
    it signs its price observation and posts to the
    smart-account. No Chainlink dependency (external vendor
    risk for v0 small-bond scale). No custom oracle contract
    (complexity). The monitor IS the oracle — it just signs.
    Minimum signed payload: asset identifier, price,
    decimals, `chainId`, smart-account address, monotonic
    nonce or round, and timestamp + expiry. Revisable at
    v0+1 if Chainlink or custom oracle adds value at larger
    scale.
2. **Move glass-halo logging gate out of smart-contract
    enforcement** (cid 3151362886 P1). The spec currently
    makes "logging failure ⇒ tx fails" an on-chain
    enforcement rule. Logging is off-chain infrastructure;
    making it a contract-level gate is a separation-of-
    concerns mistake. Move to off-chain monitor.

### Acceptance-criteria + auth + metric alignment

1. **Require auth for retraction-queue cancellation** (cid
    3150816618 P1). The spec currently says a pending
    transaction can be self-revoked without auth; needs
    the auth path matching item 1 in 'Spec-logic —
    agent self-revocation'.

    **Resolved (Otto 2026-05-07):** Same retraction-
    scoped session key from the self-revocation
    proposal (PR #1933). Agent authenticates
    cancellation via the ZeroDev session-key mandate
    scoped to retraction-only.
2. **Material-spend criteria for second-agent review** (cid
    3151321306 P2). Receipt schema makes `second_agent_
    review.required` a boolean; spec needs the predicate
    that decides when it's required (spend > $X? new
    counterparty? new venue?).

    **Proposed (Otto 2026-05-07):** require second-agent
    review when any of these are true: amount exceeds 10%
    of remaining bond; counterparty is absent from prior
    receipts; venue is absent from prior receipts.
    Conservative for v0. Revisable as the bond grows.
3. **Align retraction metric with updated Base reorg
    policy** (cid 3150816620 P2). Retraction metric still
    requires "reorg-window monitored after" the §12.2
    Base-reorg policy. Update to current policy.
4. **Unify the unfreeze quorum across sections** (cid
    3151220963 P2). Test text requires "Aaron-plus-monitor"
    for unfreeze; §6.2 defines a different quorum. Pick
    one + propagate.

   **Resolved:** PR #1923 made the §11.3 dry-run test match
   §6.2: smart-contract-guard-plus-Aaron is required to
   unfreeze; the off-chain monitor cannot unilaterally
   unfreeze.
5. **§15 send-readiness statement reconciliation** (cid
    3150897613 P2). §15 says only two maintainer-only
    questions remain; current state is §12.1-§12.6
    Otto-resolved + §12.7-§12.8 Aaron-resolved. Refresh
    statement.
6. **EAT retraction-coverage metric alignment with wallet
    spec** (cid 3151233791 P2). Companion-spec drift
    between EAT doc and wallet v0; align metric.
7. **EAT Task B in-repo monitor option removal** (cid
    3151301494 P2). EAT Task B still permits in-repo
    monitor form factor; align with §12.5 sibling-repo
    resolution.

### Schema migration

1. **INTENTIONAL-DEBT.md YAML schema vs current prose
    format** (cid 3151337321 P1). Spec proposes recording
    bond entries in a YAML schema; INTENTIONAL-DEBT.md is
    currently a prose/bulleted ledger. Either land the

    **Proposed (Otto 2026-05-07):** Defer YAML schema
    to v0+1. For v0: define bond entries in the existing
    prose format. The YAML migration is a separate ADR
    when tooling justifies the format change. v0 bond
    scale doesn't need machine-readable schema yet.
    YAML schema migration (separate ADR + tooling), or
    define bond entries in the existing prose format
    until the schema lands.

## Done-criteria

Each punch-list item resolved with either:

+ (a) A spec edit landing the chosen mechanism + its
  rationale, OR
+ (b) An ADR documenting "we considered this; here's why
  we're going with X over Y," OR
+ (c) An explicit "out of scope for v0; defer to v0+1"
  with a follow-up backlog row.

When all 21 items have one of these three resolutions,
this row closes.

## Why this row exists

Aaron 2026-04-28: *"bulk-resolve what is buld resolve does
it actually answer the questions? or does it just close
them? have they been answered?"* — caught the failure mode
where I closed threads with deferral notes but didn't track
the deferrals anywhere actionable. Honest tracking IS the
fix. The thread closures stay (PR #72 mergeable as research-
grade absorb), but the substantive concerns now have a
concrete punch list, not just scattered closed-thread
comments.

## Progress (2026-05-07 session)

8 of 21 items resolved via doc reconciliation:

+ PR #1907: 3 stale "open question" refs → resolved
+ PR #1908: EAT Task B monitor → sibling-repo
+ PR #1910: Phase 1 roadmap monitor + §0 → resolved
+ PR #1922: Receipt schema optional for preflight
+ PR #1923: Unfreeze quorum unified §6.2 ↔ §11.3
+ PR #1924: Ledger update (Vera)
+ PR #1927: EAT retraction-coverage metric aligned
+ §15 send-readiness already reconciled (prior pass)

13 items remain — all P1/P2 design decisions needing
deeper wallet-domain engagement (preflight terminal
state, agent self-revocation auth, monitor-stall freeze,
on-chain classification signal, drawdown oracle,
glass-halo logging gate, auth for cancellation,
material-spend criteria, INTENTIONAL-DEBT schema).

2026-05-07 red-team correction: PR #1942 briefly marked
this row closed by trusting a "21/21 addressed" pickup
summary, but this file still records 8 of 21 resolved and
13 remaining design decisions. Reopening preserves the
original done-criteria: the row closes only when every
punch-list item has a spec edit, ADR, or explicit v0+1
deferral with follow-up tracking.

## Composes with

+ **B-0060** — human-lineage / external-anchor backfill (the
  spec mechanisms picked here should cite their external
  prior art per the same rule).
+ **B-0061** — backlog migration (this row IS in per-row
  format; B-0061 is the meta-task tracking the rest).
+ The closed PR #72 review threads survive in the PR's
  history; this row references them by `cid=NNNNNNNNNN` so
  the original reviewer's framing is recoverable.
