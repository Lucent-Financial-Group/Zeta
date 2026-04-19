## Purpose

Bash-specific profile overlay for Zeta's repo-automation
capability. Covers the shell-script surface under `tools/setup/`
— install dispatcher, per-OS scripts, common/ primitives, doctor
script, verifier-jar installer, shellenv emitter. Reads on top of
the base `spec.md` in this directory.

## Requirements

### Requirement: Shell scripts run cleanly under strict mode

Every committed bash script under `tools/setup/` MUST begin with
strict-mode settings so silent failures are impossible.

#### Scenario: A new bash script lands

- **WHEN** a contributor adds a `.sh` file to `tools/setup/`
- **THEN** the script MUST begin with `#!/usr/bin/env bash`
- **AND** MUST set `set -euo pipefail` near the top (before any
  substantive logic)
- **AND** MUST NOT disable strict mode silently for expedience;
  any localized `set +e` block MUST justify itself in-code with
  a comment and re-enable strict mode after

### Requirement: Idempotent second runs

Zeta install scripts MUST be safe to run repeatedly. The second
run MUST detect already-installed state and short-circuit
rather than re-installing or re-downloading.

#### Scenario: Running install.sh twice

- **WHEN** `tools/setup/install.sh` runs twice in sequence on
  the same machine
- **THEN** the second run MUST detect the existing state
  (already-installed tools, already-downloaded jars, mise
  runtimes already pinned)
- **AND** MUST NOT re-download or re-install anything it doesn't
  need to
- **AND** MUST NOT fail because a tool is already at the
  requested version
- **AND** CI MUST be able to assert this contract via a
  second-run check if a regression is suspected

### Requirement: macOS bash 3.2 + Linux bash 5.x compatibility

Zeta bash scripts are Unix-only. They MUST run under macOS's
default bash 3.2 and Linux bash 5.x. Windows contributors run
a separate PowerShell install path (`tools/setup/windows.ps1`
— backlogged); bash is NOT expected to run on Git Bash for
Windows. Two reasons, together: (1) Git Bash is not guaranteed
installed on a Windows developer machine, so assuming it would
make bootstrap fail on fresh boxes; and (2) post-install
automation moves to TypeScript (via Bun) for cross-platform
work — cleaner than trying to make bash portable to msys2.

Associative arrays (`declare -A`) and other bash-4+ features
are forbidden because macOS ships bash 3.2 as `/bin/bash` for
licensing reasons.

#### Scenario: Adding cross-platform bash logic

- **WHEN** a bash script needs to map multiple keys to values
- **THEN** the script MUST use parallel arrays (`NAMES=(...)`
  and `VALUES=(...)`) rather than `declare -A`
- **AND** MUST avoid bash-4+ features such as `${var,,}`
  lowercase conversion (use `tr '[:upper:]' '[:lower:]'`
  instead)
- **AND** MUST avoid `readarray` / `mapfile` (use a
  `while IFS= read -r line; do ... done < <(...)` loop instead)

#### Scenario: Cross-platform repo automation (non-install)

- **WHEN** an automation task needs to run on Unix + Windows
  developer machines (formatting, benchmark orchestration,
  coverage aggregation, lint driver, etc.)
- **THEN** the task MUST be written in TypeScript + Bun + a
  repo-root `package.json` entry rather than in bash
- **AND** bash MUST NOT be chosen for any task that would
  otherwise need a parallel PowerShell twin — maintaining
  bash+pwsh for the same job is explicitly out-of-scope per
  Aaron round 33 + SECURITY-BACKLOG "Post-install repo
  automation: Bun + TypeScript + package.json"

### Requirement: Manifest-driven installs

Bash install scripts MUST read their tool / package lists from
committed manifest files under `tools/setup/manifests/`. Hard-
coding package names inline is a smell.

#### Scenario: Installing apt / brew / dotnet-tool / verifier jars

- **WHEN** an install script needs to install one or more of
  these dependency types
- **THEN** the package / tool list MUST come from the
  corresponding manifest (`apt.txt`, `brew.txt`,
  `dotnet-tools.txt`, `verifiers.txt`)
- **AND** the script MUST skip comment lines (`^#`) and empty
  lines when reading the manifest
- **AND** the script MUST NOT introduce a parallel hard-coded
  list in the script body

### Requirement: Atomic downloads

Scripts that download artefacts MUST use an atomic write pattern
so a partial download cannot be mistaken for a complete install.

#### Scenario: Downloading a verifier jar

- **WHEN** `tools/setup/common/verifiers.sh` or equivalent
  fetches a binary artefact
