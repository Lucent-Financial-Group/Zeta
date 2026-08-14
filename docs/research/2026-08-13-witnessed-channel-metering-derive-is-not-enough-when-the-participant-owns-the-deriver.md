# Witnessed channel metering — "derive, don't declare" is not enough when the participant owns the deriver

**Ferried** 2026-08-13 from Aaron, sharpening the Arena capability-label design in
`2026-08-13-tit-for-lesser-tat-teach-play-and-the-arena-noise-is-not-defection.md`:

> yes in tournments the meter of observed channels shuld be cryptograpcally observed by witness or quorm
> via like riticulum or some transport layer even if it's in memory, it should not be self attested
> except for when doing local non tournment experiment and those wont be able to be signed by third
> party whitness sign off like the torunments

## The name for it: **ranked vs unranked** (Aaron, 2026-08-13)

> this is like ranked vs non ranked matches

That is the right name and it should be the one used, because it is already understood by everyone and
it carries the properties correctly without further explanation:

- **Ranked affects standing; unranked does not.** An unranked result cannot be submitted to the ladder —
  not because it is disbelieved, but because it is not that kind of result.
- **Nobody reads unranked as lesser play.** It is where you experiment, try a build, warm up. That is
  exactly the register wanted for local runs: completely free, not second-class.
- **Ranked costs more infrastructure** — matchmaking, server authority, anti-cheat. Which is precisely
  the witness/quorum requirement, and it explains *why* the extra machinery exists without anyone having
  to be told.

And the technical anchor is unusually good, because the games industry already learned this exact lesson
the hard way: **competitive play is server-authoritative because client-attested state is forgeable.**
Client-side anti-cheat is self-attestation, and it lost. Our conclusion — that a meter inside the
participant's trust boundary cannot certify a capability class — is the same conclusion arrived at
independently, which is some evidence it is right.

Adopt the vocabulary directly: **ranked** = witnessed, signed, ladder-eligible; **unranked** = local,
self-attested, freely experimental. It compresses the whole partition into two words that need no
glossary, which is the Mirror→Beacon test passing.

---

## What this fixes in the prior design

That doc argued the Arena should **derive** a participant's capability class (pixels-only / pixels+RAM /
save-state search / input-solving) from observed channel access rather than accept a self-declaration,
on the grounds that *"the emulator knows what was read."*

**That was necessary and not sufficient, and the gap is worth naming precisely: if the participant runs
the emulator, deriving the label is self-attestation with extra steps.** The derivation is only as
trustworthy as the deriver, and the deriver was inside the participant's trust boundary the whole time.
So the prior doc replaced a lie about *what I did* with a lie about *what my instrument saw* — a
strictly smaller attack surface, but the same class.

Aaron's correction moves the observation outside that boundary: **the meter is witnessed, not merely
derived.**

## The design constraint this creates — the meter is a producer on a transport, not a logger

*"via like riticulum or some transport layer even if it's in memory"* is the operative clause and it is
a real architectural requirement, not a deployment note.

If the meter writes to a local log that is signed and published afterwards, everything between the
access and the signature is inside the participant's control — the log can be edited before it is
sealed. **Emitting over a transport at the moment of observation is what moves the record across the
trust boundary while the run is still happening.** "Even if it's in memory" means the transport is the
witnessing channel *even for a local in-process run*: same code path, same discipline, the DoP=1 case of
[`async-all-the-way-truthful-signatures.md`](../../.claude/rules/async-all-the-way-truthful-signatures.md)
— beautiful on one, scales to N, no special case for the local run.

That is also §13 noninterference applied to the Arena: every channel crossing is metered **at the
membrane** and posted, rather than accumulated privately and reported.

## Two result classes, and they do not rank against each other

> *"it should not be self attested except for when doing local non tournment experiment and those wont
> be able to be signed by third party whitness sign off like the torunments"*

This creates a second partition of the result space, orthogonal to the capability classes:

| | attestation | comparable to |
|---|---|---|
| **tournament result** | third-party witness/quorum signatures over the channel record | other tournament results |
| **local experiment** | self-attested; no third-party signature is even *possible* | other local results |

