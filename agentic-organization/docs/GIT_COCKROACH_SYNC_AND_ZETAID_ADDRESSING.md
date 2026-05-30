---
title: Git as Database and Event Store (Frontmatter + ZetaId CRDT)
canonical_name: Agentic Organization
status: v0
ideas: [1, 2, 3, 7, 8]
extends:
  - CLUSTER_EXECUTION_AND_MEMORY_SUBSTRATE.md
  - V0_SCHEMA_AND_COMMANDS.md
composes_with:
  - ./TECHNICAL_CA_PACKAGE_ARCHITECTURE.md
  - ./OBSERVE_COMPOSER_AND_RUN_STATE.md
  - ./DOC_FRONTMATTER_CONVENTION.md
code_anchors:
  - ../packages/frontmatter-db/src/schema.ts
  - ../packages/frontmatter-db/src/event.ts
  - ../packages/frontmatter-db/src/crdt-log.ts
  - ../packages/frontmatter-db/src/project.ts
  - ../packages/frontmatter-db/src/sql-to-schema.ts
  - ../packages/frontmatter-db/src/traverse.ts
  - ../packages/frontmatter-db/src/validate.ts
  - ../../src/Core.TypeScript/zeta-id/zeta-id.ts
supersedes: []
---

# Git as Database and Event Store (Frontmatter + ZetaId CRDT)

The persistence and addressing layer. Operator vision (2026-05-29): **git is the
database and the event store**. A markdown file is a row; its YAML frontmatter is
the typed schema/columns; foreign-key columns are graph edges; events are
unique-id files that merge conflict-free as a CRDT; and the schema converts
to/from SQL. CockroachDB demotes to a rebuildable query index. Covers operator
ideas 1 (git<->cockroach converter), 2 (explicit DUs), 3 (frontmatter graph), 7
(no-collision ids), 8 (ZetaId decimal index).

> **Why this is git's native shape.** Linus Torvalds built git as a
> content-addressable object database (a "stupid content tracker"): `git
> hash-object` writes a blob keyed by its SHA, `git cat-file` reads it back;
> trees and commits are just objects on top. Git-as-db is not a hack — it is
> git used for what it fundamentally is. The one thing we add is a *stable,
> semantic, time-ordered* key (ZetaId) because a content SHA changes whenever
> content changes and therefore cannot be a primary key or a foreign-key target.

## The stack

```text
git object DB (durability + conflict-free merge)
  └─ events/<table>/<ZetaIdDecimal>.md      append-only event files  ── G-Set CRDT
        │  (frontmatter = op + aggregateId + field values + schema_version)
        ▼  fold in (timestamp, id) order  ── retraction-native (Z-set)
     <table>/<ZetaIdDecimal>.md             materialized rows (current state)
        │  (frontmatter = typed columns; fk columns = graph edges; body = doc)
        ▼  derive
     CockroachDB                            rebuildable query / index projection
```

One **frontmatter schema** (derived from SQL) governs all four layers.

## Layer 1 — the schema is frontmatter, derived from SQL (ideas 2, 3)

`packages/frontmatter-db/src/schema.ts` defines the column model as an explicit
discriminated union (`ColumnType`: zeta_id, text, int, bool, timestamp, enum, fk,
fk_array). Payload-bearing kinds carry their payload as an explicit variant —
`enum` carries `values`, `fk`/`fk_array` carry `references` — never buried in
optional fields (repo rule: IMPLICIT-NOT-EXPLICIT is class error).

`sql-to-schema.ts` converts a `CREATE TABLE` into that schema:

| SQL | frontmatter column |
|-----|--------------------|
| `id TEXT PRIMARY KEY` | `{ type: zeta_id, pk: true, required: true }` |
| `status TEXT NOT NULL CHECK (status IN ('a','b'))` | `{ type: enum, required: true, values: [a, b] }` |
| `project_id TEXT REFERENCES project(id)` | `{ type: fk, references: project }` |
| `reviewer_ids TEXT[] REFERENCES hat_assignment(id)` | `{ type: fk_array, references: hat_assignment }` |
| `estimate INTEGER` / `created_at TIMESTAMPTZ NOT NULL` | `{ type: int }` / `{ type: timestamp, required: true }` |

