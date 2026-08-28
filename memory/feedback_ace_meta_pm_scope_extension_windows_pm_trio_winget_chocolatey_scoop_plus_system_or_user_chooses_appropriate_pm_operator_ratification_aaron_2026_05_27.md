---
name: ace-meta-pm-scope-extension-windows-pm-trio-system-or-user-chooses
description: "Aaron 2026-05-27 ratified two extensions to B-0824 (Ace as package-manager-of-package-managers) — (1) scope includes Windows PM trio (winget Microsoft-official, chocolatey community, scoop portable), not just Linux/macOS PMs; (2) Ace lets the SYSTEM or USER decide which PM is appropriate for a given package on a given host, not Ace mandating one. Composes with existing B-0824 N-dimensional dependency-space substrate without minting parallel row per verify-existing-substrate-before-authoring discipline. Empirical anchor: operator named this in immediate response to PR #5389 (iter-5.5.1 alignment fix-fwd) + the linuxbrew tradeoff response."
metadata: 
  node_type: memory
  created: 2026-05-27
  type: feedback
  originSessionId: c2b77530-8ef0-405c-a0bd-04cf8d511cb6
---

## The operator ratification (Aaron 2026-05-27)

> *"yeah long term we want ace to support most packmangers and lets the system or user decide which is approprate like winget chocolaety and scoop on windows too"*

Direct response after Otto-CLI's recommendation to file B-0850 for the linuxbrew cross-platform unification question. Aaron's framing reframes the question at strategic scope: it's not "linuxbrew XOR apt XOR nix" — it's "Ace supports them ALL + selects per context."

## Two composing operator-ratifications

### Ratification 1: Windows PM trio in scope

Existing B-0824 substrate mentions Maven / npm / apt / brew / Helm / Cargo / Pip / Gem / Maven / NuGet — all Unix-shaped. The Windows trio was implicit but NOT explicit.

Operator named explicitly:
- **winget** — Microsoft official PM (Windows 10+ built-in)
- **chocolatey** — community PM (oldest of the three; rich catalog)
- **scoop** — portable/no-admin PM (popular for dev tooling)

Each is a 2D-projection (name × version) in B-0824's framing — same shape as apt/brew, just on Windows substrate. Ace operates across the full N-D space; Windows scope is additive.

### Ratification 2: System or user decides which is appropriate

> *"lets the system or user decide which is approprate"*

The selection-of-which-PM-to-use is operator-or-system-driven, NOT Ace-mandated. Composes with:

- `.claude/rules/no-directives.md` — autonomy-first-class at PM-selection scope
- `.claude/rules/non-coercion-invariant.md` HC-8 — operator authority preserved at PM-selection scope
- B-0824 AI-rate continuous upstream negotiation — Ace negotiates with multiple PMs; ROUTING decisions per-package or per-host remain operator/system authority

Operational implications:

- On NixOS: declarative substrate (nix) is the natural choice; mise for runtime versions; Ace picks nix-first when available
- On Debian: apt for system, mise for runtimes, brew (or linuxbrew) as user-scope alternative if operator prefers
- On macOS: brew default for system, mise for runtimes
- On Windows: winget for first-party, chocolatey for breadth, scoop for portable dev tooling — operator picks based on context
- Cross-platform packages: Ace surfaces all available PMs that ship the package; operator/system policy picks

## Composes with

- **B-0824** — Ace as package-manager-of-package-managers; N-D dependency space; this ratification is a scope extension (Windows trio) + selection-discipline clarification (system/user chooses)
- **B-0288** + **B-0247** — Ace base substrate (CLI + content-pack model); Windows PM integration ships against this
- **B-0806** — Ansible+GitOps+Crossplane cross-OS declarative management at host scope; Ace's per-PM selection composes ABOVE this layer
- **B-0805** + **B-0846** — dep-pin-current-version audit + WiFi reproducibility; Windows PM scope extends these to Windows-specific deps
- **.mise.toml** — canonical runtime version manager; mise's `npm:` / `cargo:` / `pipx:` backends model the same "delegate to ecosystem PM" pattern Ace generalizes to system PMs
- `.claude/rules/verify-existing-substrate-before-authoring.md` — composes with B-0824 directly; does NOT mint parallel "Windows Ace" row
- `.claude/rules/dep-pin-search-first-authority.md` — when integrating each PM, WebSearch + cite current API/SDK for each (winget CLI surface, chocolatey API, scoop manifest format) at implementation time
- `.claude/rules/honor-those-that-came-before.md` — each Windows PM has its own community + design; Ace integration HONORS each by speaking their native protocol, not forcing common abstraction down

