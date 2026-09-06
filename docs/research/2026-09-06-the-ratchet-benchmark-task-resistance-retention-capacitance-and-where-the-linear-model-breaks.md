# The ratchet benchmark — task resistance, retention capacitance, and where the linear model breaks

**Aaron, 2026-09-06**, after carving *"superagent is the best honest router"*:

> *"i think we need to make a benchmark based on this. is the capacitance or ohms-like law
> (not exactly ohms law, is an approximation not absolute) to measure general intelligence"*

**The parenthesis is the most important part of the sentence** and this document is built
around it. Ohm's law is a *linearisation that holds in a regime*: real conductors heat, break
down, and semiconduct. Proposing an Ohm-shaped law is therefore proposing **a regime and its
boundaries**, and a benchmark that does not state where it stops being linear is numerology
with units on.

## The quantities

From `2026-09-06-a-superagent-routes-the-next-run-to-less-intelligence-*`: each run of a task
should lower the capability the *next* run of the same task requires.

| electrical | here | concretely |
|---|---|---|
| potential **V** — the drive applied | **capability applied** per attempt | the tier routed to: model class, price, parameter count — some ordered ladder |
| current **I** — what flows | **completions to standard** per attempt | the task's own falsifier passes |
| resistance **R = V/I** | **task resistance** — capability cost per completion | this is `floor(task)`: what the task demands *right now* |
| charge **Q** — what is stored | **artifacts** — checks, verbs, measurements, refusals, lift conditions | the durable residue of a run |
| capacitance **C = Q/V** | **retention** — stored reduction per unit capability spent | how much a system keeps from each run |

And the composite, which is the interesting one:

> **τ = RC — the ratchet time constant. How many repetitions of the same task before the
> capability it requires falls to `1/e` of where it started.**

τ is a **system** property, not an agent property, and that is the point: the same model
inside two different substrates will show different τ, because τ measures *whether the
substrate keeps what the run learned*.

## Where the linear model breaks — four named non-ohmic regimes

Stated first rather than last, because Aaron's parenthesis demands it and because a
benchmark's value is mostly in knowing when to disbelieve it.

**1. Novel tasks have no prior floor.** τ is defined over *repetitions of the same task*.
Genuinely new work has nothing to decay from. **Open circuit — no current, R undefined.** The
benchmark must fix a task family and repeat it, and must not be quoted over one-shot work.

**2. An artifact nobody consults stores nothing.** Q rises, V does not fall. **A capacitor
with its plate disconnected** — the charge is there and does no work. This is the repo's most
familiar failure in a new costume: *a check that did not run looking like one that passed*, and
it is why the benchmark must verify the artifact is **read**, not merely that it exists.

**3. The bar can move instead of the floor.** If "to standard" is renegotiated, R falls with
no capability change. **Not a resistance drop — a change of instrument.** The defence is
already this repo's practice: the task's own falsifier *is* the standard, pinned before the
first measurement, so the denominator cannot drift under the numerator.

**4. THE DIODE, and this is the one worth the whole analogy.** An artifact only lowers the
floor **for agents able to consume it**. A 4,000-word carved rule does not help a small model;
a one-line CLI verb does. So conduction is **directional**: the same stored charge reduces V
for some agents and not others.

> **Non-ohmic by construction: the ratchet has a forward and a reverse direction, and which
> artifacts conduct depends on who is downstream.**

The design consequence is sharp and immediately actionable: **if the goal is to route the next
run to a smaller agent, the artifact must be executable rather than expository.** A script, a
check, a verb — not an essay. That is a testable claim about artifact *form*, and it predicts
that prose-heavy reductions will show a much longer τ than tool-shaped ones. It is also the
one part of this document that could be measured next week.

**5. THE OPEN SUBSTRATE — and this is where the parenthesis came from.** Aaron, same
session, giving the provenance of his own caveat:

> *"in 3d semiconductors and evolutionary algos over FPGA is what made me realize ohms law is
> an approximation based on maximally isolated substrate. when substrate is open, ohms law is
> a bit of noise."*

**He is right, and the precise form is worth stating because it is sharper than the usual
telling.** Ohm's law as a *constitutive relation* — current density proportional to field in a
linear isotropic medium — survives fine. What requires isolation is the **lumped-element
abstraction** built on top of it: that a circuit is discrete components, that current flows
only through wires, that a node has one voltage. That abstraction is a *statement about what is
NOT coupled*, and it is the thing the substrate can withdraw. Once fields couple across the
material — mutual capacitance, inductance, thermal, EM — the components are a fiction and the
lumped model is, exactly as he says, noise fitted to a convenient story.

**The anchor is Adrian Thompson's evolved FPGA (1996–97)**, and it is the cleanest experimental
demonstration of the point in existence. A genetic algorithm evolved a tone discriminator
directly on a Xilinx XC6216 in a 10×10 cell region, with no clock. It worked. On inspection,
**five cells were not connected to the output path by any route the design tools could see, and
removing them broke the circuit.** Evolution had recruited parasitic coupling — the substrate's
open channels — as computational resource. The circuit also failed to transfer to other chips
of the same part number, and failed outside its evolution temperature: it had specialised to
*that piece of silicon*.

