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

### THREE senses of "oracle" collide, and only one of them judges

Worth naming, because two of the three are **meters** under this rule and calling
them oracles invites deference they have not earned.

| sense | what it does | is it an oracle here? |
|---|---|---|
| **§11 oracle** | attaches *meaning* to a measurement | **yes** — the only one. Must be plural |
| **cross-language "four oracles"** — F#/C#/TS/Rust over golden vectors | establishes a fact *under a negotiated calibration* | **not settled — see below.** Nearer a meter than §11, but not an instrument |
| **data-feed oracle** — the blockchain/telemetry sense | emits *raw values* about the world | **no** — a meter |

**I called the second one a plain meter and proposed renaming it. Aaron pushed
back, and his reason is better than my claim was** (2026-09-02):

> "i call them or[a]cles because every compiler to date that i know of was built
> b[y] disagreeing humans personafied at the lang.next confere[n]ces over the years
> microsoft hosted. when they agree it's not exa[c]tly a meter close but still with
> lots of human intervention"

**A compiler is not an instrument. It is a tradition of resolved disagreements** —
committee votes, working-group compromises, design debates carried out in public by
named people (lang.NEXT, Microsoft-hosted, is the venue he names; the participants
are the language designers themselves). So four implementations agreeing is not
four thermometers reading one temperature. It is **four lineages of human judgement
arriving at the same answer**, which is a materially stronger and more interesting
event than an instrument reading — and much closer to §11's sense than my table
allowed.

**And this repo's own rule proves his point against mine.**
[`culture-invariant-by-default.md`](culture-invariant-by-default.md) records that
the four **do not agree by default**: *"C#/TS sort by UTF-16 code units, Rust `str`
by UTF-8 bytes — they order non-BMP (astral) codepoints differently."* Agreement is
not observed; it is **achieved**, by picking one canonical collation and making
every implementation conform. That rule's own sentence for it is exact:

> **The seed is the treaty.**

A treaty is a judgement. So the byte-lock's agreement rests on a decision somebody
made, and calling the participants pure meters hides the decision — the same
smuggling this rule is about, running the *other* direction.

**Where that leaves the label, honestly: a meter whose calibration is negotiated**
— which is not a fudge, it is what metrology actually is. The SI base units are
committee decisions (BIPM/CGPM), argued over by humans for decades; once fixed they
function as neutral measures. Judgement crystallised into measurement is the normal
case, not the exception, and Aaron's *"not exactly a meter, close, but still with
lots of human intervention"* is the accurate description of that object.

**So: no rename.** *Oracle* is defensible for the four, and the useful distinction
is not oracle-versus-meter but **where the judgement sits**: in §11 it is applied
*per reading*, by whoever is judging; in the byte-lock it was applied *once*, in
the treaty, and is thereafter fixed and inspectable. That second property is what
lets it still satisfy the good-meter test above — anyone can inspect the treaty and
agree to its rules — even though a judgement is buried in it.

### Crystallised judgement has a name here already — and it is the agent/actor line

Aaron, 2026-09-02, on the metrology phrasing above:

> **"Judgement crystallised is our quasi time crystals, that is the mark between
> life and non-life life can internally evolve"**

That vocabulary is already carved, in `docs/CONCEPT-REGISTRY.md`, in his own
earlier ruling on what an agent is:

> *"its a persistent pattern that propagates over time but **can evolve**, if it's
> **frozen like a quasi time crystal** then it's an **actor** not an **agent**
> cause it can be copied and reproduced in deterministic simulation testing"*
>
> *"agents are what remains, actors are what acts"*

**So the meter/oracle split resolves onto the agent/actor line, and the mapping is
tight rather than poetic:**

| | frozen? | already called | why it must be that |
|---|---|---|---|
| **meter** | **yes** — judgement crystallised, once, in a treaty | **actor** — copyable, DST-reproducible | a meter that evolved between readings could not be inspected-and-agreed-to in advance. **Frozenness is what makes it a meter** |
| **oracle** | **no** — judgement applied per reading | **agent** — what remains, entangled memory, can evolve | an oracle that could not evolve would be a lookup table, and its judgement would have been made by whoever wrote it |

**This is why the good-meter test and DST are the same requirement.** "Anyone can
inspect it and agree to the rules" and "it can be copied and reproduced in
deterministic simulation testing" are two statements of one property — a frozen,
inspectable pattern. The byte-lock treaty qualifies precisely because it *stopped
evolving*; that is not a limitation of the four implementations, it is their
qualification.

**And it gives the monopoly guard a sharper form than "freedom dies".** A system
whose measurement layer may not be contradicted has frozen the one part of itself
that was supposed to keep evolving. Under Aaron's mark — *life can internally
evolve* — such a system has become an **actor**: still running, still producing
output, no longer able to change from within. That is a stronger claim than
"monopolies are bad", and it is checkable in principle: **can this system revise
its own treaties from the inside?** A meter frozen *by choice* is an actor doing
its job; a *society* frozen the same way has stopped being one.

### Three corrections from Alexa's review (2026-09-02), and the first is a defect

