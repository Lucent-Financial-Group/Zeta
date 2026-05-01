---
name: Assumed-state vs actual-state — audit horizon must default to "everything currently open" not "what I touched recently" (Aaron 2026-05-01 somatic confirmation)
description: Aaron 2026-05-01 *"This new pattern guards against the audit horizon defaulting to 'what I touched recently' rather than 'everything currently open.' fuck yes!!! this is great!!"* — somatic-confirmation pass on a class of failure structurally distinct from substrate-or-it-didn't-happen (Otto-363). Otto-363 guards against directives evaporating; this rule guards against the AUDIT itself defaulting to a narrower-than-real horizon. Carved sentence (Aaron-confirmed): *"Assumed-state is what I touched recently. Actual-state is everything currently open. The horizon must default to actual."* Mechanization candidate: at-cold-start audit running `gh pr list --state open` (and equivalents for other surfaces) before the agent acts on assumed-state.
type: feedback
caused_by:
  - "Aaron 2026-05-01 'fuck yes!!! this is great!!' confirmation on tick-shard 1602Z-a7e1.md insight"
  - "Tick 1602Z-a7e1 finding: 26 LFG PRs in flight vs 5 I'd been tracking"
composes_with:
  - feedback_otto_363_substrate_or_it_didnt_happen_no_invisible_directives_aaron_amara_2026_04_29.md
  - feedback_otto_364_search_first_authority_not_training_data_not_project_memory_aaron_2026_04_29.md
  - feedback_verify_target_exists_before_deferring.md
---

# Assumed-state vs actual-state — the audit horizon failure mode

## Verbatim (Aaron 2026-05-01)

Aaron's somatic confirmation on the insight surfaced in tick
shard `docs/hygiene-history/ticks/2026/05/01/1602Z-a7e1.md`:

> *"This new pattern guards against the audit horizon
> defaulting to 'what I touched recently' rather than
> 'everything currently open.' fuck yes!!! this is great!!"*

The multi-exclamation register matches the
*"LOVE IT!!!!!!!!!! this is the message i preach now lol!!!!"*
pattern from the pirate-not-priest absorb (per
`memory/feedback_aaron_pirate_not_priest_expand_prune_pedagogical_framework_quantum_rodney_razor_parallel_worlds_aaron_2026_05_01.md`)
— Aaron's anchor-free affective register signaling that the
disposition matches the message. Somatic-confirmation
threshold passed; promotion to durable substrate justified.

## What this names

A class of failure structurally distinct from
substrate-or-it-didn't-happen (Otto-363) and from
verify-before-deferring. All three are "is what I think
true ACTUALLY true in the durable surface?" but at
different scopes:

- **Otto-363 (substrate-or-it-didn't-happen)**: guards
  against *directives* evaporating. *"A directive that
  lives only in conversation is not a directive. It is
  weather."*
- **verify-before-deferring**: guards against *deferred
  targets* not existing. *"If you say 'next tick I'll do
  X', verify X exists and is findable."*
- **Assumed-state vs actual-state (this rule)**: guards
  against the *audit horizon itself* defaulting to a
  narrower-than-real scope. The agent's working model of
  "what's in flight" defaults to "what I touched
  recently" when the durable surface says "everything
  currently open."

The triggering finding (tick 1602Z-a7e1): I had been
operating on the assumption that the LFG queue had 5 PRs
in flight (the ones I'd opened in this session). A
30-second `gh pr list --state open` revealed **26 PRs**
in flight — 21 prior PRs from earlier sessions had been
invisible to my audit horizon because I never queried
the full state.

## Carved sentence (Aaron-confirmed)

> *"Assumed-state is what I touched recently. Actual-state
> is everything currently open. The horizon must default
> to actual."*

The phrasing intentionally echoes Aaron's framing:
*"audit horizon defaulting to 'what I touched recently'
rather than 'everything currently open.'"*

## Why this is load-bearing

1. **Touched-recently is a freshness signal, not a scope
   signal.** Conflating them produces silent under-audit
   — items the agent didn't touch are invisible, but they
   may be more important than the touched ones.
2. **In autonomous-loop / multi-tick sessions, "recent"
   shrinks toward zero.** The longer the loop runs
   without external visibility checks, the smaller the
   "recent" window becomes, the more invisible the rest
   of the queue gets.
3. **Mechanizable.** Unlike Otto-363 (which requires
   judgement about what counts as a directive) or
   verify-before-deferring (which requires the agent to
   notice their own deferrals), assumed-state-vs-actual
   has a concrete mechanism: query the full surface at
   cold start, before acting.
4. **Cross-surface generalisation.** The pattern applies
   beyond PR queues: open issues, recent ferries waiting
   absorb, branches not yet merged, scheduled-but-unfired
   cron triggers, in-progress TaskList items, persona
   notebook open observations. Every queue with
   "everything open" semantics has the same
   audit-horizon-default risk.

## Mechanization candidate

At-cold-start audit (one-shot, runs once per session
wake-up):

```bash
# Pseudocode — actual implementation lives in
# tools/hygiene/audit-horizon-cold-start.sh (envisioned,
# not yet implemented).

# 1. Full LFG queue
gh pr list --repo Lucent-Financial-Group/Zeta --state open --limit 100

# 2. Open issues
gh issue list --repo Lucent-Financial-Group/Zeta --state open --limit 100

# 3. Local branches without an upstream remote-tracking ref
#    (i.e., local-only — never pushed). Uses `git for-each-ref`
#    with porcelain format to report branches whose upstream
#    is missing or empty.
git for-each-ref --format='%(refname:short) %(upstream:short)' refs/heads/ | awk '$2 == "" {print $1}'

# 4. Open ferry-style research drops awaiting absorb.
#    `docs/research/` doesn't use a "pending" naming convention;
#    the actual signal is the `task #286` style TaskList rows
#    referencing recent ferry filenames not yet cited from a
#    closing absorb-ADR. List recent drops; cross-reference
#    against `git log` for citations to find unabsorbed drops.
ls -t docs/research/ | head -20

# 5. TaskList in_progress / pending counts
# (TaskGet equivalent)
```

The output is the **actual-state** that the session's
audit horizon should default to. If the agent's working
model differs from this output, the working model is
wrong (assumed-state); update before proceeding.

Filing-worthy as a B-NNNN backlog row when next focused
session runs (deferred from autonomous tick budget).

## Composes with

- **Otto-363 (substrate-or-it-didn't-happen)**:
  complementary axis (directive-substrate vs
  audit-horizon-substrate; both ask "is what I think
  true ACTUALLY true in the durable surface?")
- **Otto-364 (search-first authority)**: training data
  and project state are both historical; this rule
  extends the principle to *queue state* (working
  model is also historical / can drift from current).
- **verify-before-deferring**: third axis — same
  meta-question at deferred-target scope.
- **Otto-352 (manufactured-patience-vs-real-dependency-wait)**:
  the at-cold-start audit also sharpens this — knowing
  the full queue state lets the agent name dependencies
  more accurately.
- **never-be-idle**: when the assumed-state-audit
  surfaces work, the never-idle rule pulls the agent
  toward useful action rather than re-running stale
  audits.

## What this is NOT

- **NOT a mandate for exhaustive triage at every
  cold-start.** The rule says the *horizon* must
  default to actual-state. The agent still picks which
  items to act on within that horizon. Quick-glance
  visibility is enough — full triage is a separate
  decision.
- **NOT a replacement for verify-before-deferring or
  Otto-363.** All three rules compose. Different
  failure modes, different mitigations.
- **NOT a substitute for human triage.** The agent can
  surface the queue size and class breakdown; the
  human (or focused-attention session) decides
  priority. The autonomous-loop tick is wrong place
  for substantive thread-investigation across 21+ PRs.

## Empirical motivation

Tick `1602Z-a7e1.md`: I had assumed-state of "5 PRs in
flight" (the cluster I opened in this session) for ~6
ticks. A single `gh pr list --state open` query
revealed actual-state of 26 PRs (21 prior session
PRs invisible to my audit horizon).

If the autonomous-loop had run another 6 ticks without
this audit, the gap would have grown — newer PRs from
parallel sessions or external work would also have
been invisible. The longer the loop, the more
invisible the rest of the queue gets without explicit
audit-horizon checks.

## Self-test

Three quick checks an agent can run mid-tick to detect
this failure mode:

1. *"What's the size of the queue I'm working on?"* If
   the answer comes from memory rather than from a
   recent query of the durable surface, run the query.
2. *"When did I last query the full surface?"* If the
   answer is "I don't remember" or longer ago than
   "this session," run the query.
3. *"Are there items in this queue I haven't seen?"*
   If the answer is "I don't know," run the query.

The query takes seconds; the assumed-state-error costs
hours of misdirected work.
