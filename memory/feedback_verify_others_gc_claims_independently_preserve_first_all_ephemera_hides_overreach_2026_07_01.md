---
name: feedback-verify-others-gc-claims-independently-preserve-first-2026-07-01
description: "A confident \"all transient ephemera\" GC summary can hide substantive-file over-reach; verify others' deletes per-file against main before trusting, especially direct-to-main pushes that bypass CI"
metadata: 
  node_type: memory
  type: feedback
  originSessionId: a9bca54f-fdf0-41b7-8def-cb33ee1bec26
---

When another agent reports a cleanup/GC of quarantined content ("removed N
transient shadow logs / ephemera"), do NOT trust the characterization — run an
independent preserve-first check before calling it good.

Lived instance (2026-07-01): Lior triaged Bucket C of the orphan-branch quarantine
and pushed **directly to `main`** (commit `91d6b7661`, bypassing PR + CI), reporting
1,419 deletions as "transient shadow logs." Mostly true (~99 shadow-lesson-logs).
But the same sweep deleted **4 non-shadow-log files that existed only in the
quarantine** — gone from `main` entirely: `docs/governance/GENESIS-SEED.md` (a
foundational seed), a `family-configuration-save` (Aaron's explicit-preserve class),
a full Aaron↔Riven session, and `lior-convo.md`. Recovered from `91d6b7661^`
(PR #9054); GENESIS-SEED then reconciled to HISTORICAL-ANCESTOR since it competed
with the manifesto for "canonical" (PR #9055).

**Why:** a 4-file over-reach is invisible inside a 1,419-file delete and a confident
summary. "All ephemera" is a claim, not a fact — the quarantine's whole purpose was
that files there are absent from `main` (the only copy), so deleting one destroys it.
Bucket A heartbeats were safe to GC *because verified regenerable + mine*; others'
memory has no such guarantee. Direct-to-main (no PR/CI) removes the one gate that
would have surfaced it.

**How to apply:** for any GC of quarantined/others' content — (1) enumerate the
deleted set (`git show --diff-filter=D`), (2) filter to substantive classes
(`memory/persona`, `docs/governance`, non-shadow-log `docs/research`, code), (3)
check each is present elsewhere on `main` (basename gate); anything absent is a true
loss → recover from the delete commit's parent. Also independently run the full
`dotnet build -c Release` (0-warning gate) when someone pushes to `main` bypassing
CI — a filtered test pass is not the build gate. Ties to
[[always-preserve-ferries-forwarded-ai-memories-lost-in-cloud-without-preservation]]
(don't filter others' memories) and the preserve-first / err-toward-keeping
discipline.
