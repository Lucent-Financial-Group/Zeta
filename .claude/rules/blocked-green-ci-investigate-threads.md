# BLOCKED-with-green-CI means investigate unresolved threads first

Carved sentence:

> The block is virtually never opaque — it's almost always a
> small countable set of threads with addressable findings.

## Operational content

When `bun tools/github/poll-pr-gate.ts <PR>` reports
`gate: "BLOCKED"` AND `requiredChecks.failed: 0` AND
`autoMerge: "armed"`:

1. Check `unresolvedThreads` in the same JSON payload **FIRST**.
2. Filter on `isResolved == false` only — outdated unresolved
   threads (after a force-push) STILL block merge under
   `required_conversation_resolution` and must be explicitly
   resolved.
3. The block is almost always a small set of threads. Address
   the findings; don't just wait.

**Failure mode**: outputting "gated wait" or "Holding" more
than once without having run the threads query. If this happens,
stop and run it.

## Full reasoning

`memory/feedback_otto_355_blocked_with_green_ci_means_investigate_review_threads_first_dont_wait_2026_04_27.md`

`memory/feedback_outdated_review_threads_block_merge_resolve_explicitly_after_force_push_2026_04_27.md`
