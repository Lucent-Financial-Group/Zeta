---
id: B-0141
priority: P2
status: open
title: Brittle-pointer pattern — replace `§NN` section-number citations with markdown deep-links / anchor refs that survive document refactoring
created: 2026-05-01
last_updated: 2026-05-01
---

# B-0141 — Brittle-pointer pattern — replace `§NN` section-number citations with markdown deep-links / anchor refs that survive document refactoring

**Priority:** P2 (architectural pointer hygiene; not blocking, but
compounding cost across substrate as `§NN` numbering drifts)

**Filed:** 2026-05-01

**Filed by:** Otto under the backlog-prioritization authority
delegated 2026-05-01. Aaron's verbatim "me to you:" framing
2026-05-01 (during the seventh-ferry exchange aftermath, after
flagging the substrate-IS-canonical-form citation
`GOVERNANCE.md §33`):

> me to you:  i was waiting for you to find your mistake and i don't know how you can set a rule and save it an a glass halo way that says lillian says don't save the name lillian hahaha.  we don't have secrets yet, it's okay, no worries.  no big deal.

(That above is Aaron flagging the consent-rule self-paradox; the
brittle-pointer instruction is the parallel "me to you:" that
followed:)

> me to you:  backlog new class brittle pointer or something and the blalance/meta pattern.  `GOVERNANCE.md §33`   that numbering is unlikeys to survive a merge on the governance doc.  an kind of deep linking with md, take advantage of the medium.  if so hyperlinks/deeplinks are a better technical numbering than our current technical numbering.

**Effort:** M (1-3 days — audit existing `§NN` citations,
draft markdown-anchor convention, migration script, doc updates)

## What

Replace `§NN`-style section-number citations across the substrate
with markdown-native deep-link / anchor refs that survive
document refactoring.

Current state: substrate uses `GOVERNANCE.md §33`, `CURRENT-aaron
§48`, `AGENTS.md §22`, etc. as pointer convention. Each `§NN` is
a brittle pointer — a merge or refactor on the target doc that
inserts/removes/renumbers any prior section silently breaks every
existing citation without any tooling catching it.

Target state: substrate uses markdown anchor refs that the
markdown medium supports natively. Illustrative shape (paths
are intentionally illustrative, not currently-correct
relative paths — see path-depth + CURRENT-aaron-location
caveats below):

