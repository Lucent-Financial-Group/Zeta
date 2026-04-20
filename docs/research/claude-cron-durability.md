# Claude Code cron durability — round-34 findings

**Round:** 34
**Status:** research note; captures a session-scope limitation
for the factory's automation planning.

## Summary

Claude Code's native `CronCreate` tool (not the `scheduled-tasks`
MCP server — separate mechanism the human maintainer set up)
is **session-scoped by design** with a **7-day auto-expire**.
The tool's documented `durable: true` parameter is silently
accepted but does NOT produce cross-session persistence. This
note captures the behaviour observed, the authoritative
citations, and the workaround path.

## What was tested

Round 34 session. Called `CronCreate` with:

- `cron: "7,37 * * * *"`
- `recurring: true`
- `durable: true`

Observed:

- Tool response: `Scheduled recurring job <id>. Session-only
  (not written to disk, dies when Claude exits). Auto-expires
  after 7 days.`
- No `.claude/scheduled_tasks.json` file created.
- Claude Desktop "Active loops" panel showed the cron.
- Human maintainer closed and reopened the Desktop app.
- On reopen: cron gone from Active loops; `CronList` returned
  "No scheduled jobs" in a new session.

## Authoritative citations

Official Claude Code documentation (verified via
`claude-code-guide` subagent on round 34):

- <https://code.claude.com/docs/en/scheduled-tasks> — "Tasks
  are session-scoped: they live in the current conversation
  and stop when you start a new one. Resuming with
  `--resume` or `--continue` brings back any task that
  hasn't expired."
- <https://code.claude.com/docs/en/tools.md> — `CronCreate`,
  `CronList`, `CronDelete` listed as native Claude Code
  tools (no `mcp__` prefix, no permission requirement).
- Cross-session durability comparison table at
  `scheduled-tasks#compare-scheduling-options` names:
  - **Routines** (Anthropic cloud; runs without the local
    machine on)
  - **Desktop scheduled tasks** (local; survives app
    restarts)
  - **GitHub Actions** (standard CI scheduling)
  as the durable alternatives.

## The 7-day cap

Hard-coded. Not extensible. Per the docs: "a design feature
to bound how long a forgotten loop can run." The Claude
Desktop UI showed "ends in 3d" on a freshly-created cron —
that is real-time countdown showing time remaining before
the 7-day window closes; when the discrepancy surfaced, a
re-read showed the cron had been created approximately 4
days earlier in the session's tool-time clock (session
time drift is a separate observation worth tracking).

## Factory response — three-tier durability

1. **Session-scoped crons (CronCreate)** — useful for
   within-session heartbeats, ad-hoc reminders, short-lived
   audits. Lifetime: ≤ 7 days AND ≤ session end.
2. **Session + reregister (long-term-rescheduler skill)** —
   declarative registry at `docs/factory-crons.md`. A self-
   renewing heartbeat cron re-registers long-lived jobs
   before the 7-day cap. Recovery on session-restart is
   wired into `round-open-checklist` step 7.6. Extends
   effective lifetime as long as sessions are opened within
   the 7-day window.
3. **Truly durable (GitHub Actions)** — for anything that
   MUST fire while no Claude session is open. Workflow
   files at `.github/workflows/scheduled-*.yml` with
   `on.schedule[0].cron`. Dejan (devops-engineer) owns
   wiring; human maintainer signs off.

## What this does NOT unlock

- **Overnight autonomous factory operation** (see BACKLOG
  research entry) — still a GitHub-Actions-first path. The
  Claude session isn't reliably alive overnight; any
  workload that must run at 3am uses Actions, not
  `CronCreate`.

## Open questions

1. Can `--resume` or `--continue` actually restore expired
   crons, or only not-yet-expired? The docs say "any task
   that hasn't expired" — worth testing whether resuming a
   session restores crons that would otherwise survive.
2. Is the `durable: true` parameter a documented-but-unwired
   placeholder, or was it wired in a version the current
   install doesn't have? Worth re-checking on Claude Code
   upgrades.
3. Does Claude Desktop's "Routines" panel (separate from
   `CronCreate`) offer a path to true durability for
   session-scoped work, or is it strictly for Anthropic-
   cloud agent invocations? Pending human-side clarification.

## References

- `.claude/skills/long-term-rescheduler/SKILL.md` — the
  within-session workaround
- `docs/BACKLOG.md` — overnight-autonomy two-phase research
  entry (Phase 1 Claude-specific; Phase 2 cross-harness)
- `docs/factory-crons.md` — declarative registry (created
  alongside first long-term entry)