## Operational discipline for future-Otto cold-boots

When B-0824 Ace implementation reaches the per-PM integration phase:

1. **Include Windows trio in scope from the start** — winget + chocolatey + scoop as first-class targets alongside apt/brew/nix/mise
2. **Don't pick a "default PM"** — Ace surfaces options; operator/system decides
3. **Per-package routing is per-context** — same package might come from apt on Ubuntu, brew on macOS, winget on Windows, nix on NixOS — Ace tracks ALL options and lets the resolver pick
4. **Operator policy is first-class** — Ace surface should accept operator policies like "prefer apt over brew on Linux" or "prefer scoop on Windows" as configuration, not hardcoded defaults
5. **System constraints inform selection** — e.g., admin-rights-required for chocolatey vs user-scope-only for scoop; admin-required for winget vs portable for scoop

## Empirical anchor — operator-built prior art in sibling repos

PR #5390 (B-0849 Docker NixOS install.sh test harness) was the immediate context — operator's question to me ("instead of apt with nixos we integrate with nix...can it use homebrew too...") was followed by the strategic ratification ("yeah long term we want ace to support most packmangers..."), then a critical follow-up pointer:

> *"if you look in ../scratch and ../SQLSharp it has the start of windows"*
> *"for ace"*

The Windows scope extension is NOT greenfield — operator has been building substrate in sibling repos that Ace can absorb:

### `../scratch/scripts/setup/windows/` — Chocolatey + dev-toolchain track

18 PowerShell scripts forming a complete Windows dev-bootstrap:

