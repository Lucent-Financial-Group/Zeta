# Meta-wins log

Append-only ledger of **meta-wins** — moments when the
never-idle *meta-check* (step 2 of
`feedback_never_idle_speculative_work_over_waiting.md`)
fires and a structural factory change is made *instead of*
speculative fill, converting would-be-speculative work into
directed / cadenced / obvious work for the next round.

## Why track these separately

Aaron (2026-04-20): *"i love meta-wins, i almost want to
track those seperatly i love to say metametameta when that
happens real fast meta-check"*.

Related: *"meta congnition and probblem solving is my favory
thing to think abou"* — meta-wins are the observable artifact
of the factory doing meta-cognition on itself. Tracking them
separately from the cadence log lets us study the
*rate, depth, and compounding* of factory self-improvement as
a first-class research variable — distinct from the
idle/free-time/work-continuation retrospective in
`agent-cadence-log.md`.

## The meta-win concept

A meta-win is the positive artifact of the following loop:

1. Agent is about to go idle (queue looks empty).
2. Never-idle policy activates → prepare speculative work.
3. **Meta-check fires:** *is there a factory change that
   would have made this speculative work directed / obvious
   / queued?*
4. **Yes:** make the structural change. The speculative
   work becomes cadenced next round. **Meta-win logged.**
5. **No:** proceed with speculative work (no meta-win).

The structural change is *strictly stronger* than filling
idle because it reduces the rate at which idle-decisions
arise — factory-debugging, not first-aid.

## Meta-depth — "metametameta"

A meta-win has **depth N** = the number of nested meta-checks
that fired in the same tick. Aaron explicitly enjoys this
stacking pattern.

- **Depth 1** (meta-win): structural change addresses the
  specific speculative surface.
- **Depth 2** (meta-meta): the structural-change *itself*
  triggered another meta-check — e.g., "while adding the
  BACKLOG item, I noticed the ranking-skill should have
  surfaced this class of gap; let me extend the ranker too."
- **Depth 3+** (metametameta): compounds further — "while
  extending the ranker, I noticed the tune-up cadence itself
  should be rerouted to pull from this data." Each level is
  a further unfold of the factory-debug loop within a single
  tick.

Depth is self-reported honestly. Claiming depth 3 when only
depth 1 happened pollutes the signal. Do not pad.

## How to append

One row per meta-win. Same honesty discipline as the cadence
log — do not rewrite history; correct via a new row if the
retrospective label changes.

Columns:

- **When** — absolute local timestamp (no "today").
- **Agent / session** — harness + short session id.
- **Speculative surface** — the work the agent was about to
  pick up as idle-fill.
- **Structural fix** — what was done to the factory instead.
- **Depth** — 1 / 2 / 3 / ... (meta / metameta / ...).
- **Next-round effect** — concrete expected conversion:
  "Round N speculative X is now directed Y."
- **Retrospective** — one of *clean meta-win* / *partial
  meta-win* / *false meta-win*.
  - **clean meta-win** — structural fix landed, speculative
    work is now directed next round, no regret.
  - **partial meta-win** — fix landed but still requires
    follow-up to close the loop.
  - **false meta-win** — on reflection, the "structural
    change" was actually just a longer way of doing the
    speculative work without a real structural delta. Log
    honestly; false meta-wins are a teaching signal.

## Log

