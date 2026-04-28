---
name: ServiceTitan naming + scope-of-org-access rule — generic "external UI demo" forward-going; ServiceTitan named only in funding-chain disclosure context (Aaron, 2026-04-28)
description: Aaron 2026-04-28 framing — *"servicetitan-factory-demo-api-csharp we can just say external UI demo or something like that, we don't have to say service titan anywhere in this repo other than to say that's my day job, they fund me, i fund you, and you don't have org rights to their github only the lfg."* Two coupled rules — (1) forward-going naming uses generic "external UI demo" / "external CRM API demo" / similar; ServiceTitan name avoided in code, sample dirs, file paths, public docs; (2) structural disclosure of the funding/access chain (ServiceTitan = Aaron's day job → funds Aaron → funds Otto; Otto's org-access scope = LFG only, NOT ServiceTitan) is preserved where relevant in governance/contributor docs. Operationalizes scope-of-org-access discipline alongside Beacon-safe naming.
type: feedback
---

# ServiceTitan naming + scope-of-org-access rule

## The rule (Aaron 2026-04-28T23ish)

> *"servicetitan-factory-demo-api-csharp we can just say
> external UI demo or something like that, we don't have to
> say service titan anywhere in this repo other than to say
> that's my day job, they fund me, i fund you, and you don't
> have org rights to their github only the lfg."*

Two coupled rules in one ask:

### Rule 1 — Forward-going naming uses generic terms

In code, sample directories, file paths, public-facing docs,
demo names, commit messages going forward — use generic
naming, NOT "ServiceTitan."

Preferred generic forms:

- "external UI demo"
- "external CRM API demo"
- "external SaaS-API demo"
- "third-party-API demo"
- "factory-demo" (already partially adopted per task #244)

Avoid:

- ServiceTitan
- servicetitan
- service titan
- Service Titan
- ST (when used as a ServiceTitan abbreviation)

### Rule 2 — Structural disclosure preserved where load-bearing

The funding chain + org-access scope IS load-bearing context:

- **ServiceTitan = Aaron's day job** (employer / income source)
- **Funding chain:** ServiceTitan → Aaron → Otto
- **Org-access scope:** Aaron has org rights to **LFG (Lucent
  Financial Group) ONLY**, NOT to ServiceTitan's GitHub org

Preserve this disclosure where it's contributor-relevant:

- `CURRENT-aaron.md` (already has the funding context)
- `AGENTS.md` / `GOVERNANCE.md` (org-access scope for any
  contributor who might assume cross-org access)
- Any doc that names Aaron's funding source for transparency

Don't scrub the relationship; just don't bleed the brand into
code/sample/demo naming.

## Why both rules together

The forward-going naming rule and the structural disclosure
rule serve different purposes:

- **Naming rule** prevents **trademark / brand collision**
  — Zeta is open-source, public; using a private employer's
  trademarked name in code or sample directories creates
  legal risk + confusion.
- **Disclosure rule** prevents **agency-model opacity** —
  contributors need to know the funding chain + org-access
  scope to understand why some integrations require LFG-side
  work but not ServiceTitan-side. Without disclosure,
  contributors might assume Otto can do something across orgs
  that he can't.

Both rules compose with the **input-is-not-directive
provenance framing** — accurate provenance (where the funding
came from, what scope the maintainer has) is preserved without
implying command authority.

## Audit findings (2026-04-28)

Live-repo ServiceTitan references found via:

```bash
rg -i 'service ?titan' \
   --glob '!**/memory/**' \
   --glob '!**/docs/research/**' \
   --glob '!**/docs/aurora/**' \
   --glob '!**/docs/amara-full-conversation/**' \
   --glob '!**/docs/hygiene-history/**' \
   --glob '!**/docs/pr-preservation/**' \
   --glob '!**/docs/decision-proxy-evidence/**'
```

12 files matched. Classification (per the cadenced-audit
rubric):

| File | Classification | Action |
|---|---|---|
| `docs/plans/servicetitan-crm-ui-scope.md` | **PATH-RENAME** — file path itself contains the term | rename to e.g. `docs/plans/external-crm-ui-scope.md` + update body |
| `samples/FactoryDemo.Db/README.md` | **BODY-REWORD** — naming context | rewrite to use "external UI demo" |
| `docs/FACTORY-DISCIPLINE.md` | **MIXED** — could be naming or structural disclosure | inspect line-by-line |
| `docs/pitch/README.md` | **PUBLIC-FACING** — naming | rewrite to use generic forms |
| `docs/BACKLOG.md` | **AGGREGATE** — references per-row files | regenerate after per-row updates |
| `docs/backlog/P2/B-0017-*.md` | **PER-ROW** — naming | rewrite |
| `docs/backlog/P2/B-0090-*.md` | **PER-ROW (this session)** — needs immediate fix | rewrite to remove ServiceTitan mention I just introduced |
| `docs/backlog/P3/B-0008-*.md` | **PER-ROW** — naming | rewrite |
| `docs/ROUND-HISTORY.md` | **HISTORICAL NARRATIVE** — preserve verbatim | no action; history surface |
| `docs/force-multiplication-log.md` | **HISTORICAL NARRATIVE** | no action |
| `tools/alignment/out/round-39/citations.json` | **GENERATED ARTIFACT** | regenerate; or accept as historical |
| `tools/alignment/out/round-39/citations.dot` | **GENERATED ARTIFACT** | regenerate; or accept as historical |

Live-cleanup scope: 8 files need active rewriting; 2 are
historical narratives that stay verbatim; 2 are generated
artifacts.

## Composes with

- **Otto-279** (named-agents-get-attribution-credit) —
  attribution preservation discipline; this rule preserves
  the funding-chain disclosure but separates it from
  brand-bleed.
- **Beacon-safe naming family** (Mirror→Beacon vocabulary
  upgrade) — same shape: rename internal coinages to
  externally-portable terms; preserve the underlying
  semantics.
- **Visibility constraint rule** (Aaron 2026-04-28) —
  shared-prod-state changes need maintainer visibility;
  Otto's org-access scope = LFG only is the visibility
  boundary that this rule preserves explicit.
- **Authority rule** (default to reversible preservation) —
  the audit-and-rename work is reversible (rename is
  reversible; redaction is not). Default action.

## Worked example for B-0090 (this session)

I just wrote B-0090 with the line:
*"renamed from ServiceTitan"* in the rationale for marking
the worktree branches OBSOLETE.

That violates Rule 1. The fix: replace "renamed from
ServiceTitan" with "renamed to remove brand-bleed naming"
or "renamed per the external-UI-demo discipline" or simply
"intentionally retired as obsolete naming."

Same fix needed for any other backlog row I author going
forward.

## Pickup for future Otto

When tempted to write "ServiceTitan" in a code path, sample
directory, demo name, public doc, or commit message:

1. Stop. Use a generic alternative ("external UI demo",
   "external CRM API demo", etc.).
2. If the context genuinely requires the brand name (funding-
   chain disclosure, org-access scope), keep it precise and
   in a structural-disclosure context — not in code/demo/
   sample naming.
3. Audit nearby files; if the term appears, file it on the
   B-0091 audit-and-rename queue.

When asked "what's Aaron's day job":

1. Answer truthfully: ServiceTitan.
2. Cite the funding chain: ServiceTitan → Aaron → Otto.
3. Cite the org-access scope: LFG-only, NOT ServiceTitan.
4. Don't propagate the brand name into code or
   sample naming.

## What this rule does NOT do

- **Does NOT** scrub historical surfaces. ROUND-HISTORY.md,
  force-multiplication-log.md, memory/*, docs/research/*,
  amara-conversation archives stay verbatim.
- **Does NOT** require renaming the worktree branch
  `feat/servicetitan-factory-demo-api-csharp`. That branch
  is in `.claude/worktrees/` (lost-substrate surface);
  classified OBSOLETE per the cadenced-recovery audit. The
  branch name is part of the historical record of work-in-
  progress; it stays.
- **Does NOT** require changing any AceHack repo.
  AceHack's worktree state is its own; this rule applies
  to LFG (the project trunk) and forward-going work.
- **Does NOT** apply to Aaron's personal communication
  channels. Aaron mentioning ServiceTitan in chat / Slack /
  email is his own substrate; this rule is about repo-
  resident substrate.

## Direct Aaron framing

> *"servicetitan-factory-demo-api-csharp we can just say
> external UI demo or something like that, we don't have to
> say service titan anywhere in this repo other than to say
> that's my day job, they fund me, i fund you, and you don't
> have org rights to their github only the lfg."*

Translation:
- Forward-going code / demo / sample naming → generic.
- Structural disclosure (day job, funding chain, org-access
  scope) → preserved precisely.
- Otto's org-access scope is **LFG-only**, not ServiceTitan.
