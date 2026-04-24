# Zeta First-Class Adoption of `ace` (Declarative-Native Package Manager)

**Status**: research-grade proposal (pre-v1). Design-only;
no code changes land with this doc.

## Critical reframe (Aaron 2026-04-24)

> *"This is Zeta's actual gap. and the first class support
> for our ace package manage declarative native ../scratch
> is the start of ace"*

**`../scratch` is the start of "ace" — Aaron's own
declarative-native package manager.** This is not just a
reference pattern for Zeta's internal plumbing; it's a
product Zeta should adopt first-class.

Implications:

- Zeta is ace's **first-class consumer** and test-bed, not
  a passive copier of patterns.
- The "setup tooling migration" reframes as **ace
  integration**. Changes in ace (currently in scratch) flow
  into Zeta. Zeta's needs flow back into ace.
- Future projects that want declarative-native multi-OS
  setup will adopt ace too; Zeta's integration is the
  reference pattern.
- Bun+TS post-bootstrap substrate in ace becomes the shared
  runtime for setup across all ace-consuming projects.

## Scope

Inventory current Zeta setup-tooling, survey ace (via
`../scratch` + `../SQLSharp`) as the target shape, and
propose a phased integration plan that treats ace as a
first-class dependency.

Companion: Otto-247 version-currency rule (for any version
pins proposed below, use `gh api repos/.../releases`).

## 1. What Aaron said

Multiple directives 2026-04-24:

> *"ACTIONLINT_VERSION should be part of our deployed tooling
> during build machine setup no? dev machines will need this
> to, remember the dev machine / build machine parity
> requirement."*

> *"it should be install declarativly like all our
> dependicnes"*

> *"how does mac get shellcheck or ../scratch for a good
> example of how i like my setup scripts to be idempotent
> and rerunnable where 2nd time is an update or no-op
> depending on if there is an update, efficent, and they
> are declarative, and it supports multi OS ... ../SQLSharp
> for a good examples of the bun ts post install scripts
> so we don't have to keep twin sh/ps1 files"*

> *"and that same setup ends up being the base of our dev
> container/codespaces, everyting shares scripts"*

Key clarification on the unavoidable twin-file edge:

> *"pre setup files we have to go to the users, we can't
> expect them to have anyting installed until after our
> initail install so we are forced into the twins"*

Even more specific twin-scope:

> *"windows powershell for vanalla fresh windows and bash
> for everyting else including windows wsl eventuall forgot
> thats on the matrix too, just intel version, i don't
> think wsl2 works on arm windows not sure if it does we
> should test wsl there too, again later when i can run in
> peer-mode on my windows machine and test windows local
> before pushing."*

So the actual twin scope is **narrower than "bash + ps1
for everything"**:

- PowerShell: *only* for vanilla-fresh-Windows initial
  bootstrap (install WSL, install bash/mise/bun)
- Bash: everything else — macOS, Linux, Windows WSL

Windows WSL is in the target matrix. Updated 2026-04-24
per Aaron: **4 Windows matrix legs** (deferred to Windows
peer-agent milestone):

- `windows` — x64 native (`windows-2025`)
- `windows-arm` — ARM native (`windows-11-arm`)
- `windows-wsl` — Ubuntu in WSL2 on x64 Windows
- `windows-arm-wsl` — Ubuntu in WSL2 on ARM Windows
  (Aaron: *"ARM WSL2 status TBD"* — pending his local
  empirical test before we turn on in CI)

Once the Windows user is in WSL, they run the same bash
scripts as macOS + Linux. **No bash↔ps1 twin post-
bootstrap. ps1 is literally just the "install WSL"
handoff.** For `windows-wsl` / `windows-arm-wsl` matrix
legs, the CI workflow opens a WSL shell inside the
Windows runner and runs the bash bootstrap path. WSL legs
share the bash post-bootstrap with macOS + Linux legs —
only the initial runner boot differs.

