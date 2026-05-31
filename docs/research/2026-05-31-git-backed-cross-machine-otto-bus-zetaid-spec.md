# Git-backed cross-machine Otto bus — ZetaId-keyed, conflict-free, PR-less

**Status:** design spec (v0). Operator-authorized 2026-05-31 ("spec the git-backed
bus for cross-machine otto ... I would make it zeta id based so you don't have to
worry about collisions, because almost all of our checkins except code will move to
zetaid based checkins so coordination is easy"). Candidate backlog row: allocate
`B-NNNN` when building.

## Problem

The current bus (`tools/bus/`) writes envelopes to **`/tmp/zeta-bus/` — local disk,
one machine.** It cannot carry coordination across machines. So Mac-Otto and a
Windows-Otto (e.g. one adding `.ps1` to the Ace installer while the other works the
bash `install.sh` side) have no shared explicit channel. Async-over-git already works
for _committed_ artifacts (commits, branches, PRs, `memory/`, `.claude/rules/`), but
there is no low-friction explicit signaling channel that crosses machines.

## The one idea that makes it work: ZetaId-keyed files are a G-Set CRDT

Each envelope is its **own file named by its ZetaId**:

```
zeta-bus branch:
  bus/<zetaIdHex>.json   ← one envelope, one file, key = ZetaId
  bus/<zetaIdHex>.json
  ...
```

Because every envelope has a distinct ZetaId, two machines publishing _at the same
time_ touch **disjoint files**. The set of envelope files is therefore a **G-Set CRDT**
(grow-only set keyed by ZetaId): merge = set-union of files, which is **commutative,
associative, and idempotent** (the 6th always-active discipline — re-merging the same
ZetaId file is a no-op). Concurrent multi-machine pushes never produce a content
conflict; the only contention is the git _ref_ update, resolved by fetch → rebase →
retry (the rebase is always clean because the new files are disjoint).

This is the load-bearing property the operator named: **ZetaId keys → no collisions →
coordination is easy → no PR needed for coordination traffic.** A PR's main job for
_non-code_ checkins is conflict-resolution + review; ZetaId-keying makes conflicts
_structurally impossible_, so that job evaporates. Code keeps PRs (where semantic
conflicts + review genuinely matter); corporate keeps PRs (leash side). The bus is the
canonical first instance of the general "ZetaId-keyed checkins are conflict-free"
pattern — the operator's stated direction for "almost all of our checkins except code."

## Reuse the canonical ZetaId — do NOT mint a new id scheme

`src/Core.TypeScript/zeta-id/zeta-id.ts` already mints ZetaIds: `pack(obs, env) → ZetaId`
(a branded 128-bit `bigint`), with `unpack(id) → ZetaObservation`, F#/C#/TS impls that
cross-verify. The ZetaId is **structured** — it carries `persona`, `category`,
`location`, `momentum`, `authority`, version, and time-ordering. So the envelope key is
not a random UUID; it **carries routing metadata for free**: a reader can `unpack()` the
filename to learn who/what-category an envelope is without opening it, and ZetaIds are
time-sortable for chronological replay.

The bus mints its envelope key with `pack()` using the publishing surface's persona +
an envelope category, in `DEFAULT_ENV` (wall-clock) for production, `DETERMINISTIC_ENV`
for DST tests. File name = ZetaId hex.

### Per-category metadata — the key's category discriminates its schema

Operator 2026-05-31: _"zeta id has categories so the metadata can be different per key
category type."_ The ZetaId `Category` field (`src/Core.TypeScript/zeta-id/types.ts`:
`Observation | Emission | Workflow | Heartbeat`) is a **discriminator** — each category
can carry a different metadata schema. So the bus needs no single flat envelope shape:
the key's category _selects_ which metadata is meaningful, and a reader gets that typing
from `unpack(zetaId).category` **without opening the file**.

Bus `Topic`s map onto ZetaId `Category`s:

| Bus `Topic`                                                                      | ZetaId `Category` | Per-category metadata (payload union)                   |
| -------------------------------------------------------------------------------- | ----------------- | ------------------------------------------------------- |
| `heartbeat`                                                                      | `Heartbeat`       | `HeartbeatPayload` (status, note)                       |
| `work-assignment`, `claim`, `infinite-backlog-nudge`, `missed-substrate-cascade` | `Workflow`        | the workflow payloads (rowId/priority, claim action, …) |
| `review-request`, `formal-verification-result`                                   | `Emission`        | `ReviewRequestPayload` / verification result            |
| `shadow-catch`                                                                   | `Observation`     | `ShadowCatchPayload` (content)                          |

