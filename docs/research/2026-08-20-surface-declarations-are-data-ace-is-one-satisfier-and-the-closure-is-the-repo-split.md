# Surface declarations are DATA — `ace` is one satisfier among many, and the closure is the repo split

**Status:** design note. No implementation, nothing measured. The architecture is argued; the
surface set itself is **deliberately not enumerated** (see §6).
**Date:** 2026-08-20 · **Driver:** Aaron · **Register:** Beacon where anchored, design elsewhere.

## 0. The carved invariant, in Aaron's words

> **"this list of deps is what's important — `ace` is just one thing that can satisfy it."**

Stated as the design rule it needs to be:

> **A surface declares WHAT it needs, as readable data in the repo. It never declares HOW to get
> it.** Any consumer — `ace`, a shell script, a human with `apt`, a Nix expression — reads the same
> declaration and satisfies it. The moment satisfying a declaration *requires running a particular
> tool*, that tool has become an appointed hub and
> [`clone-at-tag-stays-sufficient`](../../.claude/rules/clone-at-tag-stays-sufficient.md) is
> violated.

This is the discriminator that keeps `ace` an **oracle** (deference you chose, exit available) rather
than a **hub** (deference imposed, no exit) — the distinction from
[`itron-hub-patent-boundary-p2p-is-the-upgrade`](../../.claude/rules/itron-hub-patent-boundary-p2p-is-the-upgrade.md),
where the test is **exit**, not degree of use. `ace` may become the *best* way to satisfy a surface
and accumulate any amount of use; it may never become the *only* way.

## 1. The evidence that the seam is missing

PR #12876 (Cursor Cloud Agent environment) adds a **new 150-line `.cursor/install.sh`** that
hand-copies **9 apt packages out of the canonical 34**, and re-declares the mise pin
(`MISE_PIN_VERSION="2026.6.12"`) already present at `tools/setup/linux.sh:426`, synchronised only by
a comment reading *"bump in lockstep."*

**Read charitably — and correctly — that is not drift, it is a missing abstraction surfacing as
duplication.** The cloud agent genuinely does not need the formal-verification proof stack; its
header says so and points at `tools/setup/install.sh` as canonical. It needed a way to declare a
*subset*, there was none, so it forked. **A fork is what a missing seam looks like from the
outside.**

Concretely today: four Yubico packages added to `manifests/apt` will never reach that environment,
and nothing will notice.

## 2. What already exists — one axis, never generalized

The split exists in miniature and has since workitem `081KTWQZY7F`: **`.mise.toml` +
`.mise.full.toml`**, merged when `MISE_ENV=full`, selected by the host-tier helper in
`tools/setup/common/mise.sh`. Its own rationale is exactly this problem —

> *"cluster nodes declare full at the zeta-install.sh call site regardless of hardware auto-detect;
> CI k8s lanes declare full explicitly; slim/standard hosts skip these."*

But it is **one axis (slim ⊂ standard ⊂ full), one manifest type (mise tools), one selector (host
tier)**. `manifests/apt` remains flat by design — *"Add a package by appending a line."*

## 3. Why "more tiers" is the wrong generalization

**A tier is a total order; surfaces are not.**

- a **cloud agent** needs .NET + bun, and *not* the proof stack
- a **proof lane** needs Lean + TLA+ + Alloy, and *not* the k8s tooling
- a **cluster node** needs the k8s tooling, and *not* necessarily either

**No two of those contain each other.** Tiers cannot express a partial order, so every non-nested
surface must either over-install (carry the union — the monorepo bottleneck, one level down) or
fork (what #12876 did). Both failures are already observed.

So the generalization is **named surfaces with declared sets**, and *tiers become one derived view*
— `full` is simply the union of the surfaces a cluster node plays.

## 4. The load-bearing connection: a surface set IS a dependency closure

This is why Aaron says the surface question and the repo split are the same question.

> **A surface's install set is a dependency closure. The repo split is driven by dependency
> closure. They are the same graph, queried twice.**

One query produces install manifests; the other produces repo boundaries. Which means:

- **The repo split becomes computable rather than argued.** You stop debating where the boundary
  goes and read it off the closure. That matters given
  `user_aaron_monorepo_union_of_everything_is_the_bottleneck` — the union is precisely what a
  surface declaration stops you from paying for.
- **And the split acquires a falsifier it currently lacks:** if two proposed repos have
  *overlapping* closures, the boundary is wrong — checkable, not a matter of taste. If a surface's
  closure spans two proposed repos, either the split or the surface is mis-drawn.

That second point is the reason to build declarations *before* finishing the split, not after.

## 5. The guard, stated so it can be enforced

Two mechanical consequences follow from §0, and both are small:

1. **`.cursor` must join `BOOTSTRAP_SURFACES`** in
   `src/Core.TypeScript/hygiene/lint-clone-at-tag-is-sufficient.ts`. That list is currently
   `["tools/setup", ".github/workflows", <build props>, "flake.nix"]` — it predates `.cursor`, so
   the omission is an accident rather than a decision. Without it, the newest bootstrap surface is
   the one place `ace` could quietly become mandatory.
2. **The declaration must be inert.** A surface file that is *executed* to learn what it needs has
   already failed the rule; it must be readable without running anything. The natural falsifier is
   the honest one the clone-at-tag rule already names: **clone at a tag on a machine with no `ace`
   on `PATH`, read the declaration, satisfy it by hand, and build.**

## 6. What this note deliberately does NOT do

**It does not enumerate the surfaces.** That is Aaron's to draw, and inventing a plausible-looking
list would be exactly the failure this repo keeps catching — a confident artifact standing in for a
decision nobody made. The four named in §3 are *illustrations of non-nesting*, not a proposal.

Nothing here is measured. There is no implementation, no manifest format, and no claim that the
closure is currently computable — `user_aaron_incremental_dependency_tracking_is_the_mental_model_wall`
records that the increment graph is precisely what neither humans nor LLMs hold, which is the
argument for externalizing it and also the reason not to pretend it already is.

## Pointers

- [`clone-at-tag-stays-sufficient.md`](../../.claude/rules/clone-at-tag-stays-sufficient.md) — the rule this operationalizes; `ace` as resolver is refused in bootstrap surfaces
- [`itron-hub-patent-boundary-p2p-is-the-upgrade.md`](../../.claude/rules/itron-hub-patent-boundary-p2p-is-the-upgrade.md) — oracle vs hub; **exit** is the discriminator
- `.mise.toml` / `.mise.full.toml` + `tools/setup/common/mise.sh` — the existing one-axis split (`081KTWQZY7F`)
- `tools/setup/manifests/` — the flat manifests a surface layer would sit over
- `docs/DECISIONS/2026-04-22-three-repo-split-zeta-forge-ace.md` — the split whose boundaries §4 would make computable
- `docs/research/2026-08-19-repo-split-round-*` — where the dependency-closure argument was measured out
- PR #12876 — the fork that is evidence for §1
