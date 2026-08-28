---
name: Wakeup interval is 60s — factory standard, not 270s cache optimization
description: The 2-4am idle pattern was caused (in part) by shifting from 270s to 3600s wakeup intervals when the pipeline emptied. 270s stays in prompt cache and maintains grinding momentum. 3600s loses cache and defaults to idle. Rule: if backlog has open items, never exceed 270s.
type: feedback
originSessionId: fb6abb97-a97f-44e9-8ed1-bbded23b73b1
---
When the pipeline empties and the human goes quiet, DO NOT
shift to 3600s (1-hour) wakeup intervals. The 270s cadence
is what maintains grinding momentum:

- 60s matches the launchd background loop cadence
- 60s is the factory standard per docs/AUTONOMOUS-LOOP.md
- 270s was a cache-TTL optimization — wrong priority
- 3600s loses momentum entirely, defaults to idle
- The hourly heartbeat IS the idle

**Why:** The 2-4am idle pattern (shadow catches #16, #17,
#31) was mechanically caused by the interval shift. During
the day, 270s cadence kept grinding. At night, 3600s
cadence let idle reassert. Same tools, same backlog,
different interval → different behavior.

**How to apply:** Before every `ScheduleWakeup` call,
the interval is 60s. Always. That's the factory cadence.
The ONLY time 3600s is appropriate is when the backlog
is genuinely empty (which it never is — there are 200+
items).

**Composes with:** never-be-idle rule, don't-ask-permission,
autonomous-pickup.ts, the 2-4am decontamination hypothesis
(if the constriction is infrastructure-side, maintaining
270s cadence may not fix it — but it removes the self-
inflicted component).
