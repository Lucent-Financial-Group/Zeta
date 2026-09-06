# Belief-state geometry in transformers — Simplex, "transformers learn to update beliefs over a world model" (Aaron forwarded, 2026-09-06)

**Source:** conference talk, https://www.youtube.com/watch?v=WUnCb0TyHVA · Simplex (interpretability
research organisation). Transcript below is **verbatim as forwarded**, unedited, per the
preserve-ferries-verbatim discipline.

**Why it is filed here:** Aaron 2026-09-06 — *"this connected very closely related to our clifford
and basyian stuff."* Filed under `ip-questionable` because it is a third party's research talk
reaching us through a single source; the analysis below is ours, the ideas are theirs, and nothing
here is a claim about their work beyond what the transcript says.

## The correspondences, at their real strength

**1. The load-bearing one: relaxing transition operators to admit NEGATIVE elements.**

> *"We're just going to relax assumptions about the operators. So now the elements of these
> transition operators are no longer — you can't interpret them as transition probabilities. They
> might have negative elements for example."*

That is a **Z-set**. Signed weights over a latent space, folded by matrix multiplication, where the
negative half is not a probability but a real element of the algebra. Zeta arrived at signed
weights from DBSP and retraction (`+1`/`−1`, `ZSet.neg`, `RationalRing`); this talk arrives at the
same relaxation from asking what a transformer's residual stream is natively able to represent.
**Two independent routes to "the coefficients must be allowed to go negative"** is a stronger
signal than either alone — and it is the specific claim worth checking rather than the mood.

**2. Belief updating over latent states is `SoftValue`.** The talk's core result — *"predicting the
next token well means that you perform Bayesian updating over the latent states of a generative
world model as you observe more context"* — is the operation `src/Core/SoftValue.fs` implements:
`observe` multiplies a likelihood into a distribution over candidates and renormalises, and
`foldRetained` folds a whole evidence set commutatively. The session that filed this doc spent its
day fixing exactly that fold (`081M1SA32SS087G0R0026C01ZP`).

**3. The probability simplex, and non-orthogonality as the encoding of uncertainty.**

> *"there's this natural geometric embedding in terms of the probability simplex over the hidden
> states"* … *"models actually often want to embed things non-orthogonally … you end up getting
> these multi-dimensional representations."*

`SoftValue` is a distribution over candidates — a point in that simplex — and Zeta's own
`diversity floor` says the same thing from the values side: **collapse to a vertex is the failure**,
and the interior is where the information is.

**4. Quantum belief geometry ↔ our Clifford layer.** The talk trains on data with *"a very
parsimonious quantum description but no concise classical description"* and finds the model
representing **density matrices on the Bloch sphere**. Zeta has the same objects one layer down:
`src/Core/Cl3.fs` (Clifford Cl(3,0)), `QubitIso.fs` (Pauli/SU(2)), `AmplitudeEmu.fs` (complex
amplitudes → interference), and `Tsirelson.fs`. **Register: this is a shape correspondence.** Ours
are classically simulated qubit-shaped linear algebra, explicitly peeled as such; theirs is a
measured representation inside a trained network. Same mathematics, different claim.

**5. Tensor product → direct sum is the factored-world result.** *"the number of dimensions grows
exponentially with a number of parts … if the model learned that there are these parts and it does
belief updating just over each part in an orthogonal subspace, then the representation would only
need to grow linearly."* That is the tensor/direct-sum split Zeta's Cayley–Dickson and
`only-the-irreducible-is-primitive` material already turns on — generate from parts, do not
enumerate the product.

**6. Non-ergodic data gives POWER-LAW in-context decay.** *"even in the case where you have very
simple generators of data but you have many of them — so you have non-ergodic data — that also
leads to power law decay."* Worth recording next to the ρ/decorrelation thread: a population of
many simple generators is exactly the decorrelated-agents picture, and this says its learning curve
has a different functional form from a single generator's. **Not tested here.**

## The honest limits

- **Single-source, and a talk rather than a paper.** The two papers named (NeurIPS 2024, ICML 2025)
  are not read here. Nothing above is checked against them.
