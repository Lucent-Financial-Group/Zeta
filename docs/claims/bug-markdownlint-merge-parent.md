# Claim - bug-markdownlint-merge-parent

- **Session ID:** codex/d42e0a91
- **Harness:** codex
- **Claimed at:** 2026-08-01T19:19:27Z
- **ETA:** 2026-08-01T21:00:00Z
- **Scope:** Ensure the PR markdownlint job fetches its merge parent and repair the inherited markdown drift it exposed.
- **Durable target:** .github/workflows/gate.yml; docs/PRIOR-ART-LIST.md
- **Platform mirror:** https://github.com/Lucent-Financial-Group/Zeta/pull/9920

## Notes

PR #9920 proved the first checkout edit targeted the wrong repeated YAML block. Claim restored until the corrected job passes CI.
