---
name: CADENCED INSPECT — memory-only counterweights are leaky without a cadenced inspect job that audits for missing balance + drifted lessons; "I'll remember to read the memory" is prayer; Otto-276 drifted within hours, Otto-277 re-tightened — same pattern; the fix is a CADENCED AUDIT that FORCES re-reading counterweight memories + checks for rule-drift; without that cadence, memory files are write-once-read-never; with the cadence, memory is sufficient; Aaron Otto-278 2026-04-24 "memory is enough assuming you have a inspect memory for missing balance and lessions on a cadence it's probably enough, but you forget often when it's just in memory"
description: Aaron Otto-278 gap-named. Without cadenced re-inspect, memory-only counterweights fail silently. The cadence is the load-bearing piece that makes the memory actually work. Save short + durable + file task for cadenced-inspect skill/tool.
type: feedback
originSessionId: 1937bff2-017c-40b3-adc3-f4e226801a3d
---
## The rule

**Memory alone is sufficient IFF + ONLY IFF a
cadenced inspect-memory audit runs on a schedule to
check for missing-balance + rule-drift.**

Without the cadence, memory files are write-once-
read-never and I drift right back into the pattern
the memory was supposed to counter.

Direct Aaron quote 2026-04-24:

> *"memory is enough assuming you have a inspect
> memory for missing balance and lessions on a
> cadence it's probably enough, but you forget often
> when it's just in memory"*

## Evidence from this session

- **Otto-276** filed 2026-04-24 ~21:30Z (never-pray-
  auto-merge; inspect actual blockers)
- I drifted back into praying within ~30 min
- **Otto-277** filed 2026-04-24 ~22:10Z (tightens
  Otto-276: every-tick-inspect)
- Without cadenced audit, Otto-277 will drift too —
  that's the whole point Aaron is making

## The cadenced inspect design (backlog-owed)

**Cadences** (nested):

- **Per-tick quick**: at tick-open, 3-second scan —
  "any counterweight memory I've drifted on since
  last tick?" Look at 2-3 most recent memories only.
- **Per-N-tick medium**: every 5-10 ticks, run a
  broader audit — re-read last 10 counterweight
  memories, check for drift signals in own behavior.
- **Per-session / per-round long**: every session-
  start or round-open, full sweep — re-read ALL
  counterweight memories; produce a "drift report"
  flagging patterns I've slipped on.

**Tool surface** (candidate):

- `tools/hygiene/counterweight-audit.sh` — reads
  `memory/feedback_*otto_*` files, produces audit
  questions for current agent
- `.claude/skills/counterweight-audit/SKILL.md` —
  skill that the agent can invoke (or is invoked on
  cadence) to force the re-read + self-check
- Tick-open hook — small per-tick inspect injected
  into autonomous-loop tick-open step

**Audit questions** (per counterweight):

- "In the last N ticks, did I exhibit the drift this
  counter was filed for?"
- "If yes: file a tighter counterweight (like
  Otto-276 → Otto-277)"
- "Is the counter still needed at this cadence, or
  can maintenance-cadence stretch?"

## Composition with prior memory

- **Otto-264** rule of balance + maintenance cadence
  — Otto-278 operationalizes the maintenance-
  cadence claim; without cadenced inspect, Otto-264's
  "recheck every 20-50 ticks" is empty.
- **Otto-275** rapid-fire absorb — Otto-278 says
  absorb + log-don't-implement works ONLY with
  cadenced re-read.
- **Otto-276/277** inspect-not-pray — Otto-278 is
  why those keep drifting without it.
- **Skill-tune-up / Aarav's role** — already
  cadenced for skill files; Otto-278 extends the
  cadence concept to counterweight memories.
- **Otto-267/269** Bayesian curriculum — the
  cadenced audit IS the teaching loop (re-read →
  self-check → realign).

## Backlog-owed

- **P1**: `docs/BACKLOG.md` row for cadenced
  counterweight-audit skill/tool.
- **P2**: draft `counterweight-audit` skill.
- **P2**: tick-open hook integration.
- **P2**: first baseline audit — re-read Otto-257..277
  and produce drift report.

## Direct Aaron quote to preserve

> *"memory is enough assuming you have a inspect
> memory for missing balance and lessions on a
> cadence it's probably enough, but you forget often
> when it's just in memory"*

Future Otto: memory-only counterweights are write-
once-read-never UNLESS paired with a cadenced
audit. File memories durably AND build the cadence
into the loop. Without both, I drift.
