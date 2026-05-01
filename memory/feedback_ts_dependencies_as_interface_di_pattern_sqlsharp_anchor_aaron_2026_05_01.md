---
name: TS dependencies-as-interface DI pattern — SQLSharp external anchor — super strongly typed not js-in-ts — Aaron 2026-05-01
description: Aaron 2026-05-01 — *"`../SQLSharp` is a decent example... of best practices not super DST yet the other repo but best bun/ts practices... super strongly typed... not js in ts failure mode."* The SQLSharp repo (sibling of Zeta) demonstrates the production-grade bun/ts pattern Otto should write toward when authoring new tools: every external dependency named in a typed interface (`typeof X`-keyed), defaulted via a named const, injected through the call chain. Every function is DST-able by construction. Composes with the dynamic-bash → TS migration trajectory; SQLSharp is the form factor poll-pr-gate*.ts should evolve toward.
type: feedback
caused_by:
  - "Aaron 2026-05-01 nudge cluster after PR #1153 (poll-pr-gate-batch.ts + DST tests) landed: '../SQLSharp is a decent example' + 'of best practices not super DST yet the other repo but best bun/ts practices' + 'super strongly typed' + 'not js in ts failure mode'"
  - "Inspection of `../SQLSharp/tools/automation/format/format-repo.ts` (sibling-repo path; absolute filesystem path host-specific) confirmed the pattern (FormatRepoDependencies interface + defaultFormatRepoDependencies const + DI through call chain)"
  - "SQLSharp CLAUDE.md explicit rule: *'Prefer strong static types and generics across C#, F#, and TypeScript; push invariants into compiler-checked types and signatures when the design can carry them there.'*"
composes_with:
  - feedback_prefer_ts_scripts_over_dynamic_bash_for_conversation_ux_dst_in_ts_aaron_2026_05_01.md
  - feedback_dst_grade_a_dependency_source_inspection_pull_to_sibling_repo_for_deep_search_aaron_2026_05_01.md
  - feedback_detect_changes_pattern_sibling_repo_parallel_optimized_external_anchor_aaron_2026_05_01.md
---

# Rule

When authoring (or refactoring) a TS tool in Zeta:

1. **Define a `Dependencies` interface** for every external
   call surface — `spawn`, `readFileSync`, `process.exit`,
   environment access, network, time, random. Type each via
   `typeof X` against the production import.
2. **Define a `defaultDependencies` const** assembling the
   production deps once.
3. **Functions take `(args, options, dependencies?)` triple**
   where `dependencies` defaults to `defaultDependencies`.
4. **Tests pass synthetic dependencies** — fully deterministic,
   no I/O, no clock, no spawn.
5. **No `any`. No implicit `any`.** Every value typed
   precisely. Discriminated unions over `string`. `readonly`
   on array params. Exhaustive switch / discriminant checks.

This is the SQLSharp pattern. Aaron's framing —
*"super strongly typed... not js in ts failure mode"* — is
the discriminating axis: TS that's just JavaScript with a
`.ts` extension and `any` escapes is the failure mode; TS
where the type system carries the design invariants is the
target.

# Why

Aaron 2026-05-01 (verbatim, four-message clarification):

> *"`../SQLSharp` is a decent example"*
> *"of best preactices not super DST yet the other repo but
> best bun/ts practices"*
> *"super strongly typed"*
> *"not js in ts failure mode"*

The clarification stack is itself the lesson: SQLSharp is
**not** the DST anchor (some other repo carries that), but
IS the **bun/ts best-practices anchor** for this factory.
The "super strongly typed" + "not js in ts failure mode"
pair names what the pattern IS (super-strongly-typed) and
what the pattern AVOIDS (js-with-.ts-extension).

## Why-1: TS without strong types is just JavaScript with extra steps

The "js-in-ts failure mode" Aaron names is real:

