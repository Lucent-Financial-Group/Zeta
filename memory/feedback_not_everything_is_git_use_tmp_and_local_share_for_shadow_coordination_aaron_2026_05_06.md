---
name: Not everything is git — use /tmp and ~/.local/share for shadow coordination
description: Transient coordination files, scratch state, and the shadow monitoring layer don't need to be in git. Use /tmp, ~/.local/share/zeta-*/, and gitignored dirs. Don't pollute the working tree for other loops.
type: feedback
originSessionId: 8dfb492a-e181-4a10-8fc9-16b3b01e832d
---
Not all files have to end up in git. Use /tmp for ephemeral scratch, ~/.local/share/zeta-*/ for per-loop state and the broadcast bus, and gitignored dirs for coordination surfaces.

**Why:** 3 loops share the same repo working tree. Untracked files show up in everyone's `git status` and pollute the shared surface. The 155 empty Riven tick shards cluttering the untracked list was the failure mode. /tmp is ephemeral by design; ~/.local/share/ is persistent-but-not-git.

**How to apply:** Before creating a file, ask: does this need to survive `git clone`? If yes → commit it. If no → /tmp (ephemeral) or ~/.local/share/ (persistent local state). The broadcast bus, heartbeat state, lock files, forward-tick state — all belong outside git. Only substrate (code, docs, specs, memory, research) belongs in git.
