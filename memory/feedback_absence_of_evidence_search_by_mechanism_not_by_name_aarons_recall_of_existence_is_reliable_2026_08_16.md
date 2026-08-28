---
name: absence-of-evidence-search-by-mechanism-not-by-name
description: "My recurring failure mode: verify a narrow fact, then write a sentence wider than the check covered — especially 'X does not exist' from a grep that used my vocabulary. Aaron's recall of EXISTENCE has been right every time; search by mechanism/behaviour, and use his words as the key."
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 62075410-5e2b-4487-b31b-d0b79be73d0f
  modified: 2026-08-16T15:50:47.032Z
---

**The failure mode, named because it recurred three times in one day (2026-08-16).** I verify one
narrow thing, then write a sentence with **wider scope than the check supported**. A dispatched agent
diagnosed the same thing in itself the same day, and said it best: *"I verified a narrow fact and
then wrote a wider sentence than the fact supported. The check was sound; the prose outran it."*

The instances, all on 2026-08-16:
1. Verified `genomeToAdinkraByte` had no consumer → wrote as if **adinkra ECC** were unused. It is
   live: `udp-lossy-transport.ts` uses `[8,4,4]` as a wire erasure code, and `AdinkraCode.fs` has
   many consumers. Aaron corrected it.
2. Measured that `git log --format='%(trailers)'` cannot see a blank-line-separated AgencySignature
   block → implied the **main-tip auditor** therefore fails. It does not; it uses its own parser and
   reports `[CORRECT]`. The measurement was right, the inference was not.
3. Searched for the KS-entropy/Lyapunov rung (genuinely undischarged) → reported that the
   **individual-vs-society theorem does not exist**. It exists, is PROVEN, and sits in §A: frozen-core
   **row 15, Generalized Condorcet / ΔU-aggregation theorem — "society > best individual"**, FsCheck +
   analytic, 2026-07-03, proof in `src/Core/SocietyUsefulWork.fs`, 11 properties in
   `CondorcetBoundary.Tests.fs`. I had also read `correlatedSocietyBeatsBest` (a predicate that CAN be
   false) as a *counter-example* when it is the encoding of the theorem's own precondition `ρ < ρ*`.

**A distinct sub-mode — DROPPING THE QUALIFIER WHEN RELAYING.** Instance 4, same day. An agent wrote,
correctly, that `udp-lossy-transport.ts` is *"protocol algebra **that a real socket carries**."* I
relayed it as "protocol algebra, not a wire" — dropping the clause that made it true — and then
**routed a rename on my own compression**. The file is correctly named: `LossyUdpChannel` takes an
injected `{broadcast, onMessage}` and `gossip-mesh-transport.ts:330` supplies the real socket. That is
ports-and-adapters, which §13 and DST *require*; a transport owning its socket would be the defect. A
later agent caught it: **"the flattening happened in the relay, not in their analysis."**

This is not over-generalising my own check — it is compressing *someone else's* careful sentence past
its load-bearing qualifier. **Relaying is where hedges die**: a qualifier reads as verbosity right up
until it is the entire claim. **How to apply:** when relaying another agent's finding, carry its
qualifiers verbatim or quote the sentence. If a summary must be shorter, drop the *example*, never the
*condition*. Same discipline already required for Aaron's own hedges ("kind of", "i think", "probably")
when ferrying — it applies to agents' hedges too.

**Why it keeps happening.** A grep that finds nothing is evidence about *my search terms*, not about
the repo. The gap between "I did not find X" and "X does not exist" is exactly the scope jump above,
and it feels like a finding rather than a guess.

**Aaron's recall of EXISTENCE is reliable — treat it as a strong prior, not a hypothesis to test.**
Six-for-six across this session. Each time my grep missed because I guessed vocabulary:
`reify`'s inverse is `apply`; pruning is `defer`/`board` in `Vision.boatGrowth`; time dilation is
`runToHorizon`; the society proof is indexed under **Condorcet**, not under "individual/society/world."
His own framing (`always assume it's ours`; *"if you don't have the memories yourself it's hypothesis
until proven otherwise"*) points the same way: absence in my context is not absence in the repo.

**How to apply.**
- **Search by mechanism/behaviour, never by the name I expect.** Ask "what would this DO?" and grep the
  operation, the type shape, the anchor author — not the label I would have chosen.
- **Use Aaron's words as the search key.** "Mutual empowerment" found in one grep what my ordering
  vocabulary missed entirely.
- **Check the register before claiming a formal result is absent** — `docs/FROZEN-CORE-AND-CONJECTURE-REGISTER.md`
  §A is the index of proven claims. An undischarged *foundation* does not make the *result* open; §A
  means nothing there rests on anything open.
- **Say "I did not find it" and name where I looked.** Never "it does not exist." The negative claim
  needs the same evidence bar as the positive one — which is this repo's own standing rule about
  checks that cannot fail, turned on my own prose.

Related: [[feedback_aaron_distrust_interpretation_keep_fact_and_ai_as_sole_minus_one_risk_2026_07_11]] ·
[[feedback_always_assume_its_ours_only_us_no_phantom_owner_routing_aaron_2026_06_10]] ·
[[user_aaron_externalizes_knowledge_to_lectures_relearns_fast_2026_08_06]] (his depth is loaded, not
resident — a not-off-the-top moment is not a gap, and neither is my failed grep).
