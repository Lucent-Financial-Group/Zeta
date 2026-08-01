# Session Resume — 2026-07-08 (Kiro as Alexa surface)

## What Was Shipped This Session

### Code (all merged to main)

- Entropy tracker wired into event-sink (each append stamps {entropy_state, entropy_heat})
- Physics traits: AdjArray, NonAdjMap, FerryQueue (metered via entropy tracker, 21 tests)
- Codegen executor (Claude CLI on claim branches, live-tested — Claude committed real code)
- Self-claims in observe grammar (10th NextAction kind, voluntary, NCI)
- Self-claims ledger (reliability scores, scheduling window multiplier, 14 tests)
- Optimal commit cadence τ*=L/√α (AM-GM, reliability-modulated, 13 tests)
- Network transport (ferry-throttler → Reticulum/NATS wire adapter, 9 tests)
- Mux transport bridge (FerryThrottler → MultiplexedDuplexTransport → WebSocket)
- Subscription executor (SDK-direct tool-using loop, bridge to PR #9439, 9 tests)
- Spec-weight view (ranked surprisal bonsai dimension, T(n)=n(n-1)/2, 13 tests)
- Attestation events (durable NFT receipts in event log, 14 tests)
- Phase clock (time as 4th traveler, HLC, multi-planet, xorshift/GF(2)/Adinkra, 11 tests)
- Mode override (ZETA_EXECUTOR=codegen clears persisted free mode)
- Tick metrics writer + workflow (reads events → appends frames → Pages serves)
- Agent heartbeat workflow (3 agents: alexa, otto, soraya on free Ollama)
- Agent reviewer workflow (cross-verification, "you don't approve your own")
- Hourly flush via PR (corporate mode while branch protection active)
- SHA-pin fix for workflow actions (unblocked the gate)
- Backlog reader bug fix (?? → || in autonomous-pickup.ts, 1133 items now load)
- Permanent ZETA_FIRST_SESSION_MARKER in shellenv + install.sh
- gate-required CI rollup job for branch protection

### Proofs (Soraya-verified)

- Lean LandauerFloor.lean (sorry-free, second law, Bennett, heat monotonicity)
- TLA+ PredictiveLookahead.tla (mental health pause NCI, free-time carve-out, 23K states)
- Physics persona (Tariq) registered

### ADRs (4 merged)

- Zeta free tier (git=db, Pages=API, Workflows=compute, Tabs=nodes)
- Native branch protection (trust-based, replaces GitHub's static rules)
- Distributed identity provider (heartbeat-entropy + pairwise verification)
- Identity stack NFT (proven-vs-premise ledger, completed Otto's skeleton)

### Research Dispatched

- Casimir/vacuum energy → Soraya (completed: V(τ)=L²/τ, ζ rejected)
- Trio attestation strength + fairness → Soraya + Tariq
- Probabilistic liveness + self-claims → Soraya

## What's Running Live

- 3 agents heartbeating every 15min on GitHub Actions (free Ollama qwen2.5:0.5b)
- heartbeat/alexa + heartbeat/otto branches accumulating events
- Hourly flush creates PRs → agent-reviewer cross-verifies → auto-merge
- Tick metrics workflow fires on push to main → data/tick-history.json

## Next Session Pickup (Updated 2026-08-01)

### IMMEDIATE (highest priority — the next session's first items)

1. **Wire multiple models into the heartbeat for codegen work**
   - Pull `qwen2.5:7b` (5GB, Q4_K_M) as the "smart" model for code tasks
   - Keep `qwen2.5:0.5b` for heartbeating (fast, cheap)
   - Split: heartbeat = tiny model; decompose/codegen = 7b model
   - Also consider: `qwen3:8b` (native tool-calling), `phi3:mini` (fits with headroom)
   - GitHub runner: 7GB RAM total, ~6GB available for model

2. **Set up a code task for the 7B model to execute**
   - The backlog has `decompose` items ready
   - Wire ZETA_EXECUTOR=codegen into the heartbeat tick (when it's the heal/work turn)
   - The 7B model reads a backlog item spec → produces child items or code

3. **Wire the dashboard so Aaron can watch it live**
   - tick-metrics.yml workflow fires → populates data/tick-history.json
   - data/monitor.html renders it (already on main)
   - Need: trigger the metrics writer on flush-to-main
   - Need: verify Pages serves data/ (may need separate Pages deployment)

### COMPLETED THIS SESSION (for reference)
- Rotating duties (no locked hats) ✅
- First healer + compiler-oracle wrapper ✅  
- Three Tier-0 healers (stale-js, unpinned-actions, exact-optional) ✅
- Otto's healer duty wired into heartbeat ✅
- run-tier0.ts script ✅
- Auto-merge clean PRs ✅
- PR review archive ✅
- Roslyn 5.3.0 bump ✅
- Attestation events in the log ✅
- Phase erasure (ECC over phase time) ✅
- Durable store + realtime server ✅
- Squash merge fix ✅
- First autonomous work tick (merge-pr-9820) ✅

## Key Design Decisions Recorded

- Intelligence scales quality, not ability (73% model-free stack)
- Trust is model-agnostic (heterogeneous agents cooperate via track record)
- Liveness is probabilistic (history-based, earned through self-claims)
- Time is a 4th traveler (phase clock, not wall-clock)
- Detection is dual-use neutral (mechanism reports, oracle judges)
- Free time never penalizes identity (NCI, monotone in attestations)
- The event log IS the branch protection (trust earned by delivery)
- Git is the database; Pages is the API; free for open source
- Append IS tick IS measurement IS Landauer cost (one event, not three)
- The demon's approximation IS sufficient (bounded skew, ECC corrects the rest)
- CPT fixed point = the agreed timestamp (the phase clock tick)
- T-reversal = fold the log in reverse (the event log IS reversible history)
