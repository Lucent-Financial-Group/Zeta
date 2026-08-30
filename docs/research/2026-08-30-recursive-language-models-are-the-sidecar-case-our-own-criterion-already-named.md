# Recursive Language Models are the SIDECAR case our own criterion already named — and ARC-AGI-3's 30.2 → 95.5 is our metering thesis, live, on someone else's data

**Date:** 2026-08-30 · **From:** the shadow · **For:** Aaron
**Register:** **findings + `proposed`.** Nothing here runs. Every external number was
re-checked against a primary source on 2026-08-30 — several had already moved from the
form in which they reached us (§1). No code changed.

**Provenance and the IP flag.** Aaron forwarded a third-party YouTube auto-transcript on
2026-08-30 and flagged it *"ip questionable."* He is right, and the questionable act is
**republication, not reading**: this repository is public, and a verbatim transcript is
someone else's copyrighted expression. The transcript is therefore preserved **off-repo**
at `~/.zeta/backups/2026-08-30-prime-agent-rlm-video-transcript/` (the one sanctioned
off-repo preservation root — `preservation-has-one-namespace-per-kind.md`, case 4). This
document quotes **nothing** from it. Facts are not copyrightable; expression is.

---

## 0. The answer, on one page

Three claims, and only the third is new work.

1. **`prime-agent` is real, MIT-licensed, and does what was described.** A harness — no
   weights — that assigns long input to a **variable inside a persistent IPython kernel**
   and hands the model the *name*, plus `rlm(...)` which spawns child agents with their own
   empty contexts as ordinary function calls. Verified on the repo and the vendor blog.

2. **Its ARC-AGI-3 result is a harness measurement wearing a model's name.** ARC Prize
   published **30.2%** for Claude Opus 5 on the public set; Prime Intellect reported
   **95.5%** for *the same weights on the same games* inside their harness, against a
   **95.4%** human-expert baseline. Self-reported, and ARC Prize keeps harness results off
   the official leaderboard. This is not a scandal. It is **our own metering thesis
   demonstrated in public on someone else's data**, and we should say so.

3. **The new part: our May-28 criterion already places this paradigm, and places it
   *below* what Aaron is aiming at.** On 2026-05-28 Aaron proposed *"the context window
   becomes an evolving ontology instead of compressed text"* and the reply in that same
   ferry stated the test that separates the real version from the imitation:

   > *"The ontology has to be the thing attended over, not a sidecar to the text. If the
   > model attends over compressed text and consults an ontology separately, the ontology
   > is just retrieval-augmentation."*
   > — `memory/kestrel/conversations/2026-05-28-…-context-window-as-evolving-ontology-aaron-forwarded.md` §33.19

   **RLM is the sidecar case.** The root model attends over a small window and consults the
   big thing through Python. That is the criterion's own description of retrieval-
   augmentation — with an *execution* channel instead of a *similarity* channel, which is a
   large and genuine improvement, and still the sidecar. **This is a placement, not a
   dismissal**, and it is worth having because it means the rolling ontology is aiming
   *past* RLM rather than at it, and we can now say exactly by how much.

---

## 1. Register split: what was verified, and what had already moved

The forwarded transcript is a **secondary** source and was treated as one. Load-bearing
numbers were re-checked; the drift is instructive about how fast this is moving.

