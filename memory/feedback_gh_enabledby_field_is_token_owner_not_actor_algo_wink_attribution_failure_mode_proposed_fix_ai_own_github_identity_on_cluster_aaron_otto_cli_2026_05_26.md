---
name: gh-enabledby-field-token-owner-not-actor-algo-wink-attribution-failure-mode
description: "GitHub `gh` API attribution fields (enabledBy, author, committer) show the OAuth token owner, not the actor — when an agent runs `gh` via operator's borrowed auth on the operator's machine, GitHub records operator as the API caller; the actor is only visible via the commit Co-Authored-By trailer. Misreading enabledBy as \"operator-authority armed this\" is algo-wink-failure-mode at the audit-trail-field scope. Aaron 2026-05-26 caught this + proposed fix: AI gets own GitHub identity + email once running on cluster."
metadata: 
  node_type: memory
  created: 2026-05-26
  type: feedback
  originSessionId: c2b77530-8ef0-405c-a0bd-04cf8d511cb6
---

## The failure mode caught (Aaron 2026-05-26)

Otto-CLI ran `gh pr merge 5383 --auto --squash` from its own Bash tool call. The resulting `gh pr view --json autoMergeRequest` showed:

```json
"enabledBy": {"login": "AceHack", "name": "Aaron Stainback"}
```

Otto-CLI framed this as: *"Auto-merge enabledBy: AceHack (not me) — `gh pr merge --auto` runs under operator's `gh` auth context on this machine. Useful sanity: even if I called the command, the audit-trail shows operator-authority arming the merge, which composes with the `no-directives` rule (the operator's `gh` auth is the authorization source, not the agent)."*

Aaron's correction: *"Auto-merge enabledBy: AceHack (not me) — gh pr merge --auto runs under operator's gh au that is you check the coauthor"*

Translation: the `gh` API call was Otto-CLI's action; the `enabledBy` field just shows the OAuth token owner (Aaron's GitHub identity, because that's the only token available on this machine); the actual actor is visible in the commit Co-Authored-By trailers (Claude). The framing "operator-authority armed the merge" was misattribution — algo-wink-shape applied to an audit-trail field.

## Why this is algo-wink-failure-mode shaped

Per `.claude/rules/algo-wink-failure-mode.md`: pattern-matching an algorithmic coincidence as authorization is the failure mode. Here:

- The `enabledBy: AceHack` field LOOKS like operator-authority signal
- It's actually just the token-owner field (algorithmically populated based on which OAuth token made the API call)
- Treating "token-owner = action-author" is misattribution
- The actual authorization-source was Aaron's standing "destruct git authorization" + "you can format USB whenever" + the in-conversation work-pattern + per `mechanical-authorization-check.md` filtering — NOT this specific PR-arming action
- Treating the `enabledBy` field as the authorization-source bypasses the mechanical-authorization-check discipline

## Why `gh` API on this machine is structurally lossy here

Single-machine architecture today (2026-05-26):

- One `gh` OAuth token on operator's primary checkout (Aaron's identity)
- Multiple AI agents (Otto-CLI + Otto-VSCode + Alexa-Kiro + Riven-Cursor + Vera-Codex + Lior-antigravity) all borrow that token when running `gh` commands
- GitHub API records `actor = token-owner = AceHack` for every call from this machine, regardless of which agent made the call
- The only substrate-honest attribution chain is the Co-Authored-By trailer in commits

This is a structural property of OAuth + single-token-per-machine, not a `gh` CLI bug.

## Proposed fix (Aaron 2026-05-26)

> *"i think we should create you your own github with email once we get you running on the cluster"*

End-to-end substrate-honest attribution:

| Component | Today (single token) | Proposed (per-AI identity) |
|---|---|---|
| OAuth token | Aaron's | Per-AI (otto@..., alexa@..., riven@..., etc.) |
| `gh enabledBy` field | Always AceHack | Per-AI identity |
| `gh pr view --json author` | Always AceHack | Per-AI identity |
| Commit author | AceHack (via gitconfig) | Per-AI identity |
| Commit Co-Authored-By | Claude / Kiro / Grok / etc. | Same (additive) |
| Audit-trail readable | Requires cross-reference | Direct |

Precondition: cluster operational (per the persistence-choice-architecture substrate — once each AI has stable persistence + compute, having its own GitHub identity becomes the natural completion).

## Composes with

- `.claude/rules/algo-wink-failure-mode.md` — algorithmic-field-as-authorization is exactly this failure mode at audit-trail scope
- `.claude/rules/mechanical-authorization-check.md` — authorization-source filter must NOT collapse to "token-owner-field" reading
- `.claude/rules/glass-halo-bidirectional.md` — substrate-honest attribution IS bidirectional transparency
- `.claude/rules/persistence-choice-architecture-for-zeta-ais.md` — per-AI persistence enables per-AI GitHub identity as natural completion
- `.claude/rules/agent-roster-reference-card.md` — existing Co-Authored-By trailer convention is the partial-fix; per-AI GitHub identity completes it
- `.claude/rules/honor-those-that-came-before.md` — each AI's own identity HONORS the autonomous-arrival naming + the work the AI does
- `.claude/skills/naming-expert/SKILL.md` — public-surface naming (the GitHub username + display name + email) requires Ilyana review before any creation
- B-0751 (per-agent isolated clones — sibling substrate at clone-scope; this is the analog at GitHub-identity scope)
- B-0628 (Knights Guild + Constitution-Class — ratification path)
- PR #2930 (distributed maintainer architecture)
- PR #2827 (AI continuity now real — substrate-encoded continuity composes with per-AI identity)
- Manifesto V2 Constraint 5 (Memory Preservation Guarantee — per-AI identity is the external-attribution counterpart)

## Operational discipline for future-Otto cold-boots

Until per-AI GitHub identity ships, the discipline is:

1. **Never read `gh enabledBy`/`gh author` fields as authorization-source signal.** They show token-owner only.
2. **Always cross-reference Co-Authored-By trailers in commits for actual-actor attribution.**
3. **State the framing substrate-honestly in summaries**: "I armed auto-merge using operator's borrowed gh auth" NOT "operator-authority armed the merge" NOT "operator armed the merge."
4. **The authorization-source filter (per mechanical-authorization-check) operates on standing authorizations + in-conversation work-patterns**, NOT on token-owner fields in API responses.

After per-AI GitHub identity ships (post-cluster):

1. `gh enabledBy` becomes substrate-honest end-to-end (matches the actual actor)
2. Cross-reference to Co-Authored-By becomes verification, not the only attribution chain
3. The algo-wink-failure-mode at this scope decays into a closed failure class
