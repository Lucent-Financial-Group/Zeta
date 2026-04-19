# Zeta.Core Unified Backlog

Single source of truth. Replaces scattered "flagged P1" notes in
ROADMAP.md and round summaries. Append-only; keep ordered newest-first
within each priority tier.

## Legend

- **P0** = ship-blocker, work on next round
- **P1** = work on within 2-3 rounds
- **P2** = research-grade, work on when the stars align
- **P3** = note-taking, explicitly deferred
- ✅ = shipped
- ⏭️ = declined with reason

---

## P0 — next round (committed)

- [x] ✅ **Fix SpeculativeWatermark retraction-native logic** — harsh-
  critic round #5 (shipped round 17: swapped direction check so
  late positive inserts trigger retract-of-old + insert-of-corrected).
- [x] ✅ **Fix ClosurePair Equals/GetHashCode mismatch** — harsh-critic
  #11 (shipped round 17: both Equals and GetHashCode now use
  `EqualityComparer<'N>.Default`).
- [x] ✅ **Fix `RecursiveSemiNaive` monotonicity violation in Hierarchy**
  — harsh-critic #2 (shipped round 17: `ClosureTable` now uses
  retraction-safe `Recursive` combinator; `RecursiveSemiNaive`'s
  monotonicity precondition is documented in its XML doc).
- [x] ✅ **Residual.fs rebuildFromIntegrated is O(n), not O(1)** —
  harsh-critic #3 (shipped round 17: rewritten with `SortedSet` +
  `Dictionary` so every op is honestly O(log k); no more fallback
  scan).
- [x] ✅ **Residuated.fs integrated Z-set grows unbounded** — harsh-
  critic #4 (shipped round 17: state is now (SortedSet, Dictionary)
  pair, both tracking only active keys — no more unbounded
  integrated history).
- [x] ✅ **FastCdc.fs O(n²) buffer scan** — harsh-critic #7 (shipped
  round 17: added persistent `scanCursor` + `hash` state; each byte
  hashed exactly once across lifetime).
- [x] ✅ **FastCdc.fs allocation-per-chunk** — harsh-critic #8 (shipped
  round 17: `Buffer.BlockCopy` instead of byte-by-byte loop; raw
  `byte[]` buffer with head/tail pointers replaces `ResizeArray`).
- [x] ✅ **Ship tests for Hierarchy/FastCdc/Merkle/ResidualMax/BloomFilter**
  — harsh-critic #28 (shipped round 17: 22 new tests in
  `Round17Tests.fs`; total suite 471 passing).
- [ ] **Witness-Durable Commit mode** — skeleton shipped round 17
  (`src/Core/Durability.fs` DU + `WitnessDurableBackingStore`
  placeholder). Full protocol impl blocked on the WDC paper peer-
  review rebuttal; see `docs/papers/WDC-rebuttal.md`.
- [ ] **SpeculativeWindow test coverage** — still pending; covered by
  SpeculativeWatermark tests in `Round17Tests.fs` but the
  `Window.fs` speculative path has no direct test.
- [ ] **ArrowInt64Serializer tests** — still pending; harsh-critic
  #28 remainder.

## Research projects

- [ ] **Retraction-safe semi-naïve LFP — gap-monotone variant**.
  `docs/research/retraction-safe-semi-naive.md`. Top-2 candidates:
  (1) signed-delta ("gap-monotone") — 10-14 engineer-days, needs a
  ~200-line TLA+ spec + TLC model-check + `RecursiveSignedSemiNaive`
  impl + Z-linearity guard + regression oracle. (2) Gupta-Mumick
  counting algorithm — 8-12d, simpler TLA+ proof, also unlocks
  path-counting / provenance-weight queries. Shares ~50% code with
  (1). Plan: ship (2) first as `CountingClosureTable`, land (1)
  after as `RecursiveSignedSemiNaive`. Promotes `ClosureTable` off
  the current O(|integrated closure|) per-iteration fallback.
- [ ] **CQF (Counting Quotient Filter) trial** to replace the
  4-bit counting Bloom saturation issue. Pandey et al. SIGMOD'17.
  Our `CountingBloomFilter` saturates at 15; CQF uses
  variable-width counters (grows into empty slots). Port effort:
  5-8d. Includes: trial port, benchmark vs current counting
  Bloom, round-18 TECH-RADAR promotion if it wins.
- [ ] **Ceramist → Lean Mathlib port of probability lemmas**.
  Ceramist is the only existing formal-proof corpus for AMQ
  correctness (Coq, ITP'20 / CAV'21). Port the counting-Bloom
  soundness lemma to `proofs/lean/BloomFilter.lean`. Effort:
  2-3 weeks (mostly Mathlib onboarding).
- [ ] **Finish Lean 4 + Mathlib chain-rule proof**.
  `proofs/lean/ChainRule.lean` is a `sorry`-bodied stub.
  `docs/research/proof-tool-coverage.md` is explicit this is the
  single highest-leverage prover move we can make. 2 weeks.
- [ ] **LiquidF# refinement-types trial**. Would catch the
  off-by-one / bad-index class that keeps reappearing in
  `FastCdc.fs`, `Crdt.fs`, SIMD merge. Effort: 1 week for
  evaluation, then incremental adoption per module.
- [ ] **Feldera apples-to-apples benchmark**. Three concrete
  steps from `docs/research/feldera-comparison-status.md`:
  (a) `cargo build --release` in `references/upstreams/feldera/`,
  (b) write `bench/Dbsp.Feldera.Bench/FelderaRunner.fs` shell-out
  helper + `FelderaCompare.fs` diff harness,
  (c) port Nexmark Q3 (hash join) + Q7 (windowed top-1) on our
  side (Window.fs wiring pending). Target: measured numbers in
  `docs/BENCHMARKS.md` by end of round 20.

## P1 — SQL frontend + query surface (round-33 vision, v1 scope)

- [ ] **Shared query IR that compiles to the DBSP operator
  algebra.** The pattern `../SQLSharp/openspec/specs/query-
  frontends/spec.md` establishes: SQL-text parsing and
  integrated-query (LINQ) both lower to one logical
  planning pipeline. Zeta needs the same convergence point.
  Design-doc round before code.
- [ ] **LINQ integration (`IQueryable<T>` roots).** Mapped-
  table query roots + property-to-column descriptors per
  SQLSharp's shape. Lowers to the shared query IR.
  First v1 surface consumers will touch.
- [ ] **SQL parser with multi-dialect support.** Dialects to
  target: T-SQL, PostgreSQL, MySQL, SQLite, DuckDB. Shared
  parser front-end + dialect overlays per
  `../SQLSharp/openspec/specs/language-and-extension-model/`
  pattern. Aaron round 33: "we also want to target many
  different SQL dialects."
- [ ] **Entity Framework Core provider.** Zeta ships an EF
  Core provider so EF consumers get DBSP incremental query
  plans for free. Aaron: "work tightly with entity framework,
  then branch out to other ORMs." First-class v1.
