# Build-machine setup — design for Zeta

**Round:** 29
**Status:** design draft — awaiting Aaron sign-off before any
script lands.
**Scope:** how a Zeta dev machine (and a Zeta CI runner) gets
the toolchain it needs. Read-only reference: `../scratch`.

## Discipline recap

- `../scratch` is a **read-only model** for shape + intent.
  No file is copied from `../scratch` into Zeta. Every script
  Zeta ships is hand-crafted here.
- Aaron reviews the OS matrix, tool pin list, install
  locations, and re-entry semantics before any script lands.
- Cost discipline: every tool installed by default earns its
  slot. Optional tools go behind a flag, not the base install.

## What `../scratch` teaches (paraphrased, not copied)

`../scratch` runs a **layered declarative bootstrap**:

1. **Single source of runtime pins** — one `.mise.toml` at
   the repo root pins `dotnet`, `python`, `node`, `bun`, `uv`
   via [mise](https://mise.jdx.dev/). `mise install` is
   idempotent and detects existing installs.
2. **Per-category declarative manifests** under
   `../scratch/declarative/{apt,brew,choco,dotnet,python,
   bun,windows,...}`. Each file lists packages; composition
   is by `@include` (apt) or Ruby `instance_eval` (Brewfile).
3. **Orthogonal profiles** — `minimum` vs `all`, plus
   category axes (`cli`, `native-build`, `database`,
   `quality`, `runner`). Each profile composes manifests
   rather than duplicating them.
4. **Platform fans** — macOS and Linux share Brewfiles;
   Windows has Chocolatey + PowerShell modules; each OS gets
   a bootstrap script that walks the right subset.
5. **Managed shellenv** — one file (`~/.config/dev-bootstrap/
   shellenv.sh`) sourced from every shell rc; also writes to
   `$GITHUB_ENV` / `$GITHUB_PATH` when running under CI, so
   the same script works locally and in Actions.
6. **Two-run contract** — the bootstrap is expected to pass
   twice. First run installs; second run detects existing
   tools and upgrades in place.

## What Zeta should borrow

| Pattern | Source | Why it fits Zeta |
|---|---|---|
| Managed shellenv file sourced from all rc files **and** `$GITHUB_ENV` / `$GITHUB_PATH` | `../scratch/scripts/setup/unix/profiles.sh` | Zeta already has `tools/tla/*.jar`, `tools/alloy/*.jar`, `.dotnet/tools` bins on PATH; a managed file beats `.zshrc` sprawl. Also keeps local-dev and CI identical. |
| Idempotent "detect first, install else update" loop for each tool | `../scratch/scripts/setup/unix/dotnet.sh` | `tools/install-verifiers.sh` already curls jars; add file-exists + SHA-256 check + `curl --time-cond` so a second run is cheap. |
| Two-run contract (test the bootstrap by running it twice) | `../scratch` CI jobs | Good CI hygiene; protects against "works the first time only" drift. |
| Per-category manifest files (not inline in the script) | `../scratch/declarative/` | Lets Aaron add a tool by editing a list, not a script. |

## What Zeta should **not** borrow

| Pattern | Source | Why it doesn't fit |
|---|---|---|
| Homebrew on Linux for parity | `../scratch/declarative/brew/` | Zeta is .NET-first. Linux uses apt for JDK + build-essential; no Brew overhead. |
| `min`/`all` + category axis explosion | `../scratch/scripts/bootstrap.sh` | Zeta has **one** profile today (dotnet + JDK + elan/lean + Semgrep). Flatten to a single list; split only when a second profile is genuinely needed. |
| Cask (GUI apps), VS Build Tools, PowerShell modules | `../scratch/declarative/{cask,windows}/` | Out of scope: Zeta dev is CLI-only; Windows deferred until a Windows-breaking test justifies the matrix slot. |
| `BOOTSTRAP_COMPACT_MODE` cache sweep | `../scratch` | Zeta CI images are ephemeral; cache sweep is a container-image optimisation we don't need. |

## Proposed Zeta shape

```
tools/
  setup/
    install.sh              # top-level entry; dispatches per-OS
    macos.sh                # Homebrew + mise + dotnet tools
    linux.sh                # apt + mise + dotnet tools
    common/
      mise.sh               # `mise install` + shellenv wiring
      verifiers.sh          # curl TLC jar, Alloy jar with SHA check
      dotnet-tools.sh       # dotnet tool install --global from manifest
    manifests/
      brew.txt              # macOS Homebrew pins (openjdk@21, elan, etc.)
      apt.txt               # Debian/Ubuntu packages (openjdk-21-jdk, curl, build-essential)
      dotnet-tools.txt      # `dotnet-stryker@4.8.1` etc.
      verifiers.txt         # jar URL + sha256 pairs for TLC, Alloy
    shellenv.sh             # single file sourced from rc files + GITHUB_ENV
```

`.mise.toml` at repo root pins `dotnet` (10.x), `python`
(3.14 to match current Zeta), `node` (skip unless we need it),
`bun` (skip). Keep the pin list minimal.

**Rationale for the layout:**

- `tools/setup/install.sh` is the single entry point a new
  contributor runs. Detects OS, dispatches.
- Per-OS scripts are small and read manifests. Adding a tool
  = editing a text file.
- `common/` holds OS-agnostic steps (mise, dotnet tools,
  verifier jars).
- `shellenv.sh` is the managed PATH file: one source of
  truth for every shell + CI.

## Re-entry semantics

- Every installer step must be **idempotent**. If the tool
  exists at the pinned version, skip. If it exists at a
  different version, upgrade.
- Downloaded jars are identified by URL + SHA-256. Re-run
  downloads only when the SHA doesn't match.
- `shellenv.sh` is regenerated each run from the manifests
  but appends uniquely (no duplicate PATH lines).

## Current inventory — what's already installed locally

(From `docs/INSTALLED.md`, confirmed present on Aaron's box:)

- `.NET SDK 10.0.x` — Homebrew pin today; **proposed** move
  to `.mise.toml` pin for CI-local parity.
- `openjdk@21` — Homebrew (macOS); apt on Linux.
- `elan` → `lean` + `lake` at `leanprover/lean4:v4.30.0-rc1`
  — custom installer (`tools/install-verifiers.sh` calls the
  elan shell installer). Keep; mise doesn't have a Lean
  plugin yet.
- `TLA+/TLC` — `tla2tools.jar` via curl; SHA check to add.
- `Alloy 6` — `alloy.jar` via curl; SHA check to add.
- `Semgrep` — Python package; **proposed** add to uv tools.
- `dotnet-stryker` — `dotnet tool install --global`; add to
  manifest.
- `Feldera` sibling clone — optional; keep out of base
  bootstrap.

## Open questions for Aaron

1. **`.mise.toml` vs Homebrew for dotnet.** `../scratch`
   uses mise for dotnet; Zeta currently uses Homebrew. mise
   gives CI-local parity and version-pinning in a single
   file. Cost: one more tool in the chain. Adopt?
2. **Python for Semgrep.** Adopt via `.mise.toml` + `uv
   tool install semgrep`, or keep brew-installed? The mise
   path makes CI reproducible; brew is what's there today.
3. **Lean toolchain.** Keep the custom elan installer, or
   wait for a mise-lean plugin? Recommendation: keep custom
   until mise supports it; one more script is cheaper than
   blocking on upstream.
4. **Verifier jar checksums.** Do we want to maintain the
   SHA list in `manifests/verifiers.txt`, or pull from a
   published `SHA256SUMS` when upstream provides one?
5. **First-run vs steady-state.** Should the installer
   error out on missing prerequisites (Xcode CLT on macOS,
   `curl` on Linux), or attempt to install them? `../scratch`
   fails fast on Xcode CLT; recommend we follow.
6. **OS coverage phase 1.** macOS + Linux only, per round-29
   discipline. Windows when a Windows-breaking test
   justifies a slot. Confirm?
7. **`tools/install-verifiers.sh` fate.** Retire in favour
   of the new `tools/setup/install.sh`, or keep it as a
   thin alias? Recommendation: merge its current duties
   into `setup/common/verifiers.sh` and delete the old
   path.

## What lands after sign-off

Only after Aaron signs off on this doc:

1. Scaffolding — `tools/setup/` directory + top-level
   `install.sh` stub.
2. `tools/setup/manifests/` populated with the inventory
   above.
3. Port of existing `tools/install-verifiers.sh` logic into
   `common/verifiers.sh` with SHA-256 checks added.
4. A single smoke run on the maintainer's laptop to confirm
   idempotency + two-run contract.

CI wiring is **separate** — see `docs/research/ci-workflow-design.md`.
