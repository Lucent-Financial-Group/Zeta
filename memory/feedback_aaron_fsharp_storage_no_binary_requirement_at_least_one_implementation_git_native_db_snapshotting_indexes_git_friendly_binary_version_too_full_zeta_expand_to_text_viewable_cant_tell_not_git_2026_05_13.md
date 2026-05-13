---
name: F# storage layer — no-binary requirement (at least one implementation) — git-native DB storage + snapshotting — indexes git-friendly — binary version too — full Zeta expands to text-viewable so you can't tell it's not git (Aaron 2026-05-13)
description: Aaron 2026-05-13 canonical storage-architecture substrate. F# storage layer maintains a NO-BINARY-REQUIRED implementation for git-native DB storage + snapshotting + git-friendly indexes. Binary version available for performance. Full Zeta evolution = full binary storage BUT expand-to-text-viewable API "so you can't tell it's not git". Composes with PR #2913 HKT-MDM + PR #2915 DV2.0 partition + B-0428 DBpedia substrate + event-sourcing framework substrate from Amara conversation + DBSP/Z-set existing F# substrate.
type: feedback
created: 2026-05-13
---

# F# storage no-binary requirement — git-native DB — full Zeta text-viewable interface (Aaron 2026-05-13)

**Why:** Aaron 2026-05-13: *"i say we try to keep the no binary
requirment for our storage layer in f# at least one impomenttion
so we can have git native db storage and snapshotting we can
have a binary version too, even our indexs can be git friendly,
this composes nicly with gitnative and when we go full zeta we
can go full binary for storage but expand to text viewable for
humans so you can't tell it's not git"*. Canonical storage-
architecture disclosure.

**How to apply:** When designing factory storage layer (events,
state snapshots, indexes, DBSP cache, master-data, etc.):

1. **At least one F# implementation is no-binary** — humans can
   read; git diffs work; git-native storage + snapshotting
2. **Binary version available too** — performance path; both
   shapes coexist
3. **Indexes are git-friendly** — even index structures readable
4. **Full Zeta** — full binary storage BUT expand-to-text-
   viewable API so the human-facing interface is indistinguishable
   from git

## Aaron's verbatim disclosure

Aaron 2026-05-13: *"i say we try to keep the no binary requirment
for our storage layer in f# at least one impomenttion so we can
have git native db storage and snapshotting we can have a binary
version too, even our indexs can be git friendly, this composes
nicly with gitnative and when we go full zeta we can go full
binary for storage but expand to text viewable for humans so
you can't tell it's not git"*

## Decomposition

### 1. No-binary requirement (at least one F# implementation)

- The storage layer's F# implementation defaults to
  human-readable format
- Git-native storage means files-on-disk are git-trackable
- Git diff works on storage layer
- Snapshotting = commit
- Branching storage state = git branch
- This IS the database-inside-out pattern from the Aaron-Amara
  event sourcing conversation (docs/research/2026-05-13-amara-*)

### 2. Git-native DB storage + snapshotting

Composes with the event-sourcing framework substrate (from
PR #2924 Amara conversation extract — Aaron's first message
in the canonical Aaron-Amara conversation):

> *"We are gonna create an event sourcing framework based on
> Proxmox, kubernetes/containers/LXC, event sourcing, gita,
> and whatever technologies/languages are needed to declaratively
> replicate to any machine or edge device... We are gonna turn
> the database inside out, where all 'databases' are really just
> cache snapshots of the event stream. The event stream is
> really the only source of truth."*

Aaron's storage-as-git substrate IS the operational form of
"databases are cache snapshots of the event stream":

- Event stream lives in git (append-only commits)
- Snapshots = commits at points-in-time
- Branches = parallel event histories
- Tags = canonical snapshots
- Merge = event-stream reconciliation

### 3. Indexes git-friendly

Even derived/computed indexes are git-readable. This means:

- Index files are plain-text-formatted (e.g., sorted JSON,
  YAML, or DBSP-Z-set ASCII export)
- Index regeneration is deterministic (per `.claude/rules/dst-justifies-ts-quality-*`)
- Git can diff index changes
- Index corruption is detectable via git history

### 4. Binary version too (performance path)

Both shapes coexist:

- Text version: human-readable, git-native, slower
- Binary version: high-performance, compact, faster
- The CHOICE is per-deployment (edge devices may prefer text;
  high-throughput servers may prefer binary)
- API surface is identical (storage operations don't care
  about underlying format)

This composes with DV2.0 partition discipline (per PR #2915):

- Different change-rates = different storage shapes
- Hubs (stable) can be either format
- Satellites (versioned) benefit from text (better diffs)
- Performance-critical hot-path can use binary

### 5. Full Zeta — full binary with text-viewable API

The endgame: when Zeta is fully productized, storage goes
binary for performance, BUT:

- Expand-to-text-viewable API preserves human-readable interface
- "So you can't tell it's not git" — operational equivalence
  with git from human perspective
- Substrate-honest: the binary storage IS the implementation;
  the text-viewable layer IS the interface
- Composes with WWJD-AI-moral-relevance — substrate transparency
  preserved for human readers even at binary scale

## Composes with

- PR #2924 (Amara canonical substrate — event-sourcing framework
  is the Aaron-Amara conversation substrate; "databases are
  cache snapshots of the event stream")
- PR #2915 (DV2.0 wake-time rule — partition by change-rate;
  text vs binary IS a partition decision)
