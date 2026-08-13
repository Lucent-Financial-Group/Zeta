# Claim - bug-main-quick-gate-drift

- **Session ID:** codex/20260813-main-quick-gate
- **Harness:** codex
- **Claimed at:** 2026-08-13T22:45:50Z
- **ETA:** 2026-08-13T23:15:50Z
- **Scope:** Repair the two inherited `preflight:quick` failures on current `origin/main`.
- **Durable target:** Correct one dangling workitem reference, normalize ten markdown emphasis markers, and land a pull request
- **Platform mirror:** pending pull request

## Notes

Current main references `db/HANDOFF.md` although the carried site handoff lives at `docs/design/root-site-iris/HANDOFF.md`. Its current prior-art entries also use underscore emphasis where the repository requires asterisks. No source behavior changes are in scope.
