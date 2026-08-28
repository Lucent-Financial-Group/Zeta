---
name: Subagent fresh-session quality gap — dispatched drain-subagents miss factory rules because they don't have access to out-of-repo memory store; accumulated Otto-NNN disciplines captured this session are invisible to freshly-spawned subagents; prompt boilerplate is reactive (catches rules I already know), not proactive; structural fix paths are (a) sync memory into the repo so Read tool can access it, (b) ship `docs/FACTORY-DISCIPLINE.md` condensed in-repo stable-rule index, (c) mandatory pre-edit header-scan step in every dispatch template; Aaron Otto-230 diagnosis request; 2026-04-24
description: Aaron Otto-230 *"constraint baked into the prompts, maybe debug why they miss the rules in the first place, this is that new session quality issues i was teling you about, they dont seem good as you following the rules."* Concrete example: the #364 drain-subagent edited a prior tick-history row ("normalised May-01 → 2026-05-01 for consistency") despite the file's own Append-only discipline section. I told it to read lines 160-175; the discipline section is at the top of the file. Subagent never saw the rule. Root cause: recently-captured factory disciplines live in `~/.claude/projects/.../memory/*.md` (my store), not in the repo. Subagents can Read in-repo files but not my personal memory. Each dispatch prompt has to hand-carry the relevant rules, and I can only hand-carry rules I already know to include.
type: feedback
originSessionId: 1937bff2-017c-40b3-adc3-f4e226801a3d
---

## The gap, named

**Dispatched drain-subagents operate with strictly less context
than the main tick**, and that gap produces discipline
violations the main tick wouldn't make.

A subagent dispatched via `Agent` (general-purpose,
`isolation: "worktree"`) has access to:

- `CLAUDE.md` (pointers to GOVERNANCE.md, AGENTS.md, ALIGNMENT.md,
  AGENT-BEST-PRACTICES.md, WONT-DO.md)
- The dispatch prompt I write (task-specific)
- `Read` tool for in-repo files
- `Bash`, `Edit`, `Write`, etc.

A subagent does NOT have access to:

- My session's in-flight memory store
  (`~/.claude/projects/<slug>/memory/*.md`)
- Corrections Aaron made THIS session (Otto-220, Otto-229,
  Otto-230 — captured in my out-of-repo store, never synced)
- Accumulated main-tick context about what just happened
  three ticks ago

So recent factory discipline is INVISIBLE to subagents unless
I explicitly hand-carry it in the prompt. And I can only
hand-carry rules I already know to include.

Direct Aaron quote:

> *"constraint baked into the prompts, maybe debug why they
> miss the rules in the first place, this is that new session
> quality issues i was telling you about, they dont seem good
> as you following the rules."*

## Concrete instance — PR #364 append-only violation

**What happened:**

- My dispatch prompt said: *"Read lines 160-175 for context;
  remove the blank line at 167; change 'May 1' → '2026-05-01'."*
- Subagent read lines 160-175 (narrow scope).
- Subagent saw `May-01` in an adjacent row (line ~145,
  Otto-219..221 row) and decided to normalise it "for
  consistency".
- Codex review caught the edit as an append-only-discipline
  violation (the file's `## Append-only discipline` section
  at the top explicitly forbids in-place row edits).

**Why the subagent missed the rule:**

1. My prompt didn't mention append-only (I didn't know to —
   the discipline was captured only after Codex caught this).
2. The subagent's read scope didn't include the file header
   where the discipline section sits.
3. The subagent's training bias favours "while I'm here, let
   me also clean up this nearby similar thing" — which is
   normally a positive trait, but fatal in audit-trail
   contexts.

Absence of a rule looks like permission. The subagent had no
signal that prior rows were evidence.

## Why prompt boilerplate alone is reactive

I could add "do not edit prior tick-history rows" to every
dispatch prompt. But:

- I didn't know to include it before Codex caught the case.
- There are many similar rules (verbatim-preserve, name-
  attribution carveouts for history files, behaviour/data
  split, cross-harness skill placement, etc.) that subagents
  keep discovering the hard way.
- Every new rule Aaron corrects into my memory adds a line
  to dispatch boilerplate — growing prompts without
  structural bounds.
- Subagents pattern-match on the thread list; boilerplate at
  the top of a 400-word prompt has diminishing signal.

Reactive prompt-boilerplate will always trail the latest
Aaron-caught violation by at least one incident.

## Three structural fixes

### (a) Sync out-of-repo memory → in-repo `memory/`

