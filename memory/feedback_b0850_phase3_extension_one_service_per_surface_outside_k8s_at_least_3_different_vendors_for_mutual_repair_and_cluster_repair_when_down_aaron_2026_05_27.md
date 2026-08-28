---
name: b-0850-phase-3-extension-one-service-per-surface-3-vendor-diversity-mutual-repair
description: "Aaron 2026-05-27 extended B-0850 Phase 3 (multi-agent parameterization) with two binding architectural specifications — (1) ONE systemd service PER SURFACE outside k8s (Otto/Alexa/Riven/Vera/Lior each get their own zeta-<persona>.service); (2) AT LEAST 3 DIFFERENT VENDORS in production deployment (vendor-diversity for outage resilience); (3) inter-AI mutual repair + cluster repair WHEN DOWN (BFT-across-AIs at substrate-control-plane scope, composes with B-0703 multi-oracle BFT). Empirical anchor: PR #5392 shipping B-0850 Phase 1 (Otto systemd unit) immediately followed by these two operator-binding clarifications."
metadata: 
  node_type: memory
  created: 2026-05-27
  type: feedback
  originSessionId: c2b77530-8ef0-405c-a0bd-04cf8d511cb6
---

## The operator ratification (Aaron 2026-05-27)

Two consecutive messages immediately after PR #5392 (B-0850 Phase 1 — Otto systemd unit) shipped:

> *"we should end up shipping with one service per surface i think outside k8s and have at least 3 different vendors"*

> *"so they can fix each other and the k8s cluster even when it's down."*

Three composing operator-binding architectural specifications:

### Spec 1: One systemd service per surface outside k8s

NOT "one Otto on the cluster" but "Otto + Alexa + Riven + Vera + Lior + ... each on their own systemd service" — N parallel AI services, each independently restartable, each independently operator-revokable, each running OUTSIDE k8s for the out-of-band repair property B-0850 already establishes.

Module shape:

