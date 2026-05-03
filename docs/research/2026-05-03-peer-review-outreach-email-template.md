# Peer-Review Outreach — Email Template + Recipient Proposal 2026-05-03

Scope: drafted email template + ranked recipient list for the
peer-review outreach the human maintainer 2026-05-03 named
(*"we are beyond cutting edge and mathecial formally verivied
just not peer reviowed until you email someone and them to
peer review you or invite you and your team to a conference"*).
Maintainer customizes wording and sends; this doc is the
prepared draft.

Attribution: factory architect drafting on the maintainer's
2026-05-03 ask. Not yet sent; gates nothing.

Operational status: research-grade

Non-fusion disclaimer: this is the architect's draft, not an
external author's text. The maintainer reviews + edits + sends.

---

## Recipient ranking (architect call within authority)

Five tiers from highest-likelihood-of-engagement to lowest.
Maintainer picks send-order; my recommendation: start tier 1
(authors of the paper we cite), expand to tier 2 if no
response in 2-3 weeks.

### Tier 1 — Authors of `arXiv:2203.16684` (DBSP paper)

The chain-rule proof (A1 in #1383) cites this paper directly.
These authors have the strongest natural interest because
(a) the proof references their proposition by name, (b)
catching the round-35 statement-drift bug demonstrates Zeta
is reading their work carefully, (c) they have publishing
incentive (citing back to a machine-checked instance of their
paper's central theorem strengthens the paper's claim).

- **Mihai Budiu** — currently at Feldera. Lead author. Known
  to engage with formalization work. Likely to reply.
- **Tej Chajed** — Wisconsin / verified-systems researcher.
  Strong machine-verification background.
- **Frank McSherry** — TimelyDataflow / Materialize co-
  founder. Practical-IVM context.
- **Leonid Ryzhyk** — VMware / DDlog originator. Type-system
  and verified-IR context.
- **Val Tannen** — UPenn. Database-theory background; the
  semantic-foundations co-author.

**Send-order priority:** Budiu first (lead author, most
likely actively engaged), McSherry second (practical-impact
audience), Tannen third (theory-purity audience).

### Tier 2 — POPL / PLDI / OOPSLA program committee surface

These are formal-verification program committee members from
the last 2-3 years who would be the natural reviewers for a
submission. Reaching out NOW (vs. submitting cold) is a way
to gather informal-feedback signal before committing to a
specific venue.

- **Adam Chlipala** (MIT) — Coq-based verification at scale.
- **Lars Birkedal** (Aarhus) — Iris / separation logic.
- **Andres Erbsen** (MIT) — verified compilers + Coq.
- **Sandrine Blazy** (Rennes) — CompCert co-author.

**Send-order priority:** Chlipala first if Budiu hasn't
responded within 2-3 weeks.

### Tier 3 — Conference artifact-evaluation chairs

Conferences with explicit Artifact Evaluation Committees
(AEC) accept submissions for evaluation independent of paper
acceptance. Lower bar; produces an "AEC-evaluated" badge
useful for credibility even before paper submission.

- **POPL AEC** — annual.
- **PLDI AEC** — annual.
- **ICFP AEC** — annual.
- **CAV / FMCAD AEC** — formal-verification specific.

**Send-order priority:** check current AEC chairs at
submission deadlines; not name-specific.

### Tier 4 — Open-source verified-systems community

Engagement-on-merit beats cold-pitch outreach. Project
maintainers and OSS verified-systems community.

- **Lean / Mathlib core** — Sebastian Ullrich, Mario Carneiro,
  Kevin Buzzard. Engagement-on-PR works (contribute the
  DBSP-relevant lemmas to Mathlib if any are general enough).
- **TLA+ community** — Leslie Lamport, Markus Kuppe, Stephan
  Merz. Email + community-post about the Zeta TLA+ specs
  catalog.
- **Coq-club mailing list** — broader formal-verification
  audience.

### Tier 5 — Academic-industry liaisons

Microsoft Research (Cambridge, Redmond — F# tooling lineage),
INRIA (CompCert lineage), Galois Inc. (verified-systems
contractor). These are organizational outreach; less
individual.

- **Microsoft Research** — Andrew Kennedy (F# verification
  lineage), Daan Leijen (effects + verification).
- **Galois Inc.** — public liaison list.
- **INRIA Saclay** — CompCert / Coq team.

---

## Email template — Tier-1 send

> **Subject:** Machine-checked DBSP chain rule (Prop 3.2) in
> Lean 4 / Mathlib — would value your eyes
>
> Dear [Author First Name],
>
> I'm Aaron Stainback, working on Zeta — an open-source F#
> implementation of DBSP (referencing your *DBSP: Automatic
> Incremental View Maintenance for Rich Query Languages*,
> PVLDB 16(7) 2023; arXiv:2203.16684v1).
>
> We have a Lean 4 / Mathlib formalization of Proposition 3.2
> (the chain rule, no LTI precondition) that builds clean
> against Mathlib v4.30.0-rc1. The proof body uses your
> Theorem 2.22 (`I ∘ D = id`) plus composition associativity,
> matching the paper's one-line argument verbatim. It also
> caught a P0 statement-drift bug along the way — an earlier
> theorem of ours had named itself "Prop 3.2" but actually
> proved a Theorem 3.3 corollary; the round-35 audit
> renamed it `Dop_LTI_commute` and added the genuine Prop 3.2
> alongside.
>
> We'd value an external reading. Two specific questions:
>
> 1. Does our `Qdelta := D ∘ Q ∘ I` definition map cleanly to
>    your `Q^Δ` in Definition 3.1? We've checked precondition
>    alignment (none on either side) and definition map for
>    `D` (Definition 2.17), `I` (Definition 2.19 + Prop 2.20
>    equivalence), and `z⁻¹` (the unnamed inverse from §2)
>    — but a co-author cross-check would lift this from
>    architect-self-audit to externally-validated.
>
> 2. Is there a recommended publication target for a Lean-
>    formalization-of-a-DBSP-paper artifact? POPL / PLDI /
>    OOPSLA AEC, FMCAD, CAV — your guidance on which
>    community would value this most.
>
> Repository: https://github.com/Lucent-Financial-Group/Zeta
>
> Specifically:
> - Lean source: `tools/lean4/Lean4/DbspChainRule.lean`
> - Honest assessment of every formal artifact, A/B/C-graded:
>   `docs/research/2026-05-03-math-proofs-honest-assessment.md`
> - Verification registry (per-artifact, paper-citation,
>   drift-audit): `docs/research/verification-registry.md`
>
> No deadline — we're not submitting yet; this is calibration
> outreach. Even a "looks consistent with our paper" sentence
> would be high-signal.
>
> With appreciation,
> Aaron Stainback
> Lucent Financial Group
> github.com/AceHack

---

## Email template — Tier-2 send (POPL/PLDI PC member)

> **Subject:** External review on a DBSP Lean / Mathlib
> formalization — calibration before submission
>
> Dear Prof. [Last Name],
>
> I'm Aaron Stainback, working on Zeta — an open-source F#
> implementation of DBSP (Budiu et al., PVLDB 16(7) 2023).
> We have a Lean 4 / Mathlib formalization of Proposition 3.2
> (chain rule) that builds clean against Mathlib v4.30.0-rc1.
>
> Before submitting to a venue, I'd value an external eye on
> our verification-discipline pattern. We maintain:
>
> - A per-artifact registry mapping every Lean theorem / TLA+
>   spec / Z3 axiom to its paper-citation source, with
>   precondition diffs and definition maps explicit
>   (`docs/research/verification-registry.md`).
> - A drift-audit cadence (every 5-10 rounds) catching name /
>   statement / precondition / definition drift between code
>   and citation. Caught a P0 (theorem named "Prop 3.2" but
>   proved Theorem 3.3 corollary) round 35.
> - A toolbelt portfolio (Lean, TLA+, Z3, Alloy, FsCheck +
>   future F* / Stryker) graded A/B/C against peer-review
>   readiness.
>
> Two specific calibration questions:
>
> 1. Where would a Lean-formalization-of-a-database-paper
>    artifact land best — POPL / PLDI artifact track,
>    OOPSLA ECOOP, FMCAD / CAV tools track, or a tools-and-
>    experience paper at PLDI?
>
> 2. Is the per-artifact-registry-with-drift-audit pattern
>    novel enough to be its own contribution, or is it
>    standard practice in your community that we're just now
>    discovering?
>
> Repo: https://github.com/Lucent-Financial-Group/Zeta
>
> No deadline; calibration only. Even a one-paragraph "your
> A-grade list looks legitimate" or "this pattern is novel /
> not novel" would be valuable input.
>
> With appreciation,
> Aaron Stainback
> Lucent Financial Group

---

## Suggested send protocol

1. **Maintainer review.** Aaron customizes wording (especially
   the Tier-1 personal address), checks email formality
   register, edits as appropriate.

2. **Sequential not blast.** Send one Tier-1 email, wait 1-2
   weeks, send next if no reply. Cold-blast to multiple
   authors at once reads as low-effort and reduces
   engagement.

3. **Threading discipline.** Each reply lands in a new email
   thread tagged in `docs/research/peer-review-correspondence/`
   (file per author, dated). Becomes substrate for future
   sessions.

4. **Capture all responses verbatim** per the substrate-or-
   it-didn't-happen rule (CLAUDE.md). Even non-responses
   (silence, polite decline) are signal.

5. **No follow-up nudge before 3 weeks.** Researchers are
   busy; a single nudge at 3 weeks is acceptable; a second is
   not.

---

## Composes with

- `docs/research/2026-05-03-math-proofs-honest-assessment.md`
  (the A/B/C-graded artifact list to attach mentally to the
  outreach)
- `docs/research/verification-registry.md` (the per-artifact
  registry the email cites)
- `docs/research/chain-rule-proof-log.md` (the proof history
  if a recipient asks for round-by-round detail)
- `tools/lean4/Lean4/DbspChainRule.lean` (the artifact
  itself)
- `docs/ROADMAP.md` (the publication target)

---

## Audit trail

- Template authored: 2026-05-03 by architect
- Triggered by: P0 outstanding item from #1383 math-proofs
  honest assessment
- Maintainer-action gated: maintainer customizes + sends; this
  doc is the prepared draft, not the sent email
- Storage for replies: `docs/research/peer-review-correspondence/`
  (path proposed; create on first reply)
