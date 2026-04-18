# Build-machine setup — design for Zeta

**Round:** 29
**Status:** Aaron-reviewed 2026-04-18 — ready to scaffold.
**Scope:** the single `tools/setup/` install script consumed
three ways — developer laptops, GitHub Actions runners, and
devcontainer / Codespaces images. Read-only reference:
`../scratch`.

## The organizing principle — three-way parity

Per GOVERNANCE.md §24: **one install script, three consumers.**

1. **Developers** run it on their laptop (macOS + Linux on
   day one; Windows once we're stable on the first two) to
   provision a Zeta dev environment.
2. **CI runners** run the same script in the build step —
   not `actions/setup-dotnet`, not inline `brew install`,
   not a parallel truth source. The CI matrix exists
   specifically to test the developer experience across
   first-class dev platforms; a Mac dev finding a Linux
   install-script bug belongs in CI, not in a ticket filed
   three weeks later.
3. **Devcontainers / Codespaces** run the same script
   during image build so a cloud dev environment matches a
   laptop dev environment matches a CI runner.

"Works on my machine" is the bug class this discipline
eliminates. Drift between the three consumers is tracked
in `docs/DEBT.md`, not accepted as permanent.

## What `../scratch` teaches (paraphrased, not copied)

`../scratch` runs a layered declarative bootstrap:

- `.mise.toml` at repo root pins `dotnet`, `python`,
  `node`, `bun`, `uv` via [mise](https://mise.jdx.dev/);
  idempotent `mise install` detects existing installs.
- Per-category declarative manifests under
  `../scratch/declarative/{apt,brew,dotnet,python,...}`;
  composition by `@include` or Ruby `instance_eval`.
- Managed shellenv file sourced from rc files **and**
  `$GITHUB_ENV` / `$GITHUB_PATH` so the same script works
  locally and in Actions.
- Two-run contract: bootstrap passes twice; first installs,
  second upgrades in place.
- Platform fans: macOS + Linux share Brewfiles in
  `../scratch`; Windows uses Chocolatey + PowerShell. We
  diverge here — see below.

## Zeta's adoption — decisions locked

**Runtime pin strategy — mise long-term, pragmatic today.**
Aaron (round 29): *"The long term plan is mise but it can
be a backlog item if it adds a lot of time right now.
Homebrew often lags behind on releases — mise is the long
term plane."*

- Adopt `.mise.toml` for `dotnet` + `python` **this
  round**. Both are small moves and cover the two tools
  where Homebrew's lag is most painful.
- Node / Bun / UV — not yet needed by Zeta; don't pin
  preemptively.
- Lean toolchain stays on the custom `elan` installer
  — mise has no Lean plugin yet. When the plugin
  lands (or when we contribute one per GOVERNANCE.md
  §23), we migrate.

**Verifier jar checksums — skip.** Aaron: *"We don't need
verified."* Download by URL, trust-on-first-use, move on.
If a verifier ever gets hijacked upstream we'll feel it in
the test suite; the SHA ceremony is a cost we chose not to
pay.

**macOS prerequisites — install, don't fail.** Aaron:
*"The expectation is that on a new machine I can just run
setup and it will install everything that's needed
including all dependencies."* We diverge from `../scratch`'s
fail-fast-on-Xcode-CLT approach — the Zeta installer
detects missing Xcode Command Line Tools and triggers the
install itself (`xcode-select --install`). Non-interactive
elements handled; the one prompt Apple still shows is
documented.

**Legacy cleanup — no alias.** Aaron: *"No alias, this
project is greenfield, super greenfield we don't need any
legacy cruft."* `tools/install-verifiers.sh` is deleted in
this round; its duties fold into
`tools/setup/common/verifiers.sh`. No symlink, no
deprecated-shim wrapper. Any doc still referencing
the old path is swept.

**OS coverage phase 1 — macOS + Linux; Windows soon-ish.**
Aaron: *"We can do windows later, I'll likely push for it
before a test breaks but backlog is fine. Let's just do it
once we are in a stable spot with mac and linux no need to
wait."* macOS + Linux scripts land this round; Windows
backlogged with trigger "mac + linux stable + one week of
green CI runs."

## What Zeta borrows from `../scratch`

| Pattern | `../scratch` citation | Why it fits |
|---|---|---|
| Managed shellenv sourced from rc files **and** `$GITHUB_ENV` / `$GITHUB_PATH` | `scripts/setup/unix/profiles.sh` | Single source of truth for PATH across local dev + CI. |
| Idempotent detect-first-install-else-update loop per tool | `scripts/setup/unix/dotnet.sh` | Daily-rerunnable install script per Aaron's ask. |
| Two-run contract (CI runs the bootstrap twice) | `../scratch` CI jobs | Hygiene: protects against "works the first time only" drift. |
| Per-category manifest files, not inline lists | `declarative/` | Aaron adds a tool by editing a text file, not a script. |
| `.mise.toml` at repo root for runtime pins | `../scratch/.mise.toml` | CI-local parity for dotnet + python. |

## What Zeta does **not** borrow

| Pattern | `../scratch` citation | Why it doesn't fit |
|---|---|---|
| Homebrew on Linux for parity | `declarative/brew/` | Zeta is .NET-first, Linux uses apt for JDK + build tools; no Brew overhead. |
| `min` / `all` + orthogonal category axes | `scripts/bootstrap.sh` | Zeta has one profile today. Flatten; split only if a second profile becomes genuinely needed. |
| Cask (GUI apps), VS Build Tools, PowerShell modules | `declarative/{cask,windows}/` | CLI-only dev surface; Windows deferred. |
| `BOOTSTRAP_COMPACT_MODE` cache sweep | top-level script | Ephemeral CI images; no cache-sweep optimisation needed. |
| Ruby-evaluated Brewfiles for composition | `Brewfile` | Overhead vs a plain text list; our include story is simpler. |

## Target layout

```
tools/
  setup/
    install.sh              # top-level entry; detects OS, dispatches
    macos.sh                # Homebrew + mise install + dotnet tools + verifiers
    linux.sh                # apt + mise install + dotnet tools + verifiers
    common/
      mise.sh               # `mise install` + shellenv wiring
      dotnet-tools.sh       # `dotnet tool install --global` from manifest
      verifiers.sh          # curl TLC + Alloy jars; idempotent
      elan.sh               # custom elan installer for the Lean toolchain
      shellenv.sh           # emits the managed PATH file
    manifests/
      brew.txt              # macOS Homebrew pins
      apt.txt               # Debian/Ubuntu packages
      dotnet-tools.txt      # dotnet-stryker, fantomas if we add it, etc.
      verifiers.txt         # jar URL (no SHA per Aaron's call)
.mise.toml                  # dotnet + python pins
```

`install.sh` is the single entry point. CI calls it. A
devcontainer Dockerfile calls it. A contributor on a fresh
macOS laptop calls it. The CI matrix tests all three
consumers by running the same script across ubuntu + macos
runners (Windows later).

## Three-way-parity test story

The CI workflow that tests the install script **is** the
developer-experience gate:

1. Runner boots a fresh `ubuntu-22.04` or `macos-14` image.
2. First step: `tools/setup/install.sh`.
3. Second step: `tools/setup/install.sh` again (re-entry
   contract).
4. Third step: `dotnet build Zeta.sln -c Release`.
5. Fourth step: `dotnet test Zeta.sln -c Release`.

If step 1 or 2 fails, the dev experience is broken and the
PR is blocked. If step 3 or 4 fails, the library itself is
broken. Both are hard-fails; both happen in the same job
so a dev matrix failure doesn't hide behind a test failure.

## Open-source contribution hook

Per GOVERNANCE.md §23, when the install story needs
something an upstream project doesn't yet provide (e.g. a
mise-lean plugin, a Homebrew formula that lags a release),
the expected move is a PR to the upstream. `../` is where
we clone those repos for contribution work. Zeta never
carries a fork in-tree; we pin temporarily, track the
upstream PR in `docs/INSTALLED.md`, and remove the pin on
upstream release.

## What lands this round

1. `.mise.toml` at repo root (dotnet + python pins).
2. `tools/setup/` scaffold per the layout above; the
   verifier-install logic ports from
   `tools/install-verifiers.sh`, which is deleted in the
   same commit.
3. `docs/INSTALLED.md` rewritten to reflect mise as the
   source of truth for dotnet + python; Homebrew retained
   for system packages that mise doesn't own.
4. `docs/BUILD-MACHINE-SETUP.md` documents how to run the
   installer, what it assumes, what it installs, and the
   two-run contract.
5. **Deferred to backlog (captured in `docs/BACKLOG.md`):**
   full mise migration for every tool, devcontainer
   Dockerfile, Windows bootstrap, open-source contribution
   log ("where we've PR'd upstream").

## CI wiring

Separate doc: `docs/research/ci-workflow-design.md`.
`tools/setup/install.sh` is called directly from the
workflow; no `actions/setup-dotnet` parallel-truth-source
unless we back away from Option B parity.
