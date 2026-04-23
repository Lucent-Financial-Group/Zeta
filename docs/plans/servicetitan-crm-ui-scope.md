# ServiceTitan CRM demo with UI — scope & end-result

**Owner:** Aaron (scope), Claude (implementation drafts).
**Status:** Living document — Aaron edits over time, Claude keeps the plan in sync.
**Placed here because:** Aaron's 2026-04-23 request:

> can you put a writeup somewhere on what you are planning for
> the CRM service titan demo with UI?  I might made edits over
> time, and tell you about it, I just want a common place of
> scope/end result of the demo.

**Why this demo matters:** Aaron works on ServiceTitan's CRM
team. A working 0-to-production-ready demo is the nearest-term
external deliverable that creates real professional value
(see `memory/project_aaron_servicetitan_crm_team_role_demo_scope_narrowing_2026_04_22.md`).
Aurora is Aaron's end goal for AI/human alignment. Aaron's
salary — earned by being useful to ServiceTitan and advancing
their goals — funds the rest of the factory. ServiceTitan might
be interested in funding Zeta / Aurora further after seeing the
demo. So the demo is not "something that keeps the lights on" —
it is a **mutual-benefit artifact**: it shows ServiceTitan what
retraction-native algebra does for CRM-shaped workloads, and
that same artifact is a candidate inflection for deeper
partnership. Demo quality matters at both layers.

