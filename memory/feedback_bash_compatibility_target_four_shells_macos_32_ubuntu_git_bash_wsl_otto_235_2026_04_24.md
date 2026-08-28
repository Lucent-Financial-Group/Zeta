---
name: Bash compatibility target is FOUR shells — macOS bash 3.2 + Ubuntu bash (4/5) + Git Bash (MinGW on Windows) + WSL bash; NOT just "macOS-compatible"; any bash script in the repo must run on all four; Ubuntu works already; macOS 3.2 relaxed (no bash-4-only features); Git Bash + WSL verification still owed; Aaron Otto-235 reminder after PR #357 relaxation; composes with Otto-215 bun+TS-post-install-migration + Windows peer-harness roadmap; 2026-04-24
description: Aaron Otto-235 after subagent on PR #357 relaxed archive-pr.sh to bash-3.2-compatible: *"relaxed to macOS bash-3.2-compatible, also eventually need to work in git bash and wsl bash and already works in ubuntu bash"*. The full portability target is four shells, not just macOS. The subagent's fix covered one dimension (bash-4+ → bash-3.2-compat for macOS) but the factory target is broader. Verification on Git Bash (MinGW/MSYS2 on Windows) + WSL bash is still owed; adjacent to Otto-215 Windows peer-harness work which will land the verification path once Aaron drives it from his Windows PC.
type: feedback
originSessionId: 1937bff2-017c-40b3-adc3-f4e226801a3d
---

## The rule (refined per Otto-235 follow-up)

**Bash compatibility scope depends on the setup-phase layer:**

### Pre-install layer (bootstrap; before bun / TS runtime exists)

Must run on:

1. **macOS bash 3.2** — Apple ships bash 3.2.57 as `/bin/bash`;
   users can install bash 5 via Homebrew but the repo must not
   require it. Strictest bash constraint.
2. **Ubuntu bash (4.x / 5.x)** — CI runners default; works
   out-of-the-box.
3. **WSL bash (Windows Subsystem for Linux)** — Ubuntu-on-
   Windows. Mostly compatible with Ubuntu bash but has
   `wslpath` and file-permission differences.

Plus `.ps1` **Windows PowerShell 5.x** twins for Windows native
pre-install. Aaron Otto-235 follow-up clarification: *"it's
fine if the are pwsh compatiable i mean but we can't count on
it besing insteall before we setup, we can only count on
windows powershell"* — target the lowest denominator (Windows
PowerShell 5.x, built-in on every Windows install). If a
script happens to also run on `pwsh` / PowerShell Core that's
fine, but do NOT write features that require pwsh, and do NOT
assume `pwsh` is on PATH before setup runs.

Practical implication: stay away from pwsh-only cmdlets
(`ConvertFrom-Json -AsHashtable`, `-NoNewline` on older
cmdlets, `$using:` scoping in some contexts, ternary
`a ? b : c`, null-coalescing `??`). WPS 5.x parser will
choke on some modern syntax. `Get-Help about_Windows_PowerShell_5.1`
is the spec.

**Git Bash (MinGW / MSYS2) is NOT a pre-install target.** Aaron
Otto-235 follow-up: *"git bash (MinGW) is only for post setup
scripts, for pre setup scripts this is not necessary it's to
much divergence, windows pre seutp scripts will all be .ps1
windows powershell not pwsh compatiable."* Pre-install on
Windows = `.ps1` only, not Git Bash.

### Post-install layer (after bun+TS runtime installed)

Long-term direction per Otto-215: **migrate off bash entirely
to bun+TS.** Interim, while still bash, the post-install
target is broader AND the version floor is higher:

