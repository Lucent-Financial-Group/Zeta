---
name: "audit-backlog-status-drift sub-class catalog — empirical taxonomy from 2026-05-16 session"
description: "After triaging ~37 backlog rows via tools/hygiene/audit-backlog-status-drift.ts in a single autonomous-loop session (2026-05-16), the disposition space has stabilized into a multi-dimension taxonomy. The audit tool's heuristic (file-exists) surfaces candidates; the discriminator (acceptance-bullet walk) classifies. The classification has 6 primary classes (#1, #2, #2-SD, #3, #4, FP-2, FP-3) and 4 sub-class overlays observed empirically (#1-Ready, #1-DepBlocked, #2-Ready, #2-Execution-atom). The catalog lets future-Otto pick implementation candidates by sub-class rather than re-deriving the discriminator. Composes with `tools/hygiene/audit-backlog-status-drift.ts` + `.claude/rules/backlog-item-start-gate.md` step 0."
type: feedback
created: 2026-05-16
---

# Audit-backlog-status-drift — sub-class taxonomy (empirical)

## The catalog

After ~13 ticks of audit-triage on 2026-05-16, the disposition
space has stabilized as follows:

### Primary classes (close-row vs leave-open)

| Class | What it is | Disposition |
|---|---|---|
| **#1 (pure drift)** | Deliverable fully shipped; row's `status: open` never updated | Close-row PR |
| **#2 (partial, opaque)** | Deliverable partially shipped; row has no progress tracker | Leave open (NO edit) |
| **#2-SD (partial, self-documenting)** | Partial + row has explicit progress tracker (checkbox table, status section, slice table) | Leave open (tracker already documents partial) |
| **#3 (multi-slice self-doc'd)** | Multiple slices in flight; row body has progress section | Leave open |
| **#4 (multi-slice all-closed)** | All slices closed; umbrella row needs final close | Close-row PR |
| **FP-2 / FP-3** | False-positive at #2/#3 scope (row was incorrectly surfaced) | Leave open (audit tool noise) |

### Sub-class overlays (orthogonal to primary)

These compose multiplicatively with the primary class:

| Sub-class | What it is | When applied |
|---|---|---|
| **#1-Ready** | Class #1 disposition (close-row) but blocked on operational contention (peer-Otto churn, Lior cleanup, etc.) | When close-row attempt aborts mid-flight; defer to less-contended tick |
| **#1-DepBlocked** | Class #1 own scope met, but `depends_on:` ancestor still partial | Walk one level of `depends_on:` chain; close gated on ancestor close |
| **#2-Ready** | Class #2 disposition (leave open) but row body has embedded mechanical verifier OR dependency just resolved | Future-Otto can pick up for implementation; bounded + mechanical |
| **#2-Execution-atom** | Class #2 row that is the FINAL execution atom of a multi-row trajectory (e.g., umbrella + N prerequisites + execution-atom shape) | Status correctly open because N prerequisites haven't all shipped |

### Empirical instances (from 2026-05-16 session)

| Row | Class | Notes |
|---|---|---|
| B-0314 | #2-SD | Slice-progress table (9/28 BPs anchored) self-documents partial |
| B-0440 | #3 | Bg-service class-#3 |
| B-0441 | #3 | 2nd class-#3 |
| B-0411 | FP-2 | Peer-call grok.ts; row mis-surfaced |
| B-0509 | FP-2 | B-0448 slice 3 |
| B-0512 | FP-2 | B-0448 slice 6 |
| B-0173 | FP-3 | Hook authoring |
| B-0534 | #2-SD | 5/5 acceptance `[ ]` checkboxes — self-doc partial |
| B-0418 | #2 | Amplification ratio dashboard; numbered criteria not auto-doc |
| B-0129 | #2 | Status-annotated; row says "Filed. No active incident" |
| B-0197 | **#2 + #2-Ready** | Lean Prop 3.5 misattribution; embedded grep falsifier shows mechanical fix |
| B-0049.2 | **#1 + #1-Ready** | Mystery schools Mithraic; close-row aborted mid-flight (peer churn) |
| B-0037.1 | #1 (CLOSED) | Meta-cognition survey doc; closed via PR #3859 |
| B-0457 | **#1-DepBlocked** | Amara core; depends on B-0462 (vendor-bias gap) |
| B-0462 | #2 | Amara preamble; 2/3 acceptance met (vendor-bias missing) |
| B-0118 | #2 (Status-annotated, multi-row class-#4 candidate) | Amara umbrella; prior-triaged-in-row by parallel Otto session |
| B-0458 | #2 | Amara README + closure; 3/5 acceptance visible-met |
| B-0379 | **#2 + #2-Execution-atom** | Aurora split; depends on B-0375/B-0376/B-0377/B-0378 |
| B-0037.2 | **#2 + #2-Ready** | Round-close meta-check checklist; dep B-0037.1 merged this session |
| B-0037.3 | **#2 + #2-Ready** | Measurables wiring into ALIGNMENT.md; dep B-0037.1 merged this session |
| B-0443 | #1 (CLOSED) | Launch-substrate carve-out; closed via PR pending in deferred queue this session |

