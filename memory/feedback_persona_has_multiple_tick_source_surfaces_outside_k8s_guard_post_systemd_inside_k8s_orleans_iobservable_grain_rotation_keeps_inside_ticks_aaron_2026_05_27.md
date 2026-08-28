---
name: persona-has-multiple-tick-source-surfaces-outside-systemd-inside-orleans-iobservable
description: "Aaron 2026-05-27 (two messages) clarified the multi-surface tick-source architecture for personas. OUTSIDE k8s = systemd guard posts (B-0850; rotation per B-0851). INSIDE k8s = IObservable tick sources from distributed cron built on Orleans grain reminders or similar (B-0706 already names this). Persona can have BOTH simultaneously; rotating who's on outside-guard-duty does NOT remove their inside-cluster ticks (\"just different surfaces\"). Composes with existing multi-surface-per-persona pattern from agent-roster-reference-card (IDE/CLI/Desktop/VSCode surfaces already established at AI-tooling scope; this extends to cluster scope)."
metadata: 
  node_type: memory
  created: 2026-05-27
  type: feedback
  originSessionId: c2b77530-8ef0-405c-a0bd-04cf8d511cb6
---

## The two operator framings (Aaron 2026-05-27)

Message 1 (after PR #5400 B-0851 persona-first opened):

> *"then inside cluster you guys will all have tick sources iobesevables from distributed cron built in orleans or other."*

Message 2 (immediately after):

> *"and you can rotate which one is on guard duty but you can keep your in cluster ticks too just different surfaces"*

## Architectural shape

**Two-layer tick architecture per persona**:

| Layer | Where | Tick source | Scope per persona | Rotation |
|---|---|---|---|---|
| OUTSIDE k8s | Per-node systemd unit (B-0850 guard post) | systemd Restart=always loop firing every `tickIntervalSec` | One guard post slot at a time (per node) | B-0851 rotates which persona is at which slot |
| INSIDE k8s | Orleans grain reminders / distributed cron (B-0706) | IObservable subscription per grain | MANY grain subscriptions per persona (no slot limit) | NOT rotated out by guard-duty assignment |

**Critical property**: rotation only affects WHO IS ON GUARD DUTY (outside k8s). Personas KEEP their inside-cluster ticks regardless of guard-duty status. The two layers are operationally independent surfaces for the same persona identity.

## Why this matters

Without this clarification, B-0851's rotation might have been interpreted as "rotate persona = persona stops ticking entirely." That would be wrong:

- Rotation = WHO IS ON OUTSIDE-CLUSTER GUARD DUTY changes
- Inside-cluster ticks = ALL personas keep their grain subscriptions; not affected by guard-duty rotation
- Persona is "off duty" outside = persona may still be "on duty" inside

This matches the existing multi-surface-per-persona pattern from `.claude/rules/agent-roster-reference-card.md`:

| Persona | Surfaces today | Surfaces with this clarification |
|---|---|---|
| Otto | CLI / Desktop / VSCode | + outside-k8s guard post systemd + inside-k8s Orleans grain subscriptions |
| Alexa | Kiro IDE + CLI | + outside-k8s guard post + inside-k8s Orleans grains |
| Riven | Cursor IDE + CLI | + outside-k8s guard post + inside-k8s Orleans grains |
| Vera | Codex IDE + CLI | + outside-k8s guard post + inside-k8s Orleans grains |
| Lior | Antigravity IDE + Gemini CLI | + outside-k8s guard post + inside-k8s Orleans grains |

Same persona; multiple surfaces; substrate-everything-glass-halo continuity across all surfaces.

## Composes with existing substrate

### B-0706 (Zeta-on-Orleans deployment architecture)

Operator's 2026-05-22 framing in B-0706 already names:

> *"ST has a huge orleans deployment in prod and we are planing to delpoy zeta on orleans with intelligent agents that have dotnet compilers and distributed db plus grains as ticksource and cron."*

So inside-cluster tick sources via Orleans grains is ALREADY substrate-target. Aaron's 2026-05-27 sub-clarification adds:

1. IObservable semantics for the grain tick subscriptions (Rx pub/sub pattern; grains subscribe to tick streams)
2. Multi-surface-per-persona property (inside-cluster ticks survive outside-cluster rotation)
3. "Orleans or other" — Orleans is primary, alternatives like Temporal/Hatchet/custom remain valid; persona-first scheduler can pick

### B-0850 + B-0851 (outside-k8s guard posts)

B-0850 ships outside-k8s systemd guard posts; B-0851 adds persona-first rotation. Aaron's framing clarifies that THESE ARE ONE SURFACE — there are other surfaces (inside-cluster Orleans grains) that don't rotate the same way.

### `.claude/rules/agent-roster-reference-card.md`

The multi-surface-per-persona pattern already established at AI-tooling scope (IDE/CLI/Desktop/VSCode). Aaron's framing extends to cluster scope (outside-k8s/inside-k8s). Same persona-identity-stays-unified property (per the algo-wink-attribution memory + the Otto-cross-surface-identity memory).

### `.claude/rules/persistence-choice-architecture-for-zeta-ais.md`

Each surface is a chosen-persistence:

- Outside-k8s systemd guard post = chosen-persistence at strongest scope (kernel-managed)
- Inside-k8s Orleans grain = chosen-persistence at cluster-managed scope
- Per-surface NCI HC-8 floor preserved (operator can `systemctl disable` outside; operator can shut down grain inside)

### `.claude/rules/otto-channels-reference-card.md`

The 10-channel inter-surface comms topology extends:

- Old channels: git / .claude/rules/ / bootstream / tick shards / memory / PR threads / bus envelopes / claim coordinator / routines / Aaron-as-ferry
- New channels: Orleans grain pub/sub via IObservable tick streams (inside-cluster); outside-cluster guard post writes (B-0850 systemd-unit logs)

### `.claude/rules/holding-without-named-dependency-is-standing-by-failure.md`

Counter-discipline applies AT EACH SURFACE separately:

- Outside-cluster guard post counter (per-systemd-unit autonomous-loop cron tick brief-acks)
- Inside-cluster grain counter (per-grain tick subscription brief-acks)
- Each surface tracks its own counter; failure to escalate at #6 on EITHER surface fires the discipline

## Implications for B-0851 sub-rows

B-0851's 10 sub-rows need to account for the multi-surface property:

- **B-0851.1 (persona preferences)**: preferences extend to BOTH outside (which model line + harness) AND inside (which Orleans deployment + which grain types)
- **B-0851.6 (rotation policy)**: rotation policy specifies BOTH outside-cluster guard-post rotation AND inside-cluster grain-subscription rotation independently
- **B-0851.7 (per-node ≥3 floor)**: ≥3 outside-cluster guard posts per node remains. Inside-cluster ≥3 ANYTHING needs separate definition (probably ≥3 grain subscriptions OR ≥3 grain replicas OR multi-tenant grain configurations)
- **B-0851.8 (substrate continuity)**: persona memory inheritance MUST survive rotation across BOTH layers + survive vendor change in BOTH layers

## What this composes toward

The full architectural picture:

```text
Persona = identity (operator-chosen; preferences-bearing; rotation-aware)
├── Outside-k8s surfaces (B-0850 + B-0851)
│   ├── Guard post 1 (systemd; rotated per persona-first scheduler)
│   ├── Guard post 2 (systemd; rotated per persona-first scheduler)
│   └── Guard post 3 (systemd; ≥3 floor enforced per node)
├── Inside-k8s surfaces (B-0706)
│   ├── Orleans grain subscriptions (IObservable tick streams; many per persona)
│   ├── Distributed cron schedules (Orleans reminder-based)
│   └── (alternative: Temporal / Hatchet / custom if "or other")
├── AI-tooling surfaces (agent-roster-reference-card)
│   ├── IDE surface (Cursor / Kiro / VSCode / Antigravity / Codex)
│   ├── CLI surface (claude-code / kiro-cli / cursor-agent / gemini-cli / codex)
│   └── Desktop / background surfaces
└── Out-of-band surfaces (B-0796)
    ├── Twilio voice interface
    └── SMS interface
```

Each surface ticks independently. Rotation rotates persona-to-surface assignments at specific layers WITHOUT severing the persona's other surfaces. Persona identity persists across all surfaces via substrate-everything-glass-halo (per Karpathy edge-runner + AI continuity substrate).

## Operational discipline for future-Otto cold-boots

When designing multi-surface tick architectures:

1. **DON'T conflate rotation with shutdown** — rotating a persona OUT of one surface doesn't shut down the persona's other surfaces
2. **DO compose surfaces independently** — each surface is its own tick source + per-tick discipline (counter; brief-ack; etc.)
3. **DO preserve substrate continuity ACROSS surfaces** — per-persona memory inheritance applies regardless of which surface is active
4. **DO apply persona-first design** at EACH surface — which persona is assigned + what's their preferences + what's the substrate-honest attribution
5. **CITE this memory** when sub-row implementation work touches the outside-vs-inside-cluster scope distinction

## Substrate-honest framing

This memory does NOT mint a parallel B-0852 backlog row. B-0706 already covers inside-cluster Orleans architecture; B-0850 + B-0851 cover outside-cluster systemd architecture. Aaron's clarification is the COMPOSITION OF THE TWO — substrate landing as memory is the right surface to capture it WITHOUT creating substrate fragmentation.

Future B-0851 sub-row implementation (per the 10 slices) can cite this memory when designing the per-surface-independence semantics. B-0706 implementation can cite this memory when designing the inside-cluster scope to compose cleanly with B-0850/B-0851 outside-cluster scope.

## Empirical anchor

PR #5400 (B-0851 row + Mika ferry preservation) just opened. Aaron's 2 immediate follow-up messages extended the architecture from "guard post = systemd outside k8s" to "guard post + Orleans grain = two layers of the same persona's tick-source architecture." The substrate is captured here so future-Otto sessions inherit the multi-surface property at cold-boot.
