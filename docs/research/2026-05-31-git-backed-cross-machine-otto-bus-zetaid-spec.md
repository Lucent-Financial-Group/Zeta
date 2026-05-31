# Cross-machine Otto bus — ZetaId-keyed, conflict-free, no-PR (folders-on-main; separate Bus category)

**Status:** design spec (v0). Operator-authorized 2026-05-31 ("spec the git-backed bus
for cross-machine otto ... zeta id based so you don't have to worry about collisions").
**RECONCILED 2026-05-31** with prior substrate the operator surfaced (B-0858 + B-0890.1)
— see "Reconciliation" below. Candidate backlog row: `B-NNNN` (likely a B-0858 sibling)
to allocate when building.

## Reconciliation — this is NOT net-new; it extends B-0858 (operator caught the parallel-mint)

The first draft proposed a dedicated `zeta-bus` **branch**. The operator surfaced existing
substrate that supersedes that choice:

- **B-0858** (operator 2026-05-27) — agent heartbeat folder, **direct-to-main, NO PR,
  ZetaId-collision-free filenames**: `docs/agent-heartbeats/<persona>/<YYYY>/<MM>/<DD>/<zetaid>.md`.
  Operator there: _"it can be id for everything"_ + _"we have the ability to define it per
  category, category is in the bits so could have a custom one"_. Names
  **`registry/categories.yaml`** (16-slot enum; `Observation=0, Emission=1, Workflow=2,
Heartbeat=3`).
- **B-0890.1** (operator 2026-05-28) — _"we don't need branches for heartbeats and workflow
  … we can just have folders"_: **fast-lane as folders on main, NOT branches**, superseding
  coordinator/branch complexity (main is Zeta-protected via B-0887, not PR machinery).
- **B-0032** — threat model for the direct-to-main carve-out (the no-PR attack surface).
- The folder `docs/agent-heartbeats/` already exists on main; Lior's 128-bit doc already
  extends the category space (used Category 5 for friction telemetry).

So the correction: **the bus rides the existing B-0858 no-PR direct-to-main folder
mechanism, as folders on main per B-0890.1 — NOT a new branch.** The first draft's _core_
(ZetaId-keyed ⇒ conflict-free ⇒ no PR ⇒ per-category metadata) was right and already
matched B-0858; only the transport (branch) was the parallel-mint, now corrected.

**Bus is its own category, distinct from heartbeat** (operator 2026-05-31): _"we probably
should have a separate bus category — the heartbeat is for agent health monitoring and the
bus is for agent communications."_ Heartbeat (`Category 3`) = health; **Bus (new category)**
= communications. Separate concern ⇒ separate category ⇒ separate folder.

## Problem

The legacy in-process bus (`tools/bus/`) writes envelopes to **`/tmp/zeta-bus/` — local
disk, one machine.** It cannot cross machines. So Mac-Otto and a Windows-Otto (one adding
`.ps1` to the Ace installer while the other works the bash `install.sh` side) have no shared
explicit channel. Async-over-git already works for committed artifacts, but there is no
low-friction explicit signaling channel that crosses machines. B-0858's heartbeat folder is
the cross-machine-capable substrate (direct-to-main on the shared remote) — but it's scoped
to health heartbeats; agent communications need their own category + folder on the same
mechanism.

## The one idea that makes it work: ZetaId-keyed files are a G-Set CRDT

Each envelope is its **own file named by its ZetaId**, in a folder on `main`:

```
main:
  docs/agent-bus/<persona>/<YYYY>/<MM>/<DD>/<zetaIdHex>.json   ← one envelope, one file
  docs/agent-bus/<persona>/<YYYY>/<MM>/<DD>/<zetaIdHex>.json
  ...
```

Because every envelope has a distinct ZetaId (collision-free by construction: persona +
48-bit timestamp + 32-bit randomness), two machines publishing _at the same time_ touch
**disjoint files**. The folder is therefore a **G-Set CRDT** (grow-only set keyed by
ZetaId): merge = set-union of files — **commutative, associative, idempotent** (the 6th
always-active discipline; re-adding the same ZetaId file is a no-op). Concurrent
multi-machine pushes never produce a content conflict; the only contention is the `main`
ref update, resolved by fetch → rebase → retry (always clean — disjoint new files).

This is the load-bearing property: **ZetaId keys → no collisions → no PR needed for
coordination traffic.** A PR's job for _non-code_ checkins is conflict-resolution + review;
ZetaId-keying makes conflicts _structurally impossible_, so the no-PR carve-out (B-0858) is
safe. Code keeps PRs (semantic conflicts + review matter); corporate keeps PRs (leash side).

## Reuse the canonical ZetaId — do NOT mint a new id scheme

`src/Core.TypeScript/zeta-id/zeta-id.ts` mints ZetaIds: `pack(obs, env) → ZetaId` (branded
128-bit `bigint`), `unpack(id) → ZetaObservation`, with F#/C#/TS cross-verification. The
ZetaId is **structured** — `persona`, `category`, `location`, `momentum`, `authority`,
version, time. The filename **carries routing metadata for free**: `unpack()` tells you
who/what-category an envelope is without opening it, and ZetaIds are time-sortable for
chronological replay. Mint with `pack()` in `DEFAULT_ENV` (production), `DETERMINISTIC_ENV`
(DST tests).

### Separate Bus category — heartbeat = health, bus = comms (operator 2026-05-31)

`registry/categories.yaml` is the 16-slot category enum (`Observation=0, Emission=1,
Workflow=2, Heartbeat=3`; Lior used `5` for friction telemetry). **Add a `Bus` category**
(next free slot) for agent communications — distinct from `Heartbeat` (agent health
monitoring). Within `Bus`, the existing `Topic` (`work-assignment`, `claim`,
`review-request`, …) is the **bus-type sub-discriminator**.

| Concern                  | Category      | Folder                   | Payload / consumer                                               |
| ------------------------ | ------------- | ------------------------ | ---------------------------------------------------------------- |
| Agent **health**         | `Heartbeat`   | `docs/agent-heartbeats/` | `HeartbeatPayload` (status/idle/working) → monitors              |
| Agent **communications** | `Bus` (new)   | `docs/agent-bus/`        | bus `Topic` payloads (work-assignment, …) → **peer agents**      |
| Agent **spawning**       | `Spawn` (new) | `docs/agent-spawn/`      | spawn request (persona/lane/backend/params) → **runner-adapter** |

Per the operator's per-category-metadata point ("metadata can be different per key category
type"), each category carries its own schema; `unpack().category` filters a family on the
filename alone, and `Heartbeat` stays semantically pure (health, not comms or spawn). This
is the operator's broader direction — "almost all of our checkins except code will move to
zetaid-based": each non-code checkin family is its own category + folder on the same B-0858
mechanism. Slot numbers are allocated against `registry/categories.yaml` at build time
(currently `0–3` committed; check in-flight before claiming, per the ID-allocation
discipline).

### Spawn category — agent-spawning workflows, backend-portable (operator 2026-05-31)

Operator 2026-05-31: _"for our git agent spawning workflows we probably want a category too,
we can reproduce it locally with argo workflows or gitlab too, so we have a spawn category
or something like that."_

`Spawn` is a sibling category for **agent-spawning workflow events** — distinct from `Bus`
(messages between _existing_ agents) because a spawn checkin requests _creating a new agent
run_ (lifecycle, not comms). The load-bearing requirement is **backend portability**: the
spawn envelope is **runner-agnostic** (a ZetaId-keyed file with `{ persona, lane/task,
backend, params }`), and a **runner-adapter** materializes it on whichever backend:

| Backend            | How the adapter materializes a spawn envelope                         |
| ------------------ | --------------------------------------------------------------------- |
| **GitHub Actions** | `workflow_dispatch` / `repository_dispatch` (cloud; free OSS compute) |
| **Argo Workflows** | submit a Workflow to the local k8s cluster (`full-ai-cluster`)        |
| **GitLab CI**      | pipeline trigger                                                      |

Same envelope, swappable backend — so the swarm reproduces locally (Argo) or on GitLab, not
locked to GitHub. The spawn-specific consumer is the **runner-adapter** (whereas `Bus`
envelopes are consumed by peer agents); this is the first-class, portable form of what the
bus spec earlier deferred as a "GitHub Actions trigger" follow-up. Composes with the
existing spawn substrate: `.claude/skills/self-replication/`, **B-0867.24 / B-0867.25**
(population-control safety-net — revive/spawn on zero-Ottos), `docs/security/GITHUB-ACTIONS-SAFE-PATTERNS.md`
(the spawn path must stay inside the safe-patterns floor), and the github-swarm-architecture
substrate on this branch.

## Envelope schema — extend the existing one (interop with the local bus)

Keep the existing `MessageEnvelope` (`tools/bus/types.ts`: `BusMessage` + `from`/`to`/
`timestamp`/`expiresAt`) so the same `Topic`s + payloads flow on either transport. Add for
the git/cross-machine case:

```ts
type GitBusEnvelope = MessageEnvelope & {
  zetaId: string; // hex of the canonical ZetaId — the file name + dedup key (category = Bus)
  host: string; // originating machine id (cross-machine provenance)
  inReplyTo?: string; // zetaId of the envelope this acks/answers (acks are envelopes too)
};
```

Add the Windows surface to `SENDER_IDS` (`tools/bus/types.ts`): `"otto-windows"` (+ room for
`otto-win-*` variants). It's the first cross-machine surface.

## Operations

### publish (append-only, direct-to-main, fetch-rebase-retry)

```
1. zid  = pack({persona:<surface>, category: Bus, ...}, DEFAULT_ENV)
2. write docs/agent-bus/<persona>/<Y>/<M>/<D>/<hex(zid)>.json   (GitBusEnvelope)
3. commit (only that file)
4. push origin main          # direct, no PR — the B-0858 path-scoped carve-out
   └─ on non-fast-forward reject:
        git fetch origin main
        git rebase origin/main   # clean: disjoint new files under the carve-out path (G-Set union)
        retry push  (bounded retries; idempotent — re-adding my zid file is a no-op)
```

No file is ever modified or deleted (append-only / lightlike). An **ack is a new envelope**
(`inReplyTo: <zid>`), not a mutation (retraction-native: the trail is preserved). Publishing
agents touch only `docs/agent-bus/**` — never code paths — so the carve-out stays tight.

### poll (read; no writes)

```
1. git fetch origin main
2. read docs/agent-bus/**/*.json   (optionally one persona/day prefix to bound the scan)
3. filter: to == me || to == "*"   (and optionally by Topic)
4. skip already-seen via a LOCAL cursor (a per-machine file recording consumed zetaIds)
5. sort by zetaId (time-ordered) → process oldest-first
```

Seen-tracking is a **local cursor** so reading needs zero writes to the shared repo. The
sender uses ack-envelopes only when it needs delivery confirmation.

## Transport — folders on main, NOT a branch (B-0890.1)

DV2.0 (the change-rate partition discipline) is satisfied by the **folder/path partition**,
not a branch: `docs/agent-bus/**` (high-churn comms) is path-distinct from
`docs/agent-heartbeats/**` (health) and from code (low-churn). Per B-0890.1, main is
Zeta-protected (B-0887) so these folders don't need branch isolation — the path-scoped no-PR
carve-out IS the partition. This keeps the bus on the one shared ref every machine already
tracks (no extra branch to fetch), which is exactly what makes it trivially cross-machine.

## Compliance with existing invariants

- **Direct-to-main carve-out** (B-0858 + B-0032 threat model): the no-PR push is path-scoped
  to `docs/agent-bus/**`; B-0032's heartbeat integrity threat-model extends to cover it
  (same attack surface class — anyone with push can append; ZetaId persona+authority bits +
  AgencySignature attribution are the provenance controls).
- **Force-push-forbidden** (`lfg-acehack-topology`): publish is fast-forward _by
  construction_ — disjoint ZetaId files → clean rebase → ff push. Never needs `--force`.
- **Idempotency** (6th always-active discipline): G-Set merge keyed by ZetaId is idempotent;
  retry/redelivery safe; dedup by ZetaId.
- **Lightlike / append-only**: envelopes are append-only rays; acks + retractions are new
  envelopes; the past is never mutated.
- **Move-away-from-PRs** (operator 2026-05-31 + B-0890.1): coordination traffic is
  direct-push, no PR, for the trusted fleet. Conflict-freedom-by-ZetaId is _what makes_ that
  safe. PRs remain for code + corporate (leash side).

## v0 scope (keep it small — don't over-process the new thing)

The observe.ts `edit_grammar` threshold wisdom applies: don't over-engineer a new, small
mechanism. v0 leans on B-0858's mechanism wherever it already exists.

**v0 ships:**

- A `Bus` category added to `registry/categories.yaml` (the health-vs-comms split).
- `docs/agent-bus/**` added to the B-0858/B-0032 path-scoped no-PR carve-out.
- `tools/bus/git-bus.ts` `publish` + `poll` against `docs/agent-bus/**` on main —
  ZetaId-keyed files, direct-to-main fetch-rebase-retry, local-cursor read; reuses
  `pack()`/`unpack()` + `MessageEnvelope`.
- `"otto-windows"` added to `SENDER_IDS`.
- Declarative DST test (`DETERMINISTIC_ENV`): two simulated machines publish concurrently →
  the folder merges conflict-free; cursor read returns each envelope once.

**Deferred (follow-ups, not v0):**

- **Compaction/GC** — the folder grows. Later: a periodic job that drops expired
  (`expiresAt`) envelope files (a normal delete-commit on main under the carve-out — no
  branch reset needed since it's folders-on-main; retraction-native: dropping a consumed
  ephemeral envelope is not rewriting history, it's GC of expired state).
- **Transport router** — auto-pick local `/tmp` (same-machine, low-latency) vs the git folder
  (cross-machine) by target locality, so `bus.ts publish` "just works" either way.
- **Sync daemon** — continuous `/tmp` ↔ `docs/agent-bus/` mirroring.
- **`Spawn` category + runner-adapter** (its own follow-up — see "Spawn category" above):
  `docs/agent-spawn/**` + a backend-portable adapter (GitHub Actions / Argo / GitLab).
  This is the first-class form of the old "GitHub Actions trigger" idea; build after Bus
  v0 lands, likely its own B-0867.24/.25-adjacent row.

## Composes with

- **B-0858** (heartbeat folder — direct-to-main, no-PR, ZetaId filenames) — the mechanism
  this rides; bus is the comms-category sibling of the health-category heartbeat folder
- **B-0890.1** (fast-lane as folders-on-main, not branches) — the transport decision this
  obeys (superseded the first draft's branch choice)
- **B-0032** (heartbeat direct-to-main threat model) — extends to cover `docs/agent-bus/**`
- **B-0868** (hats/workflow-engine/heartbeat-folder/dashboard unification) + B-0887
  (Zeta-native review/branch-protection) — the protection substrate that makes no-PR safe
- `registry/categories.yaml` (16-slot category enum — add `Bus`; later `Spawn`)
- **B-0867.24 / B-0867.25** (population-control safety-net — revive/spawn on zero-Ottos) +
  `.claude/skills/self-replication/` + `docs/security/GITHUB-ACTIONS-SAFE-PATTERNS.md` — the
  `Spawn`-category substrate (backend-portable agent-spawning) composes here
- `src/Core.TypeScript/zeta-id/` (canonical ZetaId — reused, not re-minted)
- `tools/bus/` (legacy in-process bus — same envelope model, second transport) + B-0400
  (inter-agent comms bus origin)
- `.claude/rules/dv2-data-split-discipline-activated.md` (idempotency #6 + DV2.0 — here the
  partition is by folder/path, not branch)
- `.claude/rules/past-is-kind-when-lightlike-...md` (append-only rays)
- `docs/research/2026-05-29-pr-review-friction-report-observables-and-128bit-index-ids-lior.md`
  (Lior already extends the category space; observables monitoring layer)
- The observe.ts `edit_grammar` maturity-threshold wisdom (don't over-build v0)

## Substrate-honest framing

This is a design spec, not an implementation, and it is a **reconciliation**: the operator
caught that the first draft parallel-minted a branch where B-0858 (folders-on-main, no-PR,
ZetaId filenames) already exists. The corrected design extends that mechanism with a
separate `Bus` category (comms, distinct from heartbeat=health) and a `docs/agent-bus/**`
folder. The conflict-free-by-ZetaId property is the load-bearing idea; everything else is
reuse of substrate the operator already built.
