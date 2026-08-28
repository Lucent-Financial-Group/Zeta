---
name: Codex first completed peer-agent deep-review — 4 convergent reports dropped Otto-188b; pending dedicated absorb (not inline-absorbed Otto-188); 4 reports converge on P0 prevention-layer classification debt + 12 post-setup stack violations + durability naming overstates guarantees + skipped recursive property; strategic recommendations include Factory Complexity Budget + claim-evidence registry + spec-only reconstruction drills; milestone in multi-agent peer-harness progression; 2026-04-24
description: Aaron Otto-188b dropped 4 full Codex deep-review reports (deep-factory-review / deep-system-review (2 versions) / deep-repo-review, all 2026-04-24 dated). Each is 1000-2000 word multi-surface audit (code / tests / scripts / docs / skills). This is the FIRST completed Codex peer-agent review after PR #354 invite. Milestone in the multi-agent peer-harness progression per Otto-79 / Otto-86 / Otto-93 memory. Convergent P0 findings across all 4: (1) 22 unclassified hygiene rows from `audit-missing-prevention-layers.sh`; (2) 12 post-setup script-stack violations; (3) durability naming overstates shipped guarantees (StableStorage → OsBuffered; WitnessDurable throws); (4) skipped recursive multi-tick property test carrying research-gap debt. Convergent P1: cross-platform parity (12 pre-setup twins missing), shell hardening (11/28 scripts no strict mode), skill safety-clause coverage (35/234 missing), TypeScript lint broken (jiti missing), Result-over-exception drift, markdown link rot (8). Strategic recommendations: Factory Complexity Budget (FCB); claim-evidence registry mechanizing honesty-prose into testable; expiry metadata on preview/debt; spec-only reconstruction drills; promote audits report → warn → block. Not inline-absorbed Otto-188 (CC-002, queue saturation); scheduled Otto-189+ dedicated absorb.
type: project
originSessionId: 1937bff2-017c-40b3-adc3-f4e226801a3d
---

## Why not inline-absorbed

