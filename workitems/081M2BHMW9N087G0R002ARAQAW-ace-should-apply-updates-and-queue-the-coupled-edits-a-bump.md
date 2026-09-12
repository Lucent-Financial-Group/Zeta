---
id: 081M2BHMW9N087G0R002ARAQAW
type: task
state: backlog
priority: P2
slug: ace-should-apply-updates-and-queue-the-coupled-edits-a-bump
title: "ace should apply updates and queue the coupled edits a bump forces"
created: 2026-09-12T19:31:27.669Z
depends_on: []
composes_with: []
---

# ace should apply updates and queue the coupled edits a bump forces

<!-- Work-item body. ZetaId-keyed (conflict-free, time-sortable). "Backlog" is a
     STATE = this folder; completion moves the file to workitems/done/YYYY/MM/.
     Identity is the zetaid prefix — resolve cross-refs by `081M2BHMW9N087G0R002ARAQAW-*.md` glob. -->

## Origin

Aaron, 2026-09-12, after a day spent fixing dependency bumps one CI failure at a time, on
whether the Dependabot CLI could run locally:

> *"this is very similar to a small slice of functionality ace package manager is trying to do
> as well, we also want ace to be able to install the updates too, not just notice it's out of
> date. we also want ace to be much deeper and queue the AIs to what other files might need to
> bump with the deps bump."*

## What exists today