- [ ] **F# DSL reimagining SQL for the modern era (HUGE,
  multi-round).** Extends the existing `circuit { ... }`
  computational-expression seed. Natively retraction-aware,
  bitemporal-ready, incremental-by-default. Aaron round 33
  flag: "sounds like we need design and research, this
  task sounds HUGE." Spread across multiple rounds:
  Round N: research what modern SQL should look like
    (compose-ability, retraction syntax, time-travel
    primitives, type-system integration with F#
    discriminated unions). Survey languages that tried
    (Rel/Tutorial D, Datalog family, LINQ, Kleppmann's
    "Rethinking relational" talks, relational algebra
    type theory).
  Round N+1: design doc with syntax sketch.
  Round N+2: paper-peer-reviewer pass.
  Round N+3+: implementation + fit-check against existing
    circuit/Op algebra.
  Output: sequence of `docs/research/f-dsl-*.md` docs
  then `openspec/specs/f-dsl-surface/` once shape
  stabilizes.

- [ ] **Pluggable wire-protocol layer with PostgreSQL +
  MySQL + Zeta-native plugins.** Aaron round 33: "can
  we make the wire protocol pluggable and we could just
  support MySQL too to make sure we can support
  [multiple] and have our own variant so we can start
  getting support for UIs with our protocol which will
  be much better." Design the protocol-plugin
  abstraction first; one adapter per protocol (auth,
  message encoding, error mapping, connection-state
  machine). Initial plugins:
  - PostgreSQL plugin: pgAdmin / DBeaver / psql /
    Npgsql-via-EF compatibility. Precedent:
    CockroachDB, Materialize, YugabyteDB, Apache AGE.
  - MySQL plugin: MySQL Workbench / Connector/NET /
    Pomelo-via-EF / Azure Data Studio compatibility.
    Second plugin proves the abstraction isn't
    PostgreSQL-shaped by accident.
  - Zeta-native plugin: designed around retraction-
    native deltas, bitemporal queries, durable-Rx
    stored procedures. Future UIs that speak it get
    first-class Zeta features (time-travel slider,
    delta streaming, Rx inspection) the emulated
    protocols can't express.

  v1-or-early-post-v1 depending on design round
  outcome. Output: `docs/research/pluggable-wire-
  protocol-design.md` first, then per-plugin design
  docs.

- [ ] **Own admin UI (far future).** Aaron round 33: "we
  will need some UI that can connect to it like SSMS or
  PostgreSQL Admin, so we will have to build our own
  (which we will eventually do)." Stack choice is open
  — Fable + Elmish (F# + web), SAFE Stack (F# full-
  stack), Blazor (C# + WebAssembly), or Avalonia
  (native F#/C#). Signals the polyglot story. Deferred
  until `Zeta.Core` v1.0 ships and server mode is
  stable. Research round first.
- [ ] **Additional ORM providers (post-EF).** Dapper,
  NHibernate, LLBLGen, etc. After the EF provider lands
  and the pattern is understood.

## P2 — Post-v1 query-surface research

- [ ] **Reaqtor-inspired durable-Rx "stored procedures"
  design doc.** Microsoft's Reaqtor (MIT, dormant-but-stable,
  reaqtive/reaqtor on GitHub) ships serializable expression
  trees + a query engine that persists operator state across
  restarts — durable Rx. Reaqtor is push/event-at-a-time
  with no native retraction; the Zeta niche is "Rx +
  durability + retraction-native" (a Reaqtor-shaped hole
  nobody has filled). Research questions: (a) does the
  `IReactiveQbservable<T>` surface shape translate to DBSP
  Z-set deltas cleanly? (b) what does the URI-keyed
  operator vocabulary look like against Zeta's operator
  algebra? (c) `OnError/OnCompleted` vs
  `Result<_, DbspError>` — keep our error model? (d) is
  this a Zeta feature or a separate library on top?
  Output: `docs/research/reaqtor-shape-for-zeta.md`.
- [ ] **Bitemporal + time-travel queries as a first-class
  v2 surface.** Append-dated history with retraction-aware
  point-in-time queries. Paper-worthy. Aaron round 33:
  "yes I want this haha." Needs design round on storage
  shape (append-dated rows vs versioned Spine), query
  syntax (`AS OF TIMESTAMP` vs F# DSL primitives), and
  retraction semantics under time-travel.

- [ ] **Regular-database façade over the event-sourcing
  core.** Aaron round 33: "a facade/abstraction so this
  can be used like a normal non eventing database as well,
  it should be both, i can replace my database and my
  event store with Zeta." The DBSP engine (retractions,
  deltas) runs underneath; the façade presents normal
  `tables + rows + SELECT/INSERT/UPDATE/DELETE` surface.
  Same operator algebra + query IR feeds both modes.
  Design questions: (a) is the façade a separate NuGet
  package consuming Zeta.Core, or the default surface
  with event-sourcing as opt-in? (b) how does the façade
  map INSERT/UPDATE/DELETE to DBSP deltas without
  leaking retraction semantics? (c) transaction model —
  same as event mode or distinct? Output:
  `docs/research/db-facade-design.md`.

- [ ] **Columnar storage substrate** alongside row-oriented
  Spine. Aaron round 33: "likely column columnar stuff."
  Workload fit: OLAP, analytics, wide-row sparse-
  projection, large-scan aggregation. Needs design round
  on integration with DBSP operator algebra (can a
  retraction-native columnar store expose Z-set deltas?)
  and on how the planner picks row vs column storage per
  query. References: DuckDB, Apache Arrow, Parquet,
  ClickHouse, Feldera. Priority post-v1 — v1 ships
  row-oriented Spine first, columnar follows.

## P1 — Factory / static-analysis / tooling (round-33 surface)

- [ ] **Python tool management via `uv tool` (from ../scratch)**
  (round 34). uv pinned in `.mise.toml` this round (P0 from
  Bodhi-adjacent ../scratch research). Next: port
  `scripts/setup/unix/python-tools.sh` shape — declarative
  `manifests/*.uv-tools` profiles (min / all), `uv tool
  install/upgrade` loop, PATH + $GITHUB_ENV append. Dejan owns
  the port (hand-crafted, not copied per GOVERNANCE §23).
  Effort: ~3h. Unlocks ruff / mypy / pytest adoption without
  ad-hoc global pip installs.
- [ ] **Manifest `@include` hierarchy (from ../scratch)**
  (round 34). Today Zeta's manifests are flat. ../scratch
  supports `@<name>` directives (e.g., `all.uv-tools` includes
  `@min`). As Python + Bun tool sets grow, hierarchy prevents
  copy-paste. Effort: ~6h. Retrofits apt / dotnet manifests
  too.
- [ ] **`BOOTSTRAP_MODE=minimum|all` (from ../scratch)** (round
  34). One env var switches between CI-minimum and full dev
  env. Each manifest carries `min.*` and `all.*` variants.
  Effort: ~8h. Speeds CI and makes contributor onboarding
  faster.
- [ ] **`BOOTSTRAP_CATEGORIES` orthogonal selection (from
  ../scratch)** (round 34). Allows `BOOTSTRAP_CATEGORIES="
  quality database"` to pull category-specific manifests on
  top of min or all. Unblocks modular CI stages + lighter
  containers. Effort: ~12h. Zeta's categories TBD (candidate:
  quality, lean, docs, native).
