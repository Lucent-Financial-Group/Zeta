# Repo-split round 3: the union is the bottleneck — dependency closure measured against change rate

Status: **design**, built on **measured** dependency and CI data. Every
quantitative claim carries its command and window. Non-measured claims are
labelled `toy` or `unmetered` per
[`toy-is-free-metered-must-be-earned`](../../.claude/rules/toy-is-free-metered-must-be-earned.md).

Basis: `origin/main` at `42b56aead` (2026-08-19), fresh clone. Toolchain sizes
measured on the Mac Studio the same day. CI figures read from the GitHub Actions
API, not asserted.

Round 2 (`6fe1c74d9a`,
`docs/research/2026-08-19-repo-split-round-2-*.md`) measured the **change-rate**
partition. This round measures the **dependency-closure** partition and puts the
two together. It does not re-derive round 2.

---

## 0. The hypothesis under test — stated by Aaron, not discovered here

> *"this is my key observation over the years trying to work with mono repos,
> without hardcore tooling support for monorepo, the union of everything becomes
> the bottleneck, splitting it out actually can speed things up and help
> decouple everything from everything"* — Aaron, 2026-08-19

This is a **prior formed across years and other codebases**, not a conclusion
drawn from this tree. So this document's job is not to discover whether closure
splitting helps. It is to **measure how much it helps here, and where it does
not**, and to say so either way.

The hypothesis is precise enough to be falsifiable, which is what makes it worth
measuring. It claims: absent per-target build tooling (Bazel / Nx / Pants class),
every job pays for the **union** of all dependencies rather than the **subset**
it needs, so cost and fragility scale with the whole tree instead of with the
change. Three quantities follow directly, and §§3-5 compute all three:

1. the **current union** — what every job provisions today
2. the **per-candidate subset closure** — what each cut would actually need
3. the **delta** between them

**Result up front, so the rest can be checked rather than trusted:** the
hypothesis holds on this tree, by a wide margin, and the mechanism is even more
specific than stated. But §10 finds that the conditional in Aaron's sentence —
*without* tooling support — is **not** currently true here in the way it appears:
the tooling is 90% built and unwired. That changes the option set, and it is the
most decision-relevant finding of the round.

---

## 1. The anchors, checked rather than cited

Per [`anchor-to-human-prior-art`](../../.claude/rules/anchor-to-human-prior-art.md),
each anchor below is checked for **entailment** — does it actually support the
claim attached to it?

**Robert C. Martin, package cohesion principles (1996; *Agile Software
Development* 2002; *Clean Architecture* 2017).** The direct hit, and it names
this round's axis and round 2's axis as a matched pair:

- **CCP — Common Closure Principle:** *classes that change together belong
  together.* That is round 2's change-rate axis, exactly.
- **CRP — Common Reuse Principle:** *classes used together belong together*
  (equivalently: don't force a consumer to depend on things it doesn't use).
  That is this round's dependency-closure axis, exactly.

**Entailment check — does Martin support the "tension" claim?** Yes,
explicitly. Martin's tension diagram places REP/CCP/CRP at the vertices of a
triangle and states that CCP and CRP pull in **opposite directions**: CCP is
inclusive (make packages bigger so a change lands in one place), CRP is
exclusive (make packages smaller so consumers don't drag in what they don't
use). He states the trade-off is a design **position**, not a defect to be
eliminated. So the anchor entails the framing this doc uses. The one thing
Martin does *not* supply is where to sit on that axis for a given codebase —
that is what measurement is for, and it is what §9 does.

**Parnas 1972, "On the Criteria To Be Used in Decomposing Systems into
Modules."** The root anchor. **Entailment check:** Parnas argues against
decomposing by processing steps (flowchart order) and for decomposing by
*what is likely to change*, hidden behind interfaces. That entails round 2's
axis directly and this round's only indirectly — a dependency edge is a
mechanical fact, not a secret. Recorded honestly: Parnas is the **CCP**
ancestor, not the CRP one. Citing him for the closure axis would be a real paper
attached to a claim it does not prove.

**Evans 2003, bounded context (DDD).** Aaron named DDD, so anchor it properly —
and state the limit, because conflating these would be the error of the round:

> A **bounded context** is a *semantic* boundary — the span within which a term
> has one unambiguous meaning, with a model and a ubiquitous language. A
> **dependency closure** is a *mechanical* boundary — the transitive set of
> artifacts a build needs. They are **not the same thing**, and neither implies
> the other.

Where they coincide is evidence (a mechanical partition that also carves clean
semantics is a strong cut). Where they diverge, **this document is using the
mechanical one**, and says so at each cut. What is measured below is closure.
Nothing here measures semantic coherence, and no claim about bounded contexts is
made from a dependency graph.

**Bazel / Nixpkgs.** Already the in-tree anchors of `build-graph.ts` (§10),
quoted there rather than re-introduced here.

---