The reverse (schema → `CREATE TABLE`) feeds the Cockroach projection, so the
schema is the single source both sides derive from — the existing
`state-cockroach/migrations` become derivable rather than hand-authored.

## Layer 2 — events are a ZetaId-keyed G-Set CRDT (ideas 7, 1)

`event.ts` + `crdt-log.ts`. Each event is one file named by its ZetaId decimal.
Because ZetaIds are globally unique (32-bit crypto-random field), two agents
writing concurrently produce **different filenames** — a git merge is a pure
union, never a content conflict. The log is therefore a **grow-only set keyed by
unique id**; `mergeLogs` is union, which is:

- **commutative** — `merge(a,b)` and `merge(b,a)` have the same ids
- **associative** — grouping does not matter
- **idempotent** — re-merging the same log changes nothing

(All three proven in `test/crdt-log.test.ts`.) These are the CRDT join laws, so
branches converge in any merge order. Collision policy is "minted once with
crypto randomness, addressed by decimal everywhere" — one id scheme, no
reconciliation.

## Layer 3 — state is a timestamp-ordered fold (ideas 8, 2)

`project.ts`. ZetaId embeds a 48-bit timestamp, so the event log is
self-ordering — `timestampMsFromZetaId` reads it straight out of the id. `project`
folds a table's events in `(timestamp, id)` order:

- `upsert` merges field values (last-writer-wins by timestamp)
- `retract` tombstones the aggregate (retraction-native, Z-set style; a later
  upsert revives it)

Because the order is derived from the ids (not from insertion or merge order),
`project(merge(a,b)) === project(merge(b,a))` — the convergence property, proven
in `test/project.test.ts`. The resulting `FrontmatterRow`s are the materialized
rows of Layer 1; they are fully rebuildable from the event log (DST-replayable).

## Layer 4 — frontmatter is graph-traversed (idea 3)

`traverse.ts`. `fk` and `fk_array` columns are edges; `edgesOf(row, schema)`
yields them and `neighbors(row, schema, column, store)` resolves them against a
row store keyed by `ZetaIdDecimal`. This is the same edge mechanism the doc graph
uses (`composes_with` in `DOC_FRONTMATTER_CONVENTION.md`) — docs and data rows
share one traversal model.

## Layer 5 — Cockroach is the index, and the converter is generic (idea 1)

CockroachDB is the low-latency query projection (`WHERE status='ready' ORDER BY
created_at` over thousands of `.md` files is not viable; the index is). The
generic converter is keyed by the schema, not hand-written per table:

- **git → cockroach**: project the event log to rows, upsert into the index
- **cockroach → git**: a committed command emits an event file (rides the
  existing `messaging-nats` outbox)
- a periodic full reconcile (`ALWAYS_ON_ORCHESTRATION_RUNTIME.md`) is the
  recovery net

Conflicts cannot arise at the event layer (unique ids). At the *row* layer, two
upserts to the same aggregate are resolved deterministically by the timestamp
fold — there is no last-write-wins ambiguity to hand-resolve, because the id
*is* the clock.

## Status

Implemented and tested: `packages/frontmatter-db` (schema DUs, SQL→schema,
event/CRDT log, timestamp-ordered projection, validation, traversal) — 26 tests
green; full suite 297 green. Design/next: the on-disk frontmatter YAML codec
(read/write `.md` files), the schema→`CREATE TABLE` emitter, and the
outbox-driven sync worker. The ZetaId codec (ideas 7, 8) is the existing
cross-verified `src/Core.TypeScript/zeta-id`; `frontmatter-db` mirrors only its
timestamp-bit layout to stay self-contained.
