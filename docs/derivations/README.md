# `docs/derivations/` — raw reports from N-version clean-room derivations

**What this directory is.** The *prose reports* written by each independent derivation in an
N-version experiment — human-authored analysis, one per derivation, each naming the spec
ambiguities it hit and the choices it made. They are contributor documentation in the ordinary
sense: a reader can grep, diff and cite them from a checkout.

**What it is not.** Not telemetry, not data, and not the derivations' *implementations*. The
three F# implementations from the first experiment stay on their archive tags; the synthesis
that superseded them shipped as `src/Core/MultiSignatureVerification.fs`. Only the reports
land here, because a synthesis replaces the code and never replaces the facts it was made from
(raw vault — `.claude/rules/dv2-data-split-discipline-activated.md`).

**Why here and not only on a tag.** The tags are durable. They are also invisible to `grep`,
`diff`, and anyone reading the tree without already knowing the tag name. Aaron 2026-09-03:
*"I prefer few tags over many, so docs seem okay — but docs are really supposed to be human
and contributor docs, not telemetry or data."* This directory holds to that line: reports only.

| experiment | reports | account of record | archive tags |
|---|---|---|---|
| threshold-signature verification, N=3, 2026-08-27 | `derivation-{a,b,c}-report.md` | `docs/research/2026-08-27-n3-clean-room-threshold-sig-derivations-raw-vault-full-ambiguity-partition-and-branch-shas.md` | `archive/2026-09-03-branch-sweep/derivation-{a,b,c}/threshold-sig-verify` |
