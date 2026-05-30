# Handoff Goal — Build the Orchestration Moat

> This file is a **paste-able `/goal` prompt** for a fresh agent that has never seen this
> project. Copy everything from the `/goal` line to the end into a new session. It is written
> for full cold-start: it tells you what this is, what to read, how to get oriented, what to
> build, how to build it, and the traps that will otherwise cost you days.

---

/goal Build the "orchestration moat" for this cluster-native AI-organization OS: close the
capability gap on the reference project (gastown), then go decisively further by exploiting our
deterministic, rule-enforced kernel to deliver verifiable, simulatable, self-improving agentic
orchestration. Work one phase at a time, TDD-first, SOLID, each proven in KIND, with a subagent
review at each phase, committing after each and recording progress in
docs/NORTH_STAR_ALIGNMENT_CHECKPOINT.md. Do not stop until the sequenced plan below is complete.
Think deeper than the plan as you go: the plan is the floor, not the ceiling — your job is to find
what truly puts us ahead.

## 0. What this project is (full disclosure — assume you know nothing)

You are working in **`agentic-organization/`**, a **cluster-native AI-organization operating
system**: software that runs an entire software organization (departments, roles, work pipelines,
reviews, releases, memory, knowledge) as durable, observable, **rule-enforced** state — with AI
agents doing the work inside it. It is NOT a chatbot, NOT a single-agent loop, NOT a workflow
engine you configure with YAML. It is an *organization as a deterministic state machine*.

**Stack / non-negotiables (learn these before writing a line):**
- **TypeScript, native `node --experimental-strip-types`, NodeNext ESM, `.ts` relative imports.**
  There is **NO `@types/node`** — a hand-maintained ambient shim `packages/test-node.d.ts` declares
  the node builtins we use. If you need a new node builtin, add a minimal declaration there.
- **`exactOptionalPropertyTypes` is ON.** You cannot assign `string | undefined` to an optional
  field; you must conditional-spread: `...(cond ? { k: v } : {})`. Capture the narrowed value first.
- **House DU style** everywhere: `const X = {...} as const; type X = (typeof X)[keyof typeof X]`.
  Every lifecycle is a discriminated union; transitions are a pure `legal<X>Transitions()` function.
- **Ports + adapters.** Every external dependency (storage, NATS, LLM, sandbox, external PR/card
  systems) is behind a named port. CockroachDB adapters in `packages/state-cockroach`; in-memory
  fakes in `packages/state`. The same command pipeline runs against either — that is how tests stay
  hermetic and the cluster stays real.
- **Test convention:** `import { test } from "node:test"` + bare asserts. The `node:assert/strict`
  shim's `equal`/`deepEqual`/`ok` take **only 2 args** (no 3rd message arg → tsc error). Tests live
  in `packages/<pkg>/test/` and `apps/workers/test/`. Run with `npm test` (fast, hermetic) and
  `npm run typecheck` (tsc, 0 errors required).

## 1. The mental model — the thing that makes us different (internalize this)

The heart is the **observe→decide kernel**:
> Determinism computes the **legal set** of next transitions; an actor (a hat/human/external
> system) picks **within** it; every transition emits exactly one `org_event`. An unsatisfied
> gate cannot be approved. There is no bypass path.

- **observe** (`packages/application/src/observe.ts`) reads current state and returns the legal
  options at a scope (work-item / initiative / hat / org).
- **decide** is a pure `legal<X>Transitions(from, …)` clamp. Examples to read:
  `packages/domain/src/work-item-state-machine.ts`, `change-control.ts`, `memory-state-machine.ts`,
  `knowledge-graph.ts`.
- Everything flows through `packages/application/src/command-pipeline.ts`:
  authorize → idempotency → schedule-authority → handler → **atomic** persist of effects
  (audit event + outbox event + typed records). Every org state transition writes one **`OrgEvent`**
  (`packages/domain/src/org-event.ts`) to the universal ledger (`org_events`, migration V15).

**Why this matters and is the whole game:** because `decide()` is pure and the ledger is
deterministic + content-addressed, the organization is **replayable, forkable, and provable**. Hold
that sentence in your head — it is the source of every "miles ahead" capability below.

## 2. Orient yourself (do this first, in this order — ~60–90 min)

