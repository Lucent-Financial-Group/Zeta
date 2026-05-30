---
title: Git <-> Cockroach Sync and ZetaId Addressing
canonical_name: Agentic Organization
status: design
ideas: [1, 7, 8]
extends:
  - CLUSTER_EXECUTION_AND_MEMORY_SUBSTRATE.md
  - V0_SCHEMA_AND_COMMANDS.md
composes_with:
  - ./TECHNICAL_CA_PACKAGE_ARCHITECTURE.md
  - ./OBSERVE_COMPOSER_AND_RUN_STATE.md
  - ./DOC_FRONTMATTER_CONVENTION.md
code_anchors:
  - ../../src/Core.TypeScript/zeta-id/zeta-id.ts
  - ../packages/application/src/observe.ts
  - ../packages/state-cockroach/migrations/0001_agentic_org_core_state.sql
supersedes: []
---

# Git <-> Cockroach Sync and ZetaId Addressing

The persistence and addressing layer beneath the observe/compose keystone.
Operator ideas **7** (unique ids, no collision in git), **8** (ZetaId as the
decimal identifier for indexing in git-as-db), and **1** (a generic bidirectional
converter/sync between GitHub-as-database and CockroachDB).

## Do not reinvent the id (ideas 7, 8)

ZetaId **already exists** as a tri-language primitive:

- `src/Core.TypeScript/zeta-id/zeta-id.ts` — `pack(observation, env) → ZetaId`,
  `unpack`
- `src/Core.FSharp.ZetaId/`, `src/Core.CSharp.ZetaId/` — cross-verified ports

A ZetaId is a **128-bit packed observation** with fields
`version | timestamp | chromosome | category | firefly | authority | persona |
momentum | location | randomness(32-bit)`. The 32-bit crypto-random field is the
collision-resistance mechanism (idea 7): two observations with identical semantic
fields still get distinct ids — *unless* `DETERMINISTIC_ENV` is used, which is
explicitly for the cross-verification harness only and documented as
collision-risky. Production code passes `DEFAULT_ENV`.

**Decimal rendering (idea 8):** a ZetaId is a `bigint`; its canonical index key
for git-as-db is its base-10 string (`id.toString()`). This is the
`ZetaIdDecimal` branded type already used by the observe keystone
(`packages/application/src/observe.ts`). Git paths, Cockroach primary keys, and
NATS subjects all key off the same decimal string, so an id minted once is the
same handle everywhere.

```text
ZetaObservation --pack(DEFAULT_ENV)--> ZetaId (128-bit bigint)
                                          |
                                          +-- .toString() --> ZetaIdDecimal
                                                                 |
   git path: <type>/<ZetaIdDecimal>.json    <----- same key ----+----->  cockroach PK: id TEXT
   nats subject: agentic-org.<env>.<org>.<domain>.<ZetaIdDecimal>
```

Collision policy is therefore "minted once with crypto randomness, addressed by
decimal everywhere" — there is no second id scheme to reconcile.

## Git as a database (idea 8 context)

Git-as-db treats a Git tree as an append-only, content-addressed store:

- one file per aggregate, path `= <aggregateType>/<ZetaIdDecimal>.json`
- the file holds the aggregate's current projection plus its event log (or a
  pointer to it)
- commits are the durable, signed, replayable history (composes with the repo's
  git-as-event-store discipline and the trace envelope)

CockroachDB remains the **authoritative runtime state** (low-latency,
transactional, the source of truth for live work per
`V0_SCHEMA_AND_COMMANDS.md`). Git is the **durable, auditable, portable mirror**.
The two must stay convergent — that is what the converter is for.

## The generic bidirectional converter (idea 1)

A single generic converter keyed by aggregate type, not a per-table hand-written
sync. Both directions share one mapping declaration so they cannot drift.

```ts
// proposed: packages/state-sync/src/aggregate-mapping.ts
type AggregateMapping<TRow, TFile> = {
  aggregateType: string;                       // e.g. "work_item"
  idOf: (x: TRow | TFile) => ZetaIdDecimal;    // the shared key
  rowToFile: (row: TRow) => TFile;             // cockroach -> git
  fileToRow: (file: TFile) => TRow;            // git -> cockroach
  schemaVersion: number;                       // explicit; migrations are data
};
```

Sync is then generic over the mapping set:

```ts
const SyncDirection = {
  CockroachToGit: "cockroach_to_git",
  GitToCockroach: "git_to_cockroach",
} as const;

const SyncOutcome = {
  Converged: "converged",
  Applied: "applied",          // wrote N changes to the target
  Conflict: "conflict",        // both sides changed since last common point
} as const;

// Result<T, TFeedback> as an explicit DU, same pattern as observe.ts
type SyncResult =
  | { outcome: "applied"; direction: SyncDirection; changed: readonly ZetaIdDecimal[] }
  | { outcome: "converged" }
  | { outcome: "conflict"; feedback: SyncConflictFeedback };
```

### Conflict handling is explicit, not last-write-wins

When both git and Cockroach changed an aggregate since their last common version,
the converter returns a `conflict` feedback variant rather than silently
clobbering. Resolution composes with the keystone: a conflict becomes a run whose
`observe()` readout offers the legal reconciliation options (prefer-cockroach,
prefer-git, merge-by-field), and the memoryless composer (or a human hat) selects
— it does not get decided implicitly. The ZetaId is the join key on both sides,
so matching aggregates across the two stores is exact.

### Outbox-driven, not polling-first

Cockroach→git rides the existing transactional outbox (`messaging-nats`): a
committed command emits an event; a sync worker projects the changed aggregate to
its git file and commits. Git→cockroach is triggered by a webhook/commit watcher.
A periodic full reconcile is the recovery net (composes with
`ALWAYS_ON_ORCHESTRATION_RUNTIME.md`), not the primary path.

## Package boundary (proposed)

A new `packages/state-sync` (depends on `domain` + `state` ports only, per the
package dependency direction in `TECHNICAL_CA_PACKAGE_ARCHITECTURE.md`):

- `aggregate-mapping.ts` — the `AggregateMapping<TRow, TFile>` contract + the
  registry of mappings
- `git-store-port.ts` — read/write/commit an aggregate file by `ZetaIdDecimal`
- `sync-converter.ts` — the generic bidirectional engine returning `SyncResult`
- adapters: a real Git adapter (idea 8) and the existing Cockroach store

It reuses `ZetaIdDecimal` from `packages/application` (or a shared id package),
the trace envelope from `domain`, and the outbox from `messaging-nats`. No new id
scheme, no parallel event model.

## Status

Design. The ZetaId primitive (ideas 7, 8) is implemented and cross-verified
upstream; this doc specifies how the Agentic Organization **adopts** it as the
git-as-db index and the converter join key. The `state-sync` package (idea 1) is
the proposed next slice after the constitution gate; sequencing in
`PHASED_DEVELOPMENT_PLAN.md`.