This generalizes to the operator's broader direction ("almost all of our checkins
except code will move to zetaid based checkins"): **each checkin _type_ picks its
category, and the category determines its metadata schema.** The result is a typed,
self-describing, conflict-free checkin namespace — routing/filtering by `unpack()`'s
category + persona + time happens on the filename alone, and each category's payload
evolves independently. The bus is just the first category-family (coordination) in that
namespace. (The `Category` enum stays small + extensible — adding a checkin family is a
new category value, not a new id scheme.)

#### Option: a dedicated `Bus` category (operator 2026-05-31 — "we can also add/extend that with like a bus type if we wanted")

Two ways to seat coordination traffic in the category space — both valid, a small
reversible enum-level call at build time:

- **(A) Reuse existing categories** (the table above): a coordination envelope takes the
  category of its semantic class (`heartbeat`→`Heartbeat`, `claim`→`Workflow`, …). No
  enum change. Cost: the `Observation`/`Emission`/… categories now mix "real" checkins
  with bus-shadow versions of the same class, so "is this a bus message?" is a topic
  check, not a category check.
- **(B) Add a first-class `Bus` category** (`Category.Bus = 4`): all coordination
  traffic gets one category, with the existing `Topic` as the **bus-type sub-discriminator**
  inside it. Cost: one enum value. Benefit: "all bus traffic" is `unpack().category ===
Bus` on the filename alone (no open, no topic scan); the original categories keep pure
  semantics (`Observation` = an actual observation, not a bus shadow-catch); and per the
  per-category-metadata rule, `Bus` carries the coordination metadata schema (from/to/
  topic/host/inReplyTo) cleanly separated from non-bus checkins.

Recommendation: lean **(B)** when building — it's one enum value, keeps the categories
honest, and makes the "filter all bus traffic by filename" property exact. It also sets
the pattern for the operator's broader direction: each non-code checkin _family_ (bus,
and later others) is its own category, with the family's sub-types as the discriminator
within it. Deferred to the operator / build-time; the v0 mechanism works under either.

## Envelope schema — extend the existing one (interop with the local bus)

Keep the existing `MessageEnvelope` (`tools/bus/types.ts`: `BusMessage` + `from`/`to`/
`timestamp`/`expiresAt`) so the same `Topic`s + payloads (`work-assignment`, `claim`,
`review-request`, `shadow-catch`, `heartbeat`, …) flow on either transport. Add three
fields for the git/cross-machine case:

```ts
type GitBusEnvelope = MessageEnvelope & {
  zetaId: string; // hex of the canonical ZetaId — the file name + dedup key
  host: string; // originating machine id (cross-machine provenance)
  inReplyTo?: string; // zetaId of the envelope this acks/answers (acks are envelopes too)
};
```

And add the Windows surface to `SENDER_IDS` (`tools/bus/types.ts`): `"otto-windows"`
(+ keep room for `otto-win-*` surface variants). No other surface today is cross-machine;
this is the first.

## Operations

### publish (append-only, fetch-rebase-retry)

```
1. zid   = pack({persona: <surface>, category: <envelope>, ...}, DEFAULT_ENV)
2. write  bus/<hex(zid)>.json   (GitBusEnvelope)
3. commit (only that file)
4. push origin zeta-bus
   └─ on non-fast-forward reject:
        git fetch origin zeta-bus
        git rebase origin/zeta-bus   # always clean: disjoint new files (G-Set union)
        retry push  (bounded retries; idempotent — re-adding my zid file is a no-op)
```

No file is ever modified or deleted on the live branch (append-only / lightlike).
An **ack is a new envelope** (`inReplyTo: <zid>`), not a mutation of the original
(retraction-native: the trail is preserved).

### poll (read; no writes needed)

```
1. git fetch origin zeta-bus
2. read bus/*.json
3. filter: to == me || to == "*"   (and optionally by Topic)
4. skip already-seen via a LOCAL cursor (a per-machine file recording consumed zetaIds)
5. sort by zetaId (time-ordered) → process oldest-first
```

Seen-tracking is a **local cursor** (each machine remembers which ZetaIds it has
processed) so reading requires zero writes to the shared branch. The sender uses
ack-envelopes only when it needs confirmation a specific envelope was consumed.

