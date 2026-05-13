# tools/bg/ — Background services

Background services that mechanize substrate-engineering
disciplines so the foreground loop becomes OPTIONAL per the
architectural challenge in PR #2998.

## Current services

| Service | Slice | Purpose |
|---------|-------|---------|
| `standing-by-detector.ts` | B-0440.1 (skeleton) | Detect idle-foreground + nudge via bus when full impl lands |

## Planned services (per B-0440/0441/0442)

- `standing-by-detector.ts` — catches the Standing-by failure mode (B-0440)
- `backlog-ready-notifier.ts` — proactively assigns ready-to-grind rows (B-0441)
- `missed-substrate-detector.ts` — catches branch-vs-merged-PR drift (B-0442)

## Composition

All services compose with:

- **B-0400 bus protocol** (`tools/bus/`) — transport for nudges + assignments + cascade alerts
- **Existing background infrastructure** — `com.zeta.claude-loop` launchd + cron heartbeat

## Running

```bash
# One-shot mode (cron-driven; recommended)
bun tools/bg/standing-by-detector.ts --once

# Loop mode (standalone daemon)
bun tools/bg/standing-by-detector.ts --poll-min 5 --idle-min 15
```

## Slice cadence

Each service decomposes into ~6 implementation slices per its backlog row's
"Decomposition into implementation slices" section. Slice 1 is the skeleton
with a no-op poll loop; later slices add real detection logic, bus
integration, and tests.
