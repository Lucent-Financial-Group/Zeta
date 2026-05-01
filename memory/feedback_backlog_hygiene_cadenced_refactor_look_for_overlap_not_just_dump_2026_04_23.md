---
name: Backlog-hygiene cadenced refactor — periodic meta-audit of docs/BACKLOG.md; refactor based on current knowledge; look for overlap; prevent BACKLOG from being just a dump
description: Aaron 2026-04-23 *"we probalby need some meta iteam to refactor the backlog base on current knowledge and look for overlap, this is hygene we could run from time to time so our backlog is not just a dump"*. The factory's BACKLOG accumulates rows over rounds; without periodic meta-audit, overlap compounds, stale rows fossilize, and the file becomes an append-only dump rather than a living triage surface. Hygiene row capturing: cadenced refactor on sweep cadence (5-10 rounds), consolidating overlapping rows, retiring stale ones, re-prioritizing based on current knowledge.
type: feedback
originSessionId: 1937bff2-017c-40b3-adc3-f4e226801a3d
---

# Backlog-hygiene — cadenced refactor, not a dump

## Verbatim (2026-04-23)

> we probalby need some meta iteam to refactor the backlog
> base on current knowledge and look for overlap, this is
> hygene we could run from time to time so our backlog is
> not just a dump

## What this names

The factory's `docs/BACKLOG.md` has grown organically —
every time a new idea / observation / deferred-work-item
lands, a row is added. Without periodic meta-audit:

- **Overlap compounds.** Two rows added months apart can
  describe the same concern from different angles; a
  reader doesn't notice; work gets duplicated or no row
  gets the attention it deserves.
- **Stale rows fossilize.** Rows from long-dead contexts
  or already-implemented ideas stay in the file because
  nobody explicitly retired them.
- **Priority drifts.** Rows filed as P1 in one round may
  be appropriate at P2 later (or vice versa) but
  priorities never get re-examined as a set.
- **Knowledge updates don't propagate.** A row written
  before a new architectural insight lands might be
  obsolete, need rewording, or compose with newer rows
  in ways the original didn't know about.
- **The file stops being a living triage surface** and
  becomes a log of historical intentions — still useful
  but different.

Aaron's framing: *"not just a dump."* The append-only
log is fine as a record; it's not a triage substrate.
Periodic refactor converts the log back into a triage
substrate.

## Rule

Add a FACTORY-HYGIENE row for **backlog-refactor
cadenced audit**. Same cadence as the other meta-audits
(rows #5 skill-tune-up, #23 missing-hygiene-class, #38
harness-surface — 5-10 rounds). Each firing:

1. **Read the current BACKLOG in full** (or the relevant
   P0/P1 sections if scope is too large).
2. **Cluster overlapping rows.** Two or more rows
   describing the same concern from different angles get
   flagged; the authoring-agent decides whether to merge
   (single consolidated row) or sharpen (two rows with
   clear non-overlap scope boundaries).
3. **Retire stale rows.** Rows where the context has
   died, the implementation has landed without a retire
   action, or the assumption has been falsified by newer
   knowledge.
4. **Re-prioritize.** Priority labels (P0/P1/P2/P3) get
   re-examined against current knowledge; any row whose
   priority feels wrong after the re-read gets a
   justified move.
5. **Absorb new knowledge.** Rows written before an
   architectural insight landed may need rewording to
   reference the new substrate (e.g., rows that predate
   the AutoDream cadence now cite the AutoDream policy;
   rows that predate the scheduling-authority rule now
   note self-schedulability).
6. **Document the audit** — ROUND-HISTORY row noting
   what was merged / retired / re-prioritized / updated,
   with the pre-audit and post-audit row counts.

## Why this is load-bearing

- **BACKLOG is the triage substrate** for every future
  tick's "what to pick up" decision. A substrate that's
  become a dump is a substrate that leaks triage
  decisions silently (agents pick the wrong row, miss
  the overlapping row, waste tick-budget on stale
  context).
- **Overlap detection is harder than absence detection.**
  Rows by content alone don't reveal overlap; it
  requires someone reading multiple rows with current
  knowledge in mind. This is exactly the kind of meta-
  audit that doesn't happen by accident and must be
  scheduled.
- **Composes with Rodney's Razor at the BACKLOG level.**
  Rodney cuts accidental complexity in code; backlog-
  hygiene cuts accidental complexity in the work queue.
  Same principle applied to the triage substrate.
- **Self-scheduled free work** per the 2026-04-23
  scheduling-authority rule — agent can run backlog
  hygiene without Aaron-consult since it's token-based
  work on already-paid substrate.

## How to apply

- **Add FACTORY-HYGIENE row** on next landing tick
  naming "backlog-refactor cadenced audit" with cadence
  (5-10 rounds), owner (Architect / backlog-scrum-master
  role if invoked, or self-administered), scope
  (factory-wide BACKLOG + project-specific sub-BACKLOGs
  if they exist).
- **First fire** — self-scheduled soon after the row
  lands. Doesn't need to be exhaustive; a bounded "pick
  5 overlapping candidates and merge / sharpen /
  retire" pass is sufficient for the first firing.
