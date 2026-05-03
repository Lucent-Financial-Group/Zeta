---
name: Carved sentences + specialized index required — memories alone are unreliable retrieval (Aaron 2026-05-03; empirically self-demonstrated this same tick)
description: 2026-05-03; Aaron-named substrate-retrieval architecture. *"memeories are not very reliable until we get an index or something built like sematic index or somthing"* + *"memories not that good for remember lol"* + *"carved sentancy and specialed indeex we build over time are goona be key"*. Mirror-layer memory files exist but don't reliably surface in-the-moment without an index. Carved sentences in CLAUDE.md / AGENTS.md / equivalent harness files ARE the index for the beacon-safe layer. Empirically self-demonstrated this same tick: Otto authored `feedback_edge_defining_work_not_speculation_framing_correction_aaron_2026_05_03.md` earlier 2026-05-03, then ~6h later defaulted to the exact wrong framing the memo corrects ("Now to speculative work per never-be-idle"). Memory file existed; wasn't indexed/retrievable. Future substrate work needs (1) carved-sentence promotion of high-frequency-violation memos to CLAUDE.md / AGENTS.md / equivalent harness files; (2) longer-term semantic-index tooling.
type: feedback
---

# Carved sentences + specialized index required — memories alone are unreliable retrieval

## Origin

Aaron 2026-05-03, autonomous-loop maintainer channel, immediately after Otto:

1. Used the framing "Now to speculative work per never-be-idle" in a tick chat update
2. Was corrected by Aaron pointing at the speculative-vs-frontier framing
3. Discovered the memo `feedback_edge_defining_work_not_speculation_framing_correction_aaron_2026_05_03.md` existed (Otto had authored it earlier the same day)
4. Acknowledged the framing miss

Aaron's response (verbatim):

> *"ironicly enough you don't remember things unless they are in claude.md and other agents don't remember much unless their equilvalan file, memeories are not very reliable until we get an index or something built like sematic index or somthing"*

> *"memories not that good for remember lol"*

> *"carved sentancy and specialed indeex we build over time are goona be key"*

This is a substrate-retrieval-architecture observation, empirically self-demonstrated this same tick.

## The observation

