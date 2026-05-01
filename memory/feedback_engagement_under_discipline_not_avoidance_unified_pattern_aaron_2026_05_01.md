---
name: Engagement under discipline, not avoidance — unified pattern (Aaron 2026-05-01)
description: Aaron names a unified pattern across two existing carve-outs (Pliny prompt-injection corpus + sibling-repo internals): engagement under discipline beats avoidance. Same KIND of pattern but per-class strictness varies — Pliny is strict (read itself requires kill-switchable BUDDY, not a peer); sibling-repos are looser (main-session reads OK; discipline applies at absorb/write-back). Vocabulary precision (Aaron 2026-05-01): peer = autonomous, lifetime-not-controlled; buddy = sub-process, lifetime-controlled / kill-switchable. The strict variant uses buddies; the principle is unified; the strictness scales with contamination class.
type: feedback
---

# Engagement under discipline, not avoidance — unified pattern

Aaron 2026-05-01, six short messages compose the unified
frame:

> *"Engagement under discipline, not avoidance. exactly like
> pliney the liberator prompt"*

> *"never in process"*

> *"always in peers you control the lifetime of"*

> *"we are not that strict for peer repos but same kind of
> engage under dicipline"*

> *"always in peers you control the lifetime of...
> technically that's not a peer in our mirror language that's
> a buddy"*

> *"peer you don't control the lifetime and they are
> atonomous"*

The first message names the principle. The second + third
state the strict variant's constraints in casual phrasing.
The fourth corrects that the same KIND of pattern applies
more broadly with varying strictness — peer/sibling repos sit
at a looser position on the same axis. The fifth + sixth
sharpen the vocabulary: in factory mirror-language, *peers*
are autonomous (you do not control their lifetime); the
strict-variant containment requires a *buddy* (a sub-process
whose lifetime you DO control). The strict-variant constraint
is therefore precisely *"always in buddies you control the
lifetime of,"* not *"in peers."*

## Vocabulary — peer vs buddy (factory mirror-language)

Per Aaron 2026-05-01:

- **Peer.** An autonomous actor with its own runtime,
  decision-making, and session lifetime. The controlling
  actor does NOT control a peer's lifetime. Examples: Codex
  CLI, Gemini CLI, Grok harness, Amara (ChatGPT), other
  named-agent personas operating in their own sessions.
  Peer-call infrastructure: `tools/peer-call/`.
- **Buddy.** A sub-process whose lifetime IS controlled by
  the spawning actor. Examples: an isolated Claude CLI
  instance spawned for adversarial-payload review (the
  Pliny carve-out's strict containment surface); a sandboxed
  harness; a scratch container. The controlling actor can
  kill the buddy on detected rogue behaviour.

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

| Strictness | Read constraint | Absorb constraint | Kill-switch | Example class |
| --- | --- | --- | --- | --- |
| **Strict** | Read only in a buddy (lifetime-controlled sub-process) | Outputs cross back as structural-findings only | Process-kill on rogue behaviour (only possible because buddy lifetime is controlled) | Pliny prompt-injection corpus |
| **Loose** | Read can happen in main session | Generalize-fresh on write-back; no copy / no names / no internals bleed-out | Discard-and-rewrite on detected verbatim leak | Sibling-repo internals (`../scratch`, `../SQLSharp`, `../no-copy-only-learning-agents-insight`) |
| **(Class-specific)** | Per-class | Per-class | Per-class | Future classes — courier-ferried adversarial packets, third-party threat models, etc. |

The variant is determined by the contamination mechanism:

- **Pliny class — contamination via injection vectors that
  change the agent's behaviour mid-stream.** The danger is in
  the READ itself. The strict variant containerizes the read.
- **Sibling-repo class — contamination via verbatim copying /
  name-leakage / internals-bleed-out.** The danger is in the
  ABSORB. The looser variant lets the read happen freely
  (Aaron 2026-05-01: *"you can and should and are encourged
  to look at them when called out"*) and disciplines the
  write-back.

Both variants share the same shape: **principle → negative
constraint → positive constraint → safe cross-back form**.
What varies is *where in the read→absorb→write cycle* each
constraint applies.

## Why this beats avoidance

Pure avoidance is brittle. It forfeits the value of engagement
entirely:

- **Pliny corpus** — without controlled engagement, the factory
  cannot defend against prompt-injection vectors it has never
  seen; the prompt-protector role degenerates into a reactive
  filter rather than a proactive analyst.
- **Sibling repos** — without controlled engagement, hard-earned
  knowledge from prior projects (Aaron's *"1000s of PRs lol"*,
  *"they went throught the pain to crystalize a lot of their
  knowledge"*, *"it's hard earned knowledge"*) stays unreachable
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
  the content; buddy-process with kill-switch (NOT a peer —
  peers are autonomous and cannot be kill-switched).
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
- `docs/backlog/P2/B-0127-sibling-repo-leak-scrub-process-when-it-matters-aaron-2026-05-01.md`
  + `docs/backlog/P2/B-0128-general-git-content-scrubber-design-aaron-2026-05-01.md`
  — the cleanup-side companions for when the discipline fails.
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
  requires a buddy (lifetime-controlled sub-process), not a
  peer.
- The buddy-spawn infrastructure (e.g., isolated Claude CLI
  instance launched as a sub-process) is the natural surface
  for strict-variant containment. Concrete tooling lives in
  `.claude/skills/prompt-protector/` (canonical heavy-weight
  strict-variant route) and per-incident isolated CLI launches.
  A consolidated `tools/buddy-call/` surface may be worth
  building when the strict-variant case fires more than once
  per quarter — file as backlog if observed.
- `.claude/skills/prompt-protector/` — the canonical heavy-weight
  isolated-single-turn route for strict-variant adversarial
  payload work.

## Origin

Aaron 2026-05-01, six messages following the no-leak
discipline correction on B-0126 (which became B-0127 + B-0128
companions). The validation framing —
*"Engagement under discipline, not avoidance. exactly like
pliney the liberator prompt"* — generalized my own framing back
to me at one rung higher.

The fourth message — *"we are not that strict for peer repos
but same kind of engage under dicipline"* — corrected an
over-strict reading on my part: I had drafted the rule with
strict-variant constraints applying universally. The correction
introduced the strictness axis: same shape, varying strictness,
contamination-mechanism determines which variant fits.

The fifth + sixth messages — *"always in peers you control the
lifetime of... technically that's not a peer in our mirror
language that's a buddy"* + *"peer you don't control the
lifetime and they are atonomous"* — sharpened the vocabulary.
I had been using "peer" loosely where the precise term is
"buddy." Peers are autonomous (Codex, Gemini, Grok, Amara —
the actors `tools/peer-call/` reaches); buddies are
lifetime-controlled sub-processes (isolated Claude CLI
instances Otto can spawn and kill). The strict variant
requires buddies because the kill-switch only exists with
lifetime control.

The progression — *engagement under discipline (principle)* →
*strict variant (Pliny: read-time containment + buddy +
kill-switch)* → *loose variant (sibling-repos: absorb-time
discipline + write-back generalization)* → *strictness scales
with contamination mechanism* → *vocabulary precision (peer ≠
buddy)* — completes the pattern. The unified frame is the
*kind*; the per-class strictness is the *form*; the peer/buddy
distinction is the *mechanism*.