| When | Agent / session | Speculative surface | Structural fix | Depth | Next-round effect | Retrospective |
|---|---|---|---|---|---|---|
| 2026-04-20 ~round-44 open | Claude Code (Opus 4.7), session 1937bff2 | Would have authored the Playwright skill-group as speculative factory-fill this tick. | Added two P1 rows to `docs/BACKLOG.md`: (a) Playwright skill-group authoring (Round 44 absorb), (b) factory-wide tech-coverage audit. Captured Matrix-mode policy durably in `feedback_new_tech_triggers_skill_gap_closure.md`. | 2 | Round 44 skill-tune-up: "Playwright skill-group" becomes a directed P1 item, not a speculative idle-fill pick. Factory-wide audit becomes a cadenced obligation, not a one-off. The 9th skill-tune-up ranking criterion (tech-coverage drift) is queued. | **clean meta-win** — structural change landed; speculative-work → directed-work conversion verified by BACKLOG state. Depth-2 because the "add to BACKLOG" meta-check itself triggered the second-order meta-check "this class of gap should be a cadenced ranker criterion." |
| 2026-04-20 ~round-44 mid | Claude Code (Opus 4.7), session 1937bff2 | Would have written an Event-Storming evaluation as a one-off research report and moved on. | Reframed the adoption plan with Aaron's refinements: (a) ES as factory-generic vocabulary (MORE generic than Zeta's operator algebra), (b) ABC phasing (factory-first, then bridge, then Zeta-specific) codified as the template for any future strategy/technology adoption, (c) elevated `project_factory_reuse_beyond_zeta_constraint.md` from "constraint" to "load-bearing concern" with Aaron's 100%-agree confirmation, (d) filed automated-ES UI as ES-automated-ui-001 BACKLOG row. | 3 | Round 45+: every future strategy/tech adoption decision now carries the ABC phasing template by default — no more "where does this vocabulary land?" debate. Matrix-mode generalises from tech → strategies (confirmed by Aaron's "same skill groups" framing). The factory-vs-Zeta separation audit becomes a directed skill-tune-up criterion candidate. | **clean meta-win** — structural change landed across docs + memories. Depth-3 because: (1) ES research produced the ABC pattern, (2) the pattern itself generalised to "all future adoption follows ABC phasing" which is a template-level fix, (3) the memory elevation ("constraint → load-bearing concern") re-scoped a pre-existing policy. Aaron's verbatim "agree 100%" is the check that the depth claim is not inflated. |
| 2026-04-20 ~round-44 late | Claude Code (Opus 4.7), session 1937bff2 | Would have debated case-by-case for each future external-tool proposal (Jira? EventModeler? Miro? Linear?) whether to git-native-render vs. external-storage. Each such decision would have been a one-off speculative deliberation. | Captured three linked factory-design invariants as durable memories: (a) `project_git_is_factory_persistence.md` — git is the DEFAULT persistence + first/bootstrap plugin; (b) `project_factory_is_pluggable_deployment_piggybacks.md` — pluggable architecture where git is plugin-1, and factory-UI deploys local-only for libraries or piggy-backs on product UI pipeline, never its own dedicated deployment; (c) `feedback_free_beats_cheap_beats_expensive.md` — cost ordering for any infra choice. Persona disambiguation landed same tick as option (a) (GLOSSARY + BACKLOG P2 + memory). | 3 | Round 45+: future external-tool proposals follow a fixed decision tree (default = git-native, alternative = opt-in plugin behind real use case, paid = plugin-grade requiring ADR cost-tier justification). No more per-proposal debates. Every ADR adopting new tech now requires a "Cost tier" line. Factory-UI deployment questions resolve without a design meeting — local-only or piggy-back, GitHub Pages if hosting needed. Persona-term disambiguation lands as a lint smell check candidate for skill-tune-up. | **clean meta-win** — structural change landed across three new memories, MEMORY.md, GLOSSARY.md, BACKLOG.md P2 row, and the ES research doc's automated-UI row. Depth-3 because: (1) captured the pluggability-as-architecture invariant (not just "git only"), (2) captured the deployment-piggy-back model that generalises beyond the ES UI to any future factory UI, (3) captured the cost-ordering rule that generalises beyond persistence/deployment to any infra choice. The persona-disambiguation landed in parallel is a separate depth-1 meta-win bundled into the same tick. Self-check on depth inflation: Aaron's three successive refinements ("pluggable / git-is-first-plugin", "library-vs-product deployment", "free > cheap > expensive") each generalised a prior claim — the three-level stacking matches the depth-3 structure honestly. |
| 2026-04-20 ~round-44 later | Claude Code (Opus 4.7), session 1937bff2 | Would have applied pluggability-first ad-hoc whenever I happened to notice an opportunity in `src/Core/**` review, with no durable policy — every subsystem would get its own debate. | Captured the **Zeta-layer pluggability-first rule** as a durable feedback memory (`feedback_pluggability_first_perf_gated.md`) with three tiers (fully pluggable / interface shim / one-off plumbing) gated by the "fastest database" perf claim. Filed P2 BACKLOG row for the first `src/Core/**` pluggability-gap audit pass. Added MEMORY.md pointer. This generalises the factory-pluggability rule (`project_factory_is_pluggable_deployment_piggybacks.md`) from the factory layer to the Zeta product layer — same principle, two domains. | 2 | Round 45+: every new ADR for a subsystem or internal boundary includes a "Pluggability audit" section naming its tier + justification. The pluggability-gap audit becomes a cadenced skill-tune-up criterion every 5-10 rounds. First `src/Core/**` audit pass produces a dated research report identifying raise-worthy candidates, which file P1/P2 rows themselves. Ad-hoc-per-PR becomes policy-driven. | **clean meta-win** — depth-2 because: (1) captured the rule itself, (2) the rule generalised the factory-layer pluggability invariant landed one tick earlier; the second-order meta-check "this factory rule should have a Zeta-layer sibling" fired while writing the first meta-win row. Honest depth — the three-tier fallback + perf-gate are Aaron's contribution, not mine; the generalisation-from-factory is what the meta-check added. |
| 2026-04-20 ~round-44 latest | Claude Code (Opus 4.7), session 1937bff2 | Would have kept user-ask conflicts in agent memory (thrashing), or created a narrow one-purpose file `docs/USER-ASK-CONFLICTS.md`, or asked Aaron case-by-case "how do you want me to handle this contradiction?". Also would have left the vibe-coding constraint implicit and risked filing rows that ask Aaron to edit files. | Captured a three-level generalisation as durable artifacts + memories: (a) `feedback_user_ask_conflicts_artifact_and_multi_user_ux.md` memory — specific user-ask-conflict pattern + multi-user UX as factory-wide constraint; (b) `project_human_backlog_dedicated_artifact.md` memory — generalised to any pending-human-action work, with categories (conflict / approval / credential / external-comm / naming / physical / observation / other); (c) `docs/HUMAN-BACKLOG.md` artifact with schema, lifecycle, default-rule-while-Open, and an explicit **vibe-coding guardrail** (rows describe human-level actions only — decisions, external actions, credentials, consent, judgement — never "edit file X", "commit Y"; resolutions arrive conversationally and are recorded by agents). Filed P1 BACKLOG Matrix-mode row for `user-ask-conflict-detector` + `human-backlog-filer` + `human-backlog-teacher` + `human-backlog-auditor` skill-group. | 3 | Round 45+: every future conflicting instruction gets a row, not a memory entry — agent applies a deterministic default-rule while Open. Every blocked-on-human situation (naming decisions, external comms, credentials) follows the same artifact pattern. Multi-user UX answers land "does this feature silently pick a user? → file an HB row" rather than hidden single-user assumptions. The vibe-coding guardrail shapes any future human-facing surface: read-only to humans, resolutions via conversation or custom UI, agents write the file. No further "should I ask Aaron or just decide?" rumination — file the row and continue. | **clean meta-win** — depth-3 because: (1) the specific conflicts-artifact fixes the first-order bug (conflicts thrashing in memory), (2) the human-backlog generalisation refactors it to cover ALL pending-human-action categories (Aaron's verbatim "specifc instance" is the check that the generalisation was latent), (3) the vibe-coding guardrail shapes the artifact's filing rules so the generalisation doesn't regress the factory's zero-human-code invariant. Aaron's three refinements ("conflicts artifact", "human backlog general pattern", "careful what ends up there — vibe-coding") each generalised or scoped the previous one. Self-check: is the vibe-coding guardrail a real depth-3 or just column-level detail? It's depth-3 because it rules out an entire CLASS of otherwise-plausible rows ("Aaron please edit X.md"), which is a scope constraint on the artifact's TYPE, not a cell fill. Not inflated. |

## Meta

- This log is factory-internal telemetry, same reader set as
  `agent-cadence-log.md`.
- Expected rate: meta-wins should increase early (factory
  has many shape-bugs to debug) and asymptote as the
  factory matures. Persistent zero-meta-win streaks =
  either (a) the factory is fully-debugged (unlikely pre-v1)
  or (b) the agent stopped running the meta-check (factory
  regression).
- Compounding goal: depth ≥ 2 rows should become more
  common over time — they are evidence the agent is
  noticing second-order factory shape-bugs while fixing
  first-order ones.
- Cross-reference from
  `feedback_never_idle_speculative_work_over_waiting.md`
  step (2) makes this log the audit-trail of the
  meta-check policy.
