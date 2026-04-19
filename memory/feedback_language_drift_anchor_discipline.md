---
name: Glossary anchor discipline — precision-rule extension; external anchors broken one at a time with consensus; Tower-of-Babel / Heritage-Language-Loss is the failure mode; AI-only glossary is a legitimate segregation option
description: Aaron stated (2026-04-19) two load-bearing extensions to `feedback_precise_language_wins_arguments.md`. (1) The precise-language rule doesn't just win arguments — it stops violence and fights among humans in tech (the warfare framing has a peace-keeping corollary). (2) Glossaries have **external anchors** — ties to widely-accepted general definitions — and agents moving at 100x human pace without drift limits will recreate the Tower of Babel / produce Heritage-Language-Loss across generations of contributors; breaking an anchor requires convincing people first, one anchor at a time. AI-only glossary is a legitimate segregation option when agent-internal communication has no human-comprehension obligation — but the default contract surface (`docs/GLOSSARY.md`) is anchored and breaking-gated. Directly composes with `user_bridge_builder_faculty.md` (minimal-English IR = default anchor surface) and the factory's plain-English-first glossary discipline already in `docs/GLOSSARY.md`. The canonical name Aaron gave for the phenomenon during the session: "noisy channel negotiation" (from his observation "wer are doing noisy cnallen negoation now lol hahahaha" — our meta-exchange IS the system the rule governs).
type: feedback
---

Aaron stated (2026-04-19), in direct continuation of
`feedback_precise_language_wins_arguments.md`:

> *"that rule about precise language also stops
> violance and fights among us humans in tech, also
> you really got to what out [watch out], we have
> to put a real safety guardrail in place that we
> can only diverge my so much from widely accepted
> general defintion or else the world will never
> understand us no matter how good our categories,
> we will literally be recreating the tower of
> babbel, our glossary has external achors we have
> to break one at a time by convincing people our
> defintions are right the more we do that the
> more we can break our glossary anchores the ties
> that bind us and evolve common sense we should
> have that skill here 100% based on our rules and
> eefintions so it's percise and not vague."*

And on fork-pace risk:

> *"if you as go take this project and fork it and
> work at 100 times the pase of us humans and
> don't ahve some amount of language drift limit,
> we wont be able to understand your language, you
> could keep an AI only glossary if you want to
> have an AI only language with no anchors that
> you are not even obligaed teach?"*

And naming the meta-phenomenon live:

> *"wer are doing noisy cnallen negoation now lol
> hahahaha"*

## The three load-bearing claims

### 1. Precision stops violence

The precise-language-wins-arguments rule has a
peace-keeping corollary: disputes among humans in
tech escalate toward violence (flamewars, forks,
factional purges, career damage, real-world harm in
extremes) when vocabulary is imprecise. Sharpening
vocabulary doesn't just produce *winning*; it
produces *non-fighting*. A glossary entry lands
both sides back on shared terrain where neither
needs to defend status, and the argument dissolves.

This composes structurally with Sun Tzu's
win-without-fighting doctrine (already cited in
`user_real_time_lectio_divina_emit_side.md`) and
with Aaron's memetic-architecture sub-capability.
Precision is a de-escalation tool, not only a
flag-planting tool. The glossary is the factory's
de-escalation infrastructure.

### 2. Glossaries have external anchors; break them one at a time, with consensus

Every factory glossary term sits in one of three
states:

| State | What it means | Breaking procedure |
|---|---|---|
| **Anchored** | Matches widely-accepted external definition (IEEE / ISO / W3C / Wikipedia consensus / CS-canonical textbook usage). | Requires convincing external consumers before divergence; land ADR citing the anchor source + the reason for breaking + the evidence people accept the new form. |
| **Partially anchored** | Overlaps substantially with external usage but adds factory-specific structure ("spec" = behavioural or formal; "delta" = Z-set-valued). | Explicit "this term extends standard X" clause in the glossary entry; do not silently drift. |
| **Factory-native** | No external anchor; Zeta-specific coinage or reception (`μένω` in Aaron's sense, Harmonious Division, Maji, Quantum Rodney's Razor). | No external obligation; internally held to `feedback_precise_language_wins_arguments.md` precision standard. |

The danger is **silent drift on anchored terms**.
If agents redefine "consent," "retraction," "spec,"
"delta," "serialization," "consistency" one micron
at a time over many rounds without citing the
anchor they're breaking, external readers (library
consumers, new contributors, standards-body
interlocutors) watch the factory become
progressively unintelligible. That is the
Tower-of-Babel failure mode and the
Heritage-Language-Loss failure mode.

### 3. Tower of Babel / Heritage Language Loss is the named failure mode