- `any`-typed values that propagate through the codebase
- `as` casts hiding shape mismatches
- Loose `Record<string, unknown>` parameters where a
  discriminated union would be clearer
- Optional chaining cascades (`a?.b?.c?.d`) hiding shape
  uncertainty the type system could resolve
- Functions that return `Promise<unknown>` instead of
  precise return types
- Interfaces with optional fields everywhere because the
  author didn't decide if the field is required

Each of these defeats one of the type system's purposes.
A codebase saturated with these is "js-in-ts" — TS as
syntactic sugar, not as type-driven design.

The SQLSharp form actively fights this: every interface is
intentional, every parameter is required-or-optional by
design (not by laziness), every union is exhaustively
discriminated, every spawn-class side effect is captured
in an injectable interface.

## Why-2: Dependencies-as-interface unlocks DST without tooling

The pattern the human maintainer points at — `format-repo.ts`,
the `FormatRepoDependencies` interface near the top of the
file — is structural DI without a DI framework. (External
line numbers drift; consult the current file in the sibling
repo via `git -C ../SQLSharp log` for canonical state.) Each
external call surface (process runner, file lister, settings
resolver) is a typed function in the interface. Tests
construct a synthetic interface instance with deterministic
stubs. Production uses a default `default*Dependencies` const
(in `format-repo.ts` named `defaultFormatRepoDependencies`)
that wires real implementations.

Compared to monkeypatching, vi.mock, jest.fn — the structural
DI form is:

- Compiler-checked (you can't omit a dep from the synthetic
  interface; TS will complain)