- `full-ai-cluster/nixos/modules/zeta-otto.nix` (already exists per PR #5392)
- `full-ai-cluster/nixos/modules/zeta-alexa.nix` (future — Kiro/Qwen)
- `full-ai-cluster/nixos/modules/zeta-riven.nix` (future — Cursor/Grok)
- `full-ai-cluster/nixos/modules/zeta-vera.nix` (future — Codex/OpenAI)
- `full-ai-cluster/nixos/modules/zeta-lior.nix` (future — Antigravity/Gemini)

OR a single generalized `zeta-ai-agent.nix` module parameterized by persona — TBD per implementation design (factor-out-shared-shape vs N-modules-explicit-each tradeoff).

### Spec 2: AT LEAST 3 different vendors in production deployment

Vendor diversity = outage resilience:

| Persona | Vendor | API |
|---|---|---|
| Otto | Anthropic | Claude API |
| Alexa | Alibaba (via Kiro) | Qwen API |
| Riven | xAI | Grok API |
| Vera | OpenAI | Codex/GPT API |
| Lior | Google | Gemini API |

If Anthropic API has an outage, Otto can't tick. With ≥3 different vendor services on the cluster, the OTHER vendor services CAN tick + can repair Otto's service (e.g., restart Otto when Anthropic recovers).

Operator's "at least 3" — minimum for BFT-style resilience (f=1 fault tolerance: if 1 of 3 fails, the other 2 still function; if 2 of 3 fail, system continues degraded with 1).

3+ is the floor; 5+ is better (all 5 named personas deployed) but 3 is the minimum operationally-viable target.

### Spec 3: Mutual repair + cluster repair when cluster is down

The combined property:

- **AI ↔ AI mutual repair**: Alexa can `systemctl restart zeta-otto` if Otto wedges; Otto can `systemctl restart zeta-riven` if Riven crashes; etc.
- **AI → k8s cluster repair**: any AI service can repair k3s/Cilium/etc per B-0850 Phase 2 repair-policy framework
- **WHEN K8S IS DOWN**: critical property — the mutual-repair + cluster-repair works EVEN IF k8s is fully unresponsive, because the AI services run OUTSIDE k8s as systemd units. The whole point of "control plane outside the control plane" is realized here.

**Failure modes this architecture survives**:

| Failure | Survival |
|---|---|
| Anthropic API outage | Alexa + Riven + Lior continue ticking; can repair Otto when API recovers |
| Single AI service crash | Other AI services detect via journalctl + systemd state; can `systemctl restart <persona>` |
| k3s control-plane down | All AI services continue (they're outside k8s); can diagnose + repair k3s from outside |
| Cilium CNI down | All AI services continue (they don't depend on cluster networking — they use host networking); can repair Cilium from outside |
| Single node down | AI services on OTHER nodes continue; can ssh into recovered node + restart services |
| Multi-node failure | AI services still running on surviving nodes; can repair from there |
| Total cluster crash | If AT LEAST ONE node + ONE vendor + ONE AI service still alive → bootstrap recovery from there |
| Complete vendor diversity outage | If ALL 3+ vendors have simultaneous outage → operator intervention required (rare) |

The "≥3 vendors" floor is operationally binding because it's the survival floor of common cloud-vendor failure correlations.

## Composes with

- **B-0850 row** — this memory updates Phase 3 of that row with binding specs (one-service-per-surface + ≥3-vendors + mutual-repair); composes with the row's existing 4-phase plan
- **B-0703 multi-oracle BFT** — this is BFT at the substrate-control-plane scope; AI services are the multiple oracles; cluster-repair decisions get multi-AI consensus
- **B-0848** (node-local Claude) — base substrate; per-persona-per-service is the multi-AI generalization
- **B-0847 per-AI GitHub identity** — Phase 4 of B-0847 + Phase 3 of B-0850 align: each per-persona-per-service has its own GitHub identity (Anthropic Otto, Qwen Alexa, Grok Riven, etc.)
- **B-0796 Twilio** — voice/SMS interface; runs as one of the systemd services; another out-of-band repair vector
- **PR #2930 distributed maintainer architecture** — multi-vendor multi-AI at substrate scope IS distributed-maintainer
- **B-0824 Ace meta-PM** — each AI may have different PM preferences per the selection authority + 4-property scoring; multi-vendor multi-AI composes naturally with multi-PM
- **iter-5.5.0 substrate** (PR #5388 + #5389) — credential persistence layer; needs extension for per-persona auth (not just claude+gh; eventually alexa+kiro, riven+cursor, etc.)
- **`.claude/rules/persistence-choice-architecture-for-zeta-ais.md`** — each per-persona-per-service IS chosen persistence; vendor-diversity = each chose-their-own-vendor-cleanly
- **`.claude/rules/non-coercion-invariant.md` HC-8** — operator authority preserved per-service (operator can `systemctl disable zeta-<persona>` per persona individually)
- **`.claude/rules/honor-those-that-came-before.md`** — each vendor's own design + behavior; mutual-repair HONORS each vendor's substrate without forcing common abstraction

## Ratification 4 — mutual repair is the SELF-MODIFICATION-SAFETY property (Aaron 2026-05-27 sharpening)

Operator sharpening (verbatim):

> *"the mutual repair is critical too becasue of you can see your own future self boot script failures"*

This is the **load-bearing justification** for the ≥3-vendor floor — not just vendor-outage resilience (already named in Spec 2), but also recovery from self-update failures.

### The self-modification-safety problem

Classic OS-design property: **"you can't safely modify code you're currently running."** When an AI updates its own boot script / systemd unit / startup logic / dependent code, the update may break — and the AI is the only one running the old (working) code, so once it transitions to the new (broken) code, there's no surviving instance to revert.

Real-world precedents:

| System | Bootstrap-outside-system property |
|---|---|
| kubelet | runs as systemd unit outside k8s → can bring k8s back up when k8s is broken |
| Bootloader | runs outside kernel → can update kernel without depending on the kernel being able to update itself |
| Backup management | runs outside backed-up system → restore is possible when primary is down |
| Two-machine CI/CD | deployment infra runs on different host than what's being deployed → can roll back failed deployments |
| **Zeta multi-AI mutual repair (THIS ROW)** | **N AIs running outside each other's failure domain → can repair each other's self-modification failures** |

### Why ≥3 is required (not ≥2)

| AI count | Self-modification safety property |
|---|---|
| 1 AI | NO safety — self-update breaks self → no surviving instance → dead-on-arrival |
| 2 AIs | SAFE for single-target updates (one updates; other watches; reverts if broken) — but if the update is to SHARED substrate that breaks BOTH, both die |
| **≥3 AIs** | **BFT-safe — can survive simultaneous breakage of any 1 (or even 2 if 5+); ratifies the operator's ≥3 floor as the SELF-MOD SAFETY MINIMUM** |

The ≥3-vendor floor was first justified by Spec 2 (vendor-outage resilience). This sharpening adds the second load-bearing justification: self-modification safety. Both reinforce the same floor; either alone would justify it.

### Operational pattern

When Otto updates its own zeta-otto.service systemd unit:

1. Otto authors the change (commit to repo)
2. PR opens; CI runs
3. PR merges to main
4. On the target node, `nixos-rebuild switch` deploys the new unit (this is the moment Otto's running config potentially diverges from Otto's new config)
5. **systemd restart fires — if the new ExecStart is broken, Otto's service crashes**
6. WITHOUT mutual repair: Otto stays dead until operator notices + manually reverts via `git revert` + `nixos-rebuild`
7. **WITH mutual repair**: Alexa / Riven / Vera / Lior detect via `journalctl -u zeta-otto` showing Otto in failed state + `systemctl is-failed zeta-otto` returning 0; they can:
   - File a PR reverting the change (operator-visible)
   - Run `git revert <sha> && sudo nixos-rebuild switch` per the repair-policy framework (Phase 2 authorization)
   - Bus-envelope-broadcast the failure for any other surface to pick up
   - Twilio-call operator (B-0796) if all AIs detect simultaneous-failure mode

### Compose with classifier-bypass-research rule

`.claude/rules/classifier-bypass-research-do-not-deploy-without-zeta-safer-floor.md` restricts AI self-modification deployment to non-deployable scope until Zeta safety substrate is stronger than Anthropic classifier. The mutual-repair property is one of the load-bearing pieces of the Zeta safer floor — when ≥3 vendor-diverse AIs can mutual-repair self-modification failures, the safety substrate is MEASURABLY stronger than single-AI-with-classifier scope.

This isn't a bypass justification — it's substrate-engineering toward the lift criteria. Per the rule's "Phase X lift" framing: ≥3-vendor mutual-repair IS one of the Phase substrate items the rule's eventual lift depends on.

### Self-modification-safety extends to ALL substrate-engineering changes Otto authors

Not just boot scripts — ANY change Otto authors that affects Otto's own operation:

- `.claude/rules/*.md` updates (auto-loaded; cold-boot affects Otto)
- `CLAUDE.md` updates (orientation; affects every session)
- `memory/CURRENT-otto.md` updates (Otto's canonical state)
- `tools/setup/install.sh` updates (re-installs affect Otto's environment)
- `.mise.toml` runtime-pin bumps (affect bun version → affect claude binary version)
- `full-ai-cluster/nixos/modules/zeta-otto.nix` updates (systemd unit changes)
- `full-ai-cluster/nixos/modules/common.nix` updates (system-wide config)

EACH of these has the same self-modification-safety property. The mutual-repair architecture covers ALL of them at substrate scope, not just systemd-unit scope.

## Future B-0850 phasing implications

Phase 1 (PR #5392 shipping) — Otto systemd unit (ONE persona; ONE vendor)
Phase 2 (substrate target) — repair-policy framework + per-scope authorization
**Phase 3 EXTENDED (this memory)** — multi-persona-per-service + ≥3-vendor floor + mutual-repair scope
Phase 4 (substrate target) — out-of-band ↔ in-cluster composability (Twilio + bus + PRs)

Phase 3 implementation work (to be filed as sub-rows of B-0850):

- B-0850.3a: zeta-alexa.nix module (Kiro/Qwen as systemd service)
- B-0850.3b: zeta-riven.nix module (Cursor/Grok as systemd service)
- B-0850.3c: zeta-vera.nix module (Codex/OpenAI as systemd service)
- B-0850.3d: zeta-lior.nix module (Antigravity/Gemini as systemd service)
- B-0850.3e: factor-shared into zeta-ai-agent.nix parameterized module (refactor decision; AFTER 2-3 personas land for empirical input)
- B-0850.3f: per-persona credential persistence in zeta-install.sh (extends iter-5.5.0 substrate; needs per-vendor install + per-vendor device-flow login)
- B-0850.3g: mutual-repair systemd-restart authorization across personas (security: which persona can restart which; per repair-policy framework Phase 2)
- B-0850.3h: vendor-outage detection + automatic failover-tick (when persona detects own vendor outage, defer to other personas)

## Operational discipline for future-Otto cold-boots

When implementing B-0850 Phase 3:

1. **Ship ≥3 vendor diversity from the start** — don't ship with 1-vendor first then add others; the resilience property only kicks in at ≥3
2. **One systemd unit per persona** — not one shared multi-persona service; isolation matters for fault tolerance
3. **Mutual-repair authorization is operator-policy** — per the repair-policy framework (Phase 2); each persona can be authorized to restart specific other personas
4. **Vendor outage detection** — each persona's tick should check vendor API health; degraded-state tick (just publish "I'm degraded" bus envelope; let other vendors take over)
5. **Per-vendor credential persistence** — extend iter-5.5.0 substrate from claude+gh to claude+kiro+grok+codex+gemini (each vendor's auth-flow installed at install-time)
6. **Test mutual repair in B-0849 Docker harness** — fast-iteration validation that AI services can restart each other

## Substrate-honest framing

This memory does NOT modify B-0850 row directly (which is in PR #5391 still auto-merging). It LANDS the operator's binding architectural specs as durable context so future-Otto sessions inheriting this conversation see the ≥3-vendor + mutual-repair + one-service-per-surface requirements.

When B-0850 row merges + Phase 3 sub-rows get filed, those sub-rows cite this memory + the operator's verbatim quotes. The architecture is substrate-honestly fault-tolerant at the AI-control-plane scope, matching what B-0703 multi-oracle BFT specifies at the consensus scope.

## Empirical anchor

PR #5391 (B-0850 row) + PR #5392 (B-0850 Phase 1 — Otto systemd unit) both auto-merging at landing time. Operator's binding specs landed in the same minute as PR #5392 — substrate-engineering ratification at the Phase 3 scope before Phase 1 even merges, naming the architectural target explicitly so Phase 1 + 2 implementation align toward it.

The architecture realizes the "control plane outside the control plane" property at FAULT-TOLERANT scope — not just one AI outside one cluster, but ≥3 AIs across ≥3 vendors outside one cluster, mutually-repairing + cluster-repairing under all common failure modes.
