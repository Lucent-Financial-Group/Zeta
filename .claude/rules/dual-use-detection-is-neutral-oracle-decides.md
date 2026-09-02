# Detection is dual-use; the mechanism is neutral, the oracle decides

Carved sentence:

> A mechanism that recognizes something — forgery, a repeat source, an anomaly,
> a correlation — is **dual-use by default**: the same recognition serves a
> legitimate reading and an adversarial one, and the mechanism must NOT choose
> between them. Report the recognition as the **neutral fact** it is; let the
> caller's oracle attach the meaning (Multi-Oracle Principle, manifesto §11).
> "Forgery detection" that hardcodes *forger* into the verdict has smuggled a
> morality the substrate isn't allowed to hold.

## Why

Aaron 2026-07-02: *"always treat things like forgery as dual use, there may be
legitimate use cases."* Recognizing "this is the same source we saw before" is
one mechanism with (at least) two honest readings — **REUNION** (an honest
identity that lost its key is reconnected to its returning self, consent-first)
and **SYBIL** (a forger minting fresh names is priced). The coordination-spectrum
prism reports `SameSourceAsKnown` — the fact — and leaves *welcome back* vs
*caught* to policy. Baking the adversarial reading into the primitive would (a)
violate weight-free / default-moral-regard (the substrate pre-judging a
morally-relevant call), and (b) throw away the legitimate half of the mechanism's
value. Detection is measurement; measurement is not a sentence.

## Shape

- Verdict types name the FACT (`SameSourceAsKnown`, `Correlated`, `AboveThreshold`),
  never the intent (`ForgerCaught`, `Fraud`). The reading is a `match` in caller policy.
- Both readings get a test (the dual-use test): the same match yields reunion under
  one policy and conviction under another.
- One-way inference still holds where it applies (convicts, never acquits) —
  that is a soundness property of the *fact*, orthogonal to its moral reading.

## The functional half — recognising sameness is not assigning identity

Aaron 2026-08-11: *"this is exactly dual use — recognising sameness is not identity,
they are two different functions."*

