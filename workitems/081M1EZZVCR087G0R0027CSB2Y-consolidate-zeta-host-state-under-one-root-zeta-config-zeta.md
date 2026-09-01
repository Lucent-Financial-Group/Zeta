---
id: 081M1EZZVCR087G0R0027CSB2Y
type: task
state: backlog
priority: P2
slug: consolidate-zeta-host-state-under-one-root-zeta-config-zeta
title: "Consolidate Zeta host state under one root: ~/.zeta, ~/.config/zeta and three ~/Library roots are live at once"
created: 2026-09-01T17:24:08.728Z
depends_on: []
composes_with: []
---

# Consolidate Zeta host state under one root: ~/.zeta, ~/.config/zeta and three ~/Library roots are live at once

<!-- Work-item body. ZetaId-keyed (conflict-free, time-sortable). "Backlog" is a
     STATE = this folder; completion moves the file to workitems/done/YYYY/MM/.
     Identity is the zetaid prefix — resolve cross-refs by `081M1EZZVCR087G0R0027CSB2Y-*.md` glob. -->

## Measured 2026-09-01

Zeta writes host state to **five** roots, plus third-party tool roots. Nobody chose
this; each was the fastest path at the time it was added.

| root | holds | who writes it |
|---|---|---|
| `~/.zeta/` | `agents/` `clones/` `artifacts/` `persona/` `backups/` `health/` | host-loop-bootstrap, harness installers |
| `~/.config/zeta/` | `auth/` `ca/` `machine/` `secrets-env.sh` `shellenv.sh` `first-session-complete` | install.sh, persona-keys |
| `~/Library/LaunchAgents/` | the launchd job plists | host-loop-bootstrap |
| `~/Library/Logs/zeta-*/` | runner logs | the loops |
| `~/Library/Application Support/Zeta*Loop/` | per-cell state | the loops |

Third-party roots (`~/.local/share/mise`, `~/.dotnet/tools`, `~/.cargo`, `~/.agda`)
are **out of scope** — those belong to their tools and moving them would be the
appointed-hub mistake in a different costume.

### Three separate defects, and only one of them is "tidy the paths"

1. **Two launchd naming conventions are live at once.** `com.zeta.*-loop` and
   `com.lucent.zeta.*-loop` both exist on disk, and `lior` has **both spellings**.
   A cleanup keyed on one prefix silently misses half the fleet — which is the
   preservation-namespace failure with a `launchctl` accent.

2. **Dead plists are indistinguishable from live ones by inspection.** Four loops
   wrote logs today (alexa, lior, otto, vera); `claude`, `codex`, `copilot`,
   `riven`, `soraya` and `missed-substrate-detector` last wrote in **May/June** and
   their plists are still installed. `launchctl list` shows several of them. There
   is no liveness signal at the plist, so "is this agent still running" has to be
   answered by stat-ing a log file.

3. **`~/.zeta` is 126 GB and nothing prunes it.** 118 GB is `~/.zeta/agents` —
   harness installs and caches, not loop state: codex 63G, otto-cli 18G, gemini
   12G, kiro 8.4G, cursor 4.4G, grok 2.7G. The clones that the cells actually need
   are 3.8 GB total. **Deletion is NOT in scope for this item** and must not be
   done as a side effect of a consolidation: some of those trees may hold the only
   copy of something, and `preservation-has-one-namespace-per-kind` says to look
   before overwriting, not after.

### Why this is not a `sed`

`~/.config/zeta/ca/` holds **CA private key material**, and `~/.config/zeta/machine`
holds machine keys. A path move there is a key move. It needs:

- a migration that **copies, verifies, then removes** — never a rename that can
  half-complete
- a **read fallback** so an un-migrated host keeps working (the old path stays
  readable for at least one release)
- a test that runs the migration in a temp `$HOME`, exactly as
  `persona-keys/*.test.ts` already does
- an answer to XDG: `~/.config/zeta` is the *conventional* home for config on
  Linux, so "standardize on `~/.zeta`" may be right for **data** and wrong for
  **config**. Worth deciding explicitly rather than by whichever is louder.

### Exit condition

One documented answer to *"where does Zeta put things on my machine"*, a migration
with a fallback and a temp-`$HOME` test, one launchd naming convention, and a
liveness signal that makes a dead cell legible without stat-ing a log.

### Anchor

`.claude/rules/preservation-has-one-namespace-per-kind.md` — same failure, same
cause (each agent inventing a root under time pressure), one surface over.
That rule governs *rescue* roots; this item is the *runtime state* half.

### Origin

Aaron, 2026-09-01, on reading `install.sh`: *"it might be unexpected to someone who
runs it that it will install agents outside the zeta folder itself, maybe we should
standardize on like .zeta or something like that under the user folder."* The
opt-in half shipped in #16269; this is the consolidation half.