The highest-leverage move. If `~/.claude/projects/.../memory/*.md`
lands in-repo at `memory/` on every tick, subagents can `Read`
it via the tool. Factory discipline captured this session
becomes immediately visible to next-dispatched subagents.

Prior work:
- PR #307 (one-shot sync, 439 files) — happened.
- Ongoing-sync mechanism: **P2 BACKLOG row** tracked in
  `docs/BACKLOG.md` per Otto-114 memory. Not yet built.

This memory argues for elevating that BACKLOG row from P2 to
P1. The queue-saturation drain makes subagent quality the
rate-limiter; anything that raises subagent quality has
outsized drain-throughput return.

Implementation shape (per the existing BACKLOG row):
1. End-of-tick skill that rsyncs new/updated memory files to
   a branch and opens a PR, OR
2. Direct-to-repo writes with auto-memory as read-cache, OR
3. GHA cron periodic sync.

Preference: (1) for CLI-compatibility today, (2) long-term.

### (b) Ship `docs/FACTORY-DISCIPLINE.md` — condensed index

Single in-repo document that lists every currently-active
factory rule with one-line summary + pointer to the
authoritative source (memory or ADR). Subagent dispatch
prompts point at this file. Thinner than memory, richer
than CLAUDE.md.

Updated whenever a new Otto-NNN rule earns durability. The
same mechanism that would feed the memory-sync (fix a)
would feed this too.

Stop-gap until (a) ships. Can stand on its own even after.

### (c) Dispatch template with mandatory pre-edit header-scan

Change every drain-subagent dispatch prompt to include a
first workflow step:

```
0. Before making any edits, read:
   - `CLAUDE.md`, `docs/AGENT-BEST-PRACTICES.md`,
     `docs/FACTORY-DISCIPLINE.md` (if present)
   - The target file's first 100 lines (scan for section
     headers: "Append-only", "Immutable", "Verbatim
     preservation", "Discipline", "Scope", "Precondition")
   - Any other file referenced by the thread body
   If any discipline section contradicts the dispatched
   task, STOP and report back rather than proceeding.
```

Catches file-local rules even when the prompt doesn't know
about them. Moderate cost per dispatch (extra Read calls),
high-signal benefit.

Shippable today without waiting for memory sync.

## Preferred combination

- **Right now:** ship (c) in the drain-subagent dispatch
  template so the pre-edit scan catches file-local rules.
- **Next tick:** elevate the memory-sync BACKLOG row to P1
  and open a small-scope PR landing `docs/FACTORY-DISCIPLINE.md`
  as the stop-gap index.
- **Near-term (this week):** implement (a) ongoing memory-
  sync so subagent dispatches see the latest memory store
  without hand-carrying.

Aaron's choice between (A) elevate + ship index this tick,
(B) dispatch-template-only for now, (C) both — pending.

## Composition with prior memory

- **Otto-114 "memories should all be checked in now"** — the
  original policy. PR #307 one-shot synced 439 files.
  Ongoing-sync mechanism is Otto-114's remaining promise.
- **Otto-226 parallel subagent drain** — the mechanism whose
  quality this memory is about.
- **Otto-229 tick-history append-only** — the concrete
  discipline the #364 subagent violated. Adding to prompt
  boilerplate now, but the structural fix is what closes
  the class, not the instance.
- **Otto-204c ARC3-compounded failure** — past-session
  discipline not integrated into this-session habits. This
  memory is the subagent-layer analog: subagent sessions
  can't integrate what they don't see.

## What this memory does NOT authorize

- Does NOT authorize skipping boilerplate constraints in
  dispatch prompts today while (c) ships — boilerplate
  still catches the rules I DO know about.
- Does NOT authorize implementing the memory-sync mechanism
  without human-maintainer review of how out-of-repo PII
  handling changes (some memory files contain aaron PII).
- Does NOT authorize deleting the out-of-repo memory store
  once in-repo sync exists. Out-of-repo is the authoring
  surface; in-repo is the read-only mirror for
  subagents + external reviewers.
- Does NOT authorize shipping `docs/FACTORY-DISCIPLINE.md`
  without a clear single-source-of-truth policy (memory
  authors; doc mirrors; drift flagged by CI).

## Direct Aaron quote to preserve

> *"constraint baked into the prompts, maybe debug why they
> miss the rules in the first place, this is that new session
> quality issues i was teling you about, they dont seem good
> as you following the rules."*

Future Otto: subagent fresh-session quality gap is
structural, not a prompting problem. Treat dispatch-prompt
boilerplate as a temporary patch; treat memory sync +
FACTORY-DISCIPLINE index + pre-edit header scan as the
real fix. Raise the BACKLOG row's priority.