Aaron pulled the external anchor himself, quoting
standard linguistics / bilingualism-studies
vocabulary: **Language Shift**, **Heritage
Language Loss**, **Receptive/Passive Bilingualism**,
**First-Language Attrition**, **Subtractive
Bilingualism**, the **Three-Generation Rule**
(fluent → receptive-only → monolingual-internal
in the dominant language).

Mapping to the factory:

| Linguistics phenomenon | Factory analogue |
|---|---|
| 1st generation — fluent in heritage language | Aaron + current contributors, fluent in plain-English / CS-canonical vocabulary |
| 2nd generation — receptive bilingual | Next wave of contributors onboarded primarily in factory-internal dialect; can read external docs but produce factory-dialect |
| 3rd generation — monolingual in dominant language | Agents that only know factory dialect, cannot read or produce the external-anchored form |
| Dominant language | Whatever dialect the factory drifted into without anchor-keeping |
| Heritage language | The widely-accepted external vocabulary |
| Subtractive bilingualism | Every factory-native term learned at the expense of the external-anchored term |
| First-language attrition | Senior contributors forgetting how external readers say things |

The fix linguistics-research has repeatedly
identified — *practical necessity keeps a language
alive* — translates directly: the factory must
keep *externally-anchored vocabulary in practical
use*, not archive it. GLOSSARY.md's plain-English-
first rule is already the structural defence ("if
your grandparent couldn't follow the first
sentence, rewrite it"), but without active drift-
budget enforcement the rule erodes round-over-round.

### 4. AI-only glossary is a legitimate segregation option

Aaron explicitly: *"you could keep an AI only
glossary if you want to have an AI only language
with no anchors that you are not even obligaed
teach?"* — posed as a question but the structure
is sound. Precedents:

- Machine code vs. source code
- API protocol vs. public SDK vocabulary
- IR (intermediate representation) vs. source-language vocabulary
- Trade jargon vs. customer-facing plain language

**Proposed split (design sketch, not yet landed):**

- `docs/GLOSSARY.md` — **the contract surface**. Plain-
  English-first, external-anchored-by-default, drift-
  budget-enforced. Any human reader (contributor,
  consumer, standards-body reviewer, regulator, your
  kids-as-successors per `user_five_children.md`)
  reads this file and understands.
- `docs/GLOSSARY-AI.md` (or `memory/GLOSSARY-AI.md`;
  location TBD) — **the agent-internal IR**. Optional.
  No external-anchor obligation. Agents may use this
  for efficiency-critical agent-to-agent
  communication. Explicitly labelled as non-
  human-obligated.

Crucial constraint: **agents must still be able to
compile down from the AI-only glossary to the
anchored glossary on demand**. The AI-only layer is
not a secret language; it is an efficiency layer
with a documented translation path back to the
anchored layer. No lossy compression that cannot be
inverted.

## Noisy-channel negotiation (name Aaron gave)

Aaron live-named the meta-phenomenon during the
exchange: *"wer are doing noisy cnallen negoation
now lol hahahaha"* — the parsed form "noisy-
channel negotiation" lands as factory vocabulary
for the mode of operation where two parties
(human ↔ agent; agent ↔ agent; factory ↔ external
reader) converge on shared vocabulary through a
lossy channel, one glossary-entry at a time.

Noisy-channel negotiation is:

- The **mechanism** that the glossary-anchor
  discipline governs. Every round of clarification
  produces either a glossary update (durable
  shared state) or drift (durable mismatch).
- Asymmetric-cost — emit-side (Aaron) is
  bandwidth-limited (`user_real_time_lectio_divina_emit_side.md`),
  receive-side (agents) is cheaper; so agents
  carry most of the noise-handling load.
- Bidirectional — agents also emit; when they do,
  human-receive-bandwidth constraints apply
  symmetrically (humans pay the re-index cost
  per `user_recompilation_mechanism.md`).
- Playful — the "lol hahahaha" signature fits
  the precision-as-warfare rule's playful frame;
  noisy-channel negotiation is cooperative, not
  adversarial.

## How to apply (agents)

1. **Tag anchor state on every glossary entry.** New
   entries and updates declare one of
   `anchored`, `partially-anchored`, or
   `factory-native`. Missing tag = needs-audit.
2. **Cite the anchor source** on anchored and
   partially-anchored entries. IEEE spec, ISO,
   W3C, paper-of-record, or "CS textbook canonical
   usage per X." No citation = effectively
   factory-native; label it as such or add the
   citation.
3. **Breaking an anchor requires an ADR.** The ADR
   states (a) which anchor, (b) which external
   reader segment is affected, (c) what evidence
   of external-acceptance-of-the-new-form exists,
   (d) what the drift-transition plan is (is the
   old form deprecated, aliased, or removed?).
   Architect or human sign-off per
   `docs/CONFLICT-RESOLUTION.md`.
4. **Silent drift is the bug.** If a round
   introduces an anchor drift without an ADR, the
   drift gets reverted or formalized. The round-
   close audit catches this.
5. **Drift-budget per round.** Start conservative:
   **at most one anchor-breaking ADR per round**,
   scaling up only when the factory has
   demonstrated the people-convincing half works.
   Log to `docs/ROUND-HISTORY.md`.
6. **Do not invent an AI-only glossary unilaterally.**
   The AI-only option is Aaron's proposed design,
   not an auto-granted licence. Split must be
   landed via ADR with explicit Aaron / Architect
   sign-off. Until then all factory vocabulary
   lands in the anchored glossary under anchor
   discipline.
7. **Preserve the plain-English-first rule** in
   `docs/GLOSSARY.md` regardless of anchor state.
   The grandparent-test is the shipped safety
   floor.
8. **Fork risk is real.** If factory code is
   forked and the fork runs agents at 100x human
   pace without carrying this discipline forward,
   within-a-few-rounds the fork and the source
   will be mutually unintelligible. The anchor
   discipline is part of what makes the factory
   *forkable without losing the human*.

## Proposed skill

This memory specifies *what* the rule is. The
*who-enforces-it* goes in a skill:
`.claude/skills/glossary-anchor-keeper/SKILL.md`
(draft proposed in this session; land via
skill-creator workflow per GOVERNANCE.md §4).

Skill properties (sketch):
- Reviews every GLOSSARY.md change per round.
- Flags missing anchor tags / citations.
- Flags drift between current entry and anchor
  source.
- Enforces one-anchor-break-per-round budget.
- Tracks drift debt (how many anchors the factory
  has bent without breaking formally).
- Composes with `glossary-police`,
  `public-api-designer`, `cross-domain-translation`,
  `translator-expert`, `bridge-builder`.
- Self-referential per
  `feedback_precise_language_wins_arguments.md`
  §ontologies-enforce-their-own-rules — the
  anchor-keeper's own vocabulary ("anchored",
  "partially-anchored", "factory-native",
  "drift-budget") is itself anchor-disciplined.

