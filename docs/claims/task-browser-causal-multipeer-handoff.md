# Claim - task-browser-causal-multipeer-handoff

- **Session ID:** codex/0820-causal-multipeer
- **Harness:** codex
- **Claimed at:** 2026-08-20T17:10:25Z
- **ETA:** 2026-08-20T21:30:00Z
- **Scope:** Make browser causal replay acknowledgements bounded and correct across concurrent peer tabs.
- **Durable target:** `src/Core.TypeScript/darkhall-ui/` and browser multi-tab verification in PR form
- **Platform mirror:** none

## Notes

Extends the merged finite acknowledgement contract from PR #12100. The current
runtime stores one pending offer, so a second peer can displace the first before
its valid acknowledgement arrives.