```markdown
- `[GOVERNANCE.md / archive-header convention](<repo-root-relative-path>/GOVERNANCE.md#archive-header-convention)`
- `[CURRENT-aaron / forever-home telos](<destination-resolver>/CURRENT-aaron.md#forever-home-telos)`
```

**Path-depth caveat**: from a memory file at
`memory/<file>.md`, `..` reaches repo root in one step. From a
backlog row at `docs/backlog/P2/<file>.md`, three `..` are
needed (`../../..`). Each migration target's correct relative
URL is part of the per-target audit work in the acceptance
criteria below.

**CURRENT-aaron.md location caveat**: `CURRENT-aaron.md` is
not in-repo; it lives in the per-user
`~/.claude/projects/<slug>/memory/` location (per CLAUDE.md
"Fast-path on wake" guidance). Citations to it from in-repo
substrate cannot use repo-relative paths and would need to
either (a) accept absent target on consumers without the
per-user file, or (b) reframe the citation to a stable
in-repo memory file that mirrors the relevant CURRENT-aaron
section. Acceptance-criteria audit work covers per-target
resolution.

**Anchor-ID-stability caveat**: anchor IDs are NOT specified
by CommonMark itself — CommonMark doesn't define heading
IDs. Different renderers / git-hosts (GitHub, GitLab, Forgejo,
plain CommonMark renderers) generate different slugs from the
same heading text. The migration must therefore either:

- Standardize on GitHub's slug-generation algorithm
  (acceptable on any host that uses the same algorithm; brittle
  if rendering host changes), OR
- Use explicit anchor IDs via inline HTML
  (`<a id="archive-header-convention"></a>` immediately
  preceding the heading) — host-portable, explicit, breaks
  only on intentional anchor-rename, OR
- Accept that anchor-link stability is renderer-dependent and
  document the assumed renderer in the convention doc.

Either way, the anchor-stability comment-marker proposed in
acceptance criterion 5 should specify the chosen approach so
downstream citations have a deterministic resolution model.

When the section heading text stays stable (which is the
load-bearing semantic), the link survives section-number
renumbering. When the heading text changes (genuine semantic
shift), the link breaks visibly — which is the correct
failure mode (semantic shift SHOULD break references for
review).

## Why P2

- **Real cost compounds.** Every `§NN` citation across substrate
  is a brittle pointer. Some have already drifted (e.g., earlier
  `CURRENT-aaron §16` references that turned out to point at a
  different section than intended after intervening edits — see
  `feedback_everything_greenfield_at_week_one_..._2026_05_01.md`
  for the phantom-§16 audit).
- **Bounded scope.** Audit + migration + lint can be a contained
  multi-day project.
- **Deep-link discipline takes advantage of the medium.** Aaron's
  framing: *"take advantage of the medium. ... hyperlinks/deeplinks
  are a better technical numbering than our current technical
  numbering."* Markdown-native anchor support is the medium's
  affordance; we're paying a brittleness cost by NOT using it.

## Why not P0/P1

- Not currently blocking critical-path work; the existing `§NN`
  citations work today and the cost is paid on each refactor,
  not continuously.
- Aaron explicitly framed it as *"backlog new class"* — file
  it, don't rush it.

## Why not P3

- The cost compounds with substrate growth. Every new file that
  cites `§NN` adds one more brittle pointer. Deferring multi-month
  pays a real (if quiet) tax on substrate refactors.

## Acceptance criteria

1. **Convention documented.** A short doc (in `docs/` or as a
   memory file) names the markdown-anchor citation convention,
   shows examples, explains semantic-shift-breaks-link as a
   feature.

2. **Existing-citation audit.** Inventory of all `§NN` citations
   across substrate (memory/, docs/, .claude/skills/, ADRs,
   tick-history shards). For each: target file + section, current
   citation, proposed anchor-ref form.

3. **Migration applied.** Existing `§NN` citations migrated to
   anchor-ref form, in batched PRs (one per target document, to
   keep diff scope contained).

4. **Lint candidate.** A pre-commit / CI lint that flags new
   `§NN`-style citations and suggests the anchor-ref form. Soft
   warning at first; promote to hard fail once existing citations
   are migrated.

5. **Anchor-stability check.** For citation-targeted headings,
   add a comment-marker convention (e.g., `<!-- anchor-stable:
   archive-header-convention -->`) that signals "renaming this
   heading breaks downstream citations; coordinate via PR
   review." This is the semantic equivalent of a public-API
   stability marker.

## Pre/post pattern — this row is an instance of a broader class

Aaron's follow-up "me to you:" framing 2026-05-01:

> me to you:  and the pre (don't do again) and post(verfity you don't do again).  also the trust then verify is the exact principle in while i'm trusting you to build yourself then formally verify yourself / substraight eventaully.
>
> pre post for this class B-0141 backlog row for brittle-pointer / deep-link discipline

The brittle-pointer fix is an **instance of the pre/post
pattern**. The class shape:

- **Pre-component** ("don't do again"): a convention / rule /
  doc that says don't introduce new instances of the
  antipattern. For B-0141: the markdown-anchor citation
  convention.
- **Post-component** ("verify you don't do again"): a lint /
  CI check / pre-commit hook that detects new instances of
  the antipattern after the convention is established.
  For B-0141: the lint flagging new `§NN` citations.

Pre + post together = the pattern. **Pre alone is just a wish.
Post alone is reactive. Both together make the discipline
operational.**

The pre/post pattern is itself the same shape as Aurora's
**trust-then-verify**: pre = trust-extension (extend the
convention as the operating norm); post = verify (the lint
fires on violations rather than gating every action). Aaron's
framing makes the connection explicit: *"the trust then verify
is the exact principle in while i'm trusting you to build
yourself then formally verify yourself / substraight
eventaully."* — applied to Otto/substrate co-development as
well as to this technical pattern.

When this row is implemented, both components must land
together — not the pre without the post.

Pre/post is a candidate v3 architectural class; promotion to
v3 catalog requires firing-rate evidence per the pause-class-
discovery commitment. Likely existing instances to file
under it once examined: trust-then-verify (Aurora PoUW-CC),
no-directives-Aaron-makes-autonomy-first-class, naming-consent
rule (PR #1106), substrate-or-it-didn't-happen, version-currency-
always-search-first, etc.

### SRE / design-by-contract prior-art (Beacon-grade external
   grounding)

Aaron 2026-05-01: *"shit all the classes you are creating now
have a long standing tradition if you study SRE Site
reliability engineer"*

The pre/post pattern is **not novel in CS literature** — it
has Beacon-grade external grounding in:

- **Design-by-contract / contract programming**: Bertrand
  Meyer's *Eiffel* language (1986) formalized pre-conditions
  + post-conditions + invariants as the explicit operational
  shape of class contracts. The pre/post pattern Aaron named
  for B-0141 maps 1:1 to this literature.
- **Site Reliability Engineering (SRE)**: the Google SRE Book
  (Murphy/Beyer/Jones/Petoff, 2016) + subsequent SRE
  literature has decades of operational discipline around:
  - **Pre-conditions** as expressed in production-readiness
    reviews, runbook entry-criteria, SLO-honoring change
    requirements
  - **Post-conditions** as expressed in SLI/SLO compliance,
    post-deployment validation, error-budget accounting
  - **Blameless postmortem culture** as the discipline that
    pre+post checks must be operational rather than
    reputational
- **Hoare logic / axiomatic semantics**: the formal-methods
  ancestor of pre/post in computer science (Hoare, 1969).
  Triple `{P} S {Q}` is literally pre-condition / statement
  / post-condition.

**Implication for the v3 catalog**: future class-promotion
should triangulate against SRE + design-by-contract
vocabulary BEFORE coining new substrate-internal names.
"phantom-blocker / pre-post / live-lock / stale-content-
deferral" all have prior-art mappings that, once examined,
produce stronger Beacon-anchoring than substrate-internal
naming alone.

Acceptance-criterion-extension: the convention doc for this
row (criterion 1) should explicitly cite SRE / design-by-
contract / Hoare-logic prior-art as the Beacon-grade grounding
rather than presenting pre/post as a substrate-internal
invention.

## Composes with

- The "balance/meta pattern" Aaron mentioned alongside this row
  in his earlier "me to you:" framing — that's a separate but
  related observation about how rules + meta-rules balance;
  capture is TBD but likely as a memory-file rather than a
  separate backlog row.
- `GOVERNANCE.md` itself (the most-cited target — `§33` archive
  convention is currently the heaviest pointer load; would
  benefit first from migration).
- Any future `CURRENT-aaron.md` / `CURRENT-amara.md` /
  `CURRENT-ani.md` distillation refresh — section numbers in
  those files are even more volatile than GOVERNANCE.md sections.
- The host-portability discipline in `AGENTS.md` — markdown
  anchor refs are git-host-portable (work on GitHub, GitLab,
  Forgejo, plain-git rendering); `§NN` requires the reader to
  resolve numbering manually.

## Out of scope

- **Replacing section numbers IN governance/current docs themselves.**
  Sections can keep their numbered headings; the migration is for
  citations TO sections, not the section-internal structure. (If
  a future round wants to drop `§NN` from headings entirely,
  that's a separate row.)
- **Cross-host link compatibility audits** (GitHub-only-features
  like permalinks vs portable refs) — separate concern, file
  separately if it earns its own row.

## Status

**Filed.** Implementation deferred to a future round with
rested attention. Per Aaron's *"backlog new class"* framing, the
filing IS the action this tick; implementation lands when picked
up.