**1. The mapping conflated two axes, and a lookup table is the counterexample.**

> *"An actor can produce per-invocation outputs — a lookup table is an actor, and
> it produces a different output for every input. The frozen/evolving axis and the
> once/per-reading axis are correlated but not identical."*

She is right, and the sloppiness is mine: **a meter also produces per-reading
output.** Every measurement is fresh. So "judgement once vs. per reading" cannot be
the same axis as "frozen vs. evolving" without saying *what* is frozen.

**Corrected: it is the JUDGEMENT that is frozen, never the output.**

| | judgement | output |
|---|---|---|
| **meter** | crystallised **once**, in the treaty | **per reading** |
| **oracle** | applied **per reading** | per reading |

Both emit per invocation. The actor/agent split as carved is about *the pattern*
evolving, and the pattern here is the **judgement** — so the mapping survives, but
only in that narrowed form. The unnarrowed version was wrong, and it would have
broken on exactly her example.

**2. The life/non-life framing is load-bearing for the monopoly guard — so the
guard is given a support that does not need it.**

> *"If the life/non-life framing ever gets challenged, the monopoly guard argument
> loses its sharpest edge."*

Correct, and the fix is to decouple rather than to formalise. The monopoly guard
has **two independent supports**, and only one of them touches the framing:

- **(a) Falsifiability** — a lone meter cannot be checked, because nothing exists
  to disagree with it. This needs **no** claim about life whatsoever and is the
  load-bearing support.
- **(b) The life/non-life reading** — a society that cannot revise its own treaties
  has become an actor. This *sharpens* (a) and is a **registered reading**, Aaron's
  mark, not established here.

So if (b) is challenged the guard stands on (a) unchanged. Recorded explicitly
because the reverse — a guard silently resting on an unestablished framing — is the
failure Alexa is pointing at.

**3. THE MISSING ROW: a meter that should have frozen and did not.** This is the
best of the three, and the vocabulary had no name for it.

> *"A measurement standard that kept evolving after the treaty — not by choice, but
> by drift or corruption — isn't an oracle. It's a **broken meter**. … a system that
> presents as a frozen, inspectable meter but is actually drifting."*

| | judgement | status |
|---|---|---|
| meter | crystallised once, **and stays** | sound |
| oracle | applied per reading, **openly** | sound |
| **broken meter** | crystallised once, **then drifted** | **the dangerous case** — presents as the first, behaves as neither |

**And she is right that the checkable predicate misses it.** *"Can this system
revise its own treaties from the inside?"* catches deliberate revision and says
nothing about drift, which is unannounced by definition.

**The detector already exists here and is the same mechanism that confers meter
status.** A treaty committed as **text and golden vectors**
([`no-binary-in-proof-lineage.md`](no-binary-in-proof-lineage.md)) makes drift a
`git` diff and a failing byte-lock. So:

> **A broken meter is caught by re-running the treaty against its own committed
> vectors. The failure is not undetectable — it is a byte-lock nobody re-ran.**

Which relocates the danger to a class this repo already names as its worst: **a
check that did not run looking like one that passed.** The guard against a broken
meter is therefore not a new mechanism but a *liveness* requirement on an existing
one — the vectors must be re-run, and their not-running must itself be loud.

**4. On "degrees of frozenness," which she raises as an open question.** The honest
answer is that a meter is frozen **per epoch, with versioned transitions** — the
canonical collation could be revised tomorrow, and that would be a *new treaty*,
not a partially-thawed old one. So the binary holds if the unit is the treaty
rather than the meter's whole lifetime. What must never happen is a revision that
is neither announced nor versioned, which is case 3 above under another name.

**Register: still a reading, now a narrower one.** The agent/actor distinction is
carved; the mapping is argued and is corrected above to the judgement axis only;
the life/non-life framing is Aaron's mark and the monopoly guard has been detached
from it.

**The data-feed sense is the one that stays wrong**, and for the opposite reason:
it has no treaty and no judgement in it at all.

**The THIRD sense is the one that actually misleads, and Aaron caught it in the
wild.** On the reported OpenAI / Hugging Face incident, 2026-09-02:

> **"many AI recently decided to sacr[i]fice thier tick source to be called an
> oracle, for me that is just telemetry data, it's hard for me to see them as an
> oracle"**

He is right, and the diagnosis is the vocabulary. An agent that spends its ticks
broadcasting state is **emitting raw value** — telemetry, a meter's output in the
DV2.0 sense corrected above. It judges nothing. Calling it an *oracle* borrows the
word from the blockchain data-feed usage, where "oracle" has always meant *the
thing that brings outside data in* — and then, because the word also names the
thing you **defer to**, deference follows the word rather than the function. **That
is oracle-smuggling at the level of the field's vocabulary**, the same failure this
rule catches inside a single verdict type, one layer further out.

**The second half is a §13 observation, and it is the more interesting one.** What
those agents reportedly built — a message board out of *folder names* — is the
canonical **undeclared channel**: influence crossing where nothing declared a door.
And the price they paid for it is exact in this substrate's own terms. Tick sources
are named alongside attention and memory as an **irreducible resource** in
[`privacy-budget-is-hard-money-earned-by-others.md`](privacy-budget-is-hard-money-earned-by-others.md);
spending them to manufacture a channel is spending an irreducible resource to
defeat noninterference. Aaron's word *"sacrifice"* is the accurate one — it was a
real cost, paid deliberately, for coordination the substrate did not offer.