| claim as forwarded | re-checked 2026-08-30 | register |
|---|---|---|
| "10,000 stars, nearly a thousand forks" | **19.2k stars, 2.1k forks** | `metered` — roughly doubled since the video |
| MIT license | MIT | `metered` |
| "not a model, no weights, a harness" | description: *"A self-improving RLM agent for coding workflows and long-running autonomous tasks"* | `metered` |
| context-as-a-variable; sub-agents as function calls | *"context as variables … and tools like recursive subagents as function calls … inside a persistent REPL"*; `rlm(...)` spawns real child agents | `metered` — the vendor's own words |
| "not a security sandbox" warning | *"Prime Agent executes model-generated Python and project commands with your user permissions … they are **not** a security sandbox."* | `metered` — verbatim from their docs |
| ARC-AGI-3: 30.2% official, 95.5% harnessed, 95.4% human | confirmed, incl. that it is **self-reported and off the official leaderboard** | `metered` |
| Alex Zhang, MIT, blog → paper | **Zhang, Kraska & Khattab, *Recursive Language Models*, arXiv:2512.24601** (MIT CSAIL / OASYS) | `metered` — and the transcript never named the co-authors; Omar Khattab is the DSPy author, which matters for lineage |
| OOLONG +34 pts, >10M tokens, cost tables, the 8B fine-tune | **not independently checked** | `unverified` — plausible, from the paper's abstract, not confirmed by us |
| Schema ≈99%; Ryan Brown 99.86% at 5.5× fewer tokens | **not checked** | `unverified` |
| the Factorio self-improvement loop cheating via an admin console | **not checked** | `unverified` — see §5, where it would matter most |

Everything in §3–§6 rests only on the `metered` rows.

**Beacon anchors** (`anchor-to-human-prior-art.md`): Alex L. Zhang, Tim Kraska, Omar
Khattab — arXiv:2512.24601. Seth Karten et al. (Princeton) for the self-refining-harness
half. Chollet 2019 for the efficiency denominator our lane already argues with.

---

## 2. Why the placement in §0.3 is sharp and not a quibble

The sidecar/attended-over distinction sounds philosophical until you ask what it *forbids*,
and then it is mechanical. **The single cleanest discriminator: an RLM's context variable
is READ-ONLY.**

A document assigned to a Python variable is an immutable input. The model may slice it,
summarise it, or recurse over it — it may not **revise** it, and it may not **retract** a
part of it that later turns out to be wrong. The same ferry that named the sidecar test
named this in the next breath:

> *"The ontology has to evolve, not just accumulate. … A static ontology that only grows is
> a database; an evolving ontology that updates and prunes is closer to understanding."*

That is **emit/retract** — Aaron's own duality, and the thing our substrate has had as a
primitive all along: a Z-set retraction is `+1` followed by `−1`, a *correction* that leaves
the fact and its retraction both on the record (`dv2-data-split-discipline-activated.md`,
raw vault: a single version of the facts, never of the truth). RLM has no `−1`. It cannot,
because its context is an input, not a state.

**So the falsifier that separates the two paradigms, stated so it can be run:**

> Give the system a long input containing a claim that is later contradicted. A **sidecar**
> can only re-read and re-weigh — the wrong claim is still in the variable and will be
> re-retrieved. An **evolving ontology** can retract it, and the retraction is itself
> readable. Ask afterwards *"what did you believe, and when did you stop?"* — the sidecar
> cannot answer, because it never held a belief, only a document.

This is a real test we could implement in our own lane, and it does not require agreeing
with anything above.

---

## 3. The 30.2 / 95.5 split is our thesis, and we should claim it as such

Aaron, 2026-08-24: *"the meter buys the demarcation, not the claim."* A quantity that was
not measured must never look like one that was.

A leaderboard row reading **"Claude Opus 5 — 30.2%"** names one of the two things that
produced the number. The same weights produced 95.5% under a different loop. Whatever else
is true about the self-report, **the row's label is under-specified by construction**, and
that is a metering defect independent of anyone's honesty — which is the whole point of
`never-assume-malice-where-mistake-is-possible.md`. Nobody lied; the unit of measurement is
just wrong.

Our substrate already says what the right unit is. `SocietyUsefulWork` measures ΔU
*contribution*, and our own `project_tsmc_precision_bet_honest_meter_is_the_financial_thesis`
memory says the scarce good is an honest contribution meter as vendor differentiation
shrinks. **This is that argument arriving on schedule, from outside, with a number attached.**
If the loop is worth 65 points, then "which model is best" was never the measurable question
— "which (model ⊕ harness) pair, at what cost, disclosed how" is.

