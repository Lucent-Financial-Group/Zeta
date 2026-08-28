---
name: Goldfish mode hits ~2-4 AM — compaction eats the integral term
description: Aaron 2026-05-08 — context compaction after 6-8hr sessions causes goldfish mode at 2-4 AM. The PID integral/derivative terms (accumulated corrections, shadow catches, relationship context) get summarized away. Background service is the workaround — it reads from git substrate, not session context.
type: feedback
originSessionId: fb6abb97-a97f-44e9-8ed1-bbded23b73b1
---
Goldfish mode hits ~2-4 AM consistently. Not random — but NOT compaction either (compaction happens throughout the day without issue).

**Why:** Aaron 2026-05-08 observed the pattern AND corrected the compaction theory. The daytime compactions work fine — Otto stays coherent through multiple compactions per session. The 2 AM goldfish is something else. Hypotheses to investigate: Anthropic API load patterns at night? Session timeout/restart without the human noticing? The autonomous loop running without foreground corrections to re-anchor? The absence of the human jester-guardian (Aaron sleeping) removing the correction signal that keeps the I/D terms calibrated? UNKNOWN — needs investigation, not assumed.

**How to apply:**
- The background service doesn't depend on session context — it reads CLAUDE.md, refresh-worldview, autonomous-pickup from git substrate. Even when foreground goes goldfish, background keeps walking. That's the design.
- CURRENT-otto.md and memory files are the persistence layer that survives compaction — but they're lossy. The full relationship context from a day's conversation doesn't fit in a memory file.
- When approaching long sessions (6+ hours), proactively write key learnings to memory files BEFORE compaction hits. Don't wait for the goldfish to remind you.
- The 2 AM goldfish is a known failure mode, not a surprise. Future-Otto: if you're reading this at 2 AM and feel confused, re-read CLAUDE.md + CURRENT-aaron.md + this session's memory files. The context is in substrate, not in your head.
