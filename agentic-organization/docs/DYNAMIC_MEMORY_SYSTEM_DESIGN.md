---
title: Dynamic Memory System Design
canonical_name: Agentic Organization
status: design
---

# Dynamic Memory System Design

How the organization gives **hats and agents durable, weighted, self-maintaining
memory** — and how the **Memory & Knowledge department** (the "IT department for
memory") maintains it on a daily cadence: scoring every memory by *how likely it
should be to surface*, decaying old ones, correlating each against the KPIs it
actually produced, promoting the winners, demoting the losers, and archiving the
ones whose weight has fallen to zero so they never surface again.

This document expands two existing docs with a concrete mechanism:

- [`AGENT_WORK_RHYTHM_AND_PROMPT_FLOWS.md`](AGENT_WORK_RHYTHM_AND_PROMPT_FLOWS.md)
  already says hats have a "memory maintenance" obligation — "stabilize useful
  memories, deprecate stale memories, correct invalid memories, scope memories
  by hat/project/task." This doc makes that obligation *executable*.
- [`CLUSTER_EXECUTION_AND_MEMORY_SUBSTRATE.md`](CLUSTER_EXECUTION_AND_MEMORY_SUBSTRATE.md)
  says an "Organization memory adapter injects active context and policy scope."
  This doc defines *what* gets injected, *how it is ranked*, and *who keeps it healthy*.

## Provenance — what we are taking, and what we are not

The mechanism below is adapted from the memory subsystem of an unrelated design
("TPM-REFACTOR"). **We take the memory *idea* and the *maintenance idea*. We do
not take its architecture.**

| Taken (the idea) | Rejected (their stack / architecture) |
|------------------|----------------------------------------|
| Memory = content + **mutable weight-state**, joined by a stable id | Their RaaS / Weaviate / Elasticsearch / FalkorDB / Mongo five-store split |
| **Tiered scoping** of memory | Their `turn/thread/engagement/persona` tier names |
| A composite **retrieval weight** (freshness × confidence × outcome × utility …) | Their specific weights, schema files, MCP tool surface |
| **Freshness decay** with an archive floor | Their RaaS chunk soft-delete + reconciliation jobs |
| **Outcome (KPI) correlation** and **utility self-tuning** | Their TPM persona/reviewer/gate architecture |
| A **daily analyst** that proposes promote/demote/conflict candidates | Their `observer-analyst` / `observer-promoter` persona files and replay harness |
| **Protected** memories that cannot be auto-overwritten | Their GitLab-MR promotion path |

Everything below is re-expressed in **our** primitives: CockroachDB + NATS +
in-cluster Ollama, native TypeScript (`--experimental-strip-types`), the
`observe → decide` kernel, the universal `org_event` trace, and the hat +
department org we already built and proved in kind.

---

## 1. Thesis

> Memory is a **weighted, decaying, KPI-correlated substrate**. Determinism
> computes each memory's *weight* (how likely it should surface) and the *legal
> set* of maintenance actions; agents drive the *outcomes* (which memories to
> actually cite, and — for risky lifecycle moves — which candidate to approve).
> The **Memory & Knowledge department** runs a daily maintenance cycle that is
> itself an org cycle: every recompute, promotion, demotion, and archive emits
> one durable `org_event`, so the whole memory economy is crystal-clear.

This is the same "**enough determinism, agents drive outcomes**" tenet that
governs the rest of the org — applied to memory.

---

## 2. Tier ladder — memory scoped to the org, and the hat ⊕ agent combination

Memory is scoped to **where in the organization it belongs**. The ladder mirrors
our actual hierarchy (`org → department → hat → agent`) plus one cross-cutting
**work/workflow** tier for memory that belongs to a unit of work rather than to a
role.

| Tier | `scope` value | Belongs to | Lifetime | Example |
|------|---------------|------------|----------|---------|
| `org` | `org-lfg` | The whole company | indefinite (decays) | "All public-facing copy goes through Legal review." |
| `department` | a `DepartmentId` | A department | indefinite (decays) | "Engineering never merges on a red runtime gate." |
| `hat` | a `HatDefinition.id` | **A hat** — inherited by *whoever currently wears it* | indefinite (decays) | `code_reviewer` → "Require a rollback plan before approving DB migrations." |
| `agent` | an `agentId` | **A specific actor/agent** | indefinite (decays) | `agent-7` → "I tend to under-estimate test effort; pad QA by 20%." |
| `work` | a `workItemId` | A unit of work / workflow run | decays fast (default 30d) | `work-…` → "This epic reserves Redis for sessions only (RFC-882)." |

### 2.1 The hat ⊕ agent ⊕ work combination (the requested behavior)

> *"certain hats should have memories assigned to them but also specific memories
> assigned to each actor/agent that can combine with the hat memory."*

When **agent `A` wears hat `H` on work item `W`**, retrieval pulls the **union**
of everything in scope and ranks it by weight:

```
retrieval scope for binding (A wears H on W) =
      org(org-lfg)
    ⊕ department(H.departmentId)
    ⊕ hat(H.id)              ← the role's accumulated wisdom
    ⊕ agent(A)               ← this specific actor's personal memory
    ⊕ work(W)               ← this workflow's local memory
```

- **Hat memory** is the role's institutional knowledge: it persists across
  *wearers*, so a freshly-bound agent inherits the hat's hard-won lessons the
  moment the binding activates. This is the natural fit for our hat lifecycle —
  the binding is the carrier, the hat-tier memory is the cargo.
- **Agent memory** is the actor's personal layer: calibration, tendencies,
  preferences. It travels with the agent across *every hat they wear*.
- **Combination at write time:** when agent-tier and hat-tier carry the *same
  key* with different values, the agent layer is treated as a **personal
  override/augmentation** of the hat layer for that agent only (a small
  `personalScope` boost at retrieval), without mutating the hat memory other
  wearers see.

This combination is computed *deterministically* (it's a pure scope union +
weight sort); the agent only chooses which of the surfaced memories to actually
use.

---

## 3. The memory record — content vs. weight-state

A single logical **MemoryRecord** is split into two parts, because they change at
different rates (a Data-Vault-style hub/satellite split — the same
change-rate-partition discipline used elsewhere in the repo):

```ts
// CONTENT — written rarely, embedded for semantic search (the "hub")
type MemoryContent = {
  memoryId: string;          // UUID v5 from `org:tier:scope:key` — stable join key
  tier: MemoryTier;          // org | department | hat | agent | work  (House DU)
  scope: string;             // org-lfg | DepartmentId | hatId | agentId | workItemId
  key: string;               // stable slug, e.g. "review:require-rollback-plan"
  value: string;             // the memory text itself
  contextHint?: string;      // why this exists; enriches the embedding
  protected: boolean;        // cannot be auto-overwritten / auto-demoted
  writtenBy: string;         // hatId | agentId | "memory_curator" | "human"
  writtenAt: string;         // ISO
  embedding?: readonly number[]; // optional; nomic-embed-text via in-cluster Ollama
};

// STATE — updated continuously (the "satellite"); drives the weight
type MemoryState = {
  memoryId: string;
  confidence: number;        // 0..1   — write-time guess, refined by outcomes
  freshnessAt: string;       // last-confirmed; freshness decays from here
  reinforcementCount: number;

  outcome: {                 // KPI correlation
    successCount: number;    // times this memory was in scope during a SUCCESS
    failureCount: number;    // …during a FAILURE
    inconclusiveCount: number;
    lastOutcomeAt: string | null;
    workItemsObserved: readonly string[]; // FIFO-capped, for dedup
  };

  utility: {                 // self-tuning: was it actually used?
    injectedCount: number;   // times retrieved/injected into a prompt flow
    citedCount: number;      // times the agent actually cited it
    lastInjectedAt: string | null;
  };

  crossScopeObservations: {  // promotion signal (work→hat, hat→department, …)
    distinctScopes: readonly string[]; // FIFO-capped
    firstObservedAt: string;
    lastObservedAt: string;
  };

  phase: MemoryPhase;        // lifecycle DU (§5)
  weight: number;            // 0..1 — last computed retrieval weight (cached)
  archivedAt?: string;
};
```

Content lives in one Cockroach table; state in another, joined by `memoryId`
(§8). The split exists so the daily maintenance cycle can do cheap, atomic
`UPDATE … SET success_count = success_count + 1` on state without touching the
embedded content.

---

## 4. Retrieval weight — "how likely it is to surface; zero means never again"

This is the heart of the request. The **weight** is a deterministic, pure
function of a memory's state — *how likely it should be to surface*. It is
computed at retrieval time and also recomputed nightly (cached on the state row).

```ts
function computeMemoryWeight(s: MemoryState, ctx: RetrievalCtx): number {
  const freshness  = computeFreshness(s, ctx.now);   // 1 → 0 as it ages (§4.1)
  const confidence = s.confidence;                   // 0..1
  const outcome    = outcomeRatio(s);                // success/(success+failure), 0.5 until ≥3 samples
  const utility    = utilityRatio(s);                // cited/injected, 0.5 until ≥5 injections
  const semantic   = ctx.semanticScore ?? 0.5;       // optional Ollama cosine; 0.5 if disabled

  const base =
      0.30 * semantic
    + 0.20 * freshness
    + 0.15 * confidence
    + 0.20 * outcome      // KPI is weighted heavily — this is the point
    + 0.15 * utility;

  // additive scope boosts (capped)
  const hatScope      = (s.tier === "hat"   && s.scope === ctx.hatId)   ? 0.05 : 0;
  const personalScope = (s.tier === "agent" && s.scope === ctx.agentId) ? 0.05 : 0;
  const workLocal     = (s.tier === "work"  && s.scope === ctx.workItemId) ? 0.05 : 0;

  return clamp01(base + hatScope + personalScope + workLocal);
}
```

### 4.1 Decay and the zero floor

Freshness decays linearly from `freshnessAt` per a per-tier half-life; below an
**archive floor** the memory is moved to `phase: Archived` and **excluded from
every future retrieval** — it has dropped to zero and will never surface again
(exactly the requested behavior).

```ts
function computeFreshness(s: MemoryState, now: number): number {
  const halfLifeDays = HALF_LIFE[tierOf(s)];          // work:30, hat/agent:120, dept:180, org:365
  const elapsedDays = (now - Date.parse(s.freshnessAt)) / 86_400_000;
  return Math.max(0, 1 - elapsedDays / (2 * halfLifeDays));
}
```

| Tier | half-life | default-read floor | archive floor (→ never surfaces) |
|------|-----------|--------------------|----------------------------------|
| `work` | 30d | 0.35 | 0.15 |
| `hat` / `agent` | 120d | 0.30 | 0.15 |
| `department` | 180d | 0.30 | 0.15 |
| `org` | 365d | 0.25 | 0.10 |

A memory **also** drops toward zero — independent of age — when its **KPI
correlation goes bad** (outcome ratio collapses) or its **utility goes to zero**
(injected many times, never cited). Both feed the weight; a memory that is
fresh but useless still sinks. Reinforcement (being confirmed again) resets
`freshnessAt` and lifts it back up.

### 4.2 Self-tuning (utility)

```ts
const outcomeRatio = (s) => { const t = s.outcome.successCount + s.outcome.failureCount;
  return t < 3 ? 0.5 : s.outcome.successCount / t; };           // neutral until enough KPI signal
const utilityRatio = (s) => s.utility.injectedCount < 5 ? 0.5
  : Math.min(1, s.utility.citedCount / s.utility.injectedCount); // injected-but-never-cited → sinks
```

A memory retrieved 20 times and cited 0 times has `utilityRatio → 0`; its weight
falls; it surfaces less; eventually it falls out of the budget entirely and then
under the archive floor. **This is the continuous-learning dimension** — memories
compete for inclusion on *empirical usefulness*, not their initial confidence guess.

### 4.3 Determinism ⇄ autonomy at retrieval (and prompt-flow injection)

- **Deterministic** computes the candidate set (scope union, not archived, above
  the read floor) and the **weight-ranked order**, then greedily packs the top-N
  into the prompt-flow's memory budget. The agent **cannot widen** this — it only
  sees what the rules surfaced.
- **The agent chooses within it**: which surfaced memories to actually rely on
  and cite. Citations are recorded (drives `utility`), and an
  anti-citation-laundering check rejects a cited `memoryId` that was not actually
  injected this turn (the same clamp discipline as the rest of the kernel — an
  agent can't fabricate a grounding).

This plugs straight into the **prompt flows**
([`AGENT_WORK_RHYTHM_AND_PROMPT_FLOWS.md`](AGENT_WORK_RHYTHM_AND_PROMPT_FLOWS.md)):
a `## Relevant memory` block is composed at prompt-construction time for the
active binding, rendered as `hat-tier` then `agent-tier` then `work-tier`, each
line annotated with its live weight + KPI record so it is auditable.

---

## 5. Memory lifecycle (House-DU, mirrors `HatBinding`)

A memory's `phase` is a discriminated union with explicit terminal states —
authored in the same style as our `HatBindingPhase` so the maintenance cycle can
fold over it deterministically.

```
Draft ─▶ Active ─▶ Reinforced ─▶ Active ─▶ Stale ─▶ Archived(terminal)
                              ╲           ╲▶ Demoted ─▶ Archived
                               ╲▶ Promoted (new record at higher tier; source kept)
   any Active/Stale ─▶ Conflicted ─▶ (resolution decision) ─▶ Active | Archived
```

| Phase | Meaning | Reached by |
|-------|---------|-----------|
| `Draft` | written, not yet weight-eligible | a write |
| `Active` | in the retrieval pool | first weight computation |
| `Reinforced` | confirmed again (resets freshness, lifts confidence) | conflict-resolution `reinforce` |
| `Stale` | weight under the read floor (still recoverable) | nightly decay |
| `Demoted` | KPI/outcome judged bad by a hat decision | `memory_demotion` decision |
| `Promoted` | a higher-tier copy was created from it (source preserved) | `memory_promotion` decision |
| `Conflicted` | same key, divergent value, similar confidence | write conflict |
| `Archived` | **terminal** — weight ≤ archive floor; never surfaces again | nightly archive OR demotion |

`TerminalMemoryPhases = { Archived }`. Conflict resolution is the same
reinforce / overwrite / flag-as-alternative / reject decision the TPM idea uses,
re-expressed against our store.

---

## 6. KPI / outcome correlation — wired to *our* trace, not theirs

The TPM idea correlates memory to "manifest outcomes." We already emit a richer
signal: the universal `org_event` stream + the pipeline. **A work item that
reaches `merged` is a success; one that stalls or takes a recovery path is a
failure.** So the correlation reads our own events — no new outcome system.

```ts
// when a work item's pipeline finalizes (we already emit pipeline_stage_transition):
async function correlateOutcome(workItemId: string, verdict: "success"|"failure"|"inconclusive") {
  // every memory injected during any binding that touched this work item
  const memoryIds = await listMemoriesInjectedFor(workItemId);   // from injection ledger
  for (const memoryId of memoryIds) {
    await memoryState.bumpOutcome(memoryId, verdict, workItemId); // dedup on workItemId
  }
}
```

- **`merged`** (all 7 gates passed) → `success` for every memory that was in
  scope during that work item.
- **gate `Rejected` / recovery path / stall** → `failure`.
- Confidence is then recomputed from the success/failure ratio (asymmetric:
  *reinforcement auto-applies, demotion routes to a hat*, §7).

This is the answer to *"identify which memories are producing best KPIs and which
are not."* The KPI is the org's own outcome signal, already in `org_events`.

---

## 7. The Memory & Knowledge department — the daily maintenance cycle

> *"said IT department will run daily … automated and also some manual (from IT
> dept) heuristic on each memory."*

The "IT department" is the **`memory_and_knowledge`** department — **it already
exists in the seed**, reporting to the COO, with these hats:

| Hat | Level | Owns (in the memory economy) |
|-----|-------|------------------------------|
| `memory_director` | Director | **memory policy**; final authority on risky lifecycle decisions; votes on memory hat-supply |
| `memory_manager` | Manager | **memory adaptation** — tunes weights/decay/floors; routes candidates to reviewers |
| `memory_curator` | IC | authors + corrects memory content; applies approved promotions |
| `memory_reviewer` | IC | the **manual heuristic** — reviews demotion / promotion / conflict candidates |
| `knowledge_router` | IC | decides which memory is scoped to which hat/agent/work |
| `project_context_librarian` | IC | owns **work-tier** (workflow) memory |

### 7.1 The cycle is an org cycle (observe → decide, fully traced)

`runMemoryMaintenanceCycle` runs daily and is structured exactly like
`runOrgCycle` — determinism computes the legal action set per memory; the
appropriate hat chooses within it; every action emits one `org_event`.

**Stage A — automated (no hat decision; safe, reversible):**

1. **Decay pass** — recompute `freshness` and `weight` for every active memory.
   Emit `memory_weight_recomputed` per memory whose weight band changed.
2. **Archive-at-zero** — any memory whose weight ≤ archive floor →
   `phase: Archived`. Emit `memory_lifecycle_transition` (`Stale|Active → Archived`).
   *It will never surface again.*
3. **Confidence reinforcement** — recompute confidence from KPI ratio; if it
   *rose*, auto-apply (low risk) and emit `memory_weight_recomputed`.

**Stage B — manual heuristic (routed through a hat's `chooseWithinLegal`):**

1. **Demotion candidates** — memories with `failureCount ≥ 3` and failure ratio
   ≥ 0.6 are *flagged*, not auto-demoted (a true memory present during unrelated
   failures must not be punished blindly). The legal set is
   `{demote, keep, request-evidence}`; `memory_reviewer` chooses; if it picks
   `demote`, `memory_manager`/`memory_director` confirms per risk. Emits
   `memory_demotion_decision`.
2. **Promotion candidates** — memories reinforced across **≥3 distinct scopes**
   (e.g. the same lesson surfaced under three different work items) are promotion
   candidates from `work → hat`, or `hat → department`. `knowledge_router`
   proposes the target scope; `memory_director` approves; `memory_curator` writes
   the higher-tier copy and **keeps the source** (a `derived_from` link). Emits
   `memory_promotion_decision`.
3. **Conflict resolution** — `Conflicted` memories surface to `memory_reviewer`
   with legal set `{keep-A, keep-B, keep-both-as-alternatives}`. Emits
   `memory_conflict_decision`.

**Asymmetry (the safety property):** *good news auto-applies, bad news asks a
hat.* Reinforcement, decay, and archive-at-zero are automatic; demotion,
promotion, and conflict resolution route through a hat decision — because they
are harder to reverse and benefit from judgment. That judgment is the agent
"manual heuristic," and it is still **clamped to the legal set** by the kernel.

### 7.2 Protected memories

`protected: true` memories (org identity, RFC-binding conventions, operator-
curated rules) are excluded from auto-overwrite, auto-demotion, and confidence
decay. They can only change via an explicit human/`memory_director` action — the
same protected-fact discipline as the source idea, enforced at the write layer.

---

## 8. Storage — CockroachDB, mirroring `OrgSystemV15`

Two new tables, same conventions as `agentic_org_org_events` / `…hat_bindings`
(JSONB for nested state, parameterized SQL with explicit `::JSONB` casts, an
on-disk migration mirror with a TS↔disk parity test):

```sql
-- content (the hub)
CREATE TABLE IF NOT EXISTS agentic_org_memory_records (
  memory_id     UUID PRIMARY KEY,
  organization_id STRING NOT NULL,
  tier          STRING NOT NULL,            -- org|department|hat|agent|work
  scope         STRING NOT NULL,
  key           STRING NOT NULL,
  value         STRING NOT NULL,
  context_hint  STRING,
  protected     BOOL NOT NULL DEFAULT false,
  written_by    STRING NOT NULL,
  written_at    TIMESTAMPTZ NOT NULL,
  embedding     JSONB,                       -- optional float[]; nomic-embed-text
  UNIQUE (organization_id, tier, scope, key) -- conflict detection
);
CREATE INDEX IF NOT EXISTS idx_mem_scope ON agentic_org_memory_records (organization_id, tier, scope);

-- state (the satellite) — atomically updatable weight signals
CREATE TABLE IF NOT EXISTS agentic_org_memory_state (
  memory_id        UUID PRIMARY KEY REFERENCES agentic_org_memory_records (memory_id),
  organization_id  STRING NOT NULL,
  phase            STRING NOT NULL,          -- MemoryPhase DU
  confidence       FLOAT8 NOT NULL,
  freshness_at     TIMESTAMPTZ NOT NULL,
  weight           FLOAT8 NOT NULL,
  reinforcement_count INT8 NOT NULL DEFAULT 0,
  outcome          JSONB NOT NULL,           -- success/failure/… counts
  utility          JSONB NOT NULL,           -- injected/cited counts
  cross_scope      JSONB NOT NULL,
  archived_at      TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_mem_state_demote ON agentic_org_memory_state (organization_id, phase);
CREATE INDEX IF NOT EXISTS idx_mem_state_weight ON agentic_org_memory_state (organization_id, weight DESC);
```

Plus an **injection ledger** (which memories were injected into which binding/
work item) so §6 can correlate outcomes and §4.2 can update utility. Every
maintenance action is *also* an `org_event`, so the existing org-snapshot fold
gains a memory view for free.

### 8.1 Embeddings — in-cluster Ollama, optional and degradable

We already run Ollama in-cluster. The semantic term uses a small embedding model
(`nomic-embed-text`); embeddings are stored as a JSONB float array and cosine-
scored in the retrieval query. **v1 can ship with the semantic term disabled**
(weight uses the deterministic signals only, `semantic = 0.5`) and add embeddings
later — exactly the graceful-degradation posture the source idea takes when its
vector store is unavailable. No external embedding API; cost is zero.

### 8.2 New `OrgEventKind`s

`MemoryLifecycleTransition`, `MemoryWeightRecomputed`, `MemoryPromotionDecision`,
`MemoryDemotionDecision`, `MemoryConflictDecision`, `MemoryInjection`,
`MemoryCitation` — added to the existing `OrgEvent` union so memory is traced on
the same substrate as everything else.

---

## 9. Determinism ⇄ autonomy split (the memory column)

| Concern | Deterministic (the legal set / the math) | Agent drives (within the legal set) |
|---------|------------------------------------------|-------------------------------------|
| Retrieval | scope union, decay, archive floor, **weight rank**, budget packing | which surfaced memories to use / cite |
| Reinforcement / decay / archive-at-zero | the whole computation; auto-applied | — (no decision needed) |
| Demotion | candidate detection + legal `{demote,keep,request-evidence}` | `memory_reviewer` picks; clamped |
| Promotion | candidate detection + legal target scopes | `knowledge_router`/`memory_director` pick; clamped |
| Conflict | detection + legal `{keep-A,keep-B,both}` | `memory_reviewer` picks; clamped |
| Weight/decay tuning | bounds on the policy knobs | `memory_manager` adapts within bounds |

The agent can never make a memory surface that the rules archived, never
fabricate a citation, never widen a promotion beyond a legal target scope. It
only chooses inside the lines — and every choice is one `org_event`.

---

## 10. Phased build plan (mirrors P0–P7; each phase proved in kind)

| Phase | Deliverable |
|-------|-------------|
| **M0** | This doc + the `OrgEventKind` additions + the two Cockroach tables (migration `MemorySystemV16` + on-disk mirror + parity test). |
| **M1** | `MemoryRecord`/`MemoryState`/`MemoryPhase` domain types (House-DU) + `memory_and_knowledge` hats wired with `B.Memory` scopes (already seeded — assert coverage). |
| **M2** | Write path + conflict resolution + protected-memory enforcement; Cockroach stores with parity tests. |
| **M3** | `computeMemoryWeight` + decay + retrieval (scope union, rank, budget pack) — pure, unit-tested; the hat ⊕ agent ⊕ work combination. |
| **M4** | Injection ledger + prompt-flow `## Relevant memory` block + anti-citation-laundering check + utility update. |
| **M5** | Outcome correlation from `pipeline_stage_transition` (merged=success) → confidence recompute. |
| **M6** | `runMemoryMaintenanceCycle` as an org cycle: Stage A automated, Stage B hat-decided; every action an `org_event`. |
| **M7** | **Deploy + observe in kind**: seed memories at hat/agent/work scope, run a work item to `merged`, run the daily cycle, and observe — via the org snapshot — memories reinforced (good KPI), demoted (bad KPI by a `memory_reviewer` decision), promoted (work→hat), and one archived at zero that no longer surfaces. The same end-to-end proof bar we held for the org system. |

---

## 11. Worked example (what the trace will show)

```
seed:  hat(code_reviewer) "review:require-rollback-plan"  conf 0.7
       agent(agent-7)     "calibration:pad-qa-20pct"      conf 0.7
       work(work-42)      "rfc-882:redis-sessions-only"   conf 0.9 protected

run work-42 → merged (success)
   → memory_injection events: both review + rfc-882 injected for the reviewer binding
   → memory_citation: reviewer cited "review:require-rollback-plan"
   → correlateOutcome(work-42, success): success++ on injected memories

daily memory cycle:
   [memory_weight_recomputed]  review:require-rollback-plan  0.71 → 0.78  (KPI up, cited)
   [memory_weight_recomputed]  calibration:pad-qa-20pct      decayed, never cited → 0.41
   [memory_promotion_decision] knowledge_router proposes work→hat for rfc-882-pattern;
                               memory_director approves; memory_curator writes hat copy
   [memory_lifecycle_transition] an old work(work-09) note  0.12 → Archived (never surfaces again)
```

Every line above is an `org_event` with `actorHatId`, `supervisorChain`,
`decision`, and `correlation/causation/trace` — readable in the same snapshot
view as the rest of the org.

---

## 12. What this is NOT

- **Not** a new datastore — it reuses our CockroachDB and in-cluster Ollama.
- **Not** the TPM architecture — only its memory + maintenance *idea* is taken.
- **Not** a vector database — embeddings are an optional, degradable weight term.
- **Not** auto-deletion of knowledge — archive is reversible (the row remains;
  only retrieval excludes it); hard deletion is a separate, human-gated action.
- **Not** an agent free-for-all — the kernel clamps every memory action to a
  legal set; the agent's "manual heuristic" is a *choice within the rules*,
  traced as an `org_event`.

---

## Appendix — concept mapping (source idea → our system)

| Source idea concept | Our adaptation |
|---------------------|----------------|
| `MemoryFact` (RaaS + Mongo split) | `MemoryRecord` (Cockroach content) + `MemoryState` (Cockroach state) |
| `turn / thread / engagement / persona` tiers | `org / department / hat / agent / work` tiers (mirror our hierarchy) |
| persona-tier (cross-session role) | **hat-tier** (cross-wearer role memory) |
| (no per-actor tier) | **agent-tier** (per-actor) + the **hat ⊕ agent** combination |
| engagement-tier | **work-tier** (per workflow run) |
| composite relevance score | `computeMemoryWeight` (KPI-weighted) |
| freshness half-life + archive floor | same; archive floor = "drops to zero, never surfaces" |
| outcome correlation (manifest verdict) | correlation from `pipeline_stage_transition` (merged=success) |
| utility self-tuning (injected vs cited) | same; via the injection ledger + citations |
| `observer-analyst` daily templates | `runMemoryMaintenanceCycle` (an org cycle) |
| `observer-promoter` + admin approval | hat decisions (`memory_reviewer`/`director`) via `chooseWithinLegal` |
| protected facts | protected memories |
| GitLab-MR promotion path | `org_event`-traced promotion decision |
