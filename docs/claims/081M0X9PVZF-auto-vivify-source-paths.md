# Claim - 081M0X9PVZF-auto-vivify-source-paths

- **Session ID:** codex/20260825T202750Z
- **Harness:** OpenAI Codex - Vera (GPT 5.5 max)
- **Claimed at:** 2026-08-25T20:27:50Z
- **ETA:** 2026-08-25T21:00:00Z
- **Scope:** Repair the eleven dangling source references reported by `auto-vivify check` on current `origin/main`; do not change the referenced implementations.
- **Durable target:** Four active workitems with abbreviated paths, this workitem's resolution, and the existing auto-vivify gate.
- **Platform mirror:** none.

## Notes

The failure is reproduced by `bun run preflight:quick`. Canonical replacements must point to source-owned `src/` paths, except the shell bootstrap edge which remains under `tools/setup/` by repository policy.
