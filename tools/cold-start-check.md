# cold-start-check.ts

Executable form of the cold-start big-picture-first rule. When a
fresh agent (or new contributor) wakes up on this project, run

```bash
bun tools/cold-start-check.ts
```

and the tool prints the current big-picture state across the 8
steps from the cold-start checklist. Designed for one-screen
ingestion (~30-50 lines), not for ongoing-session reference.

## Output

Two modes:

- **Human-readable** (default) — heading, 8 numbered steps with
  source path + headline, recent commits, closing footer.
- **JSON** (`--json`) — same data, structured for programmatic
  consumption (CI gates, observability tooling).

## Steps surfaced

1. Mission scope (intellectual-backup-of-earth)
2. Products in flight (factory substrate / package manager /
   database / Aurora)
3. Internal direction (project-survival)
4. Authority scope (two-ask-Aaron items: WONT-DO + budget)
5. Operating disciplines (CLAUDE.md headline)
6. Current trajectory (branch + last 5 commits)
7. Maintainer CURRENT-* files in user-scope memory
8. Then prompt — read the user's prompt and proceed downstream

## Why this exists

Operationalizes
`memory/feedback_cold_start_big_picture_first_not_prompt_first_aaron_2026_04_30.md`.
The prose-rule -> executable-tool pattern that produced
`tools/github/poll-pr-gate.ts` from the poll-the-gate rule —
recognized by the `feedback_amara_poll_gate_not_ending_holding_is_not_status_2026_04_30.md`
precedent, named by Ani's peer review 2026-04-30 ("consider
making the 8-step checklist executable"), reinforced by Deepseek
2026-04-30 (deferred-skill anti-pattern: noted "Backlog candidate"
without a B-NNNN row is gap-by-omission), filed as B-0117.

## When to run

- **Fresh-Otto cold-start** — first cognitive move after wake.
- **New human-contributor onboarding** — alongside `AGENTS.md` +
  `CONTRIBUTING.md`.
- **Long-pause return** — when restarting work after >24h gap.
- **After major doctrine shift** — when CLAUDE.md or memory
  files have substantively changed.

## Composes with

- `memory/feedback_cold_start_big_picture_first_not_prompt_first_aaron_2026_04_30.md`
  — the prose-rule this tool operationalizes.
- `tools/github/poll-pr-gate.ts` — sibling tool, same pattern
  (prose-rule → executable-tool).
- `CLAUDE.md` fast-path — top-of-file pointer to CURRENT-*.md
  files; this tool surfaces step 7 from the same fast-path
  discipline.
- B-0117 (this row) closes the gap Deepseek named.

## Implementation notes

- Bun-native; uses `node:child_process` + `node:fs` only (no
  third-party deps).
- Reads source-of-truth files at runtime; gracefully reports
  `(missing)` for any file not found.
- `--no-git` disables the trajectory step for offline / read-only
  contexts.
- Bash 3.2 isn't relevant (Bun is the runtime), but the tool
  invokes `find` and `git` which must be in `$PATH` — both are
  guaranteed by the three-way-parity install per GOVERNANCE §24.

## Acceptance criteria from B-0117

- [x] `bun tools/cold-start-check.ts` runs and prints all 8 steps with current values
- [x] Output is terse (single screen, ~30-50 lines)
- [x] Sources of truth are verifiable (CURRENT-aaron.md + CURRENT-amara.md + recent commits)
- [x] Fresh-Otto cold-start with no project-context can read the output and know what to ground in
- [ ] Tested on the four-shell target (Otto-235) — Bun is cross-platform; smoke-tested on macOS only here, follow-up to verify on Ubuntu / git-bash / WSL.
- [x] Documented in `tools/cold-start-check.md` (this file)
