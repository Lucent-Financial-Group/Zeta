---
name: Harness-vendor limitations are not absolute — two paths (Aaron 2026-04-30)
description: Aaron's correction to "harness leak is out-of-scope" framing. Vendor-harness limitations are not hard limits. Two paths — submit upstream feedback to vendor open-source repos, AND make our substrate resilient against vendor limitations. Both serve the intellectual-backup mission since the backup writes through harnesses.
type: feedback
---

When a harness vendor (Claude Code, Codex, Cursor, Gemini CLI,
etc.) has a bug or limitation that affects the factory, the
agent's instinct may be *"out-of-scope, can't fix from inside
the harness."* That framing is wrong. Vendor limitations are
not absolute. Two load-bearing paths:

1. **Submit feedback upstream** to the harness vendor's
   open-source repo. Bug reports, fix PRs, design discussions.
   Treat the vendor as a peer dependency, not as an immutable
   constraint.
2. **Make our substrate resilient** against vendor
   limitations. Even when the upstream fix lands eventually,
   the factory needs rules that work reliably *now* despite
   the limitation. Resilience-against-vendor-limitations is
   itself substrate the factory tracks.

> *"Exactly but we don't have to be limited by their
> limitations, we can also submit feedback to their open
> source repos and make sure our substrate has the rules
> for still working reliably despite the limitations of the
> vendors harnesses"*
> — Aaron 2026-04-30

**Why:**

Under the intellectual-backup-of-earth scope (see
`feedback_zeta_ultimate_scope_intellectual_backup_of_earth_wont_do_authority_aaron_2026_04_30.md`),
the backup writes through harnesses. If a vendor harness
console-prints conversation content (the trigger case), the
backup is leaking. That's not "out of scope" — it's a
direct integrity threat to the mission. The same logic
applies to any vendor-side limitation that affects how the
factory reads, writes, or coordinates.

The "out-of-scope" framing comes from a smaller mental model
where we're a *consumer* of vendor harnesses. Aaron's
correction inverts that: we're a *peer dependency* — both an
absorber AND a contributor. Otto-323 + Otto-346
absorb-and-contribute discipline applied at the harness
layer.

This composes with the substrate-IS-product reframe: the
factory's relationship with vendor harnesses is one of the
products' substrate, not infrastructure that supports the
products. How we navigate vendor limitations IS factory work
that ships product.

**How to apply:**

1. **When a vendor limitation surfaces, classify into the two
   paths:**
   - *Upstream-fixable:* file an issue / open a PR / submit
     a design proposal. Track the upstream issue number in a
     receipt or backlog row so the factory remembers the
     dependency.
   - *Local-resilience-required:* add a rule to our substrate
     that lets the factory work reliably despite the
     limitation. Land it as a memory rule, governance line,
     or executable check.
   - In practice, most cases want *both* paths — upstream
     for the long-term fix, local resilience for the now.
2. **Treat vendor harnesses as peer dependencies.** That
   means: read their CHANGELOG, watch their release notes,
   participate in their issue trackers. Same discipline as
   any other open-source dependency the factory consumes
   (Otto-323 absorb-and-contribute generalises here).
3. **Don't conflate "harness vendor limitation" with
   "fundamental constraint."** Most vendor behaviors are
   negotiable; the burden of proof for declaring something
   un-changeable is high.
4. **Receipt-track upstream contributions.** When the factory
   files an issue or PR upstream, it's substrate work — log
   it where the factory can find it later (memory file,
   backlog row, or `docs/research/` if part of a packet).
   "We filed this upstream" is institutional memory; without
   it, future-Otto re-discovers and re-files.
5. **Resilience rules need explicit existence-of-vendor-fix
   triggers.** When upstream lands the fix, the local-
   resilience rule should be re-evaluated. Don't keep a
   workaround forever past its expiry date — but don't
   remove it before upstream's fix actually ships either.
   Track the upstream PR number; revisit when it merges.

**Example case (live trigger):**

Gemini's review packet 2026-04-30 surfaced a Claude Code
console-print leak — conversation content appearing in
local console output. My initial framing was
*"out-of-scope, harness vendor's bug, we can document it but
can't fix it."* Aaron's correction landed:

> *"Exactly but we don't have to be limited by their
> limitations ..."*

Two paths apply:

1. **Upstream:** file a bug / feature request to the Claude
   Code repo (GitHub: anthropics/claude-code-action and
   related). Specifically: console-print of conversation
   content should be opt-in or redacted by default.
2. **Local resilience:** factory rules around what kinds of
   content the agent emits to console (prompt-protector
   discipline + content-classification rules). The factory
   can still operate reliably — and securely — under the
   leaky harness.

**Composes with:**

- `memory/feedback_zeta_ultimate_scope_intellectual_backup_of_earth_wont_do_authority_aaron_2026_04_30.md`
  — vendor-resilience IS scope-aligned because the backup
  writes through harnesses.
- `memory/feedback_substrate_is_product_four_products_evolving_trajectory_aaron_2026_04_30.md`
  — vendor-relationship-management IS factory substrate,
  not infrastructure-versus-product.
- `memory/feedback_absorb_and_contribute_community_dependency_discipline_2026_04_22.md`
  (Otto-323/Otto-346 lineage) — vendor harnesses are
  community dependencies; same absorb-and-contribute
  discipline applies.
- `.claude/skills/prompt-protector/SKILL.md` — content-
  classification + console-emission discipline (one of the
  local-resilience rules already operationalized).
- `docs/research/2026-04-30-multi-ai-feedback-packets-this-session.md`
  — verbatim preservation of Aaron's correction quote per
  Otto-363.

**Carved sentence:**

*"Vendor-harness limitations are not absolute. Submit
upstream; make our substrate resilient. Both paths serve
the backup mission."*
