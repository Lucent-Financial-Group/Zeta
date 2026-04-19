# Factory cron registry

Declarative list of recurring factory jobs the
`long-term-rescheduler` skill manages. This file is canonical;
crons without a row here will be killed on the next heartbeat
reconcile.

Adding, removing, or editing a row goes through a normal PR.
The human maintainer signs off on new entries before merge.
Nadia (prompt-protector) audits every new prompt for injection
resistance before it lands.

## Lifetime modes

- **`session + reregister`** — re-register on expiry; survives
  within a live Claude session across the 7-day
  `CronCreate` cap, and across session restarts via
  `round-open-checklist` step 7.6.
- **`session-only`** — no re-registration; the entry exists
  for documentation of ad-hoc session-scoped crons.
- **`needs durable`** — flag for migration to a GitHub
  Actions schedule-triggered workflow. The rescheduler does
  NOT run the prompt; Dejan (devops-engineer) wires the
  workflow at `.github/workflows/scheduled-<purpose>.yml`.

## Live registry

| id | cron | owner | lifetime | purpose |
|---|---|---|---|---|
| heartbeat | `7,37 * * * *` | long-term-rescheduler | session + reregister | self-renewing; keeps other jobs alive, reconciles this registry, logs to Kenji's notebook |
| git-status-pulse | `7,37 * * * *` | long-term-rescheduler | session + reregister | READ-ONLY branch + CI snapshot every 30 min — landed round 34 |

**Prompts** are kept in each row-referenced skill's procedure
or, for simple one-offs, captured inline in the issue / PR
that added the row. Prompts NEVER edit files, NEVER commit,
NEVER push, NEVER dispatch subagents that write code. The
registry row's `purpose` column is authoritative on scope;
any prompt mismatch is a rescheduler finding.

## Safety rails

Every prompt carried by a registry entry starts with:

```
READ-ONLY FACTORY HEARTBEAT / SCHEDULED AUDIT.
Do NOT edit any file, do NOT commit, do NOT push,
do NOT dispatch subagents that write code.
```

This is a **ceremonial stamp** — the rescheduler will
refuse to register a row whose prompt lacks the rails. A
misconfigured task can then not escape into code-landing
territory even if the Architect at the time of registration
made a mistake.

## Migration to durable

When a `session + reregister` entry has earned its slot
(findings useful across 3+ rounds, human maintainer signs
off), it graduates to `needs durable` and Dejan wires the
GitHub Actions workflow. The row stays in this registry
with the durable flag so the rescheduler knows NOT to run it
from the session — the workflow file owns firing.

## References

- `.claude/skills/long-term-rescheduler/SKILL.md` — the
  skill that manages this registry
- `docs/research/claude-cron-durability.md` — the
  round-34 finding that motivated the three-tier
  durability design
- `.claude/skills/round-open-checklist/SKILL.md` — step
  7.6 session-restart recovery entry point
- `docs/BACKLOG.md` — overnight-autonomy research entries