**Composes with:**
- `memory/project_aaron_external_priority_stack_and_live_lock_smell_2026_04_23.md`
  (ServiceTitan+UI is priority #1 on the external stack)
- `samples/ServiceTitanCrm/` — the algebraic kernel sample, already landed
- `tests/Tests.FSharp/Operators/CrmScenarios.Tests.fs` — 5 xUnit tests validating the view semantics

---

## Current state (as of 2026-04-23)

- **Algebraic kernel sample landed** — `samples/ServiceTitanCrm/Program.fs` (180 lines, single file). Four incrementally-maintained views on one Circuit: customer roster, pipeline funnel count, pipeline funnel value, duplicate-email detection. Scenario walks through address change, Lead→Qualified→Proposal→Won stage walk, and duplicate resolution. Console output only. **PR #141 open.**
- **Scenario tests landed** — `tests/Tests.FSharp/Operators/CrmScenarios.Tests.fs`, 5 xUnit tests, all passing. Validates retraction-atomicity and self-join duplicate-detection semantics. **PR #143 open (bundled with live-lock audit + DB gap review).**
- **No UI yet.** Everything prints to stdout. The next step is real UI.

---

## End-result vision (Aaron-editable)

A browser-accessible CRM demo that shows a trades-contractor
sales pipeline in miniature, where **every interaction is an
algebraic delta** on a live Zeta circuit — not a CRUD API wrapped
around a SQL table.

What a visitor should see:

1. **Customer list / detail** — typical CRM layout (list on
   the left, detail on the right). Editing an address saves an
   algebraic retraction+insert, *not* an UPDATE. The UI doesn't
   hide this — a small sidebar shows the deltas emitted per edit.
2. **Pipeline kanban** — four columns (Lead / Qualified /
   Proposal / Won), drag a card from one column to another.
   The drag emits a retraction+insert delta; the funnel count
   in the header re-animates on the same frame.
3. **Duplicate-review pane** — lists candidate-duplicate
   pairs from the self-join view. Each pair has an "email is
   correct for customer X" / "merge" action; both actions emit
   deltas that clear the pair from the view automatically.
4. **Delta inspector** — a small always-visible panel that
   shows the last N deltas as `(key, +1)` / `(key, -1)` with
   timestamps. This is the differentiating demo surface —
   visitors who have never seen DBSP see the algebra live.

What a visitor does NOT need to see: the `Circuit`, `ZSet`, or
`Stream` types directly. The algebra is *demonstrated by
behaviour*, not by exposing F# internals.

---

## Scope boundaries (what's IN, what's OUT)

### IN scope for "demo-complete"

- **Seed data** — ~20 customers, ~30 opportunities across 4
  stages, 2-3 intentional email duplicates. Deterministic,
  reproducible.
- **Four live views** from the existing sample: roster, funnel
  count, funnel value, duplicates. Add one more: **per-customer
  opportunity history** (requires `IntegrateZSet` + group-by
  customer id; a fifth operator-family demo).
- **Editing UI** — add / edit customer, create opportunity,
  move opportunity stage, delete (retract) either. Every edit
  is a visible delta.
- **Delta inspector** — the "oh that's what retraction-native
  means" surface.
- **Persistence** — at minimum, in-memory state that survives
  page reloads within the same session. See "cutting-edge
  persistence" P2 BACKLOG row for the upgrade path.
- **One-command launch** — `dotnet run --project <this>` and
  the browser opens to a working demo. No setup.

### OUT of scope for v1

- Real ServiceTitan schema integration (field names, API,
  auth). Demo uses plausible-but-simplified shapes.
- Multi-user / concurrent editing. Single-user session for v1.
- Mobile UI. Desktop browser only.
- Production-grade auth, security, rate-limiting.
- Real network-wide persistence (S3, database backing).

### TBD — Aaron's call

- **Frontend stack.** Candidates: Blazor (F#/.NET-native via
  Fable or Bolero), Fable+React+Feliz (idiomatic F# on the
  client), TypeScript+React (foreign-stack but widest hiring
  reach), Avalonia desktop (cross-platform, .NET-native).
  **Claude recommends:** Bolero (server-side Blazor) for the
  server-side-rendered portion + Fable for the delta-inspector
  widget. This keeps the stack F# end-to-end and avoids the
  TypeScript tax. Aaron — your call; you know ServiceTitan's
  stack better than I do.
- **Transport.** REST endpoints vs SignalR vs raw
  WebSocket for the delta-inspector stream. SignalR is the
  Blazor-idiomatic choice; it just works.
- **Sample size.** 20 customers + 30 opps is a starting
  point; production demo might want 200+200 to show
  pipeline analytics curves.
- **Deployment target.** Localhost-only for now. If the demo
  needs to be shareable (ServiceTitan coworkers, interview
  loops), it needs a deployment target — Azure App Service,
  AWS Amplify, Fly.io. No cloud decision yet.

---

## Proposed build sequence

Each step is a concrete, separately-shippable PR. Intent:
no step should take more than a day of focused work.

1. **`samples/ServiceTitanCrmUi/` skeleton** — Blazor Server
   project, references `Zeta.Core`, compiles, serves a
   placeholder page with the four read-only views from the
   existing sample's seed data. No interactivity yet. Sanity
   check on the F# Blazor + Zeta.Core combination.
2. **Customer list + detail** — interactive, bound to a live
   `Circuit`. Edit address = retraction+insert. Roster view
   updates live.
3. **Pipeline kanban** — drag card, emit delta, funnel updates.
   Per-stage columns show value and count.
4. **Duplicate-review pane** — self-join view rendered as a
   list; merge/correct actions.
5. **Delta inspector** — small SignalR-streamed widget showing
   the last 50 deltas.
6. **Per-customer history view** — fifth view, wired.
7. **Polish + deployment story** — seed data tuning, README,
   one-command launch script, maybe a short Loom-style demo
   video Aaron can share.

Aaron's corrections on the order or any step go directly in
this doc.

---

## Open questions for Aaron (please edit)

1. **Frontend stack** — Bolero / Fable / TypeScript+React /
   Avalonia? Aaron's call.
2. **ServiceTitan schema fidelity** — can we peek at real
   ServiceTitan CRM field names from public docs, or should we
   keep invented shapes to avoid any whiff of internal-data
   leakage?
3. **Target audience for the demo** — ServiceTitan team
   sharing? External hiring signal? Both shape polish level.
4. **Desktop-also** — would an Avalonia desktop version be
   valuable alongside the browser demo, or is browser enough?
5. **Polish ceiling** — is this a 3-4-hour-shipped demo or a
   week-long polished artifact? Scope decisions follow from
   this.

---

## Aaron's edits / deltas

*(Intentionally left empty for Aaron to append notes, edits,
scope corrections, or additional requirements. Claude keeps
everything above in sync with the latest Aaron-annotated state.)*
