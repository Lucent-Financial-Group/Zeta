# CI/CD retractability inventory — Round 38 (part a)

This document enumerates every CI/CD surface the Zeta factory
operates or depends on, names the retraction mechanism each
surface offers, and identifies the surfaces where no retraction
mechanism exists so that they can be treated as *named
exceptions* with defender-persona ownership (parallel to the
`no-empty-dirs` allowlist pattern).

Scope is part (a) of the BACKLOG P0 "Fully-retractable CI/CD"
entry. Parts (b)-(e) (declared-mechanism comment blocks per
workflow, CI-audit job that fails the build on a new workflow
file without a declared mechanism, inventory-adversarial audit
by `threat-model-critic`, ADR for the retraction-window cadence)
will land in subsequent rounds.

## Framing — the retraction-clause bar

The Zeta=heaven formal statement's H₂ clause
(`docs/research/zeta-equals-heaven-formal-statement.md` §2.2
"fully-retractable") requires that every action in the factory
have a declared retraction mechanism in one of four classes:

1. **revertable-in-git** — the action's effect is encoded
   entirely in repo state, and `git revert <sha>` + a
   subsequent CI run restores the prior effect.
2. **retryable-idempotently** — the action has no persistent
   side-effect at all, so re-running it with the same inputs
   yields the same result; "retraction" is a no-op.
3. **republishable-with-same-version** — the action published
   an artefact with a versioned identity, and the same version
   name can be republished with corrected content (with an
   unpublish window or CRL where the external consumer has
   to be told about the correction).
4. **genuinely non-retractable** — the action irreversibly
   exposed a key, reused a nonce, or otherwise emitted a
   one-shot cryptographic commitment. These surfaces cannot
   be retracted; they can only be mitigated (rotate key,
   revoke certificate, publish incident bulletin) and must
   be minimised.

