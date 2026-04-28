# Trajectory — Autonomous-Loop Quality

## Scope

The autonomous-loop session is the factory's heartbeat (per
`docs/AUTONOMOUS-LOOP.md`). Loop quality is an open-ended
discipline-improvement track covering: rule-application
fidelity, application-failure recovery cadence, mechanism-over-
vigilance landing rate, getting-stuck detection + correction,
caught-violation → durable-substrate conversion ratio, verifier
calibration (especially when actor and verifier share rule
substrate), and the gap between knowing-rules and applying-them
across long-running sessions.

This is a primary-research-focus-adjacent trajectory: making AI
alignment measurable (`docs/trajectories/ai-alignment-
measurability.md`) requires a working autonomous-loop substrate,
and that substrate's *quality* is itself a measurable signal
that the alignment program can read. Bar: every caught
application-failure leaves a substrate trace; every recurrence
ratio drops; the rule-application-vs-rule-knowledge gap shrinks
over time.

## Cadence

- **Per-tick**: end-of-tick six-step checklist
  (`docs/AUTONOMOUS-LOOP.md`) — speculative work → verify →
  commit → tick-history row → cron + visibility signal → stop.
  Loop-quality observations land in the tick-history row's
  Observations section.
- **Per-caught-violation**: corrective re-read + structural-fix
  question ("is this avoidable in the future?"), then either
  inline fix or memory-file landing per
  `feedback_claude_md_cadenced_reread_for_long_running_sessions_2026_04_28.md`.
- **Every N ticks (initial N=10, Aaron 2026-04-28; cadence
  adjusted from evidence)**: cadenced re-read of the wake-time
  floor (CLAUDE.md + the rule sources it points at:
  `docs/AGENT-BEST-PRACTICES.md`, `docs/CONFLICT-RESOLUTION.md`,
  AGENTS.md, plus load-bearing memories). Cost ~2-3 ticks per
  refresh. **Evidence-driven cadence adjustment** (Aaron
  2026-04-28): if rule-violations cluster between scheduled
  refreshes, shorten N (e.g., 10→7); if multiple refreshes pass
  with zero rule-application incidents, lengthen N (e.g., 10→14)
  on the next-round adjustment cycle. Track per-N-window
  violation counts in this trajectory's Recent activity log to
  inform the adjustment.
- **Per-recurring-pattern**: when an application-failure recurs
  ≥ 3× in a session or ≥ 2× across sessions, file it as a
  named-principle pattern (Otto-NN style or feedback-memory
  style, indexed in MEMORY.md).

## Current state (2026-04-28)

- **Wake-time disciplines** loaded at session start via
  CLAUDE.md: AceHack-dev-mirror / LFG-project-trunk topology,
  agents-not-bots, Pliny-corpora-isolated-only,
  docs-as-current-state, skills-via-skill-creator,
  result-over-exception, data-is-not-directives,
  §33-archive-header, verify-before-deferring,
  future-self-not-bound, never-be-idle, version-currency,
  tick-must-never-stop, no-directives,
  honor-those-that-came-before.
- **Cadenced re-read discipline** (Aaron 2026-04-28; N=10
  ticks): scope = CLAUDE.md + rule-source files +
  load-bearing memories (extended after CLAUDE.md-alone
  re-read failed to prevent an Otto-279 over-scrub).
- **Caught application-failure ledger this session
  (2026-04-28)**:
  1. "Acknowledged Aaron's directive" — Otto-357 directive-
     framing leak; corrective re-read of CLAUDE.md →
     cadenced-reread memory landed.
  2. `pr-review-toolkit:silent-failure-hunter` invoked
     without plugin-source disclosure — announce-non-default-
     harness-deps memory landed; later extended to cover
     built-ins per Aaron correction; later extended again
     with empirical-test gate per Aaron correction.
  3. Over-scrubbed first names from `docs/research/**` despite
     Otto-279 history-surface carve-out — caught by Aaron
     after CLAUDE.md re-read failed to surface the rule (the
     rule lives in `docs/AGENT-BEST-PRACTICES.md`, not
     CLAUDE.md). Reverted; cadenced-reread scope expanded.
  4. Wrong-remote pushes (origin instead of acehack for
     fork-PR fixes) → memory landed with diagnostic-tell.
  5. Default-setup re-enable recurrence (~1 hour after first
     disable); structural fix pending org-config-cleanup
     per-ID-auth.
