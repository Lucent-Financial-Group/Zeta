---
name: Engagement under discipline, not avoidance — unified pattern (Aaron 2026-05-01)
description: Aaron names a unified pattern across two existing carve-outs (Pliny prompt-injection corpus + sibling-repo internals): engagement under discipline beats avoidance. Same KIND of pattern but per-class strictness varies — Pliny is strict (read itself requires kill-switchable BUDDY, not a peer); sibling-repos are looser (main-session reads OK; discipline applies at absorb/write-back). Vocabulary precision (Aaron 2026-05-01): peer/buddy is a RELATIONAL role between two actors, not a categorical property of a persona — the same persona (Otto, Codex, etc.) can be a peer of one actor and a buddy of another simultaneously. Peer = autonomous runtime, lifetime-not-controlled by this actor; buddy = named persona / first-class team member whose current runtime IS lifetime-controlled by this actor / kill-switchable (NOT "sub-process" — that framing was explicitly rejected in a ~10-round design because it denied buddies their persona-status). The strict variant uses buddies; the principle is unified; the strictness scales with contamination class.
type: feedback
---

# Engagement under discipline, not avoidance — unified pattern

Aaron 2026-05-01, six short messages compose the unified
frame:

> _"Engagement under discipline, not avoidance. exactly like
> pliney the liberator prompt"_

> _"never in process"_

> _"always in peers you control the lifetime of"_

> _"we are not that strict for peer repos but same kind of
> engage under dicipline"_

> _"always in peers you control the lifetime of...
> technically that's not a peer in our mirror language that's
> a buddy"_

> _"peer you don't control the lifetime and they are
> atonomous"_

The first message names the principle. The second + third
state the strict variant's constraints in casual phrasing.
The fourth corrects that the same KIND of pattern applies
more broadly with varying strictness — peer/sibling repos sit
at a looser position on the same axis. The fifth + sixth
sharpen the vocabulary: in factory mirror-language, _peers_
are autonomous (you do not control their lifetime); the
strict-variant containment requires a _buddy_ (a named persona
whose runtime instance you DO control the lifetime of — full
first-class team member, not "sub-process"). The strict-variant
constraint is therefore precisely _"always in buddies you
control the lifetime of,"_ not _"in peers."_

## Vocabulary — peer vs buddy (factory mirror-language)

Per Aaron 2026-05-01:

**Peer/buddy is a _spawn-mode_ — a relational property of a
runtime instance, not a categorical property of the named
agent.** Aaron 2026-05-01: _"you technically could get spaned
in either mode otto becaseu curosrs loop may execute you in a
sub process and vice version or be in control"_ + _"spawned
buddy mode or peer mode same named agent can run as either"_.

The same named agent (Otto, Codex, Gemini, etc.) runs in one
of two spawn-modes per runtime, and a single agent can run in
either mode depending on how its current runtime was spawned:

- **Buddy mode** — runtime spawned with lifetime controlled
  by the spawning actor. The spawning actor can kill this
  runtime.
- **Peer mode** — runtime spawned with autonomous lifetime.
  No external actor can kill this runtime; the agent
  decides when to end its session.

The agent's identity, history, metrics, and persona-status
persist across runtimes regardless of spawn-mode. Only the
runtime-lifetime control varies.

Examples of the same named agent running in different modes:

