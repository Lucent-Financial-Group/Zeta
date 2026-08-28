---
name: Reply + resolve on a review thread is ALWAYS a pair — never leave a thread unresolved as a "breadcrumb" because `required_conversation_resolution` branch-protection blocks the PR merge; if a thread needs deferral, resolve with a BACKLOG row reference or disposition explanation; Aaron Otto-236 "i'm still just seeing Merging is blocked / All comments must be resolved"; 2026-04-24
description: Aaron Otto-236 showed me PR #354 had been stuck for hours because I (and my drain-subagents) had used a "breadcrumb" pattern — reply to a thread with acknowledgment but intentionally leave it unresolved "for visibility." That pattern is incompatible with the `required_conversation_resolution: true` branch-protection rule: every unresolved thread blocks the merge. The fix is to ALWAYS resolve every thread I reply to, even if the disposition is "declined" or "deferred to Phase 2" or "addressed via different mechanism." The rationale for deferral goes IN the reply text, and then the thread is resolved.
type: feedback
originSessionId: 1937bff2-017c-40b3-adc3-f4e226801a3d
---

## The rule

**Reply + resolve is a pair. Never leave a reviewed thread
unresolved because "disposition recorded as a breadcrumb."**
The branch-protection `required_conversation_resolution: true`
rule means any unresolved thread — including ones I've
thoughtfully replied to — blocks the merge.

Direct Aaron quote (paraphrased from shared screenshot):

> *"i'm still just seeing Merging is blocked / All comments
> must be resolved"*

showing PR #354 stuck with several threads where my subagent-
or-self replies said things like:

> *"keeping this thread unresolved as a visible breadcrumb
> until Phase 2 ships"*
>
> *"Leaving this thread unresolved as a breadcrumb for
> 'reviewer intent honored via different mechanism than
> suggested'"*

Those replies were thoughtful but operationally wrong — they
kept the PR blocked.

## Every thread ends in `isResolved: true`

For any thread I touch, the closing action is:

```
gh api graphql -f query='mutation($tid:ID!){
  resolveReviewThread(input:{threadId:$tid}){
    thread{isResolved}
  }
}' -F tid="$THREAD_ID" --jq '.data.resolveReviewThread.thread.isResolved'
```

Expected response: `true`. If the response is `false` or the
mutation errors, something is wrong (permission / already-closed
PR / thread already resolved by someone else). Never stop at
`addPullRequestReviewThreadReply` — that's only half the pair.

## Three-outcome model × resolve-always

The three-outcome model (Otto-226 / Otto-227) produces three
different *reply content shapes*; all three end in `resolve`:

1. **Fix in place** — reply: "Fixed in <SHA>. <explanation>."
   → resolve.
2. **Narrow fix + BACKLOG row** — reply: "Narrow fix in <SHA>;
   deeper cleanup tracked in BACKLOG row <link>." → resolve.
3. **Backlog only + resolve** — reply: "Proper solution
   backlogged as <link>; resolving this thread." → resolve.

There is NO fourth outcome "leave unresolved for visibility."
The visibility is the REPLY TEXT; the resolution state is for
merge-gate plumbing.

## When a thread's content genuinely should not be "fixed"

Examples from this session:

- **Reviewer's factual error** (e.g. "double-pipe tables" that
  were actually single-pipe in the source). Reply: "Verified —
  file bytes show single-pipe, not double-pipe. No edit
  needed." → resolve.
- **Discipline-carve-out decline** (e.g. name-attribution in
  an audit-trail file that has an Otto-229+Otto-231 carve-out).
  Reply: "History files carry direct name attribution by
  design per Otto-229 audit-trail immutability + Otto-231
  first-party carve-out. No edit." → resolve.
- **Deferred to a future PR** (e.g. second-factor bypass
  hardening for a one-time migration escape hatch). Reply:
  "Acknowledged. Deferred to Phase 2 content-migration PR per
  [specific criterion]. BACKLOG row filed at <link>." →
  resolve.

All three resolve. The rationale lives in the reply text.

## Breadcrumb-as-reply text vs breadcrumb-as-unresolved-state

The "breadcrumb" metaphor is fine as REPLY CONTENT. It's
wrong as a RESOLUTION STATE. The git-native preservation
tool (`tools/pr-preservation/archive-pr.sh`) captures the
full thread including reply text; the resolution state has
no bearing on what the archive preserves. So the audit trail
survives either way — but the merge gate only unblocks when
threads are resolved.

## Subagent-dispatch prompt change

All future drain-subagent dispatch prompts must carry the
explicit instruction:

> **EVERY thread must end in `isResolved: true`.** No
> breadcrumbs. No deferrals-without-resolution. If the
> disposition is "decline / defer / backlog", the reply
> text captures the rationale AND the resolve mutation
> fires. Verify with GraphQL that `isResolved: true` after
> your mutation.

## Audit for existing "breadcrumb" damage

A sweep across open PRs for the "reply exists but
isResolved=false" pattern will identify stuck PRs. Formula:

```
for each open PR:
  threads = fetch unresolved with comments
  for each thread:
    if lastAuthor == "AceHack" (me):
      candidate for resolve — reply already exists
      apply resolveReviewThread mutation
```

This unblocks PRs that were only stuck because of the
misapplied breadcrumb pattern.

## Composition with prior memory

- **Otto-226 parallel subagent drain** — dispatch prompts now
  carry the explicit "end in resolved" constraint.
- **Otto-227 three-outcome model** — the model still holds;
  this memory adds that all three outcomes end in resolve.
- **Otto-228 three-axis drain loop** — the third axis (no
  DIRTY) stays; this memory hardens the threads axis
  (resolved count, not just reply count, is what matters
  for merge-gate).
- **Otto-229 append-only audit trail** — orthogonal; applies
  to FILE content, not to review-thread-resolution state.
- **Otto-231 glass-halo PII carve-out** — the carve-out is
  applied in the reply TEXT; thread still resolves.

## What this memory does NOT authorize

- Does NOT authorize relaxing `required_conversation_resolution`
  to work around the pattern. The rule itself is good (forces
  disposition per thread); my application of "breadcrumb =
  unresolved" was the bug.
- Does NOT authorize resolving threads without reading them
  first. Each thread needs a disposition that fits its
  finding — blind-resolving is worse than unresolved.
- Does NOT authorize resolving someone else's thread reply
  (e.g. Aaron's direct review comment) without his consent.
  Reviewer-authored threads that Aaron himself has replied to
  are his to resolve.

## Direct Aaron quote to preserve

> *"i'm still just seeing Merging is blocked / All comments
> must be resolved."*

Future Otto: every thread reply pairs with a resolve. No
breadcrumbs. Disposition rationale goes in the reply text
and the resolve mutation fires. Audit for
reply-but-not-resolved state as a named failure mode.
