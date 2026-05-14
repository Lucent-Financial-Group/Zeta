---
id: B-0464
priority: P1
status: open
title: "Draft honor-system 'please don't fork' license language for product repos"
type: design
origin: B-0425 decomposition (Otto 2026-05-14)
created: 2026-05-14
last_updated: 2026-05-14
depends_on: []
composes_with:
  - B-0425
  - memory/feedback_aaron_honor_system_no_fork_license_public_glass_halo_but_please_dont_fork_honesty_not_enforceable_2026_05_13.md
  - memory/feedback_aaron_civsim_forkable_pvp_raids_destiny_style_mutual_privacy_no_strategic_advantage_game_design_2026_05_13.md
  - .claude/rules/glass-halo-bidirectional.md
  - .claude/rules/razor-discipline.md
---

# B-0464 — Draft honor-system "please don't fork" license language for product repos

## What this row does

Draft the **honor-system "please don't fork" license text** that will be applied to
product repos (KSK / wellness / civsim / American Dream 2.0 / DIO / Aurora / Dawn).
This is design work, not repo-creation work — the license text needs to exist and be
consistent before any product repo is scaffolded.

## Why this is its own atomic row

License text is independent of which products actually get repos (B-0465) and what
their final names are (B-0466). It can be authored as soon as the design constraints
are clear — which they are (per Aaron's 2026-05-13 framing in B-0425).

Separating this prevents B-0468 (ADR) from being blocked on a 7-product research
pass when the license language itself has zero such dependency.

## Design constraints (from B-0425 + memory)

Per Aaron 2026-05-13:
> *"so anytihgn you don't want them to fork specifically you have in a repo can
> still be public and such glass halo but the licence can say no fork please
> respect honesty or something not enforcable"*

The license text MUST:

1. **Keep the repo public** — glass-halo discipline preserved
2. **Ask (not command) for no forking** of strategic-product substrate
3. **Be substrate-honest about non-enforceability** — the ask is honor-system; it
   does NOT pretend to be legally binding
4. **Compose with civsim mutual-privacy** — if forks exist, they may extend the
   same honor-system ask to their own substrate
5. **NOT apply to factory-infrastructure repos** — Zeta / Forge / ace are
   designed-to-be-forked; this license is for product repos only

The text MUST NOT:

- Claim legal enforceability it doesn't have (razor-discipline)
- Break glass-halo (repos stay public + indexable)
- Use legalese that obscures the substrate-honest intent
- Trigger DMCA / license-compliance complexity for infrastructure consumers

## What the output looks like

A new file: `docs/legal/HONOR-SYSTEM-LICENSE-DRAFT.md`

Contents:

- The actual license header text (copy-paste-ready for a product repo's LICENSE file)
- A brief rationale comment explaining the honor-system framing
- Notes on when to apply vs when NOT to apply (per the memory file's discipline)
- A short FAQ: "Can I fork this?" / "Is this legally enforceable?" / "What about civsim?"

## Prior art to check

- Existing `LICENSE` file in LFG/Zeta (Apache 2.0 baseline)
- The BUSL (Business Source License) pattern — publicly visible but use-restricted;
  notable as a possible reference even though our intent differs (honor-system vs
  legally-restricted)
- Creative Commons NC licenses — honor-system is a different thing; check for
  confusion risks
- The "ethical source" / SSPL license families — avoid legalese; note the substrate-
  honest difference

## Definition of done

- `docs/legal/HONOR-SYSTEM-LICENSE-DRAFT.md` exists and contains:
  - Ready-to-use license header text
  - Rationale note (substrate-honest, non-legalese)
  - When-to-apply / when-NOT-to-apply section
  - Short FAQ
- Text passes razor-discipline: no claims of enforceability, no legalese overreach
- Glass-halo check: repos using this license remain public and indexable
- Draft reviewed against civsim mutual-privacy design (forks OK to apply their
  own version)

## Dependency graph position

```
B-0464 (this row) ──→ B-0468 (ADR — product-repo split decisions)
```

No blockers. Can start immediately after B-0425 decomposition PR merges.