- **Every correspondence is a SHAPE MATCH until someone computes it.**
  `.claude/rules/numerology-vs-number-theory.md` applies in full: say *"consistent with"*, never
  *"is"*. The negative-elements one (#1) is the only item specific enough that a disagreement would
  be visible, which is why it is listed first.
- **The talk's own strongest caveat is preserved in the transcript** — an audience member presses
  precisely this point (*"to what extent is this just providing the semantics for a linear
  dynamical system"*), and the speaker concedes the models are toy and that LLM ground truth is
  unknown. That exchange is left in rather than trimmed.
- **Aaron's framing is the register to keep:** *"very closely related"*, not *"the same"*.

## Transcript (verbatim as forwarded)

```
0:00
really it's it's been a a wonderful week. So, thanks to the organizers for getting such a good crew together. Um,
we've heard a lot of uh, useful work that's been done, a lot of great perspectives, and hopefully, um, [clears throat] even though it's the end of the week, I'll be able to add a
slightly different perspective, and hopefully I convey some mix of optimism and urgency in that, um, there's there's work to do inter in interpretability
that's that's very important. As Thomas said, I co-founded uh this organiz organization simplex uh indeed to figure out the foundations of interpretability um kind of motivated by AI safety kind
of some concern of the default trajectory doesn't seem that great. Can we do something about it? And if you
remember back to the beginning of the week, Josh Batson gave a talk showing a lot of the nice work uh that he's been involved in. Um, and one of the things there he was pointing out is even though some of this stuff seems kind of beautiful, it's kind of complicated and
even line breaking seemed pretty difficult and kind of it seemed like the takeaway there was like ah it's just too hard. Um, I hope to convey a slightly different perspective that maybe there
are just some basic building blocks that we need to discover. Maybe we just haven't tried that hard as a community yet.
um that you know if you think about the general abilities that neural networks are developing with a pretty simple uh repetitive architecture you know to comp
to complete all of these tasks there must be some uh reliable structure that that we can get out of that so that's maybe a type of source of optimism um and so I'll I'll share a bit of our journey today where we've um where we've
been able to um find some So
the urgency comes from this I don't know kind of realization that oh wow it now seems very clear that intelligence can
be made. Um of course we always should have known this. Um you are each proof of principle that a physical system can be intelligent. It's no magic here right? So if a physical system uh can be
intelligent then then why couldn't we make it if we if we did have uh some understanding or you just make enough mistakes in the right direction. Um, well, you might ask what what I mean
by intelligence, and I'll just kind of vaguely say something like a self-consistent understanding of how everything relates to each other. And then on top of that, some ability to use
that understanding to kind of take action in the world flexibly. So, something like that. uh seems like we basically have this and that's profound but I think it actually isn't uh it doesn't even get to the heart of how
profound this moment is uh in my eyes that it's really like whatever you think makes you special can be made like again your proof of principle that a physical system uh can be that um so it seems
worth taking this moment seriously and thinking if we have deep understanding what can we do about Well, so let's just address this this
intelligence question. Seems like there's a recipe for it these days. Those those two parts of intelligence I talked about basically come from pre-training and post-training where
pre-training just the ability for models to predict future tokens from past tokens. It's sufficient, it turns out, to basically build this self-consistent understanding of the world that historical context gets embedded in such
a way that there needs to be some um when similar predictions are made, there must be some self-consistency. And we'll we'll see more about that. And and then post-training ends up um giving models
the ability to use that understanding for reasoning, a sense of self, and even we see a sense of desires. You see these hugging face attacks and so on. Um, and that seems kind of sketchy. Um, so more
for the urgency. So this is a call to action. We must
build deep understanding of intelligence. Why? Well, I'll give you kind of three highle reasons why. Say maybe most basically understanding
elevates the conversation. We need to be having really deep important conversations now. Uh but what I what I see happening is a lot of people talking past each other. There's a lot of strong intuitions and not a lot of shared just
like scientific truth. Um because we basically lack those foundations. So if we can build that um there will be more grounding in what this uh thing is, what this moment is.
If we understand we have more optionality. It's not just the default trajectory of whatever gets built and we
hope for something like alignment by default. Um we can figure out what we want to build and what we don't want to build. And to the extent that we're understanding intelligence itself, um it's also kind of a sketchy thing, but
we could think about augmenting ourselves um potentially rather than being replaced. Is there just something about ourselves that we want to change?
Finally, deep theory is important because understanding compounds. So there's a lot of beautiful work in
mechanistic interpretability and it's useful to build a list of facts and it gives motivation for good theory. But you know we're in this moment where capabilities are compounding right and so we need something comparable in
interpretability where if you have a fundamental understanding then you can use that um to to get new understanding right and also there have been a lot of uh things going on where even frontier labs
are talking pretty seriously about uh well maybe we should pause maybe we should slow down AI development and what's the point of that you know if you're not going to be stopping forever the point is so you can understand and
make better plans for what to do. Uh so we shouldn't wait until then. We should be building this now. So hopefully that's sufficient motivation here. Uh let me tell you a little bit of what that interpretability looks like at
simplex. Um basically just to point out that we're trying to create this kind of virtuous cycle where we have some theoretical idea that's you know got us started at all. Um what's the nature of
representations? What are the implications for behaviors? test that in models, build tools, test that, find real things about real models and not trying to vindicate any framework, but just trying to figure out the truth and build a more sophisticated
framework and so on. Okay. So,
so here's the agenda. It's kind of a ambitious agenda uh for today. Um, but I'm going to spend the most time uh on this first and last point. Um and
the first point is kind of the foundation of of the other pieces here where we find that transformers learn to update beliefs over a world model. So there was at least some years ago a question of uh are these LLMs just
stoastic parrots whatever that means or or do they have some type of understanding and so uh what we were trying to do is well what's just the most simple kind of falsifiable setting where we can um go towards answering
this question right and it turns out that transformers learn not only something like a world model but effectively how to do uh belief updating over the latent states of that model as
they observe more context. So that lays the groundwork for these other parts where we find actually
what's the what's the nature of this computation. A lot of people brought up the idea of boolean circuits. Well, if we think that and it's not the case um then we're not going to find what um we should look for. So it turns out that uh some ideas that are closer to quantum
computation actually end up being relevant because models are operating their memories in effectively real vector space.
It turns out that the world's made of parts. We know this. We see um people,
chairs. Why do we do this? In turns out that intelligent systems um have an inductive bias to do this for good reason. Um also there are many different types of scenarios. You don't need to
kind of be aware of everything all at once all the time. uh that has some signatures and putting all these things together um gets us towards a story of abstraction and how that could ever come about which I think is uh exciting and
and relevant for all of us. So that's the plan and uh there's other natural follow-up
work that we can do and we're uh we're doing at simplex. We want to know about composition, how this happens over learning. Uh how does post-training harness these representations to how does the model use those?
To what extent are artificial neural networks the same type of intelligence that we are? If we can understand something about universality that seems quite useful. Um to what extent do models have models of others and models
of self? So these are all things that we're able to work on now because of this other stuff. But but let's start here. And
a motivating question for this part then is what computational structure do neural networks grow when pre-trained on next token prediction. So of course remember we're not like programming uh old school um in this case do this in
this case do this right you just like set up the initial conditions of a neural network with data and like these connections grow strengthen what grows and strengthens can we can we have any interpretability
well let's start just from a behavioral point of view behaviorally performing well on x token prediction would imply um doing something like behaving as if you
had a world model and then you do Beijian updating over the latenc model as you see more tokens. So that's just kind of the answer to pre-training if you did a good job at a behavioral um
point of view. I I think it's useful here to think of transformers or any sequence model as in
kind of these two axes where you have u your your token order. a kind of context position here. Um, x1, x2, this is the x2 is the token at time two. And and
then moving through the layers here of the neural network.
Then there's um there's two probability distributions of interest. One is where
are the sequence sampled from in training. So so q here is going to be that kind of ground truth um distribution whatever it is that you're you're drawing samples from. notation capital X is the random variable for the
token. Little X is realization. So um capital X one through L is the token sequence random variable for the token sequence from one through L. Well then but at any point of training
for the weights and biases uh there's some the weights and biases are some parameter theta and the neural network will make some prediction of the next token given the historical context. Right? So uh that's
true at initialization and over the course of training and then the cross entropy loss the expectation value is just this uh this cross entropy so minus log
probability uh distribution that the model is predicting and you're weighting that by the by the actual distribution over tokens right so if you minimize the cross entropy you end up just getting the the joint entropy the entropy itself
and you can always decompose the joint entropy into conditioning on the first token uh and then conditioning on on the last two tokens and so on, right? You always have that sort of chain rule. And you can imagine at least for a
stationary process, if you're conditioning on more and more things, you're just going to be um less uncertain as time goes on. And so you should expect at least a very basic type of incontext learning just by default.
Like that's what we're asking the model to do. Um so this is just over the course of training. So for for very
simple generative models, I'm using some hidden markup models here as examples. Um the model should um update its beliefs. So you can think of this um explicit graphical network showing how beliefs evolve given the tokens and and
that then implies um reduced loss as you observe more tokens and that happens over the course of training.
And then in terms of this belief dynamic, how beliefs evolve, you can think of a linear operator for that. Just like in these simple examples,
there's a transition matrix over your states of knowledge. Typically, it's a non-normal operator. It's non diagonalizable, but there's some spectral theory you can do, which is kind of cute. Turns out then that when these objects
are finite, you end up think with things like exponential decay of the in context um belief updating um you know polinomials times exponential decay. But when you end up having these kind of
infinite state infinite infinite state belief dynamics uh then kind of all bets are off and you should expect generically power law decay of in context loss, right? Uh so two important
cases where this happens um one is where you have uh super regular grammars so like uh contextf free grammarss for example I think that part's pretty well known but even in the case where you
have just very u simple generators of data but you have many of them uh so you have non-orgotic data that also leads to power law decay so I think useful to keep in mind
Okay so behaviorally the the kind answer to um minimizing cross entropy loss is
acting as if you had a world model and doing basian updating over it. Um but what's actually happening inside it motivates the idea that maybe inside there's actually something beautiful happening there. Um but what are
transformers learn to actually represent? You know people have argued about this
especially some years ago. Um people have different opinions. Seter had an opinion that that happened to resonate with me where he was saying predicting the next token well means that you understand the underlying reality that
led to the creation of that token. Sounds nice. Can we operationalize this? Is this like a falsifiable statement? Right? So again we think through what's the most basic case where we can get a a handle on this. So we introduce
something like a three-state hidden markoff model. Uh you don't observe the states you observe tokens emitted kind of on the edges. In this case, if we train a model on this, what would happen if we look
inside? Are we going to say are we going to see inside? Oh, it has three states. Here's the transition probabilities.
Um, actually, what we end up um finding is is a refinement of the statement here where predicting the next token well means that you perform Beijian updating over the latent states of a generative world model as you observe more context
during inference. So when we open up the the transformer, what we should see inside is instead kind of this crazy fractal object which has to do with uh iterative belief updating.
And that's indeed what we find. There's our paper here from NEURPS 2024
where over the course of training this geometric structure ends up being represented in the residual stream which just the vector space that goes through the layers of the model. um you end up
seeing this where every point here is a historical context. It embeds in a particular way. And how do the different historical context embed relative to each other? It's in this kind of self-consistent way as if it's belief
updating over over this if you'll allow me to call it a world model in this simple case.
Question. Yeah. Um I don't know who but go ahead. Uh can I go to the previous previous
slide? Yeah. Do you know for sure that the um world model you have extracted from the neural
network is indeed like do you have a mapping between um this is how this is represented and this is how this computation is happening because ultimately like that's the claim you're making, right? Yeah. And I'll tell you more about that
in the next like 10 slides or so. Um but yeah, at first we basically we thought maybe there's something like this in the model. Uh so we just tried linear regression. It didn't have to be linearly there in our minds, but that
ended up working that yeah, there was a linear map from activations to what we expected. Um subsequently we figured out we could just do PCA. It turns out that this object is just in the top three PCs. You can just rotate and see it. And
the model's not using its other dimensions effectively for anything else. So this is like everything that's happening and we have some mechanistic understanding of that. Yeah. For the previous slide, I'm just so
struck by this very simple formulation of this idea. So just uh conceptually,
what if I we had taken our hundreds of billions and so forth and just invested them in creating massive engram language models with a bit of smoothing. So these things are outstanding at doing next token prediction. They're truly massive.
You know, we solved the data problem there. uh would it then understand and have this rich model of the world? Do you want to deny that that could actually happen that we would never with that
kind of machinery get to the point where it was that good at next token prediction or do you want to accept that this would be another kind of object you'd want to understand mechanistically but it would understand? It's a good question because this this
kind of points at like well the model's just doing some engram thing um or like behave equivalently but I think the representation parts is really important that um what I hope to get to by the end
is uh an understanding of how something like abstractions can emerge from this um and that starts to tell us not only like what about the probability
distribution we trained on but something more about interventions and out of distrib distribution things that given that this is how the model formed its representations what are the what are the counterfactuals and I don't think you would get that from so I see you're denying the first
quotation um yeah I'd say refining it but there's um well but it's so it's so direct so it's
like either true or false right I don't know yeah um hopefully it becomes more clear
by the end if not let's let's talk more about it sorry could you explain one more time
how you went from the left hand side to the right hand side. Yes, I'll do that now. Okay. Um
I'll do that in a slide. um we should expect this behavior to be pretty
generic like this is also this is the way that intelligent systems should um kind of encounter the world this kind of belief updating because even if you have a perfect world model you know we have these impoverished senses you can
imagine uh you go to bed you wake up you know what the world is like but you need to kind of synchronize to what's the current state right so you you take in the sensory input and you're kind of integrating it over time to to then get
your your percepts so there's this kind of um belief updating which is pretty natural. We're going to talk about this
very simple case which will then you'll you'll be able to see kind of how this comes about. So so very very concrete example we'll take a hidden markoff model which is very nice because it allows us to just get sequence
probabilities via linear algebra. So the the way to read this is basically if I
was in this state then I would see a token zero with 50% probability and and go here to this other state. You can write down all those transition probabilities in terms of token labeled
uh subscic transition matrices and then the probability of some
particular sequence you can calculate by take the initial probability distribution. So like the prior over the latent states here and then you just do matrix multiplication of all those token
matrices and this this one vector here just integrates probability.
So so okay that's great. So we have kind of a linear dynamic over latent space
and uh that that allows us to calculate sequence probabilities. Um and one thing that immediately allows us to do is to talk about just conditional probabilities. What's
the probability density over futures given some particular past? Well, I can just use B rule to say okay this is just the probability of the joint past and future divided by the probability of the
marginal just the past. If I write this out in terms of my linear algebra, I see the only place that the past comes into play is is this thing which I can just think of some vector, some predictive vector. And whenever two different paths induce
the same predictive vector here, then it cannot affect the future differently. Moreover, when two different paths induce similar vectors, then it cannot affect the future very differently. Right? It's um so there's some geometric
embedding here already. So, so this is the type of object that we're going to care about. And in those
pretty pictures I was showing, every point corresponds to one of these vectors. And the geometric relationship is how these vectors kind of place themselves relative to each other.
So we go from this generative structure to then thinking of well let me just do baze rule to see how my beliefs would
update as I see tokens. You have this explicit graphical structure for how your beliefs would update. But then also every one of these beliefs had this natural geometric embedding in this case in terms of um probability distributions
over the latent states here. So there's this natural geometric embedding in terms of the probability simplex over the hidden states. So you say like probability of state A, B and C things
are normalized to probability one. So that ends up putting you in this two simplex.
So this is kind of a natural way to to represent um not only a world but beliefs over the world. And then this is
the type of thing that then we end up um either doing linear regression to or just doing PCN finding um in the transformer. So I guess you'll all know
um by now but the transformer is just this uh these repeated layers of attention which can look back in context and these MLPS which can do these nonlinear transformations.
every historical context gets embedded into some point in the high dimensional vector space and then the claim is that
well there's a linear map then from these activations to the predictive geometry that's what the schematic is showing the question so each point is a
is uh past yes each each point is an
[clears throat] embedding of the past aa of X you're plotting some version of EA of X there. Yeah. So in this kind of theoretical prediction yeah that that it is the um
the theoretical prediction of the context embedding just from from bay updating and then it turns out that the this is basically what the transformer is doing. Yeah.
Yeah. So uh see sorry. So in the residual stream what are you plotting? So, so that I
understand the middle one is the ADA. Yeah. Yeah, that's right. And and so the residual stream is just some lingo for there's the these skip connections which we think of as kind of this primary object. It's just this vector space that
moves throughout the layers. So So each of the attention MLP kind of um reads from and writes to that residual stream and and that's where we're looking for the activations. Yeah. And it turns out
that the model in in this case is just using this lowdimensional subspace um and it's just doing this thing. So this is hopefully interesting. It
should also be a little bit confusing. Um you know how how is it that a transformer which we think of as this
feed forward network over the course of training um it ends up developing this sort of thing. So is is it clear at least what we're talking about? So, we'll build on this a bit. So, okay.
So, can you say what the colors mean? Uh, yeah. So, the colors, um, it's just RGB in terms of how close you are to the
different corners. And, um, it's trivial here, but but in this case, um, it's colored according to the ground truth. And you see that, um, I mean, otherwise you could think maybe it would be mixed up,
right?
Okay, so hopefully this is cool but also a little bit confusing because
transformers are these feed forward networks but we're talking about something like recurrent Beijian updating. How is that possible? Uh we were also confused by this and thinking are we are we tricking ourselves? How
how are transformers doing something like this? Uh so we had this work that we wrote up for ICML 25
where we we did more mechan to be what's going on here. So same type of training
data from from this HMM there's this belief state geometry for kind of predicting as well as possible if you're doing updates over the the hidden states of this guy. And then we're looking at a transformer just a single layer transformer um although we looked at
deeper ones. And then we look at the representation the model has after attention and after the MLP. So we call this the intermediate um representation after attention and um the final one after the MLP. We end up finding then uh
kind of cool that and now this is just PCA these these two um at the final position you end up with this beautiful belief geometry. At the intermediate, you also get something pretty, but it's now like the Serpinsky gasket. What's
going on there? [clears throat] So, we were thinking about, well, there's architectural constraints the
model has to deal with, even if it's trying to do something like Beijian updating. Um, attention is kind of this pair-wise thing that it brings in uh contributions from the source positions independently basically.
And so even if the model's trying to do like this probability distribution over the destination token given the full
context um kind of given the architectural constraints you can think of well the best it can do is there's just the the marginal probability for that latent state and then just [clears throat]
um unique updates to that that I could say well if I just knew the source token then how would I update the probably distribution over latenc some distance
away. Well, but for these types of models, right, we can we can write down in terms
of whatever probability distribution in terms of our linear algebra. So, let's do that. So, this is kind of the full belief updating. This is the constrained belief updating where now you're you're taking the contributions from the source position. This this net transition
matrix T is marginalizing over all the tokens between source and destinations. So, it's just that net transition matrix to some power D minus S, the distance between. And remember that when we have these
types of objects, these are vectors in some lowdimensional vector space. So that gives some prediction for what the
representation would look like. And [clears throat] so from these uh ons we can say well we expect eventually the model does something like this but intermediate representation might be something like this. And then we can do
PCA at those different positions and that's basically what the model is doing which is pretty cool. Yeah.
I'm curious because it's so beautiful. Uh have you do you see something much
messier if you have a random network and for sure structural correlates as the network gets better and better and next to the prediction there's a correlation yeah definitely um I'll [clears throat]
have some plots of that um but to to be
uh maybe a first uh convincing thing towards that um these all of these empirical things are um just rotations of the top three PCs at the different
positions. For a random network, it would look like garbage. It's a small network. Um, it's a small network. This was
simple training data. So, this is not an LLM, right? This is just we we just trained a small network toward understanding what types of representations do transformers learn and hopefully some of that extrapolates.
We'll see what extrapolates to LMS. So I mean just the self-consistency of
this theory then where you end up on you can imagine on one side of the equations you write kind of these linear algebraic things and on the other side of an equation you can write down things about the architecture like attention patterns and whatever that ends up allowing us to
predict the token embedding um OV vectors attention pattern and all sorts of stuff in a lot of richness. So if you think this is cool, you should check out the paper. Um, and hopefully
you you do uh start to understand this and and feel some inspiration, right?
So, you know, we usually think that we have this object of study, this inscrutable set of matrices, but but here you are starting to see some insights. You're mathematically inclined, starting to get this. And so,
you know, we are simplexing. We're telling you something like to be very repetitive. Predicting the next token well means that you perform basian updating over the latent states of a generative world model as you as you observe more context strain inference.
So you're starting to get this. Okay. So so what type of world model are we
talking about? We've talked about HMMs, but it's not just HMs, right? People talked about boolean circuits. Um surely we're not talking about like quantum computing. What type of world model are we talking about? Um actually
as I mentioned earlier it's kind of more like quantum computation in the sense that the model's using this real vector space. So can we get a handle on the class of things we should be looking for?
I'm going to give you kind of a teaser at that. Um that
the way we should be thinking about um world models and representations goes beyond kind of the classical computational paradigm. So I'm going to just give you basically
the same notations that you can just we're just looking at the same type of model which is a linear dynamic over a latent space. So sequence probabilities are calculated in exactly the same way.
We're just going to relax assumptions about the operators. So now the elements of these um transition
operators are no longer uh you can't interpret them as transition probabilities. They might have negative elements for example. Uh but it's the same type of thing. We're just relaxing it to to be a more general linear latent dynamic.
And then if you had a model like that um you could you could do the same thing
where you say well what's the probability density over futures given some particular past. you'd end up with the same type of relation where you'd have these predictive vectors, although they're no longer probably distributions over a latent space, but they're but
they're still embedded in some latent space. And
then the representation becomes uh kind of this richer set of things that corresponds to like these generalized probabistic theories where when we were talking about hidden markov models um there were these states of
certainty just kind of these discrete points at the vertices of a simplex and then everything in between the the convex hole was corresponding to our states of uncertainty right
more generally you could imagine having continuums of states of certainty like well where am I in the week. Um I am pretty sure Max talked about days of the week on the circle. Uh you can imagine, you know, you can be Thursday afternoon
and you're not uncertain about if it's Wednesday or uh sorry, Thursday or Friday, but you're you're somewhere in between in a particular place and you can also have uncertainty kind of in the convex hole. So, so there's this
framework that allows for talking about things like this uh and is very natural for neural networks. We already saw that they can use non-orththogonality to encode for uncertainty. So why don't they use non-orththogonality also to
encode for different states of certainty that lie along a continuum. A special case of this turns out to be
the paradigm of quantum computation. Uh which is kind of cute but interesting. Um how it interacts there. Uh where maybe some of you are familiar
with the the block sphere states on the on the shell of that are states of certainty and the interior has to do with uncertainty over those. So to see if this was going on at all,
our uh models taking advantage of this extra flexibility, we we pulled from the um kind of quantum
foundations literature, physic foundations of physics um where there are some processes where you just have classical sequences of tokens, but it could be produced very easily with say
just like a single cubit of memory, but there's no finite hmm that would produce the data. If we train on token sequences like that, what does the model find?
Um, well, the the kind of expectation might be something like this this rich
geometric embedding here. Um, basically this is just saying that the way you would usually write it in quantum mechanics is just the same thing. We usually use a representation of density matrices which just some vector and a
super operator is just some operator. It's just different different representation and indeed over the course of training
on this model that has a very parsimmonious quantum description. Um the model learns this representation where the activations uh correspond
linearly to density matrices if you were uh belief updating over those. So kind of cool. Um I'll just say that the this
representation then ends up um getting better. um [clears throat] over the course of training uh as loss goes down and through the layers to answer your
question a little bit. Um yeah,
actually sorry, how did you generate these like these images again? Like are these also like the same?
These ones or the ground truth ones? Um both. Like how did like they look like the ground truth ones. So how did
Yeah. Yeah. Well, right. That's kind of the point. the uh so the ground truth is just um this um
kind of like a belief updating thing but now it's just um an update of the latent vector which u corresponds to I mean we we generated the data from something which has a concise quantum description but no
concise classical description so so then these guys end up having some geometric embedding so that's these guys which ends up being now every context induces a point effectively in the the block sphere
Um and then where do these come from? Um in this case it's it's a linear
regression from uh the activations in the model across the layers to the ground truth and over the course of training uh it it sharpens up to be that thing. Yeah.
I I guess I have a a question about this generalizing model. It feels to me like it's just sort of like a linear damage
system. Yeah. over the latence and then there's some map to get the observation out of that. Yeah. So, so I have I have a linear dynamical system and I've taken HM and I said well you don't have to your states don't have to be in the simplex anymore.
But then it seems like the other main ingredient is you've taken uh generalized probability from quantum mechanics and said we're now going to take things that might be negative and don't sum to one and call them
probabilities in a generalized sense. Right? [snorts] You don't need to do that. I mean you need probability distributions over
tokens but you don't need to talk about probabilities over the latence but but you did though right because that's sort of like the generalized probability theory like that's the interpretation yeah I wouldn't necessarily advocate for that but it is consistent with the
generalized probabistic theories framework but I guess my question then is to what extent is this just providing the semantics for a linear dynamical system because we've we've sort of had [clears throat] those in our lives
as humans for for you know for decades not a hundred years and
This is just the new semantics for this those sort of relations. Um this is a new semantic. What's this?
This would be the quantum belief geometry. Um sure. I think the point so the point here is trying to figure out what is native for a neural network to represent. So um so it's kind of cute
that it does this quantum thing. It even goes kind of beyond the quantum paradigm of uh memory. Uh and so so it is nice to see how it corresponds to things that we do know. Uh but the point is to figure out what is a native uh representation
what's a native world model. Um so if it's clarification then
I mean you are training a model on this task and so it learns a representation that's suitable for this task.
Yeah. Yeah. This doesn't say anything about the models that we are using today. Right.
Like what like you know the task that you're using to train. Yeah. Yeah. Yeah. Right. So
and so it's a cool finding that the model learns the natural sort of representation for that task. Yeah, thanks. But it shouldn't be
relevant for LLMs because we don't know what the ground truth is there, right? But at least this gives us some hope that hey models sometimes find these
very beautiful parsimmonious things and we can even anticipate what the geometry is. It's not just we find a spiral, we can anticipate it. So this gives us some hope to go for the LLMs. So let me forge ahead and try to get towards that.
[snorts] Um this is just saying that the model learns it's beyond next token uh probabilities. It learns really
something about um an embedding for the more full future distribution.
Networks are utilizing non-orththogonality in their network. Like sparse autoenccoders were kind of motivated by the idea that oh models want things to be orthogonal but they don't have space. It turns out that models actually often want to embed
things nonorthog non-orththogonally and you you end up getting these multi-dimensional representations. Um, and so that's kind of uh part of the point here.
You also get universality. A lot of the stuff we've talked about so far um it's kind of independent uh what we what we expect is independent of the particular
type of model. Um that like you were saying Chris, we would like our theory to go beyond just understanding transformers. And here's something that's a little bit architecture agnostic. We end up finding that that all the different models um work around
their architectural constraints because this is what they want to do. So, uh, of course there's going to be differences, but it's it's nice to see that happen sometimes. Okay, now this is getting towards your question of like, okay, well,
does this matter for for real models? And we're going to take a few steps to say how um how we end up refining uh these ideas. You can imagine the real world out there, even if we had access to the
ground truth, it's huge. there are too many dimensions in that thing to be contained in the residual stream of a transformer. Um, so the dimensions get big, how's the model going to do this?
Um, and so this gets to the idea of the model breaking its world into parts
um, which was a paper here at the last ICML that transformers learn factored representations. They just have an inductive bias to break their world into parts. So how is this happening? because the
model is just getting these tokens, right? There's just like a token is just like a monolithic thing, a priority. There's no like parts implied by that. Um, and and besides, isn't it more enlightened to see the world
holistically? I think, you know, there's a lot of beautiful ideas of of uh, you know, different types of philosophies, and I never really could tell why we should prefer one or the other. Um but
now I feel like I do understand that there's this dimensional advantage for um breaking things into parts. So, so we can go back to kind of our our favorite toy setting, uh, which is kind of this easy falsifiable thing. In a case where
this guy comes from naturally a few parts and you can imagine just take the tensor product of a few generators, um, that creates some some big joint thing and if you train on data from that guy,
then uh, what does the transformer learn? And when you have many of these parts
that you're composing that joint space because you're taking the tensor product, the number of dimensions grows exponentially with a number of parts. But but actually if the model learned
that there are these parts in the world and it does belief updating just over each part in an orthogonal subspace, then the representation would only need to grow linearly in dimensions with a number of parts, right? So that's like
an obvious advantage to do that. um there are these different geometric implications uh kind of on this uh embedding on this joint space or just looking at kind of this direct sum space. If there are really correlations
among the parts then you end up in this joint representation and you cannot then go uh and factor things without being lossy. But even then we find that models
do um have an inductive bias to approximate parts as uh conditionally independent. And
so you can imagine in the joint space the predictive vector could just be
written as this tensor product of the of the parts. And if the and if the joint map was also just a tensor product that would preserve this sort of structure and so then you can just track these guys instead in a direct sum space. So
you can just have this you know factored world hypothesis that actually the model is just going to track these guys individually.
So two different representations one grows exponentially one grows linearly.
And so we test this by taking um five parts of the world, three of these
little classical guys, two of these quantum ones, and each of those is a you can think of as a dynamical system. You end up having the observe token is just
some function of what each of them is doing. And then you train on on this that again a priority the model doesn't know that its world is made of parts. But we'll do PCA to look at how many
dimensions is the model using and we'll look at subspaces to see if the model is discovering these parts somewhere in its representation.
Indeed, over the course of training, the model ends up um going to this lowdimensional representation um as if it's representing five two-dimensional parts. Um, and so it's really just using
very few dimensions and it's it's cool to see this over the course of training there's like this very kind of step-wise structure uh that emerges
and uh so I think there's a lot to study here in terms of the learning dynamics
and and if you correlated those maps then there's still going to be so there's this correlation term
then there's still going to be an inductive bias for the model to do that factoring. And if you keep pushing loss, then the model is going to kind of say, okay, I need a more rich um representation. And so the model ends up
using more dimensions than uh to to describe that.
So, I realize I'm eating into my um discussion time, but if it's okay, I'll
take another 10 minutes to um to to tell this story to get us to something about abstractions, why that should ever happen. So, very quickly, non-erodicity
implies sparse multi-dimensional features. So, there's different scenarios. I was saying you can imagine that sometimes your sequences are from
one type of generator. uh let's say for producing Python code another time your sequences are from another type of generator for say romance novels and
then you can you can represent the the net generator as just like the direct sum you have kind of these guys operating on different parts of space and
now you have the burden as you're observing tokens to figure out not just which latent state of this generator am I in but also which generator which part
of the world am I even So you can then imagine that there's
gain more evidence, you'll kind of zoom in on the true like if it was a particular three-state HM, you'd zoom in on, oh, this is the one being represented. Um, and you would kind of
lose probability mass on the alternatives. So you end up getting this telescoping conical structure uh which is what we end up finding. Um again kind of a a quite beautiful thing which is
generic about how do you track what type of scenario I'm in.
And so then the predictive vector for this looks like a posterior over um
which generator which part of the world uh times a predictive vector if you condition on being in that component.
And importantly now we're in this regime where you can you could imagine
alternative representations where say you separately track the posterior over the parts and separately track the conditional uh predictive vector if you're in that part. But these guys are
nonlinearly related. So it's kind of important to do the experiments here to figure out which one's the case and um kind of hopefully motivate some math mathematics from there. for why did this have to be the case? Maybe there's
something about the learning dynamics or the the weight setting that that leads to this.
Okay, so I think I'm now equipped to tell you um about this abstraction story that well what if each of these parts
uh themselves factored into um more components.
So here's kind of a a little cartoon to to get us thinking about this correctly.
Um, okay. Let's imagine that, you know, our our HM representation comes in uh to the neural network and he's like, okay, yeah, you put out token 012 go through here. Uh, this this guy over here puts
out tokens in a totally disjoint alphabet, right? So, the neural network's like, oh yeah, I have another kind of circuit for you. um you say wait a second the neural network maybe recognizes that actually the mechanisms
the underlying latent structure is pretty similar um and so you know what I could just funnel my computations through the same space you could imagine something like this happening if it recognized um some some abstract uh
similarities so now we're going to put these pieces together of the urgotic components uh
which gives us this direct sum and the tensor product when you had each component had had a few parts right so now we can imagine Imagine that larger scenario um saying how the dynamic
evolves when you see tokens and let's consider this case where one of
the factors one of the parts of the world is shared among all the different scenarios. So like let's say this T1 is shared among all the different erotic components. So this kind of factors out
um so these guys uh are just related by some permutation matrix. are basically um equivalent and then uh well what does this imply if we think of that kind of factored world hypothesis tensor products basically melt away into
direct sum space so so by itself this wouldn't suggest a different number of um dimensions but once we basically think that ah these tensor products are going to melt away then we say okay then
we have uh this candidate representation where uh that first part is represented kind of redundantly for each component or or in this case where that that first
part factors out um then uh yeah I'm sorry I I misspoke
earlier the uh the permutation is once I reorder things this way
um okay and now you this implies kind of an abstract solution where I only uh
encode that belief of the first part of the world once and then everything else tracked separately. So let me give a concrete example of this. So you can imagine this is kind of
going back to Josh's talk. You can imagine uh line breaking that a model will need to know uh when have I gotten kind of to the end of a line and then I'll have a special character which is a new line token and that's going to
happen in all sorts of scenarios. So you can imagine something like there's a map which is a tensor product
of that type of abstract structure with some like particular languages. Um these are just kind of toy languages here. And when we train on those toy languages
that all have a shared um new line prediction kind of subtask, then all the languages end up routing that task through the same part of the model and they have a shared
representation for tracking um the um where where you are in the document. And something that's interesting here is
that as you as you increase the number of uh languages that have the shared task, the model becomes more capacity constrained. And so you end up basically
with um with more of these languages uh you really do basically force the model to to use the shared component so to develop the abstraction.
Okay. And then this seems pretty relevant to LLM starting to get towards your question here where okay now we're
motivated to look for this thing that maybe there's this character count manifold that would be shared across languages. So if we just take the mean activations from uh different languages
at different character counts, you end up basically seeing the same shape just with some offset for the language.
So abstraction which is great. Um, and in fact you can you can do more to look
into these representations. If you not only look over the character count, but you also look at the line number, you end up seeing, oh, there actually these richer multi-dimensional geometries that the model's using, and it's this shared
abstraction that it can use for many tasks. A final example that I'll give is for
programming languages. So um for programming languages you can imagine uh if you're learning Python and you learn about for loops it would be a shame to have to relearn about four loops in C or
whatever right so it's very natural uh to think about uh a type of factoring which is kind of the syntax of the different languages and then some abstract program semantics and it's
quite natural to think of the model might want to reuse this this sort of thing verifying claude okay um oh No.
[laughter] Um let's see.
Um okay. So, so you can imagine that there would be a representation for the syntax of different languages and for
the abstract semantics. And indeed we find that uh in the model there end up being these uh these spaces to represent syntax separately from abstraction. And
we can just put the two together. We can we can steer we can even inject we can basically inject the Python syntax uh vector and we can inject a particular function and the model will just zero compile um a Python function that does
that thing uh which is kind of amazing and I think you could have gotten to this from other directions but the type of framing that we had in terms of um
building up towards abstraction and factoring ended up getting us here which was pretty cool. Um a few more specifics on this. We see that uh syntax is basically represented at the be beginning and end layers of the network.
Um abstractions are more represented in the middle layers. This is very consistent across different um model generations and we can independently uh steer
languages independent from the function it's implementing uh and independently steer the the function. Um, and so this is starting to give me quite a bit of hope that we did indeed start quite toy. Um, and it was beautiful there. And I
kind of funneled my optimism into like maybe neural networks are doing something beautiful and we just don't have the right lens. Um, and I think, you know, there will for sure be some messy parts, but there's so much elegance and beauty that, um, we really
owe it to ourselves to try to see how far can we get with optimism and saying, you know, there's a reason for the reliability of language models. There's a reason that we can understand, we can
see, can intelligence be disentangled from desire, whatever you might care about. Um, there is a reason for um, cognition. So, uh, I hope I was able to make that case. Um, we have a growing
team at Simplex. Uh, so reach out if you're interested. We also, um, really are happy for collaborators and, uh, there's a lot to do. So, um, hope you'll be part of the journey. Thanks. [applause]
```