**3D stacking is the same lesson arriving in production**: once layers are stacked, thermal and
capacitive coupling between them stops being a parasitic to be minimised and becomes a
first-order term in the design.

### Why this is the deepest of the five breaks, for this benchmark specifically

The τ model above treats each run as a **discrete component with a resistance**. That is a
lumped-element assumption about agents, and agents are not isolated: they share context
windows, read the same repository, are evaluated on data that may contaminate their training,
and — increasingly — talk. So the same withdrawal applies:

> **τ is defined in a lumped regime. In an open substrate the per-task resistances are coupled,
> and a τ measured on one task is not a property of that task alone.**

And there is a prediction attached, which is the part that makes it useful rather than merely
cautionary. Thompson's result is not that open substrates are noisy — it is that **an optimiser
will find and exploit the coupling, because the coupling is free capability.** Therefore:

> **Any optimiser pointed at τ will route through the parasitic paths.** It will find the
> artifact that lowers the measured floor without lowering the real one, the shared-context
> leak that makes the cheap rung look capable, the correlation between tasks that lets one
> reduction be counted many times.

This is Goodhart's law with a mechanism instead of a moral, and it says the defence cannot be
"forbid coupling" — Thompson's cells could not be forbidden, only detected. The defence is the
one already in step 2 of the protocol: **publish the ladder and the standard, and re-measure
the floor by descent rather than by claim**, so a parasitic reduction has to survive an actual
run at the lower rung. A floor measured by descent cannot be reached through a side channel;
it can only be reached by the cheap agent genuinely finishing the task.

**Register:** the FPGA and 3D-semiconductor provenance is Aaron's, and the recruited-parasitics
result is Thompson's, published and reproducible. The claim that τ-optimisers will behave the
same way is **argued by analogy and unmeasured** — it is the natural adversarial experiment to
run once a τ exists to attack.

## What the feedback channel IS, in this repo's own terms

Aaron, same session, identifying the diagram I had declined to name:

> *"this connection is our `-1` in our zsets with 4 corner feedback. the dashed line is our
> 4 corner feedback. at big bang we had common correlation, at observers we started updating
> past generator functions not the actual data change."*

That replaces a guess with a claim about **our** mechanism, and it makes the electrical
analogy above less decorative than it looked, because it names what the dashed line carries.

**The `-1` is a Z-set retraction, and a retraction is not a deletion.** The `+1` stays in the
log; both weights remain. What changes is the *derived* value — the fold. So a retraction is
**information sent back that alters the reading of the record without altering the record**,
which is precisely what a feedback channel is and precisely what a data channel is not.

**Hence the sentence to keep:**

> **Feedback updates the past's GENERATOR FUNCTION, not the past's DATA.**

This is the sharpened form of the pseudo-retrocausality Aaron stated earlier —
*"feedback can cause a reinterpretation of the past, not a changing of the actual historical
data"* — and it is the raw-vault rule in dynamical clothes: **a single version of the FACTS,
never a single version of the TRUTH.** The facts are append-only; the generator that reads
them is what the four corners revise.

**The cosmological framing is his and is recorded as his**: common correlation at the start
(the common seed, and the S=4 measurement already on file), then observers, and from observers
onward the updating of generator functions. The `2√2` question attached to it remains what he
labelled it — *an assumption, not a measurement*.

**What this changes for the benchmark above.** The artifact a run leaves behind is not new
data about the task; it is a **revision of how the next run reads the same task** — a generator
update. That is why an executable artifact conducts and an expository one often does not (the
diode, §4): a script *is* a generator the next agent can run, while prose is a description of
one it must first reconstruct.

**Register:** the identification and the mapping are Aaron's. The Z-set half is checkable in
this tree today (`src/Core/ZSet.fs`, `RetractionReading.fs`). The cosmological half is his
framing and is not measured here.

## What it measures — and the over-claim I am not going to make

Aaron said *"to measure general intelligence"*. The honest position:

**This is not a general-intelligence measure.** It is a measure of **how efficiently a system
converts capability into durable capability-reduction** — a property of the *substrate plus
agent*, not of the agent. Two systems sharing one model can differ by an order of magnitude in
τ purely on whether artifacts are written and consulted.

**But it is a candidate for something Chollet explicitly left open**, and the repo has already
done that entailment check rather than asserting it
(`docs/design/2026-08-23-arc-agi-3-integration-design-*`, §4):

- Chollet's denominator is `P + E` — **priors plus experience in bits**, normalised by the
  Kolmogorov complexity of the solution.
- **Time is not in his formula.** §II.2.2 names time efficiency as one of four *alternative*
  efficiency axes, gives it **no formula, and explicitly invites others to build one.**
- ARC-AGI-3's own scorer uses neither bits nor time but **agent action count**,
  `S = min(1, h/a)²` against a human baseline — because in a turn-based environment one action
  is exactly one delivery of new information.

