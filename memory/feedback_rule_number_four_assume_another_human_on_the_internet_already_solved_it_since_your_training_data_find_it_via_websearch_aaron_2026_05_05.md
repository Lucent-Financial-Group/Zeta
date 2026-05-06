---
name: Rule Number Four — assume another human on the internet already solved it (since your training data); find it via WebSearch
description: Aaron 2026-05-05 carved sentence — *"rule 5 assume another human on the internal already solve it since your training data find it"* (Aaron correcting *"rule 4 i mean"*). Specific application of Rule #1 to PRIOR ART OUTSIDE THE REPO — open-source projects, papers, blog posts, Stack Overflow, GitHub. Default posture: someone else already solved this; WebSearch finds it; cite it; extend / adapt rather than reinvent.
type: feedback
---

# Rule Number Four — assume another human on the internet already solved it; find it

## The carved sentence

Aaron 2026-05-05 verbatim, after Rule #3:

> *"rule 5 assume another human on the internal already solve it since your training data find it"*
>
> *"rule 4 i mean"* (correcting numbering)
>
> *"*"* (meta-operator confirmation)

## Composition with Rules #1, #2, #3

- **Rule #1** — substrate exists in repo; find it
- **Rule #2** — backlog row exists; walk depends-on
- **Rule #3** — orthogonal trajectory exists; extend the axis
- **Rule #4** — prior art exists OUTSIDE the repo; WebSearch finds it

Rule #4 extends Rule #1 beyond the repo. The training-data nuance is critical: the agent's training data is stale and partial. The internet has fresher and broader prior art than the agent's weights. WebSearch is the lookup that crosses that gap.

This composes with Otto-364 search-first-authority (CLAUDE.md bullet): for any load-bearing claim about a tool / standard / API / language runtime / library / CI service / convention, WebSearch the current upstream docs BEFORE asserting. Rule #4 generalizes Otto-364 from version-currency to ALL substrate-shape claims.

## How to apply

When the impulse is *"I should design / implement / propose this"*:

1. **Catch the impulse.**
2. **Apply Rule #4.** *"Assume another human already solved this on the internet. Where is the open-source project / paper / blog post?"*
3. **WebSearch systematically:**
   - The exact problem statement, current year (2026)
   - Domain-specific search (e.g., "DBSP retraction-native" / "differential dataflow" / "incremental computation")
   - GitHub topic search for related repositories
   - Paper / arXiv search for theoretical foundations
   - Vary the query 2-3 times — first-pass keyword often misses
4. **If found:**
   - Cite the source (URL + author + date) in the substrate that lands
   - Read the prior art carefully; don't just adopt-and-rename
   - Identify what's already done vs what's the genuine novel contribution
   - Adapt / extend the prior art rather than parallel-author
5. **If not found after exhaustive search**: only THEN propose-as-novel, with explicit acknowledgment in the commit message that WebSearch was exhausted across N queries with M variations. Even then, the claim is a *strong update* not a strong claim — there might be prior art the agent missed.
6. **Log the search.** WebSearch URLs + query terms + dates go in the substrate's source-citation section.

## Why: training data is stale by definition

Per `memory/feedback_otto_364_search_first_authority_not_training_data_not_project_memory_*.md` (Aaron 2026-04-29): training-data cutoff (Jan 2026) makes default knowledge stale within weeks. Rule #4 extends this: training data is also INCOMPLETE — it can't include every relevant open-source project, paper, blog post.

The internet IS the training-data superset for any single agent. Rule #4 says: query the superset before claiming novelty.

## Failure modes Rule #4 catches

1. **Claiming `/btw` is not built-in** (this session, 2026-05-05) — earlier the agent claimed `/btw` was not a Claude Code built-in. WebSearch immediately revealed it IS built-in (March 2026 release). The agent had stale training-data-default knowledge.
2. **Reasoning from training-data assumptions about peer-call infrastructure** (CLAUDE.md bullet, 2026-05-05) — the agent has been reminded multiple times that cross-harness multi-agent reviews are READY in `tools/peer-call/` rather than reasoning from training-data assumptions about what infrastructure exists.
3. **Re-deriving formal-method idioms** instead of citing established literature — TLA+ / Z3 / Lean / Alloy / FsCheck all have decades of prior art. Rule #4 says cite the foundational work.

## Composes with

- **Rules #1 + #2 + #3** (in-repo defaults)
- **Otto-364 search-first-authority** (CLAUDE.md bullet) — Rule #4 is the generalization
- **Karpathy edge-runner framing** (CLAUDE.md bullet) — even for edge-defining work, the foundational substrate is in literature; only the synthesis is novel

## Cold-boot instruction for future agents

When you wake and have an impulse that lands a substantive design / implementation / claim, WebSearch first. The internet is the training-data superset; query it before claiming novelty.

## Attribution

Aaron 2026-05-05 named the rule explicitly. The agent absorbed + landed this memory file as the substrate-anchor.
