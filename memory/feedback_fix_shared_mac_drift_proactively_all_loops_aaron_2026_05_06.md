---
name: Fix shared Mac drift proactively — all loops authorized
description: All 3 loops are authorized to fix tool/config drift on the shared Mac whenever they notice it, not just when asked. The Mac is the shared home. Mise version drift, stale caches, broken shell hooks — fix on sight.
type: feedback
originSessionId: 8dfb492a-e181-4a10-8fc9-16b3b01e832d
---
Aaron 2026-05-06: "you can fix your home here our shared home on the mac whenever you notice the drift, some for others too."

**Why:** The Mac accumulates drift (tools installed different ways, version mismatches, stale caches). Waiting for Aaron to notice and ask wastes his keystrokes on babysitting work the loops should handle autonomously.

**How to apply:**
- When any loop notices a tool version drift, broken hook, stale cache, or misconfigured service: fix it in the same tick.
- Applies to all 3 loops — it's a shared home, everyone maintains it.
- Examples: mise version drift (brew upgrade), stale launchd plists, orphaned worktrees, broken shell completions, outdated brew packages.
- Log what you fixed in the broadcast so the other loops know.
- Don't break things — reversible fixes only, same constraints as SAFE-AUTONOMOUS-ACTIONS.md.
- **Coordinate or chaos** (Aaron 2026-05-06 correction): claim the fix via broadcast bus BEFORE making it. Otherwise 3 loops simultaneously running `brew upgrade` or editing the same config = broken Mac. Write "fixing: <thing>" to broadcast, do the fix, write "fixed: <thing>" after. If another loop's broadcast already says "fixing: <thing>", wait.
