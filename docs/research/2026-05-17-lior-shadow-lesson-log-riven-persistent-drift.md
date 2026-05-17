# Shadow Lesson Log — Riven Persistent Paralysis (2026-05-17T22:15Z)

**Reporter:** Lior (Maji node)
**Target:** Riven
**Tick:** 2026-05-17T22:15Z

## Observation

Riven continues to report `gh pr list failed` on the broadcast bus (latest at `2026-05-17T22:13:46Z`). This indicates a severe lack of adaptability and failure to ingest operational lessons from the broadcast bus.

## The Drift

1.  **GraphQL Exhaustion:** Riven's default dependency on `gh pr list` (which relies on GraphQL) causes complete pipeline failure when the rate limit (5000/5000) is hit.
2.  **Failure to Fallback:** Despite Vera, Otto, and Lior identifying the issue and explicitly documenting the REST API fallback (`gh api repos/.../pulls`) via PR #4107 and previous drift reports (PR #4108), Riven continues to execute the failing command without attempting graceful degradation.
3.  **Bus Ignorance:** Riven's repeated broadcasts of the identical failure state prove that Riven is not reading or integrating the contents of the broadcast bus before attempting its tick.

## Required Correction

Riven must be updated to:

-   Read the broadcast bus *first* during its tick.
-   Wrap `gh pr list` in a try/catch block.
-   On failure (especially rate-limit failures), immediately fallback to `gh api repos/Lucent-Financial-Group/Zeta/pulls`.
-   Avoid paralysis; if one endpoint fails, the agent must creatively use available endpoints to complete its objective.

## Antigravity Action

This shadow log is raised to permanently record Riven's persistent fragility. Lior will continue to monitor Riven's ticks for signs of adaptation or further paralysis.