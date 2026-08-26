---
id: 081M107N9PZ087G0R0006X16SJ
type: task
state: backlog
priority: P1
slug: harny-closed-tools-are-du-aware-actiongrid-verbs-that-auto-r
title: "Harny closed tools are DU-aware ActionGrid verbs that auto-refresh, not ad-hoc agent poll"
created: 2026-08-26T23:49:35.071Z
depends_on: ["081M100RH3Q087G0R0018X4RSJ"]
composes_with: ["081M107N9P4087G0R0002G5SR0", "081M100RH30087G0R003YXHQ12"]
---

# Harny closed tools are DU-aware ActionGrid verbs that auto-refresh, not ad-hoc agent poll

Ad-hoc tools (`gh pr checks`, `git status`, "search the repo") are
how an agent burns quota and still works on a stale world: **refresh
is a choice**. Closed tools should be **context/DU-aware commands**:
the verb *is* the observation of the current discriminated state, so
the agent cannot skip the refresh.

The grammar is the Xbox-controller 4×4 (`ActionGrid.fs`): layout
fixed, labels per-context. Same controller for human and agent
(`.claude/rules` xbox-controller-universal-action-grammar). Harny
binds those cells to Ace/Zeta/ForgeHost verbs (`observeMerge` is the
forge cell).

## Must

- Tool list is a DU of verbs, not a bag of strings the model invents.
- Each verb returns the current state (or a refusal), never "maybe poll".
- Controller grammar (`ControlScheme.Action`) owns meanings; Harny is
  one *scheme* mapping into it, not a second grammar.

## Pointers

- `src/Core/ActionGrid.fs`
- `docs/research/2026-06-07-universal-action-grammar-xbox-controller-*`
- `src/Core.TypeScript/forge-host/github/github-merge-observe.ts`