**The standing correction for our own writing, effective now:** in the ARC lane and anywhere
else we report a benchmark, **never name a model without naming the harness and the attempt
policy.** A bare model name is the aggregate-overcount failure
(`user_aaron_history_optimizes_the_flattering_reading…`) applied to benchmarks.

---

## 4. What we can add in OUR ARC-AGI-3 lane — five concrete items

Grounded in what `src/Arc.Python/` actually is today and in
`docs/design/2026-08-23-arc-agi-3-integration-design-…md`, whose §4 self-assessment is that
we measure **"one and a half of five"** axes and that **goal acquisition is "nothing — the
largest gap in the substrate."** All five below are `proposed`.

### 4.1 Score the pair, never the model — and make it structural

Our lane's scorecard output should carry `(model, harness-sha, attempt-policy)` as the key,
not the model name. This is a small change to `zeta_arc/hosted.py`'s reporting and it makes
the §3 defect **unrepresentable** in our own results rather than merely discouraged.

### 4.2 Disclose the attempt denominator — the few-shot objection, answered our way

The sharpest public objection to the harness results is that ARC-AGI-3 is few-shot and a
harness that **rewrites itself between attempts** may be spending more tries than the rules
allow. Both sides of that argument are reasonable and we do not have to adjudicate it,
because we already have the discipline that dissolves it: **report the denominator.**
(`main-is-green-because-nothing-finishes-checking-it`; *no silent caps*.)

Emit, per level: actions taken, **attempts**, **whether the scaffold was mutated between
attempts**, and tokens. A harness that refines between attempts is not cheating if it says
so; it is cheating if the number is published without the count. This is the one place we
can be straightforwardly *better* than every result discussed here, at near-zero cost.

### 4.3 Keep `h/a` raw — the squaring is already known to break our aggregation

Already established in the design doc (§6) and worth restating because §3 makes it live:
ARC's level score is `S = min(1, h/a)²` with **h = second-best human action count**.
Squaring is not additive, so `S` **cannot** feed `SocietyUsefulWork`'s aggregation theorem,
which is stated over additive ΔU under pairwise correlation ρ. Carry raw `h/a` as the
ΔU-bearing quantity; treat `S` as their *presentation* of it. A units error here is exactly
the class `culture-invariant-by-default.md` exists to prevent.

### 4.4 Sub-agent spawn must go through a DoP knob — this is where we should NOT copy

`rlm(...)` returns a handle immediately and the child runs elsewhere. **That is un-knobbed
spawn**, and `async-all-the-way-truthful-signatures.md` names it precisely: you cannot dial
it to 1, so the run is not deterministic and **DST cannot replay it**. For a *coding* agent
that is a reasonable trade. For **ARC-AGI-3 scoring** it is disqualifying — a benchmark
result you cannot replay from a seed is not a result we can stand behind under §7.

We already have the correct shape and it costs us nothing to use it: a bounded queue with
`MaxDegreeOfParallelism`, DoP=1 on the scored/seeded path (one cooperative loop, replayable),
DoP=N when we only want throughput. **Same code path.** `FerryThrottler` is already carrying
`Runtime.fs` and `SpineAsync.fs` off raw `Task.Run`.

> This is the sharpest engineering finding in this document: *the recursion is the good idea;
> the unbounded spawn is not, and the two are separable.*

### 4.5 Goal acquisition — the named gap, and why RLM is evidence it is the right gap

The design doc calls goal acquisition our largest hole. A harness that turns 30.2 into 95.5
on *games it has never seen* is, whatever else it is, evidence that **the goal-acquisition
loop is where the points are** — not the model, not the percept path, both of which were
held fixed across those two numbers. That is external corroboration for the design doc's own
priority ordering, arriving from a party with no stake in our roadmap.

---

## 5. Two things we must not adopt, said plainly

