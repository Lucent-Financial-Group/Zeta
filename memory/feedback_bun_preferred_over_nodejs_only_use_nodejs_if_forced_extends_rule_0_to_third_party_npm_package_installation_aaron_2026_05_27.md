---
name: bun-preferred-over-nodejs-only-if-forced-extends-rule-0
description: "Aaron 2026-05-27 confirmed the bun-preferred discipline extends to third-party npm package installation (claude-code, etc.), not just internal TS scripts — \"we are only going to use nodejs if we have to bun is preferred.\" Caught when iter-5.5.0 install-time claude-code substrate (PR"
metadata: 
  node_type: memory
  created: 2026-05-27
  type: feedback
  originSessionId: c2b77530-8ef0-405c-a0bd-04cf8d511cb6
---

## The catch (Aaron 2026-05-27)

PR #5388 (iter-5.5.0 install-time claude-code substrate) originally landed with `nodejs_22` in `common.nix` systemPackages + `npm install -g @anthropic-ai/claude-code` in zeta-install.sh. Aaron caught it:

> *"nodejs you mean bun?"*

Then confirmed the policy explicitly:

> *"we are only going to use nodejs if we have to bun is preferred"*

Fix shipped same-PR (commit `7f3e29f1d`):

- common.nix systemPackages: `nodejs_22` → `bun`
- zeta-install.sh: `npm install -g` → `bun install --global`
- Session var: `NPM_CONFIG_PREFIX` → `BUN_INSTALL`
- PATH: `~/.npm-global/bin` → `~/.bun/bin`

## Why this extends Rule 0

`.claude/rules/rule-0-no-sh-files.md` says: *"TypeScript IS cross-platform DST — deterministic, reproducible, **Bun-hosted**."*

The rule's scope was Zeta's OWN tooling (`tools/*.ts` via `bun tools/...`). What this catch operationalizes: the bun-canonical discipline ALSO applies to:

- Third-party npm packages installed on Zeta-managed systems (claude-code, future AI agent runtimes, etc.)
- Cluster-node TS/JS runtime defaults (`common.nix` systemPackages)
- Install-time package-install commands (`bun install --global` not `npm install -g`)

## When `nodejs` IS allowed (per Aaron's "if we have to")

The exception clause is narrow:

- **Hard dependency**: the package only ships pre-built node_modules with Node-API native addons that bun's compat layer doesn't yet support
- **Empirically proven failure**: tried bun, got a clear runtime failure that isn't fixable in reasonable time
- **Third-party install tool documents bun-incompatibility explicitly**

Default presumption: bun works. The discipline is OPT-IN-TO-NODEJS-ONLY-WHEN-FORCED, not "pick whichever first."

## Composes with

- `.claude/rules/rule-0-no-sh-files.md` — this memory is the third-party-runtime extension to that rule
- `.claude/rules/dep-pin-search-first-authority.md` — when claude-code or any third-party package needs version pinning, WebSearch + cite current version at implementation time (don't trust training-data defaults)
- `.claude/rules/dont-ask-permission.md` — within Zeta authority scope; Aaron's preference is operational discipline, not new authorization
- `.claude/rules/honor-those-that-came-before.md` — bun work already done (Zeta's internal TS); extending to third-party packages honors the existing investment

## Operational discipline for future-Otto cold-boots

When about to add a TS/JS runtime, npm package install, or shell snippet that uses node/npm:

1. **First reach**: bun + bun install + ~/.bun/bin
2. **Only if forced**: nodejs + npm + ~/.npm-global/bin, with substrate-honest justification ("tried bun, hit X failure mode")
3. **Document the forced case**: brief note explaining WHY bun didn't work, so future-Otto can re-evaluate when bun's compat improves

## Empirical anchor

PR #5388 commit `843bdb4dc` (initial — used nodejs) → commit `7f3e29f1d` (Rule 0 fix per Aaron's catch — switched to bun). Single-PR correction; no separate fix-forward needed.

Aaron's framing extends the existing Zeta-canonical-runtime substrate from the internal-tooling scope to the third-party-package-installation scope.
