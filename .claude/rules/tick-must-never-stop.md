# Tick must never stop — every-tick-verify because cron is unreliable

Carved sentence:

> The tick is the factory's heartbeat. The cron mechanism is empirically
> unreliable: durable:true doesn't persist, auto-expire is ~3 days not 7.
> Every session MUST CronList at start; re-arm if missing.

## Operational content

When running under `/loop` autonomous mode (cron fires every minute per
`docs/AUTONOMOUS-LOOP.md`), the tick is the factory's heartbeat — never
let it go dark.

**Every session (autonomous OR interactive) MUST `CronList` at start.**
If no live cron exists, re-arm via `CronCreate` with the
`<<autonomous-loop>>` sentinel and `* * * * *` cadence.

**`durable: true` is documented but doesn't actually persist across
sessions in this harness** — set it as intent-documentation but do NOT
rely on cross-session continuity OR on `.claude/scheduled_tasks.json`
as audit-trail. Auto-expire window is empirically ~3 days, not the
documented 7.

Audit trail lives in committed substrate (tick-history rows, memory
files, commits), NOT in the cron mechanism itself.

**End-of-tick checklist** (six steps):

1. Speculative work (per never-be-idle priority ladder)
2. Verify
3. Commit
4. Write per-tick shard at `docs/hygiene-history/ticks/YYYY/MM/DD/HHMMZ.md`
   (canonical write surface; NOT legacy `loop-tick-history.md` table)
5. CronList
6. Visibility signal → stop

## Full reasoning

`docs/AUTONOMOUS-LOOP.md`
`docs/hygiene-history/ticks/README.md` (shard schema + write-vs-read separation)
