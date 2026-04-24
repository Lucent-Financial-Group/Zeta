# FACTORY-DISCIPLINE.md — agent-visible rule index

**Status:** stop-gap index. Stable rules live in
`docs/AGENT-BEST-PRACTICES.md` (BP-NN identifiers) and
`GOVERNANCE.md` (numbered sections). Session-captured corrections
live in the human-maintainer's factory-personal memory store
(`~/.claude/projects/<slug>/memory/feedback_*.md`) and are NOT
in-repo by default. This file is the **agent-visible in-repo
mirror** of session-captured discipline, so dispatched subagents
can `Read` it without access to the out-of-repo memory.

**Read order for any subagent dispatched into the repo:**

1. `CLAUDE.md` (bootstrap; points at AGENTS / GOVERNANCE /
   ALIGNMENT / AGENT-BEST-PRACTICES / WONT-DO)
2. This file (`docs/FACTORY-DISCIPLINE.md`)
3. First 100 lines of any file being edited (file-local
   discipline sections)

**Scope note:** this index is not authoritative. The memory
files it cites ARE authoritative. This file is a forwarding
pointer for subagents who cannot reach the memory store.
Updates here must cite the source memory file.

---

## Active disciplines (by short-name → pointer)

### append-only audit-trail files

**Rule:** `docs/hygiene-history/**`, `docs/ROUND-HISTORY.md`,
`docs/DECISIONS/**` are append-only. Rows / entries are immutable
once committed. Corrections go in NEW rows that reference the
earlier row, never edit existing rows in place — not for typos,
date normalisation, column alignment, or "consistency".

**Source:** `memory/feedback_tick_history_append_only_never_edit_prior_rows_otto_229_*.md`

**Applies to drain-subagent dispatch prompts:** every prompt
that edits one of these files must carry the explicit
constraint "do NOT edit existing rows — only APPEND new rows
or correction rows."

### code comments explain code, not history

**Rule:** `///`, `//`, `#` doc comments in `src/**`, `tests/**`,
`bench/**`, `tools/**` source files must explain the CODE
(math, invariants, input contracts, composition). They must
NOT carry factory-process lineage — no "Provenance:",
"Attribution:", "Nth graduation", "per correction #N", ferry
names, Otto-NN tags, persona names. That content belongs in
PR descriptions, commit messages, `docs/hygiene-history/**`,
or memory files.

**Source:** `memory/feedback_code_comments_explain_code_not_history_otto_220_*.md`
+ the lint at `tools/lint/doc-comment-history-audit.sh`.

### name-attribution role references

**Rule:** factory-authored docs and code comments use role
references ("the human maintainer", "external AI collaborator",
"loop-agent", "threat-model-critic") rather than direct
contributor / agent names (Aaron, Amara, Otto, Max, Kenji,
Aminata). History files, memory files, and verbatim-preserved
ferry absorbs are carved out — they legitimately carry names.

**Source:** name-attribution discipline (multiple Otto-NN
memories; see CURRENT-aaron.md for consolidated view).

### verbatim-preserve vs factory-authored

**Rule:** ferry-absorb documents (`docs/aurora/**` external-
research imports) are VERBATIM-preserved external research
substrate. The verbatim body is content-preservation (no
rewrites for typos, consistency, or current-convention
alignment). Factory-authored header and absorb-notes
sections ARE editable under the name-attribution +
code-comments disciplines.

**Source:** verbatim-preservation memories + Otto-112.

### glass-halo first-party vs third-party PII

