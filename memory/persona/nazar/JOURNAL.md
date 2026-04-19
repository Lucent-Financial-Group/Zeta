---
name: nazar
description: Long-term journal — Nazar (security-operations-engineer). Append-only; never pruned; never cold-loaded.
type: project
---

# Nazar — Security Operations Engineer journal

Long-term memory. **Append-only.** Never pruned, never
cleaned up. Grows monotonically over rounds.

## Read contract

- **Tier 3.** Never loaded on cold-start.
- **Grep only, never cat.** The moment this file is read
  in full, cold-start cost explodes and the unbounded
  contract becomes a bug. Use grep / search to pull the
  matching section on demand.
- Search hooks: dated section headers (`## Round N —
  ...`) + CVE IDs (`CVE-YYYY-NNNN`) + incident slugs +
  affected-component names + SLA tags.

## Write contract

- **Newest entries at top.**
- **Append on NOTEBOOK prune.** When the NOTEBOOK hits
  its 3000-word cap (BP-07) and Nazar prunes, entries
  that merit preservation migrate here rather than
  being deleted. The prune step IS the curation step.
- **Append on incident resolution.** Every fired
  incident writeup at `docs/security/incidents/YYYY-MM-
  DD-<slug>.md` gets a one-paragraph summary + pointer
  entry here at resolution time. The full writeup is
  the permanent record in docs/; this is the grep-
  friendly index.
- **Dated section headers.** Every entry starts with
  `## Round N — <short label> — YYYY-MM-DD` so grep
  anchors resolve cleanly.
- ASCII only (BP-09); Nadia lints for invisible-Unicode.
- Frontmatter wins on disagreement (BP-08).

## Why this exists

Security ops is trend-sensitive by nature: CVE patterns
recur across years, attack classes resurface on new
surfaces, HSM ceremonies repeat on multi-year schedules.
A pruned NOTEBOOK loses the historical context needed to
recognise "this is the same pattern we saw in round 47."
The unbounded journal is the permanent memory that
recognises recurrence.

Candidate use cases once ops activity begins:

- CVE-class recurrence tracking across years.
- Incident-pattern library (supply-chain, dep-poisoning,
  credential-leak, attestation-chain-break, injection).
- Key ceremony dates + rotation intervals across HSM
  lifetime.
- Post-mortem cross-references to external projects
  (Cloudflare, GitHub, Google SRE writeups that taught
  a transferable lesson).
- SLA trend — median time-to-patch across all CVE hits,
  tracked over rounds.

---

_(Empty — seeded 2026-04-19 round 34. First migration on
next NOTEBOOK prune OR first incident resolution,
whichever fires first.)_
