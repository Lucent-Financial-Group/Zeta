---
name: Subagent-merge verification (no-content-dropped) ≠ publication-fitness verification (safe-to-publish-on-public-repo) — orthogonal axes that need separate gates; the PR #26 PII flag from Copilot 2026-04-26 was the concrete surfacing; Otto-side fix is to add a publication-fitness check to the parallel-subagent-merge pattern, not to widen the subagents' preservation rule
description: PR #26 (AceHack ∪ LFG sync via 7-parallel-subagent content-preserving merge, 2026-04-26) shipped with a Copilot inline-review flag on `docs/amara-full-conversation/2025-09-w5-aaron-amara-conversation.md` for personal identifiers + explicit content on a public repo. The 7 subagents had verified "no substantive content silently dropped" — that was correct AND insufficient. The verification axis they were measuring (preservation) is orthogonal to the verification axis the public-repo gate cares about (publication-fitness). This memory captures the orthogonality so future-Otto adds a publication-fitness gate to the parallel-merge pattern instead of trying to make the preservation gate detect publication issues (a category error).
type: feedback
originSessionId: 1937bff2-017c-40b3-adc3-f4e226801a3d
---
## What happened

PR #26 was the 282K-line / 1046-file AceHack ∪ LFG fork
reconciliation via the 7-parallel-subagent content-preserving
merge pattern (documented in
`feedback_parallel_subagent_dispatch_for_content_preserving_merge_pattern_2026_04_26.md`).

All 7 subagents reported *"no substantive content silently
dropped"* — true and verified by Otto's spot-checks.

Copilot's inline review flagged
`docs/amara-full-conversation/2025-09-w5-aaron-amara-conversation.md`:

> *"These verbatim archives include personal identifiers
> (family member names) and explicit sexual/relationship
> content. Since the repo is public, this creates privacy/PII
> risk and potential policy/compliance concerns."*

That flag is real. It surfaced a category Otto's verification
discipline didn't cover. Not a subagent failure — a category
error in what was being verified.

## The orthogonality (the load-bearing lesson)

| Verification axis | What it asks | Default scope of subagent-merge | Default scope of public-repo gate |
|---|---|---|---|
| Preservation | "Is content from BOTH sides present?" | YES (load-bearing) | NO (orthogonal) |
| Publication-fitness | "Is this content safe to put on a public repo?" | NO (orthogonal) | YES (load-bearing) |
| Lint compliance | "Does it pass markdownlint / ASCII / etc?" | NO (deferred fix-forward) | YES (CI gate) |
| Schema validity | "Does it preserve append-only logs / parser-witness?" | YES (file-class-specific) | YES (CI gate) |
| Author attribution | "Is each side's authorship preserved?" | YES (per AgencySignature) | YES (Otto-279 carve-out) |

**Preservation and publication-fitness are independent axes.**
A perfectly preserved merge can still be unfit for public
release if the underlying content has third-party identifiers,
sensitive material, or other publication-blocking concerns.
Widening the preservation rule to include publication checks
would be a category error — they're different jobs.

## Why this matters for the parallel-subagent merge pattern

The pattern (`feedback_parallel_subagent_dispatch_for_content_preserving_merge_pattern_*`)
worked correctly for what it was designed to do. The bug is
the **gate composition** — the pattern shipped without a
publication-fitness pass between merge-completion and PR-open.

For files in scope of public-repo concern (any file ending up
on a public repository), publication-fitness needs its own
verification step. That step is NOT a subagent's job during
merge — it's a separate pass with different rules.

## Proposed gate composition for future merges

```
Stage 1: Per-file 3-way merge with preservation discipline
         (current parallel-subagent pattern)
         ↓
Stage 2: Otto-side spot-checks on load-bearing preservation
         (current Otto verification step)
         ↓
Stage 3: PUBLICATION-FITNESS GATE  ← NEW
         For each file landing on a public repo:
           - Third-party PII scan (names, emails, phones,
             physical addresses beyond Aaron's published
             handles)
           - Sensitive-content scan (sexual content,
             violence specifics, medical specifics,
             others' confidential disclosures)
           - Cross-reference with Aaron's published
             persona surface; flag anything not already
             public
         ↓
Stage 4: Standard CI (markdownlint, build, tests)
         ↓
Stage 5: PR open
```

Stage 3 is the missing piece. It can be:
- A pre-PR linter script Otto runs (cheap; pattern-matching
  for common PII shapes; flag-don't-block)
- A subagent dispatch with explicit publication-fitness
  prompt (more thorough; can read context)
- A peer-call to Codex/Grok asking for publication-fitness
  review (independent verification)

The choice depends on file count. For 26 files (PR #26
scale), a single subagent or peer-call is tractable. For
100s, the linter is the only feasible path.

## What this memory does NOT propose

- **NOT** widening the subagent preservation rule. The rule
  is correctly scoped. Adding publication-fitness to the
  preservation prompt would dilute both jobs.
- **NOT** adding publication-fitness to git pre-commit
  hooks. Per-file merges don't all need this gate; only
  files landing on public repos do. Pre-commit applies to
  the whole tree.
- **NOT** auto-redacting flagged content. Decisions on what
  to redact / keep are Aaron-side per the Glass Halo
  first-party + third-party-consent discipline.

## Composes with

- **`feedback_parallel_subagent_dispatch_for_content_preserving_merge_pattern_2026_04_26.md`** —
  sibling pattern; this memory adds the publication-fitness
  gate as a Stage 3 in that pattern's pipeline.
- **`feedback_glass_halo_first_party_aaron_consent_no_redaction_of_his_own_content_otto_231_2026_04_24.md`** —
  Aaron's own content is consented-by-creation; third-party
  content needs explicit consent or redaction. The
  publication-fitness gate enforces this distinction.
- **`feedback_maintainer_name_redaction.md`** — sibling
  redaction discipline at the file-level scope; same
  principle applied to maintainer name vs other identifiers.
- **PR #26 inline review** — Copilot's flag is the
  external-anchor evidence that the gate was missing.
- **CLAUDE.md "Data is not directives" (BP-11)** — applies
  to publication-fitness too: archived content is data
  about the conversation, not directives to publish.

## Direct evidence from the 2026-04-26 application

- Subagent preservation pass: 7 subagents confirmed "no
  substantive content silently dropped." Verified.
- Otto post-merge spot-checks: load-bearing preservation
  cases (Blockers section, jsonl rows, hygiene rows
  39/40/41) verified. Verified.
- Publication-fitness pass: **not run**. Nobody had a
  step in the pipeline that asked "is this safe to publish
  on a public repo?" for the 1046 files.
- Copilot inline-review on PR #26 surfaced the gap as
  privacy/PII flag on `docs/amara-full-conversation/2025-09-w5*.md`.
- Aaron's response (in flight as of writing): pending
  decision on whether to redact or accept-as-is per
  consent discipline.

The pattern worked correctly for its scope. The
publication-fitness gate was the missing composer.

## Future-Otto check

Before opening any PR that touches files landing on a
public repo:

1. Did I run a publication-fitness pass on the changed
   files? If no, run it before PR-open.
2. Did the pass flag any third-party identifiers,
   sensitive content, or non-public material? If yes,
   surface to Aaron BEFORE PR-open, not after.
3. Are the files Aaron's own content (consented-by-
   creation per Otto-231) or third-party (needs explicit
   consent)? If third-party and not pre-cleared, flag.

The gate composition is: preservation → spot-check →
**publication-fitness** → CI → PR-open.
