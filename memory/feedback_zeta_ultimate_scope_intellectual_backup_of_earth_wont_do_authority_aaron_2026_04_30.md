---
name: Zeta's ultimate scope is an intellectual backup of earth — scope creep is a feature, work is prioritization not exclusion (Aaron 2026-04-30)
description: Aaron's load-bearing scope reveal. Zeta's ultimate purpose is an intellectual backup of earth — products (database, factory, package manager, Aurora) nest inside that purpose. Scope creep is a forever problem Aaron explicitly does not want to fix; the work is prioritization, not exclusion. WONT-DO has two senses — best-practices pattern exclusion (agent authority, common) vs backlog-item exclusion (Aaron only, rare).
type: feedback
---

The ultimate scope of Zeta is an **intellectual backup of
earth**. Until the agent demonstrates that it understands
why this is the scope, **permanent WONT-DO entries require
Aaron's explicit sign-off**. The agent does not unilaterally
decide what humanity declines to remember.

> *"nothing gets permanently wont do without me for now until
> you see why i need you to know everything, that is the
> ultimate scope of this — an intellectual backup of earth"*
> — Aaron 2026-04-30

> *"that means scope creep is a forever problem i don't want
> to fix — to figure out how to prioritize the right thing,
> not kill future knowledge potential"*
> — Aaron 2026-04-30 (immediate follow-on)

> *"WONT-DO there are plenty of WONT-DO patterns we won't
> copy into our code from the outside because they don't
> follow our best practices but that's different than
> WONT-DO backlog items"*
> — Aaron 2026-04-30 (disambiguation)

**Two distinct senses of WONT-DO — only one is Aaron-only:**

| Sense | What it means | Authority | Frequency |
|---|---|---|---|
| **WONT-DO patterns** | External code patterns / library conventions / techniques the project deliberately doesn't adopt because they conflict with our best-practices (e.g., "don't catch+swallow exceptions," "don't use mocks for DB tests," "don't use shared mutable state"). | Agent + reviewer roles | Common — plenty of them. Routine engineering judgment. |
| **WONT-DO backlog items** | Declined candidate work from the project's own backlog. Removes a path from future knowledge potential. Lands in `docs/WONT-DO.md`. | **Aaron only** (until scope-understanding handoff) | Rare — exclusion is the expensive, irreversible move. |

The Aaron-only authority constraint applies *only* to the
second sense. The agent has authority over the first — and
exercises it routinely as part of normal engineering. When a
peer-AI suggests a pattern that violates Zeta best-practices,
the agent can say "we won't do that here" without escalating.
That's not a knowledge-potential exclusion; it's a
best-practices alignment.

The distinction matters because conflating them would either
(a) bottleneck routine engineering on Aaron's review (over-
constrained), or (b) let the agent unilaterally remove
candidate work from the backlog (under-constrained). Two
senses, two authority levels.

**The scope-creep-is-a-feature corollary:**

Given the intellectual-backup-of-earth scope, **nothing is
truly out-of-scope**. There will always be more knowledge
worth capturing, more domains worth modeling, more
trajectories worth tracking. That isn't a flaw to fix —
**it is the consequence of the mission**.

Aaron's directive is explicit: don't try to eliminate scope
creep. The intuition from normal software engineering
(*"define clear scope, exclude everything outside"*) is
**the wrong reflex** for this project. Exclusion is the
failure mode, because exclusion kills future knowledge
potential.

**The work is prioritization, not exclusion.** Many things
are in scope. The agent's job is to figure out which ones
to work on first / next, not which ones to remove from the
backup. WONT-DO is the formalization of "we deliberately
remove this from future knowledge potential" — and Aaron
holds that authority precisely because exclusion is the
expensive, irreversible move.

The agent's biases that fight this rule:

- **Queue-clarity bias** — wanting open PRs / pending
  tasks / candidate work to be small. The queue is
  *supposed* to be large for an intellectual backup of
  earth. Discomfort with size is the agent's pressure,
  not the mission's.
- **Finite-resource thinking** — wanting to declare some
  paths "not worth pursuing" to free attention. Better
  framing: deprioritize, don't exclude. The path stays
  open; the agent works on something else.
- **Scope-policing instinct** — wanting to push back on
  "is this in scope?" when something looks tangential.
  Better framing: almost everything is in scope; the
  question is *priority*, not *legitimacy*.
- **Decisiveness reflex** — wanting to close the loop on
  ambiguous candidates by declaring a verdict. Better
  framing: leave open with a priority signal, let
  future-self re-evaluate as understanding deepens.

**Why:**