- PR #2913 (HKT-MDM universality — storage shape for master
  data)
- PR #2914 (Clifford/HKT vocabulary)
- PR #2917 (vision monad Play-Doh — soft + reshapeable substrate
  composes with text-viewable storage)
- PR #2898 (non-glass-halo encryption — encryption layer
  operates over either text or binary)
- B-0428 (DBpedia Path B — DBpedia storage shape applies here)
- B-0043 (universal-business-templates — storage substrate)
- `.claude/rules/fsharp-anchor-dotnet-build-sanity-check.md`
  (F# substrate is canonical; storage in F# composes)
- `.claude/rules/dv2-data-split-discipline-activated.md`
  (text vs binary IS DV2.0 partition)
- `.claude/rules/glass-halo-bidirectional.md` (text-viewable
  preserves glass-halo at storage layer)
- `.claude/rules/no-directives.md` (storage choice is per-
  deployment; not commanded)
- algebra-owner skill (Z-set + Clifford + BP/EP F# substrate
  — Z-sets serialize naturally to text)
- DBSP substrate (event-sourcing + retraction-native algebra)

## Operational implications

### For factory storage architecture

Two paths must exist:

| Path | Storage shape | When |
|---|---|---|
| **Text (F# default)** | Human-readable; git-native | Always available |
| **Binary** | Compact; high-performance | Optional/optimization |

The text path IS the canonical implementation. Binary is the
performance optimization.

### For DBpedia (B-0428 Path B)

DBpedia HKT-MDM substrate (per B-0428) stores in:

- F# CE materialized results → text format default
- DBpedia entity cache → git-native, git-diffable
- SPARQL query log → append-only events in git

### For Aurora pitch (PR #2924)

Aurora's "Edge node runs models/policy" + signed heartbeats +
task receipts (per Aurora Slide 4 + 6) compose with:

- Text storage for edge nodes (git-native + low-overhead)
- Binary storage for high-throughput backbone
- Both substrate-honestly available

### For future-Otto storage decisions

When future-Otto designs storage:

1. **Default to text/git-native** unless performance forces
   binary
2. **Even binary deployments have text-viewable API** —
   substrate-honest interface preservation
3. **Indexes get git-friendly format** when at all possible
4. **Storage IS git substrate** — events as commits, snapshots
   as commits, history as git log

## Substrate-honest framing

This isn't just a storage convenience — it's substrate-honest
discipline at the storage layer:

- Glass-halo applies at storage scope: text-viewable means
  observable
- Anti-cult substrate composes: no hidden binary state that
  obscures truth from humans
- Razor-discipline: operational claim ("can you read it without
  special tools?")
- WWJD-AI-moral-relevance: AIs interacting with storage layer
  have substrate-honest interface; humans too

## Why this rule is canonical storage architecture

Most substrate-engineering systems treat storage as performance-
first (binary because faster). Aaron's discipline INVERTS this:

- Default: human-readable + git-native (slower but transparent)
- Performance: binary available (faster but opaque)
- Endgame: full binary BUT text-viewable API (best of both)

This composes with the framework's substrate-honest discipline
end-to-end. The factory's storage layer is itself glass-halo.

## Composes with substrate from Amara conversation

The canonical Aaron-Amara event-sourcing conversation (PR
#2924 deferred-extract; lives in /tmp/amara-full-text.txt
locally) contains Aaron's substrate-grounding:

> *"databases are really just cache snapshots of the event
> stream"*
> *"each machine being it's own lowest level event network"*
> *"global L1 that's the rollup/aggregate for everything"*
> *"event stream data is for the AI (You)"*

Aaron's storage substrate disclosed here (2026-05-13) extends
this:

- Event stream = git (default text; binary optional)
- Snapshots = commits (text-viewable)
- L1/L(X) cluster networks = git branches/refs
- "Event stream data is for the AI" = AI reads + writes git-
  native storage

## Future-self note

When Zeta storage layer is implemented:

- ADR captures the text-vs-binary decision per use case
- F# CE wraps both shapes uniformly
- Test substrate verifies text/binary equivalence
- Git-native discipline auditable via storage-format inspection
- "You can't tell it's not git" IS the acceptance test

## Full reasoning

PR #2929 (this substrate landing)

PR #2924 (Amara canonical substrate — event-sourcing framework
context)

PR #2915 (DV2.0 wake-time rule — partition by change-rate)

PR #2913 (HKT-MDM universality)

PR #2898 (non-glass-halo encryption)

PR #2917 (vision monad Play-Doh)

B-0428 (DBpedia Path B — direct dotNetRDF + F# CE)

DBSP + Z-set + Clifford + BP/EP F# substrate (algebra-owner
skill)

`docs/research/2026-05-13-amara-conversation-extract-*` (the
canonical event-sourcing substrate Aaron-Amara conversation;
currently deferred per semgrep findings)