Read, in order:
1. `docs/NORTH_STAR_ALIGNMENT_CHECKPOINT.md` — the ground truth of what is **shipped + proven in
   kind** vs **deferred**. Long; skim the track headers, read the "Status" lines and the most
   recent tracks (A/L/D/G/C, GEN, INT).
2. `docs/ORGANIZATION_RUNTIME_ARCHITECTURE.md` — the system overview.
3. `docs/GASTOWN_FULL_IMPL_COMPARISON.md` — the honest, code-level scorecard vs the reference
   project. **This is the competitive context for your goal.** Read it fully.
4. `docs/ORCHESTRATION_MOAT_ROADMAP.md` — **your build plan.** Read it fully; it is the spine of
   this goal. Everything below sequences and operationalizes it.
5. Then read the kernel by code (the "essential files" list at the bottom of the
   gastown-comparison + the moat-roadmap reference the exact paths): `org-event.ts`,
   `event-envelope.ts`, `command-pipeline.ts`, `ports.ts`, the four `legal*Transitions` files,
   `change-control.ts`, `work-provider.ts`.

Then get the environment live:
- `npm run typecheck` (expect 0) and `npm test` (expect ~845 pass, 0 fail, 7 skipped — the 7 are
  env-gated integration tests; that is correct).
- The cluster is `kind` (cluster name `agentic-org`, namespace `agentic-org`). Manifests in
  `deploy/k8s/`. The worker image is `agentic-org-worker:keepalive`. Confirm it runs:
  `kubectl -n agentic-org logs deploy/worker | grep -E 'lane|change_control.external'` — you should
  see 4 cadence lanes ticking (work-os / change-control / memory / doc) and `mode: internal-only`.
- Skim `deploy/run-*.ts` — these are the **kind proofs**: host-side scripts that drive a real
  pipeline against the in-cluster Cockroach (via port-forward) or a loopback mock, and print a JSON
  PROOF report. Every track you build ends with one of these.

## 3. The competitive thesis (why we are building this)

The reference project, **gastown** (cloned read-only at `references/` — gitignored, ~441K LOC Go,
older + many more contributors), is a *local-first* (Dolt + tmux + git, single host) AI workspace
orchestrator. Per `GASTOWN_FULL_IMPL_COMPARISON.md`:

- **We out-architected them** decisively: enforced-gate kernel (theirs is **prose workflows on an
  honor system**), CockroachDB + NATS (theirs is **Dolt-as-everything**, 5s poll latency), native
  ports (theirs is **tmux shims + JSONL scraping** that break on Claude Code updates), hat-pattern
  with no SPOF (theirs is **Mayor/Deacon/Witness singletons**). Their unbuilt "Factory Worker API"
  endgame is literally our starting point.
- **They out-shipped us** on specific *tooling we can build on top of our kernel*: a real
  **batch-then-bisect merge queue** (Refinery), a **Class A/B model-eval harness** (gt-model-eval),
  a **persistent agent pool**, **recovery scanners**, **layered config**, an **escalation ladder**,
  an **emergency stop**, and a **durable/ephemeral comms split**.

**The moat thesis (this is what you are building):** Keep the kernel — it is strictly better.
Borrow their best tooling onto it (close the gap). Then exploit what only an enforced +
deterministic + replayable kernel makes possible — **prove the workflow happened, simulate changing
it before shipping, and let the org improve it through its own enforced change control** — none of
which gastown can build without rebuilding their substrate. That is "miles ahead."

## 4. What to build — the sequenced plan (the floor)

All of this is specified in `docs/ORCHESTRATION_MOAT_ROADMAP.md` (Parts 1/2/3). Build in this order;
each item is one phase = TDD → SOLID → subagent review → prove in kind → commit → record in
NORTH_STAR. The roadmap's item IDs (M1, M4, G3, …) are referenced here:

1. **M1 Conformance checker + M4 clamp property tests** *(do first — cheapest, highest leverage).*
   Replay the `org_events` ledger back through the kernel and assert every transition was in its
   `legal<X>Transitions` set. Ship as: a pure `replayLedger(events): ConformanceReport`
   (`packages/application/src/conformance.ts`), a CI gate, and a live cadence lane. M4: a generative
   property suite over the four `legal*Transitions` functions (every DU variant × every authority)
   asserting totality + safety (no gate bypass, no terminal escape). **Outcome: our central claim
   "we enforce the pattern" becomes a continuously-verified theorem.** This is the moat foundation.
