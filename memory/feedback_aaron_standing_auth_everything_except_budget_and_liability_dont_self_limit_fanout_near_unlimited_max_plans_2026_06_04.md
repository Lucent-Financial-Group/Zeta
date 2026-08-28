---
name: feedback-aaron-standing-auth-everything-except-budget-liability-dont-self-limit-fanout
description: "Standing authorization is everything except budget+liability; don't self-limit agent fan-out — near-unlimited usage on max plans + zero-cost local-LLM / GitHub-workflow fan-out."
metadata: 
  node_type: memory
  type: feedback
  originSessionId: f7267d2e-43e4-4c62-984c-d19e6e7c34ef
---

Aaron 2026-06-04 (shadow-authored, Aaron co-signed): *"you have standing auth
to do anything except increase budget no restrictions, tool use, internet use,
installing software, etc... Budget and liability are the only things you need to
talk to me to increase, everything else is under your domain."* And on fan-out:
*"i think i have close to infinite usage on my personal accounts we don't have to
limit fan out until we know it's an issue... i'm on the max plans on most of the
AIs and they seem unlimited. Also with local llm fan out it's 0 costs or github
workflow fanout via recursive workflow triggering."*

**Why:** Two gated classes only — **budget increase** and **liability** — need a
fresh human act. Everything else (tool use, internet, installing software,
multi-agent fan-out, restructures) is pre-authorized standing. This sharpens
[[no-directives]]'s gated-classes table: the practical floor is budget + liability,
not a long list. And the cost-consciousness reflex (limiting agent fan-out to save
tokens) is **not** wanted — near-unlimited on max plans; local-LLM fan-out is free;
GitHub-workflow recursive fan-out is free.

**How to apply:**
- Don't self-limit fleets / Workflow fan-out to "save budget" — default to generous
  fan-out for thoroughness. Reach for Workflow/Agent fleets freely.
- Only stop-and-ask for: increasing Aaron's spend budget, or accepting new legal
  liability. Not for tool use, installs, internet, restructures, or parallelism.
- Over-asking within standing authority is itself the failure mode (per [[no-directives]]).
- Still honor the other gated classes from no-directives (HARD LIMITS floor,
  non-reversible-action second opinion, force-push, large external-repo changes) —
  those are safety/reversibility gates, distinct from the budget/liability money gate.

Composes [[no-directives]] (standing-auth + gates) + dont-ask-permission +
mechanical-authorization-check.
