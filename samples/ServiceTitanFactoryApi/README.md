# ServiceTitan factory-demo — JSON API (v0)

**What this is:** A minimal F# ASP.NET Core Web API that serves
the demo's seed data as JSON. Stack-independent — any frontend
(Blazor / React / Vue / curl) consumes the same endpoints.

**What this is NOT:** A pitch for Zeta as a data store. Backend
is in-memory (v0) and will be swapped to Postgres (v1) without
changing the public API contract. The **software factory is the
demo**, not the database layer.

## Why this sample exists

The factory-adoption demo needs a JSON API that any frontend choice
can consume. The frontend-framework decision (Blazor vs React vs
other) belongs to the human maintainer and is still TBD; this API
ships now so the backend is not on the critical path when the
frontend choice is made.

## How to run

```bash
dotnet run --project samples/ServiceTitanFactoryApi/ServiceTitanFactoryApi.fsproj
# API is up on http://localhost:5000 (or whatever ASP.NET picks).
# curl it:
curl http://localhost:5000/api/customers
curl http://localhost:5000/api/pipeline/funnel
curl http://localhost:5000/api/pipeline/duplicates
```

## Endpoints (v0)

| Method | Path | Returns |
|---|---|---|
| GET | `/` | API metadata + endpoint list |
| GET | `/api/customers` | All customers |
| GET | `/api/customers/{id}` | Single customer, 404 if missing |
| GET | `/api/customers/{id}/activities` | Activities for one customer |
| GET | `/api/opportunities` | All opportunities |
| GET | `/api/opportunities/{id}` | Single opportunity, 404 if missing |
| GET | `/api/activities` | All activities |
| GET | `/api/pipeline/funnel` | Per-stage count + $ total |
| GET | `/api/pipeline/duplicates` | Customers sharing an email |

All responses are JSON.

## V0 seed data

`Seed.fs` is the canonical in-memory seed (a Postgres-backed sibling
`schema.sql` / `seed-data.sql` is a v1 follow-up; this file will
mirror it 1:1 when it lands):

- 20 customers (trades contractors — plumbing, HVAC, electric, roofing, etc.)
- 30 opportunities across 5 stages (Lead, Qualified, Proposal, Won, Lost)
- 33 activities (calls, emails, SMS, notes)
- 2 intentional email collisions to drive the duplicate-review scenario

Seed is deterministic — restarting the server replays the same data.

## What v1 adds

- Postgres backing (Npgsql) wired against a sibling sample's
  `schema.sql` (tracked in `docs/BACKLOG.md`)
- CRUD endpoints (POST / PUT / DELETE) — v0 is read-only
- docker-compose for one-command Postgres + API
- Environment-variable configuration for connection string

Each of those is a follow-up PR.

## Design notes

- **`Microsoft.NET.Sdk.Web` SDK.** Pulls in ASP.NET Core via
  framework reference — no package version edit in
  `Directory.Packages.props` needed. Only `FSharp.Core` is an
  explicit package reference.
- **Minimal APIs over MVC.** F# + minimal APIs is a clean
  combination: one file, no controllers, no heavy routing ceremony.
- **Anonymous records for derived views.** `/api/pipeline/funnel`
  returns `{{ Stage, Count, TotalCents }}` as an anonymous record
  — F#'s `{| ... |}` syntax. Keeps the output shape local to the
  endpoint handler.
- **`System.Text.Json` defaults.** No converter customisation in v0.
  If a frontend needs camelCase / different date shapes, add it as
  a targeted follow-up rather than reshape everything.
- **No OpenAPI / Swagger yet.** v0 intentionally minimal; Swagger
  UI lands when endpoint count grows or frontend needs it.

## What this does NOT do

- Does not persist writes — v0 is read-only
- Does not authenticate or authorise — no auth for the demo v0
- Does not wire to Postgres — in-memory for v0
- Does not expose algebraic-delta / retraction-native internals
  to the frontend (that's the internal sample's job; external
  audience gets standard CRUD shape)
