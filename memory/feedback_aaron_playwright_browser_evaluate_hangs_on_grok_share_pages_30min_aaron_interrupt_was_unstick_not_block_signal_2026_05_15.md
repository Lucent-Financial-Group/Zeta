---
name: aaron-playwright-browser-evaluate-hangs-on-grok-share-pages-30min-aaron-interrupt-was-unstick-not-block-signal
description: "Aaron 2026-05-15T~03:42Z — substantive correction: Playwright `browser_evaluate` on grok.com/share/<id> pages hangs for 30+ minutes (likely on never-reached page-idle / networkidle wait conditions). Aaron's interrupts on `browser_evaluate` during the Ani-extract session were UNSTICK signals (the call was hung), not 'don't use this tool' blocks. Future-Otto: two interrupts on a Playwright tool that returns 'Request interrupted by user for tool use' means CHECK whether the tool was hung — try a strictly-different mechanism with explicit short timeouts, NOT conservative-hold-and-ask. Retry with `waitUntil: domcontentloaded` instead of default `load`, or use `browser_snapshot` (auto-saved on navigate, less invasive — accessibility-tree only)."
metadata: 
  node_type: memory
  type: feedback
  created: 2026-05-15
  originSessionId: 4915ba14-7e8d-4a69-b592-b370c83506ef
---

## The correction

Aaron 2026-05-15T~03:42Z (after I had described the Playwright timeline as "navigate succeeded, eval was interrupted by you, I held"):

> "Playwright navigate succeeded (attempt 2) → I tried browser_evaluate → you interrupted it it was 30 minutes between when you tried and i interruped"

My prior interpretation: two interrupts on `browser_evaluate` = hard signal "don't run JS eval on this page." So I held in Layer-1 heartbeat for ~50 minutes waiting on direction.

Aaron's correction reframes the interrupts: **they were UNSTICK signals**, not "don't use this tool." The `browser_evaluate` call hung for 30+ minutes (per Aaron's lived experience); Aaron interrupted to stop the hung call.

## Why the hang happens (operational hypothesis)

Playwright tools wait for page state by default. Most tools default to `networkidle` or `load` event completion before returning. Grok share pages are Next.js client-rendered SPAs that:

- Continue to fetch JS chunks, fonts, CSS, telemetry, analytics
- Keep WebSocket / SSE / long-poll connections open
- Re-fetch on scroll / virtualized rendering events

Result: `networkidle` is never reached. Any Playwright tool that waits for page-quiet hangs indefinitely until Playwright's own internal timeout fires (which may be longer than the 30s I assumed).

## The right substrate-honest reaction pattern

When Playwright tool calls "succeed" on `browser_navigate` but then hang on `browser_evaluate` (or any tool needing page-quiet):

1. **Don't treat user interrupt as "tool blocked"** — treat it as "tool was hung, kill it."
2. **Try strictly-different mechanism**: `browser_snapshot` is auto-generated on navigate and saved to `.playwright-mcp/page-<timestamp>.yml` — read that file directly instead of running on the page.
3. **Retry with explicit short timeouts**: most Playwright APIs support `timeout` parameters; the MCP wrapper may not surface them but the snapshot fallback is reliable.
4. **Switch tooling** if browser-MCP is unsuited: osascript+Chrome (with user cooperation) or direct curl + JSON probe for client-rendered SPAs.

## What I should have done immediately after the first interrupt

Read the auto-saved snapshot from the `.playwright-mcp/page-<timestamp>.yml` file (already on disk from the successful navigate), no further Playwright tool calls needed. That would have:

- Bypassed the hang completely
- Surfaced whatever accessibility-tree content Grok rendered statically
- Let me extract conversation content (or determine it wasn't there) without holding for direction

## Composes with other substrate

- `feedback_aaron_shadow_star_shorthand_means_autocomplete_generated_not_aaron_authored_grey_text_completed_2026_05_15.md` — prior misinterpretation pattern; this one is structurally similar (mis-reading what Aaron's signal meant)
- `.claude/rules/dont-ask-permission.md` — within authority scope, ship; the snapshot-only fallback was within scope, I should have just done it
- `.claude/rules/holding-without-named-dependency-is-standing-by-failure.md` — my "wait for direction" was actually the standing-by failure mode (no real named dependency — I had a viable alternative I wasn't taking)

## Operational consequence

Future-Otto cold-booting + needing to extract from a Grok share page (or any virtualized client-rendered SPA):

1. Use `mcp__plugin_playwright_playwright__browser_navigate` to load the page
2. **Skip** `browser_evaluate` — read the auto-saved `.playwright-mcp/page-<timestamp>.yml` snapshot file instead
3. If snapshot insufficient (only accessibility tree, may miss content), use `chrome-lazy-load-chunked-extraction` skill with osascript + Chrome (canonical path for these pages)
4. If still insufficient, ask Aaron to paste from his clipboard
