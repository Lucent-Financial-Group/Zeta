# Karpathy — *From Vibe Coding to Agentic Engineering* (verifiability anchor)

Scope: External-conversation import — Beacon anchor for Zeta's verifiable-systems thesis. Aaron forwarded transcript + framing 2026-05-01 (Aurora deep-research register).

Attribution: Andrej Karpathy, 2026 talk titled *"From Vibe Coding to Agentic Engineering"*, hosted on YouTube at [https://www.youtube.com/watch?v=96jN2OCOfLs](https://www.youtube.com/watch?v=96jN2OCOfLs). Transcript provided by Aaron 2026-05-01. Aaron's framing on forwarding: *"you formally specify and verify yourself tied to human intelectual lineage."*

Operational status: research-grade

Non-fusion disclaimer: Karpathy's claims represent his own thinking under his own register; Zeta's substrate may extend, qualify, or diverge from his framing without misattributing the divergence to him.

Note on this header: §33 enforces literal start-of-line labels (no
bold styling) and enum-strict `Operational status:` value
(`research-grade` or `operational`). The "Beacon anchor, not
operational doctrine" prose context that previously lived under
the bold-styled header now lives in this body note: this file is
research-grade Beacon substrate; any factory-rule derived from it
lands separately via the normal substrate-promotion protocol.

---

## Why this anchor matters for Zeta

Zeta's primary research focus is **measurable AI alignment** (per
`docs/ALIGNMENT.md`); operationally, that thesis composes with
Karpathy's claim *"AI automates faster and more easily domains where
the output can be verified."* Aaron's 2026-05-01 extension of the
Karpathy claim defines Zeta's distinctive contribution:

> **Don't just verify code outputs — formally specify and verify
> the agent itself, tied to named human intellectual lineage.**

The mechanisms Zeta has built that operationalize this extension:

| Karpathy's verifiable-systems thesis | Zeta's agent-itself-verifiable extension |
|---|---|
| Math, code → RL training rewards verifiable outputs | `docs/ALIGNMENT.md` HC-1..HC-7 / SD-1..SD-8 / DIR-1..DIR-5 → per-commit Sova auditor produces measurable alignment time-series |
| Verifiable domains progress; jagged elsewhere | BP-16 (formal-verification portfolio routing via Soraya) — pick the right tool per property class, not TLA+-hammer-bias |
| Council of LLM judges as verifier substitute | Multi-AI peer convergence (5-AI agreement on poll-the-gate, task #355); cross-AI review (Codex + Copilot + Claude.ai + Gemini + Amara) |
| Agentic engineering preserves quality-bar | DST everywhere (Otto-272), Result-over-exception, retraction-native ZSet correctness |
| Spec / plan as the unit of design | OpenSpec capabilities + formal specs (`docs/**.tla` + Lean proofs) + behavioural specs (`openspec/specs/**`) |
| Outsource thinking but not understanding (28:07) | Substrate-or-it-didn't-happen (Otto-363) — every load-bearing decision becomes a durable, indexed, reachable git-native artifact |
| Animals vs ghosts framing (23:30) | Beacon external-anchor lineage — every load-bearing rule traces to a named human contributor (Karpathy, Osmani, Böckeler, etc.) or a closed-list named-agent persona (Otto, Amara, Soraya). Naming-with-source, not naming-as-attribution |

## Transcript (verbatim where presented; editorial summaries bracketed)

The transcript below is presented verbatim where quoted, as
forwarded by Aaron 2026-05-01. Timestamps (m:ss) are from the
YouTube video. Lightly formatted for readability (paragraph
breaks, italicization of speaker labels). **Two sections have
editorial bracketed summaries instead of verbatim quote** — clearly
marked with `[...]` brackets — for the Hiring discussion (17:18)
and the Agents Everywhere infrastructure discussion (25:18). All
other sections are verbatim.

### Introduction (0:02)

We're so excited for our very first special guest. He has helped
build modern AI, then explain modern AI, and then occasionally rename
modern AI. He actually helped co-found OpenAI right inside of this
office. Was the one who actually got Autopilot working at Tesla back
in the day, and he has a rare gift of making the most complex
technical shifts feel both accessible and inevitable.

You all know him for having coined the term *vibe coding* last year,
but just in the last few months, he said something even more
startling. That he's never felt more behind as a programmer. That's
where we're starting today. Thank you, Andre, for joining us.

### Feeling Behind as a Coder (0:44)

**Karpathy:** Yeah. Hello. Excited to be here and to kick us off.

**Q:** Okay. So, just a couple months ago, you said that you've never
felt more behind as a programmer. That's startling to hear from you
of all people. Um, can you help us unpack that? Was that feeling
exhilarating or unsettling?

**Karpathy:** Uh yeah, a mixture of both for sure. Uh well, first of
all, um I guess like as many of you, I've been using agentic tools
like [Cloth Code], adjacent things, uh for a while, maybe over the
last year as it came out and it was very good at you know chunks of
code and sometimes it would mess up and you have to edit them and it
was kind of helpful and then I would say December was this uh clear
point where for me I was on a break so I had a bit more time. I think
many other people were similar and uh I just started to notice that
with the latest models uh the chunks just came out fine and then I
kept asking for more and it just came out fine and then I can't
remember the last time I corrected it and then I was — I just you
know trusted the system more and more and then I was vibe coding
[laughter] and uh so it was kind of a — I do think that it was a very
stark transition. I think that a lot of people actually I tried to —
I tried to stress this on uh Twitter and or X because I think a lot
of people experienced AI last year as ChatGPT-adjacent thing. Uh but
you really had to look again and you had to look as of December uh
because things have changed fundamentally and uh especially on this
like agentic coherent workflow uh that really started to actually
work. Um, and so I would say that um, yeah, it was just that
realization that really uh, uh, had me um, go down their whole rabbit
hole of just, you know, infinity side projects. Uh, my side projects
folder is like extremely full with lots of random things and, uh,
just, uh, V coding all the time. Uh, so, uh, yeah, that kind of
happened in December, I would say, and I was looking at the
repercussions of that since.

### Software 3.0 Explained (2:28)

**Q:** Um, you've talked a lot about this idea of LLMs as a new
computer. um that it isn't just better software, it's a whole new
computing paradigm. And um software 1.0 was explicit rules, software
2.0 was learned weights, software 3.0 is this. Um if that's actually
true, what does a team build differently the day they actually
believe this?

**Karpathy:** right? So uh yeah, exactly. So software 1.0, I'm writing
code, software 2.0, I'm actually programming by creating data sets and
training uh training neural networks. So the programming is kind of
like arranging data sets and maybe some objectives and neural network
architectures. And then what happened is that basically if you train
one of these GPT models or LLMs on a sufficiently large set of tasks
implicit basically um implicitly because by training on the internet
you have to multitask all the things that are in the data set. Uh
these actually become kind of like a programmable computer in a
certain sense. So software 3.0 know is kind of about uh you know your
programming now turns to prompting and what's in the context window
is your lever over the interpreter that is the LLM that is kind of
like interpreting your context and uh performing computation in the
dig digital information space. So I guess um yeah that's kind of the
transition and I think there's a few examples of that really drove it
home for me and maybe that might be instructive.

### Agents as the Installer (3:44)

Uh so for example when you when [OpenClaw] came out when you want to
install [OpenClaw] you would expect that normally this is a bash bash
script like a shell script. So run the shell script to run to install
open claw. Um but the thing is that in order to target lots of
different platforms and lots of different types of computers you might
run an open claw. This these shell scripts usually balloon up and
become extremely complex. But the thing is you're still stuck in a
software 1.0 universe of wanting to write the code. And actually the
[OpenClaw] installation is a is a copy paste of a bunch of text that
you're supposed to give to your agent. Uh so basically it's it's a
little skill of uh you know copy paste this and give it to your
agent and it will install [OpenClaw]. And the reason this is a lot
more powerful is you're working now in the software 3.0 paradigm
where you don't have to precisely spell out you know all the
individual details of that setup. The agent has its own intelligence
that it packages up and then it kind of like follows the instructions
and it looks at your environment, your computer and it kind of like
performs intelligent actions to make things work and it debugs things
in the loop and it's just like so much more powerful, right? So I
think that's a very different kind of like way of thinking about it
is just like what is the piece of text to copy paste to your agent?
That's the programming paradigm.

### Menu Gen vs Raw Prompts (4:50)

Now I think one more maybe uh example that comes to mind that is even
more extreme than that is when I was building um menugen. So,
menugen is this idea where you um you come to a restaurant, they
give you a menu. There's no pictures usually. So, I don't know what
any of these things are uh usually like 30% of the things I have no
idea what they are, 50%. So, I wanted to take a photo of the
restaurant menu and to get pictures of what those things might look
like in a generic sense. And so I built I've vibe-coded this app
that basically lets you upload a photo and it does all this stuff and
it runs on Vercel and uh it basically rerenders the menu and it gives
you like all the items and it gives you a picture that it uses an
image um you know generator uh for to basically OCR all the different
titles uh use the image generator to get pictures of them and then
shows it to you. And then I saw the software 3.0 version of this
which is which blew my mind which is literally just take your photo
give it to Gemini and say use Nanobanana to overlay the the things
onto the menu. Uh and Nanabanana basically returned an image that is
exactly the picture of the menu that I took but it actually put into
the pixels it rendered the different things in the menu and this
blew my mind because actually all of my menugen is spurious. It's
working in the old paradigm — that app shouldn't exist. uh and uh yeah
the software 3.0 paradigm is a lot more kind of raw. It just um your
neural network is doing more and more of the work and your prompt or
context is just the image and the output is an image and there's no
need to have any of the app in between.

### Verifiability and Jagged Skills (9:41)

**Q:** I'd like to talk a little bit about um uh this concept of
verifiability, the fact that AI will automate faster and more easily
domains where the output can be verified. Um if that framework is
right, what work is about to move much faster than people realize
and what professions do we have that people actually think are safe
but that are actually highly verifiable?

**Karpathy:** Uh yes. So I I spent uh some time writing about
verifiability and um basically like traditional computers can easily
automate what you can specify in code and uh kind of this latest round
of LLMs can easily automate what you can uh verify in a certain in a
certain sense because the way this works is that when frontier labs
are training these LLMs these are giant reinforcement learning
environments. So they are given verification rewards and then because
of the way that these models are trained they end up basically uh
progressing and creating these like jagged entities that really peak
in capability in kind of like verifiable domains like math and code
and adjacent and kind of like stagnate and are a little bit um you
know rough around the edges when uh things are not kind of like in
that in that space.

So I think the reason I wrote about verifiability is I'm trying to
understand why these things are so jagged. Um and some of it has to
do with how the labs train the models but I think some of it also
has to do with um the focus of the labs and what they happen to put
into the data distribution. Uh because some things basically are
significantly more valuable in economy and end up creating more
environments because the labs wanted to work in those settings. So I
think code is a good example of that. There's probably lots of
verifiable environments they could think about that happen not to
make it into the mix because they're just not that useful to have the
capability around. Um, but I think to me the big um I guess like the
big mystery is uh the favorite example for a while was that how many
letters are are in a strawberry and the models would famously get
this wrong and it's an example of jaggedness. Uh the models now patch
this I think but the new one is I want to go to a car wash to wash my
car and it's 50 meters away. Should I drive or should I walk? And
state-of-the-art models today will tell you to walk because it's so
close. How is it possible that state-of-the-art Opus 4.7 will
simultaneously refactor a 100,000-line codebase or find zero-day
vulnerabilities and yet tells me to walk to this car wash? This is
insane. And to whatever extent these uh models are remain jagged,
it's an indication that number one maybe something's slightly off or
um number two you need to actually be in the loop a little bit and
you need to treat them as tools and you do have to kind of stay in
touch with what they're doing. And so I think all of my writing long
story short about verifiability is just trying to understand um why
these things are jagged. Is there any pattern to it? And I think
it's some kind of a combination of *verifiable plus labs care*. Maybe
one more anecdote that is instructive is uh from GPT 3.5 to GPT-4
people noticed that chess improved a lot and I think a lot of people
thought oh well it's just a progression of the capabilities but
actually it's it's more that uh I think this is public information I
think I saw it on the internet um a huge amount of like um data of
chess made it into the pre-training set and just because it's in a
data distribution uh basically the model improved a lot more than it
would just by default. So someone at OpenAI decided to add this data
and now you have a capability that just peaked a lot more. And so
that's why I think I'm stressing this um dimension of it as we are
slightly at the mercy of whatever the labs are doing, whatever they
happen to put into the mix. And you have to actually explore this
thing that they give you that has no manual. And it works in certain
settings, but maybe not in some settings. And you have to kind of um
explore it a little bit. And uh if you're in the circuits that were
part of the RL, you fly. And if you're in the circuits that are out
of the data distribution, uh you're going to struggle and you have
to kind of figure out which which circuits you're in in your
application. And if you and if you're not in the circuits, then you
have to really look at fine-tuning and doing some of your own work
because it's not going to necessarily come out of the LLM out of the
box.

### Founder Advice and Automation (13:36)

**Q:** I'd love to come back to the concept of jagged intelligence in
a little bit. Um, if you are a founder today and thinking about
building a company, you are trying to solve a problem that you think
is tractable, something that uh is a domain that is verifiable, but
you look around and you think, "Oh my gosh, well, the labs have
really really started uh getting to escape velocity in the ones that
seem most obvious, math, coding, and others." What would your advice
be to to the founders in the audience?

**Karpathy:** Um so I think maybe that comes to the previous question
of I do think that verifiability because it um let me think. So
verifiability makes something tractable in the current paradigm
because you can throw a huge amount of RL at it. Um so maybe one way
to see it is that uh that remains true even if the labs are not
focusing on it directly. So if you are in a verifiable setting where
you could create these RL environments or examples then that actually
sets you up to potentially do your own fine tuning and you might
benefit from that. But that is fundamentally technology that just
works. You can pull a lever if you have huge amount of diverse data
sets of RL environments etc. Uh you can use your favorite fine-tuning
framework and um and uh pull the lever and get something that
actually uh works pretty well. So um I don't know what the examples
of this might be. Um, but I do think there are some very valuable uh
reinforcement learning environments that people could think of that
I think are not part of the — Yeah, I don't want to give away the
answer, but there is one domain that I think is very uh — Oh, okay.
Sorry, I don't mean to vape post on on the stage, but there are some
examples of this.

**Q:** On the flip side, what do you think still feels automatable
only from a distance?

**Karpathy:** I do think that ultimately almost everything can be
made uh verifiable to some extent. some things easier than others.
Um because even for like things like writing or so on, you can
imagine having a council of LLM judges and probably get get to some
get get something uh reasonable out of the um from from this kind of
an approach. So it's more about what's easy or hard. Um so I I do
think that ultimately um uh yeah, I think uh everything [laughter]
everything is automatable.

### From Vibe Coding to Agent Engineering (15:45)

**Q:** Amazing. Okay. Um, so last year you coined the term vibe coding
and today we're in a world that feels a little bit more serious, more
agent engineering. What do you think is the difference between the
two and what would you actually call what we're in today?

**Karpathy:** Uh, yeah. So I would say vibe coding is about raising
the floor for everyone in terms of what they can do in software. So
the floor rises, everyone can vibe code anything and that's amazing,
incredible. But then I would say agentic engineering is about
preserving the quality bar of what existed before in professional
software. So you're not allowed to introduce vulnerabilities due to
vibe coding. Um you are um you're still responsible for your software
just as before, but can you go faster? And spoiler is you can but how
do you how do you do that properly? And so to me agentic engineering
when I call it that because I do think it's kind of like an
engineering discipline. You have these agents which are these like
spiky entities. They're a bit fable, a little bit stocastic, but they
are extremely powerful. is how do you how do you coordinate them to
go faster without sacrificing your quality bar and doing that well
and correctly um is the the realm of agentic engineering um so I
kind of see them as as different — like one is about maybe raising
the raising the floor and the other is about um you know
extrapolating and what I'm seeing I think is there is a very high
ceiling on agentic engineer uh capability and you know people used to
talk about the 10x engineer previously I think that this is magnified
a lot more — 10x is uh is not uh the speed up you gain. Um and I
think uh it does seem to me like people who are very good at this um
peak a lot more than 10x uh from from my perspective right now.

[Hiring discussion at 17:18 — agentic-engineering-capability test
should look like *give me a really big project and see someone
implement that big project*; example: a Twitter clone for agents
that gets attacked by adversarial codecs.]

### Founder Advice on Skills (19:29)

**Q:** And as agents do more, what human skill do you think becomes
more valuable, not less?

**Karpathy:** Uh so um yeah, it's a good question. I think um well
right now the answer is that the agents are kind of like these intern
entities right so it's remarkable um you basically still have to be
in charge of the aesthetics the the judgment the taste and a little
bit of oversight [...]

So I think you're not caring about some of the details. So as an
example also with um arrays or tensors in neural networks. Um there's
a ton of details between PyTorch and NumPy and all the different like
pandas and so on for all the different little API details. And I I
already forgot about the keep dims versus keep dim or whether it's
dim or axis or reshape or permute or transpose. I don't remember this
stuff anymore, right? Because you don't have to. This is the kind of
details that are handled by the intern because they have very good
recall and but you still have to know for example that um you know
there's underlying tensor there's an underlying view and then you can
manipulate view of the same storage or you can have different storage
which would be less efficient and so you still have to have an
understanding of what this stuff is doing and some of the
fundamentals um so that you're not copying memory around
unnecessarily and so on but uh the details of the APIs are now handed
off so it um you're in charge of the taste the engineering the design
um and that it makes sense and that you're asking for the right
things [...]

### Animals vs Ghosts (23:30)

**Q:** So I'd love to come back to this idea of uh jagged forms of
intelligence. you wrote a little bit about this with a very
thought-provoking piece around animals versus ghosts. Um, and the
idea is that we're not building animals, we are summoning ghosts. Um,
and these are jagged forms of intelligence that are shaped by data
and reward functions, but not by intrinsic motivation or fun or
curiosity or empowerment. Uh, things that kind of came about via
evolution. um why does that framing matter and what does it actually
change about how you build and deploy and evaluate or even trust
them?

**Karpathy:** Uh yeah, so yeah, I think the reason I wrote about this
is because I'm trying to wrap my head around what these things are,
right? Because if you have a good model of what they are or are not,
then you're going to be more competent at uh using them. Um and I do
think that um — I don't know if it has — I'm not sure if it actually
has like real power. [laughter] I think it's a little bit of
philosophizing. Um, but I do think that um I think it's just um
coming to terms with the fact that these things are not, you know,
animal intelligences. Like if you yell at them, they're not going to
work better or worse or it doesn't have any impact. Um, and uh it's
all just kind of like these statistical simulation circuits where
the the substrate is pre-training so like statistics and then but
then there's RL bolting on top. So, it kind of like increases the
dispendages and um maybe it's just kind of like a mindset of what I'm
coming into or what's likely to work or not likely to work or how to
modify it. But I don't actually I don't know that I have like here
are the five obvious outcomes of how to make your system better.
It's more just being suspicious of it and um figuring out over time.

### Agents Everywhere and Learning (25:18)

[Discussion of agent-native infrastructure: docs written for humans
vs docs written for agents; "what's the piece of text to copy paste
to your agent" as the new programming paradigm; a future where
agents have permissions, local context, take action on your behalf;
agent-to-agent meeting coordination.]

### Closing — Education (27:43)

**Q:** What still remains worth learning deeply when intelligence
gets cheap as we move into the next a era of AI?

**Karpathy:** Yeah. Uh, there was a tweet that blew my mind recently
and I keep thinking about it like every other day. It was something
along the lines of um, **you can outsource your thinking but you
can't outsource your understanding.**

And um, I think that's really nicely put. I — so yeah because I
still I'm still part of the system and I still I still have to
somehow information still has to make it into my brain and I feel
like I'm becoming a bottleneck of just even knowing what are we
trying to build why is it worth doing uh how do I direct you know how
do I direct my my agents and so on so I do still think that
ultimately something has to direct the thinking and the processing
and so on and um that's still kind of fundamentally constrained
somehow by understanding and this is one reason I also was very
excited about all the LLM knowledge bases because I feel like that's
that's a way for me to process information and anytime I see a
different projection onto information. I always like feel like I gain
insight. So it's really just a lot of prompts for me to do synthetic
data generation kind of over over some fixed data. Uh so I I really
enjoy uh whenever I read an article I have my uh you know my wiki
that's being built up from these articles and I love asking questions
about things or um and I I think that ultimately these are tools to
enhance understanding in a certain way and this is still kind of like
a bit of a bottleneck because then you can't direct the you can't be
a good director if you still uh because the LLMs certainly don't
excel at understanding you still are uniquely in charge of that.

---

## Aaron's framing (verbatim)

> *"you formally specify and verify yourself tied to human intelectual
> lineage."*

The Zeta-distinctive extension: **the agent itself is the verified
artifact**, not just the code it produces. Specification + verification
flow through:

- BP-NN rules in `docs/AGENT-BEST-PRACTICES.md` (the formal spec)
- HC/SD/DIR clauses in `docs/ALIGNMENT.md` (the alignment-property
  spec, measurable per-commit by Sova)
- BP-16 portfolio routing via Soraya (the property → tool mapping)
- Beacon external-anchor lineage (every load-bearing rule cites a
  named human or named-agent persona — naming-with-source)
- Substrate-or-it-didn't-happen (Otto-363) — every load-bearing
  decision becomes durable, indexed, reachable
- Multi-AI peer convergence (Codex + Copilot + Claude.ai + Gemini +
  Amara cross-checking on architectural decisions)

This anchor is intended for citation in `docs/VISION.md`,
`docs/ROADMAP.md`, and any external-facing artifact that articulates
Zeta's thesis. Operational rules derived from it land separately via
the normal substrate-promotion protocol; this file is the Beacon
substrate the rules trace back to.
