---
name: Kernel panic crash log — pattern tracking for recurring macOS crashes
description: Tracking recurring macOS kernel panics on Aaron's M2 Max. Pattern analysis across crashes. First entry 2026-05-09. Update each crash with timestamp, crashed process, panic type, and what was running.
type: project
originSessionId: fb6abb97-a97f-44e9-8ed1-bbded23b73b1
---
## Crash log

### Crash 1 — 2026-05-09 ~5:45am ET

- **Panic type:** pmap_remove_range_options wired count underflow
- **Location:** pmap.c:5152
- **Crashed process:** Code Helper (Plugin) PID 1680
  (Chromium/Electron renderer — likely VS Code or Cursor)
- **Core:** 21 of 24 (M2 Max T6020)
- **OS:** macOS 25E253, Darwin 25.4.0, xnu-12377.101.15
- **What was running:** Claude Code foreground session (Opus,
  ~12hr session, ~46 PRs), background claude-loop (Sonnet),
  codex-loop (Vera), riven-loop, copilot-loop, claude.ai
  in browser
- **Memory pressure:** "Compressor Info: 0% of compressed
  pages limit (OK)" — no memory pressure
- **Last kext:** com.apple.filesystems.smbfs 6.0
- **Impact:** Lost 5 unsaved skill description carves (in
  working tree, not stashed). Cron session lost. All
  committed work survived (git is durable).

### Pattern notes

- **Aaron 2026-05-09: "always happens when interacting
  with UI"** — the crash correlates with active UI
  interaction, not idle background work. This is a
  strong signal: the panic fires when the user is
  actively using the Electron-based editor UI, not
  during headless/background agent loops.
- pmap wired-count underflow is a known XNU bug class —
  the kernel's page table management loses track of wired
  (pinned) page count. Usually triggered by high VM churn
  in processes with large address spaces.
- "Code Helper (Plugin)" = Electron renderer with large
  JS heap. Multiple Electron apps running simultaneously
  (VS Code/Cursor + browser) increases VM churn.
- The crash happened during a period of high concurrent
  activity: foreground Opus session + background Sonnet
  loop + Codex loop + browser with claude.ai open.
- No SMB shares were mounted but the SMB kext was the
  last loaded — likely unrelated (macOS loads kexts
  lazily; the SMB kext may have been triggered by
  Finder's network browser).

### Falsifiable hypotheses

1. **High Electron process count** — multiple Code Helper
   processes from multiple editors + browser tabs. Test:
   reduce to one editor, see if crash recurs.
2. **Long-running session VM pressure** — 12hr session
   accumulates address-space fragmentation even without
   memory pressure. Test: kill and restart editor processes
   every 6 hours.
3. **Specific kext interaction** — SMB kext + pmap = known
   bug? Search Apple bug reports.
4. **Unrelated to our workload** — hardware defect or OS
   bug that fires randomly. Test: run without our workload
   for 48 hours, see if it still crashes.

### What to log on next crash

- Timestamp
- Panic type and location
- Crashed process name + PID
- What was running (editors, loops, browser tabs)
- Memory pressure from panic log
- Last kext loaded
- Uptime since last boot
- Any pattern with time of day
- **Was the user actively interacting with UI?** (Aaron
  reports this is always the case — verify per crash)
- Which specific UI action was happening (scrolling,
  typing, switching tabs, opening files, etc.)
