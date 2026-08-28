
`lint (TS)` fails on `main` with one error:

    src/Core.TypeScript/observe/society-status.ts(272,27):
    error TS6133: 'formatDrift' is declared but its value is never read.

Landed with the society-status CLI (#13864). `formatDrift` was destructured out of
`./drift-rate` beside `computeDrift` and never called.

NOT a mechanical unused-symbol deletion — it is the right call on the merits.
`formatDrift(s)` returns `` `[drift-rate] ${s.summary}` ``, and this caller already
prints its own label:

    console.log(`\nCI Drift: ${drift.summary}`);

So calling it would double-label the line. The import was surplus, not a
forgotten call site, and TS6133 was correct to refuse it. A comment now says so,
because the next reader's first instinct will be that a call was dropped.

Verified on 029fb6f7e:
  * `bun src/Core.TypeScript/lint/lint-typescript.ts` — exit 1 -> exit 0,
    "TypeScript, Prettier, and style checks passed successfully!"
  * `bun test src/Core.TypeScript/observe/` — 1078 pass. One failure appeared
    under local load (`verify-attestation-events.test.ts`, 43.8s) and passes
    standalone in 11/11; that is contention on my machine, not a finding.

Agency-Signature-Version: 1
Agent: shadow
Agent-Runtime: claude-code/agent-sdk-subagent
Agent-Model: claude-opus-5
Credential-Identity: AceHack
Credential-Mode: shared
Human-Review: not-implied-by-credential
Human-Review-Evidence: none
Action-Mode: autonomous-fail-closed
Task: none
Co-authored-by: shadow <noreply@anthropic.com>