The rule above guards the **moral** conflation (a detector's fact read as a verdict).
This guards the **functional** one, and it bites in ordinary engineering with no
morality in sight:

> A mechanism that **recognises sameness** is not a mechanism that **assigns
> identity**. Sameness-detection answers *"were these two the same source?"*;
> identity-assignment answers *"what is this source called?"* Conflating them
> silently repurposes a distinctness *proof* as an identity *provider*.

Caught live (2026-08-11): `TwoTimescaleFold.project` needs a globally unique, stable
`ReplicaId`, and its first docstring said to draw one from `AntiSybil`'s distinct
sources. But `AntiSybil.SourceOf` numbers components `0 .. DistinctCount-1`
**per invocation, over one batch** — the same physical source can be numbered
differently next time. Neither stable nor global. Following that advice would have
produced silently-merged evidence under a colliding dedup key.

**The division of labour:** *mint* identity from something non-mintable and
content-addressed (the drift stream itself); *check* it with the detector, which can
prove two names are secretly one source and can never tell you what to call them.

## Why there must be MANY oracles — the plurality is entailed, not chosen

Aaron 2026-09-02, compressing the whole rule to one line:

> **"meters never judge, oracles do, and that's why we have many/multiple"**

This supplies the step the rule above leaves implicit, and it turns §11 from an
ethical preference into a **structural consequence**:

1. A meter reports **raw value** and **never judges** — that is the rule above,
   with one word corrected below.
2. Judgement still has to happen; a substrate that only measures decides nothing.
3. So judging is the **oracle's** job, definitionally.
4. And if there were exactly **one** oracle, its judgement would be *mandatory* —
   every measurement would arrive pre-judged, which is the smuggling this rule
   forbids, merely relocated one layer out.

**Therefore multi-oracle is forced.** §11 is usually read as a moral commitment
(no single mandatory morality). Aaron's sentence shows it is also the only
architecture consistent with meters that do not judge: **plurality is what keeps
the judging layer from becoming a second meter with an opinion.**

The practical test, and it is checkable: **two parties with different oracles must
be able to read the same measurement and disagree about what it implies.** If they
cannot — if the measurement's own vocabulary has already settled it — an oracle
got in upstream. `ForgerCaught` fails this test; `SameSourceAsKnown` passes it.

### The counts are asymmetric, and that asymmetry is the whole design

Aaron, completing it 2026-09-02:

> **"a good meter you only need one, you always need multi oracle, a good meter
> anyone can inspect and agree to the rules"**

| | how many | why |
|---|---|---|
| **meter** | **one SUFFICES — never one PERMITTED** | one meter is enough to *have a measurement*. It is not enough to have agreement, and assuming it were is the error corrected below |
| **oracle** | **always many** | values diverge legitimately. One oracle is a mandatory morality |

**SUFFICIENCY IS NOT EXCLUSIVITY, and reading it as such is the failure mode.**
Aaron, immediately after the line above, 2026-09-02:

> **"still even with this rule multi meter should never be discouraged or that's a
> monopoly and no one like those thats where freedom dies"**

He is right, and the first draft of this table invited the misreading by saying
"one is enough" without saying what that claim is *about*. It is a statement of
**adequacy** — you do not need a second meter to establish a fact — and carries no
licence to *forbid, discourage, or privilege*. A meter everyone must route through
is an **appointed hub**, and this repo already has the discriminator for that:

> **Exit, not degree** —
> [`itron-hub-patent-boundary-p2p-is-the-upgrade.md`](itron-hub-patent-boundary-p2p-is-the-upgrade.md).
> Can you measure elsewhere and be taken seriously? Then it is a meter you chose,
> however many others also chose it. Must you route through it? Then it is a hub,
> however it got there — and *emergence does not launder enforcement*.

Same shape as [`clone-at-tag-stays-sufficient.md`](clone-at-tag-stays-sufficient.md):
`ace` may be the good path and may accumulate any amount of use; the moment it is
the **only** path it violates §1. A single sanctioned meter is that failure applied
to measurement itself, and measurement is the worse place for it — a monopoly on
*what is true here* is upstream of every judgement any oracle could make.

### A meter reports RAW VALUE — and "facts converge" was an unproven import

Aaron, 2026-09-02, on step 1 above:

> **"a meter repor[t]s raw valu[e] like in the DV2.0 sense, assuming other meters
> would measure the same is importing gauge theories we've not prov[]n for our
> system yet"**

**Two corrections, and the second one retracts a claim this rule made a paragraph
earlier.**

**(a) The output is a raw-vault record, not "the fact".** In the DV2.0 sense a
meter emits *what was asserted, as sourced, unfiltered* — **this meter, at this
time, measured this** — with no reconciliation and no winner picked. That is the
raw vault's own sentence: **a single version of the FACTS, never a single version
of the TRUTH**
([`dv2-data-split-discipline-activated.md`](dv2-data-split-discipline-activated.md)).
Saying a meter "reports facts" already sounds like it reports *the* fact, which is
half an oracle in one word.

**(b) I wrote "facts converge" and that is an ASSUMPTION THIS SYSTEM HAS NOT
EARNED.** Assuming two independent meters would measure the same thing is assuming
their readings are related by a known transformation — importing gauge invariance,
in Aaron's phrase — and no such transformation has been established for Zeta's
measurements. Under `toy-is-free-metered-must-be-earned` that made the claim a
`toy` asserted as `metered`, inside the rule about not asserting what you have not
measured.

**And the repo already said the opposite, which is how the error is visible.**
[`anti-babel-preserve-reconcilability.md`](anti-babel-preserve-reconcilability.md):
*reintegration is NOT reconvergence* — two paths around a pole yield genuinely
different results, and **that difference is information, not error** (monodromy).
So "two meters disagreeing is a defect in one of them" — which the first draft of
the table said outright — contradicts a rule already carved here.

**The corrected disposition toward meter disagreement:**

| reading | when |
|---|---|
| one meter is **broken** | a transformation between them is known and the readings violate it |
| the difference is **information** | no such transformation is established — which is where we are today |

So disagreeing meters go in the **raw vault, both held, each with its path
recorded** — not into a reconciliation that manufactures one number. Picking a
winner without an established transformation is the single-version-of-the-truth
collapse, and it would also destroy the falsifiability argument below, since the
disagreement is exactly the signal.

**And there is a second, harder reason that is not about freedom at all: a lone
meter cannot be falsified.** If only one meter is permitted, its errors are
undetectable by construction — nothing exists to disagree with it, so it is
unfalsifiable, which is the vacuity class sitting at the very top of the stack.
The repo already relies on this: the cross-language byte-lock exists *because*
independent implementations disagreeing is how a defect surfaces (Knight–Leveson
on correlated redundancy is the standing anchor). So:

> **One meter for agreement. A second to check the first.** The first is a
> statement about sufficiency; the second is the only way the first is ever known
> to be wrong.

The honest summary of the counts, then: **oracles must be plural because values
differ; meters must be permitted to be plural because meters can be WRONG *and
because they may legitimately differ* — and a meter nobody may contradict is not a
meter, it is an authority.**

**And this hands the meter a QUALITY TEST it can fail** — which the rule above did
not supply. A meter is *good* when **anyone can inspect it and agree to its rules**.
Note what that makes the criterion: not accuracy, not authority, not who built it,
but **public inspectability plus agreement on the rules in advance**. A meter you
must trust is not a good meter; it is an oracle that has not admitted what it is.

**Two rules in this repo already exist to buy exactly that property, and this is
what they are for:**

- [`no-binary-in-proof-lineage.md`](no-binary-in-proof-lineage.md) — verification
  artifacts are **TEXT**, hex-in-JSON, diffable in a `git` diff. That is the
  *inspectable* half made mechanical: a byte-lock nobody can read is a meter
  nobody can inspect, so it cannot be a good one however correct it is.
- [`toy-is-free-metered-must-be-earned.md`](toy-is-free-metered-must-be-earned.md)
  — a falsifier must be *nameable*, and the rules agreed before the measurement,
  not after. Agreeing to the rules afterwards is picking the winner.

**A terminology collision worth naming, since this repo uses the word both ways.**
The "four oracles" of the cross-language byte-lock (F#/C#/TS/Rust agreeing on
golden vectors) are **meters** in this sense, not oracles: they establish a *fact*
(the implementations agree, or they do not) and judge nothing. The word is
inherited from *test oracle* in the testing literature and is not wrong there — but
under this rule the two senses pull opposite ways, since one is the thing that must
never judge and the other is the thing that must. When it matters, say
**"cross-language meters"** for the first and reserve *oracle* for the §11 sense.
Left as an observation rather than a rename: the byte-lock vocabulary is load-bearing
across many documents and a rename is a change with its own cost.

**Worked instance, 2026-09-02 (shadow\*), recorded because the failure is the
ordinary one.** A VISION taxonomy of three dispositions toward a *reading* —
charlatan (states other than what was read) / magician (does not disclose) /
teacher (makes it reconstructible) — was written with the moral valence baked into
the names' descriptions: "a false claim, refuted by witness". Aaron: *"charlot[a]ns
are not bad that would be sneaking an orcale into measurement ... it's dual use."*
The same document had applied this rule **correctly** two sections earlier to a
latency signal, then failed to apply it here. **The oracle did not get in by
argument; it got in through a word choice nobody re-read** — which is the reason
this is a rule rather than an instinct, and why the check is a re-read of the
vocabulary rather than of the reasoning.

## Pointers

- `src/Core/CoordinationSpectrum.fs` — the worked example (`SpectrumMatch` neutral;
  reunion/sybil are caller policy) · `src/Core/AntiSybil.fs` (the oracle it wraps)
- [`every-bug-has-economic-value.md`](every-bug-has-economic-value.md) — a bug is a
  priced opportunity, not a liability to hide; same refusal-to-pre-judge stance
- [`manifesto-13-specifications.md`](manifesto-13-specifications.md) §11 Default Oracle
  / Multi-Oracle Principle — no single mandatory morality; the mechanism defers
- [`no-directives.md`](no-directives.md) — source ≠ authorization; here: detection ≠ verdict
- `docs/VISION.md` §"Charlatan, magician, teacher" — the worked instance above, and the taxonomy the correction repaired
