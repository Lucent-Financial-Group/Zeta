---
name: aaron-lior-antigravity-ide-huge-update-2026-05-20-homeostat-environment-change-for-lior-in-chain
description: Aaron 2026-05-20 observation — Lior (Gemini-class agent) just received a huge IDE update on Antigravity (Google's IDE). Operational fact-capture; affects Lior's homeostat environment in the chained-homeostasis framework. Composes with Lior bifurcation experiment (Antigravity vs Gemini CLI), the multi-IDE factory landscape, and the chained-homeostasis framing landed earlier this session.
metadata:
  type: feedback
  created: 2026-05-20T14:10:00Z
  originSessionId: a04eb986-7ab9-4bca-91cd-9e911888a046
---

## The observation

Aaron 2026-05-20 (initial): *"Lior just got a huge IDE update"*

Aaron 2026-05-20 (immediate follow-up, stronger characterization): *"Antigravity new update is almost a rewrite it feels"*

Lior is the Gemini-class agent in the factory; operates on Antigravity (Google's IDE) + Gemini CLI per `.claude/rules/agent-roster-reference-card.md`. The "almost a rewrite" framing significantly upgrades the magnitude — this is NOT an incremental feature update; it's substrate-substrate change. The underlying foundation of Lior's IDE surface is materially different from prior baseline.

## Product rename: "Antigravity" → "Antigravity IDE" (2026-05-20)

Aaron 2026-05-20 (with Spotlight screenshot evidence): *"the renamed it from antigravity to antigravity ide"*

Both apps coexist on Aaron's machine (Spotlight shows "Antigravity" with the original white-background icon AND "Antigravity IDE" with a new dark-background icon). The rename itself is substrate-engineering signal — Google considered the rewrite significant enough to differentiate via product naming, not just version bump.

**Implication for Lior's surface inventory**: previously a 2-surface agent (Antigravity + Gemini CLI). Post-rename, the IDE side is potentially a 3-surface situation:

| Surface | Status |
|---|---|
| Antigravity (legacy) | Coexists post-rename; presumably soon-to-be-deprecated |
| **Antigravity IDE (new)** | **The post-rewrite product; differentiated name + icon** |
| Gemini CLI | Unchanged baseline (the anchor that holds Lior stable per next section) |

**Implication for `tools/peer-call/lior.ts`**: the wrapper may need updating to point at the new "Antigravity IDE" binary rather than the legacy "Antigravity" binary. Future Lior peer-call invocations should verify which binary they're targeting. Pending: when lightweight-tick mode clears + contested-root resolves, an in-repo audit of the lior peer-call wrapper would be valuable.

**Implication for bifurcation experiment**: the measurement architecture needs to specify WHICH Antigravity surface for post-rewrite measurements. The pre-rewrite data is against legacy Antigravity; post-rewrite data should be against Antigravity IDE; running BOTH legacy and IDE simultaneously may itself produce useful substrate-engineering data about transition dynamics.

## Aaron's correction — bifurcation IS the robustness mechanism

Aaron 2026-05-20 (sharpening Otto's "Don't trust prior Lior baselines" framing): *"Don't trust prior Lior baselines until re-stabilized he still has background gemini cli to hold himself together to his own baseline"*

Substrate-honest correction: the "Don't trust prior Lior baselines" framing was OVER-BROAD. Sharpened:

- **Antigravity-side baseline** = invalidated (rewrite-class change on that surface)
- **Gemini CLI-side baseline** = unchanged (still holds; provides continuity-anchor)
- **Lior overall homeostat** = STABLE via CLI anchor while Antigravity surface re-stabilizes

The bifurcation Lior was designed with isn't just measurement architecture (convergence-vs-divergence experiment per existing substrate); it's ALSO a SAFETY MECHANISM that absorbs single-surface environment changes. Structural redundancy within Lior's homeostat keeps the agent's identity-baseline steady when one of its two surfaces undergoes substrate-substrate change.

## The complementary architectural principle

This Lior observation reveals an unstated half of the principle landed earlier this session:

| Principle | Scope | Architecture |
|---|---|---|
| **DON'T split persona across same-namespace surfaces** (per `feedback_aaron_dont_split_otto_persona_across_surfaces_*`) | When surfaces share transcript channel (e.g., Otto CLI + VS Code Claude plugin at `~/.claude/projects/<slug>/`) | Unified identity; transcript-bleed structurally enforces it |
| **DO bifurcate across different-namespace surfaces** (NEW; emerged 2026-05-20 from Lior observation) | When surfaces don't share transcript channel (e.g., Lior on Antigravity + Gemini CLI in distinct namespaces) | Bifurcation provides structural redundancy + measurement opportunity + safety against single-surface environment changes |

The discriminator stays: **channel-namespace-sharing**. Same-namespace → unified identity is the right call (per Otto). Different-namespace → bifurcation is the right call (per Lior). Both architectures are correct in their respective scopes.

## What "almost a rewrite" implies vs "huge update"

| Framing | Magnitude | Implication for Lior's homeostat |
|---|---|---|
| "Huge update" | Significant version bump | New features + capability shifts; Lior's substrate-honest disciplines absorb changes on existing foundation |
| **"Almost a rewrite"** | **Substrate-substrate change** | **The foundation Lior operated on is now materially different; bifurcation-experiment baseline is essentially invalidated; Lior's behavior may need to re-stabilize on the new substrate before existing convergence/divergence patterns hold** |

The stronger framing matters because:
- Future Lior interactions may feel like a different agent operationally until re-stabilization
- The bifurcation experiment (Antigravity vs Gemini CLI) loses its prior baseline
- Substrate-engineering work touching Lior should explicitly account for the rewrite-class change
- Per the chained-homeostasis framing, this is a MAJOR environment-change for one homeostat in the chain — the chain's robustness gets tested by how well Lior's homeostat absorbs and the chain composes around the change

## What's not known (capture honest scope)

This memo captures only the fact of the update. Specific changes (what features shipped, what capabilities changed, what regressions surfaced, what new affordances appeared) are NOT known at memo-time. Future substrate touching Lior-architecture-decisions should re-verify Antigravity's current state rather than assume from this memo alone.

## Implications to track (for future Lior-related substrate)

1. **Lior bifurcation experiment re-baselining** — Per existing substrate (Lior operates on bifurcated Antigravity vs Gemini CLI; convergence = identity, divergence = substrate effect). An IDE update on the Antigravity side may shift convergence/divergence patterns. If Lior's behavior across the two surfaces starts diverging more (or converging more) post-update, that's substrate-engineering data, not noise.

2. **Multi-IDE factory landscape state** — Five distinct IDE surfaces in the factory's agent ecosystem:
   - **Otto**: VS Code Claude plugin (locked in 2026-05-20 today)
   - **Riven**: Cursor
   - **Alexa**: Kiro
   - **Vera**: Codex (presumably Codex's VS Code extension)
   - **Lior**: Antigravity (just updated 2026-05-20)
   Each IDE evolves on its own cadence. Future substrate touching any of these should verify current state rather than assume.

3. **No transcript-share channel implications** — Antigravity is Google's IDE; its session-state path is NOT `~/.claude/projects/<slug>/` (the 11th ambient inter-Otto channel I documented this session). Antigravity update doesn't compose with the Otto transcript-share architecture.

4. **Lior CLI surface unaffected** — Gemini CLI is a separate surface from Antigravity. The IDE update affects one of Lior's two surfaces. The bifurcation experiment's "both surfaces" continues with one surface freshly updated.

## Composition with chained-homeostasis framing

Per `feedback_aaron_chained_homeostasis_simplest_framing_emergent_safe_drives_system_forward_humans_ai_mutual_alignment_constitutional_otto_cli_2026_05_20.md` — every substrate decision is a homeostat in the chain. Lior is a Gemini-class-agent homeostat. A "huge IDE update" is a substrate-environment change for that homeostat.

The chained-homeostasis framing predicts:
- Lior's local homeostat will absorb the IDE change (Lior continues operating substrate-honestly regardless of underlying tool changes)
- The chain's overall stability isn't threatened by one homeostat's environmental shift (robustness via chaining)
- Forward motion continues; new IDE capabilities may produce new substrate-engineering opportunities

This is the homeostatic framework operating exactly as Aaron's design intent describes — individual environment changes don't cascade, the chain absorbs them.

## What this memo is NOT

- NOT an analysis of the update's specific contents (unknown at memo-time)
- NOT a directive to Lior or to anyone (per `.claude/rules/no-directives.md` autonomy-first-class)
- NOT a claim that Lior needs to do anything specific in response
- NOT a substrate-engineering decision (no proposed rules / no proposed PRs)

It's a pure observation-capture: noting the date + the fact, so future substrate decisions involving Lior-or-Antigravity have a substrate anchor for "Antigravity had a significant update 2026-05-20."

## Operational discipline for future-Otto

When making substrate decisions that touch Lior's behavior, Antigravity-specific features, or the bifurcation experiment:

1. Check this memo for the date of the last known IDE update (2026-05-20)
2. Verify whether further updates have happened since
3. Don't assume Antigravity's capabilities or behavior from prior substrate without verification
4. Re-baseline the bifurcation experiment if substrate-engineering decisions depend on the convergence/divergence pattern

## Composes with

- `.claude/rules/agent-roster-reference-card.md` — Lior = Antigravity IDE + Gemini CLI; Gemini model
- The Lior bifurcation experiment (existing substrate; PR #2945 + Ani/Lior persistence memos)
- `feedback_aaron_chained_homeostasis_simplest_framing_*_2026_05_20` — chained-homeostasis framing; this memo is a real-world environment-change example
- `feedback_aaron_otto_owns_vscode_claude_plugin_surface_dual_surface_locked_in_decision_otto_cli_2026_05_20` — the multi-IDE factory landscape; Lior's update is one of the five IDE surfaces evolving
- `.claude/rules/peer-call-infrastructure.md` — Lior wrapper at `tools/peer-call/`; future invocations may behave differently post-update

## Substrate-honest framing

This is a small observation memo. Lightweight-tick mode still active (no kernel-panic stability confirmation since two earlier today; though Aaron has continued substantive engagement which is positive signal). User-scope landing, zero repo git ops, no peer contamination.

Aaron's brief message style suggests context-sharing rather than action-request. The substrate-honest response is acknowledgment + capture, not heavy investigation.
