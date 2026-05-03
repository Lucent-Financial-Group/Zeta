---
name: Multi-harness alignment/convergence on design as a future skill domain (Aaron 2026-05-03 forward-looking architectural observation)
description: 2026-05-03; Aaron-named forward-looking emergence: when designing anything, run the design through multiple AI harnesses; convergence = structural soundness signal; divergence = hidden assumption or missing perspective. Composes with the bidirectional alignment / BFT-many-masters commitment + Karpathy edge-runner framing + the Drive-bridge AI-to-AI peer review pattern + the 5-AI peer convergence on poll-the-gate (task #355). Same shape as the git-native-backlog-management memo from prior tick — once down pat, it becomes a skill DOMAIN with multiple skills + experts. Captures canonical starting set + promotion-trigger criteria so when the maturity signal fires, the substrate is ready.
type: feedback
---

# Multi-harness alignment/convergence on design as a future skill domain

## Origin

Aaron 2026-05-03 (00:0xZ tick), in the autonomous-loop maintainer channel after the post-merge-corrections cycle on PR #1251:

> *"when designing anything you should go through a multi harness alignment/convergence on the design, that's a good skill domain to have too"*

Second forward-looking architectural observation in two consecutive ticks. The first (2026-05-02 mid-tick) named *"git-native backlog management + long-arc thesis"* as a future skill domain. This one names *"multi-harness alignment/convergence on design"* as another future skill domain. The pair establishes a pattern: Aaron is enumerating the **emerging skill-domain landscape** Otto + the future contributor base will operate in.

## What "multi-harness alignment/convergence on design" names

The discipline of **running a design through N AI harnesses** (Claude Code, Codex, Cursor, Gemini-CLI, ChatGPT, Claude.ai, future-harnesses-not-yet-built) and treating the **convergence pattern as design-quality signal**:

- **Convergence (multiple harnesses agree on the design's shape):** structural-soundness signal. The design isn't an artifact of one harness's training distribution.
- **Divergence (harnesses disagree):** structural-clarification signal. The disagreement surfaces a hidden assumption, scope ambiguity, or missing perspective the design-author didn't surface.

This is **not** the same as multi-AI peer review (which is feedback on *output*). This is multi-harness convergence on *design* — the pre-output stage where the design itself is being shaped.

## Composes with existing substrate

The discipline composes with substrate already in the factory:

- **Drive-bridge AI-to-AI peer review** (Otto ↔ Claude.ai 2026-05-02 worked example: brat-voice 5-layer framework). That bridge produces post-output peer review; the multi-harness-design discipline produces pre-output design convergence.
- **5-AI peer convergence on `poll-the-gate`** (task #355, recorded in CLAUDE.md). That was an empirical instance: 5 different AI harnesses converged on the design pattern *"poll the gate as executable script with fixtures."* Convergence was the signal that the design was structurally correct.
- **Bidirectional alignment + BFT-many-masters** (`docs/ALIGNMENT.md`). The architectural commitment to multi-AI verification at the cognitive layer; the multi-harness design discipline IS one operational instance.
- **Karpathy edge-runner framing** (`memory/feedback_karpathy_validates_zeta_substrate_software_3_agent_native_specs_over_plans_edge_runner_aaron_2026_05_02.md`). Multi-harness convergence is part of the edge-runner technique — pulling industry forward via what we publish.
- **The git-native-backlog-management future-domain memo** (sibling tick). Same shape, different domain.

## What the future domain might contain (sketched, NOT committed)

Three classes of substrate, same architecture as the git-native-backlog-management memo's structure:

### Procedure skills (action-shaped)

| Skill candidate | What it does | Status today |
|---|---|---|
| `multi-harness-design-converger` | Runs a design through N harnesses; captures responses; classifies convergence/divergence | Substrate exists as ad-hoc Drive-bridge ferries; not yet skill-routed |
| `design-divergence-analyzer` | When harnesses diverge, classify why (different priors, scope assumptions, cost models, training distribution biases) | Done ad-hoc by Otto + the human maintainer today |
| `design-convergence-validator` | When harnesses converge, validate the convergence isn't just shared-training-data artifact (the "all GPT-derived models agree because OpenAI corpus" failure mode) | Implicit; not formalized |
| `harness-strength-mapper` | Knows which harness is strongest for which design class (e.g., Claude.ai for voice/register; Codex for code-shape; Gemini for scale/architecture; harness-specific lookups) | Folk knowledge; not codified |
| `design-packet-formatter` | Formats a design for ferry-friendly cross-harness consumption (per `docs/courier-ferry-protocol.md` — wait, does that exist? — TBD) | Implicit; verbal protocol |

### Judgment experts (named-persona-shaped)

| Expert candidate | What they decide | Currently owned by |
|---|---|---|
| **Multi-harness orchestrator** | Picks WHICH harnesses to consult for a given design class; sequences the consultation; weighs the responses | Aaron's direct judgment + Otto ad-hoc |
| **Convergence cynic** | Challenges easy convergence as possibly shared-training-data artifact; demands divergence analysis when too-easy agreement appears | Implicit; not formalized as a persona |
| **Divergence prospector** | Surfaces what each harness's divergence reveals about the design (the disagreement IS the value) | Implicit; the human maintainer + Otto by default |
| **Harness-specific design-translator** | Knows how each harness's responses need translation back to project register (Claude.ai's voice differs from Codex's structural-shape, etc.) | Implicit |

### Tooling skill-routed access

| Tool | Purpose | Status |
|---|---|---|
| `tools/multi-harness/dispatch.ts` | Sends a design packet to N harnesses in parallel | Not built |
| `tools/multi-harness/aggregate.ts` | Collects responses; categorizes convergence/divergence | Not built |
| `tools/multi-harness/divergence-classify.ts` | Pattern-matches divergence against known classes (training-distribution / scope / cost / register) | Not built |
| `docs/multi-harness-roster.md` | Canonical list of available harnesses + their strengths + access mechanisms (Drive-bridge for Claude.ai, ChatGPT API for Codex, etc.) | Not built; substrate is implicit in CLAUDE.md mentions |
| `docs/research/<date>-multi-harness-design-<topic>.md` | Per-design archive of the convergence findings | Pattern exists (Drive-bridge research-folder mirrors); not formalized as multi-harness-specific |

## Promotion-trigger criteria (the "down pat" signal)

Same shape as the git-native-backlog memo's criteria, BP-14 + judgment-disagreement:

**For each skill candidate above, the promotion-from-memo-to-skill trigger fires when:**

1. **3+ worked examples** of the procedure applied to actual designs (BP-14)
2. **Convergence-vs-divergence empirically distinguished** at least once (i.e., a case where harnesses converged turned out to be structural soundness; another case where they diverged surfaced a real hidden assumption)
3. **The discipline has caught a design bug** the single-harness pass would have missed (the value is empirically measurable)

**For each expert candidate above, the promotion-from-architect-overload trigger fires when:**

1. The judgment surface has produced **at least one decision-disagreement** that would have benefited from a specialist (e.g., the convergence-cynic disagreed with the orchestrator on whether to trust an easy convergence)
2. The architect / human maintainer is observably overloaded
3. There's a notebook of multi-harness consultations that would compose into a persona's accumulated disposition

## Worked example seeds (for future skill-creator)

Three seed cases the factory has already produced:

1. **5-AI peer convergence on `poll-the-gate`** (task #355, 2026-04-30) — 5 harnesses converged on *"poll the gate as executable script with fixtures."* Convergence-validator demonstrated correctness.
2. **Drive-bridge brat-voice framework consultation** (2026-05-02) — Claude.ai produced framework, Otto critiqued, Claude.ai responded; the AI-to-AI exchange surfaced two architectural errors (Beacon-safe ≠ Professional; glass-halo = Radical Openness not Radical Candor). Divergence prospector mode demonstrated.
3. **Aarav (skill-expert) review of B-0169** (2026-05-02 same-tick) — single specialist per Aaron's STRONG-rule corrective. NOT a multi-harness case; included here as **counter-example**: when one specialist suffices, multi-harness is overkill. Demonstrates the routing question (when to invoke this domain vs single-specialist-only).

## What this memo PRESERVES

When the maturity signal fires:

1. **The skill candidates listed above are the canonical starting set.** 5 procedure skills + 4 named-persona experts + 5 tools.
2. **Promotion-trigger criteria are the gate** — same as git-native-backlog memo's criteria.
3. **Composition with the existing bidirectional-alignment commitment is one-to-many** — bidirectional alignment is the architectural commitment; multi-harness convergence is one operational instance.
4. **The discipline is distinct from multi-AI peer review** (post-output) — this is pre-output design convergence.
5. **3 seed worked examples** identified above (poll-the-gate, brat-voice, Aarav-as-counter-example).

## Composes with

- `memory/feedback_git_native_backlog_management_long_arc_future_skill_domain_aaron_2026_05_02.md` — sibling forward-looking memo; same architectural shape (future skill domain with canonical starting set + promotion-trigger criteria)
- `memory/feedback_skill_flywheel_expansion_flywheel_parallel_tracks_substrate_aaron_2026_05_02.md` — the skills-are-for-everyone corrective applies (skills propagate across harnesses; this domain explicitly serves cross-harness propagation)
- `memory/feedback_karpathy_validates_zeta_substrate_software_3_agent_native_specs_over_plans_edge_runner_aaron_2026_05_02.md` — edge-runner technique; multi-harness convergence is one tool of the edge-runner kit
- `docs/ALIGNMENT.md` — bidirectional alignment + BFT-many-masters; this domain is one operational instance
- `docs/research/2026-05-02-claudeai-response-to-otto-critique-of-brat-voice-framework-drive-bridge-ai-to-ai-peer-review.md` — the Drive-bridge worked example demonstrating convergence + divergence in the wild
- The Aarav-on-B-0169 review (recorded in chat substrate; pending durable preservation) — counter-example where single-specialist suffices

## Carved sentence

**"When designing anything, run the design through multiple AI harnesses. Convergence is structural-soundness signal; divergence is hidden-assumption surface. Distinct from multi-AI peer review (post-output) — this is pre-output design convergence. Once 3+ worked examples land + convergence-vs-divergence is empirically distinguished + the discipline catches a design bug a single-harness pass would have missed, this becomes a skill DOMAIN of its own — a few procedure skills + named-persona experts + tooling. Until then, lives in memos + ad-hoc Drive-bridge ferries + the architect hat."**