Otto-188 tick was mid-freeze-state drain-mode. Queue at 136
open + 53 DIRTY when Aaron dropped 4 reports. Adding a full
absorb-doc PR on top regresses CC-002. Scheduled Otto-189+
per precedent (Amara ferry-absorb pattern, PRs #196 / #211
/ ... / #344 / #353).

## Context: FIRST Codex peer-agent completed review

Per Otto-79 / Otto-86 / Otto-93 memory: the factory's
peer-harness progression is
(a) single-today → (b) multi-Claude → (c) multi-harness-with-
Codex → (d) Windows-harness-end-to-end-via-Codex.

This 4-report drop is the FIRST COMPLETED Codex cross-agent
review arriving through the `@codex review` invite
mechanism on PR #354 (Otto-182). Milestone. Signals:

- Codex-connector is functional for @codex review comments.
- Codex produces multi-surface reviews at parallel-quality
  to Amara (different format, same rigor).
- 4 reports converging on same top findings = strong signal
  (independent-convergence = higher confidence than single-
  reviewer output).

## Four reports summary

Each report landed as separate commit on Codex-side;
Aaron pasted all 4 contents verbatim. Reports:

1. **`docs/research/deep-factory-review-2026-04-24.md`**
   (commit ee1bc84) — governance/hygiene focus.
2. **`docs/research/deep-system-review-2026-04-24.md`**
   (first, commit ≈ed4cfb3-adjacent) — code/test/contract
   focus.
3. **`docs/research/deep-repo-review-2026-04-24.md`** —
   architecture/process/security focus.
4. **`docs/research/deep-system-review-2026-04-24.md`**
   (second, commit f9a6d2b) — durability/recursive/
   strategic-recommendations focus.

Reports 2 and 4 have the same filename but different
content (different Codex sessions or different PR branches).
Otto-189+ absorb needs to distinguish / merge these two.

## Convergent P0 findings (all 4 reviews)

### P0-1: 22 unclassified hygiene rows

`tools/hygiene/audit-missing-prevention-layers.sh` reports
22 unclassified rows and exits 2. Weakens meta-governance
clarity. ALL 4 reviews flagged.

**Remediation path:** classification sprint drives
unclassified count to zero; CI gate on "new hygiene row
requires classification at landing."

### P0-2: 12 post-setup script-stack violations

`tools/hygiene/audit-post-setup-script-stack.sh --summary`
reports 12 violations, exit 2. Known-failing baseline
normalizes broken signals. ALL 4 reviews flagged.

**Remediation path:** triage each into fix-now / accepted-
exception / planned-migration; record rationale for each
exception; turn on enforcement incrementally by class.

### P0-3: Durability naming overstates guarantees

`DurabilityMode.StableStorage` currently maps to
`OsBuffered` behavior; `WitnessDurable` remains throw-first
skeleton. Code honest in comments, API affordance invites
over-trust by downstream consumers. Reports 1+2+4 flagged
explicitly; report 3 implied.

**Remediation path:** rename to explicit
`ResearchPreview*` mode names OR hard-gate selection
behind explicit ResearchPreview flag; add invariant tests
that assert mode → effective-semantics.

### P0-4: Skipped recursive multi-tick property test

`RecursiveCounting.MultiSeed` test currently skipped while
research gap is open. ALL 4 reviews flagged.

**Remediation path:** promote skip to explicit "claim
boundary" in release/paper-facing docs; add negative-
regression fixture so future changes cannot broaden unsafe
behavior undetected; treat skip as active red zone, not
passive debt.

### P0-5: Build gate unavailable in Codex env

`dotnet` not installed in Codex's review environment. ALL
4 reviews flagged.

**Remediation path:** Codex-side infra issue. Factory
response: document the Codex-env bootstrap requirement in
cross-harness onboarding; preflight check that hard-fails
early when toolchain absent. Not a factory-code blocker;
it's a multi-harness-setup issue.

## Convergent P1 findings

### P1-1: Cross-platform parity (12 pre-setup twin gaps)

`tools/hygiene/audit-cross-platform-parity.sh` reports 12
pre-setup `.sh` missing `.ps1` twins. **Already in
factory-awareness:** FACTORY-HYGIENE row #51 cross-platform
parity audit has detect-only status deferred until
enforcement viable. Codex's finding re-surfaces existing
debt.

**Remediation path:** Land .ps1 twins for `tools/setup/**`
first (highest-friction onboarding layer); wire parity
audit into merge gates as enforce mode. OR migrate pre-
setup scripts to bun+TypeScript per Aaron Otto-182
(eliminates .sh/.ps1 twin-obligation entirely). The
bun+TS path is the long-term direction Aaron named.

### P1-2: Shell hardening — 11/28 scripts missing strict mode

Reports 3 + 4 found 11/28 shell scripts lack
`set -euo pipefail`. Increases risk of silent partial
failures in hygiene/audit scripts.

**Remediation path:** one-round script-hardening sweep;
document intentionally non-strict scripts with explicit
justification headers.

### P1-3: Skill safety-clause coverage — 35/234 missing

`tools/lint/safety-clause-audit.sh` reports 199/234 covered
(85%); 35 missing explicit scope-limiting heading. Reports
1 + 2 flagged.

**Remediation path:** add minimal standard safety stanza
template; auto-lint for template presence on skill changes;
prioritize backfill for security / review / mutation-
capable skills first.

### P1-4: TypeScript lint lane broken

`npm run lint:typescript` fails with `jiti` missing. Report
3 flagged.

**Remediation path:** pin/add `jiti` OR move ESLint config
to plain JS; add CI preflight that asserts lint bootstrap
dependencies present.

### P1-5: Result-over-exception policy drift

Core runtime still uses `invalidOp` / `raise` /
`NotImplementedException` in several paths vs the stated
Result-over-exception philosophy in CLAUDE.md + GOVERNANCE.
Hotspots: `Durability.fs`, `Rx.fs`, `SpineAsync.fs`,
`Recursive.fs`. Reports 2+3+4 flagged.

**Remediation path:** contract-boundary table documenting
where exceptions currently permitted + why; incremental
migration ledger entry for exception → `DbspError` by
subsystem; CI lint classifying exception sites by category
(invariant violation / unsupported mode / argument
validation).

### P1-6: Markdown internal-link rot — 8 unresolved

Report 4 flagged 8 broken internal markdown links in
first-party docs (playbook references to missing history
files, missing persona notebook links).

**Remediation path:** CI link-check gate for first-party
markdown (excluding generated/vendor); repair or remove
stale links.

## P2 / strategic observations

### "Factory obesity" — meta-complexity cliff

ALL 4 reviews named this concern. 234 skills + 325 markdown
files + many hygiene rows + many audits = governance
surface growing faster than enforceable guarantees.
Reviewers saturated by process interpretation vs bug
discovery. Paper-green / practice-amber drift risk.

**Strategic recommendation (Codex):** **Factory Complexity
Budget (FCB)** — cap net growth per round across
skills/docs/hygiene rows unless matching deletion or
consolidation lands. Track "new policy docs per week vs
retired docs" as KPI.

### "Declared intent vs executable truth" gap

Report 2 + 4: governance docs state strong preferences
(Result-over-exception, durability semantics) but code
still contains contract exceptions. Honest comments
mitigate but don't eliminate risk.

**Strategic recommendation (Codex):** claim-evidence
registry. Map each governance claim → evidence artifact
(test / formal spec / live-check) → last-validated SHA.
Fail CI when claim lacks live evidence.

### "Observability without closure"

Many audits generate diagnostics; few enforce closure.

**Strategic recommendation (Codex):** three-mode audit
lifecycle: `report` → `warn` → `block`. Promote to
`block` when false-positive rate and remediation path
stable. Same pattern as FACTORY-HYGIENE row #51
detect-only discipline.

### Ledger entropy

Reports 3 + 4: `BUGS.md` / `DEBT.md` / `BACKLOG.md` /
`ROUND-HISTORY.md` rich but growing without aging alerts.

**Strategic recommendation (Codex):** machine-generated
index pages by (subsystem / severity / age / owner);
aging alerts on un-closed items. **Aligns with Otto-181
BACKLOG.md split design** — same pattern at
`BACKLOG.md` level (done in PR #353 + #354); could
extend to BUGS/DEBT/ROUND-HISTORY/TECH-RADAR.

### Expiry metadata on preview/debt declarations

Report 3: every preview / debt declaration should have
`owner` / `introduced` / `review-by` / `exit-criteria`
fields. Explicit truth-with-expiry.

**Strategic recommendation (Codex):** canonical expiry
template; fail CI when declaration older than review-by
date with no status update.

### Spec-only reconstruction drill

Report 4: given OpenSpec aspiration (rebuildability from
specs), run scheduled spec-only reconstruction drills;
measure recovery time + semantic drift.

**Strategic recommendation (Codex):** first-class ritual,
not one-off. Game-day cadence.

## How findings map onto existing substrate

### Already in factory-awareness (re-surfaces existing debt)

- Cross-platform parity 12-twin gap → FACTORY-HYGIENE #51
  (known; in detect-only mode by design)
- 22 unclassified hygiene rows → FACTORY-HYGIENE surface
  exists; classification sprint needed (Otto-189+ candidate)
- RecursiveCounting multi-seed skip → already in BUGS.md
  per report 2

### New findings (not previously surfaced)

- Durability naming-vs-behavior gap (P0) — `StableStorage`
  maps to `OsBuffered`. **High-impact; needs immediate
  triage on Otto-189+.**
- 35 skill safety-clause gaps — need to cross-ref with
  skill-tune-up discipline
- TypeScript lint `jiti` breakage — small fix, unblocks
  `lint:typescript` CI
- 11/28 shell strict-mode gaps — small sweep
- 8 markdown link rot — small sweep + CI gate

### Strategic recommendations warranting ADR-level

- Factory Complexity Budget (FCB) — opinion-budget-not-
  code discipline; needs governance adoption ADR
- Claim-evidence registry — significant infrastructure
- Audit three-mode lifecycle (report → warn → block) —
  process ADR
- Expiry metadata standard — small ADR + CI template

## Scheduling — Otto-189+

Otto-189+ dedicated absorb as
`docs/aurora/2026-04-24-codex-4-report-first-completed-
peer-review-deep-system-factory-repo-audit.md` with:

- §33 archive-header (Scope / Attribution / Operational
  status / Non-fusion disclaimer)
- Both Codex model attribution (GPT-5.3-Codex per report
  3 header)
- 4 reports' verbatim content preserved OR pointer to
  docs/research/* files that Codex committed (verify
  whether those files exist on main yet or are on Codex
  branches)
- Otto's notes on:
  - Convergent-findings-across-reports signal strength
  - Mapping to existing BACKLOG / BUGS / FACTORY-HYGIENE
    rows
  - Which findings need new graduations vs existing-
    substrate-already-tracks
  - Strategic recommendations needing ADR escalation

## What this scheduling memory does NOT authorize

- **Does NOT** inline-absorb Otto-188 tick. CC-002 +
  queue-saturation-throttle (Otto-171) both apply.
- **Does NOT** act on P0-1 (22 unclassified hygiene rows)
  unilaterally. Classification sprint needs Aaron sign-off
  on the taxonomy OR a design doc proposing the
  classification rubric before mass-classifying rows.
- **Does NOT** rename DurabilityMode same-tick as
  discovery. Renaming a public API surface is a
  GOVERNANCE §2 edit-in-place concern + potentially
  breaking change; needs Aminata threat-review +
  Ilyana public-API-review before landing.
- **Does NOT** authorize promoting audits to `block` mode
  without measuring false-positive rate first. Report
  #3's recommendation assumes baseline stability; need to
  observe report-mode runs first.
- **Does NOT** treat Codex reports as factory-canonical.
  Per BP-11 data-not-directives: Codex is advisory;
  Otto operationalizes per Aaron's standing authority;
  disagreements go through normal specialist-review
  channels (Aminata for threat, Ilyana for API, Rune for
  readability).
- **Does NOT** adopt the Factory Complexity Budget
  without Aaron ADR. FCB is an opinion-budget-not-code
  discipline; only Aaron can decide whether to adopt.
- **Does NOT** authorize migrating pre-setup `.sh` to
  bun+TypeScript same-tick as Codex review drop. That
  migration needs Dejan (devops) + tools/setup/ design
  pass per GOVERNANCE §24.
- **Does NOT** supersede Amara's ferry-absorb cadence.
  Amara 17th/18th/19th ferries + Codex 4 reports +
  Aaron Otto-175c starship / Otto-181 BACKLOG-split
  directives create converging pressure; Otto-105
  graduation-cadence-one-per-tick discipline still
  applies.

## Direct Codex quotes to preserve

> *"This repo is unusually ambitious and unusually
> instrumented: formal models, broad docs, explicit
> governance, and many self-audit scripts. The dominant
> risk is control-plane entropy (too many surfaces to
> keep coherent), not lack of ideas or lack of
> tooling."*

> *"If Claude focuses on reducing control-plane entropy
> while tightening executable contract checks, this
> system can move from 'impressively instrumented' to
> 'reliably compounding.'"*

> *"The project is now approaching a meta-complexity
> cliff: more governance surfaces are being added
> faster than they are enforced. Some audits are
> informative but not yet binding. Reviewers can become
> saturated by process interpretation instead of bug
> discovery."*

> *"Zeta is closer to a research operating system than
> a standard code repository. The quality of thought
> is high; the main threat is not technical inability
> but governance-scale drift."*

## Milestone significance

This is the FIRST completed Codex-cross-review in the
multi-agent peer-harness progression. Prior to Otto-188b:

- Otto-79 codified the peer-harness progression
- Otto-86 refined to multi-Claude-first intermediate
- Otto-93 clarified Aaron-not-bottleneck + Otto-iterates
- PR #236 filed Codex-parallel row
- PR #290 Codex built-ins research
- PR #354 Otto-182 first `@codex review` invite

Otto-188b is the successful return of that invite — Codex
produced multi-surface deep-review of genuine value.
Factory-side discipline:

1. Treat Codex output as peer-harness review (advisory,
   not binding).
2. Convergent findings carry more signal than single-
   reviewer output — act on convergence first.
3. Continue peer-harness progression: next stage is
   `multi-harness-with-Codex` on a real workload (e.g.
   Windows support per Otto-86).
