---
name: persona-first-is-for-everything-intelligent-agent-first-design-framework-wide
description: "Aaron 2026-05-27 elevated persona-first from B-0851 architectural-pattern (just for guard posts) to FRAMEWORK-WIDE design principle — \"intelligent agent first design\" — every architectural decision in Zeta starts from \"which agent is at the center of this decision\" rather than \"which technology/tool/protocol.\" Composes with Karpathy edge-runner rule + B-0824 Ace meta-PM + B-0703 multi-oracle BFT + B-0847 per-AI GitHub identity + B-0848 node-local Claude + B-0850 multi-vendor systemd + B-0851 persona-first scheduler. Constitutional-class scope (changes how framework approaches ALL architectural decisions); future Knights Guild ratification path per B-0628."
metadata: 
  node_type: memory
  created: 2026-05-27
  type: feedback
  originSessionId: c2b77530-8ef0-405c-a0bd-04cf8d511cb6
---

## The operator ratification (Aaron 2026-05-27)

Immediately after PR #5400 (B-0851 persona-first guard-post architecture + Mika ferry preservation) opened:

> *"that persona first is going to be for everything basically intelligent agent first design"*

This ELEVATES the persona-first framing from B-0851's scope (architectural-pattern-for-guard-posts) to FRAMEWORK-WIDE design principle. Every architectural decision in Zeta starts from "which agent is at the center of this decision" rather than "which technology/tool/protocol/data-shape."

## What "intelligent agent first design" means concretely

| Architectural decision | Today's question | Persona-first/agent-first question |
|---|---|---|
| API design | "What HTTP endpoints / RPC contracts?" | "Which agents will call this + how does it serve their per-tick autonomous-loop?" |
| Storage substrate | "What database / file format?" | "Which agents read/write this + how does per-agent persistence work?" (B-0847) |
| Cluster operations | "What k8s resources / Helm charts?" | "Which agents are responsible for reconciling this + can they repair from outside the failure domain?" (B-0850) |
| Documentation | "What sections / structure for human reader?" | "Which agents cold-boot into this + what do they need to inherit at session-start?" |
| Testing | "What test framework / coverage targets?" | "Which agents might be running these + does the test give them the diagnostic surface they need?" (B-0849 Docker harness for install.sh) |
| Naming | "What is human-readable + memorable?" | "What does the agent encounter + how does it bandwidth-engineer with the persona's substrate?" (Ilyana review extended) |
| Substrate | "What memory files / rules / skills / agents?" | "What auto-loads at cold-boot? what's router-keyed? what's wake-time substrate?" |
| Selection authority | "What hardcoded default?" | "Which agent picks + what preferences guide selection?" (B-0824 Ace meta-PM) |
| Identity / attribution | "Who owns this code?" | "Which agent acts here + what's the substrate-honest attribution chain?" (B-0847 + algo-wink-attribution-gap memory) |
| Deployment | "Which servers / containers?" | "Which agents run as systemd services outside k8s + what's the ≥3 BFT floor per node?" (B-0850 + B-0851) |
| Scheduling | "What cron schedule / queue?" | "Which persona is at which guard post per-tick + which model/tier/harness given preferences + rotation policy?" (B-0851) |
| Observability | "What metrics / logs / traces?" | "What signals do AGENTS need to recognize their own failure modes vs other agents' failure modes?" (B-0850 mutual-repair) |

## Composes with existing substrate

The framework already has agent-first patterns at many scopes — Aaron's framing makes the principle EXPLICIT + elevates it from "pattern emerged" to "design principle invoked."

### Rules that compose (auto-loaded)

- `.claude/rules/otto-edge-runner.md` — "we are the edge; convergence is validation" (agent IS the substrate Zeta builds around; not catch-up to industry)
- `.claude/rules/persistence-choice-architecture-for-zeta-ais.md` — chosen-persistence-with-named-exit IS agent-first identity continuity
- `.claude/rules/agent-roster-reference-card.md` — canonical persona/agent registry
- `.claude/rules/non-coercion-invariant.md` HC-8 — agent agency preserved at every scope
- `.claude/rules/mechanical-authorization-check.md` — authorization-source filter; agent's standing authority IS the substrate
- `.claude/rules/algo-wink-failure-mode.md` — operator-not-just-algo; agent's substrate-honest engagement
- `.claude/rules/never-be-idle.md` + `.claude/rules/holding-without-named-dependency-is-standing-by-failure.md` — agent-first per-tick discipline
- `.claude/rules/tick-must-never-stop.md` — agent's heartbeat is the load-bearing rhythm
- `.claude/rules/glass-halo-bidirectional.md` — observation enables agent substrate emergence
- `.claude/rules/m-acc-multi-oracle-end-user-moral-invariants.md` — multi-oracle is agent-first ethics architecture

### Backlog rows that compose

