# Substrate-Discovery via Zeta-Native-AOT — Scoping 2026-05-03

Scope: scoping doc for the custom substrate-index the human
maintainer 2026-05-03 named (*"we should use zeta in native
assmly mode for our custom index i think"*) and the architect's
authority-scope decision that Zeta-native-AOT IS the best
long-term solution (rather than TS+sqlite-vec, live-off-the-
land, or hybrid).

Attribution: factory architect; the human maintainer 2026-05-03
provided the directional input + the edge-runner reframe
(*"changing the engine while driving sounds like edge runner
tertitory"*).

Operational status: research-grade

Non-fusion disclaimer: scoping-only. No code lands in this
PR. Deliverables: indexed types, query workloads, operator
mapping, NativeAOT deployment shape, migration plan, risk
register. Implementation lands in subsequent bounded PRs.

---

## Why Zeta-native-AOT (load-bearing decision)

Three reasons override the classical-PM defer-the-dogfooding
default:

1. **The workload IS Z-set algebra by definition.** A
   substrate index consumes a stream of `file-add` /
   `file-remove` / `file-modify` events. That's a Z-set
   delta-stream. Using TS+sqlite or a hand-rolled index
   leaves the strongest match on the table. Zeta's
   `IndexedZSet.fs` + `Incremental.fs` + `Operators.fs` are
   the primitives.

2. **NativeAOT validates a deployment story we already
   need.** Cron / CI / agent-loop ticks all want fast
   startup. Validating NativeAOT on substrate-discovery is
   the cheapest first try (no production-user impact); the
   validated deployment story then becomes available for
   every other tool that needs it.

3. **Pre-v1 dogfooding is HIGHER leverage than deferring.**
   Per the 2026-05-03 math-proofs honest assessment, the core
   algebra is A-grade verified (Lean + Z3 + 5 TLA+ specs). The
   API surface needs real-world exercise, not deferral.
   Edge-runner discipline (the human maintainer 2026-05-03)
   says ship the dogfood.

Alternatives considered + rejected: TS + sqlite-vec/DuckDB
(faster but doesn't dogfood); live-off-the-land via Skill
router + grep (punts architecture); hybrid TS+Zeta (two
systems, more complexity).

---

## What we're indexing — substrate types

Five composable substrate-types live under different roots,
each with a distinct lifecycle:

| Substrate type | Root path | Cardinality (today) | Mutation cadence |
|---|---|---|---|
| Memory files | `memory/**.md` + `~/.claude/projects/<slug>/memory/**.md` | ~250+ | every tick possible |
| Skill files | `.claude/skills/<name>/SKILL.md` | ~50+ | rare (skill-creator gated) |
| Agent files | `.claude/agents/<name>.md` | ~30+ | rare |
| Command files | `.claude/commands/<name>.md` | small | rare |
| Rule files | `.claude/rules/*.md` | very small | new surface |
| Doc cross-refs | `docs/**.md` link targets | ~thousands | every doc edit |
| BACKLOG rows | `docs/BACKLOG.md` + `docs/backlog/**.md` | ~200+ | every tick |
| Tick shards | `docs/hygiene-history/ticks/**/*.md` | ~hundreds | every tick |
| Research docs | `docs/research/**.md` | ~hundreds | every doc edit |
| Code symbols | `src/**.fs` (F#) + `tools/**/*.ts` (TS) | thousands | every code edit |

**Indexing scope decision:** Phase 1 covers memory files +
skill files + agent files + rule files + BACKLOG rows. These
are the highest-query-volume surfaces (every wake, every
tick) and have stable schemas. Phase 2 adds doc cross-refs.
Phase 3 adds code symbols (LSP-adjacent, harder to model).

---

## Query workloads — what the index serves

Six core query shapes, each with target latency:

1. **find-by-keyword** (e.g., "memory files containing
   `'goldfish-ontology'`") — target <100ms cold-start, <10ms
   warm.
2. **find-by-link-target** (e.g., "files referencing
   `memory/feedback_otto_341_*.md`") — target <100ms.
3. **find-stale-references** (e.g., "memory pointers to
   files that don't exist") — target <500ms full-scan,
   <50ms incremental.
4. **find-by-tag/role-ref** (e.g., "all files attributed to
   Soraya") — target <100ms.
5. **find-by-cadence-marker** (e.g., "tick shards with
   CADENCE-TRACK markers"; the existing
   `check-no-op-cadence-pattern.ts` workload) — target
   <50ms.
6. **find-by-archive-header-status** (e.g., "research docs
   missing §33 fields") — target <500ms full-scan, <50ms
   incremental.

**Cold-start decision:** queries 1+2+4 are wake-time agent
needs (Skill-router-equivalent inventory). Queries 3+5+6 are
hygiene-cadence needs (existing `tools/hygiene/**` audits).
The index serves both classes.

---

## Operator mapping — Zeta primitives per query

| Query | Zeta operators |
|---|---|
| find-by-keyword | `IndexedZSet` keyed on token; `flatMap` + `distinct` |
| find-by-link-target | `IndexedZSet` keyed on link-target; `join` against existence stream |
| find-stale-references | `outerJoin` (memory-pointers ⨝ existing-files); `filter` on null-right |
| find-by-tag/role-ref | `IndexedZSet` keyed on attribution-tuple |
| find-by-cadence-marker | `IndexedZSet` keyed on shard-date; `filter` on `CADENCE-TRACK` regex |
| find-by-archive-header | `flatMap` over header-fields; `aggregate` per-doc |

**Update semantics:** every file-add / file-remove /
file-modify is an insertion or retraction in Z-set terms.
`Incremental.fs` handles delta propagation; the IVM
guarantee means the index only re-evaluates the affected
join branches, not the full re-scan.

**Determinism contract:** per `tools/tla/specs/DbspSpec.tla`
+ the chain-rule Prop 3.2 verified in Lean, the Z-set
algebra preserves determinism across replays. Rebuilding
the index from scratch via `git ls-files | feed-into-zeta`
must produce the identical Z-set state to the live IVM. This
becomes a CI invariant (cold-start replay vs warm-state).

---

## NativeAOT deployment shape

**Target binary:** `tools/substrate-discovery/Zeta.SubstrateDiscovery`
(F# project under `tools/substrate-discovery/` with
`PublishAot=true`). Single-file binary, zero JIT warmup,
~30-50ms cold-start (TBD — measure when PoC lands).

**Invocation modes:**

1. **CLI**: `substrate-discovery query <type> <args>` →
   structured JSON output (same shape as
   `tools/github/poll-pr-gate.ts` JSON contract).
2. **Watcher daemon**: `substrate-discovery serve` → IVM
   loop with file-watcher input + Unix-socket query
   interface. Long-running; cron-friendly liveness probe.
3. **Library mode** (Phase 2): F# bindings exposed for
   in-process consumption from F# tools.

**Toolchain integration:**

- Build via `tools/setup/install.sh` (mise-pinned dotnet)
- CI build via `gate.yml` job (`dotnet publish -c Release
  -p:PublishAot=true`)
- Distribute via per-platform binaries (linux-x64, osx-arm64,
  win-x64) attached as GitHub release artifacts
- Cron-loop tools (`tools/hygiene/**`) opportunistically
  shell to the binary; fall back to bun/.ts if absent

**NativeAOT compatibility:** F# AOT support has known edge
cases around reflection-heavy code. Risk mitigation: keep
the binary surface narrow (no FSharp.Core reflection;
explicit serializer registrations; AOT-friendly JSON via
`System.Text.Json` source generators).

---

## Migration / parallel-run plan

**Phase 0 (PoC, 2-3 ticks):** F# project skeleton +
NativeAOT publish + smoke-test invocation. Validates
toolchain end-to-end. Index nothing real; just exit-0 on
`--version`.

**Phase 1 (memory-index dogfood, 5-10 ticks):** index
`memory/**.md` only. Re-implement
`audit-memory-references.ts` + `audit-memory-index-duplicates.ts`
as Zeta queries. Run BOTH the .ts and the F# binary in CI;
diff the JSON outputs; alert on divergence. When parity
holds for 5 consecutive merges, retire the .ts versions.

**Phase 2 (skill + agent + rule + BACKLOG, 10-20 ticks):**
add the next 4 substrate types. Add `find-by-keyword` +
`find-by-tag` queries. Wire into wake-time inventory
discipline (per `claude_code_loading_taxonomy_*` memo).

**Phase 3 (doc cross-refs, multi-month):** index all
markdown link-targets across the repo. Subsumes
`tools/hygiene/audit-orphan-role-refs.sh` +
`audit-machine-specific-content.ts` + similar.

**Phase 4 (code symbols, multi-month):** LSP-adjacent
indexing of F# + TS code. Subsumes / complements Serena,
Lean LSP, F# LSP.

**Retirement gates:** at each phase, the equivalent .ts
script is retired only after (a) parity holds for N
consecutive merges, (b) latency budget is met, (c) cold-
start replay matches live IVM.

---

## Risk register

| Risk | Probability | Mitigation |
|---|---|---|
| NativeAOT incompatibility on F# library | Medium | Phase 0 PoC validates before substantial commit |
| Pre-v1 Zeta API churn breaks substrate-discovery | Medium | Pin to specific Zeta commit per phase; bump explicitly |
| IVM cold-start slower than full-scan via grep | Low | Phase 0 measures; if slower, redesign or add caching layer |
| Watcher-daemon liveness drift (hangs / misses events) | Medium | Cron-friendly liveness probe; auto-restart; state checkpointing per Otto-272 DST |
| Per-platform binary distribution friction | Medium | GitHub Actions artifact build; mise-pinned dotnet matrix |
| Cross-platform file-watch primitive differences | Medium | Use .NET `FileSystemWatcher`; fall back to polling if unreliable |
| F# JSON-source-generator AOT edge case | Low | Use simple records; avoid generic dispatch in serializer |

---

## Composes with

- `docs/research/2026-05-03-math-proofs-honest-assessment.md`
  (the algebra is A-grade verified; this dogfoods it)
- `src/Core/IndexedZSet.fs` + `Incremental.fs` + `Operators.fs`
  + `ZSet.fs` (the primitives)
- `tools/tla/specs/DbspSpec.tla` (determinism contract)
- `tools/lean4/Lean4/DbspChainRule.lean` (proof the IVM
  composes correctly under retraction)
- `memory/feedback_claude_code_loading_taxonomy_*.md`
  (the wake-time inventory discipline this index serves)
- `.claude/rules/test-canary.md` (the harness-native
  alternative we're explicitly choosing not to rely on for
  the custom-index workload)
- `tools/hygiene/audit-memory-references.ts` +
  `audit-memory-index-duplicates.ts` (Phase-1 dogfood
  targets — re-implement as Zeta queries)

---

## Decision points (architect-call within authority)

1. **Yes, Zeta-native-AOT is the best long-term solution.**
   Decided: see "Why Zeta-native-AOT" section above.
2. **Phase 0 PoC is the next concrete work item.** Bounded
   to 2-3 ticks; validates toolchain end-to-end before
   substantial commit.
3. **Parallel-run with .ts retirement gates** preserves the
   existing audit value during transition. No big-bang
   replacement.

---

## Audit trail

- Scoping doc authored: 2026-05-03
- Triggered by: human maintainer 2026-05-03 input *"use zeta
  in native assmly mode for our custom index i think"* +
  edge-runner reframe + math-proofs assessment landing
- Authority decision: architect within scope (per CLAUDE.md
  *"don't ask permission within authority scope — only two
  real gates"*)
- Next concrete work: Phase 0 PoC (separate PR)
