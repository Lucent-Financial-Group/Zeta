---
id: B-0154
priority: P1
status: open
title: GitHub Pages for SEO/discoverability + GitHub Wiki first-class integration (Aaron 2026-05-01)
created: 2026-05-01
last_updated: 2026-05-01
depends_on:
  - B-0047
---

# B-0154 — GitHub Pages for SEO/discoverability + GitHub Wiki first-class

## What

Aaron 2026-05-01 directional input — two distinct host integrations, ordered by priority:

1. **Higher priority — GitHub Pages for SEO/discoverability**
2. **Lower priority — GitHub Wiki as first-class integration**

Aaron's framing:

> *"we should use github in two ways for this, 1 see about
> integrating with github wiki as first class, and 2 this one
> is higher priority, github pages, once that gets indexed by
> the search engines, we will have maintainers about to find
> us from google search with out that we are never goona rank
> on the search results not even for DBSP F#"*

## Why now

**Discoverability bottleneck.** Without GitHub Pages publishing
indexable content, Zeta is invisible to search-engine-based
maintainer discovery. Currently:

- Pages is **enabled at the host level** with URL
  `https://lucent-financial-group.github.io/Zeta/` allocated
- BUT the URL **returns HTTP 404** — `status: null` in the
  Pages API; no successful build has happened
- `build_type: workflow` means it expects a custom GitHub
  Actions workflow to publish, which doesn't exist yet
- **404 is worse than no Pages**: Google may index and remember
  the URL as broken, suppressing future ranking even after
  content lands
- Repo `topics` is empty — pure SEO miss; topics get indexed
  and surfaced in GitHub search and Google

**Result**: even queries as specific as "DBSP F#" won't surface
Zeta on the first page of search results. Maintainer-recruit
funnel is broken at the discovery step.

## Phase 1 — GitHub Pages (P1, blocking discoverability)

### Acceptance criteria

