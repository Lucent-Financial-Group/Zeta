# Claim - codex-loop-b0366-2-3-reversibility-laws-20260601T222009Z

- **Session ID:** codex/launchd-loop
- **Harness:** codex
- **Claimed at:** 2026-06-01T22:22:38Z
- **ETA:** 2026-06-01T23:20:09Z
- **Scope:** Implement the smallest safe B-0366.2.3 reversibility-law slice over the Toffoli join weight-multiplication fragment.
- **Durable target:** `tests/Tests.FSharp/Formal/ToffoliGate.Laws.Tests.fs`; `docs/backlog/P1/B-0366.2.2-join-weight-multiplication-encoding.md`; `docs/backlog/P1/B-0366.2.3-reversibility-laws-fscheck-properties.md`
- **Platform mirror:** none
- **Surface:** codex-background-service
- **Origin:** codex-launchd-loop
- **Run ID:** 20260601T222009Z

## Notes

- Orthogonal pickup after `B-0164.1` was skipped due active trajectory overlap with `claim/otto-cli-b0164-1-github-review-thread-adapter-20260601T140623Z`.
- Assumption: dependency `B-0366.2.2` is satisfied by merged PR #6422 (`0eb7a4d9ac06a1a31f66a92be61e9e054185fad4`) even though the backlog child row still says `status: open`.
- Intended path set is limited to the focused Toffoli test file and the two B-0366.2 backlog child rows needed to record dependency/closure state.
