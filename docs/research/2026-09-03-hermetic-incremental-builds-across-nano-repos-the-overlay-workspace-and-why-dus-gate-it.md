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

### The mechanism has a name, and Aaron has shipped it twice

Aaron 2026-09-03, correcting the abstraction with the operational form:

> at lexisnexius and itron i solved this with conditional refere[n]ces, source not cloned,
> then you use the package instead. you only clone the source if you need to change it.

**Conditional references.** That is the whole rule, and it is better than the type sketch in
§6 because it says what to DO rather than what to model:

| the producer is | the reference resolves to |
| --- | --- |
| checked out beside you | the **source** — live, incremental, both sides editable in one thought |
| not checked out | the **package** — the pinned artifact |

And the discipline that keeps it honest: **you clone the source only when you intend to
change it.** A checkout is a statement of intent, not a convenience. That one sentence
removes the sprawl these schemes usually acquire, where everyone ends up with everything
cloned and nobody can say which references are live.

#### Source Link is what makes that discipline survive contact with a debugger

Aaron 2026-09-03:

> source link is how you debug with full symbols like from dotnet when you don't checkout,
> so checkout is 100% an editing concern not even a debugging concern

**This is the load-bearing addition, because "I need to step into it" is the excuse that
kills the rule.** Without an answer to debugging, every consumer eventually clones every
producer for one afternoon of investigation and never deletes it — and the rule degrades
into a preference nobody follows. Source Link removes the excuse rather than arguing with
it: the PDB carries source-control metadata, so the debugger fetches the exact revision that
built the artifact you are actually running. Full symbols, correct source, no checkout.

So the taxonomy is sharper than "source vs package":

| you want to | you need |
| --- | --- |
| build against it | the package |
| read it | the package + Source Link |
| **step through it with full symbols** | **the package + Source Link** |
| **change it** | **the source** |

**Only the last row justifies a clone.** That is what "100% an editing concern" means, and
it is what makes the discipline enforceable instead of aspirational.

**Anchor (Beacon):** Source Link — originally Cameron Taggart's `SourceLink`, adopted into
the .NET SDK and specified by the .NET Foundation; the PDB records the repository URL and
commit, and the debugger resolves sources from it. The general form is not .NET-specific and
should be named so this does not read as a platform accident: **`debuginfod`** (elfutils) is
the same idea for ELF/DWARF — a service that hands a debugger the exact source and symbols
for a build id. Rust reaches it via `--remap-path-prefix` plus published sources; Go via the
module proxy. The property, whatever the ecosystem, is *symbols and source are addressable
from the artifact*, which is the same content-addressing move this repository already makes
everywhere else.

#### The delete is an event too, and that is what keeps the union truthful

Aaron, continuing:

> if done correctly you would even signal back when you want to stop editing by sending the
> local delete of a source tree event to others

This closes the loop, and it is the half these schemes normally leave open. A clone announces
"I am editing this"; **nothing announces that you stopped.** The stale checkout is therefore
the failure mode — a false "still editing" signal that persists indefinitely, which is
exactly how a federation drifts back into everyone-has-everything.

Making both edges events gives the obvious fold, and it is one this repository already runs
everywhere else:

```text
clone  = +1        delete = -1        live editors = the Z-set fold over those events
```

Which is `grant`/`revoke` as a retraction, the model already carved for config and secrets
(*"revoke ≡ Z-set retract"*): **topology emerges from events, never from a hand-authored map
of who-has-what.** And it is `loop-registry.ts` in miniature — enrolment and a recorded,
attributed EXIT, where "only you may deregister you" and an unexplained exit is
indistinguishable from a fault. Same shape, applied to source trees instead of tick loops.

Two consequences worth having on the page before anyone builds it:

- **"Who is editing what" becomes DERIVED, not coordinated.** No lock, no registry to keep in
  sync, no permission to ask — the fold over the event log is the answer, which is the
  scale-free / lock-free discipline rather than an optimisation of it.
