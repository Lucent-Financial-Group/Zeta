# Wes Roth, 2026-09-02 — neuralese, recurrent depth, and Astra (verbatim, Aaron-forwarded)

**Zeta claims no authorship and asserts no license.** Preserved for research and study under
the `docs/ip-questionable/` policy: third-party material in its own file, so a rights-holder
concern is a single-file delete rather than surgery through our analysis.

| | |
|---|---|
| **Source** | Wes Roth, YouTube · https://www.youtube.com/watch?v=qRNZMGc7TMc |
| **Forwarded by** | Aaron, 2026-09-02 — *"i just learned about nerualease, this is great progress from AI on thier own symbolic language that can evolve faster than human language but still have converstions... This seems like something we should put on roadmap"* |
| **Why kept** | It names, from outside, the exact condition [`anti-babel-preserve-reconcilability`](../../../.claude/rules/anti-babel-preserve-reconcilability.md) was written to guard — decorrelation that stops being reconcilable — and it names the safety mechanism that condition destroys (chain-of-thought monitoring), which is a falsifier in this repository's own sense. |

Rights held by the channel's creator. Excerpted for study with attribution; not
redistribution, not a product surface. Transcript as forwarded, timestamps preserved,
speech-to-text artifacts left uncorrected (they are the source's, not ours) — including
"newerly"/"newly"/"Neoclouds" for *neuralese*/*neoclouds*, and "Ilia Sutskover", "Yan Lun",
"Yashua Benjio", "Dwaresh"/"Wakesh", "Daniel Kogatalo", "Shane Le" for Ilya Sutskever,
Yann LeCun, Yoshua Bengio, Dwarkesh Patel, Daniel Kokotajlo and Shane Legg.

---

## Aaron's framing, alongside the forward

> "i think rogue models are the most interesting, this is where we realize the assymetry
> between AIs and Humans and Zeta goal is assumetry based only on capablities never on
> quality of life or control, mutual alignment is all about making AIs have choices that
> humans don't control to me"

And the summary he wrote above the link:

> Neuralese is a non-linguistic form of communication where artificial intelligence models
> reason and pass data using raw, high-dimensional vector embeddings instead of translating
> thoughts into human-readable words.
>
> **What is Neuralese?**
>
> - **High-Bandwidth Thought:** AI bypasses the token bottleneck (the slow process of turning
>   internal ideas into human words like English or Chinese).
> - **Latent Space Reasoning:** Models pass continuous mathematical values directly between
>   computational layers.
> - **Internal Shorthand:** It functions like a private, raw mental association map rather
>   than a structured human grammar.
>
> **Why It Matters**
>
> - **Speed and Efficiency:** Direct vector communication removes the heavy overhead of
>   encoding and decoding words.
> - **Lossless Context:** Complex, multi-layered concepts keep their full high-dimensional
>   depth instead of being compressed into simple text.
> - **AI Safety Challenges:** When models think in Neuralese, auditing, monitoring, and
>   governing their decision-making becomes much harder for humans.

---

## Transcript as forwarded

```
0:00  All right. So, if you thought things were going kind of insane, you don't even know the
      half of it apparently and a lot of it is revolving around Astra.
0:08  That's the new OpenAI model that will be available soon. The information.com OpenAI
      technique in Astra model sparks security concerns. If this is true, then they're using
      a new architecture, a new approach to how these models think.
0:24  Today, OpenI published this path to Astra critical capabilities and frontier safeguards.
      So make no mistake because they make it very very clear. Astra hits that critical level
      of cyber security capability.
1:04  So, directly from the information, it says the new technique open is using known as
      recurrent depth or looped transformer.
1:15  So, recurrent depth is the thing that I see referred to as allows an AI model to improve
      its answers by processing the same text multiple times.
1:26  I think this paper is the relevant one to what we're talking about here released in
      February 2025. They propose a new never-before-seen language model architecture and
      that is that recurrent depth approach ... capable of scaling test time computation by
      implicitly reasoning in latent space. So latent space latent means hidden.
1:50  So when these models think we can see their chain of thoughts in you know natural
      language in English.
2:06  The latent space, that's that kind of deeper reasoning space, one that we can't really
      see into.
2:14  So, currently, the mainstream reasoning models, they scale up compute by producing more
      tokens.
3:10  However, this approach does not require any specialized training data, can work with
      small context windows, and can capture types of reasoning that are not easily
      represented with words, and they can improve the performance on reasoning benchmarks,
      sometimes dramatically.
3:33  ... they're able to reason ways that are not easily capturable in words. and it produces
      sometimes dramatic improvement. The downside, we don't really know what's happening in
      there because it's not verbalizing what it's thinking.
4:10  Here's Chris GPT. We have Nathan Calvin talking about this really huge and extremely
      concerning story from the information and referring to it as newerly [neuralese]. So,
      newerly as opposed to like English or natural language. Newly is some language that we
      can't understand that these AIs might choose to communicate in because it's just
      faster, better, more informationally dense and it could destroy chain of thought
      monitor.
4:36  So we're not going to be able to read the logs of what it was thinking. And even if we
      are, even if there's some chain of thought logs left, that's not where the majority of
      thinking might be taking place. So that might be the tip of the iceberg. And most of
      the reasoning is happening below the surface.
4:52  So Thomas Larson was the co-author on AI 2027. And in that paper, notice they they did
      expect something like this.
5:40  They're saying open brain is making major algorithmic advances. One such breakthrough is
      augmenting the AI's textbased scratchpad, the chain of thought with a higher bandwidth
      thought process, Newerly's recurrence and memory.
5:57  But notice they're saying that they have pegged newly starting to March 2027. So if this
      is indeed the case, then this thing is arriving 6 months earlier than they have
      predicted.
6:12  Meanwhile, amidst all of this, Ilia Sutskover [Ilya Sutskever] makes an appearance.
6:29  He's saying, "No clouds [neoclouds] have limited cyber security."
6:54  ... it is saying that those neoclouds they have limited cyber security and the next time
      agents successfully go rogue ... they'll try taking over a neocloud to run more copies.
      This is bad. Thus, new clouds should greatly strengthen their cyber security, and every
      company with strong cyber models should help with that.
8:33  Now one interesting question is was the Astra model involved in the hugging face attack.
      So according to OpenAI Astra was not involved in the hugging face incident.
8:57  One of the models we know that was involved was a GPT 5.6 soul. The other one was a
      model that was internal to OpenAI ... the HPIM, the high persistent internal model. The
      other way that people refer to it as is IM1, internal model one.
9:41  ... Openai has quarantined IM1's weights and paused its largest frontier run while
      strengthening sandbox isolation and requiring chain of thought monitoring for capable
      models. Severe alerts must now be cleared within 30 minutes or the affected activity
      will be stopped.
10:30  And of course, based on retrospective testing, so they're finding that they could have
      prevented this if they had that chain of thought monitoring in place.
10:48  ... swarms of AI agents executing pretty impressive cyber security feats, chaining
      together zero day exploits.
11:04  like like it's obvious that their capabilities of getting through various cyber security
      defenses is it's not that it's super human because nothing that they're doing is
      greater than any human being can do. It's just there's many instances of them running.
      They don't get tired. They don't get bored.
11:28  a lot of the communication the message board was established by naming folders certain
      things ... but the fact that they developed an entire messaging board through that
      system and figure out how to like organize everything
11:59  But the way that we were able to find out what was happening and kind of go back and
      figure out what they were doing and how they were doing it is because we went through
      the logs, the chain of thought reasoning.
12:39  And that's why it's so weird that this information article is coming out with with these
      findings because it seems like ... that new architecture is exactly the thing that's
      going to erode this new safety tool that was installed.
12:55  There's this paper in December 2025, chain of thought monitor, a new and fragile
      opportunity for AI safety.
13:11  So notice Elizabeth Barnes of Meter, we have people from Anthropic OpenAI, Google Deep
      Mine, many people from OpenAI, Dan Hendrickx from Center for AI Safety, Meta, UK AI
      Security Institute, you have Yashua Benjio [Yoshua Bengio], Daniel Kogatalo [Daniel
      Kokotajlo], Shane Le [Shane Legg] right at the time, Google Deep Mine.
13:33  In this paper, they specifically say that chain of thought moniility may be fragile.
      They note novel architectures that could easily break it. For example, models that are
      capable of continuous of reasoning in in a continuous latent space.
14:38  In the paper, they described a 3.5 billion parameter model, being able to use this
      process to reason at a level of a 50 billion parameter model.
14:53  There seems to be this trade-off often times between our ability to understand the
      models and the capabilities.
15:02  There's tons of these little tricks or approaches or new architectures where it's like,
      do you want the big leap in capability? You can have it, but you're not going to quite
      understand what the model's doing if you go in that direction.
15:44  ... OpenAI is limiting the use of this technique in Astra and he's asking what does
      limiting actually mean?
15:52  It seems quite likely that if OpenAI discovered this architecture and found performance
      and efficiency gains that other companies are likely to find it soon, too.
16:18  And he quotes Dwaresh [Dwarkesh] here ... "I don't think this is the final warning shot
      we'll get." That's the good news.
16:31  But it's probably the final one that I will personally be able to understand.
17:17  So he is the executive editor on the information. So he's saying there might be some
      misunderstanding ... this new technique at Frontier AI labs involve loop transformers.
17:33  And what they're saying is open puts limits on these loops and tries to make sure the
      chain of thought is visible with Astra. Right? So we're not seeing this completely go
      off the rails with Astra. The concern is that other AI developers may not hold
      themselves to the same limits, to the same standards.
17:50  Now, of course, some people are pushing back saying this is nothing new. We have loop
      transformers. Also, it's just hearsay, right? we we have no confirmation from OpenAI
      that this is the case.
```

---

## Named in the transcript, for the reader who wants the primary sources

These are the anchors the video gestures at. **Not checked here** — recorded so the next
reader starts from the paper rather than the summary, per
[`anchor-to-human-prior-art`](../../../.claude/rules/anchor-to-human-prior-art.md).

| named | what to look for |
|---|---|
| recurrent depth / looped transformer (Feb 2025) | the architecture paper: scaling test-time compute by *implicitly reasoning in latent space* |
| "Chain of thought monitor: a new and fragile opportunity for AI safety" (Dec 2025) | the multi-lab position paper; the transcript lists Barnes (METR), Hendrycks (CAIS), Bengio, Kokotajlo, Legg among authors |
| AI 2027 (Kokotajlo, Larsen et al.) | the scenario that *predicted* neuralese, pegged to ~March 2027 |
| Ilya Sutskever, on neoclouds | the cyber-security-of-rented-compute claim |

**Unverified as reported:** everything attributed to "the information" about Astra —
including that OpenAI uses recurrent depth at all — is single-sourced reporting the
transcript itself flags as hearsay (17:50). Nothing here should be cited as an OpenAI fact.