The honest framing is the same as for capability classes: **a local result is not a weaker tournament
result, it is a different kind of result.** Ranking across the partition would be the same category
error as ranking a pixels-only score against an input-solved one. And the mechanism is pleasingly
self-enforcing — a local run *cannot* produce the signatures, so the distinction is not a policy anyone
has to remember; it is a property of what exists.

Worth stating plainly what this means and does not mean: local experimentation stays completely free and
unencumbered. Nothing about this gates research. It only means a local number cannot be *presented* as a
tournament number, which is exactly the honest-labelling commitment applied one level up.

## Witness vs quorum — the same question, for the fifth time today

Aaron says *"witness or quorm"*, and the distinction is the one already carved this session: **a witness
is one external observer tolerating zero faults; a quorum is a witness set sized for a fault model.**
Every "get an outside opinion" is a witness claim until it names `f`.

So the Arena must state, per tournament, how many independent witnesses sign a channel record and what
fault model that size assumes — using `quorumSize(faultModel)` from the build-graph quorum work
(#10395), which deliberately has no bare size field precisely so the number cannot be picked without
naming the model.

And note where this argument has now arrived from, five separate directions in one day:
`FigureEightEnsemble`'s homoclinic tangle (*"the demon cannot resist the tangle from inside the loop —
it needs an external observer"*), the orbital independent check, the empowerment/decorrelation coupling,
the adversarial-teaching regime, and now the Arena meter. **The same structural answer keeps falling
out: a loop cannot certify itself.** That recurrence is itself evidence the principle is load-bearing
rather than a preference.

## Engineering questions this raises, none of them blocking

- **What exactly is signed?** Signing every RAM read at frame rate is not viable. The standard shape is
  a **hash chain / Merkle root over the access log**, signed periodically, with the full log retained
  and challengeable — the transparency-log construction (Certificate Transparency, Laurie et al., RFC
  6962 is the canonical reference for the pattern). The witness signs commitments; the log is produced
  on challenge.
- **The witness must not be forgeable in either direction.** A witness that can *fabricate* an access is
  as damaging as a participant that can hide one — it can disqualify an honest competitor. The record
  should therefore be **mutually signed**: participant commits, witness counter-signs, and neither side
  alone produces a valid record. Otherwise the witness has unilateral power, which is a new
  weight/capture surface (§3).
- **Latency.** A witness observing over a transport adds latency to the loop. For TAS-class runs
  (not real-time by construction) this is free. For real-time classes it may not be, and the honest
  outcome could be that some capability classes are *only* offerable in a non-real-time form — which is
  a finding, not a failure.
- **Replay.** Because the transport record is signed and ordered, a witnessed run is replayable by a
  third party (§7 DST). That is a significant bonus: the same mechanism that proves the capability class
  also makes the run auditable — build = verify, the generator-as-ECC pattern again.

## Open

1. Name `f` per tournament class; use `quorumSize(faultModel)`, never a bare count.
2. Decide the commitment scheme (hash chain vs Merkle root) and the signing cadence, against a measured
   frame-rate access volume rather than a guess.
3. Mutual signature — confirm neither participant nor witness can unilaterally produce a valid record.
4. Measure witness latency per capability class; accept that some classes may be non-real-time only.
5. Confirm the transport story concretely: Reticulum is named, but the in-memory case has to be the
   *same* code path, or the local-run discipline decays into a special case.

## Pointers

- `docs/research/2026-08-13-tit-for-lesser-tat-teach-play-and-the-arena-noise-is-not-defection.md` — the Arena, capability classes, derive-don't-declare (this doc supersedes its attestation half)
- `src/Core.TypeScript/ace/build-graph.ts` — `quorumSize(faultModel)`, fault model not count (#10395)
- `src/Bayesian/FigureEightEnsemble.fs` — the external-observer conclusion, stated for belief convergence
- [`dv2-data-split-discipline-activated.md`](../../.claude/rules/dv2-data-split-discipline-activated.md) §13 noninterference, §7 DST
- [`manifesto-13-specifications.md`](../../.claude/rules/manifesto-13-specifications.md) §3 weight-free — why the witness must not hold unilateral power

**Anchors cited from standing knowledge, not page-checked**: Laurie et al. Certificate Transparency
(RFC 6962) for the log-commitment shape; Pease/Shostak/Lamport 1980 and Castro & Liskov 1999 for the
quorum sizing already anchored in #10395.