**Rule:** two tiers on absorbed conversation content:
- **First-party** (Aaron's own information): glass-halo
  default → leave intact. No redaction on Aaron's behalf.
- **Third-party** (someone else): Otto-204b → defer to
  human-maintainer + threat-model-critic review; no
  unilateral agent redaction.

The tier turns on whose information is IN the passage, not
who the speaker is.

**Source:** `memory/feedback_glass_halo_first_party_aaron_consent_no_redaction_of_his_own_content_otto_231_*.md`

### auto-merge-always at PR-open-time

**Rule:** every `gh pr create` is immediately followed by
`gh pr merge <N> --auto --squash`. Opening without arming
auto-merge leaves the PR sitting at BLOCKED/CLEAN waiting
on manual merge — the exact throughput hole the autonomous
loop was built to close.

**Source:** `memory/feedback_always_enable_auto_merge_on_every_pr_at_open_time_otto_224_*.md`

### drain loop has three axes

**Rule:** a PR auto-merges only when ALL THREE clear:
(1) zero unresolved review threads, (2) all required CI
checks pass, (3) branch has no merge conflict with main
(`mergeStateStatus != "DIRTY"`). Every tick survey all
three. Dispatch subagents for whichever axis each PR needs.

**Source:** `memory/feedback_drain_loop_includes_dirty_conflict_state_not_just_threads_and_checks_otto_228_*.md`

### hot-file cascade → bulk-close

**Rule:** when N>5 PRs share a single hot-append file AND
the file is append-only AND the PR content is historical
audit-trail (captured by downstream main state), the correct
disposition is bulk-close-as-superseded, not rebase-and-
merge. Every merge of an append-only-file sibling
re-DIRTIES the other N-1 in the cluster; parallel rebase
under cascade is negative-throughput.

**Source:** `memory/feedback_hot_file_cascade_bulk_close_as_superseded_over_sisyphean_rebase_otto_232_*.md`

Three-signal confirmation required before bulk-closing.

### subagent fresh-session quality gap

**Rule:** dispatched subagents have CLAUDE.md + dispatch prompt
+ in-repo `Read`, but NOT the factory-personal memory store.
Recently-captured Otto-NN disciplines are invisible to
them. Mitigations in effect:

1. Every dispatch prompt carries explicit constraints for
   the rules that apply to the target files (append-only,
   verbatim-preserve, code-comments-not-history, etc.).
2. Every dispatch prompt includes a **pre-edit header-scan
   step**: Read the first 100 lines of every conflicted /
   edited file; apply any file-local discipline sections
   found.
3. This file (`docs/FACTORY-DISCIPLINE.md`) is in-repo and
   reachable by subagents via `Read`.

**Source:** `memory/feedback_subagent_fresh_session_quality_gap_missing_rules_debug_otto_230_*.md`

The upstream structural fix (sync memory store → in-repo
`memory/` on every tick) is in `docs/BACKLOG.md` at
elevated P1 priority (see "Ongoing memory-sync mechanism"
row). When that lands, subagents will see the authoritative
memory directly; this file becomes a short-form index on
top.

### serial PR open, parallel thread drain

**Rule:** opening new PRs = serial (one at a time, wait
for review, address, then next). Draining threads on
existing open PRs = parallel (fan out via subagents with
worktree isolation, batch 3-8).

**Source:** `memory/feedback_serial_pr_flow_wait_for_review_comments_before_opening_next_pr_otto_225_*.md`
+ `memory/feedback_dispatch_subagents_with_worktrees_to_drain_pr_threads_in_parallel_otto_226_*.md`

### post-drain AceHack-first routing

**Rule:** once the current Zeta drain completes (queue
<= 20 open, no stuck review-drain PRs), new PRs go to
`acehack/Zeta` first (personal GitHub, unlimited Copilot
via ServiceTitan billing) for Copilot review, THEN push
to `Lucent-Financial-Group/Zeta` for merge. Does NOT
authorize two-hop during drain-mode (worsens saturation).

**Source:** `memory/feedback_post_drain_prs_to_acehack_first_for_copilot_then_push_to_lfg_otto_223_*.md`

### branch-protection strict=false + branch-protection-PATCH via API

**Rule:** `required_status_checks.strict: false` on
`Lucent-Financial-Group/Zeta` so BEHIND PRs can auto-merge
without manual rebase. `allow_auto_merge: true` +
`delete_branch_on_merge: true` on `AceHack/Zeta` fork so
both repos support the AceHack-first flow.

**Source:** Otto-223 branch-protection + GitHub-settings
live-edit memories.

### cross-harness skill discovery

**Rule:** Claude Code does NOT read `.agents/skills/`
(verified empirically); Codex + Gemini DO read it. Placement:
- Generic skills → `.agents/skills/<name>/SKILL.md` (Codex +
  Gemini) + `.claude/skills/<name>/SKILL.md` (Claude, until
  it joins the convention)
- Harness-specific skills → that harness's canonical dir
  only. Behaviour / data split: SKILL.md bodies carry
  behaviour with per-harness tweaks; shared `docs/`
  content carries data.

**Source:** `memory/feedback_cross_harness_skill_discovery_verified_canonical_home_per_harness_otto_227_*.md`

### three-outcome model per review thread

**Rule:** when addressing a review thread, pick ONE of
three legitimate outcomes; no silent bailout:
1. **Fix in place** — small, localised fix lands in this PR.
2. **Narrow fix + BACKLOG row** — partial fix in this PR,
   deeper cleanup tracked as a new BACKLOG row cited in
   the thread reply.
3. **Backlog only + resolve** — proper solution is
   architectural; file a BACKLOG row, reply with the
   link, resolve the thread.

No LOC cap on which outcome applies; judgement call per
thread.

**Source:** Otto-226 + Otto-227 three-outcome-model
memories.

---

## What this file is NOT

- Not authoritative. The memory files are authoritative.
  This file is a forwarding pointer.
- Not a full rule list. Stable rules live in
  `docs/AGENT-BEST-PRACTICES.md` (BP-NN). Session-captured
  corrections are distilled here only where they matter
  for subagent dispatch.
- Not auto-maintained yet. Updates to this file are
  manual from memory writes, until the memory-sync
  BACKLOG row lands.

## Read more

- `CLAUDE.md` — session bootstrap + pointer tree
- `docs/AGENT-BEST-PRACTICES.md` — stable BP-NN rule list
- `GOVERNANCE.md` — numbered repo-wide rules
- `docs/CONFLICT-RESOLUTION.md` — specialist review roster
- `docs/WONT-DO.md` — declined features / refactors
- `memory/MEMORY.md` (out-of-repo) — authoritative
  session-captured discipline; agents inside a session
  read this; subagents do not.
