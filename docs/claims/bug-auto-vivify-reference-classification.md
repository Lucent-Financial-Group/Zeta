# Claim - bug-auto-vivify-reference-classification

- **Session ID:** codex/cf9ecf09
- **Harness:** codex
- **Claimed at:** 2026-08-23T17:16:41Z
- **ETA:** 2026-08-23T18:30:00Z
- **Scope:** Restore the auto-vivify gate by separating QEC bracket notation from wiki links and making shortened cluster manifest paths repo-resolvable.
- **Durable target:** `src/Core.TypeScript/backlog/auto-vivify.ts`, its focused tests, three affected workitems, and this claim.

## Notes

Current main reports 14 dangling references. Eleven are repeated QEC parameter tuples such as `[[16,6,4]]`; three are real files cited relative to `full-ai-cluster/k8s/` rather than the repository root.