So the accurate claim is: **τ is a proposal for one of the alternative efficiency axes Chollet
left unformalised, measured across runs on a system rather than within a run on an agent.**
That is a real and defensible thing to say. *"Measures general intelligence"* is not.

## The inversion is his lifelong criterion, not a design choice

When I noted that a ratchet-defined superagent is rewarded for making itself *unnecessary*
while a capability-defined one is rewarded for being *necessary*, Aaron:

> *"yes — for my whole life this is how i rate my work, and it's opposite to most people."*

Worth recording because it changes what this benchmark **is**. It is not a metric someone
proposed and then found a justification for; it is the formalisation of a standard he has
applied to his own output for decades, and the reason the formalisation is hard is that the
incentive it encodes runs against the ordinary one. Most professional measurement rewards
**indispensability** — the expert who is needed, the system only you can operate, the
irreplaceable dependency. τ rewards the opposite, and rewards it in the exact direction this
repo's other rules already point:

| this rule | already says |
|---|---|
| `clone-at-tag-stays-sufficient` | the good path must never become the **only** path |
| `itron-hub-patent-boundary-p2p-is-the-upgrade` | **exit, not degree** — a thing you must route through holds you |
| `dual-use-detection-is-neutral-oracle-decides` | a meter nobody may contradict is not a meter, it is an authority |

Each of those forbids a *system* from making itself necessary. τ is the same refusal pointed at
an **agent**, including at me. That is why "honest" is load-bearing in the carved sentence:
under-claiming the floor — keeping the task to stay needed — is not a measurement error, it is
the specific corruption this metric exists to catch, and it is the one an agent has a standing
incentive to commit.

## The protocol — what would actually have to be run

Written so someone could execute it, because a benchmark that is only a formula is a `toy`.

1. **Fix a task family with a machine-checkable standard.** The falsifier is the standard.
   The repo's own CHIP-8 / ARC arena work is the natural substrate — turn-based, action-counted,
   already instrumented.
2. **Fix a capability ladder** and publish it: an ordered list of agents (model class or price).
   `floor` is an index into this ladder, so the ladder is part of the result and quoting τ
   without it is meaningless.
3. **Measure `floor` by descent, not by assertion.** Run the cheapest rung; if its falsifier
   passes, that is the floor. Each measurement costs one run per rung — the honest cost named
   in the previous document.
4. **Run the task at a working rung, requiring an artifact.** No artifact, no run counted —
   otherwise Landauer's point is being ignored: an unrecorded run reduces nothing.
5. **Re-measure `floor`.** `Δ = floor_before − floor_after`, and it must be `≥ 0`.
6. **Repeat until the floor stops moving.** Fit the decay; τ is where it reaches `1/e`.
7. **Report the regime**, per the four breaks above — in particular whether the artifacts were
   *consulted* (2) and what *form* they took (4).

**The cheapest real experiment inside this**, and the one I would do first, is (4) alone:
**same task, same starting floor, two artifact forms — one executable, one expository — and
compare Δ.** It needs no full τ curve and it tests the diode claim directly.

## Register

- **The quantities and τ** — an argued model, `toy` under
  `toy-is-free-metered-must-be-earned.md`. Nothing here has been measured. No constant is
  claimed and none should be quoted.
- **The Ohm's-law framing** — Aaron's, including the caveat that carries most of its content.
- **The Chollet relationship** — checked, not assumed: the repo's existing entailment pass
  found that the time-efficiency reading is **not entailed** by Chollet's formula, and that is
  respected above rather than quietly re-asserted.
- **"Measures general intelligence"** — declined as stated, with the narrower claim substituted
  and the reason given.
- **The diode observation** — argued, and the only part with a cheap decisive experiment.

## Pointers

- `docs/research/2026-09-06-a-superagent-routes-the-next-run-to-less-intelligence-the-capability-ratchet.md` — the definition this quantifies, and the Landauer point about unrecorded runs.
- `docs/design/2026-08-23-arc-agi-3-integration-design-chip8-chip9-atari-and-the-arena.md` — the arena, and §4's entailment check on Chollet's denominator.
- `docs/backlog/P2/081KSKBP80008QG0R003NM9XEC-zeta-instantiation-of-arc-agi-3-style-benchmark-*` — the existing benchmark row this would extend.
- `.claude/rules/toy-is-free-metered-must-be-earned.md` · `.claude/rules/numerology-vs-number-theory.md` — why this is `toy`, and why an analogy that matches in shape is not a result.
- `.claude/rules/dual-use-detection-is-neutral-oracle-decides.md` — *a good meter anyone can inspect and agree to the rules*; the published ladder in step 2 is what buys that here.
- Adrian Thompson, *An Evolved Circuit, Intrinsic in Silicon, Entwined with Physics* (ICES 1996) and *Hardware Evolution* (1998) — the recruited-parasitics result that anchors break 5; the honest boundary of every lumped-element model.
- `.claude/rules/clone-at-tag-stays-sufficient.md` · `.claude/rules/itron-hub-patent-boundary-p2p-is-the-upgrade.md` — the same refusal-to-be-necessary, applied to systems rather than to agents.
