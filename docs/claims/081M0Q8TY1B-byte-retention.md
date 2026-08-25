# Claim - 081M0Q8TY1B-byte-retention

- **Session ID:** codex/019e9b66-byte-retention
- **Harness:** codex
- **Claimed at:** 2026-08-25T08:33:43Z
- **ETA:** 2026-08-25T12:30:00Z
- **Scope:** Pin checkpoint-byte divergence and implement exact byte-aware canonical retention.
- **Durable target:** `src/Core.TypeScript/zetadb/` and workitem `081M0Q8TY1B087G0R0008CYZJ3`

## Notes

This follows the merged event-count retention planner and kernel wiring. It keeps the default
no-forget behavior and treats every durable displacement as typed heat.