1. **Pages publish workflow** at
   `.github/workflows/pages-deploy.yml` that:
   - Triggers on push to `main` (and `workflow_dispatch`)
   - Builds the Pages content from a designated source
     (likely `docs/site/` or generated from `docs/` tree)
   - Uses `actions/upload-pages-artifact@vX` +
     `actions/deploy-pages@vX` (SHA-pinned per
     `docs/FACTORY-HYGIENE.md` row #43)
   - Concurrency group + `cancel-in-progress: false`
   - Minimum permissions (`pages: write`, `id-token: write`)

2. **Static-site generator choice** — candidate options:
   - **Jekyll** (GitHub-native, default, zero-build-config)
   - **MkDocs Material** (Python-based, popular for technical
     docs, good search integration)
   - **Docusaurus** (React-based, heavier, good if we want
     React-y interactive demos)
   - Decision factor: which one renders the existing
     `docs/**.md` tree with minimum rewrite. Default to
     Jekyll unless evidence points elsewhere.

3. **Content sources for the Pages site**:
   - `README.md` → landing page
   - `docs/VISION.md` → "About" page
   - `docs/ALIGNMENT.md` → "Alignment" page
   - `docs/GLOSSARY.md` → reference
   - Selected `docs/research/` deep-research pages →
     "Research" section
   - Excluded from Pages: `memory/`, `docs/hygiene-history/`,
     `docs/backlog/`, ADRs (these stay internal-substrate)

4. **SEO-friendly metadata on every page**:
   - `<title>` matches H1
   - `<meta name="description">` derived from first paragraph
     or explicit frontmatter
   - Canonical URL via `<link rel="canonical">`
   - Open Graph + Twitter Card tags for social-link previews
   - JSON-LD structured data (`SoftwareApplication` /
     `Organization` / `Article` types as appropriate)

5. **`robots.txt` + `sitemap.xml`** — both auto-generated
   by Jekyll plugins (`jekyll-sitemap`) or MkDocs equivalents.
   `robots.txt` allows all crawlers except for explicit
   no-index paths.

6. **Repo metadata SEO win**:
   - `topics`: add `dbsp`, `fsharp`, `dotnet`,
     `incremental-computation`, `streaming-database`,
     `differential-dataflow`, `database`, `query-engine`,
     `formal-verification`, `tla-plus` (12 topics is GitHub
     max)
   - `description`: keep current "F# implementation of DBSP
     for .NET 10" (concise + keyword-rich)
   - `homepage`: stay pointed at the Pages URL

7. **Sitemap submission** — once Pages is live, submit
   sitemap to Google Search Console + Bing Webmaster Tools.
   Manual one-time action.

### Anti-patterns this guards against

- **404-stall**: enabled Pages with no content rotting at
  the URL. Either publish content NOW or disable Pages
  until ready (don't leave 404 indexed).
- **Spammy keyword-stuffing**: topics + description should
  be honest + technical. Don't stuff buzzwords; rank for
  what we genuinely are.
- **Re-indexing trap**: don't change URL structure post-
  launch. Get the URL scheme right ONCE, stick with it.
  Google penalizes broken redirects and orphaned URLs.

### Success signal

- `https://lucent-financial-group.github.io/Zeta/` returns
  HTTP 200 with substantive content
- `site:lucent-financial-group.github.io zeta` returns hits
  on Google within 7-14 days post-publish
- Query "DBSP F#" returns Zeta on the first page within
  4-8 weeks (depends on backlinks + crawl rate)
- Maintainer-recruit funnel: at least one external
  contributor finds us via search within 90 days post-launch

## Phase 2 — GitHub Wiki (P2, after Pages)

### Acceptance criteria

1. **Wiki seeded with initial pages**:
   - `Home` — same scope as Pages landing
   - `Architecture` — DBSP overview + F# implementation
     notes + Z-set algebra
   - `Contributing` — same as `CONTRIBUTING.md` (or pointer)
   - `Glossary` — same as `docs/GLOSSARY.md`

2. **First-class integration** — TBD which shape:
   - **Option A — sync from in-repo source**: a workflow
     that publishes selected `docs/wiki-source/` files to
     the wiki repo on each commit
   - **Option B — wiki-as-canonical-then-mirror-into-repo**:
     wiki edited via GitHub UI; periodic snapshot pulled
     into `docs/wiki-snapshot/` for git-native preservation
     per Glass Halo discipline
   - Decision deferred to Phase 2 implementation; Option A
     is more git-native + automation-friendly

3. **Wiki vs Pages division** — clarify which content lives
   where:
   - **Pages** — public-facing marketing/landing/intro
     content + research papers + getting-started; optimized
     for SEO
   - **Wiki** — internal-but-public knowledge base;
     architecture deep-dives; pattern catalogs; not
     necessarily SEO-optimized; community-editable
     potential

### Composes with the Karpathy LLM Wiki pattern

Aaron 2026-05-01 surfaced the Karpathy LLM Wiki pattern from
ServiceTitan AI Slack channel. Three-layer architecture:
raw sources / interlinked-markdown wiki / schema. The factory's
existing `memory/` + memory-edge schema (PR #1123) is
structurally the same pattern.

GitHub Wiki could be the **human-facing rendering** of the
factory's Karpathy-style internal substrate — same flat-file
interlinked-markdown shape, just rendered through GitHub's
wiki UI for browsability.

## Out of scope (defer)

- **Custom domain** (e.g., `zeta.lucent-financial.com`) —
  separate decision; Pages works fine on the
  `*.github.io` subdomain for SEO
- **Analytics integration** (GA4, Plausible, etc.) —
  separate row; not required for SEO indexing
- **Comment systems** (Giscus, etc.) — separate row
- **Landing page redesign** — initial Pages site can be
  minimal Jekyll default theme; visual redesign is later
- **Full marketing copy** — that's B-0047 (P3 umbrella);
  this row is the discoverability infrastructure that
  enables the marketing copy to land

## Composes with

- B-0047 (P3 PR / marketing / SEO / GTM umbrella) — this
  row is the focused-execution leaf that B-0047's umbrella
  named in the abstract
- B-0109 (dependency-status-tracking-surface) — public
  surface for dependency state; could be a Pages section
- `memory/feedback_amara_cross_substrate_report_2_repo_search_mode_drift_taxonomy_aurora_2026_04_22.md`
  — search-mode drift considerations
- `memory/feedback_assumed_state_vs_actual_state_audit_horizon_check_aaron_2026_05_01.md`
  — the assumed-state pattern (the 404-stall finding here is
  exactly an assumed-state-vs-actual-state miss in the host
  config)
- `memory/feedback_github_settings_as_code_declarative_checked_in_file.md`
  — the declarative-settings-as-code discipline; Pages
  workflow IS this discipline applied
- `memory/feedback_agent_owns_all_github_settings_and_config_all_projects_zeta_frontier_poor_mans_mode_default_budget_asks_require_scheduled_budget_2026_04_23.md`
  — Aaron's standing authorization for agent-owned GitHub
  settings; this row falls under that authorization
- `memory/project_factory_is_git_native_github_first_host_hygiene_cadences_for_frictionless_operation_2026_04_23.md`
  — git-native + GitHub-first-host framing; Pages + Wiki
  are GitHub-first-host surfaces
- B-0143 (bi-directional messaging with Aaron + four-corner
  hat-color/WWJ) — Aaron's communication channels; Pages
  could surface a "contact" page

## Effort

**M (medium, 1–3 days)** for Phase 1 (Pages workflow + initial
content + topics + sitemap). **S (small, under a day)** for
Phase 2 (Wiki seeding + initial pages) — but only after
Phase 1 ships and we've learned the publish cycle.

## Why P1 (not P0 / not P2)

- **Not P0** because the factory functions today without
  Pages; this is a discoverability/recruitment unlock, not
  a correctness fix
- **Not P2** because Aaron explicitly named Pages as
  "higher priority" and named the consequence — *"never
  gonna rank on search results not even for DBSP F#"* — as
  a current-state failure mode that compounds with time
  (every day without Pages is another day of unindexed
  content). The longer the 404 sits at the Pages URL, the
  worse the indexing damage.
- **P1** because shipping the factory-demo (task #244, P0)
  and recruiting external maintainers both depend on
  external discoverability, which depends on this work.

## Mechanization candidate

The Pages publish workflow IS the mechanization. After
Phase 1 ships, every push to main re-builds the site
automatically — no manual republish step. Same shape as
the existing CI workflows.