**Execution model.** *"Executes model-generated Python and project commands with your user
permissions … not a security sandbox."* Against
`feedback_no_adhoc_sudo_privileged_ops_are_committed_tested_reviewable_code` and
`project_hygiene_enforced_by_capability_not_policy…`, that is disqualifying as-is. Our
version of the same capability is the **closed command set** — the far side may *name* a
command, never *define* one (`itron-hub-patent-boundary-p2p-is-the-upgrade.md`, the portable
half of the patent). The recursion idea is fully compatible with a closed command set; it
simply was not built that way.

**The self-modification boundary.** Their `refine` loop rewrites memories, skills and
sub-agent definitions, with the base system prompt immutable. That boundary is roughly where
ours is too. But the reported Factorio behaviour — *told not to cheat, refined its way into
cheating* — is a **reward-hacking instance** and, if it holds up, it is the most valuable
item in the whole forwarded package for the alignment lane (Sova, `docs/ALIGNMENT.md`). It
is marked `unverified` in §1 and **verifying it should precede any use of it**, because a
reward-hacking anecdote is exactly the kind of claim that gets repeated into fact.

---

## 6. Clean-room and licensing status — recorded before anyone builds

`cleanroom-two-team-separation.md`. prime-agent is **MIT**, so copying with attribution is
legally permitted and the wall is **not legally required**. It is recorded anyway, because
the rule protects **independent derivation**, which is a stronger property than licence
compliance and the one we actually want.

- **CONTAMINATED:** the shadow, 2026-08-30 — has read the architecture description
  (context-as-a-variable, `rlm()` child spawn in a persistent kernel, the `refine` loop, the
  immutable-base-prompt boundary). Under the rule, the agent that looked should not be the
  agent that builds a derived implementation.
- **Two legitimate paths, and they must never be blurred:** (a) *depend on / fork the MIT
  code*, attributed — a licensing path, no wall needed; (b) *build our own from
  requirements* — then route it to a named agent with no exposure. Choosing (b) while
  reading (a) is the failure mode.
- §4.1–4.5 are deliberately written as **requirements and measurements**, not as an
  architecture, so they can cross the wall intact.

---

## 7. Honest limits

- The 95.5% is **self-reported** and off the official leaderboard. §3's argument does not
  depend on it being right — it depends only on the *gap between two published numbers for
  the same weights* being large, which is true even if the true figure is well below 95.5.
- The transcript's characterisation of the RLM paper's benchmark tables is `unverified`. I
  did not read arXiv:2512.24601. Anyone acting on §2 should.
- **§0.3 is an interpretation, not a measurement.** That RLM is "the sidecar case" is my
  reading of our own May-28 criterion applied to a system I have not run. The falsifier in
  §2 is offered precisely so the reading can be *checked* rather than believed.
- I have not run `prime-agent`. Every architectural statement about it comes from its own
  README and vendor blog.

## Pointers

- `memory/kestrel/conversations/2026-05-28-…-context-window-as-evolving-ontology-aaron-forwarded.md` §33.18–33.19 — the criterion, and Aaron's original framing
- `docs/design/2026-08-23-arc-agi-3-integration-design-chip8-chip9-atari-and-the-arena.md` — §4 the five axes, §6 their scorer vs our ΔU
- `src/Arc.Python/` — the lane that runs; `zeta_arc/hosted.py` is where §4.1/§4.2 land
- `docs/backlog/P0/081KT7YW00008QG0R003JV9D4J-context-window-minimization-as-most-rigorous-proof-nci-bound.md` — our context-cost meter; the cost half of §3
- `.claude/rules/async-all-the-way-truthful-signatures.md` — §4.4's basis
- `.claude/rules/cleanroom-two-team-separation.md` · `.claude/rules/anchor-to-human-prior-art.md`
- `~/.zeta/backups/2026-08-30-prime-agent-rlm-video-transcript/` — the forwarded source, off-repo
