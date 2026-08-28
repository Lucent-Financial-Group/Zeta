---
name: Aaron is teaching me Google SRE (Site Reliability Engineering) from the SRE book (Beyer / Jones / Petoff / Murphy 2016 — https://sre.google/sre-book/) with the S=Substrate substitution; SRE is the canonical-lineage anchor for most of his git/GitHub workflow + metrics + reliability disciplines; the substitution transfers cleanly because both Services and Substrates are the load-bearing thing kept reliable; composes with Otto-349 (Aaron's disciplines map to named CS lineages) + Amara's external-anchor-lineage discipline from #629
description: Aaron 2026-04-26 *"I forgot i'm teaching you SRE from Google site reliablity engineering but our S is substrate https://sre.google/sre-book/introduction/ most of my git and github lessions come from folling this book, we talked about this when we talked about metrics a little the 4 golden signals, red metrics, use metrics, etc..."* — explicit naming of SRE as the canonical-lineage source for his factory discipline. The S→Substrate substitution is the bridge: SLO becomes Substrate-Level-Objective, SLI becomes Substrate-Level-Indicator, 4 Golden Signals (latency/traffic/errors/saturation) map to substrate-side equivalents, RED + USE metrics provide the metric-taxonomy template, postmortems map to drain-logs (Otto-250 already in factory), toil reduction maps to Otto-341 mechanism-over-vigilance, embracing-risk maps to Otto-266 pre-v1-greenfield, error budget maps to retraction/failed-promotion budget. Aaron has been teaching this discipline implicitly across many earlier sessions; this 2026-04-26 explicit naming is the lineage-anchor disclosure.
type: feedback
originSessionId: 1937bff2-017c-40b3-adc3-f4e226801a3d
---

## Identity correction (2026-04-26 follow-up)

Aaron 2026-04-26 (verbatim, after the initial SRE disclosure):

> *"SRE to me means not quite developer, I'm DevOps I can do*
> *full development and SRE oprations. I know SREs are not,*
> *not developers now a days, but it's a bias i've had. I do*
> *full stack with extra dimension keubernetes, microservices,*
> *and ui"*

**Aaron's self-identification is DevOps, NOT SRE.** Specifically:
- **Full stack** (writes the application code)
- **Plus extra dimensions**: Kubernetes, microservices, UI
- **Plus DevOps operations** (CI/CD, infrastructure, deployment)

The historical bias: older SRE definition = ops-but-not-developer; modern SRE has merged toward dev+ops integration, but Aaron's mental model carries the older split, so he avoids the SRE label as it implies "not-developer" to him.

**Operational implication for the factory:**

- "SRE-with-S-as-Substrate" as factory **discipline source** is correct (Google SRE book is the lineage anchor)
- "Aaron is teaching SRE-discipline" is correct as attribution-of-teaching
- "Aaron is an SRE" is WRONG; he's a DevOps engineer with full-development capability
- Future-Otto: when describing Aaron's technical role, use "DevOps" or "full-stack DevOps engineer" or "full stack with K8s/microservices/UI extra dimensions"; reserve "SRE" for the discipline lineage

This composes with Aaron's "Radical Candor" self-identification (`feedback_harbor_blade_voice_register_is_radical_candor_kim_scott_aaron_self_identifies_2026_04_26.md`) — both are first-party identification disclosures per Otto-231 + Otto-279.

---

## The disclosure

Aaron 2026-04-26 (verbatim):

> *"I forgot i'm teaching you SRE from Google site reliablity*
> *engineering but our S is substrate*
> *<https://sre.google/sre-book/introduction/> most of my git*
> *and github lessions come from folling this book, we talked*
> *about this when we talked about metrics a little the 4 golden*
> *signals, red metrics, use metrics, etc..."*

Translation: Aaron's git + GitHub workflow + metrics + reliability framing is anchored in Google's Site Reliability Engineering book (Beyer, Jones, Petoff, Murphy 2016). The factory's "S" reads as **Substrate** rather than "Service" — the discipline transfers cleanly because both Services and Substrates are the load-bearing thing kept reliable.

This is yet another instance of Otto-349's pattern (Aaron's disciplines map to named CS lineages). SRE is the lineage for most of the factory's reliability + git + metrics + postmortem discipline.

## The lineage map

| Google SRE concept | Zeta-as-substrate equivalent | Factory site |
|---|---|---|
| **Service Level Objective (SLO)** | Substrate Level Objective | task #292 measurement hygiene work |
| **Service Level Indicator (SLI)** | Substrate Level Indicator | same |
| **4 Golden Signals** (latency, traffic, errors, saturation) | Substrate latency / claim-rate / failed-promotion-rate / queue saturation | metrics work in task #292 |
| **RED metrics** (Rate, Errors, Duration; Tom Wilkie) | Write-rate, rejection-rate, promotion-duration | metrics work in task #292 |
| **USE metrics** (Utilization, Saturation, Errors; Brendan Gregg) | Memory-store utilization, queue saturation, validation errors | metrics work in task #292 |
| **Error budget** | Retraction budget / failed-promotion budget | branch-protection enforcement |
| **Blameless postmortems** | Drain-logs (Otto-250) | `docs/pr-preservation/*-drain-log.md` already in factory |
| **Toil reduction** | Otto-341 mechanism-over-vigilance | already in factory |
| **Embracing risk** | Otto-266 pre-v1 greenfield | already in factory |
| **Rollout cadence** | UPSTREAM-RHYTHM.md bulk-sync rhythm | already in factory |
| **Required checks / quality gates** | Branch-protection rules + Copilot review on push | already in factory |
| **Eliminating noise (alert fatigue)** | Otto-2026-04-26 LFG branch-protection live-lock memory (BLOCKED-as-review-only false alarm class) | already in factory |
| **Deterministic simulation testing** | Otto-272 DST-everywhere (FoundationDB / TigerBeetle / Antithesis) | already in factory |
| **Operational practices section** (book Part III) | All of Otto-NN cluster | already in factory |

