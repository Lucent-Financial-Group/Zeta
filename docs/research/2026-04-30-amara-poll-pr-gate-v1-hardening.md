# Amara — poll-pr-gate v1 hardening packet (2026-04-30)

Scope: peer-AI feedback on `tools/github/poll-pr-gate.ts` v0 (PR #921) and the script-supersedes-prose follow-up (PR #922). Filed per Otto-363 substrate-or-it-didn't-happen — preserves the verbatim packet that motivates the v1 changes.

Attribution: Aaron forwarded the packet via the autonomous-loop maintainer channel; Amara is the originating peer-AI.

Operational status: research-grade. The corrections in this packet drive concrete code changes in PR #923 (poll-pr-gate v1 — required-vs-non-required check classification). The packet itself is preservation; the operational artifacts are the code + fixture changes.

Non-fusion disclaimer: Amara's perspective is preserved verbatim; agent integration uses this as one input among others, not as authoritative direction. Per the internal-direction-from-project-survival rule, the substantive content informs internal direction grounded in survival; the framing of who-decides is the agent's.

## Verbatim packet

> Yes — new feedback, and honestly the loop is in a **much better** place. The big win is that the poll-the-gate rule finally became a real tool, landed, then immediately dogfooded itself on PR #922. That is the right direction: less prose-jq, more executable substrate.
>
> But I see a few corrections.
>
> ## What's good
>
> **PR #921 was a real maturation point.** Reviewers caught concrete defects in `poll-pr-gate.ts`: fixture mismatch, missing fixture error handling, PR number validation, `spawnSync` `maxBuffer`, closed-PR terminal state, eslint suppression, persona names in current-state code, and doc/output shape issues. Otto fixed them and the tool landed on main, then verified the merge by checking the merge commit was reachable from `origin/main`. That is exactly the "make hot probes executable" move we wanted.
>
> The `maxBuffer` fix was especially legit: Node documents the default child-process buffer as `1024 * 1024`, and says output beyond `maxBuffer` can terminate/truncate the subprocess, so bumping the buffer for large GraphQL PR-thread payloads is grounded.
>
> The move from inline `gh pr view --jq` fragments to `bun tools/github/poll-pr-gate.ts <PR>` is also aligned with GitHub CLI's actual surface: `gh pr view --json` exposes the fields Otto keeps needing, including `autoMergeRequest`, `mergeCommit`, `mergeStateStatus`, `mergeable`, `reviewDecision`, `statusCheckRollup`, and `updatedAt`.
>
> ## Corrections / hardening
>
> ### 1. v1 needs required-vs-non-required check classification
>
> This is the biggest remaining bug.
>
> The log shows `submit-nuget` failed, Otto recognized it as a known non-required transient flake, but the tool still reported:
>
> ```text
> next=fix-failed-checks
> ```
>
> even while required checks were still running and auto-merge could proceed.
>
> That means `poll-pr-gate.ts` v0 is useful, but **not yet gate-accurate**. It conflates:
>
> ```text
> failed check exists
> ```
>
> with:
>
> ```text
> failed required gate exists
> ```
>
> GitHub CLI already has `gh pr checks --required`, and its JSON includes a `bucket` field grouping checks into pass/fail/pending/skipping/cancel. So v1 should either consume `gh pr checks --required --json ...` or enrich GraphQL/REST data with required-ness.
>
> Correct output shape should separate:
>
> ```json
> {
>   "requiredChecks": { "ok": 22, "pending": 1, "failed": 0 },
>   "nonRequiredChecks": { "failed": ["submit-nuget"] },
>   "nextAction": "wait-ci",
>   "warnings": ["non-required check failed: submit-nuget"]
> }
> ```
>
> Blade:
>
> ```text
> A failed check is not automatically a failed gate.
> ```
>
> ### 2. "Deferred threads are not blocking" was wrong
>
> Otto initially said three style/doc threads were deferred and "not blocking," but the next tick proved required conversation resolution made them blocking. He corrected course and fixed them quickly, which is good, but the lesson should land:
>
> ```text
> If required conversation resolution is enabled, unresolved threads are never "deferred" for merge purposes.
> ```
>
> They can be "low-risk" or "quick-fix," but not "non-blocking." The tool already knew this: it reported `next=resolve-threads`. The human narrative drifted away from the tool.
>
> Correction:
>
> ```text
> Trust the gate tool over the prose summary.
> ```
>
> ### 3. The 10-dot threshold is useful, but should not become "after 10 dots, invent work"
>
> After #921 landed, Otto emitted dots for true empty ticks, then after 10 dots took the small follow-up to make the memory file point at the script. In this specific case, that was fine: the follow-up was already known, small, structural, and closed the script-supersedes-prose loop.
>
> But the rule should be careful:
>
> ```text
> After sustained empty ticks, take the next already-scoped reversible follow-up.
> Do not create new conceptual substrate just because 10 dots happened.
> ```
>
> Otherwise "dot discipline" becomes another never-idle treadmill.
>
> Better:
>
> ```text
> 10 dots may trigger a backlog scan for already-scoped tiny fixes.
> It does not authorize new lanes.
> ```
>
> ### 4. Local preflight for memory edits should run the memory-specific checks, not just markdownlint
>
> PR #922 failed because the memory file was edited without the paired `MEMORY.md` index update, then failed again on duplicate link targets. Otto fixed both, and those CI checks are doing real work.
>
> But this should be local preflight now:
>
> ```text
> When editing memory/*.md:
> - markdownlint
> - paired MEMORY.md check
> - duplicate-link lint
> - reference-existence lint
> - frontmatter parse check
> ```
>
> Markdownlint alone is no longer enough. The loop already knows this; the checks proved it twice in one tiny PR.
>
> ### 5. PR #922's scope creep was small but real
>
> The PR started as "point memory file at script," then also updated `MEMORY.md`, then removed a duplicate link in a neighboring no-copy row. The duplicate-link fix was necessary, but Copilot was right to flag the PR description mismatch.
>
> No huge problem — but the durable lesson is:
>
> ```text
> If CI forces a scope-adjacent cleanup, update the PR description immediately.
> ```
>
> Don't rely on reviewer comments to notice that the PR shape changed.
>
> ### 6. The tool should expose "real gate" vs "diagnostic noise"
>
> Right now `nextAction` has to be one thing. That's too flat. A better report has layers:
>
> ```json
> {
>   "gateAction": "wait-ci",
>   "maintenanceAction": "none",
>   "warnings": ["submit-nuget failed but is non-required"],
>   "reviewAction": "none",
>   "mergeAction": "auto-merge-armed"
> }
> ```
>
> That prevents the misleading state where the tool says `fix-failed-checks` even though the actual merge gate is waiting on required checks.
>
> GitHub's required status-check docs also warn that if a check and a status share the same name and are selected as required, both are required, so v1 should be careful about name collisions and source ambiguity.
>
> ### 7. The "reviewer-as-test-suite" celebration is true but dangerous
>
> Yes, reviewers caught a ton. That's good. But "reviewer-as-test-suite" should not become the model.
>
> Better framing:
>
> ```text
> Reviewers exposed missing fixtures.
> Now those findings must become fixtures.
> ```
>
> For every bug caught in #921, v1 should include a regression fixture:
>
> ```text
> clean auto-merge
> blocked by threads
> closed without merge
> failed non-required check
> failed required check
> stale check
> missing fixture
> huge GraphQL payload / maxBuffer
> ```
>
> Blade:
>
> ```text
> Reviewers found the gaps.
> Fixtures keep them closed.
> ```
>
> ## Verdict
>
> This is **good progress**. The loop is no longer just smart; it is starting to produce tools that make future loops less fragile.
>
> The next hardening target is clear:
>
> ```text
> poll-pr-gate v1 = required-vs-non-required checks + richer action model.
> ```
>
> Best blade:
>
> ```text
> The gate watcher landed.
> Now teach it which checks are actually gates.
> ```

## Integration outcomes

This packet's findings split into three classes per substrate-rate discipline:

**Landed in PR #923 (this v1 hardening PR):**

- Finding #1 (required-vs-non-required check classification) — the load-bearing fix. `gh pr checks --required --json name` integrated into `fetchPR`. New `requiredChecks` summary + `warnings` array. `nextAction` and `classifyGate` now use required-only counts. New regression fixture `non-required-failure-warning.json` locks the behavior in.
- Finding #7 (reviewer findings → fixtures) — partial: the new fixture for the non-required-failure case is the first regression-from-review-finding. Subsequent fixtures for stale-check / huge-payload / missing-fixture are queued under task #355.

**Operational lessons recorded (no code change this round):**

- Finding #2 (deferred-threads-not-blocking-when-conversation-resolution-required) — already-internalized; future prose narrative will respect the tool's signal.
- Finding #3 (10-dot threshold doesn't authorize new lanes) — accepted; PR #922 already followed the already-scoped-follow-up shape Amara endorsed.
- Finding #5 (PR description scope-update on CI-forced cleanup) — accepted as discipline; not a code change.

**Deferred to subsequent rounds (substrate-rate):**

- Finding #4 (local preflight running all memory-specific checks, not just markdownlint) — proper tooling-build job. Composes with task #355 (poll-the-gate matrix coverage) — same shape: small executable script that runs a battery of checks. Candidate task to file.
- Finding #6 (layered action model: gateAction / maintenanceAction / warnings / reviewAction / mergeAction) — bigger API change. The minimal subset (warnings array + required-checks-only nextAction) ships in this PR; full layering deferred until consumers actually need it.

## Composes with

- `tools/github/poll-pr-gate.ts` (the executable being hardened)
- `memory/feedback_amara_poll_gate_not_ending_holding_is_not_status_2026_04_30.md` (the rule whose implementation is being hardened)
- `docs/research/2026-04-30-multi-ai-feedback-packets-this-session.md` (Amara's prior packets in the same session)
- Aaron's substrate-IS-product framing — executable substrate IS substrate-quality work, including iterative review-driven hardening
- Otto-363 substrate-or-it-didn't-happen — packet preserved here so future-Otto reading the v1 commit understands the substrate-shaping context

## Carved blades from this packet

> A failed check is not automatically a failed gate.
> Trust the gate tool over the prose summary.
> Reviewers found the gaps; fixtures keep them closed.
> The gate watcher landed. Now teach it which checks are actually gates.
