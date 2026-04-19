## Purpose

Zeta treats committed repo automation — install scripts under
`tools/setup/`, GitHub Actions workflows under `.github/workflows/`,
the doctor script, and anything else that recreates developer or
CI state — as a **first-class implementation surface** governed by
OpenSpec. Anything the repo can install, lint, build, test, or
publish MUST be reconstructable from the canonical specs plus
language-specific profile overlays. Non-declarative installation
steps and spec-less automation scripts are smells.

This base spec captures the requirements that apply across all
automation artefacts regardless of language. Language-specific
requirements live in `profiles/`:

- `profiles/bash.md` — shell scripts under `tools/setup/`
- `profiles/github-actions.md` — workflow YAML under `.github/workflows/`

Future profiles (PowerShell, TypeScript, etc.) land as automation
surface expands per GOVERNANCE.md §24 three-way parity.

## Requirements

### Requirement: Automation artefacts reconstructable from spec + profile overlays

Zeta MUST treat every committed automation script, workflow, or
configuration file as part of the canonical implementation surface.
The base spec plus the language-specific profile overlay MUST be
sufficient to recreate the artefact's entry points, behaviour, and
parity guarantees from scratch.

#### Scenario: Rebuilding `tools/setup/install.sh` from specs

- **WHEN** the Zeta install script and its per-OS dispatchers are
  rebuilt from the canonical specs
- **THEN** this base spec plus `profiles/bash.md` MUST be sufficient
  to recreate the dispatcher, the per-OS scripts, the manifest-
  driven installs (apt, brew, dotnet, verifier jars), and the
  managed shellenv emission
- **AND** rebuild-critical behaviour MUST NOT live only in chat
  history, PR comments, ad-hoc commit messages, or agent notebooks
- **AND** the three-way-parity contract (GOVERNANCE §24) MUST be
  recoverable from the spec alone

#### Scenario: Rebuilding `.github/workflows/gate.yml` from specs

- **WHEN** the Zeta CI workflow is rebuilt from the canonical specs
- **THEN** this base spec plus `profiles/github-actions.md` MUST be
  sufficient to recreate the triggers, OS matrix, runner pinning,
  action SHA pinning, least-privilege permissions, concurrency
  groups, caching strategy, and the invocation of
  `tools/setup/install.sh` as the canonical toolchain source

### Requirement: Installation stays declarative

Zeta MUST express installation state via committed manifest files
— not via ad-hoc imperative shell sequences embedded in scripts or
workflows. Every tool, package, or binary the repo depends on
MUST have a declarative source of truth readable by both humans
and the install scripts.

#### Scenario: Adding a new apt / brew / dotnet-tool dependency

- **WHEN** a contributor needs to add a runtime dependency for the
  repo's supported platforms
- **THEN** the dependency MUST be added to the appropriate
  manifest under `tools/setup/manifests/` (e.g., `apt.txt`,
  `brew.txt`, `dotnet-tools.txt`, `verifiers.txt`)
- **AND** the install scripts MUST read that manifest rather than
  hard-coding the dependency inline
- **AND** a dependency installed by imperative shell without a
  manifest entry is considered a smell and is flagged by
  `factory-audit` or `maintainability-reviewer` on next audit

#### Scenario: Declarative tiering for future growth

