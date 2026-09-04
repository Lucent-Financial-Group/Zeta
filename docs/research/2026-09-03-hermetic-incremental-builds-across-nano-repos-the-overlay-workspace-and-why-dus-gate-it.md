# Hermetic incremental builds across nano-repos: the overlay workspace, and why DUs gate it

*2026-09-03. Operational status: PLAN, not a result. Every mechanism named as
"existing" is checked in-tree and cited; everything else is `toy` under
[`toy-is-free-metered-must-be-earned`](../../.claude/rules/toy-is-free-metered-must-be-earned.md).
GOVERNANCE.md §33.*

Aaron 2026-09-03, after the hermetic-tier etymology:

> i'm hoping over time either ace our package manger or maybe we need a full one
> build system like bazel but we want to support monorepos split over
> nano/microrepo, i'm not exactly sure how to fully accomplish this maybe assuming
> relative paths when multiple repos are pulled but super isolated incremental
> builds and impacted test runs only. we can write all this up, this is the
> ultimate plan but it's gated by a good multi repo workflows / discriminated
> unions

## 1. The ask, in one sentence

**Bazel-class build properties — hermetic, isolated, incremental, impacted-tests-only —
over a federation of small repos rather than over one workspace root.**

Both halves are load-bearing and they pull against each other, which is why this is a
plan and not a task. Bazel gets its properties by owning a single root. The whole point
of the nano-repo direction is that there is no single root.

## 2. What already exists, so this is an increment and not a greenfield

| mechanism | where | what it already does |
| --- | --- | --- |
| BUILD graph | `src/Core.TypeScript/ace/build-graph.ts` | one defined whole-repo graph; `affected` answers "what must run for this change"; edges DERIVED from `.fsproj` `<ProjectReference>`, Cargo `path =`, lakefile packages |
| DEPLOY graph | `src/Core.TypeScript/ace/deps.ts` | the other axis of the same edge model — Helm charts to ArgoCD sync-waves |
| satisfier | `ace` | pinned artifacts, lockfile, package-hash, capability manifests |
| split analysis | `docs/research/2026-08-19-repo-split-round-{2,3}-*` | dependency closure measured against change rate; the union is the bottleneck |
| the DU thread | `src/Core/DuExpand.fs`, `docs/research/2026-08-26-du-expand-*` | DUs expand to `DynamicValue` / `SoftValue`; local actions commute into global effects |

Three doctrines are already carved and the plan inherits them rather than re-deciding them:

- **The graph is DEFINED, not CALCULATED** (Aaron 2026-06-07). `build-graph.json` is the
  whole; a build is a *carve* — the reachable subgraph from the roots the change touched.
- **Unknown escalates to FULL.** A changed path matching no target and no declared-inert
  pattern does not silently build nothing; it builds everything. Forgetting to register a
  source tree makes CI do MORE work, never less. This is the same stance as
  `Wall.Whitebox` in `DerivationProtocol.fs`: an unknown licence blocks.
- **The generator IS the ECC.** `derive` is a drift gate — regenerating must reproduce the
  checked-in content
  ([`only-the-irreducible-is-primitive-generate-the-rest`](../../.claude/rules/only-the-irreducible-is-primitive-generate-the-rest.md)).

**So the missing piece is not "a build graph". It is that today's graph has exactly one
repo root.**

## 3. The hard problem, stated precisely

Cross-repo incremental builds need a **stable identity for a target that survives being in
a different repository**, and repositories are independently versioned. That is the whole
difficulty, and it splits into two sub-problems that are usually conflated:

**(a) Versioned snapshot vs live co-development.** Bazel's answer to external code is
`http_archive` / `git_repository` / bzlmod — a *pinned snapshot*. That is correct for a
dependency you consume and useless for one you are editing right now. The moment you want
to change two repos in one thought, you reach for `--override_repository` or
`local_path_override`, which are per-developer flags rather than a model. **Everyone's
multi-repo build system is good at one of these two and bolts the other on.**

**(b) Identity across the seam.** In-repo, a target is a path. Across repos it needs to be
something a *consumer that has not checked out the producer* can still reason about. This
repository already has the machinery for that shape — content addressing (`ZetaId`, CAS
through `IBlockIo`) and `package-hash` — but nothing yet ties a build target to it.

## 4. Why "just adopt Bazel" is refused here, and what we take anyway

**Adopting Bazel wholesale would breach a carved rule.**
[`clone-at-tag-stays-sufficient`](../../.claude/rules/clone-at-tag-stays-sufficient.md)
requires the repo to stay buildable and checkable from `git clone` at a pinned tag **with
no package manager present, permanently**. A tree that needs `bazel` on PATH to build is a
tree with an appointed hub, and the rule's discriminator is exit, not degree: if a consumer
*must* route through it, it holds you.

That does not make Bazel the wrong teacher. It makes it an **oracle we consult rather than
a hub we route through** — the distinction
[`itron-hub-patent-boundary-p2p-is-the-upgrade`](../../.claude/rules/itron-hub-patent-boundary-p2p-is-the-upgrade.md)
already draws. What transfers:

| Bazel property | transfers? |
| --- | --- |
| one static whole-repo graph, build = reachable subgraph | **yes** — already the doctrine in `build-graph.ts` |
| hermeticity as failure-attribution (§ the bunfig header) | **yes** — already realised in the test tiers |
| action-level sandboxing + hash-pinned inputs | **aspirational** — we have inputs-hermetic, not sandboxed |
| remote cache / remote execution keyed by action hash | **later**, and only if it can stay optional |
| `bazel` as the mandatory entry point | **no** — this is the part that violates §1 |

The honest form of the target: *the graph and the carve are ours and are plain data; a
faster executor over them is an optimisation anyone may decline.*

## 5. The relative-path instinct is the overlay workspace, and it has prior art

Aaron's *"maybe assuming relative paths when multiple repos are pulled"* is the
**virtual/overlay workspace**: the union of whatever repos are checked out side by side
forms one logical root at build time, and intra-union references resolve by relative path
exactly as they would in a monorepo.

This is a well-trodden shape, and naming the tradition is the Beacon half:

| system | how the union is formed |
| --- | --- |
| Android `repo` | a manifest XML lists repos + paths; the checkout IS the union |
| Cargo workspaces | one `[workspace] members` root; path deps resolve relatively |
| pnpm / Rush / Nx | workspace protocol; a package resolves to the sibling checkout when present |
| bzlmod `local_path_override` | per-module escape from the pinned snapshot to a sibling path |
| Nix flakes `follows` | input graph rewritten to share a sibling input |
| git subtree / submodule | the union is materialised in the tree itself |

**The property they all buy, and the one Aaron is asking for:** *a reference means the same
thing whether the producer is a sibling checkout or a pinned artifact — only the resolution
differs.* When the producer is checked out you get live incrementality; when it is not you
get the pinned snapshot; and **the graph does not change shape between those two cases.**

Its known failure mode should be recorded now rather than discovered: an overlay makes the
build depend on *which repos happen to be present*, which is ambient state — precisely what
hermeticity forbids. So the union must be **declared** (a manifest that says which repos
participate and at what revision), never inferred from what is lying around on disk. A
build that silently changes meaning because a sibling directory exists is the
noninterference violation of §13 wearing a convenience.

## 6. Why discriminated unions gate it

Aaron names two gates: *"good multi repo workflows / discriminated unions"*. This section
is **my reading of the second**, offered for correction rather than as his statement.

A cross-repo dependency reference is not one thing. It is at least:

```fsharp
type TargetRef =
  | SameRepo      of path
  | SiblingRepo   of repo * path        // present in the declared union, live
  | PinnedRelease of repo * digest      // not checked out; consume the artifact
  | Generated     of generator * inputs // produced, not authored
  | Unknown       of raw                // parsed, not resolvable here
```

If that is a **string**, resolution becomes ad-hoc prefix matching and the safety property
in §2 quietly degrades: "this path matches no target" and "this path belongs to a repo you
have not checked out" become the same silence, and the second one is not an unknown at all
— it is a *known* case with a correct answer (use the pin). A sum type makes every case
**total**: a consumer either handles `PinnedRelease` or fails to compile, and `Unknown`
stays a first-class case that escalates to FULL rather than a hole in an `if`.

Two existing rules say the same thing from different directions:

- [`interfaces-free-classes-earned-under-rules`](../../.claude/rules/interfaces-free-classes-earned-under-rules.md)
  — the free shape is the default and generators read it. A DU is that free shape for a
  reference; a resolver class is the earned part.
- `DuExpand.fs` — DUs already expand to `DynamicValue` / `SoftValue` here, and *independent
  local actions commute into a global effect*. That is exactly the property a multi-repo
  affected-set needs: each repo computes its local carve, and the union of carves must not
  depend on the order the repos were visited. **The order-independence work already in
  flight is the same invariant, one layer up.**

## 7. The other gate: multi-repo workflow

Naming it as a gate is correct and it is the less glamorous half. Before the build system
is worth building, a change that spans three repos needs an answer to: how is it reviewed
as one unit, how does CI run the union rather than three disjoint lanes, what does "green"
mean when two repos are green and the third is not, and how does a revert span the seam.

`docs/research/2026-08-19-repo-split-round-3-*` already measured that the **union is the
bottleneck**. A build system that makes the union cheap to compute and leaves the union
impossible to *review* has moved the cost, not removed it.

## 8. What stays unknown, deliberately

- **Whether the executor should be ours at all.** The graph must be ours (§4). Whether a
  third-party executor consumes it is open and should stay open.
- **Where the cut between nano-repos actually falls.** Rounds 2 and 3 measured dependency
  closure against change rate; that measurement, not this document, decides.
- **Whether remote caching is reachable without an appointed hub.** A shared cache is a
  concentration; whether it can be one you *chose* rather than one you must route through
  is the same exit test, unanswered here.
- **The dozens-of-repos number.** Aaron expects dozens. Nothing here validates that count,
  and the verification-cost identity in `build-graph.ts` (`change frequency × quorum size`)
  is still only half computable — the churn heatmap it needs does not exist.

## 9. Register

**PLAN.** Sections 2 and 5 are checked (in-tree citations; named prior art). Section 3 is
an argument. Section 6 is *a reading of Aaron's shorthand, not his statement*, and is the
part most likely to be wrong. Nothing here is measured, so nothing here has shed `toy`.

Work item: `081M1N2JPVE087G0R001SK41RA`.
