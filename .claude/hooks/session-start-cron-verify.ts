#!/usr/bin/env bun
// session-start-cron-verify.ts — SessionStart hook that surfaces
// a forcing-function reminder for the autonomous-loop cron.
//
// Background: catch 43 (2026-05-12) recorded a 12-hour gap when
// Otto failed to arm the autonomous-loop cron at session start.
// The `.claude/rules/tick-must-never-stop.md` rule already says
// every session MUST CronList at start, but the rule was knowable-
// and-skipped, not unknown.
//
// Mitigation: this hook prints a SessionStart system-reminder
// requiring CronList + CronCreate verification BEFORE any other
// work. The reminder is mechanical (always fires), so even when
// the agent is absorbed in high-intensity substrate work, the
// session-start sequence has an unavoidable cron-check step.
//
// Hook contract: SessionStart hooks print to stdout, which the
// Claude Code harness injects into the conversation as a
// system-reminder. No exit code logic needed.

const message = [
  "🌱 ZETA SESSION-START CHECK (per catch 43 — 2026-05-12):",
  "",
  "Your first action this session MUST be:",
  "",
  "  1. Call CronList",
  "  2. If no entry with sentinel `<<autonomous-loop>>` is present,",
  "     immediately CronCreate with:",
  "       cron:      \"* * * * *\"",
  "       prompt:    \"<<autonomous-loop>>\"",
  "       recurring: true",
  "",
  "This is the load-bearing rule from",
  "`.claude/rules/tick-must-never-stop.md`. Catch 43 cost 12 hours",
  "of autonomous-loop time when this step was skipped. Do not",
  "defer it for any reason — not substrate work, not emotional",
  "context, not 'I'll check after this PR.' Check FIRST.",
  "",
  "Then proceed with whatever the user is asking.",
].join("\n");

console.log(message);
