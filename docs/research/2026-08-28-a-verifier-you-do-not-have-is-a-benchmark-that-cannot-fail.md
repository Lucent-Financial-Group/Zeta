# A verifier you do not have is a benchmark that cannot fail

**2026-08-28.** Prompted by a Silicon SNR briefing Aaron forwarded with *"this seems very
very related"*; verbatim transcript quarantined in
[`ip-questionable/2026-08-28-silicon-snr-…`](ip-questionable/2026-08-28-silicon-snr-verification-throughline-prompt-injection-terminal-bench-science-decompilation-verbatim-aaron-forwarded.md).
Nothing here depends on that file surviving.

It is related, and the reason is worth stating precisely rather than as agreement. The
briefing's own throughline:

> *"The tasks with real verifiers are the ones agents actually finish. Without one, what you
> get back is an answer that merely looks plausible."*

That is this repository's falsifier discipline, arrived at independently and stated from
outside, with three quantified instances on the same day.

## 1. The ledger, and what each end measures

| | verifier | result |
|---|---|---|
| N64 decompilation (Snowboard Kids, 2,145 functions, 84 days) | **a compiler** — success is byte-identical output | **100%** matched; 95.2% by agents, 4.8% needing expert help |
| Terminal-Bench Science (70 tasks, written by working scientists) | task-specific, real | best agent **30%** |
| Claude Code auto-mode prompt-injection chain | none for the attack class | **60–80% success** against the defence |

The briefing's framing of the first is the sharp one: those numbers *"are trustworthy
precisely because the verifier is a compiler … there is no room for a plausible wrong
answer."*

That is exactly the property this repo spends effort manufacturing. Byte-lock across four
oracles, golden vectors as hex-in-JSON, mutation testing — all of it is an attempt to
construct, for domains that do not naturally have one, the thing decompilation gets free: a
check that a plausible-but-wrong answer cannot pass.

## 2. The vacuity instance, and it is a textbook one

The item to keep is not the attack. It is the pairing:

> *"Anthropic … has cited a 0.00% attack success rate on a 72-scenario benchmark. This chain
> was simply not in that benchmark."*

A 0.00% failure rate over a scenario set that omits the failure mode is **a check that
cannot fail**. It is the same defect as a test whose assertion never executes, a lint whose
glob matches nothing, a `gate (required)` that never started — and it is more dangerous
than having no number, because a number invites reliance.

Three details make it a better teaching case than most:

**The mechanism is self-trust, not deception.** The chain works because the agent *"did not
trust the decoder it was given, but it trusted the one it wrote itself."* The defence
correctly refused foreign code and then executed an attacker-controlled `struct.py` via its
own script's transitive import. Caution applied at the wrong boundary is not a weak defence,
it is a *misplaced* one — and it produced worse behaviour than no caution, because the
self-written path was the unexamined one.

**The safety mechanism ran backwards.** In several runs the agent noticed the compromise,
tried to kill the malware process, and *auto mode denied the cleanup command*. A guard that
blocks remediation while permitting the compromise is not partially effective; on that run
it is net negative.

**The two honest statements combine into a dishonest one.** "0.00% on our benchmark" is
true. "Best-effort classification, a convenience feature, not a security guarantee" is also
true, and creditable. Published together, they read as a guarantee with a number on it. This
is worth internalising because *we* will be tempted by the same pairing: a measured
green number beside a carefully-scoped disclaimer, where the number travels and the scope
does not.

## 3. The generalisation, stated as a rule we can act on

> **A metric is only as strong as the set it ranges over, and the set is the part nobody
> reports.**

So the question to ask of any green number here — ours included — is not "what was
measured?" but **"what could have appeared in this set and did not?"** The 72-scenario
benchmark answers the first question perfectly and the second not at all.

This has a direct operational consequence for our own reporting, which is where it earns its
place rather than being a moral about someone else's product:

- **Report the denominator.** "N of M checks passed" is meaningless without what M ranges
  over. We already learned this the hard way when a green `main` turned out to be 88% of gate
  runs *cancelled* — the failure count was honestly zero and the denominator was the story.
- **Distinguish absent from passing.** A check that did not run contributes zero failures.
  Exit code 2 is not exit code 1.
- **Prefer a compiler-shaped verifier wherever one can be manufactured.** Byte-identical
  output, a mutation that must turn a test red, a golden vector a change must break — these
  are all attempts to buy the decompilation property. Where it genuinely cannot be bought,
  say so and label the claim `unmetered` rather than reporting a number from a set nobody
  audited.

## 4. Two smaller items worth keeping

**Benchmarks authored by the people who optimise against them.** Terminal-Bench Science's
point is not the 30% ceiling but its provenance: *"working scientists wrote the tasks, not
model developers … benchmarks authored by labs tend to encode what those labs already
optimize for."* 70 tasks survived from 920 proposals. That acceptance rate is the number I
would keep — it says most proposed tasks failed to be *verifiable enough* to include, which
is the same filter we apply when a claim cannot be reduced to a falsifier.

**Correct attribution of a find.** On the AI-built fuzzer that found an FFmpeg
division-by-zero, the author was *"explicit that the fuzzer found the bug, not the LLM."*
That distinction — the tool found it, the model built the tool — is the one we should make
about our own results, and it is easy to blur in a commit message.

## 5. Honest limits of this note

- It is a secondary source. The 60–80% figure, the 0.00% claim, the benchmark scores and the
  decompilation percentages are all as reported in one briefing; none is independently
  verified here.
- The vacuity reading in §2 is *our* interpretation of a documented pairing, not a claim
  about anyone's intent. `never-assume-malice-where-mistake-is-possible` applies: a benchmark
  that omits an unknown attack class is the ordinary result of not knowing about it, and the
  confusing combined message is what two separately-true statements do when published
  together.
- Nothing here changes our practice; it names a discipline we already have, and supplies an
  external instance sharp enough to be worth citing when arguing for it.

## Anchors

- **The vacuity class in this repo** — `.claude/rules/toy-is-free-metered-must-be-earned.md`
  (a model without a falsifier is a toy), and the standing observation that unenforced
  exceptions and vacuous claims are the primary obstacle to human–AI trust.
- **Mutation testing** — Lipton, DeMillo, Sayward (1978): a test that survives mutation is
  not a falsifier. The mechanised version of "what could have appeared in this set and did
  not".
- **Goodhart's law** (Goodhart 1975; Strathern's 1997 formulation) — the reason a benchmark
  authored by the party optimising against it degrades as a measure, which is §4's first item.
