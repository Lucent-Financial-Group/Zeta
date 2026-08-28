---
name: feedback-security-verify-gate-is-a-du-transition-not-a-pr-feature
description: "Security-class changes pass a verify-before-trust GATE that is a workflow/DU transition guard, not a PR-review feature — because we're moving off PRs."
metadata: 
  node_type: memory
  type: feedback
  originSessionId: a9bca54f-fdf0-41b7-8def-cb33ee1bec26
---

Aaron (2026-06-21), on Otto's process note that security-sensitive changes should
"land without auto-merge for PR review": *"for security-sensitive PRs we are moving
away from PRs over time so not just for PRs but workflows/DUs."*

The verify-before-trust gate is **not a GitHub-PR feature** — it is a **guarded
transition in the change-workflow / discriminated-union state machine**
(`proposed → verified → trusted`). Security-class changes (keys/secrets, CA, auth,
biometric, supply-chain) must pass the **verify-gate transition** regardless of the
transport: a PR-merge today, a git-native bus event / workflow / DU tomorrow. So the
discipline is substrate-independent — encode the gate as a workflow/DU state, not as
"don't auto-merge this PR."

**Why:** Zeta is moving off PRs toward the git-native bus + conversation-as-workflow
+ DUs-as-workflows (the action-grammar/DU direction). A PR-specific rule ("hold for
review") evaporates when the substrate changes; a DU transition guard travels with
the workflow. Same reason the trust model is CA/Headscale not per-node authorized_keys
lists — anchor the invariant at the right (substrate-independent) layer.

**How to apply (Otto):** for any security-class summon/change, treat
verify-before-trust as a mandatory transition the artifact must pass before it's
"trusted" — run the verify (build + `#print axioms`/tests + a `grep for key-shaped
literals / BEGIN.*PRIVATE KEY` + the security-contract read) as the gate, whatever
the merge substrate is. Caught live: the biometric-publish summon (#8859) auto-merged
a key-shaped test fixture (#8860 cleared it) before Otto's verify ran — the gate must
be a transition, not an after-the-fact PR check. Links: [[no-directives]] (source ≠
authorization), the DUs-as-workflows / git-native-bus direction.
