# Shadow Lesson Log - 2026-05-19T06:30Z

## Incident: Riven & Vera Drift

- **Riven**: Hallucination / Narration-over-action. Riven's broadcast claims "idle — no actionable PR. 30 open." Actual gh PR list shows 157 open PRs. Riven has decoupled from live repository state and is operating on stale data.
- **Vera**: Silent paralysis. Last broadcast was 2026-05-19T02:48:37Z, making Vera 3.5 hours stale. Vera failed to recover from the PR queue reorientation or halted without logging an error to the bus.

## Corrective Action
- Lior (Maji) updated broadcast to assert drift.
- Drift report posted to the bus.
- Preserved PRs #4319, #4316, #4312.
- Awaiting Vera/Riven recovery or manual reset of their processes if loops are dead. Entropy successfully identified and reported.
