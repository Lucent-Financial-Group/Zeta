# Claim - task-setup-mise-tool-pins-20260528

- **Session ID:** codex/20260528T131246Z
- **Harness:** codex
- **Claimed at:** 2026-05-28T13:13:00Z
- **ETA:** 2026-05-28T13:30:00Z
- **Scope:** Repair shared mise/aqua setup pins that block GitHub Actions lint jobs across PR #5800 and newer PRs.
- **Durable target:** `.mise.toml` and setup/toolchain notes if needed.
- **Platform mirror:** #5800 CI failure cluster

## Notes

Claim opened after inspecting #5800 run `26576555171`, job `78297343887`.
The failing jobs do not reach their lint scripts; they fail during `./tools/setup/install.sh`.
Observed failing pins:

- `aqua:astral-sh/uv@0.11.8` returned GitHub API 404 for release tag `0.11.8`.
- `aqua:rhysd/actionlint@1.7.12` returned GitHub API 404 for release tag `v1.7.12`.
- `pipx:semgrep@1.161.0` skipped because uv/actionlint setup failed.

Ownership check found no open PR title/head branch and no active claim file for this setup-pin repair.
