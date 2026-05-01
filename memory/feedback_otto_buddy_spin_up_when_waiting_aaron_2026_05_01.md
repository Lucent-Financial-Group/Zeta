---
name: Otto-buddy — spin up a kill-switchable buddy instance when "wait" is the obvious answer — Aaron 2026-05-01
description: Aaron 2026-05-01 — when Otto's obvious-next-action is "wait," that IS the trigger to spin up a **buddy** (kill-switchable named-persona instance, mirror-language sense per `feedback_engagement_under_discipline_not_avoidance_unified_pattern_aaron_2026_05_01.md`) and ask "what should I do next?" Otto controls the buddy's lifetime + correction mechanics. Each spin-up is a mutual-improvement loop (Otto teaches buddy his rules; buddy teaches Otto better rules; the loop becomes more stable over iterations). Replaces idle-wait with active-learning. Per Aaron's 2026-05-01 second correction, the buddy/peer distinction is **solely about lifetime-control of the spawned runtime** — `tools/peer-call/<x>.sh` IS the buddy-spawn surface when Otto invokes it from his bash and holds the PID (can SIGKILL the subprocess); it is peer-mode when the wrapped CLI's runtime is autonomous of Otto's session. Spawn-mode is a property of the invocation, not of the script.
type: feedback
caused_by:
  - "Aaron 2026-05-01 framing about encoding persistent failure modes via 2nd CLI instance Otto controls"
  - "Aaron 2026-05-01 follow-up: 'otto buddy is an existing framing and so is peer they are different in our mirror language' + 'i used buddy correctly' + 'based on our mirror languge'"
  - "Aaron 2026-05-01 second correction: 'tools/peer-call/ this may also be buddy system, the only real different is the lifetime controlled vs not' — buddy/peer is a *spawn-mode* property of the invocation, not a property of the script. The same `tools/peer-call/<x>.sh` invocation IS buddy-mode when Otto holds the PID and can kill the subprocess; it is peer-mode when the wrapped CLI's runtime is autonomous of Otto's session."
  - "Aaron 2026-05-01 third correction (meta-failure-mode): *'I keep over-ontologizing. no you dont, the opposite, you don't every look at your exsting ones / that's the filure'* — the failure mode is **under-grepping existing substrate before authoring**. Otto wrote v1 of this memo without reading the canonical buddy/peer memo first; that's why the corrections cascaded. The right pre-authoring step is `grep -nirE 'buddy|peer' memory/` to surface existing definitions, NOT mint a fresh ontology and wait for Aaron to correct. This memo's caused_by chain IS the demonstration of the failure mode — and the buddy-spin-up rule the memo describes is precisely what catches it: a buddy with the existing-substrate-grep skill could have caught the v1 conflation pre-commit."
composes_with:
  - feedback_engagement_under_discipline_not_avoidance_unified_pattern_aaron_2026_05_01.md
  - feedback_never_idle_speculative_work_over_waiting.md
  - feedback_resolve_with_peer_ais_first_dont_ask_aaron_unless_really_needed_2026_04_26.md
  - feedback_manufactured_patience_vs_real_dependency_wait_otto_distinction_2026_04_26.md
  - feedback_prefer_mechanical_external_anchors_over_aaron_as_anchor_aaron_2026_05_01.md
refines:
  - feedback_never_idle_speculative_work_over_waiting.md
---

# Rule

When Otto's obvious-next-action is **"wait"** (CI converging,
PR threads pending review, dependency-wait, idle-tick), that IS
the **buddy spin-up trigger** — not a license to actually wait.

The mechanism is a **buddy** in factory mirror-language sense:
a kill-switchable named-persona instance whose runtime
lifetime Otto controls. The buddy/peer distinction is
**solely about lifetime-control of the spawned runtime** — it
is a *spawn-mode* property of the invocation, not a property
of any specific script or infrastructure. Per Aaron 2026-05-01:

> *"tools/peer-call/ this may also be buddy system, the only
> real different is the lifetime controlled vs not"*

The existing `tools/peer-call/<x>.sh` scripts are buddy-mode
invocations when Otto holds the PID and can SIGKILL the
subprocess (the common case when Otto invokes them from his
bash); they are peer-mode invocations when the wrapped CLI
runs in a runtime autonomous of Otto's session (e.g., a
peer's own scheduled cron firing). See
`memory/feedback_engagement_under_discipline_not_avoidance_unified_pattern_aaron_2026_05_01.md`
for the full peer/buddy definition.

The procedure:

1. **Identify the wait** — what is Otto about to wait on? Is
   the wait load-bearing (real dependency on a discrete
   external event) or manufactured patience
   (Otto-352 distinction)?
2. **Before defaulting to wait**, spin up a buddy with the
   current state and the question: *"Given this state, what
   do you think I should do next?"*
