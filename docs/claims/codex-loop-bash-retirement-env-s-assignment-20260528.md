# Claim - codex-loop-bash-retirement-env-s-assignment-20260528

- **Session ID:** codex/launchd-loop
- **Harness:** codex
- **Surface:** codex-background-service
- **Origin:** codex-launchd-loop
- **Run ID:** 20260528T174356Z
- **Claimed at:** 2026-05-28T17:45:00Z
- **ETA:** 2026-05-28T18:30:00Z
- **Scope:** Harden the bash-retirement inventory guard for `env -S` split-string shebangs with leading environment assignments.
- **Durable target:** PR from `claim/codex-loop-bash-retirement-env-s-assignment-20260528`
- **Platform mirror:** GitHub PR to be opened after the focused guard/test slice lands.

## Notes

- Broadcast bus, startup docs, and `timeout --kill-after=5s 30s bun tools/github/refresh-worldview.ts` were read before claim.
- Worldview at 2026-05-28T17:45:01Z: 44 open PRs, 36 claim branches, 996 backlog items, 7 pending CI runs, control clone clean on `main` and 20 behind `origin/main`.
- `bun .codex/bin/codex-backlog-runner.ts --json` selected the TypeScript/Bun migration trajectory: maintain the bash-retirement inventory guard.
- Existing bash-retirement heartbeats for `tools/hygiene/check-bash-retirement-inventory.*` are terminal cleanup records; no live local or remote claim exists for this slug.
- Assumption: a focused parser/test hardening slice is non-overlapping and retractable. If review finds another active owner on the same parser surface, release this claim and preserve only the findings.
- This run resumed an untracked local claim file left by prior background run `20260528T172840Z`; durability starts with this headless run's claim commit.
