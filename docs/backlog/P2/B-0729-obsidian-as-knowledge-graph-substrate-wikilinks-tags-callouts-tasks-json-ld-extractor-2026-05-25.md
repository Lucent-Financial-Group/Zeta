---
id: B-0729
priority: P2
status: open
title: "Obsidian as knowledge-graph substrate — wikilinks + frontmatter tags + callouts + Tasks-plugin format + JSON-LD extractor (5-layer adoption; team already uses Obsidian; extend where needed)"
created: 2026-05-25
last_updated: 2026-05-25
classification: convention-codify-and-tooling
decomposition: 5-layer-each-shippable-standalone
type: knowledge-substrate
discovered_by: aaron
owners: [aaron, max, addison]
composes_with:
  - memory/persona/
  - docs/backlog/
  - .claude/rules/
  - docs/AGENT-AUTHORING-AND-PR-REVIEW.md
  - docs/governance/MANIFESTO.md
---

# B-0729 — Obsidian-as-knowledge-graph substrate (5-layer adoption + extension where needed)

## Carved blade

> The framework already uses ~70% of the de-facto Obsidian / Foam / Logseq knowledge-graph standards (markdown + YAML frontmatter + GFM tasks + Mermaid). Close the remaining 30% in 5 shippable layers: wikilinks for graph quality, frontmatter tags as convention, Obsidian callouts for annotations, Tasks-plugin format for enriched TODOs, TS extractor for JSON-LD + property-graph JSON. Team already uses Obsidian; default to its conventions; extend where the team has needs Obsidian doesn't cover natively.

## Origin

Aaron 2026-05-25, asking about knowledge-graph standards for the git-native substrate:

> *"this is great is this a standard format for knowledge graphs are there any standards we can follow? we had shit tons for our master data and ontologies and graphs at lexis nexis. i'd love light git native ai friendly ones too so the graph is transverable by all and also have like enrichiment like tags to tag things for further enrihment and have annotation system for evolvoing documentaiton incluing actions like structured future todos?"*

Then on the standard-vs-extend decision:

> *"lets do it i like all. of that and like i said we all use obsedian so we can use that if no standard exists and extend"*

The semantic-web standards (RDF / OWL / SPARQL / JSON-LD / SKOS) are real + load-bearing for enterprise federated data (Aaron used them at LexisNexis) but too heavy for a git-native team substrate. The light-tier standards (Obsidian / Foam / Logseq vault format) are the right floor; the framework adopts them + extends where the team has needs they don't cover.

## What the framework already has

| Standard | Status |
|----------|--------|
| Markdown | ✓ all substrate is `.md` |
| YAML frontmatter | ✓ backlog rows use it; could extend to rules + personas |
| Markdown links | ✓ pervasive; uses `[text](path.md)` not `[[wikilinks]]` |
| GFM tasks | ✓ `- [ ]` / `- [x]` throughout |
| Mermaid diagrams | ✓ supported on GitHub + Obsidian + Foam |

## What's missing (filled in 5 layers below)

| Layer | Standard | Gap |
|-------|----------|-----|
| L1 | `[[wikilinks]]` | Use `[text](path)` instead; graph view loses some semantic categorization |
| L2 | Frontmatter `tags: [...]` convention | Backlog uses it; rules + personas + docs don't |
| L3 | Obsidian callouts (`> [!note]`, `> [!todo]`, `> [!warning]`) | Not used; annotation system for evolving documentation |
| L4 | Obsidian Tasks-plugin format (`- [ ] do 📅 2026-06-01 🔼 #project`) | GFM tasks lack due-date / priority / recurring semantics |
| L5 | JSON-LD + property-graph extractor | Agents can't programmatically query the graph today |

## L1 — Wikilink conversion (mechanical; ~1-2 days TS script)

Convert `[B-0724](docs/backlog/P2/B-0724-ts-hat-operator-polyglot-k8s-operator-pattern-for-max-2026-05-25.md)` → `[[B-0724]]` (with frontmatter aliases preserving GitHub-link compatibility).

Approach:

- TS script under `tools/wikilink-converter/convert.ts`
- Pass 1: scan vault, build map of `{path: shortname}` (the wikilink target)
- Pass 2: for each file, replace `[text](path.md)` with `[[shortname|text]]` (Obsidian alias syntax preserves the display text)
- Pass 3: emit a `frontmatter.aliases: [original-path]` block per file so internal references survive even if shortname changes later
- Edge cases:
  - Links to non-markdown files (images, code, JSON): keep as `[text](path)` — wikilinks don't apply
  - External URLs: keep as `[text](https://...)`
  - Deep anchors (`path.md#section`): use `[[shortname#section|text]]`
  - Relative paths from different depths: resolve against vault root
- Verification: GitHub still renders all links (wikilinks render as their alias text outside Obsidian); Obsidian graph view shows the FULL semantic structure

**After L1**: Obsidian graph view becomes load-bearing — every B-NNNN as a node, every rule as a node, every persona as a node, every cross-link as an edge. The framework's implicit knowledge graph becomes visible.

## L2 — Frontmatter `tags` convention (~1 day; conventions doc + extend)

Backlog rows already use frontmatter `tags: [...]`. Extend to:

- `.claude/rules/*.md` — add `tags: [discipline, agent-coordination, hat-system]` etc. per rule
- `memory/persona/<name>/*.md` — add `tags: [persona, human-co-owner, ai-agent]` etc.
- `docs/*.md` — add `tags: [governance, spec, onboarding]` etc.

Convention doc: `docs/CONVENTIONS-FRONTMATTER-TAGS.md` — lists the canonical tag vocabulary + when to apply each.

**After L2**: Obsidian + Foam tag-pane surfaces "all rules tagged `hat-system`" / "all personas tagged `human-co-owner`" etc.; Dataview queries can filter by tag.

## L3 — Obsidian callouts for annotations (~1 day; convention doc)

Standard callout syntax for evolving documentation:

```markdown
> [!note] Optional title
> Body of the note.

> [!todo] Implement X before Y lands
> See B-NNNN for the row.

> [!warning] This code path is destructive
> Read flash-usb.ts before changing anything here.

> [!info] Composes with
> - [[B-0728]]
> - [[CLAUDE]]
```

Supported callout types: `note`, `tip`, `important`, `warning`, `caution`, `info`, `todo`, `success`, `question`, `failure`, `danger`, `bug`, `example`, `quote`, `abstract`.

GitHub Flavored Markdown supports a SUBSET (`note`, `tip`, `important`, `warning`, `caution`) — those render on both GitHub AND Obsidian. The non-GFM ones (`todo`, `info`, etc.) render as plain blockquotes on GitHub but with full styling on Obsidian.

Convention doc: `docs/CONVENTIONS-CALLOUTS.md` — when to use which type; cross-compat notes for GitHub-vs-Obsidian rendering.

**After L3**: structured annotations for warnings, todos, composes-with sections, etc. — annotation system Aaron requested for evolving documentation.

## L4 — Obsidian Tasks-plugin format for enriched TODOs (~1 day; convention doc)

Enriched task syntax:

```markdown
- [ ] Land the wikilink converter 📅 2026-06-15 🔼 #knowledge-graph #B-0729
- [ ] Review Max's TS hat-operator PR 📅 2026-06-01 ⏫ #hat-system #B-0724
- [x] Ship the flash-usb safety rails ✅ 2026-05-25 #safety
```

Emoji symbols:

- `📅 YYYY-MM-DD` — due date
- `⏫ / 🔼 / 🔽 / ⏬` — priority (highest / high / low / lowest)
- `🔁` — recurring (e.g. `🔁 every week`)
- `✅ YYYY-MM-DD` — completion date
- `#tag` — inline tags (composes with frontmatter tags)

Renders as standard GFM tasks on GitHub (emoji + tags visible inline; due-date semantics inert); Obsidian Tasks plugin parses the emoji into structured query-able task data.

Convention doc: `docs/CONVENTIONS-TASKS.md` — when to enrich vs leave bare; due-date + priority discipline.

**After L4**: structured future TODOs that agents can query (via the L5 extractor) AND humans can manage via Obsidian Tasks plugin. Composes naturally with the backlog rows (which are project-scope structured TODOs at the same shape).