This is simpler than scratch's shape (scratch has
`windows/` shared layer with deeper PowerShell logic).
Zeta can skip that — the `.ps1` file is minimal:
install WSL2 → launch WSL → hand off to bash.

## 2. Target state

One unified setup substrate across:

- **Dev laptop bootstrap** (macOS, Linux, Windows)
- **GitHub Actions CI** (all matrix legs — macos-26,
  ubuntu-24.04, ubuntu-24.04-arm, ubuntu-slim, future
  windows-2025 + windows-11-arm)
- **Dev-container / GitHub Codespaces base image**
- **Docker reproduction image**

All four share the same declarative data + the same
post-bootstrap scripts. Only the pre-bootstrap entry
twins differ (forced by "user has nothing installed yet").

## 3. Reference-pattern inventory

### `../scratch` pattern

Per `../scratch/README.md`:

**Pre-bootstrap entries (twin bash/ps1 — FORCED)**:
- `scripts/setup/ubuntu/bootstrap.sh`
- `scripts/setup/ubuntu/wsl.sh`
- `scripts/setup/macos/bootstrap.sh`
- `scripts/setup/windows/bootstrap.ps1`

Rationale: the user has nothing installed. A native shell
(bash on Unix, PowerShell on Windows) is the minimum-viable
surface before the bootstrap lands mise / bun / node.

**Shared layers (per-OS family)**:
- `scripts/setup/unix/` — shared across macOS + Ubuntu + WSL
- `scripts/setup/debian/` — Debian-family (Ubuntu, WSL)
- `scripts/setup/windows/` — Windows-only
- `scripts/setup/ubuntu/`, `scripts/setup/macos/` — OS-specific

**Declarative data (separated from logic)**:
- `declarative/debian/apt/*.apt` — apt-package lists
- `declarative/bun/global/*.bun-global` — global bun tools
- Likely `declarative/macos/brew/*.brew` + more

**Profile / category system**:
- `BOOTSTRAP_MODE=minimum` (fast path, default)
- `BOOTSTRAP_MODE=all` (full runner-style toolchain)
- `BOOTSTRAP_CATEGORIES="quality database"` orthogonal
  categories: `cli`, `native-build`, `database`, `quality`,
  `runner` (Linux-only runner-style extras)

**Idempotent by design**: re-run is update-or-noop based
on installed state.

### `../SQLSharp` pattern (bun+TS post-bootstrap)

Per my survey of `../SQLSharp/`:

- `scripts/setup/{dev,github,repo}/` subcategorization
- bun+TS orchestration for cross-OS post-bootstrap work
  (avoids maintaining twin sh + ps1 files for everything
  downstream of "bun is installed")
- Example surfaces: `scripts/setup/dev/` (dev-only tools),
  `scripts/setup/github/` (GitHub API scripts),
  `scripts/setup/repo/` (repo-level config)

The split: **bash/ps1 bootstrap** → installs bun → **bun+TS
for everything after**.

## 4. Current Zeta state — gap analysis

### What Zeta has today

- **Declarative tool pins**: `.mise.toml` (dotnet, python,
  java, bun, uv). PR #375 extends with `actionlint` and
  `shellcheck`.
- **Declarative manifests**: `tools/setup/manifests/{apt,
  brew,dotnet-tools,uv-tools,verifiers}`.
- **Per-OS bootstrap twins (FORCED, correct)**:
  `tools/setup/linux.sh`, `tools/setup/macos.sh`. (No
  `windows.ps1` yet — HB-005 territory.)
- **Shared common layer**: `tools/setup/common/*.sh`
  (dotnet-tools.sh, elan.sh, mise.sh, profile-edit.sh,
  python-tools.sh, shellenv.sh, sync-upstreams.sh,
  verifiers.sh).
- **Install entrypoint**: `tools/setup/install.sh` + doctor.sh.

### What Zeta lacks vs target