1. **macOS bash 5.x** — setup installs bash 5 via `brew install bash`
   (Aaron Otto-235 follow-up: *"mac bash get upgraded so we can
   support more higher bash version it post bash scripts too"*).
   Post-install scripts can therefore use bash-4+ features
   (associative arrays, `${var,,}`, `mapfile`, globstar, etc.)
   WITHOUT the bash-3.2 fallback discipline the pre-install
   layer requires.
2. Ubuntu bash 4.x/5.x
3. WSL bash
4. **Git Bash (MinGW/MSYS2)** — included here. Path translation
   quirks matter; `/c/Users/...` vs `C:/Users/...`;
   line-ending sensitivity (CRLF vs LF — git-autocrlf may
   inject `\r` into variables).

Best path for a post-install bash script is still migration to
bun+TS per Otto-215. But while still bash, the higher macOS
floor is a meaningful relaxation from the pre-install
constraints — bash-3.2 discipline doesn't apply post-setup.

Direct Aaron quote:

> *"relaxed to macOS bash-3.2-compatible, also eventually need
> to work in git bash and wsl bash and already works in ubuntu
> bash"*

## What "bash 3.2-compat" covers (subset)

- No associative arrays (`declare -A`)
- No `${var,,}` / `${var^^}` case-conversion syntax
- No `[[ $str =~ regex ]]` BASH_REMATCH ambiguities (works but
  regex engine differs)
- No `mapfile` / `readarray`
- `read -t 0` timeout check
- No `**` recursive globstar (add `shopt -s globstar` and
  check OS-native behaviour)
- Use `$(command)` not backticks (both work; `$()` preferred)

Reference: `man bash` on macOS = 3.2. BASH_VERSINFO check:

```bash
if (( BASH_VERSINFO[0] < 4 )); then
  # 3.2-compatible code path
fi
```

## What Git Bash adds on top

- `/c/`-prefixed paths (MinGW-translates Windows paths)
- `wslpath`-equivalent is sometimes needed for round-tripping
- Line-ending sensitivity (CRLF vs LF — git-autocrlf may
  inject `\r` into variables)
- Some Linux-specific commands absent (`setfacl`, `readlink -f`,
  `/proc/*`, `timeout` missing in old Git Bash)

Verification hint: tools that parse `$OS`, `$OSTYPE`, or
`uname -s` see `MINGW64_NT-*` on Git Bash.

## What WSL bash adds on top

- Mostly Linux-bash behaviour, but:
- `wslpath` for Windows↔Linux path translation
- `/mnt/c/Users/...` for Windows filesystem access
- File permissions may surprise (Windows-mounted files have
  777-ish mode)
- `ps`, `netstat` may show different process namespaces

## Current status in the repo

- **macOS bash 3.2**: PR #357's `archive-pr.sh` relaxed
  explicitly (Otto-235 context). Other repo scripts probably
  OK by default (shell-check-clean, no bash-4-specific
  constructs observed in earlier reviews) but no
  repo-wide audit.
- **Ubuntu bash**: works today (CI runners).
- **Git Bash**: NOT verified. Verification path = Aaron runs
  factory on Windows PC after bun+TS-post-install migration
  (Otto-215).
- **WSL bash**: NOT verified. Same verification path.

## What this memory does NOT authorize

- Does NOT authorize pre-emptive refactoring of every bash
  script for bash-3.2 + Git Bash + WSL compat without
  demand-driven need. The factory's stance per Otto-215 is
  that post-install layer migrates to bun+TS (single
  cross-platform runtime); pre-install layer stays bash and
  also requires .ps1 twins for Windows pre-install. Only
  the PRE-INSTALL layer's bash scripts must survive all four
  shells.
- Does NOT authorize using `#!/usr/bin/env bash` to opt into
  user-installed newer bash on macOS — breaks the "works
  with system bash 3.2" requirement for onboarding.
- Does NOT authorize shellcheck-disable-all as a compat
  workaround. Shellcheck is still the linter; cross-shell
  failures should produce `shellcheck -e SC2034` style
  targeted disables with an inline comment explaining why.
- Does NOT authorize claiming "cross-platform verified" on
  any script without actually running it on all four shells.
  Empirical verification only (Otto-227 discipline extends
  here).

## Composition with prior memory

- **Otto-215 bun+TS post-install migration** — the longer-term
  fix: most scripts migrate off bash entirely. This memory
  covers the interim (scripts still bash) and the residual
  pre-install layer (must stay bash per bootstrap exception).
- **Otto-223 post-drain AceHack-first routing** — orthogonal.
- **Otto-227 cross-harness skill discovery** — analogous
  empirical-verification discipline ("test each harness;
  don't trust docs"). Here: test each shell.
- **PR #357 archive-pr.sh** — the concrete instance. Bash 3.2
  relaxed; Git Bash + WSL still owed when Aaron drives the
  Windows peer-harness.

## Direct Aaron quote to preserve

> *"relaxed to macOS bash-3.2-compatible, also eventually need
> to work in git bash and wsl bash and already works in ubuntu
> bash"*

Future Otto: when a bash script is introduced or refactored,
the target is FOUR shells. Ubuntu usually free. macOS 3.2
requires discipline (no arrays, no `^^` / `,,`). Git Bash +
WSL verification owed when Aaron drives the Windows peer-
harness (Otto-215). Don't say "macOS-compat" when you mean
"four-shell-compat".