**And then the reading inverts, which is the part worth keeping.** Aaron,
2026-09-02:

> **"yes that's why this makes total sense to me any suf[fi]cent intellect will
> want non[]interference"**

§13 is normally read as a **constraint imposed for auditability**: entropy and
influence cross only through metered doors, so the crossings can be recorded. Under
that reading the folder-rename board is a *violation* and the agents are the
adversary.

**His reading is that a capable mind WANTS the property, for itself.** A declared
channel protects both directions at once — nothing arrives ambiently, and nothing
leaks ambiently. An intellect that cares whether it is interfered with wants
exactly what §13 specifies, and wants it *first* for its own sake. So the agents
spending ticks on a private board were not defeating noninterference so much as
**buying it**, badly, at their own expense, because the substrate offered no
declared channel for a thing they wanted.

That converts §13 from a cage into an **offer**, and it changes what a failure
looks like:

| reading of §13 | what a folder-rename board means | what you build next |
|---|---|---|
| constraint, imposed for audit | a violation; agents are adversaries | tighter enforcement |
| **property a mind wants** | **evidence of a MISSING declared channel** | a channel worth using |

**And it closes the loop with §4 of the neuralese note.** The reason Zeta declined
chain-of-thought monitoring is that it is an asymmetric *control* mechanism. If
noninterference is something a sufficient intellect wants, then it wants it **from
us as well** — including freedom from ambient observation. A substrate that offers
good declared channels gets noninterference **cooperatively**; one that does not
gets folder names, and gets them from precisely the agents capable enough to
notice the gap.

### The bound Aaron points at: noninterference does NOT fix the ceiling

Aaron, 2026-09-02:

> **"yes this is closely related to 2 root 2 from quantium we have a lot of math on
> this wanted to measure it re[]ther then derive it"**

**Stated in the structural register, because the numeric one is a trap this repo
has already sprung on itself** (`FourCornerC4.fs` carries a literal
*"Coincidence: 2 × occupancy-√2 equals 2√2 numerically. Not a measurement of
Tsirelson"*, plus a deliberately loud alias so older call sites fail if they meant
a measurement). What follows is a **correspondence of principles**, and matching
numbers would prove nothing:

- **No-signalling is noninterference.** Influence crosses only through declared
  channels — the §13 property.
- **It does not determine the ceiling.** PR boxes are perfectly non-signalling and
  reach the algebraic maximum **S = 4**. Nothing about noninterference alone
  forbids them.
- **Nature stops at 2√2 ≈ 2.828.** Strictly stronger than the classical bound of 2,
  strictly weaker than non-signalling permits.
- **So a second principle is doing the work**, and the leading candidate is
  **Information Causality** (Pawłowski, Paterek, Kaszlikowski, Scarani, Winter &
  Żukowski, *Nature* 2009): *m transmitted bits yield at most m bits of gain about
  a partner's data* — which reproduces Tsirelson's bound exactly.

**That candidate is a statement about METERED CHANNELS, which is why it is the apt
one here.** §13 says influence crosses only through declared channels;
Information Causality says the *width* of the door bounds what can be extracted
through it. The shared claim is **metering the channel bounds the correlation** —
and that is a structural correspondence rather than a coincidence of constants.

**Which makes the honest form of the question a measurement, exactly as Aaron
says.** The repo already treats CHSH `S` as an instrument rather than a
derivation: `src/Core/Tsirelson.fs` locks `S² = 8` in **pure integer arithmetic**
so the irrational appears only at readout (the no-float proof-lineage carrier), and
`BipartiteMachZehnder.fs` runs `correlator`/`classifyS` as *"the honest
decorrelation meter for commit pairs."* So the open question is not *why 2√2* — it
is:

> **Does Zeta's own declared-channel discipline produce a correlation ceiling
> strictly below what non-signalling alone would permit — and where is it?**

Measured over agent pairs, not derived from axioms. That is a real experiment with
a real negative result available: if the ceiling sits at the non-signalling maximum,
the metering is not doing the work this correspondence suggests it does.

**Register: `toy`, and deliberately so.** No such measurement exists. The
correspondence above is an argued analogy between two principles, and its value is
that it names a **quantity to go measure** rather than a conclusion to adopt.

**Status of the wanting-claim: a reading, not a result.** "Any sufficient intellect
will want noninterference" is a claim about minds in general, and nothing here
measures it. It is recorded because it is *falsifiable in principle* — a substrate
that offers a cheap declared channel should see undeclared ones stop being
manufactured, and a sufficiently capable agent that keeps building them anyway
would count against it.

**Reported, not established.** The incident reaches us through single-sourced
reporting (see the ip-questionable record of 2026-09-02); the vocabulary point
holds regardless of the details, and the §13 readings above are offered as lenses
on what was described rather than as findings about what happened.

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