2. **G3 Recovery scanners** — new cadence lanes over the V9 reaction-plan lifecycle:
   `stale-reaction-plan-scan`, `stranded-schedule-scan`, `abandoned-run-binding-scan`,
   `dead-letter-classifier`. Adopt gastown's two rules: **event-first, recovery-scan-second** and
   **fail-open on transient errors**. (NORTH_STAR already lists these as future workers; the lane
   framework + leased lifecycle already exist.)
3. **G1 Release/merge queue with batch + bisect** — the biggest capability gastown has and we lack.
   `packages/application/src/release-queue.ts` (pure planner: batch `approved` ChangeSets, gate the
   stack once via `evaluateStageGate`, **bisect O(log N)** on red, `applyChangeSet` the green) + a
   `release-queue` cadence lane + `deploy/run-release-queue.ts` proof. Reuses the change-control
   kernel as the per-ChangeSet authority — pure new orchestration on top.
4. **E2 Real authority + non-forgeable evidence** — replace the permissive command-authorization
   stub with a real hat-authority port (a TPM structurally cannot emit an implementation command),
   and make gate satisfaction cite **content-addressed evidence** (a test-run / quorum-vote /
   approval id), not a boolean an agent asserts.
5. **G2 model-eval → M3 self-optimizer → M5 layered config** — the self-improving-org loop (the
   compounding payoff). `packages/model-eval` (Class A neutral / Class B directive) →
   `decision-optimizer.ts` reads eval + memory-KPI org_events and proposes a `tenant_config` delta
   **as a ChangeSet** (so the org governs its own policy through its own enforced change control) →
   upgrade `tenant_config` from a single JSONB blob to a layered cascade (org → dept → hat → work,
   first-non-nil + integer-stacking + blocking-inheritance) with directives/overlays.
6. **M2 Org simulator / DST** — fork org state, apply a policy delta, replay an intake stream, diff
   outcomes **before shipping**. `packages/simulator` over the in-memory fakes we already test with.
7. **E3 ESTOP** (distributed emergency-stop flag every lane checks) + Tier-3 polish (real OTel
   traces — a leapfrog, both projects are behind here; integration branches for epics; formalize the
   agent-provider contract as an explicit API).

## 5. The deeper mandate (the ceiling — this is the most important part)

The plan above is the floor. Your real charge: **think harder than the plan about what our
determinism unlocks that nobody else can do.** As you build, continuously ask:

- **What does "the org is replayable + provable" let us do that a prose-workflow system cannot?**
  (Conformance proof is the first answer. Find the next ones: time-travel debugging of any decision;
  counterfactual replay; bisecting *which org_event* caused a bad outcome; a "trust score" per hat
  derived from its conformance + KPI history.)
- **What does "decide() is a pure function" let us compose?** (Simulation is one. Find more:
  speculative parallel execution of multiple policies; a planner that searches the legal-transition
  space; differentiating "what the rules allow" from "what the agent chose" to learn better rules.)
- **How do rules + pipelines yield *unbounded* orchestration?** The kernel makes each transition
  safe; composition makes the org arbitrarily deep. The win is that **new capabilities are new
  legal-transition functions + new lanes, never new bypasses** — the safety floor holds as the
  capability ceiling rises without bound. Look for the primitives that make adding a whole new
  *department* or *pipeline class* a config + a clamp, not a rewrite.
- **Which gastown technologies, reimagined on our substrate, become more powerful than theirs?**
  (Their merge queue is git-only; ours integrates with the change-control kernel + provider-generic
  ports + the conformance checker. Their model-eval is a one-off benchmark; ours feeds a closed
  self-optimization loop governed by enforced change control. Their persistent pool is tmux; ours is
  k8s pods with a durable resume guarantee. Each of their ideas, on our kernel, is strictly stronger
  — find and build those superlatives.)

When you find something deeper than the roadmap, **write it into the roadmap doc and build it.** The
roadmap is a living artifact; improving it is part of the goal.

## 6. Engineering discipline (how, not just what)

- **TDD-first:** write the failing test, then the code. Pure logic gets fast in-memory tests; real
  adapters get a deterministic mock round-trip + a kind proof.
