# Claim - bug-op-token-setup-reference-drift

- **Session ID:** codex/49d2e457
- **Harness:** codex
- **Claimed at:** 2026-08-23T18:35:00Z
- **ETA:** 2026-08-23T19:15:00Z
- **Scope:** Repair live workitem references to the retired OP token shell entrypoint.
- **Durable target:** Three affected workitems; no source or historical archive changes.
- **Platform mirror:** none

## Notes

Current main fails `auto-vivify --check` because three operational workitems
resolve the deleted `.sh` path as a live target. Historical descriptions will
name the retired entrypoint without presenting it as a resolvable path; operator
instructions will point to the current TypeScript command.