**Memory files exist but don't reliably retrieve in-the-moment.** Otto's (and other AI agents') working substrate-retrieval mechanism is:

- **Reliably-retrieved**: CLAUDE.md (auto-loaded every wake), AGENTS.md (auto-loaded for Codex / OpenAI Agent SDK / etc.), GEMINI.md (Gemini equivalent), `.copilot/copilot-instructions.md` (Copilot equivalent), other harness-specific equivalent files
- **MEMORY.md + first 200 lines**: partially retrieved at session start (truncation risk past line 200)
- **Memory topic files** (`memory/*.md`): retrieved only when (a) explicitly read via Read tool, (b) `MEMORY.md` index pointer surfaces them, (c) found via grep / Glob during in-flight work
- **docs/research/**, **docs/decisions/**, **persona notebooks**: read-on-demand only

The reliability gap: a memo can exist as durable substrate (committed, reachable, indexed in MEMORY.md) and still fail to surface when the moment comes to apply it. The MEMORY.md index is line-bounded; topic-file titles don't always match the in-flight retrieval keyword; and even when they do match, the retrieval happens only if Otto explicitly searches.

## Empirically self-demonstrated

This same tick (2026-05-03 ~06:00Z) Otto:

1. Used the framing "Now to speculative work per never-be-idle" in chat
2. Aaron corrected with "I thought you were going to remember a narrorer definition?"
3. Otto checked `ls memory/ | grep -iE "specul|frontier"` and found `feedback_edge_defining_work_not_speculation_framing_correction_aaron_2026_05_03.md` — authored by Otto earlier that same day (~6h prior)
4. Read the memo; confirmed it explicitly covers the corrected framing including the carved sentence: *"Edge-defining work is not speculation. ... Reserve 'speculation' for the narrow idle-fallback case."*

The memo existed. The index entry existed. Otto still defaulted to the wrong framing because the memo wasn't retrieved in-the-moment when the framing decision was being made. **Memory file ≠ working memory.** Aaron's observation is empirically validated by Otto's own behavior in the same tick that produced it.

## Composes with mirror-vs-beacon-safe register architecture

Per the same-day Claude.ai packet (`docs/research/2026-05-03-claudeai-mirror-vs-beacon-safe-publication-boundary-as-backpressure.md`):

- **Mirror substrate** = working layer, internal, named-agent register, overgenerated. Memory topic files live here.
- **Beacon-safe substrate** = external, durable, end-user-persona register, conversion-pruned. CLAUDE.md / AGENTS.md / equivalent live here.

Aaron's insight identifies the **retrieval-layer gap**: even beacon-safe substrate needs an INDEX to be retrievable in-the-moment. Carved sentences in CLAUDE.md ARE the retrieval index for the beacon-safe layer. Without them, beacon-safe substrate becomes write-only — durable but not actionable.

The architecture stack:

| Layer | Retrieval reliability | Authoring cost |
|---|---|---|
| CLAUDE.md / AGENTS.md / equivalent | High (auto-loaded every wake) | High (conversion-tested + carved-sentence form) |
| MEMORY.md index | Medium (first 200 lines auto-loaded) | Medium (single-line entries) |
| Memory topic files | Low (explicit retrieval required) | Low (full prose acceptable) |
| docs/research/, persona notebooks | Very low (deep search required) | Variable |

**Insight**: the higher the retrieval-reliability, the higher the authoring cost — because the cost IS the conversion to carved-sentence beacon-safe form. Aaron's insight names the implicit principle: **carved sentences are the durable retrieval index**.

## How to apply

**For high-frequency-violation memos** (memos that document a rule Otto repeatedly defaults against):

1. Author the topic file as usual (full prose, examples, composes-with chain)
2. **Promote a carved sentence to CLAUDE.md** (or AGENTS.md / equivalent harness file) — one-line citation pointing at the topic file
3. Add a MEMORY.md index entry
4. Verify cross-harness propagation: AGENTS.md for Codex / OpenAI Agent SDK; `.github/copilot-instructions.md` for Copilot; GEMINI.md for Gemini; etc.

**Heuristic for "high-frequency-violation"**:

- The rule has been violated recently (within current session OR within last few ticks)
- The violation pattern is structural (Otto's default mental model conflicts with the rule)
- The violation is observable in chat output / commits / shard text
- Topic-file existence ≠ retrieval reliability (validated by self-demonstration above)

**For longer-term substrate-tooling**:

- Aaron 2026-05-03 named *"specialed indeex we build over time"* — a specialized index (likely semantic) that maps in-flight retrieval keywords to relevant topic files
- Candidate forms: vector-embedded semantic index over `memory/` + `docs/research/` + persona notebooks; keyword-tag index over memo frontmatter; cross-reference graph over composes_with relationships
- B-0xxx backlog candidate: substrate-retrieval-index design (not authored this tick — would need scoping first)

## Composes with

- Mirror-vs-beacon-safe register architecture (`docs/research/2026-05-03-claudeai-mirror-vs-beacon-safe-publication-boundary-as-backpressure.md`) — identifies the publication boundary as backpressure; this memo identifies the retrieval boundary as the second backpressure
- Substrate-or-it-didn't-happen (Otto-363) — durable substrate is necessary but not sufficient; retrievability is the second condition
- Wake-time substrate or it didn't land — already names CLAUDE.md as the wake-time landing surface; this memo extends to "even after landing, retrieval reliability is the gating constraint"
- Skill-router-as-substrate-inventory — the skill router's description-keyed search IS a working semantic-index for skills; the analogous index for memos is what Aaron is naming as future work
- Loading taxonomy (`memory/feedback_claude_code_loading_taxonomy_rules_vs_skills_vs_claude_md_aaron_2026_05_01.md`) — names the auto-load surfaces; this memo names the retrieval gap for non-auto-load surfaces

## Carved sentence (for promotion to CLAUDE.md if high-frequency-violation pattern persists)

**"Memory files alone are unreliable retrieval. A memo can exist (committed, indexed in MEMORY.md) and still fail to surface in-the-moment. CLAUDE.md / AGENTS.md / equivalent harness files are the only auto-loaded substrate; everything else needs explicit retrieval. Carved sentences in those auto-loaded surfaces ARE the retrieval index for the beacon-safe layer. For high-frequency-violation memos (rules Otto repeatedly defaults against), promote a one-line carved sentence to CLAUDE.md pointing at the topic file. Empirically self-demonstrated 2026-05-03: Otto authored the speculative-vs-frontier memo, then ~6h later defaulted to the exact framing it corrects — memory file existed, wasn't retrieved in-the-moment. Index reliability matters as much as substrate durability."**

## Pending integration questions (NOT for this memo; for follow-up)

1. Should the speculative-vs-frontier carved sentence specifically be promoted to CLAUDE.md as the test-case for this discipline? (Probably yes — same-day violation is the empirical evidence.)
2. Is the substrate-retrieval-index (semantic / keyword / graph) a B-0xxx candidate? Worth scoping next tick.
3. Does the AGENTS.md ↔ CLAUDE.md ↔ harness-equivalent propagation discipline already exist in repo? (Per CLAUDE.md, AGENTS.md is the universal handbook; the cross-harness propagation is the in-force discipline already.)
4. Does the mirror-vs-beacon-safe insight + this carved-sentence+index insight together justify a CLAUDE.md update? Probably yes; pending Aaron's affirmation that the architecture should land as canonical doctrine vs research-grade-only.