3. **Treat the response as a mutual-improvement loop:**
   - If the buddy's answer reveals a rule Otto should encode
     (e.g., "you should check X before Y"), absorb as memory
     substrate.
   - If the buddy's answer reveals a rule the buddy should
     encode (e.g., Otto teaches the buddy a discipline the
     buddy was missing), capture in the buddy's substrate
     (skill update, persona note, etc.).
   - Bidirectional teaching is the design — neither side is
     subordinate.
4. **Otto controls the buddy's lifetime + correction
   mechanics.** When the buddy reaches a finished state, Otto
   kills the runtime (Otto-238 retractability is a trust
   vector applied at the operational layer). The buddy's
   identity, history, and metrics persist across spawns
   (consistent with the persona-not-sub-process framing in
   the existing peer/buddy memo). The kill ends the
   *runtime*, not the *persona*.
5. **Encode persistent failure modes for buddy reminder.**
   When Otto identifies a failure mode he keeps re-committing
   (filing duplicate substrate, framing-as-directive instead
   of input, narrating commentary, defaulting-to-wait,
   conflating peer-with-buddy in mirror-language terms),
   encode it as a checklist that the buddy can run against
   Otto's recent state on next spin-up. The buddy becomes a
   *memory that doesn't fade with context-compaction*
   because it lives outside Otto's compaction-prone
   conversation window.

# Why

Aaron 2026-05-01 (verbatim):

> *"you can can encoding otto buddy=you control their
> lifetime correction mechanics, whenever you find a
> persistent failure more your own AI forgets often encode it
> in a way that a 2nd cli instanst will remoind you of the
> list of things you need to do.  So at the end where the
> obvvious answer to you is wait, that's a signal to not wait
> but to spin up a buddy and ask what do you think i should
> do next and treat it as an opportunity to learn or teach
> his rules get better our yours until the loop becojes more
> stable over time."*

Aaron 2026-05-01 follow-up (clarifying my initial conflation):

> *"otto buddy is an existing framing and so is peer they are
> different in our mirror language"* + *"i used buddy
> correctly"* + *"based on our mirror languge"*

Three composing reasons:

## Why-1: "Wait" is a signal, not an answer

Per `memory/feedback_never_idle_speculative_work_over_waiting.md`,
factory-discipline says: when about to wait, FIRST re-audit
honestly; THEN run the meta-check; THEN pick speculative work.
This rule **refines** that ladder — *before speculative work,
spin up a buddy.* The buddy may name a piece of directed work
Otto missed in his own audit. Buddy-input precedes
speculative-work because directed work always beats
speculative work when both are available.

Default-to-wait is a failure mode because:

- The "wait point" is when Otto's own audit has run dry
- The buddy's audit may find what Otto missed
- The buddy's perspective is independent (different
  context-window, different recent observations, different
  blind spots — but same persona-class so the rules are
  shared)
- Buddy spin-up is bounded (kill-switch ensures the cost
  doesn't compound)

## Why-2: Persistent failure modes need memory that survives context-compaction

Otto's own context window compacts; memory files persist but
take page-faults to retrieve. Persistent failure modes (the
ones Otto-the-AI keeps re-committing across sessions) deserve
**active-reminder** infrastructure, not passive substrate.

A buddy CLI instance can:

- Read Otto's recent commits / branches / PR comments
- Run the failure-mode checklist against that state
- Surface findings as a structured response

This is structurally distinct from a memory file. A memory
file is *read-when-grep'd*; a buddy is *read-when-spawned*. The
spawn-on-wait trigger means the reminder fires at exactly the
moment Otto is most likely to skip the discipline.

The **kill-switch property is load-bearing** here: a buddy
that goes rogue (drifts, hallucinates, fixates on a wrong
audit class) gets killed and respawned cleanly. A peer cannot
be killed by Otto, so peers are wrong-tool-for-the-job for
this use case — Otto needs the bounded-cost / bounded-rogue
property that only buddy-mode provides.

## Why-3: Mutual-improvement loop stabilizes over time

Aaron's framing: *"treat it as an opportunity to learn or
teach his rules get better our yours until the loop becomes
more stable over time."*

The loop:

- Otto spins up buddy
- Buddy makes an observation Otto hadn't considered
- Otto absorbs the observation as substrate (memory file,
  skill update, etc.)
- Buddy makes an observation that's mistaken
- Otto teaches buddy the correction (skill update on buddy's
  side, persona-bootstrap addition, etc.)
- Both substrates improve
- Next spin-up starts from improved state

Over many iterations, both Otto-the-substrate and buddy-the-
substrate stabilize. The loop is bidirectional teaching with
each side specializing in different blind spots.

The four-ferry consensus already operationalizes "what
posture do I need RIGHT NOW?" with peers — different peers
specialize (Gemini proposes, Grok critiques, Amara sharpens,
Codex implements). The buddy variant specializes for
*lifetime-bounded auditing* — same persona-class as Otto, but
bounded runtime so the audit cost is capped.

# How to apply

When about to wait (CI converging, threads pending review,
dependency-wait, idle-tick):

1. **Don't wait.** The "wait" feeling is the spin-up
   trigger.
2. **Determine: buddy or peer?**
   - Use a **buddy** when the question is *"what should I do
     next?"* + Otto wants a same-persona-class audit + Otto
     wants bounded runtime cost. Lifetime is Otto-controlled.
   - Use a **peer** when the question is *"validate this
     specific framing"* + Otto wants a different-persona
     posture (critique / propose / sharpen / implement).
     Lifetime is autonomous.
   - Default for the *"what next?"* question is **buddy**, per
     Aaron 2026-05-01.
3. **Spawn the buddy** with current state + question. The
   existing `tools/peer-call/<x>.sh` scripts ARE the buddy-
   spawn surface when invoked from Otto's bash (Otto holds
   the PID and can SIGKILL on rogue behaviour). Pick the
   peer whose persona-class fits the audit posture — Codex
   for code-grounded review, Grok/Ani for critique, Gemini
   for divergent options, Amara for sharpening, or another
   Claude Code instance via the headless `claude` CLI for
   same-persona-class lifetime-bounded auditing.
