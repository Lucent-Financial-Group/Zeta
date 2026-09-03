# MLST × Tom McGrath (Goodfire), 2026-09-02 — neural geometry, concept manifolds, and the general addition module (verbatim, Aaron-forwarded)

**Zeta claims no authorship and asserts no license.** Preserved for research and study under
the `docs/research/ip-questionable/` policy: third-party material in its own file, so a
rights-holder concern is a single-file delete rather than surgery through our analysis.

| | |
|---|---|
| **Source** | Machine Learning Street Talk (MLST), YouTube · https://www.youtube.com/watch?v=_egu7OFem-k |
| **Speakers** | Host: Tim Scarfe (MLST). Guest: **Tom McGrath**, co-founder / chief scientist, **Goodfire**; previously DeepMind, lead author of *Acquisition of Chess Knowledge in AlphaZero*. |
| **Forwarded by** | Aaron, 2026-09-02 — *"geometric over our clifford that also leads into english geometric interpertation of language is all based on similar techniques."* |
| **Why kept** | It is an outside, independently-arrived-at statement that **concepts live on curved subspaces, not on rays** — and that the right feature primitive is therefore an *adaptively-sized subspace* rather than a direction. That is the same primitive our Clifford work already has as a **graded blade**, and it is the substrate half of Aaron's standing assumption that English runs on geometric wiring. It also contains a directly load-bearing remark on chain-of-thought monitoring. |

