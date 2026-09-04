---
id: 081M0QRP9MW087G0R003P83T6D
type: task
state: done
priority: P2
slug: arc-rung-d-recorded-session-replay-in-the-twitch-ai-arena-ar
title: "ARC rung D - recorded-session replay in the twitch-ai arena: ARC on the published page, offline, no key, no third-party request"
created: 2026-08-23T16:54:03.676Z
completed: 2026-09-04T12:11:09Z
depends_on: ["081M0QRP9JY087G0R00146V04J"]
composes_with: []
---

# ARC rung D - recorded-session replay in the twitch-ai arena: ARC on the published page, offline, no key, no third-party request

<!-- Work-item body. ZetaId-keyed (conflict-free, time-sortable). "Backlog" is a
     STATE = this folder; completion moves the file to workitems/done/YYYY/MM/.
     Identity is the zetaid prefix — resolve cross-refs by `081M0QRP9MW087G0R003P83T6D-*.md` glob. -->

**Register: `built`.** Design: `docs/design/2026-08-23-arc-agi-3-integration-design-chip8-chip9-atari-and-the-arena.md` §11.

The arena is a static Vite app on GitHub Pages. It cannot reach a visitor's `localhost`, and per the
Lior handoff §B4 the page must stay self-contained (no CDN, no third-party request — the Google
Fonts `<link>` the handoff flagged at `src/apps/twitch-ai/index.html:7` has since been removed;
checked at `6b3b739d2`, no `fonts.googleapis` reference remains).

The published surface replays a recorded ARC session from a committed JSON artifact. Interaction
stays in the local dev lane; the public page shows a true replay and labels it `RECORDED`.

## Resolution

- `zeta_arc.recording` drives the real deterministic `ZetaChase` environment through the ARC
  toolkit's own action loop and serializes each observation through `ArcEnvelope`.
- The committed 11-frame artifact contains reset, ten actions, and a completed level. It carries no
  clock, generated identifier, key, host, or URL.
- The browser validates the artifact into its own typed replay contract before rendering it. Invalid
  data produces a visible typed refusal instead of a partial replay.
- The arena presents the 64x64 frames with play, pause, previous, next, and scrub controls. Its
  provenance text states that the session is committed and offline.

## Verification

- `uv run --project src/Arc.Python pytest src/Arc.Python/tests -q` - 140 passed.
- `uv run --project src/Arc.Python ruff check src/Arc.Python` - clean.
- `bun test src/apps/twitch-ai/test/arc-replay.test.ts` - 3 passed.
- `bun run typecheck` and `bun run build` in `src/apps/twitch-ai` - clean.
- `bun run preflight` - all 18 repository checks passed, including Release build and tests.
- Playwright at 1440x1000 and 390x844 - no page errors, no horizontal overflow, controls advance the
  frame, and no external or `/api` request is made.