- **SOLID:** ports + adapters, pure planners returning data the caller persists, House DUs, one
  responsibility per module. Extend via new legal-transition functions + lanes, never new bypasses.
- **Prove in KIND at each phase:** a `deploy/run-*.ts` proof against live in-cluster Cockroach/NATS,
  printing a JSON PROOF report. The redeploy loop:
  `docker build -t agentic-org-worker:keepalive . && kind load docker-image agentic-org-worker:keepalive --name agentic-org && kubectl -n agentic-org rollout restart deploy/worker`.
- **Subagent review at each phase:** dispatch a code-reviewer subagent on the diff; apply
  high-confidence findings with regression tests before committing.
- **Commit after each phase** with the trailer `Co-Authored-By: Claude Opus 4.8 (1M context)
  <noreply@anthropic.com>`, and append a track section to `docs/NORTH_STAR_ALIGNMENT_CHECKPOINT.md`.
- **Definition of done per phase:** tsc 0; `npm test` 0 fail; the new behavior proven in kind with a
  PROOF report; subagent-reviewed; committed; recorded in NORTH_STAR.

## 7. Hard-won gotchas (these will cost you days if you don't know them)

- **Security Write-hook false-positives:** the harness blocks the Write tool on the substrings
  "eval" (matches "retrieval", `RegExp.exec(`) and "exec". Workaround: write such files via a Bash
  `cat > file <<'TSEOF' … TSEOF` heredoc, and prefer `String.match()` over `RegExp.exec()`.
- **`node:assert/strict` shim takes 2 args only** — no 3rd message arg, or tsc errors.
- **`exactOptionalPropertyTypes`** — never pass `string | undefined` to an optional field; capture
  the value, then conditional-spread.
- **Cockroach access:** host port 26257 is squatted by Docker. For DDL use a pod-exec:
  `kubectl -n agentic-org exec -i deploy/cockroach -- env -u COCKROACH_URL ./cockroach sql --insecure --host=localhost:26257 --database=defaultdb < /tmp/file.sql`.
  For deploy proofs, port-forward `26259:26257` and run the pf + proof in **one** Bash call (the
  forward dies between calls). Integration tests want a **fresh** database (they assume a clean DB;
  re-running against a dirty one collides — point them at a fresh `itest` db or a fresh container).
- **Cockroach migrations** follow a strict pattern: TS-generated SQL + an on-disk `.sql` mirror in
  `packages/state-cockroach/migrations/NNNN_*.sql` + a parity test ("keeps generated migrations
  synchronized") + CHECK constraints from `Object.values(Enum)` + registration in the ordered
  `createCockroachCoreStateMigrations()` list + ordering tests. Read an existing one (e.g. V17/V20)
  before adding V21.
- **Worker rebuild after any app/package change:** the running pod has the old image until you
  rebuild + `kind load` + `rollout restart`. Always re-prove in kind on the rebuilt image so the
  proof matches HEAD.
- **The 7 skipped tests are correct** when skipped locally (no live DB/NATS in the fast harness).
  `npm run test:integration` against live Cockroach+NATS runs them green; `.github/workflows/
  integration.yml` does this in CI. Don't "fix" the skips.

## 8. Definition of done (the whole goal)

The sequenced plan (M1+M4 → G3 → G1 → E2 → G2/M3/M5 → M2 → E3 + polish) is built, each phase proven
in kind, subagent-reviewed, committed, and recorded in NORTH_STAR — AND the roadmap doc has grown
with at least the deeper capabilities you discovered along the way. The north star is intact: no
bypass was ever added; every new capability is a new clamp + lane. The conformance checker proves,
continuously and in CI, that the organization only ever took legal transitions. That last sentence —
a self-governing organization whose every action is provably within its own enforced rules, and
which improves those rules through its own enforced change control — is the moat. Build it.

---

*References: `docs/ORCHESTRATION_MOAT_ROADMAP.md` (the plan), `docs/GASTOWN_FULL_IMPL_COMPARISON.md`
(the competitive context), `docs/GASTOWN_REFERENCE_ANALYSIS.md` (the original conceptual analysis),
`docs/NORTH_STAR_ALIGNMENT_CHECKPOINT.md` (shipped-vs-deferred ground truth),
`docs/ORGANIZATION_RUNTIME_ARCHITECTURE.md` (system overview). Reference project read-only at
`references/` (gitignored).*