- **Cadence** — same 5-10 rounds as row #5 / #23 / #38.
- **Durable output** — ROUND-HISTORY row per fire +
  before/after row-count snapshot +
  `docs/hygiene-history/backlog-refactor-history.md` for
  the per-fire log (row #44 pattern).
- **Classification per row #50 (prevention layer)** —
  this is **detection-only-justified**; the hygiene
  concern is inherently about accumulated drift, which
  is post-hoc by nature.

## What this is NOT

- **Not license to delete rows without trace.** Retired
  rows get a "retired: <reason>" marker, not silent
  deletion. Signal-preservation discipline still
  applies.
- **Not a mandate for one-shot exhaustive sweeps.**
  Bounded passes per cadence are fine; exhaustive
  sweeps at every firing would be diminishing-returns.
- **Not a replacement for domain-expert review.** The
  backlog-hygiene audit is generalist; deep
  reorganization of a particular scope (e.g., security
  rows, F# rows, SQL-engine rows) still benefits from
  the domain-expert eye.
- **Not a license to reshuffle Aaron-scope priorities.**
  P0 rows with explicit Aaron framing stay at the
  priority Aaron set; re-prioritization applies within
  the agent-owned priority space.

## 2026-05-01 extension — pre-filing check (point-in-time discipline)

Aaron 2026-05-01:

> *"you know wheveryou pickup new backlog items you should
> look for similar backlog items because i've repeated myself
> on several designs since the start of this project"*

The 2026-04-23 rule covers **cadenced retroactive refactor**
(every 5-10 rounds, sweep the whole BACKLOG for overlap).
Aaron's 2026-05-01 addition is the **point-in-time
prospective check**: at the moment you pick up / file / draft
a new backlog row, GREP existing backlog FIRST for similar
topics. The two rules are complementary:

- **2026-04-23 cadenced refactor** = ambulance at the bottom
  of the cliff (catches overlap that slipped through)
- **2026-05-01 pre-filing check** = fence at the top
  (prevents overlap from slipping through in the first place)

### Aaron's empirical observation

*"i've repeated myself on several designs since the start of
this project."* Aaron has stated multiple times that the same
design pattern, rule, or concern recurs — meaning the factory
DID NOT absorb the first-stating fully. The recurrence IS the
diagnostic for absorption-failure. The fence-at-top discipline
prevents new instances of this from compounding.

### Recursive irony — this rule itself is the recurrence

Aaron stated this rule on 2026-04-23 (this very memory file).
Aaron repeated it on 2026-05-01 (this extension). That's the
EXACT failure-mode the rule names — Aaron repeats himself on
designs because the first-stating wasn't absorbed at the
operational layer. The fix isn't more memos; it's
**mechanizing the pre-filing check** so it runs without
agent vigilance.

### Pre-filing check protocol

Before filing a new backlog row (or memory file, by extension):

1. **Identify topic keywords** from the new row's working
   title.
2. **Grep `docs/backlog/`** for those keywords:

   ```bash
   grep -lirE "<keyword1>|<keyword2>|..." docs/backlog/
   ```

3. **Grep `memory/`** for existing memos on related topics:

   ```bash
   grep -lirE "<keyword>" memory/
   ```

4. **Check TaskList items** (if this is an agent task) — they
   carry persistent backlog-shaped intent that doesn't show up
   in `docs/backlog/**`. The TaskList is the OTHER backlog.

5. **If hits found**, three branches per the orthogonality
   discipline (per
   `feedback_class_level_rules_need_orthogonality_check_extend_or_create_aaron_2026_05_01.md`):

   - **Extend existing** (preferred default) — add the new
     concern as a section/note to the existing row
   - **Sharpen the boundary** — if both rows have legitimate
     scope, edit each to make the non-overlap explicit
   - **Create-orthogonal** (rare, requires evidence) — only
     if the new concern is genuinely independent of all
     existing rows

6. **If no hits**, file the new row.

### 2026-05-01 audit — failure mode demonstrated

This very session (2026-05-01), Otto filed 10 backlog rows
(B-0144 through B-0153) WITHOUT running the pre-filing check.
Quick post-hoc audit found:

- **B-0150** (timeseries domain expert + teacher persona) +
  **B-0151** (RX researcher persona) overlap with TaskList
  Otto-task #323 (per-tool/language expert skills) and
  Otto-task #351 (TS+Bun expert + teaching skill). Filed
  without checking the TaskList.
- **B-0153** (pre-commit lint suite) overlaps with B-0033
  (otto discipline hooks system substrate as mechanism
  claude-code-plugin) and B-0086 (port tools/hygiene python
  to typescript/bun). Both existed; neither was integrated.
- **B-0151** (RX researcher) overlaps with B-0017
  (operational resonance dashboard with continuous UX
  research). Both existed; neither was integrated.

The audit IS the demonstration of the failure mode.

### Mechanization candidate

Add as **class 14** in B-0153 (PR #1120) — "pre-filing
similar-row grep check." Pre-commit hook on
`docs/backlog/B-NNNN-*.md` file-create that:

- Extracts keywords from the title
- Greps `docs/backlog/` + `memory/` for matches
- Reports per-keyword hit-list with file:line context
- BLOCKS the commit unless the author confirms (via commit
  message tag like `[overlap-checked]`) that they've
  reviewed the hits and chosen extend / sharpen / create-
  orthogonal

The mechanization is straightforward; it's the discipline
that's been missing, and the recurrence is the evidence.

## Composes with

- `docs/BACKLOG.md` — the target surface
- `docs/FACTORY-HYGIENE.md` rows #5, #23, #38, #50 —
  sibling meta-audits on the 5-10-round cadence
- `backlog-scrum-master` skill — if invoked as the
  dedicated runner
- `reducer` skill (Rodney's Razor) — backlog-level
  complexity reduction
- `feedback_free_work_amara_and_agent_schedule_paid_work_escalate_to_aaron_2026_04_23.md`
  — self-scheduling authorization
- `feedback_signal_in_signal_out_clean_or_better_dsp_discipline.md`
  — retirements leave markers, don't silently delete