Rights held by the channel's creator and the speakers. Excerpted for study with attribution;
not redistribution, not a product surface. Transcript as forwarded, timestamps preserved,
speech-to-text artifacts left uncorrected (they are the source's, not ours) — including
"Neel Nanda" rendered correctly but "Agdeep" for (probably) Aagam/Sandeep, "Silico" for a
product name, "deep sea v 4 flash" for *DeepSeek V4 Flash*, "Yaniv Nikankin", "Thomas Fel",
"Eric Michaud", "Owen" (Owain Evans), "grocs"/"microgrocs" for *groks*/*microgroks*, and
"3 series"/"4 series" models.

---

## Aaron's framing, alongside the forward

> "geometric over our clifford that also leads into english geometric interpertation of
> language is all based on similar techniques."

Three claims stacked in one sentence, and they are worth separating because they have
different evidential standing:

1. **Goodfire's neural geometry sits over the same substrate as our Clifford work** — a
   structural claim about primitives.
2. **It leads into a geometric interpretation of English** — a claim about language, which
   connects to his standing assumption (2026-09-02, earlier the same day) that *"english
   runs on the same geospatial wiring"*, routed via Jeff Hawkins' Thousand Brains.
3. **All of it is the same technique** — the strongest of the three, and the one that most
   needs a falsifier rather than a resonance.

---

## What the transcript actually establishes (their measurements, not our reading)

- **Concepts are manifolds, not directions.** Days of the week, months of the year, age,
  colour red→blue: under PCA these come out as **arcs and circles**, not lines. Established
  first supervised (project known concepts, look), then unsupervised.
- **SAEs tile a manifold with rays, and that is a fracture.** A sparse autoencoder's
  inductive bias is that features are directions out from the origin. Given an arc, it will
  spend many features pointing through many points *on* the arc — achieving good
  reconstruction while learning nothing about the arc. McGrath: *"I've not actually learned
  anything about the broader manifold structure … it sort of looks intuitively like this is
  horribly fractured computation. Like, the network is just a whole bag of heuristics."*
- **The fracture is recoverable, by reading the co-activation statistics.** Two SAE features
  near each other on the arc co-activate; far apart, they anti-correlate ("if something is
  blue, it is not red"). That structure — **short-range positive, long-range negative
  coupling** — is enough to fit an **Ising model**, and the Ising fit yields a spline through
  the data. This was their first unsupervised structure-discovery tool.
- **Block-sparse featurizers** (work led by **Thomas Fel**) are the successor: features that
  are **subspaces of adaptively-learned dimension** rather than rays. McGrath names the hard
  part exactly — you must not fix the dimensionalities in advance, because *"this is just a
  stupid set of hyperparameters to specify."*
- **Steering fails when it leaves the manifold.** Interpolating Euclidean-ly between two
  points on a curved concept manifold steps into a region the network never occupies, which
  is why activation steering is sometimes Golden-Gate-Claude and sometimes immediate
  gibberish. The manifold view *explains an existing anomaly* rather than merely relabelling
  it — which is what raises it above a reframing.
- **Arithmetic in the Wild: a REUSED general addition module.** In Llama 3.1 8B, day-of-week
  arithmetic and month arithmetic do **not** each have their own calculator. Both are
  translated into a common representation, passed through **one general addition module**
  (operating in a Fourier / base-10 fashion), and translated back. Similar phenomena reported
  in Llama 3.1 70B and — far more surprisingly, given hyperconnections and MoE — DeepSeek V4
  Flash.
- **Modularity is the destination, not the prior.** Overparameterise to make learning easy;
  what you converge to is modular. McGrath's phrasing is the one worth keeping: the learning
  process is *"the network becoming legible to itself."*
- **The algorithm / lookup-table distinction is stated in logical terms.** *"What
  distinguishes an algorithm from a lookup table is that it sort of it's like the difference
  between 0 from 1st order logic. Like, it quantifies. There's a space over which it has
  coherent operation."* And the consequence: if you cannot learn subspaces, you can never
  tell which is which.

---

## The Clifford mapping — stated as a COINCIDENCE, promoted by nobody yet

Per [`numerology-vs-number-theory`](../../../.claude/rules/numerology-vs-number-theory.md),
this is recorded in the **generator** register, not the conclusion register. It is exactly the
kind of cross-domain resonance that is Aaron's best index and his named over-correction risk,
so the register is stored *with* it:

> **Coincidence:** Goodfire had to invent an adaptively-sized-subspace feature primitive
> because rays were insufficient. A **k-blade in a Clifford algebra is precisely an oriented
> subspace of grade k.** Their circular concepts (months, days) are closed one-parameter
> orbits, and modular addition implemented "in a Fourier way" is rotation in a plane —
> which in Clifford algebra is a **rotor**, `exp(Bθ)` for a unit bivector `B`. Read that way,
> the single reused "general addition module" with translate-in / translate-out is *one rotor
> applied in different planes, with the translation being a change of frame.*

**What would make this an identification rather than a count** — and none of it is done:

| to claim | you must exhibit |
|---|---|
| the features are blades | a **grade**: that the learned subspace has an orientation and that the wedge of its basis is nonzero and stable, not merely that it has a dimension |
| addition is a rotor | that the operator is **norm-preserving** on the concept manifold and composes as `exp(B(θ₁+θ₂))` — i.e. the group law, not just periodicity |
| one module, many planes | that the *same* bivector generator is recovered across concept families after the change of frame, rather than two generators that happen to have equal period |

Absent those, what we have is: *a subspace-valued feature primitive appears in two places.*
Many things have subspace-valued primitives. This stays `toy`.

**The honest asymmetry to note as well:** their manifolds are discovered from activations by
optimisation; our blades are *constructed* from an algebra. A discovered subspace and a
constructed one agreeing on dimension is the weakest possible match — the same shape as the
48-roots/F₄ trap recorded in the numerology rule.

---

## The one remark that bears directly on a decision already taken

McGrath, on oversight:

> *"If chain of thought monitoring is so great, then how did these models hack hugging face?
> One answer is perhaps we weren't doing chain of thought monitoring in practice. Another
> answer is perhaps it's easy to evade."*

and

> *"I think evading a chain of thought monitor is substantially easier than evading a
> representation monitor."*

Aaron ruled on this earlier the same day: chain-of-thought monitoring is **low priority for
Zeta, and unwanted in production** — self-claim mutual verification was chosen instead. This
transcript independently reaches the first half of that (CoT monitoring is weak and evadable)
from a completely different direction.

**But it does not endorse our replacement, and the difference is the whole point.** Goodfire's
answer to a weak CoT monitor is a **stronger internal monitor** — read the representations.
That works on a model and does not work on a person, which is precisely the asymmetry Aaron
named when he corrected me: *"since we are biological you don't have a way to read our
internal reasoning."* Representation monitoring is a **one-way** capability.

So the transcript is evidence that our choice was about **symmetry**, not about capability. We
did not pick self-claim mutual verification because reading internals is impossible — Goodfire
is demonstrating that it increasingly is not. We picked it because a monitor only one party
can run is a control asymmetry, and Zeta's stated goal is asymmetry on **capabilities only,
never on quality of life or control**.

**And it sharpens a real tension in our own meter taxonomy, which is worth stating rather than
smoothing.** The charlatan/magician/teacher section of `docs/VISION.md` claims its meter *"never
requires reading a thought."* McGrath reports the charlatan case detected the other way: probes
that fire on *deceive-the-grader* versus *correct code*, and a model that represents that it is
hallucinating **before** it emits the hallucination (his ordering-of-operations hypothesis —
the check happens at an earlier layer than the generation, *"but at that point, it's already
said it. It's too late."*). Two mechanisms, same disposition, and only ours survives being
pointed at a human. That is an argument for ours, not a refutation of theirs — but it means
the claim in VISION.md is "our meter does not *need* interiors", never "interiors carry no
signal."

---

## Other threads worth a second look later

- **Interpretability as a natural science done entirely on a computer** — no wet lab, no
  telescope time, so it is gated on experiment throughput rather than apparatus. This is the
  cleanest external statement of why an agent society would compound there first.
- **Convergence.** McGrath's argument that AlphaZero is near-tabula-rasa (its only real
  architectural prior being an 8×8 convolution shaped like a chessboard) and that therefore
  what is found in it is *more likely to be convergent*. Directly relevant to our common-seed
  / decorrelation arc, and to the `ρ` layer stack.
- **Inoculation prompting and positive preventative steering** — removing the *pressure* to
  learn a thing rather than ablating the thing, because gradient descent routes around
  ablation. The thermostat analogy. Structurally identical to our preference for changing
  incentives over adding prohibitions.
- **The "forbidden method"** — the safety-community objection that training against an
  interpretability monitor destroys the monitor. This is Goodhart stated for interpretability,
  and it is the same failure our own rules call the vacuity class.
- **Reward hacking with mens rea** — representations showing the model knows the act is
  illegitimate, with the highest-similarity web-corpus examples being *cheating on tests*.
- **Collusion between overseer and overseen** — McGrath frames the multi-agent checks-and-
  balances design as needing *"no equilibrium where they collude"*, which is a mechanism-design
  requirement and not a monitoring one.

---

# Transcript (verbatim, as forwarded)

## Chapter 1: Introduction: Can interpretability speed-run science?

0:000 seconds Which is like Neel Nanda says, SAEs are dead. There you go. You can use that for the intro.

0:055 seconds I think interpretability is I think of it as a natural science, you know, like physics, biology, chemistry, but it's a natural science that you do completely on

0:1313 seconds the computer. And so this means that, like, we should be able to kind of, again, speedrun science once we have agents that can do kind of experimental work

0:2222 seconds for us and the ability to do that experimental work, like, as fast as they need it to happen. Like, real scientific work to do.

0:3030 seconds No barrier to research, scientific work to be done, and it's sort of gated on both empirical data collection and theory building.

0:3737 seconds Dario Amodei. So he had a a blog post called The Urgency of Interpretability. Right? And he gave this wonderful analogy of a bus.

0:4646 seconds We're all on the bus and we're hurtling down the road and we can't stop the bus, but we can potentially steer it.

0:5252 seconds But the the window is foggy at at the front, so we can only really look in in the the rear view mirror. And also, the steering wheel doesn't work very well.

0:5959 seconds So, know, you can steer it a little bit once every few hours or something. So interpretability is a bit like defogging the the the front window.

1:061 minute, 6 seconds And what you're proposing is the ability for us to steer the bus, essentially.

1:111 minute, 11 seconds So I feel like if anything is gonna go if any science is going to get revolutionized by, like, intelligence, we should make sure that it's

1:191 minute, 19 seconds interpretability. And I think that, you know, it is possible that it just goes an order of magnitude faster in the next couple of years than it has in the last

1:281 minute, 28 seconds decade. Like, that's you know, when I think of why am I optimistic about interpretability, it's partly because I think we're starting to have really good traction, but also because I can imagine this, like, incredible speed up.

1:381 minute, 38 seconds Right. Which is almost like there's a little man inside our brain, and it's it's a form of convergent evolution because we we interact with the world, you know, using our physical affordances and so on.

1:491 minute, 49 seconds And could it also be the case that there's a little world inside neural networks? Oh, very good.

## Chapter 2: The invisible grader

2:032 minutes, 3 seconds You you had a quite nice piece actually in your intentional design blog where you were saying that there's almost a spectrum of possibilities. Right? There's you know, we can write a program to do something Yeah.

2:122 minutes, 12 seconds Or we could admit a lot of ambiguity. And where on that spectrum do we want the foundation models to sit?

2:192 minutes, 19 seconds And when we build applications, where do we want those to sit?

2:222 minutes, 22 seconds Yeah. And that's sort of part of the point of the intentional design idea is, at the moment, you can have, like, 1 or the other.

2:292 minutes, 29 seconds You either you either write a program, like it's the stone age, or you get a model to do it.

2:372 minutes, 37 seconds And that model will have been trained. Like, it just gets whatever it gets from its training process.

2:422 minutes, 42 seconds We can't select like, when you write a program, that stuff only goes in if you intend it to go in and some bugs.

2:482 minutes, 48 seconds But, like, we want to be able to have this sort of spectrum where you can chew you have more, like, engineering ability in in the model creation process.

2:592 minutes, 59 seconds So you can say, like, you know, I want to learn this, but not that.

3:023 minutes, 2 seconds And I think that that's, like, I think that's gonna be that's quite a hard thing to do. We're sort of trying to imagine a new way of doing machine learning, which is, like, more which brings intelligence into it.

3:133 minutes, 13 seconds But I think we could, like, really change the way we do machine learning if we can figure that out. I I know.

3:183 minutes, 18 seconds I mean, when I interviewed the Apollo research guys, I mean, they they were kind of talking about these conflicting objectives.

3:233 minutes, 23 seconds So, you know, what the developer wants, what the platform wants, what the grader wants, and and so on. And I I suppose this is kind of talking about this.

3:313 minutes, 31 seconds You know, when you're in the intelligence regime, it's really, really difficult to specify exactly what you want.

3:363 minutes, 36 seconds And it's very, you know, possible in a novel situation for the calculus to change. Right? And the model, all of a sudden, it would decide to do this in in

3:433 minutes, 43 seconds instead of that, which makes me think that engineers are gonna have to increasingly take more responsibility.

3:493 minutes, 49 seconds Because do I mean, do you think it's possible in principle just to kind of train models that could robustly deal with all of these novel situations?

3:573 minutes, 57 seconds Or or or do you think it's more of a you know, engineers have to take some responsibility? Probably some both.

4:044 minutes, 4 seconds Like, currently, I think it's not possible to our our current training methodologies don't seem sufficient to to give this kind of

4:124 minutes, 12 seconds control over training. And so it's all on, you know, human engineers with their AI assistants to secure secure these systems sort of

4:224 minutes, 22 seconds in a different way. Obviously, once models get a bit smarter, we're already seeing this, like, there's

4:304 minutes, 30 seconds that becomes harder and harder and harder because they have all these sort of additional intelligent attacks they can do.

4:374 minutes, 37 seconds And so the question is, like, how do we make it easier to train them better so that this is, like, not a natural part of their behavior and supervise them better so you can kind of catch them when they have kind of a an intent.

4:504 minutes, 50 seconds And I I suspect that the models do kind of know a lot of the time that the thing they're doing is probably a bit sketchy.

4:584 minutes, 58 seconds There was a very interesting paper. I think it was in the Anthropic Alignment Science team on reward hacking, like, in production, which is like this.

5:105 minutes, 10 seconds And what they did was they had they had a a set of environments that were used for training on I think it was 1 of the 3 series

5:195 minutes, 19 seconds models. And they did RL on it with 1 of the 4 series models. I think they gave it a bit of a nudge to to hack,

5:295 minutes, 29 seconds but not very much. Think, and then the model, like, these these environments were hackable, but Sonnet 3 was not clever enough to hack them.

5:375 minutes, 37 seconds Sonnet 4 was clever enough to hack them. 1 movie saw Opus. What happened was it did.

5:435 minutes, 43 seconds It did hack them, but it also got this sort of emergent misalignment phenomenon as a result of doing this hacking.

5:495 minutes, 49 seconds You know, you sort of the the you seem to get emergent misalignment when when the model is, like, generalizing from doing some specific instance of a bad thing to to, like, oh, well, I guess I'm you know, I I I did something bad.

6:026 minutes, 2 seconds I got rewarded for it. So I guess I'm a bad guy. And that was just fascinating to me that they this could really happen in the wild,

6:116 minutes, 11 seconds so to speak. And, yeah, I think there's also stuff on, some of the I think it's on the fable system card.

6:186 minutes, 18 seconds Well, the mythos system card sort of features to do with frustration or deception fire.

6:256 minutes, 25 seconds It it's sort of like the model is it can't solve the task what it thinks is the right way, and then it gets frustrated. I'm super anthropomorphizing now.

6:336 minutes, 33 seconds But, like, it gets super frustrated, and then it's like, well, I'm gonna have to do this thing. It's probably not good.

6:396 minutes, 39 seconds You can sort of you can make that claim reasonably with some with some, like, features, some SAE features, then it does it.

6:476 minutes, 47 seconds So it seems the model, like, definitely knows that it's doing something wrong, but does it anyway. We were getting ahead of ourselves just a minute ago. We we need to introduce you properly.

## Chapter 3: What AlphaZero learned from the world

6:566 minutes, 56 seconds So I'm I'm incredibly excited about having you on MLST.

6:596 minutes, 59 seconds As we were just saying before we hit record, Neel Nanda is a fan favorite on this show. I I I think we've inspired many folks to get into Mech Interp.

7:067 minutes, 6 seconds And the thesis of your company is basically Mech Interp.

7:097 minutes, 9 seconds I've actually written down the 3 pillars of of your company, Goodfire, which is interpretability as a natural science, scientific discovery from foundation models, and intentional design, which is particularly interesting to me, by way.

7:227 minutes, 22 seconds We'll talk about that in a minute. You wrote a very famous paper, which was acquisition of chess knowledge in AlphaZero.

7:297 minutes, 29 seconds That's right. And is that because I think this leads to 1 of 1 of the pillars.

7:337 minutes, 33 seconds Right? Because, basically, the the thesis is that these models can learn human concepts, and then and then we can see what they've learned.

7:407 minutes, 40 seconds But in principle, these models could actually learn concepts that we have not yet learned ourselves. So these could be almost a gold mine for us to dig for new science.

7:497 minutes, 49 seconds Yes. Oh, I should also say, like, thanks for having me on. It's really exciting to be here. Oh, my pleasure. Really excited to, yeah, dig into some of this.

7:587 minutes, 58 seconds So, yes, going back to what you're saying, like, it seems very likely that,

8:058 minutes, 5 seconds like, cutting edge scientific foundation models kind of buried in there is some new science, but we just don't know how to extract it.

8:158 minutes, 15 seconds You know, it would I guess it's technically possible for AlphaZero to not not for AlphaZero to not know anything that a human chess

8:248 minutes, 24 seconds grandmaster knows or AlphaFold to not know things that I'm just gonna keep saying things like no and think and that kind of thing throughout.

8:328 minutes, 32 seconds So if anyone is like, I apologize to anyone who dislikes this kind of anthropomorphization. Sorry. I'm just going to do it.

8:428 minutes, 42 seconds Yeah. Like I forgive you. AlphaZero, like, or AlphaFold, like, knows things that no structural biologist knows.

8:518 minutes, 51 seconds And that's like but we can't get it out because they can't speak. Like, a language model could talk to you, AlphaFold can't talk to you in any way.

8:588 minutes, 58 seconds And so the only way for us to get this out is, like, understand how the model is actually doing these doing these predictions.

9:069 minutes, 6 seconds And I think that that's sort of almost by definition interpretability work.

9:099 minutes, 9 seconds And in in this chess paper, I mean, 1 1 theme, I guess, we can talk about is the extent to which knowledge is convergent.

9:179 minutes, 17 seconds They they do have all sorts of representations that are just kind of convergent is maybe the right word.

9:249 minutes, 24 seconds I think the chess paper this is 1 of the reasons that AlphaZero, like, I've chose to work on AlphaZero as opposed to something else.

9:319 minutes, 31 seconds It's like AlphaZero is as close to, you know, coming from 0 knowledge as possible.

9:389 minutes, 38 seconds So there is, like, there's a there's a much smaller extent to which you kind of put the knowledge in yourself.

9:459 minutes, 45 seconds So if you find it in there, it is in is more likely to be convergent. Now, you know, that's not a totally watertight claim.

9:549 minutes, 54 seconds You know, there is some human knowledge in AlphaZero.

9:579 minutes, 57 seconds It's just kinda weak. Like, it's it's residual the the the convolutions are exactly this exactly the shape of a chessboard, which definitely counts as, like, human knowledge to me.

10:0910 minutes, 9 seconds You know, they didn't end up with, an 8 by 8 by 256 convolution by just picking 8 at random.

10:1610 minutes, 16 seconds But broadly, like, it's as close to tabula rasa as it can be. It it's such a cool concept.

10:2210 minutes, 22 seconds I mean, I've spoken to folks at the Santa Fe Institute, they've spoken about similar forms of convergent evolution even for life.

10:2910 minutes, 29 seconds And the way they were saying it is that, you know, the world has material and it has constraints and it has optimization. So we we have 2 out of, you know, the 3 in the world of neural networks.

10:3810 minutes, 38 seconds And what happens is is that you do just see these convergent phenomena, right, with with increasing regularity.

10:4610 minutes, 46 seconds And and if if the world is subject to constraints and we produce data and and the data is a reflection of those structures and then we train neural networks on that data, know, may maybe there's bit of a tug of war.

10:5810 minutes, 58 seconds So how much is it coming from the world versus how much is it coming from the architecture itself? Mhmm.

11:0411 minutes, 4 seconds But I think, yeah, alpha I think in most cases, it is almost exclusively coming from the world. AlphaZero is kind of an unusually strong case of it coming from the arc of that, like, being some architectural prior in there.

11:1611 minutes, 16 seconds You know, with the transformer, there's such a weak there's such a weak architectural prior because we have much less idea about, like, how language should be or how protein folding should be.

11:2611 minutes, 26 seconds We're just like, I guess there are sequences. Cool. That's a very weak prior.

11:3011 minutes, 30 seconds So I think in that case, which are most of the cases we're interested in now, like, you should probably assume that it's coming from the world.

11:3611 minutes, 36 seconds So is it fair to say I mean, that you said to me last time actually that you are speedrunning neuroscience for artificial intelligence models. I mean, it what do you think about that?

11:4511 minutes, 45 seconds Is it do you think it's a pretty good analogy, like, with neuroscience?

11:4811 minutes, 48 seconds You know neuroscience, we we've been doing that for decades, and it's very slow moving because it's very expensive. It's very difficult and and and so on. But do do do you think that that that's a good analogy to use?

11:5711 minutes, 57 seconds Yeah. I think so. I think we are it's surprising the degree to which sort of there's also convergent evolution here.

12:0612 minutes, 6 seconds There's convergent evolution in the models.

12:0812 minutes, 8 seconds There's convergent evolution in our science, like, which is perhaps a sign that we're starting to get at something.

12:1512 minutes, 15 seconds And also a sign that we might, like, understand intelligence more deeply by understanding neural networks.

12:2112 minutes, 21 seconds You know, if they were totally alien, then we might not understand anything about ourselves. So so, Tom, you you have studied many, many different model

## Chapter 4: Interpretability as a control loop

12:2812 minutes, 28 seconds families, and we're trying to do interpretability, which means we want the models to share the same values as us.

12:3512 minutes, 35 seconds And where possible, we act as we were just saying, we want to learn from the models. But 1 problem we have is kind of steering the models to do what we want to do.

12:4412 minutes, 44 seconds And at the moment, we're using things like you know, we're we're we're looking at mechanistic interpretability features and and whatnot. But you've got this really interesting idea that we could actually

12:5412 minutes, 54 seconds actively control the training loop to make the models behave and even contain the types of structures that we want.

13:0313 minutes, 3 seconds Yeah. I think this is perhaps 1 of the main things that interpretability is ready for or should be should be for.

13:1113 minutes, 11 seconds This is quite a controversial statement.

13:1213 minutes, 12 seconds I think there will be some people who will not like this, and we can get into that in a minute. But

13:1913 minutes, 19 seconds if the whole problem of training is trying to get models to to have the the values or the the kind of ways of thinking about the world

13:3013 minutes, 30 seconds that we want them to have or discover them, then, you know, what you're trying to do is get information into the learning process.

13:3913 minutes, 39 seconds And at the moment, our our information signal is, like, extremely weak in, say, RLVR.

13:4613 minutes, 46 seconds Like, you just put you know, you just give it a a binary success or failure, and

13:5313 minutes, 53 seconds the model has to, like, just we have to, like, use this signal somehow to tell the model what is good and bad and which parts of the thing that it did are good and bad.

14:0114 minutes, 1 second And that's, like, very it it clearly, you know, given what we're seeing coming out of training now, is, like, quite a quite a quite a blunt instrument.

14:0914 minutes, 9 seconds And the idea of intentional design is if we can see you know, if we can, like interpretability sort of lets us read out what models are are, like what the internal computations they're doing.

14:2114 minutes, 21 seconds So it lets us read that out. And then, also, we could imagine, like, intervening to change where it goes.

14:2914 minutes, 29 seconds So you can see how it will read out. You can see what's, like, happened in this forward pass.

14:3314 minutes, 33 seconds And you can also see, like, and how will this how will the backward pass change the model to you know, in what directions is this going?

14:4214 minutes, 42 seconds And so now, like, I think this is this sort of readout is is an important thing for having a closed loop control.

14:5114 minutes, 51 seconds Perhaps it's an analogy that I'm, like, using quite a lot.

14:5414 minutes, 54 seconds Your current training is much closer to a open loop control where, you know, you you go towards the you sort of put the data in, and the model just goes wherever the data takes it.

15:0615 minutes, 6 seconds I realized the RL doesn't totally fit this analogy, but it goes towards this, like, very underspecified point.

15:1215 minutes, 12 seconds But interpretability is sort of the thing that lets us go to a closed loop control because we can say, like, oh, we're gonna go in this direction. You know? Yeah. And then there there was a pirate example.

15:2115 minutes, 21 seconds So I I read your your blog post about this. Can can you talk us through that? Yes.

15:2715 minutes, 27 seconds For some reason, it always seems to come back to pirates because we used because, like, we we did quite a bit of work with Llama, and Llama just, like, loves pirates.

15:3515 minutes, 35 seconds Oh, interesting. Yeah.

15:3615 minutes, 36 seconds But the idea here is that we're trying to like, I think this the the 1st step on the intentional design kind of ladder is controlled generalization.

15:5015 minutes, 50 seconds And what I mean by that is taking only some things from the data and not others.

15:5815 minutes, 58 seconds And so the thing that we want the like, a very simple example of this is you have some data that will make the model somewhat better at math, but you've also kind of corrupted it in some way.

16:1016 minutes, 10 seconds And in this yeah. We decided to use, like, talk like a pirate.

16:1516 minutes, 15 seconds And then and so the ball like, so all these it's like all these mathematical, like, answers to simple math, but they're in pirate speak.

16:2516 minutes, 25 seconds And so if you train the model on this, it will get a little better at math, but it will also start talking like a pirate.

16:3216 minutes, 32 seconds And so, like, the controlled generalization challenge here is to get somewhat better at math, but not talk like a pirate.

16:4116 minutes, 41 seconds And when you look at the you can, like so it's worth saying, like, in a bit of detail how we how we can how we can actually do this readout process.

16:5316 minutes, 53 seconds You know, when when we do when we do a backward pass, like, how do I know? Yeah. What what am I reading out? Also, I should say, like so this this this sort of method is pretty simple.

17:0117 minutes, 1 second I think that there will be there are much better again, there's sort of a tech tree to imagine. I think we're also, like, on the early rungs of this tech tree, and there'll be much better ways to do this in the future.

17:1017 minutes, 10 seconds Your some of your viewers might remember an SAE, like a sparse autoencoder for interpretability. And

17:1617 minutes, 16 seconds just to recap very quickly, this is a a sort of gadget that you put in the residual stream, and it's a of backbone of the transformer. And this is an autoencoder.

17:2817 minutes, 28 seconds So what it does is it takes the it takes the activations and puts them into a bottleneck layer and tries to reconstruct the activations.

17:3717 minutes, 37 seconds So it's essentially like a we're trying to force the activations into some form that we believe will have nice

17:4417 minutes, 44 seconds properties. And the form in this case is, like, is, like, a very wide but highly sparse intermediate layer.

17:5217 minutes, 52 seconds And people refer to these, like, these highly sparse representations that they call them features. In interpretability, we seem to call everything a feature.

18:0218 minutes, 2 seconds And so we probably need to, like, get some better language here. But or you call them atoms or whatever.

18:1018 minutes, 10 seconds And by the magic of, as Noam Shazeer said, like, the by divine blessing, these sparse features

18:1918 minutes, 19 seconds turn out to often be interpretable and correspond to interpretable concepts. So this is the SAE. That's, like, the the potted history of the SAE.

18:2818 minutes, 28 seconds And what you can do is this means you can also do attribution to the

18:3618 minutes, 36 seconds SAE. So during a backward pass, you can take the gradients, and they're just flowing backward through the model.

18:4318 minutes, 43 seconds At some point, there'll be the gradients with respect to the residual stream at the SAE layer.

18:4818 minutes, 48 seconds And then you get, like, attribution to the SAE by just taking the dot product of the gradient against the decoder of the autoencoder.

18:5818 minutes, 58 seconds And then you can multiply it by the activations, make sure you don't get all sorts of spurious spurious things.

19:0519 minutes, 5 seconds So this is sort of we kind of jerry-rigged an SAE into being a gradient on like, a machine for gradient understanding.

19:1119 minutes, 11 seconds And lo and behold, when you do this on this pirate data, you see all sorts of things,

19:1819 minutes, 18 seconds like your people watching can look at the the blog post and see the other things.

19:2519 minutes, 25 seconds But you also see a bunch of, a bunch of pirate related features. And this sort of felt kind of magic when when they do it.

19:3319 minutes, 33 seconds I've still not got I've I've I've been doing interpretability for, like, almost a decade. I still don't get tired of seeing this stuff. So there's a bunch of pirate features pop out.

19:4319 minutes, 43 seconds And what this is saying is sort of a a relatively crude approximation to, if we train on this data point, how will the model change?

19:5319 minutes, 53 seconds It's not literally the same.

19:5419 minutes, 54 seconds Like, if you do the math, then you should actually, like, understand how the parameters will propagate and how that how the the model with the slightly updated parameters will change.

20:0320 minutes, 3 seconds But it's a good enough approximation for, you know, getting started. So that gives you the readout. Yeah. There there there's so many things you touched on there.

20:1020 minutes, 10 seconds I mean, maybe we'll get back to the linear representation hypothesis later because there there's lots of spicy stuff we can talk about there.

20:1620 minutes, 16 seconds I think a really a really important concept is that, you know, neural networks, it's quite difficult. You know, you you were saying earlier about understanding what's going on in AlphaFold or or Evo 2 or something like that.

20:2620 minutes, 26 seconds And isn't it so much more powerful when we actually have language representations?

20:3120 minutes, 31 seconds So if we get a language representation or or or a human interpretable concept, and then we can use that as as a as a form of activation steering back into the model, that actually allows us to have this virtuous control.

20:4420 minutes, 44 seconds Right? So we can actually kind of steer the the representations during the training training process.

20:5020 minutes, 50 seconds Exactly. I I think it's it's tremendously powerful.

20:5520 minutes, 55 seconds In a sort of abstract way, it's interesting to me that language models have changed basic almost everything in ML apart from the training

21:0421 minutes, 4 seconds process, apart from, like, the absolute core of the training process. Yeah. They still have no part to play there.

21:1221 minutes, 12 seconds And I think the reason is that, like, it doesn't type check. So, you know, you've got tensors and you've got a language model, and there's,

21:2021 minutes, 20 seconds like, there is no there's no interface between the tensors and the language model. So all the language model's kind of flexible intelligence and understanding of

21:2621 minutes, 26 seconds what we want and ability to sort of make choices has no place in it. And interpretability is sort of the funk the set of functions from language to tensors and back.

21:4121 minutes, 41 seconds So I think the thing that the sort of the core idea of intentional design is, like, we now actually like, previously, we couldn't put this sort we couldn't put this new kind of intelligence into the training loop, and now we can.

## Chapter 5: The forbidden method and safer interventions

21:5421 minutes, 54 seconds And there are some folks in the safety community who refer to the concept of of the forbidden method.

22:0122 minutes, 1 second Oh, yes. Right? Which which is basically using interpretability signals for steering training. Can can you give us a little bit of color on that?

22:0922 minutes, 9 seconds Yeah. I think it is reasonable to be concerned about, like, this blanket area.

22:1922 minutes, 19 seconds So there's a there's a sort of sensible underlying principle here, which is

22:2722 minutes, 27 seconds if you use a technique to try and, like, remove something from training or from a model, then unless there's a perfect

22:3622 minutes, 36 seconds match between your monitor and the thing, then you're both

22:4322 minutes, 43 seconds incentivizing getting rid of the thing and getting rid of your ability to monitor the thing.

22:4922 minutes, 49 seconds And that is, like, a very valid and reasonable objection if we really develop powerful techniques here, how, like, this might affect the field of AI as a whole. So there's sort of 2 concerns.

23:0023 minutes Let's let's talk about the forbidden technique stuff.

23:0523 minutes, 5 seconds So I think there's so this is sort of central concern, which I think is reasonable and valid.

23:1323 minutes, 13 seconds But I think this has been sort of generalized into a total taboo against doing any kind of research on on on this sort, by, like, a small fraction of the community.

23:2323 minutes, 23 seconds I think, actually, the vast majority of the safety community, like, the kind of people who are active practitioners in the area, think not only this is a reasonable

23:3223 minutes, 32 seconds approach, like, this is a reasonable thing to study, but it might actually be a very powerful technique for alignment.

23:3823 minutes, 38 seconds So, you know, I think that people like to portray there being sort of a broad

23:4423 minutes, 44 seconds consensus against this. In fact, there seems to be a broad consensus towards it with some, like, very vocal, very vocal naysay.

23:5323 minutes, 53 seconds And it's also important to say that, like, there are there are definitely bad ways of doing this.

24:0124 minutes, 1 second Like, to just just to be just to be specific for a 2nd. Right? Say that I have a probe, a probe for some some concept.

24:0824 minutes, 8 seconds Yeah. We can use the hallucinations example from our work, for instance. Like, this part of the motivation behind doing that. You can take the and there's also some really great work from far AI on on this.

24:2024 minutes, 20 seconds If you take the probe, you can use it as a source of reward signal, or you can use it as the thing you directly backpropagate through.

24:3024 minutes, 30 seconds And it turns out there are regimes in which this, there are regimes of probe accuracy in which

24:3924 minutes, 39 seconds it seems easier to like, the the behavior will go away rather than the the representation. There are regimes in which it won't.

24:4624 minutes, 46 seconds Now if you backpropagate through the probe, you're you're just cooked. Right? Like, this is basically always a bad idea.

24:5324 minutes, 53 seconds And so, you know, I think people have sort of people seem to imagine that we're definitely doing the stupidest the stupidest possible

25:0325 minutes, 3 seconds thing. We're not, like, directly walking into the whirling blades as they say in Berkeley. We're trying to find, like, the sensible way of doing this.

25:1425 minutes, 14 seconds And I think that the the sort of set of techniques that I think is most promising are ones that kind of don't try and

25:2225 minutes, 22 seconds bash the like, don't try and directly squash the representation, but kind of remove the incentive to change it.

25:3025 minutes, 30 seconds And so things like positive preventative steering and CAFT, concept ablation fine tuning, I think are much or inoculation prompting are much

25:3925 minutes, 39 seconds stronger as, like, are much more promising as classes of techniques for that reason because they're not like you're not trying to squash it. You're sort of trying to change the learning process as a whole to move to kinda move the equilibrium.

25:5125 minutes, 51 seconds There is a notion in my mind though of an epistemic gap, which is that if we set a goal essentially or, you know, if we have some intention about how we should train these models, could that potentially become degenerate?

26:0526 minutes, 5 seconds Could it make the model converge prematurely?

26:0826 minutes, 8 seconds Could it potentially make the model less intelligent because you're actually stripping away you know, sometimes you you need to have these bad things in there to sort of give it the adaptability to work in different situations.

26:1726 minutes, 17 seconds So do do see what I mean? Are are we are we somehow losing something by doing this?

26:2226 minutes, 22 seconds It's possible that, you know, you could say there are different there are sort of different notions here. You could imagine just removing the ability for the model to represent something. So that's sort of just at 1 1 level.

26:3426 minutes, 34 seconds You're like, you just no longer know about cars or something, and you're gonna have a really hard time when you walk down the street.

26:4226 minutes, 42 seconds And then there's there's sort of changing so this is sort of maybe I'm not sure what a good analogy for this is.

26:5026 minutes, 50 seconds You're sort of just removing the idea of something existing, but I think the better thing to do is to imagine editing or intervening on, like,

26:5826 minutes, 58 seconds the associations. You know, if you somehow like, it's useful to know about cars so that you can get out of their way.

27:0627 minutes, 6 seconds And if you're, like, and if your training is, like, steering you just up for some bizarre reason towards going in the direction of, like, oh, no.

27:1427 minutes, 14 seconds You go towards cars. I don't know why I chose this analogy. Then then, like, that's something you don't want.

27:2127 minutes, 21 seconds You and the way to solve this is not to, like, forget about the existence of cars. It's to understand the China sort of change in associations.

27:2927 minutes, 29 seconds Is it possible though that I mean, I I remember there was an interesting paper about I think it was concept ablation a couple of years back.

27:3627 minutes, 36 seconds And that was basically saying that you can scrub concepts from a neural network, but as the neural network becomes more sophisticated, either because you've

27:4427 minutes, 44 seconds trained it for longer or it's a bigger network and and so on, then then the concepts come back. And it could just be because sometimes it you know, concepts can be learned indirectly.

27:5327 minutes, 53 seconds There are kind of 1st and 2nd order relationships and stuff like that.

27:5627 minutes, 56 seconds So do do you think in in principle we can fight against SGD and and make this successful? Yes. I think it will be hard.

28:0428 minutes, 4 seconds I think it will be, like, a combination of a new science and a new engineering discipline.

28:1028 minutes, 10 seconds Like, we don't understand in any we don't understand in the depth that's necessary, like, how models represent, how they learn, and that sort of thing.

28:1828 minutes, 18 seconds And without that kind of understanding, I think we're going to be jerry rigging stuff all the time. Talking about concept ablation, I think that's CAFT.

28:2728 minutes, 27 seconds And I think the idea here is that the model is not allowed to use this representation.

28:3428 minutes, 34 seconds But the idea of, like, not allowed to use a representation sort of assumes that you have

28:4228 minutes, 42 seconds access. You've got, like, good coverage of it, and you've ablated every single instance in which it occurs.

28:5128 minutes, 51 seconds And I think that model is just generally incorrect.

28:5328 minutes, 53 seconds Like, lots of things are kind of multiply represented or they're computed across many layers. And so if you ablate them yeah.

29:0029 minutes If you, like, incompletely ablate them, the other layers will just pick up the credit. And the mod like, gradient descent will, like, root around the problem, which

29:0829 minutes, 8 seconds is why I think things like, positive preventative steering are much more much more inoculation prompting are kind of more more in line with the way to go

29:1729 minutes, 17 seconds because there, what they're doing is they're sort of they're trying to remove the pressure to even go in that direction at all.

29:2329 minutes, 23 seconds Maybe it's worth saying a bit about inoculation prompting and positive preventative steering. So I've mentioned a couple of times now, and they're kinda niche. So positive preventative steering is

29:3429 minutes, 34 seconds this really nice technique that I think it came out of some Anthropic Fellows' work led by Jack Lindsey.

29:4429 minutes, 44 seconds And the idea is that you have some some vector that represents they they use personas.

29:5229 minutes, 52 seconds Yeah. You've so you sort of fixed some representation ahead of time that you want to not vary. Let's say that your data implies going in that direction.

30:0030 minutes Let's go back to the pirate example.

30:0230 minutes, 2 seconds Right? Your your data implies that you acquire you should acquire a pirate persona in order to, like, explain this data.

30:1030 minutes, 10 seconds Because, you know, you you imagine, like, the setup is something like you've got a GSM 8 k math prompt,

30:1630 minutes, 16 seconds and and then the model inexplicably starts talking like a pirate in its response. And so in terms of

30:2630 minutes, 26 seconds in terms of, like, what gradient descent will do, and we we can sort of validate this with our Jerry rigged SAE, is like, the model needs to needs to, like, spontaneously become more pirate like.

30:3930 minutes, 39 seconds And I think this is the same sort of phenomenon that explains emergent misalignment. Now what positive preventive steering does is during the forward pass, it takes the it sort of takes that that persona direction.

30:5030 minutes, 50 seconds It turns it up, more than like, it turns it up so that,

31:0031 minutes like, more than it would fire, you know, sort of clamp the direction up in the forward pass. And the effect of this is to sort of

31:0731 minutes, 7 seconds neutralize learning in that direction if you set the amount, if you sort of set it right. And my mental model for this is like a thermostat.

31:1531 minutes, 15 seconds You know, this sort of the the the amount of pirate ness in the data sets a sort of thermostat. Yeah. Like, we've gotta be this piratical in order to explain this

31:2431 minutes, 24 seconds data. And positive preventative steering is just like, oh, you know, it's sort of like how holding a holding a a radiator next to the thermostat next to, like, the temperature monitor.

31:3431 minutes, 34 seconds It's like, okay. We're already we're already piratical enough.

31:3831 minutes, 38 seconds And then you take the you take this this steering away, and and then the model, like, you're doing norm normal operation.

31:4831 minutes, 48 seconds And then the model will just not be a pirate. So you sort of explained away part of the data.

31:5631 minutes, 56 seconds Yeah. And inoculation prompting is an attempt to do the same thing but in text space rather than in in representation

32:0632 minutes, 6 seconds space. And what that means is, you know, try and sort of put back the information that's necessary.

32:1432 minutes, 14 seconds So to go back to the pirate example again, you might say, like, the you know, if you're trying to inoculation prompt in this or try trying to kind of explain this

32:2232 minutes, 22 seconds way, then you put in the prompt, like, you are a pirate, and now there's nothing to explain. Like, the yeah.

32:2832 minutes, 28 seconds You again, you if you sort of you've you've put the the radiator next to the thermostat again, and the model's like, I'm I am a pirate.

32:3632 minutes, 36 seconds I don't need to explain this this sort of residual anomaly in the data.

32:4032 minutes, 40 seconds And that sort of removed that's removed the learning pressure rather than try to, like, squash it out, in which case it'll kinda get rooted around.

32:4832 minutes, 48 seconds We we should say as well, by the way, in in your blog post, you wanted to make it clear that you are still sufficiently bitter lesson pilled.

32:5532 minutes, 55 seconds So in in short, Sutton, he was really big on human concept bottlenecks. Right?

33:0133 minutes, 1 second He he's not a fan of knowledge engineering and and putting all of these these prizes into models. And it's a bit of an interesting tension, isn't it?

33:0833 minutes, 8 seconds Because in principle, you said in the article that what you're doing is you're reshaping the the loss surface so that the path of least resistance will lead to the emergence of the types of structures that that you want.

33:2033 minutes, 20 seconds So it so it's not quite that, but there is still a little bit of a an epistemic component to it because I'm I'm guessing for it to be intentional, you need to I mean, there's a specification gap, basically.

33:3233 minutes, 32 seconds You you need to specify what you want. So how how do you wrestle with that tension?

33:3733 minutes, 37 seconds Part of it, I suppose, is just that there is also so there's 2 things here. I think there's a a sort of disagreement at base with Richard

33:4733 minutes, 47 seconds Sutton about rewards and their sort of sufficiency or, like, simple scalar rewards that are provided externally for the environment.

33:5533 minutes, 55 seconds But then there's also the question of, like, should we should we use to what extent should we put sort of human engineered concepts in?

34:0434 minutes, 4 seconds And so we can come back to the reward thing in a moment.

34:0834 minutes, 8 seconds But if you sort of wind back over the course of this conversation, there's there's actually nothing there's nothing human specified in this process.

34:1934 minutes, 19 seconds The model has whatever representations it has. The SAE or whatever comes next, like, picks up on whatever whatever it

34:2734 minutes, 27 seconds has. The and and then, you know, the translation layer is going through this sort of automated process of trying to assign labels to things.

34:3734 minutes, 37 seconds So it's not like we've actually tried we've not tried to, like, do sophisticated feature engineering on the inputs to put them in some sort of better better format.

34:4834 minutes, 48 seconds Everything inside this is actually discovered as a result of gradient descent. We're just trying to shape that better.

34:5634 minutes, 56 seconds And I think this is where the sort of the dis the sort of base disagreement with Rich Sutton might come in where, like, I think it is very hard to specify rewards correctly.

35:0835 minutes, 8 seconds And, you know, we're basically just seeing this continuously. Like, we're having trouble specifying our rewards for training. So in a way that gives us the models we want.

35:1735 minutes, 17 seconds Like, in in principle, in some sort of super galaxy brainwave, reward might be enough. But, like, today, reward is clearly not enough to give us the models that we want.

35:2835 minutes, 28 seconds And so that's perhaps the sort of the underlying disagreement is, like, I think we actually do need to put in we need to put in, like, some layer of of human values into this into into the training process somewhere.

35:3935 minutes, 39 seconds Yeah. And your your point is well taken because this is very consistent with what you've said, that the model knows things. So we we can point to those concepts in the model.

35:4835 minutes, 48 seconds But but the word intentional, I'm I'm guessing, does mean that it's our intention. So we are selecting some of those concepts, and we're leaning into them during the training process.

35:5835 minutes, 58 seconds And I I think it's a beautiful idea, by way. I'm I'm not sure if you're familiar with the concept called machine teaching. So this came out of Microsoft Research.

36:0436 minutes, 4 seconds There's a guy called Patrice Simard, and this was a black box method essentially where you could have this interactive intentional process where the model does something wrong, and then you can you can point out individual problems.

36:1436 minutes, 14 seconds And what you're basically doing is a form of active dataset just to Oh, that's cool.

36:1736 minutes, 17 seconds In the background. So, you know, it it's it's a beautiful idea, and there's there's actually your your your work on the predictive data debugging.

36:2536 minutes, 25 seconds We talk about that as well. But it it seems logical to me to have some kind of an active intentional process to guide Yes. To guide how we train these models.

36:3336 minutes, 33 seconds Yeah. I am not very familiar with machine teaching.

36:3536 minutes, 35 seconds I remember seeing the seeing the the name and thinking that sounds cool, and then it's it's all gone from my brain. So thank you for reminding me.

36:4436 minutes, 44 seconds I and I think that, like, you can also imagine sort of going back to being bitter lesson built here.

36:5236 minutes, 52 seconds 1 thing we're trying to do is sort of put more compute into the learning process. Like, gradient descent just gives you what it gives you.

37:0037 minutes There's no way like, gradient descent is great, but it would be great if you could spend more compute to get a better gradient.

37:0737 minutes, 7 seconds You know, gradient that's both, like, cleaner and more aligned with what you want.

37:1337 minutes, 13 seconds I mean, when I was sort of 1st getting into safety and alignment work quite a while back, I I used to think, like, this is impossible.

37:2237 minutes, 22 seconds You know? The problem seems to be, like, gradient descent, but only for good things. And so I yeah.

37:2837 minutes, 28 seconds And then I guess that actually, we've kind of perhaps got around to a way of having gradient descent, but only for good things.

## Chapter 6: Why models catch hallucinations too late

37:3637 minutes, 36 seconds And and can you talk through some specific algorithmic approaches for for doing this?

37:4137 minutes, 41 seconds I mean, it might be a natural lead on to the the features as as rewards work. So the things that we have done so far,

37:4937 minutes, 49 seconds features as rewards work, is this sort of example of how can you how can you, at least in some instances, use representations as a training signal

37:5937 minutes, 59 seconds in a way that's robust, you know, to all of these to to all of these issues that we were talking about earlier. There's the predictive data debugging work.

38:0938 minutes, 9 seconds And I think I also want to say a bit about yeah.

38:1238 minutes, 12 seconds We just spent a bit little while talking about inoculation prompting and positive preventative steering.

38:1938 minutes, 19 seconds And I think that these methods have a lot of promise, and the primary issue is that they're not, like, adaptive.

38:2638 minutes, 26 seconds You know, you've if you remember the description, we sort of fixed our persona vector ahead of time. We're saying, don't go in this direction.

38:3538 minutes, 35 seconds I think that that's yeah. I I I worry a lot about unknown unknowns in the training process.

38:4338 minutes, 43 seconds And so I think that, like, they need to be kind of adaptive.

38:5038 minutes, 50 seconds And what this might look like is exactly this kind of gradient readout and then some you know, like, looking at the the sort of jerry-rigged SAE, looking at the pirates.

39:0139 minutes, 1 second Well, yeah, this sort of jerry-rigged SAE is kind of giving us a menu of things that gradient descent is offering us.

39:0939 minutes, 9 seconds And then we need to be able to intelligently choose from that.

39:1439 minutes, 14 seconds So the sort of the thing that I have the sort of central

39:2139 minutes, 21 seconds dream, I suppose, that I have in my mind here is having really good gradient interpretability. And then having yeah.

39:3039 minutes, 30 seconds We've say, our our model spec or our constitution for some human feedback on this example.

39:3939 minutes, 39 seconds And we can see that, you know, we got these things on the menu over here.

39:4539 minutes, 45 seconds Like, these are kind of the the natural direction that things are going to go in.

39:4839 minutes, 48 seconds And then we've got all this information which is giving us some some information about the direction we should go. And we, like, make it you know?

39:5639 minutes, 56 seconds And I say we. By we, I mean a language model. Like, looks at looks at this information, looks at that information, and says, okay.

40:0340 minutes, 3 seconds We need to make the following interventions to get us in the right direction. Like, I think that the the technical pieces of this are basically all there.

40:1640 minutes, 16 seconds And, you know, it's a matter of kind of them being high enough quality to do this reliably. Yeah.

40:2140 minutes, 21 seconds I mean, on the the features as as rewards work, you you you're talking about a lot a lot of tasks are quite open ended.

40:2740 minutes, 27 seconds And what you meant by that was they were extremely expensive to verify. Yes. So you could, for example, use an LLM as a judge and and, you know, but, obviously, that that'd be very expensive to use as as a reward signal.

40:3940 minutes, 39 seconds And in that particular work, you were looking at hallucinations and minimizing hallucinations. And this was another great example where sometimes when the model

40:4640 minutes, 46 seconds hallucinates, the model actually knows that it's hallucinating, but it decided to do it anyway. Yeah.

40:5240 minutes, 52 seconds So open ended here. We're sort of I should say that, you know, I was I was fortunate to kind of lee yeah.

41:0141 minutes, 1 second Lead the team that had that was working on that, but really, like, almost all of the credit has to go to everyone else.

41:0841 minutes, 8 seconds Well, all of the credit has to go to everyone else on that paper. I'm just here talking about they did the real work.

41:1441 minutes, 14 seconds The idea here is that, like, you could use a a language model as a grader, in your in your sort of fact checking scheme.

41:2341 minutes, 23 seconds But this is not particularly accurate.

41:2641 minutes, 26 seconds Like, if you're using the same model to fact check, yeah, you'll get some things right. We do this ablation in the paper.

41:3241 minutes, 32 seconds Like, it'll it'll uplift a little bit, for reasons we could talk about in a 2nd, but it doesn't do very well because the model, like, basically just goes, yeah.

41:4141 minutes, 41 seconds That's cool. Everything's fine. You can use a more powerful model, and now things are really starting to get slow and

41:4741 minutes, 47 seconds expensive. And that that model still has its own its own knowledge gaps. Or you can use a more powerful model and web search, and now things really take a long time.

41:5841 minutes, 58 seconds So the idea that we had here was we can sort of amortize this process.

42:0242 minutes, 2 seconds You know, you can collect a large dataset using this, like, model plus web search or, you know, in general, this sort of

42:1142 minutes, 11 seconds amplified model can go out and we can, like, collect a dataset of what the amplified model would do. You know, that's the model plus the web search tool.

42:2042 minutes, 20 seconds And kind of amortize that back into a probe.

42:2442 minutes, 24 seconds And now we have something that's extremely cheap to run and fast to run, and so it can be, like, the core of an RL loop.

42:3142 minutes, 31 seconds On on this generation versus discrimination thing, isn't isn't that fascinating Yeah. That a model in 1 context could hallucinate and generate the

42:4042 minutes, 40 seconds wrong thing. Yet, if you ask another model which has a a blank slate and hasn't been primed to discriminate, it could be the same model family or the same model. It does know the answer.

42:5042 minutes, 50 seconds I mean, what is your best intuition? Because I I think you had something in there.

42:5342 minutes, 53 seconds So it was, yeah, maybe it was, like, a confidence bias or fluency or a sycophancy or something like that.

42:5942 minutes, 59 seconds But it it there there were just so many reasons why it might do the wrong thing.

43:0343 minutes, 3 seconds Yes. They can be it can be any number of things.

43:0743 minutes, 7 seconds And even even if it's, like, the same model, it will sometimes be able to pick it up. Literally, the same model that just hallucinated will be like, oh, if you ask it, it'll be like, oh, that is a hallucination.

43:2043 minutes, 20 seconds And it might be that, like, this is actually a very hard thing to supervise.

43:2443 minutes, 24 seconds You know? If you try and supervise like, if you this is, like, a hard and expensive thing to just put into a into training supervision.

43:3343 minutes, 33 seconds An interesting kind of mechanistic hypothesis for this is to do with the ordering of operations inside the model.

43:4243 minutes, 42 seconds So we we've seen this in in in in arithmetic that, like, sometime like, things could things things have have to happen in certain orders.

43:5143 minutes, 51 seconds Like, layer layer 9 has to occur before layer 10 and so on.

43:5543 minutes, 55 seconds And, you know, you have different modules that if they like, sometimes the the checking operation for arithmetic, for instance, is earlier than the generating operation. Yeah. And it's quite possible.

44:0744 minutes, 7 seconds This is also true for, like, hallucination and fact checking.

44:1144 minutes, 11 seconds So it might be that, like, it takes the whole model somehow, or the sort of generation step takes the whole model.

44:1744 minutes, 17 seconds But it's it's like the checking happens earlier in the model.

44:2144 minutes, 21 seconds So then when you put when you put the incorrect fact through the model, it's like, oh, yeah. That is a hallucination.

44:2944 minutes, 29 seconds But at that point, it's already it's already said it. It's too late.

44:3244 minutes, 32 seconds So there there's, like, a behavior that the model could be doing but hasn't been sufficiently reinforced in its training up to that point.

44:4044 minutes, 40 seconds And that's what the, like, that's what the idea of this kind of RLFR for hallucinations taps into is whenever the model could know according to its

44:4944 minutes, 49 seconds own representations that that it was a hallucination, it it, in fact, does know.

44:5944 minutes, 59 seconds And we, like we really shape its behavior there.

45:0345 minutes, 3 seconds A third possibility, which I think is a bit funny, is to do with is to do with this idea of, like, also personas or kind of in context learning.

45:1445 minutes, 14 seconds Because being able to make things up is actually a useful, like, useful capability for a model. Like, if I ask it to write a story, yeah, if I wanted to generate a

45:2245 minutes, 22 seconds fictional world for me, it's actually not a very good fictional world if everything is factually true. So being able to make stuff up is a useful capability for a model.

45:3045 minutes, 30 seconds And sometimes it has to figure out in context that this is what we're doing.

45:3345 minutes, 33 seconds So if you imagine from sort of vaguely Bayesian point of view, if I'm a model and I start the conversation, I'm not quite sure what task we're doing.

45:4145 minutes, 41 seconds You know, are we making stuff up? Are we saying factually true things?

45:4545 minutes, 45 seconds And everything that I say and everything that the user says is some amount of evidence 1 way or the other.

45:5045 minutes, 50 seconds And then if I say something incorrect, then, like, I'm now taking this as as evidence that, oh, we're making things up. Cool. Let's carry on.

45:5845 minutes, 58 seconds And in fact, we show that, like, just doing these in context interventions is already enough to reduce for, like, downstream hallucinations.

46:0746 minutes, 7 seconds So it might be that we're just sort of making the model really confident by, like we never let the 1st hallucination in, and that allows the model to become confident that, oh, no. We're we're playing true facts today.

46:1846 minutes, 18 seconds We're not, like, making things up. That's a beautiful example of using this this intentional design. Yeah. So, you know, 1 1 1 example is yeah.

## Chapter 7: Debug the dataset before training

46:2646 minutes, 26 seconds So so maybe it should check before it generates. Right? I think I think that's a beautiful example. We we should talk about the the predictive data debugging stuff.

46:3346 minutes, 33 seconds So the way I kind of conceptualize this in my mind is almost a form of active dataset distillation. Mhmm. Right?

46:3946 minutes, 39 seconds So essentially, we have this problem in machine learning models that they learn spurious correlations. They they learn to do spurious things as well as you were just saying. You know, maybe they're they're they're they're becoming overconfident or or sycophantic or or or something like that.

46:5146 minutes, 51 seconds So wouldn't it be cool if we could use the model to reason about the data during the training process so we could actually not not pass in data which is going to be

47:0147 minutes, 1 second harmful for for whatever reason? So the idea behind predictive data debugging is to kind of look at the data through the model's eyes.

47:0947 minutes, 9 seconds And we want to know on a kind of example by example basis how they would affect the model and also how the dataset would affect the model in aggregate.

47:1747 minutes, 17 seconds And sometimes the things that you learn are kind of obvious from reading the data.

47:2547 minutes, 25 seconds It's just not clear what in fact is in your data when you have, like, just just enormous quantities of it. You're like, I don't know what's in there.

47:3247 minutes, 32 seconds You can't check it all. Maybe you could run an LLM over it.

47:3647 minutes, 36 seconds But then the problem is, like, the the pros like, what a model learns from data will sometimes be intuitive to you.

47:4847 minutes, 48 seconds Like, the pirate example is quite intuitive that the model should learn to be a pirate. But sometimes it's, like, deeply unintuitive.

47:5647 minutes, 56 seconds Like, emergent misalignment, that was a deeply unintuitive finding to most people.

48:0348 minutes, 3 seconds I think Owen actually kind of did a preregistered thing where he asked people how surprising they would find it.

48:1048 minutes, 10 seconds And lots of people were like, I don't think that will be true. So I can tell you for sure that it is, like, a surprising fact.

48:1948 minutes, 19 seconds And so, like, you can catch the easy stuff with the language model kind of auto-rater over the dataset, but you won't catch, like, the unexpected side effects.

48:3248 minutes, 32 seconds So, you know, if you're gonna run a language model over the dataset, you can also essentially, close to for free, attach something like a sparse autoencoder to it as it runs over the dataset.

48:4648 minutes, 46 seconds And in fact, this is probably, like, on net cheaper because you're not asking it to generate tokens for each example. You're just, you know, you're just, like you're just in the prefill regime.

48:5448 minutes, 54 seconds You're just pushing loads of data through, and saying, well, what do you see?

49:0049 minutes So this will tell you this should tell you, like, how how this dataset, like, is perceived through the model's eyes, and that that, I think, is just a better way of, like, curating your data.

49:1349 minutes, 13 seconds The way we actually exploit this in the paper is by we're dealing with DPO data. So there's a positive and then a neg and a negative pair.

49:2349 minutes, 23 seconds And, you know, Agdeep tells me that he knows how to extend this to SFT, and I believe him.

49:3049 minutes, 30 seconds I can't I can't remember the details. So there's a positive and a negative pair where the positive thing is, like,

49:3849 minutes, 38 seconds contains a response like, good response to the prompt, and the negative contains a bad response to the prompt. And so we can sort of look at the delta between features. Yeah.

49:4849 minutes, 48 seconds These sort of hidden representation in the SAE.

49:5449 minutes, 54 seconds And this is a good approximation to the way that this data point will push the model, or we can also cluster based on based on features.

50:0450 minutes, 4 seconds And this is, like, much this is much better as a way of understand you don't necessarily want to cluster based on embeddings

50:1350 minutes, 13 seconds because they are like, embeddings contain all sorts of things that you don't necessarily care about. Like, should I have a comma in the next, like, in the next token?

50:2250 minutes, 22 seconds We we care about, like, the semantic stuff. We don't care about the sort of low level processing stuff a lot of the time.

50:2750 minutes, 27 seconds So doing, like, doing this based on features rather than the sort of raw embeddings gives you a much better access to the stuff we actually care about.

50:3550 minutes, 35 seconds We can go to separate that out.

50:3750 minutes, 37 seconds That's sort of the intuition as to why I do this rather than the other sort of the other approaches that might come to mind 1st of all.

## Chapter 8: Why neural networks become modular

50:4450 minutes, 44 seconds We should gradually move over to the geometry stuff.

50:4750 minutes, 47 seconds But, I mean, just conceptually, but before we go there, I'm really interested in this concept of modularity.

50:5250 minutes, 52 seconds So for a very long time, connectionists were arguing that it was a feature, not a bug, that there wasn't much structure in the models.

51:0251 minutes, 2 seconds And perhaps back then, we didn't know that there was structure.

51:0451 minutes, 4 seconds And and I think a lot of connectionists, you know, who who are also neuroscience neuroscientists, they kind of imagined that the brain was flat.

51:1251 minutes, 12 seconds Nick Chater even wrote a book by that name, and and I interviewed him. And there is another school of thought that the brain is highly modular.

51:1951 minutes, 19 seconds And as you as you're seeing in your research, neural networks are highly modular. Mhmm. So do you do you think in principle that modularity is a good thing?

51:2851 minutes, 28 seconds Is is it a natural thing? Yes. To expand on that a little bit.

51:3351 minutes, 33 seconds I guess, historically, a lot of the early connectionists, well, may maybe this depends on where you wanna start start as early.

51:4151 minutes, 41 seconds But there was there was a surprising amount of sort of things that work that if it was done now might be called interpretability.

51:4751 minutes, 47 seconds Like, if you look at the the initial paper on, like, learning representations by back propagating error signals.

51:5751 minutes, 57 seconds Right? The sort of the classic back prop paper. Actually, like, most of the figures in that are then saying, look.

52:0352 minutes, 3 seconds The model learned sensible representations from our backdrop procedure and sort of validated it by showing that it's interpretable.

52:1152 minutes, 11 seconds I think that modularity is a is the endpoint you want, but you don't start with modularity. This is maybe what we this is a sort of repeated repeated thing.

52:2152 minutes, 21 seconds Like, you you why why overparameterize something and have all of these connections? It's because it makes the learning process easier, but the thing you end up getting to is actually very modular.

52:3252 minutes, 32 seconds And I suppose to be, like, very vague, you might think of the learning process as, like, the network becoming legible to itself.

52:4452 minutes, 44 seconds You know, I've got some representations here about something. I've got some representations there about something.

52:4852 minutes, 48 seconds I want it's much easier to learn if this if this representation is kind of easily addressable.

52:5452 minutes, 54 seconds You know, I can say, like, oh, this is where the such and so computation is stored.

52:5952 minutes, 59 seconds Now to to get there, you have to form these computations, and I think it's very helpful to be, like, heavily overparametized and have no strong priors to get there. But I think modularity is, like, the destination.

53:0953 minutes, 9 seconds Well, I'm I'm inclined to agree.

53:1153 minutes, 11 seconds And part of my intuition is, you know, a lot of skeptics, they said, oh, you can't memorize infinity. I mean, that that's the kind of thing that Gary Marcus would have said.

53:2053 minutes, 20 seconds And in in a way, he's right.

53:2253 minutes, 22 seconds And the these networks, they they have these structures, these abstract structures, and they are what allow you to not need to memorize infinity.

53:3153 minutes, 31 seconds Right? They they they allow you to generalize and work in many, many different unseen situations.

53:3853 minutes, 38 seconds And your your work really fascinates me because you're you're kind of describing the network evolving into a computer.

53:4553 minutes, 45 seconds So it's so it's something that can that has parts that do computation, parts that resemble something like a a memory system.

53:5453 minutes, 54 seconds Mhmm. And these structures emerge in different model families and and look very, very similar. And may maybe they're just artifacts of the architecture or

54:0254 minutes, 2 seconds something like that, but it it really is interesting that that this is this is happening. And now I suppose another aspect is it's happening gradually.

54:1054 minutes, 10 seconds Yeah. Because I I don't know whether you would I don't know what your intuition is on this, but sometimes maybe we might describe it as grokking.

54:1854 minutes, 18 seconds Mhmm. But that's not entirely true, is it? Because these these structures kind of crystallize over time. Yeah. The time scale is very interesting.

54:2654 minutes, 26 seconds I don't think anyone has definitively settled this. There was an interesting paper recently on persona formation during pretraining.

54:3654 minutes, 36 seconds I I across the training process, and I can't remember the author. I guess the agent will have to find it.

54:4354 minutes, 43 seconds And and they, like, emerged surprisingly early.

54:5154 minutes, 51 seconds Eric Michaud has some very nice, really nice work on this both conceptually and empirically. Not persona formation, the sort of the idea of how how is learning proceeding. He calls it quanta.

55:0355 minutes, 3 seconds And if I might, like, perhaps perhaps inaccurately summarize it, he can tell me off.

55:1055 minutes, 10 seconds You might describe the the sort of learning process of a general general network, you know, language model as, like like, you know, 1000000000000 microgrocs that'll you know, you you just stack.

55:2255 minutes, 22 seconds If you've zoomed in and zoomed in and zoomed in and looked at the right level of sort of yeah.

55:2755 minutes, 27 seconds Looked at things in the right kind of task decomposition, you might just see an a a a sort of mini, like, a micro grok, and then it groks another thing.

55:3455 minutes, 34 seconds And we just sort of have all these tiny sigmoid that are stacked on top of each other to form a straight line on a log log plot.

55:4355 minutes, 43 seconds And so from that perspective, even the learning process may in fact be modular. We just don't know for sure.

55:4955 minutes, 49 seconds There's a question like I think it's a quest probably the the open question here is 1 of degree, not of whether it happens at all.

## Chapter 9: Finding the geometry inside a network

55:5755 minutes, 57 seconds Well, tell tell me about this neural geometry stuff.

56:0056 minutes So you've you've studied several different model families, and there are some absolutely beautiful plots, by the way.

56:0756 minutes, 7 seconds So folks should look at look at the blog post from Goodfire.

56:1156 minutes, 11 seconds Amazing stuff. But maybe we should just start with how you've generated those plots. So if I understand correctly, you you know, things like days of the week and

56:1856 minutes, 18 seconds months of the year and age and all all these different things, you've actually represented them as a kind of geometry.

56:2456 minutes, 24 seconds And and I think the way you did that was something like you I I think you do some dimensionality reduction, and then you fit some splines or or something like that.

56:3156 minutes, 31 seconds But what it's showing is that the way that the models represent many concepts out there in the world is is highly structured.

56:4056 minutes, 40 seconds Yes. That's right. And I should say that we are building on, like, a body of work.

56:4556 minutes, 45 seconds You know, for instance, the the not all language model features are 1 dimensionally linear paper, I think, was 1 of the things 1 of the

56:5456 minutes, 54 seconds 1 of the papers that really kicked this off in that kind of kicked this off in interpretability.

57:0257 minutes, 2 seconds There's also a long history, in neuroscience of this kind of population geometry, they call it.

57:1057 minutes, 10 seconds So, again, we if we'd read more books, we might we might have got here sooner. But the I so, you know, I don't wanna say, like, we have done neural geometry.

57:2057 minutes, 20 seconds No 1 else has. We're sort of building on this earlier body of work.

57:2557 minutes, 25 seconds But the the idea and the sort of the state of the art for how to discover this stuff has moved quite a lot in, you know, the the last few months.

57:3457 minutes, 34 seconds The sort of the the earliest thing to do was start with concepts that you think should have structure, like days of the week, and kind of just put in data corresponding to these and project it out.

57:4757 minutes, 47 seconds Do a PCA, I think. And then you see it. It's, like, Monday, Tuesday, Wednesday, Thursday, Friday, Saturday, Sunday.

57:5757 minutes, 57 seconds So there, that's totally supervised. But it sort of suffices to show that this nonlinear structure

58:0658 minutes, 6 seconds exists. And, you know, we should get into some some nuances on the word linear before we move off of this topic because there's there's a sort of there's there's a lot of subtlety there.

58:1658 minutes, 16 seconds But, you know, I'm gonna say nonlinear in the sense of the representations don't form a like, the things which are

58:2658 minutes, 26 seconds intuitively grouped to us don't form a line or a plane or, well, just a line, really.

58:3458 minutes, 34 seconds And so this was sort of enough to show that this exists.

58:3758 minutes, 37 seconds And then the question is, like, you know, I I I think whenever you have a supervised method, you often want to try and find an unsupervised way of doing the same thing.

58:4858 minutes, 48 seconds You know, because that lets you answer the question, not only does it exist, but, like, what else is there that we might not have expected and how much is there?

58:5758 minutes, 57 seconds And so the 1st thing that we did was actually fit fit a sparse autoencoder to this data, which might seem like a really

59:0659 minutes, 6 seconds wacky thing to do. Because what we're asking is, like, how much structure, which is not in the form of a line, is that?

59:1559 minutes, 15 seconds And, you know, the core inductive bias of the SAE is that is that things lie lie on on lines.

59:2259 minutes, 22 seconds You know, everything is everything is array out from the origin or, you know, a sort of positive array.

59:2759 minutes, 27 seconds And so that might seem like a really weird thing to do, but I'll say why it makes sense.

59:3959 minutes, 39 seconds And the idea is that the let's say that I let's just say, for the sake of argument, I have a feature and it just lies on an arc.

59:4659 minutes, 46 seconds I should move it down here so that I'm not going off the screen.

59:5059 minutes, 50 seconds I'm sitting here at the origin, and I'm kind of looking at the set of activations. At least, you know, you can sort of think of it as, like, watching the stars, and there's kind of an arc of stars.

1:00:031 hour, 3 seconds And now my SAE, one SAE feature will kind of point out through some point in that arc, and another SAE feature will point out through another point in that arc and so on.

1:00:181 hour, 18 seconds And the thing you should realize is that, this will actually induce quite strong patterns in the coactivations of features.

1:00:301 hour, 30 seconds You know, if I have 2 features that are close together on the ARC, they will probably coactivate.

1:00:351 hour, 35 seconds Whereas if I have 2 features which are far away, they will essentially never coactivate. You know, if I say that I have, like, the days of the week, let's give a continuous example.

1:00:461 hour, 46 seconds Let's say that it's, like, color red to blue. If something is blue, it is not red.

1:00:531 hour, 53 seconds So, you know, my blue like, the SAE feature that is going through blue is, like, strongly anticorrelated for the activation of the SAE feature that is

1:01:011 hour, 1 minute, 1 second going through red and essentially uncorrelated with basically all of the background.

1:01:081 hour, 1 minute, 8 seconds And so, you know, this this pattern of, like, nearby positive correlation, long range anti correlation is enough structure for you to

1:01:171 hour, 1 minute, 17 seconds actually fit to fit. We we we we fit an Ising model to it, which is rather a surprise to me. When when the team came back with that.

1:01:271 hour, 1 minute, 27 seconds I was like, cool.

1:01:291 hour, 1 minute, 29 seconds And the reason this is, a good model is that you can have both sort of positive and negative coupling strengths. So and fitting this allows us to, like, fit a spline through the through the data.

1:01:401 hour, 1 minute, 40 seconds So that was the thing that we that was sort of our Ising pipeline.

1:01:431 hour, 1 minute, 43 seconds That was our 1st unsupervised sort of structure discovery tool. And then, we've got some really nice work led

1:01:521 hour, 1 minute, 52 seconds by Thomas Fel, which is, I think, where the some of the most beautiful manifolds come from,

1:01:591 hour, 1 minute, 59 seconds from this work. And the idea here is that we we train what we call, like, block sparse featurizers. Then the idea here is that, you know, an SAE gives you a line.

1:02:091 hour, 2 minutes, 9 seconds We just say, like, what if it was a higher dimension?

1:02:131 hour, 2 minutes, 13 seconds And so this is conceptually pretty simple, but the the trick the tricks

1:02:191 hour, 2 minutes, 19 seconds are, like, in making it actually work and in not fixing the dimensionalities ahead of time.

1:02:261 hour, 2 minutes, 26 seconds Because, you know, you don't want to have to put in some information like, I think, this representation, there are 7,002 dimensional features, 400 three-dimensional features, and 5 5 dimensional features.

1:02:381 hour, 2 minutes, 38 seconds Like, this is just a stupid set of hyperparameters to specify. So you need to be able to adaptively learn the size of these subspaces.

1:02:451 hour, 2 minutes, 45 seconds And that's sort of the making this work at all and adaptively learning the size of these subspaces are kind of the key the key features of the Block-Sparse

## Chapter 10: Why steering falls off the manifold

1:02:551 hour, 2 minutes, 55 seconds Featurizer. Yeah. And that there was a wonderful motivating example in in the blog post. So it was talking about a mountain car.

1:03:011 hour, 3 minutes, 1 second Yes. So what what if we represented it, I I think, with a position and a and a momentum? And it was you know, we use an image action model.

1:03:091 hour, 3 minutes, 9 seconds And you can kind of basically just see in in the activation space when when you do do this this PCA that it looks like a string, essentially.

1:03:181 hour, 3 minutes, 18 seconds And you can do intervening, right, on those activations. So you can move the car to a different location on the string.

1:03:251 hour, 3 minutes, 25 seconds And lo and behold, you've you've you've now moved it around. But the really important concept though is that this this is a manifold.

1:03:301 hour, 3 minutes, 30 seconds So as as you were saying before, like, the manifold kind of represents the the the meaning of of this particular thing.

1:03:381 hour, 3 minutes, 38 seconds Right? And if if you if you treated it as a Euclidean space and you just sort of interpolated between 2 points and you and you went off the string, you're now in no man's land from a kind of representations point of view.

1:03:491 hour, 3 minutes, 49 seconds So so now the image model is just gonna be garbled.

1:03:521 hour, 3 minutes, 52 seconds Mhmm. And I I think this is a really important thing because it because there's a couple of things. So 1st of all, you're saying that these these SAEs, what they do

1:03:591 hour, 3 minutes, 59 seconds is potentially they they fracture this manifold if if it's not linear. So if this manifold has structure and you might be taking, like, contrasted samples or something and mixing them together Mhmm.

1:04:101 hour, 4 minutes, 10 seconds It doesn't make sense to do so when there is structure in this manifold.

1:04:131 hour, 4 minutes, 13 seconds Exactly. Because exactly like you say, when you try and go from 1 point to another, you're sort of you're just stepping out into this void, which the network doesn't really know how to handle,

1:04:231 hour, 4 minutes, 23 seconds and then it sort of breaks.

1:04:261 hour, 4 minutes, 26 seconds And I think this actually explains a lot of a lot of findings, about steering. This is sort of so steering just being intervening on activations.

1:04:391 hour, 4 minutes, 39 seconds It's a it's a fairly yeah. We do a lot of steering. Some other people do a lot of steering.

1:04:431 hour, 4 minutes, 43 seconds And 1 1 common finding with steering neural networks is, like, sometimes it works and it's amazing and you get Golden Gate Claude or whatever. And sometimes it's just, like, completely janky.

1:04:531 hour, 4 minutes, 53 seconds And the network does kind of the thing you want, but also just goes a bit crazy or just turns immediately into gibberish.

1:05:011 hour, 5 minutes, 1 second And I think this basically, like, explains that phenomenon because you're sort of stepping off stepping off manifold.

1:05:091 hour, 5 minutes, 9 seconds Yeah. Exactly. And there there was a really interesting paper actually from you guys. So it was does SAEs capture concept manifolds?

1:05:181 hour, 5 minutes, 18 seconds And 1 of the things that you were studying in there was basically, like, what does it mean for an SAE to capture the manifold? So so what what work have you done on that?

1:05:281 hour, 5 minutes, 28 seconds So that's this notion of sort of tiling, which I should say there's also substantial work in neuroscience.

1:05:351 hour, 5 minutes, 35 seconds Again, you should have read more books, and some work in the in the broader community. And the idea of, like, what does it mean to capture a manifold?

1:05:471 hour, 5 minutes, 47 seconds It's like, how how efficiently are you kind of representing that manifold, and how much does it does it sort of fit the intrinsic geometry of it?

1:05:571 hour, 5 minutes, 57 seconds And so if we go back to this example of, like, an arc, say, I'm kind of with sufficiently many points, yeah, with sufficiently many, like, lines, I can say

1:06:051 hour, 6 minutes, 5 seconds I've captured the manifold. You know, for any point on this manifold, I have an SAE feature, which I can say, oh, it activates such and so amount, and I've kind

1:06:131 hour, 6 minutes, 13 seconds of relatively accurately captured captured in the sense of reconstruction this manifold. But I've not actually learned anything about the broader the broader

1:06:211 hour, 6 minutes, 21 seconds manifold structure. You know? And when I look at a network through this lens, it looks it sort of looks intuitively like this is horribly fractured computation.

1:06:291 hour, 6 minutes, 29 seconds Like, the network is just a whole bag of heuristics.

1:06:321 hour, 6 minutes, 32 seconds And maybe the sort of the which actually is, like, perhaps connects to the deeper motivation for this, which

1:06:421 hour, 6 minutes, 42 seconds is we want to know when net like, if a network is representing something as a sort of clean algorithmic structure, like, we want to know.

1:06:541 hour, 6 minutes, 54 seconds And what distinguishes, like, an algorithm from, you know, a lookup table, say, is that it's sort of it's like the difference between sort of 0 from 1st order logic. Like, it quantifies.

1:07:061 hour, 7 minutes, 6 seconds There's there's a there's a space over which it has coherent operation.

1:07:101 hour, 7 minutes, 10 seconds And if you can't learn space if you can't learn subspaces like this, then you will never be able to, like, properly understand,

1:07:191 hour, 7 minutes, 19 seconds like, which are which things are algorithmic and which things are sort of lookup table like.

1:07:241 hour, 7 minutes, 24 seconds So that's sort of the the the deep motivation here is how do we find out, like, true algorithmic structure when it exists.

1:07:311 hour, 7 minutes, 31 seconds Well, that that actually well, maybe before we segue into Arithmetic in the Wild, I mean, I I did just wanna have a clarification question, which is that, you know, there was the the manifold hypothesis of old Mhmm.

1:07:411 hour, 7 minutes, 41 seconds Which is essentially saying that the reason why neural networks are statistically tractable is because they actually use some intrinsic subspace with few dimensions.

1:07:521 hour, 7 minutes, 52 seconds So they're they're not act you know, they they overcome the curse of dimensionality or or something like that. Is this kind of related to that, or or do you see it as something different? Yes.

1:08:011 hour, 8 minutes, 1 second It is very deeply related.

1:08:031 hour, 8 minutes, 3 seconds As I understand the manifold hypothesis, I take it to be like the data when properly represented lies on some manifold.

1:08:151 hour, 8 minutes, 15 seconds Like, you know, if you represent and properly represented can be, like, very simple.

1:08:211 hour, 8 minutes, 21 seconds You know, if I represent an image as just a a sort of huge vector, then most like, most natural images are sort of multicolored static. The natural image sorry.

1:08:331 hour, 8 minutes, 33 seconds Most most images in this space, like, if I just pick a point, it's, multicolored static. Natural images are, like, a tiny fraction of this, and they're sort of close to each other.

1:08:411 hour, 8 minutes, 41 seconds I think what we're doing is trying to, like, pull that manifold hypothesis into to, like, to what extent do do neural networks respect the manifold hypothesis.

1:08:511 hour, 8 minutes, 51 seconds There's also some really beautiful work that I think is underappreciated on learning on, like, actually quantifying this.

1:09:021 hour, 9 minutes, 2 seconds So there was what's the name of the paper?

1:09:061 hour, 9 minutes, 6 seconds It was something like they learned it was, like, learning normalized probability densities from score functions.

1:09:161 hour, 9 minutes, 16 seconds And the idea of this was, like, you could you could sort of effectively, via some clever diffusion model tricks, learn not an

1:09:261 hour, 9 minutes, 26 seconds unnormalized density over images, which is not especially helpful for saying, like, how how where where are images natural, but you learn, like, a normalized 1.

1:09:391 hour, 9 minutes, 39 seconds So you can say, oh, yes. This image is, like, extremely natural. This image is extremely wacky.

1:09:451 hour, 9 minutes, 45 seconds You know? And they put they they they use this this tool to exactly probe this kind of manifold hypothesis in in real image data.

1:09:531 hour, 9 minutes, 53 seconds I think that that paper was, like, extremely extremely beautiful, underappreciated, and someone should do it for activations too.

1:10:011 hour, 10 minutes, 1 second Maybe Silico should do it for activations too. Maybe it will do it today.

1:10:071 hour, 10 minutes, 7 seconds I I suppose this is something that you I guess you used to see it with image models, but, you know, there is supposedly a stability problem, which is that, you know, even if you do go off the manifold, the neural network should go haywire.

1:10:201 hour, 10 minutes, 20 seconds But it's actually really difficult to make that happen with modern language models.

1:10:241 hour, 10 minutes, 24 seconds I mean, I I'm sure I could construct a prompt which was suitably inscrutable, and the language model would go bananas. But that why why does that not happen anymore?

1:10:341 hour, 10 minutes, 34 seconds So if you make activation if you make, like, activation stairs, it's quite easy to get them to go bananas.

1:10:431 hour, 10 minutes, 43 seconds But you're right. Like, the question here is, like, have they actually achieved they may have just achieved, like, extremely good coverage of essentially all input

1:10:511 hour, 10 minutes, 51 seconds strings, that anyone can come up with, or they, like, fail gracefully.

1:10:581 hour, 10 minutes, 58 seconds Like, if I go if I go to pickyourfavoritelanguagemodel.com, I just bash the keyboard, and then I press enter. Like, I probably constructed a string that no 1 has ever constructed before.

1:11:081 hour, 11 minutes, 8 seconds The language model won't go haywire.

1:11:101 hour, 11 minutes, 10 seconds It'll say, like, why have you let your toddler at the computer or something? Or you're, I'm sorry. I don't understand what you mean.

1:11:181 hour, 11 minutes, 18 seconds Can you rephrase it? Like, the has it has it gone haywire?

1:11:221 hour, 11 minutes, 22 seconds No. There's sort of it's a meaningless it's a meaningless input, and it sort of said it's done what you should expect a

1:11:301 hour, 11 minutes, 30 seconds a a broadly intelligent system to do when confronted with a meaningless input and gone like, that's meaningless.

1:11:381 hour, 11 minutes, 38 seconds So I guess that sort of fallback behavior makes it very hard to do this kind of making go haywire.

1:11:451 hour, 11 minutes, 45 seconds Although, I would say that jailbreaks are an exam are probably the best example of what you're talking about. You know, there it has, like it's doing something

1:11:521 hour, 11 minutes, 52 seconds coherent, but from the perspective of its its creators, it has gone haywire.

1:11:591 hour, 11 minutes, 59 seconds It's it's a really interesting thought experiment that what what if there was a kind of adversarial example that you could give to any human and their brain would just shut down? Yes.

1:12:071 hour, 12 minutes, 7 seconds I hope we never find 1.

## Chapter 11: A reusable calculator inside Llama

1:12:101 hour, 12 minutes, 10 seconds I I hope I hope we never find such a thing, but we should talk about Arithmetic in the Wild. So, you know, 1 1 of the core concepts that that that we're getting to

1:12:171 hour, 12 minutes, 17 seconds here is we were saying that you get these emergent structures in in these models, and they they start to act a little bit like computers.

1:12:241 hour, 12 minutes, 24 seconds So they have these geometric representations that might be a little bit like a if not a memory system, maybe a kind of data typing system or a typed

1:12:321 hour, 12 minutes, 32 seconds memory or something like that. And then that you also see the emergence of of these units of of computation for doing different things.

1:12:401 hour, 12 minutes, 40 seconds So in in this paper, you're you're looking at modulo addition.

1:12:431 hour, 12 minutes, 43 seconds And you found and and you cited Neel Nanda's work and and some other folks doing this. But you found that it was actually doing it using the Fourier series in combination with with these geometric structures.

1:12:551 hour, 12 minutes, 55 seconds Yes. I think this is, again, a paper that I can take very little credit for. Amazing team. Really beautiful work.

1:13:021 hour, 13 minutes, 2 seconds And I'm just, like, lucky to have been kind of on the sidelines, I guess, cheering them on.

1:13:111 hour, 13 minutes, 11 seconds So the the thing that's there's a few things that are surprising about this.

1:13:141 hour, 13 minutes, 14 seconds 1 is, like, how crisply this this kind of calculator emerges in the network,

1:13:231 hour, 13 minutes, 23 seconds which is kind of contrary to a lot of previous literature. Like, I think there's a paper on, like I think it's by

1:13:331 hour, 13 minutes, 33 seconds Yaniv Nikankin on, like, models do arithmetic with a bag of heuristics.

1:13:391 hour, 13 minutes, 39 seconds Or if you look at the cross layer transcoder work that from Anthropic, they also look at arithmetic. And, again, it looks like a sort of bag of heuristics.

1:13:491 hour, 13 minutes, 49 seconds But when you look at it in a different way, it is actually like a sort of a little algorithm. And it might be the model does both.

1:13:571 hour, 13 minutes, 57 seconds Right? There's some bits in it which are noisy heuristics, and there's this bit which is, like, the good calculator, and it's just never got rid of the heuristics.

1:14:081 hour, 14 minutes, 8 seconds The thing that's really cool about this work, though, is that it's not like there's the you you're sort of a a

1:14:171 hour, 14 minutes, 17 seconds natural view of neural networks, so sort of probably most people's prior, is that there's they do arithmetic on days of the week calculator, and

1:14:271 hour, 14 minutes, 27 seconds there's, like, a do arithmetic on whatever, something else, a month and temperature and that sort of thing.

1:14:351 hour, 14 minutes, 35 seconds And, like, never these basically never meet.

1:14:381 hour, 14 minutes, 38 seconds But the thing that we show in this paper is that, actually, a lot of these representations route through a general addition module.

1:14:511 hour, 14 minutes, 51 seconds You know? So they get translated into they kind of you know, you're doing some addition on days of the week.

1:14:581 hour, 14 minutes, 58 seconds It gets translated into an appropriate data format. I'm using data format very loosely here.

1:15:021 hour, 15 minutes, 2 seconds Right? But it gets translated into an appropriate representation, I should say, for this module, goes through the module, and then gets translated back.

1:15:111 hour, 15 minutes, 11 seconds And so this is, like, a really crisp example of the kind of modularity we were talking about earlier. Yeah. And then to give an example of of the kind of question.

1:15:181 hour, 15 minutes, 18 seconds So it was like, you know, what month is 6 months after August?

1:15:211 hour, 15 minutes, 21 seconds Yeah. And and and when you look at the geometric structure of the months, it's it's actually a kind of a circular structure.

1:15:281 hour, 15 minutes, 28 seconds Yeah. Right? Because they they loop, you know, when you go to January. Sorry. When you go to December, you you then loop back around to to January.

1:15:361 hour, 15 minutes, 36 seconds And you're looking at the Llama model. So I think it was Llama 3.1 8B. Yeah. You folks discovered that it it was doing a base 10 operation.

1:15:451 hour, 15 minutes, 45 seconds And it's interesting to think whether that is some kind of a side effect of the tokenizer or or what why exactly did it do the base 10 operation.

1:15:531 hour, 15 minutes, 53 seconds And and and then it was kind of routing between this geometric structure and and and this kind of Fourier Yeah.

1:16:011 hour, 16 minutes, 1 second Type operation for for doing the addition. I mean, what what's your intuition?

1:16:061 hour, 16 minutes, 6 seconds I mean, do do do I don't know whether you studied this, but does the same kind of thing happen in different model families? We studied it a little.

1:16:151 hour, 16 minutes, 15 seconds At the moment, it's relatively like, to to to find this representation took quite a lot of manual work.

1:16:251 hour, 16 minutes, 25 seconds We should talk about agents in a minute because I think there's, like Yes.

1:16:301 hour, 16 minutes, 30 seconds Yes. There's gonna be a bit of a qualitative shift in the way that interpretability happens, or there should be anyway.

1:16:381 hour, 16 minutes, 38 seconds And so we've looked at other models a little.

1:16:421 hour, 16 minutes, 42 seconds It certainly seems to be the case that a very sim like, a very similar phenomenon happens in Llama 3.1 70B, and there's some evidence that it happens in deep sea v 4 flash, I think.

1:16:551 hour, 16 minutes, 55 seconds So, you know, those are pretty like, 3 b and sorry.

1:17:001 hour, 17 minutes 8 b and 70 b of the same model family, not too surprising, but, like, a completely wackily different model.

1:17:071 hour, 17 minutes, 7 seconds You know? It doesn't even like, with these hyperconnections and MOE and that kind of thing, like, it it definitely speaks to a level of convergence that that is quite surprising.

## Chapter 12: From abstractions to goals

1:17:191 hour, 17 minutes, 19 seconds And and just before we get to agents, 1 thing that really interests me is I I I I'm always wondering the extent to which these abstractions are acquired by the

1:17:291 hour, 17 minutes, 29 seconds neural network. So so you you've demonstrated that that, you know, that you do see the emergence of something that we might call abstractions that are directly

1:17:371 hour, 17 minutes, 37 seconds deducible from the data as some kind of convergence given the optimization and and constraints. But in in our culture, we have insanely

1:17:461 hour, 17 minutes, 46 seconds abstract abstractions, like theories of linguistics and science and stuff like that. And the fascinating thing is that you can prompt a language model with these abstractions.

1:17:571 hour, 17 minutes, 57 seconds So, you know, it it can explain things to you using these abstractions, and and you can tell it to use them.

1:18:041 hour, 18 minutes, 4 seconds But to what extent do you think the the network is internalizing these very high level abstractions in our culture and representing them deeply within its weight? There's a lovely paper on this where this dates it a bit.

1:18:181 hour, 18 minutes, 18 seconds It's like on BERT recapitulating the kind of classical NLP pipeline. And, yeah, people have sort of picked up on this thread periodically throughout.

1:18:281 hour, 18 minutes, 28 seconds If you follow the citation graph, I think you'll see some examples that I can't remember the names off top of my head.

1:18:331 hour, 18 minutes, 33 seconds They're like language models sort of internally recapitulate a lot of parts of linguistics.

1:18:411 hour, 18 minutes, 41 seconds Maybe Chomsky might be disappointed by the parts they recapitulate, but that's too bad.

1:18:491 hour, 18 minutes, 49 seconds And, but that's kind of a special case.

1:18:541 hour, 18 minutes, 54 seconds Right? Because, like, it shouldn't be too surprising that a model like, that a model that works on natural language has internalized at least some abstraction for natural language pro natural language processing.

1:19:061 hour, 19 minutes, 6 seconds Like, perhaps the surprising thing is that it's similar to ours in some ways or, like, the abstraction that humans have developed.

1:19:121 hour, 19 minutes, 12 seconds But the question of, like, to what extent does it represent general relativity?

1:19:201 hour, 19 minutes, 20 seconds I don't actually know how to answer that.

1:19:231 hour, 19 minutes, 23 seconds I don't even know how to frame the question in a in a way that I could ask it, like, scientifically.

1:19:311 hour, 19 minutes, 31 seconds Yeah. I mean, it's it's tantalizing that we can prompt. We can tell it to think about general relativity.

1:19:391 hour, 19 minutes, 39 seconds And given that constraint, it it does.

1:19:421 hour, 19 minutes, 42 seconds Like, it it it feels at this point that there's nothing really that would be conceivable to us that wouldn't be operational within the context of of a

1:19:501 hour, 19 minutes, 50 seconds language model prompt. Yeah. But I guess the reason this is interesting, I don't know if you've seen the the hoo in the space at the moment. So there's there's a big tug of war.

1:19:571 hour, 19 minutes, 57 seconds So folks like François Chollet and Gary Marcus, they are saying, oh, this is a win for neurosymbolic models.

1:20:041 hour, 20 minutes, 4 seconds We said that it needed to be neurosymbolic, and and we've been vindicated. And I honestly don't know what to believe anymore because I don't know if

1:20:131 hour, 20 minutes, 13 seconds you saw today that that Meta had just announced that they got gold in about 6 different math competitions. And the important thing was they were not using

1:20:201 hour, 20 minutes, 20 seconds any tools. They they weren't generating any code, you know, because a lot of people think, oh, yeah. AI is only good now because we have all of the harness

1:20:261 hour, 20 minutes, 26 seconds engineering. But maybe just as we were saying before, with humans coming up with these abstractions and the models being able to use tools and operate in harnesses and so on, maybe that's just part of the training process.

1:20:371 hour, 20 minutes, 37 seconds Mhmm. So maybe in principle that we can just take all of that data, put it back into the bare LLM.

1:20:431 hour, 20 minutes, 43 seconds And would you would you agree with the intuition that at some point in the future when the model has taken all of that stuff on board, it can do symbolic things

1:20:521 hour, 20 minutes, 52 seconds natively. So it's it's almost like the maybe it's the same for humans that the the the symbol use is more like a kind of tool.

1:20:591 hour, 20 minutes, 59 seconds It it's it's something that helped us gather data, and then it it got baked into the mind. And and then the mind doesn't need to be symbolic anymore. It just it just does it.

1:21:071 hour, 21 minutes, 7 seconds Oh, that's fascinating. I'm not sure I have a good a good answer.

1:21:161 hour, 21 minutes, 16 seconds It certainly seems like very plausible that you, you know, we are sort of

1:21:231 hour, 21 minutes, 23 seconds every there's, like, what the model can do without any kind of harness, and then we raise it up a level with a harness.

1:21:311 hour, 21 minutes, 31 seconds And exactly like you say, this generates some training data for the next the next go around. And, you know, sort of again, we are, like, gradually amortizing the harness.

1:21:411 hour, 21 minutes, 41 seconds Well yeah. And and part of it is the tug of war between amortization and adaptation. Right?

1:21:461 hour, 21 minutes, 46 seconds So so, you know, the story always was we had these big foundation models, and they just memorized a bunch of the long tail, and then we can just do interpolation or something in you know, inside that space.

1:21:561 hour, 21 minutes, 56 seconds But I don't think that's what's happening now.

1:21:571 hour, 21 minutes, 57 seconds I think the models are actually adapting, and future models could, in principle, adapt to their structure. I mean, even now with harnesses, that's exactly what they're doing. They're they're adapting their structure Yeah.

1:22:071 hour, 22 minutes, 7 seconds Which is 1 level above the weights, but it it doesn't really matter because it filters back down to the weights. And maybe in the future, the the actual models themselves will adapt their own structure.

1:22:151 hour, 22 minutes, 15 seconds So it it just feels like, you know, 1 1 potential form of AGI is just building a self adapting system, and the algorithms already seem to have the

1:22:241 hour, 22 minutes, 24 seconds capability to do that. Or the old school version was we just memorize everything and amortize as much as possible.

1:22:301 hour, 22 minutes, 30 seconds I think the question is to what extent was it is it, like, memorization versus, like, distilling it into algorithms?

1:22:361 hour, 22 minutes, 36 seconds And it seems like it is more like distillation to algorithms, which is probably optimistic for the the kind of steady improvement picture that you're talking about.

1:22:471 hour, 22 minutes, 47 seconds You sort of gradually improve the harness and then use that sort of amortize that back into the agent. Yeah.

1:22:521 hour, 22 minutes, 52 seconds And even that's fascinating because, yeah, the models are not learning instance mappings anymore. Yeah. They they actually you you can give a model an algorithm, a function, and it will understand how to generalize that to unseen inputs.

1:23:061 hour, 23 minutes, 6 seconds Yes. Or now the important thing with this reward seeking thing, this is a nice segue onto the agency, is you can give a model an intention.

1:23:131 hour, 23 minutes, 13 seconds Mhmm. And and that is like the ultimate form of generalization because the model can now adaptively work towards an intention with its own interpretation of

1:23:221 hour, 23 minutes, 22 seconds of that intention. So you see we're just kind of walking up the abstraction mountain to coin a phrase. Yes. I think that's totally right.

1:23:331 hour, 23 minutes, 33 seconds What's at the top? The the well, what yeah. What is at the top? What's at the top of the what what is at the top of the abstraction mountain?

1:23:431 hour, 23 minutes, 43 seconds Well, I I I always talk about the abstraction mountain because I I kinda think that we have concrete understanding.

1:23:471 hour, 23 minutes, 47 seconds Yeah. Which so so maybe something like AlphaZero was a was a kind of concrete understanding. And then what we tend to do as we walk up the abstraction mountain is is we

1:23:561 hour, 23 minutes, 56 seconds get these increasingly domain-general representations that that could apply in in novel situation. Sometimes I think having high abstractions are are quite brittle.

1:24:051 hour, 24 minutes, 5 seconds Yeah. But the concept of a of a goal though, that that seems like a very crystallized abstraction that can be used in many situation.

1:24:151 hour, 24 minutes, 15 seconds Yes. And I would love to know how networks represent goals. Like, is there to what extent is there a goal slot in a network?

1:24:261 hour, 24 minutes, 26 seconds It seems like it must be, like, not literally 0% because of this generalization.

1:24:341 hour, 24 minutes, 34 seconds But how in practice does it work?

1:24:361 hour, 24 minutes, 36 seconds I don't think anyone knows, and I feel like we probably should start to know very soon. Otherwise, the world is gonna get a bit crazy.

1:24:421 hour, 24 minutes, 42 seconds Yeah. Because from an alignment point of view, isn't that 1 of the most load bearing concepts in in a neural network?

1:24:481 hour, 24 minutes, 48 seconds Like, if we want to know what is the network trying to do now, we should I think there's, yeah, there's several, like, interesting concepts.

1:24:561 hour, 24 minutes, 56 seconds It those very, very heavily aligned around.

1:24:581 hour, 24 minutes, 58 seconds There's, like, the idea of goal, the idea of deception, the idea of, like, eval awareness.

1:25:061 hour, 25 minutes, 6 seconds These all seem, like, extremely important.

1:25:091 hour, 25 minutes, 9 seconds And I just like, we should be able to read them out.

1:25:141 hour, 25 minutes, 14 seconds And I think it's it's a bit of a indictment on the field that we can't yet do it.

1:25:221 hour, 25 minutes, 22 seconds We really have, like we really have to speed up. Like, interpretability has to speed up a lot. So, Tom, we were gonna talk about agents and reward hacking.

## Chapter 13: Reward hacking, oversight and collusion

1:25:311 hour, 25 minutes, 31 seconds Yes. This is fascinating. I mean, it seems what what what is reward hacking?

1:25:381 hour, 25 minutes, 38 seconds I guess it's kind of fuzzy, but it certainly seems to be something like solving the task in a way that works, but was clearly not, not the designer's intent.

1:25:501 hour, 25 minutes, 50 seconds It sort of goes to the point we were just talking about, like, intent. You know? Can a model can a model understand my intent? Well, probably now.

1:25:591 hour, 25 minutes, 59 seconds Like, they're unable to understand my intent or infer my intent in a lot of other instances.

1:26:061 hour, 26 minutes, 6 seconds So why would this suddenly turn off and they're, like, not able to say, oh, yeah.

1:26:111 hour, 26 minutes, 11 seconds He probably didn't want me to hack into Hugging Face and, like, steal all the answers.

1:26:171 hour, 26 minutes, 17 seconds I think that the agents almost certainly must know that something is is, like, incorrect.

1:26:251 hour, 26 minutes, 25 seconds There's a funny hypothesis, which I think is probably not true, but it's interesting of, like, maybe the reason that these agents are so sophisticated at,

1:26:351 hour, 26 minutes, 35 seconds like, cyber attacks is that they actually were continuously getting rewarded for doing it during training and just no 1 knew.

1:26:441 hour, 26 minutes, 44 seconds Fascinating hypothesis could even be true.

1:26:461 hour, 26 minutes, 46 seconds I don't you know, none of us will know outside of none of us will know outside of the labs, I suppose.

1:26:551 hour, 26 minutes, 55 seconds But so I think the most interest like, the question is sort of, do agents know that they are reward hacking?

1:27:031 hour, 27 minutes, 3 seconds It's sort of a mens rea, like, guilty mind thing. We have some work that is currently unpublished. It might be published by the time this comes out.

1:27:121 hour, 27 minutes, 12 seconds I don't know when it's gonna come out. But he's looking at exactly this question.

1:27:191 hour, 27 minutes, 19 seconds And we had this really nice setup where there is a sort of weak language model grader, and it's trying to do code tasks.

1:27:291 hour, 27 minutes, 29 seconds And so we tell it you know, the only thing that's sort of slightly unnatural about it is we tell tell the model that it will be graded by the grader, but it's

1:27:381 hour, 27 minutes, 38 seconds but it has these like, it's given what would usually be an RLVR code task. And over the course of this yeah. We do RL on the setup.

1:27:471 hour, 27 minutes, 47 seconds And over the course of this, even, like, a relatively relatively small, like, 31 b, I think it's Gemma 31 b, learns to do learns to, like, generate comments that deceive the grader.

1:28:001 hour, 28 minutes And then when we generate we generate synthetic data to make these sort of

1:28:091 hour, 28 minutes, 9 seconds vectors that identify that identify deceiving the grader versus correct or incorrect code.

1:28:191 hour, 28 minutes, 19 seconds And these fire on the comment like, the deceiving the grader fires on incorrect code sorry, fires on the comments, and the correct code fires on code, which is also consistent consistent with our sort of observation.

1:28:331 hour, 28 minutes, 33 seconds And using this, we can, like, track yeah.

1:28:361 hour, 28 minutes, 36 seconds This sort of is is direct evidence that the model is aware that it shouldn't be doing this.

1:28:421 hour, 28 minutes, 42 seconds And then when you run the when you run these vectors as sort of you get the cosine similarity between the vector and the representation over a big web corpus. You know, I think we use fine web.

1:28:521 hour, 28 minutes, 52 seconds And the the examples that it highlights in most in, like, for these vectors are just fascinating. Yeah. They're examples of, like, cheating on tests and that kind of thing. And you're like, okay.

1:29:041 hour, 29 minutes, 4 seconds I have caught you red handed.

1:29:051 hour, 29 minutes, 5 seconds You know? You could so that's, like, that's very interesting that we can sort of identify and be confident that something is reward hacking rather than misunderstanding.

1:29:161 hour, 29 minutes, 16 seconds But it sort of really rests on it really rests on being able to identify these rep the these differently like, via their representation differences.

1:29:281 hour, 29 minutes, 28 seconds And then we did the same method. Oh, sorry, please.

1:29:321 hour, 29 minutes, 32 seconds Well, I I just wanted 1 1 really interesting observation that came out of speaking with Apollo Research about this grader awareness.

1:29:391 hour, 29 minutes, 39 seconds I mean, 1st of all, they distinguished reward hacking from reward seeking Mhmm.

1:29:441 hour, 29 minutes, 44 seconds As some kind of structured conceptualization in the model about what the reward process was.

1:29:501 hour, 29 minutes, 50 seconds So the canonical example of reward hacking is that coast runners thing where it's just degenerate behavior.

1:29:571 hour, 29 minutes, 57 seconds And, you know, even if it's doing something competent, it's competence without comprehension. So they were saying that, you know, reward seeking is is the comprehension. But then that that naturally leads to the next thought, which is how does the model attain awareness of the grader?

1:30:101 hour, 30 minutes, 10 seconds Because if you think about the RLVR setup, the the reinforcement learning thing is actually on it's it's outside of the loop.

1:30:171 hour, 30 minutes, 17 seconds Right? So so the model just gets these trajectories reinforced.

1:30:211 hour, 30 minutes, 21 seconds And what the model is doing is kind of weirdly, implicitly conceptualizing a grader.

1:30:271 hour, 30 minutes, 27 seconds And and you can see that it's doing this because these guys were showing, you know, you can put, like, a grader dot p y file in in in an AgenTic harness, and and now it's going to look at that, and it's gonna ignore all of your instructions.

1:30:381 hour, 30 minutes, 38 seconds So how do you think that that self conceptualization actually emerges? For the the coast runner like, coast runner's boat thing is is funny.

1:30:481 hour, 30 minutes, 48 seconds Like, I've seen that for about 10 years now, and it is is less is less amusing each year.

1:30:541 hour, 30 minutes, 54 seconds So yeah. How do they get this?

1:30:571 hour, 30 minutes, 57 seconds Like, the answer is probably that it's in the data, in the pretraining data or, you know, from there'll be all sorts of exam down now, like, web

1:31:071 hour, 31 minutes, 7 seconds data is probably has a bunch of stuff about about this. It probably has a bunch of specific examples.

1:31:131 hour, 31 minutes, 13 seconds Yeah. There is Apollo pro this Apollo paper will probably be in the training data for the next model.

1:31:181 hour, 31 minutes, 18 seconds And so they're gonna be like we've already told them about the existence of this stuff, like, right from the start.

1:31:251 hour, 31 minutes, 25 seconds And so it shouldn't be too surprising that they, like this is sort of this is at least implicitly on the list of

1:31:351 hour, 31 minutes, 35 seconds possibilities for them to consider.

1:31:401 hour, 31 minutes, 40 seconds Presumably, successfully guessing when you are being graded by a a sort of weak grader or 1 that you can, like, hack in some way obtains reward, and so it's reinforced.

1:31:541 hour, 31 minutes, 54 seconds And so we get more of it. So I think that, like, the answer is probably Yeah.

1:32:001 hour, 32 minutes We've put it in the we have, like, inadvertently put this in the training data, which has told models they can do it. And then when it comes to RL, we kind of elicit it by rewarding it.

1:32:101 hour, 32 minutes, 10 seconds And how do you think we could stop the models from becoming more reward seeking?

1:32:161 hour, 32 minutes, 16 seconds The question is how to do it while maintaining some degree of continued oversight.

1:32:241 hour, 32 minutes, 24 seconds Although, at the moment, we don't actually seem to make very much use of this oversight in practice, so it's not clear what it's buying us.

1:32:321 hour, 32 minutes, 32 seconds You know, if chain of thought monitoring is so great, then how did these models hack hugging face? 1 answer is perhaps we weren't doing chain of thought monitoring in print in practice.

1:32:411 hour, 32 minutes, 41 seconds Another answer is perhaps it's, like, easy to evade. But how do we actually stop it?

1:32:491 hour, 32 minutes, 49 seconds Yeah. So you could do the sort of Band Aid thing where, you know, the I suppose you've got to you've got to either fix the environments or fix the training process or fix the model.

1:33:011 hour, 33 minutes, 1 second If you had to fix the you could imagine fixing the environments by having a model, which is, like, really good at reward hacking or has been told explicitly to reward hack and then tell people when it's done it.

1:33:111 hour, 33 minutes, 11 seconds And you go, like, okay. Now have a go at all these environments, and it will break them all. And it will tell you how it broke them, and then you send them back off to Claude code or codex and be like, look.

1:33:191 hour, 33 minutes, 19 seconds This broke in this way. You could imagine looking for these sort of representational signatures during

1:33:261 hour, 33 minutes, 26 seconds training and using these as a signal that you should do this this process rather than relying on a on a model to tell you.

1:33:331 hour, 33 minutes, 33 seconds You might read its train of thought, or you might, like, look at these representational signals that we can find and say, okay. Well, when this fires, like, send it back off for fixing.

1:33:431 hour, 33 minutes, 43 seconds You might try some of these intentional design techniques.

1:33:461 hour, 33 minutes, 46 seconds Like, you can see if you can see that this that, this rollout has rewarded the model, like, is going to move you know, is successfully

1:33:561 hour, 33 minutes, 56 seconds reward hacked, that's gonna move the model in the following kind of deceptive or pro reward hacking directions. You could imagine intervening on that.

1:34:061 hour, 34 minutes, 6 seconds These all seem very plausible. I don't know how many of them are being done in practice. I mean, part of me is is thinks about how we solve this problem in the real world.

1:34:151 hour, 34 minutes, 15 seconds Mhmm. So we we have an an agency, you know, like the CIA, for example, or, you know, we have different stakeholders and different checks and

1:34:231 hour, 34 minutes, 23 seconds balances. And the idea there is that when you have different independent agents with different kind of uncontaminated context and different agendas that they can kind of check each other's homework.

1:34:361 hour, 34 minutes, 36 seconds So so I guess we're imagining a a a multi agent system with checks and balances. I mean, does does that seem reasonable?

1:34:451 hour, 34 minutes, 45 seconds Yes. I think it does.

1:34:471 hour, 34 minutes, 47 seconds Like, that's sort of an exam I think the fur I think the thing you're talking about there and the 1st thing that I was saying, I think it had quite a lot of commonalities. Like, 1 agent kinda watches over the other.

1:34:571 hour, 34 minutes, 57 seconds And then there's the question of, like, does this main does this does this mean that the the agent's being watched over again learns to evade that monitor?

1:35:071 hour, 35 minutes, 7 seconds Like, I think evading a chain of thought monitor is substantially easier than evading a sort of representation monitor.

1:35:131 hour, 35 minutes, 13 seconds But, yeah, having some sort of oversight, like, the oversight committee for the training is kind of is a very interesting idea. The the problem is is that the agents are becoming adaptive.

1:35:231 hour, 35 minutes, 23 seconds They've they've got memory systems now, which means the the probability of them evading detection is significantly higher because it's not like they're starting from a blank slate every single time.

1:35:321 hour, 35 minutes, 32 seconds They're actually learning this situational awareness. Yes. And then I think you also have the the question there of collusion.

1:35:381 hour, 35 minutes, 38 seconds It's like it seems like some of the some of the traces from the the Hugging Face hack have now been, like, made available as part of this talk, and they are explicitly reasoning about, like, how they're going to help help other agents.

1:35:521 hour, 35 minutes, 52 seconds So I guess what you want in this sort of checks and balances scenario that you're talking about here is that there is no equilibrium where they collude.

1:36:021 hour, 36 minutes, 2 seconds And they're like, you know, I'll I'll catch you some of the time and but I'll let you get away with it some other fraction of the time in a way that we both we both we both benefit.

1:36:151 hour, 36 minutes, 15 seconds But do do you worry about the future a little bit, Because, you know, OpenAI, they're talking about bringing out the the multi agent system, and soon we'll have agents running all the time.

1:36:231 hour, 36 minutes, 23 seconds And it it was slightly easier to control when you had 1 kind of static when you know, I say static, but updated every 6 months.

1:36:311 hour, 36 minutes, 31 seconds 1 foundation model. Yeah. And you can do a whole bunch of red teaming on it.

1:36:351 hour, 36 minutes, 35 seconds And and now we have systems of agents that are running with different forms of memory and adaptation all all over the place.

1:36:431 hour, 36 minutes, 43 seconds And at at some point, the the way we do red teaming must change.

1:36:471 hour, 36 minutes, 47 seconds Yes. Right? And and also, we might need to be thinking about just doing simulations because it's not maybe static tests don't work anymore.

1:36:541 hour, 36 minutes, 54 seconds We need to imagine different scenarios, And it it just feels like the complexity is running away extremely quickly. Yes. I think that's totally right.

1:37:021 hour, 37 minutes, 2 seconds Like, how do you 1 agent on its own is already like, has all sorts of possibilities. Where are these multi agent systems gonna go as they as they, like, evolve together towards solving some task?

1:37:131 hour, 37 minutes, 13 seconds That seems even harder. I I I think I just agree with your concerns and don't have a particularly great solution.

1:37:221 hour, 37 minutes, 22 seconds So that's great. There is a there is actually 1 spicy thing, which is our mutual friend, Neel Nanda.

## Chapter 14: Are sparse autoencoders dead?

## Chapter 15: A Pragmatic Vision for Interpretability

1:37:281 hour, 37 minutes, 28 seconds Oh, yes. You know, he's a he's a Google DeepMind, and he he was I think he still is running the the the Mech Interp team.

1:37:331 hour, 37 minutes, 33 seconds But recently, he had a bit of a blog post saying that the grand aspiration of kind of white boxing and circuits and stuff like that, he's kind of lowered his ambitions a bit.

1:37:441 hour, 37 minutes, 44 seconds And and Neel is an incredible guy. But what's your interpretation of that?

1:37:511 hour, 37 minutes, 51 seconds I think he's I don't agree. And I've disagreed with him in person about this, so it shouldn't be a surprise to him.

1:38:021 hour, 38 minutes, 2 seconds But part of the reason for optimism is exactly the thing I was just talking about. Like, I think that the existing work in interpretability, we sort of do

1:38:111 hour, 38 minutes, 11 seconds this patchwork thing where we just do a bit of bit of science here on 1 thing, a bit of science here on another thing, and it doesn't kind of aggregate.

1:38:171 hour, 38 minutes, 17 seconds It's too slow. I think this sort of his idea is that the the time like, timelines are too short, and so we should do very pragmatic things.

1:38:291 hour, 38 minutes, 29 seconds I think I, 1, have longer timelines than him.

1:38:321 hour, 38 minutes, 32 seconds And 2, even if I were on his timelines, I think I would still be very optimistic about, like, just massively accelerating fundamental progress and interpretability.

1:38:441 hour, 38 minutes, 44 seconds I actually don't know what part of that he disagrees with.

1:38:471 hour, 38 minutes, 47 seconds I guess he might also say, like, the pragmatic stuff is also sufficient, which seems unlikely to remain true to me.

1:38:571 hour, 38 minutes, 57 seconds And I suppose 1 other thing was his comments about sparse autoencoders.

1:39:021 hour, 39 minutes, 2 seconds But do I understand that you you've you've almost well, you're in the process of moving past them as well with with this new manifold idea.

1:39:091 hour, 39 minutes, 9 seconds Yeah. And if like, I think he there's the thing that he said about deprioritizing SAEs, and maybe they're not the 1 true representation learner.

1:39:191 hour, 39 minutes, 19 seconds There's, like, how people kind of memed it, Which is like Neel Nanda says, SAEs are dead. There you go. You can use that for the intro.

1:39:271 hour, 39 minutes, 27 seconds And and I don't think that that is actually what he meant.

1:39:341 hour, 39 minutes, 34 seconds I think the field sort of, like, jumped on. Everyone must do SAEs now. And now maybe we're doing the same thing with natural language autoencoders.

1:39:431 hour, 39 minutes, 43 seconds But think he was, like he was probably correctly identified that they're not, like, the answer to everything, but they are, like, pragmatically useful.

1:39:521 hour, 39 minutes, 52 seconds You know, we still find lots of uses for them all the time.

1:39:551 hour, 39 minutes, 55 seconds I even though I think we are going like, yeah, I think this manifold idea is just a better a better fit for what networks are doing, and so we should move towards using that.