## 2. The dependency graph, from the repo's own manifests

Built mechanically, not eyeballed. Sources: `<ProjectReference>` /
`<PackageReference>` in 59 `.fsproj`/`.csproj`, `[dependencies]` /
`[dev-dependencies]` in 36 `Cargo.toml`, `dependencies` / `devDependencies` in
16 `package.json`, `require` in 3 `go.mod`, plus `lakefile.toml` and
`pyproject.toml`.

| kind | units | distinct external deps |
|---|---|---|
| node | 16 | **107** |
| dotnet (F#) | 30 | 25 |
| dotnet (C#) | 29 | 16 |
| go | 3 | 12 |
| rust | 36 | **4** |
| lean | 2 | 0 |

Three results worth stating before any cut is drawn.

**The Rust tier is externally near-empty by doctrine.** All 36 crates share
**four** external crates between them — `serde`, `serde_json`, `blake3`,
`xxhash-rust` — and the first two are dev-only. `Core.Rust.Algebra`'s manifest
says it out loud: *"Production = ZERO external dependencies (supply-chain
doctrine)."* A tier with no external closure is trivially relocatable.

**`src/Core.TypeScript/*` sub-packages declare zero external dependencies.**
Seven of them (`blake3`, `merkle`, `metric`, `sha256`, `society`, `yaml`,
`zeta-id`) have empty dependency sets. The root `package.json` carries 33.

**The 107-dep node figure is two websites, not the factory.**
`demo/identity-dla-site` (73) and `src/Renderers/website` (73) dominate. That
closure is disjoint from everything else in the tree.

**Go's 12 externals are entirely k8s/SPIFFE/NATS** — `k8s.io/{api,apimachinery,client-go}`,
`sigs.k8s.io/controller-runtime`, `github.com/spiffe/go-spiffe/v2`,
`github.com/nats-io/nats.go`. Zero overlap with any other unit's closure.

**Housekeeping finding, unrelated to the split but found by the same fold:**
`Zeta.sln` carries 85 projects; the manifest scan finds 116 build units, of
which 9 are not live — including a `.fsproj` inside
`docs/recovered-orphan-branches-2026-05/` (an archived artifact that still parses
as a project) and `genesis/_src/auth-backend/GenesisAuth.csproj` (not in the
solution). Named so a later reader does not count them as build surface.

---

## 3. The union, measured

MEASURED on the Mac Studio, 2026-08-19, one version of each toolchain
(`du -sk`; the machine holds six Lean toolchains and two Rust toolchains — one
of each is counted):

| component | MB | | component | MB |
|---|---:|---|---|---:|
| lean (elan, 1 toolchain) | 2,600 | | uv | 179 |
| llvm | 1,700 | | bun | 178 |
| rust (rustup toolchain) | 1,300 | | python | 142 |
| dotnet SDK | 1,228 | | mypy | 67 |
| emscripten | 953 | | shellcheck | 58 |
| dotnet tools | 806 | | golangci-lint | 37 |
| node | 684 | | 1password-cli | 37 |
| java | 377 | | ruff | 23 |
| zig | 352 | | markdownlint-cli2 | 13 |
| semgrep | 301 | | actionlint | 5 |
| go | 258 | | yamllint | 1 |
| cargo registry | 234 | | | |

**Union: 11,533 MB across 23 components.** That is the union a *developer clone*
converges on — `tools/setup/common/smoke-13-toolchains.sh` enumerates it as
"13 toolchains" plus the lint tier.

**Honest correction to my own figure, and it matters.** CI does **not**
provision all 11.5 GB. The measured GitHub Actions cache entry
`install-v2-Linux-X64` is **1,487 MB**, and `mise-Linux-X64` is 825 MB. So the
CI union is ~1.5-2.3 GB, not 11.5 GB — Lean, LLVM and Emscripten are not in the
standard CI path (the `elan` caches total **11 MB across 3 entries**, i.e.
effectively empty). Two different unions, answering two different questions:

- **developer-clone union — 11,533 MB.** This is the "cache size per repo"
  Aaron named.
- **CI standard-tier union — ~1.5 GB per job restore.** This is what the gate
  pays.

Both are used below, each labelled. Conflating them would inflate the result by
7x, and the first draft of §5 did exactly that until the cache API was read.

---

## 4. What each CI job actually needs

Derived mechanically: parse `gate.yml` into jobs, extract only the shell text of
`run:` steps (dropping comments and cache-path globs, which name `~/.dotnet`,
`~/.rustup` and `~/.elan` and produced a false positive on the first pass), then
resolve `bun <script>.ts` **one hop** into the script and detect what *it*
spawns. That second hop is load-bearing: `lint-fsharp` looks like a bun job and
in fact shells out to `dotnet format`.

| gate.yml job | real toolchain need |
|---|---|
| build-and-test | bun, dotnet |
| lint (semgrep) | semgrep, python, uv |
| lint-semgrep-drift | semgrep, python, uv |
| lint-shell | shellcheck |
| lint-markdown | bun, node, markdownlint-cli2 |
| lint-fsharp / lint-csharp | bun, dotnet |
| lint-go | bun, go, golangci-lint |
| lint-python | bun, python, uv, ruff, mypy |
| lint-rust | bun, rust, cargo |
| **cross-verify** | **bun** |
| **test-typescript-hermetic / -environment** | **bun** |
| **lint-typescript** | **bun** |
| **lint-tick-history-order** | **bun** |
| **lint-no-conflict-markers** | **bun** |
| **lint-archive-header-section33** | **bun** |
| **lint-section-33-migration-xrefs** | **bun** |
| **lint-tick-shard-relative-paths** | **bun** |
| **lint-bash-retirement-inventory** | **bun** |

**20 jobs run `Install toolchain via three-way-parity script`. Ten of them —
half — need exactly one component: `bun`, 178 MB.** Against the developer-clone
union that is a **65x over-provision**; against the ~1.5 GB CI union it is
**8x**. Both figures are real; the second is the one CI pays.

**`cross-verify` needing only bun is a correction to round 2.** Round 2 named
the byte-lock rendezvous as "the sharpest constraint on any `src/`-crossing cut."
That was half right and the half that was wrong matters: the oracle outputs are
**committed**, so *verification* needs no compiler at all — only *regeneration*
does, and regeneration happens in per-language test suites, not in
`cross-verify`. The rendezvous constrains **who may regenerate**, not **who may
check**. A split that keeps regeneration atomic per language and verification
central is therefore cheaper than round 2 priced it. Recorded as a changed
conclusion, not quietly amended.

**One job genuinely needs the union: `full-verify`** ("all 7 languages +
E-prover", `if: code == 'true'`). Exactly one. That is the honest denominator —
the union is not useless, it is useful **once**.

---

## 5. The delta, and the cache ceiling that turns it into failures

### 5.1 Provisioning waste per gate run

Using the CI union and the per-job needs above:

| quantity | value |
|---|---|
| jobs installing the union | 20 |
| union footprint per job (developer-clone accounting) | 11,533 MB |
| provisioned today (jobs x union) | 225.3 GB |
| provisioned if each job took its subset | 13.1 GB |
| **waste** | **94% of provisioning work** |

Under the CI-union accounting (~1.5 GB/job) the same table gives ~30 GB
provisioned against ~4 GB needed — **~87% waste**. The two accountings differ in
magnitude and agree in sign and rough proportion, which is the useful property.

### 5.2 The green-run cost, measured

Run `32281902548`, a **successful** main gate run:

```
25 jobs · 7,766 runner-seconds total · 2,830 seconds in `Install toolchain`
```

**36% of all job wall-time on a good day is toolchain provisioning.** Not the
build. Not the tests. The install.

### 5.3 The cache is over its ceiling, and GitHub names the failure mode

MEASURED, `GET /repos/.../actions/cache/usage`:

```
active_caches_size_in_bytes: 12,419,296,826   (11.57 GB)
active_caches_count:         31
```

By key prefix: `full-verify-v2` 4,465 MB (3), `mise` 1,541 MB (2), `install-v2`
1,487 MB (1), `nuget` 1,088 MB (3), `dotnet` 819 MB (2), `elan` **11 MB** (3).

CHECKED against GitHub's own documentation (dependency-caching reference, read
2026-08-19), not cited from memory:

> the standard cache storage limit is **10 GB per repository** … "the cache
> eviction policy will create space by deleting the caches in order of last
> access date, from oldest to most recent" … frequent eviction causes
> **"cache thrashing, where caches are created and deleted at a high
> frequency."**

**Zeta measures 11.57 GB against a documented 10 GB default.** So unless the
ceiling has been raised — which I could not verify; the usage-policy endpoint
returns `Not Found` at my permission level, and it is a one-click check in
Actions settings — this repository sits in the regime GitHub itself calls cache
thrashing.

**Register: the ceiling comparison is `metered`; the causal chain below is
`consistent with`, not established.** I did not instrument a cache miss.

### 5.4 Today's failures, attributed

MEASURED via the Actions API, all `gate.yml` runs on `main` created 2026-08-19:

```
91 runs — 6 success, 13 failure, 70 cancelled (concurrency), 2 in flight
```

Across all 13 failed runs, 45 failing jobs:

| failing step | jobs |
|---|---|
| **`Install toolchain via three-way-parity script`** | **28** |
| `Check all gate jobs` (the `gate (required)` aggregator) | 11 |
| `Whole TypeScript suite (hermetic tier)` | 5 |
| `Test` (windows-2025) | 1 |

Excluding the 11 aggregator roll-ups: **28 of 34 real job failures — 82% — died
provisioning the toolchain.** The eight distinct jobs that died there:

```
build-and-test (ubuntu-24.04)      lint (semgrep)          lint (semgrep drift)
lint (archive header §33)          lint (no conflict markers)
lint (§33 migration xrefs)         lint (tick-history order)
lint (tick-shard relative-paths)
```

**Five of those eight need only `bun`.** They failed while installing .NET,
Rust, Go, Zig, Java, Python and semgrep — none of which they use.

That is Aaron's union-bottleneck hypothesis firing in production, on the day he
stated it, measured from the API rather than asserted. It is the strongest
single datum in this document.

---

## 6. The repo already contains its own dependency partition — and it has 50 parts

`src/Core.TypeScript/ace/build-graph.json` is the repo's **defined** build graph:
107 targets, each with `sources`, `dependsOn`, `legs` (the CI legs it belongs
to), and `requiredQuorum`. Aaron's brief named "ace's dependency graph"; it is
better to use it than to re-derive one, so the analysis below runs on it.

Computing **undirected connected components** over `dependsOn` — which is the
CRP partition, mechanically:

| component | targets | kinds | CI legs |
|---:|---:|---|---|
| 1 | **48** | dotnet | gate/build-and-test |
| 2 | 9 | rust | *(none)* |
| 3 | 2 | dotnet (TypeProvider + its tests) | gate/build-and-test |
| 4 | 2 | rust (Bonsai + Resume) | *(none)* |
| 5-50 | 1 each | 25 rust, 6 dotnet, 2 lean, 4 ts, alloy, tla, agda, go, python, qsharp, wasm-dla, markdown, shell | mixed |

```
107 targets → 50 connected components
46 of 107 targets (43%) are singletons with no build edge to anything
38 of 107 targets (36%) have NO CI leg at all — 35 of them Rust crates
```

**Three findings.**

1. **The dependency-closure partition is not hypothetical — it exists, it is
   checked into the repo, and it has 50 parts against one repository.** Under
   CRP a connected component *is* the natural package boundary.

2. **The mass is extremely uneven.** One component (48 dotnet targets) absorbs
   2,182 of the 2,282 build-touching commits in 90 days — 96%. The other 49
   components share 100.

3. **35 of 36 Rust crates have no CI leg.** Only `Core.Rust.Observe` runs
   (in `full-verify`, one `cargo test`). So the 1,534 MB rust+cargo toolchain in
   the union serves exactly one crate's test suite. That is a coverage gap as
   much as a cost finding, and it is stated as a fact, not a proposal.

### The result that reframes the whole split question

Crossing the graph with the 90-day commit fold:

> **Only 2,282 of 9,191 commits (25%) touch any build target at all.**

Three quarters of what lands on `main` touches nothing that compiles. The
graph's own `inert` list already declares this: `docs/**`, `memory/**`,
`workitems/**`, `db/**`, `openspec/**`, `.claude/**`. Round 2 reached the same
place from the churn side (63% of tracked files are machine-written accretion);
this is the same boundary found by a completely independent method.

Per [`numerology-vs-number-theory`](../../.claude/rules/numerology-vs-number-theory.md)
the independence question must be asked rather than assumed: are these two
measurements of one thing? **No — and this is the one place in these two rounds
where I can say that cleanly.** Round 2's fold counts *commit co-occurrence*;
this counts *declared build reachability*. A file can churn constantly and be
build-reachable (`src/Core.TypeScript`), or never churn and be reachable
(`Core.Rust.Curve`), or churn constantly and be inert (`docs/research`). The two
axes are free to disagree and mostly do (§9). Their agreement *here* is
therefore evidence, not an echo.

---

## 7. Per-candidate closure, and how much of the union is single-owner

Candidates from round 2 plus the categories the ADR and work items already name.
Closure = toolchains reachable from the live build units inside the candidate.

| candidate | live units | toolchains | MB | % of union | ext pkgs |
|---|---:|---:|---:|---:|---:|
| `zeta-archive` (docs/history, github, pr-discussions) | 0 | 1 (bun) | 178 | **2%** | 0 |
| `zeta-cluster` (k8s/Go operators) | 4 | 3 | 473 | 4% | 25 |
| `agentic-organization` | 1 | 2 | 862 | 7% | 3 |
| `zeta-web` (renderers + demo sites) | 2 | 2 | 862 | 7% | 73 |
| `Forge` (factory tooling + agents) | 8 | 12 | 1,688 | 15% | 6 |
| `zeta-formal` (Lean + TLA+ + Z3) | 2 | 2 | 2,977 | 26% | 0 |
| `zeta-wasm` (Oracles 10-13) | 1 | 7 | 4,162 | 36% | 0 |
| `Zeta-core` (F#/C#/TS/Rust/Go oracles) | 88 | 9 | 4,362 | **38%** | 34 |

**The disjointness result — this is the quantitative form of the hypothesis:**

| ownership | components | MB | share of union |
|---|---:|---:|---:|
| needed by **exactly one** candidate | 17 | **10,055** | **87%** |
| shared by 2+ | 6 | 1,478 | 13% |

Single-owner components: `lean` 2,600 · `llvm` 1,700 · `rust` 1,300 ·
`dotnet` 1,228 · `emscripten` 953 · `dotnet-tools` 806 · `java` 377 ·
`zig` 352 · `semgrep` 301 · `mypy` 67 · `shellcheck` 58 ·
`1password-cli` 37 · `ruff` 23 · `markdownlint-cli2` 13 · `actionlint` 5 ·
`yamllint` 1.
Shared: `bun` 178 (7 candidates) · `node` 684 (4) · `go` 258 (3) ·
`golangci-lint` 37 (3) · `python` 142 (2) · `uv` 179 (2).

**87% of the union footprint belongs to exactly one candidate.** That is the
number Aaron's hypothesis predicts and it is the strongest support the tree
offers. The corollary is equally useful: `bun` — the single most-shared
component and the only thing 10 of 20 gate jobs need — is **178 MB, 1.5% of the
union.** The thing everything shares is nearly free; the expensive things are
each wanted by one consumer.

---

## 8. Candidate ranking on the closure axis alone

Per the brief: a candidate whose closure is nearly the union saves nothing; a
candidate with a small **disjoint** closure is strong. Ranking by *what leaves
with it* rather than by what it needs:

| candidate | disjoint MB it removes from everyone else | closure axis verdict |
|---|---:|---|
| `zeta-formal` (Lean, TLA+/java) | **2,977** | **strong** — 26% of the union, wanted by nobody else |
| `zeta-wasm` (zig, llvm, emscripten) | **3,005** | **strong** — 26%, single-owner, one target |
| `Zeta-core`'s Rust tier (rust, cargo) | 1,534 | **strong** — 13%, 4 external crates, 35/36 have no CI leg |
| `zeta-web` (node's 73-dep site closure) | ~684 shared, 73 pkgs disjoint | **moderate** |
| `zeta-cluster` (k8s/SPIFFE/NATS) | 25 pkgs, fully disjoint | **moderate** — small bytes, total isolation |
| `agentic-organization` | ~0 (node is shared) | **weak** |
| `Forge` (factory tooling) | 505 (lint tier: semgrep, shellcheck, actionlint, ...) | **moderate** |
| `zeta-archive` | **0** — its closure is `bun`, the most-shared thing there is | **weak on this axis** |

Two of those rows are the point of the round.

**`zeta-formal` and `zeta-wasm` were not candidates in round 2 at all.** They
score in the noise on change rate (48 and 24 commits per 90 days) and would
never have been proposed from the churn fold. On closure they are the two
strongest cuts in the tree, removing 5,982 MB — **52% of the union** — between
them. That is a cut the change-rate axis could not see.

**`zeta-archive` — round 2's leading cut — scores near zero here.** Its closure
is `bun` and nothing else, so cutting it removes no toolchain from anybody.

---

## 9. Synthesis: where the axes agree, where they disagree, and which wins

Martin's CCP/CRP tension, made arithmetic on this tree. `solo %` is round 2's
change-rate independence; `disjoint MB` is this round's closure independence.

| candidate | CCP (change) | CRP (closure) | agree? | which wins, and why |
|---|---|---|---|---|
| **archive / docs / telemetry** | 90% solo, 48.6% of files | 0 build targets, 0 disjoint MB | **agree it separates** — by *different* mechanisms | **CCP**. The payoff is clone size and ruleset divergence, not toolchain. |
| **`zeta-formal`** (Lean/TLA+) | 48 commits/90d — invisible | **2,977 MB disjoint (26%)** | **disagree** | **CRP, decisively.** A 2.6 GB toolchain for a component touched twice a week is the union bottleneck in its purest form. |
| **`zeta-wasm`** (Oracles 10-13) | 24 commits/90d — invisible | **3,005 MB disjoint (26%)** | **disagree** | **CRP.** Same shape. |
| **Rust tier** (36 crates) | 25 isolated singletons; ~110 commits/90d | 1,534 MB disjoint; 4 ext crates | **CRP says split 25 ways; CCP says don't bother** | **Split once, not 25 times.** CRP's component count is the wrong granularity — the 36 crates *share* one toolchain, so 25 repos buy exactly what 1 repo buys and cost 25x the CI wiring. **This is the clearest case in the tree where following CRP literally would be a mistake.** |
| **`Forge`** (factory tooling) | 383 commits/90d across 3 TS components — highest | 505 MB disjoint; needs `bun`, the most-shared thing | **disagree** | **CCP.** The factory's payoff is clone size, rule locality and ruleset divergence. Its closure is nearly free, so closure has no opinion. |
| **`Zeta-core` dotnet mega-component** | 2,182 commits — 96% of build-touching commits | one 48-target component | **agree it stays together** | **Both.** Nothing to decide; this is the CCP-inclusive pole and CRP does not object. |
| **`zeta-cluster`** | 237 commits, 51% solo | 25 external pkgs, fully disjoint | **agree** | **Both.** Weak-but-consistent on each axis. |
| **`agentic-organization`** | 74% solo, 4 commits/30d | ~0 disjoint | **disagree mildly** | **CCP**, and the answer is still "dormant, not worth a round." |

**The synthesis in one sentence, which is the thing this round exists to
produce:**

> **The two axes rank the candidates almost oppositely, and neither ranking is
> wrong — they are pricing different costs.** Change rate prices *human and
> agent* cost (clone size, review locality, ruleset fit, what an agent's grep
> can reach). Closure prices *machine* cost (toolchain bytes, cache pressure,
> install time, blast radius of an upstream outage). A cut that scores on only
> one axis is still a real cut; it just buys only one of the two things.

And the practical corollary, which is what makes the disagreement useful rather
than paralysing:

> **The strongest cuts on the closure axis are the ones the change-rate axis
> cannot see, and they are cheap precisely because they never change.**
> `zeta-formal` and `zeta-wasm` remove 52% of the union between them, and a
> component touched twice a week is one whose cross-repo pin almost never needs
> bumping. **Low churn is what makes a closure cut cheap to operate.** The two
> axes are not just compatible here; the second one's weakness is the first
> one's precondition.

That inverts the natural reading of the tension. Martin frames CCP and CRP as
opposing forces on one package. Measured here, they turn out to be *selecting
different packages* — and the packages CRP selects are the ones CCP is
indifferent to, which is the best possible arrangement.

**Register.** The rankings are `metered` (both axes are measured folds with
stated commands). The claim that low churn makes closure cuts cheap to *operate*
is `unmetered` — it is an inference from pin-bump frequency, and no cross-repo
pin exists yet to measure. It would be falsified by a `zeta-formal` split whose
version pin needed bumping weekly.

---

## 10. The other branch of Aaron's conditional: the tooling exists and is unwired

Aaron's sentence contains a conditional — ***without*** *hardcore tooling
support for monorepo, the union becomes the bottleneck.* Honest treatment prices
the other branch instead of skipping it because he leans away from it.

**MEASURED, and it changes the option set:** the per-target build tooling is
already in this repo, already anchored to the right prior art, and already
works. `src/Core.TypeScript/ace/build-graph.ts` states its own doctrine:

> the graph is DEFINED, not CALCULATED. `build-graph.json` is the defined whole;
> a build is a **carve** — the reachable subgraph from the roots the change
> touched. Beacon anchor: **Bazel** (one static whole-repo build graph; building
> a target = its reachable subgraph), **Nixpkgs** (one defined expression graph,
> carve a subset).

The affected-set query runs today. Verified live this round:

```
$ echo docs/research/x.md | bun .../build-graph.ts affected --changed -
mode:    selective
reason:  1 of 107 targets reachable from the change
legs:    gate/lint-markdown
ran:     1 target(s)      skipped: 106 target(s)
```

It resolves a doc change to **one** CI leg. It carries `legs` on every target —
the exact mapping from change to required job.

**And nothing consumes it.** `grep -rn build-graph .github/workflows/` returns
**zero hits**. Six TypeScript tools read the graph (`preflight.ts`,
`derive-pr-manifest.ts`, `unexecuted-test-files.ts`, ...). No workflow does. The
graph that would let each job take its subset is **defined, correct, tested, and
disconnected from the thing it was built to drive.**

So the honest framing of the alternative is not "adopt Bazel" (months, a new
build system, every language re-plumbed). It is:

> **Wire the existing affected-set query to job selection in `gate.yml`.**

**Price of the tooling branch** — `unmetered`, and I want to be explicit that
this estimate is not measured: the query exists and is tested; what does not
exist is (a) a workflow step that runs it and emits per-leg booleans, (b) `if:`
guards on ~20 jobs, and (c) a per-leg toolchain subset in the install script so
a `bun`-only leg installs only bun. (c) is the part that actually captures the
94%; (a) and (b) alone reduce job *count* without reducing per-job provisioning.
That third piece is real work in `tools/setup/`, not a one-liner.

**What the tooling branch does NOT solve, and this is where it loses:**

- **Clone size.** Every agent still clones 584 MB of worktree and 237 MB of
  `.git`, 63% of it machine-written accretion (round 2). Job selection does
  nothing for that.
- **The 10 GB cache ceiling.** One repo has one cache budget. Selective jobs
  restore smaller caches, which helps; but the union still has to *exist*
  somewhere in that budget for `full-verify`.
- **Ruleset divergence.** Round 2 measured one real divergence
  (`heartbeat/*`); a build graph cannot express a different merge policy.
- **`git clone` at a tag being sufficient** (§11). Unaffected either way.

**What splitting does NOT solve, stated with equal force:**

- **The 48-target dotnet mega-component.** It is one closure and one change
  cluster. No split touches 96% of build-touching commits.
- **`full-verify`.** Something must still hold all 13 toolchains to run the
  cross-language oracle. A split relocates that job; it does not delete it.
- **Cross-repo pin bumps.** Round 2 priced this for Forge/Zeta at ~1 commit in
  6. Splitting is not free; it moves cost from provisioning to coordination.

**These are not mutually exclusive**, and presenting them as a binary would be
the error. The graph is the same object either way: wired to job selection it
carves jobs; used as a partition it carves repos. Doing (1) first makes (2)
safer, because a repo boundary drawn along a component the graph already
isolates is a boundary CI has already proven it can run selectively.

---

## 11. Round-2 conclusions, revisited against the new axis

| round-2 conclusion | status after round 3 |
|---|---|
| `zeta-archive` (Cut A) is the best-supported cut, 90% solo | **Holds on its own axis, and does not lead overall any more.** Its closure is `bun`; it removes 0 MB of toolchain. It is still the best *change-rate* cut and still the cheapest to operate. It is no longer the obvious first move. |
| Forge/Zeta costs ~1 commit in 6 | **Unchanged** (16%/17%, both windows). |
| The byte-lock rendezvous is the sharpest constraint on any `src/`-crossing cut | **Partly wrong, corrected.** `cross-verify` asserts *committed* outputs and needs only `bun`. The rendezvous constrains **regeneration**, not **verification**. Cut B is cheaper than round 2 priced it. |
| `docs/observe-events` is not an archive | **Reinforced** — the graph's `inert` list already classifies `docs/**` as non-build, and observe-events is written on the product's commit path. |
| Cut C (`zeta-english`) is `unmetered` | **Still `unmetered`, and now better explained.** 75% of commits touch no build target, so the code/English boundary is real — but `path-filter` already implements it softly and closure has no opinion on it. |
| The §1 `ace`-as-mandatory-mediator problem | **Sharper this round — see below.** |

### The §1 requirement, and why it matters more this round

Round 2's finding stands unchanged and is restated because a
dependency-driven split makes the tempting mistake *more* tempting:

> **`git clone` at a pinned tag must remain SUFFICIENT forever, not
> transitional.** If `ace` becomes the only path by which repos resolve each
> other, `ace` is an **appointed hub**, and per
> [`itron-hub-patent-boundary-p2p-is-the-upgrade`](../../.claude/rules/itron-hub-patent-boundary-p2p-is-the-upgrade.md)
> the discriminator is **exit**, not degree. Falsifier: a build test that clones
> each repo at a tag with no `ace` present.

Why it is sharper now: this round's whole argument is that dependency resolution
should be **subset-aware**. The natural next thought is "so let `ace` resolve
the subsets" — and `ace` is already the package manager, already has the graph,
and would do it well. That is exactly the path by which a good tool becomes a
mandatory one. The guard costs nothing today and cannot be retrofitted after the
fleet depends on it.

---

## 12. Discipline check

| # | Discipline | Reading |
|---|---|---|
| 1 | **Scale-free** | The affected-set query is scale-free by construction: same carve at 1 target or 10,000. A split is not — each new repo adds a fixed CI-wiring cost. **Point for the tooling branch.** |
| 2 | Lock/wait-free | Cross-repo pin bumps are a coordination point; selective jobs are not. **Point for the tooling branch.** |
| 3 | Weight-free | A repo boundary is permanent authority (who merges what); a job-selection rule is reversible in one PR. **Point for the tooling branch** — and the honest counterweight is that permanence is sometimes what you want, e.g. keeping key custody out of a repo agents freely PR into. |
| 4 | DST | Determinism is unaffected by either; the graph's affected-set is already "pure, total, deterministic, integer-only" per its own header. |
| 5 | DV2.0 | Round 2's axis. §9 is the CCP/CRP synthesis of it with this round's. |
| 6 | Idempotency | `build-graph.json` is derived (`derive --write`) and drift-checked, so regenerating is idempotent. A split's pin files are upserts. Both fine. |
| 7 | Noninterference | A cross-repo pin is a **declared** channel — more metered than an implicit in-tree path. A split slightly improves this; unwired job selection slightly worsens it (a job installing what it does not use is an undeclared dependency surface). |

**Manifesto §1.** No candidate in §7 creates a mandatory hub repo. The §1 risk
in this round is not topological, it is the `ace` mediation path in §11.

---

## 13. The decision, as options with consequences

Aaron: **do we split on closure, wire the graph, or both — and in what order?**

The measurement supports the hypothesis. It does not, on its own, pick the
sequence, because the two branches buy different things and the repo can afford
either.

**Option 1 — Wire the existing affected-set query to job selection first.**

- *Buys:* attacks the 94%/36%-of-wall-time waste directly and reversibly. The
  query already works. A `bun`-only leg stops installing .NET — which is 5 of the
  8 jobs that died today. Nothing is foreclosed; every later split is safer for
  having proven CI can run the components selectively.
- *Costs:* the real work is the third piece — a per-leg toolchain subset in
  `tools/setup/`. Steps (a) and (b) alone reduce job count without reducing
  per-job provisioning, which would look like progress and bank little.
- *Does not touch:* clone size, the cache ceiling, ruleset divergence.

**Option 2 — Split `zeta-formal` + `zeta-wasm` first (the closure-strongest cuts).**

- *Buys:* removes **5,982 MB — 52% of the union** — from the main repo's
  toolchain. Both are low-churn (48 and 24 commits/90d), so the cross-repo pin
  is nearly static. Both are single-owner closures with zero external packages.
- *Costs:* two new repos to keep green; `full-verify` has to reach both to run
  the 13-toolchain oracle, so the split relocates the union rather than deleting
  it. **This is the load-bearing objection and it is not resolved here.**
- *Note:* neither was a round-2 candidate. This option only exists because of
  this round's axis.

**Option 3 — Split `zeta-archive` first (round 2's leader).**

- *Buys:* 48.6% of tracked files out of every clone; the 19x gate-step cost
  stops growing; a low-stakes second repo to learn cross-repo CI on.
- *Costs:* 57 consuming files; agents lose in-clone grep over prior reviews
  (still **unmeasured** — round 2's named falsifier, still not gathered).
- *Round-3 note:* it removes **zero** toolchain. On this round's axis it is the
  weakest of the three.

**Option 4 — Both, in order: wire the graph, then split on closure.**

- *Buys:* the reversible win first, the permanent one second, with the graph as
  the shared instrument. The components a split would follow are the ones job
  selection will have already exercised.
- *Costs:* longest path to the first repo boundary; the ADR's Stage 1 stays
  un-executed for longer (it has been one `workflow_dispatch` away since
  2026-05-14).

**Independent of the above, two things need a decision and are cheap now:**

1. **Check the Actions cache ceiling.** Measured 11.57 GB against a documented
   10 GB default. If it has not been raised, the repo is in GitHub's own
   "cache thrashing" regime and that alone explains a share of today's failures.
   One click in Actions settings.
2. **Adopt the §11 guard.** `git clone` at a pinned tag stays *sufficient*
   forever. Free today, expensive after `ace` ships.

---

## Pointers

- `docs/research/2026-08-19-repo-split-round-2-*.md` (`6fe1c74d9a`) — the change-rate axis; §9 and §11 above are its synthesis and its corrections
- `src/Core.TypeScript/ace/build-graph.ts` + `build-graph.json` — the defined build graph, its Bazel/Nixpkgs anchors, the verification-cost identity, and the working `affected` query that no workflow calls
- `src/Core.TypeScript/hygiene/audit-git-hotspots.ts` — the churn half of that identity; round 2 supplied the fold, this is the tool
- `tools/setup/common/smoke-13-toolchains.sh` — the union, enumerated by the repo itself
- `.mise.toml` / `.mise.full.toml` — 18 pinned components, standard and full tiers
- `.github/workflows/gate.yml` — the 20 jobs running `Install toolchain`; `path-filter`; `full-verify` as the one legitimate union consumer
- `docs/DECISIONS/2026-04-22-three-repo-split-zeta-forge-ace.md` — Stage 0; still `Proposed`
- [`toy-is-free-metered-must-be-earned`](../../.claude/rules/toy-is-free-metered-must-be-earned.md) · [`numerology-vs-number-theory`](../../.claude/rules/numerology-vs-number-theory.md) · [`anchor-to-human-prior-art`](../../.claude/rules/anchor-to-human-prior-art.md) · [`itron-hub-patent-boundary-p2p-is-the-upgrade`](../../.claude/rules/itron-hub-patent-boundary-p2p-is-the-upgrade.md) · [`dv2-data-split-discipline-activated`](../../.claude/rules/dv2-data-split-discipline-activated.md)
- **Anchors (Beacon).** Martin, *Granularity* (C++ Report, 1996) and *Agile Software Development: Principles, Patterns, and Practices* (2002), ch. on package design — REP/CCP/CRP and the tension triangle; CCP is round 2's axis, CRP is this round's, and Martin states they oppose. Parnas, *On the Criteria To Be Used in Decomposing Systems into Modules* (CACM 1972) — decompose by likely change, the CCP ancestor (**not** the CRP one; noted in §1). Evans, *Domain-Driven Design* (2003) — bounded context as a **semantic** boundary, distinguished in §1 from the mechanical closure actually measured here. Bazel (Google) and Nixpkgs — one defined whole-repo graph, a build is a carve; already the in-tree anchors of `build-graph.ts`. GitHub Actions dependency-caching reference (read 2026-08-19) — the 10 GB default, LRU eviction, and the "cache thrashing" name.
