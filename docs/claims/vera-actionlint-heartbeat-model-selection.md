# Claim - vera-actionlint-heartbeat-model-selection

- **Session ID:** sess-019e9b66
- **Harness:** codex
- **Claimed at:** 2026-08-24T17:59:21Z
- **ETA:** 2026-08-24T18:30:00Z
- **Scope:** Fix the reproducible actionlint failure in heartbeat model selection without changing the model assignments.
- **Durable target:** `.github/workflows/agent-heartbeat.yml`

## Notes

Replace shell indirection with an explicit finite mapping so actionlint can verify every assignment is used.
