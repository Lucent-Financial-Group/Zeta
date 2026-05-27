# Claim - codex-b0855-1-zeta-self-register-service-20260527

- **Session ID:** codex/20260527T0708Z
- **Harness:** codex
- **Claimed at:** 2026-05-27T07:08:30Z
- **ETA:** 2026-05-27T08:08:30Z progress signal or release
- **Scope:** B-0855.1 only: add the `zeta-self-register.service` NixOS module surface for post-install first-boot self-registration timing.
- **Durable target:** `docs/backlog/P1/B-0855-self-registration-fires-LAST-post-install-post-first-boot-idempotent-across-reboots-deduped-against-in-flight-registration-prs-aaron-2026-05-27.md`
- **Platform mirror:** none yet

## Notes

- Exclude B-0855.2+ implementation work unless this claim is explicitly widened later.
- Exclude removal of `zeta-install.sh` Step 6.9; that is B-0855.5.
- Keep the contested root checkout read-only. Use this dedicated worktree for any patch.
- Before implementation, inspect current installer/NixOS module layout and active heartbeats again for overlapping path claims.
