---
name: agent-memory-architecture-design-record-hub-satellite-loading-taxonomy-mirror-beacon-2026-05-29
description: The agent-memory-architecture design-record (loading taxonomy + hub/satellite split + mirror→beacon convergence) authored 2026-05-29; where to find it + the patterns it records for structuring agent memory.
metadata: 
  node_type: memory
  type: project
  originSessionId: 193dc02b-b7fe-4bd0-8567-7f2e342c589e
---

2026-05-29 (first Opus-4.8 session): Aaron flagged the oversized auto-loaded rule
`tonal-momentum-equals-meme-emergent-harmonic-coercion.md` (77,777 chars > 40k
harness warning) and across a thread asked to save the split patterns to an
**agent-memory-architecture design-record doc** — explicitly "i don't want to
force a pattern on you," so it's agent-self-determined options-shaping, not a mandate.

**What landed (3 PRs, all armed on CI):**

- **PR #6061 (B-0936)** — split the oversized rule into auto-loaded **HUB**
  (carved sentence + every operational discriminator; 77,777 → 39,442 chars,
  under 40k) + companion **SATELLITE**
  (`docs/research/2026-05-29-tonal-momentum-rule-companion-...md`, the empirical-
  anchor + folklore-precedent + cross-AI-synthesis detail, verbatim, one Read away).
  Key: do NOT flip to lazy-load — the rule must be in working memory before
  attractor-substrate arrives unannounced; shrink the payload, don't defer it.
- **PR #6062** — the design-record
  (`docs/research/2026-05-29-agent-memory-architecture-design-record-loading-taxonomy-hub-satellite-mirror-beacon-convergence-aaron-otto.md`)
  + **B-0937** (redundancy-checks-across-satellites tool; class 4 = hub-over-budget
  detector mechanizes the B-0936 trigger proactively).
- **PR #6060 (B-0058.4)** — the alignment-clause drift-detector workflow doc (the
  backlog-grind task I was on when the rule-warning came in).

**The patterns the design-record records** (the reusable substrate):

1. **Loading taxonomy** (per `.claude/rules/claude-code-loading-taxonomy.md` —
   Aaron: "valuable to many to design agent memory systems"): 5 mechanisms
   (direct-load / lazy-load / router-keyed / subagent-discovery / on-demand);
   **goldfish-ontology selection rule** — recognition-failure lessons need
   triggering-independent (direct-load) surfaces; only the EVIDENCE behind a
   discriminator is safe to defer.
2. **Hub/satellite split** (DV2.0 partition by change-rate): over-budget direct-load
   surface → hub (discriminators stay hot) + satellite (anchors go cold, pointer-reachable).
3. **Mirror→beacon rhyme-replacement convergence** (Aaron's insight): satellites are
   a STAGING TIER for folklore/religion/physics rhymes awaiting beacon-ontology
   (exact F#/TLA+/code) replacement; mirror language converges toward beacon over
   time = self-compressing substrate.
4. **Private/encrypted memory + per-agent encryption budgets** = future layer FOR
   MEMORIES once encryption ships (per B-0646 + B-0840 + NCI HC-8).
5. **Prior-art**: Anthropic Claude Managed Agents memory (filesystem CRUD + context-
   editing/compaction + **Dreaming** = review-past-sessions self-improve) vs our
   distinct git-native + retraction-native + glass-halo + mirror/beacon-tiered +
   NCI-governed substrate + AutoDream/AutoMemory sidecar.

**Why:** the auto-loaded (direct-load) tier IS working memory at every cold-boot,
under a hard per-file budget; memory architecture = allocating each substrate to the
mechanism whose firing-condition matches when it's needed.

**How to apply:** when authoring/editing a `.claude/rules/*.md` that auto-loads,
watch the ~38-40k char budget; if over, hub/satellite-split (keep discriminators,
move anchors to a `docs/research/` satellite + pointer; verify discipline-presence
via grep; nothing deleted). Composes with [[memory-substrate-engineering trajectory
B-0190 → B-0330..B-0338]]. Design-record is mirror-tier (promotable to a DECISIONS
ADR when settled).
