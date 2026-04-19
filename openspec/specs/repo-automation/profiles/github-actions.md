## Purpose

GitHub-Actions-specific profile overlay for Zeta's repo-automation
capability. Covers the workflow-YAML surface under
`.github/workflows/`. Reads on top of the base `spec.md` in this
directory.

## Requirements

### Requirement: Runners pinned to specific images

Zeta workflows MUST pin `runs-on` to specific OS images
(`ubuntu-22.04`, `macos-14`) rather than moving labels
(`ubuntu-latest`, `macos-latest`). Research-project reproducibility
mandates known runner state.

#### Scenario: Adding a matrix entry

- **WHEN** a workflow declares `runs-on` or a matrix `os` entry
- **THEN** the value MUST be a specific version (e.g.,
  `ubuntu-22.04`, `macos-14`)
- **AND** MUST NOT be a floating label (`ubuntu-latest`,
  `macos-latest`)

### Requirement: Third-party actions pinned by 40-char SHA

Every `uses:` line referencing a third-party action MUST pin by
full 40-char commit SHA. Tag pins and branch pins are forbidden.
This defends the tj-actions tag-rewrite class (CVE-2025-30066)
and is enforced by Semgrep rule 15 in the `lint` job.

#### Scenario: Adding or upgrading a third-party action

- **WHEN** a workflow adds or upgrades a `uses: <owner>/<repo>@...`
  reference
- **THEN** the pin MUST be a full 40-char commit SHA
- **AND** MUST carry a trailing `# vX.Y.Z` comment naming the
  human-readable release the SHA corresponds to
- **AND** the comment SHOULD match the upstream release tag at
  the time of pinning so a future reviewer can verify the SHA
  corresponds to an official release

### Requirement: Workflow-level `permissions: contents: read` floor

Every workflow file MUST declare `permissions: contents: read` at
the workflow level. Individual jobs MAY escalate only with a
stated reason.

#### Scenario: Creating a new workflow

- **WHEN** Zeta adds a new workflow under `.github/workflows/`
- **THEN** the workflow MUST include
  `permissions: contents: read` at the workflow top level
- **AND** any job that needs broader permissions MUST declare
  them at the job level with an inline comment explaining why

### Requirement: Concurrency groups with event-gated cancel-in-progress

Workflows MUST declare concurrency groups that cancel stale PR
runs but preserve main-branch history (every main commit gets a
green/red record).

#### Scenario: Declaring concurrency

- **WHEN** a workflow declares its `concurrency:` block
- **THEN** the `group:` MUST key on workflow name + PR number
  (or `github.ref` fallback)
- **AND** `cancel-in-progress:` MUST be true for PR events only
  (gated on `github.event_name == 'pull_request'`)
- **AND** pushes to `main` MUST queue rather than cancel

### Requirement: Workflow-scoped secrets discipline

Workflows MUST NOT reference long-lived cross-workflow secrets.
`GITHUB_TOKEN` (auto-provided, read-only under
`permissions: contents: read`, per-run rotation) is acceptable
when genuinely needed; static secrets are not.

#### Scenario: A workflow needs a token

- **WHEN** a workflow step needs a GitHub-scoped token
- **THEN** the step SHOULD use `${{ secrets.GITHUB_TOKEN }}`
  when the minimal `permissions: contents: read` scope suffices
- **AND** broader-scoped secrets MUST NOT be referenced without
  a corresponding `V1-SECURITY-GOALS.md` update justifying the
  new trust surface
- **AND** secrets MUST NOT appear in `env:` blocks without
  masking by the Actions runtime

### Requirement: `BASH_ENV` propagation via `GITHUB_ENV`

Subsequent workflow steps MUST inherit the managed shellenv
(DOTNET_ROOT, PATH additions, mise activation, etc.) via the
`BASH_ENV` env set by `tools/setup/common/shellenv.sh` during
the toolchain-install step. Explicit `source $HOME/.config/zeta/
shellenv.sh` in each downstream step is a fallback; it MUST NOT
be the primary mechanism.

#### Scenario: Reading the managed shellenv in a downstream step

- **WHEN** a step after the toolchain-install step runs bash
- **THEN** the step's shell MUST auto-source the managed
  shellenv via the `BASH_ENV` env
- **AND** `dotnet build`, `dotnet test`, `python`, etc. MUST
  resolve to the repo-pinned versions without explicit sourcing
- **AND** a regression in the BASH_ENV path MUST be fixed in
  `shellenv.sh`, not worked around with explicit sources

### Requirement: Caching keyed on manifest content

Workflow caches MUST key on the content hash of the source-of-
truth manifest driving each cached asset, never on timestamps or
floating inputs.

#### Scenario: Caching the .NET SDK

- **WHEN** a workflow caches `~/.dotnet`
- **THEN** the cache key MUST include `hashFiles('global.json')`
  and `hashFiles('tools/setup/common/dotnet.sh')`
- **AND** MUST NOT use `restore-keys` — a partial hit could
  restore a cache built against a different SDK version

#### Scenario: Caching verifier jars

- **WHEN** a workflow caches `tools/tla/` + `tools/alloy/`
- **THEN** the cache key MUST include
  `hashFiles('tools/setup/manifests/verifiers')`
- **AND** the cache bust cleanly when the manifest changes

### Requirement: Workflow YAML stays thin and orchestration-focused

Per the base spec, repo-specific logic MUST NOT embed in workflow
YAML beyond trivial orchestration. Install.sh, doctor.sh,
verifiers.sh, and the managed shellenv emitter live in
`tools/setup/` precisely so they're testable outside GitHub
Actions.

#### Scenario: Growing the gate.yml logic

- **WHEN** `gate.yml` needs a new validation step
- **THEN** the substantive logic MUST live in
  `tools/setup/common/*.sh` or a sibling repo-owned script
- **AND** `gate.yml` MUST invoke the script rather than inline
  the bash
- **AND** embedded multi-line shell in YAML is a smell flagged
  by `maintainability-reviewer`

### Requirement: Timeouts on every job

Every job MUST declare `timeout-minutes`. No job runs unbounded;
a runaway must hit a bound and abort rather than burning CI
minutes indefinitely.

#### Scenario: Adding a new job

- **WHEN** a workflow job lands
- **THEN** it MUST declare `timeout-minutes:` appropriate to its
  scope (build-and-test: 45; lint: 10; docs checks: 5)
- **AND** MUST NOT omit the timeout
- **AND** timeout values SHOULD be reviewed annually (cadence
  aligned with `factory-audit` review) to catch drift