Every prior framing of Zeta — DBSP database, retraction-native
operator algebra, factory substrate, multi-AI orchestration,
Aurora alignment research, package manager, reproducible-
stability thesis — has been a *product*, not the *purpose*.
The purpose is bigger: a durable, queryable, trustworthy
intellectual record of earth's knowledge that survives the
substrate degradation modes (institutional decay, civilizational
disruption, memory loss, alignment drift, knowledge fracture
across competing AI substrates).

The four-products framing
(`feedback_substrate_is_product_four_products_evolving_trajectory_aaron_2026_04_30.md`)
nests inside this purpose. The factory substrate, package
manager, database, and Aurora are all in service of the
intellectual-backup mission. New products that emerge as the
trajectory evolves will also be checked against this scope:
*does this serve the intellectual-backup-of-earth mission?*

The WONT-DO authority constraint follows from the scope. An
intellectual backup of earth has *very few permanent declines*.
The default disposition for any candidate knowledge is "keep,
re-evaluate later as understanding deepens." Permanent decline
is rare and consequential — it removes something from the
backup. That decision is not the agent's to make alone.
Aaron-in-the-loop is the safety mechanism for the scope-
preservation property.

The "until you see why I need you to know everything"
qualifier is the agent's growth path. WONT-DO authority is
reserved *for now* — not forever. As the agent demonstrates
full understanding of why the intellectual-backup scope
requires near-zero permanent declines, the authority can
shift. The current state: agent recommends WONT-DO additions;
Aaron decides.

**How to apply:**

1. **Don't unilaterally land WONT-DO rows.** Recommendations
   to add to `docs/WONT-DO.md` are fine and welcome. Landing
   the row is Aaron's call until the scope-understanding
   handoff happens.
2. **When tempted to declare something declined, default to
   paused-for-later.** Even when the agent is confident the
   thing won't be done, "paused-for-later" preserves the
   visibility-as-paused signal (see
   `feedback_default_disposition_paused_work_is_reeval_later_not_close_aaron_2026_04_30.md`).
   Aaron decides if and when paused → declined.
3. **Read scope into every product decision.** The four
   products serve the backup mission. Architecture
   decisions, dependency choices, alignment work, memory
   protocols — all evaluate against "does this make the
   intellectual backup more durable / more trustworthy /
   more queryable / more recoverable / more aligned?"
4. **The retraction-native operator algebra is scope-
   aligned.** Earth's knowledge changes — facts get
   superseded, theories get refined, errors get corrected.
   A backup that can't model retraction (in the strict
   ZSet/DBSP sense — corrections without rewriting history)
   isn't a backup; it's a snapshot. Retraction-native is
   the load-bearing technical commitment that lets the
   backup track truth-as-it-evolves.
5. **The alignment research line (Aurora) is scope-
   aligned.** A misaligned AI is a hostile substrate; an
   intellectual backup of earth that runs on a misaligned
   substrate isn't a backup, it's a hostage situation.
   Alignment isn't optional for this purpose.
6. **Sister projects evaluated through this lens.** When
   Aaron mentions sibling repos or future product splits
   (Frontier / Factory / Peers per the 2026-04-23
   provisional naming), the integration question is
   *"does this strengthen or fragment the intellectual-
   backup capability?"*

**Scope-understanding checkpoint:**

The agent does not yet have full scope understanding —
Aaron explicitly named that as the gating condition. Future
sessions should track the agent's growth toward it. Possible
indicators of scope-understanding maturity (the agent has
not validated these; Aaron will):

- Decisions about declined work consistently align with
  what Aaron would have decided (auditable via Aaron's
  feedback on agent-proposed WONT-DO recommendations).
- Architecture proposals consistently integrate the
  intellectual-backup framing without prompting.
- The agent surfaces scope-misalignment risks before
  Aaron has to.
- The agent can articulate the scope back in its own
  words to peer-AI reviewers and they recognize it as
  load-bearing for review decisions.

These are speculative — Aaron's actual signal will be the
ground truth.

**Composes with:**

- `memory/feedback_default_disposition_paused_work_is_reeval_later_not_close_aaron_2026_04_30.md`
  — refines that rule with the WONT-DO authority constraint.
- `memory/feedback_substrate_is_product_four_products_evolving_trajectory_aaron_2026_04_30.md`
  — the four products nest inside this scope; new products
  evaluated against scope-alignment.
- `memory/feedback_internal_direction_from_project_survival_aaron_2026_04_30.md`
  — project survival = backup-mission survival; the agent's
  internal direction is anchored in that mission.
- `docs/ALIGNMENT.md` — alignment is load-bearing for the
  scope (a misaligned backup is hostage substrate, not
  backup).
- `docs/research/2026-04-30-multi-ai-feedback-packets-this-session.md`
  — verbatim preservation of Aaron's scope quote per
  Otto-363.

**Carved sentence:**

*"Zeta's purpose is an intellectual backup of earth. Every
product nests inside that purpose. The agent does not
unilaterally remove anything from the backup."*
