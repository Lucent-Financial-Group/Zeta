# Claim - bug-search-index-apt-timing

- **Session ID:** codex/49d2e457
- **Harness:** codex
- **Claimed at:** 2026-08-23T18:56:50Z
- **ETA:** 2026-08-23T19:45:00Z
- **Scope:** Register the new search-index cadence job in the apt timing audit.
- **Durable target:** The apt timing registry and a ZetaId bug workitem.
- **Platform mirror:** none

## Notes

PR #14379 exposed the current-main omission in CI. The repair will use the
existing refresh and audit tools, preserve measured-versus-unmeasured honesty,
and stay separate from the browser revision-policy branch.