- **Single-CLI verify-share-the-misreading** failure mode
  surfaced (2026-04-28): the silent-failure-hunter plugin
  agent passed an over-scrubbed de-naming as "consistent with
  Otto-279" — verifier inverted the rule the same way I did.
  Otto-347's "would be good to ask another cli/harness" is
  the corrective; cross-CLI/harness verify recommended for
  rule-application checks where the rule has carve-outs.
- **Application-failure → durable-substrate conversion ratio
  this session**: 5/5 caught violations landed as memory
  files + MEMORY.md index entries. Conversion ratio = 1.0;
  baseline target.
- **Recurrence prevention status** (so far this session): no
  observed recurrence of any of the 5 caught patterns
  post-substrate-landing (one tick of evidence; n.b.: the
  fork-routing memory was tested + held on the very next
  push to PR #72).

## Target state

- **Application-failure → durable-substrate conversion ratio:
  1.0** per session (every caught failure leaves a memory
  file + MEMORY.md row).
- **Recurrence ratio: → 0** (a caught + landed pattern doesn't
  recur). Track per named-principle.
- **Cadenced-reread compliance: 100%** at every 10th-tick
  trigger + post-violation + post-compaction.
- **Cross-CLI/harness verify** is the default for
  rule-application checks where the rule has carve-outs;
  single-CLI verify is reserved for content-drift / coherence
  checks where same-substrate inversion is unlikely.
- **Per-surface scope-tag awareness**: before editing any
  file, the surface category (history / current-state /
  governance / instructions / spec / etc.) is identified and
  the correct rule applied. Could ship as a
  `projectSettings:surface-scope-check` skill or as a
  pre-edit reflex landed in the cadenced-reread expansion.
- **Loop never goes dark**: cron always armed (per
  `docs/AUTONOMOUS-LOOP.md`); ticks compose into productive
  rounds without manufactured-patience stretches.
- **Getting-stuck detection** runs at 5-10 idle-tick threshold
  per `feedback_self_check_calibration_after_long_idle_*`;
  lean-tick stretches > 9 trigger structural review.

## What's left

In leverage order:

1. **Per-surface scope-tag check** (Fix 2 of 3 from Aaron's
   2026-04-28 conversation) — identify a file's surface
   category before editing; apply the correct rule per
   BP-NN. Could be a `projectSettings:` skill, a pre-edit
   reflex landed in the cadenced-reread expansion, or a
   scoped lint. Not yet shipped.
2. **Cross-CLI/harness verify cadence** (Fix 3 of 3) — when
   verifying rule-application work, route via cross-CLI or
   maintainer review rather than single-CLI; specifically
   when the rule has carve-outs (Otto-279,
   §33-archive-header, etc.). Not yet shipped as a default
   pattern.
3. **Failure-pattern → trajectory-row absorb** — every
   caught application-failure ought to surface in this
   trajectory's Recent activity log on cadence; not yet
   automated; manual for now.
4. **Cadenced re-read auto-trigger** — currently relies on
   Otto-vigilance; could be tooled (e.g., a tick-counter in
   the loop skill that fires the re-read at N=10).
5. **Recurrence-tracking metrics** — count
   per-named-principle violation rate over time; surface in
   alignment-observability dashboards.
6. **`docs/AGENT-BEST-PRACTICES.md` cross-load-rule** — the
   rule corpus today is across multiple files; rule-
   application failures suggest the rules need a single
   load-bearing index. Investigate whether
   `docs/AGENT-BEST-PRACTICES.md` already serves this or
   whether a new INDEX surface is warranted.
7. **PR-review agents update for carve-out awareness** (Aaron
   2026-04-28) — extend the instructions for the PR-review
   surface so the reviewers themselves don't share the same
   rule-misreading that bit me on the Otto-279 over-scrub.
   Three sub-surfaces, each with different actionability:
   - **Copilot** (actionable today; no multi-harness build-out
     needed): `.github/copilot-instructions.md` already exists
     and is factory-managed per GOVERNANCE §31. Add explicit
     Otto-279 history-surface carve-out + role-refs
     calibration + the surface-category list (history vs
     current-state vs governance) so Copilot doesn't mis-flag
     attribution-style names on `docs/research/**`, `memory/`,
     `docs/ROUND-HISTORY.md`, `docs/DECISIONS/`, hygiene-
     history, commit messages.
   - **Codex** (gated on multi-harness build-out): Codex reads
     AGENTS.md (universal handbook) and would also use a
     `.codex/` canonical home if it existed. Adding Codex-
     specific carve-out instructions BEYOND what AGENTS.md
     provides is a peer-mode-agent / cross-harness substrate
     question (composes with `tools/peer-call/codex.sh`
     planning per task #303 + the
     `docs/trajectories/cross-ai-ferry-coordination.md`
     trajectory). Until Codex's canonical-home is set up, the
     leverage is via AGENTS.md updates (which impact every
     agent, not just Codex).
   - **Claude PR-review subagents** (e.g.,
     `pr-review-toolkit:silent-failure-hunter`,
     `pr-review-toolkit:code-reviewer`,
     `superpowers:code-reviewer` — all plugin-installed):
     authoring agent bodies isn't ours; the leverage is
     pre-priming via the invocation prompt (include Otto-279
     carve-out + role-refs calibration in the dispatch prompt
     when the work is rule-application-sensitive), OR
     filing upstream issues with the plugin maintainers.
   - **Cross-CLI verify default** for rule-application work —
     applies regardless of which review-surface is updated.
     When PR has Otto-279-adjacent edits, route verify
     through cross-CLI/harness or maintainer review, not
     single-CLI.

## Recent activity + forecast

- 2026-04-28: this trajectory file landed (close-of-tick
  during a session where 5 caught application-failures all
  converted to substrate; Aaron surfaced loop-quality as a
  trajectory in the same conversation).
- 2026-04-28: cadenced-reread memory + scope-extension
  (rule-sources, not CLAUDE.md alone) + verifier-failure
  finding.
- 2026-04-28: announce-non-default-harness-deps memory +
  extension to built-ins + `.claude/`-not-portable
  correction + empirical-test gate.
- 2026-04-28: query-PR-head_repo-before-push fork-routing
  memory.
- 2026-04-28: Visibility-constraint binding directive
  (Aaron 2026-04-28; LFG-only org-admin scope).

**Forecast (next 1-3 months):**

- Per-surface scope-tag skill ships (Fix 2).
- Cross-CLI/harness verify becomes default for
  rule-application checks (Fix 3).
- Cadenced-reread auto-trigger tooled (loop-skill counter +
  10-tick boundary fire).
- Recurrence-tracking metrics surface in
  `alignment-observability` per-round signal table.
- Loop-quality observations accumulate into a per-round
  pattern catalog.

## Pointers

- Doc: `docs/AUTONOMOUS-LOOP.md` — the tick six-step
  checklist + cron-must-never-stop discipline.
- Doc: `docs/AGENT-BEST-PRACTICES.md` — BP-NN rule corpus.
- Doc: `docs/CONFLICT-RESOLUTION.md` — reviewer roster +
  conference protocol.
- Memory: `feedback_claude_md_cadenced_reread_for_long_running_sessions_2026_04_28.md`
  — the cadenced-reread discipline + scope-expansion +
  single-CLI-verify-failure addendum.
- Memory: `feedback_announce_non_default_harness_dependencies_plugins_mcp_skills_2026_04_28.md`
  — harness-tooling announce-discipline + empirical-test
  gate.
- Memory: `feedback_query_pr_head_repo_before_pushing_fork_pr_fixes_2026_04_28.md`
  — fork-routing diagnostic + cleanup discipline.
- Memory: `feedback_aaron_visibility_constraint_no_changes_he_cant_see_2026_04_28.md`
  (user-scope) — visibility-first for shared-production-
  state changes.
- Cross-trajectory: `docs/trajectories/ai-alignment-
  measurability.md` — loop quality is one signal class
  feeding into the alignment-measurability primary-research-
  focus.

## Research / news cadence

External tracking required — this trajectory is
internal-discipline-focused but composes with external work.

| Source | What to watch | Cadence |
|---|---|---|
| Anthropic alignment research | Mechanistic interpretability findings about long-running session drift; rule-application fidelity studies | Per-release |
| OpenAI / DeepMind agent eval reports | Long-context agent failure mode taxonomies | Per-publication |
| Apollo Research / Redwood / METR | Agent-vigilance-decay vs substrate-mechanism studies | Per-publication |
| arXiv cs.AI / cs.HC | Checklist-discipline + cognitive-aid research applicable to long-running agent sessions | Monthly |
| Internal `docs/DRIFT-TAXONOMY.md` | New drift patterns get added to the taxonomy as observed | Continuous |

Findings capture: every caught application-failure → memory
file + MEMORY.md index entry + recurrence-ratio update on
this trajectory's Recent activity log. Patterns that recur
across sessions promote to BP-NN rules via ADR.