## L5 — TS extractor: JSON-LD + property-graph JSON (~1-2 weeks)

`tools/knowledge-graph/extract.ts` — scans the vault + emits:

- **`knowledge-graph.jsonld`** — JSON-LD representation per [W3C JSON-LD 1.1](https://www.w3.org/TR/json-ld11/); each node is a typed entity (`schema:CreativeWork`, `schema:DigitalDocument`, custom `zeta:BacklogRow`, `zeta:Rule`, `zeta:Persona`); each link is a property (`zeta:composesWith`, `zeta:dependsOn`, `zeta:cites`)
- **`knowledge-graph.json`** — property-graph JSON (Cytoscape format: `{nodes: [...], edges: [...]}`); agents query directly via JSON-path or import into a graph library

Both files commit to the repo (`docs/knowledge-graph/`) + regenerate on every PR via a CI workflow (`build-knowledge-graph.yml`). Composes with the existing `build-installer-iso.yml` shape.

Query patterns the extractor enables:

- *"What does B-0728 compose with?"* — graph traversal of `zeta:composesWith` edges from `B-0728` node
- *"What rules are tagged `hat-system`?"* — JSON-path query over node tags
- *"What's open AND tagged `B-0724`?"* — JSON-path query over task nodes filtered by tag
- *"What persona's last conversation referenced `Reticulum`?"* — full-text search over persona conversation nodes filtered by reference

Composes with:

- Max's `full-ai-cluster/k8s/applications/hat-system/graph/render.go` (Graphviz DOT extractor for the hat-graph at K8s scope) — same shape but for knowledge substrate
- Future agent tooling that consumes the extracted graph (substrate-engineering query primitive)

**After L5**: agents can programmatically query the knowledge substrate; humans browse via Obsidian graph view; both views compose; substrate-honest discovery becomes trivial.

## Why P2

The team uses Obsidian already; L1+L2+L3+L4 are conventions + light tooling that unlock immediate value. L5 is heavier (1-2 weeks) but the prerequisite for "agents can query the knowledge graph" — a key substrate primitive for the agentic-organization design Max landed in PR #4958.

Becomes P1 when the knowledge graph extraction becomes a load-bearing query surface for an agent workflow (likely once Max's TS hat-operator from B-0724 needs to programmatically discover which CRDs / rules / personas compose with hat-system at runtime).

## Acceptance (decomposes per-layer)

Each layer ships standalone; team picks adoption pace.

### L1 acceptance
- [ ] `tools/wikilink-converter/convert.ts` exists + tested
- [ ] All `[text](path.md)` internal-vault links converted to `[[shortname|text]]`
- [ ] Frontmatter `aliases: [...]` preserves backward compat
- [ ] GitHub still renders all links correctly
- [ ] Obsidian graph view shows the full semantic structure

### L2 acceptance
- [ ] `docs/CONVENTIONS-FRONTMATTER-TAGS.md` lists canonical tag vocabulary
- [ ] All `.claude/rules/*.md` carry frontmatter tags
- [ ] All `memory/persona/<name>/*.md` carry frontmatter tags
- [ ] All `docs/*.md` carry frontmatter tags

### L3 acceptance
- [ ] `docs/CONVENTIONS-CALLOUTS.md` documents the callout vocabulary + GitHub/Obsidian cross-compat notes
- [ ] Existing `> *[RECONSTRUCTION NOTE: ...]*` blocks in MANIFESTO.md migrated to `> [!note]` callouts
- [ ] Sample callouts added to high-value docs as examples

### L4 acceptance
- [ ] `docs/CONVENTIONS-TASKS.md` documents the enriched TODO format
- [ ] At least one existing doc with TODOs migrated to enriched format as worked example
- [ ] Convention referenced from `docs/AGENT-AUTHORING-AND-PR-REVIEW.md`

### L5 acceptance
- [ ] `tools/knowledge-graph/extract.ts` exists + tested
- [ ] `docs/knowledge-graph/knowledge-graph.jsonld` + `.json` regenerate on push to main via CI workflow
- [ ] Documented query patterns (JSON-path examples) for common questions
- [ ] At least one agent workflow demonstrates programmatic query against the extracted graph

## Composes with shipped substrate

- All `.claude/rules/*.md` — auto-loaded discipline becomes graph-queryable
- All `memory/persona/<name>/` — persona substrate becomes graph-queryable
- All `docs/backlog/P*/B-NNNN-*.md` — backlog rows already use frontmatter; the graph extraction makes dependency chains visible
- `docs/AGENT-AUTHORING-AND-PR-REVIEW.md` (just landed in PR #4976) — the curated entry-point doc references the existing substrate by markdown links; would become richer with the graph view
- `docs/governance/MANIFESTO.md` (just recast per B-0546 in PR #4976) — composes-with section becomes the natural graph-edge surface
- `full-ai-cluster/k8s/applications/hat-system/graph/render.go` (Max's hat-graph extractor at K8s scope) — same shape as L5 but for cluster CRD state; this row extends the pattern to the knowledge substrate

## Composes with framework rules

- `.claude/rules/skill-router-as-substrate-inventory.md` — substrate inventory becomes graph-queryable
- `.claude/rules/refresh-before-decide.md` — graph extraction surfaces what's current vs stale
- `.claude/rules/encoding-rules-without-mechanizing.md` — the wikilinks + tags + callouts are mechanization of currently-discipline-level practices
- `.claude/rules/wake-time-substrate.md` — the graph IS the wake-time substrate at machine-readable scope

## Standards survey (for substrate-honest context)

Semantic-web tier (HEAVY; not adopted for git-native substrate):
- RDF (W3C; triples) + OWL (ontology) + SPARQL (query)
- JSON-LD (RDF in JSON; lighter syntax; used in L5)
- SKOS (taxonomies)
- Schema.org (vocabulary)

Git-native light tier (THIS ROW'S FLOOR):
- Markdown + YAML frontmatter (universal)
- Obsidian vault format (de-facto standard for personal/team knowledge bases)
- Foam (VSCode-native Obsidian-compatible)
- Logseq (block-based; Obsidian-compatible vault)
- Dendron (VSCode + hierarchical; Obsidian-compatible)
- GFM tasks (universal on GitHub + Obsidian + Foam)

This row uses Obsidian as the canonical reference because the team already uses it; the substrate stays compatible with Foam / Logseq / Dendron (same vault format) so individual team members can pick their tool.

## Not in scope

- Adopting full RDF/OWL/SPARQL stack — too heavy for git-native; revisit if + when the framework needs federated semantic-web publishing
- Migrating off markdown to a different base format (e.g., Org-mode) — Org has powerful TODO + scheduling semantics but Emacs-specific; the team uses Obsidian which is broader
- Real-time collaborative editing (Roam / Logseq sync; Obsidian Sync) — git is the source-of-truth + sync mechanism; live-collab is a separate concern

## References

- Obsidian: https://obsidian.md/
- Foam: https://foambubble.github.io/foam/
- Logseq: https://logseq.com/
- Dendron: https://www.dendron.so/
- Obsidian Tasks plugin: https://publish.obsidian.md/tasks/
- Obsidian Dataview plugin: https://blacksmithgu.github.io/obsidian-dataview/
- W3C JSON-LD 1.1: https://www.w3.org/TR/json-ld11/
- GitHub Flavored Markdown callouts: https://docs.github.com/en/get-started/writing-on-github/working-with-advanced-formatting/organizing-information-with-tables (alerts section)
- Cytoscape JSON format: https://js.cytoscape.org/#notation/elements-json
- B-0546 (manifesto → building-codes recast — landed in PR #4976; same family of substrate-clarity work)
- B-0724 (TS hat-system operator — L5 extractor composes with Max's hat-graph render pattern)
- PR #4958 (agentic-organization docs — the design that benefits most from knowledge-graph query)

## Substrate-honest framing

The team's LexisNexis-era experience with RDF/OWL/SPARQL means everyone already groks the value of structured knowledge graphs. The git-native light-tier doesn't replace that capability; it ports the SHAPE to a substrate that respects the framework's other constraints (git as source-of-truth, markdown as universal format, weight-free routing, agent-readable plain text).

5 layers; each shippable standalone; team picks pace. The whole substrate compounds — each layer makes the next more valuable.