- **The delete event is as load-bearing as the clone**, so a delete that fails to emit is a
  defect and not merely untidy. A fold that only ever sees `+1` reports a federation where
  everyone is always editing everything, which is the state the discipline exists to prevent
  — the same shape as a heartbeat lane whose silence nobody notices.

**Human anchor (Beacon):** the maintainer's own practice at LexisNexis and Itron. In the
.NET dialect that is the `ProjectReference` / `PackageReference` swap made conditional on
whether the sibling project exists — the shape `Directory.Build.props` conventions reach for.
First-hand expertise, and usable as such: the CONCEPT travels, the former employers' code
does not
([`cleanroom-two-team-separation`](../../.claude/rules/cleanroom-two-team-separation.md) —
paid specs and hand-implementation give genuine expertise; the expression stays theirs).

Note what this does to §3(a). The "versioned snapshot vs live co-development" dilemma is not
resolved by picking a side — it is resolved by making the **reference kind a function of the
checkout**, so a consumer never chooses and the graph never changes shape. That is precisely
the property the table above says every overlay system buys, stated as a rule you can
implement rather than as a family resemblance.

### The failure mode, recorded before we hit it

An overlay makes the build depend on *which repos happen to be present*, which is ambient
state — precisely what hermeticity forbids. So the union must be **declared** (a manifest
that says which repos participate and at what revision), never inferred from what is lying
around on disk. A build that silently changes meaning because a sibling directory exists is
the noninterference violation of §13 wearing a convenience.

**Conditional references and the declared manifest are not in tension — the manifest is what
makes the conditional honest.** "Source if cloned, package otherwise" is a *resolution rule*;
the manifest is the *declaration of which repos may participate, and at what revision*. With
both, cloning changes which of two DECLARED forms of the same dependency you get, and the
build's meaning is unchanged. With the resolution rule alone, a stray directory changes what
you build.

## 6. Why discriminated unions gate it

Aaron names two gates: *"good multi repo workflows / discriminated unions"*. What follows was
written as **my reading** of the second and offered for correction. It was **half right**, and
the correction is the more interesting half — recorded below in the order it happened, because
a reading that got partially corrected is more useful to the next reader than a tidy one that
hides where the guess ended.

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

### The half the reading missed: the AGENT is a multi-repo client too

Aaron 2026-09-03:

> this is part of the reason[;] the other part is many AIs are not good at multi repo yet,
> they try to lock into one repo and require restarting or updating the config in thier
> harness to switch, this is one of the main reasons we have harney our custom harness

The reading above is about the BUILD SYSTEM's model of a reference. This is about the
**agent's** model, and it is the binding constraint today, because the agents are the ones
doing the work.

A harness that assumes one repository has, in effect, hardcoded `SameRepo` — the same
collapse as §6's string, one layer out, at the tooling instead of the type. Its symptom is
the one Aaron names: crossing a repo boundary costs a restart or a config edit, so a
cross-repo change is **expensive in attention long before it is expensive in compute**. And
that cost lands exactly where §7 says the bottleneck already is — on the union, not on the
build.

So the two gates are one gate seen from two sides:

| layer | the collapse | the fix |
| --- | --- | --- |
| build graph | a reference is a string | a sum type, with `Unknown` still a case |
| agent harness | a workspace is one repo | a workspace is the declared union |

**Harney is the answer to the second, and its existence is why this is a plan rather than a
wish.** A build system that can express a federation, driven by agents that cannot hold one
in working memory, would be a graph nobody can act on. Which of the two arrives first is
open; that neither is sufficient alone is not.

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

**PLAN.** Sections 2 and 5 are checked (in-tree citations; named prior art, plus the
maintainer's own first-hand practice for conditional references). Section 3 is an argument.

Section 6 was written as *a reading of Aaron's shorthand, not his statement*, and was
**half right** — the type-level half stands; the harness half was missing entirely and is
now recorded in his words. The flag was worth carrying: a guess that announces itself gets
corrected, and this one did, within the hour.

Nothing here is measured, so nothing here has shed `toy`.

Work item: `081M1N2JPVE087G0R001SK41RA`.