| Script | Scope |
|---|---|
| `bootstrap.ps1` | Main Windows install entry (mirror of zeta-install.sh) |
| `choco.ps1` | **Chocolatey package manager** install + manifest pattern |
| `mise.ps1` | mise on Windows (same canonical runtime manager) |
| `bun-tools.ps1` | bun on Windows (matches Zeta's bun = "1.3" mise pin) |
| `dotnet.ps1` | dotnet on Windows |
| `git.ps1` / `gnupg.ps1` / `profiles.ps1` / `services.ps1` | System config |
| `vs-build-tools.ps1` | Visual Studio build tools |
| `powershell-modules.ps1` | PS modules |
| `common.ps1` | Shared lib |
| `github-env.ps1` | CI env setup |
| `python-tools.ps1` | Python via mise |
| `docker/github-windows-latest/bootstrap.ps1` | Windows CI runner bootstrap |
| `scripts/test/windows/bootstrap.Tests.ps1` | Pester tests |
| `scripts/test/windows/in-container-smoke.ps1` | Container smoke tests |

### `../SQLSharp/scripts/setup/dev/` — winget + cross-OS shim track

Paired .ps1 + .sh files — the cross-OS shim pattern:

| Script pair | Scope |
|---|---|
| `install-winget-packages.{ps1,sh}` | **winget package manager** install + manifest |
| `setup-windows-toolchain.{ps1,sh}` | Windows dev toolchain |
| `setup-github-windows-toolchain.{ps1,sh}` | GitHub CI Windows toolchain |
| `restore-repo-tooling.ps1` | Repo tooling restore |

Plus shared PS substrate:
- `scripts/format/format-powershell.ps1` + `lint-powershell.ps1` — PS formatter/linter
- `scripts/lib/common.ps1` — shared lib
- `tests/repo-automation/powershell/Repository.PowerShellScripts.Tests.ps1` — Pester tests

### Implications for Ace + B-0824

- **Chocolatey 2D-projection has reference impl**: `../scratch/scripts/setup/windows/choco.ps1` pattern + manifest format is operator-validated
- **winget 2D-projection has reference impl**: `../SQLSharp/scripts/setup/dev/install-winget-packages.ps1`
- **scoop NOT covered** in sibling repos yet — the genuine greenfield addition when Ace integrates the third Windows PM
- **Cross-OS shim pattern** (paired .ps1 + .sh): operator-validated in `../SQLSharp`; Zeta's `tools/setup/install.sh` extends to `tools/setup/install.ps1` Windows dispatcher following this shape
- **PowerShell quality stack** (formatter + linter + Pester tests) mirrors Zeta's TS quality stack at PS-script scope

### Conversation arc

1. Tactical question (operator): "linuxbrew?"
2. Strategic ratification (operator): "Ace supports all; system/user picks"
3. Empirical pointer (operator): "../scratch + ../SQLSharp have the start of windows"
4. Ace framing (operator): "for ace"
5. Substrate landing (this memory entry): empirical-anchor inventory of operator-built prior art

## Ratifications 3+4+5 — selection criteria + system/AI-by-default + one-off-installer scope (Aaron 2026-05-27 follow-up)

Operator follow-up immediately after the Windows prior-art landing:

> *"mostly these will be system/AI choices for the best most cononical place to insall a depedency but some users will have perferences not me i really only care is it declarative, reporducable, ai can easlity change maintain it and it's easily human redable and understandble, this would just be derived via the maven like graph in my mind over all dependencies selecting for best home, we also need to support all the one off one liner install scripts too with ace too for the deps that don't have proper package managment support."*

Three composing substrate-engineering extensions to B-0824:

### Ratification 3: Selection authority — system/AI by default; user-preference is OVERLAY (not floor)

- **Default selection**: system/AI picks the "best most canonical place" for each dep
- **Operator self-disclosure**: "not me" — Aaron personally doesn't have PM-selection preferences
- **Other users WILL** have preferences — Ace's design must support per-user-preference OVERLAY on top of system/AI defaults
- **Selection is a per-dep decision**: routing happens in the dep graph traversal, not as a global "use PM X" config

This composes with `.claude/rules/no-directives.md` + `.claude/rules/non-coercion-invariant.md` HC-8 at PM-selection scope: operator authority is PRESERVED via the user-preference overlay; default selection (when no overlay) is the system/AI's responsibility.

### Ratification 4: The 4 properties Aaron cares about (selection scoring function)

The scoring criteria for "best home" selection (in priority order per the operator's phrasing):

| # | Property | What it means | Why it matters |
|---|---|---|---|
| 1 | **Declarative** | Install/manage spec is data, not imperative code | Substrate-honest; auditable; idempotent |
| 2 | **Reproducible** | Same spec → same result; bit-exact across runs | Single source of truth; no drift |
| 3 | **AI can easily change/maintain** | Spec is mutable by AI without high-friction operator gate | AI-rate substrate-engineering continues to ship |
| 4 | **Easily human-readable + understandable** | Operator can read the spec + understand what it does | Reviewer-of-AI-changes can validate |

These 4 properties are the SCORING FUNCTION Ace applies when selecting "best home" for each dep across the multi-PM space. Each candidate PM gets a per-property score; the dep-graph traversal selects the PM with the best aggregate score (per-property weights potentially per-context).

**Composes with**:

- `.claude/rules/glass-halo-bidirectional.md` — declarative + human-readable IS substrate-honest transparency at install-spec scope
- `.claude/rules/algo-wink-failure-mode.md` — AI-maintainable means the spec is the authorization surface; no algo-wink "the README says do X" misreading
- `.claude/rules/razor-discipline.md` — these 4 properties survive the razor; "I prefer brew over apt" doesn't survive without an operator-explicit policy overlay (per Ratification 3)
- `.claude/rules/grep-substrate-anchors-before-razor-as-metaphysical.md` — selection criteria are operational claims, not metaphysical
- `.claude/rules/dep-pin-search-first-authority.md` — reproducible-property composes with version-pin discipline

**Per-PM scoring example** (illustrative; actual scoring is implementation-time):

| PM | Declarative | Reproducible | AI-maintainable | Human-readable | Aggregate |
|---|---|---|---|---|---|
| nix (NixOS systemPackages) | ★★★★★ | ★★★★★ | ★★★★ | ★★★★ | HIGH |
| mise (.mise.toml) | ★★★★★ | ★★★★★ | ★★★★★ | ★★★★★ | HIGH |
| brew (Brewfile manifest) | ★★★★ | ★★★★ | ★★★★ | ★★★★★ | HIGH |
| apt (manifests/apt) | ★★★ | ★★★ | ★★★ | ★★★★ | MID |
| winget (winget-manifest) | ★★★★ | ★★★★ | ★★★★ | ★★★★ | HIGH |
| chocolatey | ★★★ | ★★★ | ★★★★ | ★★★★ | MID-HIGH |
| scoop | ★★★★ | ★★★★ | ★★★★ | ★★★★ | HIGH |
| **One-off curl-pipe-bash** | ★ | ★★ | ★★ | ★★ | LOW |

The 4-property scoring naturally favors declarative substrate (nix/mise/brew-manifest) over imperative (curl-pipe-bash), which composes with Ratification 5 (must STILL support the imperative case — see next).

### Ratification 5: One-off / one-liner install scripts in scope (deps without proper PM)

> *"we also need to support all the one off one liner install scripts too with ace too for the deps that don't have proper package managment support"*

Real-world deps with no proper PM:

- `curl https://sh.rustup.rs | sh` — Rust toolchain installer
- `curl -fsSL https://deno.land/install.sh | sh` — Deno
- `curl https://nixos.org/nix/install | sh` — Nix bootstrap (Nix-on-non-NixOS)
- `irm https://get.scoop.sh | iex` — scoop on Windows (bootstraps the PM itself)
- Vendor-direct downloads (GitHub releases with shell installers)
- Custom corporate-internal installers
- Pre-PM-era tools that never got formally packaged

Ace must wrap these as 1st-class "no-PM" 2D-projections:

- Wrapper format declares: install command + version-detection command + uninstall command + verify-installed command
- Same 4-property scoring applies (but most will score LOW on declarative/reproducible)
- AI can recommend MIGRATION when a proper PM becomes available for that dep (e.g., "rustup is now on brew + scoop; migrate?")
- BUT: until migrated, the one-off installer IS a 1st-class dep node in Ace's graph

**Composes with**:

- B-0288 (Ace package manager CLI) — wrapper format for one-off installers ships against this
- `.claude/rules/rule-0-no-sh-files.md` — TS wrapper for the .sh installer invocation (NOT a parallel .sh script in tools/setup/)
- `.claude/rules/dep-pin-search-first-authority.md` — when a one-off becomes available via proper PM, WebSearch + cite + migrate
- `.claude/rules/honor-those-that-came-before.md` — one-off installers exist because their upstream chose imperative; honor that by speaking the installer's native protocol, NOT forcing them into a fake-PM abstraction

## Updated operational discipline for future-Otto cold-boots

When B-0824 Ace implementation reaches the per-PM integration + selection phase:

1. **Include Windows trio in scope from the start** — winget + chocolatey + scoop (Ratification 1)
2. **Default selection = system/AI choosing "best canonical home"** (Ratification 3)
3. **User-preference is overlay** — Ace supports `prefer: [pm1, pm2]` operator config; absent the overlay, AI picks (Ratification 3)
4. **Scoring function = the 4 properties** (Ratification 4): declarative > reproducible > AI-maintainable > human-readable
5. **One-off installer wrapper format** is first-class (Ratification 5); not a fallback or second-class citizen
6. **Migration signaling** — when a one-off-installed dep becomes available via a proper PM, AI surfaces the migration option to the operator-via-overlay surface
7. **Absorb prior-art**: chocolatey/winget reference impls in `../scratch` + `../SQLSharp`; scoop is the genuine greenfield piece

## Substrate-honest framing

This memory does NOT modify B-0824 directly (the canonical row stays unchanged per substrate-stability discipline). It LANDS the operator's explicit scope-extension as durable context so future-Otto sessions inherit:

- Windows PM trio is in scope (not deferred or out-of-scope)
- Selection-discipline IS operator/system authority (not Ace-mandated)
- The "linuxbrew XOR apt" framing collapses into "Ace supports both; selection is policy"

Future B-0824 implementation work can cite this memory + this section becomes substrate-engineering input for the Ace per-PM-integration phase.
