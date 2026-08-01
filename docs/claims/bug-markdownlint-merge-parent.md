# Claim - bug-markdownlint-merge-parent

- **Session ID:** codex/d42e0a91
- **Harness:** codex
- **Claimed at:** 2026-08-01T19:19:27Z
- **ETA:** 2026-08-01T21:00:00Z
- **Scope:** Ensure the PR markdownlint job fetches its merge parent and repair the inherited markdown drift it exposed.
- **Durable target:** .github/workflows/gate.yml; docs/PRIOR-ART-LIST.md
- **Platform mirror:** none

## Notes

PR #9917 reproduced `fatal: ambiguous argument 'HEAD^1'` after a depth-1 checkout and ineffective generic deepen fetch.