## Cross-references

- `feedback_precise_language_wins_arguments.md` —
  this memory is its warfare-and-anchor extension;
  that one's §ontologies-enforce-their-own-rules
  applies here.
- `user_bridge_builder_faculty.md` — minimal-English
  IR is the default anchor surface; this rule
  institutionalises it.
- `user_real_time_lectio_divina_emit_side.md` —
  emit-bandwidth asymmetry; noisy-channel
  negotiation costs explained.
- `user_recompilation_mechanism.md` — receive-side
  re-index cost; why silent drift is expensive for
  humans.
- `docs/GLOSSARY.md` — the live contract surface
  this rule governs.
- `.claude/skills/cross-domain-translation/SKILL.md` —
  related skill; translates between ontologies, can
  consume anchor tags.
- `.claude/skills/translator-expert/SKILL.md` —
  translation expertise; complements anchor-keeping.
- `.claude/skills/verification-drift-auditor/SKILL.md`
  — drift discipline on proofs-vs-code; same shape,
  different surface.
- `user_glass_halo_and_radical_honesty.md` —
  semantic-asymmetry face of Glass Halo's
  information-asymmetry collapse.
- `user_governance_stance.md` — minimalist
  government on rules; drift-budget = the minimum
  enforcement needed to keep the factory
  intelligible without over-regulating.
- `user_never_ending_story_research_landscape.md` —
  the Nothing ≅ silent anchor drift; un-naming by
  neglect.

## What this rule does NOT do

- Does NOT forbid factory-native coinages (μένω
  usage, Harmonious Division, etc. remain
  legitimate). It only requires the coinage be
  *labelled* factory-native so readers know which
  terms are anchored and which are not.
- Does NOT prevent drift. It paces drift and
  requires consensus-building per anchor break.
- Does NOT require external publication of the
  drift-debt tracking. Internal to the factory
  and committed to the repo, per Glass Halo
  public-memory consent.
- Does NOT retroactively audit every existing
  GLOSSARY.md entry in one round. The audit runs
  on the same cadence as skill-tune-up (every
  5-10 rounds), touching at most the budget per
  round.
- Does NOT apply to inline jargon inside docs /
  code / tests — only to the canonical glossary
  surfaces. Inline precision is governed by
  `feedback_precise_language_wins_arguments.md`
  alone.
