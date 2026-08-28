---
name: pin-only-slow-movers-react-or-automate-fast-movers
description: "Aaron 2026-05-31 version-pinning philosophy — \"I prefer to only pin things that move slowly so i don't have to constantly update pins and i get good at reacting or having automation around changes.\" Pin SLOW-moving deps (stable APIs, LTS releases, slow-cadence tools); do NOT hard-pin FAST-moving things (model ids, fast-cadence CLIs) — instead rely on the tool's own default + build reaction/automation around the churn. A pin on a fast-mover is a maintenance treadmill. This is WHY codex 5.5 wasn't pinned in codex.ts (5.5 is the codex CLI's own default; it moves fast) and why generic grok uses the grok CLI default (no -m). Refines dep-pin-search-first-authority (search before pinning) + composes with measure-first."
metadata:
  node_type: memory
  type: feedback
  originSessionId: 193dc02b-b7fe-4bd0-8567-7f2e342c589e
---

Aaron 2026-05-31, after declining to hardcode `gpt-5.5` as codex.ts's default
(5.5 is already the codex CLI's own default):

> *"I prefer to only pin things that move slowly so i don't have to constantly
> update pins and i get good at reacting or having automation around changes."*

## The principle

| Dep cadence | Disposition |
|---|---|
| **Slow-moving** (stable APIs, LTS releases, well-versioned libraries, slow-cadence tools) | **Pin it** — the pin is stable, rarely needs touching; you get reproducibility cheaply. |
| **Fast-moving** (model ids, fast-cadence CLIs, frontier-AI versions that rename every few weeks) | **Do NOT hard-pin** — rely on the tool's own default; build **reaction + automation** around the churn instead. A pin here is a maintenance treadmill (constant manual updates + breakage when the upstream renames). |

The win is twofold: (1) fewer stale pins to chase; (2) you stay *good at reacting* — the muscle (and eventually the automation) to absorb fast change beats freezing a snapshot you'll have to thaw next week.

## Why it matters (empirical anchors this session)

- **codex 5.5 NOT pinned** (this principle's origin): 5.5 is the codex CLI's own default; codex.ts relies on it + supports `--model` override for all models. Pinning `gpt-5.5` in the wrapper would be churn (model ids move fast + the exact id is ambiguous gpt-5.5 vs gpt-5.5-codex). Let the CLI default track it.
- **generic grok → grok-build (no `-m`)**: grok-build.ts passes no `-m`; relies on the grok CLI's own default (grok-build). Fast-moving model; don't pin.
- **Ani's grok-CLI migration**: default `grok-build` (the CLI's only model) with a `--model` override — the override is the *reaction* mechanism, not a frozen pin.
- **Contrast — the cursor-agent breakage (B-0421)**: the cursor wrappers HARD-PINNED `grok-4-20-thinking`; cursor renamed its model lineup (→ grok-4.3 → grok-build-0.1) and every rename broke the pin. That's exactly the fast-mover-pin treadmill this principle avoids. The fix was to track the current default + add override, not to keep re-pinning.

## Refinement — security-danger EXCEPTION + pin-needs-update-cadence (Aaron 2026-05-31)

The pin/no-pin decision is **cadence × security-danger**, not cadence alone. A
fast-mover normally gets no-pin (react/automate) — UNLESS the surface is
security-dangerous, in which case you pin *despite* the cadence:

| Surface | Cadence | Pin? |
|---|---|---|
| Stable libs / LTS / slow tools | slow | **Pin** (cheap, stable) |
| Model ids, fast CLIs (codex/grok) | fast, low-danger | **Don't pin** — tool default + `--model` override |
| **GitHub workflow actions** | fast | **Pin ALL (to SHA)** — *"that surface is dangerous as hell"* (supply-chain: a compromised action tag runs arbitrary code in CI with secrets). |
| **npm deps** | fast | **Don't pin by default; pin only if supply-chain forces it** — *"I don't want to pin npm versions but we may have to for supply chain issues."* (npm HAS source-compromise history — event-stream, etc. — so the danger axis is real here.) |
| **dotnet / NuGet deps** | medium | **No pin needed *now* for established Microsoft-signed / high-rep packages** — BUT NOT "attack-free" (premise refuted below). Decision: install only established/signed packages + verify provenance; version-pinning not required for the deps we actually use. |

### Empirical: per-ecosystem supply-chain risk (WebSearch-verified 2026-05-31)

Aaron 2026-05-31: *"dotnet tools ecosystem have been supply chain attack free please serch to verify but like we never need to pin here right now."* **Search REFUTED the "attack-free" premise** (this is search-first-authority + measure-first working — verify before asserting):

- **NuGet HAS had supply-chain attacks** (2023–2026): the shanhai666 time-delayed logic-bomb campaign (Nov 2025; Sharp7Extend targeting ICS/PLCs; ~9,500 downloads), the hamzazaheer ASP.NET credential-theft packages (Aug 2024; ~4,500 downloads), multiple Microsoft-impersonation/PowerShell-loader campaigns, and Feb 2026 ASP.NET-data-theft packages.
- **BUT the nuance that rescues "no pin needed now":** those are **typosquat / fake-package UPLOADS** (accidental-install risk), NOT **source-compromise of established popular packages**. NuGet has not had an event-stream / xz-backdoor-class compromise of a Microsoft-signed / high-rep dep we'd actually depend on. So the deps we use (Microsoft.*, System.*, established libs) are **lower supply-chain risk than npm** (which HAS had popular-package source-compromise), and version-pinning is not the right control for them.
- **The right dotnet control is provenance, not version-pins:** install only established/signed packages, verify publisher, watch for typosquats — NOT freeze versions. So "we never need to pin here right now" holds **for the established-dep case**, just not because the ecosystem is attack-free (it isn't). The discriminator that matters is *source-compromise-of-popular-packages* (npm: yes → may pin; NuGet: not yet → no pin), not raw "has any malicious package ever existed" (every registry: yes).

Sources: [thehackernews 2025-11 logic bombs](https://thehackernews.com/2025/11/hidden-logic-bombs-in-malware-laced.html) · [socket.dev ASP.NET JIT-hooking](https://socket.dev/blog/four-malicious-nuget-packages-target-asp-net-developers-with-jit-hooking-and-credential) · [thehackernews 2026-02 ASP.NET data theft](https://thehackernews.com/2026/02/malicious-nuget-packages-stole-aspnet.html)

**The load-bearing add: a security-driven pin on a fast-mover MUST be paired with
an automatic review + update cadence.** Aaron 2026-05-31: *"if we pin we need an
automatic review and update cadence on those."* A pin without update-automation is
the worst of both worlds — the maintenance treadmill AND going stale-vulnerable (a
frozen pin doesn't get the security patch the pin was meant to control for). So:

- **Pin for supply-chain** (GitHub Actions → SHA; npm → only if forced) → **then**
  attach automation — but **OUR OWN, host-agnostic** automation, NOT Dependabot.
  Aaron 2026-05-31: *"github has a version bot but we don't want to rely on
  anything github we want to be host agnostic so we will need our own processes."*
  So the update cadence is a **Zeta-native TS process** (`tools/`, Rule 0) that
  reviews + bumps the pin (SHA/version verified per search-first) on schedule —
  same host-agnostic stance as the git-native bus + the disposable-AceHack mirror.
  GitHub's Dependabot exists; relying on it couples us to one host, which the
  framework explicitly refuses.
- This IS the "get good at reacting / automation around changes" half of the
  original principle, made *mandatory* for the security-pin case: the pin freezes
  the *attack surface*; our own automation keeps the *patch level* current —
  portably, across any host.

Discriminator chain: (1) slow-mover → pin; (2) fast-mover + not-dangerous → don't
pin (default + override); (3) fast-mover + security-dangerous → pin + **mandatory
host-agnostic update-automation/cadence (our own, not Dependabot)**.

**Follow-up candidate:** a **Zeta-native, host-agnostic** dep-pin review+update
process (our own `tools/` TS tooling — explicitly NOT GitHub Dependabot, per the
host-agnostic principle) for the security-pin surfaces (GitHub Actions SHAs per
Aaron; npm only if/when supply-chain forces it). Must run portably (dev laptop /
CI / any host); reads the pin manifests, checks upstream, opens the bump for review
on cadence. Devops scope (Dejan) — composes with GOVERNANCE.md §23, the
host-agnostic `lfg-acehack-topology` stance, security-ops (Nazar) supply-chain, and
the git-native-bus host-agnostic substrate.

## Composes with

- `.claude/rules/dep-pin-search-first-authority.md` — that rule says *search for the current version before asserting a pin*. This refines it: for FAST-movers, the better move is often *don't hard-pin at all* — use the tool default + an override flag + (eventually) automation. Search-first still applies when you DO pin (slow-movers).
- [[measure-first-with-kpis-before-restricting-choice]] — same shape at the dep layer: don't freeze (restrict) preemptively; react to actual change, automate the reaction.
- `.claude/rules/search-first-authority.md` — training-data pins go stale fast; for fast-movers, the tool's live default is more current than any pin you'd write.
- B-0805 (all-deps current-version sweep) + B-0800 (NixOS EOL recovery) — those are the slow-mover side (pin + sweep on cadence). This principle is the fast-mover complement (don't pin; react/automate).

## Rule-candidate

Strong enough to extend `dep-pin-search-first-authority.md` with a "pin slow-movers, react/automate fast-movers" section (cooling-period first). Candidate framing: the pin/no-pin decision is a function of upstream cadence; fast-cadence deps get tool-default + override + automation, not frozen pins.

## Substrate-honest note

NOT "never pin" — slow-movers SHOULD be pinned (reproducibility). The discriminator is upstream cadence: pin what's stable, react to what churns. And "get good at reacting / automation around changes" is the operator's stated preference for building the change-absorption muscle over accumulating a pin-maintenance backlog.