- **THEN** the fetch MUST write to a `.part` temp path first
- **AND** MUST verify completion before `mv`-ing the temp file
  to the final canonical location
- **AND** MUST NOT leave a partial file at the canonical path
  if interrupted mid-download

### Requirement: Respect sudo boundary

Scripts MUST run as non-root on CI and dev laptops and invoke
`sudo` only for specific steps that require it (apt install).
Scripts MUST NOT assume they're being run as root.

#### Scenario: Running apt-get in linux.sh

- **WHEN** `tools/setup/linux.sh` runs apt-get commands
- **THEN** the script MUST conditionally prefix with `sudo` only
  when `id -u` is not 0
- **AND** MUST NOT assume passwordless sudo outside of CI; dev
  laptop scripts MAY prompt

### Requirement: Shellcheck-clean

Bash scripts SHOULD be shellcheck-clean at the default level.
Local disables (`# shellcheck disable=SCXXXX`) MUST justify
themselves in-line.

#### Scenario: A shellcheck finding on a committed script

- **WHEN** shellcheck (run manually or in CI when we add that
  gate) flags a finding
- **THEN** the script MUST be updated to fix the finding
- **OR** a `# shellcheck disable=SCXXXX` comment MUST be added
  with a one-line reason
- **AND** disables MUST NOT be added without a stated reason

### Requirement: `$HOME`, `$REPO_ROOT` discipline

Scripts MUST compute paths from `$HOME` (for user-scope state)
or a derived `REPO_ROOT` variable (for repo-scope paths). Hard-
coded absolute paths outside those anchors are a smell.

#### Scenario: Deriving the repo root

- **WHEN** a script in `tools/setup/` needs to locate a repo-
  local file
- **THEN** it MUST derive `REPO_ROOT` from `$(cd
  "$(dirname "$0")/../../.." && pwd)` (or equivalent depth)
- **AND** MUST NOT assume the user's CWD is the repo root
- **AND** MUST NOT reference `/Users/<name>/...` or `/home/
  <name>/...` absolute paths outside error messages

### Requirement: Scripts MUST be deterministic — no retries or polling

Zeta scripts MUST behave the same way on every run given the
same inputs. Retries, poll loops, `sleep N && try again` patterns,
and "eventual consistency" workarounds are smells and MUST be a
last resort. If a script appears to need a retry, the default
response is to investigate the root cause (wrong ordering, race
condition, missing dependency) rather than paper over it.

#### Scenario: A script call fails occasionally

- **WHEN** a script step fails non-deterministically
- **THEN** the default investigation path MUST diagnose the
  root cause — wrong ordering, missing dependency, race
  condition, upstream flake — NOT insert a retry loop
- **AND** a retry MUST be introduced only when (a) the upstream
  failure is genuinely transient and outside repo control and
  (b) the retry's stopping criterion is bounded (finite max
  attempts, finite total time) and (c) the retry is documented
  inline with a reference to the upstream issue or flake class

#### Scenario: A script uses sleep to wait for state

- **WHEN** a script is tempted to `sleep N` before running a
  follow-up command
- **THEN** the default MUST be to restructure the script so the
  prerequisite state is installed synchronously before the
  follow-up runs — not to add the sleep
- **AND** if the prerequisite truly cannot be detected
  synchronously (rare), the wait loop MUST have a bounded
  max-wall-clock timeout and fail-fast semantics on timeout

#### Scenario: CI behaviour differs from local

- **WHEN** a script runs green locally but flakes on CI (or
  vice versa)
- **THEN** the default diagnosis path MUST treat the
  environment difference as the root cause, not the script
  non-determinism
- **AND** `tools/setup/doctor.sh` SHOULD surface the drift
  (parity-drift between dev + CI is GOVERNANCE §24 DEBT)
- **AND** adding a retry loop to mask the environment
  difference MUST NOT be the default

### Requirement: Managed shellenv via BASH_ENV on CI

Under GitHub Actions, `tools/setup/common/shellenv.sh` MUST emit
`BASH_ENV=<path-to-managed-shellenv>` into `$GITHUB_ENV` so
every subsequent `run:` step auto-sources the managed shellenv
file. This is the SQLSharp-proven pattern and replaces piecewise
`$GITHUB_PATH` echoes.

#### Scenario: A later workflow step invokes dotnet

- **WHEN** a workflow step after the install step runs
  `dotnet build`
- **THEN** the step MUST see the repo-pinned dotnet on PATH
  without explicit `source $HOME/.config/zeta/shellenv.sh`
- **AND** the mechanism MUST be the `BASH_ENV` env set by
  `shellenv.sh` during the install step
