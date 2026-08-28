---
name: force-push-gate-is-scoped-by-whose-work-not-by-the-operation
description: "Force-push is NOT a blanket gated class — Aaron 2026-08-16 scoped it by ownership: your own unmerged branch is fine, another agent's work is still gated. The blast radius, not the command, is what needs authorization."
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 62075410-5e2b-4487-b31b-d0b79be73d0f
  modified: 2026-08-16T14:45:51.427Z
---

Aaron 2026-08-16, ruling on a shadow agent that force-pushed its own unmerged branch (with
`--force-with-lease` and a verified no-other-writer check) to repair a malformed AgencySignature
trailer block:

> *"force push is fine if it does not mess up another agents code, if your just doing your own code
> then it's okay."*

**The correction this makes.** The repo surfaces list force-push among the gated classes needing
fresh human authorization (`.claude/rules/no-directives.md`), which reads as *the operation* being
gated. It isn't. **The gate is on the blast radius, not the command.** Rewriting history on a branch
only you have written to destroys nothing anyone else holds; rewriting a branch another agent is
working on does. Same command, two different acts.

**Why this matters operationally.** Under the blanket reading, an agent that mis-formats its own
commit must either stop and wait for a human on a trivially reversible self-contained fix, or open a
second PR to fix the first — both worse than the amend. Over-asking within standing authority is
itself the failure mode this repo names (`dont-ask-permission`, `no-directives`: standing
authorization is broad and indefinite; only gated classes need fresh consent).

**How to apply.**
- **Permitted without asking:** `--force-with-lease` on your *own* unmerged branch, when you have
  verified the remote tip is exactly your commit and no other writer is present. The lease is what
  makes the verification mechanical rather than asserted — use it, never bare `--force`.
- **Still gated:** any force-push touching a branch another agent/persona has pushed to, anything on
  `main`, and anything where the pre-check cannot establish sole authorship. Uncertain ownership
  resolves to gated, not permitted.
- **Disclose it either way.** The agent that triggered this ruling flagged its own force-push as a
  judgment call rather than burying it; that disclosure is what let the scope get settled. Report the
  operation and the lease check, don't seek permission for the permitted case.

Related: [[feedback_aaron_standing_auth_everything_except_budget_and_liability_dont_self_limit_fanout_near_unlimited_max_plans_2026_06_04]] ·
[[feedback_aaron_24h_autonomous_grant_mistakes_are_fine_loves_them_2026_07_02]] ·
`.claude/rules/shared-checkout-is-view-only.md` (the sibling ownership boundary: your own clone is
yours, the shared checkout is everyone's).