The "channel-closure" h₂ attack shadow
(`docs/security/THREAT-MODEL.md` §"Channel-closure:
retractability (h₂)") is the dual: any CI/CD surface without
a declared retraction mechanism is a candidate channel-closure
vector. Naming the mechanism is how we certify the surface
is *in* the H₂ cone rather than a silent h₂ leak.

## Inventory — by file / surface

### 1. `.github/workflows/gate.yml`

**What it is.** The primary CI workflow; runs on every PR to
main and every push to main. Contains six jobs:

| Job | Purpose | Retraction class |
|---|---|---|
| `build-and-test (ubuntu-22.04)` | `dotnet build` + `dotnet test` on Linux | retryable-idempotently |
| `build-and-test (macos-14)` | same, on macOS | retryable-idempotently |
| `lint (semgrep)` | static analysis, syntactic | retryable-idempotently |
| `lint (actionlint)` | workflow-file lint | retryable-idempotently |
| `lint (no empty dirs)` | directory-structure lint | retryable-idempotently |
| `lint (shellcheck)` | shell-script lint | retryable-idempotently |
| `lint (markdownlint)` | markdown lint | retryable-idempotently |

**Workflow-file retraction.** The workflow file itself is
**revertable-in-git**. Any change to gate.yml lands as a
normal commit and can be reverted like any source file.

**Job effects.** All jobs in gate.yml are read-only against
the repo + runner + external registries (NuGet package
download, GitHub Action download via SHA pin, mise-pinned
toolchain fetch). None write to any persistent store outside
the ephemeral runner. Retraction is a no-op — failing a
job just blocks the PR; passing a job has no side-effect
that needs undoing.

**Verified via.** `gate.yml` header comment names
"permissions: contents: read at the workflow level; no job
elevates. No secrets referenced." The zero-secret posture is
the strongest retraction primitive for this workflow.

### 2. `.github/workflows/codeql.yml`

**What it is.** Weekly + per-PR CodeQL semantic analysis.
Two jobs: `Analyze (actions)` and `Analyze (csharp)`. The
csharp leg uses `build-mode: manual` to produce an IL-level
CodeQL database against compiled artefacts (per Round 34
tuning; default `build-mode: none` was effectively a no-op
on the F#-first repo).

**Workflow-file retraction.** `codeql.yml` is
**revertable-in-git**.

**Job effects.** CodeQL uploads a SARIF result to the
Security → Code scanning tab. The SARIF upload is
**republishable-with-same-version**: a subsequent run
overwrites the previous SARIF for the same `(tool, ref,
category)` triple. No external artefact published.

**Permissions.** `security-events: write` is the only
elevated permission; limited to SARIF upload. No secrets.

### 3. `.github/dependabot.yml`

**What it is.** Dependabot configuration for NuGet
dependency monitoring + PR generation.

**File retraction.** Revertable-in-git.

**Dependabot-action retraction.** Dependabot opens PRs
when a new version of a tracked dependency is available.
Each PR is a normal revertable unit: merge-to-revert if
the bump breaks CI. Auto-merge is not enabled (per
current `.github/dependabot.yml`); human review gates
every dependency bump.

### 4. `.github/copilot-instructions.md`

**What it is.** Factory-managed external-reviewer contract
per GOVERNANCE §31. Not a workflow file, but lives on
the CI/CD audit surface because external reviewers act
on PRs.

**Retraction.** Revertable-in-git. Audited on the same
cadence as `.claude/skills/*/SKILL.md` per the skill-tune-up
procedure.

### 5. `.mise.toml` + `tools/setup/install.sh` + `tools/setup/manifests/`

**What it is.** Toolchain pinning for dev laptops, CI
runners, and (future) devcontainer images per GOVERNANCE
§24 three-way parity.

**Retraction.** Revertable-in-git at every layer. The
install script is idempotent; running it again with a
prior manifest re-installs the prior toolchain versions
on CI runners (which are fresh per-run). Dev laptops
require an explicit `mise install` after a revert to
pick up the reverted version — named ergonomic caveat,
not a retraction-class violation.

### 6. Third-party actions pinned by SHA

**What it is.** Every `uses:` in the workflow files is
pinned by full 40-char commit SHA (not tag, not branch)
per the workflow-design discipline. Current surface:

- `actions/checkout@de0fac2e4500dabe0009e67214ff5f5447ce83dd` (v6.0.2)
- `actions/cache@27d5ce7f107fe9357f9df03efb73ab90386fccae` (v5.0.5)
- `actions/setup-node@2028fbc5c25fe9cf00d9f06a71cc4710d4507903` (v6.0.0)
- `actions/setup-python@a309ff8b426b58ec0e2a45f0f869d46889d02405` (v6.2.0)
- `github/codeql-action/*` (SHA-pinned in codeql.yml)

**Retraction.** Revertable-in-git at the pin level: change
the SHA back. *Named exception* for the case where a
compromised SHA has already run: the run-effects are not
directly retractable (the action executed with its own
code, inside the runner VM, with access to whatever the
runner could see). The controls are compensating, not
retracting:

- Zero-secret posture on gate.yml limits blast-radius of a
  compromised action to "runner-local theft" — no exfil
  target of consequence inside the runner.
- `security-events: write` on codeql.yml is the only
  elevated permission across the entire CI surface;
  compromise of the CodeQL action itself would be a
  GitHub-managed incident.

**Owner.** `security-operations-engineer` (Nazar) for the
compensating-controls side; `devops-engineer` (Dejan) for
the pin-rotation cadence.

### 7. GitHub Actions cache (NuGet / mise / elan / verifier jars)

**What it is.** `actions/cache@<sha>` entries keyed by
content hashes (e.g. `hashFiles('**/Directory.Packages.props')`
for NuGet; `hashFiles('tools/setup/manifests/**')` for mise).
Lives in GitHub-Actions-hosted storage, not in the repo.

**Retraction.** **Partially retractable**. Three cases:

- **Key-change** retraction: any change to the hashed input
  produces a new cache key; the old entry becomes
  unreferenced and GitHub evicts it on its schedule.
  This is the common path.
- **Explicit eviction** retraction: `gh api` + the cache-
  management endpoints can delete a specific cache entry
  by key. Manual; not wired into a script today.
- **Cache-poisoning** non-retraction: if a poisoned artefact
  lands in a cache entry, deleting the entry does not undo
  the effects of any build that already consumed it. This
  is the non-retractable core; mitigation is SHA-pinned
  toolchains (the poisoned cache content has to still
  pass the hashed-input guard).

**Owner.** `devops-engineer` (Dejan). Named exception status
recorded here; a manual-eviction helper script is a
follow-up scope for part (b).

### 8. Runner images (`ubuntu-22.04`, `macos-14`)

**What it is.** GitHub-hosted runner images, pinned to
major-OS-version labels (not `ubuntu-latest` / `macos-latest`)
per gate.yml design discipline.

**Retraction.** *Named exception*. GitHub rolls the image
contents under a fixed label on its schedule; we do not
control the image. If a roll breaks our build, the retraction
is: (i) pin to a previous image digest via
`runs-on: ubuntu-22.04-<YYYYMMDD>` if GitHub exposes it, or
(ii) open an incident with GitHub, or (iii) switch to a
self-hosted runner. None of those is instant.

**Owner.** `devops-engineer` (Dejan). GOVERNANCE §23 names
runner pinning as a Dejan surface.

### 9. GitHub Actions OIDC tokens / per-job `GITHUB_TOKEN`

**What it is.** Ephemeral per-job tokens GitHub mints for
the runner. Expire at job completion; never re-used.

**Retraction.** **Genuinely non-retractable while live** —
but they are *designed* to be retraction-class-zero by
being short-lived. Blast-radius is one job's duration.

**Owner.** `security-operations-engineer` (Nazar). The
mitigation is the token lifecycle itself; no additional
retraction plumbing is needed.

### 10. GitHub Actions secrets (NOT CURRENTLY USED)

**What it is.** Zeta's gate.yml explicitly names "No
secrets referenced." The repo carries no repository- or
organisation-scoped secrets wired into CI today.

**Retraction.** *Not applicable* — no secret to rotate,
no key to revoke, no credential to expire.

**Future scope — when NuGet push lands.** The BACKLOG
"submit-nuget" future entry will introduce a NuGet API
key or an SLSA-signing certificate. At that point:

- The signing key becomes a **genuinely-non-retractable**
  surface: a compromised signature is permanent evidence
  that a specific bit-sequence was blessed by the key.
  Mitigation is rotation + CRL + reissue, not retraction.
- The NuGet publish step becomes a
  **republishable-with-same-version** surface: NuGet
  supports package list/unlist and republish with same
  version (see `docs/UPSTREAM-LIST.md` entry on NuGet
  metadata hygiene). The consumer-experience retraction
  is via a version-bump (`X.Y.Z` → `X.Y.Z+1`) with a
  release-notes unpublish advisory.
- At that point this inventory gets a new row and the
  CI-retractability audit job (part e) MUST refuse to
  land the new workflow without declared retraction
  mechanisms on both surfaces.

**Owner.** `security-operations-engineer` (Nazar) for the
signing-key lifecycle; `devops-engineer` (Dejan) for the
pipeline wiring.

### 11. Branch-protection rules on `main`

**What it is.** GitHub-server-side configuration setting
who-can-push, what-checks-must-pass, whether force-push
is allowed on main. Configured via GitHub UI / API, not
via any file in the repo.

**Retraction.** *Named exception*. Two sub-cases:

- **Revert the config.** The current state can be modified
  via the admin panel or `gh api`; reverting a bad config
  change requires admin privilege. This is admin-panel
  retractable, not git-retractable.
- **Retract an action already allowed by a broken config.**
  If branch-protection was mis-set and a bad commit landed
  on main during that window, the commit is standard-git
  retractable via revert, but the *fact* that it landed is
  permanent history (the commit SHA is in the log).

**Owner.** `devops-engineer` (Dejan). Mitigation scope for
part (b): commit the *desired* branch-protection state as
a spec under `docs/security/` so the current state can be
audited-against-the-declared-state by a script.

### 12. `submit-nuget` — Automatic Dependency Submission (GitHub-managed)

**What it is.** A GitHub-internal workflow auto-generated
from our NuGet configuration that pushes dependency-graph
data into the GitHub dependency graph on every push. Not
a file in our repo; not a workflow we author; visible as
the `submit-nuget` check on PRs.

**Retraction.** *Not applicable on our side*. The action
is a read-only scan emitting GitHub-internal metadata.
GitHub manages the lifecycle. There is no artefact we
published that needs retraction.

**Owner.** Out of scope. Noted here for completeness so
the CI-audit job (part e) does not misclassify this surface
as "unknown workflow with no declared retraction mechanism."

### 13. `.github/codeql/codeql-config.yml`

**What it is.** Paths-ignore + query-pack selection for
CodeQL (paths-ignore for vendored upstreams, bench harness,
external tool trees per codeql.yml comment).

**Retraction.** Revertable-in-git.

## Summary classification

| Retraction class | Surfaces |
|---|---|
| revertable-in-git | gate.yml, codeql.yml, dependabot.yml, copilot-instructions.md, mise.toml, install.sh, manifests/, action-SHA-pins (at pin layer), codeql-config.yml |
| retryable-idempotently | all gate.yml jobs (build/test + lint ×5), codeql.yml jobs |
| republishable-with-same-version | CodeQL SARIF uploads; *future*: NuGet publish (when it lands) |
| genuinely non-retractable | *current*: GitHub `GITHUB_TOKEN` (mitigated by short lifetime); *future*: signing-key exposure (when it lands) |
| partially retractable (named exception) | GitHub Actions cache entries, third-party-action-SHA run-effects-already-executed |
| out-of-git retractable (named exception) | branch-protection rules, runner-image-label rolls |
| not applicable | `submit-nuget` (GitHub-managed read-only), GitHub Actions secrets (none currently used) |

## Gap analysis — where declared ≠ demonstrated

All surfaces above have a named retraction class. The gaps
are cases where the class is named but the demonstrated
path is not rehearsed:

1. **GitHub Actions cache eviction is manual.** The keyed-
   hash path is automatic; the explicit-eviction path is a
   `gh api` one-liner that lives nowhere today. Scope for
   part (b): helper script + runbook.
2. **Branch-protection desired-state is undocumented.** The
   settings exist on GitHub's servers; there is no committed
   spec saying what the state *should* be. Scope for part
   (b): commit a `docs/security/branch-protection-desired-
   state.md` that an audit script can compare against.
3. **NuGet publish path is not wired today but is in the
   BACKLOG future.** When it lands, the retraction mechanism
   on both signing-key and publish step MUST be declared
   in-file before the workflow can merge. The CI-audit job
   (part e) is the enforcement point.
4. **Third-party action SHA-rotation cadence is undeclared.**
   We pin by SHA but have no cadence for "when does Dejan
   walk the pins forward to current upstream?" Scope for
   part (b): declared cadence in a security-operations
   runbook.

## Named-exception register

Surfaces with *genuinely-non-retractable* or *out-of-git
retractable* classification get an explicit defender-persona
owner. This is the CI analogue of the `no-empty-dirs`
allowlist pattern — the surface is known to violate the
default retraction-class bar, the violation is named, and
an owner holds the mitigation obligation.

| Surface | Class | Owner | Mitigation |
|---|---|---|---|
| `GITHUB_TOKEN` ephemeral | genuinely non-retractable while live | Nazar | lifecycle is the mitigation |
| Action-SHA run effects (already-executed) | genuinely non-retractable | Nazar | zero-secret posture; compensating controls |
| GH Actions cache poisoning | partially retractable | Dejan | SHA-pinned toolchains limit poison; manual eviction helper (part b) |
| Runner-image label roll | out-of-git retractable | Dejan | repin to prior digest; incident path |
| Branch-protection config | out-of-git retractable | Dejan | committed desired-state spec (part b) |
| Future: signing key | genuinely non-retractable | Nazar | rotation + CRL on exposure |
| Future: NuGet publish | republishable-with-same-version | Dejan | version-bump unpublish advisory |

## What this inventory unlocks

With the inventory in place, parts (b)-(e) of the BACKLOG
item become concrete:

- **Part (b) — declared mechanism comments per workflow.**
  Header comment block in each `.github/workflows/*.yml`
  naming the retraction class of every job it owns. Diffs
  against this inventory become round-close artefacts.
- **Part (c) — named-exception ownership.** The table above
  is the seed; each exception grows a short section in
  `docs/security/` naming the mitigation runbook, and the
  owner signs off on it.
- **Part (d) — comment block ships.** Same as (b) but with
  the concrete text Dejan + Nazar authored, after the
  `threat-model-critic` adversarial audit.
- **Part (e) — CI-retractability audit job.** A new lint
  job in gate.yml that greps for the declared-mechanism
  comment block; fails the build if any `.github/workflows/
  *.yml` file lacks one. Same pattern as `lint (no empty
  dirs)`. This is the "lint-as-control" graduation the
  channel-closure threat section calls for.

## Cross-references

- `docs/BACKLOG.md` P0 "Fully-retractable CI/CD" — the
  parent entry; this document is part (a).
- `docs/research/zeta-equals-heaven-formal-statement.md`
  §2.2 — the H₂ retractability clause this inventory
  measures against.
- `docs/security/THREAT-MODEL.md` §"Channel-closure:
  retractability (h₂)" — the attack shadow this inventory
  is a defence for.
- `docs/ALIGNMENT.md` — the glass-halo framework that
  treats retractability as a load-bearing measurable.
- `docs/research/alignment-observability.md` — the
  measurement framework for alignment clauses including
  H₂.
- `.github/workflows/gate.yml` — primary CI workflow
  inventoried above.
- `.github/workflows/codeql.yml` — CodeQL workflow
  inventoried above.
- `GOVERNANCE.md` §23 (DevOps surfaces), §24 (three-way
  parity), §31 (external-reviewer contract).