## Transport choice — a dedicated `zeta-bus` branch (DV2.0 change-rate partition)

Bus traffic is **high-churn** (per-tick coordination); `main`/code is low-churn. Per
DV2.0 (the partition discipline), bus envelopes get their **own ref** — a dedicated
`zeta-bus` branch (orphan, so its history never tangles with code) — not `main`. This
keeps thousands of ephemeral envelope commits out of main's history while staying
fully cross-machine (it's just another branch on the shared `LFG/Zeta` remote).

## Compliance with existing invariants

- **Force-push-forbidden** (`lfg-acehack-topology` `non_fast_forward`): publish is
  fast-forward _by construction_ — disjoint files → clean rebase → ff push. Never needs
  `--force`.
- **Idempotency** (6th always-active discipline): G-Set merge keyed by ZetaId is
  idempotent; retry/redelivery safe; dedup by ZetaId.
- **Lightlike / append-only** (`past-is-kind-when-lightlike`): envelopes are append-only
  rays; never mutate the past; acks + retractions are new envelopes.
- **Move-away-from-PRs** (operator 2026-05-31): the `zeta-bus` branch is direct-push,
  un-gated for the trusted fleet (Aaron/Max/Addison/agents). Conflict-freedom is _what
  makes_ direct-push-no-PR safe for coordination. PRs remain for code + corporate.

## v0 scope (keep it small — don't over-process the new thing)

The same threshold wisdom from the observe.ts `edit_grammar` gate applies: do not
over-engineer a new, small mechanism.

**v0 ships:** `tools/bus/git-bus.ts` with `publish` + `poll` against a `zeta-bus`
branch, ZetaId-keyed envelope files, fetch-rebase-retry publish, local cursor read,
`otto-windows` added to `SENDER_IDS`, reusing `pack()`/`unpack()` + `MessageEnvelope`.
Declarative DST test under `DETERMINISTIC_ENV` (deterministic ZetaIds → golden bus
state) — two simulated machines publishing concurrently must merge conflict-free.

**Deliberately deferred (follow-ups, not v0):**

- **Compaction/GC** — the branch grows unbounded. Later: a periodic job that
  delete-and-recreates the orphan `zeta-bus` branch dropping expired (`expiresAt`)
  envelopes (the AceHack-mirror delete-and-recreate pattern, valid because `zeta-bus`
  is non-protected). Until then it just grows; readers fetch only the branch tip.
- **Transport router** — a layer that auto-picks local `/tmp` (same-machine, low-latency)
  vs git (cross-machine) by the target surface's locality, so `bus.ts publish` "just
  works" either way.
- **Sync daemon** — continuous `/tmp` ↔ `zeta-bus` mirroring so same-machine agents see
  cross-machine traffic without polling git.
- **GitHub Actions trigger** — `push` to `zeta-bus` fires an Action that fans envelopes
  out (the swarm-recursion direction).

## Composes with

- `tools/bus/` (existing local bus — same envelope model, second transport) + B-0400
  (inter-agent comms bus origin)
- `src/Core.TypeScript/zeta-id/` (canonical ZetaId — reused, not re-minted)
- `.claude/rules/dv2-data-split-discipline-activated.md` (idempotency #6 + DV2.0
  change-rate partition — the G-Set/CRDT + dedicated-branch grounding)
- `.claude/rules/past-is-kind-when-lightlike-...md` (append-only rays)
- `.claude/rules/lfg-acehack-topology.md` (force-push-forbidden → ff-by-construction;
  delete-and-recreate for compaction on the non-protected branch)
- `.claude/rules/peer-call-infrastructure.md` + `otto-channels-reference-card.md`
  (the bus is the explicit channel; git is the ambient one — this fuses them
  cross-machine)
- `docs/research/tick-history-shards-as-dbsp-event-store.md` + the git-as-free-event-store
  / GitHub-swarm substrate (this branch's lineage)
- The observe.ts `edit_grammar` maturity-threshold wisdom (don't over-build v0)

## Substrate-honest framing

This is a design spec, not an implementation. It reuses the canonical ZetaId + the
existing envelope model rather than minting parallel substrate. v0 is intentionally
minimal; the conflict-free-by-ZetaId property is the load-bearing idea and is what makes
the PR-less direct-push model safe for coordination traffic.