| surface | does |
|---|---|
| `ace outdated` | OBSERVES. Reads a committed snapshot; `--refresh` re-observes from registries. Two orthogonal axes (distance, freshness) and `Unknown` as the default. |
| `dep-update/toy-classify.ts` | JUDGES. `UpdateProposal` -> `AutoEligible` / `ScrutinyRaised` / `HeldForAttention`, with a TrueSkill-shaped adherence belief per (publisher x ecosystem). |
| `proposalsFrom()` (#17311) | PRODUCES the proposals that classifier had never been given. |

So observation and judgement exist. **Applying does not, and neither does coupling.**

## The measurement: every bump on 2026-09-12 forced edits in OTHER files

Each row was discovered by a CI failure, separately, after the PR was already red:

| bump | files that had to move WITH it |
|---|---|
| `dotnet-sdk` 10.0.400 -> 10.0.401 | `.mise.toml` (the declared source), `global.json` (a restatement), `mise.lock`, **and** a `cross-verify` leg that executed F# with no SDK provisioned |
| `numpy` 2.5.1 -> 2.5.3 | the MiniGrid carrier, `CARRIER_FINGERPRINT` (Python), `CarrierFingerprint` (**F#**, pinned independently), and BOTH committed receipts |
| any GitHub Action | `action-sha-roster.json`, which is derived and committed |
| `FSharp.Core` | 63 `packages.lock.json` plus the pinned hash in `audit-fsharp-core-comes-from-nuget-org.ts` |

Cost: roughly a dozen red check-runs and most of a day, for four bumps whose coupled edits were
all knowable from the diff alone.

## THE COUPLINGS ARE ALREADY WRITTEN DOWN -- AS REFUSALS

This is the part that makes the deep half tractable rather than a new hand-maintained list.
Every coupling above already has an audit enforcing it:

    .mise.toml <-> global.json          audit-dotnet-pin-parity.ts
    .mise.toml <-> mise.lock            audit-mise-lock-coverage.ts
    workflows  <-> action-sha-roster    audit-action-sha-roster.ts
    carrier    <-> two fingerprints     the fixture + MiniGridEmpty5x5Adapter.fs
    lock files <-> nuget.org provenance audit-fsharp-core-comes-from-nuget-org.ts

An audit states the relation BACKWARD and LATE: *"A and B disagree"*, after the edit, as a
refusal. Read FORWARD it is exactly the queue ace needs: *"you touched A, so B must move."*

So the coupling graph should be **DERIVED from the audits**, not authored beside them. That is
this repository's standing discipline everywhere else -- `action-sha-roster.json`,
`build-graph.json` and `docs/UNHASHED-DEPENDENCIES.md` are all derived-and-committed precisely
so a second copy cannot drift from the first. A hand-written coupling table would be that
second copy.

## THE LAYER SPLIT (Aaron's correction, and it is a correction)

The table above conflates two layers, and the first draft of this row got it wrong. Aaron,
2026-09-12:

> *"your split is okay but carrier json is project specific, if ace is going to track
> project/repo specific things then someone has to declare that dependency in repo, ace is
> supposed to be a general AI speed oriented package manager of package managers."*

He is right. `numpy -> MiniGrid carrier + two fingerprints + two receipts` is a **Zeta** fact.
An ace that knows what a carrier is has become repo-aware, which is precisely what a package
manager of package managers must not be. The same is true of `action-sha-roster.json`: that
roster is ours.

**ace owns the MECHANISM. The repo owns the FACTS.**

**AND THE LINE IS PACKAGE-MANAGER-INTRINSIC vs REPO-ARTIFACT, not "engine vs data".** Aaron,
sharpening it a second time, 2026-09-12:

> *"for ace we want to have coupling to most popular package managers, this is its value add.
> it already integrates with most package managers in an AI friendly cli interface."*

That is the correction to my "generic declaration engine" framing. ace's coupling is TO THE
PACKAGE MANAGERS -- that breadth IS the product, and it is already substantial: `ECOSYSTEMS`
covers cargo, go, mise, npm, nuget and pypi, and `setup-realizers/` reaches deb, dotnet-global,
dotnet-workload, elan, opam-git, ollama, bun workspace/link/global, autotools tarballs,
installers, shims and tag-only URLs. A uniform AI-legible CLI over that heterogeneity is the
value add, not a coupling DSL.

So a coupling belongs to ace when it is a property of a PACKAGE MANAGER, and to the repo when
it is a property of THIS REPOSITORY. Re-sorting the measured table on that line:

| bump | coupled edit | whose |
|---|---|---|
| any nuget version | 63 `packages.lock.json` must be re-locked | **ace** -- nuget intrinsic |
| `dotnet-sdk` | `.mise.toml` -> `mise.lock` | **ace** -- mise intrinsic |
| `dotnet-sdk` | `global.json` restates the mise pin | **ace** -- a dotnet+mise fact any such repo has |
| GitHub Action | `action-sha-roster.json` regenerated | **repo** -- our roster |
| `numpy` | MiniGrid carrier + 2 fingerprints + 2 receipts | **repo** -- our experiment |
| `dotnet-sdk` | a `cross-verify` leg that needed an SDK | **repo** -- our workflow |

Three of six are ace's, and they are the three that would recur in ANY repository using those
package managers. That is the test for which side a coupling falls on: **would another repo
using the same package manager have it?** If yes it is ace's and ace should already know it
without being told. If no, the repo declares it.



| layer | owns | example |
|---|---|---|
| **ace** (general) | the coupling VOCABULARY and the engine: read declarations, compute the closure of a proposed bump, apply what is mechanical, queue what is not, report what it cannot see | "pin P in ecosystem E is coupled to artifacts A; regenerate with command C" |
| **the repo** (specific) | the DECLARATIONS themselves | "`numpy` couples to the carrier and both fingerprints; regenerate by running the fixture" |

This is the shape the repository already uses for every other cross-cutting fact: `.mise.toml`
declares tools, `.github/dependabot.yml` declares ecosystems, `tools/setup/manifests/*` declare
packages. A coupling declaration is the same move -- **declared in the repo, consumed by a
general tool**, never known by the tool.

**And it relocates the derive-from-audits idea to where it belongs.** Deriving Zeta's coupling
declarations from Zeta's audits is a ZETA implementation detail: it is how this repo avoids
hand-maintaining its declarations and lets them drift. ace neither knows nor cares that they
were derived -- it reads declarations. Another repo might write them by hand, or generate them
some other way, and ace is unchanged.

The `unknown` requirement survives the split intact, and moves with the declarations: a repo
declares what it knows, and ace reports the closure it computed PLUS the fact that a repo's
declarations are not a proof of completeness. The un-audited CI leg from the SDK bump is then a
gap in ZETA'S declarations, which is the right place for it to be visible.

## BOTH, AND THE DSL IS THE COMMON INTERFACE (Aaron, 2026-09-12)

> *"we can do both, the coupling DSL can allow other repos unknown to ace to integrate with the
> and also at the same time be the cli verb/noun ish common interface between all other package
> managers."*

I had posed DSL-versus-breadth as a choice. It is not one, and the reason is the better idea:
**the DSL and the uniform CLI are the same grammar, with two producers.**

  - ace SPEAKS it for the package managers it knows -- the normalised verb/noun surface over
    cargo, go, mise, npm, nuget, pypi and the ~20 realizers. That normalisation IS the DSL.
  - A REPO ace has never seen WRITES it for its own artifacts, and is understood without ace
    being taught anything.

One vocabulary, so an unknown repo's declaration is not a second-class bolt-on: it is the same
sentence ace already says to itself about nuget. That is what makes it an extension point
rather than a plugin API.

## UPDATE SCRIPTS, AND WHY THEY ARE QUASI TIME CRYSTALS

> *"ace would like to have update scripts for every dependency, many will be the same, but
> major version changes will likely require per package instructions that AI can follow so we
> can play on both sides here. We write the scripts for updates for popular packages, community
> can also write their own scripts for their packages ... we call this update process quasi time
> crystals for our agents skills and other files whose velocity changes at AI speed but still
> need to be some common core to reference back to."*

The naming is already carved, in `docs/CONCEPT-REGISTRY.md`:

> *"its a persistent pattern that propagates over time but can evolve, if it's frozen like a
> quasi time crystal then it's an ACTOR not an agent cause it can be copied and reproduced in
> deterministic simulation testing"* -- and *"agents are what remains, actors are what acts."*

An update script is exactly that frozen pattern, and the split falls out of the definition
rather than being imposed on it:

| | what it is | which |
|---|---|---|
| patch / minor update | a FROZEN procedure, replayed identically every time, inspectable in advance, reproducible under DST | **actor** -- a crystal |
| major version update | fresh judgement, per package, about what the new API means for this caller | **agent** -- it must evolve |

And there is a promotion path, which is the part that makes "play on both sides" concrete: an
agent works out a major upgrade ONCE, and the verified result is frozen into a new crystal that
later runs merely replay. The judgement is paid for once and then copied -- which is precisely
the meter/oracle argument already made in
`.claude/rules/dual-use-detection-is-neutral-oracle-decides.md`, where a METER is judgement
crystallised once in a treaty (frozen, inspectable, DST-reproducible = actor) and an ORACLE is
judgement applied per reading (can evolve = agent). Update scripts are that distinction applied
to dependency maintenance.

**The failure mode already has a name too, and it is the one to guard.** That same rule names
the BROKEN METER: crystallised once, then drifted -- "presents as a frozen, inspectable meter
but is actually drifting". An update script that silently stops matching upstream is exactly
that, and the guard is the one the rule prescribes: re-run the crystal against committed
vectors, and make the not-running loud. A script nobody replays is not a crystal, it is a
belief.

**Community-authored scripts are the same object.** Because the DSL is one grammar, a
community script for a package ace's authors never touched is not a lesser artifact -- it is a
crystal with a different author, and it is judged the same way: does replaying it reproduce the
committed result?

## HELM IS THE KNOWN HARD CASE, AND THE HARDNESS IS THE ALGEBRA

Aaron, 2026-09-12: *"helm is the harder package manager to model cause it requires state
updates sometimes and this is one of our hardest package managers to model in our zsets and
such for 0 down time."*

This sharpens an existing P1 row rather than opening a new one --
`docs/backlog/P1/081KSGS9H0008QG0R002PT5C7J-time-modeled-dependencies-for-helm-clusters-as-long-running-*`
already carries the 2026-05-26 form, *"helm needs time modeled in the dependencies like no
others"*, with the table showing why every other PM escapes it (Maven, npm, apt, brew are all
point-in-time; Helm runs long-lived stateful clusters where postgres v15 and v17 may run side
by side for hours to weeks). What today adds is WHERE the difficulty lands in our own algebra.

**A Z-set models what is TRUE. Zero downtime is a constraint on the PATH.**

A desired cluster state maps onto a Z-set beautifully: resources are elements, an upgrade is a
retraction of the old and an insertion of the new, and DBSP folds it incrementally. That is the
easy half and it is genuinely easy. Three things break on the other half:

1. **The overlap is the SPEC, not a transient.** During a zero-downtime rollout both versions
   are required to be present simultaneously. A single desired-state Z-set has no way to say
   "both, for a while, on purpose" -- it reads the overlap as a diff still to be applied.

2. **A migration cannot be retracted.** This repository already states the reason:
   Z-set retraction is CORRECTION, not a duplicate-guard -- emitting a `-1` revises what we
   BELIEVE, and a schema migration or a CRD conversion has already happened in the world. The
   algebra's inverse is not the world's inverse.

3. **Idempotency (§12) holds for the manifest and not for the migration.** `kubectl apply` of a
   resource is apply-N-times == apply-once. A data migration generally is not, which is why
   ordering and guards exist around it at all.

So a model that constrains only the endpoints under-determines the upgrade: the same start and
end states are reachable by paths that differ in whether service was ever interrupted. The
repository already has the word for a system where the path carries information --
**monodromy**, from `anti-babel-preserve-reconcilability.md`: *two paths around a pole yield
genuinely different results, and that difference is information, not error*. For most package
managers monodromy is a curiosity. For Helm it is the defining feature, and any model that
folds it away has modelled the wrong thing.

**Which makes Helm the honest test of the crystal/agent split above.** A patch bump to a
stateless chart is a crystal. A stateful upgrade with an ordered, partly irreversible migration
is agent work every time it is new -- and the promotion path only earns its keep if what the
agent produced can be frozen INCLUDING its ordering and its irreversible steps, not just its
final manifest. A design validated only where a bump is a version string has not been tested.

## The shape

1. **`ace update <pin>` applies**, rather than only reporting. The classifier already decides
   whether a proposal is `AutoEligible`; nothing acts on the verdict. GENERAL: no repo
   knowledge.
2. **`ace update` emits the COUPLED SET** by reading the REPO'S OWN declarations, and queues
   each edge as work:
   the ones a tool can do (regenerate a derived roster, re-lock) applied directly, the ones
   needing judgement (re-record a research carrier, provision a toolchain in a CI leg) raised
   for an agent with the reason attached.
3. **An edge with no audit is `unknown`, never absent.** This is load-bearing: the SDK bump's
   fourth coupling -- a `cross-verify` leg that spawned `dotnet fsi` with no SDK installed --
   had NO audit. A graph derived only from audits would have reported three edges and been
   silently wrong about the fourth. `ace` must say "three known couplings, and I cannot see
   whether there are others", which is the same three-register discipline the rest of the tree
   keeps.

## Falsifier

Replay 2026-09-12 as the fixture. For each of the four bumps, `ace update` must name the
coupled files BEFORE any CI run, and the set must match what actually had to change. The
dotnet-sdk case is the sharp one: a graph that reports `.mise.toml`, `global.json` and
`mise.lock` and stays silent about the CI leg has scored 3/4 while claiming completeness -- it
must report the fourth as unknown or the falsifier has not been passed.

## Related

- `ace outdated` (#17311) -- the observation half, already landed.
- `dep-update/toy-classify.ts` -- the judgement half, still without a producer acting on it.
- Dependabot CLI (`brew install dependabot`, github.com/dependabot/cli) computes the PROPOSED
  DIFF locally in a container from the same `.github/dependabot.yml`. It is the small slice:
  it answers "what would change" and says nothing about what else must change, nor applies it.
  Worth having as a cross-check on ace's proposals -- a second meter, not a replacement.
- Aaron's standing framing: *externalize the increment graph, because neither humans nor LLMs
  can hold it.* This row is that graph for dependencies.
