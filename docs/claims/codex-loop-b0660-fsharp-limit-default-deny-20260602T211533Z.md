# Claim: codex-loop-b0660-fsharp-limit-default-deny-20260602T211533Z

- task: B-0660 Limit defaults to BLACK / deny-all unless explicit consent
- branch: claim/codex-loop-b0660-fsharp-limit-default-deny-20260602T211533Z
- worktree: /Users/acehack/.local/share/zeta-codex-loop/Zeta-worktrees/codex-loop-b0660-fsharp-limit-default-deny-20260602T211533Z
- claimed-at: 2026-06-02T21:15:33Z
- eta: one bounded Codex background-service slice
- owner: Codex background service
- session: codex/launchd-loop
- surface: codex-background-service
- origin: codex-launchd-loop
- run-id: 20260602T211533Z

## Scope

Implement the smallest F# core slice of B-0660:

- add a fail-closed Limit primitive type surface with `Default = Deny`
- require explicit, valid grant evidence for `Allow`
- add focused F# tests for default deny, malformed/invalid grant denial, and valid grant allow
- update the B-0660 backlog row only to mark this slice landed and leave remaining governance/Lean/documentation work open

## Intended Paths

- `src/Core/Limit.fs`
- `src/Core/Core.fsproj`
- `tests/Tests.FSharp/Limit/Limit.Tests.fs`
- `tests/Tests.FSharp/Tests.FSharp.fsproj`
- `docs/backlog/P1/B-0660-limit-black-by-default-deny-all-unless-explicit-aaron-mika-2026-05-18.md`
- `docs/claims/codex-loop-b0660-fsharp-limit-default-deny-20260602T211533Z.md`

## Non-Goals

- Lean proof implementation
- governance doc authoring
- consent evidence format finalization
- KSK integration beyond type-level composition hooks