- [ ] **Bodhi DX audit cleanup (round-34 first-PR walk)** —
  the P0 Dbsp.* path refs landed this round via sweep-refs.
  Remaining from her audit: (a) CONTRIBUTING.md — add
  shellenv sentence + trivial-PR branch-model guidance +
  `tools/setup/doctor.sh` mention (Samir on Kenji sign-off);
  (b) decide `fsharp-analyzers` — add to
  `manifests/dotnet-tools` or remove from README
  instructions (Dejan + Samir); (c) codify `sweep-refs`
  invocation as a mandatory round-close step after any
  rename campaign (add to `round-open-checklist` or
  GOVERNANCE §).
- [ ] **Opt-in auto-edit of shell rc files on install**
  (round 34 ask from Aaron). Today the install script
  deliberately does not touch `~/.zshrc`, `~/.bashrc`,
  `~/.bash_profile`, `~/.profile` — it writes the managed
  `$HOME/.config/zeta/shellenv.sh` and prints a paste-ready
  block. Aaron wants a flag that automates the rc-file
  edit for contributors who opt in. `../scratch` has a
  proven pattern for this — check how they append
  idempotently (detect the source line, skip if present,
  append with a Zeta-owned header comment so the block is
  recognisable on next run).

  **Design questions to lock before implementing:**
  - Flag name. Proposals: `--auto-edit-profiles`,
    `ZETA_AUTO_EDIT_PROFILES=1`, or a top-level
    `install.sh --profiles`. Aaron is comfortable with
    opt-in OR default-on; my lean is default-off +
    opt-in via flag for the first release (lowers blast
    radius on first-PR contributors).
  - Target files. All four (`~/.zshrc`, `~/.bashrc`,
    `~/.bash_profile`, `~/.profile`) or detect which
    exist and only touch those?
  - Idempotency marker. Use a fenced comment like
    `# ---- zeta shellenv (managed) ----` so a future
    run can detect and update rather than append.
  - Undo. Document an `--unedit-profiles` inverse.

  **Effort.** M — script work plus careful idempotency
  + undo testing across bash + zsh on macOS + Linux.
  Lands with the Oh-My-Zsh BACKLOG item if we bundle
  the interactive-shell setup.

- [ ] **Oh My Zsh + plugins in install script + devcontainer**
  (round 34 ask from Aaron). Symmetry with dev-laptop,
  Linux dev-box, and the future devcontainer — all
  should default to zsh + Oh My Zsh with the same plugin
  set. Also: Oh My Posh for pwsh on Windows for the
  same cross-shell polish.

  **Proposed shape:**
  - `.mise.toml` stays language-runtime only (don't
    conflate tooling with shell polish).
  - New `tools/setup/common/shell.sh` (opt-in via flag
    like `--install-shell` or env var) that:
    - Installs Oh My Zsh (curl-to-install script, pinned
      commit SHA per BP-04 supply-chain discipline).
    - Installs the plugin set declared in a new
      `tools/setup/manifests/zsh-plugins` manifest
      (semantic extension, no `.txt`). Plugins Aaron
      runs: `git node vscode dotnet python pip github
      iterm2 docker kubectl npm pyenv pylint sudo
      virtualenv` — drop `nvm` (replaced by mise's
      bun) and `npm` (ditto).
    - Optionally sets zsh as default shell (chsh —
      only when user explicitly opts in, never silent).
    - Bootstraps Oh My Posh on Windows (`.ps1` step,
      stub-only for now; lands with Windows CI).
  - Default off on first run; default ON in
    `.devcontainer/Dockerfile` (containers always want
    the full experience).
  - `tools/setup/manifests/zsh-plugins` lives at
    `tools/setup/manifests/` with other manifests.

  **Why this matters.** Aaron's dev laptop, his Linux
  dev box, and the future devcontainer all run the
  same shell + plugins. Every time a plugin gets added
  on one, the others drift. A managed manifest +
  install step gives three-way parity (GOVERNANCE §24)
  at the shell-UX layer, not just the toolchain layer.

  **Effort.** M. Design doc first
  (`docs/research/shell-polish-design.md`), then
  implementation split across macOS / Linux / Windows.

- [ ] **emsdk under install script** (round 34 ask from
  Aaron; mirrors his current ad-hoc
  `source ".../emsdk/emsdk_env.sh"` in `~/.zshrc`).
  Today emsdk is manually cloned and sourced per-
  contributor. Zeta currently doesn't compile to
  wasm, but Aaron does in his wider workflow. Cleaner
  shape: put emsdk under `tools/setup/common/emsdk.sh`
  as an opt-in install (guarded by a
  `BOOTSTRAP_CATEGORIES=emscripten`-style selector
  once that pattern lands; see
  `BOOTSTRAP_CATEGORIES` BACKLOG item).

  **Effort.** S-M. Clone to a known path, source its
  env file from shellenv.sh when present, opt-in only.

- [ ] **Per-shell `mise activate` in shellenv.sh (dev-laptop
  perf nit)** (round 34 observation). Managed shellenv
  emits `eval "$(mise activate bash)"`. In a bash
  environment (CI, BASH_ENV-sourced subshells, bash
  login) this works perfectly — initial PATH is set and
  bash's `PROMPT_COMMAND` hook keeps it synced. In a zsh
  interactive shell, the bash-specific hooks don't fire;
  PATH gets the activation-time snapshot only, and mise
  shims (if present) end up resolving tools rather than
  direct mise install paths. Functionally correct (still
  mise-managed dotnet), but the ~10x perf win is bypassed
  on dev laptops.

  **Fix sketch.** Emit shell-specific activation based on
  detected parent shell — `mise activate zsh` in zsh,
  `mise activate bash` in bash. Detection inside a
  sourced file that runs in-process is tricky (the file
  is shared across shells); options:
  - Fork the emission: `shellenv-bash.sh` + `shellenv-zsh.sh`,
    rc-file sources the right one.
  - Dynamic detection at source time via `$ZSH_VERSION` /
    `$BASH_VERSION`.
  - Option (b) is simpler and fits the "one file" ethos.

  **Effort.** S (15-min edit + dry-run in both shells).

- [x] ✅ **Pure `mise activate` (no shims) on CI — verified
  round 34.** Commit 9f138eb passed 6/6 CI checks
  (build-and-test on macos-14 + ubuntu-22.04, all four
  lints) with `eval "$(mise activate bash)"` — no
  `--shims`. Matches mise's own ~10x-faster recommendation.
  Evidence ships green on both CI OSes. Follow-up:
  backport the finding to `../scratch` via the
  GOVERNANCE §23 upstream-contribution workflow — they
  ship `--shims` only by historical default.