- **WHEN** Zeta grows toward the target declarative shape (per
  SECURITY-BACKLOG.md "Declarative-manifest setup matching
  `../scratch`")
- **THEN** manifests SHOULD migrate to tiered profiles
  (`min` / `runner` / `quality` / `all`) so consumers can
  install scope-appropriate subsets
- **AND** the install scripts SHOULD dispatch on the requested
  tier rather than always installing the superset

### Requirement: Canonical specs stay live instead of archived

Zeta MUST keep the canonical OpenSpec tree synchronized with the
current repo state. The modified-OpenSpec workflow per
`openspec/README.md` has no archive and no change-history; specs
describe current-state truth.

#### Scenario: Spec + implementation drift

- **WHEN** a committed automation artefact diverges from its
  canonical spec
- **THEN** either the artefact MUST be brought back into spec
  compliance
- **OR** the spec MUST be updated in-place to reflect the new
  reality — whichever accurately describes what the repo WANTS
- **AND** the drift decision MUST be visible in a git commit
  rather than lurking in chat history

### Requirement: Generic + language-specific overlay discipline

Zeta MUST keep cross-cutting automation requirements in this
base spec and language-specific requirements in profile overlays.
Duplicating the same requirement across every language profile,
or burying language-specific detail in the base spec, is a smell.

#### Scenario: Adding a bash-specific rule

- **WHEN** a new rule applies only to bash scripts (shellcheck
  clean, `set -euo pipefail`, macOS bash 3.2 compatibility, etc.)
- **THEN** the rule MUST land in `profiles/bash.md` not in this
  base spec

#### Scenario: Adding a workflow-YAML-specific rule

- **WHEN** a new rule applies only to GitHub Actions workflow
  YAML (SHA-pinning, concurrency groups, permissions blocks,
  BASH_ENV propagation, etc.)
- **THEN** the rule MUST land in `profiles/github-actions.md`
  not in this base spec

### Requirement: Automation visibility and thinness

Zeta MUST keep committed GitHub Actions workflow YAML focused on
orchestration and host-specific setup. Repo-specific validation,
formatting, benchmark, or reporting logic MUST live in committed
scripts that can be tested outside GitHub Actions.

#### Scenario: Adding or updating a workflow step

- **WHEN** Zeta adds or changes a committed GitHub workflow
- **THEN** repo-specific logic SHOULD live in
  `tools/setup/common/*.sh` or equivalent testable scripts
- **AND** workflow-only shell SHOULD stay limited to orchestration
  that genuinely belongs to GitHub Actions
- **AND** multi-line shell or PowerShell logic MUST NOT stay
  embedded in workflow YAML once it grows beyond trivial
  orchestration — extract to a committed script

### Requirement: Automation secrets stay out of logs

Zeta MUST keep committed automation from casually materializing
secrets into logs, traced command lines, or generated cleartext
credential files when a safer repo-visible alternative exists.

#### Scenario: A workflow needs external service credentials

- **WHEN** Zeta automation needs package-feed, coverage-publish,
  or other external credentials
- **THEN** it SHOULD prefer masked environment variables, process-
  scoped credential injection, or platform secret stores over
  writing resolved secrets into generated config files or echoed
  command lines
- **AND** unavoidable temporary secret material MUST be cleaned
  up deliberately and MUST NOT be logged verbatim
- **AND** `GITHUB_TOKEN` is acceptable as a workflow-scoped
  identity token under `permissions: contents: read` when no
  broader-scoped secret would do

### Requirement: OS setup separate from validation entry points

Zeta MUST keep operating-system-specific toolchain bootstrap
separate from the normal repo validation entry points so
workflows and contributors exercise the same real scripts.

#### Scenario: A platform needs extra host-managed setup

- **WHEN** Linux, macOS, WSL, or Windows (future) needs extra
  host-managed setup before the repo validation can run
- **THEN** that setup MUST live in the dedicated
  `tools/setup/<os>.sh` path
- **AND** setup scripts MUST pass explicit package / source /
  license-agreement flags when upstream supports them instead of
  depending on hidden interactive prompts
- **AND** workflows MUST call the normal validation entry points
  (`dotnet build`, `dotnet test`, `semgrep --config ...`) directly
  after setup, not hide validation behind environment-specific
  wrapper scripts
- **AND** setup scripts MUST read committed version manifests
  (`global.json`, `.mise.toml`, `tools/setup/manifests/*`) rather
  than hard-coding duplicate version values
- **AND** the shared Unix setup path MUST install the repo-pinned
  .NET SDK from `global.json` through Microsoft's official
  `dotnet-install.sh` (round-32 refactor; matches SQLSharp)

### Requirement: Upstream research before automation workaround

Zeta MUST prefer understanding upstream tool behaviour before
adding local automation workarounds, especially for cross-platform
CI differences.

#### Scenario: Unexpected CI behaviour

- **WHEN** CI surfaces unexpected behaviour absent locally
- **THEN** the default investigation path MUST start with
  upstream tool documentation, release notes, issue tracker, and
  reference repos (`../SQLSharp`, `../scratch`) — not with a
  local patch
- **AND** any local workaround MUST be documented in-code with a
  reference to the upstream issue and an expiry condition
  (GOVERNANCE §25 upstream-temporary-pin expiry rule)

### Requirement: Three-way parity is the single-source contract

Zeta MUST enforce GOVERNANCE §24 three-way parity across all
automation artefacts. Dev-laptop bootstrap, CI-runner bootstrap,
and devcontainer bootstrap (future) MUST resolve to the same
`tools/setup/install.sh` entry point and the same manifest
declarations.

#### Scenario: CI path diverges from dev path

- **WHEN** a CI workflow installs a tool, version, or config that
  dev-laptop bootstrap does not
- **THEN** the divergence is parity drift and MUST be either
  corrected or logged in `docs/DEBT.md` with a concrete closure
  plan
- **AND** parity drift MUST NOT be accepted silently as permanent

#### Scenario: Diagnostic drift between dev and CI

- **WHEN** a contributor's laptop is healthy but CI fails (or
  vice versa)
- **THEN** `tools/setup/doctor.sh` SHOULD surface the drift
  deterministically so the fix is mechanical rather than
  exploratory