- Self-documenting (the interface IS the surface area; you
  see exactly what's external)
- DST-grade-A by construction (no global state to mock,
  no hidden imports to intercept)
- Refactor-friendly (renaming a dep updates the interface;
  consumers fail to compile)

This is the load-bearing reason "TS is DST-achievable." The
DI pattern IS the achievability vehicle. Bash has no
analogue.

## Why-3: SQLSharp is the closest live external anchor for the pattern

Per `feedback_dst_grade_a_dependency_source_inspection_pull_to_sibling_repo_for_deep_search_aaron_2026_05_01.md`,
direct sibling-repo inspection IS the discipline for
calibrating against high-credibility external evidence.
SQLSharp:

- Lives at `../SQLSharp` (relative to Zeta) — directly
  inspectable
- Has explicit type-discipline rule in `CLAUDE.md`
  (*"push invariants into compiler-checked types"*)
- Demonstrates the pattern in production code
  (`tools/automation/format/format-repo.ts`,
  `tools/automation/lib/repo-environment.ts`,
  ~30+ TS files in `tools/automation/`)
- Uses `bunfig.toml` with strict test config
  (`pathIgnorePatterns`, `coverageSkipTestFiles`)
- Same maintainer (Aaron) — internally-coherent rather
  than copy-cargo-cult from random external repo

The sibling-repo external anchor is high-credibility because
Aaron's pattern there has been refined over time on a real
production .NET library. The pattern transfers to Zeta as
the form factor TS tools should write toward.

# How to apply

When authoring or touching a TS tool in `tools/`:

1. **Read the SQLSharp parallel** before authoring. If
   SQLSharp has a similar tool (format, coverage,
   environment, validation), match the shape.
2. **List external dependencies** of the tool: every spawn,
   read, write, env access, network call, clock, random.
3. **Build a `Dependencies` interface** typed via `typeof`
   against the production imports.
4. **Build `defaultDependencies` const** at module scope.
5. **Top-level functions take `(args, options, deps?)` triple**.
6. **Tests pass synthetic `deps`** in `bun test` form.
7. **Run lint + typecheck + tests** before commit to verify
   zero `any`, zero implicit `any`, strict mode passing.
   In this repo, the script names are `bun run lint:typescript`,
   `bun run typecheck`, and `bun run test:typescript` (or
   `bun test` for tools). Check `package.json` scripts for
   the canonical names; don't trust generic command names
   that may not exist.

When the pattern is hard to apply — a function genuinely
needs no external deps, or the existing tool predates the
pattern — note it. The pattern is the target shape; not
every tool needs the full infrastructure overnight.

# Worked example — how `poll-pr-gate-batch.ts` should evolve

Current state (PR #1153 at `5848fa1`):

- `pollFn` is injectable (the only DST-able boundary)
- Types exported (`GateReport`, `BatchSummary`, etc.)
- `summarize` is pure and testable

Gaps vs. SQLSharp pattern:

- `spawnSync` calls in `listOpenPRs` and `pollOne` are
  hard-coded — no `runProcess: typeof spawnSync` in a
  `Dependencies` interface
- `process.exit` calls scattered through `parseArgs`,
  `listOpenPRs` — no `exit: (code: number) => never`
  injectable
- `process.stdout.write` / `process.stderr.write` direct —
  no `out: (s: string) => void` / `err: (s: string) => void`
  injectable
- `new Date()` in `main` (queriedAt) — no `clock: () => Date`
  injectable

A follow-up refactor (separate PR, separate branch) should
extract these into `BatchPollDependencies` + `defaultBatchPollDependencies`
following format-repo.ts shape. That brings the entire
script under the DST-grade-A umbrella, not just `pollAllBounded`.

# Composes with

- `feedback_prefer_ts_scripts_over_dynamic_bash_for_conversation_ux_dst_in_ts_aaron_2026_05_01.md`
  — the why-bash-fails layer; SQLSharp pattern is the
  what-TS-does-instead concrete form.
- `feedback_dst_grade_a_dependency_source_inspection_pull_to_sibling_repo_for_deep_search_aaron_2026_05_01.md`
  — the rule about reading sibling repos; SQLSharp is one
  of the high-credibility instances of that rule.
- `feedback_detect_changes_pattern_sibling_repo_parallel_optimized_external_anchor_aaron_2026_05_01.md`
  — `../no-copy-only-learning-agents-insight` is the
  parallel-optimization external anchor; SQLSharp is the
  TS-best-practices external anchor. Different anchors,
  different domains, same discipline.
- `project_install_script_language_strategy_post_install_typescript_pre_install_bash_powershell_python_for_ai_ml_2026_04_27.md`
  — TS is the post-install scripting target language; the
  SQLSharp pattern is what good TS looks like at the
  factory's quality bar.

# What this rule does NOT do

- **NOT a directive to refactor every existing TS tool
  immediately.** The pattern is a target shape. Phase the
  application: new tools follow the pattern; refactors
  apply when touched.
- **NOT a ban on simpler TS for one-off prototypes.**
  Aaron's prototype carve-out (per
  `feedback_prefer_ts_scripts_over_dynamic_bash_*`) still
  applies. Quick TS scripts that do a one-off don't need
  full DI infrastructure.
- **NOT a claim SQLSharp is the only valid anchor.** Other
  TS-strong repos exist (Effect-TS ecosystem, fp-ts, etc.).
  SQLSharp is the *closest, sibling-repo* anchor with
  consistent maintainer-discipline. External anchors
  rotate as new evidence lands.
- **NOT a ban on `any` in third-party-shape parsing.** When
  parsing JSON of unknown shape (e.g., `gh api` output that
  GitHub may evolve), narrow types via runtime checks +
  type guards. The `any` ban applies to *internal* types
  not external-API-shape parsing where validation IS the
  type-narrowing step.

# Carved sentence (candidate, not seed-layer yet)

*"Super-strongly-typed TS, not js-in-ts. Every external
call surface in an interface. Every function takes its
dependencies. The default const wires production; the test
constructs the synthetic. The pattern IS the DST achievability
vehicle."* (Aaron 2026-05-01.)

(Marked candidate per CSAP. Has not been multi-domain-tested.
Promotes via Razor + CSAP under DST grading on cadence, not
by maintainer fiat.)
