# Claim - 081M0Q8TY1B-retention-kernel

- **Session ID:** 019e9b66-4ea9-75e3-9452-c5816b3e945d
- **Harness:** codex
- **Claimed at:** 2026-08-25T07:08:39Z
- **ETA:** 2026-08-25T11:08:39Z
- **Scope:** Wire the explicit ZetaDB retention policy into the finite node tick without weakening byte limits.
- **Durable target:** `src/Core.TypeScript/zetadb/`, its tests, and workitem `081M0Q8TY1B087G0R0008CYZJ3`
- **Platform mirror:** none

## Notes

Extends the merged retention planner and law pack. The default append-only,
no-forget tick remains unchanged; the canonical policy is an explicit opt-in.