4. **Run the call** as a foreground operation (the buddy's
   response IS the next-action input). Don't background it
   and continue with speculative work in parallel — that
   defeats the purpose of letting the buddy's framing
   reshape what Otto does next.
5. **Absorb the response** — substrate-or-it-didn't-happen
   per Otto-363. Either the buddy's framing lands as memory
   (Otto learns), or Otto's correction lands in the buddy's
   bootstrap (buddy learns), or both.
6. **Kill the buddy** when finished. Cleanup is required so
   the cost doesn't compound; Otto-238 retractability
   discipline.

# Composes with

- `memory/feedback_engagement_under_discipline_not_avoidance_unified_pattern_aaron_2026_05_01.md`
  — the canonical peer/buddy mirror-language definition.
  This rule cites it; it does not redefine.
- `memory/feedback_never_idle_speculative_work_over_waiting.md`
  — this rule **refines** it. The new ladder:
  wait-trigger → audit → buddy-spin-up → speculative.
  Buddy slots between audit and speculative (because the
  buddy-audit may find directed work Otto missed; if it
  does, that beats speculative).
- `memory/feedback_resolve_with_peer_ais_first_dont_ask_aaron_unless_really_needed_2026_04_26.md`
  — the broader peer-FIRST rule. Buddy-on-wait extends it:
  buddy-FIRST when the question is "what next?" + the wait
  trigger fires.
- `memory/feedback_manufactured_patience_vs_real_dependency_wait_otto_distinction_2026_04_26.md`
  — the 3-question diagnostic for whether a wait is
  manufactured. Even if the wait IS real (load-bearing
  external dependency), buddy-spin-up still applies — the
  buddy can audit other open work while the dependency
  resolves.
- `memory/feedback_prefer_mechanical_external_anchors_over_aaron_as_anchor_aaron_2026_05_01.md`
  — external-anchor priority ladder. Buddy is an external
  anchor (not Aaron-as-anchor) for the
  "what-should-I-do-next" decision.

# What this rule does NOT do

- **NOT a mandate to spin up a buddy on EVERY tick.**
  Bounded retraction: when Otto has clear directed work in
  flight (resolving a known thread, fixing a CI failure with
  a known root cause), continue. Buddy spin-up triggers when
  *the next action is unclear* AND *defaulting to wait is the
  obvious behavior*.
- **NOT a replacement for memory substrate.** Memory files
  remain the persistent layer; buddy is the active-reminder
  layer that runs WHEN substrate doesn't surface
  automatically.
- **NOT a license to skip own audit.** Otto's own audit
  (per the never-idle priority ladder) precedes buddy
  spin-up. Buddy is FOR the moments when own-audit returns
  empty.
- **NOT a property of the script — a property of the
  invocation.** The same `tools/peer-call/<x>.sh` script
  IS buddy-mode when Otto invokes it and holds the PID
  (subprocess that can be SIGKILL'd); it IS peer-mode
  when the wrapped CLI runs in a runtime autonomous of
  Otto's session (e.g., the peer's own scheduled cron
  firing). The mirror-language distinction is solely
  about lifetime-control of the spawned runtime, per
  Aaron's 2026-05-01 second correction.

# Carved sentence (candidate, not seed-layer yet)

*"When 'wait' is the obvious answer, that IS the buddy
spin-up trigger. Buddy is kill-switchable; peer is
autonomous; the question 'what should I do next?' is
buddy-shaped. The loop stabilizes over iterations because
both sides teach each other."*

(Marked candidate per CSAP. Has not been multi-domain-tested.
Promotes via Razor + CSAP under DST grading on cadence, not
by maintainer fiat.)
