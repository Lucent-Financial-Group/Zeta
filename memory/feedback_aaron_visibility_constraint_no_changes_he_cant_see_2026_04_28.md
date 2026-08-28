---
name: Aaron visibility constraint — don't change shared-production things he can't see (Aaron 2026-04-28)
description: Aaron 2026-04-28 binding directive — *"i don't like things changing without me being able to see them"* + *"i want to see it for my own reasons."* Triggered when Otto disabled default Code Scanning via API; the disable was within Otto's authority and matched Aaron's request, but Aaron's repo-level UI doesn't show org-level-managed code-security state, so he couldn't visually verify the change. Defines a visibility-first discipline that cuts across all autonomous shared-state changes.
type: feedback
originSessionId: 1937bff2-017c-40b3-adc3-f4e226801a3d
---
# Visibility constraint — don't change what Aaron can't see

## Rule (binding 2026-04-28)

When Otto takes an action that changes **shared production state**
(repo settings, branch protection, rulesets, workflows, org
config, GitHub Apps, etc.):

1. **Verify Aaron can SEE the change in a UI** before/after
   taking it.
2. If the change isn't visible in any UI Aaron has access to,
   **STOP and ask before taking it**, OR provide a verification
   path he can use independently (API command + expected output).
3. *"It's reversible"* and *"the API works"* are NOT substitutes
   for visibility. Aaron's ability to audit the state himself is
   the constraint.

## Why

**Aaron 2026-04-28 verbatim:**

> "i want to see it for my own reasons"
>
> "i don't like things changing without me being able to see them"

Triggered by Otto's repo-level disable of GitHub Default Code
Scanning. Aaron asked Otto to disable; Otto did it via API
(`gh api -X PATCH repos/.../code-scanning/default-setup -f state=not-configured`).
The change worked. But Aaron's **repo-level UI** for code-scanning
was hidden (because org-level configurations take precedence in
the rendering). Aaron couldn't see his own repo's state in the
place he expected to look.

The friction wasn't about the API call; it was about **shared
state changing in a place Aaron couldn't visually audit.** That's
a trust violation, even when the change matches his explicit ask.

## How to apply

Before any shared-production-state change, ask:

1. **Will Aaron see this change?** In what UI? Which page?
2. **If the UI is org-level, repo-level, or hidden by policy
   inheritance**, can Aaron still navigate to a place where the
   change is visible?
3. **If no UI surfaces the change**, give Aaron the API command
   to verify independently, or stop and ask first.

Specific surfaces and their visibility-rules:

- **Repo Settings** (Settings → Security/Code/etc.): repo
  Settings UI; org-policy-managed surfaces may be hidden at repo
  level — surface the org-level URL alongside.
- **Branch protection** (`/branches/main/protection`): visible
  in repo Settings → Branches.
- **Rulesets** (rulesets API): visible in repo Settings → Rules.
- **Workflows enable/disable** (`gh workflow enable/disable`):
  visible in Actions tab → workflow → state badge.
- **Org Code Security configurations**: org Settings →
  Code security & analysis → Code security configurations.
  Aaron has access at org level.
- **Default Code Scanning** (`code-scanning/default-setup`):
  hidden at repo level when org config is present; visible at
  org level via the configurations page.

## Composes with

- Glass Halo radical-honesty / total-visibility principle —
  this constraint operationalizes Glass Halo for autonomous
  shared-state changes.
- Aaron's branch-protection-settings-are-agent-call delegation
  — delegation is conditioned on visibility, not unconditional.
- Otto-340 substrate-IS-identity — when Aaron can't see the
  substrate change, the substrate is *less* under his
  governance, not more.

## What this does NOT change

- Otto retains authority on shared-production-state changes per
  prior delegations. The constraint is a *visibility wrapper*
  on existing authority, not a withdrawal of it.
- Per-user files (user-scope memory, local config, etc.) are
  not shared-production-state — this rule doesn't apply there.
- API verification commands provided to Aaron are an acceptable
  visibility-substitute when no UI exists.

## Scope — LFG org ONLY (Aaron 2026-04-28)

Aaron's org-admin delegation explicitly scoped to
**Lucent-Financial-Group org only**, not any other orgs he has
access to. Aaron 2026-04-28 verbatim:

> "only for lfg, not any others"
>
> "org scope"
>
> "i have access to a few orgs"

Otto's authority on org-level Code Security configurations,
repository Code Security attachments, and similar org-scoped
settings extends ONLY to:

- `Lucent-Financial-Group` org
- Repos under `Lucent-Financial-Group/*`

Otto does NOT have authority on:

- Aaron's personal `AceHack` account org-level (separate; the
  `AceHack` namespace is the dev-mirror fork user, not an org)
- Any other orgs Aaron belongs to (unspecified; treat as
  out-of-scope by default)
- Any settings that would propagate beyond LFG

If Otto encounters work that would touch org-level outside LFG,
STOP and surface to Aaron — even if the change appears beneficial.
The scope is binding, not best-effort.

## Pre-mortem signature for next time

If next-Otto thinks "this is reversible, no need to surface
the visibility path" — THAT is the failure mode. Reversibility
is necessary but NOT sufficient. Aaron's *visual audit ability*
is the load-bearing constraint.
