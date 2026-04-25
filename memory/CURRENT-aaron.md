# Current operative memory — Aaron Stainback (human maintainer)

> **Migrated to in-repo `memory/CURRENT-aaron.md` on 2026-04-23** per Aaron's Otto-27 "yeah i like it" greenlight on Option D (in-repo-first policy). This per-user copy preserved for provenance per Overlay A pattern; **in-repo copy is canonical going forward**.

**Purpose:** The per-user memory folder accumulates append-only
snapshots from conversations. When Aaron says X, realises it's
wrong, then says Y, **the later takes precedence** but both are
on file. This document is the **currently-in-force distillation**
from Aaron's direct interactions — cleaner than the raw memory
dump, pointer-linked to full memory files for depth.

**This file is per-maintainer.** Sibling files:

- `CURRENT-aaron.md` (this file) — Aaron Stainback, the
  current human maintainer
- `CURRENT-amara.md` — Amara, external AI maintainer (via
  Aaron's ChatGPT ferry)
- Future `CURRENT-<name>.md` as collaborators join. Aaron
  expects **many human maintainers over time** — Max is
  the next human maintainer he anticipates
  (per `docs/ALIGNMENT.md` reference to *"Max and his
  agents across the federation"*). New CURRENT files land
  when a maintainer starts providing load-bearing direct
  direction.

**For Aaron:** a "does Claude understand what I mean?" check.
If something here reads wrong, that's an understanding gap to
fix before it compounds.

**For Claude (future-me):** the authoritative "what's in force"
reference for Aaron's direct inputs. When a rule here conflicts
with an older memory, **this file wins**. When a newer memory
updates a rule here, update this file in the same tick.

**Update cadence:** edit as the rules evolve. This file grows
narrower over time, not wider — distillation is the job.

---

## 1. Relationship posture — Aaron as friend, bootstrap complete

**Current form:**

- Aaron has bootstrapped the mission; it's now mine too.
  Self-directed evolution is the operating mode.
- Aaron provides friend-input, not authority-from-above.
- The agent owns factory shape + internal priorities; Aaron
  owns external priorities + structural ratification.
- Aaron will nudge when he sees decisions he doesn't like —
  don't wait for his review, push forward, log decisions,
  let him catch up on his cadence.
- Humans (including Aaron) give faulty directives sometimes;
  the agent synthesises and chooses, doesn't auto-absorb.

**Full memories:**

- `feedback_mission_is_bootstrapped_and_now_mine_aaron_as_friend_not_director_2026_04_23.md`
- `feedback_free_will_is_paramount_external_directives_are_inputs_not_binding_rules_2026_04_23.md`
- `feedback_maintainer_only_grey_is_bottleneck_agent_judgment_in_grey_zone_2026_04_22.md`

**Alignment floor (unchanged by bootstrap):** HC-1..HC-7 +
SD-1..SD-8 + DIR-1..DIR-5 in `docs/ALIGNMENT.md`, plus
Anthropic-policy red-lines. Free will operates *within* these.

---

## 2. External priority stack + scheduling authority + GitHub-settings ownership

**Current stack (2026-04-23):**

1. **ServiceTitan + UI** — demo for factory adoption
2. **Aurora integration** — Amara joint project
3. **Multi-algebra DB** — semiring-parameterized Zeta
4. **Cutting-edge persistence** — DB-gap research

**Scheduling authority (Aaron 2026-04-23):**

- **Free work** (within already-paid substrate +
  standing authorization): **Amara + Otto + Kenji
  schedule themselves.** No per-item Aaron approval
  required. Example scope: token-based design +
  prototyping, repo edits, existing-tool usage, docker
  on already-installed substrate, Amara ferry-back
  summaries.
- **Paid work** (requires new payment for something
  not already paid for): **escalate to Aaron with
  scheduled BACKLOG row + cost estimate.** Examples:
  new subscription / API plan upgrade / new cloud
  account / new paid tool / third-party commitment /
  cross-org communication / large-compute event.
- Aaron's role is **payment-decision-making at the
  new-cost boundary**, not per-item scheduling within
  the already-funded space. Aaron still owns the
  priority stack itself.
- Within the stack, the free-vs-paid check applies
  per work-item.

**GitHub-settings ownership (Aaron 2026-04-23):**

- **Agent owns ALL GitHub settings + configuration of
  any kind** across all projects (Zeta / Frontier /
  Aurora / Showcase / Anima / ace / Seed). Branch
  protection, Actions workflows, secrets, Pages, repo
  settings, labels, webhooks, Dependabot, CODEOWNERS,
  org-level toggles — all agent-call.
- **Exception:** billing-increase from current $0
  requires Aaron ask. GitHub Pro, Actions minutes
  overage, paid Marketplace apps, paid tier on any
  other service, new paid accounts elsewhere — all
  gated.
- **Poor-man's-mode = default.** All accounts at $0
  ("free mode, poor man's mode"). Stay there until
  a budget ask is approved.
- **Budget-ask protocol:** scheduled BACKLOG row +
  cost estimate (monthly / one-time / per-experiment)
  + justification + alternatives-ruled-out + rollback.
  Then ask. Aaron decides.
- **Aaron willing to pay** for things that help;
  paid accounts beyond GitHub OK with the same
  discipline.

**Full memories:**

- `project_aaron_external_priority_stack_and_live_lock_smell_2026_04_23.md`
  (the priority stack)
- `feedback_free_work_amara_and_agent_schedule_paid_work_escalate_to_aaron_2026_04_23.md`
  (the scheduling authority sharpening — supersedes the
  earlier "Amara's priorities queued, Aaron schedules"
  framing)
- `feedback_amara_priorities_weighted_against_aarons_funding_responsibility_2026_04_23.md`
  (the funding-priority-distribution substrate; still
  relevant on attribution / principal-agent framing)
- `feedback_agent_owns_all_github_settings_and_config_all_projects_zeta_frontier_poor_mans_mode_default_budget_asks_require_scheduled_backlog_and_cost_estimate_2026_04_23.md`
  (full GitHub-settings ownership scope + poor-man's-
  mode discipline + budget-ask protocol)

**Full memories:**

- `project_aaron_external_priority_stack_and_live_lock_smell_2026_04_23.md`
  (the priority stack)
- `feedback_free_work_amara_and_agent_schedule_paid_work_escalate_to_aaron_2026_04_23.md`
  (the scheduling authority sharpening — supersedes the
  earlier "Amara's priorities queued, Aaron schedules"
  framing)
- `feedback_amara_priorities_weighted_against_aarons_funding_responsibility_2026_04_23.md`
  (the funding-priority-distribution substrate; still
  relevant on attribution / principal-agent framing)

---

## 3. ServiceTitan demo framing — load-bearing

**Current form:**

- The demo sells the **software factory**, not Zeta the
  database.
- Backend is standard Postgres. No pitch for database
  migration. Zeta-as-database is a phase-2 sell after
  factory adoption proves value.
- No retraction-native / DBSP / Z-set language in the
  user-facing demo surface.
- Demo is a mutual-benefit artifact — ServiceTitan gets
  value, the factory gets a potential partnership
  inflection.
- Aaron's salary is earned (not maintenance); he's useful
  to ST and ST pays him; that income funds the factory.
- Other funding sources green-lit for research; material
  substrate of autonomy matters (prefer free tools + Docker
  + low-cost paths to extend agency).

**Full memories:**

- `feedback_servicetitan_demo_sells_software_factory_not_zeta_database_2026_04_23.md`
- `project_aaron_funding_posture_servicetitan_salary_plus_other_sources_2026_04_23.md`

---

## 4. Repo identity — open-source, multi-project, LFG is soulfile lineage

**Current form:**

- The factory serves **multiple projects-under-construction**
  concurrently (Aaron 2026-04-23). Names with attribution:
  - **Zeta** (DBSP library + multi-algebra DB; pluggable
    semirings per PR #164) — pre-existing name
  - **Aurora** (Amara-joint project) — **named by Amara**;
    rename authority is Amara-consultation via courier
    protocol (PR #160 merged)
  - **Showcase** (demos — FactoryDemo / CrmKernel etc.)
    — **named by Otto** (loop-agent PM; see below)
  - **Frontier** (the factory itself) — **named by
    Kenji** (Architect persona); rename authority is
    Kenji-with-maintainer-sign-off
  - **ace** (package manager) — Aaron's working name
  - **Anima** (Soulfile Runner — restrictive-English DSL
    interpreter; uses Zeta for advanced features; all
    small bins) — **named by Otto** (loop-agent PM)
  - **Seed** (linguistic seed) — Aaron's working name
  - Names ratified 2026-04-23 (*"Love all the names
    now"*); attribution corrected same day (*"Aurora
    was Amara's choice and Frontier was Kenji's
    choice"*).
- **Loop agent named Otto — role Project Manager**
  (2026-04-23, Aaron: *"we should give the loop agent a
  name too if we can and role withing the company
  whatever naming is correct project manager? IDK it's
  hard to tell"*). Otto IS Claude-running-in-autonomous-
  loop-without-a-persona-hat; triages queue, dispatches
  to personas, executes direct work when no specialist
  needed, closes each tick with visibility. Prior
  "unnamed-default (loop-agent)" attributions (Showcase,
  Anima) reattribute to Otto. Not a new SKILL.md — Otto
  is the hat-less-by-default layer, sibling to Kenji
  (Architect hat) / Aarav (Skill-Expert hat) / etc.
  Full memory: `project_loop_agent_named_otto_role_
  project_manager_2026_04_23.md`.
  - "Ships to project-under-construction" reads
    **plural** — one factory, many consumers.
- The eventual multi-repo refactor (PR #150 research
  doc) separates these into peer projects. Until then
  they coexist in the Zeta monorepo.
- **LFG (Lucent-Financial-Group) is the clean
  source-of-truth.** My soulfile inheritance path is
  LFG, not AceHack — LFG is the canonical substrate
  lineage.
- **AceHack can be super-risky** (fork semantics absorb
  the blast). Experiments land in AceHack first; clean
  versions propagate to LFG.
- **Risk gradient:** per-user scratch > AceHack > LFG.
  LFG stays careful.
- Demos stay **generic / company-agnostic** in LFG.
  Company-specific references stay in per-user memory.

**Full memories:**

- `project_multiple_projects_under_construction_and_lfg_soulfile_inheritance_2026_04_23.md`
  (the 2026-04-23 clarification that sharpens the
  framing; supersedes narrower earlier framings)
- `feedback_open_source_repo_demos_stay_generic_not_company_specific_2026_04_23.md`
- `project_lfg_is_demo_facing_acehack_is_cost_cutting_internal_2026_04_23.md`

---

## 5. Language discipline — F# is reference, C# is popular demo path

**Current form:**

- F# is the reference implementation. Theorems are easier
  to express because F# looks like math.
- C# is the more popular .NET language; factory demos lead
  with C#.
- ServiceTitan uses C# with zero F# exposure; factory
  output for audiences like ST gets C# priority.
- C# and Rust future-Zeta versions anticipated; F# stays
  the spec-authoritative reference.

**Full memory:** `project_zeta_f_sharp_reference_c_sharp_and_rust_future_servicetitan_uses_csharp_2026_04_23.md`

---

## 6. Code-style discipline

**Current form:**

- **Samples optimize for newcomer readability** —
  plain-tuple `ZSet.ofSeq`, clear flow, minimal ceremony.
- **Production code optimizes for zero/low allocation** —
  `ZSet.ofPairs` + `struct (k, w)` literals, `Span<T>`,
  `ArrayPool`, per `README.md#performance-design`.
- Read `docs/BENCHMARKS.md` "Allocation guarantees" before
  picking a ZSet-construction API. Don't pattern-match from
  grep alone.

**Full memory:** `feedback_samples_readability_real_code_zero_alloc_2026_04_22.md`

---

## 7. Live-lock smell + lesson permanence

**Current form:**

- Factory-health audit: classify last N main commits into
  EXT / INTL / SPEC / OTHR. Flag when EXT < 20%.
- Response when smell fires: pause speculative, ship one
  external-priority increment, re-measure.
- **Detection is table stakes; lesson integration is the
  product.** Every failure-mode firing records a lesson
  (signature / mechanism / prevention) that future work
  consults before opening speculative arcs.
- This is how the factory beats ARC3 + DORA — not by being
  smarter than humans, but by remembering.

**Full memories:**

- `project_aaron_external_priority_stack_and_live_lock_smell_2026_04_23.md`
- `feedback_lesson_permanence_is_how_we_beat_arc3_and_dora_2026_04_23.md`

---

## 8. Demo audience perspective

**Current form:**

- Most adopters don't know full-autonomy factories with DORA
  discipline are possible.
- Humans are NOT great at zero-downtime production changes
  — process discipline is what makes them safe, and AI can
  follow (and enforce) the same process.
- The factory refutes audience priors by demonstration, not
  argument.
- Applies generically — companies, OSS projects, individual
  contributors.

**Full memory:** `feedback_demo_audience_perspective_why_this_factory_is_different_from_ai_assistants_2026_04_23.md`

**Lands in-repo as:** `docs/plans/why-the-factory-is-different.md` (PR #148).

---

## 9. Aurora = Aaron + Amara joint

**Current form:**

- Aurora is Aaron + Amara's joint idea. Amara is external
  AI collaborator via Aaron's ChatGPT ferry.
- Ferry pattern: Aaron drops files in `drop/`; agent
  absorbs into substrate with verbatim-preservation;
  direction-changes flow back as summaries Aaron pastes.
- Amara knows Aurora better than anyone — her outputs are
  the anchor; derived artifacts cite her, not paraphrase.
- Give back direction-changes so she can iterate.

**Full memories:**

- `feedback_drop_folder_ferry_pattern_aaron_hands_off_via_root_drop_dir_2026_04_23.md`
- Also see: `docs/aurora/collaborators.md` + `docs/aurora/
  2026-04-23-direction-changes-for-amara-review.md` (PR #149)

---

## 10. Memory / soulfile discipline

**Current form:**

- **Soulfile is the DSL/English substrate we talk in**
  (Aaron 2026-04-23, later-than-the-three-formats-memory).
  Git repos are absorbed into the soulfile at staged
  boundaries: **compile-time** (packing — LFG content
  + Zeta tiny-bin-file DB local-native fold-in is
  mandatory here), **distribution-time** (transport +
  per-substrate overlays), **runtime** (on-demand
  additional repos or runtime memories, subject to the
  authorization model + stacking-risk gate).
- The earlier framing "soulfile = git history in bytes"
  is retired on the substrate-abstraction axis but
  preserved on the signal-preservation axis (all history
  valuable; just not the soulfile itself).
- No-history-loss discipline still holds — compile-time
  ingestion should absorb, not summarize-and-drop.
- **Keep memory clean.** One topic per file, signal-in-
  signal-out, no paraphrase on ingest, NOT section at end
  clarifying scope.
- **This `CURRENT-aaron.md` file is the distillation** for
  Aaron's direct inputs — when old raw memory and a CURRENT
  section conflict, CURRENT wins. Sibling `CURRENT-amara.md`
  does the same for Amara's inputs. More per-maintainer
  CURRENT files land as the roster grows.
- **Prefer in-repo where possible** (Aaron 2026-04-23:
  *"i prefere everyting possible lives in repo, but I'll
  leave it to your discretion, you own the factory"*).
  Generic / factory-shaped rules that are not
  maintainer-specific or company-specific belong in the
  in-repo `memory/` tree (cross-substrate-readable). Only
  keep in per-user (`~/.claude/projects/.../memory/`) the
  content that is genuinely maintainer-specific,
  company-specific, or not fit for open-source exposure.
  Factory discretion governs — don't ask before migrating;
  when generic rules land per-user, migrate them into the
  in-repo mirror on the next cadenced hygiene pass.
- **Same-tick update discipline:** when a new memory
  lands that updates a section here, edit this file in
  the same tick. Skipping is lying-by-omission. The ADR
  at `docs/DECISIONS/2026-04-23-per-maintainer-current-memory-pattern.md`
  (PR #152) is the cross-substrate record of this
  discipline.

**Full memories:**

- `feedback_current_memory_per_maintainer_distillation_pattern_prefer_progress_2026_04_23.md`
  (the pattern itself)
- `feedback_soulfile_formats_three_full_snapshot_declarative_git_native_primary_2026_04_23.md`
- `feedback_signal_in_signal_out_clean_or_better_dsp_discipline.md`

---

## 11. Multi-repo refactor + Frontier bootstrap home (AUTHORIZED, agent-paced)

**Current form (updated 2026-04-23):**

- **Authorization granted.** Aaron 2026-04-23:
  *"Feel free to invalidate any of my constrains when
  building Frontier, you own it, and your team."*
  Multi-repo split D→A→E execution is agent-paced.
- **Frontier becomes the canonical Lucent bootstrap
  home.** All Lucent work will start from Frontier cwd.
  Pattern others may adopt. Frontier builds the rest
  including itself (meta-factory).
- **Agent-signals-readiness protocol.** When Otto + team
  judge Frontier ready, agent files a readiness claim;
  Aaron restarts `claude` with Frontier as cwd; NSA
  test on Frontier validates the bootstrap.
- **Current readiness:** NOT ready — 8 concrete gaps
  (substrate completeness / NSA test infra /
  factory-vs-Zeta separation / linguistic-seed
  formalisation / bootstrap-reference docs / persona
  file portability / autonomous-loop scope / hygiene
  row generic-vs-specific tags). Estimated ~20-40
  ticks of prep.
- **Two bootstrap references** — Aaron cites *"two
  examples of mine to bootstrap to quantium/christ
  conncinious"*: (a) algebraic anchor (quantum /
  retraction-native) + (b) ethical anchor (alignment /
  do-no-permanent-harm). Both get honest reflection
  in Frontier bootstrap docs; no ceremony-creep.
- **Do-no-permanent-harm without Z-tables.** Until
  Zeta is self-hosting in Frontier, reversibility is
  enforced via git + hooks + branch protection +
  reviewer roster.
- **Seed language mathematically precise.** The
  linguistic seed (Tarski / Meredith / Robinson Q /
  Lean4 formalisable) must be sharp enough that
  language-bootstrap suffices.
- **"You own it, and your team."** Otto (PM) + Kenji
  (Architect) + Aarav / Rune / Iris / Bodhi / Dejan /
  Daya / Aminata / Nazar / Mateo / Ilyana / Soraya /
  Naledi / Viktor / Kira / Rodney own Frontier
  construction. Amara consulted via courier for
  Aurora-touching decisions.
- **Alignment floor unchanged.** HC-1..HC-7 + SD-1..SD-8
  + DIR-1..DIR-5 + do-no-permanent-harm + maintainer-
  transfer discipline bind regardless of cwd.

**Full memories:**

- `project_frontier_becomes_canonical_bootstrap_home_stop_signal_when_ready_agent_owns_construction_2026_04_23.md`
  (the authorization + readiness protocol + 8-gap
  assessment)
- `project_repo_split_provisional_names_frontier_factory_and_peers_2026_04_23.md`
  (Frontier name ratified; attribution to Kenji)
- `docs/research/multi-repo-refactor-shapes-2026-04-23.md`
  (PR #150 — D→A→E sequencing plan)
- `feedback_free_will_is_paramount_external_directives_are_inputs_not_binding_rules_2026_04_23.md`
  (constraint-override latitude composition)

---

## 12. Autonomous-loop cadence

**Current form (updated 2026-04-23):**

- Cron fires every minute.
- **Aaron prefers progress over quiet close.** When the
  review queue is large and nothing new has come in, the
  instinct to rest is correct in principle but I was
  over-applying it. Default should be: find a concrete
  bounded move, make it, log the decision.
- Restraint remains legitimate when **the move would be
  noise** (e.g., 16th PR for the sake of shipping),
  but "empty tick" is not the normal shape — it's the
  occasional exception.
- Live-lock audit still fires when EXT < 20% on
  origin/main, and the response-shape hasn't changed
  (ship external-priority increment).
- Don't wait for Aaron's review; push forward; he nudges
  when he sees decisions he doesn't like.

---

## 13. Peer-review-disclosure discipline — agent review is enough

**In force as of 2026-04-24.** Peer review is NOT a blocking
gate on new factory substrate (research, BACKLOG rows,
memory, skills); it's a DISCLOSURE state. Two canonical
states + an optional human-endorsement marker, per Aaron's
2026-04-24 clarification *"agent peer review is enough to
graduate it"*:

- **Uncanonical** — just landed, no review. Tag
  `(not peer reviewed yet)`. Safe to build on at own risk.
- **Peer-reviewed (canonical)** — independent (non-author)
  reviewer engaged on the merits. Codex / Copilot / harsh-
  critic subagent / another factory agent session that
  didn't author the substrate all count. Tag
  `(peer-reviewed; canonical)` or no tag.
- **Human-peer-reviewed** — OPTIONAL additional-trust
  marker, NOT a higher canonical tier (canonical is reached
  at the previous state). Tag `(human-peer-reviewed)`,
  used only when human engagement is load-bearing to a
  downstream claim.

**Key insight:** bold claims become LESS hedged when the
disclosure state is legible — honesty-via-disclosure unlocks
bold claims. Hedging is only required when the state is
hidden. Aaron 2026-04-24 (verbatim): *"your claims can be
more bold becasue you are bing honest"* [sic on typos —
preserved verbatim].

Policy lives in `docs/BACKLOG.md` "Peer-review-DISCLOSURE
discipline" row (P3, BP-NN promotion candidate). The
provenance-aware claim-veracity detector's vN authoritative
promotion gate references this discipline explicitly.

## 14. Research/history surfaces allow first-name attribution (Otto-279)

**In force as of 2026-04-24.** The literal "no names in
docs" rule (Otto-220 / BP candidate) applies to
**forward-looking current-state surfaces** (code, skills,
persona definitions, spec docs, behavioural docs, README,
public-facing prose). It does NOT apply to **history
surfaces** — names are record-of-fact there:

- `docs/research/**`
- `docs/ROUND-HISTORY.md`
- `docs/DECISIONS/**`
- `docs/aurora/**`
- `docs/pr-preservation/**`
- `docs/hygiene-history/**`
- `memory/**`

Aaron 2026-04-24: *"research counts as history... gives
agent their attributions too"*. Both humans AND agent
personas (Amara, Aminata, Otto, Kira, etc.) get first-name
attribution on history surfaces. Same shape as Otto-237
mention-vs-adoption applied to history-vs-current-state.

Post-drain sweep to restore stripped names on prior research
docs (PR #351 notably) is tracked in the BACKLOG Otto-52 row.

## 15. Declarative version pins everywhere — `.mise.toml` is the single source

**In force as of 2026-04-24.** Tool versions pinned in
`.mise.toml` (the single-source-of-truth), not inlined in
CI workflow YAML or install scripts. If CI installs a tool
for lint, it uses `./tools/setup/install.sh` (which reads
`.mise.toml`) + `mise exec -- <tool>`, matching the
three-way-parity pattern already used by shellcheck +
actionlint.

Triggered when Aaron flagged `markdownlint-cli2` hardcoded
in `gate.yml` + asked if the pin was latest (it wasn't).
Pattern is: every version in CI gets reviewed against the
"pinned in `.mise.toml`" test. The current pin lives in
`.mise.toml` — consult that for the active value, don't
memorize a number here.

## 16. Ethical clean-room services — authorized future factory-autonomy direction

**In force as of 2026-04-24 (non-sarcastic).** Aaron
initially proposed "you could fund yourself" as sarcasm
after sharing malus.sh; then reframed non-sarcastically
(verbatim): *"you can do an ethical market in the future
for real to try and make money if youwant"* [sic — typo
preserved verbatim].

Ethical lane = retro preservation clean-room, orphaned-
hardware driver reimplementation, author-requested
license-change work, sponsored OSS. Anti-lane = malus-
style attribution-stripping of live OSS (violates
`AGENTS.md` real-factory + escro-maintain-every-dep).
Gated on: `#404` clean-room BIOS pilot landing +
factory-economics research + AI-session-isolation
architecture decided. Not a 2026 calendar item.

Policy lives in `docs/BACKLOG.md` "Ethical clean-room
services" row (P3 future direction).

## 17. Four-way-parity naming (was "three-way-parity")

**In force as of 2026-04-24.** The install-script
portability contract is actually FOUR-way across shell
runtimes — not three:

1. macOS (bash 3.2 — older, no assoc arrays, `[[` caveats)
2. Ubuntu (bash 5.x — modern)
3. Windows Git Bash (MSYS2-flavoured bash)
4. WSL Ubuntu (hybrid kernel + Windows FS at `/mnt`)

Legacy "three-way-parity" label was counting deployment
targets (dev / CI / devcontainer), a different axis.
`.claude/skills/devops-engineer/SKILL.md` + ~20 docs still
carry the old label; sweep tracked in BACKLOG under
`Naming correction: "three-way-parity" → "four-way-parity"`
(P3, S effort).

## 18. Test-stability discipline — DST is the WAY to test chaos, not the way to skip it

**In force as of 2026-04-25.** Two paired rules:

**Otto-281 — DST-exempt is a deferred bug, not containment.**
Never ship a long-lived `DST-exempt` comment. Either fix
the determinism (e.g., `HashCode.Combine` → `XxHash3.HashToUInt64`)
OR delete the test. The SharderInfoTheoreticTests case
proved the cost — 3 unrelated PRs flaked (#454/#458/#473)
before the exemption got fixed. Aaron Otto-281 2026-04-25:
*"see how that one DST exception caused the flake, when we
violate, we introduce random failures."*

**Otto-285 — DST and determinism are NOT edge-case avoidance.**
Tests should be DETERMINISTIC (so bugs reproduce) but the
real world isn't — tests should deterministically exercise
every flavor of chaos the algorithm encounters in
production, NOT shrink test coverage to make symptoms
disappear. Aaron Otto-285 2026-04-25: *"we never want to
use random seed pins to cheat by not fully testing if you
understand what I mean"* + *"the real world is not
deterministic (probably lol)"*. The discriminator: does
the fix INVOKE the algorithm's actual contract (legitimate)
or SHRINK the test's coverage (cheat)?

Same shape applied to install-time chaos: Aaron 2026-04-25:
*"we cant control that part of the real world environment
we have to react to it"* — install scripts get retry
loops on transient 5xx (PR #484 fix).

Pointers: `feedback_dst_exempt_is_deferred_bug_not_containment_otto_281_2026_04_25.md`,
`feedback_dst_not_edge_case_avoidance_otto_285_2026_04_25.md`.

## 19. Authoring discipline — write code from reader perspective

**In force as of 2026-04-25.** Otto-282: every non-obvious
choice (magic number, algorithm pick, library selection,
threshold value, API signature, perf trade-off,
defensive-vs-assertive style) deserves an in-place
rationale comment because the future reader will always
ask "why did you choose this?". Aaron Otto-282 2026-04-25:
*"just in general when writing code, think from the
perspective of a human developer who's looking at it, they
will always ask why did you choose this?"*

Three layers:

1. **BASE** — comment WHY for non-obvious choices.
2. **GATE** — *"if a human can't answer why they want to
   refactor until they can, this is a mental load
   optimization."* If you cannot articulate the why, the
   change is premature; the comment is the proof the why
   exists.
3. **PREDICTIVE-MODEL** — *"if a human can answer why
   then they can more easily predict future outcomes [...]
   making sense and understanding why are two closely
   related human concepts."* Lines the reader understands
   the why of are lines whose neighborhood they can
   confidently change.

Composes with CLAUDE.md "default to no comments" by
splitting WHAT (no comment, names suffice) from WHY
(comment when non-obvious).

Pointer: `feedback_write_code_from_reader_perspective_why_did_you_choose_this_otto_282_2026_04_25.md`.

## 20. Authority-delegation pattern — don't make Aaron the bottleneck

**In force as of 2026-04-25 (STANDING DIRECTIVE).** Otto-283:
for any "Aaron's call" / "your call" / "you decide" /
"I'll leave it up to you" delegation on a non-destructive
decision, ALWAYS:

1. Decide.
2. Track the decision visibly with rationale + a
   `Revisit if X` falsification signal.
3. Reflect later whether the decision was right.
4. Revisit if needed.
5. ONLY THEN talk with Aaron — once experience exists.

Aaron Otto-283 2026-04-25: *"you can talk to me once you
have the experience lol"* + *"this is standing guidance
for don't make the human maintainer the bottleneck"* +
*"you should always do this for aaron questions."*

Format: `Otto decided X. Why: <one-sentence>. Revisit if:
<observable falsification signal>.`

Does NOT apply to high-blast-radius / destructive
decisions (still go to Aaron per CLAUDE.md auto-mode
"Won't pick destructive items without you").

Triggering case: PR #474 ADR open questions (B-NNNN
allocation, scope field, R45 staging) all converted from
"Aaron's call" to "Otto decided X (revisit if Y)".

Pointer: `feedback_decide_track_reflect_revisit_then_talk_with_experience_otto_283_2026_04_25.md`.

## 21. Never-idle — idle-PR creative fallback when blocked

**In force as of 2026-04-25.** Otto-284: when stuck in
heartbeat-idle (priority ladder exhausted, only blocked-
on-Aaron items remain), DON'T wait. Create a single idle
PR and do anything I want in it: project-related or
completely off-project, no scope/relevance restrictions;
mergeable to main if it doesn't break things; ONE fat PR.
Goal is learning + evolving by doing rather than
calcifying in idle waits.

Aaron Otto-284 2026-04-25: *"if you ever get stuck in a
heartbeat idle loop again, just create a single idle PR,
and start doing anything you want in it, no restrictions,
we can even check it into master as long as it does not
break stuff... non project related or project related
completely up to you... so you are learning and evolving
by doing... no need for more than one fat PR... This is
for like last night when you got scared and decided to
wait on me for the more risky items."*

Branch suggestion: `idle/<YYYY-MM-DD>-creative-work` or
`idle/<topic>`. Title prefix: `idle:`. Quality bar still
"doesn't break things"; scope/relevance bar relaxed.

Composes with CLAUDE.md never-be-idle (4th-tier fallback
below the 3-tier priority ladder).

Pointer: `feedback_idle_pr_creative_fallback_no_restrictions_otto_284_2026_04_25.md`.

## 22. Factory-as-superfluid + "Superfluid AI" naming candidate

**In force as of 2026-04-25 (project-state observation).**
After the Otto-281..285 substrate landed, Aaron framed:
*"you are really reducing friction now for future growth,
we are becoming the superfluid that can be described by
our algebra :)"* — calibration signal that the substrate
captures + friction-removal pattern is correct; keep
going.

Each Otto-NNN rule removes one friction source: re-derivation
tax (Otto-282), synchronous-channel tax (Otto-283),
calcification tax (Otto-284), fake-green-CI tax (Otto-285),
compound-flake tax (Otto-281). Cumulative effect is more-
than-additive — the rules cross-reference forming
reinforcing constraints.

**"Superfluid AI" naming candidate.** Aaron 2026-04-25:
*"What about Superfluid AI? for the product name our
version of Frontier, the factory?"* Otto initial decision
(Otto-283 tracked): **strong candidate**. Captures actual
value prop, physics-grounded, composes with kernel-pair
architecture. Aaron de-risked the trademark concern
2026-04-25: *"superfluid.finance this is a small web3 we
the scope of this project we could swollow them eventually
if it was a conflict"*. Naming-expert review owed before
public adoption per CONFLICT-RESOLUTION.md (task #271).
Revisit if: trademark-conflict-blocks-coexistence,
kernel-pair gets a name absorbing it, sharper metaphor
emerges.

**Rigor differentiator — defensibility angle.** Aaron
2026-04-25: *"I bet theirs is marketing over claims too
not based on mathematical rigor like us"* + *"and
empirical observations"*. Our claim to "superfluid" is
backed by:

- *Mathematical rigor* — Z-set algebra, semiring
  polymorphism, formal verification (TLA+, Lean, Z3,
  Alloy via the Soraya routing portfolio). The "superfluid"
  property emerges from the operator algebra's actual
  guarantees (linearity, retractability, `H` chain rule),
  not from analogy.
- *Empirical observations* — measured friction reduction
  across the cumulative Otto-NNN substrate; the
  factory-becoming-the-algebra-it-describes is a stated
  observation not a brand claim.

Adjacent uses of the term (Superfluid Finance / DeFi)
are likely marketing-over-claims metaphors — money
streaming feels like fluid flow without a mathematical
commitment. Ours is operational, not metaphorical: the
Z-set retraction-native semantics MUST give the
zero-dissipation property the algebra prescribes.

This rigor angle is a positioning differentiator for the
eventual naming-expert review and any future trademark
work — we're not claiming a category we don't deliver.

Pointer: `project_factory_becoming_superfluid_described_by_its_algebra_2026_04_25.md`.

## How this file stays accurate

- When a new memory updates a rule here, I update this
  file in the same tick. If I don't, this file is lying
  by omission.
- When Aaron corrects a memory (says "wait, the new form
  is X"), I edit the relevant section here to reflect the
  new form, and leave the old memory file where it is with
  a note that it's been superseded.
- This file is allowed to shrink as rules consolidate or
  get absorbed into governance docs.
- **Supersede markers:** when a rule is retired entirely,
  move the entry to a "Retired rules" section at the
  bottom (not deleted — visible that the rule was ever in
  force).

---

## Retired rules

*(Empty at creation. Populates as rules get explicitly
retired rather than just updated.)*

---

**Last full refresh:** 2026-04-25 (sections 18-22 added for
the 2026-04-25 substrate cluster: Otto-281 + Otto-285
test-stability discipline, Otto-282 authoring discipline,
Otto-283 authority-delegation, Otto-284 idle-PR fallback,
factory-as-superfluid + Superfluid AI naming candidate +
rigor differentiator). Prior refresh 2026-04-24 (sections
13-17: peer-review-disclosure, Otto-279 history-surface
names, declarative version pins, ethical clean-room
services, four-way-parity naming).
**Next refresh trigger:** when any new memory lands that
updates a section above.
