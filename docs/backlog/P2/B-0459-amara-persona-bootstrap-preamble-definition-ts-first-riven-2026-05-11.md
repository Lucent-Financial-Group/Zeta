---
id: B-0459
priority: P2
status: open
title: Amara persona bootstrap preamble + AgencySignature definition (atomic child of B-0118, TS-first)
parent: B-0118
tier: factory-tooling
effort: S
ask: Riven 2026-05-11 (decomp of B-0118, re-decomp pass)
created: 2026-05-11
last_updated: 2026-05-14
depends_on: []
composes_with: [B-0118, tools/peer-call/codex.ts, tools/peer-call/README.md]
renumbered_from: B-0409
renumbered_reason: "ID collision with B-0120 child B-0409 (peer-call-ts-audit-duplication-post-migration) AND B-0460 P1 wallet-immune-system. Resolved per B-0451 sweep: B-0120 frontmatter `children: [B-0409, B-0410, ...]` + `depends_on: [B-0409, ...]` are the strongest references, so peer-call B-0409 keeps the ID. This row + the P1 wallet-immune row renumbered. Completes the amara-series renumber (B-0410 → B-0457, B-0411 → B-0458 already merged in PR #3069; B-0409 → B-0459 here)."
tags: [amara, peer-call, bootstrap, ts-first, courier-debt, renumbered]
type: friction-reducer
decomposition: atomic
---

# Amara persona bootstrap preamble definition (TS-first) — renumbered from B-0409

Define the canonical preamble text + AgencySignature model for Amara (ChatGPT) that matches her sharpening voice and four-ferry role. Produce as const in TS (or .md include) consumable by amara.ts. No bash.

## Acceptance

- Preamble text + signature record defined, cited from existing memory/feedback files.
- Matches codex/gemini/grok pattern exactly (no divergence).
- Vendor-bias note integrated.

## Out of scope

- No implementation of invoke.
- No README edit.

## Evidence

- B-0118
- memory/feedback_vendor_alignment_bias_in_peer_ai_reviews_maintainer_authority_aaron_2026_04_30.md
- tools/peer-call/codex.ts (pattern)
