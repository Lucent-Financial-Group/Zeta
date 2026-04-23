# Factory-demo — database scaffold

**What this is:** The boring database part of the factory-demo.
Standard Postgres schema + deterministic seed data. Frontend
and backend choices deliberately deferred until the stack
decision lands.

**What this is NOT:** A pitch for Zeta as the data store. The
demo sells the **software factory**, not the database layer.
Backend is Postgres because Postgres is boring and battle-tested
and does not threaten any adopting company's existing data-tier
commitments. See
`memory/feedback_servicetitan_demo_sells_software_factory_not_zeta_database_2026_04_23.md`
for the load-bearing directive.

## Why this scaffold lives separately from the CRM kernel sample

Two sibling samples, two different audiences:

- `samples/CrmKernel/` (internal-facing) — algebraic substrate
  demo. ~180-line console F# showing retraction-native Z-set
  semantics on CRM-shaped data. For factory agents and Zeta
  library users.
- `samples/FactoryDemo.Db/` (factory-demo-facing) —
  factory-adoption demo. Standard SQL, standard stack, pitches
  the factory. For engineering leadership evaluating
  factory adoption.

The two samples do not mix. The internal one uses Z-set
algebra; the factory-demo one uses Postgres CRUD.

## Current scope (v0, DB-only)

This directory currently ships only the DB side of the demo:

- `schema.sql` — Postgres DDL for customers, opportunities,
  activities (email/call/SMS events).
- `seed-data.sql` — deterministic seed: 20 customers, 30
  opportunities across 4 stages, 2-3 intentional email
  duplicates, some recent activity history.
- `README.md` — this file.

Frontend + backend land in later PRs once the stack is chosen
(see `docs/plans/factory-demo-scope.md`).

## How to use

Assuming a local Postgres (docker-compose version TBD):

```bash
# 1. Start a throwaway Postgres instance
docker run --rm -d --name crm-demo -e POSTGRES_PASSWORD=demo \
    -p 5432:5432 postgres:16

# 2. Create schema + seed data
psql -h localhost -U postgres -d postgres -f schema.sql
psql -h localhost -U postgres -d postgres -f seed-data.sql

# 3. Verify
psql -h localhost -U postgres -d postgres \
    -c "SELECT stage, COUNT(*), SUM(amount_cents) / 100 AS total_usd
        FROM opportunities
        GROUP BY stage
        ORDER BY stage;"
```

Expected output (rounded): Lead ~10 / $X, Qualified ~7 / $Y,
Proposal ~7 / $Z, Won ~6 / $W.

## Schema shape (at a glance)

- **`customers`** — `id` (bigserial PK), `name`, `email`,
  `phone`, `address`, `created_at`, `updated_at`. Email
  unique? No — intentional duplicates are part of the demo.
- **`opportunities`** — `id` (bigserial PK), `customer_id`
  (FK to `customers`), `stage` (enum-ish check constraint:
  Lead / Qualified / Proposal / Won / Lost), `amount_cents`
  (bigint, avoid float money), `created_at`, `updated_at`.
- **`activities`** — `id` (bigserial PK), `customer_id` (FK),
  `opportunity_id` (nullable FK), `kind` (Call / Email / SMS /
  Note), `notes` (text), `occurred_at` (timestamptz). A
  timeline of interactions per customer.

No views, no stored procedures, no triggers in v0. The demo
frontend will either query directly or use a thin API layer
(TBD).

## Design notes

- **Money as `bigint` cents, not `numeric` dollars.** Avoids
  float-money bugs + makes SUM() trivially correct.
- **`timestamptz` everywhere.** Portable across timezones;
  most real CRM deployments span multiple regions.
- **`updated_at` via trigger.** Postgres idiom for
  last-modified tracking without app-layer bookkeeping. One
  trigger per table.
- **No soft-deletes in v0.** CRUD-delete for simplicity. The
  demo's "retraction" semantics belong to the internal
  algebraic sample (`samples/CrmKernel/`), not here.
- **Seed data deterministic.** Re-running `seed-data.sql`
  replays the same rows. Useful for regression-style
  demo repeatability.

## Open questions

1. **Postgres version.** Pinning 16 in the example above;
   should we support older (14+)?
2. **Schema naming convention.** `snake_case` per Postgres
   norm. Any adopting-company conventions to match?
3. **Seed data size.** 20 customers / 30 opps is small. 200 /
   300 shows pipeline curves better. How big for the demo?
4. **Multi-tenant shape.** No `tenant_id` column in v0. Most
   real CRMs are multi-tenant — do we need this in the demo
   or keep it single-tenant for simplicity?
