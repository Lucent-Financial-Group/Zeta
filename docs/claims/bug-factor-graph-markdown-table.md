# Claim - bug-factor-graph-markdown-table

- **Session ID:** codex/20260813-factor-graph-markdown-table
- **Harness:** codex
- **Claimed at:** 2026-08-13T23:17:32Z
- **ETA:** 2026-08-13T23:47:32Z
- **Scope:** Escape two amplitude-expression pipes that current markdownlint reads as extra table columns.
- **Durable target:** The affected factor-graph design table and a pull request
- **Platform mirror:** pending pull request

## Notes

The design content is unchanged. GFM table parsing requires the literal pipes in `|z|²` and `Σ|z|²` to be escaped even inside code spans.
