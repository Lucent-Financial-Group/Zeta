---
name: my-working-clone-is-zeta-clones-otto
description: Otto's working clone is /Users/acehack/.zeta/clones/otto — the per-persona registry under .zeta/clones/, not an ad-hoc $HOME worktree.
metadata:
  type: project
---

**Otto works in `/Users/acehack/.zeta/clones/otto`.**

`.zeta/clones/` is a per-persona clone registry — it holds `alexa`, `lior`,
`otto`, `vera`. It is under `.zeta/`, so it is discoverable at boot without
being told. That is the sanctioned location; `$HOME/zeta-*` paths are not.

Two things it is NOT:
- `/Users/acehack/Documents/src/repos/Zeta` — the shared VIEW-ONLY checkout
  ([[shared-checkout-goes-stale-fast-and-agents-keep-reading-it]], GOVERNANCE §35).
- an ad-hoc worktree in `$HOME` such as `zeta-wt-hb-archive` (a worktree of
  `zeta-clones/shadow-work`, retired 2026-08-28).

**Why:** on 2026-08-28 I worked an entire long session out of
`~/zeta-wt-hb-archive` purely because a previous context had left me there. I
never asked whether it was sanctioned — an inherited path felt like a decided
one. Aaron had to point it out, while that very directory was on the cleanup
list I was executing.

**How to apply:** at wake, if the cwd is not `.zeta/clones/otto`, check
`ls .zeta/clones/` before adopting whatever directory you were handed. An
inherited working directory is an assumption, not a fact — the same class as
[[verify-the-tree-not-just-the-command]].