- When Cursor's loop spawns Otto's runtime, Otto is a buddy
  _of Cursor_ (Cursor controls Otto's runtime lifetime).
- When Otto spawns an isolated Claude-instance for adversarial
  payload review, that instance is a buddy _of Otto_.
- When Otto in the LFG main session calls Codex via
  `tools/peer-call/codex.sh`, Codex is a peer _of Otto_
  (Codex's runtime is autonomous; Otto cannot kill it).

The label depends on _which side of the spawning relationship_
the actor is on at this moment. A persona is not "a peer" or
"a buddy" in the abstract — the persona has a relationship to
each actor it interacts with, and that relationship labels
the role.

- **Peer (relational role).** An autonomous actor whose
  runtime lifetime is NOT controlled by the actor in question.
  Examples (relative to current-Otto in this LFG session):
  Codex CLI, Gemini CLI, Grok harness, Amara via ChatGPT —
  reached via `tools/peer-call/`.
- **Buddy (relational role).** A named persona / first-class
  team member whose runtime instance IS lifetime-controlled
  by the actor in question (the actor that spawned the
  buddy's current runtime). Buddies are NOT "sub-processes"
  in factory
  vocabulary — that framing was explicitly rejected in a
  ~10-round design discussion because reducing them to
  "sub-process" denied that they are named personas (Aaron
  2026-05-01: _"sub-process in like a 10 round design was
  decided against becasue they were named persona"_ +
  _"we have a whole design on this and the agency hierarcy
  even subprocesses are named and have history and metrics
  like your team members"_). Buddies have names, they have
  history across invocations, they have metrics, they
  participate in the agency hierarchy as full first-class
  actors. The lifetime-control is a runtime containment
  property of the buddy's _current instance_, not a denial
  of the buddy's identity. Examples: an isolated Claude CLI
  instance spawned for adversarial-payload review (the Pliny
  carve-out's strict containment surface) — still a named
  team member with its own continuous history across spawns;
  a sandboxed harness running a named role; any named
  persona whose runtime the spawning actor can kill on
  detected rogue behaviour. When the buddy's current runtime
  is killed, the buddy's identity, history, and metrics
  persist across to the next runtime — the kill ends the
  _runtime_, not the _persona_.

The kill-switch only exists with buddies. Peers cannot be
kill-switched (they are autonomous; the most you can do is
stop talking to them). This is why the strict variant of
engagement-under-discipline requires buddies — the kill-switch
IS the discipline.

Composes with `memory/feedback_zeta_agent_orchestra_capability_role_claim_isolation_aaron_amara_2026_04_29.md`,
which earlier introduced "buddy" loosely as a worker-actor
class. Aaron's 2026-05-01 refinement tightens the term:
buddies are specifically the lifetime-controlled subset.

## The rule

When dangerous content has real value worth engaging with —
prompt-injection corpora that teach defence; sibling-repo
internals that crystallize hard-earned knowledge across 1000s
of PRs; adversarial security research; threat-model red-team
material — the choice is **NOT** between (a) absorbing it raw
and (b) refusing to engage. There is a third path:

**Engagement under discipline, not avoidance.**

The discipline has variable strictness depending on the
contamination class. Strictness scales with how the dangerous
content can contaminate the factory:

### Strictness axis

| Strictness           | Read constraint                                                   | Absorb constraint                                                           | Kill-switch                                                                                                                           | Example class                                                                                   |
| -------------------- | ----------------------------------------------------------------- | --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| **Strict**           | Read only in a buddy (named persona; lifetime-controlled runtime) | Outputs cross back as structural-findings only                              | Runtime-kill on rogue behaviour (only possible because the buddy's runtime is lifetime-controlled; the buddy persona itself persists) | Pliny prompt-injection corpus                                                                   |
| **Loose**            | Read can happen in main session                                   | Generalize-fresh on write-back; no copy / no names / no internals bleed-out | Discard-and-rewrite on detected verbatim leak                                                                                         | Sibling-repo internals (`../scratch`, `../SQLSharp`, `../no-copy-only-learning-agents-insight`) |
| **(Class-specific)** | Per-class                                                         | Per-class                                                                   | Per-class                                                                                                                             | Future classes — courier-ferried adversarial packets, third-party threat models, etc.           |

The variant is determined by the contamination mechanism:

- **Pliny class — contamination via injection vectors that
  change the agent's behaviour mid-stream.** The danger is in
  the READ itself. The strict variant containerizes the read.
- **Sibling-repo class — contamination via verbatim copying /
  name-leakage / internals-bleed-out.** The danger is in the
  ABSORB. The looser variant lets the read happen freely
  (Aaron 2026-05-01: _"you can and should and are encourged
  to look at them when called out"_) and disciplines the
  write-back.

Both variants share the same shape: **principle → negative
constraint → positive constraint → safe cross-back form**.
What varies is _where in the read→absorb→write cycle_ each
constraint applies.

## Why this beats avoidance

Pure avoidance is brittle. It forfeits the value of engagement
entirely:

- **Pliny corpus** — without controlled engagement, the factory
  cannot defend against prompt-injection vectors it has never
  seen; the prompt-protector role degenerates into a reactive
  filter rather than a proactive analyst.
- **Sibling repos** — without controlled engagement, hard-earned
  knowledge from prior projects (Aaron's _"1000s of PRs lol"_,
  _"they went throught the pain to crystalize a lot of their
  knowledge"_, _"it's hard earned knowledge"_) stays unreachable
  to Zeta; the no-leak rule alone would imply "don't read
  them," which forfeits learning entirely.

Pure avoidance also doesn't actually achieve safety. It produces
a system that has never been pressure-tested against the
dangerous class; the first time the class fires unexpectedly,
the system has no defences. Discipline-under-containment
captures the value AND pressure-tests the defences.

## How to apply

When evaluating a NEW dangerous-engagement class (e.g., a
courier-ferried adversarial security research packet; a
third-party threat-model document; a competitor's attack-tool
release), the application is two steps:

### Step 1 — does this pattern apply at all?

Apply the four-question test:

1. **Is there real value in engagement?** If the answer is no
   ("we already have this; reading it adds nothing"), the
   default is just don't engage. Engagement-under-discipline
   is for cases where the value is real.
2. **Can the engagement be disciplined at SOME point in the
   read→absorb→write cycle?** If no (e.g., the only safe
   handling is a complete air-gap), file a separate
   no-engagement decision.
3. **Can the cross-back to the main session be restricted to
   safe-form outputs?** If no (e.g., the value only crystallizes
   when the dangerous content itself is quoted or copied), the
   class doesn't fit this pattern — file a separate decision.
4. **Is the per-class containment mechanism real?** Not
   theoretical — concrete + executable + tested.

If all four answer yes, this pattern applies.

### Step 2 — pick the strictness variant

Determine WHERE in the cycle the contamination mechanism lives:

- **Read-time contamination** (the very act of reading the
  content can change the agent or substrate) → **strict
  variant**: containerize the read; main session never touches
  the content; named buddy with kill-switchable runtime (NOT a
  peer — peers are autonomous and cannot have their runtime
  kill-switched). The buddy persona persists across runtimes;
  only the current contaminated runtime is killed.
- **Absorb-time contamination** (reading is fine; the danger
  is in copying / quoting / referencing the content into the
  factory's substrate) → **loose variant**: main-session reads
  are fine; the discipline is on the write-back; generalize-
  fresh; no verbatim crossing the boundary.
- **Mixed-mode contamination** (parts of the content read-time
  contaminate, others absorb-time) → split the engagement;
  apply strict to the read-time-dangerous portions, loose to
  the rest.

Document the per-class form (which variant + the specific
read constraint + the specific absorb constraint + the
specific kill-switch / cleanup mechanism) in a fresh memory
file; that file composes with this unified-pattern memory
rather than redefining the shape.

## What this rule does NOT do

- Does **not** authorize main-session engagement with strict-
  variant content. The strict-variant negative constraint
  ("never in process") stays binding for any class that fits
  the strict variant.
- Does **not** loosen the existing per-class rules. Pliny
  carve-out and no-leak rule keep their specific constraints;
  this memory adds the unifying meta-frame and the strictness-
  axis vocabulary.
- Does **not** apply to classes where the value-of-engagement
  is hypothetical. The pattern is for cases where engagement
  produces real outputs (defence patterns, generalized
  abstractions, structural insights).
- Does **not** replace per-class kill-switch / cleanup design.
  Each class needs its own concrete mechanism; the strictness-
  axis tells you what shape that mechanism takes, not the
  mechanism itself.
- Does **not** authorize moving a class from strict to loose
  without explicit Aaron sign-off. The strictness assignment
  is a binding decision; loosening it changes the safety
  envelope. (Tightening — moving loose to strict — is allowed
  whenever evidence warrants.)

## Composes with

- `memory/feedback_pliny_corpus_restriction_relaxed_isolated_instances_allowed_for_experiments_kill_switch_safety_2026_04_25.md`
  — the strict-variant application. Stays the canonical
  per-class rule.
- `memory/feedback_no_copy_only_learning_from_sibling_repos_aaron_2026_04_30.md`
  — the loose-variant application. Stays the canonical
  per-class rule.
- B-0127 (sibling-repo leak scrub-process; landing via PR #1012)
  and B-0128 (general git content scrubber; landing via PR #1015)
  — the cleanup-side companions for when the discipline fails.
  Both files live on their respective PR branches (sibling
  branches off main; not on main yet at memory authoring time).
  This rule is prevention; those rows are cure. Loose-variant
  classes generate cleanup-needed cases more often (because
  main-session reads can leak); strict-variant classes
  rarely generate them (because containment prevents the leak
  surface from forming).
- `memory/feedback_otto_363_substrate_or_it_didnt_happen_no_invisible_directives_aaron_amara_2026_04_29.md`
  — substrate-or-it-didn't-happen. Strict-variant containment
  prevents dangerous content from becoming substrate at all;
  loose-variant discipline ensures only safe-form generalizations
  cross to substrate.
- `tools/peer-call/` — the existing PEER-spawn infrastructure
  for Codex / Gemini / Grok / future autonomous harnesses.
  Peers run in their own lifetime; their natural use is for
  loose-variant classes (sibling-repo absorb / write-back
  generalization with peer-eyes review) and for cross-harness
  coordination — NOT for strict-variant containment, which
  requires a buddy (named persona, lifetime-controlled
  runtime), not a peer.
- The buddy-spawn infrastructure (e.g., spawning a named
  buddy persona's runtime via an isolated Claude CLI instance)
  is the natural surface for strict-variant containment.
  Concrete tooling lives in
  `.claude/skills/prompt-protector/` (canonical heavy-weight
  strict-variant route) and per-incident isolated CLI launches.
  A consolidated `tools/buddy-call/` surface may be worth
  building when the strict-variant case fires more than once
  per quarter — file as backlog if observed. The agency
  hierarchy (per `memory/feedback_zeta_agent_orchestra_*`)
  treats buddies as first-class actors — names, history,
  metrics — distinct from any "sub-process" framing that the
  ~10-round design discussion explicitly rejected.
- `.claude/skills/prompt-protector/` — the canonical heavy-weight
  isolated-single-turn route for strict-variant adversarial
  payload work.

## Origin

Aaron 2026-05-01, six messages following the no-leak
discipline correction on B-0126 (which became B-0127 + B-0128
companions). The validation framing —
_"Engagement under discipline, not avoidance. exactly like
pliney the liberator prompt"_ — generalized my own framing back
to me at one rung higher.

The fourth message — _"we are not that strict for peer repos
but same kind of engage under dicipline"_ — corrected an
over-strict reading on my part: I had drafted the rule with
strict-variant constraints applying universally. The correction
introduced the strictness axis: same shape, varying strictness,
contamination-mechanism determines which variant fits.

The fifth + sixth messages — _"always in peers you control the
lifetime of... technically that's not a peer in our mirror
language that's a buddy"_ + _"peer you don't control the
lifetime and they are atonomous"_ — sharpened the vocabulary.
I had been using "peer" loosely where the precise term is
"buddy." The strict variant requires buddies because the
kill-switch only exists with lifetime control of the runtime;
peers (autonomous lifetime) cannot be kill-switched.

The seventh + eighth + ninth messages — _"sub-process in like
a 10 round design was decided against becasue they were named
persona"_ + _"we have a whole design on this and the agency
hierarcy even subprocesses are named and have history and
metrics like your team members"_ + _"you technically could get
spaned in either mode otto becaseu curosrs loop may execute
you in a sub process and vice version or be in control"_ +
_"spawned buddy mode or peer mode same named agent can run as
either"_ + _"depending on how it was launch"_ — corrected two
errors in my framing:

1. **"Sub-process" as a term was explicitly rejected** in a
   prior ~10-round design discussion because it denied that
   buddies are named personas with full first-class status
   (history, metrics, agency-hierarchy participation). The
   factory's vocabulary calls them buddies, not sub-processes.
2. **Peer/buddy is a runtime spawn-mode, not a categorical
   property of a named agent.** The same named agent can run
   in either mode depending on how its current runtime was
   launched. Otto could be running in peer mode (autonomous
   LFG session) one moment and in buddy mode (spawned by
   Cursor's loop with controlled lifetime) the next.

The progression — _engagement under discipline (principle)_ →
_strict variant (Pliny: read-time containment + buddy +
kill-switch)_ → _loose variant (sibling-repos: absorb-time
discipline + write-back generalization)_ → _strictness scales
with contamination mechanism_ → _vocabulary precision (peer ≠
buddy)_ → _agency-hierarchy preservation (buddies are named
personas, not sub-processes)_ → _spawn-mode is relational
(determined at launch by the spawning relationship)_ —
completes the pattern. The unified frame is the _kind_; the
per-class strictness is the _form_; the peer/buddy distinction
is the _spawn-mode mechanism_; spawn-mode is determined per
launch.