- [ ] **Compaction mode for container builds** (round 34
  ask from Aaron; mirrors `../scratch`'s
  `BOOTSTRAP_COMPACT_MODE`). When the install script
  runs inside a devcontainer / CI image / build-server
  image, it should clean up intermediate artefacts after
  each tool install — apt caches, download tarballs,
  `~/.cache/mise` bits, shallow-clone `.git` histories
  if we introduce any. Dev-laptop runs should never do
  this (disk is cheap, re-running install is slow).

  **Pattern (from `../scratch/scripts/setup/unix/common.sh`):**
  - `BOOTSTRAP_COMPACT_MODE=true` env var is the gate.
  - `bootstrap_compact_mode_enabled()` helper reads the
    env var honestly (truthy/falsy parsing).
  - Per-tool cleanup helpers:
    `run_<tool>_compact_cleanup` (e.g.,
    `run_brew_compact_cleanup`,
    `run_bootstrap_temp_compact_cleanup`).
  - Called at the tail of the bootstrap orchestrator —
    AFTER all tools are installed, so a failed install
    doesn't wipe useful debugging state.
  - Default: off. CI + container images opt in.

  **Zeta mapping.** Cleanup targets this round would be:
  (a) apt caches on Ubuntu (`apt-get clean` + `/var/lib/apt/lists/*`);
  (b) `~/.dotnet` per-SDK temp tarballs (mise's dotnet
  plugin leaves them around);
  (c) `~/.cache/mise/downloads`;
  (d) brew caches on macOS (`brew cleanup --prune=all`).
  Elan / TLA+ / Alloy jars are small enough to not
  matter in v1.

  **Effort estimate:** M. Design doc first
  (`docs/research/compaction-mode.md`), implementation
  across `tools/setup/common/*.sh` second. Lands with
  `.devcontainer/Dockerfile` when the third leg of
  three-way-parity (GOVERNANCE §24) finally ships.

  **Why this matters.** When `.devcontainer` lands and
  a consumer opens Zeta in Codespaces, the image needs
  to be small enough to pull fast. Without compaction,
  each tool leaves hundreds of MB of intermediates
  that inflate the image 3-5x.
