
`cross-verify` and `lint (bash retirement inventory + hygiene unit tests)` are
both red on `main` on the same finding — five of them, all in one file, all the
same shape:

    verify-session-fixes.ts:28  existsSync(ciRunsPath)  gates readFileSync at 29
    verify-session-fixes.ts:37  existsSync(rsBlocksPath) gates readFileSync at 38
    verify-session-fixes.ts:51  existsSync(vaultPath)    gates readFileSync at 52
    verify-session-fixes.ts:51  existsSync(vaultPath)    gates readFileSync at 62
    verify-session-fixes.ts:61  existsSync(vaultPath)    gates readFileSync at 62

Landed in db4613d43 (#13943). Between the check and the read the path can be
created, deleted or replaced, so the answer `existsSync` returned is already
stale when `readFileSync` runs. The read has to be able to fail either way,
which is what makes the gate pure decoration.

Replaced with the `readIfPresent` shape `cluster/rendered-storage-claims.ts`
already uses: one syscall, one answer, interpret ENOENT.

THE NARROW CATCH IS THE LOAD-BEARING PART, and it matters more here than usual.
This script's entire job is to report whether a fix landed. ENOENT means "the
tick has not written it yet" and is a real answer. Anything else — unreadable, a
directory, EIO — is rethrown rather than reported as "does not exist", because a
verifier must never answer "no" when what it means is "I could not tell". A broad
catch would have turned this file into the exact failure class it exists to
detect: a check that did not run looking like one that ran and failed.

ONE READ, ONE SNAPSHOT. Note the third and fourth findings share line 51: vault
status and connectivity both read `vault-state.json`, separately. Beyond the
race, that is two reads of one file, so a write landing between them could report
a vault count from one version and a connectivity list from another — two checks
disagreeing about the same tick. It now reads once and both sections use that
snapshot. That is a real behaviour improvement the linter's finding surfaced,
not just a lint fix.

VERIFIED, and the behaviour is unchanged:
  * `lint-check-then-use-file-races.ts --root src/Core.TypeScript --min-files
    1500 --baseline ...` — exit 1 with 5 findings -> exit 0, "no check-then-use
    filesystem races found", 1952 files scanned.
  * `bun test .../lint-check-then-use-file-races.test.ts` — 36 pass / 0 fail.
  * `bun src/Core.TypeScript/lint/lint-typescript.ts` — exit 0.
  * The script's own output is byte-identical before and after (`diff` clean),
    same exit code 1, on a tree where `ci-runs.jsonl` is absent and the other
    three are present — so the ENOENT path and the success path are both
    exercised by that comparison rather than assumed.

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
