# TypeScript is the canonical implementation — and the three things that does not license

Date: 2026-09-04
Status: recorded. The direction is the maintainer's; the consequences below are argued, and two of
them are checkable today.

## The direction

Maintainer, 2026-09-04, on where the corporate register's port layer should live:

> *"typescript is what we want to turn into the canonical"*

This is recorded because the same work item carries the OPPOSITE-SOUNDING framing four passes
earlier — `## Pass 6 — the F# engine as main` — and a reader arriving at either one alone would
draw the wrong conclusion.

## The two statements do not conflict, and the distinction is the whole point

Pass 6 corrected the reactor's blocked/paused/menu semantics to match `src/Core/WorkflowEngine.fs`.
That correction stands, and it was never a claim about which language is the source of truth. It was
a claim about **which implementation had already thought a problem through**:

| divergence | what F# had already worked out |
|---|---|
| blocked state carried no dependency | `NamedBoundedWait of ctx * dep * eta` — holding with no named dependency is the standing-by failure |
| pause had no way out | the Paused state requires a real unpause transition |
| the menu returned ONE action | a menu omitting valid options is COERCIVE |

Deferring to the implementation that has the better answer is not the same act as appointing a
canonical source. Conflating them is how a good decision becomes an appointed hub —
[`itron-hub-patent-boundary-p2p-is-the-upgrade.md`](../../.claude/rules/itron-hub-patent-boundary-p2p-is-the-upgrade.md)
draws exactly this line: **the discriminator is exit, not degree.** Where either language may hold
the better answer and the treaty can adjudicate, deference is chosen. Where one language must be
routed through, it holds you.

## The direction is already the operating reality, which is why it is cheap to state

Not a plan. Measured in the tree today:

| | where it lives |
|---|---|
| the treaty transcript | `src/Core.TypeScript/workflow-engine/workflow-treaty-transcript.json` — **in the TS tree** |
| who WRITES it | `src/Core.TypeScript/workflow-engine/generate-workflow-transcript.ts` |
| who READS and replays it | `src/Core/WorkflowEngine.Tests.fs` |

283 vectors across five families — `AgentTransition` 110, `WorkLifecycleTransition` 121,
`PostResultTransition` 22, `MenuGeneration` 19, `CycleClose` 11. TypeScript generates; F# conforms.

`MenuGenerator.fs` records the pattern in its own header, from the other side:

> *"That generator was built in TypeScript first, which left the newest and most load-bearing part
> of the agent loop as the ONE part with no F# counterpart — and therefore outside
> `workflow-treaty-transcript.json`."*

TS-first, F#-follows, the treaty makes the following checkable. That is what canonical means here,
and it was already the practice.

## What it does NOT license

### 1. It does not license a treaty with a hole in it

`MenuGenerator.fs` states the governing rule, and it is the sharpest sentence on the subject
anywhere in this repo:

> *"A cross-language treaty with a hole in it is the vacuity class at the level of the treaty: it
> reads as 'the two implementations agree' while the part most likely to drift is unchecked."*

Canonical-TS makes holes MORE tempting, not less: if TS is the source of truth, the reflex is that
F# conformance is optional. It is the opposite. A single implementation cannot be falsified — nothing
exists to disagree with it — which is why
[`dual-use-detection-is-neutral-oracle-decides.md`](../../.claude/rules/dual-use-detection-is-neutral-oracle-decides.md)
insists a second meter is the only way the first is ever known to be wrong. **Canonical decides who
writes the vectors. It does not decide whether anyone checks them.**

### 2. It does not make "TS-only" a gap by default

The corporate register — org chart, cascade, the five ports, `fidelityOf`, the `queue_snapshot` and
`qa_cycle` facts — exists **only** in TypeScript. F# has no counterpart to any of it.

That is not a hole in the treaty, because a treaty adjudicates between two implementations of one
thing and there is no second implementation. Ports are I/O adapters; adapters are precisely where
two languages *should* diverge, since each reaches its own host's filesystem, processes and network.

The distinction worth keeping is **adapter vs rule**:

| | example | if F# ever implements it |
|---|---|---|
| **adapter** | `directoryIntake`, `gitWorktreeChangeControl`, `commandReview` | no obligation — different host, different code |
| **rule** | `fidelityOf`: *replayable iff every port is simulated* | it is a shared semantic and belongs in the treaty |

`fidelityOf` is a rule, not an adapter. It is TS-only today and that is fine because nothing else
computes it — but it is the first thing that would need vectors if a second implementation appeared.

### 3. It does not make the org event log a private format

This is the one live edge, and it is worth naming before it bites.

`queue_snapshot` and `qa_cycle` are new facts written into a PERSISTED event log that `org-fold.ts`
reads back. A persisted format read by one program is an internal detail. A persisted format read by
**two** is a wire format, and wire formats are exactly what golden vectors exist for.

> **The moment a second implementation reads the org event log, the `OrgFact` shapes join the
> treaty.** Until then they are internal, and saying so out loud is what stops the transition from
> happening silently.

## The falsifier for this document

Prose rots; a check does not. Two claims here are checkable now, and both were checked when it was
written:

- **TS writes, F# reads.** `generate-workflow-transcript.ts` writes the transcript; `WorkflowEngine.Tests.fs`
  reads it. If that ever inverts, this document is stale.
- **The treaty covers five families and refuses to lose one.** `WorkflowEngine.Tests.fs` asserts every
  family is present and that the per-type tallies account for every vector, so a transcript that
  stopped emitting one fails rather than passing with less coverage.

The third claim — that the register is legitimately TS-only — has no mechanical check, because
"nobody has implemented this in F#" is a fact about absence. It is falsified the day someone does,
which is the day §3 above applies.

## Pointers

- `src/Core.TypeScript/workflow-engine/generate-workflow-transcript.ts` — writes the vectors
- `src/Core/WorkflowEngine.Tests.fs` §`workflow treaty` — replays them, and refuses a missing family
- `src/Core/MenuGenerator.fs` — the "treaty with a hole" sentence, and the TS-first precedent
- `workitems/081M1M2J0P3087G0R0037K8JJK-*.md` §Pass 6 — the F#-as-main correction this document
  reconciles rather than reverses
- [`dual-use-detection-is-neutral-oracle-decides.md`](../../.claude/rules/dual-use-detection-is-neutral-oracle-decides.md)
  — one meter for agreement, a second to check the first
- [`itron-hub-patent-boundary-p2p-is-the-upgrade.md`](../../.claude/rules/itron-hub-patent-boundary-p2p-is-the-upgrade.md)
  — exit, not degree: a chosen source of truth is not an appointed hub