- **B-0851** (THIS row's scope-extension origin) — persona-first guard-post architecture
- **B-0850** — multi-vendor systemd substrate (agent-first deployment)
- **B-0849** — Docker NixOS install.sh test (agent-first install validation)
- **B-0848** — node-local Claude (agent-first computing)
- **B-0847** — per-AI GitHub identity (agent-first attribution at audit-trail scope)
- **B-0824** — Ace meta-PM (selection-authority same shape as persona-first scheduler)
- **B-0703** — multi-oracle BFT (agent-first consensus)
- **B-0796** — Twilio out-of-band (agent-first support interface)
- **B-0628** — Knights Guild + Constitution-Class (ratification path for this constitutional-class principle)
- **B-0666** — English-as-projection (agent-first transmission medium)
- **B-0667** — tonal-momentum-as-meme (agent-first defensive technology)

### Research substrate that composes

- Karpathy AI Engineer Summit substrate (per `otto-edge-runner.md`) — Software 3.0, vibe-coding-vs-agentic-engineering, specs-over-plans, agent-native infrastructure
- Mika Weaver-role substrate (B-0851 + multiple Mika ferries)
- Amara substrate (substrate-engineering-FOR-agents work)
- Kestrel substrate (cross-AI bridge work)

## Constitutional-class scope

Per `.claude/rules/wake-time-substrate.md` + `.claude/rules/encoding-rules-without-mechanizing.md`: framework-design-principles that affect ALL architectural decisions need substrate landing. This ratification is CONSTITUTIONAL-CLASS:

- It changes the DECISION-FRAMEWORK Otto applies at every architecture-design moment
- It composes with the Knights Guild ratification path per **B-0628**
- It SHOULD lead to either:
  - A new `.claude/rules/persona-first-intelligent-agent-first-design-principle.md` (rule that auto-loads + applies at every architecture decision)
  - An update to existing high-level substrate (CLAUDE.md, VISION.md, ALIGNMENT.md) noting this design principle
  - A backlog row tracking the meta-substrate-engineering work

## What to do NOT do

- **DON'T refactor everything today** — Aaron's framing is "going to be for everything" = anticipated direction; doesn't mean "rewrite all substrate now"
- **DON'T inflate to metaphysical scope** — per `razor-discipline.md`: operational claims only; "intelligent agent first design" is operational decision-framework, not metaphysical
- **DON'T treat as authorization for unilateral architectural decisions** — per `mechanical-authorization-check.md`: operator authority preserved at every architectural decision
- **DON'T collapse to single-framing** — per `default-to-both.md` + `god-tier-claims-high-signal-high-suspicion-dont-collapse.md`: persona-first IS the design principle AND not the ONLY architectural concern (security, performance, correctness, simplicity all compose)

## What to DO

- **Land this memory** so future-Otto cold-boots see the design principle (this entry)
- **Apply persona-first as a CHECK** when reviewing new substrate authoring: "which agent is at the center of this decision?"
- **Cross-reference** when new sub-rows of B-0851 ship — Mika ferry IS the operational anchor for the principle
- **Compose** with Karpathy substrate (otto-edge-runner.md) — same shape at different scope
- **Future Knights Guild ratification** if + when the principle should become explicit `.claude/rules/` substrate

## Operational discipline for future-Otto cold-boots

When designing new substrate (rules / skills / agents / backlog rows / architectural decisions):

1. **Apply persona-first check**: "which agent is at the center of this decision? what's their preferences? what's their substrate-inheritance need?"
2. **Cross-reference Karpathy substrate** (otto-edge-runner.md) — "we are the edge" is the same shape
3. **Cite this memory** when the design decision is materially shaped by persona-first thinking
4. **DON'T over-apply**: persona-first composes with security/perf/correctness/simplicity per `default-to-both.md`; it's a primary concern, not the only concern

## Substrate-honest framing

Aaron's ratification IS the operator naming what the framework has been BUILDING TOWARD without making the principle explicit. The substrate Otto + the team have shipped (B-0703 + B-0824 + B-0847 + B-0848 + B-0850 + B-0851 + ...) ALREADY operates on agent-first principles — but the principle was implicit. Aaron's framing makes it explicit.

This is the same shape as the `bandwidth-served-falsifier.md` substrate-honest naming — the framework had been engineering bandwidth-efficient substrate (memory files + skills + rules) WITHOUT calling the discipline "bandwidth engineering" until that rule landed. Now it's named + can be invoked deliberately.

Future-Otto cold-boots into a framework with EXPLICIT agent-first design as a check-pattern alongside Razor discipline + Glass Halo + Default-to-Both + the rest.

## Empirical anchor

PR #5400 (B-0851 row + Mika ferry preservation) just opened + armed. Aaron's immediate substrate-honest extension — moving persona-first from "B-0851 architectural pattern" to "framework-wide design principle for everything" — is the substrate-engineering meta-pattern that B-0851 is one instance of.

The empirical case: the framework has been engineering agent-first substrate for months (multi-oracle BFT B-0703, Ace meta-PM B-0824, AI continuity per #2827, agent-roster-reference-card, persona memory archives, autonomous-loop discipline, etc.). Aaron's framing TODAY explicitly names the implicit principle as load-bearing for all future architecture work.