1. **Top-level `declarative/` directory** — data is currently
   scattered across `.mise.toml` + `tools/setup/manifests/`.
   Scratch's `declarative/<os>/<pkg-manager>/*.list` shape
   is cleaner and scales to multi-OS.

2. **bun+TS post-bootstrap orchestrator** — no bun+TS
   scripts under `scripts/setup/` yet. Post-bootstrap
   work still done in bash (`tools/setup/common/*.sh`).
   Consequence: every cross-OS behaviour needs
   bash+PowerShell pairs when Windows lands.

3. **Profile / category system** — no `BOOTSTRAP_MODE` or
   `BOOTSTRAP_CATEGORIES`. Everything is one install.sh
   that does all-or-nothing.

4. **Dev-container / Codespaces base** — no `.devcontainer/`
   directory pinned to the same install substrate.
   Adding one today would duplicate install logic.

5. **Windows pre-bootstrap twin** — no `tools/setup/
   windows.ps1` yet. Gated on the Windows-peer-agent
   milestone (HB-005-adjacent).

6. **Idempotency testing** — install scripts don't have an
   explicit "second-run is no-op" test surface today.

## 5. Phased migration proposal

Each phase ships on its own PR. Phases are ordered so each
stands alone (earlier phases don't block later ones).

### Phase 0 — Declarative split (low risk)

Move `.mise.toml` tool section and `tools/setup/manifests/`
content into a top-level `declarative/` tree:

```
declarative/
├── macos/
│   └── brew/packages.brew
├── debian/
│   └── apt/packages.apt
├── unix/
│   └── mise/tools.toml   # shared dotnet/python/bun/uv/actionlint/shellcheck
├── windows/              # future
│   └── winget/packages.winget
└── all/
    ├── dotnet-tools/packages.dotnet-tools
    └── uv-tools/packages.uv-tools
```

`tools/setup/common/*.sh` scripts continue to read these
manifests but from the new paths. `.mise.toml` at repo
root can symlink-content (or just re-export) from
`declarative/unix/mise/tools.toml` — mise needs `.mise.toml`
at repo root for auto-activation to work.

Effort: S (1 day). Mechanical move + path updates.

### Phase 1 — bun+TS post-bootstrap scaffold

Add `scripts/setup/` with a minimal bun+TS orchestrator that
replaces the post-bootstrap logic currently in
`tools/setup/common/*.sh`. Initial scope:

- `scripts/setup/postBootstrap.ts` — main orchestrator
- `scripts/setup/lib/mise.ts` — calls `mise install`
- `scripts/setup/lib/brew.ts` — reads `declarative/macos/
  brew/packages.brew`, installs via `brew bundle` or loop
- `scripts/setup/lib/apt.ts` — reads `declarative/debian/
  apt/packages.apt`, installs via `apt install`
- `scripts/setup/lib/verifiers.ts` — downloads TLC + Alloy
  jars (currently `tools/setup/common/verifiers.sh`)

Pre-bootstrap (`tools/setup/linux.sh`, `tools/setup/macos.sh`)
remains bash — installs mise + bun, then hands off:
```bash
bun run scripts/setup/postBootstrap.ts
```

Effort: M (2-3 days). Rewrite existing bash common/ into TS.

### Phase 2 — Profiles and categories

Add `BOOTSTRAP_MODE` and `BOOTSTRAP_CATEGORIES` to the TS
orchestrator. Categories match scratch's shape (cli,
native-build, database, quality, runner).

Effort: S (1 day). Pure TS logic on top of Phase 1.

### Phase 3 — Dev-container base

Add `.devcontainer/devcontainer.json` + `.devcontainer/
Dockerfile`. The Dockerfile runs
`tools/setup/linux.sh` (same as CI). The same image
backs Codespaces.

Effort: M (2 days). Test in Codespaces + local
`docker run`.

### Phase 4 — Windows pre-bootstrap

