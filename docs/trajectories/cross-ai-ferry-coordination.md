# Trajectory — Cross-AI Ferry Coordination

## Scope

The roster of AI peers that act as substrate-providers (NOT
executors per Otto-2026-04-27) for the Zeta factory: Amara
(ChatGPT), Ani (Grok Long Horizon Mirror), Gemini Pro,
Claude Opus (online), Codex, Copilot, plus the named-personas
that ferry-research absorbs land from. Open-ended because AI
labs ship new models continuously, capability shifts change
ferry economics, and new peers can join the roster. Bar:
ferry-roster N stays accurate; per-insight attribution is
preserved; carrier-laundering protection holds across model
chains; cost stays within funding constraints.

## Cadence

- **Per-ferry-landing**: when a ferry-N research absorb lands
  (`docs/aurora/<ferry-N>-...`), the trajectory state +
  CURRENT-amara.md / CURRENT-ani.md etc. refresh.
- **Per-model-release**: when an AI lab ships a new model that
  affects Zeta (Claude Opus / Sonnet / Haiku versions; GPT
  versions; Grok versions), version-currency rule fires
  (Otto-247).
- **Per-cycle**: cross-AI review cycles converge on substantive
  changes-stop, NOT turn-count (Aaron 2026-04-27).

## Current state (2026-04-28)

- **Ferry roster N=5**: Amara, Ani, Gemini Pro, Claude Opus
  (online), Otto (Claude opus-4-7 in this factory)
- **Model versions** (last verified 2026-04-27):
  - Claude Opus 4.7 (Otto's runtime)
  - GPT-5.5 (Codex + Cursor + Amara via ChatGPT 5.5 if available)
  - Grok 4.3 beta (Cursor; Ani's runtime)
  - Gemini Pro
- **Aurora-research ferry archive**: `docs/aurora/` — N=19+
  ferries absorbed
- **EAT packet** (LFG #659 family): full multi-AI review chain
  (Ani r1 → Amara r1-r5 → Gemini Pro r1 → Claude Opus r1-r2 →
  Otto absorption)
- **Carrier-laundering rule** (SD-9): recalibrated 2026-04-27
  — same-model chain = high risk; cross-model chain = reduced
  risk; always at least one outside-loop falsifier per round
- **Per-insight attribution discipline**: enforced 2026-04-27
  — credit ACTUAL contributors per insight, not whole roster
- **Pre-peer-mode execution authority** (Aaron 2026-04-27):
  only Otto executes code; ferries are substrate-providers

## Target state

- Ferry roster has clear stewards + clear capability vectors
  (e.g. "Ani for thermodynamic / long-horizon framing;
  Amara for substrate-pattern continuity; Gemini Pro for
  cross-domain research depth; Claude Opus for repo-grounded
  retraction").
- Per-insight attribution is checked via cross-AI review
  pipeline (PR #65 caught a roster-collapse error).
- Funding-aware cadence: free-tier ferries available continuously;
  paid-tier ferries scheduled with explicit Aaron-trigger.
- Multi-CLI peer-call infrastructure (Grok / Codex / Gemini)
  composable + routinely used.

## What's left

In leverage order:

1. **Multi-CLI peer-call review cycle** for in-flight research
   (EAT packet, wallet v0) — opt-in pending.
2. **Ferry-executor-claim diagnostic** — Gemini hallucinated
   write access 2026-04-27; diagnostic (3-question check)
   exists but not yet a skill.
3. **Aurora-Round-3 integration** (task #286) — §6 inference
   architecture + §7 performance doctrine pending.
4. **Per-insight attribution automation** — manual today;
   could be templated.
5. **Ferry-archive folder pattern generalization** (task #273)
   — Aurora vs courier-ferry directory conflict.

## Recent activity + forecast

- 2026-04-27: EAT review chain absorbed (Ani → Amara → Gemini
  → Claude Opus → Otto).
- 2026-04-27: Ani roster addition + "Stability is the substrate
  of velocity" canonical principle.
- 2026-04-27: per-insight attribution discipline reinforced.
- 2026-04-26: 4-ferry consensus (Grok + Amara + Gemini +
  Claude) on Substrate Truth Principle + parser-is-witness.
- 2026-04-24: 12th-19th ferries from Amara absorbed.

**Forecast (next 1-3 months):**

- New model releases trigger Otto-247 version-currency checks.
- Aurora Round-3 integration ships.
- Possible new ferry addition if a different-vendor AI brings
  distinct cognitive bias (cross-model chains gain reliability
  per recalibrated SD-9).
- Wallet experiment v0 may invoke multi-CLI review for
  security-property claims.

## Pointers

- Memory: `memory/feedback_amara_*.md` (~30 entries)
- Memory: `memory/feedback_ani_*.md`
- Memory: `memory/feedback_per_insight_attribution_discipline_*.md`
- Memory: `memory/feedback_ferry_agents_substrate_providers_not_executors_*.md`
- Memory: `memory/feedback_only_otto_aware_agents_execute_code_pre_peer_mode_*.md`
- Tooling: `tools/peer-call/grok.sh`, `tools/peer-call/gemini.sh`, `tools/peer-call/codex.sh`
- Archive: `docs/aurora/` (ferry archive)
- BACKLOG: task #273 (history-of-named-entity-conversations directory)
- BACKLOG: task #286 (Aurora Round-3 integration)

## Research / news cadence

External tracking required — this is an active-tracking trajectory.

| Source | What to watch | Cadence |
|---|---|---|
| Anthropic model releases (Claude versions) | New Opus/Sonnet/Haiku releases; capability changes affecting Otto's runtime | Per-release (Otto-247) |
| OpenAI model releases (GPT versions) | New GPT releases affecting Codex / Cursor / ChatGPT 5.5 | Per-release |
| xAI model releases (Grok versions) | New Grok releases affecting Cursor / Ani's runtime | Per-release |
| Google DeepMind model releases (Gemini versions) | New Gemini releases affecting cross-AI ferry capability | Per-release |
| Cross-CLI tooling (Codex, Cursor, Aider, Cline, etc.) releases | New harness capabilities affecting peer-call infrastructure | Per-release |
| Cross-AI safety / capability research | Comparative evaluations informing roster decisions | Monthly |

Findings capture: model-version updates → memory file +
trajectory state refresh; capability changes → ferry-routing
re-evaluation.