- [ ] **Cross-harness mirror pipeline** (round 34 ask from
  Aaron). Zeta is currently Claude-Code-biased
  (`.claude/skills/`, `.claude/agents/`). Real contributors
  may run Cursor / Windsurf / Aider / Cline / Continue /
  Codex. Each harness reads a different folder; no
  universal one exists.

  **Design (Aaron's call).** One canonical source of truth,
  N harness mirrors generated as build artifacts. Keep
  skill docs ASCII + LF + plain Markdown. No symlinks, no
  clever indirection. Add an index file listing every
  skill + path.

  **Proposed shape:**
  - **Canonical source.** Move `.claude/skills/` →
    `skills/` at repo root. `.claude/agents/` likely
    stays Claude-specific (persona frontmatter with
    `skills:` field, `tools:`, `model:` is Claude-Code
    syntax). Skills themselves are the portable part.
  - **Generator.** `tools/sync-harness-mirrors.sh` (or a
    small F# / Python script) reads `skills/**/SKILL.md`
    and `skills/INDEX.md` and writes to:
    - `.claude/skills/<name>/SKILL.md` (exact copy;
      Claude Code reads from here)
    - `.cursor/rules/<name>.mdc` (frontmatter-adjusted
      per Cursor conventions — `description`, `globs`,
      `alwaysApply`)
    - `.windsurf/rules/<name>.md` (similar adjustment)
    - `.github/instructions/<name>.instructions.md`
      (Copilot path-scoped variant — keeps the existing
      `copilot-instructions.md` as the global prompt,
      adds per-skill scoped prompts)
    - `AGENTS.md` gets a generated "Skills index"
      section the harness-agnostic tooling picks up
  - **CI gate.** Workflow runs the generator + `git
    diff --exit-code`. If mirrors drift from canonical,
    CI fails. Prevents drift the way
    `TreatWarningsAsErrors` prevents warning drift.
  - **Index file.** `skills/INDEX.md` — newest-first per
    §18; one line per skill: name, one-sentence purpose,
    mirror paths (so a human scanning for "where does
    this skill actually live on my harness" finds it).

  **Constraints from Zeta's conventions:**
  - **GOVERNANCE §30 sweep-refs** applies — every `skills/`
    → `<harness>/<path>` rename is a moved path; grep and
    verify on every generator run.
  - **GOVERNANCE §31** applies to any Copilot-visible
    artifact — the generator writes `.github/instructions/*`
    through the skill-creator-equivalent of the
    generator, not ad-hoc.
  - **Nadia (prompt-protector) lints** the generator's
    output. Covert-Unicode + homoglyph sweep on every
    mirror write.
  - **BP-09 ASCII-only** is already a rule; enforce it
    as a generator precondition.
  - No `.txt` for declarative files (Aaron's rule); the
    generator honours existing semantic extensions
    (e.g., `uv-tools` no-extension).

  **Open questions (for the design doc, not this entry):**
  - Does `.claude/agents/*.md` also need a portable
    form, or do we accept that persona frontmatter is
    Claude-Code-only? Leaning toward: agents stay
    Claude-only (they carry `skills:` hat wiring,
    tool-access scopes); skills port cleanly.
  - Should `memory/persona/` stay single-rooted or
    per-harness? Single-rooted is correct (it's
    agent-owned data, not harness config).
  - Is AGENTS.md the aggregation point or does every
    harness still need its own root file?

  **Effort estimate:** ~M. Design doc first (round-N+1),
  implementation the round after. Touches ~60 skill files,
  so the sweep-refs muscle memory from GOVERNANCE §30
  applies directly.

  **Why this matters post-public.** A stranger evaluating
  Zeta from Cursor reads zero of our factory rules today.
  The factory quality signal is invisible to 60%+ of
  modern AI-native developers.

- [ ] **Iris round-34 P0: README aspiration / reality
  framing** (round 34, public-repo triggered). README
  §"What Zeta adds on top" (lines 31-86) reads as
  shipped-today but many items are research-preview or
  post-v1. A consumer currently believes
  `DurabilityMode.WitnessDurable` is callable; it throws
  `NotImplementedException`. Route: Kai (framing decision)
  and Samir (README edit). Needs Aaron sign-off on the
  v1.0 vs post-v1 split before Samir edits. Proposal in
  [memory/persona/iris/NOTEBOOK.md](memory/persona/iris/NOTEBOOK.md)
  round-34 entry.
- [ ] **Iris round-34 P1: README DBSP-notation ↔
  GLOSSARY link** (round 34). README §"What DBSP is"
  introduces `z^-1`, `D`, `I`, `↑` with no link to
  GLOSSARY entries that already gloss them. Cheap fix,
  Samir-owned, S effort.
- [ ] **Iris round-34 P2: Circuit.fs module-level XML
  doc** (round 34). Two-step pattern (`Circuit.create()`
  → `circuit.ZSetInput<T>()`) not explained in file-level
  docs. Ilyana (API shape) + Samir (wording). S effort.
- [ ] **Copilot-instructions continuous improvement
  wiring** (round 34 ask from Aaron, follow-up). Needed:
  (a) GOVERNANCE §31 codifying the factory-managed
  contract, (b) skill-creator scope extension to
  `.github/copilot-instructions.md`, (c) Aarav
  (skill-tune-up-ranker) scope extension to include it,
  (d) Nadia (prompt-protector) scope extension.
- [ ] **Roll out `JOURNAL.md` to remaining personas + codify
  read contract** (round 34 ask from Aaron). Four piloted this
  round (Daya / Bodhi / Iris / Dejan). Append-only, never
  pruned, never cold-loaded, grep-only read discipline. On
  NOTEBOOK prune, entries that merit preservation migrate here
  rather than being deleted. Remaining personas to seed:
  Aarav, Aminata, Ilyana, Kenji, Kira, Mateo, Nadia, Naledi,
  Rune, Soraya, Tariq, Viktor (12). Also: add a BP entry
  codifying the grep-only contract + add to docs/WAKE-UP.md
  as a Tier 3 entry (read contract reminder). Open question:
  does the journal's read discipline need tooling
  (pre-commit hook blocking `cat JOURNAL.md` in agent
  transcripts) or does convention hold? Leaning toward
  convention first, tooling if drift surfaces.
- [ ] **`security-operations-engineer` persona + skill**
  (round 34 ask from Aaron). Runtime / incident-response /
  patch-triage / SLSA-signing-ops / HSM-key-rotation /
  breach-response. Distinct from Mateo (security-researcher
  proactive scouting) and Aminata (shipped threat model)
  and Nadia (agent layer). Slot added to EXPERT-REGISTRY
  as pending. Name queue open (candidates: none yet).
- [ ] **`openspec-gap-finder` skill** (round 32 ask). Viktor
  (spec-zealot) reviews spec-to-code alignment for an existing
  capability but doesn't scan the repo for capabilities shipped
  without a spec. Needs a new skill parallel to
  `skill-gap-finder` — spec-zealot role wears both via the
  Aarav pattern. GOVERNANCE §28 enforcement depends on this.
- [ ] **`static-analysis-gap-finder` skill** (round 33 ask).
  Aaron: "we need another gap analysis tool around static
  analysis and linting and tools and rules we maybe missing."
  Parallel to `openspec-gap-finder` + `skill-gap-finder`.
  Spec-zealot role wears all three gap-finders. Proactive
  lint discovery: enumerate committed languages/surfaces +
  check whether a matching linter is on the lint gate.
- [ ] **Crank lint configurations to HIGH across the board.**
  Aaron: "in general when there is static analysis
  configuration or linting things of that nature we want to
  crank it up to high." Round-33 baseline is mid-stringency;
  post-33 pass researches each tool's recommended-strict
  preset and adopts. Trigger: round 34, after round-33 Track D
  baseline has proven itself stable.
- [ ] **documentation-agent cadence.** Add documentation-agent
  to `factory-audit`'s every-10-rounds walk scope. Each walk:
  scan comments in config files + doc-to-code alignment +
  retired-file references. Round 33 surfaced multiple stale-
  comment issues that would have been caught by a scheduled
  doc-state audit.
- [ ] **Declarative-manifest setup matching `../scratch`'s
  tiered shape.** Zeta's `tools/setup/manifests/` is
  declarative-ish (`apt.txt`, `brew.txt`, etc.) but flat.
  `../scratch`'s `declarative/` has tiered profiles
  (`min`/`runner`/`quality`/`all`) per platform per tool.
  Push one incremental step per round — split `brew.txt` into
  tiers, then `.dotnet-tools` / `.bun-global` formats, etc.
- [ ] **Upstream sync script + `references/upstreams/`
  population.** `references/reference-sources.json` manifest
  exists; sync script referenced in README ("when it exists")
  does not. Build the script so `./tools/setup/sync-
  upstreams.sh` (or equivalent) reads the manifest, clones
  each upstream into `references/upstreams/<name>/`, keeps
  them fresh.
- [ ] **`upstream-comparative-analysis` skill.** Aaron round 33:
  "add a skill around upstream reference comparative analysis
  that will allow us to get ideas and such and compare our
  code with upstreams for inspiration." Skill procedure: pick
  a Zeta subsystem + matching upstream, produce a parallel
  walk highlighting shape / contract / perf / correctness
  differences. Owned by `tech-radar-owner` role; feeds
  `docs/TECH-RADAR.md` Adopt/Trial/Assess/Hold moves.
- [ ] **`product-visionary` role** (round 33 ask). Aaron: "we
  are likely going to need some product owner that drives the
  direction of the project when all the suggestions start rolling
  in from upstream … they should have a longer vision for this
  project." Owns `docs/VISION.md` as Aaron's proxy; runs the
  loop: upstream signals + research + novel ideas → vision check
  → backlog entry (or `WONT-DO.md` entry). Asks Aaron many
  clarifying questions, especially on direction-shifting items.
  Distinct from `branding-specialist` (messaging/positioning)
  and `backlog-scrum-master` (tactical grooming). Ships via
  `skill-creator` workflow. First audit when spawned: walk the
  "needs Aaron validation" list at the bottom of VISION.md.
- [ ] **Upstream categorisation audit (multi-round).** Aaron
  round 33: "we probably need some upstream maintenance to
  make sure all the categories are good and correct and make
  sense for our project because we were not thinking as deeply
  as we are now so there might be better categorisation." The
  `categories` field in `references/reference-sources.json`
  and the grouping prose in `references/README.md` were
  written incrementally and may no longer reflect Zeta's
  current mental model. Walk every upstream, re-read our
  current research notes, propose better categories. Spread
  across multiple rounds (long task requiring many internal
  searches); each round picks a sub-tree.
- [ ] **Post-install repo automation: runtime choice open
  (research needed).** `tools/setup/install.sh` (bash) owns
  bootstrap; post-install polyglot automation (format-repo,
  coverage-collect, benchmark-compare, lint orchestration)
  benefits from one cross-platform runtime. Aaron: "IDK if
  I want to stick with [Bun+TS] which is why i want the
  research." Candidates: Bun/Node, Deno, Python (on PATH
  via mise), .NET console tools, others. Write a design doc
  comparing cold-start, install weight, type safety,
  ecosystem breadth. Trigger: first post-install automation
  task that would need cross-platform scripting.
- [ ] **Devcontainer / Codespaces image (GOVERNANCE §24
  third leg).** Two-leg parity (dev + CI) is today;
  devcontainer closes three-leg parity for first external
  contributor onboarding. Dockerfile calls
  `tools/setup/install.sh`.
- [ ] **Windows CI matrix + Windows install path
  (`tools/setup/windows.ps1`).** Trigger: stable green on
  mac + linux for N rounds, OR named Windows consumer.
  Windows install will be PowerShell, not Git Bash (Git Bash
  is not guaranteed installed).

## P1 — CI / DX follow-ups (after round-29 anchor)

- [ ] **Full mise migration.** Round 29 adopts `.mise.toml`
  for `dotnet` + `python` only. When a mise plugin exists
  for Lean (elan / lake / lean-toolchain) and for any
  other tool we still install outside mise, migrate and
  retire the bespoke installer. Aaron: *"long term plan
  is mise."*
- [ ] **Incremental build + affected-test selection.**
  Aaron (round 29): *"If you want to get us to a point
  where we can do incremental builds with a build cache
  too I would love that, then we could only run the
  tests who were affected."* Substantial work — needs
  a module-dependency graph, a build-cache story (Nuke?
  bespoke?), and a mapping from changed files to
  impacted test IDs. Probably a round of its own.
- [ ] **Comparison PR-comment bot.** Coverage / benchmark /
  verifier-output diffs between the head SHA and the
  base SHA, published as a PR comment. `../SQLSharp` has
  this shape for coverage + benchmarks; Zeta defers
  until we have something worth diffing. Aaron: *"we
  don't need the comparison yet, we can do that later."*
- [ ] **Windows matrix in CI.** Trigger: one week of green
  runs on `ubuntu-22.04` + `macos-14` — no pre-arranged
  "breaking test" required. Aaron: *"let's just do it
  once we are in a stable spot with mac and linux."*
  Requires the install script to grow Windows support
  (PowerShell bootstrap or WSL path) first.
- [ ] **Parity swap: CI's `actions/setup-dotnet` →
  `tools/setup/install.sh`.** Round-29 first workflow
  uses `actions/setup-dotnet@<sha>` for speed. Per
  GOVERNANCE.md §24, the parity target is CI running
  the same install script dev laptops and
  devcontainers run. Swap in once the install script is
  stable across macOS + Linux runners.
- [ ] **Devcontainer / Codespaces image.** Dockerfile
  at `.devcontainer/Dockerfile` that runs
  `tools/setup/install.sh` during image build, plus
  `.devcontainer/devcontainer.json` metadata. Closes
  the third leg of the three-way parity per
  GOVERNANCE.md §24.
- [ ] **Open-source-contribution log.** A rolling ledger
  (probably at `docs/UPSTREAM-CONTRIBUTIONS.md`) of PRs
  Zeta has opened against upstream projects per
  GOVERNANCE.md §23 — what shipped, what's pending,
  what's blocked. Aaron's mise-dotnet-plugin PR is the
  first entry.
- [ ] **Branch-protection required-check on `main`.**
  Trigger: one week of clean CI runs. Required check
  lands once we trust the signal.

## P0 — Threat-model elevation (round-30 anchor)

- [ ] **Nation-state + supply-chain threat-model rewrite.**
  Aaron at round-29 close: *"in the real threat model we
  should take into consideration nation state and supply
  chain attacks."* He helped build the US smart grid
  (nation-state defense work) and is a gray hat with
  hardware side-channel experience. The current
  `docs/security/THREAT-MODEL.md` is under-scoped for
  this adversary class.

  **Scope:**

  - `docs/security/THREAT-MODEL.md` adversary-model
    revision: advanced persistent threat + nation-state
    - sophisticated supply-chain adversary as
    first-class threat classes, not box-ticks.
  - Expanded supply-chain coverage: package registries
    (NuGet, Mathlib, Homebrew formulae), build
    toolchain (dotnet SDK, elan, mise installers), CI
    runners (GitHub Actions runner image compromise,
    runner-level persistence), third-party actions
    (beyond our SHA-pin mitigation), dep-graph attacks.
  - Every mitigation validated against a real control
    (code / governance rule / CI gate / reviewer
    cadence). Unenforced mitigations are gaps, not
    mitigations.
  - Side-channel + hardware adversary coverage (timing,
    cache behavior, microarchitectural leaks,
    speculative execution for tenant-isolated
    deployments).
  - Nation-state-level response playbook: what happens
    if actions/checkout is compromised? mise.run is
    hijacked? NuGet serves a poisoned package? Written
    *before* we need it.
  - `docs/security/THREAT-MODEL-SPACE-OPERA.md`
    completed as the serious-underneath-the-fun
    variant — every silly adversary maps to a real
    STRIDE class + real control + real CVE-style
    escalation path.

  **Primary:** `threat-model-critic` on the doc
  authoring. **Secondary:** `security-researcher` on
  novel attack classes, current CVE landscape,
  advisory-tracking. **Consulting:** Aaron, on
  nation-state-adversary modeling (his domain).

## P0 — CI / build-machine setup (round-29 anchor)

- [ ] **First-class CI pipeline for Zeta.** Every agent-written
  commit eventually has to pass the same gate a human commit
  does; right now the only gate is `dotnet build -c Release`
  on the maintainer's laptop. Aaron's framing (round 28):

  > "Our CI setup is as first class for this software factory
  > as is the agents themselves, it does not ultimately work
  > without both."

  Discipline rules committed up front:

  1. **Read-only reference.** `../scratch` is the model for
     build-machine setup (scripts, installers, install
     locations, tool pins). `../SQLSharp` is the model for
     GitHub Actions workflows. **Never copy files.** Read to
     understand the shape and the intent; hand-craft every
     artefact from scratch for Zeta so no cruft or
     assumptions from another repo's context sneaks in.
  2. **Human review on every decision.** Aaron reviews the
     OS matrix, tool versions, caching strategy, artefact
     retention, secret handling, permissions model, workflow
     triggers, and the per-job concurrency/timeout settings
     before any workflow lands. This is *not* a place for
     "ship and iterate".
  3. **Cost discipline.** CI minutes are the expensive
     resource. Every job earns its slot: justify any
     matrix-axis expansion, any scheduled run, any
     always-on-PR gate. Default to narrow (one OS, one
     dotnet, current branch only) and widen only with a
     stated reason.
  4. **Cross-platform, eventually.** Zeta is cross-platform
     (.NET 10, macOS arm64 dev box, Linux CI, Windows
     supported). Aaron can run rounds on Windows when
     Windows-specific work is under way; say so when useful.
     CI matrix should cover at least macOS + Linux; Windows
     gets added once we have a Windows-breaking test to
     justify the slot.
  5. **Parallelism note.** Product work and CI work run on
     one maintainer machine but rarely interfere at the
     shell level. Architect is free to dispatch CI-design
     subagents in parallel with product work as long as
     neither agent writes the same file.

  **First sub-tasks (round-29 anchor; each its own Aaron
  review gate):**

  1. Audit `../scratch` for install-script patterns (what
     tools, what versions, what pinning method, what target
     paths). Output: a design doc at
     `docs/research/build-machine-setup.md` citing every
     borrowed idea and nothing else. No file copies.
  2. Audit `../SQLSharp` `.github/workflows/` for workflow
     shape (triggers, jobs, matrix, caching, permissions).
     Output: a design doc at
     `docs/research/ci-workflow-design.md`.
  3. Map Zeta's actual gate list: `dotnet build`,
     `dotnet test`, Semgrep, Alloy (needs JDK), Lean proofs
     (needs elan/lake), TLC (needs JDK + tla2tools.jar),
     Stryker (slow — scheduled not per-PR), FsCheck tests.
     Output: a gate inventory at
     `docs/research/ci-gate-inventory.md`.
  4. First workflow: `build-and-test.yml` covering
     `dotnet build -c Release` + `dotnet test Zeta.sln -c
     Release` on `ubuntu-latest` + `macos-latest`. Nothing
     else until Aaron has signed off on the gate list.
  5. Subsequent workflows added one at a time, each with
     explicit Aaron sign-off on the design doc first.

## P0 — security / SDL artifacts

- [ ] **`docs/security/CRYPTO.md`** — justify CRC32C (integrity, not
  auth) vs SHA-256 (future roadmap for tamper-evident checkpoint
  manifests).
- [x] ✅ **5 new Semgrep rules** (SDL-derived): unchecked deserialization,
  `File.ReadAllBytes` on user path w/o size cap, `Process.Start`,
  `Activator.CreateInstance` from untrusted type string,
  `System.Random` in security context. Shipped round 17 as rules
  8-12 in `.semgrep.yml`.
- [ ] **CodeQL workflow** — `.github/workflows/codeql.yml`, SDL
  practice #9.
- [ ] **pytm threat model** — `docs/security/pytm/threatmodel.py`
  replaces markdown-only threat-model as authoritative source.

## P1 — within 2-3 rounds

- [ ] **Software-factory design — roles vs personas vs
  skills architecture.** This is foundational work on the
  Zeta software-factory pattern, not just on one repo's
  agent layout. Everything we ship here informs the
  factory-paper deliverable
  (`docs/research/factory-paper-2026-04.md`) and the
  competitive analysis against MetaGPT / ChatDev /
  AutoGen / CAMEL / SWE-Agent / AutoCodeRover.

  Aaron round-27: "this project needs certain roles but
  any agent can satisfy the role and move around over
  time. So we have named agents, who have unique personas
  and are assigned to a role, skills can be assigned to
  the persona or the role because certain roles will
  require a skill."

  Current state conflates all three: `.claude/agents/<role>.md`
  filenames are role-keyed, persona names live inside the
  file (Kenji = architect), skill assignments are in the
  frontmatter of the persona file. A persona cannot be
  reassigned to a different role without renaming files;
  a role cannot exist without a persona filling it; role-
  level skill requirements cannot be expressed separately
  from the persona's own capabilities. Every other AI
  factory system we have surveyed has a variant of this
  conflation — resolving it cleanly is a real research
  contribution, not just plumbing.

  **Design targets** (open questions, not decisions):
  - **Separation of concerns.** Role = requirement
    (what the seat needs to do). Persona = named agent
    with unique voice / stance / memory (who is doing
    it). Skill = capability, attachable to either.
  - **Dynamic assignment.** A persona moves between
    roles across rounds. Roles may be temporarily
    vacant. Multiple personas can share a role if the
    role is plural (e.g. two reviewers).
  - **Skill attachment.** Some skills attach to roles
    (every architect needs `round-management`); some to
    personas (Kenji personally carries `holistic-view`);
    some to both. Frontmatter schema needs to
    distinguish.
  - **File-system layout.** Candidate:
    `.claude/roles/<role>.md` (requirements) +
    `.claude/personas/<persona-name>.md` (individuals) +
    an assignments manifest. Persona memory already at
    `memory/persona/<persona-name>/` post-round-27,
    so that side is aligned.
  - **Backward compatibility.** Pre-v1 repo; breaking
    changes are cheap. Migration is mostly renaming
    files and updating cross-refs.

  **Prior art to survey** (research before design):

  *AI / software-factory systems:*
  - **MetaGPT** (Hong et al. 2023) — SOPs and role
    assignment for Product Manager / Architect /
    Engineer / QA Engineer.
  - **ChatDev** (Qian et al. 2023) — "software
    development virtual company" with role-scoped
    phases.
  - **AutoGen** (Microsoft 2023) — multi-agent
    conversation patterns; agent-type vs agent-instance
    distinction.
  - **CAMEL** (Li et al. 2023) — role-playing
    user-agent / assistant-agent framework.
  - **SWE-Agent** (Yang et al. 2024) — agent-computer
    interface; roles implicit in tools rather than
    personas.
  - **AutoCodeRover** (Zhang et al. 2024) — specialised
    agents for reproduce / locate / fix cycle.

  *General role-separation patterns:*
  - **IFS (Internal Family Systems)** — Self / Parts /
    Roles; loosely borrowed in
    `docs/CONFLICT-RESOLUTION.md`.
  - **DCI (Data-Context-Interaction)** — Reenskaug's
    pattern separating role-playing from object
    identity. Smalltalk / Ruby communities.
  - **RBAC (Role-Based Access Control)** — principals /
    roles / permissions; NIST RBAC model.
  - **Agile ceremonies** — Product Owner / Scrum Master
    / Developer are roles; people rotate through them.
    Scrum Guide separation is useful precedent.
  - **RACI matrices** — Responsible / Accountable /
    Consulted / Informed as role-assignment primitive.
  - **Theater / improv troupes** — actor vs character
    vs role. Understudy patterns. Ensemble casting.
  - **Military rank / role / individual** — three-level
    separation with mutual independence.
  - **DCR graphs** (Hildebrandt et al.) — formal role
    semantics for workflows.

  **Deliverable:** `docs/research/factory-roles-design.md`
  (note: factory-level, not Zeta-repo-level) with:
  - Prior-art survey: 1-2 paragraphs per candidate above,
    grouped by AI-factory systems vs general role
    patterns.
  - Chosen model with justification (drawing from the
    best parts of the prior art).
  - Concrete schema: frontmatter shape for roles /
    personas / skills; file-system layout; assignment
    manifest format.
  - Migration path for the current 25-seat roster.
  - Publication hook: how this design differentiates
    Zeta's factory from MetaGPT / ChatDev et al.,
    feeding the factory-paper draft.

  Land the design first; migration is its own round.

  **Why P1 rather than P2:** every persona decision
  (spawn / retire / reassign) currently re-opens this
  question. Resolving the model makes round 28+ roster
  decisions proceed without relitigating the shape each
  time, and gives the factory-paper a concrete
  contribution to point at.

  **Bootstrap discipline to preserve.** When this factory
  pattern becomes reusable (template / starter / docs for
  adopters), carry forward the "first-time consequential
  repo-shaping actions need explicit maintainer
  authorization" rule. Concrete instance from Zeta's
  history: an agent initialising git prematurely on a
  fresh repo before the maintainer was ready. The
  specific git-init example is obsolete for Zeta (we're
  past init), but the general principle — agents don't
  take first-time, hard-to-reverse, repo-shaping actions
  without explicit authorization — belongs in the
  adopter-facing bootstrap guide. Place it alongside
  CLAUDE.md's existing reversibility / blast-radius
  discipline; the bootstrap context adds "and first-time
  on a fresh repo is a special case of consequential."

- [ ] **Wire HLL from `Sketch.fs` into `Plan.estimate`** (query-planner
  P1, Imani). `src/Core/Plan.fs:28-51` currently uses static
  heuristics (filter /2, groupBy /4, 1024L unknown); real per-input
  cardinality needs `HyperLogLog` sketches per input stream plugged
  into the `inputRows` array path. Research context:
  `docs/research/proof-tool-coverage.md` (sketch-accuracy bounds).
  The current docstring is honest about the gap; this item is the
  wiring work itself.
- [ ] Port the CommitBoundary + frame-first/header-second protocol
  into `DiskSpine.fs` (3 P0 items from a prior deep-review)
- [ ] `ISimulationDriver` unification (VT scheduler + ChaosEnv +
  ISimulatedFs) — captured in `docs/FOUNDATIONDB-DST.md`
- [ ] Content-addressed batches — wire `MerkleHash` through Spine
  to replace `nextId`
- [ ] TLA `.cfg` for remaining 4 specs (ChaosEnvDeterminism,
  ConsistentHashRebalance, DictionaryStripedCAS,
  AsyncStreamEnumerator, SpineMergeInvariants-fix)
- [ ] `Dbsp.LearnedPlan` project — ML.NET AutoML → ONNX Runtime
  scoring (round-12 agent design); full design review first
- [ ] MI-optimal partition from arXiv:2402.13264 §4 (stronger than
  current greedy 2-approx)
- [x] ✅ Beam ACC/DISC/RET mode-collapse property tests — shipped
  round 17 in `Round17Tests.fs` (aggregate-under-mode simulator +
  direct Z-set retract-reinsert test).
- [ ] `github-pr-review-hygiene` skill to port in from prior
  research (no DBSP equivalent yet)
- [ ] Arrow IPC direct-write path — harsh-critic #15, eliminate the
  three-copy `MemoryStream → ToArray → CopyTo` dance
- [ ] Bayesian alpha ≤ 1 guard + tests for VarianceOfMean edge case
  (harsh-critic #19)
- [x] ✅ Upstream-list adoption as `docs/UPSTREAM-LIST.md` —
  shipped round 17.
- [ ] **Empathy-coach persona — IFS empathy-file keeper
  (title and name pending).** A persona whose job is to keep
  the IFS (Internal Family Systems) empathy files updated.
  Any persona can dispatch to this seat for friction or
  stuck-feeling surfacing; the seat can proactively reach
  into any persona's notebook to update empathy-file entries.
  **Do not label this persona "therapist", "counselor",
  "psychologist", or any regulated clinical title** — AI
  calling itself a regulated clinical role is legally
  hazardous. Safer candidates: *empathy coach*, *integration
  coach*, *relational steward*, *culture keeper*, *self-work
  steward* (IFS-native — "Self" is the integrating
  consciousness, not a clinical term).
  Scope: holds `docs/CONFLICT-RESOLUTION.md` as the working
  artifact. Relates to GOVERNANCE.md §17 (productive friction) —
  this seat sits *with* the friction rather than resolving
  it. Open design questions: (a) title (see safer candidates
  above), (b) personal name, (c) per-persona coaching-log vs
  shared log, (d) edit rights on `docs/CONFLICT-RESOLUTION.md`
  and per-persona notebooks, (e) cadence — round-close sweep
  vs on-demand only. Kenji + Daya pair on design; Daya's AX
  lens matters because wake-up cost for this seat needs to
  stay low (invoked from many contexts).

- [ ] **Dedicated agent-memory system (two-layer).** Two
  layers of memory, both off the main docs tree so agents
  stop writing history everywhere trying to save memories:
  (a) **shared** — cross-cutting facts / rules / lessons
  that apply to every persona. Lives at
  `memory/` (outside git,
  project-wide, Claude's auto-memory folder).
  (b) **per-persona** — each seat's unique lens, style,
  and working notes (e.g. Daya's cold-start audit
  heuristics, Viktor's overlay discipline). Lives at
  `memory/persona/<persona>.md` (in git when git lands;
  3000-word cap; ASCII-only). Per-persona memory is
  essential — if every seat shares every memory, all seats
  collapse to a single averaged voice. Design work: codify
  the layering as a GLOSSARY.md canon entry, formalise
  write-rules (which layer takes which kind of memory),
  ensure personas read their own notebook BEFORE any shared
  memory so individual voice dominates over averaged voice.
  Also handle: agents without a canonical write target
  invent random ones, so the two target paths must be
  discoverable from cold start. Pairs: Kenji + Daya.

## P1 — architectural hygiene

- [ ] **TLC-validation as a `dotnet test` target.** Every `.tla` spec
  under `docs/` should be TLC-exercised in CI so spec drift becomes a
  build break, not a quarterly rediscovery.
- [ ] **Roslyn / F# analyzer for blocking-wait patterns.** Ban
  `Task.Result`, `.Wait()`, and `GetAwaiter().GetResult()` on the
  production F#/C# surface. Currently caught by review; lift it into
  the build.
- [ ] **F#/Roslyn analyzer for mutable public setters on options/
  config/plan shapes.** Types like `*Options`, `*Plan`, `*Descriptor`
  should be init-only or immutable by construction. Reviewer catches
  it; promote to analyzer.
- [ ] **`coverage:collect` + `coverage:merge` entry points.** The
  `coverage-report/` folder is gitignored; current collection is
  ad-hoc per-dev. Land a reproducible Cobertura merge that the normal
  `dotnet test` run produces, with a loud-failure mode when a project
  stops emitting coverage artifacts.
- [ ] **Deterministic-path helper for tests needing filesystem
  uniqueness.** Replace any ad-hoc `Guid.NewGuid()` test-path noise
  with a process-local deterministic counter so reruns diff cleanly.
- [ ] **Typed optimistic-append outcomes on every `IAppendSink`.** The
  abstraction already distinguishes `AppendResult.Success` /
  `.Conflict`; make sure every new sink implementation preserves that
  shape rather than raising for the conflict case.
- [ ] **FASTER-style HybridLog region model for any future persistent
  state tier.** Memory / read-only / stable regions with explicit
  boundaries, instead of a single flat file with region pointers bolted
  on later.
- [ ] **Copy-reduction on the durable-commit path.** Batching and
  group-commit first, then measure before reaching for direct/unbuffered
  I/O or other exotic modes.

## P2 — research-grade

- [ ] **Witness-Durable Commit paper** — target ACM SoCC or VLDB
  industry; claim: buffered durable linearizability with
  O(root) sync bandwidth vs O(payload)
- [ ] **Closure-table over DBSP** — target ICDT/PODS; claim: first
  retraction-native incremental transitive closure with tropical-
  semiring shortest-path free variant
- [ ] **Retraction-native speculative watermark** — target DEBS/
  VLDB; claim: DBSP's retraction algebra subsumes Beam's ACC/
  DISC/RET modes as a single linear operator
- [ ] Lean 4 chain-rule proof with Mathlib (2-week effort)
- [ ] CAS-DBSP: FastCDC + Merkle + content-addressed batches as a
  unified paper (~VLDB 2026)
- [ ] ILP-relaxed MaxSAT spine scheduling with online warm-start
- [ ] Semiring-parametric Z-sets (tropical / Boolean / distributive
  lattice)
- [ ] Full `Zeta.Core.CSharp` shim with variance on every generic
  seam
- [ ] Sakana AI Scientist / Agent Laboratory investigation (limited
  trial, Lit-Review phase only)
- [ ] **Friendly-competition tracking** — systematic study of
  MetaGPT, ChatDev, AutoGen, CAMEL, SWE-agent, AutoCodeRover,
  Agentless as upstreams and references for the software-
  factory paper track. Goal: know which patterns we have that
  they don't, which we should steal, and which they've already
  published so our writeups cite honestly — studying the
  friendly competition is how we know whether our ideas are
  genuinely novel. Landing surface:
  `docs/research/friendly-competition.md`. Effort: 1 day
  initial survey + rolling updates on new paper drops. Wired
  into Jun (TECH-RADAR) for ring-assignment of each tool.

## P3 — noted, deferred

- CalVin/FaunaDB-style deterministic sequencer MVCC (FaunaDB shut 2025)
- GPU OLTP (irrelevant to .NET)
- io_uring wrappers (no first-class .NET support)
- TPM/Intel SGX hardware-attested commits

## ⏭️ Declined

- SQLite-derived on-disk format (per AGENTS.md greenfield policy)
- "All MAJOR bumps are risky, defer" heuristic (Meziantou 2→3 proved
  this wrong)
- autoresearch by Karpathy as a platform (200-LOC teaching scaffold,
  not a research pipeline)
- Preserving v0 backward compatibility (no users yet)

---

## Source of this backlog

- `docs/MISSED-ITEMS-AUDIT.md` — per-round sweep
- `docs/ROADMAP.md` — research opportunities + CFP targets
- Harsh-critic round findings
- Research-agent proposals (WDC, Hierarchy, SDL, Sakana/AgentLab/SlateDB)
- User asks in conversation

## Meta

- Every ✅ shipped item should cite a test or benchmark that proves it works
- Every P0 item should have a `tests/*ClaimTests.fs` target when shipped
- Every P2 research item should name its publication venue target