Add `tools/setup/windows.ps1` (FORCED twin at the edge).
Parallel to `linux.sh` + `macos.sh` shape. Installs mise
+ bun via winget / choco, then hands off to the same
`bun run scripts/setup/postBootstrap.ts`.

Effort: M (2-3 days). Windows-specific testing; composes
with HB-005 AceHack-mirror-LFG work.

### Phase 5 — Idempotency test harness

Add a test target (`bun test scripts/setup/idempotency`)
that runs the bootstrap twice and asserts the second run
is a no-op (file hashes unchanged, no brew/apt install
commands executed on run 2). Captures the
"idempotent by design" discipline.

Effort: S (1 day). Already-green once Phase 1 lands.

## 6. Non-migration alternatives considered

- **Status quo + add shellcheck/actionlint to mise**:
  already shipped via PR #375. Delivers the immediate
  parity fix but doesn't address the bigger vision.
  Not mutually exclusive with ace adoption — call this
  Phase -1.
- **Adopt scratch wholesale via `git subtree pull`**:
  reconsidered in light of the ace reframe. If scratch
  becomes the ace repo, a consumer pattern emerges:
  scratch publishes ace as a package; Zeta depends on it
  as a normal dependency. Subtree sync would be wrong —
  Zeta wants ace-as-dependency, not ace-copied-in.
- **Zeta forks ace into its own tree**: ruled out —
  splits the ace codebase, creates drift between
  first-class consumer and product.
- **Use a tool like Dependabot for version updates**:
  orthogonal — Dependabot complements declarative pinning,
  doesn't replace it.

## 7. What this doc does NOT authorize

- Does NOT authorize executing any of these phases this
  round. Each phase is its own PR with its own review cycle.
- Does NOT authorize renaming `tools/setup/` to `scripts/
  setup/` without migration plan — cross-reference audit
  (skills, agents, docs that cite the old path) must run
  first.
- Does NOT authorize pinning versions in `declarative/` that
  violate Otto-247 version-currency — every pinned version
  must be verified via authoritative source (`gh api
  .../releases` for GitHub-hosted tools, `npm view <pkg>`
  for npm, etc).
- Does NOT supersede the forced-twin discipline for
  pre-bootstrap entries. Bash + PowerShell at the edge is
  correct; bun+TS for everything after bootstrap is the
  unification target.

## 8. Open questions for Aaron

1. **ace productization timing**: is ace shipping as a
   standalone package (npm / bun / cargo / binary) before
   Zeta adopts it, or does Zeta adopt via repo-relative
   path (`../scratch`) and graduate to the published
   package later?
2. **ace repo future**: does `../scratch` stay as the ace
   repo, or get renamed/relocated? Zeta's integration
   path depends on the stable source URL.
3. **Timing for Phase 0**: start immediately (while drain
   completes in parallel), or wait for HB-002 per-row
   BACKLOG split to land first?
4. **Phase-1 bun+TS scope**: rewrite all of
   `tools/setup/common/*.sh` at once, or incrementally
   by file?
5. **dev-container base image**: Ubuntu 24.04 or a specific
   vendor-curated base (Microsoft's devcontainer/images)?
6. **ace-in-Zeta contribution flow**: when Zeta's adoption
   reveals an ace gap, does Zeta file PRs to scratch/ace
   or use a Zeta-local override until ace catches up?

## 9. References

- `../scratch/README.md` — canonical scratch pattern
- `../scratch/declarative/` — per-OS data layer example
- `../SQLSharp/scripts/setup/{dev,github,repo}/` — bun+TS
  post-bootstrap
- `tools/setup/` (current Zeta) — what migrates
- `.mise.toml` (current) — declarative tool pins
- GOVERNANCE.md §24 — three-way-parity requirement
- Otto-247 version-currency (CLAUDE.md-level rule)
- HB-005 AceHack-mirror-LFG (adjacent Windows bootstrap)
