# Current Round — 29 (open)

Round 28 closed; narrative absorbed into
`docs/ROUND-HISTORY.md`. Round 29 opens with **CI setup as
the anchor** — see `docs/BACKLOG.md` §"P0 — CI /
build-machine setup" for the full discipline rules and
sub-tasks.

## Status

- **Round number:** 29
- **Opened:** 2026-04-18 (continuous from round-28 close)
- **Classification:** infrastructure round — CI pipeline
  design is the anchor; product work (bilinear / sink-
  terminal laws, Option-A stateful promotion) runs in
  parallel where it doesn't block on Aaron's CI-design
  review gates.
- **Reviewer budget:** Kira + Rune floor per GOVERNANCE.md
  §20 on every code landing. Aaron personally reviews
  every CI-decision artefact.

## Round 28 close — what landed

Anchor goal achieved: FsCheck law runner live as a test-
time library.

- `LawRunner.checkLinear` — generic additivity check; works
  over `ZSet` and plain numerics via user-supplied `add`/
  `equal` callbacks.
- `LawRunner.checkRetractionCompleteness` — Option B
  (trace-based), state-restoration via continuation after
  reviewer P0 rewrite. Catches retraction-lossy stateful
  ops (tested against a floored-counter fixture).
- Per-sample `System.Random(seed + i)` for true bit-exact
  reproducibility of `(seed, sampleIndex)`.
- Deterministic-simulation framing locked in
  `docs/research/stateful-harness-design.md`; Option A
  (enrich `IStatefulStrictOperator` with `Init`/`Step`/
  `Retract` triple matching the DBSP paper's `(σ, λ, ρ)`
  shape) is the planned additive promotion in round-30+.
- Scaffolding cleanup: `tools/lean4/` `lake new` leftovers
  removed; `Lean4.lean` rewired to import the real
  `DbspChainRule` proof file.

## Round 29 anchor — CI pipeline setup

**Discipline rules (committed up front; `docs/BACKLOG.md`
has the full text):**

1. Read `../scratch` (build-machine setup) and
   `../SQLSharp` (GitHub workflows) for shape + intent.
   **Never copy files.** Hand-craft every artefact.
2. Aaron reviews every CI design decision before it lands.
   This is not a "ship and iterate" surface.
3. Cost discipline: every CI minute earns its slot; default
   to narrow matrix and widen with a stated reason.
4. Cross-platform eventual: macOS + Linux first; Windows
   when there's a Windows-breaking test to justify it.
   Aaron can run rounds on Windows on request.
5. Product work and CI work run in parallel on the same
   machine; dispatch research subagents for CI design
   concurrently with product work as long as neither
   writes the same file.

**Sub-task sequence (each its own Aaron review gate):**

1. Audit `../scratch` → `docs/research/build-machine-setup.md`.
2. Audit `../SQLSharp/.github/workflows/` →
   `docs/research/ci-workflow-design.md`.
3. Gate inventory → `docs/research/ci-gate-inventory.md`.
4. First workflow: `build-and-test.yml` covering
   `dotnet build -c Release` + `dotnet test Zeta.sln -c
   Release` on `ubuntu-latest` + `macos-latest`. Nothing
   else until Aaron signs off on the gate list.
5. Subsequent workflows land one at a time, each with an
   explicit design doc and sign-off.

## Carried from round 28

**Law runner follow-ups (DEBT-tracked):**
- `check*` take 8-11 positional args → promote to config
  record before `checkBilinear` lands.
- `LawViolation.Message` → structured DU.
- Test covering ops that omit the marker tag.

**Law coverage (product work; can run in parallel with CI):**
- `checkBilinear` — join-shaped ops; standard DBSP
  incrementalisation form.
- `checkSinkTerminal` — Sink-tagged ops must not compose
  into a relational path.
- Option-A promotion of `IStatefulStrictOperator` to
  explicit `(σ, λ, ρ)` triple — round-30+ unless CI work
  stalls on a review gate, in which case advance here.

**Open from round 27 (deferred to round-30+ pool):**
- `IsDbspLinear` Lean predicate + B1/B2/B3/chain_rule
  closures (Tariq option-c).
- Reviewer P1 list: `OutputBuffer` tick-stamp,
  `ReadDependencies` defensive copy, BayesianRate
  `Checked.(+)`, `IOperator` → `IZetaOperator` rename
  window, `PluginApi.fs` split when >300 lines.

## Open asks to the maintainer

- **Aaron decisions blocking round-29 progress:**
  - Sign-off on the build-machine-setup design doc (first
    sub-task).
  - Sign-off on the CI-workflow design doc (second sub-
    task).
  - Sign-off on the gate inventory (third sub-task).
  - Sign-off on the first workflow's OS matrix and dotnet
    pin (fourth sub-task).
- **NuGet prefix reservation** on `nuget.org` for `Zeta.*`
  — still maintainer-owned.
- **`global.json` `rollForward`** — status quo vs relaxed.
- **Eval-harness MVP scope** — pending since round 23.
- **Repo visibility** — private on AceHack; flip to public
  when ready.

## Notes for the next Kenji waking

- `memory/` is canonical shared memory; `memory/persona/
  <name>/` is per-persona (name-keyed).
- Reviewer pass per GOVERNANCE.md §20 is mandatory every
  code-landing round. Kira + Rune is the floor.
- Public API changes go through Ilyana per GOVERNANCE.md
  §19.
- `~/.claude/projects/` is Claude Code sandbox, not git.
  Do not cite as canonical (GOVERNANCE.md §22).
- **CI decisions need Aaron sign-off before landing** —
  round-29 discipline rule.
- `../scratch` and `../SQLSharp` are **read-only references**
  — never copy files.