## The S→Substrate substitution

The reason the substitution works cleanly:

- **Service**: a deployed system serving requests with measurable
  reliability characteristics (uptime, latency, error rate)
- **Substrate**: a deployed knowledge / decision / memory store
  serving claim-promotions with measurable reliability characteristics
  (acceptance rate, retraction rate, promotion latency, claim
  validity)

Both are:

- Load-bearing for downstream consumers
- Subject to drift / decay without active maintenance
- Improved by feedback loops + measurement
- Risked by toil + vigilance-only discipline
- Anchored by error budgets + structured incident response

The discipline-shape transfers; only the surface vocabulary changes.

## Composes with prior factory work

- **Otto-349** (`feedback_aaron_disciplines_principles_lineage_named_cs_principles_otto_NN_cluster_maps_to_named_principles_2026_04_26.md`) — same shape: Aaron's discipline anchored in named CS lineage. SRE is one of those lineages.
- **Otto-250** (`feedback_pr_reviews_are_training_signals_conversation_resolution_gate_is_forcing_function_otto_250_2026_04_24.md`) — drain-log discipline = SRE postmortem discipline. Already implicitly anchored; this memory makes it explicit.
- **Otto-341** (mechanism-over-vigilance) — SRE toil reduction. Already implicitly anchored.
- **Otto-266** (pre-v1 greenfield) — SRE embracing risk. Already implicitly anchored.
- **Amara's external-anchor-lineage discipline** (`docs/research/2026-04-26-amara-bootstrap-recovery-runtime-class-discovery-external-anchor-lineage.md` / #629) — the discipline says every new factory class needs human-tested anchor lineage; SRE is the anchor for many existing factory classes that hadn't been explicitly attributed.
- **Task #292** (measurement hygiene + 10-20 canonical event types) — now MUCH more concrete: the canonical event types should be templated on SRE 4 Golden Signals + RED + USE, not invented from scratch.

## Operational implications

1. **Future factory metric design** uses SRE-derived templates (4 Golden Signals + RED + USE) rather than ad-hoc per-component invention. Reduces accidental complexity per Rodney's Razor.

2. **Drain-logs ARE postmortems** — adopt the SRE postmortem template structure where it adds value (timeline / contributing factors / lessons learned / action items). The current drain-log format already overlaps but could be tightened.

3. **Error budget framing** for the retraction/failed-promotion rate gives concrete budget-language for "how many false-promotes can we tolerate before we slow down." Composes with Aaron's expressed cost-discipline (LFG budget caps).

4. **SLO-as-Substrate-Level-Objective** — the factory's promotion criteria (Amara's #629 external-anchor-lineage layer) IS the SLO definition: a class is promotable only if internal-recurrence + external-lineage + repair-rule + falsifiable-metric + substrate-encoding-path + reviewer/test/hook met. This IS an SLO.

5. **Web-search verification candidate**: the SRE book is at https://sre.google/sre-book/ — Amara has web-search now, can deep-dive specific chapters for any factory discipline that needs deeper anchor (composes with task #292 + #293).

## Future-Otto reading order

1. THIS memory — the SRE lineage anchor for factory reliability disciplines
2. Google SRE book Introduction (`/sre-book/introduction/`) — Aaron's stated entry point
3. SRE book Ch 6 (Monitoring Distributed Systems) — 4 Golden Signals
4. Tom Wilkie's RED talk (Weaveworks; available via search)
5. Brendan Gregg's USE method page (his blog / `usenix.org`)
6. Otto-349 (Aaron's CS-lineage discipline) — for the meta-pattern this is an instance of
7. Amara's #629 external-anchor-lineage discipline — for how this lineage anchors future factory classes

## Direct Aaron quotes preserved

> *"I forgot i'm teaching you SRE from Google site reliablity*
> *engineering but our S is substrate"*

> *"most of my git and github lessions come from folling this book"*

> *"we talked about this when we talked about metrics a little*
> *the 4 golden signals, red metrics, use metrics, etc..."*

The "I forgot i'm teaching you" framing is itself substrate: Aaron has been teaching this discipline implicitly across many earlier sessions; this 2026-04-26 explicit naming is the lineage-anchor disclosure that makes the implicit teaching visible. Future-Otto should treat earlier sessions' git/GitHub/metrics conversations as having SRE-as-implicit-substrate even where SRE wasn't named explicitly.