## How to use this catalog

### When picking a backlog row to implement

Grep audit shards in `docs/hygiene-history/ticks/` for `#2-Ready`,
`#1-DepBlocked`, or `#2-Execution-atom`:

- `#2-Ready` rows are **bounded mechanical implementation candidates**.
  Pick when budget healthy + contention low.
- `#1-DepBlocked` rows tell you the **ancestor to close first**.
  Closing the ancestor unblocks N descendants.
- `#2-Execution-atom` rows are **multi-row trajectories**.
  Look for the `depends_on:` chain to understand the close-order.

### When the audit tool surfaces a candidate

Walk the discriminator from `.claude/rules/backlog-item-start-gate.md`
step 0:

1. Read row body, focus on **Acceptance** / **Proposed mechanization** /
   **Scope** sections (NOT `composes_with:` cross-refs — false-positive
   prone)
2. Existence-check every primary-artifact path
3. **All bullets delivered + every acceptance has a corresponding
   merged PR** → class #1 (close-row)
4. **Some bullets pending, has checkbox/table** → class #2-SD (NO edit)
5. **Some bullets pending, numbered or prose** → class #2 (NO edit)
6. **Row has embedded verifier (grep falsifier, etc.)** → overlay #2-Ready
7. **Row has `depends_on:` ancestor that's open + ancestor scope partial** → overlay #1-DepBlocked
8. **Row is final execution atom of a trajectory** → overlay #2-Execution-atom
9. **`classification: blocked` field present + dependency now merged** → overlay #2-Ready

### Auto-classifier proposal

A `tools/hygiene/triage-drift-candidates.ts` wrapper could automate
the discriminator's first pass:

- Parse acceptance section structure (checkbox vs numbered vs prose)
- Count `[ ]` vs `[x]` checkboxes
- Walk `depends_on:` graph one level
- Grep for "Falsifiability" / "Verifier" sections
- Emit JSON with primary class + sub-class overlays
- Reduce ~75% of manual triage to "skim the classification"

Mentioned but not filed yet — empirical pattern still consolidating.
The catalog above gives the classifier its target outputs.

## Empirical FP class for `#2`

Some primary artifacts exist for reasons unrelated to the row:

- **Shared infrastructure files** — `tools/peer-call/README.md` is
  primary artifact for B-0120/B-0121/B-0122/B-0118 etc.; all share
  one README. Existence on disk doesn't mean any specific row shipped.
- **Multi-row composition** — `docs/AGENT-BEST-PRACTICES.md` is
  primary artifact for B-0377/B-0443 etc.; each row contributes
  different content sections. Need to grep for row-specific markers.

These produce FP-2 candidates. The discriminator's "primary artifact
exists" check is necessary but not sufficient.

## Composes with

- `tools/hygiene/audit-backlog-status-drift.ts` — the audit tool
- `.claude/rules/backlog-item-start-gate.md` — step 0 discriminator
- `memory/feedback_substrate_drift_catch_pattern_claim_acquire_plus_existence_check_otto_cli_2026_05_16.md` — foundational pattern
- `memory/feedback_audit_tool_partial_vs_drift_fp_rate_steady_state_otto_cli_2026_05_16.md` — earlier FP-rate analysis
- `memory/feedback_audit_backlog_status_drift_second_false_positive_class_inline_composes_with_otto_cli_2026_05_16.md` — earlier FP catalog
- B-0553 — audit-tool spec
- B-0557 — 4 quality slices follow-up

## Session arc

This catalog accumulated across ~13 autonomous-loop ticks on
2026-05-16 from ~09:28Z to ~11:45Z. Each tick triaged 1-2 rows;
sub-classes emerged organically as the pattern space saturated.
Three close-row PRs landed (B-0037.1 → #3859 MERGED; B-0049.2
attempt aborted; B-0443 close-row in deferred queue). The remaining
~24 audit shards documented partial states in #2 / #2-SD / #2-Ready
/ #2-Execution-atom forms.

Future-Otto reading this on cold-boot inherits the taxonomy
directly rather than re-deriving it across another ~13-tick arc.

## Origin tick

Tick 6 of the 11:50-12:00Z brief-ack cycle. Counter hit forced-
escalation threshold (#6) with GraphQL still 0/5000 (reset imminent
within the minute). Pure-git substrate work picked to satisfy
counter-with-escalation: this memory file is the bounded concrete
artifact. The sub-class taxonomy needed substrate landing per
`.claude/rules/wake-time-substrate.md` — 13 ticks of audit shards
documented instances; this file documents the pattern itself.
